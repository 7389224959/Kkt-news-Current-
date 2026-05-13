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

    const targetW = 720;
    const targetH = 1280;
    const scaleFactor = targetW / 1080;

    // Get coordinates
    const parseCoords = (cStr) => cStr.split(',').map(n => Math.round(Number(n) * scaleFactor));
    const vBox = template.coordinates.video_box !== 'hidden' ? parseCoords(template.coordinates.video_box) : null;
    const hBox = template.coordinates.headline_box !== 'hidden' ? parseCoords(template.coordinates.headline_box) : null;
    const sBox = template.coordinates.subtitle_box !== 'hidden' ? parseCoords(template.coordinates.subtitle_box) : null;
    const tBox = template.coordinates.ticker_box !== 'hidden' ? parseCoords(template.coordinates.ticker_box) : null;

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

    const filterGraph = [
      {
        filter: 'scale',
        options: `${targetW}:${targetH}:force_original_aspect_ratio=increase`,
        inputs: '0:v',
        outputs: 'bg_scaled'
      },
      {
        filter: 'crop',
        options: `${targetW}:${targetH}`,
        inputs: 'bg_scaled',
        outputs: 'bg_cropped'
      }
    ];

    let currentOutput = 'bg_cropped';
    let nextInputIndex = 1;

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
        outputs: 'ov_cropped'
      });
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
          fontcolor: styleOverrides.headlineColor || 'white',
          fontsize: fontSize.toString(),
          x: `${hBox[0]}+(${hBox[2]}-text_w)/2`,
          y: `${hBox[1]}+(${hBox[3]}-text_h)/2`,
          textfile: headlinePath,
          box: '1',
          boxcolor: 'black@0.5',
          boxborderw: Math.round(10 * scaleFactor).toString()
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

    if (scriptData.subtitles && sBox) {
      const fontSize = Math.round((Number(styleOverrides.subtitleSize) || 60) * scaleFactor);
      const subtitleLines = Array.isArray(scriptData.subtitles) ? scriptData.subtitles : [scriptData.subtitles].filter(Boolean);
      const timePerSubtitle = 3.5; // Estimated 3.5s per line

      subtitleLines.forEach((sub, index) => {
        const nextOutput = `sub_${index}`;
        const subPath = path.join(tempDir, `sub_${index}.txt`);
        const wrappedSub = wrapText(sub, sBox[2], fontSize);
        fs.writeFileSync(subPath, wrappedSub);
        const startT = index * timePerSubtitle;
        const endT = (index + 1) * timePerSubtitle;

        filterGraph.push({
          filter: 'drawtext',
          options: {
            fontfile: fontPath,
            fontcolor: styleOverrides.subtitleColor || 'yellow',
            fontsize: fontSize.toString(),
            x: `${sBox[0]}+(${sBox[2]}-text_w)/2`,
            y: `${sBox[1]}+(${sBox[3]}-text_h)/2`,
            textfile: subPath,
            box: '1',
            boxcolor: 'black@0.6',
            boxborderw: Math.round(10 * scaleFactor).toString(),
            enable: `between(t,${startT},${endT})` // Timeline editing to sync subtitles over audio duration
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
        command = command.input(overlayPath);
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
