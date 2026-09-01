import { chromium } from "playwright-core";

// Gesture + camera probe: verifies the stage gestures (drag orbit, scroll
// rotate, Shift/Option axis, Cmd/Ctrl zoom) still drive the camera axes after
// the framing fit change. Usage: node scripts/gesture-probe.mjs [outDir]
const outDir = process.argv[2] || null;
if (outDir) await import("node:fs/promises").then((fs) => fs.mkdir(outDir, { recursive: true }));

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const consoleErrors = [];
page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
page.on("pageerror", (error) => consoleErrors.push(String(error)));

await page.goto("http://localhost:5199/", { waitUntil: "domcontentloaded" });
await page.evaluate(() => {
  localStorage.removeItem("openmock-project");
  localStorage.setItem("openmock-tour-seen", "1");
  localStorage.setItem("openmock-show-tips", "0");
});
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector(".mockup-stage", { timeout: 20000 });
await page.waitForSelector('canvas[data-renderer-status="ready"]', { timeout: 30000 });
await page.waitForTimeout(1200);

const readAxis = (label) => page.evaluate((name) => {
  const rows = Array.from(document.querySelectorAll(".camera-controls .slider-row"));
  const row = rows.find((item) => item.querySelector("span")?.textContent?.startsWith(name));
  return row ? Number.parseFloat(row.querySelector("output")?.textContent) : null;
}, label);

const results = [];
const check = async (name, before, after, minDelta = 0.5) => {
  const changed = Number.isFinite(before) && Number.isFinite(after) && Math.abs(after - before) > minDelta;
  results.push(`${changed ? "PASS" : "FAIL"} ${name}: ${before} -> ${after}`);
};

// Open the camera panel so outputs are in the DOM.
await page.locator(".camera-detail-controls").scrollIntoViewIfNeeded();

// The framing fit must actually engage at the default pose (not clamp to 1).
const fitValue = Number.parseFloat(await page.evaluate(() => document.querySelector(".three-stage-canvas")?.dataset.openmockFit || ""));
results.push(`${Number.isFinite(fitValue) && fitValue > 0.25 && fitValue < 1 ? "PASS" : "FAIL"} framing fit engaged at default pose (fit=${fitValue})`);

const stage = page.locator(".mockup-stage");
const box = await stage.boundingBox();
const cx = box.x + box.width / 2;
const cy = box.y + box.height / 2;

// 1. Drag to orbit: X and Y axes change.
const x0 = await readAxis("X");
const y0 = await readAxis("Y");
await page.mouse.move(cx, cy);
await page.mouse.down();
await page.mouse.move(cx + 120, cy - 40, { steps: 6 });
await page.mouse.up();
await page.waitForTimeout(200);
await check("drag orbit changes X", x0, await readAxis("X"));
await check("drag orbit changes Y", y0, await readAxis("Y"));

// 2. Plain scroll rotates (X axis) and lights up the live axis HUD.
const x1 = await readAxis("X");
await page.mouse.move(cx, cy);
await page.mouse.wheel(0, 240);
await page.waitForTimeout(120);
const hudActive = await page.evaluate(() => document.querySelector(".stage-axis-hud")?.dataset.active === "1");
results.push(`${hudActive ? "PASS" : "FAIL"} axis HUD appears during scroll gesture`);
if (outDir) await page.screenshot({ path: `${outDir}/hud-during-scroll.png` });
await page.waitForTimeout(200);
await check("plain scroll rotates X", x1, await readAxis("X"));

// 3. Shift + scroll tilts (Y axis).
const y1 = await readAxis("Y");
await page.keyboard.down("Shift");
await page.mouse.wheel(0, 200);
await page.keyboard.up("Shift");
await page.waitForTimeout(200);
await check("shift scroll tilts Y", y1, await readAxis("Y"));

// 4. Option/Alt + scroll rolls (Z axis).
const z0 = await readAxis("Z");
await page.keyboard.down("Alt");
await page.mouse.wheel(0, 200);
await page.keyboard.up("Alt");
await page.waitForTimeout(200);
await check("alt scroll rolls Z", z0, await readAxis("Z"));

// 5. Ctrl + scroll zooms, and the zoom fit keeps the device inside the stage.
const zoom0 = await readAxis("Zoom");
await page.keyboard.down("Control");
await page.mouse.wheel(0, -240);
await page.keyboard.up("Control");
await page.waitForTimeout(200);
await check("ctrl scroll zooms", zoom0, await readAxis("Zoom"), 0.1);

// Device fully visible and vertically centered: find the opaque (device)
// pixel bounds on the WebGL canvas and compare against the frame.
const framing = await page.evaluate(() => {
  const canvas = document.querySelector(".three-stage-canvas");
  const probe = document.createElement("canvas");
  probe.width = canvas.width; probe.height = canvas.height;
  const ctx = probe.getContext("2d");
  ctx.drawImage(canvas, 0, 0);
  const { width: w, height: h } = probe;
  const data = ctx.getImageData(0, 0, w, h).data;
  const alphaAt = (x, y) => data[(y * w + x) * 4 + 3];
  let top = -1, bottom = -1;
  for (let y = 0; y < h && top < 0; y += 2) { for (let x = 0; x < w; x += 2) if (alphaAt(x, y) > 40) { top = y; break; } }
  for (let y = h - 1; y >= 0 && bottom < 0; y -= 2) { for (let x = 0; x < w; x += 2) if (alphaAt(x, y) > 40) { bottom = y; break; } }
  const offCenterPct = top >= 0 && bottom >= 0 ? (((top + bottom) / 2 - h / 2) / h) * 100 : NaN;
  return { clearOfEdges: top > 2 && bottom < h - 3, offCenterPct };
});
results.push(`${framing.clearOfEdges ? "PASS" : "FAIL"} device clear of stage top/bottom edges`);
results.push(`${Number.isFinite(framing.offCenterPct) && Math.abs(framing.offCenterPct) < 8 ? "PASS" : "FAIL"} device vertically centered (${framing.offCenterPct?.toFixed?.(1)}% of frame height off center)`);

// 6. Slider still drives the axis directly.
const x2 = await readAxis("X");
await page.evaluate(() => {
  const rows = Array.from(document.querySelectorAll(".camera-controls .slider-row"));
  const row = rows.find((item) => item.querySelector("span")?.textContent?.startsWith("X"));
  const slider = row?.querySelector("input[type=range]");
  if (slider) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(slider, "90");
    slider.dispatchEvent(new Event("input", { bubbles: true }));
    slider.dispatchEvent(new Event("change", { bubbles: true }));
  }
});
await page.waitForTimeout(300);
await check("X slider sets axis (90°)", x2, await readAxis("X"));

if (outDir) await page.screenshot({ path: `${outDir}/gesture-probe-final.png` });
await browser.close();
console.log(results.join("\n"));
console.log(`console errors: ${consoleErrors.length}${consoleErrors.length ? "\n" + consoleErrors.slice(0, 5).join("\n") : ""}`);
