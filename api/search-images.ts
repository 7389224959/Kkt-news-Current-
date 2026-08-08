export default async function handler(req: any, res: any) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const query = req.method === 'POST' ? req.body.query : req.query.query;

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  // Remove any negatives added for DuckDuckGo
  const cleanQuery = query.replace(/-\w+/g, '').trim();

  try {
    const url = `https://www.bing.com/images/search?q=${encodeURIComponent(cleanQuery)}&form=HDRSC2&first=1&tsc=ImageHoverTitle`;
    
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" }
    });
    
    const html = await response.text();
    let images: any[] = [];
    
    const regex = /m="({[^}]+})"/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
      if (images.length >= 20) break;
      try {
        // Unescape HTML entities in the JSON string
        const jsonStr = match[1].replace(/&quot;/g, '"');
        const data = JSON.parse(jsonStr);
        if (data.murl) {
            const urlLower = data.murl.toLowerCase();
            // Skip invalid extensions if any exist
            if (urlLower.endsWith('.wav') || urlLower.endsWith('.ogg') || urlLower.endsWith('.mp3') || urlLower.endsWith('.svg')) {
                continue;
            }
            images.push({
                url: data.murl,
                original: data.murl,
                thumbnail: data.turl || data.murl,
                title: data.t || '',
                width: 0, // Not always readily available without further parsing
                height: 0,
                source: 'Bing Images'
            });
        }
      } catch(e) {
        // ignore parse errors for individual images
      }
    }
    
    res.status(200).json({ images });
  } catch (error: any) {
    console.error('Image search error:', error);
    res.status(500).json({ error: 'Failed to search images', details: error.message });
  }
}
