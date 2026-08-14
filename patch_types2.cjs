const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'types.ts');
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes('isClientTemplate?: boolean;')) {
  content = content.replace(
    'export interface ReelTemplate {',
    'export interface ReelTemplate {\n  isClientTemplate?: boolean;'
  );
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('types.ts patched with isClientTemplate');
} else {
  console.log('types.ts already patched');
}
