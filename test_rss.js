async function test() {
  const rssUrl = 'https://news.google.com/rss/headlines/section/topic/NATION?hl=hi&gl=IN&ceid=IN:hi';
  const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}&api_key=`;
  const res = await fetch(url);
  const data = await res.json();
  console.log(data.items?.[0] || data);
}
test();
