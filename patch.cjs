const fs = require('fs');
let code = fs.readFileSync('components/ReelWizard.tsx', 'utf8');

const target = `      if (autoStart) {
         setStatus('Step 4/4: Downloading video locally...');
         
         const a = document.createElement('a');
         a.href = objectUrl;
         a.download = \`auto-reel-\${Date.now()}.mp4\`;
         document.body.appendChild(a);
         a.click();
         document.body.removeChild(a);
         
         setTimeout(() => {
            alert('Completed auto reel generation (downloaded locally).');
            onClose();
         }, 2000);
      } else {
         setStep(4);
      }`;

const replacement = `      if (autoStart) {
         setStatus('Step 4/4: Downloading video locally...');
         
         const a = document.createElement('a');
         a.href = objectUrl;
         a.download = \`auto-reel-\${Date.now()}.mp4\`;
         document.body.appendChild(a);
         a.click();
         document.body.removeChild(a);
         
         setStatus('Step 5/5: Auto Publishing Reel...');
         try {
            const message = updatedScriptData.facebookCaption || ((updatedScriptData.headline || article.title || 'Breaking News') + ' \\n\\n#kktnews');
            await doPublishReel(blob, message);
         } catch(e) {
            console.error('Auto publish failed', e);
         }
         
         setTimeout(() => {
            alert('Completed auto reel generation and publish.');
            onClose();
         }, 2000);
      } else {
         setStep(4);
      }`;

code = code.replace(target, replacement);
fs.writeFileSync('components/ReelWizard.tsx', code);
