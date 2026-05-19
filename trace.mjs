import { nodeFileTrace } from '@vercel/nft';
import fs from 'fs';
async function run() {
  const { fileList } = await nodeFileTrace(['api/generate-collage.js']);
  let size = 0;
  fileList.forEach(f => {
    try { size += fs.statSync(f).size; } catch(e){}
    if (f.includes('onnx')) console.log(f, fs.statSync(f).size);
  });
  console.log('Total size:', (size / 1024 / 1024).toFixed(2), 'MB');
}
run();
