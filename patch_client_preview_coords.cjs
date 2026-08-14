const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components', 'ClientReelWizard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Find the Right Panel: Preview
const oldOverlays = `{scriptData.headline && (
              <div className="absolute top-1/4 w-full px-6 text-center">
                <pre className="text-xl sm:text-2xl font-extrabold text-white drop-shadow-lg whitespace-pre-wrap text-left" style={{textShadow: '0 4px 8px rgba(0,0,0,0.8)', fontFamily: scriptData.headline.includes('{') ? 'monospace' : 'inherit'}}>{scriptData.headline}</pre>
              </div>
            )}
            {scriptData.ticker && (
              <div className="absolute bottom-16 left-0 right-0 bg-red-600 text-white font-bold whitespace-nowrap overflow-hidden py-1 px-4 text-lg">
                {scriptData.ticker}
              </div>
            )}`;

const newOverlays = `            {(() => {
              const template = filteredTemplates.find(t => t.id === selectedTemplateId);
              if (!template) return null;
              
              const renderBox = (boxStr: string, content: React.ReactNode, isTicker = false) => {
                if (!boxStr || boxStr === 'hidden') return null;
                const [x, y, w, h] = boxStr.split(',').map(Number);
                const scale = 100 / 1080; // percentage based on 1080 logical width
                const scaleY = 100 / 1920; // percentage based on 1920 logical height
                
                return (
                  <div 
                    className={\`absolute flex items-center \${isTicker ? 'justify-start overflow-hidden whitespace-nowrap bg-red-600' : 'justify-center'}\`}
                    style={{
                      left: \`\${x * scale}%\`,
                      top: \`\${y * scaleY}%\`,
                      width: \`\${w * scale}%\`,
                      height: \`\${h * scaleY}%\`,
                    }}
                  >
                    {content}
                  </div>
                );
              };

              return (
                <>
                  {scriptData.headline && template.coordinates?.headline_box && renderBox(
                    template.coordinates.headline_box,
                    <pre className="text-lg sm:text-xl font-extrabold text-white drop-shadow-lg whitespace-pre-wrap text-left w-full h-full flex items-center justify-center" style={{textShadow: '0 2px 4px rgba(0,0,0,0.8)', fontFamily: scriptData.headline.includes('{') ? 'monospace' : 'inherit', fontSize: scriptData.headline.includes('{') ? '12px' : 'inherit', lineHeight: '1.2'}}>{scriptData.headline}</pre>
                  )}
                  {scriptData.ticker && template.coordinates?.ticker_box && renderBox(
                    template.coordinates.ticker_box,
                    <span className="text-white font-bold px-2">{scriptData.ticker}</span>,
                    true
                  )}
                </>
              );
            })()}`;

if (content.includes('className="absolute top-1/4 w-full px-6 text-center"')) {
  content = content.replace(oldOverlays, newOverlays);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Patched ClientReelWizard overlay coordinates');
} else {
  console.log('Already patched ClientReelWizard overlay coords');
}
