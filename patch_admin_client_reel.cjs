const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'pages', 'Admin.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Import
if (!content.includes('import ClientReelWizard')) {
  content = content.replace(
    "import ReelWizard from '../components/ReelWizard';",
    "import ReelWizard from '../components/ReelWizard';\nimport ClientReelWizard from '../components/ClientReelWizard';"
  );
}

// State
if (!content.includes('const [showClientReelModal, setShowClientReelModal]')) {
  content = content.replace(
    "const [showReelModal, setShowReelModal] = useState(false);",
    "const [showReelModal, setShowReelModal] = useState(false);\n  const [showClientReelModal, setShowClientReelModal] = useState(false);"
  );
}

// Button - add next to Reel Generator button
if (!content.includes('Client Marketing Reel')) {
  content = content.replace(
    /<button[^>]*onClick=\{\(\) => setShowReelModal\(true\)\}[^>]*>[\s\S]*?<\/button>/,
    match => `${match}\n            <button\n              onClick={() => setShowClientReelModal(true)}\n              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"\n            >\n              <Zap className="w-5 h-5" />\n              <span>Client Marketing Reel</span>\n            </button>`
  );
}

// Modal component rendering
if (!content.includes('<ClientReelWizard')) {
  content = content.replace(
    "{showReelModal && (",
    `{showClientReelModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowClientReelModal(false)}>
          <div className="w-full max-w-4xl" onClick={e => e.stopPropagation()}>
            <ClientReelWizard settings={settings} onClose={() => setShowClientReelModal(false)} />
          </div>
        </div>
      )}
      {showReelModal && (`
  );
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Admin.tsx patched successfully');
