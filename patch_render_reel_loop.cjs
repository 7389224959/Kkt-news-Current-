const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'api', 'render-reel.js');
let content = fs.readFileSync(filePath, 'utf8');

const oldCheck = `    const hasBgAudio = await new Promise((res) => {
      ffmpeg.ffprobe(backgroundPath, (err, metadata) => {
        if (err || !metadata || !metadata.streams) res(false);
        else res(metadata.streams.some(s => s.codec_type === 'audio'));
      });
    });

    await new Promise((resolve, reject) => {
      let command = ffmpeg();
      command = command
        .input(backgroundPath)
        .inputOptions(["-stream_loop", "-1"]);`;

const newCheck = `    let hasBgAudio = false;
    let isBgVideo = true;
    await new Promise((res) => {
      ffmpeg.ffprobe(backgroundPath, (err, metadata) => {
        if (err || !metadata || !metadata.streams) {
           isBgVideo = false;
           res();
           return;
        }
        hasBgAudio = metadata.streams.some(s => s.codec_type === 'audio');
        const vStream = metadata.streams.find(s => s.codec_type === 'video');
        if (!vStream || (vStream.codec_name && ['mjpeg', 'png', 'webp', 'gif'].includes(vStream.codec_name))) {
           isBgVideo = false;
        }
        res();
      });
    });

    await new Promise((resolve, reject) => {
      let command = ffmpeg();
      
      if (isBgVideo) {
        command = command.input(backgroundPath).inputOptions(["-stream_loop", "-1"]);
      } else {
        command = command.input(backgroundPath).inputOptions(["-loop", "1", "-framerate", "25"]);
      }`;

if (content.includes('command = command\n        .input(backgroundPath)\n        .inputOptions(["-stream_loop", "-1"]);')) {
  content = content.replace(oldCheck, newCheck);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Patched render-reel.js loop options');
} else {
  console.log('Already patched loop options');
}
