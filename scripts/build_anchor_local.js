import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { createClient } from "@supabase/supabase-js";

const exec = promisify(execFile);

const BUCKET = process.env.ANCHOR_BUCKET || "anchor-videos";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36";

function supa() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const sha = (b) => crypto.createHash("sha1").update(b).digest("hex");

async function fetchBytes(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error("fetch " + r.status + " " + url);
  return Buffer.from(await r.arrayBuffer());
}

export async function buildLocalAndUpload(imageUrl, audioUrl) {
  const s = supa();
  if (!s) {
    console.log("[anchor local] Supabase client not configured.");
    return null;
  }
  
  try {
    const imgBuf = await fetchBytes(imageUrl);
    const audioBuf = await fetchBytes(audioUrl);
    const key = crypto.createHash("md5").update(sha(imgBuf) + "|" + sha(audioBuf)).digest("hex");
    
    // Check if already in cache
    const { data: cacheData, error: cacheErr } = await s.storage.from(BUCKET).download(`${key}.mp4`);
    if (!cacheErr && cacheData) {
      console.log("[anchor local] Cache HIT for key:", key);
      const { data: publicData } = s.storage.from(BUCKET).getPublicUrl(`${key}.mp4`);
      return publicData.publicUrl;
    }
    
    console.log("[anchor local] Building locally for key:", key);
    const tmpdir = fs.mkdtempSync(path.join("/tmp", "wav2lip-"));
    const imgPath = path.join(tmpdir, "img.jpg");
    const audPath = path.join(tmpdir, "aud.wav");
    const outPath = path.join(tmpdir, "out.mp4");
    
    fs.writeFileSync(imgPath, imgBuf);
    fs.writeFileSync(audPath, audioBuf);
    
    // Run Wav2Lip
    const wav2lipDir = path.resolve("Wav2Lip");
    const ckpt = path.join(wav2lipDir, "checkpoints", "wav2lip_gan.pth");
    
    if (!fs.existsSync(ckpt)) {
      console.error("[anchor local] Missing checkpoint at", ckpt);
      return null;
    }
    
    console.log("[anchor local] Running python inference...");
    await exec("python3", [
      "inference.py", "--checkpoint_path", ckpt,
      "--face", imgPath, "--audio", audPath, "--outfile", outPath,
      "--nosmooth", "--resize_factor", "1"
    ], { cwd: wav2lipDir, timeout: 600000 });
    
    if (!fs.existsSync(outPath)) {
      console.error("[anchor local] Failed to generate out.mp4");
      return null;
    }
    
    // Upload to Supabase
    const mp4Buf = fs.readFileSync(outPath);
    await s.storage.from(BUCKET).upload(`${key}.mp4`, mp4Buf, { contentType: "video/mp4", upsert: true });
    
    fs.rmSync(tmpdir, { recursive: true, force: true });
    
    const { data: publicData } = s.storage.from(BUCKET).getPublicUrl(`${key}.mp4`);
    console.log("[anchor local] Build complete. URL:", publicData.publicUrl);
    return publicData.publicUrl;
    
  } catch (err) {
    console.error("[anchor local] Error:", err);
    return null;
  }
}
