import { GoogleGenAI } from "@google/genai";

export const maxDuration = 60; // Allow more time on Vercel

async function searchWebImages(query: string): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000); 

  try {
    // 1. Try Wikimedia Commons search
    const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=2&iiprop=url`;
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
                    return imgUrl;
                }
            }
          }
        }
    }

    // 2. Try Wikipedia Text Search
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&srlimit=1`;
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
                                return imgUrl;
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
    const prompt = `You are an expert television news editor and visual researcher.

Your task is NOT to find images matching keywords.
Your task is to determine what viewers should see on screen while hearing the voiceover.

For each scene:
1. Analyze the meaning of the scene.
2. Determine the visual intent.
3. Determine what a professional news editor would show.
4. Generate visual search strategies.
5. Avoid literal keyword matching.
6. Avoid historical paintings, artwork, icons, logos, religious illustrations, clipart, symbols, maps, and generic Wikipedia images unless absolutely necessary.
7. Prefer real-world photographs.
8. Prefer India-specific visuals when the story is about India.
9. Prefer Chhattisgarh-specific visuals when available.
10. Prefer actual incident visuals over generic visuals.
11. If exact visuals cannot be found, use contextually relevant visuals.
12. Never search only nouns extracted from the sentence.
13. TRANSLATE all search queries to strictly ENGLISH. Keep search queries VERY SHORT (1 to 3 words max).

BAD EXAMPLES:

Scene:
"26 Christian families were expelled from their homes"

Wrong Visual:
- Christian painting
- Church artwork
- Religious icon

Correct Visual:
- Rural families standing outside houses
- Villagers gathered in discussion
- Rural settlement
- Community meeting

--------------------------------

Scene:
"Heavy police force deployed"

Wrong Visual:
- Random foreign police officer
- Police badge
- Cartoon police

Correct Visual:
- Indian police personnel
- Security deployment
- Police vehicles
- Crowd control scene

--------------------------------

Scene:
"Religious conversion dispute in Narayanpur village"

Wrong Visual:
- Temple image
- Church painting
- Religious symbol

Correct Visual:
- Village gathering
- Community meeting
- Rural dispute discussion
- News coverage visuals
- Narayanpur village if available

--------------------------------

Return strictly ONLY the raw JSON without any markdown formatting, backticks, or extra conversational text.

Format must be exactly this JSON schema:
{
  "scenes": [
    {
      "scene_number": 1,
      "voiceover_text": "...",
      "visual_intent": "...",
      "what_viewer_should_see": "...",
      "avoid_visuals": ["..."],
      "search_strategy": {
        "layer1_actual_incident": ["..."],
        "layer2_people_location": ["..."],
        "layer3_event_context": ["..."],
        "layer4_supporting_visuals": ["..."]
      },
      "preferred_visual_types": ["..."],
      "fallback_visual_types": ["..."]
    }
  ]
}

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
      let rawTerms = [
        ...(scene.search_strategy?.layer1_actual_incident || []),
        ...(scene.search_strategy?.layer2_people_location || []),
        ...(scene.search_strategy?.layer3_event_context || []),
        ...(scene.search_strategy?.layer4_supporting_visuals || [])
      ];
      
      const searchTerms = Array.from(new Set(rawTerms))
        .filter((t: any) => t && typeof t === 'string' && t.split(' ').length <= 4)
        .slice(0, 3); // Max 3 terms for speed

      let visualFound = null;
      let sourceInfo = "";

      // Try searching terms in parallel, pick first successful
      if (searchTerms.length > 0) {
        const results = await Promise.allSettled(searchTerms.map(async (term) => {
          const img = await searchWebImages(term as string);
          if (!img) throw new Error("No image");
          return { img, term };
        }));

        const success = results.find(r => r.status === 'fulfilled');
        if (success && success.status === 'fulfilled') {
            visualFound = success.value.img;
            sourceInfo = "Web Image Search (" + success.value.term + ")";
        }
      }

      // Map back to what frontend expects, or add new keys
      scene.ai_prompt = scene.what_viewer_should_see || scene.visual_intent || "AI generation recommended";
      
      if (visualFound) {
        scene.selected_visual = visualFound;
        scene.relevance_score = 80;
        scene.source = sourceInfo;
      } else {
        scene.selected_visual = "";
        scene.relevance_score = 40;
        scene.source = "AI Generation Recommended";
      }
    }));

    return res.status(200).json(parsed);
  } catch (err: any) {
    console.error("Find visuals error:", err);
    let errMsg = err.message ? err.message : (typeof err === 'string' ? err : "Unknown error");
    const strErr = String(err) + " " + JSON.stringify(err);
    if (strErr.includes("API_KEY_INVALID") || strErr.includes("invalid API key") || strErr.includes("API key not valid")) {
        errMsg = "The Gemini API Key provided is INVALID. Please check that you have pasted your correct, valid API key in Environment variables (Settings -> Secrets) or .env file.";
    }
    res.status(500).json({ error: errMsg });
  }
}

