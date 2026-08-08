const fs = require('fs');
let code = fs.readFileSync('scripts/build_anchor_local.js', 'utf8');

const startStr = "// Upload to Supabase";
const endStr = "return publicData.publicUrl;";

const startIndex = code.indexOf(startStr);
const endIndex = code.indexOf(endStr, startIndex) + endStr.length;

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `const mp4Buf = fs.readFileSync(outPath);
    const dataUri = 'data:video/mp4;base64,' + mp4Buf.toString('base64');
    
    try {
      fs.rmSync(tmpdir, { recursive: true, force: true });
    } catch(e) {}
    
    console.log("[anchor local] Build complete. Returning base64 length:", dataUri.length);
    return dataUri;`;
  code = code.substring(0, startIndex) + replacement + code.substring(endIndex);
  fs.writeFileSync('scripts/build_anchor_local.js', code);
  console.log("Patched successfully");
} else {
  console.error("Could not find start/end indices");
}
