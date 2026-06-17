export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, videoBase64 } = req.body;
    
    if (!videoBase64) {
      return res.status(400).json({ error: 'Video is required.' });
    }
    
    const pageId = process.env.FB_PAGE_ID || process.env.VITE_FB_PAGE_ID;
    const accessToken = process.env.FB_PAGE_ACCESS_TOKEN || process.env.VITE_FB_PAGE_ACCESS_TOKEN;

    if (!pageId || !accessToken) {
      return res.status(400).json({ error: 'Facebook credentials not configured.' });
    }

    let resolvedAccessToken = accessToken;
    try {
      const tokenCheckRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=access_token&access_token=${accessToken}`);
      if (tokenCheckRes.ok) {
        const tokenCheckData = await tokenCheckRes.json();
        if (tokenCheckData.access_token) {
          resolvedAccessToken = tokenCheckData.access_token;
        }
      }
    } catch (e) {}

    const fbApiUrl = `https://graph.facebook.com/v19.0/${pageId}/videos`;
    
    // Extract base64 data
    const matches = videoBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid base64 string' });
    }
    const buffer = Buffer.from(matches[2], 'base64');
    
    // Using native FormData to upload the video
    const form = new FormData();
    form.append('access_token', resolvedAccessToken);
    form.append('description', message || '');
    form.append('source', new Blob([buffer], { type: 'video/mp4' }), 'reel.mp4');

    console.log("Starting FB Video Upload...");

    const fbResponse = await fetch(fbApiUrl, {
      method: 'POST',
      body: form,
    });

    const textData = await fbResponse.text();
    console.log("FB Video Upload Response:", textData);

    let fbData = {};
    if (textData) {
      try {
        fbData = JSON.parse(textData);
      } catch (e) {
        console.error('Failed to parse Facebook response as JSON');
      }
    }

    if (!fbResponse.ok) {
      console.error('Facebook API Error:', fbData);
      const errorMessage = fbData.error?.message || 'Failed to post video to Facebook';
      return res.status(400).json({ error: errorMessage });
    }

    const postId = fbData.id;
    const postUrl = `https://facebook.com/${postId}`;
    
    res.status(200).json({ 
      success: true, 
      id: postId,
      url: postUrl
    });
  } catch (error) {
    console.error('Error posting video to Facebook:', error);
    res.status(500).json({ error: 'Internal server error while posting to Facebook' });
  }
}
