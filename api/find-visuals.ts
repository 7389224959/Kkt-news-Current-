import { GoogleGenAI } from "@google/genai";

export const maxDuration = 60; // Allow more time on Vercel

async function searchWebImages(query: string): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5-second timeout to avoid Vercel 10s limit

  try {
    const res1 = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&t=h_&iar=images&iax=images&ia=images`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36' },
      signal: controller.signal
    });
    const data1 = await res1.text();
    const match = data1.match(/vqd=([a-zA-Z0-9-]+)/);
    if (!match) return null;
    const vqd = match[1];

    const res2 = await fetch(`https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}&o=json&p=1&s=0&u=bing&f=,,,,,&l=us-en&vqd=${vqd}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36' },
      signal: controller.signal
    });
    const data2 = await res2.json();
    
    clearTimeout(timeoutId);

    if (data2?.results && data2.results.length > 0) {
      return data2.results[0].image;
    }
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
          model: "gemini-1.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                scenes: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      scene_number: { type: "INTEGER" },
                      voiceover_text: { type: "STRING" },
                      visual_description: { type: "STRING" },
                      entities: { type: "ARRAY", items: { type: "STRING" } },
                      event_type: { type: "STRING" },
                      location: { type: "STRING" },
                      search_queries: {
                        type: "OBJECT",
                        properties: {
                          layer1_real_incident: { type: "ARRAY", items: { type: "STRING" } },
                          layer2_entity_search: { type: "ARRAY", items: { type: "STRING" } },
                          layer3_event_search: { type: "ARRAY", items: { type: "STRING" } },
                          layer4_symbolic_search: { type: "ARRAY", items: { type: "STRING" } },
                        }
                      }
                    }
                  }
                }
              }
            }
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
    const prompt = `Analyze this Hindi news script. 
Split it into logical scenes (approx 3-5 seconds each).
Extract entities: people, locations, organizations, event types.
Generate search queries in 4 layers for each scene.
IMPORTANT: Translate all entities and search queries to strictly ENGLISH to ensure image searches work properly. Do not use Hindi for search_queries or entities.
CRITICAL: Keep search queries VERY SHORT (1 to 2 words max). For example, instead of "Brijmohan Agrawal railway proposal", just output "Brijmohan Agrawal" or "Railway".

Format must be exactly this JSON schema:
{
  "scenes": [
    {
      "scene_number": 1,
      "voiceover_text": "...",
      "visual_description": "...",
      "entities": ["..."],
      "event_type": "...",
      "location": "...",
      "search_queries": {
        "layer1_real_incident": ["..."],
        "layer2_entity_search": ["..."],
        "layer3_event_search": ["..."],
        "layer4_symbolic_search": ["..."]
      }
    }
  ]
}

Script to analyze:
${script}`;

    const response = await analyzeScriptWithFallback(prompt);

    let parsed;
    try {
      parsed = JSON.parse(response?.text || '{}');
    } catch(e: any) {
      console.warn("JSON parse failed on:", response?.text);
      throw new Error("Failed to parse AI response as JSON: " + e.message);
    }
    
    if (!parsed.scenes) throw new Error("Invalid schema returned");

    // Process all scenes in parallel to avoid Vercel function timeout
    await Promise.all(parsed.scenes.map(async (scene: any) => {
      let rawTerms = [
        ...(scene.entities || []),
        ...(scene.search_queries?.layer1_real_incident || []),
        ...(scene.search_queries?.layer2_entity_search || []),
        ...(scene.search_queries?.layer3_event_search || []),
        ...(scene.search_queries?.layer4_symbolic_search || [])
      ];
      
      const searchTerms = Array.from(new Set(rawTerms))
        .filter((t: any) => t && typeof t === 'string' && t.split(' ').length <= 3)
        .slice(0, 2); // Max 2 terms for speed

      let visualFound = null;
      let sourceInfo = "";

      // Try searching terms in parallel, pick first successful
      if (searchTerms.length > 0) {
        const results = await Promise.allSettled(searchTerms.map(async (term) => {
          const img = await searchWebImages(term + " news");
          if (!img) throw new Error("No image");
          return { img, term };
        }));

        const success = results.find(r => r.status === 'fulfilled');
        if (success && success.status === 'fulfilled') {
            visualFound = success.value.img;
            sourceInfo = "Web Image Search (" + success.value.term + ")";
        }
      }

      if (visualFound) {
        scene.selected_visual = visualFound;
        scene.relevance_score = 80;
        scene.source = sourceInfo;
      } else {
        scene.selected_visual = "";
        scene.relevance_score = 40;
        scene.source = "AI Generation Recommended";
        scene.ai_prompt = scene.search_queries?.layer4_symbolic_search?.[0] || scene.visual_description;
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

