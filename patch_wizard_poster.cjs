const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components', 'ClientReelWizard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const oldVideo = `<video src={filteredTemplates.find(t=>t.id===selectedTemplateId)?.mediaUrl} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-50" />`;
const newVideo = `<video src={filteredTemplates.find(t=>t.id===selectedTemplateId)?.mediaUrl} poster={filteredTemplates.find(t=>t.id===selectedTemplateId)?.screenshotUrl} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-50 bg-gray-900" />`;

if (content.includes(oldVideo)) {
  content = content.replace(oldVideo, newVideo);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Patched ClientReelWizard video poster');
} else {
  console.log('Already patched ClientReelWizard video poster');
}
