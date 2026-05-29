import fetch from 'node-fetch';
import fs from 'fs';

async function testRender() {
  const reqBody = {
    templateMediaUrl: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?ixlib=rb-4.0.3&auto=format&fit=crop&w=720&q=80',
    overlayMediaUrl: null,
    scriptData: {
      hookText: "This is a hook",
      headline: "Headline goes here",
      ticker: "Ticker text",
      subtitleChunks: ["This is sub 1", "This is sub 2", "This is sub 3"]
    },
    template: {
      coordinates: {
        video_box: 'hidden',
        headline_box: '50,150,620,100',
        subtitle_box: '50,900,620,150',
        ticker_box: '0,1200,720,80'
      },
      style_rules: {
         ticker_speed: 100
      }
    },
    styleOverrides: {}
  };

  const res = await fetch('http://localhost:3000/api/render-reel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reqBody)
  });

  if (!res.ok) {
     const err = await res.text();
     console.error("Failed:", err);
     return;
  }
  const buffer = await res.arrayBuffer();
  fs.writeFileSync('test_out.mp4', Buffer.from(buffer));
  console.log("Saved test_out.mp4");
}

testRender();
