import { GoogleGenAI } from "@google/genai";

async function searchGoogleImages(query: string, ai: GoogleGenAI) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Search Google and find a high quality image representing '${query}'. Return ONLY the raw public image URL starting with http, no other text. We need the actual image file url (like .jpg or .png). If you cannot find a direct image link in the search results, respond with NONE.`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    
    let text = response.text?.trim() || "";
    if (text && !text.includes('NONE')) {
        const match = text.match(/https?:\/\/[^\s"'>]+(?:\.jpg|\.jpeg|\.png|\.webp)/i);
        if (match) return match[0];
        
        const genericMatch = text.match(/https?:\/\/[^\s"'>]+/i);
        if (genericMatch) return genericMatch[0];
    }
  } catch (e) {
    console.warn("Google image search error:", e);
  }
  return null;
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

    const parsed = JSON.parse(response.text || '{}');
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
        
        // Try Google Image Search (Limit to 1 call per scene to avoid quota limits)
        if (googleSearchesPerformed < 1) {
            googleSearchesPerformed++;
            const googleImg = await searchGoogleImages(term + " news", ai);
            if (googleImg) {
              visualFound = googleImg;
              relevanceSc = 80;
              sourceInfo = "Google Web Search (" + term + ")";
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
