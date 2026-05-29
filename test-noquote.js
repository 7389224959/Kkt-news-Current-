import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs';

ffmpeg.setFfmpegPath(ffmpegStatic);
fs.writeFileSync('test_sub.txt', 'Hello World');

const filterGraph = [
  { filter: 'color', options: 'c=blue:s=720x1280:d=5', inputs: [], outputs: 'bg' },
  { filter: 'drawtext', options: { textfile: 'test_sub.txt', fontcolor: 'white', fontsize: '50', x: '100', y: '100', enable: 'between(t,1.25,4.75)' }, inputs: 'bg', outputs: 'fg' }
];

const cmd = ffmpeg().complexFilter(filterGraph).map('fg').output('test_out_noquote.mp4')
.on('start', c => console.log(c))
.on('error', e => console.log('Err:', e.message))
.on('end', () => console.log('Done'));
cmd.run();
