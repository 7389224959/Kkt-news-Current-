import { generateNewsCollage } from './src/utils/imageCollageService.ts'; 
import fs from 'fs';
generateNewsCollage('https://i.pravatar.cc/300', 'https://picsum.photos/1920/1080', undefined, 'politics', [], true).then((buffer) => {
  fs.writeFileSync('test.jpg', buffer);
  console.log('success, size:', buffer.length);
}).catch(console.error)
