import { chromium } from "playwright-core";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1121, height: 900 }, deviceScaleFactor: 1 });
page.on("console", (msg) => { if (msg.type() === "error" || msg.type() === "warning") console.log(`[${msg.type()}]`, msg.text().slice(0, 300)); });
await page.goto("http://localhost:5173/", { waitUntil: "domcontentloaded" });
await page.evaluate((dev) => {
  const proj = JSON.parse(localStorage.getItem("openmock-project") || "{}");
  proj.mockup = dev;
  proj.cameraPreset = "Flat";
  proj.camera = { xAxis: 0, yAxis: 0, zAxis: 0, fov: 24, zoom: 1.9, panX: 0, panY: -0.17 };
  localStorage.setItem("openmock-project", JSON.stringify(proj));
  localStorage.setItem("openmock-tour-seen", "1");
}, "iPhone 17");
await page.reload({ waitUntil: "domcontentloaded" });
for (let i = 0; i < 40; i += 1) {
  await page.waitForTimeout(350);
  const status = await page.evaluate(() => document.querySelector(".three-stage-canvas")?.getAttribute("data-renderer-status"));
  if (status === "ready") { await page.waitForTimeout(1500); break; }
}
const info = await page.evaluate(() => {
  const canvas = document.querySelector(".three-stage-canvas");
  const renderer = canvas?.__threeRenderer;
  return "no-direct-access";
});
// Reach into the three scene via the dev hook: the app doesn't expose it, so
// re-create the load path with the same modules through the page's module graph.
const probe = await page.evaluate(async () => {
  const THREE = await import("/node_modules/three/build/three.module.js");
  const { GLTFLoader } = await import("/node_modules/three/examples/jsm/loaders/GLTFLoader.js");
  const { DRACOLoader } = await import("/node_modules/three/examples/jsm/loaders/DRACOLoader.js");
  const { KTX2Loader } = await import("/node_modules/three/examples/jsm/loaders/KTX2Loader.js");
  const { MeshoptDecoder } = await import("/node_modules/three/examples/jsm/libs/meshopt_decoder.module.js");
  const scratch = document.createElement("canvas");
  const renderer = new THREE.WebGLRenderer({ canvas: scratch });
  const ktx2 = new KTX2Loader().setTranscoderPath("/assets/basis/").detectSupport(renderer);
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).setDRACOLoader(new DRACOLoader().setDecoderPath("/assets/draco/")).setKTX2Loader(ktx2);
  const gltf = await loader.loadAsync("/assets/source/iphone-17-p-sim.glb");
  const screens = [];
  gltf.scene.traverse((o) => {
    if (o.isMesh && Object.values(o.userData || {}).includes("proDisplayScreen")) screens.push(o.name);
  });
  const screen = screens[0];
  const mesh = gltf.scene.getObjectByName(screen);
  const uv = mesh.geometry.attributes.uv;
  let minU = 1, maxU = 0, minV = 1, maxV = 0;
  for (let i = 0; i < uv.count; i += 1) {
    minU = Math.min(minU, uv.getX(i)); maxU = Math.max(maxU, uv.getX(i));
    minV = Math.min(minV, uv.getY(i)); maxV = Math.max(maxV, uv.getY(i));
  }
  renderer.dispose();
  return { screens, uvRange: [minU, maxU, minV, maxV], hasNormal: Boolean(mesh.geometry.attributes.normal) };
});
console.log(JSON.stringify(probe));
await browser.close();
