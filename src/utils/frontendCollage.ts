export async function createCollageOnFrontend(
  heroImageUrl: string | null | undefined,
  contextImageUrl: string,
  host: string
): Promise<string> {
  // We use Canvas to composite images!
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

  // Load Context
  console.log("Loading context image for canvas...");
  const contextImg = await loadImageSafe(contextImageUrl);
  
  // Fill background
  ctx.drawImage(contextImg, 0, 0, 1200, 630);
  
  // Darken context slightly
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fillRect(0, 0, 1200, 630);

  // Load Hero
  let heroImg: HTMLImageElement | null = null;
  if (heroImageUrl) {
      try {
          console.log("Loading hero image for canvas...");
          heroImg = await loadImageSafe(heroImageUrl);
      } catch (e) {
          console.warn("Hero image failed to load, skipping", e);
      }
  }

  // Draw Hero
  if (heroImg) {
      const heroWidth = 1200 * 0.7; // 70%
      ctx.drawImage(heroImg, 1200 - heroWidth, 0, heroWidth, 630);
  }

  // Draw Overlay Gradients
  // Bottom Gradient
  const gradientBottom = ctx.createLinearGradient(0, 0, 0, 630);
  gradientBottom.addColorStop(0, 'rgba(0,0,0,0)');
  gradientBottom.addColorStop(0.4, 'rgba(0,0,0,0)');
  gradientBottom.addColorStop(0.7, 'rgba(0,0,0,0.8)');
  gradientBottom.addColorStop(1, 'rgba(0,0,0,0.95)');
  ctx.fillStyle = gradientBottom;
  ctx.fillRect(0, 0, 1200, 630);

  // Left Shadow
  const gradientLeft = ctx.createLinearGradient(0, 0, 1200, 0);
  gradientLeft.addColorStop(0, 'rgba(0,0,0,0.7)');
  gradientLeft.addColorStop(0.3, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradientLeft;
  ctx.fillRect(0, 0, 1200, 630);

  // Export to Base64
  return canvas.toDataURL('image/jpeg', 0.85);
}
