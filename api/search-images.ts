export default async function handler(req: any, res: any) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const query = req.method === 'POST' ? req.body.query : req.query.query;

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    // 1. Get VQD token
    const res1 = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });
    const html = await res1.text();
    const vqdMatch = html.match(/vqd="([^"]+)"/) || html.match(/vqd=([^&]+)/);
    
    let images: any[] = [];
    
    if (vqdMatch) {
      const vqd = vqdMatch[1];
      
      // 2. Search images
      const res2 = await fetch(`https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,,,&p=1`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'Referer': 'https://duckduckgo.com/'
        }
      });
      
      if (res2.ok) {
        const data = await res2.json();
        if (data.results && data.results.length > 0) {
          images = data.results.slice(0, 5).map((img: any) => ({
            url: img.image,
            source: 'DuckDuckGo'
          }));
        }
      } else {
        console.error("DuckDuckGo API search failed with status:", res2.status);
      }
    } else {
       console.warn("No VQD token found for query:", query);
    }

    // Fallback to Bing Images if DDG failed (DDG often blocks cloud IPs with a captcha)
    if (images.length === 0) {
      try {
        const bingRes = await fetch(`https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&first=1`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
          }
        });
        
        if (bingRes.ok) {
          const html2 = await bingRes.text();
          const matches = html2.match(/murl&quot;:&quot;(.*?)&quot;/g);
          
          if (matches) {
             images = matches.slice(0, 5).map(m => {
               const url = m.replace('murl&quot;:&quot;', '').replace('&quot;', '');
               return { url, source: 'Bing Images (DDG Fallback)' };
             });
          }
        }
      } catch (err) {
        console.error("Bing search fallback error:", err);
      }
    }

    // Fallback to Yahoo if DDG yielded no images
    if (images.length === 0) {
        const yahooRes = await fetch(`https://images.search.yahoo.com/search/images?p=${encodeURIComponent(query)}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9'
          }
        });
        
        if (yahooRes.ok) {
           const yahooHtml = await yahooRes.text();
           const imgRegex = /<img[^>]+(?:src|data-src)=['"]([^'"]+)['"]/g;
           let match;
           while ((match = imgRegex.exec(yahooHtml)) !== null) {
             let src = match[1];
             if (src.startsWith('http') && !src.includes('yahoo.com/assets')) {
               src = src.replace(/&amp;/g, '&');
               images.push({ url: src, source: 'DuckDuckGo (via Yahoo Fallback)' });
               if (images.length >= 5) break;
             }
           }
        }
    }

    res.status(200).json({ images });
  } catch (error: any) {
    console.error('Image search error:', error);
    res.status(500).json({ error: 'Failed to search images', details: error.message });
  }
}
