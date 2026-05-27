import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import url from "url";

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

const MAX_RETRIES = 4;
const WAIT_TIMEOUT_MS = 5 * 60 * 1000;

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
    
    if (messageLower.includes("error") || messageLower.includes("failed")) {
      // However, if the alert says "No new articles found or already posted" it might be treated as success in fetch
      if (phaseName === 'Auto Fetch' && messageLower.includes("no new articles")) {
         alertSuccess = true;
      } else {
         alertError = true;
      }
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
    const button = await page.$(`#${buttonSelector}`);
    if (!button) {
      throw new Error(`${phaseName} button not found.`);
    }

    console.log(`Clicking ${phaseName} button...`);
    // Clicking hidden button might require force
    await button.click({ force: true });
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
  let attempt = 0;

  while (attempt <= MAX_RETRIES) {
    if (attempt > 0) {
      console.log(`\n--- Retrying Auto Robot (Attempt ${attempt}/${MAX_RETRIES}) ---`);
    } else {
      console.log(`\n--- Starting Auto Robot Click ---`);
    }
    
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
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

      // If we reach here, everything succeeded
      console.log("\nAuto Robot finished successfully!");
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

