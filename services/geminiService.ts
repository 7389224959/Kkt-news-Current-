import { GoogleGenAI, Type } from "@google/genai";
import { OpenRouter } from "@openrouter/sdk";
import { Article, Category, ViralPost } from "../types";
import { generateSlug } from "../newsUtils";
import { supabase } from "./supabase";
import { jsonrepair } from "jsonrepair";

export const getAiClient = () => {
  let k1, k2, k3, k4, k5;
  // Try to read from Vite env
  try {
    k1 =
      (import.meta as any).env.VITE_GEMINI_API_KEY ||
      (import.meta as any).env.GEMINI_API_KEY;
  } catch (e) {}
  try {
    k2 =
      (import.meta as any).env.VITE_GEMINI_API_KEY_2 ||
      (import.meta as any).env.GEMINI_API_KEY_2;
  } catch (e) {}
  try {
    k3 =
      (import.meta as any).env.VITE_GEMINI_API_KEY_3 ||
      (import.meta as any).env.GEMINI_API_KEY_3;
  } catch (e) {}
  try {
    k4 =
      (import.meta as any).env.VITE_GEMINI_API_KEY_4 ||
      (import.meta as any).env.GEMINI_API_KEY_4;
  } catch (e) {}
  try {
    k5 =
      (import.meta as any).env.VITE_GEMINI_API_KEY_5 ||
      (import.meta as any).env.GEMINI_API_KEY_5;
  } catch (e) {}

  // Try to read from process.env (Node / Vite define)
  try {
    if (!k1) k1 = process.env.GEMINI_API_KEY;
  } catch (e) {}
  try {
    if (!k2) k2 = process.env.GEMINI_API_KEY_2;
  } catch (e) {}
  try {
    if (!k3) k3 = process.env.GEMINI_API_KEY_3;
  } catch (e) {}
  try {
    if (!k4) k4 = process.env.GEMINI_API_KEY_4;
  } catch (e) {}
  try {
    if (!k5) k5 = process.env.GEMINI_API_KEY_5;
  } catch (e) {}

  const keys = [k1, k2, k3, k4, k5]
    .filter((key) => !!key && !String(key).includes("your_api") && key !== "undefined")
    .map((key) => String(key).trim());

  if (keys.length === 0) {
    console.warn("API Keys are missing. Please ensure GEMINI_API_KEY is set.");
    return null;
  }

  const baseClient = new GoogleGenAI({ apiKey: keys[0] as string });

  baseClient.models.generateContent = async (config: any) => {
    let lastError;
    const maxRetries = 3;

    for (let retry = 0; retry < maxRetries; retry++) {
      for (let i = 0; i < keys.length; i++) {
        try {
          const client = new GoogleGenAI({ apiKey: keys[i] as string });
          return await client.models.generateContent(config);
        } catch (error: any) {
          lastError = error;
          const status = error?.status || error?.response?.status;
          const msg =
            typeof error?.message === "string"
              ? error.message
              : JSON.stringify(error?.message || "");
          const stringifiedError = JSON.stringify(error);

          const isQuotaError =
            status === 429 ||
            msg.includes("429") ||
            Math.floor(status) === 429 ||
            msg.toLowerCase().includes("quota") ||
            msg.toLowerCase().includes("exhausted") ||
            msg.includes("RATE_LIMIT_EXCEEDED") ||
            stringifiedError.includes("429") ||
            stringifiedError.toLowerCase().includes("quota") ||
            stringifiedError.toLowerCase().includes("exhausted");

          const isTempError =
            status >= 500 ||
            msg.includes("Internal error") ||
            msg.toLowerCase().includes("internal") ||
            msg.includes("500") ||
            msg.includes("503") ||
            stringifiedError.includes("500") ||
            stringifiedError.includes("503");

          if (isQuotaError) {
            if (i < keys.length - 1) {
              console.warn(
                `[Gemini API Key ${i + 1}] Quota exceeded or rate limited. Falling back to key ${i + 2}.`,
              );
              continue;
            }
          } else if (isTempError) {
            console.warn(
              `[Gemini API Key ${i + 1}] Temporary error encountered (${status || "unknown"}). Triggering retry...`,
            );
            break; // Break inner keys loop to trigger outer delay + retry
          } else {
            // Non-retryable error (e.g. 400 Bad Request, Authentication failed, etc.)
            throw error;
          }
        }
      }

      if (retry < maxRetries - 1) {
        const delayMs = 1500; // Fast retry instead of huge exponential backoff to prevent hanging
        console.log(
          `Retrying API call after ${delayMs}ms due to temporary error or quota... (Attempt ${retry + 2}/${maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    const finalMsg =
      typeof lastError?.message === "string"
        ? lastError.message
        : JSON.stringify(lastError?.message || "");
    if (
      finalMsg.toLowerCase().includes("quota") ||
      finalMsg.includes("429") ||
      finalMsg.toLowerCase().includes("exhausted")
    ) {
      throw new Error(
        `Quota limit reached across ${keys.length} API key(s) after retries. Please add more keys. Original Error: ${finalMsg}`,
      );
    }

    throw lastError;
  };

  return baseClient;
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

export const getStockImageUrl = async (
  keywords: string,
  category?: Category,
): Promise<string> => {
  if (typeof keywords !== "string") {
    keywords = String(keywords || "");
  }

  // Translate to English if Hindi text is detected, as Flux/image models struggle with it
  if (/[\u0900-\u097F]/.test(keywords)) {
    try {
      const ai = getAiClient();
      if (ai) {
        const transRes = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `Translate this Hindi news headline into a highly visual, 1-sentence English image prompt. Describe the scene or objects. Do not include names or text strings. Keyword: ${keywords}`,
        });
        if (transRes.text) keywords = transRes.text.trim();
      }
    } catch (e) {
      console.warn("Translation failed, proceeding with original", e);
    }
  }

  // Create a safe English representation for the background generation to prevent weird AI generations
  const safeCategory = String(category || "news")
    .toLowerCase()
    .replace(/[^a-z]/g, "");

  const contextMap: Record<string, string> = {
    politics: "real political rally parliament crowd event photo",
    national: "real government announcement event photo",
    state: "real regional town hall breaking event photo",
    crime: "real police intervention raid scene blur",
    international: "real international summit global event background",
    sports: "real sports stadium event background",
    entertainment: "real red carpet press conference event",
    lifestyle: "real lifestyle authentic daily life scene",
  };
  const categoryContext =
    contextMap[safeCategory] || "real breaking news event photo";

  const cleanKeywords = keywords
    .replace(/[^\p{L}\p{M}\p{N}\s,]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  const prompt = `Realistic Indian news report photography about: ${cleanKeywords}. Professional editorial journalism photography, ${categoryContext}. Must be highly relevant to the topic. No text or watermarks.`;

  try {
    const fetchUrl =
      typeof window !== "undefined"
        ? "/api/cloudflare-image"
        : process.env.VITE_SITE_URL
          ? `${process.env.VITE_SITE_URL}/api/cloudflare-image`
          : "http://localhost:3000/api/cloudflare-image";

    const cfReq = await fetch(fetchUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        model: "@cf/black-forest-labs/flux-1-schnell",
      }),
    });

    if (cfReq.ok) {
      const resData = await cfReq.json();
      if (resData.base64) {
        const b64 = `data:image/jpeg;base64,${resData.base64}`;
        const { uploadImage } = await import("./supabase");
        return await uploadImage(b64);
      }
    } else {
      console.error(
        "Cloudflare fallback image generation failed:",
        await cfReq.text(),
      );
    }
  } catch (e) {
    console.error("Cloudflare fallback image fetch failed", e);
  }
  return "";
};

import { compressImage } from "../src/utils/imageUtils";

/**
 * Generates a high-quality AI image using Gemini 2.5 Flash Image
 */
export const generateAiImage = async (
  prompt: string,
  specificInstructions?: string,
  referenceImageBase64?: string,
): Promise<string> => {
  const ai = getAiClient();
  if (!ai) throw new Error("API Key missing");

  try {
    let cleanPrompt = prompt;
    if (/[\u0900-\u097F]/.test(cleanPrompt)) {
      try {
        const transRes = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `Translate this Hindi news headline into a highly visual, 1-sentence English image prompt. Describe the scene or objects. Do not include names or text strings. Keyword: ${cleanPrompt}`,
        });
        if (transRes.text) cleanPrompt = transRes.text.trim();
      } catch (e) {
        console.warn("Translation failed, proceeding with original", e);
      }
    }

    const basePrompt = `Generate an ultra-realistic Indian news image about: ${cleanPrompt}

STRICT RULES:
Understand the news topic first and generate a relevant real-world scene or object related to it.
Avoid random human portraits unless necessary.
Prefer environments, places, objects, government offices, roads, farms, weather, police, technology, crowds, or activities matching the news.

Style:
Authentic newspaper photo, documentary journalism, photorealistic, natural lighting.

NEGATIVE:
No cartoon, no illustration, no glamour portrait, no cinematic lighting, no fantasy, no AI-art look, no jewelry focus, no close-up faces, no text, no watermark.

IMPORTANT: If a reference image is provided, you MUST match the face of the person exactly.`;

    const finalPrompt = specificInstructions
      ? `${basePrompt} ADDITIONAL ADMIN SPECIFICATIONS to strictly follow: ${specificInstructions}`
      : basePrompt;

    const parts: any[] = [{ text: finalPrompt }];

    if (referenceImageBase64) {
      const base64Data =
        referenceImageBase64.split(",")[1] || referenceImageBase64;
      const mimeType =
        referenceImageBase64.match(/data:(.*?);base64/)?.[1] || "image/jpeg";
      parts.unshift({
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
        },
      },
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

export const rewriteArticle = async (
  content: string,
  category: string,
  retries = 1,
): Promise<NewsDraft | string> => {
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
      model: "gemini-2.5-flash",
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
              description:
                "The full rewritten article in Hindi, formatted with HTML tags (<p>, <h2>, <strong>, etc.) for readability.",
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
          required: [
            "title",
            "excerpt",
            "content",
            "imageKeywords",
            "tags",
            "seoTitle",
            "metaDescription",
            "facebookCaption",
          ],
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
export const draftNewsReport = async (
  options: DraftNewsOptions,
): Promise<NewsDraft | string> => {
  const {
    rawNotes,
    location,
    sourceUrl,
    sourceImageBase64,
    wordLimit = 400,
  } = options;
  const ai = getAiClient();
  if (!ai) return "Error: API Key missing. Cannot generate report.";

  try {
    const prompt = `
      You are a professional Indian news journalist writing for a fast-growing Hindi news website.
      Write a 100% SEO-optimized, fact-based, human-like Hindi news article (450–650 words) based on the following information:
      
      Location: ${location || "Not specified"}
      Raw Notes / Topic: "${rawNotes || "None provided"}"
      ${sourceUrl ? `Source URL: ${sourceUrl}` : ""}
      
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
      const base64Data = sourceImageBase64.split(",")[1] || sourceImageBase64;
      const mimeType =
        sourceImageBase64.match(/data:(.*?);base64/)?.[1] || "image/jpeg";
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
      model: "gemini-2.5-flash",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        tools: tools.length > 0 ? tools : undefined,
      },
    });

    const rawText = response.text || "{}";
    let cleanedText = rawText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    try {
      cleanedText = jsonrepair(cleanedText);
      const draft = JSON.parse(cleanedText);
      let formattedContent = draft.content || "";
      if (typeof formattedContent === "string") {
        formattedContent = formattedContent.replace(
          /(?:\/n|\\n|\r?\n)+/g,
          "\n\n",
        );
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
        facebookCaption: draft.facebookCaption || "",
      };
    } catch (e) {
      console.error("JSON Parse Error in draftNewsReport:", e);
      return "Failed to parse AI response as JSON.";
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return `Error: Failed to connect to the news desk AI. ${error?.message || "Please try again later."}`;
  }
};

/**
 * Fetches real-world trending news keywords using Google Search grounding.
 * It also attempts to link them to existing articles if a match is found.
 */
export const fetchTrendingKeywords = async (): Promise<
  { label: string; articleSlug: string }[]
> => {
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
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        temperature: 0.9,
      },
    });

    const rawText = response.text || "[]";
    const cleanedText = rawText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    const keywords: string[] = JSON.parse(cleanedText);

    return keywords.map((kw) => ({
      label: kw,
      articleSlug: "",
    }));
  } catch (error) {
    console.error("AI Trending Keywords Error:", error);
    throw error;
  }
};

import { createArticle, getArticles, getSiteSettings } from "./articleService";
import { uploadImage } from "./supabase";

async function extractArticleLinks(
  url: string,
): Promise<{ title: string; link: string; content?: string }[]> {
  try {
    const response = await fetch(
      `/api/extract-links?url=${encodeURIComponent(url)}`,
    );
    if (!response.ok) {
      console.error(
        `Failed to fetch links from ${url}: ${response.statusText}`,
      );
      return [];
    }
    const data = await response.json();
    return data.results || [];
  } catch (e) {
    console.error(`Failed to extract links from ${url}:`, e);
    return [];
  }
}

import { getWikipediaImage } from "./wikipediaService";

export const checkDailyNewsStatus = async (
  rssSources: { url: string; category: string }[],
) => {
  if (!rssSources || rssSources.length === 0) {
    return [];
  }

  let existingSourceUrls: string[] = [];
  let existingTitles: string[] = [];
  try {
    const { data: recentArticles } = await getArticles(1, 20); // Check past 20 articles
    existingSourceUrls = recentArticles
      .map((a) => a.sourceUrl || a.source)
      .filter(Boolean) as string[];
    existingTitles = recentArticles.map((a) => a.title);
  } catch (e) {
    console.warn("Failed to fetch existing articles for deduplication:", e);
  }

  const now = new Date();
  const getWords = (str: string) =>
    str
      .toLowerCase()
      .replace(/[.,:;'"()!?\-।]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2);
  const cleanUrl = (url: string) => {
    try {
      const u = new URL(url);
      return u.origin + u.pathname;
    } catch {
      return url.split("?")[0].trim().toLowerCase();
    }
  };

  const normalizedExistingUrls = existingSourceUrls.map(cleanUrl);

  const statusPromises = rssSources.map(async (source) => {
    try {
      const res = await fetch(
        `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(source.url)}&api_key=`,
      );
      if (!res.ok) {
        return { source, freshCount: 0, error: "Failed to fetch RSS" };
      }
      const data = await res.json();
      const items = data.items || [];

      let freshCount = 0;
      for (const item of items) {
        // Strict duplicate check using URL
        const itemUrl = cleanUrl(item.link);
        const isDuplicateUrl = normalizedExistingUrls.includes(itemUrl);

        let isDuplicateTitle = false;
        if (
          existingTitles.some((et) => et.includes(item.title.substring(0, 15)))
        ) {
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
            if (ratio >= 0.35) {
              // Stricter threshold for check status
              isDuplicateTitle = true;
              break;
            }
          }
        }

        let hoursDiff = 0;
        if (item.pubDate) {
          const pubDate = new Date(item.pubDate.replace(/-/g, "/"));
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
      return { source, freshCount: 0, error: e.message || "Error occurred" };
    }
  });

  return Promise.all(statusPromises);
};

export const fetchDailyNews = async (
  rssSources: { url: string; category: string }[],
  aiModel: "gemini" | "openrouter" = "gemini",
  imageStrategy: "auto" | "manual" = "auto",
  imageGenModel: "gemini" | "cloudflare" = "gemini",
): Promise<Article[]> => {
  const ai = getAiClient();
  if (aiModel === "gemini" && !ai) throw new Error("API Key missing");

  if (!rssSources || rssSources.length === 0) {
    throw new Error("No RSS URLs provided for daily news fetch.");
  }

  // Fetch existing articles to avoid duplicates
  let existingSourceUrls: string[] = [];
  let existingTitles: string[] = [];
  try {
    const { data: recentArticles } = await getArticles(1, 30);
    existingSourceUrls = recentArticles
      .map((a) => a.sourceUrl || a.source)
      .filter(Boolean) as string[];
    existingTitles = recentArticles.map((a) => a.title);
  } catch (e) {
    console.warn("Failed to fetch existing articles for deduplication:", e);
  }

  const now = new Date();
  const today = now.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const currentTime = now.toLocaleTimeString("en-IN", { hour12: false });

  // Shuffle rssSources to pick random category/source instead of always the first one
  const shuffledSources = [...rssSources].sort(() => 0.5 - Math.random());

  const cleanUrl = (url: string) => {
    try {
      const u = new URL(url);
      return u.origin + u.pathname;
    } catch {
      return url.split("?")[0].trim().toLowerCase();
    }
  };
  const normalizedExistingUrls = existingSourceUrls.map(cleanUrl);

  const candidateItems = [];

  // Gather candidates, spreading across sources for variety
  for (const source of shuffledSources) {
    let sourceCandidates = 0;
    try {
      const res = await fetch(
        `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(source.url)}&api_key=`,
      );
      if (!res.ok) continue;
      const data = await res.json();
      const items = data.items || [];

      for (const item of items) {
        const itemUrl = cleanUrl(item.link);
        const isDuplicateUrl = normalizedExistingUrls.includes(itemUrl);

        let hoursDiff = 0;
        if (item.pubDate) {
          const pubDate = new Date(item.pubDate.replace(/-/g, "/"));
          if (!isNaN(pubDate.getTime())) {
            hoursDiff = (now.getTime() - pubDate.getTime()) / (1000 * 60 * 60);
          }
        }

        // If not explicitly a URL duplicate, and within 48 hours, add as candidate
        // We relax the hours condition slightly so AI has candidates to choose from
        if (!isDuplicateUrl && hoursDiff <= 48) {
          const videoUrl = (item.enclosure && item.enclosure.type && item.enclosure.type.startsWith('video/') && item.enclosure.link) ? item.enclosure.link : "";
          candidateItems.push({
            category: source.category,
            title: item.title,
            link: item.link,
            pubDate: item.pubDate,
            description: item.description,
            image:
              item.thumbnail || (item.enclosure && item.enclosure.link) || "",
            video: videoUrl
          });
          sourceCandidates++;
        }

        // Take up to 3 candidates per source so we check multiple sources
        if (sourceCandidates >= 3) break;
      }
    } catch (e) {
      console.error(`Failed to fetch RSS for ${source.url}:`, e);
    }

    if (candidateItems.length >= 15) {
      break;
    }
  }

  if (candidateItems.length === 0) {
    throw new Error(
      "No fresh news found (all recent RSS items seem to have matching URLs or are older).",
    );
  }

  const extractedArticlesData = [];
  for (const item of candidateItems) {
    let fullText = "";
    let sourceImageUrl = item.image || "";
    let additionalImages: string[] = [];
    if (item.video) {
      additionalImages.push(item.video);
    }
    try {
      const extractRes = await fetch(
        `/api/extract-article?url=${encodeURIComponent(item.link)}`,
      );
      if (extractRes.ok) {
        const extractData = await extractRes.json();
        fullText = extractData.content;
        if (extractData.image) {
          sourceImageUrl = extractData.image;
        }
        if (extractData.images && Array.isArray(extractData.images)) {
          additionalImages = extractData.images;
        }
        if (extractData.video) {
          // Put video at the beginning so it's the primary visual
          additionalImages.unshift(extractData.video);
        }
      }
    } catch (err) {
      console.warn(
        "Failed to extract full text, reading RSS summary instead:",
        err,
      );
    }

    extractedArticlesData.push({
      ...item,
      sourceImageUrl,
      additionalImages,
      content:
        fullText ||
        item.description ||
        "Article content not available. Please deduce from title.",
    });
  }

  const promptContext = extractedArticlesData
    .map(
      (data, index) => `
    CANDIDATE ID: ${index}
    - Category: ${data.category}
    - Original Title: ${data.title}
    - Source Link: ${data.link}
    - Source Image URL: ${data.sourceImageUrl || "none"}
    - Published Date: ${data.pubDate}
    - Extracted Content: ${data.content.substring(0, 3000)}
  `,
    )
    .join("\n\n");

  const recentTitlesList = existingTitles
    .slice(0, 30)
    .map((t) => `- ${t}`)
    .join("\n");

  try {
    const prompt = `
      You are a professional Indian news journalist writing for a fast-growing Hindi news website.

      Current Date & Time: ${today} ${currentTime}

      CRITICAL CONTEXT - STRICT RULE AGAINST DUPLICATION:
      We aim for complete variety. We MUST strictly avoid publishing news on the same topics we have covered in our last 30 articles!
      Here are the headlines of our most recently published articles:
      ${recentTitlesList}
      
      YOUR TASK:
      1. Review the CANDIDATE ARTICLES below.
      2. Choose EXACTLY ONE candidate article that discusses a COMPLETELY DIFFERENT topic than ALL 30 of the ones listed above.
      3. If an article covers a topic strongly related to any of the headlines above (even if there is a new update on it), SKIP IT! Pick the candidate that introduces the most significantly novel development or is about a completely different issue.
      4. Write a 100% SEO-optimized, fact-based, human-like Hindi news article (450–650 words) based ONLY on your chosen candidate.
      
      CANDIDATE ARTICLES:
      ${promptContext}

      For a Hindi news website 'Khabar Kal Tak'.

      Follow these strict rules for the article:
      1. Headline
      Create a powerful, clickable Hindi headline (8–12 words)
      Include main keyword
      2. Breaking Summary (VERY IMPORTANT)
      Write 2 short lines summarizing the news (viral style)
      3. Introduction (50–80 words)
      Answer: क्या, कब, कहां, किसने
      4. Main Content & Unique Angle (CRITICAL)
      Use 3–5 SEO subheadings (Use Markdown ## for subheadings, NO HTML tags)
      Include real facts, numbers, and latest updates FROM THE CHOSEN CANDIDATE TEXT ONLY.
      Do not sound like a standard news feed; inject deep journalistic analysis.
      5. Human Touch, Values & Emotion (IMPORTANT)
      Write in a deeply human manner. 
      Incorporate the values of common people (आम जनता की भावनाएं) into your writing.
      Ensure the narrative conveys REQUIRED EMOTIONS (e.g., outrage, hope, sadness, pride).
      6. User Value Section
      Add a section like:
      👉 “आम लोगों पर इसका क्या असर पड़ेगा?”
      👉 “आपको क्या करना चाहिए?”
      7. Conclusion
      2–3 lines summarizing impact
      8. SEO Rules & Formatting (CRITICAL)
      Article length: Structure the length based ONLY on available facts from the source. Do not force stretch the article.
      Keep paragraphs very short (2–3 lines maximum)
      Use Markdown formatting (like **bold**, ## Headings). DO NOT output any HTML tags.
      Use simple Hindi (mix of Hindi + easy English words)
      9. Tone
      Human-like, not robotic.
      Deeply engaging, informative, and highly emotional.

      STRICT REQUIREMENTS:
      1. **ONLY USE PROVIDED CANDIDATE TEXT**: 
         - DO NOT invent or search for external facts. 
      2. **SOURCE LINKS**:
         - You MUST provide the exact Source Link for the candidate you chose.

      Output a JSON array CONTAINING EXACTLY ONE OBJECT. Do not include any markdown formatting or code blocks outside the JSON.
      
      JSON Structure:
      [
        {
          "title": "HEADLINE (Hindi)",
          "candidateId": "MUST be the integer CANDIDATE ID from the chosen candidate",
          "excerpt": "SUMMARY (Hindi)",
          "content": "A single string containing the full article including Intro, Main Content, Data, User Value, Conclusion formatted nicely in Markdown WITHOUT SEO elements",
          "category": "State News" | "Politics" | "Crime" | "National" | "Sports" | "Entertainment" | "Lifestyle",
          "author": "Professional Journalist",
          "sourceUrl": "Return the EXACT Source Link string from the chosen CANDIDATE. Do not change it.",
          "sourceImageUrl": "Return the EXACT Source Image URL string from the chosen CANDIDATE. Do not change it.",
          "imageGenerationPlan": {
            "primarySubject": "Name of main subject/person for hero cutout (if applicable), e.g. 'Narendra Modi', 'Amit Shah'. MUST be a well-known entity on Wikipedia.",
            "englishImagePrompt": "A highly detailed, 1-sentence English description of the scene that perfectly describes the news event. E.g. 'Police arresting a suspect near a modern Indian bank building'. NO NAMES OF PEOPLE OR TEXT."
          },
          "tags": ["Tag 1", "Tag 2"],
          "seoTitle": "A 60 character SEO optimized title",
          "metaDescription": "A 120-150 character meta description",
          "facebookCaption": "A 2-line viral Facebook caption"
        }
      ]
    `;

    console.log(`Rewriting raw RSS news using ${aiModel}...`);

    let rawText = "[]";

    if (aiModel === "openrouter") {
      const openRouterKey =
        (import.meta as any).env?.VITE_OPENROUTER_API_KEY ||
        (typeof process !== "undefined" ? process.env.OPENROUTER_API_KEY : "");
      if (!openRouterKey) {
        throw new Error(
          "OpenRouter API Key is missing. Please set VITE_OPENROUTER_API_KEY in the environment.",
        );
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

      const promptWithFormatInstruction =
        prompt +
        "\n\n" +
        hindiQualityPrompt +
        "\n\nCRITICAL: Respond ONLY with valid JSON array, starting with [ and ending with ]. Do NOT wrap it in ```json\n...\n``` blocks. Do NOT include any conversational text before or after the JSON. Ensure there is no punctuation (like . or ।) outside of the double quotes. Valid JSON ONLY. Do NOT use double quotes inside your string values (use single quotes for quotes within text).";

      let response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openRouterKey.trim()}`,
            "HTTP-Referer":
              typeof window !== "undefined"
                ? window.location.href
                : "https://myapp.com",
            "X-Title": "News Applet",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openai/gpt-oss-120b:free",
            messages: [
              {
                role: "user",
                content: promptWithFormatInstruction,
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        console.warn(
          `Primary OpenRouter model failed with status ${response.status}. Falling back to openrouter/free...`,
        );
        response = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openRouterKey.trim()}`,
              "HTTP-Referer":
                typeof window !== "undefined"
                  ? window.location.href
                  : "https://myapp.com",
              "X-Title": "News Applet",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "openrouter/free",
              messages: [
                {
                  role: "user",
                  content: promptWithFormatInstruction,
                },
              ],
            }),
          },
        );
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
      const promptWithFormatInstruction =
        prompt +
        "\n\nCRITICAL: Respond ONLY with valid JSON array, starting with [ and ending with ]. Do NOT wrap it in ```json\n...\n``` blocks. Do NOT include any conversational text before or after the JSON. Ensure there is no punctuation (like . or ।) outside of the double quotes. Valid JSON ONLY. Do NOT use double quotes inside your string values (use single quotes for quotes within text).";

      const response = await ai!.models.generateContent({
        model: "gemini-2.5-flash",
        contents: promptWithFormatInstruction,
        config: {
          responseMimeType: "application/json",
          temperature: 0.7,
        },
      });

      console.log("AI Response received");
      rawText = response.text || "[]";
    }

    let cleanedText = rawText.trim();
    if (cleanedText.includes("```")) {
      const match = cleanedText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) cleanedText = match[1];
    }

    const firstB = cleanedText.indexOf("[");
    const lastB = cleanedText.lastIndexOf("]");
    if (firstB !== -1 && lastB !== -1 && lastB >= firstB) {
      cleanedText = cleanedText.substring(firstB, lastB + 1);
    }

    // Replace all actual newlines with spaces to avoid control character errors in strings
    cleanedText = cleanedText.replace(/\r?\n|\r/g, " ").replace(/\t/g, " ");

    // Fix common JSON errors models sometimes make
    cleanedText = cleanedText.replace(/"\s*\.\s*,/g, '",'); // Fixes "...".,
    cleanedText = cleanedText.replace(/"\s*।\s*,/g, '",'); // Fixes "..."।, (Hindi full stop)
    cleanedText = cleanedText.replace(/""\s*,/g, '",'); // Fixes trailing double quotes "...",
    cleanedText = cleanedText.replace(/,\s*}/g, "}"); // Fixes trailing commas in objects
    cleanedText = cleanedText.replace(/,\s*]/g, "]"); // Fixes trailing commas in arrays

    let rawArticles;
    try {
      cleanedText = jsonrepair(cleanedText);
      rawArticles = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error(
        "JSON Parse Error:",
        parseError,
        "Cleaned text was:",
        cleanedText.substring(0, 500) + "...",
      );
      throw new Error("Failed to parse AI response as JSON.");
    }

    if (!Array.isArray(rawArticles)) {
      throw new Error("AI response is not an array.");
    }

    // Helper for delay
    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    const articles: Article[] = [];

    // Process articles sequentially to avoid rate limits
    for (const a of rawArticles) {
      const category = mapCategory(a.category);
      let imageUrl = "";

      console.log(`Processing article: ${a.title}`);

      // Try to generate high-quality AI collage or fallback to standard logic
      if (imageStrategy === "auto") {
        try {
          const dp = (a as any).imageGenerationPlan || {};

          let additionalImages: string[] = [];

          // Guarantee real RSS image by matching candidate data, fallback to AI output
          let realCandidateImage = null;
          let matchedCandidate = null;

          if (
            typeof (a as any).candidateId === "number" &&
            extractedArticlesData[(a as any).candidateId]
          ) {
            matchedCandidate = extractedArticlesData[(a as any).candidateId];
            realCandidateImage = matchedCandidate.sourceImageUrl;
          }

          if (!realCandidateImage) {
            matchedCandidate =
              extractedArticlesData.find((cad) => cad.link === a.sourceUrl) ||
              extractedArticlesData.find(
                (cad) =>
                  a.title.includes(cad.title.substring(0, 15)) ||
                  cad.title.includes(a.title.substring(0, 15)),
              );
            if (matchedCandidate)
              realCandidateImage = matchedCandidate.sourceImageUrl;
          }

          if (matchedCandidate && matchedCandidate.additionalImages) {
            additionalImages = [...matchedCandidate.additionalImages];
          }

          let heroImage =
            realCandidateImage && realCandidateImage !== "none"
              ? realCandidateImage
              : null;
          if (!heroImage) {
            heroImage =
              (a as any).sourceImageUrl && (a as any).sourceImageUrl !== "none"
                ? (a as any).sourceImageUrl
                : null;
          }

          if (heroImage && !additionalImages.includes(heroImage)) {
            additionalImages.push(heroImage);
          }

          // If there's only 1 (or 0) images in additionalImages, generate an AI image based on major keywords
          if (additionalImages.length <= 1) {
            const imagePromptToUse =
              dp.englishImagePrompt || (a as any).seoTitle || a.title;
            console.log(
              "Only 0 or 1 image found in RSS. Generating an AI image based on keywords:",
              imagePromptToUse,
            );
            try {
              let aiGenImg = null;
              if (imageGenModel === "gemini") {
                const base64Img = await generateAiImage(imagePromptToUse);
                aiGenImg = await uploadImage(base64Img);
              } else {
                aiGenImg = await getStockImageUrl(imagePromptToUse, category);
              }
              if (aiGenImg) {
                additionalImages.push(aiGenImg);
              }
            } catch (err) {
              console.error(
                "Additional AI Image generation failed, fallback to Cloudflare",
                err,
              );
              try {
                let aiGenImg = await getStockImageUrl(
                  imagePromptToUse,
                  category,
                );
                if (aiGenImg) additionalImages.push(aiGenImg);
              } catch (fallbackErr) {
                console.error(
                  "Additional AI image fallback also failed",
                  fallbackErr,
                );
              }
            }
          }

          (a as any).additionalImages = additionalImages;

          // If no heroImage found at all, fallback to Gemini or Cloudflare
          if (!heroImage) {
            const imagePromptToUse =
              dp.englishImagePrompt || (a as any).seoTitle || a.title;
            console.log(
              "No RSS image found. Falling back to AI Image generation with prompt:",
              imagePromptToUse,
            );

            try {
              if (imageGenModel === "gemini") {
                console.log("Generating AI hero image with Gemini...");
                const base64Img = await generateAiImage(imagePromptToUse);
                heroImage = await uploadImage(base64Img);
              } else {
                console.log("Generating AI hero image with Cloudflare...");
                heroImage = await getStockImageUrl(imagePromptToUse, category);
              }
            } catch (err) {
              console.error(
                "Image generation failed, fallback to Cloudflare",
                err,
              );
              heroImage = await getStockImageUrl(imagePromptToUse, category);
            }
          }

          if (heroImage) {
            console.log(
              "Found source/primary image, creating premium editorial collage layout...",
            );

            // The frontend rendering engine uses the SAME image for both foreground and blurred background
            const contextImageUrl = null;

            let host =
              typeof window !== "undefined" ? window.location.origin : "";
            if (!host) {
              if (process.env.VERCEL_URL)
                host = `https://${process.env.VERCEL_URL}`;
              else if (process.env.URL)
                host = process.env.URL; // Netlify
              else host = `http://localhost:${process.env.PORT || 3000}`;
            }

            let finalHeroImageUrl = heroImage;

            try {
              if (typeof window !== "undefined") {
                const { createCollageOnFrontend } =
                  await import("../src/utils/frontendCollage");
                console.log(
                  "Generating premium collage entirely on frontend canvas...",
                );
                const base64Collage = await createCollageOnFrontend(
                  finalHeroImageUrl,
                  contextImageUrl,
                  host,
                );

                const { uploadImage } = await import("./supabase");
                const uploadedUrl = await uploadImage(base64Collage);
                if (uploadedUrl) {
                  imageUrl = uploadedUrl;
                  (a as any).featuredCollageImage = imageUrl;
                } else {
                  console.warn(
                    "Frontend Collage created but upload failed. Using raw heroImage.",
                  );
                  imageUrl = finalHeroImageUrl;
                }
              } else {
                throw new Error(
                  "Not in browser environment, cannot use canvas.",
                );
              }
            } catch (err: any) {
              console.error("Frontend Collage generation failed:", err);
              imageUrl = finalHeroImageUrl;
            }
          }
        } catch (e) {
          console.warn(
            "AI Image generation/upload failed, falling back to stock:",
            e,
          );
          const dp = (a as any).imageGenerationPlan || {};
          const imagePromptToUse =
            dp.englishImagePrompt || a.imagePrompt || a.title;
          imageUrl = await getStockImageUrl(imagePromptToUse, category);
        }
      } else {
        console.log(`Manual image override for: ${a.title}`);
        // imageUrl remains empty, admin will upload manually
      }

      const title = a.title;
      const excerpt = a.excerpt;
      const createdAt = new Date().toISOString();

      let formattedContent = a.content || "";
      if (typeof formattedContent === "string") {
        // Fix any model errors with slashes and ensure proper markdown paragraphs
        formattedContent = formattedContent.replace(
          /(?:\/n|\\n|\r?\n)+/g,
          "\n\n",
        );
      }

      const imgsToSave = (a as any).additionalImages || [];
      if (imgsToSave.length > 0) {
        formattedContent += `\n\n<!-- additionalImages: ${JSON.stringify(imgsToSave)} -->`;
      }

      const articleData: Omit<Article, "id"> = {
        title: title,
        slug: generateSlug(title),
        summary: excerpt,
        content: formattedContent,
        category: category,
        author: "Sankalp Jha", // Hardcoded as requested
        image: imageUrl,
        additionalImages: (a as any).additionalImages || [],
        featuredCollageImage: (a as any).featuredCollageImage || imageUrl,
        published_at: createdAt,
        created_at: createdAt,
        views: Math.floor(Math.random() * 8001) + 12000,
        source: a.sourceUrl || "",
        sourceUrl: a.sourceUrl || "",
        tags: a.tags || [],
        seoTitle: a.seoTitle,
        metaDescription: a.metaDescription,
        facebookCaption: a.facebookCaption,
      };

      // Save to Supabase Database
      const savedArticle = await createArticle(articleData);
      articles.push(savedArticle);

      // Cache SEO fields in localStorage for viral post generator
      try {
        if (
          typeof window !== "undefined" &&
          savedArticle.slug &&
          (a.seoTitle || a.facebookCaption)
        ) {
          localStorage.setItem(
            `seo_cache_${savedArticle.slug}`,
            JSON.stringify({
              seoTitle: a.seoTitle,
              metaDescription: a.metaDescription,
              facebookCaption: a.facebookCaption,
            }),
          );
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

export const fetchTickerHeadlines = async (
  category:
    | "national"
    | "state"
    | "mixed"
    | "sports"
    | "bollywood"
    | "viral"
    | "warroom" = "mixed",
): Promise<{ id: string; text: string }[]> => {
  const ai = getAiClient();
  if (!ai) throw new Error("API Key missing");

  // Fetch existing breaking news to avoid duplicates
  let existingHeadlines: string[] = [];
  try {
    const { data } = await supabase
      .from("breaking_news")
      .select("text")
      .limit(20);
    if (data) existingHeadlines = data.map((h: any) => h.text);
  } catch (e) {
    console.warn("Failed to fetch existing headlines for deduplication:", e);
  }

  const now = new Date();
  const today = now.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedDate = now.toISOString().split("T")[0];

  let stateNewsContext = "";
  if (category === "state" || category === "mixed") {
    let stateLinks = await extractArticleLinks(
      `https://dprcg.gov.in/news/date-wise-news/${formattedDate}`,
    );
    if (stateLinks.length === 0) {
      // Try yesterday's date
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayFormatted = yesterday.toISOString().split("T")[0];
      stateLinks = await extractArticleLinks(
        `https://dprcg.gov.in/news/date-wise-news/${yesterdayFormatted}`,
      );
    }

    if (stateLinks.length > 0) {
      stateNewsContext =
        "Here is the latest news from Chhattisgarh (DPRCG):\n" +
        stateLinks
          .map(
            (item) =>
              `Title: ${item.title}\nLink: ${item.link}\nContent: ${item.content || "Content not available"}`,
          )
          .join("\n\n");
    }
  }

  let promptContext = "";
  if (category === "national") {
    promptContext =
      "Generate 5 unique, short National India news headlines from Reuters India or PTI News. Use Google Search to find the latest news published within the last 24-48 hours.";
  } else if (category === "state") {
    if (stateNewsContext) {
      promptContext = `Generate 5 unique, short Chhattisgarh state news headlines using the following extracted news data:\n\n${stateNewsContext}\n\nYou MUST use this provided data to generate the headlines. DO NOT hallucinate news.`;
    } else {
      promptContext = `Generate 5 unique, short Chhattisgarh state news headlines. Use Google Search to find the latest news published within the last 24-48 hours.`;
    }
  } else if (category === "sports") {
    promptContext =
      "Generate 5 unique, short Sports news headlines from PTI Sports or Google News Sports. Use Google Search to find the latest news published within the last 24-48 hours.";
  } else if (category === "bollywood") {
    promptContext =
      "Generate 5 unique, short Entertainment news headlines. Use Google Search to find the latest news published within the last 24-48 hours.";
  } else if (category === "viral") {
    promptContext =
      "Generate 5 unique, short Viral/Trending news headlines from social media and internet buzz. Use Google Search to find the latest news published within the last 24-48 hours.";
  } else if (category === "warroom") {
    promptContext =
      "Generate 5 unique, short Defense/Geopolitics news headlines (Military, Conflicts, Strategy). Use Google Search to find the latest news published within the last 24-48 hours.";
  } else {
    if (stateNewsContext) {
      promptContext = `Generate 5 unique, short news headlines: 2 State and 2 National, plus 1 Sports. \n\nFor State news, use the following extracted data:\n${stateNewsContext}\n\nFor National and Sports, use Google Search to find the latest news published within the last 24-48 hours.`;
    } else {
      promptContext = `Generate 5 unique, short news headlines: 2 State, 2 National, and 1 Sports. Use Google Search to find the latest news published within the last 24-48 hours.`;
    }
  }

  const avoidList =
    existingHeadlines.length > 0
      ? `\n      DO NOT GENERATE THESE HEADLINES (Already exists):\n      ${existingHeadlines.slice(0, 15).join("\n      ")}`
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
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: toolsConfig,
        responseMimeType: "application/json",
        temperature: 0.9,
      },
    });

    const rawText = response.text || "[]";

    // More robust JSON extraction
    let cleanedText = rawText.trim();
    if (cleanedText.includes("```")) {
      const match = cleanedText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) cleanedText = match[1];
    }

    let rawHeadlines;
    try {
      cleanedText = jsonrepair(cleanedText);
      rawHeadlines = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error(
        "JSON Parse Error in Ticker:",
        parseError,
        "Raw text:",
        rawText,
      );
      // Fallback: try to find anything that looks like a JSON array
      const arrayMatch = rawText.match(/\[\s*".*?"\s*(?:,\s*".*?"\s*)*\]/s);
      if (arrayMatch) {
        try {
          rawHeadlines = JSON.parse(jsonrepair(arrayMatch[0]));
        } catch (e) {
          throw new Error("Failed to parse AI response as JSON headlines.");
        }
      } else {
        throw new Error("Failed to parse AI response as JSON headlines.");
      }
    }

    if (!Array.isArray(rawHeadlines)) {
      throw new Error("AI response is not an array of headlines.");
    }

    return rawHeadlines.map((text: string) => ({
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `ticker-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      text: text,
    }));
  } catch (error: any) {
    console.error("Ticker Fetch Error:", error);
    throw new Error(`Failed to fetch ticker headlines: ${error.message}`);
  }
};

export const mapCategory = (cat: string): Category => {
  if (cat.includes("State") || cat.includes("Chhattisgarh"))
    return Category.STATE;
  if (cat.includes("Politics")) return Category.POLITICS;
  if (cat.includes("Crime")) return Category.CRIME;
  if (cat.includes("Sports") || cat.includes("Cricket")) return Category.SPORTS;
  if (cat.includes("Bollywood") || cat.includes("Entertainment"))
    return Category.BOLLYWOOD;
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

export const generateViralPost = async (
  options: ViralPostOptions,
): Promise<ViralPost> => {
  const { article, customInstructions, previousPost, feedback } = options;
  const ai = getAiClient();
  if (!ai) throw new Error("API Key missing");

  // Map categories to specific section names
  const categoryMap: Record<string, string> = {
    Entertainment: "Entertainment Hub",
    "State News": "Chhattisgarh",
    Politics: "Politics",
    "Local/District": "Local News",
    "Jobs & Careers": "Jobs & Careers",
    Crime: "Crime",
    "RTI & Legal": "RTI & Legal",
    "Video News": "Video News",
    Sports: "Sports Arena",
    Lifestyle: "Lifestyle",
    "Viral Today": "Viral Trends",
    "War Room": "War Room",
  };

  const sectionName = categoryMap[article.category] || article.category;
  const articleUrl = `https://kktnews.vercel.app/article/${article.slug || article.id}`;

  let prompt = `
You are a viral Hindi news headline generator and thumbnail planner for "Khabar Kal Tak (KKT NEWS)".

INPUT:
Title: ${article.title}
Summary/Excerpt: ${article.summary || article.content.substring(0, 300)}
${options.cachedSeoInfo?.facebookCaption ? `Pre-drafted Facebook Caption (USE IT AS INSPIRATION FOR "caption" field): ${options.cachedSeoInfo.facebookCaption}` : ""}
Description: ${article.content.substring(0, 800)}
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
- CRUCIAL: You MUST include the EXACT article link at the very end of the caption: ${articleUrl}
- DO NOT invent a fake link. Use ONLY ${articleUrl}.
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
Choose one of these 4 highly professional, bottom-heavy news themes based on the news type. These themes are designed to leave the top 60% of the image completely clear for visual impact:

1. "pro_news_left": Left-aligned, bold, bottom-heavy text. Good for most news.
2. "pro_news_center": Center-aligned, bottom-heavy text. Good for impactful one-liners.
3. "pro_news_bold_red": Includes a distinct red background bar for the breaking tag at the bottom.
4. "pro_news_glass": Dark semi-transparent bottom pane, highly legible text.

Output STRICT JSON formatting:
{
  "theme": "<selected_theme_id>",
  "breaking_tag": "BREAKING NEWS / सावधान! / सोचने वाली बात! / etc.",
  "headline_line_1": "<first impactful line. Enclose important keywords in *asterisks* for highlights, e.g. *बड़ा ऐलान*>",
  "headline_line_2": "<second emotional/highlighted line. Enclose keywords in *asterisks*>",
  "subheadline": "<optional short explanation. Enclose important keywords in *asterisks* for highlights>",
  "summary": "<REQUIRED: 1-2 sentence news summary or key bullet points. Enclose important keywords in *asterisks* for highlights>",
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
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  const rawText = response.text || "{}";
  let cleanedText = rawText.trim();
  if (cleanedText.includes("```")) {
    const match = cleanedText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) cleanedText = match[1];
  }
  const firstB = cleanedText.indexOf("{");
  const lastB = cleanedText.lastIndexOf("}");
  if (firstB !== -1 && lastB !== -1 && lastB >= firstB) {
    cleanedText = cleanedText.substring(firstB, lastB + 1);
  }
  cleanedText = cleanedText.replace(/\r?\n|\r/g, " ").replace(/\t/g, " ");
  cleanedText = cleanedText.replace(/"\s*\.\s*,/g, '",');
  cleanedText = cleanedText.replace(/"\s*।\s*,/g, '",');
  cleanedText = cleanedText.replace(/""\s*,/g, '",');
  cleanedText = cleanedText.replace(/,\s*}/g, "}");
  cleanedText = cleanedText.replace(/,\s*]/g, "]");
  try {
    cleanedText = jsonrepair(cleanedText);
    return JSON.parse(cleanedText) as ViralPost;
  } catch (e) {
    console.error(
      "JSON Parse Error in generateViralPost:",
      e,
      "Cleaned text was:",
      cleanedText,
    );
    throw new Error("Failed to parse AI response as JSON for Viral Post.");
  }
};

export const generateViralImage = async (
  prompt: string,
  referenceImageBase64?: string,
  imageGenModel: "gemini" | "cloudflare" = "gemini",
): Promise<string> => {
  const ai = getAiClient();
  if (imageGenModel === "gemini" && !ai) throw new Error("API Key missing");

  try {
    if (imageGenModel === "cloudflare") {
      const cfPrompt = `Generate an ultra-realistic Indian news image about: ${prompt}

STRICT RULES:
Understand the news topic first and generate a relevant real-world scene or object related to it.
Avoid random human portraits unless necessary.
Prefer environments, places, objects, government offices, roads, farms, weather, police, technology, crowds, or activities matching the news.

Style:
Authentic newspaper photo, documentary journalism, photorealistic, natural lighting.

NEGATIVE:
No cartoon, no illustration, no glamour portrait, no cinematic lighting, no fantasy, no AI-art look, no jewelry focus, no close-up faces, no text, no watermark.`;

      const cfReq = await fetch("/api/cloudflare-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: cfPrompt,
          model: "@cf/black-forest-labs/flux-1-schnell", // Flux creates much better realistic photos and typically costs fewer steps/tokens.
        }),
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
        text: `Generate an ultra-realistic Indian news image about: ${prompt}

STRICT RULES:
Understand the news topic first and generate a relevant real-world scene or object related to it.
Avoid random human portraits unless necessary.
Prefer environments, places, objects, government offices, roads, farms, weather, police, technology, crowds, or activities matching the news.

Style:
Authentic newspaper photo, documentary journalism, photorealistic, natural lighting.

NEGATIVE:
No cartoon, no illustration, no glamour portrait, no cinematic lighting, no fantasy, no AI-art look, no jewelry focus, no close-up faces, no text, no watermark.

IMPORTANT: If a reference image is provided, you MUST match the face of the person exactly. If the reference image contains any text, IGNORE IT. Do NOT copy any text into the generated image.`,
      },
    ];

    if (referenceImageBase64) {
      const base64Data =
        referenceImageBase64.split(",")[1] || referenceImageBase64;
      const mimeType =
        referenceImageBase64.match(/data:(.*?);base64/)?.[1] || "image/jpeg";
      parts.unshift({
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      });
    }

    if (!ai) throw new Error("API Key missing");
    const response = await ai.models.generateContent({
      model: "models/imagen-3.0-generate-002", // Use stable imagen alias
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

export const generateReelScript = async (
  articleContent: string,
): Promise<ReelScript> => {
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
- First, classify the news (Breaking, Local, Entertainment, Tragedy, Tech). Then generate a hook based on the category. DO NOT use "बड़ी खबर" unless it's a major event. Use context-appropriate hooks like "क्या आपको पता है...", "वायरल हो रहा है...", or "[शहर] से अपडेट...".
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
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "{}";
    const cleanedText = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    return JSON.parse(cleanedText) as ReelScript;
  } catch (error) {
    console.error("Reel script generation failed", error);
    throw error;
  }
};

export const searchWebImages = async (query: string): Promise<{url: string, score: number, source: string} | null> => {
  try {
    const res = await fetch('/api/search-images', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    });
    
    if (res.ok) {
      const data = await res.json();
      if (data.images && data.images.length > 0) {
        return { url: data.images[0].url, score: 90, source: 'DuckDuckGo' };
      }
    }
    return null;
  } catch (error) {
    console.error("DuckDuckGo search error:", error);
    return null;
  }
}

export const planScenesForScript = async (script: string) => {
  const ai = getAiClient();
  if (!ai) throw new Error("API Key missing");

  const prompt = `You are a Senior AI Video Pipeline Architect.
Split the following news script into logical scenes (1-2 sentences each). 
For each scene, define the purpose (Hook, Main Fact, Evidence, Context, Impact, Public Reaction, Government Action, Closing).
Return strictly ONLY raw JSON without markdown formatting.

Format:
{
  "scenes": [
    {
      "scene_id": 1,
      "purpose": "Hook",
      "voiceover_text": "..."
    }
  ]
}

Script to analyze:
${script}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      temperature: 0.2
    }
  });

  let parsed: any;
  try {
    const text = response?.text || '{}';
    let cleanedText = text;
    if (text.includes('```json')) {
      cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    }
    parsed = JSON.parse(cleanedText);
  } catch(e) {
    throw new Error("Failed to parse Gemini JSON response for planning scenes.");
  }

  if (!parsed || !parsed.scenes) {
    throw new Error("Invalid format returned by AI. Missing scenes array.");
  }

  return parsed;
};

export const findShotsForScene = async (sceneText: string, purpose: string) => {
  const ai = getAiClient();
  if (!ai) throw new Error("API Key missing");

  const prompt = `You are a Senior AI Video Pipeline Architect and Director Agent.
Your task is to act as an "Auto Video Director and Editor" for a news reel.

We are working on a specific scene with the following details:
Scene Text: "${sceneText}"
Purpose: "${purpose}"

Think like a human television editor.
DO NOT think like a keyword extractor.

==================================================================
CRITICAL RULE #1
KEYWORDS ARE NOT SHOTS
==================================================================
BAD:
Script: "अबूझमाड़ में नक्सलवाद खत्म हुआ लेकिन जंगल कटाई बढ़ रही है"
Generated shots:
1. Abujhmad map
2. Peace
3. Deforestation
4. Forest destruction
This is WRONG. It creates a keyword slideshow.
Instead understand the story.

GOOD:
Shot 1: Location Introduction
Shot 2: Situation Change
Shot 3: New Threat

==================================================================
CRITICAL RULE #2
SHOTS MUST REPRESENT INFORMATION CHANGES
==================================================================
Every shot must introduce NEW information.
Ask: "What new information does this shot add?"
If the answer is: "Nothing new"
DO NOT CREATE THE SHOT.

==================================================================
CRITICAL RULE #3
MERGE DUPLICATE VISUAL IDEAS
==================================================================
BAD: forest, tree cutting, forest destruction
These are nearly identical. Merge them into one visual idea.
GOOD: Dense forest, Logging activity, Cleared land aftermath

==================================================================
CRITICAL RULE #4
NEVER USE ABSTRACT VISUALS
==================================================================
BAD: corruption, negligence, poor governance, anger, criticism, peace, development, lax system, administrative failure
These cannot be reliably searched. Convert abstract concepts into physical visuals.
GOOD: government office, official meeting, court building, judge bench, inspection team, fire extinguisher, road construction, security forces, warning notice, government file, school building, hospital

==================================================================
CRITICAL RULE #5
CREATE STORY STRUCTURE FIRST
==================================================================
Before creating any shot identify:
{
  "location": "",
  "main_actor": "",
  "topic": "",
  "past_state": "",
  "current_state": "",
  "conflict": "",
  "threat": "",
  "government_action": "",
  "impact": "",
  "emotion": ""
}

==================================================================
CRITICAL RULE #6
CREATE NARRATIVE FLOW
==================================================================
Convert the story into a narrative.
Example:
Script: "नक्सलवाद से मुक्ति के बाद अब जंगल कटाई का संकट"
Narrative: 1. Location, 2. Recovery, 3. New Threat
Generate shots from the narrative. NOT from keywords.

==================================================================
CRITICAL RULE #7
USE SHOT PURPOSES
==================================================================
Allowed purposes:
- Hook
- Location Establishment
- Character Introduction
- Main Fact
- Situation Introduction
- Context
- Evidence
- Comparison
- Transition
- Threat Reveal
- Government Action
- Public Impact
- Statistics
- Outcome
- Closing
Every shot MUST have one purpose.

==================================================================
CRITICAL RULE #8
VISUAL DIVERSITY
==================================================================
Adjacent shots must look visually different.
BAD: court building -> another court building -> judge building
GOOD: court building -> judge bench -> government office -> inspection footage

==================================================================
CRITICAL RULE #9
SHOT COUNT
==================================================================
Hook sentence: 2-3 shots maximum
Normal information: 1-2 shots
Major reveal: 1 shot
Never create unnecessary shots. Prefer fewer meaningful shots over many repetitive shots.

==================================================================
CRITICAL RULE #10
VISUAL SEARCH STRATEGY
==================================================================
For every shot generate:
Priority 1: Real visuals
Priority 2: Context visuals
Priority 3: Symbolic visuals

==================================================================
CRITICAL RULE #11
SEARCHABLE QUERIES ONLY
==================================================================
Every visual query must be searchable on Wikimedia/Pexels/Pixabay/Unsplash.
BAD QUERY: "government inefficiency"
GOOD QUERY: "government office india"
BAD QUERY: "criticism"
GOOD QUERY: "judge bench india"
Provide exactly 3 short, English search queries per shot (max 3 words each) that represent the Real, Context, and Symbolic needs. These must be in the \`search_queries\` field.

==================================================================
CRITICAL RULE #12
INFORMATION ADDED FIELD
==================================================================
Every shot MUST contain an "information_added" field explaining what new info it brings.
If two shots contain the same information_added value, MERGE THEM.

==================================================================
CRITICAL RULE #13
SHOT VALIDATION
==================================================================
Before finalizing every shot ask:
1. Does it add new information?
2. Is it visually different from the previous shot?
3. Is it searchable?
4. Would a TV editor actually show this?
If any answer is NO, regenerate the shot.

==================================================================
ADDITIONAL ELEMENTS
==================================================================
Select motion for each shot from: slow_zoom_in, slow_zoom_out, push_in, push_out, pan_left, pan_right, parallax, dynamic_crop, spotlight_focus, counter_animation, split_screen.
Select overlays for each shot (e.g., breaking_banner, warning_banner, exclusive_tag, notice_counter, red_arrow, map_pin, location_card).
Select modern text animations (e.g., typewriter, kinetic_typography, neon_glow, glitch_text, highlight_reveal).
Select shot-specific SFX (e.g., alert_hit, siren_short, success_hit, shine, paper_flip, whoosh, impact_hit, tension_rise).

==================================================================
OUTPUT FORMAT
==================================================================
Return ONE complete JSON containing exactly this structure:
{
  "story_structure": {
    "location": "",
    "main_actor": "",
    "topic": "",
    "past_state": "",
    "current_state": "",
    "threat": "",
    "impact": ""
  },
  "narrative_flow": ["..."],
  "shots": [
    {
      "shot_id": 1,
      "purpose": "",
      "information_added": "",
      "duration": 2,
      "visual_requirements": ["..."],
      "visual_hierarchy": {
        "real": ["..."],
        "context": ["..."],
        "symbolic": ["..."]
      },
      "search_queries": ["...", "...", "..."],
      "motion": "slow_zoom_in",
      "transition": "fade",
      "text_animation": "glitch_text",
      "graphics": ["breaking_banner"],
      "sfx": ["alert_hit"],
      "ffmpeg_instructions": {
        "start": 0,
        "end": 2,
        "motion": "slow_zoom_in",
        "transition": "fade",
        "text_animation": "glitch_text",
        "graphics": ["breaking_banner"],
        "sfx": ["alert_hit"]
      }
    }
  ]
}

Return strictly ONLY the raw JSON without markdown formatting.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      temperature: 0.2
    }
  });

  let parsed: any;
  try {
    const text = response?.text || '{}';
    let cleanedText = text;
    if (text.includes('```json')) {
      cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    }
    parsed = JSON.parse(cleanedText);
  } catch(e) {
    throw new Error("Failed to parse Gemini JSON response for finding visuals.");
  }

  if (!parsed || !parsed.shots) {
    throw new Error("Invalid format returned by AI. Missing shots array.");
  }

  for (const shot of parsed.shots) {
    let bestVisual = null;
    const allQueries = shot.search_queries || [];
    
    for (const query of allQueries) {
        if (!query) continue;
        const result = await searchWebImages(query);
        
        if (result && (!bestVisual || result.score > bestVisual.score)) {
            bestVisual = {
                url: result.url,
                score: result.score,
                source: result.source,
                query: query
            };
            if (result.score >= 90) break;
        }
    }
    
    if (bestVisual) {
        shot.selected_visual = bestVisual.url;
        shot.relevance_score = bestVisual.score;
        shot.source = `${bestVisual.source} (${bestVisual.query})`;
    } else {
        shot.selected_visual = null;
        shot.relevance_score = 0;
        shot.source = 'None found';
    }
  }

  return parsed.shots;
};

export const findVisualsForScript = async (script: string) => {
  const ai = getAiClient();
  if (!ai) throw new Error("API Key missing");

  const prompt = `You are a Senior AI Video Pipeline Architect and Director Agent.
Your task is to act as an "Auto Video Director and Editor" for a news reel.

STEP 1 - DIRECTOR AGENT
Split the story into scenes based on the script. Define the purpose (Hook, Main Fact, Evidence, Context, Impact, Public Reaction, Government Action, Closing), timing, and visual/motion/graphics/sfx needs.
Output story_type, emotion, importance, estimated_duration.

STEP 2 - ASSET PLANNER & PACING
A professional digital editor of a news channel changes visuals every 1-2 seconds to keep high energy.
For each scene, plan MULTIPLE SHOTS. Each shot should last 1-2 seconds.
Generate "visual_requirements", "text_animation", "graphics", and "sfx" for each shot.

STEP 3 - VISUAL HIERARCHY
For every shot generate: "real", "context", and "symbolic" visual queries.
CRITICAL RULE: Always convert abstract concepts into physically searchable visual objects, locations, people, documents, vehicles, buildings, inspections, equipment, maps, symbols or actions. Never use abstract terms like "lax system" or "corruption" as visual requirements. Instead use concrete items like "unfinished construction", "broken mechanism", "red tape documents", or "fire safety inspection".

STEP 4, 5 - SEARCH AND SCORING STRATEGY
Provide 3 short, English search queries per shot (max 3 words each) that represent the Real, Context, and Symbolic needs.

STEP 6 - MOTION PLANNER
Select motion for each shot from: slow_zoom_in, slow_zoom_out, push_in, push_out, pan_left, pan_right, parallax, dynamic_crop, spotlight_focus, counter_animation, split_screen.

STEP 7 - GRAPHICS & TEXT PLANNER
Select overlays for each shot (e.g., breaking_banner, warning_banner, exclusive_tag, notice_counter, red_arrow, map_pin, location_card).
Select modern text animations (e.g., typewriter, kinetic_typography, neon_glow, glitch_text, highlight_reveal).

STEP 8 - SFX PLANNER
Select shot-specific SFX (e.g., alert_hit, siren_short, success_hit, shine, paper_flip, whoosh, impact_hit, tension_rise).

STEP 9 - FFMPEG INSTRUCTIONS
Generate the intended FFmpeg editing parameters for each shot: start, end, motion, transition, text_animation, graphics, sfx.

STEP 10 - FINAL OUTPUT
Return ONE complete storyboard JSON containing exactly this structure:
{
  "story_type": "",
  "emotion": "",
  "importance": "",
  "estimated_duration": 25,
  "scenes": [
    {
      "scene_id": 1,
      "purpose": "Hook",
      "voiceover_text": "...",
      "shots": [
        {
          "shot_id": 1,
          "duration": 2,
          "visual_requirements": ["..."],
          "visual_hierarchy": {
            "real": ["..."],
            "context": ["..."],
            "symbolic": ["..."]
          },
          "search_queries": ["...", "...", "..."],
          "motion": "slow_zoom_in",
          "transition": "fade",
          "text_animation": "glitch_text",
          "graphics": ["breaking_banner"],
          "sfx": ["alert_hit"],
          "ffmpeg_instructions": {
            "start": 0,
            "end": 2,
            "motion": "slow_zoom_in",
            "transition": "fade",
            "text_animation": "glitch_text",
            "graphics": ["breaking_banner"],
            "sfx": ["alert_hit"]
          }
        }
      ]
    }
  ]
}

Return strictly ONLY the raw JSON without markdown formatting.

Script to analyze:
${script}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      temperature: 0.2
    }
  });

  let parsed: any;
  try {
    const text = response?.text || '{}';
    let cleanedText = text;
    if (text.includes('```json')) {
      cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    }
    parsed = JSON.parse(cleanedText);
  } catch(e) {
    throw new Error("Failed to parse Gemini JSON response for finding visuals.");
  }

  if (!parsed || !parsed.scenes) {
    throw new Error("Invalid format returned by AI. Missing scenes array.");
  }

  // Flatten scenes into shots to match the existing UI/Render pipeline
  const flattenedShots = [];
  let globalShotIndex = 1;

  for (const scene of parsed.scenes) {
    if (scene.shots && Array.isArray(scene.shots)) {
      for (const shot of scene.shots) {
        flattenedShots.push({
          scene_number: globalShotIndex++, // mapped to UI scene_number
          scene_group_id: scene.scene_id || Math.random().toString(36).substring(7),
          shot_id_in_scene: shot.shot_id || 1,
          voiceover_text: scene.voiceover_text,
          purpose: scene.purpose,
          visual_requirements: shot.visual_requirements,
          visual_hierarchy: shot.visual_hierarchy,
          search_queries: shot.search_queries,
          motion: shot.motion,
          transition: shot.transition,
          text_animation: shot.text_animation,
          graphics: shot.graphics,
          sfx: shot.sfx,
          ffmpeg_instructions: shot.ffmpeg_instructions
        });
      }
    } else {
      // Fallback if AI didn't follow the nested structure perfectly
      flattenedShots.push({
        ...scene,
        scene_number: globalShotIndex++
      });
    }
  }

  parsed.scenes = flattenedShots;

  for (let i = 0; i < parsed.scenes.length; i++) {
    const scene = parsed.scenes[i];
    scene.scene_number = i + 1;
    
    let bestVisual = null;
    const allQueries = scene.search_queries || [];
    
    for (const query of allQueries) {
        if (!query) continue;
        const result = await searchWebImages(query);
        
        if (result && (!bestVisual || result.score > bestVisual.score)) {
            bestVisual = {
                url: result.url,
                score: result.score,
                source: result.source,
                query: query
            };
            if (result.score >= 90) break;
        }
    }
    
    if (bestVisual) {
        scene.selected_visual = bestVisual.url;
        scene.relevance_score = bestVisual.score;
        scene.source = `${bestVisual.source} (${bestVisual.query})`;
    } else {
        scene.selected_visual = null;
        scene.relevance_score = 0;
        scene.source = 'None found';
    }
  }

  return parsed;
};

export const generateFullReelScript = async (
  articleContent: string,
  template: any,
) => {
  const ai = getAiClient();
  if (!ai) throw new Error("API Key missing");

  const coords = template.coordinates || {};
  const hasHeadline = coords.headline_box && coords.headline_box !== "hidden";
  const hasTicker = coords.ticker_box && coords.ticker_box !== "hidden";
  const hasSubtitles = coords.subtitle_box && coords.subtitle_box !== "hidden";

  const prompt = `You are a professional TV News Anchor. Write a high-retention professional Hindi breaking news script.
Use ONLY facts from the article. NEVER hallucinate names, numbers, quotes, causes, or outcomes.

ARTICLE TEXT:
${articleContent}

Format rules for high engagement (TARGET DURATION AROUND 30 SECONDS, MAXIMUM 60-70 WORDS):
0–5 sec: HOOK (First, classify the news into a category: Breaking, Local, Entertainment, Tragedy, Tech. Generate a dynamic, context-aware hook strictly based on the category. DO NOT use generic "बड़ी खबर" (Breaking News) unless it's a major national/international event. For small/local news use "क्या आपको पता है..." or "[शहर] से आज की अपडेट...". For entertainment use "वायरल हो रहा है...". For tragedy use "एक गंभीर मामला...". Be creative and dynamic, maintaining an appropriate tone for the news type).
5–15 sec: What happened (The core fact delivered with clear professional urgency)
15–25 sec: Why important (Impact and crucial details without filler)
25–30 sec: Professional Sign-off (Dynamic and professional sign-off that psychologically compels viewers to engage. MUST include a question asking for viewers' opinions or suggestions on the matter to drive comments, followed by a powerful call to action to 'like' and 'follow' for more updates. DO NOT use 'subscribe', strictly use 'follow'. E.g., "आपकी इस पर क्या राय है? कमेंट में बताएं और ऐसी ही खबरों के लिए हमें फॉलो करें").

- STRICT WORD LIMIT: The entire voiceoverScript MUST be between 60 to 75 words to ensure a 30-second duration.
- Sentences MUST be short, clear, and punchy. No long storytelling.
- Tone MUST be like a fast-paced professional TV news anchor (authoritative, clear, highly energetic and urgent, yet highly compelling and engaging).
${hasSubtitles ? `
Subtitles Requirements (CRITICAL):
- Break the ENTIRE voiceoverScript into chunks of maximum 3-5 words.
- The combination of ALL subtitleChunks MUST match the EXACT word-for-word text of the voiceoverScript without skipping or summarizing anything.
- Provide them as an array of strings under "subtitleChunks".` : ""}

Categorization & Style:
- "reelType": Breaking News, Explainer, Debate, or Useful Update.
- "stylePreset": breaking_news (Fast zoom, red urgency), explainer (Clean style, slower pacing), debate, useful_update.

Return EXACTLY VALID MAPPED JSON (No markdown formatting, no comments, properly escape inner quotes):
{
  ${hasHeadline ? '"headline": "Short top headline",' : ""}
  "voiceoverScript": "Full script combining Hook... (Must read like fluent conversational Hindi)",
  ${hasSubtitles ? '"subtitleChunks": ["रायपुर में", "बड़ा मामला", "सामने आया"],' : ""}
  ${hasTicker ? '"ticker": "Scrolling breaking news text",' : ""}
  "reelType": "string",
  "stylePreset": "string",
  "visualKeywords": "3-5 keywords for searching stock footage"
}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const rawText = response.text || "{}";
    let cleanedText = rawText;

    // Sometimes models wrap json in markdown
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanedText = jsonMatch[0];
    } else {
      cleanedText = cleanedText
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();
    }

    let result;
    try {
      result = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Failed to parse JSON string:", cleanedText);
      throw parseError;
    }

    // Fallbacks just in case the renderer expects `subtitles`.
    if (result.subtitleChunks && Array.isArray(result.subtitleChunks)) {
      result.subtitles = result.subtitleChunks;
    }
    return result;
  } catch (error) {
    console.error("Gemini full reel script error:", error);
    throw error;
  }
};

export const generateReelAudio = async (script: string): Promise<string> => {
  const ai = getAiClient();
  if (!ai) throw new Error("API Key missing");

  const ttsPrompt = `Read the following news script in an engaging, fast-paced, and energetic professional news anchor tone.
Speak with a clear, authoritative, and urgent reporting style. Deliver the news quickly and dynamically to keep the viewer hooked, ensuring the ending call-to-action (if any) sounds highly compelling and natural.
Ensure clear articulation and punch the key words to maintain high engagement.

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
            prebuiltVoiceConfig: { voiceName: "Puck" }, // Professional news anchor voice
          },
        },
      },
    } as any);

    const base64Audio =
      response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data returned from TTS API");

    return base64Audio;
  } catch (error) {
    console.error("Reel audio generation failed", error);
    throw error;
  }
};

export const editReelScriptWithAI = async (
  scriptData: any,
  styleOverrides: any,
  editPrompt: string,
) => {
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

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Failed to edit reel script with AI", error);
    throw error;
  }
};

export const analyzeViralTemplate = async (imageUrlOrBase64: string) => {
  const ai = getAiClient();
  if (!ai) throw new Error("API Key missing");

  const prompt = `You are a computer vision expert analyzing a viral news post image to convert it into a reusable template.
Identify the bounding boxes of the textual elements and the main news photograph.
1. "image_box": The main news photograph or illustration.
2. "Headline": The main big bold text.
3. "Subheadline": The secondary explanation text.
4. "Summary": Bullet points or a paragraph.
5. "Breaking Tag": A small alert box like "BREAKING" or "ALERT".

For each element, estimate its bounding box in percentage terms:
X, Y: top-left corner (0-100)
W, H: width and height (0-100)
Format the box as a string: "X%, Y%, W%, H%"

Additionally, for the text elements (Headline, Subheadline, Summary), determine the solid background color behind the text. If the text is overlaid directly on a photograph with no solid background, return "transparent". If it's on a solid background, return the hex color (e.g., "#FFFFFF", "#000000", "#FF0000"). This is crucial so we can paint over the old text with this background color to "clean" the template.

Also estimate font sizes as a multiplier (1.0 is default). A huge headline might be 1.5 - 2.0, while small text might be 0.8.

Return a JSON object with this exact structure (if an element is not present, mark the boolean as false and leave the box empty).

{
  "hasImage": true,
  "image_box": "0%, 0%, 100%, 50%",
  "hasHeadline": true,
  "headline_box": "10%, 55%, 80%, 15%",
  "hasSubheadline": true,
  "subheadline_box": "10%, 75%, 80%, 10%",
  "hasSummary": false,
  "summary_box": "",
  "hasBreakingTag": true,
  "breaking_tag_box": "10%, 45%, 30%, 8%",
  "style_rules": {
    "headlineColor": "#000000",
    "subheadlineColor": "#333333",
    "summaryColor": "#666666",
    "breakingTagColor": "#FFFFFF",
    "breakingTagBg": "#DC2626",
    "headlineBg": "#FFFFFF",
    "subheadlineBg": "#EEEEEE",
    "summaryBg": "transparent",
    "headlineFontSizeMult": 1.2,
    "subheadlineFontSizeMult": 1.0,
    "summaryFontSizeMult": 0.9
  }
}
`;

  try {
    let base64Data = "";
    let mimeType = "image/jpeg";

    if (imageUrlOrBase64.startsWith("http")) {
      const resp = await fetch(imageUrlOrBase64);
      const blob = await resp.blob();
      mimeType = blob.type;

      base64Data = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = reader.result as string;
          resolve(res.split(",")[1] || res);
        };
        reader.readAsDataURL(blob);
      });
    } else {
      base64Data = imageUrlOrBase64.split(",")[1] || imageUrlOrBase64;
      mimeType =
        imageUrlOrBase64.match(/data:(.*?);base64/)?.[1] || "image/jpeg";
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType,
              },
            },
            { text: prompt },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error analyzing viral template:", error);
    throw error;
  }
};

export const analyzeTemplateImprovement = async (
  previewImageUrl: string,
  templateConfigStr: string,
  newsCategory: string,
  appliedFixes: string[],
): Promise<any> => {
  const ai = getAiClient();
  if (!ai) throw new Error("API Key missing");

  // Since previewImageUrl might be a data URL, extract the base64 part
  const base64Data = previewImageUrl.split(",")[1] || previewImageUrl;
  const mimeType =
    previewImageUrl.match(/data:(.*?);base64/)?.[1] || "image/png";

  const prompt = `You are a Senior Creative Director of a Premium Hindi News Brand focused on virality + trustworthiness.
Analyze the CURRENT generated auto viral post preview image along with its current template configuration JSON.
News Category: ${newsCategory}

Evaluate the layout based on:
1. Readability: Check text visibility, spacing, crowding, text overlap, safe margins.
2. Professional Look: Premium feel vs spam/sensational appearance, typography quality, color harmony.
3. Virality: Attention-grabbing power, visual impact.
4. Trust Factor: News authenticity appearance, credibility.
5. Image Compatibility: Whether text works with image brightness, readability over background.

Rules:
- Do not manually edit image pixels. You can ONLY modify template settings like colors, background opacity, font size multipliers, and box coordinates (x%, y%, w%, h%).
- Avoid repeating these previously applied fixes: ${JSON.stringify(appliedFixes)}
- Max font size change (e.g. headlineFontSizeMult): ±15% from current.
- Max size/position change (w/h/x/y in coordinates): ±20% from current.

Current Template Config:
\`\`\`json
${templateConfigStr}
\`\`\`

Return a STRICT JSON response only (no markdown, no explanations) containing:
{
  "overallScore": 74,
  "scores": { "readability": 81, "professionalLook": 58, "virality": 86, "trustFactor": 61 },
  "issues": [ { "problem": "...", "severity": "high/medium/low", "reason": "..." } ],
  "recommendedChanges": {
    "headlineFontSizeMult": { "old": 1.2, "new": 1.1 },
    "headline_box": { "old": "10%, 50%, 80%, 20%", "new": "10%, 55%, 80%, 15%" },
    "headlineColor": { "old": "#FFFFFF", "new": "#EEEEEE" }
  },
  "predictedImprovement": { "before": 74, "after": 88 },
  "newFixesKeys": ["reduced_headline_size", "adjusted_headline_pos"]
}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType,
              },
            },
            { text: prompt },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (error) {
    console.error("Error analyzing template improvement:", error);
    throw error;
  }
};
