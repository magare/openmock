export const templateItems = [
  ["Concrete Macbook", "concrete-macbook.jpg", false],
  ["Macbook 2", "macbook-2.jpg", false],
  ["Dark Room Macbook", "dark-room-macbook.jpg", false],
  ["Macbook 1", "macbook-1.jpg", false],
  ["Watch ultra 1", "watch-ultra-1.jpg", false],
  ["iPhone 1", "iphone-1.jpg", false],
  ["iPhone 2", "iphone-2.jpg", false],
  ["App Store iPhone Images", "app-store-iphone.jpg", false],
  ["XDR 1", "xdr-1.jpg", false],
  ["Tablet corner", "tablet-corner.jpg", false],
  ["Linear", "linear.jpg", false],
  ["Brutal phone", "brutal-phone.jpg", false],
  ["Spectrum Warfare", "spectrum-warfare.jpg", false],
  ["Hero detail", "hero-detail.jpg", false],
  ["Flat look", "flat-look.jpg", false],
  ["Violet Glass", "violet-glass.jpg", false],
  ["Clean demo", "clean-demo.jpg", false],
];

export const ratioOptions = ["Fill", "21:9", "16:9", "3:2", "4:3", "1:1", "4:5", "3:4", "2:3", "9:16"];
export const appStoreOptions = [
  ["App Store · iPhone", "1290 × 2796"],
  ["App Store · iPad", "2064 × 2752"],
  ["App Store · Mac", "2880 × 1800"],
  ["App Store Video · Horizontal", "1920 × 1080"],
  ["App Store Video · Vertical", "1080 × 1920"],
];
export const sceneOptions = [
  ["Custom scene", "Custom lighting + background", false, "custom"],
  ["Dark Room MacBook", "", false, "dark-room"],
  ["Concrete Dark", "", false, "concrete"],
  ["Studio", "", false, "studio"],
];
// Scene presets bundle the lighting + background environment they stand for; "custom" keeps the user's own controls.
export const scenePresetPatch = {
  "dark-room": { lighting: "Dark Rim", contactShadow: true, bgBlur: 0.85, background: { tab: "Color", color: "#0b0c0d", preset: "None", image: "Onyx" } },
  concrete: { lighting: "Default", contactShadow: true, bgBlur: 0.6, background: { tab: "Preset", color: "#F2F2F2", preset: "Metal", image: "Whisp" } },
  studio: { lighting: "Studio Soft", contactShadow: false, bgBlur: 0.3, background: { tab: "Image", color: "#F2F2F2", preset: "None", image: "Whisp" } },
};

export function scenePatch(scene) {
  return scenePresetPatch[scene] || {};
}

export const mockupOptions = [
  ["Flat", "FREE", false],
  ["TV 65\"", "FREE", false],
  ["iPhone 16", "FREE", false],
  ["iPhone 17", "FREE", false],
  ["iPhone 17 Air", "FREE", false],
  ["iPhone 17 Pro", "FREE", false],
  ["iPhone 17 Pro Max", "FREE", false],
  ["Galaxy S26", "FREE", false],
  ["Galaxy S26+", "FREE", false],
  ["Galaxy S26 Ultra", "FREE", false],
  ["Galaxy Z Fold 8", "FREE", false],
  ["Galaxy Z Flip 8", "FREE", false],
  ["Pixel 10", "FREE", false],
  ["Pixel 10 Pro", "FREE", false],
  ["Pixel 10 Pro XL", "FREE", false],
  ["Galaxy Tab S11 Ultra", "FREE", false],
  ["iPad (A16)", "FREE", false],
  ["iPad Air 11\"", "FREE", false],
  ["iPad Air 13\"", "FREE", false],
  ["iPad mini", "FREE", false],
  ["iPad Pro", "FREE", false],
  ["Kindle Paperwhite", "FREE", false],
  ["Apple Watch SE 3", "FREE", false],
  ["Apple Watch Series 11", "FREE", false],
  ["Apple Watch Ultra 3", "FREE", false],
  ["Galaxy Watch 8", "FREE", false],
  ["Pixel Watch 4", "FREE", false],
  ["Nintendo Switch 2", "FREE", false],
  ["Steam Deck", "FREE", false],
  ["MacBook Air 13\"", "FREE", false],
  ["MacBook Neo", "FREE", false],
  ["MacBook Pro 14\"", "FREE", false],
  ["MacBook Pro 16\"", "FREE", false],
  ["Surface Laptop 15\"", "FREE", false],
  ["Dell XPS 16", "FREE", false],
  ["iMac 24\"", "FREE", false],
  ["Studio Display", "FREE", false],
  ["XDR Display", "FREE", false],
  ["Apple Vision Pro", "FREE", false],
];

// Single source of truth mapping a mockup name to the device family both
// renderers (three.js stage and the DOM fallback) branch on. Order matters:
// specific families (watch, foldable, Tab) must be tested before the generic
// phone/tablet suffix matches.
export function deviceArchetype(mockup) {
  const name = String(mockup || "");
  if (name === "Flat") return "flat";
  if (name === "TV 65\"") return "tv";
  if (name === "Apple Vision Pro") return "headset";
  if (name.includes("Watch")) return "watch";
  if (name.includes("Z Fold") || name.includes("Z Flip")) return "foldable";
  if (name.includes("Switch") || name.includes("Steam Deck")) return "handheld";
  if (name.includes("Kindle")) return "ereader";
  if (name.includes("MacBook") || name.includes("Surface Laptop") || name.includes("Dell XPS")) return "laptop";
  if (name === "iMac 24\"" || name === "Studio Display" || name === "XDR Display") return "display";
  if (name.includes("iPad") || name.includes("Tab ")) return "tablet";
  return "phone";
}

// Samsung and Google hardware carries a punch-hole front camera instead of
// Apple's Dynamic Island, and Samsung/Google watches are round.
export function isAndroidMockup(mockup) {
  const name = String(mockup || "");
  if (!name.startsWith("Galaxy") && !name.startsWith("Pixel")) return false;
  return ["phone", "foldable", "tablet", "watch"].includes(deviceArchetype(name));
}

// Picker section labels: groups the flat catalog without changing its order.
export function deviceGroup(mockup) {
  switch (deviceArchetype(mockup)) {
    case "flat": return "Stage";
    case "phone": case "foldable": return "Phones";
    case "tablet": case "ereader": return "Tablets & readers";
    case "watch": return "Watches";
    case "handheld": return "Handhelds";
    case "tv": return "Web & TV";
    case "display": return "Desktops";
    case "laptop": return "Laptops";
    default: return "Spatial";
  }
}
export const finishOptions = ["White", "Black", "Mist Blue", "Sage", "Lavender"];
export const lightingOptions = ["Default", "Studio Soft", "Dark Rim", "Two Tone", "Warm Glow"];
export const presetOptions = ["None", "Mono", "Metal", "Airy", "Aurora", "Spectrum", "Sunset", "Ocean", "Violet", "Emerald", "Ember"];
export const imageOptions = ["Glaze", "Crystal", "Liquid Metal", "Clouds", "Spectrum", "Sunrise", "Whisp", "Bubble", "Onyx", "Feather", "Citrus", "Cobalt", "Blush", "Indigo", "Heather", "Palm Shadow", "Prism", "Sky", "Sundrape"];
export const effectOptions = ["Depth", "Glass Border", "Sharpen", "Vignette", "Grain", "Fish Eye", "Pixel Grid", "Chromatic Abb.", "Bloom", "Screen Fade", "Ghost", "Liquid Glass"];

export const backgroundAssetMap = {
  Whisp: "source/whisp.jpeg",
  Glaze: "templates/violet-glass.jpg",
  Crystal: "templates/clean-demo.jpg",
  "Liquid Metal": "templates/xdr-1.jpg",
  Clouds: "templates/hero-detail.jpg",
  Spectrum: "templates/spectrum-warfare.jpg",
  Sunrise: "templates/concrete-macbook.jpg",
  Bubble: "templates/app-store-iphone.jpg",
  Onyx: "templates/dark-room-macbook.jpg",
  Feather: "templates/flat-look.jpg",
  Citrus: "templates/brutal-phone.jpg",
  Cobalt: "templates/linear.jpg",
  Blush: "templates/violet-glass.jpg",
  Indigo: "templates/dark-room-macbook.jpg",
  Heather: "templates/watch-ultra-1.jpg",
  "Palm Shadow": "templates/tablet-corner.jpg",
  Prism: "templates/iphone-1.jpg",
  Sky: "templates/iphone-2.jpg",
  Sundrape: "templates/macbook-2.jpg",
};

export const presetBackgrounds = {
  None: { backgroundColor: "#d9d9d9", backgroundImage: "none" },
  Mono: { backgroundColor: "#b9b9b9", backgroundImage: "linear-gradient(135deg,#ededed,#777)" },
  Metal: { backgroundColor: "#a9afb2", backgroundImage: "linear-gradient(145deg,#262a2c,#e1e6e7 48%,#4c5153)" },
  Airy: { backgroundColor: "#e7eaeb", backgroundImage: "radial-gradient(circle at 70% 20%,#fff,transparent 44%),linear-gradient(145deg,#dce7e9,#fbfbfb)" },
  Aurora: { backgroundColor: "#657a8a", backgroundImage: "linear-gradient(135deg,#142b39,#93afb7 48%,#1e283a)" },
  Spectrum: { backgroundColor: "#4b5264", backgroundImage: "linear-gradient(125deg,#251c42,#cb6a79 46%,#74bfbe)" },
  Sunset: { backgroundColor: "#8c5b61", backgroundImage: "linear-gradient(145deg,#351f2f,#e99c76 52%,#3c304e)" },
  Ocean: { backgroundColor: "#426c7d", backgroundImage: "linear-gradient(135deg,#163442,#7db4c5 52%,#142c43)" },
  Violet: { backgroundColor: "#756789", backgroundImage: "linear-gradient(135deg,#302548,#d1a8d1 52%,#5b477d)" },
  Emerald: { backgroundColor: "#48786b", backgroundImage: "linear-gradient(135deg,#163a32,#8dc1a3 50%,#304e49)" },
  Ember: { backgroundColor: "#805a48", backgroundImage: "linear-gradient(135deg,#2f1714,#ed9c65 50%,#492d27)" },
};

// Camera axes are expressed as real degrees so the controls can describe a
// complete turn instead of stopping at the old ±225° prototype range.
export const CAMERA_AXIS_MIN = -360;
export const CAMERA_AXIS_MAX = 360;
export const cameraPresets = {
  Hero: { xAxis: -7, yAxis: 1, zAxis: 0, fov: 29, zoom: 2.16, panX: 0.02, panY: -0.12 },
  Angled: { xAxis: -24, yAxis: 12, zAxis: 0, fov: 24, zoom: 1.9, panX: 0.06, panY: -0.17 },
  Flat: { xAxis: 0, yAxis: 0, zAxis: 0, fov: 32, zoom: 1.35, panX: 0, panY: 0 },
  Bottom: { xAxis: 20, yAxis: -2, zAxis: 0, fov: 26, zoom: 1.95, panX: -0.04, panY: 0.05 },
  Detail: { xAxis: -34, yAxis: 4, zAxis: 0, fov: 22, zoom: 2.55, panX: -0.08, panY: -0.1 },
  Back: { xAxis: 0, yAxis: 0, zAxis: 0, fov: 28, zoom: 1.85, panX: 0, panY: -0.08 },
};

export const defaultBlur = { strength: 10, size: 0.53, falloff: 0, bokeh: true, mode: "radial", x: 0.5, y: 0.52 };

const defaultKeyframes = [
  { id: "kf-1", time: 0, camera: { ...cameraPresets.Angled }, blur: { ...defaultBlur }, easing: "Ease in out" },
  { id: "kf-2", time: 1.8, camera: { xAxis: -15, yAxis: 5, zAxis: 0, fov: 26, zoom: 2.05, panX: 0.02, panY: -0.11 }, blur: { ...defaultBlur }, easing: "Ease in out" },
  { id: "kf-3", time: 3.6, camera: { xAxis: -7, yAxis: 2, zAxis: 0, fov: 28, zoom: 2.2, panX: -0.02, panY: -0.04 }, blur: { ...defaultBlur }, easing: "Ease out" },
  { id: "kf-4", time: 6, camera: { ...cameraPresets.Angled }, blur: { ...defaultBlur }, easing: "Linear" },
];

export function createDefaultProject() {
  return {
    viewportRatio: "Fill",
    scene: "custom",
    lighting: "Default",
    lightRotation: { x: 0, y: 263 },
    contactShadow: false,
    bgBlur: 0.85,
    background: { tab: "Image", color: "#F2F2F2", preset: "None", image: "Whisp" },
    mockup: "iPhone 17",
    finish: "White",
    cameraPreset: "Angled",
    camera: { ...cameraPresets.Angled },
    cameraMode: "tilt",
    mobileDockLeft: false,
    reflection: { amount: 0.99, roughness: 0.28 },
    effects: [],
    effectSettings: { "Glass Border": 30, Sharpen: 30, Vignette: 20, Grain: 14, Bloom: 22, "Screen Fade": 0, "Liquid Glass": 35 },
    blur: { ...defaultBlur },
    media: null,
    tracks: [
      { id: "shot-1", name: "Shot 1", kind: "scene", duration: 3, selected: true, keyframes: defaultKeyframes.map((frame) => ({ ...frame, camera: { ...frame.camera }, blur: { ...frame.blur } })) },
      { id: "shot-2", name: "Shot 2", kind: "scene", duration: 3, selected: false, keyframes: defaultKeyframes.slice(0, 2).map((frame, index) => ({ ...frame, id: `shot2-kf-${index + 1}`, time: index * 3, camera: { ...frame.camera }, blur: { ...frame.blur } })) },
    ],
    activeTrackId: "shot-1",
    selectedKeyframeId: "kf-1",
    timeline: { mode: "advanced", minimized: true, guides: false, loop: false, playing: false, recording: false, playhead: 0, duration: 6, projectLength: "0:06", zoom: 1, presetOpen: false, trackMenuOpen: false, expandedTrack: false },
    export: { format: "jpg", watermark: false, transparent: false, orientation: "Landscape", imageSize: "16:9 — 1920×1080 (1080P)", videoOrientation: "Landscape", videoSize: "16:9 — 1280×720 (720P)", quality: "Med", fps: 30, motionBlur: "Off" },
  };
}

export function formatTime(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const whole = Math.floor(safe);
  const tenths = Math.floor((safe - whole) * 10);
  return `00:${String(whole).padStart(2, "0")}.${tenths}`;
}

export function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

export function easeValue(t, easing) {
  const x = clamp(t, 0, 1);
  if (easing === "Linear") return x;
  if (easing === "Ease in") return x * x;
  if (easing === "Ease out") return 1 - (1 - x) * (1 - x);
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

// Camera pose for the active track at `time`, interpolated between keyframes
// with each segment's easing. Falls back to the live camera pose for any
// property the surrounding keyframes do not both carry.
export function cameraAtTime(project, time) {
  const track = project.tracks.find((item) => item.id === project.activeTrackId) || project.tracks[0];
  const keyframes = track?.keyframes ? [...track.keyframes].sort((a, b) => a.time - b.time) : [];
  if (keyframes.length < 2) return project.camera;
  const safeTime = Number(time) || 0;
  if (safeTime <= keyframes[0].time) return { ...project.camera, ...keyframes[0].camera };
  const last = keyframes[keyframes.length - 1];
  if (safeTime >= last.time) return { ...project.camera, ...last.camera };
  let index = 0;
  while (index < keyframes.length - 2 && keyframes[index + 1].time <= safeTime) index += 1;
  const from = keyframes[index];
  const to = keyframes[index + 1];
  const raw = (safeTime - from.time) / Math.max(1e-6, to.time - from.time);
  const t = easeValue(raw, from.easing);
  const lerp = (key) => {
    const a = Number(from.camera?.[key]);
    const b = Number(to.camera?.[key]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return project.camera[key];
    return a + (b - a) * t;
  };
  return {
    ...project.camera,
    xAxis: lerp("xAxis"),
    yAxis: lerp("yAxis"),
    zAxis: lerp("zAxis"),
    fov: lerp("fov"),
    zoom: lerp("zoom"),
    panX: lerp("panX"),
    panY: lerp("panY"),
  };
}

// Depth-of-field settings travel with camera keyframes so recorded focus pulls
// preview at the same position and intensity as the camera move.
export function blurAtTime(project, time) {
  const track = project.tracks.find((item) => item.id === project.activeTrackId) || project.tracks[0];
  const keyframes = track?.keyframes ? [...track.keyframes].sort((a, b) => a.time - b.time) : [];
  if (keyframes.length < 2 || keyframes.every((frame) => !frame.blur)) return project.blur;
  const safeTime = Number(time) || 0;
  const frameBlur = (frame) => ({ ...project.blur, ...(frame?.blur || {}) });
  if (safeTime <= keyframes[0].time) return frameBlur(keyframes[0]);
  const last = keyframes[keyframes.length - 1];
  if (safeTime >= last.time) return frameBlur(last);
  let index = 0;
  while (index < keyframes.length - 2 && keyframes[index + 1].time <= safeTime) index += 1;
  const from = keyframes[index];
  const to = keyframes[index + 1];
  const raw = (safeTime - from.time) / Math.max(1e-6, to.time - from.time);
  const t = easeValue(raw, from.easing);
  const fromBlur = frameBlur(from);
  const toBlur = frameBlur(to);
  const lerp = (key) => Number(fromBlur[key]) + (Number(toBlur[key]) - Number(fromBlur[key])) * t;
  return {
    ...project.blur,
    strength: lerp("strength"),
    size: lerp("size"),
    falloff: lerp("falloff"),
    x: lerp("x"),
    y: lerp("y"),
    bokeh: t < 0.5 ? fromBlur.bokeh : toBlur.bokeh,
    mode: t < 0.5 ? fromBlur.mode : toBlur.mode,
  };
}

export function composeAutoMotionKeyframes({ areas, camera, blur, duration = 6, motionType = "3d" }) {
  if (!Array.isArray(areas) || areas.length < 2) return [];
  const safeDuration = Math.max(1, Number(duration) || 6);
  return areas.map((area, index) => {
    const centerX = clamp((Number(area.x) + Number(area.width) / 2) / 100, 0, 1);
    const centerY = clamp((Number(area.y) + Number(area.height) / 2) / 100, 0, 1);
    const cameraFrame = {
      ...camera,
      panX: clamp((centerX - 0.5) * 0.9, -1, 1),
      panY: clamp((centerY - 0.5) * 0.9, -1, 1),
    };
    if (motionType === "3d") {
      cameraFrame.xAxis = clamp(Number(camera.xAxis) + (0.5 - centerX) * 26, CAMERA_AXIS_MIN, CAMERA_AXIS_MAX);
      cameraFrame.yAxis = clamp(Number(camera.yAxis) + (centerY - 0.5) * 18, CAMERA_AXIS_MIN, CAMERA_AXIS_MAX);
    }
    return {
      id: `auto-${index + 1}`,
      time: Number(((index / (areas.length - 1)) * safeDuration).toFixed(2)),
      camera: cameraFrame,
      blur: { ...defaultBlur, ...(blur || {}), x: centerX, y: centerY },
      easing: "Ease in out",
    };
  });
}

export function templatePatch(name) {
  const patches = {
    "Flat look": { mockup: "Flat", cameraPreset: "Flat", camera: { ...cameraPresets.Flat } },
    "Hero detail": { cameraPreset: "Hero", camera: { ...cameraPresets.Hero } },
    "Violet Glass": { background: { tab: "Image", color: "#F2F2F2", preset: "None", image: "Blush" }, effects: ["Glass Border"] },
    "Dark Room Macbook": { scene: "custom", lighting: "Dark Rim", background: { tab: "Preset", color: "#F2F2F2", preset: "Mono", image: "Whisp" } },
    "Concrete Macbook": { mockup: "MacBook Neo", cameraPreset: "Angled", camera: { ...cameraPresets.Angled }, background: { tab: "Preset", color: "#F2F2F2", preset: "Metal", image: "Whisp" } },
    "Clean demo": { scene: "custom", lighting: "Studio Soft", background: { tab: "Image", color: "#F2F2F2", preset: "None", image: "Whisp" }, cameraPreset: "Hero", camera: { ...cameraPresets.Hero } },
  };
  return patches[name] || {};
}

export function getSerializableProject(project) {
  const { media, ...rest } = project;
  return { ...rest, media: media && media.type?.startsWith("image/") && media.src?.startsWith("data:") ? { ...media } : null };
}

export function hydrateProject(value) {
  const base = createDefaultProject();
  if (!value || typeof value !== "object") return base;
  return {
    ...base,
    ...value,
    background: { ...base.background, ...(value.background || {}) },
    camera: { ...base.camera, ...(value.camera || {}) },
    lightRotation: { ...base.lightRotation, ...(value.lightRotation || {}) },
    reflection: { ...base.reflection, ...(value.reflection || {}) },
    blur: { ...base.blur, ...(value.blur || {}) },
    effectSettings: { ...base.effectSettings, ...(value.effectSettings || {}) },
    timeline: { ...base.timeline, ...(value.timeline || {}) },
    export: { ...base.export, ...(value.export || {}) },
    tracks: Array.isArray(value.tracks) && value.tracks.length ? value.tracks : base.tracks,
  };
}
