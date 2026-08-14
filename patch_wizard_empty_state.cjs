const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components', 'ClientReelWizard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const oldEmpty = `<div className="absolute inset-0 flex items-center justify-center text-gray-700 font-medium">Select a Template</div>`;
const newEmpty = `<div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 font-medium bg-gray-100 ring-inset ring-1 ring-gray-200">
                <svg className="w-12 h-12 mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <span>Select a Template</span>
              </div>`;

if (content.includes(oldEmpty)) {
  content = content.replace(oldEmpty, newEmpty);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Patched ClientReelWizard empty state');
} else {
  console.log('Already patched ClientReelWizard empty state');
}
