const { chromium } = require("playwright");
require("dotenv").config();

(async () => {
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  let appUrl = process.env.APP_URL || "https://kktnews.vercel.app/admin";

  if (!appUrl.endsWith("/admin")) {
    appUrl = appUrl.replace(/\/$/, "") + "/admin";
  }

  console.log("Opening admin panel at:", appUrl);

  const browser = await chromium.launch({ headless: true });
  let success = false;
  let maxRetries = 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    console.log(`Starting attempt ${attempt + 1} of ${maxRetries + 1}...`);
    const context = await browser.newContext();
    const page = await context.newPage();
    let autoRobotFinished = false;
    let autoRobotSuccess = false;

    // Handle dialogs (alerts)
    page.on("dialog", async (dialog) => {
      const msg = dialog.message();
      console.log(`Alert: ${msg}`);

      if (
        msg.includes("Successfully auto-fetched") ||
        msg.includes("Failed to fetch")
      ) {
        autoRobotFinished = true;
        autoRobotSuccess = true;
      } else if (msg.includes("Auto Robot Error")) {
        autoRobotFinished = true;
        autoRobotSuccess = false;
      }
      await dialog.accept();
    });

    page.on("console", (msg) => {
      // ignore verbose logs
      if (msg.type() === "error" || msg.text().includes("Auto Robot")) {
        console.log(`PAGE LOG: ${msg.text()}`);
      }
    });

    try {
      await page.goto(appUrl, { waitUntil: "networkidle" });

      console.log("Logging in...");
      // Fill the password input and click "Login to Dashboard"
      const passwordInput = page.locator('input[type="password"]');
      if ((await passwordInput.count()) > 0) {
        await passwordInput.fill(adminPassword);
        await page.locator("button", { hasText: "Login to Dashboard" }).click();
        await page.waitForTimeout(2000);
      } else {
        console.log(
          "No password input found, assuming already logged in or different login flow.",
        );
      }

      // Wait until dashboard fully loads
      await page.waitForSelector("text=Auto Robot", { timeout: 15000 });

      console.log("Clicking Auto Robot...");
      const autoRobotBtn = page.locator("button", { hasText: "Auto Robot" });

      if ((await autoRobotBtn.count()) === 0) {
        throw new Error("Auto Robot button not found!");
      }

      await autoRobotBtn.click();
      console.log("Waiting for completion...");

      // Wait up to 5 minutes for the process to complete
      let waitTime = 0;
      while (!autoRobotFinished && waitTime < 300000) {
        await page.waitForTimeout(5000);
        waitTime += 5000;
        if (waitTime % 30000 === 0) {
          console.log(`Still waiting... (${waitTime / 1000} seconds elapsed)`);
        }
      }

      await page.screenshot({
        path: `auto-robot-result-attempt-${attempt + 1}.png`,
        fullPage: true,
      });

      if (!autoRobotFinished) {
        console.log(
          "Timeout waiting for Auto Robot completion. It may still be running in the background.",
        );
      } else if (autoRobotFinished && autoRobotSuccess) {
        console.log("Finished running Auto Robot successfully.");
        success = true;
        await context.close();
        break; // Stop retries
      } else {
        throw new Error(
          "Auto Robot reported an error. Will retry if possible.",
        );
      }
    } catch (err) {
      console.error(
        `Error during auto robot script on attempt ${attempt + 1}:`,
        err,
      );
      // Wait before next retry
      await page.waitForTimeout(5000);
    } finally {
      await context.close();
    }
  }

  await browser.close();

  if (!success) {
    console.error("All attempts failed.");
    process.exit(1);
  }
})();
