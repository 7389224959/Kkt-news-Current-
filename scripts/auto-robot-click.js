import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import url from "url";
import dotenv from "dotenv";
dotenv.config();

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const artifactsDir = path.join(__dirname, "../artifacts");

if (!fs.existsSync(artifactsDir)) {
  fs.mkdirSync(artifactsDir, { recursive: true });
}

const APP_URL = process.env.APP_URL || "https://kktnews.vercel.app/admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  console.error("Error: ADMIN_PASSWORD environment variable is not set.");
  process.exit(1);
}

function supa() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes('YOUR_SUPABASE_URL')) return null;
  return createClient(url, key);
}

const MAX_RETRIES = 4;
const WAIT_TIMEOUT_MS = 8 * 60 * 1000;

async function takeScreenshot(page, stepName) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filepath = path.join(artifactsDir, `step-${stepName}-${timestamp}.png`);
  try {
    await page.screenshot({ path: filepath, fullPage: true });
    console.log(`Saved screenshot: ${filepath}`);
  } catch (error) {
    console.warn(`Failed to save screenshot ${stepName}:`, error.message);
  }
}

const getRetryDelayMs = (retryCount) => {
  if (retryCount === 1) return 5 * 60 * 1000;
  if (retryCount === 2) return 10 * 60 * 1000;
  if (retryCount === 3) return 15 * 60 * 1000;
  if (retryCount >= 4) return 20 * 60 * 1000;
  return 5 * 60 * 1000;
};

const isTemporaryFailure = (messageLower) => {
  const tempKeywords = [
    "temporary error",
    "api issue",
    "timeout",
    "generation failed",
    "gemini overload",
    "429",
    "fetch failed",
    "network issue",
    "model spike"
  ];
  return tempKeywords.some(kw => messageLower.includes(kw)) || messageLower.includes("error") || messageLower.includes("failed");
};

async function executePhase(page, buttonSelector, phaseName) {
  console.log(`\nExecuting Phase: ${phaseName}...`);
  
  let alertSuccess = false;
  let alertError = false;
  let alertMessage = "";
  
  const dialogHandler = async (dialog) => {
    alertMessage = dialog.message();
    console.log(`Alert received [${phaseName}]: ${alertMessage}`);
    
    const messageLower = alertMessage.toLowerCase();
    
    if (
      messageLower.includes("successfully published") ||
      messageLower.includes("published directly") ||
      messageLower.includes("auto viral success") ||
      messageLower.includes("auto fetch success") ||
      (phaseName === 'Auto Fetch' && messageLower.includes("no new articles"))
    ) {
      alertSuccess = true;
    } else if (messageLower.includes("error") || messageLower.includes("failed")) {
      alertError = true;
    } else if (
      messageLower.includes("success") || 
      messageLower.includes("completed")
    ) {
      alertSuccess = true;
    }
    
    await dialog.accept();
  };

  page.on("dialog", dialogHandler);

  try {
    const button = await page.waitForSelector(`#${buttonSelector}`, { timeout: 15000, state: 'attached' });
    if (!button) {
      throw new Error(`${phaseName} button not found.`);
    }

    console.log(`Clicking ${phaseName} button...`);
    // Clicking hidden button with JS evaluate
    await button.evaluate(b => b.click());
    await takeScreenshot(page, `${phaseName.replace(/\s+/g, '-').toLowerCase()}-after-click`);

    console.log(`Waiting for ${phaseName} completion (up to ${WAIT_TIMEOUT_MS / 1000}s)...`);
    
    const startTime = Date.now();
    let isComplete = false;
    
    while (Date.now() - startTime < WAIT_TIMEOUT_MS) {
      if (alertSuccess || alertError) {
        isComplete = true;
        break;
      }
      await page.waitForTimeout(1000);
    }

    await takeScreenshot(page, `${phaseName.replace(/\s+/g, '-').toLowerCase()}-completion`);

    if (!isComplete) {
      throw new Error(`Timeout waiting for ${phaseName} response.`);
    }

    if (alertError) {
      throw new Error(alertMessage); // Capture raw message
    }

    console.log(`${phaseName} succeeded!`);
    return { success: true, message: alertMessage };
  } finally {
    page.off("dialog", dialogHandler);
  }
}

async function runAutoRobot() {
  let fetchSuccess = false;
  let viralSuccess = false;
  let reelSuccess = false;
  let attempt = 0;

  while (attempt <= MAX_RETRIES) {
    if (attempt > 0) {
      console.log(`\n--- Retrying Auto Robot (Attempt ${attempt}/${MAX_RETRIES}) ---`);
    } else {
      console.log(`\n--- Starting Auto Robot Click ---`);
    }
    
    const browser = await chromium.launch({ headless: true, downloadsPath: artifactsDir });
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();

    let pendingDownload = null;

    page.on('download', async (download) => {
      let resolveDownload;
      pendingDownload = new Promise(r => resolveDownload = r);
      const filepath = path.join(artifactsDir, download.suggestedFilename());
      try {
        await download.saveAs(filepath);
        console.log('Downloaded video saved to:', filepath);
        console.log('\n========================================================================');
        console.log('✅ VIDEO DOWNLOADED ON GITHUB RUNNER');
        console.log('To view this video, go to the GitHub repository -> Actions tab ->');
        console.log('click on this workflow run -> scroll to the bottom and download');
        console.log('the "auto-robot-artifacts" zip file.');
        console.log('========================================================================\n');
      } catch(e) {
        console.error('Failed to save download:', e);
      }
      resolveDownload();
    });

      // Intercept /api/render-reel to upload base64 audio if needed
      await page.route("**/api/render-reel", async (route) => {
        const req = route.request();
        if (req.method() === "POST") {
          const bodyStr = req.postData();
          if (bodyStr) {
            console.log("[auto-robot] Intercepted render-reel POST request!");
            try {
              const body = JSON.parse(bodyStr);
              
              // If audioUrl is a base64 data URI, upload to Supabase to prevent FUNCTION_PAYLOAD_TOO_LARGE
              if (body.audioUrl && body.audioUrl.startsWith('data:')) {
                console.log("[auto-robot] audioUrl is base64 data URI (len " + body.audioUrl.length + "), uploading to Supabase...");
                const s = supa();
                if (s) {
                  try {
                    const audioParts = body.audioUrl.split(',');
                    if (audioParts.length > 1) {
                      const audioBuf = Buffer.from(audioParts[1], 'base64');
                      const audioFileName = `audio-${Date.now()}.wav`;
                      const { data: uData, error: uErr } = await s.storage
                        .from('news-images')
                        .upload(audioFileName, audioBuf, { contentType: 'audio/wav', upsert: true });
                      if (!uErr && uData) {
                        const { data: pData } = s.storage.from('news-images').getPublicUrl(uData.path || audioFileName);
                        if (pData && pData.publicUrl) {
                          body.audioUrl = pData.publicUrl;
                          console.log("[auto-robot] Uploaded audioUrl to Supabase URL:", body.audioUrl);
                          await route.continue({ postData: JSON.stringify(body) });
                          return;
                        }
                      } else if (uErr) {
                        console.warn("[auto-robot] audioUrl upload to Supabase failed:", uErr.message);
                      }
                    }
                  } catch(ae) {
                    console.warn("[auto-robot] Error uploading audioUrl to Supabase:", ae.message);
                  }
                }
              }
            } catch (e) {
              console.error("[auto-robot] Error intercepting render-reel:", e);
            }
          }
        }
        await route.continue();
      });

    
    try {
      console.log(`Opening admin panel: ${APP_URL}`);
      await page.goto(APP_URL, { waitUntil: "networkidle" });
      await takeScreenshot(page, `attempt-${attempt}-initial-load`);

      const loginButton = await page.$("button:has-text('Login')");
      if (loginButton) {
        const passwordInput = await page.$("input[type='password']");
        if (passwordInput) {
          await passwordInput.fill(ADMIN_PASSWORD);
          await loginButton.click();
          console.log("Logged in.");
          await page.waitForTimeout(5000); // Wait for dashboard loads
        } else {
          throw new Error("Password input not found.");
        }
      }

      await page.waitForTimeout(3000); // Stabilize UI
      await takeScreenshot(page, `attempt-${attempt}-dashboard-ready`);

      // Partial Logic Execution
      if (!fetchSuccess) {
        try {
          const res = await executePhase(page, "auto-fetch-only-btn", "Auto Fetch");
          // If we got here, it's a success
          fetchSuccess = true;
          console.log("Auto Fetch succeeded", res.message);
          
          if (res.message && res.message.toLowerCase().includes("no new articles")) {
            console.log("No new articles generated - skipping auto viral and auto reel.");
            viralSuccess = true;
            reelSuccess = true;
          }
        } catch (e) {
          throw new Error(`Auto Fetch Failed: ${e.message}`);
        }
      } else {
        console.log("Auto Fetch already succeeded previously. Skipping.");
      }

      if (fetchSuccess && !viralSuccess) {
        try {
          const res = await executePhase(page, "auto-viral-only-btn", "Auto Viral Post");
          viralSuccess = true;
          console.log("Auto Viral succeeded", res.message);
        } catch (e) {
          throw new Error(`Auto Viral Failed: ${e.message}`);
        }
      } else if (viralSuccess) {
        console.log("Auto Viral already succeeded previously. Skipping.");
      }

      if (fetchSuccess && viralSuccess && !reelSuccess) {
        try {
          const res = await executePhase(page, "auto-reel-only-btn", "Auto Reel");
          reelSuccess = true;
          console.log("Auto Reel succeeded", res.message);
        } catch (e) {
          throw new Error(`Auto Reel Failed: ${e.message}`);
        }
      } else if (reelSuccess) {
        console.log("Auto Reel already succeeded previously. Skipping.");
      }

      // If we reach here, everything succeeded
      console.log("\nAuto Robot finished successfully!");
      if (pendingDownload) {
        console.log("Waiting for pending download to finish...");
        await pendingDownload;
      }
      await browser.close();
      process.exit(0);

    } catch (error) {
      console.error(`\nError during attempt ${attempt}:`, error.message);
      await takeScreenshot(page, `error-attempt-${attempt}`);

      const messageLower = error.message.toLowerCase();
      const isTemp = isTemporaryFailure(messageLower);

      if (isTemp) {
        console.log("Temporary failure detected.");
      }

      await browser.close();

      if (attempt < MAX_RETRIES) {
        const delayMs = getRetryDelayMs(attempt + 1);
        console.log(`Retrying after ${delayMs / 60000} minutes...`);
        // Use Promise to delay script execution since page is closed
        await new Promise(resolve => setTimeout(resolve, delayMs));
        attempt++;
      } else {
        console.error("Max retries reached. Failing script.");
        process.exit(1);
      }
    }
  }
}

runAutoRobot();

