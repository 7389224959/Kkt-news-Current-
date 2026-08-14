const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components', 'ClientReelWizard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add job details state
content = content.replace(
  "const [prompt, setPrompt] = useState<string>('');",
  "const [prompt, setPrompt] = useState<string>('');\n  const [jobDetails, setJobDetails] = useState({ designation: '', location: '', salary: '' });"
);

// 2. Change the form to show Job Details for Hiring Reel
const hiringForm = `
              {reelCategory === 'Hiring Reel' ? (
                <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h4 className="font-bold text-gray-700 text-sm">Job Details (Will be formatted as JSON)</h4>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Designation</label>
                    <input 
                      value={jobDetails.designation}
                      onChange={e => setJobDetails({...jobDetails, designation: e.target.value})}
                      placeholder="e.g. Senior Credit Analyst"
                      className="w-full border rounded p-2 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Location</label>
                      <input 
                        value={jobDetails.location}
                        onChange={e => setJobDetails({...jobDetails, location: e.target.value})}
                        placeholder="e.g. New York, NY"
                        className="w-full border rounded p-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Salary</label>
                      <input 
                        value={jobDetails.salary}
                        onChange={e => setJobDetails({...jobDetails, salary: e.target.value})}
                        placeholder="e.g. $120k - $150k"
                        className="w-full border rounded p-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Specific Prompt (Optional)</label>
                  <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., We are urgently hiring 5 senior credit analysts..."
                    className="w-full border rounded-lg p-3 h-24 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
`;

content = content.replace(
  /<div>\s*<label className="block text-sm font-medium text-gray-700 mb-1">Specific Prompt \(Optional\)<\/label>[\s\S]*?<\/div>/,
  hiringForm
);

// 3. Update handleGenerateScript to inject JSON if Hiring Reel
const generateScriptBody = `
    const template = templates.find(t => t.id === selectedTemplateId);
    
    setIsGenerating(true);
    setStatus('Generating script tailored for ' + selectedClient.business_name + '...');
    try {
      // Build specific prompt for hiring
      let finalPrompt = prompt;
      let prefilledHeadline = '';
      if (reelCategory === 'Hiring Reel' && jobDetails.designation) {
        finalPrompt = \`Generate a hiring reel for \${jobDetails.designation} located in \${jobDetails.location} with salary \${jobDetails.salary}. \${prompt}\`;
        prefilledHeadline = \`{\\n  "Role": "\${jobDetails.designation}",\\n  "Loc": "\${jobDetails.location}",\\n  "Pay": "\${jobDetails.salary}"\\n}\`;
      }

      const data = await generateClientReelScript(selectedClient, reelCategory, finalPrompt, template);
      
      if (prefilledHeadline) {
        data.headline = prefilledHeadline;
      }
      
      setScriptData(data);
      setStep(3);
`;

content = content.replace(
  /const template = templates\.find[\s\S]*?setStep\(3\);/,
  generateScriptBody
);

// 4. Fix layout by changing flex-1 overflow-y-auto to normal flex-col lg:flex-row max-h-[90vh] overflow-y-auto
content = content.replace(
  '<div className="bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col h-[90vh] lg:h-[80vh] max-h-[900px] border border-gray-100">',
  '<div className="bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col w-full max-h-[90vh] lg:max-h-[80vh] border border-gray-100 overflow-y-auto">'
);

content = content.replace(
  '<div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden">',
  '<div className="flex flex-col lg:flex-row flex-1">'
);

content = content.replace(
  '<div className="w-full lg:w-1/2 p-4 lg:p-6 lg:overflow-y-auto lg:border-r border-gray-200 shrink-0">',
  '<div className="w-full lg:w-1/2 p-4 lg:p-6 lg:border-r border-gray-200">'
);

content = content.replace(
  '<div className="w-full lg:w-1/2 bg-gray-100 p-4 lg:p-6 flex flex-col items-center justify-center border-t lg:border-t-0 lg:border-l border-gray-200 min-h-[400px]">',
  '<div className="w-full lg:w-1/2 bg-gray-100 p-4 lg:p-6 flex flex-col items-center justify-start lg:justify-center border-t lg:border-t-0 lg:border-l border-gray-200 min-h-[400px]">'
);

// 5. Fix template preview to play video if mediaUrl exists
const bgTemplateOld = `{selectedTemplateId ? (
              <img src={filteredTemplates.find(t=>t.id===selectedTemplateId)?.screenshotUrl} className="absolute inset-0 w-full h-full object-cover opacity-50" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-700 font-medium">Select a Template</div>
            )}`;

const bgTemplateNew = `{selectedTemplateId ? (
              filteredTemplates.find(t=>t.id===selectedTemplateId)?.mediaUrl ? (
                <video src={filteredTemplates.find(t=>t.id===selectedTemplateId)?.mediaUrl} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-50" />
              ) : (
                <img src={filteredTemplates.find(t=>t.id===selectedTemplateId)?.screenshotUrl} className="absolute inset-0 w-full h-full object-cover opacity-50" />
              )
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-700 font-medium">Select a Template</div>
            )}`;

content = content.replace(bgTemplateOld, bgTemplateNew);

// Make the text pre tag for JSON support in preview!
content = content.replace(
  '<h1 className="text-3xl font-extrabold text-white drop-shadow-lg" style={{textShadow: \'0 4px 8px rgba(0,0,0,0.8)\'}}>{scriptData.headline}</h1>',
  '<pre className="text-xl sm:text-2xl font-extrabold text-white drop-shadow-lg whitespace-pre-wrap text-left" style={{textShadow: \'0 4px 8px rgba(0,0,0,0.8)\', fontFamily: scriptData.headline.includes(\'{\') ? \'monospace\' : \'inherit\'}}>{scriptData.headline}</pre>'
);

// Step 3 headline input needs to be a textarea so we can edit JSON!
content = content.replace(
  '<input \n                      value={scriptData.headline}\n                      onChange={e => setScriptData({...scriptData, headline: e.target.value})}\n                      className="w-full border-b-2 border-gray-200 py-2 focus:border-blue-500 outline-none font-bold text-lg"\n                    />',
  '<textarea \n                      value={scriptData.headline}\n                      onChange={e => setScriptData({...scriptData, headline: e.target.value})}\n                      className="w-full border-2 border-gray-200 py-2 px-2 focus:border-blue-500 outline-none font-bold text-sm font-mono h-32 rounded"\n                    />'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('ClientReelWizard.tsx patched!');
