import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";

const models = (process.argv[2] || "watch-ultra-3,macbook-air-13").split(",");
const modes = ["asis", "no-ao", "no-normal", "no-rough", "no-metal", "channels0", "scalars", "all"];
const outDir = "qa-captures/slot-probe";
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 1 });
for (const model of models) {
  for (const mode of modes) {
    await page.goto(`http://localhost:5173/scripts/slot-toggle-probe.html?model=${model}&mode=${mode}`, { waitUntil: "networkidle" });
    await page.waitForFunction("window.__ready === true", { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${outDir}/${model}-${mode}.png` });
    console.log(`${model} ${mode} done`);
  }
}
await browser.close();
