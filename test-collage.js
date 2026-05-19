import fetch from "node-fetch";

fetch('http://localhost:3000/api/generate-collage', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    heroImageUrl: "http://localhost:3000/test-news-collage.jpeg",
    contextImageUrl: "http://localhost:3000/test-news-collage.jpeg",
    category: "politics",
    supportImageUrls: []
  })
}).then(async r => {
  console.log(r.status);
  console.log(await r.text());
});
