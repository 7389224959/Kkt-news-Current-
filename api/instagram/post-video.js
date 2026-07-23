export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, videoBase64, videoUrl } = req.body;
    
    if (!videoUrl) {
      return res.status(400).json({ error: 'Video URL is required for Instagram. Ensure the video is uploaded to storage first.' });
    }
    
    const igAccountId = process.env.IG_ACCOUNT_ID || process.env.VITE_IG_ACCOUNT_ID;
    const accessToken = process.env.FB_PAGE_ACCESS_TOKEN || process.env.VITE_FB_PAGE_ACCESS_TOKEN;

    if (!igAccountId || !accessToken) {
      return res.status(400).json({ error: 'Instagram credentials not configured. Please set IG_ACCOUNT_ID and FB_PAGE_ACCESS_TOKEN in your environment.' });
    }

    // Step 1: Create media container
    const createContainerUrl = `https://graph.facebook.com/v19.0/${igAccountId}/media`;
    const form = new URLSearchParams();
    form.append('access_token', accessToken);
    form.append('media_type', 'REELS');
    form.append('video_url', videoUrl);
    form.append('caption', message || '');

    const createRes = await fetch(createContainerUrl, {
      method: 'POST',
      body: form,
    });

    const createData = await createRes.json();
    if (!createRes.ok) {
      return res.status(400).json({ error: createData.error?.message || 'Failed to create Instagram media container' });
    }

    const creationId = createData.id;

    // Step 2: Poll for processing completion
    const checkStatusUrl = `https://graph.facebook.com/v19.0/${creationId}?fields=status_code&access_token=${accessToken}`;
    let isReady = false;
    let attempts = 0;
    const maxAttempts = 12; // Wait up to 60 seconds (12 * 5s)

    while (!isReady && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
      
      try {
        const statusRes = await fetch(checkStatusUrl);
        const statusData = await statusRes.json();
        
        if (statusData.status_code === 'FINISHED') {
          isReady = true;
        } else if (statusData.status_code === 'ERROR') {
          return res.status(400).json({ error: 'Instagram failed to process the video' });
        }
        // If IN_PROGRESS or PUBLISHED, continue waiting/proceeding
      } catch (err) {
        console.warn('Error checking Instagram media status:', err);
      }
    }

    if (!isReady) {
       return res.status(400).json({ error: 'Instagram video processing timed out. Please try publishing manually later.' });
    }

    // Step 3: Publish the media container
    const publishUrl = `https://graph.facebook.com/v19.0/${igAccountId}/media_publish`;
    const publishForm = new URLSearchParams();
    publishForm.append('access_token', accessToken);
    publishForm.append('creation_id', creationId);

    const publishRes = await fetch(publishUrl, {
      method: 'POST',
      body: publishForm,
    });

    const publishData = await publishRes.json();
    if (!publishRes.ok) {
       // Note: Sometimes Instagram processing takes longer, in a robust implementation, poll for the status.
       return res.status(400).json({ error: publishData.error?.message || 'Failed to publish Instagram media' });
    }

    res.status(200).json({ 
      success: true, 
      id: publishData.id,
      url: `https://instagram.com/p/${publishData.id}` 
    });
  } catch (error) {
    console.error('Error posting video to Instagram:', error);
    res.status(500).json({ error: 'Internal server error while posting to Instagram' });
  }
}
