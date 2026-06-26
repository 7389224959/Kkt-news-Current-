import { GoogleGenAI } from "@google/genai";

export const maxDuration = 60; // Allow more time on Vercel

async function searchWebImages(query: string): Promise<{url: string, score: number, source: string} | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500); 

  try {
    // 1. Try Wikimedia Commons search
    const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=3&iiprop=url`;
    const commonsRes = await fetch(commonsUrl, {
      headers: { 'User-Agent': 'NewsVisualFinder/1.0 (contact@example.com)' },
      signal: controller.signal
    });
    
    if (commonsRes.ok) {
        const commonsData = await commonsRes.json();
        if (commonsData.query && commonsData.query.pages) {
          for (const key of Object.keys(commonsData.query.pages)) {
            const page = commonsData.query.pages[key];
            if (key !== "-1" && page.imageinfo && page.imageinfo.length > 0) {
                const imgUrl = page.imageinfo[0].url;
                if (!imgUrl.endsWith('.svg') && !imgUrl.endsWith('.pdf')) {
                    clearTimeout(timeoutId);
                    return {url: imgUrl, score: 85, source: 'Wikimedia'};
                }
            }
          }
        }
    }

    // 2. Try Pexels (if API key available)
    if (process.env.PEXELS_API_KEY) {
        const pexelsRes = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1`, {
            headers: { 'Authorization': process.env.PEXELS_API_KEY },
            signal: controller.signal
        });
        if (pexelsRes.ok) {
            const pexelsData = await pexelsRes.json();
            if (pexelsData.photos && pexelsData.photos.length > 0) {
                clearTimeout(timeoutId);
                return {url: pexelsData.photos[0].src.original, score: 95, source: 'Pexels'};
            }
        }
    }

    // 3. Try Pixabay (if API key available)
    if (process.env.PIXABAY_API_KEY) {
        const pixabayRes = await fetch(`https://pixabay.com/api/?key=${process.env.PIXABAY_API_KEY}&q=${encodeURIComponent(query)}&per_page=3`, {
            signal: controller.signal
        });
        if (pixabayRes.ok) {
            const pixabayData = await pixabayRes.json();
            if (pixabayData.hits && pixabayData.hits.length > 0) {
                clearTimeout(timeoutId);
                return {url: pixabayData.hits[0].largeImageURL, score: 90, source: 'Pixabay'};
            }
        }
    }

    // 4. Try Unsplash (if API key available)
    if (process.env.UNSPLASH_ACCESS_KEY) {
        const unsplashRes = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1`, {
            headers: { 'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` },
            signal: controller.signal
        });
        if (unsplashRes.ok) {
            const unsplashData = await unsplashRes.json();
            if (unsplashData.results && unsplashData.results.length > 0) {
                clearTimeout(timeoutId);
                return {url: unsplashData.results[0].urls.regular, score: 92, source: 'Unsplash'};
            }
        }
    }

    // 5. Try Wikipedia Text Search (Fallback for Google Images / Pixabay / Pexels)
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&srlimit=2`;
    const searchRes = await fetch(searchUrl, {
        headers: { 'User-Agent': 'NewsVisualFinder/1.0' },
        signal: controller.signal
    });
    
    if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.query && searchData.query.search && searchData.query.search.length > 0) {
            const title = searchData.query.search[0].title;
            const url2 = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original&titles=${encodeURIComponent(title)}`;
            const res2 = await fetch(url2, { 
                headers: { 'User-Agent': 'NewsVisualFinder/1.0' },
                signal: controller.signal
            });
            if (res2.ok) {
                const data2 = await res2.json();
                if (data2.query && data2.query.pages) {
                    for (const key of Object.keys(data2.query.pages)) {
                        const page = data2.query.pages[key];
                        if (key !== "-1" && page.original) {
                            const imgUrl = page.original.source;
                            if (!imgUrl.endsWith('.svg') && !imgUrl.endsWith('.pdf')) {
                                clearTimeout(timeoutId);
                                return {url: imgUrl, score: 75, source: 'Wikipedia Fallback'};
                            }
                        }
                    }
                }
            }
        }
    }
    
    clearTimeout(timeoutId);
    return null;
  } catch (error) {
    clearTimeout(timeoutId);
    return null;
  }
}

async function analyzeScriptWithFallback(prompt: string) {
  let k1, k2, k3, k4, k5;
  try { k1 = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY; } catch (e) {}
  try { k2 = process.env.VITE_GEMINI_API_KEY_2 || process.env.GEMINI_API_KEY_2; } catch (e) {}
  try { k3 = process.env.VITE_GEMINI_API_KEY_3 || process.env.GEMINI_API_KEY_3; } catch (e) {}
  try { k4 = process.env.VITE_GEMINI_API_KEY_4 || process.env.GEMINI_API_KEY_4; } catch (e) {}
  try { k5 = process.env.VITE_GEMINI_API_KEY_5 || process.env.GEMINI_API_KEY_5; } catch (e) {}

  const keys = [k1, k2, k3, k4, k5].filter((key) => !!key && !String(key).includes("your_api") && key !== "undefined");

  if (keys.length === 0) {
    throw new Error("API_KEY_INVALID: API Keys are missing. Please ensure GEMINI_API_KEY is set.");
  }

  let lastError;
  const maxRetries = 1;

  for (let retry = 0; retry < maxRetries; retry++) {
    for (let i = 0; i < keys.length; i++) {
      try {
        const client = new GoogleGenAI({ apiKey: keys[i] as string });
        return await client.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.2
          }
        });
      } catch (error: any) {
        lastError = error;
        const msg = typeof error?.message === "string" ? error.message : JSON.stringify(error?.message || "");
        
        if (msg.toLowerCase().includes("quota") || msg.includes("429") || msg.toLowerCase().includes("exhausted")) {
          console.warn(`[Gemini API Key ${i + 1}] Quota exceeded. Falling back...`);
          continue;
        } else if (msg.includes("500") || msg.includes("503") || msg.toLowerCase().includes("internal")) {
          console.warn(`[Gemini API Key ${i + 1}] Temp error. Retrying...`);
          break;
        } else {
          throw error;
        }
      }
    }
  }
  throw lastError;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { script } = req.body;
  if (!script) return res.status(400).json({ error: 'Script is required' });

  try {
    const prompt = `You are a Senior AI Video Pipeline Architect and Director Agent.
Your task is to act as an "Auto Video Director and Editor" for a news reel.

STEP 1 - DIRECTOR AGENT
Split the story into scenes based on the script. Define the purpose (Hook, Main Fact, Evidence, Context, Impact, Public Reaction, Government Action, Closing), timing, and visual/motion/graphics/sfx needs.
Output story_type, emotion, importance, estimated_duration, and scenes.

STEP 2 - ASSET PLANNER
Generate scene-level asset requirements. Do not search using the headline.
Generate "visual_requirements", "graphics", and "sfx" for each scene.

STEP 3 - VISUAL HIERARCHY
For every scene generate: "real", "context", and "symbolic" visual queries.

STEP 4, 5 - SEARCH AND SCORING STRATEGY
Provide 3 short, English search queries per scene (max 3 words each) that represent the Real, Context, and Symbolic needs.

STEP 6 - MOTION PLANNER
Select motion for each scene from: slow_zoom_in, slow_zoom_out, push_in, push_out, pan_left, pan_right, parallax, dynamic_crop, spotlight_focus, counter_animation, split_screen.

STEP 7 - GRAPHICS PLANNER
Select overlays (e.g., breaking_banner, warning_banner, exclusive_tag, notice_counter, red_arrow, map_pin, location_card).

STEP 8 - SFX PLANNER
Select scene-specific SFX (e.g., alert_hit, siren_short, success_hit, shine, paper_flip, whoosh, impact_hit, tension_rise).

STEP 9 - FFMPEG INSTRUCTIONS
Generate the intended FFmpeg editing parameters for each scene: start, end, motion, transition, graphics, sfx.

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
      "visual_requirements": ["..."],
      "visual_hierarchy": {
        "real": ["..."],
        "context": ["..."],
        "symbolic": ["..."]
      },
      "search_queries": ["...", "...", "..."],
      "motion": "slow_zoom_in",
      "transition": "fade",
      "graphics": ["breaking_banner"],
      "sfx": ["alert_hit"],
      "ffmpeg_instructions": {
        "start": 0,
        "end": 3,
        "motion": "slow_zoom_in",
        "transition": "fade",
        "graphics": ["breaking_banner"],
        "sfx": ["alert_hit"]
      }
    }
  ]
}

Return strictly ONLY the raw JSON without markdown formatting.

Script to analyze:
${script}`;

    const response = await analyzeScriptWithFallback(prompt);

    let parsed;
    try {
      const text = response?.text || '{}';
      // Extract JSON from markdown block if present
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const cleanJson = jsonMatch ? jsonMatch[1] : text.replace(/^[^{]*({[\s\S]*})[^}]*$/, '$1');
      parsed = JSON.parse(cleanJson);
    } catch(e: any) {
      console.warn("JSON parse failed on:", response?.text);
      throw new Error("Failed to parse AI response as JSON: " + e.message);
    }
    
    if (!parsed.scenes) throw new Error("Invalid schema returned");

    // Process all scenes in parallel to avoid Vercel function timeout
    await Promise.all(parsed.scenes.map(async (scene: any) => {
      let rawTerms = scene.search_queries || [];
      
      const searchTerms = Array.from(new Set(rawTerms))
        .filter((t: any) => t && typeof t === 'string' && t.split(' ').length <= 4)
        .slice(0, 3); // Max 3 terms for speed

      let visualFound = null;
      let sourceInfo = "";
      let highestScore = 0;

      // Try searching terms in parallel, pick first successful
      if (searchTerms.length > 0) {
        const results = await Promise.allSettled(searchTerms.map(async (term) => {
          const res = await searchWebImages(term as string);
          if (!res) throw new Error("No image");
          return { res, term };
        }));

        for (const r of results) {
           if (r.status === 'fulfilled') {
              const { res, term } = r.value;
              // Asset Scoring
              const simulatedRelevance = res.score + Math.floor(Math.random() * 10);
              const qualityScore = 85;
              const overallScore = Math.floor((simulatedRelevance + qualityScore) / 2);

              if (overallScore > highestScore) {
                 highestScore = overallScore;
                 visualFound = res.url;
                 sourceInfo = res.source + " (" + term + ")";
              }
           }
        }
      }

      // Map back to what frontend expects, or add new keys
      scene.ai_prompt = scene.visual_requirements ? scene.visual_requirements.join(", ") : (scene.what_viewer_should_see || scene.visual_intent || "AI generation recommended");
      scene.scene_number = scene.scene_id || scene.scene_number || 1;
      
      if (visualFound) {
        scene.selected_visual = visualFound;
        scene.relevance_score = highestScore;
        scene.source = sourceInfo;
      } else {
        scene.selected_visual = "";
        scene.relevance_score = 40;
        scene.source = "AI Generation Recommended";
      }
    }));

    return res.status(200).json(parsed);
  } catch (err: any) {
    let errMsg = err.message ? err.message : (typeof err === 'string' ? err : "Unknown error");
    const strErr = String(err) + " " + JSON.stringify(err);
    if (strErr.includes("API_KEY_INVALID") || strErr.includes("invalid API key") || strErr.includes("API key not valid")) {
        errMsg = "The Gemini API Key provided is INVALID. Please check that you have pasted your correct, valid API key in Environment variables (Settings -> Secrets) or .env file.";
        console.warn("Find visuals API Key warning:", errMsg);
    } else {
        console.error("Find visuals error:", err);
    }
    res.status(500).json({ error: errMsg });
  }
}

