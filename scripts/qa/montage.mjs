import { chromium } from "playwright-core";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const dir = process.argv[2] || "evidence/qa/goal-sweep-final";
const files = readdirSync(dir).filter((f) => f.endsWith(".png") && f !== "montage.png").sort();
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 820, height: 600 } });
const cols = 3;
const cellW = 270;
const cellH = 282;
const rows = Math.ceil(files.length / cols);
const html = files.map((f, i) => {
  const left = (i % cols) * cellW;
  const top = Math.floor(i / cols) * cellH;
  const data = `data:image/png;base64,${readFileSync(resolve(dir, f)).toString("base64")}`;
  return `<div style="position:absolute;left:${left}px;top:${top}px;width:${cellW - 6}px;height:${cellH - 6}px;overflow:hidden">
    <img src="${data}" style="width:100%;height:100%;object-fit:cover;object-position:center">
    <span style="position:absolute;top:2px;left:4px;background:#000c;color:#fff;font:12px sans-serif;padding:1px 6px">${f.replace(".png", "")}</span>
  </div>`;
}).join("");
await page.setContent(`<body style="margin:0"><div style="position:relative;width:${cols * cellW}px;height:${rows * cellH}px;background:#ccc">${html}</div></body>`);
await page.waitForTimeout(3000);
await page.screenshot({ path: `${dir}/montage.png`, fullPage: true });
await browser.close();
console.log("montage written:", `${dir}/montage.png`);
