import { chromium } from "playwright-core";
import fs from "node:fs/promises";
import path from "node:path";

const PORT = 5199;
const URL = `http://localhost:${PORT}/`;
const beforeDir = path.resolve("evidence/qa/placement-fixes/before");
await fs.mkdir(beforeDir, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });

// 3. Mobile 390px Viewport
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => {
    localStorage.setItem("openmock-tour-seen", "1");
    localStorage.setItem("openmock-mobile-onboarded", "1");
    localStorage.setItem("openmock-show-tips", "0");
    localStorage.setItem("openmock-theme", "light");
  });
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".mockup-stage", { timeout: 20000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(beforeDir, "06-mobile-390-before.png") });
  console.log("Captured: 06-mobile-390-before.png");
  await context.close();
}

// 4. Mobile 320px Viewport
{
  const context = await browser.newContext({ viewport: { width: 320, height: 568 } });
  await context.addInitScript(() => {
    localStorage.setItem("openmock-tour-seen", "1");
    localStorage.setItem("openmock-mobile-onboarded", "1");
    localStorage.setItem("openmock-show-tips", "0");
    localStorage.setItem("openmock-theme", "light");
  });
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".mockup-stage", { timeout: 20000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(beforeDir, "07-mobile-320-before.png") });
  console.log("Captured: 07-mobile-320-before.png");
  await context.close();
}

await browser.close();
console.log("Mobile before evidence updated.");
