import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { mockupOptions, deviceGroup } from "../../src/editorState.js";

const PORT = 5199;
const URL = `http://localhost:${PORT}/`;
const outDir = path.resolve("evidence/qa/usability-stages/after");

await fs.mkdir(outDir, { recursive: true });

console.log("=== Running Stage 2A Usability Verification Suite ===");
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

// Helper to verify Source card empty state has no letter clipping
const verifySourceCardNoClipping = async (page, contextLabel) => {
  const metrics = await page.evaluate(() => {
    const card = document.querySelector(".source-card-empty");
    if (!card) return null;
    const strong = card.querySelector("strong");
    const span = card.querySelector(".source-card-text span");
    const small = card.querySelector(".source-format-hint");
    return {
      card: { height: card.getBoundingClientRect().height, clientHeight: card.clientHeight, scrollHeight: card.scrollHeight },
      strong: { text: strong?.innerText, height: strong?.getBoundingClientRect().height, clientHeight: strong?.clientHeight, scrollHeight: strong?.scrollHeight },
      span: { text: span?.innerText, height: span?.getBoundingClientRect().height, clientHeight: span?.clientHeight, scrollHeight: span?.scrollHeight },
      small: { text: small?.innerText, height: small?.getBoundingClientRect().height, clientHeight: small?.clientHeight, scrollHeight: small?.scrollHeight }
    };
  });

  assert.ok(metrics, `Source card empty state must exist for ${contextLabel}`);
  assert.ok(metrics.strong.height >= 12, `Strong ("Upload screen") must have full line height >= 12px, got ${metrics.strong.height} in ${contextLabel}`);
  assert.ok(metrics.strong.clientHeight >= metrics.strong.scrollHeight - 1, `Strong text must not be vertically clipped in ${contextLabel}`);
  assert.ok(metrics.span.height >= 11, `Span ("Drop image...") must have full line height >= 11px, got ${metrics.span.height} in ${contextLabel}`);
  assert.ok(metrics.span.clientHeight >= metrics.span.scrollHeight - 1, `Span text must not be vertically clipped in ${contextLabel}`);
  assert.ok(metrics.small.height >= 9, `Small format hint must have full line height >= 9px, got ${metrics.small.height} in ${contextLabel}`);
  assert.ok(metrics.card.clientHeight >= metrics.card.scrollHeight - 1, `Card container must fit its content without vertical squishing in ${contextLabel}`);
  console.log(`✓ Source card empty state text rendered with full letter height without clipping in ${contextLabel}`);
};

try {
  // -------------------------------------------------------------
  // PART 1: Desktop 1440px Viewport — Ordering, Filters, Bounded Scroll, Focus Return
  // -------------------------------------------------------------
  console.log("\n--- Part 1: Desktop (1440px) Verification ---");
  const page1440 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await setupPage(page1440);

  // 1. Verify Inspector Section Ordering: SOURCE > MOCKUP > SCENE > CAMERA > EFFECTS
  console.log("1. Verifying Inspector section ordering...");
  const sections = await page1440.locator(".inspector-section").all();
  assert.equal(sections.length, 5, "Must have exactly 5 inspector sections");

  const expectedOrder = ["SOURCE", "MOCKUP", "SCENE", "CAMERA", "EFFECTS"];
  const sectionLabels = [];
  for (const s of sections) {
    const titleText = await s.locator(".inspector-section-title span").first().innerText();
    sectionLabels.push(titleText.trim());
  }
  console.log("Detected inspector sections:", sectionLabels);
  assert.deepEqual(sectionLabels, expectedOrder, "Sections must strictly follow SOURCE > MOCKUP > SCENE > CAMERA > EFFECTS");

  // Verify independent toggle state preservation
  const mockupSection = page1440.locator(".inspector-section").nth(1);
  const sceneSection = page1440.locator(".inspector-section").nth(2);
  const mockupHead = mockupSection.locator(".inspector-section-head");

  await mockupHead.click();
  await page1440.waitForTimeout(200);
  assert.equal(await mockupSection.getAttribute("class"), "inspector-section closed", "MOCKUP should collapse independently");
  assert.equal(await sceneSection.getAttribute("class"), "inspector-section open", "SCENE should remain open");

  await mockupHead.click();
  await page1440.waitForTimeout(200);
  assert.equal(await mockupSection.getAttribute("class"), "inspector-section open", "MOCKUP should reopen independently");

  // Verify Source Card text sizing on 1440px Light
  await verifySourceCardNoClipping(page1440, "1440px Light");
  await page1440.screenshot({ path: `${outDir}/20-desktop-1440-light-inspector.png` });

  // 2. Open Device Picker & Verify Accessible Group Semantics and aria-pressed
  console.log("2. Verifying native filter buttons with aria-pressed in role=group...");
  const mockupChangeBtn = page1440.locator(".mockup-summary button.change-button");
  await mockupChangeBtn.click();
  await page1440.waitForTimeout(400);

  assert.equal(await mockupChangeBtn.innerText(), "DONE", "Button should display DONE when open");
  const filterBar = page1440.locator(".mockup-filter-bar");
  assert.ok(await filterBar.isVisible(), "Filter bar must be visible");
  assert.equal(await filterBar.getAttribute("role"), "group", "Filter bar should use role='group'");
  assert.equal(await filterBar.getAttribute("aria-label"), "Device categories");

  const expectedCounts = { All: mockupOptions.length };
  for (const [name] of mockupOptions) {
    const g = deviceGroup(name);
    expectedCounts[g] = (expectedCounts[g] || 0) + 1;
  }
  console.log("Expected category counts:", expectedCounts);
  assert.equal(expectedCounts.All, 39, "Total catalog must be exactly 39 devices");

  const filterButtons = await page1440.locator(".mockup-filter-btn").all();
  assert.ok(filterButtons.length >= 10, "Must have All plus at least 9 distinct groups");

  for (const btn of filterButtons) {
    const catName = await btn.locator("span").first().innerText();
    const countText = await btn.locator(".filter-count").innerText();
    const count = parseInt(countText.replace(/[()]/g, ""), 10);
    assert.equal(count, expectedCounts[catName], `Count for ${catName} must match expected`);
    assert.equal(await btn.getAttribute("role"), null, "Filter button must be simple native button (no role=tab)");
    const pressed = await btn.getAttribute("aria-pressed");
    assert.ok(pressed === "true" || pressed === "false", "Filter button must have aria-pressed");
  }

  const allTab = page1440.locator(".mockup-filter-btn").first();
  assert.equal(await allTab.getAttribute("aria-pressed"), "true", "All button should be pressed initially");

  // Grid container semantics
  const gridContainer = page1440.locator(".mockup-picker-grid");
  assert.equal(await gridContainer.getAttribute("role"), "group", "Grid container must use role='group'");
  assert.equal(await gridContainer.getAttribute("aria-label"), "Device list");

  const allDevicesInGrid = await page1440.locator(".mockup-picker-grid button").count();
  assert.equal(allDevicesInGrid, 39, "All category must display all 39 devices");

  // Verify device buttons have aria-pressed
  const activeDeviceBtn = page1440.locator(".mockup-picker-grid button.selected");
  assert.equal(await activeDeviceBtn.getAttribute("aria-pressed"), "true", "Active device button must have aria-pressed='true'");
  assert.equal(await activeDeviceBtn.getAttribute("role"), null, "Device button must be native button (no role=radio)");

  // 3. Reachability of Categories
  console.log("3. Verifying reachability of Flat, Handhelds, TV, Spatial, etc...");
  // Handhelds
  await page1440.locator(".mockup-filter-btn:has-text('Handhelds')").click();
  await page1440.waitForTimeout(200);
  const handheldNames = await page1440.locator(".mockup-picker-grid button .mockup-name-row span:first-child").allInnerTexts();
  assert.deepEqual(handheldNames, ["Nintendo Switch 2", "Steam Deck"]);

  // Web & TV
  await page1440.locator(".mockup-filter-btn:has-text('Web & TV')").click();
  await page1440.waitForTimeout(200);
  const tvNames = await page1440.locator(".mockup-picker-grid button .mockup-name-row span:first-child").allInnerTexts();
  assert.deepEqual(tvNames, ["TV 65\""]);

  // Stage (Flat)
  await page1440.locator(".mockup-filter-btn:has-text('Stage')").click();
  await page1440.waitForTimeout(200);
  const stageNames = await page1440.locator(".mockup-picker-grid button .mockup-name-row span:first-child").allInnerTexts();
  assert.deepEqual(stageNames, ["Flat"]);

  // Spatial
  await page1440.locator(".mockup-filter-btn:has-text('Spatial')").click();
  await page1440.waitForTimeout(200);
  const spatialNames = await page1440.locator(".mockup-picker-grid button .mockup-name-row span:first-child").allInnerTexts();
  assert.deepEqual(spatialNames, ["Apple Vision Pro"]);

  // 4. Verify Active Device Persistence & Notice when Filtered Out
  console.log("4. Verifying active device persistence when category is filtered out...");
  await page1440.locator(".mockup-filter-btn:has-text('Laptops')").click();
  await page1440.waitForTimeout(200);

  const summaryText = await page1440.locator(".mockup-summary").innerText();
  assert.ok(summaryText.includes("IPHONE 17"));
  assert.ok(summaryText.includes("Phones · 1,206 × 2,622"));

  const activeNotice = page1440.locator(".mockup-filter-active-notice");
  assert.ok(await activeNotice.isVisible());
  assert.ok((await activeNotice.innerText()).includes("Active: iPhone 17 (Phones)"));

  const phonesTab = page1440.locator(".mockup-filter-btn:has-text('Phones')");
  assert.ok(await phonesTab.locator(".mockup-filter-active-dot").isVisible());

  await page1440.screenshot({ path: `${outDir}/21-desktop-1440-light-filtered.png` });

  // 5. Bounded Scrolling Height
  console.log("5. Verifying bounded scrollable container...");
  const scrollBox = await page1440.locator(".mockup-picker-scroll").boundingBox();
  assert.ok(scrollBox.height <= 285, `Scroll height must be bounded <= 285px (got ${scrollBox.height})`);
  assert.ok(await sceneSection.isVisible(), "SCENE section must remain accessible");

  // 6. Keyboard Focus Return Verification (Escape and Selection)
  console.log("6. Verifying keyboard focus return to Change device trigger...");
  // Test Escape key focus return
  await page1440.locator(".mockup-filter-btn:has-text('Laptops')").focus();
  await page1440.keyboard.press("Escape");
  await page1440.waitForTimeout(300);

  assert.equal(await mockupChangeBtn.innerText(), "CHANGE", "Picker should close on Escape");
  const activeAfterEscape = await page1440.evaluate(() => document.activeElement === document.querySelector(".mockup-summary button.change-button"));
  assert.ok(activeAfterEscape, "Keyboard focus must return to .change-button after pressing Escape");
  console.log("✓ Escape returned focus directly to the Change button");

  // Reopen via keyboard Enter on CHANGE button
  await page1440.keyboard.press("Enter");
  await page1440.waitForTimeout(400);
  assert.equal(await mockupChangeBtn.innerText(), "DONE");

  // Navigate to Handhelds and select Steam Deck with keyboard
  await page1440.locator(".mockup-filter-btn:has-text('Handhelds')").click();
  await page1440.waitForTimeout(200);

  const steamDeckBtn = page1440.locator(".mockup-picker-grid button:has-text('Steam Deck')");
  await steamDeckBtn.focus();
  await page1440.keyboard.press("Enter");
  await page1440.waitForTimeout(600);

  // Picker closes and focus returns to Change device trigger
  const deckSummary = await page1440.locator(".mockup-summary").innerText();
  assert.ok(deckSummary.includes("STEAM DECK"));
  assert.equal(await mockupChangeBtn.innerText(), "CHANGE");

  const activeAfterSelect = await page1440.evaluate(() => document.activeElement === document.querySelector(".mockup-summary button.change-button"));
  assert.ok(activeAfterSelect, "Keyboard focus must return to .change-button after selecting a device with keyboard");
  console.log("✓ Keyboard device selection returned focus directly to the Change button");

  // Undo restores iPhone 17
  await page1440.locator("button[aria-label='Undo']").click();
  await page1440.waitForTimeout(600);
  const undoneSummary = await page1440.locator(".mockup-summary").innerText();
  assert.ok(undoneSummary.includes("IPHONE 17"));

  // 7. Dark mode test on 1440px
  console.log("7. Verifying 1440px dark mode...");
  await page1440.locator(".inspector-top button[aria-label='Switch to dark mode']").click();
  await page1440.waitForTimeout(400);
  await verifySourceCardNoClipping(page1440, "1440px Dark");

  await mockupChangeBtn.click();
  await page1440.waitForTimeout(400);
  await page1440.screenshot({ path: `${outDir}/22-desktop-1440-dark-picker.png` });
  await page1440.close();

  // -------------------------------------------------------------
  // PART 2: Medium Desktop / Tablet (1000px) Viewport
  // -------------------------------------------------------------
  console.log("\n--- Part 2: Medium Desktop (1000px) Verification ---");
  const page1000 = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  await setupPage(page1000);

  // Verify Source Card text sizing on 1000px Light
  await verifySourceCardNoClipping(page1000, "1000px Light");

  const mockupChangeBtn1000 = page1000.locator(".mockup-summary button.change-button");
  await mockupChangeBtn1000.click();
  await page1000.waitForTimeout(400);

  const filterBar1000 = page1000.locator(".mockup-filter-bar");
  assert.ok(await filterBar1000.isVisible(), "Filter bar must be visible at 1000px width");

  const scrollBox1000 = await page1000.locator(".mockup-picker-scroll").boundingBox();
  assert.ok(scrollBox1000.height <= 285, `Scroll height must be bounded <= 285px at 1000px (got ${scrollBox1000.height})`);

  // Verify Source Card text sizing still renders fully while picker is open
  await verifySourceCardNoClipping(page1000, "1000px Light with Picker Open");
  await page1000.screenshot({ path: `${outDir}/23-medium-1000-light-picker.png` });

  // Dark mode at 1000px
  await page1000.locator(".inspector-top button[aria-label='Switch to dark mode']").click();
  await page1000.waitForTimeout(400);
  await verifySourceCardNoClipping(page1000, "1000px Dark");
  await page1000.screenshot({ path: `${outDir}/24-medium-1000-dark-picker.png` });
  await page1000.close();

  // -------------------------------------------------------------
  // PART 3: Mobile (390px) Viewport
  // -------------------------------------------------------------
  console.log("\n--- Part 3: Mobile (390px) Verification ---");
  const pageMobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  await setupPage(pageMobile);

  // On mobile, inspector is collapsed into mobile-dock
  assert.ok(await pageMobile.locator(".mobile-dock").isVisible(), "Mobile dock must be visible on mobile viewport");
  await pageMobile.screenshot({ path: `${outDir}/25-mobile-390-light.png` });

  // Dark mode on mobile
  await pageMobile.locator(".theme-top-button").click();
  await pageMobile.waitForTimeout(400);
  await pageMobile.screenshot({ path: `${outDir}/26-mobile-390-dark.png` });
  await pageMobile.close();

  // -------------------------------------------------------------
  // PART 4: Console Error Check
  // -------------------------------------------------------------
  console.log("\n--- Part 4: Console Cleanliness ---");
  const realErrors = consoleErrors.filter((err) => !err.includes("favicon"));
  console.log("Console errors detected:", realErrors.length);
  assert.equal(realErrors.length, 0, `Expected 0 console errors, got: ${realErrors.join(", ")}`);

  console.log("\n=== ALL COMPREHENSIVE STAGE 2A CHECKS PASSED SUCCESSFULLY ===");
} finally {
  await browser.close();
}
