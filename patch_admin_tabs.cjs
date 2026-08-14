const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'pages', 'Admin.tsx');
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes('import ClientTemplatesAdmin')) {
  content = content.replace(
    "import ReelTemplatesAdmin from '../components/ReelTemplatesAdmin';",
    "import ReelTemplatesAdmin from '../components/ReelTemplatesAdmin';\nimport ClientTemplatesAdmin from '../components/ClientTemplatesAdmin';"
  );
}

content = content.replace(
  'const [viralTemplateTab, setViralTemplateTab] = useState(false);',
  "const [templateTab, setTemplateTab] = useState<'reel' | 'viral' | 'client'>('reel');"
);

// We need to replace the rendering logic for activeTab === 'templates'. 
// It's a bit complex with Regex so I'll replace the block precisely.

const searchBlock = `{activeTab === 'templates' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <button 
                onClick={() => setViralTemplateTab(false)}
                className={\`px-4 py-2 font-bold rounded-lg transition-colors border \${!viralTemplateTab ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}\`}
              >
                Reel Templates (Video)
              </button>
              <button 
                onClick={() => setViralTemplateTab(true)}
                className={\`px-4 py-2 font-bold rounded-lg transition-colors border \${viralTemplateTab ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}\`}
              >
                Viral Auto Post Templates (Image)
              </button>
            </div>

            {!viralTemplateTab ? (
              <ReelTemplatesAdmin
                  settings={settings!} 
                onSaveSettings={async (updatedSettings: SiteSettings) => {
                  try {
                    const result = await saveSiteSettings(updatedSettings);
                    setSiteSettings(updatedSettings);
                    if (result.strippedColumns && result.strippedColumns.length > 0) {
                      alert(\`Warning: The following fields were NOT saved due to missing columns in Supabase: \${result.strippedColumns.join(', ')}\`);
                    }
                  } catch (error: any) {
                    throw error; // Rethrow so ReelTemplatesAdmin can catch it and display it
                  }
                }}
              />
            ) : (
              <ViralTemplatesAdmin
                  settings={settings!} 
                articles={articles} 
                onSaveSettings={async (updatedSettings: SiteSettings) => {
                  try {
                    const result = await saveSiteSettings(updatedSettings);
                    setSiteSettings(updatedSettings);
                    if (result.strippedColumns && result.strippedColumns.length > 0) {
                      alert(\`Warning: The following fields were NOT saved due to missing columns in Supabase: \${result.strippedColumns.join(', ')}\`);
                    }
                  } catch (error: any) {
                    throw error; 
                  }
                }}
              />
            )}
          </div>
        )}`;

const replaceBlock = `{activeTab === 'templates' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <button 
                onClick={() => setTemplateTab('reel')}
                className={\`px-4 py-2 font-bold rounded-lg transition-colors border \${templateTab === 'reel' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}\`}
              >
                News Reel Templates
              </button>
              <button 
                onClick={() => setTemplateTab('client')}
                className={\`px-4 py-2 font-bold rounded-lg transition-colors border \${templateTab === 'client' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}\`}
              >
                Client Reel Templates
              </button>
              <button 
                onClick={() => setTemplateTab('viral')}
                className={\`px-4 py-2 font-bold rounded-lg transition-colors border \${templateTab === 'viral' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}\`}
              >
                Viral Auto Post Templates
              </button>
            </div>

            {templateTab === 'reel' && (
              <ReelTemplatesAdmin
                  settings={settings!} 
                onSaveSettings={async (updatedSettings: SiteSettings) => {
                  try {
                    const result = await saveSiteSettings(updatedSettings);
                    setSiteSettings(updatedSettings);
                    if (result.strippedColumns && result.strippedColumns.length > 0) {
                      alert(\`Warning: The following fields were NOT saved due to missing columns in Supabase: \${result.strippedColumns.join(', ')}\`);
                    }
                  } catch (error: any) {
                    throw error;
                  }
                }}
              />
            )}

            {templateTab === 'client' && (
              <ClientTemplatesAdmin
                  settings={settings!} 
                onSaveSettings={async (updatedSettings: SiteSettings) => {
                  try {
                    const result = await saveSiteSettings(updatedSettings);
                    setSiteSettings(updatedSettings);
                    if (result.strippedColumns && result.strippedColumns.length > 0) {
                      alert(\`Warning: The following fields were NOT saved due to missing columns in Supabase: \${result.strippedColumns.join(', ')}\`);
                    }
                  } catch (error: any) {
                    throw error;
                  }
                }}
              />
            )}

            {templateTab === 'viral' && (
              <ViralTemplatesAdmin
                  settings={settings!} 
                articles={articles} 
                onSaveSettings={async (updatedSettings: SiteSettings) => {
                  try {
                    const result = await saveSiteSettings(updatedSettings);
                    setSiteSettings(updatedSettings);
                    if (result.strippedColumns && result.strippedColumns.length > 0) {
                      alert(\`Warning: The following fields were NOT saved due to missing columns in Supabase: \${result.strippedColumns.join(', ')}\`);
                    }
                  } catch (error: any) {
                    throw error; 
                  }
                }}
              />
            )}
          </div>
        )}`;

// I'll manually replace parts since spacing might slightly differ.
content = content.replace(searchBlock, replaceBlock);

// fallback if exact string didn't match (due to formatting/tabs):
if (content.includes('setViralTemplateTab(false)')) {
  // Manual string replacements to achieve the same result
  content = content.replace(
    /const \[viralTemplateTab, setViralTemplateTab\] = useState\(false\);/g,
    "const [templateTab, setTemplateTab] = useState<'reel' | 'viral' | 'client'>('reel');"
  );
  
  // replace buttons
  content = content.replace(
    /<button[^>]*onClick=\{\(\) => setViralTemplateTab\(false\)\}[^>]*>[\s\S]*?<\/button>/,
    `<button onClick={() => setTemplateTab('reel')} className={\`px-4 py-2 font-bold rounded-lg transition-colors border \${templateTab === 'reel' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}\`}>News Reel Templates</button>
              <button onClick={() => setTemplateTab('client')} className={\`px-4 py-2 font-bold rounded-lg transition-colors border \${templateTab === 'client' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}\`}>Client Reel Templates</button>`
  );

  content = content.replace(
    /<button[^>]*onClick=\{\(\) => setViralTemplateTab\(true\)\}[^>]*>[\s\S]*?<\/button>/,
    `<button onClick={() => setTemplateTab('viral')} className={\`px-4 py-2 font-bold rounded-lg transition-colors border \${templateTab === 'viral' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}\`}>Viral Auto Post Templates</button>`
  );

  // replace condition block
  content = content.replace(
    /\{\!viralTemplateTab \? \([\s\S]*?<ReelTemplatesAdmin[\s\S]*?\/>\s*\)\s*:\s*\([\s\S]*?<ViralTemplatesAdmin[\s\S]*?\/>\s*\)\}/,
    `{templateTab === 'reel' && (
              <ReelTemplatesAdmin
                  settings={settings!} 
                onSaveSettings={async (updatedSettings: SiteSettings) => {
                  try {
                    const result = await saveSiteSettings(updatedSettings);
                    setSiteSettings(updatedSettings);
                  } catch (error: any) {
                    throw error;
                  }
                }}
              />
            )}
            
            {templateTab === 'client' && (
              <ClientTemplatesAdmin
                  settings={settings!} 
                onSaveSettings={async (updatedSettings: SiteSettings) => {
                  try {
                    const result = await saveSiteSettings(updatedSettings);
                    setSiteSettings(updatedSettings);
                  } catch (error: any) {
                    throw error;
                  }
                }}
              />
            )}

            {templateTab === 'viral' && (
              <ViralTemplatesAdmin
                  settings={settings!} 
                articles={articles} 
                onSaveSettings={async (updatedSettings: SiteSettings) => {
                  try {
                    const result = await saveSiteSettings(updatedSettings);
                    setSiteSettings(updatedSettings);
                  } catch (error: any) {
                    throw error; 
                  }
                }}
              />
            )}`
  );
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Admin.tsx patched');
