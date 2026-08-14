const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'api', 'render-reel.js');
let content = fs.readFileSync(filePath, 'utf8');

const oldWrapText = `    const wrapText = (text, maxWidth, fontSize) => {
      const charWidth = fontSize * 0.45;
      const maxChars = Math.max(10, Math.floor(maxWidth / charWidth));
      const words = String(text).split(" ");
      let lines = [];
      let currentLine = "";
      for (const word of words) {
        if (
          currentLine.length + word.length + 1 > maxChars &&
          currentLine.length > 0
        ) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine += (currentLine ? " " : "") + word;
        }
      }
      lines.push(currentLine);
      return lines.join("\\n");
    };`;

const newWrapText = `    const wrapText = (text, maxWidth, fontSize) => {
      const charWidth = fontSize * 0.45;
      const maxChars = Math.max(10, Math.floor(maxWidth / charWidth));
      const originalLines = String(text).split("\\n");
      let lines = [];
      
      for (const line of originalLines) {
        if (line.trim() === '') {
          lines.push('');
          continue;
        }
        const words = line.split(" ");
        let currentLine = "";
        for (const word of words) {
          if (
            currentLine.length + word.length + 1 > maxChars &&
            currentLine.length > 0
          ) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine += (currentLine ? " " : "") + word;
          }
        }
        if (currentLine) lines.push(currentLine);
      }
      return lines.join("\\n");
    };`;

if (content.includes('const words = String(text).split(" ");')) {
  content = content.replace(oldWrapText, newWrapText);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Patched wrapText in render-reel.js');
} else {
  console.log('Already patched wrapText');
}
