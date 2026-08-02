const fs = require('fs');
let code = fs.readFileSync('scripts/build_anchor_local.js', 'utf8');

const startStr = "// Check if already in cache";
const endStr = "console.log(\"[anchor local] Building locally for key:\", key);";

const startIndex = code.indexOf(startStr);
const endIndex = code.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
  code = code.substring(0, startIndex) + code.substring(endIndex);
  fs.writeFileSync('scripts/build_anchor_local.js', code);
  console.log("Patched successfully");
} else {
  console.error("Could not find cache check");
}
