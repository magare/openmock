import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";

const outDir = "evidence/qa/usability-stages/after";
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

const resetToFresh = async () => {
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
  await page.waitForTimeout(1000);
};

console.log("1. Testing Keyboard Focus & Enter/Space on empty SourceCard...");
await resetToFresh();

const emptyCard = page.locator("button.source-card-empty");
assert.equal(await emptyCard.count(), 1, "There must be exactly one native button for the empty card");

// Focus the card using keyboard Tab
await emptyCard.focus();
const isFocused = await page.evaluate(() => document.activeElement === document.querySelector("button.source-card-empty"));
assert.ok(isFocused, "Native button must receive keyboard focus");

// Verify Enter key triggers exactly ONE file chooser
let chooserCount = 0;
page.on("filechooser", () => {
  chooserCount += 1;
});

const enterChooserPromise = page.waitForEvent("filechooser");
await page.keyboard.press("Enter");
const enterChooser = await enterChooserPromise;
assert.equal(chooserCount, 1, "Enter on empty card must trigger exactly one file chooser");

// Cancel/dismiss file chooser without selecting files
// In playwright, not calling setFiles or continuing simulates cancel
await page.waitForTimeout(400);

// Verify state is preserved (still empty, no crash, no media)
assert.ok(await page.locator("button.source-card-empty").isVisible(), "Dismissing file chooser must preserve empty state");

// Reset chooser count for Space test
chooserCount = 0;
await emptyCard.focus();
const spaceChooserPromise = page.waitForEvent("filechooser");
await page.keyboard.press("Space");
const spaceChooser = await spaceChooserPromise;
assert.equal(chooserCount, 1, "Space on empty card must trigger exactly one file chooser");

// Upload a 1x1 test image via space chooser
const samplePngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
await spaceChooser.setFiles({
  name: "app-screen-space.png",
  mimeType: "image/png",
  buffer: Buffer.from(samplePngBase64, "base64"),
});
await page.waitForTimeout(800);

assert.ok(await page.locator(".source-card-filled").isVisible(), "Space upload must transition to filled state");

console.log("2. Testing Pointer Behavior...");
// Remove media to return to empty
await page.locator(".source-card-filled button.remove-btn").click();
await page.waitForTimeout(400);
assert.ok(await page.locator("button.source-card-empty").isVisible(), "Clicking remove must return to empty state");

chooserCount = 0;
const clickChooserPromise = page.waitForEvent("filechooser");
await page.locator("button.source-card-empty").click();
const clickChooser = await clickChooserPromise;
assert.equal(chooserCount, 1, "Clicking empty card with pointer must trigger exactly one file chooser");

console.log("3. Testing Long Filename Truncation & No Overlap at Desktop Widths...");
const longName = "very-long-production-app-mockup-screenshot-final-v2-marketing-export-2026.png";
await clickChooser.setFiles({
  name: longName,
  mimeType: "image/png",
  buffer: Buffer.from(samplePngBase64, "base64"),
});
await page.waitForTimeout(1000);

// Measure bounding boxes
const titleBox = await page.locator(".source-card-text strong").boundingBox();
const replaceBox = await page.locator(".source-card-actions button.replace-btn").boundingBox();

console.log(`Title box: x=${titleBox.x.toFixed(1)}, width=${titleBox.width.toFixed(1)}, right=${(titleBox.x + titleBox.width).toFixed(1)}`);
console.log(`Replace box: x=${replaceBox.x.toFixed(1)}, width=${replaceBox.width.toFixed(1)}`);

const gap = replaceBox.x - (titleBox.x + titleBox.width);
console.log(`Measured gap between truncated filename and Replace button: ${gap.toFixed(1)}px`);
assert.ok(gap >= 6, `Gap between filename and Replace button must be at least 6px (actual: ${gap}px)`);

// Verify text overflow ellipsis in CSS
const textOverflow = await page.locator(".source-card-text strong").evaluate((el) => {
  const s = window.getComputedStyle(el);
  return { textOverflow: s.textOverflow, overflow: s.overflow, whiteSpace: s.whiteSpace };
});
assert.equal(textOverflow.textOverflow, "ellipsis", "Filename must have text-overflow: ellipsis");
assert.equal(textOverflow.overflow, "hidden", "Filename must have overflow: hidden");
assert.equal(textOverflow.whiteSpace, "nowrap", "Filename must have white-space: nowrap");

await page.screenshot({ path: `${outDir}/10-long-filename-truncation.png` });

console.log("4. Testing 'Flat' Mockup Label Accurately as 2D CANVAS...");
// Open Mockup section and choose Flat
await page.locator(".mockup-summary button.change-button").click();
await page.waitForTimeout(400);

const flatBtn = page.locator(".mockup-picker-grid button").filter({ hasText: "Flat" });
await flatBtn.click();
await page.waitForTimeout(1000);

const flatSummaryText = await page.locator(".mockup-summary").innerText();
console.log("Flat mockup summary text:", JSON.stringify(flatSummaryText));
assert.ok(flatSummaryText.includes("FLAT"), "Summary must display FLAT");
assert.ok(flatSummaryText.includes("2D CANVAS"), "Flat must be labeled as '2D CANVAS'");
assert.ok(!flatSummaryText.includes("3D MODEL"), "Flat must NOT be labeled as '3D MODEL'");

await page.screenshot({ path: `${outDir}/11-flat-label-2d-canvas.png` });

console.log("5. Checking console logs...");
console.log("Console errors:", consoleErrors.length);
assert.equal(consoleErrors.length, 0, "No console errors should occur");

await browser.close();
console.log("STAGE 1 REPAIR VERIFICATION COMPLETED SUCCESSFULLY!");
