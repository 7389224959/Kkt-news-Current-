import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import url from "url";

// Get current directory in ESM
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const artifactsDir = path.join(__dirname, "../artifacts");

// Ensure artifacts directory exists
if (!fs.existsSync(artifactsDir)) {
  fs.mkdirSync(artifactsDir, { recursive: true });
}

// Configuration
const APP_URL = process.env.APP_URL || "https://kktnews.vercel.app/admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  console.error("Error: ADMIN_PASSWORD environment variable is not set.");
  process.exit(1);
}

const MAX_RETRIES = 3;
const WAIT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

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

async function runAutoRobot(attempt = 1) {
  console.log(`\n--- Starting Auto Robot Click (Attempt ${attempt}/${MAX_RETRIES}) ---`);
  
  const browser = await chromium.launch({
    headless: true, // Always headless in Actions
  });
  
  const page = await browser.newPage();
  
  // Setup alert handling
  let alertSuccess = false;
  let alertError = false;
  let alertMessage = "";
  
  page.on("dialog", async (dialog) => {
    alertMessage = dialog.message();
    console.log(`Alert received: ${alertMessage}`);
    
    const messageLower = alertMessage.toLowerCase();
    
    if (messageLower.includes("error") || messageLower.includes("failed")) {
      alertError = true;
    } else if (
      messageLower.includes("success") || 
      messageLower.includes("completed") ||
      messageLower.includes("auto robot")
    ) {
      alertSuccess = true;
    }
    
    await dialog.accept();
  });

  try {
    console.log(`Opening admin panel: ${APP_URL}`);
    await page.goto(APP_URL, { waitUntil: "networkidle" });
    await takeScreenshot(page, "1-initial-load");

    // Check if we need to login
    const loginButton = await page.$("button:has-text('Login')");
    
    if (loginButton) {
      console.log("Login page detected. Attempting login...");
      // Find password input
      const passwordInput = await page.$("input[type='password']");
      if (passwordInput) {
        await passwordInput.fill(ADMIN_PASSWORD);
        await takeScreenshot(page, "2-before-login");
        await loginButton.click();
        console.log("Clicked login button.");
        await page.waitForNavigation({ waitUntil: "networkidle" });
        console.log("Login successful");
        await takeScreenshot(page, "3-after-login");
      } else {
        throw new Error("Login page detected but password input not found.");
      }
    } else {
      console.log("No login required or already logged in.");
    }

    // Now on admin dashboard, wait a moment for elements to settle
    await page.waitForTimeout(2000);
    await takeScreenshot(page, "4-admin-dashboard");

    // Find the Auto Robot button
    let autoRobotButton = null;
    
    console.log("Searching for Auto Robot button...");
    
    // Priority 1: Text
    const buttons = await page.$$("button");
    for (const btn of buttons) {
      const text = await btn.textContent();
      if (text && text.toLowerCase().includes("auto robot")) {
        autoRobotButton = btn;
        console.log("Found button by text content.");
        break;
      }
    }
    
    // Priority 2: Data attribute if text not found
    if (!autoRobotButton) {
      autoRobotButton = await page.$("[data-testid='auto-robot-button']");
      if (autoRobotButton) console.log("Found button by data-testid.");
    }
    
    // Priority 3: Fallback specific classes / common icons context if needed 
    // Add fallback selectors here if the above fail

    if (!autoRobotButton) {
      throw new Error("Auto Robot button not found on the page.");
    }

    // Click the button
    console.log("Clicking Auto Robot...");
    await autoRobotButton.click();
    await takeScreenshot(page, "5-after-click");

    console.log(`Waiting for completion (up to ${WAIT_TIMEOUT_MS / 1000}s)...`);
    
    // Poll for alert flags
    const startTime = Date.now();
    let isComplete = false;
    
    while (Date.now() - startTime < WAIT_TIMEOUT_MS) {
      if (alertSuccess || alertError) {
        isComplete = true;
        break;
      }
      await page.waitForTimeout(1000); // Check every second
    }

    await takeScreenshot(page, "6-completion");

    if (!isComplete) {
      throw new Error("Script timed out waiting for alert response.");
    }

    if (alertError) {
      throw new Error(`Auto Robot reported an error: ${alertMessage}`);
    }

    console.log("Auto Robot finished successfully!");

  } catch (error) {
    console.error(`Error during attempt ${attempt}:`, error.message);
    await takeScreenshot(page, `error-attempt-${attempt}`);
    
    if (attempt < MAX_RETRIES) {
      console.log(`Retrying...`);
      await browser.close();
      return await runAutoRobot(attempt + 1);
    } else {
      console.error("Max retries reached. Failing script.");
      process.exit(1);
    }
  } finally {
    await browser.close();
  }
}

runAutoRobot();
