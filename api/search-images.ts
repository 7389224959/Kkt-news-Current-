export default async function handler(req: any, res: any) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const query = req.method === 'POST' ? req.body.query : req.query.query;

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    const res1 = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" }
    });
    const html = await res1.text();
    const vqdMatch = html.match(/vqd=["']([^"']+)["']/) || html.match(/vqd=([a-zA-Z0-9-]+)/);
    
    if (!vqdMatch) {
      return res.status(500).json({ error: 'Failed to extract VQD token from search provider' });
    }
    const vqd = vqdMatch[1];
    
    const res2 = await fetch(`https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,&p=1`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" }
    });
    
    const data = await res2.json();
    let images: any[] = [];
    
    if (data.results && data.results.length > 0) {
       images = data.results.slice(0, 10).map((r: any) => ({
           url: `https://external-content.duckduckgo.com/iu/?u=${encodeURIComponent(r.image)}`, // High resolution image URL proxied via DDG
           original: r.image,
           thumbnail: r.thumbnail,
           width: r.width,
           height: r.height,
           source: 'DuckDuckGo API'
       }));
    }
    
    res.status(200).json({ images });
  } catch (error: any) {
    console.error('Image search error:', error);
    res.status(500).json({ error: 'Failed to search images', details: error.message });
  }
}
