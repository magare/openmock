import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";

const outDir = "evidence/qa/iphone-16-fix";
await mkdir(outDir, { recursive: true });

const shots = [
  // yAxis feeds pitch and xAxis feeds yaw (sign-flipped for phones) minus a
  // roll contribution, so 180° yaw needs a matching zAxis cancellation.
  ["back", { xAxis: -180, yAxis: 8, zAxis: -117, fov: 28, zoom: 1.85, panX: 0, panY: -0.08 }],
  ["angled", { xAxis: -24, yAxis: 12, zAxis: 0, fov: 24, zoom: 1.9, panX: 0.06, panY: -0.17 }],
  ["front", { xAxis: 0, yAxis: 0, zAxis: 0, fov: 32, zoom: 1.35, panX: 0, panY: -0.02 }],
  ["detail", { xAxis: -34, yAxis: 4, zAxis: 0, fov: 22, zoom: 2.55, panX: -0.08, panY: -0.1 }],
];

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1121, height: 900 }, deviceScaleFactor: 2 });

const logs = [];
page.on("console", (msg) => {
  if (msg.type() === "warning" || msg.type() === "error") logs.push([msg.type(), msg.text().slice(0, 300)]);
});

for (const [slug, pose] of shots) {
  await page.addInitScript((cameraPose) => {
    // The live camera comes from the active track's keyframes, so both
    // keyframes carry the pose under test.
    const keyframe = (id, time) => ({ id, time, camera: { ...cameraPose }, blur: null, easing: "Linear" });
    const proj = {
      cameraPreset: "Manual",
      camera: { ...cameraPose },
      mockup: "iPhone 16",
      activeTrackId: "shot-1",
      playhead: 0,
      tracks: [
        { id: "shot-1", name: "Shot 1", kind: "scene", duration: 3, selected: true, keyframes: [keyframe("kf-1", 0), keyframe("kf-2", 3)] },
      ],
    };
    window.localStorage.setItem("openmock-project", JSON.stringify(proj));
    window.localStorage.setItem("openmock-tour-seen", "1");
    window.localStorage.setItem("openmock-mobile-onboarded", "1");
  }, pose);
  await page.goto("http://localhost:5199/", { waitUntil: "domcontentloaded" });
  let status = "none";
  for (let i = 0; i < 40; i += 1) {
    await page.waitForTimeout(350);
    status = await page.evaluate(() => document.querySelector(".three-stage-canvas")?.getAttribute("data-renderer-status"));
    if (status === "ready" || status === "fallback") { await page.waitForTimeout(2500); break; }
  }
  const stage = await page.evaluate(() => {
    const r = document.querySelector(".mockup-stage")?.getBoundingClientRect();
    return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
  });
  const shot = await page.screenshot({ clip: stage || undefined });
  await writeFile(`${outDir}/${slug}.png`, shot);
  console.log(`${slug}: ${status}`);
}

await browser.close();
console.log(logs.length ? `console: ${JSON.stringify(logs, null, 2)}` : "console clean");
