const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components', 'ClientReelWizard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  'className="relative bg-black rounded-2xl overflow-hidden shadow-2xl w-full max-w-[280px] sm:max-w-[320px] aspect-[9/16] shrink-0 flex items-center justify-center ring-4 ring-gray-900"',
  'className="relative bg-gray-100 rounded-2xl overflow-hidden shadow-2xl w-full max-w-[280px] sm:max-w-[320px] aspect-[9/16] shrink-0 flex items-center justify-center ring-4 ring-gray-900"'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Patched ClientReelWizard bg color');
