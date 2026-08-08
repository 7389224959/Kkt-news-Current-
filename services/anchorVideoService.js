import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import ffmpegStatic from "ffmpeg-static";
import { createClient } from "@supabase/supabase-js";
const exec = promisify(execFile);

const HF_TIMEOUT = () => parseInt(process.env.ANCHOR_HF_TIMEOUT_MS || "180000", 10);
const BUCKET     = process.env.ANCHOR_BUCKET || "anchor-videos";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36";

let _supa = undefined;
function supa() {
  if (_supa !== undefined) return _supa;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    console.log("[anchor] Cache disabled (no service role key)");
    _supa = null; 
    return null;
  }
  try {
    _supa = createClient(url, key); 
  } catch (e) {
    _supa = null; 
  }
  return _supa;
}

export async function getAnchorConfig() {
  let config = {
    enabled: process.env.ANCHOR_ENABLED === "true",
    imageUrl: process.env.ANCHOR_IMAGE_URL || "",
    talkingHeadUrl: (process.env.ANCHOR_TALKING_HEAD_URL || "").replace(/\/+$/, ""),
    box: process.env.ANCHOR_BOX || ""
  };
  
  const s = supa();
  if (s) {
    try {
      const { data, error } = await s.from('site_settings').select('anchorSettings').limit(1).maybeSingle();
      if (!error && data && data.anchorSettings) {
        if (data.anchorSettings.enabled !== undefined) config.enabled = data.anchorSettings.enabled;
        if (data.anchorSettings.imageUrl) config.imageUrl = data.anchorSettings.imageUrl;
        if (data.anchorSettings.talkingHeadUrl) config.talkingHeadUrl = data.anchorSettings.talkingHeadUrl.replace(/\/+$/, "");
        if (data.anchorSettings.box !== undefined) config.box = data.anchorSettings.box;
      }
    } catch (e) {
      console.warn("Could not fetch anchor settings from db, using env defaults:", e.message);
    }
  }
  return config;
}

async function cacheGet(key, dest) {
  const s = supa(); if (!s) return false;
  try {
    const { data, error } = await s.storage.from(BUCKET).download(`${key}.mp4`);
    if (error || !data) return false;
    fs.writeFileSync(dest, Buffer.from(await data.arrayBuffer()));
    return true;
  } catch { return false; }
}
async function cachePut(key, buf) {
  const s = supa(); if (!s) return;
  try { await s.storage.from(BUCKET).upload(`${key}.mp4`, buf, { contentType: "video/mp4", upsert: true }); }
  catch (e) { console.warn("[anchor] cache upload skipped:", e.message); }
}
const sha = (b) => crypto.createHash("sha1").update(b).digest("hex");
async function to16kWav(src, dest) {
  await exec(ffmpegStatic, ["-y","-i",src,"-ar","16000","-ac","1","-acodec","pcm_s16le",dest], { timeout: 60000 });
}
async function fetchBytes(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error("fetch " + r.status + " " + url);
  return Buffer.from(await r.arrayBuffer());
}

export async function buildAnchorVideoFromFile({ audioPath, tempDir, config }) {
  if (!config.enabled || !config.talkingHeadUrl || !config.imageUrl || !audioPath) return null;
  try {
    const wav16 = path.join(tempDir, "anchor_voice_16k.wav");
    await to16kWav(audioPath, wav16);
    const imgBuf = await fetchBytes(config.imageUrl);
    const wavBuf = fs.readFileSync(wav16);
    const key = crypto.createHash("md5").update(sha(imgBuf) + "|" + sha(wavBuf)).digest("hex");
    const cached = path.join(tempDir, `anchor_${key}.mp4`);
    if (await cacheGet(key, cached)) { console.log("[anchor] cache HIT", key.slice(0,8)); return cached; }
    
    const form = new FormData();
    form.append("image", new Blob([imgBuf], { type: "image/jpeg" }), "anchor.jpg");
    form.append("audio", new Blob([wavBuf], { type: "audio/wav" }), "voice.wav");
    
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), HF_TIMEOUT());
    let res;
    try { 
      res = await fetch(config.talkingHeadUrl, { method: "POST", body: form, signal: ctrl.signal }); 
    }
    finally { clearTimeout(t); }
    
    if (!res.ok) throw new Error("talking-head HTTP " + res.status);
    const mp4 = Buffer.from(await res.arrayBuffer());
    if (mp4.length < 2048) throw new Error("talking-head empty body");
    
    fs.writeFileSync(cached, mp4);
    cachePut(key, mp4);
    console.log("[anchor] built", key.slice(0,8), (mp4.length/1024|0)+"KB");
    return cached;
  } catch (e) { console.warn("[anchor] build failed:", e?.message || e); return null; }
}

export async function overlayAnchorOnReel({ reelPath, anchorPath, tempDir, delayTime = 0, config }) {
  const out = path.join(tempDir, "anchored_final.mp4");
  const PAD = 4;
  const b = (config.box || "").split(",").map(s => parseInt(s,10)).filter(n => !isNaN(n));
  const haveXY = b.length >= 2;
  const w = b[2] || 210;
  const scale = `[1:v]scale=${w}:-2,pad=iw+${PAD*2}:ih+${PAD*2}:${PAD}:white,setsar=1,fps=24,format=yuv420p,setpts=PTS+${delayTime}/TB[a]`;
  const overlay = haveXY
    ? `[0:v][a]overlay=x=${b[0]}:y=${b[1]}:enable='gte(t,${delayTime})':eof_action=pass[v]`
    : `[0:v][a]overlay=x=W-w-16:y=H-h-16:enable='gte(t,${delayTime})':eof_action=pass[v]`;
  await exec(ffmpegStatic, [
    "-y","-i",reelPath,"-i",anchorPath,
    "-filter_complex", `${scale};${overlay}`,
    "-map","[v]","-map","0:a",
    "-c:v","libx264","-preset","ultrafast","-crf","20","-pix_fmt","yuv420p","-r","24",
    "-c:a","copy","-movflags","+faststart", out,
  ], { timeout: 120000 });
  return out;
}
