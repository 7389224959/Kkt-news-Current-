async function test() {
  const url = 'https://dprcg.gov.in/news/date-wise-news/2026-03-23';
  try {
    const response = await fetch(url);
    console.log("Status:", response.status);
    const text = await response.text();
    console.log("Length:", text.length);
  } catch (e) {
    console.error(e);
  }
}
test();
