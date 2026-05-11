const targetUrl = 'https://dprcg.gov.in/';

const proxies = ['none', 'twitterbot', 'facebookbot', 'bingbot', 'googlebot', 'jina', 'archive', 'allorigins', 'corsproxy', 'codetabs'];
for (const proxy of proxies) {
  let fetchUrl = targetUrl;
  if (proxy === 'jina') fetchUrl = `https://r.jina.ai/${targetUrl}`;
  else if (proxy === 'allorigins') fetchUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
  else if (proxy === 'corsproxy') fetchUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
  else if (proxy === 'codetabs') fetchUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`;
  else if (proxy === 'archive') fetchUrl = `https://web.archive.org/web/2/${targetUrl}`;
  
  try {
     const controller = new AbortController();
     const timeoutId = setTimeout(() => controller.abort(), 2000);
     const res = await globalThis.fetch(fetchUrl, {signal: controller.signal});
     clearTimeout(timeoutId);
     console.log(proxy, 'OK', res.status);
  } catch(e) {
     console.log(proxy, 'ERROR', e.message);
  }
}
