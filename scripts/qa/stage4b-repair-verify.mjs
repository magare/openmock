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

console.log("=== FINAL VERIFICATION REPAIR: RECOGNIZABLE CONTENT & EXPORTER AUDIT ===");

const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ acceptDownloads: true });
const page = await context.newPage();
await page.setViewportSize({ width: 1440, height: 900 });

const consoleErrors = [];
const consoleWarnings = [];
page.on("console", (msg) => {
  if (msg.type() === "error") {
    const text = msg.text();
    if (!text.includes("favicon") && !text.includes("ERR_CONNECTION_REFUSED")) {
      consoleErrors.push(text);
    }
  } else if (msg.type() === "warning") {
    consoleWarnings.push(msg.text());
  }
});
page.on("pageerror", (err) => {
  consoleErrors.push(`PageError: ${err.message}`);
});

await page.goto(URL, { waitUntil: "domcontentloaded" });
await page.evaluate(() => {
  localStorage.removeItem("openmock-project");
  localStorage.setItem("openmock-tour-seen", "1");
  localStorage.setItem("openmock-mobile-onboarded", "1");
  localStorage.setItem("openmock-show-tips", "0");
  localStorage.setItem("openmock-theme", "light");
});
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector(".mockup-stage", { timeout: 20000 });
await page.waitForTimeout(800);

// ----------------------------------------------------
// Step 1: Upload recognizable multicolor image with large TEST text
// ----------------------------------------------------
console.log("1. Uploading test-screen-media.png with large TEST text...");
const testImgPath = path.join(outDir, "test-screen-media.png");
const testImgBuffer = await fs.readFile(testImgPath);

const fileChooserPromise = page.waitForEvent("filechooser");
await page.locator("button.source-card-empty").click();
const fileChooser = await fileChooserPromise;
await fileChooser.setFiles({
  name: "test-screen-media.png",
  mimeType: "image/png",
  buffer: testImgBuffer,
});

await page.waitForSelector(".source-card-filled", { timeout: 8000 });
await page.waitForTimeout(1500); // Allow Three.js to load and bind screen texture

const filledFilename = await page.locator(".source-card-filled").innerText();
console.log("Filled card text:", filledFilename);
assert.ok(filledFilename.includes("test-screen-media.png"), "Uploaded test image displayed in source card");

// ----------------------------------------------------
// Step 2: Verify recognizable image appears on preview device
// ----------------------------------------------------
console.log("2. Verifying test image appears on preview device...");
await page.screenshot({ path: path.join(outDir, "81-stage-preview-recognizable-media.png") });
console.log("Saved preview screenshot: 81-stage-preview-recognizable-media.png");

// Also test changing device to Surface Laptop 15"
console.log("Selecting Surface Laptop 15\"...");
await page.locator(".mockup-summary button.change-button").click();
await page.waitForSelector(".mockup-filter-bar");
await page.locator(".mockup-filter-btn:has-text('Laptops')").click();
await page.waitForTimeout(200);
await page.locator(".mockup-picker-grid button:has-text('Surface Laptop 15\"')").click();
await page.waitForTimeout(1500); // Allow 3D laptop model and screen texture to settle

const previewDeviceTitle = await page.locator(".mockup-summary strong").innerText();
console.log("Active preview device:", previewDeviceTitle);
assert.ok(previewDeviceTitle.includes("SURFACE LAPTOP 15\""), "Surface Laptop selected in preview");

await page.screenshot({ path: path.join(outDir, "81b-stage-preview-surface-laptop.png") });
console.log("Saved Surface Laptop preview screenshot: 81b-stage-preview-surface-laptop.png");

// ----------------------------------------------------
// Step 3: Export Still Image and Decode
// ----------------------------------------------------
console.log("3. Exporting Configured Still Image (PNG)...");
await page.locator(".export-button").click();
await page.waitForSelector(".export-popover");
await page.waitForTimeout(300);

await page.selectOption(".export-body.image-export label:has-text('Image format') select", "png");
await page.waitForTimeout(200);

const [pngDownload] = await Promise.all([
  page.waitForEvent("download"),
  page.locator(".image-export .primary-wide").click()
]);

const pngExportPath = path.join(outDir, "82-exported-still-recognizable-media.png");
await pngDownload.saveAs(pngExportPath);
const pngBuffer = await fs.readFile(pngExportPath);
console.log(`Saved exported still image: ${pngExportPath} (${pngBuffer.length} bytes)`);

// Decode still in browser to verify dimensions
const stillDecoded = await page.evaluate(async (b64) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = `data:image/png;base64,${b64}`;
  });
}, pngBuffer.toString("base64"));
console.log("Decoded Still Image Dimensions:", stillDecoded);

// ----------------------------------------------------
// Step 4: Export Short Video Animation (WebM) and Decode Frames
// ----------------------------------------------------
console.log("4. Exporting Short Video Animation (WebM)...");
// Ensure export popover is open
const popoverVisible = await page.locator(".export-popover").isVisible();
if (!popoverVisible) {
  await page.locator(".export-button").click();
  await page.waitForSelector(".export-popover");
  await page.waitForTimeout(300);
}

await page.locator("#export-tab-video").click();
await page.waitForSelector(".video-export");
await page.waitForTimeout(200);

// Set duration to 1s
await page.evaluate(() => {
  const durSelect = document.querySelector(".timeline-duration select");
  if (durSelect) {
    durSelect.value = "1";
    durSelect.dispatchEvent(new Event("change", { bubbles: true }));
  }
});

const [videoDownload] = await Promise.all([
  page.waitForEvent("download", { timeout: 35000 }),
  page.locator(".video-export .primary-wide").click()
]);

const videoExportPath = path.join(downloadsDir, "stage4b-repair-animation.webm");
await videoDownload.saveAs(videoExportPath);
const videoBuffer = await fs.readFile(videoExportPath);
console.log(`Saved exported video: ${videoExportPath} (${videoBuffer.length} bytes)`);

// Decode WebM in browser and extract frames
const videoAnalysis = await page.evaluate(async (b64) => {
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

        // Frame 2 at 0.7s
        const t2 = Math.min(Math.max(duration - 0.2, 0.3), 0.8);
        await seek(t2);
        ctx.drawImage(video, 0, 0, width, height);
        const frame2DataUrl = canvas.toDataURL("image/png");

        resolve({ width, height, duration, frame1DataUrl, frame2DataUrl });
      } catch (err) {
        reject(err);
      }
    };
    video.onerror = (e) => reject(new Error("Video load failed: " + e.message));
  });
}, videoBuffer.toString("base64"));

console.log(`Decoded Video: ${videoAnalysis.width}x${videoAnalysis.height}, duration: ${videoAnalysis.duration.toFixed(2)}s`);

const frame1Buffer = Buffer.from(videoAnalysis.frame1DataUrl.split(",")[1], "base64");
const frame2Buffer = Buffer.from(videoAnalysis.frame2DataUrl.split(",")[1], "base64");
await fs.writeFile(path.join(outDir, "83-video-frame-1-recognizable-media.png"), frame1Buffer);
await fs.writeFile(path.join(outDir, "84-video-frame-2-recognizable-media.png"), frame2Buffer);
console.log("Saved video frames: 83-video-frame-1-recognizable-media.png, 84-video-frame-2-recognizable-media.png");

await context.close();
await browser.close();

console.log("\n--- AUDIT SUMMARY ---");
console.log("Console Errors:", consoleErrors);
console.log("Preview Device Selection: Surface Laptop 15\" selected in 3D WebGL preview stage");
console.log("Exported Media Decoded Dimensions:", stillDecoded);
console.log("Exported Video Decoded Dimensions:", { width: videoAnalysis.width, height: videoAnalysis.height, duration: videoAnalysis.duration });
console.log("=== FINAL VERIFICATION REPAIR RUN FINISHED ===");
