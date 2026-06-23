import { GoogleGenAI, Type } from "@google/genai";
import { getAiClient } from "../services/geminiService";

async function searchWikipedia(query: string) {
  try {
    const searchRes = await fetch(`https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=1&format=json`);
    const searchJson = await searchRes.json();
    if (!searchJson[1] || searchJson[1].length === 0) return null;
    
    const pageTitle = searchJson[1][0];
    const imgRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original&titles=${encodeURIComponent(pageTitle)}`);
    const imgJson = await imgRes.json();
    const pages = imgJson.query?.pages;
    if (!pages) return null;
    const pageId = Object.keys(pages)[0];
    const imageInfo = pages[pageId]?.original;
    if (imageInfo && imageInfo.source) {
      return imageInfo.source;
    }
  } catch (e) {
    // console.warn("Wikipedia error", e);
  }
  return null;
}

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

async function searchWikimedia(query: string) {
  try {
    const searchRes = await fetch(`https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srnamespace=6&format=json&srlimit=1`);
    const searchJson = await searchRes.json();
    if (searchJson.query?.search?.length > 0) {
      const title = searchJson.query.search[0].title;
      const imgRes = await fetch(`https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url&titles=${encodeURIComponent(title)}&format=json`);
      const imgJson = await imgRes.json();
      const pages = imgJson.query?.pages;
      if (pages) {
         const pageId = Object.keys(pages)[0];
         if (pages[pageId]?.imageinfo?.[0]?.url) {
            return pages[pageId].imageinfo[0].url;
         }
      }
    }
  } catch (e) {
  }
  return null;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { script } = req.body;
  if (!script) return res.status(400).json({ error: 'Script is required' });

  const ai = getAiClient();
  if (!ai) return res.status(500).json({ error: 'AI key missing' });

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

    // Perform visual search based on search layers
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
        .filter(t => t && t.split(' ').length <= 3)
        .slice(0, 4); // Max 4 searches per scene to prevent rate limits

      let googleSearchesPerformed = 0;

      for (const term of searchTerms) {
        if (!term) continue;
        
        // 1. Try Wikimedia Commons first (usually returns better explicit media)
        const wikiImg = await searchWikimedia(term);
        if (wikiImg) {
          visualFound = wikiImg;
          relevanceSc = 90;
          sourceInfo = "Wikimedia Commons (" + term + ")";
          break;
        }

        // 2. Try Wikipedia
        const img = await searchWikipedia(term);
        if (img) {
          visualFound = img;
          relevanceSc = 85;
          sourceInfo = "Wikipedia (" + term + ")";
          break;
        }

        // 3. Try Google Search Grounding (Limit to 1 call per scene to avoid quota limits)
        if (googleSearchesPerformed < 1) {
            googleSearchesPerformed++;
            const googleImg = await searchGoogleImages(term + " news photo", ai);
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
    let errMsg = err.message || "Unknown error";
    if (errMsg.includes("API_KEY_INVALID") || errMsg.includes("invalid API key")) {
        errMsg = "Vite environment evaluated an invalid API key or you haven't set a valid GEMINI_API_KEY. Please check your settings.";
    }
    res.status(500).json({ error: errMsg });
  }
}
