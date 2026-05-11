import * as cheerio from 'cheerio';

async function test() {
  const url = 'https://dprcg.gov.in/news/date-wise-news/2026-03-23';
  try {
    console.log("Fetching", url);
    const response = await fetch(url);
    if (!response.ok) {
      console.error("Failed to fetch", response.status);
      return;
    }
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const results = [];
    $(".view-content > div").each((i, el) => {
      const block = $(el);
      let href = block.find('a').attr('href');
      let title = block.text();
      
      if (href && title) {
        title = title.replace(/पूरी खबर पढ़ें/g, '').replace(/\s+/g, ' ').trim();
        if (!href.startsWith('http')) {
          try { href = new URL(href, url).href; } catch(e) {}
        }
        results.push({ title, link: href });
      }
    });
    
    console.log(`Found ${results.length} items`);
    console.log(results.slice(0, 2));
    
    if (results.length > 0) {
      const firstLink = results[0].link;
      console.log("Fetching first link:", firstLink);
      const articleRes = await fetch(firstLink);
      const articleHtml = await articleRes.text();
      const $article = cheerio.load(articleHtml);
      let content = $article('.field-name-body').text().trim();
      if (!content) content = $article('.content').text().trim();
      if (!content) content = $article('body').text().replace(/\s+/g, ' ').trim();
      console.log("Content length:", content.length);
      console.log("Content preview:", content.slice(0, 100));
    }
  } catch (e) {
    console.error(e);
  }
}
test();
