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

const resetStorage = async () => {
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

console.log("1. Verifying Desktop Light Empty State...");
await resetStorage();

// Check SourceCard empty state elements
const emptyCard = page.locator(".source-card-empty");
await assert.doesNotReject(async () => await emptyCard.waitFor({ timeout: 5000 }));
const emptyText = await emptyCard.innerText();
assert.ok(emptyText.includes("Upload screen"), "Empty state must display 'Upload screen'");
assert.ok(emptyText.includes("Drop image or video, paste, or browse"), "Empty state must display clear subtitle");
assert.ok(emptyText.includes("PNG · JPG · MP4 · WEBM"), "Empty state must display format hint");
assert.ok(await emptyCard.locator(".source-browse-btn").isVisible(), "Browse indicator must be visible");

// Check InspectorSection SOURCE meta
const sourceSectionHead = page.locator(".inspector-section").first().locator(".inspector-section-head");
const sourceMeta = await sourceSectionHead.locator("small").innerText();
assert.equal(sourceMeta, "EMPTY", "Source section header meta must show EMPTY");

await page.screenshot({ path: `${outDir}/01-desktop-empty-light.png` });

console.log("2. Verifying Desktop Dark Empty State...");
await page.evaluate(() => localStorage.setItem("openmock-theme", "dark"));
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector(".mockup-stage", { timeout: 20000 });
await page.waitForTimeout(800);
await page.screenshot({ path: `${outDir}/02-desktop-empty-dark.png` });

console.log("3. Verifying Add Media flow...");
await page.evaluate(() => localStorage.setItem("openmock-theme", "light"));
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector(".mockup-stage", { timeout: 20000 });
await page.waitForTimeout(800);

// Upload sample image 1 (Red 1x1 PNG)
const redPngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const fileChooserPromise1 = page.waitForEvent("filechooser");
await page.locator("button.source-card-empty").click();
const fileChooser1 = await fileChooserPromise1;
await fileChooser1.setFiles({
  name: "app-hero-screen.png",
  mimeType: "image/png",
  buffer: Buffer.from(redPngBase64, "base64"),
});
await page.waitForTimeout(1000);

// Verify filled card state
const filledCard = page.locator(".source-card-filled");
await assert.doesNotReject(async () => await filledCard.waitFor({ timeout: 5000 }));
const filledText = await filledCard.innerText();
assert.ok(filledText.includes("app-hero-screen.png"), "Filled card must show filename");
assert.ok(filledText.includes("IMAGE SOURCE"), "Filled card must show IMAGE SOURCE");

// Verify Replace and Remove buttons are visible
const replaceBtn = filledCard.locator("button.replace-btn");
const removeBtn = filledCard.locator("button.remove-btn");
assert.ok(await replaceBtn.isVisible(), "Replace button must be visible");
assert.ok(await removeBtn.isVisible(), "Remove button must be visible");

// Verify contextual next guidance
const nextGuidance = page.locator(".source-next-guidance");
assert.ok(await nextGuidance.isVisible(), "Contextual next guidance must be visible");
const nextGuidanceText = await nextGuidance.innerText();
assert.ok(nextGuidanceText.includes("Active on iPhone 17"), "Next guidance must reference active mockup");
assert.ok(nextGuidanceText.includes("Change device →"), "Next guidance must offer Change device action");

// Verify source header meta is ACTIVE
const sourceMetaActive = await page.locator(".inspector-section").first().locator(".inspector-section-head small").innerText();
assert.equal(sourceMetaActive, "ACTIVE", "Source section header meta must show ACTIVE");

await page.screenshot({ path: `${outDir}/03-desktop-media-filled.png` });

console.log("4. Verifying Replace Media flow...");
// Upload sample image 2 (Green 1x1 PNG)
const greenPngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const fileChooserPromise2 = page.waitForEvent("filechooser");
await replaceBtn.click();
const fileChooser2 = await fileChooserPromise2;
await fileChooser2.setFiles({
  name: "app-feature-screen.png",
  mimeType: "image/png",
  buffer: Buffer.from(greenPngBase64, "base64"),
});
await page.waitForTimeout(1000);

const replacedText = await page.locator(".source-card-filled").innerText();
assert.ok(replacedText.includes("app-feature-screen.png"), "Card must display new replaced filename");
await page.screenshot({ path: `${outDir}/04-desktop-media-replaced.png` });

console.log("5. Verifying Undo and Redo...");
// Undo the replace
await page.locator("button[aria-label='Undo']").click();
await page.waitForTimeout(600);
const undoneText1 = await page.locator(".source-card-filled").innerText();
assert.ok(undoneText1.includes("app-hero-screen.png"), "Undo must restore first media");

// Undo the add
await page.locator("button[aria-label='Undo']").click();
await page.waitForTimeout(600);
assert.ok(await page.locator(".source-card-empty").isVisible(), "Undo must restore empty state");

// Redo the add
await page.locator("button[aria-label='Redo']").click();
await page.waitForTimeout(600);
const redoneText = await page.locator(".source-card-filled").innerText();
assert.ok(redoneText.includes("app-hero-screen.png"), "Redo must re-add media");
await page.screenshot({ path: `${outDir}/05-desktop-undo-redo.png` });

console.log("6. Verifying Contextual Next Action and Mockup Selection...");
// Click "Change device →"
await page.locator("button.source-next-action").click();
await page.waitForTimeout(600);

// Verify Mockup summary toggle says "DONE"
const mockupChangeBtn = page.locator(".mockup-summary button.change-button");
const changeBtnText = await mockupChangeBtn.innerText();
assert.equal(changeBtnText, "DONE", "Mockup summary button must say DONE while picker is open");

// Verify active device has checkmark and Active label
const activeDeviceBtn = page.locator(".mockup-picker-grid button.selected");
const activeDeviceText = await activeDeviceBtn.innerText();
assert.ok(activeDeviceText.includes("iPhone 17"), "Active device must be iPhone 17");
assert.ok(activeDeviceText.includes("Active"), "Active device must show Active badge");
assert.ok(await activeDeviceBtn.locator(".mockup-active-check").isVisible(), "Active device must show check icon");
await page.screenshot({ path: `${outDir}/06-desktop-device-picker-active.png` });

// Switch device to MacBook Air 13"
const macbookOption = page.locator(".mockup-picker-grid button").filter({ hasText: "MacBook Air 13\"" });
await macbookOption.click();
await page.waitForTimeout(1500);

// Verify Mockup summary updated
const updatedMockupSummary = await page.locator(".mockup-summary").innerText();
assert.ok(updatedMockupSummary.includes("MACBOOK AIR 13\""), "Summary must reflect new device");
assert.ok(updatedMockupSummary.includes("Laptops"), "Summary must reflect device family");

// Verify guidance updated
const updatedGuidance = await page.locator(".source-next-guidance").innerText();
assert.ok(updatedGuidance.includes("Active on MacBook Air 13\""), "Guidance must reflect new device");
await page.screenshot({ path: `${outDir}/07-desktop-device-changed-macbook.png` });

console.log("7. Verifying Save Project & Rehydration...");
await page.locator("button.save-project").click();
await page.waitForTimeout(500);

// Reload and check persistence
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector(".mockup-stage", { timeout: 20000 });
await page.waitForTimeout(1000);

const persistedMockup = await page.locator(".mockup-summary strong").innerText();
assert.equal(persistedMockup, "MACBOOK AIR 13\"", "Saved project must rehydrate MacBook Air 13\"");
await page.screenshot({ path: `${outDir}/08-desktop-saved-project-hydrated.png` });

console.log("8. Verifying Mobile Viewport...");
await page.setViewportSize({ width: 390, height: 844 });
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector(".mockup-stage", { timeout: 20000 });
await page.waitForTimeout(1000);

// Verify mobile controls render without issues
assert.ok(await page.locator(".mobile-dock").isVisible(), "Mobile dock must be visible");
assert.ok(await page.locator(".mockup-stage").isVisible(), "Stage must be visible on mobile");
await page.screenshot({ path: `${outDir}/09-mobile-view.png` });

console.log("9. Console errors and warnings check...");
console.log("Console errors:", consoleErrors.length);
if (consoleErrors.length > 0) {
  console.log("Errors list:", consoleErrors);
}
assert.equal(consoleErrors.length, 0, "No console errors should occur");

await browser.close();
console.log("STAGE 1 VERIFICATION COMPLETED SUCCESSFULLY!");
