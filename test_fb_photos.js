import { fetch } from 'node-fetch';

async function testFacebook() {
  const pageId = process.env.FB_PAGE_ID;
  const accessToken = process.env.FB_PAGE_ACCESS_TOKEN;
  
  if (!pageId || !accessToken) {
    console.log("Missing env");
    return;
  }

  const imageUrl = "https://picsum.photos/800/600";
  const message = "Test scheduled photo post directly via /photos endpoint";
  const scheduledTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

  const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/photos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: imageUrl,
      message: message,
      published: false,
      scheduled_publish_time: scheduledTime,
      access_token: accessToken
    })
  });
  
  const data = await res.json();
  console.log("Photos endpoint response:", data);
}

testFacebook();
