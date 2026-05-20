export async function createCollageOnFrontend(
  heroImageUrl: string | null | undefined,
  contextImageUrl: string | null | undefined,
  host: string
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Could not get canvas context");

  // Helper to load image via proxy to avoid CORS
  const loadImageSafe = async (url: string): Promise<HTMLImageElement> => {
    return new Promise(async (resolve, reject) => {
      try {
        let finalUrl = url;
        if (!url.startsWith('data:') && !url.includes('supabase.co')) {
           // Proxy it
           const res = await fetch(`${host}/api/proxy-image?url=${encodeURIComponent(url)}`);
           if (!res.ok) throw new Error("Proxy failed");
           const data = await res.json();
           finalUrl = `data:${data.contentType};base64,${data.base64}`;
        }
        
        const img = new Image();
        img.crossOrigin = 'anonymous'; // Just in case
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image: ${url.substring(0,30)}`));
        img.src = finalUrl;
      } catch (err) {
        reject(err);
      }
    });
  };

  // NEW IMAGE STRATEGY: Use the SAME original news image for both Background and Foreground focus image.
  const imageUrlToUse = heroImageUrl || contextImageUrl;
  if (!imageUrlToUse) {
    throw new Error('No image provided for collage generation');
  }

  console.log("Loading original news image for premium canvas rendering...");
  const img = await loadImageSafe(imageUrlToUse);

  // STEP 1 — BACKGROUND
  // Cover entire 1200x630 canvas with subtle blur
  const scale = Math.max(1200 / img.width, 630 / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  const x = (1200 - w) / 2;
  const y = (630 - h) / 2;

  ctx.filter = 'blur(6px)'; // subtle blur, lightweight rendering
  ctx.drawImage(img, x, y, w, h);
  ctx.filter = 'none'; // reset filter

  // Darken background slightly
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(0, 0, 1200, 630);

  // STEP 2 — FOREGROUND IMAGE
  // Clean sharp image card on right or center-right
  const cardScale = Math.min(800 / img.width, 560 / img.height);
  const cardW = img.width * cardScale;
  const cardH = img.height * cardScale;
  const cardX = 1200 - cardW - 40; // right-aligned with padding
  const cardY = (630 - cardH) / 2;

  const cornerRadius = 24;

  // Add soft shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 15;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(cardX, cardY, cardW, cardH, cornerRadius);
  } else {
    // fallback if roundRect is missing in some older environments
    ctx.rect(cardX, cardY, cardW, cardH);
  }
  ctx.fill();
  ctx.restore();

  // Draw sharp image inside clipped area
  ctx.save();
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(cardX, cardY, cardW, cardH, cornerRadius);
  } else {
    ctx.rect(cardX, cardY, cardW, cardH);
  }
  ctx.clip();
  ctx.drawImage(img, cardX, cardY, cardW, cardH);
  ctx.restore();

  // Subtle border
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(cardX, cardY, cardW, cardH, cornerRadius);
  } else {
    ctx.rect(cardX, cardY, cardW, cardH);
  }
  ctx.stroke();
  ctx.restore();

  // STEP 3 — PREMIUM OVERLAY
  // Add soft black gradient for text readability
  // Bottom gradient
  const gradientBottom = ctx.createLinearGradient(0, 0, 0, 630);
  gradientBottom.addColorStop(0, 'rgba(0,0,0,0)');
  gradientBottom.addColorStop(0.5, 'rgba(0,0,0,0.05)');
  gradientBottom.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = gradientBottom;
  ctx.fillRect(0, 0, 1200, 630);

  // Left gradient
  const gradientLeft = ctx.createLinearGradient(0, 0, 800, 0);
  gradientLeft.addColorStop(0, 'rgba(0,0,0,0.7)');
  gradientLeft.addColorStop(0.5, 'rgba(0,0,0,0.2)');
  gradientLeft.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradientLeft;
  ctx.fillRect(0, 0, 1200, 630);

  return canvas.toDataURL('image/jpeg', 0.90);
}
