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
    await downloadFile('https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Regular.ttf', fontPath);

    // Get coordinates
    const parseCoords = (cStr) => cStr.split(',').map(Number);
    const vBox = template.coordinates.video_box !== 'hidden' ? parseCoords(template.coordinates.video_box) : null;
    const hBox = template.coordinates.headline_box !== 'hidden' ? parseCoords(template.coordinates.headline_box) : null;
    const sBox = template.coordinates.subtitle_box !== 'hidden' ? parseCoords(template.coordinates.subtitle_box) : null;
    const tBox = template.coordinates.ticker_box !== 'hidden' ? parseCoords(template.coordinates.ticker_box) : null;

    const filterGraph = [
      {
        filter: 'scale',
        options: '1080:1920',
        inputs: '0:v',
        outputs: 'bg_scaled'
      }
    ];

    let currentOutput = 'bg_scaled';
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
      const headlinePath = path.join(tempDir, 'headline.txt');
      fs.writeFileSync(headlinePath, String(scriptData.headline));
      filterGraph.push({
        filter: 'drawtext',
        options: {
          fontfile: fontPath,
          fontcolor: styleOverrides.headlineColor || 'white',
          fontsize: styleOverrides.headlineSize || '50',
          x: hBox[0],
          y: hBox[1],
          textfile: headlinePath,
          box: '1',
          boxcolor: 'black@0.5',
          boxborderw: '10'
        },
        inputs: currentOutput,
        outputs: 'with_headline'
      });
      currentOutput = 'with_headline';
    }

    if (scriptData.ticker && tBox) {
      const tickerPath = path.join(tempDir, 'ticker.txt');
      fs.writeFileSync(tickerPath, String(scriptData.ticker));
      filterGraph.push({
        filter: 'drawtext',
        options: {
          fontfile: fontPath,
          fontcolor: styleOverrides.tickerColor || 'white',
          fontsize: styleOverrides.tickerSize || '40',
          x: `mod(max(t*${template.style_rules.ticker_speed || 80}\\, 1080)\\-1080\\, 2000)`, 
          y: tBox[1],
          textfile: tickerPath,
          box: '1',
          boxcolor: styleOverrides.tickerBg || 'red@0.8',
          boxborderw: '10'
        },
        inputs: currentOutput,
        outputs: 'with_ticker'
      });
      currentOutput = 'with_ticker';
    }

    if (scriptData.subtitles && sBox) {
      const subtitleLines = Array.isArray(scriptData.subtitles) ? scriptData.subtitles : [scriptData.subtitles].filter(Boolean);
      const timePerSubtitle = 3.5; // Estimated 3.5s per line

      subtitleLines.forEach((sub, index) => {
        const nextOutput = `sub_${index}`;
        const subPath = path.join(tempDir, `sub_${index}.txt`);
        fs.writeFileSync(subPath, String(sub));
        const startT = index * timePerSubtitle;
        const endT = (index + 1) * timePerSubtitle;

        filterGraph.push({
          filter: 'drawtext',
          options: {
            fontfile: fontPath,
            fontcolor: styleOverrides.subtitleColor || 'yellow',
            fontsize: styleOverrides.subtitleSize || '45',
            x: sBox[0],
            y: sBox[1],
            textfile: subPath,
            box: '1',
            boxcolor: 'black@0.6',
            boxborderw: '10',
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
        
      let outOpts = [
          '-c:v libx264',
          '-preset ultrafast',
          '-crf 28',
          '-pix_fmt yuv420p',
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
