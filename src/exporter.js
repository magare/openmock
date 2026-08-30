import { backgroundAssetMap, presetBackgrounds } from "./editorState.js";

const localAsset = (path) => `/assets/${path}`;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load ${src}`));
    image.src = src;
  });
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawCover(ctx, image, x, y, width, height) {
  const sourceRatio = image.width / image.height;
  const targetRatio = width / height;
  let sx = 0; let sy = 0; let sw = image.width; let sh = image.height;
  if (sourceRatio > targetRatio) {
    sw = image.height * targetRatio;
    sx = (image.width - sw) / 2;
  } else {
    sh = image.width / targetRatio;
    sy = (image.height - sh) / 2;
  }
  ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
}

function drawGradientBackground(ctx, project, width, height) {
  const tab = project.background?.tab || "Image";
  if (tab === "Color") {
    ctx.fillStyle = project.background?.color || "#f2f2f2";
    ctx.fillRect(0, 0, width, height);
    return;
  }
  const preset = presetBackgrounds[project.background?.preset] || presetBackgrounds.None;
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, preset.backgroundColor || "#d9d9d9");
  gradient.addColorStop(0.52, tab === "Preset" ? "#f3f3f3" : "#dddddd");
  gradient.addColorStop(1, tab === "Preset" ? "#4b5052" : "#f2f2f2");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

async function drawBackground(ctx, project, width, height) {
  const tab = project.background?.tab || "Image";
  if (tab === "Image") {
    try {
      const image = await loadImage(localAsset(backgroundAssetMap[project.background?.image] || backgroundAssetMap.Whisp));
      drawCover(ctx, image, 0, 0, width, height);
      return;
    } catch {
      // Keep the generated export useful even if an optional local background is unavailable.
    }
  }
  drawGradientBackground(ctx, project, width, height);
}

async function drawMedia(ctx, project, x, y, width, height) {
  const mediaSource = project.media?.src || localAsset("source/starter-screen.jpg");
  try {
    const media = await loadImage(mediaSource);
    drawCover(ctx, media, x, y, width, height);
  } catch {
    ctx.fillStyle = "#161718";
    ctx.fillRect(x, y, width, height);
  }
}

function drawDeviceFrame(ctx, project, width, height, deviceWidth, deviceHeight) {
  const angle = ((Number(project.camera?.xAxis) || -24.52) * Math.PI) / 180 * 0.8;
  const zoom = Math.max(0.55, Math.min(1.55, (Number(project.camera?.zoom) || 1.9) / 1.9));
  const panX = (Number(project.camera?.panX) || 0) * width * 0.15;
  const panY = (Number(project.camera?.panY) || 0) * height * 0.12;
  const isFlat = project.mockup === "Flat";
  const w = isFlat ? width * 0.62 : deviceWidth * zoom;
  const h = isFlat ? height * 0.48 : deviceHeight * zoom;
  const centerX = width * 0.5 + panX;
  const centerY = height * (isFlat ? 0.52 : 0.57) + panY;
  const border = Math.max(5, w * 0.035);

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(isFlat ? 0 : angle);
  ctx.translate(-w / 2, -h / 2);
  ctx.shadowColor = "rgba(0,0,0,.28)";
  ctx.shadowBlur = Math.max(10, w * 0.09);
  ctx.shadowOffsetX = w * 0.09;
  ctx.shadowOffsetY = h * 0.06;
  roundedRect(ctx, 0, 0, w, h, isFlat ? w * 0.05 : w * 0.17);
  ctx.fillStyle = project.finish === "Black" ? "#090a0b" : project.finish === "Mist Blue" ? "#afc0c7" : project.finish === "Sage" ? "#a2b1a6" : project.finish === "Lavender" ? "#c0b5c9" : "#111213";
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.save();
  roundedRect(ctx, border, border, w - border * 2, h - border * 2, isFlat ? w * 0.04 : w * 0.135);
  ctx.clip();
  return { x: border, y: border, w: w - border * 2, h: h - border * 2, frameW: w, frameH: h };
}

function finishDeviceFrame(ctx) {
  ctx.restore();
  ctx.restore();
}

export async function renderProjectCanvas(project, { width = 1920, height = 1080, watermark = true } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas rendering is unavailable in this browser.");
  if (project.export?.transparent) ctx.clearRect(0, 0, canvas.width, canvas.height);
  else await drawBackground(ctx, project, canvas.width, canvas.height);

  const frame = drawDeviceFrame(ctx, project, canvas.width, canvas.height, canvas.width * 0.26, canvas.height * 0.76);
  await drawMedia(ctx, project, frame.x, frame.y, frame.w, frame.h);
  ctx.fillStyle = "rgba(255,255,255,.13)";
  ctx.fillRect(frame.x, frame.y, frame.w, frame.h * 0.22);
  if (project.effects?.includes("Glass Border")) {
    ctx.strokeStyle = "rgba(255,255,255,.82)";
    ctx.lineWidth = Math.max(2, frame.w * 0.012);
    roundedRect(ctx, frame.x + 4, frame.y + 4, frame.w - 8, frame.h - 8, Math.max(8, frame.w * 0.1));
    ctx.stroke();
  }
  if (project.effects?.includes("Vignette")) {
    const vignette = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.width * 0.15, canvas.width / 2, canvas.height / 2, canvas.width * 0.75);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,.34)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  finishDeviceFrame(ctx);

  if (watermark && project.export?.watermark && !project.export?.transparent) {
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = "#fff";
    ctx.font = `${Math.max(12, Math.round(canvas.width * 0.011))}px GeistMono, monospace`;
    ctx.textAlign = "right";
    ctx.fillText("ULTRAMONK", canvas.width - 24, canvas.height - 22);
    ctx.restore();
  }
  return canvas;
}

function imageSize(value) {
  if (value.includes("1290")) return [1290, 2796];
  if (value.includes("2064")) return [2064, 2752];
  if (value.includes("2880")) return [2880, 1800];
  if (value.includes("1080 × 1920")) return [1080, 1920];
  if (value.includes("1920 × 1080")) return [1920, 1080];
  if (value.includes("1280×720")) return [1280, 720];
  if (value.includes("Square")) return [1080, 1080];
  if (value.includes("Portrait")) return [1080, 1350];
  return [1920, 1080];
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportImage(project) {
  const [width, height] = imageSize(project.export?.imageSize || "16:9 — 1920×1080 (1080P)");
  const canvas = await renderProjectCanvas(project, { width, height });
  const format = project.export?.format || "jpg";
  const mime = format === "png" ? "image/png" : format === "webp" ? "image/webp" : "image/jpeg";
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, 0.94));
  if (!blob) throw new Error("The browser could not encode this image.");
  downloadBlob(blob, `ultramonk-export.${format}`);
  return { width, height, format };
}

export async function exportVideo(project, onProgress = () => {}) {
  if (typeof MediaRecorder === "undefined") throw new Error("Video export is not supported in this browser.");
  const [width, height] = imageSize(project.export?.videoSize || "16:9 — 1280×720 (720P)");
  const canvas = await renderProjectCanvas(project, { width: Math.min(width, 1280), height: Math.min(height, 720), watermark: false });
  const stream = canvas.captureStream(Number(project.export?.fps) || 30);
  const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((type) => MediaRecorder.isTypeSupported(type)) || "video/webm";
  const recorder = new MediaRecorder(stream, { mimeType: mime });
  const chunks = [];
  recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
  const duration = 1800;
  const start = performance.now();
  const animate = (now) => {
    const progress = Math.min(1, (now - start) / duration);
    ctxFrame(canvas, project, progress);
    onProgress(progress);
    if (progress < 1) window.requestAnimationFrame(animate);
  };
  const done = new Promise((resolve) => { recorder.onstop = () => resolve(new Blob(chunks, { type: mime })); });
  recorder.start();
  window.requestAnimationFrame(animate);
  window.setTimeout(() => recorder.stop(), duration + 60);
  const blob = await done;
  stream.getTracks().forEach((track) => track.stop());
  downloadBlob(blob, "ultramonk-export.webm");
  onProgress(1);
  return { width: canvas.width, height: canvas.height, format: "webm" };
}

function ctxFrame(canvas, project, progress) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const previous = project.camera;
  const drift = Math.sin(progress * Math.PI * 2) * 5;
  const animated = { ...project, camera: { ...previous, xAxis: (Number(previous?.xAxis) || -24.52) + drift, panX: (Number(previous?.panX) || 0) + Math.sin(progress * Math.PI * 2) * 0.02 } };
  renderProjectCanvas(animated, { width: canvas.width, height: canvas.height, watermark: false }).then((next) => ctx.drawImage(next, 0, 0));
}
