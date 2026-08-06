import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, videoBase64, videoUrl: initialVideoUrl, comment } = req.body;
    let videoUrl = initialVideoUrl;

    // If videoUrl is not provided but videoBase64 is, upload to Supabase Storage server-side
    if (!videoUrl && videoBase64) {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseKey) {
        try {
          const supabase = createClient(supabaseUrl, supabaseKey);
          const matches = videoBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          const buffer = matches ? Buffer.from(matches[2], 'base64') : Buffer.from(videoBase64, 'base64');
          const fileName = `reel-ig-${Date.now()}.mp4`;
          
          const { data: uData, error: uErr } = await supabase.storage
            .from('news-images')
            .upload(fileName, buffer, { contentType: 'video/mp4', upsert: true });

          if (!uErr && uData) {
            const { data: pData } = supabase.storage.from('news-images').getPublicUrl(uData.path || fileName);
            if (pData && pData.publicUrl) {
              videoUrl = pData.publicUrl;
              console.log("Server auto-uploaded videoBase64 to Supabase for Instagram:", videoUrl);
            }
          } else if (uErr) {
            console.error("Failed to upload base64 video to Supabase for Instagram:", uErr.message);
          }
        } catch (sErr) {
          console.error("Error auto-uploading base64 video to Supabase for Instagram:", sErr);
        }
      }
    }
    
    if (!videoUrl) {
      return res.status(400).json({ error: 'Video URL is required for Instagram. Ensure the video is uploaded to storage first.' });
    }
    
    let igAccountId = process.env.IG_ACCOUNT_ID || process.env.VITE_IG_ACCOUNT_ID;
    const pageId = process.env.FB_PAGE_ID || process.env.VITE_FB_PAGE_ID;
    const accessToken = process.env.FB_PAGE_ACCESS_TOKEN || process.env.VITE_FB_PAGE_ACCESS_TOKEN;

    if (!accessToken) {
      return res.status(400).json({ error: 'Meta credentials not configured. Please set FB_PAGE_ACCESS_TOKEN in your environment.' });
    }

    let resolvedAccessToken = accessToken;

    // If IG_ACCOUNT_ID is missing but FB_PAGE_ID is available, dynamically resolve instagram_business_account and Page token
    if ((!igAccountId || !resolvedAccessToken) && pageId) {
      try {
        const pageRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account,access_token&access_token=${accessToken}`);
        if (pageRes.ok) {
          const pageData = await pageRes.json();
          if (pageData.access_token) {
            resolvedAccessToken = pageData.access_token;
          }
          if (!igAccountId && pageData.instagram_business_account?.id) {
            igAccountId = pageData.instagram_business_account.id;
            console.log("Dynamically resolved IG_ACCOUNT_ID from FB Page:", igAccountId);
          }
        }
      } catch (e) {
        console.warn("Could not dynamically resolve IG account ID from FB page:", e);
      }
    }

    // If igAccountId is still not set, try fetching accounts connected to user token via /me/accounts
    if (!igAccountId) {
      try {
        const meRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?fields=instagram_business_account,access_token&access_token=${accessToken}`);
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.data && meData.data.length > 0) {
            for (const item of meData.data) {
              if (item.instagram_business_account?.id) {
                igAccountId = item.instagram_business_account.id;
                if (item.access_token) resolvedAccessToken = item.access_token;
                console.log("Dynamically resolved IG_ACCOUNT_ID from me/accounts:", igAccountId);
                break;
              }
            }
          }
        }
      } catch (e) {
        console.warn("Could not query me/accounts for IG account ID:", e);
      }
    }

    if (!igAccountId) {
      return res.status(400).json({ error: 'Instagram credentials not configured. Please set IG_ACCOUNT_ID in environment or link an Instagram Business Account to your Facebook Page.' });
    }

    // Step 1: Create media container
    const createContainerUrl = `https://graph.facebook.com/v19.0/${igAccountId}/media`;
    const form = new URLSearchParams();
    form.append('access_token', resolvedAccessToken);
    form.append('media_type', 'REELS');
    form.append('video_url', videoUrl);
    form.append('caption', message || '');
    form.append('share_to_feed', 'true');

    console.log(`Creating Instagram Reels container for IG account ${igAccountId}...`);
    const createRes = await fetch(createContainerUrl, {
      method: 'POST',
      body: form,
    });

    const createData = await createRes.json();
    if (!createRes.ok) {
      console.error('Instagram Container Creation Error:', createData);
      return res.status(400).json({ error: createData.error?.message || 'Failed to create Instagram media container' });
    }

    const creationId = createData.id;
    console.log(`Instagram media container created with ID: ${creationId}. Polling status...`);

    // Step 2: Poll for processing completion
    const checkStatusUrl = `https://graph.facebook.com/v19.0/${creationId}?fields=status_code,status&access_token=${resolvedAccessToken}`;
    let isReady = false;
    let attempts = 0;
    const maxAttempts = 30; // Wait up to 150 seconds (30 * 5s)

    while (!isReady && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
      
      try {
        const statusRes = await fetch(checkStatusUrl);
        const statusData = await statusRes.json();
        console.log(`Instagram media container ${creationId} status check attempt ${attempts}:`, statusData);

        if (statusData.status_code === 'FINISHED' || statusData.status_code === 'PUBLISHED') {
          isReady = true;
        } else if (statusData.status_code === 'ERROR') {
          const detailedErr = statusData.status || statusData.error?.message || 'Instagram video processing returned ERROR';
          console.error('Instagram Container Processing Error:', statusData);
          return res.status(400).json({ error: `Instagram failed to process video: ${detailedErr}` });
        }
      } catch (err) {
        console.warn('Error checking Instagram media status:', err);
      }
    }

    if (!isReady) {
       return res.status(400).json({ error: 'Instagram video processing timed out (150s). Please try publishing manually later.' });
    }

    // Step 3: Publish the media container
    const publishUrl = `https://graph.facebook.com/v19.0/${igAccountId}/media_publish`;
    const publishForm = new URLSearchParams();
    publishForm.append('access_token', resolvedAccessToken);
    publishForm.append('creation_id', creationId);

    console.log(`Publishing Instagram media container ${creationId}...`);
    const publishRes = await fetch(publishUrl, {
      method: 'POST',
      body: publishForm,
    });

    const publishData = await publishRes.json();
    if (!publishRes.ok) {
       console.error('Instagram publish error:', publishData);
       return res.status(400).json({ error: publishData.error?.message || 'Failed to publish Instagram media' });
    }

    const mediaId = publishData.id;
    const postUrl = `https://instagram.com/p/${mediaId}`;
    console.log(`Instagram Reel published successfully! ID: ${mediaId}`);

    let commentResult = null;
    let commentDropped = false;
    let commentError = null;

    if (comment && mediaId) {
      console.log("Dropping comment on Instagram reel:", mediaId, "Comment:", comment);
      
      // Instagram reels require a short delay (4 seconds) after publish before comments can be added
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      let attempts = 0;
      const maxCommentAttempts = 3;

      while (!commentDropped && attempts < maxCommentAttempts) {
        attempts++;
        try {
          const commentUrl = `https://graph.facebook.com/v19.0/${mediaId}/comments`;
          const commentForm = new URLSearchParams();
          commentForm.append('access_token', resolvedAccessToken);
          commentForm.append('message', comment);

          const commentRes = await fetch(commentUrl, {
            method: 'POST',
            body: commentForm,
          });

          const textRes = await commentRes.text();
          let jsonRes = {};
          try { jsonRes = JSON.parse(textRes); } catch(e) {}

          console.log(`IG Reel Comment Drop Attempt ${attempts} Response:`, jsonRes);

          if (commentRes.ok && jsonRes.id) {
            commentResult = jsonRes;
            commentDropped = true;
          } else {
            commentError = jsonRes.error?.message || textRes || `HTTP ${commentRes.status}`;
            console.warn(`IG Reel comment attempt ${attempts} failed:`, commentError);
            if (attempts < maxCommentAttempts) {
              await new Promise(resolve => setTimeout(resolve, 3000));
            }
          }
        } catch (commentErr) {
          commentError = commentErr.message;
          console.error(`Failed to drop comment on Instagram reel (attempt ${attempts}):`, commentErr);
          if (attempts < maxCommentAttempts) {
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }
      }
    }

    res.status(200).json({ 
      success: true, 
      id: mediaId,
      url: postUrl,
      commentDropped,
      commentError: commentDropped ? null : commentError
    });
  } catch (error) {
    console.error('Error posting video to Instagram:', error);
    res.status(500).json({ error: `Internal server error while posting to Instagram: ${error.message}` });
  }
}
