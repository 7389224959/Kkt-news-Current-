const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components', 'ClientReelWizard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  'const templates: ReelTemplate[] = settings?.reelTemplates || [];',
  'const templates: ReelTemplate[] = settings?.clientReelTemplates || settings?.reelTemplates || [];'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('ClientReelWizard.tsx patched');
