import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";
import { mockupOptions, slugify } from "../src/editorState.js";

const rawDevices = process.argv[2]
  ? JSON.parse(process.argv[2])
  : mockupOptions.map(([name]) => [name, slugify(name)]);
const usedSlugs = new Map();
const devices = rawDevices.map(([name, slug]) => {
  const baseSlug = name.includes("+") && !slug.includes("plus") ? `${slug}-plus` : slug;
  const occurrence = usedSlugs.get(baseSlug) || 0;
  usedSlugs.set(baseSlug, occurrence + 1);
  return [name, occurrence ? `${baseSlug}-${occurrence + 1}` : baseSlug];
});

const outDir = process.argv[3] || "qa-captures/goal-sweep";
const cameraPreset = process.argv[4] || "Angled";
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
  await page.evaluate(({ dev, preset }) => {
    const proj = JSON.parse(localStorage.getItem("openmock-project") || "{}");
    proj.mockup = dev;
    proj.cameraPreset = preset;
    localStorage.setItem("openmock-project", JSON.stringify(proj));
    localStorage.setItem("openmock-tour-seen", "1");
    localStorage.setItem("openmock-mobile-onboarded", "1");
  }, { dev: name, preset: cameraPreset });
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
