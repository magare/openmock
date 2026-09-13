import { chromium } from "playwright-core";
import fs from "node:fs/promises";
import path from "node:path";

const PORT = 5199;
const URL = `http://localhost:${PORT}/`;
const outDir = path.resolve("evidence/qa/usability-stages/stage3-before");

await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });

const setupPage = async (page, theme = "light") => {
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.evaluate((th) => {
    localStorage.removeItem("openmock-project");
    localStorage.setItem("openmock-tour-seen", "1");
    localStorage.setItem("openmock-mobile-onboarded", "1");
    localStorage.setItem("openmock-show-tips", "0");
    localStorage.setItem("openmock-theme", th);
  }, theme);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(".mockup-stage", { timeout: 20000 });
  await page.waitForTimeout(800);
};

console.log("Capturing Stage 3 before screenshots...");

// 1. Desktop 1440px Light
const page1440 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await setupPage(page1440, "light");

// 01. Default Minimized Timeline
await page1440.screenshot({ path: path.join(outDir, "01-desktop-1440-light-minimized.png") });

// Maximize Timeline
const maxBtn = page1440.locator('button[aria-label="Maximize timeline"]');
await maxBtn.click();
await page1440.waitForSelector(".timeline-mode", { state: "visible" });
await page1440.waitForTimeout(200);

// 02. Advanced Mode (default when maximized)
await page1440.screenshot({ path: path.join(outDir, "02-desktop-1440-light-advanced.png") });

// 03. Simple Mode
await page1440.locator('.timeline-mode button', { hasText: "SIMPLE" }).click();
await page1440.waitForTimeout(200);
await page1440.screenshot({ path: path.join(outDir, "03-desktop-1440-light-simple.png") });

// 04. Presets Popover Open (in Simple mode)
await page1440.locator(".timeline-action", { hasText: "PRESETS" }).click();
await page1440.waitForSelector(".preset-popover", { state: "visible" });
await page1440.screenshot({ path: path.join(outDir, "04-desktop-1440-light-presets-open.png") });
await page1440.locator(".timeline-action", { hasText: "PRESETS" }).click();
await page1440.waitForTimeout(200);

// 05. Advanced Mode with Expanded Keyframes
await page1440.locator('.timeline-mode button', { hasText: "ADVANCED" }).click();
await page1440.waitForTimeout(200);
await page1440.locator('.tiny-action', { hasText: "Expand layer" }).click();
await page1440.waitForTimeout(200);
await page1440.screenshot({ path: path.join(outDir, "05-desktop-1440-light-advanced-expanded.png") });

// 2. Desktop 1440px Dark
await setupPage(page1440, "dark");
await page1440.locator('button[aria-label="Maximize timeline"]').click();
await page1440.waitForSelector(".timeline-mode", { state: "visible" });
await page1440.locator('.timeline-mode button', { hasText: "SIMPLE" }).click();
await page1440.waitForTimeout(200);
await page1440.screenshot({ path: path.join(outDir, "06-desktop-1440-dark-simple.png") });

await page1440.locator('.timeline-mode button', { hasText: "ADVANCED" }).click();
await page1440.waitForTimeout(200);
await page1440.screenshot({ path: path.join(outDir, "07-desktop-1440-dark-advanced.png") });
await page1440.close();

// 3. Medium 1000px
const page1000 = await browser.newPage({ viewport: { width: 1000, height: 800 } });
await setupPage(page1000, "light");
await page1000.locator('button[aria-label="Maximize timeline"]').click();
await page1000.waitForSelector(".timeline-mode", { state: "visible" });
await page1000.locator('.timeline-mode button', { hasText: "SIMPLE" }).click();
await page1000.waitForTimeout(200);
await page1000.screenshot({ path: path.join(outDir, "08-medium-1000-light-simple.png") });

await page1000.locator('.timeline-mode button', { hasText: "ADVANCED" }).click();
await page1000.waitForTimeout(200);
await page1000.screenshot({ path: path.join(outDir, "09-medium-1000-light-advanced.png") });
await page1000.close();

// 4. Mobile 390px
const pageMobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await setupPage(pageMobile, "light");
await pageMobile.screenshot({ path: path.join(outDir, "10-mobile-390-light.png") });
await pageMobile.close();

await browser.close();
console.log("Captured all Stage 3 before screenshots!");
