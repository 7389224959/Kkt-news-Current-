const fs = require('fs');
let code = fs.readFileSync('scripts/build_anchor_local.js', 'utf8');

const target = `  const s = supa();
  if (!s) {
    console.log("[anchor local] Supabase client not configured.");
    return null;
  }`;

code = code.replace(target, '');
fs.writeFileSync('scripts/build_anchor_local.js', code);
