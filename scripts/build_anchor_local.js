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

    const s = supa();
    if (s) {
      const cachedFileName = `anchor-${key}.mp4`;
      try {
        const { data: listData } = await s.storage.from('news-images').list('', { search: cachedFileName });
        if (listData && listData.some(f => f.name === cachedFileName)) {
          const { data: publicUrlData } = s.storage.from('news-images').getPublicUrl(cachedFileName);
          if (publicUrlData && publicUrlData.publicUrl) {
            console.log("[anchor local] Cache HIT in Supabase storage:", publicUrlData.publicUrl);
            return publicUrlData.publicUrl;
          }
        }
      } catch(e) {
        console.warn("[anchor local] Cache check error:", e.message);
      }
    }

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
    
    if (s) {
      const fileName = `anchor-${key}.mp4`;
      console.log("[anchor local] Uploading generated MP4 to Supabase storage...");
      
      let uploadBucket = 'news-images';
      let { data: uploadData, error: uploadErr } = await s.storage
        .from('news-images')
        .upload(fileName, mp4Buf, {
          contentType: 'video/mp4',
          upsert: true
        });

      if (uploadErr) {
        console.warn("[anchor local] Upload to 'news-images' failed:", uploadErr.message);
        uploadBucket = 'anchor-videos';
        const res2 = await s.storage
          .from('anchor-videos')
          .upload(fileName, mp4Buf, {
            contentType: 'video/mp4',
            upsert: true
          });
        uploadData = res2.data;
        uploadErr = res2.error;
      }

      if (!uploadErr && uploadData) {
        const { data: publicUrlData } = s.storage
          .from(uploadBucket)
          .getPublicUrl(uploadData.path || fileName);

        if (publicUrlData && publicUrlData.publicUrl) {
          console.log("[anchor local] Upload complete. Public URL:", publicUrlData.publicUrl);
          try {
            fs.rmSync(tmpdir, { recursive: true, force: true });
          } catch(e) {}
          return publicUrlData.publicUrl;
        }
      } else {
        console.error("[anchor local] Supabase upload failed:", uploadErr ? uploadErr.message : "Unknown error");
      }
    }

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
