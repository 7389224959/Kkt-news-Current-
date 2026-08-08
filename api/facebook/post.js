export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { postId, message, imageUrl, scheduledPublishTime, published = true, comment } = req.body;

    // Handle Publish request if postId is provided
    if (postId) {
      const pageId = process.env.FB_PAGE_ID || process.env.VITE_FB_PAGE_ID;
      const accessToken = process.env.FB_PAGE_ACCESS_TOKEN || process.env.VITE_FB_PAGE_ACCESS_TOKEN;

      if (!accessToken) {
        return res.status(400).json({ error: 'FB_PAGE_ACCESS_TOKEN is required.' });
      }

      let resolvedAccessToken = accessToken;
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
          // Ignore
        }
      }

      const fbApiUrl = `https://graph.facebook.com/v19.0/${postId}`;
      const fbResponse = await fetch(fbApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_published: true,
          access_token: resolvedAccessToken,
        }),
      });

      const textData = await fbResponse.text();
      let fbData = {};
      if (textData) {
        try { fbData = JSON.parse(textData); } catch (e) {}
      }

      if (!fbResponse.ok) {
        let errorMessage = fbData.error?.message || 'Failed to publish post';
        if (fbData.error?.code === 190 || errorMessage.includes('Session has expired') || errorMessage.includes('Error validating access token')) {
          errorMessage = 'Your Facebook Page Access Token has expired. Please update FB_PAGE_ACCESS_TOKEN in Vercel.';
        }
        return res.status(400).json({ error: errorMessage });
      }

      return res.status(200).json({ success: true });
    }
    
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
    let body = {
      message,
      access_token: resolvedAccessToken,
      published: published !== undefined ? published : true
    };
    
    if (scheduledPublishTime && published === false) {
       body.scheduled_publish_time = scheduledPublishTime;
    }

    if (imageUrl) {
      fbApiUrl = `https://graph.facebook.com/v19.0/${pageId}/photos`;
      body.url = imageUrl;
    }

    console.log("FB Publish Payload:", {
      message: body.message,
      url: body.url,
      published: body.published,
      scheduled_publish_time: body.scheduled_publish_time,
      endpoint: fbApiUrl
    });

    const fbResponse = await fetch(fbApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log(`Facebook API Status: ${fbResponse.status}`);
    const textData = await fbResponse.text();
    console.log("FB Response:", textData);

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
      } else if (errorMessage.includes('Unpublished posts must be posted to a page as the page itself') || fbData.error?.code === 200) {
         errorMessage = 'You are using a User Access Token instead of a Page Access Token. Facebook requires a Page Access Token to post to a Page. Please generate a Page Access Token from the Facebook Developer Portal and update your FB_PAGE_ACCESS_TOKEN.';
      }
      
      return res.status(400).json({ error: errorMessage });
    }

    // Photo API returns 'post_id'. Feed API returns 'id'.
    // We strictly use published: true so it's fully public.
    const postId = fbData.post_id || fbData.id;
    const postUrl = `https://facebook.com/${postId}`;
    
    console.log("Public Post URL:", postUrl);

    let commentResult = null;
    let commentDropped = false;
    let commentError = null;

    if (comment && postId) {
      console.log("Dropping comment on Facebook post:", postId, "Comment:", comment);
      
      let attempts = 0;
      const maxCommentAttempts = 3;
      
      while (!commentDropped && attempts < maxCommentAttempts) {
        attempts++;
        try {
          const commentUrl = `https://graph.facebook.com/v19.0/${postId}/comments?access_token=${encodeURIComponent(resolvedAccessToken)}`;
          const commentRes = await fetch(commentUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: comment
            })
          });

          const textRes = await commentRes.text();
          let jsonRes = {};
          try { jsonRes = JSON.parse(textRes); } catch(e) {}

          console.log(`FB Post Comment Drop Attempt ${attempts} Response:`, jsonRes);

          if (commentRes.ok && jsonRes.id) {
            commentResult = jsonRes;
            commentDropped = true;
          } else {
            commentError = jsonRes.error?.message || textRes || `HTTP ${commentRes.status}`;
            console.warn(`FB Post comment attempt ${attempts} failed:`, commentError);
            if (attempts < maxCommentAttempts) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        } catch (commentErr) {
          commentError = commentErr.message;
          console.error(`Failed to drop comment on FB post (attempt ${attempts}):`, commentErr);
          if (attempts < maxCommentAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
    }

    res.status(200).json({ 
      success: true, 
      id: postId,
      pageId: pageId,
      url: postUrl,
      commentDropped,
      commentError: commentDropped ? null : commentError
    });
  } catch (error) {
    console.error('Error posting to Facebook:', error);
    res.status(500).json({ error: 'Internal server error while posting to Facebook' });
  }
}
