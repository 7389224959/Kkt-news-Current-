const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'types.ts');
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes('clientReelTemplates?: ReelTemplate[];')) {
  content = content.replace(
    'reelTemplates?: ReelTemplate[];',
    'reelTemplates?: ReelTemplate[];\n  clientReelTemplates?: ReelTemplate[];'
  );
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('types.ts patched');
} else {
  console.log('types.ts already patched');
}
