import fs from 'fs';

let content = fs.readFileSync('services/geminiService.ts', 'utf8');

const target1 = `          if (!imageUrl) {
            const base64Image = await generateAiImage(a.imagePrompt || a.title);
            // Upload to Supabase Storage
            imageUrl = await uploadImage(base64Image);
          }`;
          
const replacement = `          if (!imageUrl && imageGenModel === 'gemini') {
            const base64Image = await generateAiImage(a.imagePrompt || a.title);
            // Upload to Supabase Storage
            imageUrl = await uploadImage(base64Image);
          }
          
          if (!imageUrl) {
            imageUrl = getStockImageUrl(a.imagePrompt || "news", category);
          }`;

content = content.replace(target1, replacement);

fs.writeFileSync('services/geminiService.ts', content);
console.log('Fixed fallback logic');
