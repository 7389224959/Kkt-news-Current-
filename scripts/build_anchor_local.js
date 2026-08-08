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
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const sha = (b) => crypto.createHash("sha1").update(b).digest("hex");

async function fetchBytes(url) {
  if (url.startsWith('data:')) {
    const parts = url.split(',');
    if (parts.length > 1) {
      const isBase64 = parts[0].includes('base64');
      return Buffer.from(parts[1], isBase64 ? 'base64' : 'utf8');
    }
  }
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error("fetch " + r.status + " " + url);
  return Buffer.from(await r.arrayBuffer());
}

export async function buildLocalAndUpload(imageUrl, audioUrl) {

  
  try {
    const imgBuf = await fetchBytes(imageUrl);
    const audioBuf = await fetchBytes(audioUrl);
    const key = crypto.createHash("md5").update(sha(imgBuf) + "|" + sha(audioBuf)).digest("hex");
    
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
    try {
      const { stdout, stderr } = await exec("python3", [
        "inference.py", "--checkpoint_path", ckpt,
        "--face", imgPath, "--audio", audPath, "--outfile", outPath,
        "--nosmooth", "--resize_factor", "1"
      ], { cwd: wav2lipDir, timeout: 1800000 });
      console.log("[anchor local] Python stdout:", stdout);
      if (stderr) console.error("[anchor local] Python stderr:", stderr);
    } catch (execErr) {
      console.error("[anchor local] Python exec error:", execErr.message);
      if (execErr.stdout) console.log("[anchor local] Python stdout:", execErr.stdout);
      if (execErr.stderr) console.error("[anchor local] Python stderr:", execErr.stderr);
    }
    
    if (!fs.existsSync(outPath)) {
      console.error("[anchor local] Failed to generate out.mp4");
      return null;
    }
    
    const mp4Buf = fs.readFileSync(outPath);
    const dataUri = 'data:video/mp4;base64,' + mp4Buf.toString('base64');
    
    try {
      fs.rmSync(tmpdir, { recursive: true, force: true });
    } catch(e) {}
    
    console.log("[anchor local] Build complete. Returning base64 length:", dataUri.length);
    return dataUri;
    
  } catch (err) {
    console.error("[anchor local] Error:", err);
    return null;
  }
}
