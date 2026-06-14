export const maxDuration = 300;
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import fs from "fs";
import path from "path";
import os from "os";

ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

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

  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(dest, buffer);
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
    } = req.body;
    if (!templateMediaUrl || !template)
      return res.status(400).json({ error: "Missing required parameters." });

    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "reel-"));
    console.log("Working in temp directory:", tempDir);

    const backgroundPath = path.join(tempDir, "background.mp4");
    const fontPath = path.join(tempDir, "font.ttf");
    const outputPath = path.join(tempDir, "output.mp4");

    const { overlayMediaUrl, visuals = [] } = req.body;
    let downloadedVisuals = [];
    for (let i = 0; i < visuals.length; i++) {
      const p = path.join(tempDir, `visual_${i}.jpg`);
      await downloadFile(visuals[i], p);
      downloadedVisuals.push({ file: p, url: visuals[i] });
    }
    if (downloadedVisuals.length === 0 && overlayMediaUrl) {
      const p = path.join(tempDir, "overlay.mp4");
      await downloadFile(overlayMediaUrl, p);
      downloadedVisuals.push({ file: p, url: overlayMediaUrl });
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
    await downloadFile(
      "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Bold.ttf",
      fontPath,
    );

    // Scale factor for 720p
    const targetW = 720;
    const targetH = 1280;
    const scaleFactor = targetW / 1080;
    const parseAndScaleCoords = (cStr) =>
      cStr.split(",").map((n) => Math.round(Number(n) * scaleFactor));

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
          options: `${targetW}:${targetH}:force_original_aspect_ratio=increase`,
          inputs: "0:v",
          outputs: "bg_scaled_raw",
        },
        {
          filter: "crop",
          options: `${targetW}:${targetH}`,
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
          options: `${targetW}:${targetH}:force_original_aspect_ratio=decrease`,
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
          options: `${targetW}:${targetH}:force_original_aspect_ratio=increase`,
          inputs: "0:v",
          outputs: "bg_scaled",
        },
        {
          filter: "crop",
          options: `${targetW}:${targetH}`,
          inputs: "bg_scaled",
          outputs: "bg_cropped",
        },
      );
    }


    let currentOutput = "bg_cropped";
    let nextInputIndex = 1;

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
        `z='1+0.2*(on/${totalFrames})'`, // zoom_in continuously
        `z='1.2-0.2*(on/${totalFrames})'`, // zoom_out continuously
        `z=1.1:x='iw*0.05*(1-on/${totalFrames})':y='y'`, // pan_left
        `z=1.1:x='iw*0.05*(on/${totalFrames})':y='y'`, // pan_right
        `z='1.1+0.1*(on/${totalFrames})':x='iw*0.05*(on/${totalFrames})':y='ih*0.05*(on/${totalFrames})'`, // ken_burns
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
        const isImgInfo = !item.url.match(/\.(mp4|mov|webm)$/i);

        filterGraph.push({
          filter: "scale",
          options: `${vBox[2]}:${vBox[3]}:force_original_aspect_ratio=increase`,
          inputs: `${idx}:v`,
          outputs: `vis_scaled_${i}`,
        });
        filterGraph.push({
          filter: "crop",
          options: `${vBox[2]}:${vBox[3]}`,
          inputs: `vis_scaled_${i}`,
          outputs: `vis_cropped_${i}`,
        });

        if (isImgInfo) {
          const motion = motions[i % motions.length];
          filterGraph.push({
            // d is frames = duration * fps (assume 25fps)
            filter: "zoompan",
            options: `${motion}:d=${Math.ceil(sceneDur * 25) + 50}:s=${vBox[2]}x${vBox[3]}`,
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
            filter: "trim",
            options: `duration=${sceneDur + 1.0}`,
            inputs: `vis_cropped_${i}`,
            outputs: `vis_trimmed_${i}`,
          });
        }

        filterGraph.push({
          filter: "setpts",
          options: "PTS-STARTPTS",
          inputs: `vis_trimmed_${i}`,
          outputs: `vis_ready_${i}`,
        });
      }

      // xfade them together
      let currentVis = `vis_ready_0`;
      for (let i = 1; i < downloadedVisuals.length; i++) {
        const trans = transitions[i % transitions.length];
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
        options: `x=${vBox[0]}:y=${vBox[1]}:eof_action=pass`,
        inputs: [currentOutput, currentVis],
        outputs: "with_overlay",
      });
      currentOutput = "with_overlay";
    }

    if (scriptData.headline && hBox) {
      const fontSize = Math.round(
        (Number(styleOverrides.headlineSize) || 80) * scaleFactor,
      );
      const headlinePath = path.join(tempDir, "headline.txt");
      const wrappedHeadline = wrapText(scriptData.headline, hBox[2], fontSize);
      fs.writeFileSync(headlinePath, wrappedHeadline);
      filterGraph.push({
        filter: "drawtext",
        options: {
          fontfile: fontPath,
          fontcolor: styleOverrides.headlineColor || "yellow",
          fontsize: fontSize.toString(),
          x: `${hBox[0]}+(${hBox[2]}-text_w)/2`,
          y: `${hBox[1]}+(${hBox[3]}-text_h)/2`,
          textfile: headlinePath,
          shadowcolor: "black@0.9",
          shadowx: "4",
          shadowy: "4",
          bordercolor: "black",
          borderw: "4",
        },
        inputs: currentOutput,
        outputs: "with_headline",
      });
      currentOutput = "with_headline";
    }

    if (scriptData.ticker && tBox) {
      const fontSize = Math.round(
        (Number(styleOverrides.tickerSize) || 50) * scaleFactor,
      );
      const tickerPath = path.join(tempDir, "ticker.txt");
      fs.writeFileSync(tickerPath, String(scriptData.ticker));
      const speed = Math.round(
        (template.style_rules.ticker_speed || 150) * scaleFactor,
      );

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
        },
        inputs: currentOutput,
        outputs: "with_ticker_bg",
      });

      // Draw moving text over the background
      filterGraph.push({
        filter: "drawtext",
        options: {
          fontfile: fontPath,
          fontcolor: styleOverrides.tickerColor || "white",
          fontsize: fontSize.toString(),
          x: `${tBox[0]}+${tBox[2]}-(t*${speed})`,
          y: `${tBox[1]}+(${tBox[3]}-text_h)/2`,
          textfile: tickerPath,
          shadowcolor: "black@0.5",
          shadowx: "2",
          shadowy: "2",
        },
        inputs: "with_ticker_bg",
        outputs: "with_ticker",
      });
      currentOutput = "with_ticker";
    }

    if ((scriptData.subtitles || scriptData.subtitleChunks) && sBox) {
      const fontSize = Math.round(
        (Number(styleOverrides.subtitleSize) || 65) * scaleFactor,
      );

      let currentTime = 0;

      subtitleLines.forEach((sub, index) => {
        const nextOutput = `sub_${index}`;
        const subPath = path.join(tempDir, `sub_${index}.txt`);
        const wrappedSub = wrapText(sub, sBox[2], fontSize);
        fs.writeFileSync(subPath, wrappedSub);

        const words = String(sub).trim().split(/\s+/).filter(Boolean).length;
        // The proportion of the total text length dictates the duration this chunk is shown.
        let duration = (words / totalWords) * exactAudioDuration;

        const startT = currentTime;
        const endT = currentTime + duration;
        currentTime += duration;

        filterGraph.push({
          filter: "drawtext",
          options: {
            fontfile: fontPath,
            fontcolor: styleOverrides.subtitleColor || "white",
            fontsize: fontSize.toString(),
            x: `${sBox[0]}+(${sBox[2]}-text_w)/2`,
            y: `${sBox[1]}+(${sBox[3]}-text_h)/2`,
            textfile: subPath,
            shadowcolor: "black@0.9",
            shadowx: "3",
            shadowy: "3",
            bordercolor: "black",
            borderw: "4",
            enable: `between(t,${startT.toFixed(2)},${endT.toFixed(2)})`,
          },
          inputs: currentOutput,
          outputs: nextOutput,
        });
        currentOutput = nextOutput;
      });
    }

    console.log(
      "Starting FFmpeg with comprehensive layout and subtitle pass...",
    );

    await new Promise((resolve, reject) => {
      let command = ffmpeg();

      command = command
        .input(backgroundPath)
        .inputOptions(["-stream_loop", "-1"]);

      if (downloadedVisuals.length > 0 && vBox) {
        for (let i = 0; i < downloadedVisuals.length; i++) {
          const item = downloadedVisuals[i];
          const isOverlayImageInfo = !item.url.match(/\.(mp4|mov|webm)$/i);
          if (isOverlayImageInfo) {
            command = command
              .input(item.file)
              .inputOptions(["-stream_loop", "-1"]);
          } else {
            command = command.input(item.file);
          }
        }
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

      // Drone BGM
      bgmIndex = nextInputIndex++;
      command = command
        .input("aevalsrc=0.1*sin(2*PI*110*t)+0.05*sin(2*PI*165*t)")
        .inputFormat("lavfi");

      // Whoosh SFX at transitions
      sfxIndex = nextInputIndex++;
      command = command
        .input(
          `aevalsrc='if(lt(mod(t,${sceneDur}),0.5), 0.3*sin(440*2*PI*t)*exp(-mod(t,${sceneDur})*5), 0)'`,
        )
        .inputFormat("lavfi");

      let durationLimit = audioPath ? exactAudioDuration : 15;

      let outOpts = [
        "-c:v libx264",
        "-preset ultrafast",
        "-crf 32", // Reduced quality for faster processing
        "-pix_fmt yuv420p",
        "-r",
        "24", // Reduce frame rate to speed up rendering
        "-t",
        durationLimit.toString(),
        "-threads",
        "2", // Prevent resource exhaustion in Vercel limits
      ];

      if (audioPath) {
        // Voiceover (100%), Background Music (10-15%), Transition SFX (15-20%)
        // amix lowers overall volume, so we boost it back after mixing.
        filterGraph.push(
          {
            filter: "volume",
            options: "1.0",
            inputs: `${audioIndex}:a`,
            outputs: "vo_mix",
          },
          {
            filter: "volume",
            options: "0.12",
            inputs: `${bgmIndex}:a`,
            outputs: "bgm_mix",
          },
          {
            filter: "volume",
            options: "0.18",
            inputs: `${sfxIndex}:a`,
            outputs: "sfx_mix",
          },
          {
            filter: "amix",
            options: "inputs=3:duration=first:dropout_transition=2",
            inputs: ["vo_mix", "bgm_mix", "sfx_mix"],
            outputs: "mixed_audio",
          },
          {
            filter: "volume",
            options: "3.0",
            inputs: "mixed_audio",
            outputs: "final_audio",
          },
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
        .save(outputPath)
        .on("end", () => resolve())
        .on("error", (err) => reject(err));
    });

    const outputBuffer = fs.readFileSync(outputPath);
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
