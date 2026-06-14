const https = require('https');

https.get('https://raw.githubusercontent.com/google/fonts/main/ofl/hind/Hind-Bold.ttf', (res) => {
  console.log("Hind-Bold.ttf status:", res.statusCode);
});

https.get('https://raw.githubusercontent.com/google/fonts/main/ofl/mukta/Mukta-Bold.ttf', (res) => {
  console.log("Mukta-Bold.ttf status:", res.statusCode);
});

https.get('https://raw.githubusercontent.com/google/fonts/main/ofl/khand/Khand-Bold.ttf', (res) => {
  console.log("Khand-Bold.ttf status:", res.statusCode);
});
