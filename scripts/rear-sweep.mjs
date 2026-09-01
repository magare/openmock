import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";

const devices = [
  ["iPhone 17 Pro", "iphone-17-pro-rear"],
  ["Galaxy S26 Ultra", "galaxy-s26-ultra-rear"],
  ["Pixel 10 Pro", "pixel-10-pro-rear"],
  ["Apple Watch Ultra 3", "watch-rear"],
  ["iPad mini", "ipad-mini-rear"],
];

const outDir = "qa-captures/rear";
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1121, height: 900 }, deviceScaleFactor: 2 });
await page.goto("http://localhost:5173/", { waitUntil: "domcontentloaded" });

for (const [name, slug] of devices) {
  await page.evaluate((dev) => {
    const proj = JSON.parse(localStorage.getItem("openmock-project") || "{}");
    proj.mockup = dev;
    proj.cameraPreset = "Back";
    localStorage.setItem("openmock-project", JSON.stringify(proj));
    localStorage.setItem("openmock-tour-seen", "1");
  }, name);
  await page.reload({ waitUntil: "domcontentloaded" });
  let status = "none";
  for (let i = 0; i < 40; i += 1) {
    await page.waitForTimeout(350);
    status = await page.evaluate(() => document.querySelector(".three-stage-canvas")?.getAttribute("data-renderer-status"));
    if (status === "ready" || status === "fallback") { await page.waitForTimeout(1500); break; }
  }
  const stage = await page.evaluate(() => {
    const r = document.querySelector(".mockup-stage")?.getBoundingClientRect();
    return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
  });
  const shot = await page.screenshot({ clip: stage || undefined });
  await writeFile(`${outDir}/${slug}.png`, shot);
  console.log(`${name}: ${status}`);
}
await browser.close();
