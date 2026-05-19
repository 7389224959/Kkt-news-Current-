import fs from 'fs';
import path from 'path';

const dir = 'node_modules/@imgly/background-removal-node/dist';
if (fs.existsSync(dir)) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file.length === 64) {
      fs.unlinkSync(path.join(dir, file));
    }
  }
  console.log('Cleaned up heavy imgly models');
}
