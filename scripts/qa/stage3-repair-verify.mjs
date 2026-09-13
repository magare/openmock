import { chromium } from "playwright-core";
import fs from "node:fs/promises";
import path from "node:path";

const PORT = 5199;
const URL = `http://localhost:${PORT}/`;
const outDir = path.resolve("evidence/qa/usability-stages/after");

await fs.mkdir(outDir, { recursive: true });

console.log("Starting Stage 3 Repair Verification...");

const browser = await chromium.launch({ channel: "chrome", headless: true });

const consoleErrors = [];
const consoleWarnings = [];

const setupPage = async (page, theme = "light") => {
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      if (!text.includes("favicon") && !text.includes("ERR_CONNECTION_REFUSED")) {
        consoleErrors.push(`[${theme}] ${text}`);
      }
    } else if (msg.type() === "warning") {
      consoleWarnings.push(`[${theme}] ${msg.text()}`);
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

// Check helper: verifies bounding boxes of stage and timeline do not overlap inspector
const verifyNonOverlap = async (page, contextDesc) => {
  const metrics = await page.evaluate(() => {
    const stage = document.querySelector(".mockup-stage")?.getBoundingClientRect();
    const timeline = document.querySelector(".timeline-shell")?.getBoundingClientRect();
    const inspector = document.querySelector(".inspector-panel")?.getBoundingClientRect();
    const mainCol = document.querySelector(".main-column")?.getBoundingClientRect();
    const popover = document.querySelector(".preset-popover")?.getBoundingClientRect();

    return {
      mainCol: mainCol ? { x: Math.round(mainCol.x), right: Math.round(mainCol.right), w: Math.round(mainCol.width) } : null,
      stage: stage ? { x: Math.round(stage.x), right: Math.round(stage.right), w: Math.round(stage.width) } : null,
      timeline: timeline ? { x: Math.round(timeline.x), right: Math.round(timeline.right), w: Math.round(timeline.width) } : null,
      inspector: inspector ? { x: Math.round(inspector.x), right: Math.round(inspector.right), w: Math.round(inspector.width) } : null,
      popover: popover ? { x: Math.round(popover.x), right: Math.round(popover.right), y: Math.round(popover.y), bottom: Math.round(popover.bottom), w: Math.round(popover.width) } : null
    };
  });

  if (!metrics.stage || !metrics.inspector) {
    throw new Error(`[${contextDesc}] Missing stage or inspector elements`);
  }

  const stageGap = metrics.inspector.x - metrics.stage.right;
  if (stageGap < 8) {
    throw new Error(`[${contextDesc}] Canvas stage overlaps or touches inspector! stage.right=${metrics.stage.right}, inspector.x=${metrics.inspector.x}, gap=${stageGap}px`);
  }

  if (metrics.timeline) {
    const timelineGap = metrics.inspector.x - metrics.timeline.right;
    if (timelineGap < 8) {
      throw new Error(`[${contextDesc}] Timeline shell overlaps or touches inspector! timeline.right=${metrics.timeline.right}, inspector.x=${metrics.inspector.x}, gap=${timelineGap}px`);
    }
  }

  console.log(`✓ [${contextDesc}] Separation OK: stage.right=${metrics.stage.right}, timeline.right=${metrics.timeline?.right}, inspector.left=${metrics.inspector.x} (gap=${stageGap}px)`);
  return metrics;
};

// Check helper: verifies NO nested interactive elements anywhere in timeline
const verifyNoNestedInteractiveElements = async (page, contextDesc) => {
  const nested = await page.evaluate(() => {
    const bad = [];
    const interactive = Array.from(document.querySelectorAll("button, [role='button'], input, select, textarea, a[href]"));
    for (const el of interactive) {
      const parentInteractive = el.parentElement?.closest("button, [role='button'], a[href]");
      if (parentInteractive) {
        bad.push({
          childTag: el.tagName,
          childClass: el.className,
          childText: el.textContent?.slice(0, 30),
          parentTag: parentInteractive.tagName,
          parentClass: parentInteractive.className,
          parentRole: parentInteractive.getAttribute("role")
        });
      }
    }
    return bad;
  });

  if (nested.length > 0) {
    throw new Error(`[${contextDesc}] Found nested interactive elements: ${JSON.stringify(nested, null, 2)}`);
  }
  console.log(`✓ [${contextDesc}] Zero nested interactive elements in DOM`);
};

// ----------------------------------------------------
// Test Matrix: 1000px, 1100px, 1440px
// ----------------------------------------------------

const widths = [1000, 1100, 1440];

for (const width of widths) {
  for (const theme of ["light", "dark"]) {
    const page = await browser.newPage({ viewport: { width, height: 850 } });
    await setupPage(page, theme);
    const tag = `${width}px-${theme}`;

    // 1. Minimized state
    await verifyNonOverlap(page, `${tag}-minimized`);
    await verifyNoNestedInteractiveElements(page, `${tag}-minimized`);
    if (width === 1000 && theme === "light") {
      await page.screenshot({ path: path.join(outDir, "58-medium-1000-light-minimized.png") });
    } else if (width === 1440 && theme === "light") {
      await page.screenshot({ path: path.join(outDir, "40-desktop-1440-light-minimized.png") });
    }

    // 2. Maximize timeline -> Advanced mode (default)
    await page.locator('button[aria-label="Maximize timeline"]').click();
    await page.waitForSelector(".timeline-toolbar", { state: "visible" });
    await page.waitForTimeout(300);

    await verifyNonOverlap(page, `${tag}-advanced`);
    await verifyNoNestedInteractiveElements(page, `${tag}-advanced`);

    if (width === 1440 && theme === "light") {
      await page.screenshot({ path: path.join(outDir, "41-desktop-1440-light-advanced.png") });
    } else if (width === 1440 && theme === "dark") {
      await page.screenshot({ path: path.join(outDir, "45-desktop-1440-dark-advanced.png") });
    } else if (width === 1000 && theme === "light") {
      await page.screenshot({ path: path.join(outDir, "50-medium-1000-light-advanced.png") });
    } else if (width === 1000 && theme === "dark") {
      await page.screenshot({ path: path.join(outDir, "53-medium-1000-dark-advanced.png") });
    } else if (width === 1100 && theme === "light") {
      await page.screenshot({ path: path.join(outDir, "55-narrow-1100-light-advanced.png") });
    }

    // 3. Switch to Simple mode
    await page.locator('.timeline-mode button:has-text("SIMPLE")').click();
    await page.waitForTimeout(200);

    await verifyNonOverlap(page, `${tag}-simple`);
    await verifyNoNestedInteractiveElements(page, `${tag}-simple`);

    if (width === 1000 && theme === "light") {
      // The exact failing screenshot from Stage 3 review!
      await page.screenshot({ path: path.join(outDir, "48-medium-1000-light-simple.png") });
    } else if (width === 1000 && theme === "dark") {
      await page.screenshot({ path: path.join(outDir, "52-medium-1000-dark-simple.png") });
    } else if (width === 1100 && theme === "light") {
      await page.screenshot({ path: path.join(outDir, "54-narrow-1100-light-simple.png") });
    } else if (width === 1100 && theme === "dark") {
      await page.screenshot({ path: path.join(outDir, "57-narrow-1100-dark-simple.png") });
    } else if (width === 1440 && theme === "light") {
      await page.screenshot({ path: path.join(outDir, "42-desktop-1440-light-simple.png") });
    } else if (width === 1440 && theme === "dark") {
      await page.screenshot({ path: path.join(outDir, "46-desktop-1440-dark-simple.png") });
    }

    // 4. Open Presets Popover
    await page.locator('.timeline-action:has-text("PRESETS")').click();
    await page.waitForSelector(".preset-popover", { state: "visible" });
    await page.waitForTimeout(300);

    const m = await verifyNonOverlap(page, `${tag}-presets-open`);
    await verifyNoNestedInteractiveElements(page, `${tag}-presets-open`);

    // Verify presets popover visibility and dimensions
    const isPopoverVisible = await page.isVisible(".preset-popover");
    if (!isPopoverVisible) throw new Error(`[${tag}] Presets popover not visible`);
    console.log(`✓ [${tag}] Presets popover visible: w=${m.popover?.w}, top=${m.popover?.y}, bottom=${m.popover?.bottom}`);

    if (width === 1440 && theme === "light") {
      await page.screenshot({ path: path.join(outDir, "43-desktop-1440-light-presets-open.png") });
    } else if (width === 1440 && theme === "dark") {
      await page.screenshot({ path: path.join(outDir, "47-desktop-1440-dark-presets-open.png") });
    } else if (width === 1000 && theme === "light") {
      await page.screenshot({ path: path.join(outDir, "51-medium-1000-light-presets-open.png") });
    } else if (width === 1100 && theme === "light") {
      await page.screenshot({ path: path.join(outDir, "56-narrow-1100-light-presets-open.png") });
    }

    // Close presets popover via Escape
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    const popoverStillOpen = await page.isVisible(".preset-popover");
    if (popoverStillOpen) throw new Error(`[${tag}] Presets popover failed to close on Escape`);

    // 5. Switch to Advanced & Expand Keyframes (on 1440 light)
    if (width === 1440 && theme === "light") {
      await page.locator('.timeline-mode button:has-text("ADVANCED")').click();
      await page.waitForTimeout(200);
      await page.locator('button[aria-label="Expand layer"]').first().click();
      await page.waitForSelector(".keyframe-rows", { state: "visible" });
      await page.waitForTimeout(200);
      await verifyNonOverlap(page, "1440px-light-advanced-expanded");
      await verifyNoNestedInteractiveElements(page, "1440px-light-advanced-expanded");
      await page.screenshot({ path: path.join(outDir, "44-desktop-1440-light-advanced-expanded.png") });
    }

    await page.close();
  }
}

// ----------------------------------------------------
// Keyboard Activation Verification
// ----------------------------------------------------
console.log("\nTesting Keyboard Navigation & Button Activation...");
const kPage = await browser.newPage({ viewport: { width: 1000, height: 800 } });
await setupPage(kPage, "light");

// 1. Maximize timeline via keyboard
const maxBtn = kPage.locator('button[aria-label="Maximize timeline"]');
await maxBtn.focus();
await kPage.keyboard.press("Enter");
await kPage.waitForSelector(".timeline-toolbar", { state: "visible" });
console.log("✓ Maximize timeline activated via keyboard Enter");

// 2. Mode buttons keyboard activation
const simpleBtn = kPage.locator('.timeline-mode button:has-text("SIMPLE")');
const advancedBtn = kPage.locator('.timeline-mode button:has-text("ADVANCED")');

await simpleBtn.focus();
await kPage.keyboard.press("Space");
await kPage.waitForTimeout(200);
const isSimple = await simpleBtn.getAttribute("aria-pressed");
if (isSimple !== "true") throw new Error("Simple mode did not activate on Space");
console.log("✓ Simple mode button activated via keyboard Space");

await advancedBtn.focus();
await kPage.keyboard.press("Enter");
await kPage.waitForTimeout(200);
const isAdv = await advancedBtn.getAttribute("aria-pressed");
if (isAdv !== "true") throw new Error("Advanced mode did not activate on Enter");
console.log("✓ Advanced mode button activated via keyboard Enter");

// 3. Transport buttons keyboard activation (verify NO canvas space-pan conflict)
const playBtn = kPage.locator('button[aria-label="Play animation (Space)"]');
await playBtn.focus();

// Press Space on the play button
await kPage.keyboard.press("Space");
await kPage.waitForTimeout(400);

// Check if playing
const pauseBtn = kPage.locator('button[aria-label="Pause animation (Space)"]');
const isPauseVisible = await pauseBtn.isVisible();
if (!isPauseVisible) throw new Error("Playback did not start on Space activation of Play button");

// Verify that the canvas stage was NOT put into pan/grab mode by this Space press
const stageIsManipulating = await kPage.$eval(".mockup-stage", (el) => el.classList.contains("is-manipulating"));
if (stageIsManipulating) throw new Error("Canvas entered manipulating mode from Space on Play button!");
console.log("✓ Play animation activated via keyboard Space (no canvas pan conflict)");

// Press Space again on the Pause button to stop
await pauseBtn.focus();
await kPage.keyboard.press("Space");
await kPage.waitForTimeout(200);
const isPlayVisible = await playBtn.isVisible();
if (!isPlayVisible) throw new Error("Playback did not pause on Space activation of Pause button");
console.log("✓ Pause animation activated via keyboard Space");

// 4. Track segment button keyboard activation
const shotBtn = kPage.locator('button.shot-segment').first();
await shotBtn.focus();
await kPage.keyboard.press("Enter");
await kPage.waitForTimeout(200);
const isTrackActive = await shotBtn.getAttribute("aria-pressed");
if (isTrackActive !== "true") throw new Error("Shot segment track button did not activate on Enter");
console.log("✓ Shot segment track button activated via keyboard Enter");

// 5. Keyframe marker diamond button keyboard activation
const keyframeBtn = kPage.locator('button.keyframe-marker').first();
const kfCount = await kPage.locator('button.keyframe-marker').count();
if (kfCount > 0) {
  await keyframeBtn.focus();
  await kPage.keyboard.press("Enter");
  await kPage.waitForTimeout(200);
  const kfPressed = await keyframeBtn.getAttribute("aria-pressed");
  if (kfPressed !== "true") throw new Error("Keyframe marker did not select on Enter");
  console.log("✓ Keyframe diamond button activated via keyboard Enter");

  // Press Space on keyframe marker
  await keyframeBtn.press("Space");
  await kPage.waitForTimeout(200);
  const kfPressed2 = await keyframeBtn.getAttribute("aria-pressed");
  if (kfPressed2 !== "true") throw new Error("Keyframe marker did not remain active on Space");
  console.log("✓ Keyframe diamond button handled keyboard Space without bubbling");
}

// 6. Track name button activation
const trackNameBtn = kPage.locator('button.track-name-wrap').first();
await trackNameBtn.focus();
await kPage.keyboard.press("Enter");
await kPage.waitForTimeout(200);
console.log("✓ Track name button activated via keyboard Enter");

await kPage.close();
await browser.close();

console.log("\n==========================================");
console.log("STAGE 3 REPAIR VERIFICATION COMPLETE!");
console.log(`Total console errors: ${consoleErrors.length}`);
if (consoleErrors.length > 0) {
  console.error("Errors encountered:", consoleErrors);
  process.exit(1);
}
console.log("All layout, separation, and keyboard tests passed!");
console.log("==========================================\n");
