import sharp from 'sharp';
/**
 * Downloads an image and returns a buffer
 */
async function downloadImage(url: string, retries = 3): Promise<{buffer: Buffer, contentType: string}> {
  if (url.startsWith('data:')) {
    const matches = url.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid base64 string');
    }
    return { buffer: Buffer.from(matches[2], 'base64'), contentType: matches[1] };
  }

  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'KKTNewsBot/1.0 (vishal9425545374@gmail.com)'
        }
      });
      if (!res.ok) throw new Error(`Failed to fetch image: ${url} - Status ${res.status}`);
      
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/html') || contentType.includes('application/json')) {
        throw new Error(`Failed to fetch image: ${url} - Returned text/json instead of image`);
      }
      
      const arrayBuffer = await res.arrayBuffer();
      return { buffer: Buffer.from(arrayBuffer), contentType };
    } catch (err: any) {
      if (i === retries - 1) throw err;
      console.warn(`Retry ${i + 1}/${retries} downloading ${url}. Error: ${err.message}`);
      await new Promise(r => setTimeout(r, 2000 + i * 2000)); // wait 2s, 4s, etc.
    }
  }
  throw new Error("unreachable");
}

/**
 * Generates the professional news collage
 * 70% real, 30% AI support
 * 
 * Rules:
 *  - Auto background removal for hero subject
 *  - Smart placement: hero dominates 45-60%, support secondary
 *  - Add soft shadow, gradient blending, vignette
 *  - 1080x1080 Output
 */
export async function generateNewsCollage(
  heroImageUrl: string,
  contextImageUrl: string,
  enhancerImageUrl?: string,
  category: string = 'politics',
  supportImageUrls?: string[],
  isHeroTransparent: boolean = false
): Promise<Buffer> {
  const O_WIDTH = 1920;
  const O_HEIGHT = 1080;

  console.log('Downloading collage source images...');
  
  const [heroDownloaded, contextDownloaded] = await Promise.all([
    downloadImage(heroImageUrl),
    downloadImage(contextImageUrl)
  ]);
  
  // Right side 70% real image (Hero)
  const heroWidth = Math.floor(O_WIDTH * 0.7);
  // Left side 30% AI image (Context)
  const contextWidth = O_WIDTH - heroWidth; // 30%
  
  // Actually we will make the AI image fill the whole background
  // and the Hero image fill the right 70%, with a gradient fade mask on its left edge.
  
  const bgImage = await sharp(contextDownloaded.buffer)
    .resize(O_WIDTH, O_HEIGHT, { fit: 'cover' })
    .modulate({ brightness: 0.8 })
    .toBuffer();

  const composites: sharp.OverlayOptions[] = [];
  
  // Hard edge split or short gradient mask for the Hero Image
  // 30% / 70% split
  try {
    const heroCover = await sharp(heroDownloaded.buffer)
       .resize(heroWidth, O_HEIGHT, { fit: 'cover' })
       .png()
       .toBuffer();

    composites.push({
      input: heroCover,
      top: 0,
      left: O_WIDTH - heroWidth,
      blend: 'over'
    });
  } catch (err: any) {
    console.warn("Failed to process hero image:", err.message);
  }
  
  // Support Images on the left side
  if (supportImageUrls && supportImageUrls.length > 0) {
    const radius = 120;
    const size = radius * 2;
    const marginX = 50;
    const marginY = 50;

    const circleCutout = Buffer.from(
      `<svg width="${size}" height="${size}"><circle cx="${radius}" cy="${radius}" r="${radius}" fill="#fff"/></svg>`
    );

    const supportPromises = supportImageUrls.slice(0, 3).map(async (url, index) => {
       try {
         const sBuf = await downloadImage(url);
         const circleImage = await sharp(sBuf.buffer)
           .resize(size, size, { fit: 'cover' })
           .composite([{ input: circleCutout, blend: 'dest-in' }])
           .png()
           .toBuffer();

         const top = O_HEIGHT - size - marginY - (index * (size + 30));
         const left = marginX;

         composites.push({
           input: circleImage,
           top,
           left,
           blend: 'over'
         });
         
         const borderSvg = Buffer.from(
           `<svg width="${size}" height="${size}"><circle cx="${radius}" cy="${radius}" r="${radius}" fill="none" stroke="#FFD700" stroke-width="4"/></svg>`
         );
         composites.push({
           input: borderSvg,
           top, left, blend: 'over'
         });
       } catch (e) {
         console.warn("Skipping support image", e);
       }
    });
    await Promise.all(supportPromises);
  }

  // Dark gradients for text readability (bottom and left edge)
  const overlaySvg = `
    <svg width="${O_WIDTH}" height="${O_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Soft bottom gradient, mostly below 50% height -->
        <linearGradient id="text-bg-bottom" x1="0" y1="0" x2="0" y2="1">
          <stop offset="40%" stop-color="#000" stop-opacity="0" />
          <stop offset="70%" stop-color="#000" stop-opacity="0.8" />
          <stop offset="100%" stop-color="#000" stop-opacity="0.95" />
        </linearGradient>
        
        <!-- Gentle left shadow just for edge framing -->
        <linearGradient id="text-bg-left" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#000" stop-opacity="0.5" />
          <stop offset="25%" stop-color="#000" stop-opacity="0" />
        </linearGradient>
      </defs>
      
      <!-- The shadows -->
      <rect x="0" y="0" width="${O_WIDTH}" height="${O_HEIGHT}" fill="url(#text-bg-left)" />
      <rect x="0" y="0" width="${O_WIDTH}" height="${O_HEIGHT}" fill="url(#text-bg-bottom)" />
    </svg>
  `;
  composites.push({ input: Buffer.from(overlaySvg), top: 0, left: 0, blend: 'over' });

  // Compose all layers
  console.log('Compositing images (new 70/30 flow)...');
  try {
    const compositeBuffer = await sharp(bgImage)
      .composite(composites)
      .toBuffer();
      
    // Resize for Facebook export (1200x630)
    return await sharp(compositeBuffer)
      .resize(1200, 630, { fit: 'cover' })
      .jpeg({ quality: 90 })
      .toBuffer();
  } catch (err: any) {
    throw new Error(`Failed to composite images: ${err.message}`);
  }
}

/**
 * Extract image URL from source link (using standard meta tags)
 * Also can be expanded to search body
 */
export async function extractPrimaryImageFromUrl(url: string): Promise<string | null> {
  try {
    const fetchRes = await fetch(`http://localhost:${process.env.PORT || 3000}/api/extract-article?url=${encodeURIComponent(url)}`);
    if (fetchRes.ok) {
      const data = await fetchRes.json();
      if (data.image) {
         return data.image;
      }
    }
  } catch (e) {
    console.error('Failed to extract image:', e);
  }
  return null;
}
