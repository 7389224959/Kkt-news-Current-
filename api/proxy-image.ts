import fetch from 'node-fetch';

export default async function handler(req: any, res: any) {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'url required' });
  
  try {
    const response = await fetch(url as string, {
      headers: {
        'User-Agent': 'KKTNewsBot/1.0'
      }
    });
    
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch' });
    }
    
    const contentType = response.headers.get('content-type');
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    
    return res.status(200).json({ 
      base64,
      contentType: contentType || 'image/jpeg'
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
