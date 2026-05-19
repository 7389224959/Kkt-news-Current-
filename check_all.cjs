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

const n = 'node_modules';
const szs = [];
fs.readdirSync(n).forEach(m => {
  if (m.startsWith('.')) return;
  if (m.startsWith('@')) {
    fs.readdirSync(path.join(n, m)).forEach(sub => {
       szs.push({ name: m + '/' + sub, size: getDirSize(path.join(n, m, sub)) });
    });
  } else {
    szs.push({ name: m, size: getDirSize(path.join(n, m)) });
  }
});
szs.sort((a,b)=>b.size-a.size).slice(0,20).forEach(x => console.log(x.name, (x.size/1024/1024).toFixed(2)));
