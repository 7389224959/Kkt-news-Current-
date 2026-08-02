const fs = require('fs');
let code = fs.readFileSync('components/ReelWizard.tsx', 'utf8');
code = code.replace(
  `setTimeout(() => {
            alert('Completed auto reel generation (downloaded locally).');
            onClose();
         }, 2000);`,
  `setStatus('Step 5/5: Auto Publishing Reel...');
         try {
            await handlePublishReel(objectUrl, updatedScriptData);
         } catch(e) { console.error('Auto publish failed', e); }
         setTimeout(() => {
            alert('Completed auto reel generation (downloaded locally).');
            onClose();
         }, 2000);`
);
fs.writeFileSync('components/ReelWizard.tsx', code);
