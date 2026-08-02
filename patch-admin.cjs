const fs = require('fs');
let code = fs.readFileSync('pages/Admin.tsx', 'utf8');

const target = `  useEffect(() => {
    fetchNews();`;

const replacement = `  useEffect(() => {
    if (typeof window !== 'undefined') {
       (window as any).__SITE_SETTINGS__ = settings;
    }
  }, [settings]);

  useEffect(() => {
    fetchNews();`;

code = code.replace(target, replacement);
fs.writeFileSync('pages/Admin.tsx', code);
