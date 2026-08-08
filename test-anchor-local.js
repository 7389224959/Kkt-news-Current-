import { buildLocalAndUpload } from "./scripts/build_anchor_local.js";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

async function test() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const s = createClient(url, key);
  const { data } = await s.from('site_settings').select('anchorSettings').limit(1).maybeSingle();
  
  const audioBase64 = "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="; // Empty 8khz wav
  const audioDataUri = "data:audio/wav;base64," + audioBase64;
  
  if (data && data.anchorSettings) {
    console.log("Building...");
    const out = await buildLocalAndUpload(data.anchorSettings.imageUrl, audioDataUri);
    console.log("Output URL:", out);
  }
}
test().catch(console.error);
