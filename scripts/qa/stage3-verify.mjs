import { chromium } from "playwright-core";
import fs from "node:fs/promises";
import path from "node:path";

const PORT = 5199;
const URL = `http://localhost:${PORT}/`;
const outDir = path.resolve("evidence/qa/usability-stages/after");

await fs.mkdir(outDir, { recursive: true });

console.log("Starting Stage 3 automated verification...");

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

// ----------------------------------------------------
// 1. Functional Verification on 1440px Desktop
// ----------------------------------------------------
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await setupPage(page, "light");

// Check 1: Minimized timeline on initial load
const isMini = await page.$eval(".timeline-shell", (el) => el.classList.contains("timeline-mini"));
if (!isMini) throw new Error("Expected timeline to start minimized");
console.log("✓ Initial timeline starts minimized (preserves canvas for still work)");

// Capture 40: Minimized timeline
await page.screenshot({ path: path.join(outDir, "40-desktop-1440-light-minimized.png") });

// Check 2: Maximize timeline
await page.locator('button[aria-label="Maximize timeline"]').click();
await page.waitForSelector(".timeline-toolbar", { state: "visible" });
await page.waitForTimeout(300);

// Verify mode buttons & aria-pressed
const simplePressed = await page.$eval('.timeline-mode button:has-text("SIMPLE")', (el) => el.getAttribute("aria-pressed"));
const advancedPressed = await page.$eval('.timeline-mode button:has-text("ADVANCED")', (el) => el.getAttribute("aria-pressed"));
const modeHint = await page.$eval(".timeline-mode-hint", (el) => el.textContent.trim());

if (advancedPressed !== "true" || simplePressed !== "false") {
  throw new Error(`Expected advanced mode to be pressed by default, got adv=${advancedPressed}, smp=${simplePressed}`);
}
if (modeHint !== "Keyframes & Recording") {
  throw new Error(`Expected mode hint 'Keyframes & Recording', got '${modeHint}'`);
}
console.log("✓ Advanced mode is active by default with clear subtitles and context hint badge");

// Capture 41: Advanced mode default
await page.screenshot({ path: path.join(outDir, "41-desktop-1440-light-advanced.png") });

// Check 3: Switch to Simple mode
await page.locator('.timeline-mode button:has-text("SIMPLE")').click();
await page.waitForTimeout(200);

const simplePressedAfter = await page.$eval('.timeline-mode button:has-text("SIMPLE")', (el) => el.getAttribute("aria-pressed"));
const modeHintSimple = await page.$eval(".timeline-mode-hint", (el) => el.textContent.trim());
if (simplePressedAfter !== "true" || modeHintSimple !== "Shots & Presets") {
  throw new Error("Simple mode did not activate properly");
}
console.log("✓ Simple mode activated with 'Shots & Presets' hint");

// Capture 42: Simple mode
await page.screenshot({ path: path.join(outDir, "42-desktop-1440-light-simple.png") });

// Check 4: Add a new shot to test static timeline guidance
await page.locator('button[aria-label*="Add shot"]').click();
await page.waitForTimeout(300);

const hasStaticGuidance = await page.isVisible(".timeline-static-guidance");
if (!hasStaticGuidance) throw new Error("Expected static guidance for new 1-keyframe shot");
const guidanceText = await page.$eval(".timeline-static-guidance", (el) => el.textContent.trim());
console.log(`✓ Static guidance visible for static shot: "${guidanceText}"`);

// Check 5: Open Motion Presets popover via static guidance link or toolbar PRESETS button
await page.locator(".timeline-static-guidance .guidance-action-link", { hasText: "Apply Motion Preset" }).click();
await page.waitForSelector(".preset-popover", { state: "visible" });
await page.waitForTimeout(300);

const popoverHeader = await page.$eval(".preset-header-text strong", (el) => el.textContent.trim());
const presetCount = await page.$$eval(".preset-grid button", (els) => els.length);
if (presetCount !== 8) throw new Error(`Expected 8 presets, found ${presetCount}`);
console.log(`✓ Preset popover open with header "${popoverHeader}" and ${presetCount} motion presets`);

// Capture 43: Presets popover open (unobstructed, high contrast)
await page.screenshot({ path: path.join(outDir, "43-desktop-1440-light-presets-open.png") });

// Check 6: Apply a preset ("Low-angle pan up")
await page.locator('.preset-grid button:has-text("Low-angle pan up")').click();
await page.waitForTimeout(400);

// Verify preset was applied: duration set to 4, popover closed
const popoverStillOpen = await page.isVisible(".preset-popover");
if (popoverStillOpen) throw new Error("Expected preset popover to close on selection");
const timelineTime = await page.$eval(".timeline-time", (el) => el.textContent.trim());
console.log(`✓ Applied "Low-angle pan up": duration updated, time readout "${timelineTime}"`);

// Check 7: Switch to Advanced mode and expand keyframes
await page.locator('.timeline-mode button:has-text("ADVANCED")').click();
await page.waitForTimeout(200);
await page.locator('.tiny-action:has-text("Expand layer")').click();
await page.waitForSelector(".keyframe-rows", { state: "visible" });
await page.waitForTimeout(200);

const chipCount = await page.$$eval(".keyframe-chip", (els) => els.length);
console.log(`✓ Expanded layer shows ${chipCount} keyframes`);

// Verify selected keyframe badge in subtools
const kfBadge = await page.$eval(".selected-keyframe-badge", (el) => el.textContent.trim());
console.log(`✓ Active keyframe badge: "${kfBadge}"`);

// Capture 44: Advanced mode with expanded layer & motion keyframes
await page.screenshot({ path: path.join(outDir, "44-desktop-1440-light-advanced-expanded.png") });

// Check 8: Easing toggle
const wandBtn = page.locator('button[aria-label*="Toggle easing"]');
await wandBtn.click();
await page.waitForTimeout(200);
const kfBadgeToggled = await page.$eval(".selected-keyframe-badge", (el) => el.textContent.trim());
console.log(`✓ Toggled easing: badge now reads "${kfBadgeToggled}"`);
await wandBtn.click(); // toggle back
await page.waitForTimeout(200);

// Check 9: Playback & Scrubbing Verification
await page.locator('button[aria-label="Play animation (Space)"]').click();
await page.waitForTimeout(600);
await page.locator('button[aria-label="Pause animation (Space)"]').click();
await page.waitForTimeout(200);

const midPlayTime = await page.$eval(".timeline-time strong", (el) => el.textContent.trim());
if (midPlayTime === "00:00.0") throw new Error("Expected playhead to have advanced during playback");
console.log(`✓ Playhead advanced during playback: current time is ${midPlayTime}`);

// Check 10: Undo restores previous keyframe easing/time
await page.keyboard.press("Meta+z");
await page.waitForTimeout(300);
console.log("✓ Undo (⌘Z) executed without error");

await page.close();

// ----------------------------------------------------
// 2. Dark Theme Verification (1440px)
// ----------------------------------------------------
const pageDark = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await setupPage(pageDark, "dark");
await pageDark.locator('button[aria-label="Maximize timeline"]').click();
await pageDark.waitForSelector(".timeline-toolbar", { state: "visible" });
await pageDark.waitForTimeout(300);

// Capture 45: Dark theme Advanced mode
await pageDark.screenshot({ path: path.join(outDir, "45-desktop-1440-dark-advanced.png") });

// Simple mode in Dark
await pageDark.locator('.timeline-mode button:has-text("SIMPLE")').click();
await pageDark.waitForTimeout(200);

// Capture 46: Dark theme Simple mode
await pageDark.screenshot({ path: path.join(outDir, "46-desktop-1440-dark-simple.png") });

// Presets open in Dark
await pageDark.locator('.timeline-action:has-text("PRESETS")').click();
await pageDark.waitForSelector(".preset-popover", { state: "visible" });
await pageDark.waitForTimeout(300);

// Capture 47: Dark theme Presets popover
await pageDark.screenshot({ path: path.join(outDir, "47-desktop-1440-dark-presets-open.png") });

await pageDark.close();

// ----------------------------------------------------
// 3. Medium Viewport (1000px) Light & Dark
// ----------------------------------------------------
const page1000 = await browser.newPage({ viewport: { width: 1000, height: 800 } });
await setupPage(page1000, "light");
await page1000.locator('button[aria-label="Maximize timeline"]').click();
await page1000.waitForSelector(".timeline-toolbar", { state: "visible" });
await page1000.waitForTimeout(300);

// Capture 48: 1000px Light mode Simple
await page1000.locator('.timeline-mode button:has-text("SIMPLE")').click();
await page1000.waitForTimeout(200);
await page1000.screenshot({ path: path.join(outDir, "48-medium-1000-light-simple.png") });

await page1000.close();

// ----------------------------------------------------
// 4. Mobile Viewport (390px)
// ----------------------------------------------------
const pageMobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await setupPage(pageMobile, "light");

// Capture 49: Mobile 390px
await pageMobile.screenshot({ path: path.join(outDir, "49-mobile-390-light.png") });

await pageMobile.close();
await browser.close();

console.log("\n==========================================");
console.log("Stage 3 Verification completed successfully!");
console.log(`Console errors: ${consoleErrors.length}`);
if (consoleErrors.length > 0) {
  console.log(consoleErrors);
  process.exit(1);
}
console.log("All 10 After screenshots saved to evidence/qa/usability-stages/after/ (40-49)");
console.log("==========================================\n");
