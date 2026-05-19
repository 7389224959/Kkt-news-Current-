import { generateNewsCollage } from '../src/utils/imageCollageService.ts';
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

export const maxDuration = 60;

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_PUB_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export default async function handler(req, res) {
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
    
    // 2. Upload to Supabase
    if (!supabase) {
      throw new Error("Supabase is not configured. Cannot upload collage.");
    }
    
    const fileName = `collage_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('news-images')
      .upload(fileName, collageBuffer, {
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

    return res.status(200).json({ collageUrl: uploadedUrl });
  } catch (error) {
    console.error('Error generating collage:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate collage', stack: error.stack });
  }
}
