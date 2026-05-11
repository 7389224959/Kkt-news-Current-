async function test() {
  const url = 'https://dprcg.gov.in/news/date-wise-news/2026-03-23';
  try {
    const response = await fetch(`http://localhost:3000/api/extract-links?url=${encodeURIComponent(url)}`);
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  }
}
test();
