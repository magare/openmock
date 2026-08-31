import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";

// Test pattern: TOP arrow up, L marker top-left, R top-right, BOTTOM at bottom,
// red right edge, green left edge — reveals flips and mirrors unambiguously.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="1024">
<rect width="512" height="1024" fill="#202228"/>
<rect x="0" y="0" width="14" height="1024" fill="#00cc44"/>
<rect x="498" y="0" width="14" height="1024" fill="#ff2222"/>
<path d="M256 90 L346 220 L292 220 L292 300 L220 300 L220 220 L166 220 Z" fill="#f7f7f7"/>
<text x="256" y="390" font-size="130" font-family="monospace" fill="#ff8822" text-anchor="middle">TOP</text>
<text x="90" y="560" font-size="200" font-family="monospace" fill="#ffffff" text-anchor="middle">L</text>
<text x="420" y="560" font-size="200" font-family="monospace" fill="#3da5ff" text-anchor="middle">R</text>
<text x="256" y="900" font-size="120" font-family="monospace" fill="#f7f7f7" text-anchor="middle">BOT</text>
</svg>`;
const mediaDataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

const devices = process.argv[2]
  ? JSON.parse(process.argv[2])
  : [
      ["iPhone 17", "iphone-17"],
      ["iPhone 17 Pro", "iphone-17-pro"],
      ["Galaxy S26 Ultra", "galaxy-s26-ultra"],
      ["Pixel 10 Pro", "pixel-10-pro"],
      ["Apple Watch Ultra 3", "watch-ultra-3"],
      ["iPad Pro", "ipad-pro"],
      ["iPad mini", "ipad-mini"],
      ["MacBook Pro 14\"", "macbook-pro-14"],
      ["iMac 24\"", "imac-24"],
      ["Studio Display", "studio-display"],
      ["XDR Display", "xdr-display"],
    ];

const outDir = "qa-captures/orientation";
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1121, height: 900 }, deviceScaleFactor: 2 });
const logs = [];
page.on("console", (msg) => {
  if (msg.type() === "warning" || msg.type() === "error") logs.push([msg.type(), msg.text().slice(0, 500)]);
});
await page.goto("http://localhost:5173/", { waitUntil: "domcontentloaded" });

for (const [name, slug] of devices) {
  await page.evaluate(([dev, media]) => {
    const proj = JSON.parse(localStorage.getItem("ultramonk-project") || "{}");
    proj.mockup = dev;
    proj.cameraPreset = "Flat";
    proj.camera = { xAxis: 0, yAxis: 0, zAxis: 0, fov: 32, zoom: 1.35, panX: 0, panY: 0 };
    proj.media = { name: "orientation-test", type: "image/svg+xml", src: media };
    localStorage.setItem("ultramonk-project", JSON.stringify(proj));
    localStorage.setItem("ultramonk-tour-seen", "1");
    localStorage.setItem("ultramonk-red-test", "1");
    localStorage.setItem("ultramonk-collapse-uv", "1");
  }, [name, mediaDataUrl]);
  await page.reload({ waitUntil: "domcontentloaded" });
  let status = "none";
  for (let i = 0; i < 40; i += 1) {
    await page.waitForTimeout(350);
    status = await page.evaluate(() => {
      const c = document.querySelector(".three-stage-canvas");
      return c ? c.getAttribute("data-renderer-status") : "no-canvas";
    });
    if (status === "ready" || status === "fallback") {
      await page.waitForTimeout(1400);
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
const relevant = logs.filter(([, t]) => /exact|fallback|Failed|ultramock-align/i.test(t)).slice(0, 20);
if (relevant.length) console.log(relevant.map(([t, m]) => `[${t}] ${m}`).join("\n"));
await browser.close();
