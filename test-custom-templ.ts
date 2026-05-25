import fs from 'fs';
import { overlayTextOnImageNode } from './src/utils/nodeImageUtils.ts';

const run = async () => {
   const base64Str = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
   const result = await overlayTextOnImageNode(base64Str, {
      headline_line_1: "दुबई से संचालित करोड़ों का सट्टा नेटवर्क ध्वस्त, मुख्य सटोरिया",
      headline_line_2: "**सोनू फतनानी** गिरफ्तार !",
      subheadline: "रायपुर क्राइम ब्रांच की तिल्दा में बड़ी कार्रवाई",
      breaking_tag: "Breaking News!",
      customTemplate: {
         id: '123', name: 'Test',
         coordinates: {
            headline_line_1_box: "0%, 0%, 100%, 20%",
            headline_line_2_box: "10%, 20%, 80%, 20%",
         },
         style_rules: {
            headlineBg: '#DC2626',
            headlineColor: '#FFFFFF',
            highlightColor: '#FBBF24',
            breakingTagBg: '#DC2626'
         }
      }
   });
   const outBase64 = result.replace(/^data:image\/\w+;base64,/, '');
   fs.writeFileSync('test-custom-out.png', Buffer.from(outBase64, 'base64'));
   console.log("Done");
};
run();
