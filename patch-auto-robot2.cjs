const fs = require('fs');
let code = fs.readFileSync('scripts/auto-robot-click.js', 'utf8');

const startStr = "// Fetch anchor settings directly";
const endStr = "} catch (e) {";

const startIndex = code.indexOf(startStr);
const endIndex = code.indexOf(endStr, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `              const settings = await page.evaluate(() => window.__SITE_SETTINGS__);
              console.log("[auto-robot] Page anchorSettings:", JSON.stringify(settings?.anchorSettings || {}));
              
              if (settings && settings.anchorSettings && settings.anchorSettings.enabled && settings.anchorSettings.imageUrl && body.audioUrl) {
                console.log("[auto-robot] Building local anchor with audio string length:", body.audioUrl.length);
                const anchorUrl = await buildLocalAndUpload(settings.anchorSettings.imageUrl, body.audioUrl);
                if (anchorUrl) {
                  body.anchorVideoUrl = anchorUrl;
                  console.log("[auto-robot] Injected anchorVideoUrl into request! Length:", anchorUrl.length);
                  await route.continue({ postData: JSON.stringify(body) });
                  return;
                } else {
                  console.error("[auto-robot] buildLocalAndUpload returned null");
                }
              } else {
                console.log(\`[auto-robot] Skipping anchor build. enabled=\${settings?.anchorSettings?.enabled} hasImage=\${!!settings?.anchorSettings?.imageUrl} hasAudio=\${!!body.audioUrl}\`);
              }
            `;
  code = code.substring(0, startIndex) + replacement + code.substring(endIndex);
  fs.writeFileSync('scripts/auto-robot-click.js', code);
  console.log("Patched successfully");
} else {
  console.error("Could not find start/end indices");
}
