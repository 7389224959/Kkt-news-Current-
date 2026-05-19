import sharp from 'sharp';
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_PUB_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageUrl, emotionTag, headline, highlightText } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'imageUrl is required' });
    }

    // 1. Download base image (the collage)
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error('Failed to fetch image');
    const imgArrayBuffer = await imgRes.arrayBuffer();
    const imgBuffer = Buffer.from(imgArrayBuffer);

    // 2. Generate text overlay SVG
    // 1080x1080 standard
    const WIDTH = 1080;
    const HEIGHT = 1080;

    // SVG parameters
    // We use a bottom-left aligned layout for text in a typical news style
    const overlaySvg = `
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <!-- Top Breaking / Emotion Tag -->
        ${emotionTag ? `
          <rect x="40" y="40" width="${Math.min(WIDTH - 80, emotionTag.length * 30 + 40)}" height="60" fill="#dc2626" rx="8" />
          <text x="${50 + (emotionTag.length * 15)}" y="82" fill="white" font-family="Arial, sans-serif" font-size="34" font-weight="bold" text-anchor="middle">${emotionTag.toUpperCase()}</text>
        ` : ''}

        <!-- Bottom gradient for headline readability -->
        <defs>
          <linearGradient id="bottomGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#000" stop-opacity="0" />
            <stop offset="100%" stop-color="#000" stop-opacity="0.9" />
          </linearGradient>
        </defs>
        <rect x="0" y="${HEIGHT * 0.5}" width="${WIDTH}" height="${HEIGHT * 0.5}" fill="url(#bottomGrad)" />

        <!-- Headline Box -->
        <text x="40" y="${HEIGHT - 120}" fill="white" font-family="Arial, sans-serif" font-size="55" font-weight="900" width="${WIDTH - 80}">
          ${headline.substring(0, 45)}
        </text>
        ${headline.length > 45 ? `
        <text x="40" y="${HEIGHT - 55}" fill="white" font-family="Arial, sans-serif" font-size="55" font-weight="900" width="${WIDTH - 80}">
          ${headline.substring(45, 90)}${headline.length > 90 ? '...' : ''}
        </text>
        ` : ''}

        <!-- Highlight Text Overlay -->
        ${highlightText ? `
          <rect x="40" y="${HEIGHT - 220}" width="${WIDTH - 80}" height="70" fill="#facc15" opacity="0.9" rx="8" />
          <text x="60" y="${HEIGHT - 170}" fill="#000" font-family="Arial, sans-serif" font-size="40" font-weight="bold">
            ${highlightText.substring(0, 40)}${highlightText.length > 40 ? '...' : ''}
          </text>
        ` : ''}

        <!-- Branding / Website -->
        <rect x="${WIDTH - 180}" y="${HEIGHT - 90}" width="140" height="40" fill="#000" opacity="0.5" rx="8" />
        <text x="${WIDTH - 110}" y="${HEIGHT - 63}" fill="white" font-family="Arial, sans-serif" font-size="18" font-weight="bold" text-anchor="middle">KKT NEWS</text>
      </svg>
    `;

    // 3. Composite text over base image
    const finalBuffer = await sharp(imgBuffer)
      .resize(WIDTH, HEIGHT, { fit: 'cover' })
      .composite([{ input: Buffer.from(overlaySvg), blend: 'over' }])
      .jpeg({ quality: 90 })
      .toBuffer();

    // 4. Upload to Supabase
    if (!supabase) {
      throw new Error("Supabase is not configured. Cannot upload collage.");
    }
    
    const fileName = `viral_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('news-images')
      .upload(fileName, finalBuffer, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (uploadError) {
      console.error("Supabase Upload Error:", uploadError);
      throw uploadError;
    }

    const { data: publicUrlData } = supabase.storage
      .from('news-images')
      .getPublicUrl(fileName);

    const uploadedUrl = publicUrlData.publicUrl;

    return res.status(200).json({ overlaidImageUrl: uploadedUrl });
  } catch (error) {
    console.error('Error generating overlaid image:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate overlaid image' });
  }
}
