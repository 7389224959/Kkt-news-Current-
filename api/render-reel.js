export const maxDuration = 300;
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import os from 'os';

ffmpeg.setFfmpegPath(ffmpegStatic);

const downloadFile = async (url, dest) => {
  if (!url) throw new Error('URL is missing');
  
  if (url.startsWith('data:')) {
    const matches = url.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+)?(?:;charset=[a-zA-Z0-9-]+)?(;base64)?,(.*)$/);
    if (!matches) throw new Error('Invalid data URI');
    const isBase64 = matches[2] === ';base64';
    const dataString = matches[3];
    const buffer = Buffer.from(isBase64 ? dataString : decodeURIComponent(dataString), isBase64 ? 'base64' : 'utf8');
    fs.writeFileSync(dest, buffer);
    return;
  }
  
  if (url.startsWith('/')) {
    url = `http://localhost:${process.env.PORT || 3000}${url}`;
  }
  
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(dest, buffer);
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { audioUrl, templateMediaUrl, scriptData, template, styleOverrides = {} } = req.body;
    if (!templateMediaUrl || !template) return res.status(400).json({ error: 'Missing required parameters.' });

    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'reel-'));
    console.log("Working in temp directory:", tempDir);

    const backgroundPath = path.join(tempDir, 'background.mp4');
    const fontPath = path.join(tempDir, 'font.ttf');
    const outputPath = path.join(tempDir, 'output.mp4');

    const { overlayMediaUrl } = req.body;
    let overlayPath = null;
    if (overlayMediaUrl) {
      overlayPath = path.join(tempDir, 'overlay.mp4');
      await downloadFile(overlayMediaUrl, overlayPath);
    }

    let audioPath = null;
    if (audioUrl) {
      audioPath = path.join(tempDir, 'audio.wav');
      await downloadFile(audioUrl, audioPath);
    }
    await downloadFile(templateMediaUrl, backgroundPath);
    await downloadFile('https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Bold.ttf', fontPath);

    // Scale factor for 720p
    const targetW = 720;
    const targetH = 1280;
    const scaleFactor = targetW / 1080;
    const parseAndScaleCoords = (cStr) => cStr.split(',').map(n => Math.round(Number(n) * scaleFactor));
    
    // Get coordinates with fallbacks for critical reel components
    const vBox = template.coordinates.video_box !== 'hidden' ? parseAndScaleCoords(template.coordinates.video_box) : null;
    const hBox = template.coordinates.headline_box !== 'hidden' ? parseAndScaleCoords(template.coordinates.headline_box) : null;
    
    // Subtitles should always be visible in these new high-retention reels. Provide a bottom-center fallback.
    const sBox = (template.coordinates.subtitle_box && template.coordinates.subtitle_box !== 'hidden') 
        ? parseAndScaleCoords(template.coordinates.subtitle_box) 
        : parseAndScaleCoords('50,900,620,200'); // Bottom center fallback
        
    const tBox = template.coordinates.ticker_box !== 'hidden' ? parseAndScaleCoords(template.coordinates.ticker_box) : null;

    // Helper for approximate word wrap based on pixel width
    const wrapText = (text, maxWidth, fontSize) => {
      const charWidth = fontSize * 0.45; // Adjusted for bold font
      const maxChars = Math.max(10, Math.floor(maxWidth / charWidth));
      const words = String(text).split(' ');
      let lines = [];
      let currentLine = '';
      for (const word of words) {
        if ((currentLine.length + word.length + 1) > maxChars && currentLine.length > 0) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine += (currentLine ? ' ' : '') + word;
        }
      }
      if (currentLine) lines.push(currentLine);
      return lines.join('\n');
    };

    const preset = scriptData.stylePreset || '';
    const isImage = !templateMediaUrl.match(/\.(mp4|mov|webm)$/i);

    const filterGraph = [];

    if (isImage) {
        filterGraph.push(
          { filter: 'scale', options: `${targetW}:${targetH}:force_original_aspect_ratio=increase`, inputs: '0:v', outputs: 'bg_scaled_raw' },
          { filter: 'crop', options: `${targetW}:${targetH}`, inputs: 'bg_scaled_raw', outputs: 'bg_cropped_raw' },
          { filter: 'boxblur', options: 'luma_radius=15:luma_power=1', inputs: 'bg_cropped_raw', outputs: 'bg_blurred' },
          { filter: 'scale', options: `${targetW}:${targetH}:force_original_aspect_ratio=decrease`, inputs: '0:v', outputs: 'fg_scaled' },
          { filter: 'overlay', options: '(W-w)/2:(H-h)/2', inputs: ['bg_blurred', 'fg_scaled'], outputs: 'bg_composed' }
        );
        
        if (!overlayPath && (preset === 'breaking_news' || preset === 'explainer')) {
            const zStep = preset === 'breaking_news' ? '0.0015' : '0.0005';
            filterGraph.push({ filter: 'zoompan', options: `z='min(zoom+${zStep},1.2)':d=750:s=${targetW}x${targetH}`, inputs: 'bg_composed', outputs: 'bg_cropped' });
        } else {
            filterGraph.push({ filter: 'null', inputs: 'bg_composed', outputs: 'bg_cropped' });
        }
    } else {
        filterGraph.push(
          { filter: 'scale', options: `${targetW}:${targetH}:force_original_aspect_ratio=increase`, inputs: '0:v', outputs: 'bg_scaled' },
          { filter: 'crop', options: `${targetW}:${targetH}`, inputs: 'bg_scaled', outputs: 'bg_cropped' }
        );
    }

    let currentOutput = 'bg_cropped';
    let nextInputIndex = 1;

    if (scriptData.hookText) {
      const hookFontSize = Math.round(75 * scaleFactor);
      const hookPath = path.join(tempDir, 'hook.txt');
      fs.writeFileSync(hookPath, wrapText(scriptData.hookText, targetW - 100, hookFontSize));
      
      filterGraph.push({
        filter: 'drawtext',
        options: {
            fontfile: fontPath,
            fontcolor: 'yellow',
            fontsize: hookFontSize.toString(),
            x: '(w-text_w)/2',
            y: '100',
            textfile: hookPath,
            shadowcolor: 'black@0.9',
            shadowx: '4',
            shadowy: '4',
            bordercolor: 'black',
            borderw: '4',
            enable: 'between(t,0,4)'
        },
        inputs: currentOutput,
        outputs: 'with_hook'
      });
      currentOutput = 'with_hook';
    }

    let overlayIndex = -1;
    if (overlayPath && vBox) {
      overlayIndex = nextInputIndex++;
      filterGraph.push({
        filter: 'scale',
        options: `${vBox[2]}:${vBox[3]}:force_original_aspect_ratio=increase`,
        inputs: `${overlayIndex}:v`,
        outputs: 'ov_scaled'
      });
      filterGraph.push({
        filter: 'crop',
        options: `${vBox[2]}:${vBox[3]}`,
        inputs: 'ov_scaled',
        outputs: 'ov_cropped_raw'
      });
      
      const isOverlayImage = !overlayMediaUrl.match(/\.(mp4|mov|webm)$/i);
      if (isOverlayImage && (preset === 'breaking_news' || preset === 'explainer')) {
          const zStep = preset === 'breaking_news' ? '0.0015' : '0.0005';
          filterGraph.push({
              filter: 'zoompan',
              options: `z='min(zoom+${zStep},1.2)':d=750:s=${vBox[2]}x${vBox[3]}`,
              inputs: 'ov_cropped_raw',
              outputs: 'ov_cropped'
          });
      } else {
          filterGraph.push({ filter: 'null', inputs: 'ov_cropped_raw', outputs: 'ov_cropped' });
      }

      filterGraph.push({
        filter: 'overlay',
        options: `x=${vBox[0]}:y=${vBox[1]}`,
        inputs: [currentOutput, 'ov_cropped'],
        outputs: 'with_overlay'
      });
      currentOutput = 'with_overlay';
    }

    if (scriptData.headline && hBox) {
      const fontSize = Math.round((Number(styleOverrides.headlineSize) || 80) * scaleFactor);
      const headlinePath = path.join(tempDir, 'headline.txt');
      const wrappedHeadline = wrapText(scriptData.headline, hBox[2], fontSize);
      fs.writeFileSync(headlinePath, wrappedHeadline);
      filterGraph.push({
        filter: 'drawtext',
        options: {
          fontfile: fontPath,
          fontcolor: styleOverrides.headlineColor || 'yellow',
          fontsize: fontSize.toString(),
          x: `${hBox[0]}+(${hBox[2]}-text_w)/2`,
          y: `${hBox[1]}+(${hBox[3]}-text_h)/2`,
          textfile: headlinePath,
          shadowcolor: 'black@0.9',
          shadowx: '4',
          shadowy: '4',
          bordercolor: 'black',
          borderw: '4'
        },
        inputs: currentOutput,
        outputs: 'with_headline'
      });
      currentOutput = 'with_headline';
    }

    if (scriptData.ticker && tBox) {
      const fontSize = Math.round((Number(styleOverrides.tickerSize) || 50) * scaleFactor);
      const tickerPath = path.join(tempDir, 'ticker.txt');
      fs.writeFileSync(tickerPath, String(scriptData.ticker));
      const speed = Math.round((template.style_rules.ticker_speed || 150) * scaleFactor);
      
      // Draw static background box for ticker
      filterGraph.push({
        filter: 'drawbox',
        options: {
          x: tBox[0],
          y: tBox[1],
          w: tBox[2],
          h: tBox[3],
          color: styleOverrides.tickerBg || 'red@0.8',
          t: 'fill'
        },
        inputs: currentOutput,
        outputs: 'with_ticker_bg'
      });

      // Draw moving text over the background
      filterGraph.push({
        filter: 'drawtext',
        options: {
          fontfile: fontPath,
          fontcolor: styleOverrides.tickerColor || 'white',
          fontsize: fontSize.toString(),
          x: `${tBox[0]}+${tBox[2]}-(t*${speed})`, 
          y: `${tBox[1]}+(${tBox[3]}-text_h)/2`,
          textfile: tickerPath,
          shadowcolor: 'black@0.5',
          shadowx: '2',
          shadowy: '2'
        },
        inputs: 'with_ticker_bg',
        outputs: 'with_ticker'
      });
      currentOutput = 'with_ticker';
    }

    if ((scriptData.subtitles || scriptData.subtitleChunks) && sBox) {
      const fontSize = Math.round((Number(styleOverrides.subtitleSize) || 65) * scaleFactor);
      
      let rawLines = Array.isArray(scriptData.subtitleChunks) && scriptData.subtitleChunks.length > 0
         ? scriptData.subtitleChunks 
         : Array.isArray(scriptData.subtitles) && scriptData.subtitles.length > 0 ? scriptData.subtitles : null;
         
      if (!rawLines && scriptData.voiceoverScript) {
         // Auto-generate chunks from full script if missed
         rawLines = String(scriptData.voiceoverScript).split(/[,.।!?]+/).map(s => s.trim()).filter(Boolean);
      }
      
      const subtitleLines = rawLines || ["Subtitle missing"];
      
      const totalWords = subtitleLines.join(' ').split(' ').length;
      // In absence of exact word-level TTS timestamps, we map chunks evenly across estimated audio duration
      // TTS usually reads at ~2.2 words per second. 
      // If voiceoverScript exists, it might be longer than chunks, so we estimate real duration from it.
      const voiceoverWords = scriptData.voiceoverScript ? String(scriptData.voiceoverScript).split(' ').length : totalWords;
      const estimatedTotalAudioSecs = Math.max(10, voiceoverWords / 2.0); 
      
      let currentTime = 0;

      subtitleLines.forEach((sub, index) => {
        const nextOutput = `sub_${index}`;
        const subPath = path.join(tempDir, `sub_${index}.txt`);
        const wrappedSub = wrapText(sub, sBox[2], fontSize);
        fs.writeFileSync(subPath, wrappedSub);
        
        const words = String(sub).split(' ').length;
        // The proportion of the total text length dictates the duration this chunk is shown.
        let duration = (words / Math.max(1, totalWords)) * estimatedTotalAudioSecs;
        
        // Prevent too short subtitles
        duration = Math.max(1.0, duration);

        const startT = currentTime;
        const endT = currentTime + duration;
        currentTime += duration;

        filterGraph.push({
          filter: 'drawtext',
          options: {
            fontfile: fontPath,
            fontcolor: styleOverrides.subtitleColor || 'white',
            fontsize: fontSize.toString(),
            x: `${sBox[0]}+(${sBox[2]}-text_w)/2`,
            y: `${sBox[1]}+(${sBox[3]}-text_h)/2`,
            textfile: subPath,
            shadowcolor: 'black@0.9',
            shadowx: '3',
            shadowy: '3',
            bordercolor: 'black',
            borderw: '4',
            enable: `between(t,${startT.toFixed(2)},${endT.toFixed(2)})`
          },
          inputs: currentOutput,
          outputs: nextOutput
        });
        currentOutput = nextOutput;
      });
    }

    console.log("Starting FFmpeg with comprehensive layout and subtitle pass...");

    await new Promise((resolve, reject) => {
      let command = ffmpeg();
      
      command = command.input(backgroundPath).inputOptions(['-stream_loop', '-1']);
      
      if (overlayPath && vBox) {
        const isOverlayImageInfo = !overlayMediaUrl.match(/\.(mp4|mov|webm)$/i);
        if (isOverlayImageInfo) {
           command = command.input(overlayPath).inputOptions(['-stream_loop', '-1']);
        } else {
           command = command.input(overlayPath);
        }
      }
      
      let audioIndex = -1;
      if (audioPath) {
        audioIndex = nextInputIndex++;
        command = command.input(audioPath);
      }
        
      let durationLimit = audioPath ? 60 : 15;

      let outOpts = [
          '-c:v libx264',
          '-preset ultrafast',
          '-crf 32', // Reduced quality for faster processing
          '-pix_fmt yuv420p',
          '-r', '24', // Reduce frame rate to speed up rendering
          '-t', durationLimit.toString(),
          '-threads', '2' // Prevent resource exhaustion in Vercel limits
      ];
      
      if (audioPath) {
        outOpts = [`-map ${audioIndex}:a`, ...outOpts, '-c:a aac', '-shortest'];
      }

      console.log("Filter graph:", JSON.stringify(filterGraph, null, 2));

      command
        .complexFilter(filterGraph)
        .map(currentOutput)
        .outputOptions(outOpts)
        .save(outputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err));
    });

    const outputBuffer = fs.readFileSync(outputPath);
    fs.rmSync(tempDir, { recursive: true, force: true });

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', outputBuffer.length);
    return res.status(200).send(outputBuffer);
  } catch (error) {
    console.error('Error rendering reel:', error);
    return res.status(500).json({ error: error.message || 'Failed to render reel' });
  }
}
