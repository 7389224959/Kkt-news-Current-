const fs = require('fs');
const path = require('path');
function getDirSize(dir) {
  let size = 0;
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const p = path.join(dir, item);
      const stat = fs.statSync(p);
      if (stat.isDirectory()) size += getDirSize(p);
      else size += stat.size;
    }
  } catch(e) {}
  return size;
}
console.log('sharp size:', (getDirSize('node_modules/sharp')/1024/1024).toFixed(2));
console.log('@imgly size:', (getDirSize('node_modules/@imgly')/1024/1024).toFixed(2));
console.log('fluent-ffmpeg size:', (getDirSize('node_modules/fluent-ffmpeg')/1024/1024).toFixed(2));
console.log('ffmpeg-static size:', (getDirSize('node_modules/ffmpeg-static')/1024/1024).toFixed(2));
