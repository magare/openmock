import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";

const devices = process.argv[2]
  ? JSON.parse(process.argv[2])
  : [
      ["Flat", "flat"],
      ["iPhone 17", "iphone-17"],
      ["iPhone 17 Pro", "iphone-17-pro"],
      ["iPhone 17 Pro Max", "iphone-17-pro-max"],
      ["Galaxy S26 Ultra", "galaxy-s26-ultra"],
      ["Pixel 10 Pro", "pixel-10-pro"],
      ["Apple Watch Ultra 3", "watch-ultra-3"],
      ["iPad Pro", "ipad-pro"],
      ["iPad mini", "ipad-mini"],
      ["MacBook Neo", "macbook-neo"],
      ["MacBook Air 13\"", "macbook-air-13"],
      ["MacBook Pro 14\"", "macbook-pro-14"],
      ["MacBook Pro 16\"", "macbook-pro-16"],
      ["iMac 24\"", "imac-24"],
      ["Studio Display", "studio-display"],
      ["Apple Vision Pro", "vision-pro"],
      ["XDR Display", "xdr-display"],
    ];

const outDir = process.argv[3] || "qa-captures/goal-sweep";
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1121, height: 900 }, deviceScaleFactor: 2 });

const logs = [];
page.on("console", (msg) => {
  if (msg.type() === "warning" || msg.type() === "error") logs.push([msg.type(), msg.text().slice(0, 400)]);
});

await page.goto("http://localhost:5199/", { waitUntil: "domcontentloaded" });

const report = [];
for (const [name, slug] of devices) {
  await page.evaluate((dev) => {
    const proj = JSON.parse(localStorage.getItem("openmock-project") || "{}");
    proj.mockup = dev;
    localStorage.setItem("openmock-project", JSON.stringify(proj));
    localStorage.setItem("openmock-tour-seen", "1");
    localStorage.setItem("openmock-mobile-onboarded", "1");
  }, name);
  await page.reload({ waitUntil: "domcontentloaded" });
  let status = "none";
  for (let i = 0; i < 40; i += 1) {
    await page.waitForTimeout(350);
    status = await page.evaluate(() => {
      const c = document.querySelector(".three-stage-canvas");
      return c ? c.getAttribute("data-renderer-status") : "no-canvas";
    });
    if (status === "ready" || status === "fallback") {
      await page.waitForTimeout(1500);
      break;
    }
  }
  const stage = await page.evaluate(() => {
    const r = document.querySelector(".mockup-stage")?.getBoundingClientRect();
    return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
  });
  const shot = await page.screenshot({
    clip: stage ? { x: stage.x, y: stage.y, width: stage.width, height: stage.height } : undefined,
  });
  await writeFile(`${outDir}/${slug}.png`, shot);
  const statusLine = `${name}: ${status}`;
  report.push(statusLine);
  console.log(statusLine);
}

const relevant = logs.filter(([, text]) => /exact|fallback|USD|texture|WebGL|error/i.test(text));
if (relevant.length) {
  await writeFile(`${outDir}/console.log`, relevant.map(([t, m]) => `[${t}] ${m}`).join("\n"));
  console.log("--- console ---");
  console.log(relevant.map(([t, m]) => `[${t}] ${m}`).join("\n").slice(0, 3000));
}
await browser.close();
