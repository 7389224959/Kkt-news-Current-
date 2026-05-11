import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";
let supabase: any = null;
if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch(e) {
    console.error("Failed to initialize Supabase client", e);
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Dynamically mount Vercel API routes for local development
  app.use("/api", async (req, res, next) => {
    // Skip health check
    if (req.path === '/health') return next();
    
    try {
      const apiPath = req.path.replace(/^\//, '').split('?')[0];
      let filePath = path.join(process.cwd(), 'api', `${apiPath}.js`);
      
      if (!fs.existsSync(filePath)) {
        filePath = path.join(process.cwd(), 'api', apiPath, 'index.js');
      }
      
      if (fs.existsSync(filePath)) {
        // Dynamically import the handler
        const module = await import(`file://${filePath}?t=${Date.now()}`);
        const handler = module.default;
        
        if (typeof handler === 'function') {
          await handler(req, res);
          return;
        }
      }
      
      // If no file found, continue to next middleware
      next();
    } catch (error) {
      console.error(`Error executing API route ${req.path}:`, error);
      res.status(500).json({ error: 'Internal Server Error in API Route' });
    }
  });

  // Dynamic Meta Injection for Articles
  app.get("/article/:slug", async (req, res, next) => {
    try {
      let { slug } = req.params;
      if (slug) {
        try {
          slug = decodeURIComponent(slug);
        } catch (e) {
          // Ignore decode error
        }
      }
      
      // Fetch article from Supabase
      let article = null;
      if (supabase) {
        try {
          const { data } = await supabase
            .from("articles")
            .select("*")
            .eq("slug", slug)
            .single();
          article = data;
        } catch(e) {
          console.error("Supabase fetch failed", e);
        }
      }

      let template = "";
      
      try {
        if (process.env.NODE_ENV !== "production") {
          // In dev, read index.html from root
          template = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
        } else {
          // In prod, read from dist/index.html
          template = fs.readFileSync(path.resolve(process.cwd(), "dist/index.html"), "utf-8");
        }
      } catch (e) {
        console.warn('Could not read index.html, using fallback shell');
        template = `
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>KKT News</title>
            </head>
            <body>
              <div id="root"></div>
              <script type="module" src="/index.tsx"></script>
            </body>
          </html>
        `;
      }

      if (article) {
        const articleUrl = `https://kktnews.vercel.app/article/${encodeURIComponent(article.slug)}`;
        let imageUrl =
          article.image ||
          article.imageUrl ||
          "https://kktnews.vercel.app/default-news.jpg";

        if (!imageUrl.startsWith("http")) {
          imageUrl = `https://kktnews.vercel.app${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
        }
        
        // Ensure the image URL is properly encoded for social media crawlers
        try {
          imageUrl = new URL(imageUrl).href;
        } catch (e) {
          imageUrl = encodeURI(imageUrl);
        }

        const summary = article.summary || article.excerpt || article.title;
        const publishedAt = article.published_at || article.created_at || new Date().toISOString();
        const updatedAt = article.updated_at || publishedAt;

        const safeTitle = article.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
        const safeSummary = summary.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');

        const jsonLd = {
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          "headline": article.title,
          "image": [imageUrl],
          "datePublished": publishedAt,
          "dateModified": updatedAt,
          "author": {
            "@type": "Organization",
            "name": "KKT News"
          },
          "publisher": {
            "@type": "Organization",
            "name": "KKT News",
            "logo": {
              "@type": "ImageObject",
              "url": "https://kktnews.vercel.app/logo.png"
            }
          },
          "description": summary,
          "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": articleUrl
          }
        };

        const metaTags = `
          <title>${safeTitle}</title>
          <link rel="canonical" href="${articleUrl}">
          <meta name="description" content="${safeSummary}">
          <meta property="og:type" content="article">
          <meta property="og:title" content="${safeTitle}">
          <meta property="og:description" content="${safeSummary}">
          <meta property="og:url" content="${articleUrl}">
          <meta property="og:image" content="${imageUrl}">
          <meta property="og:image:type" content="image/jpeg">
          <meta property="og:image:alt" content="${safeTitle}">
          <meta property="og:site_name" content="KKT News">
          <meta name="twitter:card" content="summary_large_image">
          <meta name="twitter:title" content="${safeTitle}">
          <meta name="twitter:description" content="${safeSummary}">
          <meta name="twitter:image" content="${imageUrl}">
          <script type="application/ld+json">
          ${JSON.stringify(jsonLd)}
          </script>
        `;

        // Remove existing title, description, and og/twitter tags to prevent duplicates
        template = template.replace(/<title>.*?<\/title>/gi, '');
        template = template.replace(/<meta[^>]*name="description"[^>]*>/gi, '');
        template = template.replace(/<meta[^>]*property="og:[^>]*>/gi, '');
        template = template.replace(/<meta[^>]*name="twitter:[^>]*>/gi, '');

        // Inject meta tags before </head>
        template = template.replace("</head>", `${metaTags}</head>`);
      }

      if (process.env.NODE_ENV !== "production") {
        // We need Vite to transform the HTML in dev mode
        req.app.locals.injectedHtml = template;
        next();
      } else {
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      }
    } catch (e) {
      console.error("Error injecting meta tags:", e);
      next();
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    
    // Custom middleware to serve the injected HTML for /article/:slug
    app.use(async (req, res, next) => {
      if (req.app.locals.injectedHtml && req.originalUrl.startsWith('/article/')) {
        try {
          const transformed = await vite.transformIndexHtml(req.originalUrl, req.app.locals.injectedHtml);
          res.status(200).set({ "Content-Type": "text/html" }).end(transformed);
          req.app.locals.injectedHtml = null; // reset
          return;
        } catch (e) {
          vite.ssrFixStacktrace(e as Error);
          next(e);
        }
      }
      next();
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, { index: false }));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
