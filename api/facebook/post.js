export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, imageUrl, scheduledPublishTime, published = true } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required to post to Facebook.' });
    }
    
    const pageId = process.env.FB_PAGE_ID || process.env.VITE_FB_PAGE_ID;
    const accessToken = process.env.FB_PAGE_ACCESS_TOKEN || process.env.VITE_FB_PAGE_ACCESS_TOKEN;

    if (!pageId || !accessToken) {
      const missing = [];
      if (!pageId) missing.push('FB_PAGE_ID');
      if (!accessToken) missing.push('FB_PAGE_ACCESS_TOKEN');
      
      const envKeys = Object.keys(process.env);
      const similarKeys = envKeys.filter(k => 
        k.toLowerCase().includes('fb') || 
        k.toLowerCase().includes('facebook') || 
        k.toLowerCase().includes('page')
      );

      let errorMsg = `Facebook credentials not configured in environment variables. Missing: ${missing.join(', ')}. `;
      errorMsg += `\n\nIMPORTANT: In Vercel, the "Key" must be EXACTLY typed as FB_PAGE_ID and FB_PAGE_ACCESS_TOKEN (all caps, with underscores, no spaces). `;
      
      if (similarKeys.length > 0) {
        errorMsg += `\nWe found these similar keys in your Vercel environment: "${similarKeys.join('", "')}". Please rename them to exactly match the required keys and redeploy.`;
      }

      return res.status(400).json({ error: errorMsg });
    }

    let resolvedAccessToken = accessToken;
    
    // Attempt to automatically resolve to a Page Access Token just in case they provided a User Access Token
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

    let fbApiUrl = `https://graph.facebook.com/v19.0/${pageId}/feed`;
    const body = {
      message,
      access_token: resolvedAccessToken,
    };

    if (scheduledPublishTime) {
      body.published = false;
      body.scheduled_publish_time = scheduledPublishTime;
    } else if (published === false) {
      body.published = false;
    }

    if (imageUrl) {
      // If there's an image, we post to the photos endpoint instead
      fbApiUrl = `https://graph.facebook.com/v19.0/${pageId}/photos`;
      body.url = imageUrl;
    }

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
        if (!fbResponse.ok) {
          return res.status(400).json({ error: `Invalid response from Facebook: ${textData.substring(0, 100)}` });
        }
      }
    }

    if (!fbResponse.ok) {
      console.error('Facebook API Error:', fbData);
      
      let errorMessage = fbData.error?.message || 'Failed to post to Facebook';
      
      if (fbData.error?.code === 190 || errorMessage.includes('Session has expired') || errorMessage.includes('Error validating access token')) {
        errorMessage = 'Your Facebook Page Access Token has expired. I (the AI) cannot fix this for you via code. You must go to the Facebook Developer Portal, generate a new Page Access Token, and update your FB_PAGE_ACCESS_TOKEN environment variable manually.';
      } else if (errorMessage.includes('publish_actions')) {
        errorMessage = 'You are using a User Access Token instead of a Page Access Token. You MUST select your Page from the "User or Page" dropdown in the Graph API Explorer to generate a Page Access Token.';
      }
      
      return res.status(400).json({ error: errorMessage });
    }

    // Photo API returns 'post_id'. Feed API returns 'id'.
    // If it's unpublished, we still get an ID.
    const postId = fbData.post_id || fbData.id;

    res.status(200).json({ 
      success: true, 
      id: postId,
      pageId: pageId 
    });
  } catch (error) {
    console.error('Error posting to Facebook:', error);
    res.status(500).json({ error: 'Internal server error while posting to Facebook' });
  }
}
