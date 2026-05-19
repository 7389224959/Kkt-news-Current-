import fs from 'fs';

async function testApi() {
  const req = await fetch('http://localhost:3000/api/generate-collage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      heroImageUrl: 'https://i.pravatar.cc/300',
      contextImageUrl: 'https://picsum.photos/1920/1080',
      category: 'politics',
      isHeroTransparent: false
    })
  });
  console.log(req.status, await req.text());
}
testApi();
