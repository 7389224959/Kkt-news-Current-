import sharp from 'sharp';
import { removeBackground } from '@imgly/background-removal-node';

/**
 * Downloads an image and returns a buffer
 */
async function downloadImage(url: string): Promise<{buffer: Buffer, contentType: string}> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${url} - Status ${res.status}`);
  
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    throw new Error(`Failed to fetch image: ${url} - Returned HTML instead of image`);
  }
  
  const arrayBuffer = await res.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), contentType };
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
  supportImageUrls?: string[]
): Promise<Buffer> {
  // 1. Download images
  console.log('Downloading collage source images...');
  const heroDownloaded = await downloadImage(heroImageUrl);
  const contextDownloaded = await downloadImage(contextImageUrl);
  const enhancerDownloaded = enhancerImageUrl ? await downloadImage(enhancerImageUrl) : null;
  
  const supportBuffers: {base64: string, isPortrait: boolean}[] = [];
  if (supportImageUrls && supportImageUrls.length > 0) {
    for (const url of supportImageUrls) {
      try {
         const downloaded = await downloadImage(url);
         // Format as standard insert
         const processed = await sharp(downloaded.buffer).resize(400, 300, { fit: 'cover' }).jpeg({quality: 90}).toBuffer();
         supportBuffers.push({ base64: processed.toString('base64'), isPortrait: false });
      } catch (e) {
         console.error('Failed to download support image', url);
      }
    }
  }

  const heroBuffer = heroDownloaded.buffer;
  const heroContentType = heroDownloaded.contentType || 'image/jpeg';
  let contextBuffer = contextDownloaded.buffer;
  let enhancerBuffer = enhancerDownloaded ? enhancerDownloaded.buffer : null;

  // Convert hero to JPEG first to avoid "Unsupported format" errors for GIFs, etc.
  console.log('Converting hero to JPEG for background removal...');
  const heroJpegBuffer = await sharp(heroBuffer).jpeg().toBuffer();

  // 2. Remove Background from Hero
  console.log('Removing background from hero image...');
  // Note: removeBackground accepts a Blob or path, we pass an ArrayBuffer / Uint8Array in node
  const heroBlob = new Blob([new Uint8Array(heroJpegBuffer as any)], { type: 'image/jpeg' });
  console.log('Blob type is:', heroBlob.type, 'Original type was:', heroContentType);
  
  let heroNoBgBlob;
  try {
    heroNoBgBlob = await removeBackground(heroBlob);
  } catch (err: any) {
    console.error('removeBackground threw:', err);
    throw new Error(`removeBackground failed: ${err.message}. Original CT: ${heroContentType}, Blob Type: ${heroBlob.type}`);
  }
  const heroNoBgBuffer = Buffer.from(await heroNoBgBlob.arrayBuffer());

  const O_WIDTH = 1920;
  const O_HEIGHT = 1080;

  // 3. Process context image (background)
  let resizedContext;
  try {
    resizedContext = await sharp(contextBuffer)
      .resize(O_WIDTH, O_HEIGHT, { fit: 'cover' })
      .modulate({ brightness: 0.6 }) // Darken slightly to make hero pop
      .blur(category.toLowerCase() === 'crime' ? 8 : 6) // strong depth blur
      .toBuffer();
  } catch (err: any) {
    throw new Error(`Failed to process context image: ${err.message}`);
  }

  const composites: sharp.OverlayOptions[] = [];

  // 4. Enhance image (AI enhancer for mood) if available - strictly limited to 15% opacity to preserve realism
  if (enhancerBuffer) {
    try {
      const resizedEnhancer = await sharp(enhancerBuffer)
        .resize(O_WIDTH, O_HEIGHT, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toBuffer();

      const svgOverlay = `<svg width="${O_WIDTH}" height="${O_HEIGHT}">
        <image href="data:image/jpeg;base64,${resizedEnhancer.toString('base64')}" width="${O_WIDTH}" height="${O_HEIGHT}" opacity="0.15" />
      </svg>`;

      composites.push({
        input: Buffer.from(svgOverlay),
        blend: category.toLowerCase() === 'crime' ? 'multiply' : 'soft-light'
      });
    } catch (err: any) {
       console.warn(`Failed to process enhancer image: ${err.message}`);
    }
  }

  // 5. Build Hero layer (dominates 50-70% of vertical space, placed at bottom-center typically)
  let heroResized;
  let heroWidth = O_WIDTH;
  let targetHeroHeight = Math.floor(O_HEIGHT * 0.70);
  try {
    let heroImageSharp = sharp(heroNoBgBuffer);
    heroResized = await heroImageSharp.resize({ 
      width: Math.floor(O_WIDTH * 0.8), // up to 80% width max
      height: targetHeroHeight, 
      fit: 'inside',
      withoutEnlargement: true // Prevent stretching low quality images!
    }).toBuffer();
    
    const heroResizedMeta = await sharp(heroResized).metadata();
    heroWidth = heroResizedMeta.width || O_WIDTH;
    targetHeroHeight = heroResizedMeta.height || targetHeroHeight;
  } catch (err: any) {
    throw new Error(`Failed to process hero image: ${err.message}. Buffer size: ${heroNoBgBuffer.length}`);
  }
  
  // Placement: Bottom Center
  const heroLeft = Math.max(0, Math.floor((O_WIDTH - heroWidth) / 2));
  const heroTop = Math.max(0, O_HEIGHT - targetHeroHeight);

  const heroBase64 = heroResized.toString('base64');
  
  let supportImagesSvg = '';
  if (supportBuffers.length > 0) {
    // Layout support images floating dynamically on sides
    supportBuffers.forEach((sb, index) => {
       const x = index === 0 ? 80 : Math.max(80, O_WIDTH - 480);
       const y = 80 + index * 100;
       
       supportImagesSvg += `
        <g filter="url(#hero-shadow)">
          <rect x="${x - 5}" y="${y - 5}" width="410" height="310" rx="15" fill="#ffffff" />
          <image href="data:image/jpeg;base64,${sb.base64}" x="${x}" y="${y}" width="400" height="300" clip-path="inset(0% round 10px)" />
        </g>
       `;
    });
  }

  const combinedOverlaySvg = `
    <svg width="${O_WIDTH}" height="${O_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="hero-shadow">
          <feDropShadow dx="0" dy="15" stdDeviation="25" flood-color="#000" flood-opacity="0.8"/>
        </filter>
        <radialGradient id="vignette" cx="50%" cy="45%" r="70%" fx="50%" fy="45%">
          <stop offset="30%" stop-color="#000" stop-opacity="0" />
          <stop offset="70%" stop-color="#000" stop-opacity="0.4" />
          <stop offset="100%" stop-color="#000" stop-opacity="0.85" />
        </radialGradient>
        <linearGradient id="bottom-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="60%" stop-color="#000" stop-opacity="0" />
          <stop offset="100%" stop-color="#000" stop-opacity="0.95" />
        </linearGradient>
      </defs>
      
      <!-- Support Entity Images Layer -->
      ${supportImagesSvg}

      <!-- Hero Layer with Shadow -->
      <image href="data:image/png;base64,${heroBase64}" x="${heroLeft}" y="${heroTop}" width="${heroWidth}" height="${targetHeroHeight}" filter="url(#hero-shadow)" />
      
      <!-- Center Spotlight Vignette Layer -->
      <rect x="0" y="0" width="${O_WIDTH}" height="${O_HEIGHT}" fill="url(#vignette)" />

      <!-- Bottom Gradient for Text Readability -->
      <rect x="0" y="0" width="${O_WIDTH}" height="${O_HEIGHT}" fill="url(#bottom-gradient)" />
    </svg>
  `;

  composites.push({
    input: Buffer.from(combinedOverlaySvg),
    top: 0,
    left: 0,
    blend: 'over' as sharp.Blend
  });

  // Compose all layers
  console.log('Compositing images...');
  try {
    return await sharp(resizedContext)
      .composite(composites)
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
