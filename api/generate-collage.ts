import { generateNewsCollage } from '../src/utils/imageCollageService';
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

export const maxDuration = 60;

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_PUB_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { heroImageUrl, contextImageUrl, enhancerImageUrl, category, supportImageUrls, isHeroTransparent } = req.body;

    if (!heroImageUrl || !contextImageUrl) {
      return res.status(400).json({ error: 'heroImageUrl and contextImageUrl are required' });
    }

    console.log('Generating Collage...');
    
    // 1. Generate collage buffer
    const collageBuffer = await generateNewsCollage(heroImageUrl, contextImageUrl, enhancerImageUrl, category, supportImageUrls, !!isHeroTransparent);
    
    // 2. Return as base64 string instead of relying on server-side Supabase upload
    // By returning base64, we allow the client (which definitely has Supabase configured) to upload it
    const base64Image = collageBuffer.toString('base64');
    const base64Url = `data:image/jpeg;base64,${base64Image}`;

    return res.status(200).json({ base64: base64Url });
  } catch (error: any) {
    console.error('Error generating collage:', error);
    // Return 200 with error property so frontend catches it and can display it in production
    return res.status(200).json({ error: error.message || 'Failed to generate collage', stack: error.stack });
  }
}
