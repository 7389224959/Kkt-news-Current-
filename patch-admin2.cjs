const fs = require('fs');
let code = fs.readFileSync('pages/Admin.tsx', 'utf8');

const target = `  useEffect(() => {
    setArticles(contextArticles);
    setBreakingNews(contextBreakingNews);
    setSiteSettings(contextSettings);
    setTrendingKeywords(contextKeywords);
  }, [contextArticles, contextBreakingNews, contextSettings, contextKeywords]);`;

const replacement = target + `\n\n  useEffect(() => {
    if (typeof window !== 'undefined') {
       (window as any).__SITE_SETTINGS__ = settings;
    }
  }, [settings]);\n`;

code = code.replace(target, replacement);
fs.writeFileSync('pages/Admin.tsx', code);
