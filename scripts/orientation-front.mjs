import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";

const devices = process.argv[2]
  ? JSON.parse(process.argv[2])
  : [
      ["iPhone 17", "iphone-17-front"],
      ["Pixel 10 Pro", "pixel-10-pro-front"],
      ["Apple Watch Ultra 3", "watch-front"],
      ["iPad Pro", "ipad-pro-front"],
      ["iPad mini", "ipad-mini-front"],
    ];

const outDir = "qa-captures/orientation-front";
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1121, height: 900 }, deviceScaleFactor: 2 });
await page.goto("http://localhost:5173/", { waitUntil: "domcontentloaded" });

for (const [name, slug] of devices) {
  await page.evaluate((dev) => {
    const proj = JSON.parse(localStorage.getItem("openmock-project") || "{}");
    proj.mockup = dev;
    proj.cameraPreset = "Flat";
    proj.camera = { xAxis: 0, yAxis: 0, zAxis: 0, fov: 24, zoom: 1.9, panX: 0, panY: -0.17 };
    localStorage.setItem("openmock-project", JSON.stringify(proj));
    localStorage.setItem("openmock-tour-seen", "1");
    localStorage.setItem("openmock-mobile-onboarded", "1");
  }, name);
  await page.reload({ waitUntil: "domcontentloaded" });
  let status = "none";
  for (let i = 0; i < 40; i += 1) {
    await page.waitForTimeout(350);
    status = await page.evaluate(() => document.querySelector(".three-stage-canvas")?.getAttribute("data-renderer-status") || "no-canvas");
    if (status === "ready" || status === "fallback") {
      await page.waitForTimeout(1500);
      break;
    }
  }
  const stage = await page.evaluate(() => {
    const r = document.querySelector(".mockup-stage")?.getBoundingClientRect();
    return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
  });
  const shot = await page.screenshot({ clip: stage ? { x: stage.x, y: stage.y, width: stage.width, height: stage.height } : undefined });
  await writeFile(`${outDir}/${slug}.png`, shot);
  console.log(`${name}: ${status}`);
}
await browser.close();
