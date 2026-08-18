import path from 'path';
import fs from 'fs';

export default function handler(req: any, res: any) {
  // Allow CORS so the browser can download it directly
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  const filePath = path.join(process.cwd(), 'public', 'arani-reel-system-export.tar.gz');
  if (fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', 'attachment; filename="arani-reel-system-export.tar.gz"');
    res.setHeader('Content-Type', 'application/octet-stream');
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } else {
    res.status(404).send('Not found');
  }
}
