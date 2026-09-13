import * as THREE from "three";
import { USDLoader } from "three/examples/jsm/loaders/USDLoader.js";
import { readFile } from "node:fs/promises";

globalThis.Blob ??= class {};
globalThis.URL.createObjectURL = () => "blob:shim";
class ShimImage { set src(v){this._src=v; setTimeout(()=>this.onload?.(),0);} get src(){return this._src;} decode(){return Promise.resolve();} get width(){return 8;} get height(){return 8;} }
globalThis.Image = ShimImage;
globalThis.createImageBitmap = async () => ({ width: 8, height: 8, close() {} });
THREE.TextureLoader.prototype.load = function (url, onLoad) { const t = new THREE.Texture(); setTimeout(() => onLoad?.(t), 0); return t; };

const data = await readFile("public/assets/devices/xdr-display.usdz");
const loader = new USDLoader();
const group = loader.parse(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), "assets/devices/x/");
await new Promise((r) => setTimeout(r, 30));
group.updateMatrixWorld(true);

const bounds = new THREE.Box3().setFromObject(group);
const modelSize = bounds.getSize(new THREE.Vector3());
console.log(`model y(${bounds.min.y.toFixed(3)}..${bounds.max.y.toFixed(3)})`);
let screen = null;
group.traverse((o) => { if (!screen && o.isMesh && o.name === "IyklIWCEUuwKzOr") screen = o; });
const screenBounds = new THREE.Box3().setFromObject(screen);
console.log(`screen y(${screenBounds.min.y.toFixed(3)}..${screenBounds.max.y.toFixed(3)})`);
const cutoff = screenBounds.min.y - modelSize.y * 0.025;
const belowScreen = screenBounds.min.y + modelSize.y * 0.05;
console.log(`cutoff=${cutoff.toFixed(3)} belowScreen=${belowScreen.toFixed(3)}`);
let marked = 0;
group.traverse((object) => {
  if (!object.isMesh || object === screen) return;
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  if (center.y < cutoff || box.max.y < belowScreen) {
    marked += 1;
    if (marked <= 8) {
      const mats = Array.isArray(object.material) ? object.material : [object.material];
      console.log(`marked ${object.name} y(${box.min.y.toFixed(3)}..${box.max.y.toFixed(3)}) mats=${mats.map((m) => `${m.type}#${m.color?.getHexString()} map=${Boolean(m.map)}`).join(",")}`);
    }
  }
});
console.log(`total marked: ${marked}`);

const rows = [];
group.traverse((object) => {
  if (!object.isMesh) return;
  const box = new THREE.Box3().setFromObject(object);
  rows.push({ name: object.name || "?", min: box.min.y, max: box.max.y, size: box.getSize(new THREE.Vector3()) });
});
rows.sort((a, b) => a.min - b.min);
for (const r of rows.slice(0, 12)) console.log(`  ${r.name} y(${r.min.toFixed(3)}..${r.max.toFixed(3)}) size ${r.size.x.toFixed(3)}x${r.size.y.toFixed(3)}x${r.size.z.toFixed(3)}`);

console.log("--- materials of low/assembly meshes ---");
["HNFbbLQJxdhlnJB", "RVNPTVBkPRthSTH", "HJxexdgaCCQkOSU", "hGwEfDVTEHoAURp", "GkERnwlKXemCPLQ", "FRHIeNGciselOUD"].forEach((n) => {
  const o = group.getObjectByName(n);
  if (!o) return;
  const mats = Array.isArray(o.material) ? o.material : [o.material];
  mats.forEach((m) => console.log(`${n}: ${m.type} color=#${m.color?.getHexString()} metal=${m.metalness} rough=${m.roughness} map=${m.map?._usdFile?.split("/").pop() || "-"} nrm=${m.normalMap?._usdFile?.split("/").pop() || "-"}`));
});

console.log("--- foot-region meshes (max.y < -0.2) ---");
group.traverse((o) => {
  if (!o.isMesh) return;
  const b = new THREE.Box3().setFromObject(o);
  if (b.max.y >= -0.2) return;
  const s = b.getSize(new THREE.Vector3());
  const mats = Array.isArray(o.material) ? o.material : [o.material];
  console.log(`${o.name} y(${b.min.y.toFixed(3)}..${b.max.y.toFixed(3)}) ${s.x.toFixed(3)}x${s.y.toFixed(3)}x${s.z.toFixed(3)} mat#${mats[0]?.color?.getHexString()} map=${mats[0]?.map?._usdFile?.split("/").pop() || "-"}`);
});
