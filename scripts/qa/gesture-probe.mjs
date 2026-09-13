import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";
import { createDefaultProject } from "../../src/editorState.js";

// Run with the local server on 5199. All browser storage is isolated.
// Usage: npm run qa:gestures -- evidence/qa/local/movement
const outDir = process.argv[2];
if (outDir) await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (error) => errors.push(String(error)));
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
const fixture = createDefaultProject();
fixture.contactShadow = false;
fixture.blur.strength = 0;
await page.addInitScript((project) => {
  if (!localStorage.getItem("openmock-project")) localStorage.setItem("openmock-project", JSON.stringify(project));
  localStorage.setItem("openmock-tour-seen", "1");
  localStorage.setItem("openmock-mobile-onboarded", "1");
  localStorage.setItem("openmock-show-tips", "0");
}, fixture);
const ready = () => page.waitForSelector('canvas[data-renderer-status="ready"]', { timeout: 45000 });
const camera = () => page.evaluate(() => JSON.parse(localStorage.getItem("openmock-project")).camera);
const settle = () => page.waitForTimeout(100);
const tool = (name) => page.getByRole("toolbar", { name: "Device movement" }).getByRole("button", { name, exact: true });
const screenshot = (name) => outDir ? page.screenshot({ path: `${outDir}/${name}.png` }) : Promise.resolve();
const undo = async () => { await page.locator('.topbar button[aria-label="Undo"]').click(); await settle(); };
const reset = async () => { await tool("Reset view").click(); await settle(); };
const drag = async (dx, dy, modifiers = []) => {
  const box = await page.locator(".mockup-stage").boundingBox();
  const x = box.x + box.width * 0.5, y = box.y + box.height * 0.52;
  for (const key of modifiers) await page.keyboard.down(key);
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 12 }); await page.mouse.up();
  for (const key of modifiers) await page.keyboard.up(key);
  await settle();
};
const sameCamera = (a, b) => {
  for (const key of ["xAxis", "yAxis", "zAxis", "zoom", "fov", "panX", "panY"]) assert.ok(Math.abs(a[key] - b[key]) < 1e-6, `${key}: ${a[key]} != ${b[key]}`);
};
const bounds = () => page.evaluate(() => {
  const source = document.querySelector(".three-stage-canvas");
  const probe = document.createElement("canvas"); probe.width = source.width; probe.height = source.height;
  const ctx = probe.getContext("2d"); ctx.drawImage(source, 0, 0);
  const pixels = ctx.getImageData(0, 0, probe.width, probe.height).data;
  let left = probe.width, right = 0, top = probe.height, bottom = 0;
  for (let y = 0; y < probe.height; y += 2) for (let x = 0; x < probe.width; x += 2) {
    if (pixels[(y * probe.width + x) * 4 + 3] < 40) continue;
    left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  return { x: (left + right) / 2 / devicePixelRatio, y: (top + bottom) / 2 / devicePixelRatio, left, right, top, bottom, width: probe.width, height: probe.height };
});
try {
  await page.goto(process.env.OPENMOCK_URL || "http://localhost:5199/", { waitUntil: "domcontentloaded" });
  await ready(); await reset();
  const start = await camera();
  await drag(100, 0);
  const rotated = await camera();
  assert.ok(Math.abs(rotated.xAxis - start.xAxis) > 10, "horizontal drag turns the device");
  // On a phone, serialized Z compensates the old built-in roll. The actual
  // device stays level even though its legacy coordinate fields both change.
  assert.ok(Math.abs(rotated.zAxis - rotated.xAxis * 0.65) < 1, "horizontal drag adds no screen roll");
  await undo(); sameCamera(await camera(), start);
  await page.locator('.topbar button[aria-label="Redo"]').click(); await settle();
  sameCamera(await camera(), rotated);
  await page.reload({ waitUntil: "domcontentloaded" }); await ready(); sameCamera(await camera(), rotated);
  console.log("PASS rotation, one-step undo/redo, and persistence across reload");

  await reset(); await tool("Fine").click(); await drag(100, 0);
  const fine = await camera(); assert.ok(Math.abs(fine.xAxis) > 3 && Math.abs(fine.xAxis) < 6, "Fine is five times slower");
  await tool("Fine").click(); await reset(); await drag(0, 70);
  assert.ok((await camera()).yAxis > 10, "downward drag tilts toward the cursor");
  await reset(); await tool("Roll").click();
  const rollStart = await camera();
  const rollBox = await page.locator(".mockup-stage").boundingBox();
  const rollX = rollBox.x + rollBox.width / 2, rollY = rollBox.y + rollBox.height / 2;
  await page.mouse.move(rollX, rollY); await page.mouse.down();
  await page.mouse.move(rollX, rollY + 40, { steps: 4 }); // Initial vertical motion does nothing in Roll.
  await page.mouse.move(rollX + 100, rollY + 40, { steps: 8 }); await page.mouse.up(); await settle();
  assert.ok((await camera()).zAxis < -20, "Roll spins clockwise on a rightward drag");
  await undo(); sameCamera(await camera(), rollStart);
  await reset(); await tool("Move").click();
  const beforeMove = await bounds(); await drag(70, 40); const afterMove = await bounds();
  assert.ok(Math.abs(afterMove.x - beforeMove.x - 70) < 8, `Move horizontal travel: ${afterMove.x - beforeMove.x}px`);
  assert.ok(Math.abs(afterMove.y - beforeMove.y - 40) < 8, `Move vertical travel: ${afterMove.y - beforeMove.y}px`);
  console.log("PASS Fine, vertical rotation, Roll, and device following pointer position");

  const beforeZoom = await camera(); await page.mouse.wheel(0, -100); await settle();
  const afterZoom = await camera(); assert.ok(afterZoom.zoom > beforeZoom.zoom);
  sameCamera({ ...afterZoom, zoom: beforeZoom.zoom }, beforeZoom);
  await undo(); sameCamera(await camera(), beforeZoom);
  await reset(); await tool("Rotate").click();
  const box = await page.locator(".mockup-stage").boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2, { steps: 4 });
  await page.locator(".mockup-stage").dispatchEvent("pointercancel", { pointerId: 1, pointerType: "mouse" });
  await settle(); const cancelled = await camera();
  await page.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2); await page.mouse.up(); await settle();
  sameCamera(await camera(), cancelled);
  assert.ok(!await page.locator(".mockup-stage").evaluate((el) => el.classList.contains("is-manipulating")), "cancel releases gesture");
  console.log("PASS scroll zoom, scroll undo, and pointer cancellation");

  await reset(); await screenshot("desktop-movement");
  const framed = await bounds();
  assert.ok(framed.top > 2 && framed.bottom < framed.height - 3, "reset keeps the device in frame");
  assert.ok(Math.abs(framed.x - framed.width / 2) < 10, "reset centers the device");
  // Pixel-accurate panning on a second viewport size and zoom level.
  await page.setViewportSize({ width: 900, height: 800 }); await settle(); await tool("Move").click();
  const narrowBefore = await bounds(); await drag(-50, 30); const narrowAfter = await bounds();
  assert.ok(Math.abs(narrowAfter.x - narrowBefore.x + 50) < 8, "narrow Move remains direct");
  await screenshot("narrow-movement");
  await page.setViewportSize({ width: 390, height: 844 }); await settle(); await reset();
  for (const name of ["Rotate", "Move", "Roll", "Fine", "Reset view"]) {
    const button = await tool(name).boundingBox();
    assert.ok(button && button.x >= 0 && button.x + button.width <= 390, `${name} fits on mobile`);
  }
  await tool("Rotate").click(); await drag(50, 20); assert.ok(Math.abs((await camera()).xAxis) > 2);
  await screenshot("mobile-movement");
  console.log("PASS framing, narrow viewport movement, and accessible mobile controls");
  assert.deepEqual(errors, [], "browser console is clean");
  console.log("PASS no browser errors");
} finally {
  await browser.close();
}
