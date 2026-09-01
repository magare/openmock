import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";

// Usage: node scripts/ui-capture.mjs <outDir> [mode]
// mode "full" (default) captures a broad state matrix; "quick" just the two base shots.
const outDir = process.argv[2] || "qa-captures/ui-round";
const mode = process.argv[3] || "full";
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

const fresh = async () => {
  await page.goto("http://localhost:5199/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.removeItem("openmock-project");
    localStorage.setItem("openmock-tour-seen", "1");
    localStorage.setItem("openmock-mobile-onboarded", "1");
    localStorage.setItem("openmock-show-tips", "0");
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(".mockup-stage", { timeout: 20000 });
  await page.waitForTimeout(1200);
};

const shot = async (name) => {
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${outDir}/${name}.png` });
};
const step = async (name, fn) => {
  try { await fn(); } catch (error) { console.log(`step failed: ${name}: ${error.message?.split("\n")[0]}`); }
};

await fresh();
await shot("01-desktop-light");
await page.evaluate(() => localStorage.setItem("openmock-theme", "dark"));
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector(".mockup-stage", { timeout: 20000 });
await page.waitForTimeout(1000);
await shot("02-desktop-dark");
await page.evaluate(() => localStorage.setItem("openmock-theme", "light"));

if (mode === "full") {
  // Timeline states (before popovers, so nothing can overlay them)
  await step("timeline-simple", async () => {
    await page.getByRole("button", { name: "Maximize timeline" }).click();
    await page.waitForTimeout(300);
    await page.locator(".timeline-mode button", { hasText: "SIMPLE" }).click();
    await shot("10-timeline-simple");
    await page.locator(".timeline-mode button", { hasText: "ADVANCED" }).click();
    await shot("10b-timeline-advanced");
  });
  await step("timeline-presets", async () => {
    await page.locator(".timeline-toolbar").getByRole("button", { name: "PRESETS" }).click();
    await shot("11-timeline-presets");
    await page.keyboard.press("Escape");
  });

  // Inspector states
  await step("scene-picker", async () => {
    await page.getByRole("button", { name: "Change scene" }).click();
    await shot("03-scene-picker");
    await page.getByRole("button", { name: "Change scene" }).click();
  });
  await step("mockup-picker", async () => {
    await page.getByRole("button", { name: "Change mockup" }).click();
    await shot("04-mockup-picker");
    await page.getByRole("button", { name: "Change mockup" }).click();
  });

  // Menu + help popovers
  await step("menu", async () => {
    await page.getByRole("button", { name: "Open menu" }).click();
    await shot("05-menu");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: /TEMPLATES/ }).click();
    await shot("06-templates");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "HELP" }).click();
    await shot("07-help");
    await page.keyboard.press("Escape");
  });

  // Export popover
  await step("export", async () => {
    await page.getByRole("button", { name: "Export" }).click();
    await shot("08-export-image");
    await page.getByRole("tab", { name: "Video" }).click();
    await shot("09-export-video");
    await page.keyboard.press("Escape");
  });

  // Camera section visible (scroll inspector to camera controls)
  await step("camera-controls", async () => {
    await page.locator(".camera-detail-controls").scrollIntoViewIfNeeded();
    await shot("12-camera-controls");
  });

  // Effects
  await step("effect-picker", async () => {
    await page.locator(".effect-detail-controls").scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: "Add effect" }).click();
    await shot("13-effect-picker");
    await page.keyboard.press("Escape");
  });

  // Modals
  await step("preferences", async () => {
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("menuitem", { name: "Preferences" }).click();
    await shot("14-preferences");
    await page.keyboard.press("Escape");
  });

  // Medium + narrow desktop
  await step("responsive", async () => {
    await page.setViewportSize({ width: 1100, height: 800 });
    await shot("15-desktop-1100");
    await page.setViewportSize({ width: 900, height: 800 });
    await shot("16-desktop-900");
  });

  // Mobile
  await step("mobile", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector(".mockup-stage", { timeout: 20000 });
    await page.waitForTimeout(1000);
    await shot("17-mobile");
  });
}

await browser.close();
console.log(`Saved captures to ${outDir}`);
