export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { postId } = req.body;
    
    if (!postId) {
      return res.status(400).json({ error: 'Post ID is required to publish.' });
    }
    
    const pageId = process.env.FB_PAGE_ID || process.env.VITE_FB_PAGE_ID;
    const accessToken = process.env.FB_PAGE_ACCESS_TOKEN || process.env.VITE_FB_PAGE_ACCESS_TOKEN;

    if (!accessToken) {
      return res.status(400).json({ error: 'FB_PAGE_ACCESS_TOKEN is required.' });
    }

    let resolvedAccessToken = accessToken;
    
    // Attempt to automatically resolve to a Page Access Token just in case they provided a User Access Token
    if (pageId) {
      try {
        const tokenCheckRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=access_token&access_token=${accessToken}`);
        if (tokenCheckRes.ok) {
          const tokenCheckData = await tokenCheckRes.json();
          if (tokenCheckData.access_token) {
            resolvedAccessToken = tokenCheckData.access_token;
          }
        }
      } catch (e) {
        // Ignore and just use the provided token
      }
    }

    const fbApiUrl = `https://graph.facebook.com/v19.0/${postId}`;
    const body = {
      is_published: true,
      access_token: resolvedAccessToken,
    };

    const fbResponse = await fetch(fbApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log(`Facebook API Status: ${fbResponse.status}`);
    const textData = await fbResponse.text();
    console.log(`Facebook API Raw Response: ${textData}`);

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
      let errorMessage = fbData.error?.message || 'Failed to publish post';
      if (fbData.error?.code === 190 || errorMessage.includes('Session has expired') || errorMessage.includes('Error validating access token')) {
        errorMessage = 'Your Facebook Page Access Token has expired. I (the AI) cannot fix this for you via code. You must go to the Facebook Developer Portal, generate a new Page Access Token, and update your FB_PAGE_ACCESS_TOKEN environment variable manually.';
      }
      return res.status(400).json({ error: errorMessage });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error publishing Facebook post:', error);
    res.status(500).json({ error: 'Internal server error while publishing Facebook post' });
  }
}
