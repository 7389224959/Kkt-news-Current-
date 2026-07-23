export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { title, description, videoBase64, videoUrl } = req.body;
    
    // For YouTube API, we need the raw bytes. 
    // If videoUrl is provided, we should fetch it first.
    let videoBuffer;
    
    if (videoBase64) {
      const matches = videoBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        videoBuffer = Buffer.from(matches[2], 'base64');
      }
    } else if (videoUrl) {
      const videoRes = await fetch(videoUrl);
      if (!videoRes.ok) throw new Error('Failed to download video from URL for YouTube upload');
      const arrayBuffer = await videoRes.arrayBuffer();
      videoBuffer = Buffer.from(arrayBuffer);
    }
    
    if (!videoBuffer) {
      return res.status(400).json({ error: 'Failed to extract video data' });
    }

    const accessToken = process.env.YOUTUBE_ACCESS_TOKEN || process.env.VITE_YOUTUBE_ACCESS_TOKEN;

    if (!accessToken) {
      return res.status(400).json({ error: 'YouTube credentials not configured. Please set YOUTUBE_ACCESS_TOKEN in your environment.' });
    }

    // Step 1: Create a simple multipart upload to YouTube
    const metadata = {
      snippet: {
        title: (title || 'New Short').substring(0, 100),
        description: description || '',
        tags: ['shorts', 'news']
      },
      status: {
        privacyStatus: 'public', // public, private, or unlisted
        selfDeclaredMadeForKids: false
      }
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody = Buffer.concat([
      Buffer.from(delimiter + 'Content-Type: application/json\r\n\r\n' + JSON.stringify(metadata)),
      Buffer.from(delimiter + 'Content-Type: video/mp4\r\n\r\n'),
      videoBuffer,
      Buffer.from(closeDelimiter)
    ]);

    const uploadUrl = 'https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status&uploadType=multipart';
    
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': multipartRequestBody.length.toString()
      },
      body: multipartRequestBody
    });

    const uploadData = await uploadRes.json();
    
    if (!uploadRes.ok) {
       return res.status(400).json({ error: uploadData.error?.message || 'Failed to publish to YouTube' });
    }

    res.status(200).json({ 
      success: true, 
      id: uploadData.id,
      url: `https://youtube.com/shorts/${uploadData.id}` 
    });
  } catch (error) {
    console.error('Error posting video to YouTube:', error);
    res.status(500).json({ error: 'Internal server error while posting to YouTube' });
  }
}
