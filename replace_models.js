import fs from 'fs';
let content = fs.readFileSync('services/geminiService.ts', 'utf8');
content = content.replace(/gemini-3\.1-pro-preview/g, 'gemini-3.5-flash');
content = content.replace(/gemini-3-flash-preview/g, 'gemini-3.5-flash');
fs.writeFileSync('services/geminiService.ts', content);
console.log('Replaced models successfully!');
