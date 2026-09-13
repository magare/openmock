import { chromium } from "playwright-core";
import fs from "node:fs/promises";
import path from "node:path";

const PORT = 5199;
const URL = `http://localhost:${PORT}/`;
const outDir = path.resolve("evidence/qa/usability-stages/after");
const downloadsDir = path.resolve("evidence/qa/usability-stages/downloads");

await fs.mkdir(outDir, { recursive: true });
await fs.mkdir(downloadsDir, { recursive: true });

console.log("Starting Stage 4A Verification (Export Clarity & Real Downloads)...");

const browser = await chromium.launch({ channel: "chrome", headless: true });

const consoleErrors = [];
const consoleWarnings = [];

const setupPage = async (page, theme = "light", width = 1440, height = 900) => {
  await page.setViewportSize({ width, height });
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      if (!text.includes("favicon") && !text.includes("ERR_CONNECTION_REFUSED")) {
        consoleErrors.push(`[${theme}-${width}] ${text}`);
      }
    } else if (msg.type() === "warning") {
      consoleWarnings.push(`[${theme}-${width}] ${msg.text()}`);
    }
  });

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
  await page.waitForTimeout(600);
};

const results = {
  checks: [],
  downloads: [],
  keyboard: [],
  layout: []
};

// ----------------------------------------------------
// Test 1: Desktop 1440px Light & Dark layout + Popover inspection
// ----------------------------------------------------
const context1 = await browser.newContext({ acceptDownloads: true });
const page1 = await context1.newPage();
await setupPage(page1, "light", 1440, 900);

console.log("Verifying TopBar export trigger and absence of standalone capture button...");
const hasOldCaptureBtn = await page1.$(".capture-button");
if (hasOldCaptureBtn) {
  throw new Error("Old ambiguous .capture-button still exists in TopBar!");
}
results.checks.push("Standalone ambiguous .capture-button is removed from TopBar");

const exportBtn = await page1.waitForSelector(".export-button");
const exportBtnText = await exportBtn.innerText();
console.log("Export button text:", exportBtnText.trim());

// Open export popover
await exportBtn.click();
await page1.waitForSelector(".export-popover");
await page1.waitForTimeout(250);

// Check popover contents
const popoverTitle = await page1.$eval(".export-popover-title", (el) => el.innerText);
const quickCardTitle = await page1.$eval(".export-quick-title", (el) => el.innerText);
const quickBtnText = await page1.$eval(".export-quick-btn", (el) => el.innerText);
console.log("Popover title:", popoverTitle, "| Quick card:", quickCardTitle, "| Quick button:", quickBtnText);

if (!popoverTitle.includes("EXPORT") || !quickCardTitle.includes("Quick snapshot")) {
  throw new Error(`Unexpected popover content: ${popoverTitle} / ${quickCardTitle}`);
}
results.checks.push("Export popover displays clear header and Quick snapshot card");

// Screenshot 60: Desktop 1440 Light - Still Image tab
await page1.screenshot({ path: path.join(outDir, "60-desktop-1440-light-export-image.png") });
console.log("Captured 60-desktop-1440-light-export-image.png");

// Switch to Video tab
await page1.click("#export-tab-video");
await page1.waitForSelector(".video-export");
await page1.waitForTimeout(250);

// Screenshot 61: Desktop 1440 Light - Video Animation tab
await page1.screenshot({ path: path.join(outDir, "61-desktop-1440-light-export-video.png") });
console.log("Captured 61-desktop-1440-light-export-video.png");

// Switch back to Image tab
await page1.click("#export-tab-image");
await page1.waitForSelector(".image-export");
await page1.waitForTimeout(200);

// ----------------------------------------------------
// Test 2: REAL Download - Quick Snapshot (JPG)
// ----------------------------------------------------
console.log("Triggering Quick snapshot download...");
const [snapshotDownload] = await Promise.all([
  page1.waitForEvent("download"),
  page1.click(".export-quick-btn")
]);

const snapshotPath = path.join(downloadsDir, "quick-snapshot.jpg");
await snapshotDownload.saveAs(snapshotPath);
const snapshotStat = await fs.stat(snapshotPath);
const snapshotBuffer = await fs.readFile(snapshotPath);
const isJpeg = snapshotBuffer[0] === 0xff && snapshotBuffer[1] === 0xd8 && snapshotBuffer[2] === 0xff;

console.log(`Quick Snapshot downloaded: ${snapshotStat.size} bytes, isJPEG: ${isJpeg}`);
if (snapshotStat.size < 10000 || !isJpeg) {
  throw new Error(`Quick snapshot invalid: size=${snapshotStat.size}, isJpeg=${isJpeg}`);
}
results.downloads.push({
  type: "Quick Snapshot",
  filename: snapshotDownload.suggestedFilename(),
  size: snapshotStat.size,
  format: "JPEG (FF D8 FF verified)"
});

// Verify toast notification
await page1.waitForSelector(".toast");
const snapshotToast = await page1.$eval(".toast", (el) => el.innerText);
console.log("Toast after snapshot:", snapshotToast);
results.checks.push(`Snapshot toast feedback confirmed: "${snapshotToast.trim()}"`);

// ----------------------------------------------------
// Test 3: REAL Download - Configured Still Image (PNG)
// ----------------------------------------------------
console.log("Testing Configured Image export with PNG format...");
await page1.selectOption(".export-body.image-export label:has-text('Image format') select", "png");
await page1.waitForTimeout(200);

const [pngDownload] = await Promise.all([
  page1.waitForEvent("download"),
  page1.click(".image-export .primary-wide")
]);

const pngPath = path.join(downloadsDir, "configured-export.png");
await pngDownload.saveAs(pngPath);
const pngStat = await fs.stat(pngPath);
const pngBuffer = await fs.readFile(pngPath);
const isPng = pngBuffer[0] === 0x89 && pngBuffer[1] === 0x50 && pngBuffer[2] === 0x4e && pngBuffer[3] === 0x47;

console.log(`Configured PNG downloaded: ${pngStat.size} bytes, isPNG: ${isPng}`);
if (pngStat.size < 10000 || !isPng) {
  throw new Error(`Configured PNG invalid: size=${pngStat.size}, isPng=${isPng}`);
}
results.downloads.push({
  type: "Configured Still Image",
  filename: pngDownload.suggestedFilename(),
  size: pngStat.size,
  format: "PNG (89 50 4E 47 verified)"
});

// ----------------------------------------------------
// Test 4: REAL Download - Short Video Animation (WebM)
// ----------------------------------------------------
console.log("Testing Short Video Animation export...");
await page1.click("#export-tab-video");
await page1.waitForSelector(".video-export");
await page1.waitForTimeout(200);

// Set project timeline duration to 1s for fast video export
await page1.evaluate(() => {
  const durSelect = document.querySelector(".timeline-duration select");
  if (durSelect) {
    durSelect.value = "1";
    durSelect.dispatchEvent(new Event("change", { bubbles: true }));
  }
});

const [videoDownload] = await Promise.all([
  page1.waitForEvent("download", { timeout: 30000 }),
  page1.click(".video-export .primary-wide")
]);

const videoPath = path.join(downloadsDir, "configured-export.webm");
await videoDownload.saveAs(videoPath);
const videoStat = await fs.stat(videoPath);
const videoBuffer = await fs.readFile(videoPath);
const isWebm = videoBuffer[0] === 0x1a && videoBuffer[1] === 0x45 && videoBuffer[2] === 0xdf && videoBuffer[3] === 0xa3;

console.log(`Configured Video downloaded: ${videoStat.size} bytes, isWebM: ${isWebm}`);
if (videoStat.size < 5000 || !isWebm) {
  throw new Error(`Video export invalid: size=${videoStat.size}, isWebm=${isWebm}`);
}
results.downloads.push({
  type: "Configured Video Animation",
  filename: videoDownload.suggestedFilename(),
  size: videoStat.size,
  format: "WebM (1A 45 DF A3 verified)"
});

// ----------------------------------------------------
// Test 5: Keyboard Focus, Tabbing, and Escape Key Return
// ----------------------------------------------------
console.log("Testing Keyboard Navigation & Focus Return...");
// Close popover first by clicking close button
await page1.click(".export-close-btn");
await page1.waitForSelector(".export-popover", { state: "detached" });

// Check focus returned to export button
const activeAfterClose = await page1.evaluate(() => document.activeElement?.className);
console.log("Active element after close button:", activeAfterClose);
if (!activeAfterClose?.includes("export-button")) {
  throw new Error(`Focus did not return to export-button after clicking close button. Got: ${activeAfterClose}`);
}
results.keyboard.push("Close button returns focus to .export-button");

// Open popover using keyboard (Enter on focused export button)
await page1.keyboard.press("Enter");
await page1.waitForSelector(".export-popover");
await page1.waitForTimeout(200);

// Check focus entered popover on the quick snapshot button
const activeInPopover = await page1.evaluate(() => document.activeElement?.className);
console.log("Active element inside popover on mount:", activeInPopover);
if (!activeInPopover?.includes("export-quick-btn")) {
  throw new Error(`Focus did not automatically move to .export-quick-btn. Got: ${activeInPopover}`);
}
results.keyboard.push("Opening popover focuses the first action (.export-quick-btn)");

// Press Escape key inside popover
await page1.keyboard.press("Escape");
await page1.waitForSelector(".export-popover", { state: "detached" });

const activeAfterEscape = await page1.evaluate(() => document.activeElement?.className);
console.log("Active element after Escape key:", activeAfterEscape);
if (!activeAfterEscape?.includes("export-button")) {
  throw new Error(`Focus did not return to .export-button after Escape. Got: ${activeAfterEscape}`);
}
results.keyboard.push("Escape key closes popover and returns focus to .export-button");

await context1.close();

// ----------------------------------------------------
// Test 6: Desktop 1440 Dark Theme
// ----------------------------------------------------
const context2 = await browser.newContext();
const page2 = await context2.newPage();
await setupPage(page2, "dark", 1440, 900);
await page2.click(".export-button");
await page2.waitForSelector(".export-popover");
await page2.waitForTimeout(250);
await page2.screenshot({ path: path.join(outDir, "62-desktop-1440-dark-export.png") });
console.log("Captured 62-desktop-1440-dark-export.png");
await context2.close();

// ----------------------------------------------------
// Test 7: Medium 1000px Viewport (Light & Dark)
// ----------------------------------------------------
const context3 = await browser.newContext();
const page3 = await context3.newPage();
await setupPage(page3, "light", 1000, 750);
await page3.click(".export-button");
await page3.waitForSelector(".export-popover");
await page3.waitForTimeout(250);

// Verify bounds at 1000px
const bounds1000 = await page3.evaluate(() => {
  const pop = document.querySelector(".export-popover")?.getBoundingClientRect();
  return { right: Math.round(pop?.right || 0), width: Math.round(pop?.width || 0) };
});
console.log("Popover at 1000px:", bounds1000);
if (bounds1000.right > 1000) {
  throw new Error(`Export popover overflows 1000px window: right=${bounds1000.right}`);
}
await page3.screenshot({ path: path.join(outDir, "63-medium-1000-light-export.png") });
console.log("Captured 63-medium-1000-light-export.png");

// Dark at 1000px
await page3.evaluate(() => {
  localStorage.setItem("openmock-theme", "dark");
});
await page3.reload({ waitUntil: "domcontentloaded" });
await page3.waitForSelector(".mockup-stage");
await page3.click(".export-button");
await page3.waitForSelector(".export-popover");
await page3.waitForTimeout(250);
await page3.screenshot({ path: path.join(outDir, "64-medium-1000-dark-export.png") });
console.log("Captured 64-medium-1000-dark-export.png");
await context3.close();

// ----------------------------------------------------
// Test 8: Mobile 390px Viewport (Light & Dark)
// ----------------------------------------------------
const context4 = await browser.newContext();
const page4 = await context4.newPage();
await setupPage(page4, "light", 390, 844);

// Ensure export button is visible in mobile topbar
const mobileExportBtn = await page4.waitForSelector(".topbar .export-button");
const mobileBtnVisible = await mobileExportBtn.isVisible();
console.log("Mobile export button visible:", mobileBtnVisible);
if (!mobileBtnVisible) {
  throw new Error("Export button is not visible on 390px mobile viewport!");
}

await mobileExportBtn.click();
await page4.waitForSelector(".export-popover");
await page4.waitForTimeout(250);

// Verify bounds at 390px: must fit within 390px width without horizontal overflow
const boundsMobile = await page4.evaluate(() => {
  const pop = document.querySelector(".export-popover")?.getBoundingClientRect();
  const docOverflow = document.documentElement.scrollWidth > document.documentElement.clientWidth;
  return {
    x: Math.round(pop?.x || 0),
    right: Math.round(pop?.right || 0),
    width: Math.round(pop?.width || 0),
    docOverflow
  };
});
console.log("Popover at 390px mobile:", boundsMobile);
if (boundsMobile.right > 390 || boundsMobile.docOverflow) {
  throw new Error(`Export popover overflows 390px mobile screen: right=${boundsMobile.right}, overflow=${boundsMobile.docOverflow}`);
}
results.checks.push("Mobile 390px viewport fits export popover cleanly with zero page overflow");

await page4.screenshot({ path: path.join(outDir, "65-mobile-390-light-export.png") });
console.log("Captured 65-mobile-390-light-export.png");

// Dark at 390px
await page4.evaluate(() => {
  localStorage.setItem("openmock-theme", "dark");
});
await page4.reload({ waitUntil: "domcontentloaded" });
await page4.waitForSelector(".mockup-stage");
await page4.click(".topbar .export-button");
await page4.waitForSelector(".export-popover");
await page4.waitForTimeout(250);
await page4.screenshot({ path: path.join(outDir, "66-mobile-390-dark-export.png") });
console.log("Captured 66-mobile-390-dark-export.png");
await context4.close();

await browser.close();

console.log("\n================ STAGE 4A VERIFICATION SUMMARY ================");
console.log("Console Errors:", consoleErrors);
console.log("Console Warnings:", consoleWarnings);
console.log("Checks Passed:", results.checks);
console.log("Downloads Verified:", results.downloads);
console.log("Keyboard Tests:", results.keyboard);
console.log("================================================================\n");

if (consoleErrors.length > 0) {
  throw new Error(`Verification completed with ${consoleErrors.length} console errors!`);
}

console.log("Stage 4A verification completely successful!");
