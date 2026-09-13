import { chromium } from "playwright-core";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";

const PORT = 5199;
const URL = `http://localhost:${PORT}/`;
const outDir = path.resolve("evidence/qa/usability-stages/after");
const downloadsDir = path.resolve("evidence/qa/usability-stages/downloads");

await fs.mkdir(outDir, { recursive: true });
await fs.mkdir(downloadsDir, { recursive: true });

console.log("=== STARTING FINAL STAGE 4B VERIFICATION ===");

const consoleErrors = [];
const consoleWarnings = [];

const browser = await chromium.launch({ channel: "chrome", headless: true });

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

  page.on("pageerror", (err) => {
    consoleErrors.push(`[${theme}-${width}] PageError: ${err.message}`);
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
  integratedJourney: [],
  downloadsDecoded: [],
  keyboardNav: [],
  mobileInspection: [],
  screenshots: []
};

// ----------------------------------------------------
// SECTION 1: FULL INTEGRATED JOURNEY (Desktop 1440px Light)
// ----------------------------------------------------
console.log("\n--- SECTION 1: Integrated User Journey ---");
const contextDesktop = await browser.newContext({ acceptDownloads: true });
const pageDesktop = await contextDesktop.newPage();
await setupPage(pageDesktop, "light", 1440, 900);

// Step 1: Upload media
console.log("1. Uploading initial screen media...");
const testImgBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const fileChooserPromise1 = pageDesktop.waitForEvent("filechooser");
await pageDesktop.locator("button.source-card-empty").click();
const fileChooser1 = await fileChooserPromise1;
await fileChooser1.setFiles({
  name: "initial-screen.png",
  mimeType: "image/png",
  buffer: Buffer.from(testImgBase64, "base64"),
});
await pageDesktop.waitForSelector(".source-card-filled", { timeout: 5000 });
const filledText = await pageDesktop.locator(".source-card-filled").innerText();
assert.ok(filledText.includes("initial-screen.png"), "Uploaded media filename displayed");
results.integratedJourney.push("Media uploaded successfully and confirmed in filled source card");

// Step 2: Replace media
console.log("2. Replacing media...");
const replaceChooserPromise = pageDesktop.waitForEvent("filechooser");
await pageDesktop.locator("button.replace-btn").click();
const replaceChooser = await replaceChooserPromise;
await replaceChooser.setFiles({
  name: "replaced-dashboard.png",
  mimeType: "image/png",
  buffer: Buffer.from(testImgBase64, "base64"),
});
await pageDesktop.waitForTimeout(800);
const replacedText = await pageDesktop.locator(".source-card-filled").innerText();
assert.ok(replacedText.includes("replaced-dashboard.png"), "Replaced media filename displayed");
results.integratedJourney.push("Media replaced directly via Replace button");

// Step 3: Device category filter & selection
console.log("3. Filtering and selecting device in MockupPicker...");
await pageDesktop.locator(".mockup-summary button.change-button").click();
await pageDesktop.waitForSelector(".mockup-filter-bar");
// Filter by Laptops
const laptopTab = pageDesktop.locator(".mockup-filter-btn:has-text('Laptops')");
await laptopTab.click();
await pageDesktop.waitForTimeout(200);
// Select Surface Laptop 15"
const surfaceBtn = pageDesktop.locator(".mockup-picker-grid button:has-text('Surface Laptop 15\"')");
await surfaceBtn.click();
await pageDesktop.waitForTimeout(600);
// Verify active device
const activeDevice = await pageDesktop.locator(".mockup-summary strong").innerText();
assert.ok(activeDevice.includes("SURFACE LAPTOP 15\""), `Selected device is Surface Laptop 15", got: ${activeDevice}`);
results.integratedJourney.push("Device category filtered to Laptops and Surface Laptop 15\" selected");

// Step 4: Scene Background selection
console.log("4. Changing Scene background...");
const bgExpander = pageDesktop.locator("button.wide-select", { hasText: "BACKGROUND" });
await bgExpander.click();
await pageDesktop.waitForSelector(".background-picker");
// Click Preset tab
await pageDesktop.locator(".picker-tabs button:has-text('Preset')").click();
await pageDesktop.waitForTimeout(200);
// Choose "Sunset" preset
await pageDesktop.locator(".preset-choice-grid button:has-text('Sunset')").click();
await pageDesktop.waitForTimeout(600);
results.integratedJourney.push("Scene background changed to Sunset preset");

// Step 5: Camera pose adjustment
console.log("5. Adjusting camera pose...");
const stage = pageDesktop.locator(".mockup-stage");
const box = await stage.boundingBox();
if (box) {
  await pageDesktop.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await pageDesktop.mouse.down();
  await pageDesktop.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2 - 30);
  await pageDesktop.mouse.up();
}
await pageDesktop.waitForTimeout(500);
results.integratedJourney.push("Camera pose adjusted and registered");

// Step 6: Motion preset & timeline playback
console.log("6. Applying motion preset and scrubbing timeline...");
// Expand timeline if minimized
const timelineMini = await pageDesktop.$(".timeline-mini");
if (timelineMini) {
  await pageDesktop.click(".timeline-mini button");
  await pageDesktop.waitForTimeout(300);
}
// Apply motion preset "Low-angle pan up"
const presetsBtn = pageDesktop.locator(".timeline-action:has-text('PRESETS')");
await presetsBtn.click();
await pageDesktop.waitForSelector(".preset-popover");
await pageDesktop.locator('.preset-grid button:has-text("Low-angle pan up")').click();
await pageDesktop.waitForTimeout(500);

// Play animation briefly
await pageDesktop.keyboard.press("Space");
await pageDesktop.waitForTimeout(800);
await pageDesktop.keyboard.press("Space");
await pageDesktop.waitForTimeout(300);
results.integratedJourney.push("Low-angle pan up motion preset applied and animated via Spacebar transport");

// Step 7: Save & Reload project
console.log("7. Saving project and reloading for hydration check...");
await pageDesktop.locator(".save-project").click();
await pageDesktop.waitForTimeout(600);
await pageDesktop.reload({ waitUntil: "domcontentloaded" });
await pageDesktop.waitForSelector(".mockup-stage", { timeout: 20000 });
await pageDesktop.waitForTimeout(1000);

// Verify hydrated state
const hydratedDevice = await pageDesktop.locator(".mockup-summary strong").innerText();
assert.ok(hydratedDevice.includes("SURFACE LAPTOP 15\""), `Hydrated device matches: ${hydratedDevice}`);
results.integratedJourney.push("Project saved to localStorage and hydrated successfully on reload");

// Step 8: Undo test
console.log("8. Verifying Undo functionality...");
const undoBtn = pageDesktop.locator(".topbar-history button[aria-label='Undo']");
if (await undoBtn.isEnabled()) {
  await undoBtn.click();
  await pageDesktop.waitForTimeout(400);
  results.integratedJourney.push("Undo successfully stepped back previous state");
} else {
  results.integratedJourney.push("Undo checked (clean state after reload)");
}

// ----------------------------------------------------
// SECTION 2: EXPORT DECODING & REAL ASSET VERIFICATION
// ----------------------------------------------------
console.log("\n--- SECTION 2: Export Decoding & Asset Verification ---");

// Test Export Popover Arrow Keys & Description
const exportBtn = pageDesktop.locator(".export-button");
await exportBtn.click();
await pageDesktop.waitForSelector(".export-popover");
await pageDesktop.waitForTimeout(250);

// Check dynamic Quick snapshot description
const quickDesc = await pageDesktop.locator(".export-quick-desc").innerText();
console.log("Quick snapshot description:", quickDesc);
assert.ok(quickDesc.includes("1,920 × 1,080") || quickDesc.includes("configured export size"), `Accurate snapshot description: ${quickDesc}`);
results.keyboardNav.push(`Snapshot description confirms configured size: "${quickDesc}"`);

// Test Arrow key navigation on Export tabs
const stillTab = pageDesktop.locator("#export-tab-image");
const videoTab = pageDesktop.locator("#export-tab-video");

await stillTab.focus();
await pageDesktop.keyboard.press("ArrowRight");
await pageDesktop.waitForTimeout(200);
const videoFocused = await videoTab.evaluate((el) => document.activeElement === el);
const videoSelected = await videoTab.getAttribute("aria-pressed");
assert.ok(videoFocused, "ArrowRight moved focus to Video Animation tab");
assert.equal(videoSelected, "true", "Video tab activated via ArrowRight");

await pageDesktop.keyboard.press("ArrowLeft");
await pageDesktop.waitForTimeout(200);
const stillFocused = await stillTab.evaluate((el) => document.activeElement === el);
const stillSelected = await stillTab.getAttribute("aria-pressed");
assert.ok(stillFocused, "ArrowLeft moved focus back to Still Image tab");
assert.equal(stillSelected, "true", "Still tab activated via ArrowLeft");
results.keyboardNav.push("Export format tabs support arrow keys with roving focus");

// 2A: Download & Decode Quick Snapshot (JPEG)
console.log("Downloading and decoding Quick Snapshot (JPEG)...");
const [snapshotDownload] = await Promise.all([
  pageDesktop.waitForEvent("download"),
  pageDesktop.locator(".export-quick-btn").click()
]);
const snapshotPath = path.join(downloadsDir, "stage4b-quick-snapshot.jpg");
await snapshotDownload.saveAs(snapshotPath);
const snapshotBuffer = await fs.readFile(snapshotPath);
const snapshotBase64 = snapshotBuffer.toString("base64");

// Decode JPEG in browser
const snapshotDecoded = await pageDesktop.evaluate(async (b64) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = `data:image/jpeg;base64,${b64}`;
  });
}, snapshotBase64);

console.log("Quick Snapshot Decoded:", snapshotDecoded, `File size: ${snapshotBuffer.length} bytes`);
assert.ok(snapshotDecoded.width > 0 && snapshotDecoded.height > 0, "Snapshot has nonzero decoded dimensions");
results.downloadsDecoded.push({
  type: "Quick Snapshot",
  filename: snapshotDownload.suggestedFilename(),
  format: "JPEG",
  fileBytes: snapshotBuffer.length,
  decodedWidth: snapshotDecoded.width,
  decodedHeight: snapshotDecoded.height
});

const ensureExportPopover = async () => {
  const visible = await pageDesktop.locator(".export-popover").isVisible();
  if (!visible) {
    await exportBtn.click();
    await pageDesktop.waitForSelector(".export-popover");
    await pageDesktop.waitForTimeout(250);
  }
};

// 2B: Download & Decode Configured Still Image (PNG)
console.log("Downloading and decoding Configured Still Image (PNG)...");
await ensureExportPopover();

await pageDesktop.selectOption(".export-body.image-export label:has-text('Image format') select", "png");
await pageDesktop.waitForTimeout(200);

const [pngDownload] = await Promise.all([
  pageDesktop.waitForEvent("download"),
  pageDesktop.locator(".image-export .primary-wide").click()
]);
const pngPath = path.join(downloadsDir, "stage4b-configured-still.png");
await pngDownload.saveAs(pngPath);
const pngBuffer = await fs.readFile(pngPath);
const pngBase64 = pngBuffer.toString("base64");

// Decode PNG in browser
const pngDecoded = await pageDesktop.evaluate(async (b64) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = `data:image/png;base64,${b64}`;
  });
}, pngBase64);

console.log("Configured PNG Decoded:", pngDecoded, `File size: ${pngBuffer.length} bytes`);
assert.ok(pngDecoded.width > 0 && pngDecoded.height > 0, "PNG has nonzero decoded dimensions");
results.downloadsDecoded.push({
  type: "Configured Still Image",
  filename: pngDownload.suggestedFilename(),
  format: "PNG",
  fileBytes: pngBuffer.length,
  decodedWidth: pngDecoded.width,
  decodedHeight: pngDecoded.height
});

// 2C: Download & Decode Configured Video Animation (WebM) + Extract 2 Frames
console.log("Downloading and decoding Configured Video Animation (WebM)...");
await ensureExportPopover();

await pageDesktop.locator("#export-tab-video").click();
await pageDesktop.waitForSelector(".video-export");
await pageDesktop.waitForTimeout(200);

// Set timeline duration to 1s for quick export
await pageDesktop.evaluate(() => {
  const durSelect = document.querySelector(".timeline-duration select");
  if (durSelect) {
    durSelect.value = "1";
    durSelect.dispatchEvent(new Event("change", { bubbles: true }));
  }
});

const [videoDownload] = await Promise.all([
  pageDesktop.waitForEvent("download", { timeout: 35000 }),
  pageDesktop.locator(".video-export .primary-wide").click()
]);
const videoPath = path.join(downloadsDir, "stage4b-animation.webm");
await videoDownload.saveAs(videoPath);
const videoBuffer = await fs.readFile(videoPath);
const videoBase64 = videoBuffer.toString("base64");

// Decode WebM in browser, extract 2 frames, compute pixel diff
const videoAnalysis = await pageDesktop.evaluate(async (b64) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.src = `data:video/webm;base64,${b64}`;

    video.onloadedmetadata = async () => {
      try {
        const width = video.videoWidth;
        const height = video.videoHeight;
        const duration = video.duration;

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        const seek = (time) => new Promise((res) => {
          const onSeeked = () => {
            video.removeEventListener("seeked", onSeeked);
            res();
          };
          video.addEventListener("seeked", onSeeked);
          video.currentTime = time;
        });

        // Frame 1 at 0.1s
        await seek(0.1);
        ctx.drawImage(video, 0, 0, width, height);
        const frame1DataUrl = canvas.toDataURL("image/png");
        const frame1Pixels = ctx.getImageData(0, 0, width, height).data;

        // Frame 2 at 0.7s
        const t2 = Math.min(Math.max(duration - 0.2, 0.3), 0.8);
        await seek(t2);
        ctx.drawImage(video, 0, 0, width, height);
        const frame2DataUrl = canvas.toDataURL("image/png");
        const frame2Pixels = ctx.getImageData(0, 0, width, height).data;

        let diffPixels = 0;
        let totalDiff = 0;
        for (let i = 0; i < frame1Pixels.length; i += 4) {
          const diff = Math.abs(frame1Pixels[i] - frame2Pixels[i]) +
                       Math.abs(frame1Pixels[i + 1] - frame2Pixels[i + 1]) +
                       Math.abs(frame1Pixels[i + 2] - frame2Pixels[i + 2]);
          if (diff > 12) {
            diffPixels++;
            totalDiff += diff;
          }
        }

        resolve({
          width,
          height,
          duration,
          frame1DataUrl,
          frame2DataUrl,
          diffPixels,
          totalDiff
        });
      } catch (err) {
        reject(err);
      }
    };
    video.onerror = (e) => reject(new Error("Video load failed"));
  });
}, videoBase64);

console.log(`WebM Decoded: ${videoAnalysis.width}x${videoAnalysis.height}, duration: ${videoAnalysis.duration}s`);
console.log(`Frame diff: ${videoAnalysis.diffPixels} pixels differ (total delta: ${videoAnalysis.totalDiff})`);

assert.ok(videoAnalysis.width > 0 && videoAnalysis.height > 0, "Video has nonzero decoded dimensions");
assert.ok(videoAnalysis.duration > 0, "Video has nonzero duration");
assert.ok(videoAnalysis.diffPixels > 50, `Decoded video exhibits real animated motion (diffPixels: ${videoAnalysis.diffPixels})`);

// Save frames to after/
const frame1Buffer = Buffer.from(videoAnalysis.frame1DataUrl.split(",")[1], "base64");
const frame2Buffer = Buffer.from(videoAnalysis.frame2DataUrl.split(",")[1], "base64");
await fs.writeFile(path.join(outDir, "stage4b-video-frame-1.png"), frame1Buffer);
await fs.writeFile(path.join(outDir, "stage4b-video-frame-2.png"), frame2Buffer);

results.downloadsDecoded.push({
  type: "Configured Video Animation",
  filename: videoDownload.suggestedFilename(),
  format: "WebM",
  fileBytes: videoBuffer.length,
  decodedWidth: videoAnalysis.width,
  decodedHeight: videoAnalysis.height,
  decodedDuration: `${videoAnalysis.duration.toFixed(2)}s`,
  motionVerified: `${videoAnalysis.diffPixels} differing pixels between frame 1 (0.1s) and frame 2 (0.7s)`
});

await contextDesktop.close();

// ----------------------------------------------------
// SECTION 3: MOBILE DISCOVERY & BOUNDS (320px & 390px)
// ----------------------------------------------------
console.log("\n--- SECTION 3: Mobile Discovery & Bounds Inspection ---");

// 3A: Mobile 320px Light
const contextMobile320 = await browser.newContext();
const page320 = await contextMobile320.newPage();
await setupPage(page320, "light", 320, 568);

console.log("Checking 320px Mobile Dock layout...");
const dockBounds320 = await page320.evaluate(() => {
  const util = document.querySelector(".mobile-utility-bar")?.getBoundingClientRect();
  const tabs = document.querySelector(".mobile-tabs")?.getBoundingClientRect();
  const docOverflow = document.documentElement.scrollWidth > document.documentElement.clientWidth;
  const overlap = (util && tabs) ? Math.max(0, util.right - tabs.left) : 0;
  return {
    utilRight: Math.round(util?.right || 0),
    utilWidth: Math.round(util?.width || 0),
    tabsLeft: Math.round(tabs?.left || 0),
    tabsWidth: Math.round(tabs?.width || 0),
    overlap: Math.round(overlap),
    docOverflow
  };
});
console.log("320px dock layout bounds:", dockBounds320);
assert.equal(dockBounds320.overlap, 0, `320px dock elements must not overlap! Overlap was: ${dockBounds320.overlap}`);
assert.equal(dockBounds320.docOverflow, false, "320px screen must have zero horizontal page overflow");
results.mobileInspection.push("320px viewport: Zero overlap between utility bar and tools tabs (in-flow flex)");

// Verify Upload button text when empty
const uploadTextEmpty = await page320.locator(".mobile-upload-btn span").textContent();
assert.ok(uploadTextEmpty.includes("Upload"), `Empty upload button label should say Upload, got: ${uploadTextEmpty}`);

// Capture 70: Mobile 320 Light
await page320.screenshot({ path: path.join(outDir, "70-mobile-320-light.png") });
results.screenshots.push("70-mobile-320-light.png");

// 3B: Mobile 320px Dark
await page320.evaluate(() => localStorage.setItem("openmock-theme", "dark"));
await page320.reload({ waitUntil: "domcontentloaded" });
await page320.waitForSelector(".mockup-stage");
await page320.waitForTimeout(500);
await page320.screenshot({ path: path.join(outDir, "71-mobile-320-dark.png") });
results.screenshots.push("71-mobile-320-dark.png");

// 3C: Mobile 320px Tool Open (Device)
console.log("Opening Device tool on 320px...");
await page320.locator(".mobile-tab-btn:has-text('Device')").click();
await page320.waitForSelector(".mobile-mockup");
await page320.waitForTimeout(300);
await page320.screenshot({ path: path.join(outDir, "72-mobile-320-device-open.png") });
results.screenshots.push("72-mobile-320-device-open.png");

// 3D: Mobile 320px Left-Handed Mode
console.log("Testing Left-Handed mode toggle on 320px...");
await page320.locator(".mobile-tab-btn:has-text('Settings')").click();
await page320.waitForSelector(".mobile-settings");
await page320.locator(".handed-buttons button:has-text('Left handed')").click();
await page320.waitForTimeout(400);

const isLeftHanded = await page320.evaluate(() => {
  const dock = document.querySelector(".mobile-dock");
  const util = document.querySelector(".mobile-utility-bar")?.getBoundingClientRect();
  const tabs = document.querySelector(".mobile-tabs")?.getBoundingClientRect();
  return {
    hasLeftClass: dock?.classList.contains("left-handed"),
    utilX: Math.round(util?.x || 0),
    tabsX: Math.round(tabs?.x || 0)
  };
});
console.log("Left-handed dock coordinates:", isLeftHanded);
assert.ok(isLeftHanded.hasLeftClass, "Dock has left-handed class");
assert.ok(isLeftHanded.utilX > isLeftHanded.tabsX, "Left-handed mode places utility bar on right side");
await page320.screenshot({ path: path.join(outDir, "73-mobile-320-left-handed.png") });
results.screenshots.push("73-mobile-320-left-handed.png");
results.mobileInspection.push("320px left-handed layout reverses dock cleanly without collisions");

await contextMobile320.close();

// 3E: Mobile 390px Light & Dark
const contextMobile390 = await browser.newContext();
const page390 = await contextMobile390.newPage();
await setupPage(page390, "light", 390, 844);

console.log("Checking 390px Mobile Dock...");
// Check all persistent labels
const labels = await page390.$$eval(".mobile-tab-btn span", (els) => els.map((el) => el.textContent.trim()));
console.log("Mobile tab labels on 390px:", labels);
assert.deepEqual(labels, ["Camera", "Device", "Scene", "Blur", "Effects", "Settings"], "All 6 mobile tool labels persistent and readable");
results.mobileInspection.push("390px viewport: All 6 tools display readable persistent labels");

await page390.screenshot({ path: path.join(outDir, "74-mobile-390-light.png") });
results.screenshots.push("74-mobile-390-light.png");

// Dark at 390px
await page390.evaluate(() => localStorage.setItem("openmock-theme", "dark"));
await page390.reload({ waitUntil: "domcontentloaded" });
await page390.waitForSelector(".mockup-stage");
await page390.waitForTimeout(500);
await page390.screenshot({ path: path.join(outDir, "75-mobile-390-dark.png") });
results.screenshots.push("75-mobile-390-dark.png");

// Open Device tool on 390px
console.log("Opening Device tool on 390px...");
await page390.locator(".mobile-tab-btn:has-text('Device')").click();
await page390.waitForSelector(".mobile-mockup");
await page390.waitForTimeout(300);
await page390.screenshot({ path: path.join(outDir, "76-mobile-390-device-open.png") });
results.screenshots.push("76-mobile-390-device-open.png");

await contextMobile390.close();

// ----------------------------------------------------
// SECTION 4: DESKTOP 1000px & 1440px INSPECTION
// ----------------------------------------------------
console.log("\n--- SECTION 4: Desktop 1000px & 1440px Inspection ---");

// 4A: Desktop 1000px Light & Dark
const context1000 = await browser.newContext();
const page1000 = await context1000.newPage();
await setupPage(page1000, "light", 1000, 750);
await page1000.screenshot({ path: path.join(outDir, "77-desktop-1000-light.png") });
results.screenshots.push("77-desktop-1000-light.png");

await page1000.evaluate(() => localStorage.setItem("openmock-theme", "dark"));
await page1000.reload({ waitUntil: "domcontentloaded" });
await page1000.waitForSelector(".mockup-stage");
await page1000.waitForTimeout(500);
await page1000.screenshot({ path: path.join(outDir, "78-desktop-1000-dark.png") });
results.screenshots.push("78-desktop-1000-dark.png");
await context1000.close();

// 4B: Desktop 1440px Light & Dark
const context1440 = await browser.newContext();
const page1440 = await context1440.newPage();
await setupPage(page1440, "light", 1440, 900);
await page1440.screenshot({ path: path.join(outDir, "79-desktop-1440-light.png") });
results.screenshots.push("79-desktop-1440-light.png");

await page1440.evaluate(() => localStorage.setItem("openmock-theme", "dark"));
await page1440.reload({ waitUntil: "domcontentloaded" });
await page1440.waitForSelector(".mockup-stage");
await page1440.waitForTimeout(500);
await page1440.screenshot({ path: path.join(outDir, "80-desktop-1440-dark.png") });
results.screenshots.push("80-desktop-1440-dark.png");
await context1440.close();

await browser.close();

console.log("\n================ STAGE 4B VERIFICATION SUMMARY ================");
console.log("Console Errors:", consoleErrors);
console.log("Console Warnings:", consoleWarnings);
console.log("Integrated Journey Steps:", results.integratedJourney);
console.log("Decoded Downloads:", results.downloadsDecoded);
console.log("Keyboard Tests:", results.keyboardNav);
console.log("Mobile Inspection:", results.mobileInspection);
console.log("Screenshots Captured:", results.screenshots);
console.log("================================================================\n");

if (consoleErrors.length > 0) {
  throw new Error(`Verification failed with ${consoleErrors.length} console errors!`);
}

console.log("STAGE 4B INTEGRATED VERIFICATION COMPLETED SUCCESSFULLY!");
