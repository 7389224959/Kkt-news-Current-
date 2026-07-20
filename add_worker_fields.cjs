const fs = require('fs');
let file = fs.readFileSync('types.ts', 'utf8');
file = file.replace(
  "photo?: string;\n  isActive: boolean;\n}",
  "photo?: string;\n  isActive: boolean;\n  email?: string;\n  mobile?: string;\n}"
);
fs.writeFileSync('types.ts', file);
