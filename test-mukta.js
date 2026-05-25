import https from 'https';

const req = https.get('https://raw.githubusercontent.com/google/fonts/main/ofl/mukta/Mukta-Bold.ttf', (res) => {
  console.log(res.statusCode);
  process.exit(0);
});
