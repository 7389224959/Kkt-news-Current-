import { chromium as playwright } from 'playwright-core';
import chromium from '@sparticuz/chromium';
import { chromium as localChromium } from 'playwright';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const query = req.method === 'POST' ? req.body.query : req.query.query;

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  let browser;
  try {
    const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL;
    
    if (isProd) {
      browser = await playwright.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: true,
      });
    } else {
      browser = await localChromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'] });
    }
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();
    
    // Spoof webdriver
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });
    
    let images: any[] = [];
    
    // First try DuckDuckGo
    await page.goto(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&t=h_&iax=images&ia=images`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('img.tile--img__img', { timeout: 3000 }).catch(() => page.waitForTimeout(1000));

    images = await page.evaluate(() => {
      const imgElements = document.querySelectorAll('img.tile--img__img, img');
      const results = [];
      for (let i = 0; i < imgElements.length; i++) {
        const src = imgElements[i].getAttribute('src') || imgElements[i].getAttribute('data-src') || (imgElements[i] as HTMLImageElement).src;
        if (src && (src.includes('external-content') || src.startsWith('http')) && !src.includes('duckduckgo.com/assets')) {
           let url = src;
           if (url.startsWith('//')) {
             url = 'https:' + url;
           }
           results.push({ url, source: 'DuckDuckGo' });
           if (results.length >= 5) break;
        }
      }
      return results;
    });

    // Fallback to Yahoo if DDG blocked us or yielded no images
    if (images.length === 0) {
        await page.goto(`https://images.search.yahoo.com/search/images?p=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);
        
        images = await page.evaluate(() => {
            const imgElements = document.querySelectorAll('img');
            const results = [];
            for (let i = 0; i < imgElements.length; i++) {
                const src = imgElements[i].getAttribute('src') || (imgElements[i] as HTMLImageElement).src;
                if (src && src.startsWith('http')) {
                    results.push({ url: src, source: 'DuckDuckGo (via Yahoo Fallback)' });
                    if (results.length >= 5) break;
                }
            }
            return results;
        });
    }

    res.status(200).json({ images });
  } catch (error: any) {
    console.error('Playwright error:', error);
    res.status(500).json({ error: 'Failed to search images', details: error.message });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
