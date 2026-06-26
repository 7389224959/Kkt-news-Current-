import fetch from 'node-fetch';

async function test() {
  const query = 'judge bench india';
  const res1 = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
  });
  const html = await res1.text();
  const vqdMatch = html.match(/vqd="([^"]+)"/) || html.match(/vqd=([^&]+)/);
  console.log(vqdMatch);
}
test();
