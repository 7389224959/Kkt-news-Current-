import { GoogleGenAI, Type } from "@google/genai";
import { OpenRouter } from "@openrouter/sdk";
import { Article, Category, ViralPost } from "../types";
import { generateSlug } from "../newsUtils";
import { supabase } from "./supabase";

const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("API Key is missing. Please ensure process.env.GEMINI_API_KEY is set.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export interface NewsDraft {
  title: string;
  excerpt: string;
  content: string;
  imageKeywords: string;
  tags: string[];
  category?: string;
  seoTitle?: string;
  metaDescription?: string;
  facebookCaption?: string;
}

export const getStockImageUrl = (keywords: string, category?: Category): string => {
  if (typeof keywords !== 'string') {
    keywords = String(keywords || '');
  }
  const cleanKeywords = keywords
    .replace(/[^\w\s,]/gi, '')
    .split(/[\s,]+/)
    .filter(Boolean)
    .join(',');

  // Fallback images based on category if keywords are weak
  const fallbacks: Record<string, string> = {
    [Category.POLITICS]: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=800&q=80',
    [Category.STATE]: 'https://images.unsplash.com/photo-1572910358198-2730d5ee395a?auto=format&fit=crop&w=800&q=80',
    [Category.CRIME]: 'https://images.unsplash.com/photo-1589994160839-163cd2b5ca94?auto=format&fit=crop&w=800&q=80',
    [Category.SPORTS]: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=800&q=80',
    [Category.BOLLYWOOD]: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=800&q=80',
    [Category.LIFESTYLE]: 'https://images.unsplash.com/photo-1511988617509-a57c8a288659?auto=format&fit=crop&w=800&q=80',
    [Category.VIRAL]: 'https://images.unsplash.com/photo-1516251193007-45ef944ab0c6?auto=format&fit=crop&w=800&q=80',
    [Category.WAR_ROOM]: 'https://images.unsplash.com/photo-1501862700950-18382cd41497?auto=format&fit=crop&w=800&q=80',
    'default': 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=80'
  };

  // Use LoremFlickr for keyword-based images (more reliable than deprecated Unsplash source)
  // We append a random string to avoid caching
  const randomSeed = Math.floor(Math.random() * 1000);
  return `https://loremflickr.com/800/450/${cleanKeywords || 'news'}?lock=${randomSeed}`;
};

import { compressImage } from '../src/utils/imageUtils';

/**
 * Generates a high-quality AI image using Gemini 2.5 Flash Image
 */
export const generateAiImage = async (prompt: string, specificInstructions?: string, referenceImageBase64?: string): Promise<string> => {
  const ai = getAiClient();
  if (!ai) throw new Error("API Key missing");

  try {
    const basePrompt = `A professional news-style high-quality photo for a news article about: ${prompt}. The image MUST reflect an authentic Indian context. Ensure all people look beautifully and realistically like native Indians with accurate facial features, skin tones, and regional attire. The environment, streets, architecture, and background must clearly look like a real location in India. Cinematic lighting, photorealistic, documentary journalism style, 16:9 aspect ratio. No text, no labels, no watermarks, no overlays, no writing. IMPORTANT: If a reference image is provided, you MUST match the face of the person exactly.`;
    
    const finalPrompt = specificInstructions 
      ? `${basePrompt} ADDITIONAL ADMIN SPECIFICATIONS to strictly follow: ${specificInstructions}` 
      : basePrompt;

    const parts: any[] = [
      { text: finalPrompt }
    ];

    if (referenceImageBase64) {
      const base64Data = referenceImageBase64.split(',')[1] || referenceImageBase64;
      const mimeType = referenceImageBase64.match(/data:(.*?);base64/)?.[1] || 'image/jpeg';
      parts.unshift({
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64 = `data:image/png;base64,${part.inlineData.data}`;
        // Compress the image to ensure it fits in Firestore (1MB limit)
        return await compressImage(base64);
      }
    }
    
    throw new Error("No image data in response");
  } catch (error) {
    console.error("AI Image Generation Error:", error);
    throw error;
  }
};

export interface DraftNewsOptions {
  rawNotes: string;
  location: string;
  sourceUrl?: string;
  sourceImageBase64?: string;
  wordLimit?: number;
}

export const rewriteArticle = async (content: string, category: string, retries = 1): Promise<NewsDraft | string> => {
  const ai = getAiClient();
  if (!ai) return "Error: API Key missing. Cannot generate report.";

  try {
    const prompt = `Rewrite the following news in Hindi in a viral and engaging format.

RULES:
- Use ONLY given content
- Do NOT add external facts
- Do NOT hallucinate
- Keep it factual
- Make headline catchy

CONTENT:
${content}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: "A catchy, viral headline in Hindi.",
            },
            excerpt: {
              type: Type.STRING,
              description: "A 2-3 sentence summary in Hindi.",
            },
            content: {
              type: Type.STRING,
              description: "The full rewritten article in Hindi, formatted with HTML tags (<p>, <h2>, <strong>, etc.) for readability.",
            },
            imageKeywords: {
              type: Type.STRING,
              description: "2-3 English keywords for finding a stock photo.",
            },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3-5 relevant tags in Hindi or English.",
            },
            seoTitle: {
              type: Type.STRING,
              description: "A 60-character SEO optimized title.",
            },
            metaDescription: {
              type: Type.STRING,
              description: "A 120-150 character meta description.",
            },
            facebookCaption: {
              type: Type.STRING,
              description: "A 2-line viral Facebook caption.",
            },
          },
          required: ["title", "excerpt", "content", "imageKeywords", "tags", "seoTitle", "metaDescription", "facebookCaption"],
        },
      },
    });

    const jsonStr = response.text?.trim();
    if (!jsonStr) {
      if (retries > 0) {
        console.log("Empty AI response, retrying...");
        return rewriteArticle(content, category, retries - 1);
      }
      throw new Error("Empty response from AI");
    }
    
    const result = JSON.parse(jsonStr);
    
    // Ensure category is passed through
    result.category = category;
    
    return result as NewsDraft;
  } catch (error: any) {
    console.error("AI Rewrite Error:", error);
    if (retries > 0) {
      console.log("AI Rewrite Error, retrying...");
      return rewriteArticle(content, category, retries - 1);
    }
    return `Failed to rewrite article: ${error.message}`;
  }
};
export const draftNewsReport = async (options: DraftNewsOptions): Promise<NewsDraft | string> => {
  const { rawNotes, location, sourceUrl, sourceImageBase64, wordLimit = 400 } = options;
  const ai = getAiClient();
  if (!ai) return "Error: API Key missing. Cannot generate report.";

  try {
    const prompt = `
      You are a professional Indian news journalist writing for a fast-growing Hindi news website.
      Write a 100% SEO-optimized, fact-based, human-like Hindi news article (450–650 words) based on the following information:
      
      Location: ${location || 'Not specified'}
      Raw Notes / Topic: "${rawNotes || 'None provided'}"
      ${sourceUrl ? `Source URL: ${sourceUrl}` : ''}
      
      Follow these strict rules:
      1. Headline
      Create a powerful, clickable Hindi headline (8–12 words)
      Include main keyword
      2. Breaking Summary (VERY IMPORTANT)
      Write 2 short lines summarizing the news (viral style)
      3. Introduction (50–80 words)
      Answer: क्या, कब, कहां, किसने
      4. Main Content (Use Subheadings)
      Use 3–5 SEO subheadings (Use Markdown ## for subheadings, NO HTML tags)
      Include real facts, numbers, and latest updates
      Avoid generic AI sentences
      5. Add Data & Authority
      Include stats, official sources, or real numbers if available
      Mention organizations like SEBI or Google when relevant
      6. User Value Section (IMPORTANT)
      Add a section like:
      👉 “आम लोगों पर इसका क्या असर पड़ेगा?”
      👉 “आपको क्या करना चाहिए?”
      7. Conclusion
      2–3 lines summarizing impact
      8. SEO Rules & Formatting (CRITICAL)
      Article length: Structure the length based ONLY on available facts. Do not force stretch the article.
      Use focus keyword 4–6 times naturally
      Keep paragraphs very short (2–3 lines maximum)
      Leave empty lines between paragraphs for readability.
      Use Markdown formatting (like **bold**, ## Headings). DO NOT output any HTML tags (like <h2>, <p>, <br>).
      Use simple Hindi (mix of Hindi + easy English words)
      9. Tone
      Human-like, not robotic
      Avoid repetition
      Slightly engaging + informative
      
      ❌ Do NOT generate fake news
      ❌ Do NOT hallucinate facts
      Make the article feel like it is written by a real journalist, not AI.

      Image Keywords: Provide 3-4 specific English keywords that describe the visual context of this news. Avoid generic words like "news" or "india". Use specific nouns like "Tractor", "Police Station", "Cricket Bat", "Hospital Building", etc.

      Category: Suggest the most appropriate category for this news from the following list: "State", "Politics", "Crime", "Jobs", "Sports", "Bollywood", "Lifestyle", "Viral", "War Room".

      Output a JSON object with the following keys: 
      "title" (Headline), 
      "excerpt" (Breaking Summary), 
      "content" (The full article including Intro, Main Content, Data, User Value, Conclusion formatted nicely in HTML/Markdown WITHOUT SEO elements), 
      "imageKeywords", 
      "tags" (Array of 5 tags), 
      "category",
      "seoTitle",
      "metaDescription",
      "facebookCaption".
      Do not include any markdown formatting or code blocks outside the JSON.
    `;

    const parts: any[] = [{ text: prompt }];

    if (sourceImageBase64) {
      const base64Data = sourceImageBase64.split(',')[1] || sourceImageBase64;
      const mimeType = sourceImageBase64.match(/data:(.*?);base64/)?.[1] || 'image/jpeg';
      parts.unshift({
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      });
    }

    const tools: any[] = [];
    if (sourceUrl) {
      tools.push({ urlContext: {} });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-preview',
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        tools: tools.length > 0 ? tools : undefined,
      }
    });

    const rawText = response.text || "{}";
    const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    try {
      const draft = JSON.parse(cleanedText);
      let formattedContent = draft.content || '';
      if (typeof formattedContent === 'string') {
        formattedContent = formattedContent.replace(/(?:\/n|\\n|\r?\n)+/g, '\n\n');
      }
      return {
        title: draft.title || "",
        excerpt: draft.excerpt || "",
        content: formattedContent,
        imageKeywords: draft.imageKeywords || "news",
        tags: draft.tags || [],
        category: draft.category || "",
        seoTitle: draft.seoTitle || "",
        metaDescription: draft.metaDescription || "",
        facebookCaption: draft.facebookCaption || ""
      };
    } catch (e) {
      console.error("JSON Parse Error in draftNewsReport:", e);
      return "Failed to parse AI response as JSON.";
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return `Error: Failed to connect to the news desk AI. ${error?.message || 'Please try again later.'}`;
  }
};

/**
 * Fetches real-world trending news keywords using Google Search grounding.
 * It also attempts to link them to existing articles if a match is found.
 */
export const fetchTrendingKeywords = async (): Promise<{ label: string, articleSlug: string }[]> => {
  const ai = getAiClient();
  if (!ai) throw new Error("API Key missing");

  try {
    const now = new Date();
    const exactTime = now.toISOString();

    const prompt = `
      Current Date and Time: ${exactTime}
      
      You are a real-time news trend detection system for India.
      USE YOUR GOOGLE SEARCH TOOL to find the top 5 BREAKING and TRENDING news topics in India RIGHT NOW.
      
      CRITICAL RULES FOR RECENCY:
      - You MUST ONLY include topics that started trending or have major breaking updates within the LAST 12 HOURS.
      - DO NOT include old news, yesterday's news, or generic long-term trends.
      - Search specifically for "latest breaking news India today" or "Google Trends India past 12 hours".
      
      FORMAT RULES:
      - Provide a short, catchy keyword or phrase (max 2-3 words) in Hindi for each trend.
      - Output a JSON array of strings containing only the Hindi keywords.
      
      Example: ["बजट 2024", "IPL 2024", "चुनाव नतीजे"]
      Do not include any markdown formatting or code blocks.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        temperature: 0.9,
      },
    });

    const rawText = response.text || "[]";
    const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const keywords: string[] = JSON.parse(cleanedText);
    
    return keywords.map(kw => ({
      label: kw,
      articleSlug: ""
    }));
  } catch (error) {
    console.error("AI Trending Keywords Error:", error);
    throw error;
  }
};

import { createArticle, getArticles } from './articleService';
import { uploadImage } from './supabase';

async function extractArticleLinks(url: string): Promise<{title: string, link: string, content?: string}[]> {
  try {
    const response = await fetch(`/api/extract-links?url=${encodeURIComponent(url)}`);
    if (!response.ok) {
      console.error(`Failed to fetch links from ${url}: ${response.statusText}`);
      return [];
    }
    const data = await response.json();
    return data.results || [];
  } catch (e) {
    console.error(`Failed to extract links from ${url}:`, e);
    return [];
  }
}

export const checkDailyNewsStatus = async (rssSources: { url: string, category: string }[]) => {
  if (!rssSources || rssSources.length === 0) {
    return [];
  }

  let existingSourceUrls: string[] = [];
  let existingTitles: string[] = [];
  try {
    const { data: recentArticles } = await getArticles(1, 30); // Check past 30 articles
    existingSourceUrls = recentArticles.map(a => a.sourceUrl || a.source).filter(Boolean) as string[];
    existingTitles = recentArticles.map(a => a.title);
  } catch (e) {
    console.warn("Failed to fetch existing articles for deduplication:", e);
  }

  const now = new Date();
  const getWords = (str: string) => str.toLowerCase().replace(/[.,:;'"()!?\-।]/g, '').split(/\s+/).filter(w => w.length > 2);
  const cleanUrl = (url: string) => {
    try {
      const u = new URL(url);
      return u.origin + u.pathname;
    } catch {
      return url.split('?')[0].trim().toLowerCase();
    }
  };
  
  const normalizedExistingUrls = existingSourceUrls.map(cleanUrl);
  
  const statusPromises = rssSources.map(async (source) => {
    try {
      const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(source.url)}&api_key=`);
      if (!res.ok) {
        return { source, freshCount: 0, error: 'Failed to fetch RSS' };
      }
      const data = await res.json();
      const items = data.items || [];

      let freshCount = 0;
      for (const item of items) {
        // Strict duplicate check using URL
        const itemUrl = cleanUrl(item.link);
        const isDuplicateUrl = normalizedExistingUrls.includes(itemUrl);
        
        let isDuplicateTitle = false;
        if (existingTitles.some(et => et.includes(item.title.substring(0, 15)))) {
          isDuplicateTitle = true;
        } else {
          const itemWords = getWords(item.title);
          for (const et of existingTitles) {
            const etWords = getWords(et);
            if (itemWords.length === 0 || etWords.length === 0) continue;
            let overlap = 0;
            for (const w of itemWords) {
              if (etWords.includes(w)) overlap++;
            }
            const ratio = overlap / Math.min(itemWords.length, etWords.length);
            if (ratio >= 0.45) {
              isDuplicateTitle = true;
              break;
            }
          }
        }
        
        let hoursDiff = 0;
        if (item.pubDate) {
          const pubDate = new Date(item.pubDate.replace(/-/g, '/'));
          if (!isNaN(pubDate.getTime())) {
            hoursDiff = (now.getTime() - pubDate.getTime()) / (1000 * 60 * 60);
          }
        }
        
        // Ensure not duplicate and published within last 24 hours
        if (!isDuplicateUrl && !isDuplicateTitle && hoursDiff <= 24) {
          freshCount++;
        }
      }
      return { source, freshCount, success: true };
    } catch (e: any) {
      return { source, freshCount: 0, error: e.message || 'Error occurred' };
    }
  });

  return Promise.all(statusPromises);
};

export const fetchDailyNews = async (
  rssSources: { url: string, category: string }[], 
  aiModel: 'gemini' | 'openrouter' = 'gemini',
  imageStrategy: 'auto' | 'manual' = 'auto',
  imageGenModel: 'gemini' | 'cloudflare' = 'gemini'
): Promise<Article[]> => {
  const ai = getAiClient();
  if (aiModel === 'gemini' && !ai) throw new Error("API Key missing");

  if (!rssSources || rssSources.length === 0) {
    throw new Error("No RSS URLs provided for daily news fetch.");
  }

  // Fetch existing articles to avoid duplicates
  let existingSourceUrls: string[] = [];
  let existingTitles: string[] = [];
  try {
    const { data: recentArticles } = await getArticles(1, 30);
    existingSourceUrls = recentArticles.map(a => a.sourceUrl || a.source).filter(Boolean) as string[];
    existingTitles = recentArticles.map(a => a.title);
  } catch (e) {
    console.warn("Failed to fetch existing articles for deduplication:", e);
  }

  const now = new Date();
  const today = now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const currentTime = now.toLocaleTimeString('en-IN', { hour12: false });
  
  // Shuffle rssSources to pick random category/source instead of always the first one
  const shuffledSources = [...rssSources].sort(() => 0.5 - Math.random());
  
  const getWords = (str: string) => str.toLowerCase().replace(/[.,:;'"()!?\-।]/g, '').split(/\s+/).filter(w => w.length > 2);
  const cleanUrl = (url: string) => {
    try {
      const u = new URL(url);
      return u.origin + u.pathname;
    } catch {
      return url.split('?')[0].trim().toLowerCase();
    }
  };
  const normalizedExistingUrls = existingSourceUrls.map(cleanUrl);

  const extractedArticlesData = [];

  for (const source of shuffledSources) {
    try {
      const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(source.url)}&api_key=`);
      const data = await res.json();
      const items = data.items || [];

      let targetItem = null;
      for (const item of items) {
        // Strict duplicate check using URL
        const itemUrl = cleanUrl(item.link);
        const isDuplicateUrl = normalizedExistingUrls.includes(itemUrl);
        
        let isDuplicateTitle = false;
        if (existingTitles.some(et => et.includes(item.title.substring(0, 15)))) {
          isDuplicateTitle = true;
        } else {
          const itemWords = getWords(item.title);
          for (const et of existingTitles) {
            const etWords = getWords(et);
            if (itemWords.length === 0 || etWords.length === 0) continue;
            let overlap = 0;
            for (const w of itemWords) {
              if (etWords.includes(w)) overlap++;
            }
            const ratio = overlap / Math.min(itemWords.length, etWords.length);
            if (ratio >= 0.45) {
              isDuplicateTitle = true;
              break;
            }
          }
        }
        
        let hoursDiff = 0;
        if (item.pubDate) {
          const pubDate = new Date(item.pubDate.replace(/-/g, '/'));
          if (!isNaN(pubDate.getTime())) {
            hoursDiff = (now.getTime() - pubDate.getTime()) / (1000 * 60 * 60);
          }
        }
        
        // Ensure not duplicate and published within last 24 hours
        if (!isDuplicateUrl && !isDuplicateTitle && hoursDiff <= 24) {
          targetItem = item;
          break;
        }
      }

      if (targetItem) {
        // Try to extract full article text using our backend
        let fullText = "";
        try {
          const extractRes = await fetch(`/api/extract-article?url=${encodeURIComponent(targetItem.link)}`);
          if (extractRes.ok) {
            const extractData = await extractRes.json();
            fullText = extractData.content;
          }
        } catch (err) {
          console.warn("Failed to extract full text, reading RSS summary instead:", err);
        }

        extractedArticlesData.push({
          category: source.category,
          title: targetItem.title,
          link: targetItem.link,
          content: fullText || targetItem.description || "Article content not available. Please deduce from title.",
          pubDate: targetItem.pubDate
        });
        
        // We only want to fetch and publish one article at a time
        break;
      }
    } catch (e) {
      console.error(`Failed to fetch RSS for ${source.url}:`, e);
    }
  }

  if (extractedArticlesData.length === 0) {
    throw new Error("No fresh news found (no news published within the last 24 hours that hasn't been posted yet).");
  }

  const promptContext = extractedArticlesData.map((data, index) => `
    ARTICLE ${index + 1}:
    - Category: ${data.category}
    - Original Title: ${data.title}
    - Source Link: ${data.link}
    - Published Date: ${data.pubDate}
    - Extracted Content: ${data.content.substring(0, 3000)} // Truncated to prevent context limit
  `).join('\n\n');

  try {
    const prompt = `
      You are a professional Indian news journalist writing for a fast-growing Hindi news website.
      Write 100% SEO-optimized, fact-based, human-like Hindi news articles (450–650 words each) based ONLY on the following extracted source articles:

      Current Date & Time: ${today} ${currentTime}
      
      SOURCE ARTICLES TO REWRITE:
      ${promptContext}

      For a Hindi news website 'Khabar Kal Tak'.

      Follow these strict rules for EACH article:
      1. Headline
      Create a powerful, clickable Hindi headline (8–12 words)
      Include main keyword
      2. Breaking Summary (VERY IMPORTANT)
      Write 2 short lines summarizing the news (viral style)
      3. Introduction (50–80 words)
      Answer: क्या, कब, कहां, किसने
      4. Main Content & Unique Angle (CRITICAL)
      Use 3–5 SEO subheadings (Use Markdown ## for subheadings, NO HTML tags)
      Include real facts, numbers, and latest updates FROM THE SOURCE TEXT ONLY.
      MUST be rewritten from a completely new angle to ensure extreme freshness and genuineness.
      Do not sound like a standard news feed; inject deep journalistic analysis.
      5. Human Touch, Values & Emotion (IMPORTANT)
      Write in a deeply human manner. 
      Incorporate the values of common people (आम जनता की भावनाएं) into your writing.
      Ensure the narrative conveys REQUIRED EMOTIONS (e.g., outrage, hope, sadness, pride, depending on the topic).
      6. User Value Section
      Add a section like:
      👉 “आम लोगों पर इसका क्या असर पड़ेगा?”
      👉 “आपको क्या करना चाहिए?”
      7. Conclusion
      2–3 lines summarizing impact
      8. SEO Rules & Formatting (CRITICAL)
      Article length: Structure the length based ONLY on available facts from the source. Do not force stretch the article.
      Use focus keyword 4–6 times naturally
      Keep paragraphs very short (2–3 lines maximum)
      Leave empty lines between paragraphs for readability.
      Use Markdown formatting (like **bold**, ## Headings). DO NOT output any HTML tags (like <h2>, <p>, <br>).
      Use simple Hindi (mix of Hindi + easy English words)
      9. Tone
      Human-like, not robotic
      Avoid repetition
      Deeply engaging, informative, and highly emotional.

      STRICT REQUIREMENTS:
      1. **ONLY USE PROVIDED SOURCES**: 
         - DO NOT invent, hallucinate, or search for external facts. 
         - ONLY rely on the "SOURCE ARTICLES TO REWRITE" provided above.
      2. **SOURCE LINKS**:
         - You MUST provide the exact Source Link provided in the text above for each article. This will be shown to the admin for verification.

      Output a JSON array of objects. Do not include any markdown formatting or code blocks outside the JSON.
      
      JSON Structure:
      [
        {
          "title": "HEADLINE (Hindi)",
          "excerpt": "SUMMARY (Hindi)",
          "content": "A single string containing the full article including Intro, Main Content, Data, User Value, Conclusion formatted nicely in HTML/Markdown WITHOUT SEO elements",
          "category": "State News" | "Politics" | "Crime" | "National" | "Sports" | "Entertainment" | "Lifestyle",
          "author": "Professional Journalist",
          "sourceUrl": "MUST be the EXACT source link provided in the source text.",
          "imagePrompt": "Specific description for AI image generation. MUST include keywords to make the scene, characters, and environment look highly realistic, original, and authentically Indian.",
          "tags": ["Tag 1", "Tag 2", ...],
          "seoTitle": "A 60 character SEO optimized title",
          "metaDescription": "A 120-150 character meta description",
          "facebookCaption": "A 2-line viral Facebook caption"
        }
      ]
    `;

    console.log(`Rewriting raw RSS news using ${aiModel}...`);

    let rawText = "[]";

    if (aiModel === 'openrouter') {
      const openRouterKey = (import.meta as any).env?.VITE_OPENROUTER_API_KEY || (typeof process !== 'undefined' ? process.env.OPENROUTER_API_KEY : '');
      if (!openRouterKey) {
        throw new Error("OpenRouter API Key is missing. Please set VITE_OPENROUTER_API_KEY in the environment.");
      }
      
      const hindiQualityPrompt = `
निम्न समाचार को शुद्ध, स्पष्ट और स्वाभाविक हिंदी में दोबारा लिखो।

निर्देश:

- सभी शब्दों की वर्तनी 100% सही होनी चाहिए (स्पेलिंग गलती न करें)।
- भाषा बिल्कुल प्राकृतिक और प्रवाहपूर्ण हो, अनुवाद जैसी न लगे।
- किसी भी प्रकार की तथ्यात्मक गलती, जोड़ या बदलाव न करो।
- अनावश्यक अंग्रेज़ी शब्दों का उपयोग न करो।
- वाक्य छोटे, स्पष्ट और समाचार-पत्र शैली के हों।
- व्याकरण पूरी तरह सही हो (लिंग, वचन, काल का सही प्रयोग)। व्याकरण की किसी भी गलती (Grammar mistakes) से बचें।
- आउटपुट एक साफ-सुथरा समाचार लेख हो, बिना किसी अतिरिक्त टिप्पणी के।
- लेख को उचित Markdown फॉर्मेट में लिखें। पैराग्राफ्स (paragraphs) को अलग करने के लिए दोहरे लाइन ब्रेक (double newlines) का इस्तेमाल करें। HTML टैग्स का प्रयोग न करें, केवल शुद्ध Markdown का उपयोग करें।

CRITICAL: आउटपुट देने से पहले, एक बार अपने द्वारा लिखे गए वाक्यों को दोबारा पढ़ें और जाँचें कि कहीं कोई वर्तनी की अशुद्धि (Spelling mistake) या व्याकरण की गलती (Grammar error) तो नहीं है।
`;

      const promptWithFormatInstruction = prompt + "\n\n" + hindiQualityPrompt + "\n\nCRITICAL: Respond ONLY with valid JSON array, starting with [ and ending with ]. Do NOT wrap it in ```json\n...\n``` blocks. Do NOT include any conversational text before or after the JSON. Ensure there is no punctuation (like . or ।) outside of the double quotes. Valid JSON ONLY. Do NOT use double quotes inside your string values (use single quotes for quotes within text).";

      let response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openRouterKey.trim()}`,
          "HTTP-Referer": typeof window !== 'undefined' ? window.location.href : "https://myapp.com",
          "X-Title": "News Applet",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b:free",
          messages: [
            {
              role: "user",
              content: promptWithFormatInstruction
            }
          ]
        })
      });

      if (!response.ok) {
        console.warn(`Primary OpenRouter model failed with status ${response.status}. Falling back to openrouter/free...`);
        response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openRouterKey.trim()}`,
            "HTTP-Referer": typeof window !== 'undefined' ? window.location.href : "https://myapp.com",
            "X-Title": "News Applet",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "openrouter/free",
            messages: [
              {
                role: "user",
                content: promptWithFormatInstruction
              }
            ]
          })
        });
      }

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${await response.text()}`);
      }

      console.log("OpenRouter Response received...");
      const data = await response.json();
      rawText = data.choices?.[0]?.message?.content || "[]";
      
      console.log("OpenRouter request complete.");
      // Because we initialized rawText to "[]", if it returned something valid we don't need to strip anything, but typically we want to replace the `let rawText = "[]"` with the real content. Wait, `rawText` starts as `"[]"`. By overwriting it with `data.choices[...].content`, the previous `"[]"` is discarded.

    } else {
      // Use Gemini
      const response = await ai!.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.7,
        }
      });

      console.log("AI Response received");
      rawText = response.text || "[]";
    }
    
    let cleanedText = rawText.trim();
    if (cleanedText.includes('```')) {
      const match = cleanedText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) cleanedText = match[1];
    }

    const firstB = cleanedText.indexOf('[');
    const lastB = cleanedText.lastIndexOf(']');
    if (firstB !== -1 && lastB !== -1 && lastB >= firstB) {
      cleanedText = cleanedText.substring(firstB, lastB + 1);
    }
    
    // Replace all actual newlines with spaces to avoid control character errors in strings
    cleanedText = cleanedText.replace(/\r?\n|\r/g, ' ').replace(/\t/g, ' ');
    
    // Fix common JSON errors models sometimes make
    cleanedText = cleanedText.replace(/"\s*\.\s*,/g, '",'); // Fixes "...".,
    cleanedText = cleanedText.replace(/"\s*।\s*,/g, '",'); // Fixes "..."।, (Hindi full stop)
    cleanedText = cleanedText.replace(/""\s*,/g, '",'); // Fixes trailing double quotes "...",
    cleanedText = cleanedText.replace(/,\s*}/g, '}'); // Fixes trailing commas in objects
    cleanedText = cleanedText.replace(/,\s*]/g, ']'); // Fixes trailing commas in arrays
    
    let rawArticles;
    try {
      rawArticles = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError, "Cleaned text was:", cleanedText.substring(0, 500) + "...");
      throw new Error("Failed to parse AI response as JSON.");
    }

    if (!Array.isArray(rawArticles)) {
      throw new Error("AI response is not an array.");
    }
    
    // Helper for delay
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    const articles: Article[] = [];
    
    // Process articles sequentially to avoid rate limits
    for (const a of rawArticles) {
      const category = mapCategory(a.category);
      let imageUrl = "";
      
      console.log(`Processing article: ${a.title}`);
      
      // Try to generate high-quality AI image for each article
      if (imageStrategy === 'auto') {
        try {
          if (aiModel === 'openrouter') {
             const nimApiKey = (import.meta as any).env?.VITE_NVIDIA_NIM_API_KEY || (typeof process !== 'undefined' ? process.env.NVIDIA_NIM_API_KEY : '');
             if (!nimApiKey) {
               console.warn("VITE_NVIDIA_NIM_API_KEY missing, falling back to Gemini for image or stock.");
             } else {
               const nimReq = await fetch("https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell", {
                 method: "POST",
                 headers: {
                   "Authorization": `Bearer ${nimApiKey.trim()}`,
                   "Content-Type": "application/json",
                   "Accept": "application/json"
                 },
                 body: JSON.stringify({
                   prompt: "A professional documentary news photo: " + (a.imagePrompt || a.title)
                 })
               });
               if (nimReq.ok) {
                 const nimRes = await nimReq.json();
                 if (nimRes.artifacts && nimRes.artifacts[0] && nimRes.artifacts[0].base64) {
                   const b64 = `data:image/jpeg;base64,${nimRes.artifacts[0].base64}`;
                   imageUrl = await uploadImage(b64);
                 }
               } else {
                 const errStr = await nimReq.text();
                 console.error("Nvidia NIM error:", errStr);
               }
             }
          }
          if (!imageUrl && imageGenModel === 'cloudflare') {
            try {
              const cfPrompt = `Realistic Indian photo, photorealistic, high quality. Subject: ${a.imagePrompt || a.title}. Authentic Indian context, native Indian people, genuine Indian environment, bold colors, 4:5 aspect ratio. NO TEXT, NO WATERMARKS.`;
              const cfReq = await fetch('/api/cloudflare-image', {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  prompt: cfPrompt,
                  model: "@cf/black-forest-labs/flux-1-schnell"
                })
              });
              if (cfReq.ok) {
                const resData = await cfReq.json();
                if (resData.base64) {
                  const b64 = `data:image/jpeg;base64,${resData.base64}`;
                  imageUrl = await uploadImage(b64);
                }
              } else {
                const errStr = await cfReq.text();
                console.error("Cloudflare AI API route error:", errStr);
              }
             } catch (e) {
               console.error("Failed to fetch from /api/cloudflare-image:", e);
             }
          }

          if (!imageUrl && imageGenModel === 'gemini') {
            const base64Image = await generateAiImage(a.imagePrompt || a.title);
            // Upload to Supabase Storage
            imageUrl = await uploadImage(base64Image);
          }
          
          if (!imageUrl) {
            imageUrl = getStockImageUrl(a.imagePrompt || "news", category);
          }
        } catch (e) {
          console.warn("AI Image generation/upload failed, falling back to stock:", e);
          imageUrl = getStockImageUrl(a.imagePrompt || "news", category);
        }
      } else {
        console.log(`Manual image override for: ${a.title}`);
        // imageUrl remains empty, admin will upload manually
      }

      const title = a.title;
      const excerpt = a.excerpt;
      const createdAt = new Date().toISOString();
      
      let formattedContent = a.content || '';
      if (typeof formattedContent === 'string') {
        // Fix any model errors with slashes and ensure proper markdown paragraphs
        formattedContent = formattedContent.replace(/(?:\/n|\\n|\r?\n)+/g, '\n\n');
      }

      const articleData: Omit<Article, 'id'> = {
        title: title,
        slug: generateSlug(title),
        summary: excerpt,
        content: formattedContent,
        category: category,
        author: "Sankalp Jha", // Hardcoded as requested
        image: imageUrl,
        published_at: createdAt,
        created_at: createdAt,
        views: Math.floor(Math.random() * 8001) + 12000,
        source: a.sourceUrl || "",
        sourceUrl: a.sourceUrl || "",
        tags: a.tags || [],
        seoTitle: a.seoTitle,
        metaDescription: a.metaDescription,
        facebookCaption: a.facebookCaption
      };

      // Save to Supabase Database
      const savedArticle = await createArticle(articleData);
      articles.push(savedArticle);
      
      // Cache SEO fields in localStorage for viral post generator
      try {
        if (typeof window !== 'undefined' && savedArticle.slug && (a.seoTitle || a.facebookCaption)) {
          localStorage.setItem(`seo_cache_${savedArticle.slug}`, JSON.stringify({
            seoTitle: a.seoTitle,
            metaDescription: a.metaDescription,
            facebookCaption: a.facebookCaption
          }));
        }
      } catch (e) {
        console.error("Failed to cache SEO info locally:", e);
      }
      
      console.log(`Published: ${savedArticle.title}`);
      
      // Cooldown to avoid rate limits
      if (rawArticles.indexOf(a) < rawArticles.length - 1) {
        console.log("Cooldown for 5 seconds...");
        await delay(5000);
      }
    }

    return articles;

  } catch (error: any) {
    console.error("Daily News Fetch Error:", error);
    throw new Error(`Failed to fetch daily news: ${error.message}`);
  }
};

export const fetchTickerHeadlines = async (category: 'national' | 'state' | 'mixed' | 'sports' | 'bollywood' | 'viral' | 'warroom' = 'mixed'): Promise<{id: string, text: string}[]> => {
  const ai = getAiClient();
  if (!ai) throw new Error("API Key missing");

  // Fetch existing breaking news to avoid duplicates
  let existingHeadlines: string[] = [];
  try {
    const { data } = await supabase.from('breaking_news').select('text').limit(20);
    if (data) existingHeadlines = data.map((h: any) => h.text);
  } catch (e) {
    console.warn("Failed to fetch existing headlines for deduplication:", e);
  }

  const now = new Date();
  const today = now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const formattedDate = now.toISOString().split('T')[0];

  let stateNewsContext = "";
  if (category === 'state' || category === 'mixed') {
    let stateLinks = await extractArticleLinks(`https://dprcg.gov.in/news/date-wise-news/${formattedDate}`);
    if (stateLinks.length === 0) {
      // Try yesterday's date
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayFormatted = yesterday.toISOString().split('T')[0];
      stateLinks = await extractArticleLinks(`https://dprcg.gov.in/news/date-wise-news/${yesterdayFormatted}`);
    }
    
    if (stateLinks.length > 0) {
      stateNewsContext = "Here is the latest news from Chhattisgarh (DPRCG):\n" + stateLinks.map(item => `Title: ${item.title}\nLink: ${item.link}\nContent: ${item.content || 'Content not available'}`).join('\n\n');
    }
  }

  let promptContext = "";
  if (category === 'national') {
    promptContext = "Generate 5 unique, short National India news headlines from Reuters India or PTI News. Use Google Search to find the latest news published within the last 24-48 hours.";
  } else if (category === 'state') {
    if (stateNewsContext) {
      promptContext = `Generate 5 unique, short Chhattisgarh state news headlines using the following extracted news data:\n\n${stateNewsContext}\n\nYou MUST use this provided data to generate the headlines. DO NOT hallucinate news.`;
    } else {
      promptContext = `Generate 5 unique, short Chhattisgarh state news headlines. Use Google Search to find the latest news published within the last 24-48 hours.`;
    }
  } else if (category === 'sports') {
    promptContext = "Generate 5 unique, short Sports news headlines from PTI Sports or Google News Sports. Use Google Search to find the latest news published within the last 24-48 hours.";
  } else if (category === 'bollywood') {
    promptContext = "Generate 5 unique, short Entertainment news headlines. Use Google Search to find the latest news published within the last 24-48 hours.";
  } else if (category === 'viral') {
    promptContext = "Generate 5 unique, short Viral/Trending news headlines from social media and internet buzz. Use Google Search to find the latest news published within the last 24-48 hours.";
  } else if (category === 'warroom') {
    promptContext = "Generate 5 unique, short Defense/Geopolitics news headlines (Military, Conflicts, Strategy). Use Google Search to find the latest news published within the last 24-48 hours.";
  } else {
    if (stateNewsContext) {
      promptContext = `Generate 5 unique, short news headlines: 2 State and 2 National, plus 1 Sports. \n\nFor State news, use the following extracted data:\n${stateNewsContext}\n\nFor National and Sports, use Google Search to find the latest news published within the last 24-48 hours.`;
    } else {
      promptContext = `Generate 5 unique, short news headlines: 2 State, 2 National, and 1 Sports. Use Google Search to find the latest news published within the last 24-48 hours.`;
    }
  }

  const avoidList = existingHeadlines.length > 0 
    ? `\n      DO NOT GENERATE THESE HEADLINES (Already exists):\n      ${existingHeadlines.slice(0, 15).join('\n      ')}`
    : "";

  try {
    const prompt = `
      Current Date: ${today}
      ${promptContext}
      For a Hindi news website 'Khabar Kal Tak'.
      ${avoidList}
      
      Requirements:
      1. **Latest News Only**: Focus strictly on recent events from the last 24-48 hours.
      2. **Format**: Short, punchy, single-sentence headlines (max 10-15 words).
      3. **Language**: Hindi (Devanagari).
      4. **No Numbering**: Just the text.
      5. **Deduplication**: Ensure these are different from the "Already exists" list above.
      
      Output a JSON array of strings. Do not include any markdown formatting or code blocks.
      If you cannot find news from the specific sources, use other reputable Indian news sources to ensure you return the requested number of headlines.
      Example: ["Headline 1", "Headline 2", "Headline 3"]
    `;

    console.log("Fetching ticker headlines...");

    const toolsConfig: any[] = [{ googleSearch: {} }];

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-preview',
      contents: prompt,
      config: {
        tools: toolsConfig,
        responseMimeType: "application/json",
        temperature: 0.9,
      }
    });

    const rawText = response.text || "[]";
    
    // More robust JSON extraction
    let cleanedText = rawText.trim();
    if (cleanedText.includes('```')) {
      const match = cleanedText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) cleanedText = match[1];
    }
    
    let rawHeadlines;
    try {
      rawHeadlines = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("JSON Parse Error in Ticker:", parseError, "Raw text:", rawText);
      // Fallback: try to find anything that looks like a JSON array
      const arrayMatch = rawText.match(/\[\s*".*?"\s*(?:,\s*".*?"\s*)*\]/s);
      if (arrayMatch) {
        rawHeadlines = JSON.parse(arrayMatch[0]);
      } else {
        throw new Error("Failed to parse AI response as JSON headlines.");
      }
    }

    if (!Array.isArray(rawHeadlines)) {
      throw new Error("AI response is not an array of headlines.");
    }
    
    return rawHeadlines.map((text: string) => ({
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ticker-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      text: text
    }));

  } catch (error: any) {
    console.error("Ticker Fetch Error:", error);
    throw new Error(`Failed to fetch ticker headlines: ${error.message}`);
  }
};

export const mapCategory = (cat: string): Category => {
  if (cat.includes("State") || cat.includes("Chhattisgarh")) return Category.STATE;
  if (cat.includes("Politics")) return Category.POLITICS;
  if (cat.includes("Crime")) return Category.CRIME;
  if (cat.includes("Sports") || cat.includes("Cricket")) return Category.SPORTS;
  if (cat.includes("Bollywood") || cat.includes("Entertainment")) return Category.BOLLYWOOD;
  if (cat.includes("Lifestyle")) return Category.LIFESTYLE;
  if (cat.includes("Viral")) return Category.VIRAL;
  if (cat.includes("War")) return Category.WAR_ROOM;
  return Category.STATE; // Default
};

export interface ViralPostOptions {
  article: Article;
  customInstructions?: string;
  previousPost?: ViralPost;
  feedback?: string;
  cachedSeoInfo?: {
    seoTitle?: string;
    metaDescription?: string;
    facebookCaption?: string;
  };
}

export const generateViralPost = async (options: ViralPostOptions): Promise<ViralPost> => {
  const { article, customInstructions, previousPost, feedback } = options;
  const ai = getAiClient();
  if (!ai) throw new Error("API Key missing");

  // Map categories to specific section names
  const categoryMap: Record<string, string> = {
    'Entertainment': 'Entertainment Hub',
    'State News': 'Chhattisgarh',
    'Politics': 'Politics',
    'Local/District': 'Local News',
    'Jobs & Careers': 'Jobs & Careers',
    'Crime': 'Crime',
    'RTI & Legal': 'RTI & Legal',
    'Video News': 'Video News',
    'Sports': 'Sports Arena',
    'Lifestyle': 'Lifestyle',
    'Viral Today': 'Viral Trends',
    'War Room': 'War Room',
  };
  
  const sectionName = categoryMap[article.category] || article.category;
  const articleUrl = `https://khabarkaltak.com/article/${article.slug}`;

  let prompt = `
You are a viral Hindi news headline generator and thumbnail planner for "Khabar Kal Tak (KKT NEWS)".

INPUT:
Title: ${article.title}
Summary/Excerpt: ${article.summary || article.content.substring(0, 300)}
${options.cachedSeoInfo?.facebookCaption ? `Pre-drafted Facebook Caption (USE IT AS INSPIRATION FOR "caption" field): ${options.cachedSeoInfo.facebookCaption}` : ""}
Description: ${article.content}
Category Section: ${sectionName}
Article Link: ${articleUrl}

STRICT RULES (VERY IMPORTANT):
1. Use ONLY the information provided in the input (title + description).
2. DO NOT add any new facts, numbers, names, or assumptions.
3. DO NOT hallucinate or guess missing details.
4. If information is limited, keep the post short and safe.
5. Keep the meaning exactly same, only rewrite and slightly expand wording.

STYLE GUIDELINES FOR CAPTION:
- Start with a strong hook (like: Breaking 🚨 / Big Update ⚡ / Alert 🔴)
- Write in simple, engaging Hinglish tone (mix of Hindi + English)
- Make it sound viral and social-media friendly
- Keep it within 2–4 lines maximum
- Add curiosity or impact but WITHOUT adding new facts

BRANDING & LINKS (MANDATORY):
- Add "Khabar Kal Tak (KKT NEWS)" naturally in the post caption
- You MUST append the article link to the end of the caption: ${articleUrl}
- You MUST include relevant hashtags (e.g. #KhabarKalTak #KKTNews #Breaking etc.)
- DO NOT add a category tag (e.g. do not write [Category: ...]).

STEP 1: GENERATE HEADLINE FOR IMAGE
- Write in pure Hindi (no spelling mistakes)
- 8–14 words max
- Must sound like TV breaking news
- Use emotional trigger words (VERY IMPORTANT)
- Structure: [EMOTION WORD] + [MAIN NEWS] + [IMPACT]

STEP 2: BACKGROUND IMAGE PROMPT
- Describe the visual scene only (e.g., "A politician speaking at a rally with a crowd", "A dramatic view of a city").
- DO NOT include any text, titles, or words in your description.
- Ratio: 1:1 or 4:5 (Facebook optimized)
- IMPORTANT: If a reference image is provided, the face must match exactly.
- CRITICAL: DO NOT GENERATE ANY TEXT, WORDS, OR LETTERS IN THE IMAGE. The image must be a clean background ONLY. Text will be added later via overlay.

STEP 3: SELECT THEME & OUTPUT FORMAT (STRICT JSON)
Choose one of these 19 themes based on the news type:
If it's a "Standard/Breaking News" post, randomly rotate through these 10 so it's not robotic:
1. "breaking_classic": Classic red breaking news.
2. "breaking_modern": Minimal solid red bar.
3. "breaking_cinematic": Cinema widescreen bars.
4. "breaking_bold_center": Everything centered, huge presence.
5. "breaking_yellow_flare": Yellow hazard highlights.
6. "breaking_glassmorphism": Semi-transparent dark boxes.
7. "breaking_split_box": Distinct floating text boxes.
8. "breaking_magazine": Right-aligned, editorial layout.
9. "breaking_ticker": News ticker style.
10. "breaking_gradient_pop": Dark red/purple premium fade.

For specific topics, use these:
11. "question_hook": Asking a question (e.g. "क्या आपके गांव में भी ऐसा हो सकता है?")
12. "shock_yellow": Shocking news (e.g. "शादी की दावत बनी खतरा!")
13. "story_dark": Narrative hook (e.g. "आखिर क्या हुआ वहाँ?")
14. "fact_light": Informational bullet points
15. "warning_alert": Cautionary alert (e.g. "सावधान!")
16. "step_by_step": Sequential story
17. "video_reel": Video style hook (e.g. "पूरी कहानी जानिए इस वीडियो में...")
18. "minimal_white": Clean, minimal text
19. "opinion_poll": Asking for opinion (e.g. "आप क्या सोचते हैं?")

Output STRICT JSON formatting:
{
  "theme": "<selected_theme_id>",
  "breaking_tag": "BREAKING NEWS / सावधान! / सोचने वाली बात! / etc.",
  "headline_line_1": "<first impactful line>",
  "headline_line_2": "<second emotional/highlighted line>",
  "subheadline": "<optional short explanation>",
  "branding": "KKT NEWS",
  "caption": "<The final news post caption following the STYLE GUIDELINES and BRANDING & LINKS rules above. This string must include the article url!>",
  "hashtags": ["#KhabarKalTak", "#tag1", "#tag2"],
  "image_prompt": "..."
}

IMPORTANT:
Do NOT generate text inside the image.
Only generate text content for overlay.
`;

  if (customInstructions) {
    prompt += `\n\nCUSTOM INSTRUCTIONS FROM ADMIN:\n${customInstructions}\n`;
  }

  if (previousPost && feedback) {
    prompt += `\n\nPREVIOUS POST GENERATED:\n${JSON.stringify(previousPost, null, 2)}\n\nUSER FEEDBACK FOR REGENERATION:\n${feedback}\n\nPlease fix the mistakes and regenerate the JSON based on this feedback.`;
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    }
  });

  const rawText = response.text || "{}";
  const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleanedText) as ViralPost;
};

export const generateViralImage = async (prompt: string, referenceImageBase64?: string, imageGenModel: 'gemini' | 'cloudflare' = 'gemini'): Promise<string> => {
  const ai = getAiClient();
  if (imageGenModel === 'gemini' && !ai) throw new Error("API Key missing");

  try {
    if (imageGenModel === 'cloudflare') {
      const cfPrompt = `Realistic Indian photo, photorealistic, high quality. Subject: ${prompt}. Authentic Indian context, native Indian people, genuine Indian environment, bold colors, 4:5 aspect ratio. NO TEXT, NO WATERMARKS.`;
      
      const cfReq = await fetch('/api/cloudflare-image', {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: cfPrompt,
          model: "@cf/black-forest-labs/flux-1-schnell" // Flux creates much better realistic photos and typically costs fewer steps/tokens.
        })
      });
      if (cfReq.ok) {
        const resData = await cfReq.json();
        if (resData.base64) {
          const b64 = `data:image/jpeg;base64,${resData.base64}`;
          return await compressImage(b64);
        }
      } else {
        const errStr = await cfReq.text();
        console.error("Cloudflare AI API route error:", errStr);
        throw new Error(`Cloudflare AI Error: ${errStr}`);
      }
    }

    const parts: any[] = [
      {
        text: `Generate a clean, photographic background image ONLY. 
Subject: ${prompt}
Style: High quality, attention-grabbing, bold colors, photorealistic. The image MUST reflect an authentic Indian context. People must look like native Indians with accurate features, and places must look like genuine Indian environments.
Aspect Ratio: 4:5.
CRITICAL INSTRUCTION: You are strictly forbidden from generating any text, words, letters, numbers, watermarks, logos, signs, or banners in this image. The image MUST be 100% free of any written language or typography. If you generate text, you fail.
IMPORTANT: If a reference image is provided, you MUST match the face of the person exactly. If the reference image contains any text, IGNORE IT. Do NOT copy any text into the generated image.`,
      },
    ];

    if (referenceImageBase64) {
      const base64Data = referenceImageBase64.split(',')[1] || referenceImageBase64;
      const mimeType = referenceImageBase64.match(/data:(.*?);base64/)?.[1] || 'image/jpeg';
      parts.unshift({
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      });
    }

    if (!ai) throw new Error("API Key missing");
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64 = `data:image/png;base64,${part.inlineData.data}`;
        return await compressImage(base64);
      }
    }
    
    throw new Error("No image data in response");
  } catch (error) {
    console.error("AI Viral Image Generation Error:", error);
    throw error;
  }
};

export interface ReelScript {
  scriptLines: string[];
  hookVariation?: string;
  fullScript: string;
}

export const generateReelScript = async (articleContent: string): Promise<ReelScript> => {
  const ai = getAiClient();
  if (!ai) throw new Error("API Key missing");

  const prompt = `You are a scriptwriter for a viral Hindi news reel.
Convert the following news post into a short breaking-news style reel script.

NEWS ARTICLE:
${articleContent.substring(0, 2000)}

RULES:
- Script language: Hybrid Hindi + simple Hinglish mix
- DO NOT end lines with "है" (hai)
- Max 6-8 words per line
- Total duration should be 8-15 seconds (around 4-6 lines)
- Add emotional hook at the beginning (e.g., 😳 बड़ी खबर!, ध्यान दीजिए, etc.)
- Add pauses using "..." to control pacing
- Keep it conversational, engaging, and not overly formal

STRUCTURE:
1. Hook
2. Main info
3. Impact
4. Curiosity / Call to Action

OUTPUT OBLIGATIONS (JSON ONLY):
{
  "scriptLines": ["line 1", "line 2", "line 3"],
  "hookVariation": "An optional alternative hook for A/B testing",
  "fullScript": "The complete script separated by newlines"
}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text || "{}";
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanedText) as ReelScript;
  } catch (error) {
    console.error("Reel script generation failed", error);
    throw error;
  }
};

export const generateFullReelScript = async (articleContent: string, template: any) => {
  const ai = getAiClient();
  if (!ai) throw new Error("API Key missing");

  const limits = template.safe_limits;
  const coords = template.coordinates;

  const hasHeadline = coords.headline_box && coords.headline_box !== 'hidden';
  const hasSubtitle = coords.subtitle_box && coords.subtitle_box !== 'hidden';
  const hasTicker = coords.ticker_box && coords.ticker_box !== 'hidden';

  const prompt = `You are a professional News Reel Producer. Write a highly engaging, viral Hindi/Hinglish news reel script.
I will provide the FULL ARTICLE TEXT and the TEMPLATE LIMITS.

ARTICLE TEXT:
${articleContent}

TEMPLATE LIMITS:
${hasHeadline ? `- Max Headline Words: ${limits.headline_words || 10}` : ''}
${hasSubtitle ? `- Max Subtitle Lines: ${limits.subtitle_lines || 3}\n- Words Per Subtitle Line: ${limits.words_per_line || 8}` : ''}
${hasTicker ? `- Ticker Characters: ${limits.ticker_characters || 100}` : ''}

REQUIREMENTS:
${hasHeadline ? `1. Short Headline: Catchy, strictly under ${limits.headline_words} words.` : ''}
${hasSubtitle ? `2. Subtitles: Break the news matter into exactly ${limits.subtitle_lines} lines, max ${limits.words_per_line} words per line.` : ''}
${hasTicker ? `3. Ticker Text: A scrolling news update, max ${limits.ticker_characters} characters.` : ''}
4. Visual Keywords: 3-5 keywords for searching stock footage (e.g. "police arrest", "hospital emergency").
5. Voiceover: A professional, conversational Hindi news anchor voiceover script (~30-45 seconds to read).

Return ONLY JSON:
{
  ${hasHeadline ? '"headline": "string",' : ''}
  ${hasSubtitle ? '"subtitles": ["string"],' : ''}
  ${hasTicker ? '"ticker": "string",' : ''}
  "visualKeywords": "string",
  "voiceoverScript": "string"
}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const rawText = response.text || "{}";
    const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("Gemini full reel script error:", error);
    throw error;
  }
};

export const generateReelAudio = async (script: string): Promise<string> => {
  const ai = getAiClient();
  if (!ai) throw new Error("API Key missing");

  const ttsPrompt = `Read the following news script in a professional news anchor tone.
Be confident and clear, with slight urgency (breaking news feel).
Natural pitch variation. Not robotic. Pause naturally at "...".
Emphasize key words.

SCRIPT:
${script}
`;

  try {
    // Note: The TTS API returns base64 PCM data.
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: ttsPrompt }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, // Kore is a good female voice option
          },
        },
      },
    } as any);

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data returned from TTS API");

    return base64Audio;
  } catch (error) {
    console.error("Reel audio generation failed", error);
    throw error;
  }
};

export const editReelScriptWithAI = async (scriptData: any, styleOverrides: any, editPrompt: string) => {
  const client = getAiClient();
  if (!client) throw new Error("Gemini API client not configured.");

  const prompt = `You are a script format editor for a news reel creator application. The user wants to edit this reel.
Current Data: ${JSON.stringify(scriptData)}
Current Styles: ${JSON.stringify(styleOverrides)}

User request: "${editPrompt}"

Please return the updated Data and Styles in JSON format matching this schema. Note that sizes should be numeric strings like "60", and colors should be basic strings like "red", "yellow", "white", or hex. Only return valid JSON. Do not change the script unless the user explicitly asks to rewrite text.
{
  "scriptData": { "headline": "...", "ticker": "...", "subtitles": ["...", "..."], "voiceoverScript": "..." },
  "styleOverrides": { "headlineSize": "60", "headlineColor": "white", "tickerSize": "40", "tickerColor": "white", "tickerBg": "red@0.8", "subtitleSize": "45", "subtitleColor": "yellow"  }
}`;

  try {
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Failed to edit reel script with AI", error);
    throw error;
  }
};
