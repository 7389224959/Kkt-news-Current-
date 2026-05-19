import sharp from 'sharp';
import { removeBackground } from '@imgly/background-removal-node';

/**
 * Downloads an image and returns a buffer
 */
async function downloadImage(url: string, retries = 3): Promise<{buffer: Buffer, contentType: string}> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
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
  supportImageUrls?: string[]
): Promise<Buffer> {
  // 1. Download images
  console.log('Downloading collage source images...');
  
  // Download sequentially to avoid API rate limits (like queue full on pollinations)
  const heroDownloaded = await downloadImage(heroImageUrl);
  const contextDownloaded = await downloadImage(contextImageUrl);
  const enhancerDownloaded = enhancerImageUrl ? await downloadImage(enhancerImageUrl) : null;
  
  const supportBuffers: {base64: string, isPortrait: boolean}[] = [];
  if (supportImageUrls && supportImageUrls.length > 0) {
    for (const url of supportImageUrls) {
       try {
         const downloaded = await downloadImage(url);
         // Format as standard insert
         const processed = await sharp(downloaded.buffer).resize(400, 400, { fit: 'cover' }).jpeg({quality: 90}).toBuffer();
         supportBuffers.push({ base64: processed.toString('base64'), isPortrait: false });
       } catch (e: any) {
         console.error('Failed to download support image', url, e.message);
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
      .modulate({ brightness: 0.85 }) // Cinematic premium look
      .blur(4) // slight blur as requested
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
    let heroImageSharp = sharp(heroNoBgBuffer).trim();
    heroResized = await heroImageSharp.resize({ 
      width: Math.floor(O_WIDTH * 0.8), // up to 80% width max
      height: targetHeroHeight, 
      fit: 'inside',
      withoutEnlargement: false
    }).normalize().sharpen().png().toBuffer();
    
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
    // Layout support images in corners dynamically
    const radius = 150;
    const size = radius * 2;
    const marginX = 80;
    const marginY = 80;
    
    supportBuffers.forEach((sb, index) => {
       let cx = marginX + radius;
       let cy = marginY + radius;
       
       if (index === 1) {
         cx = O_WIDTH - marginX - radius; 
         cy = marginY + radius;
       } else if (index === 2) {
         cx = marginX + radius;
         cy = Math.max(marginY + radius, O_HEIGHT - marginY - radius - 200);
       } else if (index === 3) {
         cx = O_WIDTH - marginX - radius;
         cy = Math.max(marginY + radius, O_HEIGHT - marginY - radius - 200);
       }
       
       supportImagesSvg += `
        <g filter="url(#circle-shadow)">
          <circle cx="${cx}" cy="${cy}" r="${radius}" fill="white" />
          <clipPath id="circle-clip-${index}">
            <circle cx="${cx}" cy="${cy}" r="${radius}" />
          </clipPath>
          <image href="data:image/jpeg;base64,${sb.base64}" x="${cx - radius}" y="${cy - radius}" width="${size}" height="${size}" clip-path="url(#circle-clip-${index})" />
          <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="#FFD700" stroke-width="6" />
        </g>
       `;
    });
  }

  const combinedOverlaySvg = `
    <svg width="${O_WIDTH}" height="${O_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="hero-outline-shadow">
          <feMorphology in="SourceAlpha" operator="dilate" radius="8" result="DILATED" />
          <feFlood flood-color="white" result="WHITE" />
          <feComposite in="WHITE" in2="DILATED" operator="in" result="OUTLINE" />
          <feDropShadow dx="0" dy="15" stdDeviation="25" flood-color="#000" flood-opacity="0.8" result="SHADOW" />
          <feMerge>
            <feMergeNode in="SHADOW" />
            <feMergeNode in="OUTLINE" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="circle-shadow">
          <feDropShadow dx="0" dy="10" stdDeviation="15" flood-color="#000" flood-opacity="0.6" />
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
      
      <!-- Center Spotlight Vignette Layer -->
      <rect x="0" y="0" width="${O_WIDTH}" height="${O_HEIGHT}" fill="url(#vignette)" />

      <!-- Support Entity Images Layer -->
      ${supportImagesSvg}

      <!-- Hero Layer with Shadow and Outline -->
      <image href="data:image/png;base64,${heroBase64}" x="${heroLeft}" y="${heroTop}" width="${heroWidth}" height="${targetHeroHeight}" filter="url(#hero-outline-shadow)" />
      
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
    const compositeBuffer = await sharp(resizedContext)
      .composite(composites)
      .toBuffer();
      
    // Resize for Facebook export (1200x630)
    return await sharp(compositeBuffer)
      .resize(1200, 630, { fit: 'cover' })
      .png({ compressionLevel: 2, quality: 100 })
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
