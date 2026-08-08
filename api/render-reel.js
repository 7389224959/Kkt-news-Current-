export const maxDuration = 300;
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import os from "os";
import { embeddedFonts, getFontFaceDefs, fontStack as defaultFontStack } from "./embeddedFonts.js";

const getFfmpegPath = () => {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }
  if (fs.existsSync("/usr/bin/ffmpeg")) {
    return "/usr/bin/ffmpeg";
  }
  if (fs.existsSync("/usr/local/bin/ffmpeg")) {
    return "/usr/local/bin/ffmpeg";
  }
  return typeof ffmpegStatic === "string" ? ffmpegStatic : (ffmpegStatic?.default || ffmpegStatic);
};

ffmpeg.setFfmpegPath(getFfmpegPath());
const ffprobePath = ffprobeStatic?.path || ffprobeStatic?.default?.path || ffprobeStatic;
if (ffprobePath) {
  ffmpeg.setFfprobePath(ffprobePath);
}

function escapeXml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapTextIntoLines(text, width, fontSize) {
  const maxCharsPerLine = Math.max(1, Math.floor(width / (fontSize * 0.6)));
  const words = String(text || "").trim().split(/\s+/);
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    if (!currentLine) {
      currentLine = word;
    } else if ((currentLine + " " + word).length <= maxCharsPerLine) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

let fontBase64Cache = {};
let fontsInstalled = false;

async function ensureFontsLoaded() {
  if (fontsInstalled) return;

  const localFontsDir = path.join(process.cwd(), "public", "fonts");
  const tmpFontsDir = path.join(os.tmpdir(), ".fonts");

  try {
    if (!fs.existsSync(tmpFontsDir)) {
      fs.mkdirSync(tmpFontsDir, { recursive: true });
    }
  } catch (e) {
    console.warn("[font] Could not create tmp fonts directory:", e.message);
  }

  const fontsToDownload = [
    { key: "mukta", name: "Mukta-ExtraBold.ttf", url: "https://raw.githubusercontent.com/google/fonts/main/ofl/mukta/Mukta-ExtraBold.ttf" },
    { key: "hind", name: "Hind-Bold.ttf", url: "https://raw.githubusercontent.com/google/fonts/main/ofl/hind/Hind-Bold.ttf" },
    { key: "noto", name: "NotoSansDevanagari.ttf", url: "https://raw.githubusercontent.com/google/fonts/main/ofl/notosansdevanagari/NotoSansDevanagari%5Bwdth%2Cwght%5D.ttf" },
    { key: "poppins", name: "Poppins-ExtraBold.ttf", url: "https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-ExtraBold.ttf" }
  ];

  for (const f of fontsToDownload) {
    let buf = null;
    const localPath = path.join(localFontsDir, f.name);
    const tmpPath = path.join(tmpFontsDir, f.name);

    if (fs.existsSync(localPath)) {
      try {
        const stats = fs.statSync(localPath);
        if (stats.size > 1000) {
          buf = fs.readFileSync(localPath);
        }
      } catch (e) {}
    }

    if (!buf && fs.existsSync(tmpPath)) {
      try {
        const stats = fs.statSync(tmpPath);
        if (stats.size > 1000) {
          buf = fs.readFileSync(tmpPath);
        }
      } catch (e) {}
    }

    if (!buf) {
      try {
        console.log(`[font] Downloading ${f.name}...`);
        const res = await fetch(f.url);
        if (res.ok) {
          buf = Buffer.from(await res.arrayBuffer());
          try {
            fs.writeFileSync(tmpPath, buf);
          } catch (e) {
            console.warn(`[font] Warning writing ${f.name} to disk:`, e.message);
          }
        }
      } catch (e) {
        console.warn(`[font] Error downloading ${f.name}:`, e.message);
      }
    }

    if (buf && buf.length > 1000) {
      fontBase64Cache[f.key] = buf.toString("base64");
    }
  }

  try {
    const { execSync } = await import("child_process");
    execSync(`fc-cache -f "${tmpFontsDir}"`);
  } catch (e) {}

  fontsInstalled = true;
}

async function renderTextToPng({
  text,
  width,
  height,
  fontSize,
  fontColor = "yellow",
  strokeColor = "black",
  strokeWidth = 6,
  align = "center",
  bgColor = null,
  outputPath,
}) {
  const fontFaceDefs = getFontFaceDefs();
  const fontStack = defaultFontStack;

  const lines = wrapTextIntoLines(text, width, fontSize);
  const lineHeight = fontSize * 1.25;
  const totalTextHeight = lines.length * lineHeight;
  const startY = Math.max(
    fontSize,
    (height - totalTextHeight) / 2 + fontSize * 0.85,
  );

  const xPos = align === "center" ? "50%" : "10";
  const anchor = align === "center" ? "middle" : "start";

  const tspans = lines
    .map((line, idx) => {
      const y = startY + idx * lineHeight;
      return `<tspan x="${xPos}" y="${y}" text-anchor="${anchor}">${escapeXml(line)}</tspan>`;
    })
    .join("\n");

  const bgRect = bgColor
    ? `<rect width="100%" height="100%" fill="${bgColor}" rx="8"/>`
    : "";

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <style>
      ${fontFaceDefs}
      .txt {
        font-family: ${fontStack};
        font-weight: 800;
        font-size: ${fontSize}px;
        fill: ${fontColor};
        stroke: ${strokeColor};
        stroke-width: ${strokeWidth}px;
        paint-order: stroke fill;
        stroke-linejoin: round;
        filter: drop-shadow(0px 3px 6px rgba(0,0,0,0.85));
      }
    </style>
    ${bgRect}
    <text class="txt">${tspans}</text>
  </svg>`;

  await sharp(Buffer.from(svg)).png().toFile(outputPath);
}

const downloadFile = async (url, dest) => {
  if (!url) throw new Error("URL is missing");

  if (url.startsWith("data:")) {
    const matches = url.match(
      /^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+)?(?:;charset=[a-zA-Z0-9-]+)?(;base64)?,(.*)$/,
    );
    if (!matches) throw new Error("Invalid data URI");
    const isBase64 = matches[2] === ";base64";
    const dataString = matches[3];
    const buffer = Buffer.from(
      isBase64 ? dataString : decodeURIComponent(dataString),
      isBase64 ? "base64" : "utf8",
    );
    fs.writeFileSync(dest, buffer);
    return;
  }

  if (url.startsWith("/")) {
    url = `http://localhost:${process.env.PORT || 3000}${url}`;
  }

  // Unwrap duckduckgo proxy URLs if they exist in state
  if (url.startsWith("https://external-content.duckduckgo.com/iu/?u=")) {
    try {
      const parsedUrl = new URL(url);
      const uParam = parsedUrl.searchParams.get("u");
      if (uParam) {
        url = uParam;
      }
    } catch(e) {
      // ignore parse error
    }
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    if (!response.ok) {
      console.warn(`Failed to fetch ${url}: ${response.statusText}, using fallback image`);
      const base64BlackPixel = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
      fs.writeFileSync(dest, Buffer.from(base64BlackPixel, 'base64'));
      return;
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(dest, buffer);
  } catch (error) {
    console.warn(`Error fetching ${url}: ${error.message}, using fallback image`);
    const base64BlackPixel = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
    fs.writeFileSync(dest, Buffer.from(base64BlackPixel, 'base64'));
  }
};

const generateWavFile = (destPath, durationSec, sampleFn = null, sampleRate = 44100) => {
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const numSamples = Math.floor(durationSec * sampleRate);
  const dataSize = numSamples * blockAlign;
  const chunkSize = 36 + dataSize;

  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(chunkSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  const data = Buffer.alloc(dataSize);
  if (sampleFn) {
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const val = sampleFn(t, i);
      const sample = Math.max(-1, Math.min(1, val)) * 32767;
      data.writeInt16LE(Math.round(sample), i * 2);
    }
  }
  fs.writeFileSync(destPath, Buffer.concat([header, data]));
};

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const {
      audioUrl,
      templateMediaUrl,
      scriptData,
      template,
      styleOverrides = {},
      directorScenes = [],
    } = req.body;
    if (!templateMediaUrl || !template)
      return res.status(400).json({ error: "Missing required parameters." });

    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "reel-"));
    console.log("Working in temp directory:", tempDir);

    const backgroundPath = path.join(tempDir, "background.mp4");
    const fontPath = path.join(tempDir, "font.ttf");
    const middlePath = path.join(tempDir, "middle.mp4");

    const introMediaUrl = template.introMediaUrl;
    const outroMediaUrl = template.outroMediaUrl;
    const bgmUrl = template.bgmUrl;

    let introPath = null;
    let outroPath = null;
    let bgmPath = null;

    if (introMediaUrl) {
      introPath = path.join(tempDir, "intro.mp4");
      await downloadFile(introMediaUrl, introPath);
    }
    if (outroMediaUrl) {
      outroPath = path.join(tempDir, "outro.mp4");
      await downloadFile(outroMediaUrl, outroPath);
    }
    if (bgmUrl) {
      bgmPath = path.join(tempDir, "bgm.mp3");
      await downloadFile(bgmUrl, bgmPath);
    }

    const { overlayMediaUrl, visuals = [] } = req.body;
    let downloadedVisuals = [];
    for (let i = 0; i < visuals.length; i++) {
      const extMatch = visuals[i].match(/\.(mp4|mov|webm|gif|webp)$/i);
      const ext = extMatch ? extMatch[0] : '';
      const rawP = path.join(tempDir, `visual_raw_${i}`);
      await downloadFile(visuals[i], rawP);

      const isVideo = await new Promise((resolve) => {
        ffmpeg.ffprobe(rawP, (err, meta) => {
          if (err || !meta || !meta.streams) return resolve(false);
          const vStream = meta.streams.find(s => s.codec_type === 'video');
          if (!vStream) return resolve(false);
          // treat gif and webp as potentially animated (video)
          if (vStream.codec_name && ['mjpeg', 'png'].includes(vStream.codec_name)) return resolve(false);
          if (vStream.codec_name && ['webp'].includes(vStream.codec_name) && vStream.nb_frames && parseInt(vStream.nb_frames) === 1) return resolve(false);
          if (vStream.nb_frames && parseInt(vStream.nb_frames) === 1 && vStream.codec_name !== 'gif') return resolve(false);
          resolve(true);
        });
      });

      const finalExt = isVideo ? (ext || '.mp4') : (ext || '.jpg');
      const finalP = path.join(tempDir, `visual_${i}${finalExt}`);
      fs.renameSync(rawP, finalP);

      downloadedVisuals.push({ file: finalP, url: visuals[i], isVideo });
    }
    if (downloadedVisuals.length === 0 && overlayMediaUrl) {
      const p = path.join(tempDir, "overlay.mp4");
      await downloadFile(overlayMediaUrl, p);
      downloadedVisuals.push({ file: p, url: overlayMediaUrl, isVideo: true });
    }

    // Move first video/gif to the beginning
    const firstVideoIndex = downloadedVisuals.findIndex(v => v.isVideo);
    if (firstVideoIndex > 0) {
      const firstVideo = downloadedVisuals.splice(firstVideoIndex, 1)[0];
      downloadedVisuals.unshift(firstVideo);
    }

    // Ensure 5-6 scenes if not enough by repeating
    if (downloadedVisuals.length > 0 && downloadedVisuals.length < 5) {
      const original = [...downloadedVisuals];
      while (downloadedVisuals.length < 5) {
        downloadedVisuals.push(
          original[downloadedVisuals.length % original.length],
        );
      }
    }

    let audioPath = null;
    if (audioUrl) {
      audioPath = path.join(tempDir, "audio.wav");
      await downloadFile(audioUrl, audioPath);
    }
    await downloadFile(templateMediaUrl, backgroundPath);
    try {
      if (fs.existsSync(path.join(process.cwd(), "public", "fonts", "Hind-Bold.ttf"))) {
        fs.copyFileSync(path.join(process.cwd(), "public", "fonts", "Hind-Bold.ttf"), fontPath);
      } else if (embeddedFonts && embeddedFonts.hind) {
        fs.writeFileSync(fontPath, Buffer.from(embeddedFonts.hind, "base64"));
      } else {
        await downloadFile(
          "https://raw.githubusercontent.com/google/fonts/main/ofl/hind/Hind-Bold.ttf",
          fontPath,
        );
      }
    } catch (e) {
      console.warn("Could not copy fontPath:", e.message);
    }

    // Scale factor for 720p
    const targetW = 720;
    const targetH = 1280;
    const scaleFactor = targetW / 1080;
    const parseAndScaleCoords = (cStr) =>
      cStr.split(",").map((n) => Math.round(Number(n) * scaleFactor / 2) * 2);

    const vBox =
      template.coordinates.video_box && template.coordinates.video_box !== "hidden"
        ? parseAndScaleCoords(template.coordinates.video_box)
        : null;
    const hBox =
      template.coordinates.headline_box && template.coordinates.headline_box !== "hidden"
        ? parseAndScaleCoords(template.coordinates.headline_box)
        : null;
    const sBox =
      template.coordinates.subtitle_box &&
      template.coordinates.subtitle_box !== "hidden"
        ? parseAndScaleCoords(template.coordinates.subtitle_box)
        : null;
    const tBox =
      template.coordinates.ticker_box && template.coordinates.ticker_box !== "hidden"
        ? parseAndScaleCoords(template.coordinates.ticker_box)
        : null;

    const wrapText = (text, maxWidth, fontSize) => {
      const charWidth = fontSize * 0.45;
      const maxChars = Math.max(10, Math.floor(maxWidth / charWidth));
      const words = String(text).split(" ");
      let lines = [];
      let currentLine = "";
      for (const word of words) {
        if (
          currentLine.length + word.length + 1 > maxChars &&
          currentLine.length > 0
        ) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine += (currentLine ? " " : "") + word;
        }
      }
      if (currentLine) lines.push(currentLine);
      return lines.join("\n");
    };

    const preset = scriptData.stylePreset || "";
    const isImage = !templateMediaUrl.match(/\.(mp4|mov|webm)$/i);

    const filterGraph = [];

    if (isImage) {
      filterGraph.push(
        {
          filter: "scale",
          options: `w=${targetW}:h=${targetH}:force_original_aspect_ratio=increase`,
          inputs: "0:v",
          outputs: "bg_scaled_raw",
        },
        {
          filter: "crop",
          options: `w=${targetW}:h=${targetH}`,
          inputs: "bg_scaled_raw",
          outputs: "bg_cropped_raw",
        },
        {
          filter: "boxblur",
          options: "luma_radius=15:luma_power=1",
          inputs: "bg_cropped_raw",
          outputs: "bg_blurred",
        },
        {
          filter: "scale",
          options: `w=${targetW}:h=${targetH}:force_original_aspect_ratio=decrease`,
          inputs: "0:v",
          outputs: "fg_scaled",
        },
        {
          filter: "overlay",
          options: "(W-w)/2:(H-h)/2",
          inputs: ["bg_blurred", "fg_scaled"],
          outputs: "bg_composed",
        },
        { filter: "null", inputs: "bg_composed", outputs: "bg_cropped" },
      );
    } else {
      filterGraph.push(
        {
          filter: "scale",
          options: `w=${targetW}:h=${targetH}:force_original_aspect_ratio=increase`,
          inputs: "0:v",
          outputs: "bg_scaled",
        },
        {
          filter: "crop",
          options: `w=${targetW}:h=${targetH}`,
          inputs: "bg_scaled",
          outputs: "bg_cropped",
        },
      );
    }


    let currentOutput = "bg_cropped";
    let nextInputIndex = 1;

    const delayTime = template.isIntroCombined ? (Number(template.introDuration) || 0) : 0;

    // Prepare text content for words counting
    let rawLines =
      Array.isArray(scriptData.subtitleChunks) &&
      scriptData.subtitleChunks.length > 0
        ? scriptData.subtitleChunks
        : Array.isArray(scriptData.subtitles) && scriptData.subtitles.length > 0
          ? scriptData.subtitles
          : null;
    if (!rawLines && scriptData.voiceoverScript) {
      rawLines = String(scriptData.voiceoverScript)
        .split(/[,.।!?]+/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
    const subtitleLines = rawLines || ["Subtitle missing"];
    // Accurately count words to ensure timing sums exactly to 1.0
    const totalWords = Math.max(
      1,
      subtitleLines.reduce(
        (acc, sub) =>
          acc + String(sub).trim().split(/\s+/).filter(Boolean).length,
        0,
      ),
    );
    const voiceoverWords = scriptData.voiceoverScript
      ? String(scriptData.voiceoverScript).trim().split(/\s+/).filter(Boolean)
          .length
      : totalWords;
    let exactAudioDuration = Math.max(10, voiceoverWords / 2.0);

    if (audioPath) {
      try {
        const metadata = await new Promise((resolve, reject) =>
          ffmpeg.ffprobe(audioPath, (err, meta) =>
            err ? reject(err) : resolve(meta),
          ),
        );
        if (metadata && metadata.format && metadata.format.duration) {
          exactAudioDuration = parseFloat(metadata.format.duration);
          console.log("Probed exact audio duration:", exactAudioDuration);
        }
      } catch (e) {
        console.warn("Failed to probe audio", e);
      }
    }

    let overlayInputs = [];
    if (downloadedVisuals.length > 0 && vBox) {
      const sceneDur = exactAudioDuration / downloadedVisuals.length;
      const totalFrames = sceneDur * 25; // roughly the frames per scene

      const motions = [
        `z=1+0.2*(on/${totalFrames})`, // zoom_in continuously
        `z=1.2-0.2*(on/${totalFrames})`, // zoom_out continuously
        `z=1.1:x=iw*0.05*(1-on/${totalFrames}):y=y`, // pan_left
        `z=1.1:x=iw*0.05*(on/${totalFrames}):y=y`, // pan_right
        `z=1.1+0.1*(on/${totalFrames}):x=iw*0.05*(on/${totalFrames}):y=ih*0.05*(on/${totalFrames})`, // ken_burns
      ];

      const transitions = [
        "fade",
        "slideleft",
        "slideright",
        "fadeblack",
        "dissolve",
      ];

      for (let i = 0; i < downloadedVisuals.length; i++) {
        const item = downloadedVisuals[i];
        const idx = nextInputIndex++;
        const isImgInfo = !item.isVideo;

        filterGraph.push({
          filter: "scale",
          options: `w=${vBox[2]}:h=${vBox[3]}:force_original_aspect_ratio=increase`,
          inputs: `${idx}:v`,
          outputs: `vis_scaled_raw_${i}`,
        });
        filterGraph.push({
          filter: "setsar",
          options: "1",
          inputs: `vis_scaled_raw_${i}`,
          outputs: `vis_scaled_${i}`,
        });
        filterGraph.push({
          filter: "crop",
          options: `w=${vBox[2]}:h=${vBox[3]}`,
          inputs: `vis_scaled_${i}`,
          outputs: `vis_cropped_${i}`,
        });

        if (isImgInfo) {
          let motion = motions[i % motions.length];
          if (directorScenes && directorScenes[i] && directorScenes[i].motion) {
             const dm = directorScenes[i].motion;
             if (dm === 'slow_zoom_in' || dm === 'push_in') motion = motions[0];
             else if (dm === 'slow_zoom_out' || dm === 'push_out') motion = motions[1];
             else if (dm === 'pan_left') motion = motions[2];
             else if (dm === 'pan_right') motion = motions[3];
             else if (dm === 'parallax' || dm === 'spotlight_focus') motion = motions[4];
          }
          filterGraph.push({
            filter: "zoompan",
            options: `${motion}:d=${Math.ceil(sceneDur * 25) + 50}:s=${vBox[2]}x${vBox[3]}:fps=25`,
            inputs: `vis_cropped_${i}`,
            outputs: `vis_motion_${i}`,
          });
          filterGraph.push({
            filter: "trim",
            options: `duration=${sceneDur + 1.0}`,
            inputs: `vis_motion_${i}`,
            outputs: `vis_trimmed_${i}`,
          });
        } else {
          filterGraph.push({
            filter: "setpts",
            options: "PTS-STARTPTS",
            inputs: `vis_cropped_${i}`,
            outputs: `vis_ptsed_${i}`,
          });
          filterGraph.push({
            filter: "fps",
            options: "25",
            inputs: `vis_ptsed_${i}`,
            outputs: `vis_fps_${i}`,
          });
          filterGraph.push({
            filter: "trim",
            options: `duration=${sceneDur + 1.0}`,
            inputs: `vis_fps_${i}`,
            outputs: `vis_trimmed_${i}`,
          });
        }

        filterGraph.push({
          filter: "format",
          options: "yuv420p",
          inputs: `vis_trimmed_${i}`,
          outputs: `vis_formatted_${i}`,
        });

        filterGraph.push({
          filter: "setpts",
          options: "PTS-STARTPTS",
          inputs: `vis_formatted_${i}`,
          outputs: `vis_ptsed2_${i}`,
        });

        filterGraph.push({
          filter: "fps",
          options: "25",
          inputs: `vis_ptsed2_${i}`,
          outputs: `vis_ready_${i}`,
        });
      }

      // xfade them together
      let currentVis = `vis_ready_0`;
      for (let i = 1; i < downloadedVisuals.length; i++) {
        let trans = transitions[i % transitions.length];
        if (directorScenes && directorScenes[i] && directorScenes[i].transition) {
            const dt = directorScenes[i].transition;
            if (dt === 'slideleft' || dt === 'slideright' || dt === 'fadeblack' || dt === 'dissolve') {
                trans = dt;
            } else if (dt === 'flash_transition') {
                trans = 'fadeblack';
            }
        }
        const offset = i * sceneDur;
        filterGraph.push({
          filter: "xfade",
          options: `transition=${trans}:duration=0.5:offset=${offset}`,
          inputs: [currentVis, `vis_ready_${i}`],
          outputs: `xfade_${i}`,
        });
        currentVis = `xfade_${i}`;
      }

      filterGraph.push({
        filter: "overlay",
        options: `x=${vBox[0]}:y=${vBox[1]}:enable='gte(t,${delayTime})'`,
        inputs: [currentOutput, currentVis],
        outputs: "with_overlay",
      });
      currentOutput = "with_overlay";
    }

    const overlayPngs = [];

    if (scriptData.headline && hBox) {
      const fontSize = Math.round(
        (Number(styleOverrides.headlineSize) || 80) * scaleFactor,
      );
      const headlinePngPath = path.join(tempDir, "headline.png");
      await renderTextToPng({
        text: scriptData.headline,
        width: hBox[2],
        height: hBox[3],
        fontSize,
        fontColor: styleOverrides.headlineColor || "yellow",
        strokeColor: "black",
        strokeWidth: 4,
        align: "center",
        outputPath: headlinePngPath,
      });

      const headlineIdx = nextInputIndex++;
      overlayPngs.push(headlinePngPath);

      filterGraph.push({
        filter: "overlay",
        options: `x=${hBox[0]}:y=${hBox[1]}:enable='gte(t,${delayTime})'`,
        inputs: [currentOutput, `${headlineIdx}:v`],
        outputs: "with_headline",
      });
      currentOutput = "with_headline";
    }

    if (scriptData.ticker && tBox) {
      const fontSize = Math.round(
        (Number(styleOverrides.tickerSize) || 50) * scaleFactor,
      );
      const speed = Math.round(
        (template.style_rules.ticker_speed || 150) * scaleFactor,
      );
      const tickerText = String(scriptData.ticker);
      const tickerWidth = Math.max(tBox[2], Math.ceil(tickerText.length * fontSize * 0.75 + tBox[2]));
      const tickerPngPath = path.join(tempDir, "ticker.png");

      await renderTextToPng({
        text: tickerText,
        width: tickerWidth,
        height: tBox[3],
        fontSize,
        fontColor: styleOverrides.tickerColor || "white",
        strokeColor: "black",
        strokeWidth: 3,
        align: "left",
        outputPath: tickerPngPath,
      });

      // Draw static background box for ticker
      filterGraph.push({
        filter: "drawbox",
        options: {
          x: tBox[0],
          y: tBox[1],
          w: tBox[2],
          h: tBox[3],
          color: styleOverrides.tickerBg || "red@0.8",
          t: "fill",
          enable: `gte(t,${delayTime})`,
        },
        inputs: currentOutput,
        outputs: "with_ticker_bg",
      });
      currentOutput = "with_ticker_bg";

      const tickerIdx = nextInputIndex++;
      overlayPngs.push(tickerPngPath);

      filterGraph.push({
        filter: "overlay",
        options: `x=${tBox[0]}+${tBox[2]}-(t*${speed}):y=${tBox[1]}+(${tBox[3]}-h)/2:enable='gte(t,${delayTime})'`,
        inputs: [currentOutput, `${tickerIdx}:v`],
        outputs: "with_ticker",
      });
      currentOutput = "with_ticker";
    }

    if ((scriptData.subtitles || scriptData.subtitleChunks) && sBox) {
      const fontSize = Math.round(
        (Number(styleOverrides.subtitleSize) || 65) * scaleFactor,
      );

      let currentTime = 0;

      for (let index = 0; index < subtitleLines.length; index++) {
        const sub = subtitleLines[index];
        const nextOutput = `sub_${index}`;
        const subPngPath = path.join(tempDir, `sub_${index}.png`);

        await renderTextToPng({
          text: sub,
          width: sBox[2],
          height: sBox[3],
          fontSize,
          fontColor: styleOverrides.subtitleColor || "white",
          strokeColor: "black",
          strokeWidth: 4,
          align: "center",
          outputPath: subPngPath,
        });

        const words = String(sub).trim().split(/\s+/).filter(Boolean).length;
        let duration = (words / totalWords) * exactAudioDuration;

        const startT = currentTime + delayTime;
        const endT = currentTime + duration + delayTime;
        currentTime += duration;

        const subIdx = nextInputIndex++;
        overlayPngs.push(subPngPath);

        filterGraph.push({
          filter: "overlay",
          options: `x=${sBox[0]}:y=${sBox[1]}:enable='between(t,${startT.toFixed(2)},${endT.toFixed(2)})'`,
          inputs: [currentOutput, `${subIdx}:v`],
          outputs: nextOutput,
        });
        currentOutput = nextOutput;
      }
    }

    console.log(
      "Starting FFmpeg with comprehensive layout and subtitle pass...",
    );

    await new Promise((resolve, reject) => {
      let command = ffmpeg();

      command = command
        .input(backgroundPath)
        .inputOptions(["-stream_loop", "-1", "-an"]);

      if (downloadedVisuals.length > 0 && vBox) {
        for (let i = 0; i < downloadedVisuals.length; i++) {
          const item = downloadedVisuals[i];
          let inputOpts = ["-stream_loop", "-1", "-an"];
          command = command
              .input(item.file)
              .inputOptions(inputOpts);
        }
      }

      for (const p of overlayPngs) {
        command = command.input(p).inputOptions(["-stream_loop", "-1"]);
      }

      let audioIndex = -1;
      let bgmIndex = -1;
      let sfxIndex = -1;

      if (audioPath) {
        audioIndex = nextInputIndex++;
        command = command.input(audioPath);
      }

      const sceneDur =
        downloadedVisuals.length > 0
          ? exactAudioDuration / downloadedVisuals.length
          : 5;

      let durationLimit = (audioPath ? exactAudioDuration : 15) + delayTime;

      // Custom BGM or Drone BGM
      bgmIndex = nextInputIndex++;
      if (bgmPath) {
        command = command.input(bgmPath).inputOptions(["-stream_loop", "-1"]);
      } else {
        const defaultBgmPath = path.join(tempDir, "default_bgm.wav");
        generateWavFile(defaultBgmPath, 10, (t) => 0.1 * Math.sin(2 * Math.PI * 110 * t) + 0.05 * Math.sin(2 * Math.PI * 165 * t));
        command = command.input(defaultBgmPath).inputOptions(["-stream_loop", "-1"]);
      }

      // Whoosh SFX at transitions
      sfxIndex = nextInputIndex++;
      const sfxPath = path.join(tempDir, "sfx_whoosh.wav");
      generateWavFile(sfxPath, Math.ceil(durationLimit + 10), (t) => {
        const modT = t % sceneDur;
        return modT < 0.5 ? 0.3 * Math.sin(440 * 2 * Math.PI * t) * Math.exp(-modT * 5) : 0;
      });
      command = command.input(sfxPath);

      let outOpts = [
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-crf",
        "32", // Reduced quality for faster processing
        "-pix_fmt",
        "yuv420p",
        "-r",
        "24", // Reduce frame rate to speed up rendering
        "-t",
        durationLimit.toString(),
        "-threads",
        "2", // Prevent resource exhaustion in Vercel limits
      ];

      if (true) { // Always mix available audio tracks so output always has audio
        const mixInputs = [];

        if (audioPath) {
          filterGraph.push(
            {
              filter: "adelay",
              options: `${delayTime * 1000}|${delayTime * 1000}`,
              inputs: `${audioIndex}:a`,
              outputs: "vo_delayed",
            },
            {
              filter: "highpass",
              options: "f=80",
              inputs: "vo_delayed",
              outputs: "vo_hp"
            },
            {
              filter: "equalizer",
              options: "f=3500:t=h:width=1500:g=3",
              inputs: "vo_hp",
              outputs: "vo_eq"
            },
            {
              filter: "acompressor",
              options: "threshold=-18dB:ratio=3",
              inputs: "vo_eq",
              outputs: "vo_comp"
            },
            {
              filter: "loudnorm",
              options: "I=-16:TP=-1.5:LRA=11",
              inputs: "vo_comp",
              outputs: "vo_norm"
            },
            {
              filter: "volume",
              options: "0.8",
              inputs: "vo_norm",
              outputs: "vo_mix",
            }
          );
          mixInputs.push("vo_mix");
        }

        filterGraph.push(
          {
            filter: "adelay",
            options: `${delayTime * 1000}|${delayTime * 1000}`,
            inputs: `${sfxIndex}:a`,
            outputs: "sfx_delayed",
          },
          {
            filter: "adelay",
            options: `${delayTime * 1000}|${delayTime * 1000}`,
            inputs: `${bgmIndex}:a`,
            outputs: "bgm_delayed",
          },
          {
            filter: "volume",
            options: bgmPath ? "0.2" : "0.12",
            inputs: "bgm_delayed",
            outputs: "bgm_mix",
          },
          {
            filter: "volume",
            options: "0.18",
            inputs: "sfx_delayed",
            outputs: "sfx_mix",
          }
        );
        mixInputs.push("bgm_mix", "sfx_mix");

        filterGraph.push(
          {
            filter: "amix",
            options: `inputs=${mixInputs.length}:duration=first:dropout_transition=2`,
            inputs: mixInputs,
            outputs: "mixed_audio",
          },
          {
            filter: "volume",
            options: "3.0",
            inputs: "mixed_audio",
            outputs: "final_audio",
          }
        );
        outOpts = [
          "-map",
          "[final_audio]",
          ...outOpts,
          "-c:a",
          "aac",
          "-shortest",
        ];
      }

      console.log("Filter graph:", JSON.stringify(filterGraph, null, 2));

      command
        .complexFilter(filterGraph)
        .map(currentOutput)
        .outputOptions(outOpts)
        .save(middlePath)
        .on("end", () => resolve())
        .on("error", (err) => reject(err));
    });

    let finalPath = middlePath;
    if (introPath || outroPath) {
      finalPath = path.join(tempDir, "final.mp4");
      
      const hasAudio = await Promise.all([introPath, middlePath, outroPath].map(async (p) => {
        if(!p) return false;
        return new Promise((res) => {
          ffmpeg.ffprobe(p, (err, metadata) => {
            if (err) res(false);
            else res(metadata.streams.some(s => s.codec_type === 'audio'));
          });
        });
      }));

      const introHasAudio = hasAudio[0];
      const middleHasAudio = hasAudio[1];
      const outroHasAudio = hasAudio[2];

      await new Promise((resolve, reject) => {
        let concatCommand = ffmpeg();
        let filterParts = [];
        let concatInputs = [];
        
        // Add silent audio as input so we can use it to substitute missing audio
        const silentAudioPath = path.join(tempDir, "silent_audio.wav");
        generateWavFile(silentAudioPath, 10, null);
        concatCommand = concatCommand.input(silentAudioPath);
        // Its input index will be the total number of files (+1 depending) - we will know later
        
        let fileIdx = 0;
        let actualFileIdx = 1; // since anullsrc is at index 0
        
        // Restructure adding parts
        const addPart = (fPath, hasA) => {
          concatCommand = concatCommand.input(fPath);
          filterParts.push(`[${actualFileIdx}:v]scale=w=720:h=1280:force_original_aspect_ratio=increase,crop=720:1280,setsar=1/1,format=yuv420p[v${fileIdx}]`);
          
          if (hasA) {
            filterParts.push(`[${actualFileIdx}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a${fileIdx}]`);
          } else {
            // map from anullsrc (which is at index 0)
            filterParts.push(`[0:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a${fileIdx}]`);
          }

          concatInputs.push(`[v${fileIdx}][a${fileIdx}]`);
          fileIdx++;
          actualFileIdx++;
        };

        if (introPath) addPart(introPath, introHasAudio);
        addPart(middlePath, middleHasAudio);
        if (outroPath) addPart(outroPath, outroHasAudio);

        const complexFilterStr = filterParts.join(';') + ';' + concatInputs.join('') + `concat=n=${fileIdx}:v=1:a=1[outv][outa]`;

        console.log("Concat filter graph:", complexFilterStr);

        concatCommand
          .complexFilter(complexFilterStr)
          .map('[outv]')
          .map('[outa]')
          .outputOptions([
             "-c:v",
             "libx264",
             "-preset",
             "ultrafast",
             "-crf",
             "32",
             "-pix_fmt",
             "yuv420p",
             "-r",
             "24",
             "-c:a",
             "aac"
          ])
          .save(finalPath)
          .on("end", () => resolve())
          .on("error", (err) => reject(err));
      });
    }

    const outputBuffer = fs.readFileSync(finalPath);
    fs.rmSync(tempDir, { recursive: true, force: true });

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Length", outputBuffer.length);
    return res.status(200).send(outputBuffer);
  } catch (error) {
    console.error("Error rendering reel:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to render reel" });
  }
}
