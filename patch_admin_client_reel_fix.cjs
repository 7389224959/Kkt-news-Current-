const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'pages', 'Admin.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Find the "Reel Wizard" button and insert after it
if (!content.includes('Client Marketing Reel')) {
  content = content.replace(
    /<button\s+onClick=\{handleOpenReelModal\}[\s\S]*?<\/button>/,
    match => `${match}\n                   <button\n                      onClick={() => setShowClientReelModal(true)}\n                     className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-all"\n                   >\n                     <Zap size={20} />\n                     Client Marketing Reel\n                   </button>`
  );
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Admin.tsx patched successfully');
