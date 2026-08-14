const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'api', 'render-reel.js');
let content = fs.readFileSync(filePath, 'utf8');

const oldFont = `await downloadFile(
      "https://raw.githubusercontent.com/google/fonts/main/ofl/hind/Hind-Bold.ttf",
      fontPath,
    );`;

const newFont = `const isJson = scriptData.headline && scriptData.headline.includes('{');
    await downloadFile(
      isJson ? "https://raw.githubusercontent.com/google/fonts/main/ofl/robotomono/RobotoMono-Bold.ttf" : "https://raw.githubusercontent.com/google/fonts/main/ofl/hind/Hind-Bold.ttf",
      fontPath,
    );`;

if (content.includes(oldFont)) {
  content = content.replace(oldFont, newFont);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Patched ffmpeg font logic');
} else {
  console.log('Already patched ffmpeg font');
}
