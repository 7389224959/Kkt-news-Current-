export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, model } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const accountId = process.env.VITE_CLOUDFLARE_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.VITE_CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId || !apiToken) {
      return res.status(500).json({ error: 'Cloudflare credentials not configured' });
    }

    const aiModelName = model || "@cf/bytedance/stable-diffusion-xl-lightning";
    const fetchUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${aiModelName}`;

    const cfReq = await fetch(fetchUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt })
    });

    if (cfReq.ok) {
      const contentType = cfReq.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const jsonResponse = await cfReq.json();
        // flux-schnell returns {"result": {"image": "base64_string_here"}}
        if (jsonResponse.result && jsonResponse.result.image) {
          return res.status(200).json({ base64: jsonResponse.result.image });
        }
        return res.status(500).json({ error: 'Invalid JSON response from Cloudflare AI' });
      } else {
        const arrayBuffer = await cfReq.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        return res.status(200).json({ base64 });
      }
    } else {
      const errStr = await cfReq.text();
      console.error("Cloudflare AI error:", errStr);
      return res.status(cfReq.status).json({ error: 'Cloudflare AI returned an error', details: errStr });
    }
  } catch (error) {
    console.error('Error calling Cloudflare AI:', error);
    return res.status(500).json({ error: 'Internal server error while calling Cloudflare AI' });
  }
}
