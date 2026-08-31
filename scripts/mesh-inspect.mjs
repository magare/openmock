import * as THREE from "three";
import { USDLoader } from "three/examples/jsm/loaders/USDLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { readFile } from "node:fs/promises";

globalThis.Blob ??= class {};
globalThis.URL.createObjectURL = () => "blob:shim";
class ShimImage {
  set src(v) { this._src = v; setTimeout(() => this.onload?.(), 0); }
  get src() { return this._src; }
  decode() { return Promise.resolve(); }
  get width() { return 8; } get height() { return 8; }
}
globalThis.Image = ShimImage;
globalThis.createImageBitmap = async () => ({ width: 8, height: 8, close() {} });
THREE.TextureLoader.prototype.load = function (url, onLoad) { const t = new THREE.Texture(); setTimeout(() => onLoad?.(t), 0); return t; };

async function loadModel(file) {
  const data = await readFile(file);
  const buf = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  if (file.endsWith(".glb") || file.endsWith(".gltf")) {
    const draco = new DRACOLoader().setDecoderPath("public/assets/draco/");
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).setDRACOLoader(draco);
    const gltf = await loader.parseAsync(buf, "");
    return gltf.scene;
  }
  const loader = new USDLoader();
  const group = loader.parse(buf, "assets/devices/x/");
  await new Promise((r) => setTimeout(r, 30));
  return group;
}

const targets = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      "public/assets/devices/iphone-17-pro.usdz",
      "public/assets/devices/watch-ultra-3.usdz",
      "public/assets/devices/vision-pro.usdz",
      "public/assets/devices/ipad-pro.usdz",
      "public/assets/devices/ipad-mini.usdz",
      "public/assets/devices/macbook-air-13.usdz",
      "public/assets/devices/macbook-neo.usdz",
      "public/assets/devices/macbook-pro-14.usdz",
      "public/assets/devices/imac-24.usdz",
      "public/assets/devices/studio-display.usdz",
      "public/assets/devices/xdr-display.usdz",
      "public/assets/devices/galaxy-s26-ultra.glb",
      "public/assets/devices/pixel-10-pro.glb",
    ];

for (const file of targets) {
  let group;
  try { group = await loadModel(file); } catch (e) { console.log("==", file, "FAILED:", e.message); continue; }
  group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  console.log(`\n== ${file.split("/").pop()}  bbox ${size.x.toFixed(3)} x ${size.y.toFixed(3)} x ${size.z.toFixed(3)}  center(${center.x.toFixed(3)},${center.y.toFixed(3)},${center.z.toFixed(3)})`);
  const emis = [];
  group.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    const mats0 = Array.isArray(o.material) ? o.material : [o.material];
    if (mats0.some((m) => m.emissiveMap)) {
      const b0 = new THREE.Box3().setFromObject(o);
      const s0 = b0.getSize(new THREE.Vector3());
      const uv0 = o.geometry.attributes.uv;
      emis.push(`${o.name || "?"} ${s0.x.toFixed(3)}x${s0.y.toFixed(3)}x${s0.z.toFixed(3)} uv=${uv0 ? uvRangeOf(uv0) : "none"}`);
    }
  });
  if (emis.length) console.log("   EMISSIVE:", emis.join(" | "));
  const rows = [];
  group.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    const b = new THREE.Box3().setFromObject(o);
    const s = b.getSize(new THREE.Vector3());
    if (s.x <= 0 || s.y <= 0) return;
    const area2d = s.x * s.y;
    const bodyArea = size.x * size.y;
    const thin = Math.min(s.x, s.y, s.z) / Math.max(s.x, s.y, s.z) < 0.12;
    if (!thin || area2d < bodyArea * 0.2) return;
    const uv = o.geometry.attributes.uv;
    const c = b.getCenter(new THREE.Vector3());
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const mapNames = mats.map((m) => [m.map && "map", m.normalMap && "nrm", m.roughnessMap && "rgh", m.metalnessMap && "mtl", m.emissiveMap && "emi"].filter(Boolean).join("+") || "-").join(",");
    rows.push({ name: o.name || "?", sx: s.x, sy: s.y, sz: s.z, cz: c.z - center.z, uv: Boolean(uv), uvRange: uv ? uvRangeOf(uv) : "", mapNames, front: (c.z - center.z) > size.z * 0.05 });
  });
  rows.sort((a, b) => (b.sx * b.sy) - (a.sx * a.sy));
  for (const r of rows.slice(0, 10)) {
    console.log(`   ${r.name}  ${r.sx.toFixed(3)}x${r.sy.toFixed(3)}x${r.sz.toFixed(3)} z=${r.cz.toFixed(3)} ${r.front ? "FRONT" : "back "} uv=${r.uv ? r.uvRange : "none"} maps[${r.mapNames}]`);
  }
}

function uvRangeOf(uv) {
  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  for (let i = 0; i < uv.count; i += 1) {
    minX = Math.min(minX, uv.getX(i)); maxX = Math.max(maxX, uv.getX(i));
    minY = Math.min(minY, uv.getY(i)); maxY = Math.max(maxY, uv.getY(i));
  }
  return `${minX.toFixed(2)}-${maxX.toFixed(2)},${minY.toFixed(2)}-${maxY.toFixed(2)}`;
}
