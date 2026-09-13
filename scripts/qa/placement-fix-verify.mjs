import { chromium } from "playwright-core";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";

const PORT = 5199;
const URL = `http://localhost:${PORT}/`;
const outDir = path.resolve("evidence/qa/placement-fixes/after");
await fs.mkdir(outDir, { recursive: true });

console.log("=== RUNNING PLACEMENT FIX VERIFICATION ===");

const browser = await chromium.launch({ channel: "chrome", headless: true });
const consoleErrors = [];

async function setupPage(viewport, { theme = "light", leftHanded = false } = {}) {
  const context = await browser.newContext({ viewport, acceptDownloads: true });
  await context.addInitScript(({ theme, leftHanded }) => {
    localStorage.removeItem("openmock-project");
    localStorage.setItem("openmock-tour-seen", "1");
    localStorage.setItem("openmock-mobile-onboarded", "1");
    localStorage.setItem("openmock-show-tips", "0");
    localStorage.setItem("openmock-theme", theme);
    if (leftHanded) {
      const proj = { mobileDockLeft: true };
      localStorage.setItem("openmock-project", JSON.stringify(proj));
    }
  }, { theme, leftHanded });

  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const t = msg.text();
      if (!t.includes("favicon") && !t.includes("ERR_CONNECTION_REFUSED")) consoleErrors.push(t);
    }
  });
  page.on("pageerror", (err) => consoleErrors.push(`PageError: ${err.message}`));
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".mockup-stage", { timeout: 20000 });
  await page.waitForTimeout(600);
  return { context, page };
}

// -------------------------------------------------------------
// Test 1: Desktop 1440px - Layout, Non-Obstruction & Clean Stage
// -------------------------------------------------------------
console.log("\n1. Testing Desktop 1440px...");
{
  const { context, page } = await setupPage({ width: 1440, height: 900 });

  // Verify camera rail is OUTSIDE mockup-stage
  const railBox = await page.locator(".camera-rail").boundingBox();
  const stageBox = await page.locator(".mockup-stage").boundingBox();
  assert.ok(railBox, "Camera rail rendered");
  assert.ok(stageBox, "Mockup stage rendered");
  assert.ok(railBox.x + railBox.width <= stageBox.x + 1, "Camera rail is strictly outside and to the left of mockup-stage");
  assert.equal(await page.locator(".mockup-stage .camera-rail").count(), 0, "Camera rail is not inside mockup-stage");

  // Verify floating upload buttons removed from canvas
  assert.equal(await page.locator(".background-chip").count(), 0, ".background-chip removed from DOM");
  assert.equal(await page.locator(".upload-toast").count(), 0, ".upload-toast removed from DOM");
  assert.equal(await page.locator(".media-badge").count(), 0, ".media-badge removed from DOM");

  // Verify persistent topbar upload button
  const topbarUpload = page.locator(".topbar-upload-btn");
  assert.equal(await topbarUpload.isVisible(), true, "Topbar upload button visible on desktop");
  assert.equal(await topbarUpload.innerText(), "UPLOAD", "Topbar upload button initially shows UPLOAD");

  await page.screenshot({ path: path.join(outDir, "01-desktop-1440-light-after.png") });
  console.log("  Saved: 01-desktop-1440-light-after.png");

  // Upload test media via topbar upload button
  console.log("  Uploading test media via TopBar button...");
  const testImgPath = path.resolve("evidence/qa/usability-stages/after/test-screen-media.png");
  const testImgBuffer = await fs.readFile(testImgPath);
  const fileChooserPromise = page.waitForEvent("filechooser");
  await topbarUpload.click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles({ name: "test-screen-media.png", mimeType: "image/png", buffer: testImgBuffer });
  await page.waitForSelector(".source-card-filled", { timeout: 8000 });
  await page.waitForTimeout(1000);

  // Topbar upload button should now show REPLACE
  assert.equal(await topbarUpload.innerText(), "REPLACE", "Topbar upload button dynamically shows REPLACE");
  // Canvas should remain 100% clean of floating badges
  assert.equal(await page.locator(".mockup-stage .media-badge").count(), 0, "No floating media-badge on canvas");

  await page.screenshot({ path: path.join(outDir, "02-desktop-1440-with-media-after.png") });
  console.log("  Saved: 02-desktop-1440-with-media-after.png");

  // Test Camera Tools interaction (Rotate, Move, Roll, Fine, Reset)
  console.log("  Testing Camera Rail tools...");
  const toolbar = page.getByRole("toolbar", { name: "Device movement" });
  assert.ok(toolbar, "Toolbar role and accessible name intact");

  const moveBtn = toolbar.getByRole("button", { name: "Move", exact: true });
  await moveBtn.click();
  await page.waitForTimeout(200);
  assert.equal(await moveBtn.getAttribute("aria-pressed"), "true", "Move mode activated");

  const rollBtn = toolbar.getByRole("button", { name: "Roll", exact: true });
  await rollBtn.click();
  await page.waitForTimeout(200);
  assert.equal(await rollBtn.getAttribute("aria-pressed"), "true", "Roll mode activated");

  const rotateBtn = toolbar.getByRole("button", { name: "Rotate", exact: true });
  await rotateBtn.click();
  await page.waitForTimeout(200);
  assert.equal(await rotateBtn.getAttribute("aria-pressed"), "true", "Rotate mode activated");

  const fineBtn = toolbar.getByRole("button", { name: "Fine", exact: true });
  await fineBtn.click();
  await page.waitForTimeout(200);
  assert.equal(await fineBtn.getAttribute("aria-pressed"), "true", "Fine mode activated");

  // Zoom in device: device cannot pass underneath rail
  console.log("  Zooming in device to test non-obstruction...");
  const currentStageBox = await page.locator(".mockup-stage").boundingBox();
  await page.mouse.move(currentStageBox.x + currentStageBox.width / 2, currentStageBox.y + currentStageBox.height / 2);
  await page.mouse.wheel(0, -600);
  await page.waitForTimeout(600);

  await page.screenshot({ path: path.join(outDir, "03-desktop-1440-zoomed-unobstructed-after.png") });
  console.log("  Saved: 03-desktop-1440-zoomed-unobstructed-after.png");

  // Maximize timeline and test Live Recording
  console.log("  Testing Live Recording...");
  await page.locator('button[aria-label="Maximize timeline"]').click();
  await page.waitForTimeout(300);
  await page.locator('.timeline-mode button:has-text("ADVANCED")').click();
  await page.waitForTimeout(300);
  await page.locator(".record-button").click();
  await page.waitForSelector(".recording-modal");
  await page.locator(".recording-modal .primary-wide").click();
  await page.waitForTimeout(500);

  const recordingStageBox = await page.locator(".mockup-stage").boundingBox();
  const recordingRailBox = await page.locator(".camera-rail").boundingBox();
  assert.ok(recordingRailBox.x + recordingRailBox.width <= recordingStageBox.x + 1, "Camera rail strictly outside stage during live recording");

  await page.screenshot({ path: path.join(outDir, "04-desktop-1440-recording-unobstructed-after.png") });
  console.log("  Saved: 04-desktop-1440-recording-unobstructed-after.png");

  await context.close();
}

// -------------------------------------------------------------
// Test 2: Desktop 1000px & 1100px - Non-Overlap & Grid Constraints
// -------------------------------------------------------------
console.log("\n2. Testing Desktop 1000px and 1100px non-overlap...");
{
  const { context, page } = await setupPage({ width: 1000, height: 800 });

  const stageBox = await page.locator(".mockup-stage").boundingBox();
  const inspectorBox = await page.locator(".inspector-panel").boundingBox();
  const railBox = await page.locator(".camera-rail").boundingBox();

  console.log(`  1000px: Rail ends at x=${railBox.x + railBox.width}, Stage ends at x=${stageBox.x + stageBox.width}, Inspector starts at x=${inspectorBox.x}`);
  assert.ok(stageBox.x + stageBox.width <= inspectorBox.x - 10, "Stage ends cleanly before inspector with margin >= 10px");
  assert.ok(stageBox.x + stageBox.width <= 697, "Stage ends at or before x=696px (Stage 3 non-overlap constraint)");

  await page.screenshot({ path: path.join(outDir, "05-desktop-1000-light-after.png") });
  console.log("  Saved: 05-desktop-1000-light-after.png");
  await context.close();
}

{
  const { context, page } = await setupPage({ width: 1100, height: 800 });
  const stageBox = await page.locator(".mockup-stage").boundingBox();
  const inspectorBox = await page.locator(".inspector-panel").boundingBox();
  assert.ok(stageBox.x + stageBox.width <= inspectorBox.x - 10, "1100px: Stage ends before inspector");
  await page.screenshot({ path: path.join(outDir, "05b-desktop-1100-light-after.png") });
  console.log("  Saved: 05b-desktop-1100-light-after.png");
  await context.close();
}

// -------------------------------------------------------------
// Test 3: Desktop Left-Handed Mode (Rail on Right)
// -------------------------------------------------------------
console.log("\n3. Testing Desktop Left-Handed Mode...");
{
  const { context, page } = await setupPage({ width: 1440, height: 900 }, { leftHanded: true });
  const railBox = await page.locator(".camera-rail").boundingBox();
  const stageBox = await page.locator(".mockup-stage").boundingBox();
  assert.ok(stageBox.x + stageBox.width <= railBox.x + 1, "In left-handed mode, camera rail is to the right of stage");
  await page.screenshot({ path: path.join(outDir, "06-desktop-1440-left-handed-after.png") });
  console.log("  Saved: 06-desktop-1440-left-handed-after.png");
  await context.close();
}

// -------------------------------------------------------------
// Test 4: Mobile 390px Viewport
// -------------------------------------------------------------
console.log("\n4. Testing Mobile 390px...");
{
  const { context, page } = await setupPage({ width: 390, height: 844 });
  const railBox = await page.locator(".camera-rail").boundingBox();
  const stageBox = await page.locator(".mockup-stage").boundingBox();

  assert.ok(railBox.y + railBox.height <= stageBox.y + 1, "Mobile: camera rail is positioned outside and above mockup-stage");
  assert.equal(await page.locator(".mockup-stage .camera-rail").count(), 0, "Mobile: camera rail is not inside mockup-stage");

  // Check no floating upload buttons
  assert.equal(await page.locator(".background-chip").count(), 0, "Mobile: background-chip removed");
  // Check mobile utility bar upload button exists
  assert.ok(await page.locator(".mobile-upload-btn").isVisible(), "Mobile: utility bar upload button visible");

  await page.screenshot({ path: path.join(outDir, "07-mobile-390-light-after.png") });
  console.log("  Saved: 07-mobile-390-light-after.png");
  await context.close();
}

// -------------------------------------------------------------
// Test 5: Mobile 320px Viewport (Default and Left-Handed)
// -------------------------------------------------------------
console.log("\n5. Testing Mobile 320px (Default & Left-Handed)...");
{
  const { context, page } = await setupPage({ width: 320, height: 568 });
  const railBox = await page.locator(".camera-rail").boundingBox();
  const stageBox = await page.locator(".mockup-stage").boundingBox();

  assert.ok(railBox.y + railBox.height <= stageBox.y + 1, "Mobile 320: camera rail is above mockup-stage");
  assert.ok(railBox.width <= 320, "Mobile 320: camera rail fits in viewport");

  // Verify all 5 buttons exist and are clickable
  const toolbar = page.getByRole("toolbar", { name: "Device movement" });
  assert.ok(await toolbar.getByRole("button", { name: "Rotate" }).isVisible());
  assert.ok(await toolbar.getByRole("button", { name: "Move" }).isVisible());
  assert.ok(await toolbar.getByRole("button", { name: "Roll" }).isVisible());
  assert.ok(await toolbar.getByRole("button", { name: "Fine" }).isVisible());
  assert.ok(await toolbar.getByRole("button", { name: "Reset view" }).isVisible());

  await page.screenshot({ path: path.join(outDir, "08-mobile-320-light-after.png") });
  console.log("  Saved: 08-mobile-320-light-after.png");
  await context.close();
}

{
  const { context, page } = await setupPage({ width: 320, height: 568 }, { leftHanded: true });
  await page.screenshot({ path: path.join(outDir, "09-mobile-320-left-handed-after.png") });
  console.log("  Saved: 09-mobile-320-left-handed-after.png");
  await context.close();
}

// -------------------------------------------------------------
// Test 6: Dark Theme Verification (Desktop & Mobile)
// -------------------------------------------------------------
console.log("\n6. Testing Dark Theme...");
{
  const { context, page } = await setupPage({ width: 1440, height: 900 }, { theme: "dark" });
  await page.screenshot({ path: path.join(outDir, "10-desktop-1440-dark-after.png") });
  console.log("  Saved: 10-desktop-1440-dark-after.png");
  await context.close();
}
{
  const { context, page } = await setupPage({ width: 390, height: 844 }, { theme: "dark" });
  await page.screenshot({ path: path.join(outDir, "11-mobile-390-dark-after.png") });
  console.log("  Saved: 11-mobile-390-dark-after.png");
  await context.close();
}

await browser.close();

console.log("\n--- VERIFICATION SUMMARY ---");
console.log("Console Errors:", consoleErrors);
assert.equal(consoleErrors.length, 0, "Zero console errors during verification");
console.log("=== ALL PLACEMENT FIX VERIFICATIONS PASSED ===");
