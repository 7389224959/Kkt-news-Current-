import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
let supabase = null;
if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch(e) {}
}

export default async function handler(req, res) {
  let { slug } = req.query;

  try {
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
      const { data } = await supabase
        .from('articles')
        .select('*')
        .eq('slug', slug)
        .single();
      article = data;
    }

    let html = '';
    try {
      // Read the built index.html
      const indexPath = path.join(process.cwd(), 'dist', 'index.html');
      html = fs.readFileSync(indexPath, 'utf-8');
    } catch (e) {
      console.warn('Could not read dist/index.html, using fallback shell');
      html = `
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
      html = html.replace(/<title>.*?<\/title>/gi, '');
      html = html.replace(/<meta[^>]*name="description"[^>]*>/gi, '');
      html = html.replace(/<meta[^>]*property="og:[^>]*>/gi, '');
      html = html.replace(/<meta[^>]*name="twitter:[^>]*>/gi, '');

      // Inject meta tags before </head>
      html = html.replace('</head>', `${metaTags}</head>`);
    }

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    res.status(200).send(html);
  } catch (error) {
    console.error('Error serving article:', error);
    // Fallback to a basic HTML shell if index.html cannot be read
    const fallbackHtml = `
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
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(fallbackHtml);
  }
}
