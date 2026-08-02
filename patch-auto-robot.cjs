const fs = require('fs');
let code = fs.readFileSync('scripts/auto-robot-click.js', 'utf8');

const target = `              // Fetch anchor settings directly
              const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
              const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
              console.log(\`[auto-robot] Supabase check: URL=\${!!url} KEY=\${!!key}\`);
              if (url && key) {
                const s = createClient(url, key);
                const { data, error } = await s.from('site_settings').select('anchorSettings').limit(1).maybeSingle();
                if (error) console.error("[auto-robot] DB fetch error:", error.message);
                console.log("[auto-robot] DB anchorSettings:", JSON.stringify(data?.anchorSettings || {}));
                if (data && data.anchorSettings && data.anchorSettings.enabled && data.anchorSettings.imageUrl && body.audioUrl) {
                  console.log("[auto-robot] Building local anchor with audio string length:", body.audioUrl.length);
                  const anchorUrl = await buildLocalAndUpload(data.anchorSettings.imageUrl, body.audioUrl);
                  if (anchorUrl) {
                    body.anchorVideoUrl = anchorUrl;
                    console.log("[auto-robot] Injected anchorVideoUrl into request:", anchorUrl);
                    
                    await route.continue({ postData: JSON.stringify(body) });
                    return;
                  } else {
                    console.error("[auto-robot] buildLocalAndUpload returned null");
                  }
                } else {
                  console.log(\`[auto-robot] Skipping anchor build. enabled=\${data?.anchorSettings?.enabled} hasImage=\${!!data?.anchorSettings?.imageUrl} hasAudio=\${!!body.audioUrl}\`);
                }
              }`;

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
              }`;

code = code.replace(target, replacement);
fs.writeFileSync('scripts/auto-robot-click.js', code);
