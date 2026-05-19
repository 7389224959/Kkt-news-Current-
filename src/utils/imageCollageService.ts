import sharp from 'sharp';
/**
 * Downloads an image and returns a buffer
 */
async function downloadImage(url: string, retries = 3): Promise<{buffer: Buffer, contentType: string}> {
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

  let heroNoBgBuffer: Buffer;
  
  if (isHeroTransparent) {
    console.log('Hero image is already transparent, skipping background removal.');
    heroNoBgBuffer = heroBuffer;
  } else {
    // Vercel serverless has memory limits that cause @imgly/background-removal-node to crash (OOM/segfault).
    // So we apply a masking / soft-edge overlay using sharp instead as a fallback.
    console.log('Applying a soft edge rounded mask to the hero image since precise background removal is disabled on Vercel server.');
    
    // Create a PNG with rounded corners and a slight fade instead of true background removal
    const hMeta = await sharp(heroBuffer).metadata();
    const w = hMeta.width || 800;
    const h = hMeta.height || 800;
    
    const rx = Math.floor(w * 0.1);
    const ry = Math.floor(h * 0.1);

    const maskSvg = `<svg width="${w}" height="${h}"><rect x="0" y="0" width="${w}" height="${h}" rx="${rx}" ry="${ry}" fill="white"/></svg>`;

    try {
      heroNoBgBuffer = await sharp(heroBuffer)
        .ensureAlpha()
        .composite([{ input: Buffer.from(maskSvg), blend: 'dest-in' }])
        .png()
        .toBuffer();
    } catch (err: any) {
      console.warn("Failed to apply mask, falling back to original:", err.message);
      heroNoBgBuffer = heroBuffer;
    }
  }

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

  // 4. Enhance image (AI enhancer for mood) if available
  if (enhancerBuffer) {
    try {
       // Direct composite with 'overlay' blend mode (which naturally integrates colors without needing extreme opacity reductions that Vercel's sharp might struggle to parse in SVGs)
       const resizedEnhancer = await sharp(enhancerBuffer)
         .resize(O_WIDTH, O_HEIGHT, { fit: 'cover' })
         .toBuffer();

       // To simulate opacity natively without SVG <image>, we can compose a tiny bit of the enhancer, 
       // but it's safest to simply use a 'soft-light' blend directly.
       composites.push({
         input: resizedEnhancer,
         blend: 'soft-light'
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
  
  // VIGNETTE OVERLAY
  const vignetteSvg = `
    <svg width="${O_WIDTH}" height="${O_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="vig" cx="50%" cy="45%" r="70%" fx="50%" fy="45%">
          <stop offset="30%" stop-color="#000" stop-opacity="0" />
          <stop offset="70%" stop-color="#000" stop-opacity="0.4" />
          <stop offset="100%" stop-color="#000" stop-opacity="0.85" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="${O_WIDTH}" height="${O_HEIGHT}" fill="url(#vig)" />
    </svg>
  `;
  composites.push({ input: Buffer.from(vignetteSvg), top: 0, left: 0, blend: 'over' });

  // SUPPORT IMAGES
  // Create circular clips natively and add them
  if (supportBuffers.length > 0) {
    const radius = 150;
    const size = radius * 2;
    const marginX = 80;
    const marginY = 80;
    
    // We'll create a single mask for all support images
    const circleCutout = Buffer.from(
      `<svg width="${size}" height="${size}"><circle cx="${radius}" cy="${radius}" r="${radius}" fill="#fff"/></svg>`
    );

    for (let index = 0; index < supportBuffers.length; index++) {
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

       try {
         // Create a composite of the raw image cut out as a circle, with a stroke
         const circleImage = await sharp(Buffer.from(supportBuffers[index].base64, 'base64'))
           .resize(size, size, { fit: 'cover' })
           .composite([{ input: circleCutout, blend: 'dest-in' }])
           .png()
           .toBuffer();

         composites.push({
           input: circleImage,
           top: cy - radius,
           left: cx - radius,
           blend: 'over'
         });
         
         // Add golden border overlay
         const borderSvg = Buffer.from(
           `<svg width="${size}" height="${size}"><circle cx="${radius}" cy="${radius}" r="${radius}" fill="none" stroke="#FFD700" stroke-width="6"/></svg>`
         );
         composites.push({
           input: borderSvg,
           top: cy - radius,
           left: cx - radius,
           blend: 'over'
         });
       } catch (e) {
         console.warn("Skipping support image render format issue", e);
       }
    }
  }

  // HERO IMAGE
  composites.push({
    input: heroResized,
    top: heroTop,
    left: heroLeft,
    blend: 'over'
  });

  // BOTTOM GRADIENT
  const bottomGradientSvg = `
    <svg width="${O_WIDTH}" height="${O_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="60%" stop-color="#000" stop-opacity="0" />
          <stop offset="100%" stop-color="#000" stop-opacity="0.95" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${O_WIDTH}" height="${O_HEIGHT}" fill="url(#bg)" />
    </svg>
  `;
  composites.push({ input: Buffer.from(bottomGradientSvg), top: 0, left: 0, blend: 'over' });

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
