import { chromium } from "playwright-core";

const files = process.argv.slice(2);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({});
await page.goto("http://localhost:5199/", { waitUntil: "domcontentloaded" });
const report = await page.evaluate(async (files) => {
  const THREE = await import("/node_modules/three/build/three.module.js");
  const { GLTFLoader } = await import("/node_modules/three/examples/jsm/loaders/GLTFLoader.js");
  const { DRACOLoader } = await import("/node_modules/three/examples/jsm/loaders/DRACOLoader.js");
  const draco = new DRACOLoader().setDecoderPath("/assets/draco/");
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const out = [];
  for (const file of files) {
    const gltf = await loader.loadAsync(`/assets/devices/${file}`);
    const scene = gltf.scene;
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const meshes = [];
    scene.traverse((node) => {
      if (!node.isMesh) return;
      node.geometry.computeBoundingBox();
      const s = node.geometry.boundingBox.getSize(new THREE.Vector3());
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      const emissive = mats.some((m) => m.emissive && (m.emissive.r + m.emissive.g + m.emissive.b) > 0.05);
      meshes.push(`${emissive ? "EMISSIVE " : ""}${node.name} ${s.x.toFixed(4)}x${s.y.toFixed(4)}x${s.z.toFixed(4)} pos(${node.getWorldPosition(new THREE.Vector3()).toArray().map((v) => v.toFixed(3)).join(",")})`);
    });
    out.push(`== ${file} bbox ${size.x.toFixed(4)} x ${size.y.toFixed(4)} x ${size.z.toFixed(4)}\n  ${meshes.join("\n  ")}`);
  }
  return out.join("\n");
}, files);
console.log(report);
await browser.close();
