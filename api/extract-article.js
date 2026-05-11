import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    const fetchWithFallback = async (targetUrl) => {
      const proxies = ['none', 'twitterbot', 'facebookbot', 'bingbot', 'googlebot', 'jina', 'archive', 'allorigins', 'corsproxy', 'codetabs'];
      let lastErrorText = '';

      for (const proxy of proxies) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        try {
          let fetchUrl = targetUrl;
          let headers = undefined;
          
          if (proxy === 'none') {
            headers = {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
              "Accept-Language": "en-US,en;q=0.9",
              "Cache-Control": "no-cache",
              "Pragma": "no-cache",
              "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
              "Sec-Ch-Ua-Mobile": "?0",
              "Sec-Ch-Ua-Platform": '"Windows"',
              "Sec-Fetch-Dest": "document",
              "Sec-Fetch-Mode": "navigate",
              "Sec-Fetch-Site": "none",
              "Sec-Fetch-User": "?1",
              "Upgrade-Insecure-Requests": "1"
            };
          } else if (proxy === 'twitterbot') {
            headers = {
              "User-Agent": "Twitterbot/1.0",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
            };
          } else if (proxy === 'facebookbot') {
            headers = {
              "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
            };
          } else if (proxy === 'bingbot') {
            headers = {
              "User-Agent": "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
            };
          } else if (proxy === 'googlebot') {
            headers = {
              "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "X-Forwarded-For": "66.249.66.1"
            };
          } else if (proxy === 'jina') {
            fetchUrl = `https://r.jina.ai/${targetUrl}`;
            headers = {
              "Accept": "text/html",
              "X-Return-Format": "html"
            };
          } else if (proxy === 'allorigins') {
            fetchUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
          } else if (proxy === 'corsproxy') {
            fetchUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
          } else if (proxy === 'codetabs') {
            fetchUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`;
          } else if (proxy === 'archive') {
            fetchUrl = `https://web.archive.org/web/2/${targetUrl}`;
          }

          const response = await fetch(fetchUrl, { 
            signal: controller.signal,
            headers
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const html = await response.text();
            
            // Check if the successful response is actually a bot protection page
            if (html.includes('captcha-delivery') || 
                html.includes('Please enable JS and disable any ad blocker') ||
                html.includes('Enable JavaScript and cookies to continue') ||
                html.includes('Just a moment...')) {
              console.log(`Fetch with ${proxy} returned a captcha/bot protection page.`);
              lastErrorText = 'Blocked by bot protection';
              continue;
            }
            
            return html;
          }
          
          lastErrorText = await response.text().catch(() => 'No error text');
          console.log(`Fetch with ${proxy} failed: ${response.status}`);
          
          if (response.status === 404 && proxy === 'none') {
            break;
          }
        } catch (error) {
          clearTimeout(timeoutId);
          let errorMsg = error.message;
          if (error.name === 'AbortError') {
            errorMsg = 'Connection timed out';
          } else if (error.cause) {
            errorMsg += ` (${error.cause.message || error.cause.code})`;
          }
          console.log(`Fetch with ${proxy} threw error: ${errorMsg}`);
          lastErrorText = errorMsg;
        }
      }
      
      throw new Error(`Failed to fetch URL. Last error: ${lastErrorText}`);
    };

    const html = await fetchWithFallback(url);
    
    // If it's markdown from Jina
    if (!html.trim().startsWith('<') && html.includes('](')) {
      let title = "Extracted Article";
      const titleMatch = html.match(/^#\s+(.+)/m);
      if (titleMatch) {
        title = titleMatch[1];
      }
      
      return res.status(200).json({
        title: title,
        content: html,
        length: html.length,
        excerpt: html.substring(0, 200) + "..."
      });
    }
    
    const doc = new JSDOM(html, { url });
    const reader = new Readability(doc.window.document);
    const article = reader.parse();
    
    if (!article) {
      return res.status(400).json({ error: 'Failed to extract article content' });
    }

    res.status(200).json({ 
      title: article.title,
      content: article.textContent.replace(/\s+/g, ' ').trim(),
      length: article.length,
      excerpt: article.excerpt
    });
  } catch (error) {
    console.error('Error extracting article:', error);
    res.status(500).json({ error: error.message || 'Failed to extract article' });
  }
}
