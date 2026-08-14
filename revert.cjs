const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'components', 'ReelWizard.tsx');
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  'const activeTemplates = settings?.reelTemplates?.filter((t: any) => t.isActive) || [];\n  console.log("ReelWizard activeTemplates:", activeTemplates.map(t => t.name));',
  'const activeTemplates = settings?.reelTemplates?.filter((t: any) => t.isActive) || [];'
);
fs.writeFileSync(file, content);
