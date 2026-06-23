import { GoogleGenAI } from "@google/genai";
import https from "node:https";
import { jsonrepair } from "jsonrepair";

async function searchWebImages(query: string): Promise<string | null> {
  return new Promise((resolve) => {
      https.get(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&t=h_&iar=images&iax=images&ia=images`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
              const match = data.match(/vqd=([a-zA-Z0-9-]+)/);
              if (!match) return resolve(null);
              const vqd = match[1];

              const req = https.get(`https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}&o=json&p=1&s=0&u=bing&f=,,,,,&l=us-en&vqd=${vqd}`, (res2) => {
                  let data2 = '';
                  res2.on('data', chunk => data2 += chunk);
                  res2.on('end', () => {
                      try {
                          const json = JSON.parse(data2);
                          if (json.results && json.results.length > 0) {
                              resolve(json.results[0].image);
                          } else {
                              resolve(null);
                          }
                      } catch (e) {
                          resolve(null);
                      }
                  });
              });
              req.on('error', () => resolve(null));
          });
      }).on('error', () => resolve(null));
  });
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { script } = req.body;
  if (!script) return res.status(400).json({ error: 'Script is required' });

  let apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey && typeof process !== 'undefined' && process.env.VITE_GEMINI_API_KEY) {
      apiKey = process.env.VITE_GEMINI_API_KEY;
  }
  
  if (!apiKey) {
      return res.status(500).json({ error: 'AI API key is missing. Please configure GEMINI_API_KEY.' });
  }

  const ai = new GoogleGenAI({ apiKey });

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

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    let parsed;
    try {
      const repaired = jsonrepair(response.text || '{}');
      parsed = JSON.parse(repaired);
    } catch(e: any) {
      console.warn("JSON repair/parse failed on:", response.text);
      throw new Error("Failed to parse AI response as JSON: " + e.message);
    }
    
    if (!parsed.scenes) throw new Error("Invalid schema returned");

    // Perform visual search based on search layers SEQUENTIALLY to avoid timeouts
    for (const scene of parsed.scenes) {
      let visualFound = null;
      let relevanceSc = 0;
      let sourceInfo = "";

      // Prioritize short, direct entity names over complex phrases
      let rawTerms = [
        ...(scene.entities || []),
        ...(scene.search_queries?.layer1_real_incident || []),
        ...(scene.search_queries?.layer2_entity_search || []),
        ...(scene.search_queries?.layer3_event_search || []),
        ...(scene.search_queries?.layer4_symbolic_search || [])
      ];
      
      // Filter out long phrases and keep unique, short terms
      const searchTerms = Array.from(new Set(rawTerms))
        .filter((t: any) => t && typeof t === 'string' && t.split(' ').length <= 3)
        .slice(0, 1); // Max 1 term to be extremely fast

      let googleSearchesPerformed = 0;

      for (const term of searchTerms) {
        if (!term) continue;
        
        // Try Web Image Search (Limit to 1 call per scene to avoid quota limits)
        if (googleSearchesPerformed < 1) {
            googleSearchesPerformed++;
            const webImg = await searchWebImages(term + " news");
            if (webImg) {
              visualFound = webImg;
              relevanceSc = 80;
              sourceInfo = "Web Image Search (" + term + ")";
              break;
            }
        }
      }

      if (visualFound) {
        scene.selected_visual = visualFound;
        scene.relevance_score = relevanceSc;
        scene.source = sourceInfo;
      } else {
        // Fallback symbolic logic (handled by AI Image / frontend or just placeholders)
        scene.selected_visual = "";
        scene.relevance_score = 40; // Needs replacement
        scene.source = "AI Generation Recommended";
        scene.ai_prompt = scene.search_queries?.layer4_symbolic_search?.[0] || scene.visual_description;
      }
    }

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
