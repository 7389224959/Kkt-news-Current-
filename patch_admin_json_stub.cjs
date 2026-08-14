const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components', 'ClientTemplatesAdmin.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  'headline: "BREAKING NEWS TEXT"',
  'headline: "{\\n  \\"Role\\": \\"Software Engineer\\",\\n  \\"Location\\": \\"Remote\\"\\n}"'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Patched ClientTemplatesAdmin stub text');
