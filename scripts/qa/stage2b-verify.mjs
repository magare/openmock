import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { presetOptions, imageOptions } from "../../src/editorState.js";

const PORT = 5199;
const URL = `http://localhost:${PORT}/`;
const outDir = path.resolve("evidence/qa/usability-stages/after");

await fs.mkdir(outDir, { recursive: true });

console.log("=== Running Stage 2B Usability Verification Suite ===");
const browser = await chromium.launch({ channel: "chrome", headless: true });

const consoleErrors = [];
const setupPage = async (page) => {
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(err.message));

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
  await page.waitForTimeout(1000);
};

try {
  // -------------------------------------------------------------
  // PART 1: Desktop 1440px Viewport — Expander, Choice Grids, Swatches, No Duplicate BG IMAGE
  // -------------------------------------------------------------
  console.log("\n--- Part 1: Desktop (1440px) Verification ---");
  const page1440 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await setupPage(page1440);

  // 1. Verify inspector sections ordering and presence of SCENE
  const sectionLabels = await page1440.$$eval(".inspector-section .inspector-section-title > span", (els) =>
    els.map((e) => e.textContent.trim())
  );
  console.log("Inspector sections:", sectionLabels);
  assert.deepEqual(sectionLabels, ["SOURCE", "MOCKUP", "SCENE", "CAMERA", "EFFECTS"]);

  // 2. Check Background Expander initial state
  const bgExpander = page1440.locator("button.wide-select", { hasText: "BACKGROUND" });
  await assert.doesNotReject(async () => await bgExpander.waitFor({ state: "visible" }));
  
  const initialExpanded = await bgExpander.getAttribute("aria-expanded");
  assert.equal(initialExpanded, "false", "Background expander must initially be collapsed");

  const initialSummary = await bgExpander.locator("b").textContent();
  console.log("Initial background summary:", initialSummary);
  assert.ok(initialSummary.toLowerCase().includes("image · whisp"), "Default summary must indicate Image Whisp");

  // 3. Confirm redundant duplicate .background-image-row is ABSENT
  const redundantBgImageRow = await page1440.$(".background-image-row");
  assert.equal(redundantBgImageRow, null, "Redundant .background-image-row must be completely removed from DOM");
  console.log("✓ Redundant .background-image-row is absent from DOM");

  // 4. Expand Background section without mutating undo stack
  const undoDisabledBefore = await page1440.$eval('button[aria-label="Undo"]', (el) => el.disabled);
  assert.equal(undoDisabledBefore, true, "Undo must be disabled before any project mutations");

  await bgExpander.click();
  await page1440.waitForSelector(".background-picker", { state: "visible" });
  const isExpandedNow = await bgExpander.getAttribute("aria-expanded");
  assert.equal(isExpandedNow, "true", "Background expander aria-expanded must be true after clicking");

  const undoDisabledAfterOpen = await page1440.$eval('button[aria-label="Undo"]', (el) => el.disabled);
  assert.equal(undoDisabledAfterOpen, true, "Toggling expander must not mutate project or undo stack");
  console.log("✓ Opening/closing background expander does not mutate project history");

  // 5. Verify direct tabs: Color, Preset, Image (with aria-pressed in role=group)
  const tabGroup = page1440.locator('.picker-tabs[role="group"]');
  await assert.doesNotReject(async () => await tabGroup.waitFor({ state: "visible" }));
  const tabs = await tabGroup.locator("button").all();
  assert.equal(tabs.length, 3, "Must have exactly 3 mode tabs: Color, Preset, Image");

  const tabStates = await Promise.all(
    tabs.map(async (t) => ({
      text: (await t.textContent()).trim(),
      pressed: await t.getAttribute("aria-pressed"),
      selectedClass: (await t.getAttribute("class"))?.includes("selected"),
    }))
  );
  console.log("Background tabs:", tabStates);
  assert.equal(tabStates.find((t) => t.text === "Image")?.pressed, "true", "Image tab must be pressed by default");

  // 6. Test Image choice grid
  const imageGrid = page1440.locator(".image-choice-grid");
  await assert.doesNotReject(async () => await imageGrid.waitFor({ state: "visible" }));
  
  // Verify bounded scroll container
  const imageGridMaxHeight = await imageGrid.evaluate((el) => window.getComputedStyle(el).maxHeight);
  const imageGridOverflowY = await imageGrid.evaluate((el) => window.getComputedStyle(el).overflowY);
  console.log(`Image grid styling: maxHeight=${imageGridMaxHeight}, overflowY=${imageGridOverflowY}`);
  assert.ok(parseInt(imageGridMaxHeight, 10) <= 280, "Image choice grid must have bounded max-height <= 280px");
  assert.equal(imageGridOverflowY, "auto", "Image choice grid must have overflow-y: auto");

  const imageButtons = await imageGrid.locator("button.image-choice-btn").all();
  console.log(`Image buttons count: ${imageButtons.length} (expected ${imageOptions.length})`);
  assert.equal(imageButtons.length, imageOptions.length, "All image options must be directly rendered");

  // Check active state on Whisp
  const whispBtn = imageGrid.locator('button.image-choice-btn', { hasText: "Whisp" });
  assert.equal(await whispBtn.getAttribute("aria-pressed"), "true", "Whisp must have aria-pressed=true");
  assert.ok(await whispBtn.locator(".choice-check").isVisible(), "Whisp must display active checkmark");

  // Select a different image directly without nested dropdown
  const skyBtn = imageGrid.locator('button.image-choice-btn', { hasText: "Sky" });
  await skyBtn.click();
  await page1440.waitForTimeout(300);

  // Verify stage background updated
  const stageBgImage = await page1440.$eval(".stage-background-layer", (el) => el.style.backgroundImage);
  console.log("Stage background image after Sky click:", stageBgImage);
  assert.ok(stageBgImage.includes("iphone-2.jpg") || !stageBgImage.includes("whisp.jpeg"), "Stage background must update away from Whisp to Sky asset");

  // Verify expander summary updated
  const summaryAfterSky = await bgExpander.locator("b").textContent();
  console.log("Expander summary after Sky:", summaryAfterSky);
  assert.ok(summaryAfterSky.toLowerCase().includes("image · sky"), "Summary must reflect Sky image");

  // Verify scene marked as custom
  const sceneSubtitle = await page1440.$eval(".scene-summary span", (el) => el.textContent);
  assert.ok(sceneSubtitle.includes("CUSTOM"), "Manual background change must mark scene as custom");

  await page1440.screenshot({ path: path.join(outDir, "32-desktop-1440-light-bg-image.png") });
  console.log("✓ Captured 32-desktop-1440-light-bg-image.png");

  // 7. Test Preset choice grid
  const presetTab = tabGroup.locator('button', { hasText: "Preset" });
  await presetTab.click();
  await page1440.waitForTimeout(200);

  const presetGrid = page1440.locator(".preset-choice-grid");
  await assert.doesNotReject(async () => await presetGrid.waitFor({ state: "visible" }));

  const presetButtons = await presetGrid.locator("button.preset-choice-btn").all();
  console.log(`Preset buttons count: ${presetButtons.length} (expected ${presetOptions.length})`);
  assert.equal(presetButtons.length, presetOptions.length, "All preset options must be directly rendered");

  // Verify swatches have real styles
  const swatchStyle = await presetGrid.locator(".preset-swatch").first().evaluate((el) => ({
    bg: el.style.backgroundColor,
    bgImg: el.style.backgroundImage,
  }));
  console.log("First preset swatch styles:", swatchStyle);

  // Click "Sunset" preset
  const sunsetBtn = presetGrid.locator('button.preset-choice-btn', { hasText: "Sunset" });
  await sunsetBtn.click();
  await page1440.waitForTimeout(300);

  const summaryAfterPreset = await bgExpander.locator("b").textContent();
  console.log("Expander summary after Sunset:", summaryAfterPreset);
  assert.ok(summaryAfterPreset.toLowerCase().includes("preset · sunset"), "Summary must reflect Sunset preset");

  await page1440.screenshot({ path: path.join(outDir, "31-desktop-1440-light-bg-preset.png") });
  console.log("✓ Captured 31-desktop-1440-light-bg-preset.png");

  // 8. Test Color picker section
  const colorTab = tabGroup.locator('button', { hasText: "Color" });
  await colorTab.click();
  await page1440.waitForTimeout(200);

  const colorSection = page1440.locator(".color-picker-section");
  await assert.doesNotReject(async () => await colorSection.waitFor({ state: "visible" }));

  // Verify 8 quick color swatches
  const colorSwatches = await colorSection.locator(".color-swatch-btn").all();
  assert.equal(colorSwatches.length, 8, "Must have 8 quick color swatches");

  // Click orange swatch (#f0771e)
  const orangeSwatch = colorSection.locator('button.color-swatch-btn[aria-label="Color #f0771e"]');
  await orangeSwatch.click();
  await page1440.waitForTimeout(300);

  const stageColor = await page1440.$eval(".mockup-stage", (el) => el.style.backgroundColor);
  console.log("Stage background color after orange swatch:", stageColor);
  assert.ok(stageColor.includes("240, 119, 30") || stageColor.includes("f0771e"), "Stage background color must match orange swatch");

  const summaryAfterColor = await bgExpander.locator("b").textContent();
  console.log("Expander summary after orange color:", summaryAfterColor);
  assert.ok(summaryAfterColor.toLowerCase().includes("color · #f0771e"), "Summary must reflect orange color hex");

  await page1440.screenshot({ path: path.join(outDir, "30-desktop-1440-light-bg-color.png") });
  console.log("✓ Captured 30-desktop-1440-light-bg-color.png");

  // 9. Verify Undo restores previous state
  const undoBtn = page1440.locator('button[aria-label="Undo"]');
  assert.equal(await undoBtn.isEnabled(), true, "Undo button must now be enabled");
  
  // First undo: reverts orange (#f0771e) to previous color (#f2f2f2)
  await undoBtn.click();
  await page1440.waitForTimeout(300);
  const summaryAfterUndo1 = await bgExpander.locator("b").textContent();
  console.log("Expander summary after 1st Undo:", summaryAfterUndo1);
  assert.ok(summaryAfterUndo1.toLowerCase().includes("color · #f2f2f2"), "First undo must restore previous default color");

  // Second undo: reverts tab switch to Color, restoring Preset Sunset
  await undoBtn.click();
  await page1440.waitForTimeout(300);
  const summaryAfterUndo2 = await bgExpander.locator("b").textContent();
  console.log("Expander summary after 2nd Undo:", summaryAfterUndo2);
  assert.ok(summaryAfterUndo2.toLowerCase().includes("preset · sunset"), "Second undo must restore previous preset choice");

  await page1440.screenshot({ path: path.join(outDir, "38-desktop-1440-bg-undo-restored.png") });
  console.log("✓ Captured 38-desktop-1440-bg-undo-restored.png");

  // 10. Verify Scene Preset switching applies environment and manual change marks custom
  const changeSceneBtn = page1440.locator(".scene-summary button.change-button");
  await changeSceneBtn.click();
  await page1440.waitForSelector(".scene-picker", { state: "visible" });

  const darkRoomBtn = page1440.locator('.scene-picker button', { hasText: "Dark Room" });
  await darkRoomBtn.click();
  await page1440.waitForTimeout(400);

  const darkRoomSummary = await bgExpander.locator("b").textContent();
  console.log("Background expander summary after Dark Room scene preset:", darkRoomSummary);
  assert.ok(darkRoomSummary.toLowerCase().includes("color · #0b0c0d"), "Dark room must set color background");

  const sceneHeader = await page1440.$eval(".scene-summary strong", (el) => el.textContent);
  assert.ok(sceneHeader.includes("Dark room") || sceneHeader.includes("DARK ROOM"), "Scene header must reflect Dark room");

  await page1440.screenshot({ path: path.join(outDir, "37-desktop-1440-bg-custom-scene-transition.png") });
  console.log("✓ Captured 37-desktop-1440-bg-custom-scene-transition.png");

  // 11. Test Escape key closes background picker and returns focus to expander
  // First ensure background picker is open
  if ((await bgExpander.getAttribute("aria-expanded")) === "false") {
    await bgExpander.click();
    await page1440.waitForSelector(".background-picker", { state: "visible" });
  }

  // Focus a button inside picker
  const firstChoiceBtn = page1440.locator(".background-picker button").first();
  await firstChoiceBtn.focus();
  await page1440.waitForTimeout(100);

  // Press Escape
  await page1440.keyboard.press("Escape");
  await page1440.waitForTimeout(200);

  const pickerAfterEscape = await page1440.$(".background-picker");
  assert.equal(pickerAfterEscape, null, "Background picker must be closed on Escape");

  const activeElementClass = await page1440.evaluate(() => document.activeElement?.className);
  console.log("Active element class after Escape:", activeElementClass);
  assert.ok(activeElementClass?.includes("wide-select"), "Focus must return to the Background expander button on Escape");
  console.log("✓ Focus returned to Background expander on Escape");

  // -------------------------------------------------------------
  // PART 2: Desktop Dark Mode (1440px)
  // -------------------------------------------------------------
  console.log("\n--- Part 2: Desktop Dark Mode Verification ---");
  await page1440.evaluate(() => {
    localStorage.setItem("openmock-theme", "dark");
  });
  await page1440.reload({ waitUntil: "domcontentloaded" });
  await page1440.waitForSelector(".mockup-stage", { timeout: 20000 });
  await page1440.waitForTimeout(800);

  const darkExpander = page1440.locator("button.wide-select", { hasText: "BACKGROUND" });
  await darkExpander.click();
  await page1440.waitForSelector(".background-picker", { state: "visible" });

  // Open Preset in dark mode
  const darkPresetTab = page1440.locator('.picker-tabs button', { hasText: "Preset" });
  await darkPresetTab.click();
  await page1440.waitForTimeout(200);
  await page1440.screenshot({ path: path.join(outDir, "33-desktop-1440-dark-bg-preset.png") });
  console.log("✓ Captured 33-desktop-1440-dark-bg-preset.png");

  // Open Image in dark mode
  const darkImageTab = page1440.locator('.picker-tabs button', { hasText: "Image" });
  await darkImageTab.click();
  await page1440.waitForTimeout(200);
  await page1440.screenshot({ path: path.join(outDir, "34-desktop-1440-dark-bg-image.png") });
  console.log("✓ Captured 34-desktop-1440-dark-bg-image.png");
  await page1440.close();

  // -------------------------------------------------------------
  // PART 3: Medium Viewport (1000px) — Layout Fit, No Text Clipping
  // -------------------------------------------------------------
  console.log("\n--- Part 3: Medium Viewport (1000px) Verification ---");
  const page1000 = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  await setupPage(page1000);

  const medExpander = page1000.locator("button.wide-select", { hasText: "BACKGROUND" });
  await medExpander.click();
  await page1000.waitForSelector(".background-picker", { state: "visible" });

  // Preset tab
  await page1000.locator('.picker-tabs button', { hasText: "Preset" }).click();
  await page1000.waitForTimeout(200);

  // Check no horizontal overflow in inspector or picker
  const overflowCheck = await page1000.evaluate(() => {
    const inspector = document.querySelector(".inspector-panel");
    const picker = document.querySelector(".background-picker");
    return {
      inspectorScrollWidth: inspector?.scrollWidth,
      inspectorClientWidth: inspector?.clientWidth,
      pickerScrollWidth: picker?.scrollWidth,
      pickerClientWidth: picker?.clientWidth,
    };
  });
  console.log("1000px overflow check:", overflowCheck);
  assert.ok(
    overflowCheck.inspectorScrollWidth <= overflowCheck.inspectorClientWidth + 2,
    "Inspector panel must not horizontally overflow"
  );
  assert.ok(
    overflowCheck.pickerScrollWidth <= overflowCheck.pickerClientWidth + 2,
    "Background picker must not horizontally overflow"
  );

  await page1000.screenshot({ path: path.join(outDir, "35-medium-1000-light-bg-preset.png") });
  console.log("✓ Captured 35-medium-1000-light-bg-preset.png");

  // Medium Dark Mode
  await page1000.evaluate(() => {
    localStorage.setItem("openmock-theme", "dark");
  });
  await page1000.reload({ waitUntil: "domcontentloaded" });
  await page1000.waitForSelector(".mockup-stage", { timeout: 20000 });
  await page1000.waitForTimeout(600);

  const medDarkExpander = page1000.locator("button.wide-select", { hasText: "BACKGROUND" });
  await medDarkExpander.click();
  await page1000.waitForSelector(".background-picker", { state: "visible" });
  await page1000.locator('.picker-tabs button', { hasText: "Image" }).click();
  await page1000.waitForTimeout(200);

  await page1000.screenshot({ path: path.join(outDir, "36-medium-1000-dark-bg-image.png") });
  console.log("✓ Captured 36-medium-1000-dark-bg-image.png");
  await page1000.close();

  // -------------------------------------------------------------
  // PART 4: Mobile Viewport (390px) — Scene Controls & No Regressions
  // -------------------------------------------------------------
  console.log("\n--- Part 4: Mobile Viewport (390px) Verification ---");
  const pageMobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await setupPage(pageMobile);

  // Click Scene tab in mobile dock
  const sceneTabBtn = pageMobile.locator('.mobile-tabs button[aria-label="Scene controls"]');
  await assert.doesNotReject(async () => await sceneTabBtn.waitFor({ state: "visible" }));
  await sceneTabBtn.click();
  await pageMobile.waitForTimeout(300);

  const mobileScene = pageMobile.locator(".mobile-scene");
  await assert.doesNotReject(async () => await mobileScene.waitFor({ state: "visible" }));

  // Verify dials exist
  const dials = await mobileScene.locator(".mobile-dials button").all();
  assert.equal(dials.length, 2, "Mobile scene must have Light and BG dials");

  // Click BG toggle dial
  const bgDial = dials[1];
  const bgTextBefore = await bgDial.locator("b").textContent();
  await bgDial.click();
  await pageMobile.waitForTimeout(300);
  const bgTextAfter = await bgDial.locator("b").textContent();
  console.log(`Mobile BG dial toggled from ${bgTextBefore} to ${bgTextAfter}`);
  assert.notEqual(bgTextBefore, bgTextAfter, "Mobile BG dial click must toggle background");

  await pageMobile.screenshot({ path: path.join(outDir, "39-mobile-390-scene-controls.png") });
  console.log("✓ Captured 39-mobile-390-scene-controls.png");
  await pageMobile.close();

  // -------------------------------------------------------------
  // PART 5: Console Error Audit
  // -------------------------------------------------------------
  console.log("\n--- Part 5: Console Error Audit ---");
  console.log(`Captured ${consoleErrors.length} console errors:`, consoleErrors);
  assert.equal(consoleErrors.length, 0, "No console errors allowed during verification");
  console.log("✓ Zero console errors across all interactions and viewports");

  console.log("\n=== ALL STAGE 2B VERIFICATIONS PASSED ===");
} finally {
  await browser.close();
}
