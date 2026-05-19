export const getWikipediaImage = async (query: string): Promise<string | null> => {
  try {
    const searchRes = await fetch(`https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=1&format=json`, {
      headers: { 'User-Agent': 'KKTNewsBot/1.0 (vishal9425545374@gmail.com)' }
    });
    const searchJson = await searchRes.json();
    if (!searchJson[1] || searchJson[1].length === 0) return null;
    
    const pageTitle = searchJson[1][0];
    const imgRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original&titles=${encodeURIComponent(pageTitle)}`, {
      headers: { 'User-Agent': 'KKTNewsBot/1.0 (vishal9425545374@gmail.com)' }
    });
    const imgJson = await imgRes.json();
    
    const pages = imgJson.query?.pages;
    if (!pages) return null;
    
    const pageId = Object.keys(pages)[0];
    const imageInfo = pages[pageId]?.original;
    if (imageInfo && imageInfo.source) {
      return imageInfo.source;
    }
  } catch (e) {
    console.warn(`Wikipedia image fetch failed for ${query}`);
  }
  return null;
}
