import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";

const outDir = "evidence/qa/usability-stages/baseline";
await mkdir(outDir, { recursive: true });

const consoleErrors = [];
const consoleWarnings = [];

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

page.on("console", (msg) => {
  if (msg.type() === "error") {
    consoleErrors.push(msg.text());
  } else if (msg.type() === "warning") {
    consoleWarnings.push(msg.text());
  }
});

page.on("pageerror", (err) => {
  consoleErrors.push(`PageError: ${err.message}`);
});

const freshDesktop = async () => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://localhost:5199/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.removeItem("openmock-project");
    localStorage.setItem("openmock-tour-seen", "1");
    localStorage.setItem("openmock-mobile-onboarded", "1");
    localStorage.setItem("openmock-show-tips", "0");
    localStorage.setItem("openmock-theme", "light");
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(".mockup-stage", { timeout: 20000 });
  await page.waitForTimeout(1200);
};

console.log("1. Starting baseline capture: Desktop light...");
await freshDesktop();
await page.screenshot({ path: `${outDir}/01-desktop-initial.png` });

console.log("2. Desktop dark...");
await page.evaluate(() => localStorage.setItem("openmock-theme", "dark"));
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector(".mockup-stage", { timeout: 20000 });
await page.waitForTimeout(1000);
await page.screenshot({ path: `${outDir}/02-desktop-dark.png` });

console.log("3. Mobile initial...");
await page.setViewportSize({ width: 390, height: 844 });
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector(".mockup-stage", { timeout: 20000 });
await page.waitForTimeout(1000);
await page.screenshot({ path: `${outDir}/03-mobile-initial.png` });

console.log("4. Walkthrough step 1: Add media...");
// Return to desktop
await freshDesktop();

// Inspect Source Card in inspector
const sourceCard = page.locator(".source-card");
const sourceCardText = await sourceCard.innerText();
console.log("Source card empty state text:", JSON.stringify(sourceCardText));
await page.screenshot({ path: `${outDir}/04-walkthrough-source-empty.png` });

// Upload a test image
const samplePngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const fileChooserPromise = page.waitForEvent("filechooser");
// Click the stage toast upload button
await page.locator(".upload-toast button").click();
const fileChooser = await fileChooserPromise;
await fileChooser.setFiles({
  name: "app-screenshot-hero.png",
  mimeType: "image/png",
  buffer: Buffer.from(samplePngBase64, "base64"),
});
await page.waitForTimeout(1000);

const sourceCardFilledText = await page.locator(".source-card").innerText();
console.log("Source card filled text:", JSON.stringify(sourceCardFilledText));
await page.screenshot({ path: `${outDir}/05-walkthrough-media-uploaded.png` });

console.log("5. Walkthrough step 2: Choose device...");
// Click CHANGE in Mockup section
await page.locator(".mockup-summary button.change-button").click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${outDir}/06-walkthrough-device-picker-open.png` });

// Select MacBook Air 13"
const macbookBtn = page.locator(".mockup-picker-grid button").filter({ hasText: "MacBook Air 13\"" });
await macbookBtn.click();
await page.waitForTimeout(1500);
await page.screenshot({ path: `${outDir}/07-walkthrough-device-changed.png` });

console.log("6. Walkthrough step 3: Framing / Background...");
// Change background in Scene section
const bgButton = page.locator(".inspector-section button.wide-select").filter({ hasText: "BACKGROUND" });
await bgButton.click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${outDir}/08-walkthrough-background-picker-open.png` });

// Switch to Preset tab
await page.locator(".background-picker .picker-tabs button").filter({ hasText: "Preset" }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${outDir}/09-walkthrough-background-preset.png` });

// Open Camera presets
await page.locator(".camera-tabs button").filter({ hasText: "Presets" }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${outDir}/10-walkthrough-camera-presets.png` });

console.log("7. Walkthrough step 4: Export still...");
// Click EXPORT button in topbar
await page.locator("button.export-button").click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${outDir}/11-walkthrough-export-popover.png` });

console.log("Console errors recorded:", consoleErrors.length);
if (consoleErrors.length > 0) {
  console.log("Errors:", consoleErrors);
}
console.log("Console warnings recorded:", consoleWarnings.length);

await browser.close();
console.log("Baseline walkthrough complete!");
