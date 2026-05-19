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
const n = 'node_modules/@imgly/background-removal-node';
fs.readdirSync(n).forEach(m => {
  console.log(m, (getDirSize(path.join(n, m))/1024/1024).toFixed(2));
});
