import sharp from 'sharp';
import fs from 'fs';
import { removeBackground } from '@imgly/background-removal-node';

async function test() {
  const buf = fs.readFileSync('test.jpg');
  const heroBlob = new Blob([new Uint8Array(buf)], { type: 'image/jpeg' });
  try {
    const heroNoBgBlob = await removeBackground(heroBlob, {
      publicPath: "https://unpkg.com/@imgly/background-removal-node@1.4.5/dist/"
    });
    console.log("Success! size:", heroNoBgBlob.size);
  } catch(e) {
    console.log("Error:", e);
  }
}
test();
