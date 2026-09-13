import { chromium } from "playwright-core";
import fs from "node:fs/promises";
import path from "node:path";

const outDir = path.resolve("evidence/qa/usability-stages/after");
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();

const pngBase64 = await page.evaluate(() => {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");

  // Multi-color background stripes & blocks
  // Block 1: Cyan top
  ctx.fillStyle = "#00e5ff";
  ctx.fillRect(0, 0, 1080, 400);

  // Block 2: Magenta hero
  ctx.fillStyle = "#e91e63";
  ctx.fillRect(0, 400, 1080, 500);

  // Block 3: Amber/Yellow band
  ctx.fillStyle = "#ffeb3b";
  ctx.fillRect(0, 900, 1080, 300);

  // Block 4: Deep Blue section
  ctx.fillStyle = "#1565c0";
  ctx.fillRect(0, 1200, 1080, 450);

  // Block 5: Multi-color grid at bottom
  const colors = ["#ff1744", "#00e676", "#ff9100", "#d500f9", "#00b0ff"];
  const blockW = 1080 / colors.length;
  colors.forEach((c, idx) => {
    ctx.fillStyle = c;
    ctx.fillRect(idx * blockW, 1650, blockW, 270);
  });

  // Borders & Accents
  ctx.lineWidth = 20;
  ctx.strokeStyle = "#ffffff";
  ctx.strokeRect(10, 10, 1060, 1900);

  // Large TEST Typography
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Banner text
  ctx.fillStyle = "#000000";
  ctx.font = "bold 80px monospace";
  ctx.fillText("★ OPENMOCK ★", 540, 200);

  // Main giant TEST label
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 160px sans-serif";
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 10;
  ctx.fillText("TEST", 540, 600);
  ctx.shadowColor = "transparent";

  // Subtitle
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 65px sans-serif";
  ctx.fillText("MULTICOLOR MEDIA", 540, 750);

  // Yellow band text
  ctx.fillStyle = "#000000";
  ctx.font = "bold 70px monospace";
  ctx.fillText("RECOGNIZABLE CONTENT", 540, 1050);

  // Blue card text
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 60px monospace";
  ctx.fillText("VALIDATION 2026", 540, 1350);
  ctx.font = "45px monospace";
  ctx.fillText("PREVIEW & EXPORT PARITY", 540, 1450);

  // Decorative shapes
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(200, 600, 50, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(880, 600, 50, 0, Math.PI * 2);
  ctx.fill();

  return canvas.toDataURL("image/png");
});

await browser.close();

const buffer = Buffer.from(pngBase64.split(",")[1], "base64");
const testImgPath = path.join(outDir, "test-screen-media.png");
await fs.writeFile(testImgPath, buffer);
console.log(`Generated high-visibility test image: ${testImgPath} (${buffer.length} bytes)`);
