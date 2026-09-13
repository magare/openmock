import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";

const outDir = "evidence/qa/scene-probe";
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await page.goto("http://localhost:5199/", { waitUntil: "domcontentloaded" });

// Fresh project so the probe always starts from the documented defaults.
await page.evaluate(() => {
  localStorage.removeItem("openmock-project");
  localStorage.setItem("openmock-tour-seen", "1");
  localStorage.setItem("openmock-mobile-onboarded", "1");
});
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector(".mockup-stage", { timeout: 20000 });
await page.waitForSelector(".scene-summary", { timeout: 20000 });

const readState = () => page.evaluate(() => {
  const stage = document.querySelector(".mockup-stage");
  const rows = [...document.querySelectorAll(".inspector-panel .wide-select")].map((el) => el.textContent);
  const layer = document.querySelector(".stage-background-layer");
  return {
    stageClass: stage?.className,
    stageColor: stage?.style.backgroundColor,
    layerImage: layer?.style.backgroundImage?.slice(0, 60) || null,
    layerBlur: layer?.style.filter,
    sceneSummary: document.querySelector(".scene-summary")?.textContent,
    rows: rows.filter((text) => /LIGHTING|BACKGROUND|FINISH/.test(text)),
    bgImageRow: document.querySelector(".background-image-row")?.textContent || null,
  };
});

const shoot = async (name) => {
  await page.waitForTimeout(600);
  const stage = await page.evaluate(() => {
    const r = document.querySelector(".mockup-stage")?.getBoundingClientRect();
    return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : undefined;
  });
  await page.screenshot({ path: `${outDir}/${name}.png`, clip: stage });
};

console.log("initial:", JSON.stringify(await readState(), null, 2));
await shoot("0-initial");

await page.getByRole("button", { name: "Change scene" }).click();
await page.waitForTimeout(250);
await shoot("1-picker-open");

const scenes = ["Dark Room MacBook", "Concrete Dark", "Studio", "Custom scene"];
for (const scene of scenes) {
  if (!(await page.locator(".scene-picker").count())) {
    await page.getByRole("button", { name: "Change scene" }).click();
    await page.waitForTimeout(200);
  }
  await page.locator(".scene-picker button", { hasText: scene }).click();
  console.log(scene, "→", JSON.stringify(await readState(), null, 2));
  await shoot(`scene-${scene.toLowerCase().replace(/[^a-z]+/g, "-")}`);
}

// Manual edit after a scene preset must flip the summary back to Custom.
await page.getByRole("button", { name: /^Lighting / }).click();
await page.waitForTimeout(200);
await page.locator(".choice-popover button", { hasText: "Warm Glow" }).click();
await page.waitForTimeout(300);
console.log("manual lighting edit →", JSON.stringify(await readState(), null, 2));
await shoot("2-manual-edit-custom");

// BG BLUR slider must visibly blur the backdrop.
await page.locator('label:has-text("BG BLUR") input').fill("0");
await page.waitForTimeout(300);
console.log("bgBlur 0 →", JSON.stringify(await readState(), null, 2));
await shoot("3-bgblur-zero");

await browser.close();
