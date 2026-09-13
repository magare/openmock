import * as THREE from "three";
import { USDLoader } from "three/examples/jsm/loaders/USDLoader.js";
import { USDComposer } from "three/examples/jsm/loaders/usd/USDComposer.js";
import { readFile } from "node:fs/promises";

globalThis.Blob ??= class {};
globalThis.URL.createObjectURL = () => "blob:shim";
class ShimImage { set src(v){this._src=v; setTimeout(()=>this.onload?.(),0);} get src(){return this._src;} decode(){return Promise.resolve();} get width(){return 8;} get height(){return 8;} }
globalThis.Image = ShimImage;
globalThis.createImageBitmap = async () => ({ width: 8, height: 8, close() {} });
THREE.TextureLoader.prototype.load = function (url, onLoad) { const t = new THREE.Texture(); t._src = url; setTimeout(() => onLoad?.(t), 0); return t; };
if (!USDComposer.prototype.__patched) {
  USDComposer.prototype.__patched = true;
  const orig = USDComposer.prototype._loadTexture;
  USDComposer.prototype._loadTexture = function (filePath, textureAttrs, transformAttrs) {
    const tex = orig.call(this, filePath, textureAttrs, transformAttrs);
    if (tex) tex._usdFile = String(filePath);
    return tex;
  };
}

const data = await readFile("public/assets/devices/iphone-17-pro.usdz");
const loader = new USDLoader();
const group = loader.parse(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), "assets/devices/x/");
await new Promise((r) => setTimeout(r, 30));
group.updateMatrixWorld(true);

const candidates = [];
const visit = (object, depth = 0) => {
  if (object.children.length) {
    const size = new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
    let count = 0;
    object.traverse((child) => { if (child.isMesh) count += 1; });
    if (count > 30 && size.x > 0.065 && size.x < 0.09 && size.y > 0.14 && size.y < 0.18 && size.z > 0.009 && size.z < 0.02) {
      candidates.push({ object, depth, size, count });
    }
  }
  object.children.forEach((child) => visit(child, depth + 1));
};
visit(group);
const byVariant = new Map();
candidates.forEach((candidate) => {
  const key = Math.round(candidate.size.y * 10000);
  const current = byVariant.get(key);
  if (!current || candidate.depth > current.depth) byVariant.set(key, candidate);
});
const variants = [...byVariant.values()].sort((a, b) => a.size.y - b.size.y);
const chosen = variants[0];
console.log(`chosen slab size ${chosen.size.x.toFixed(4)} x ${chosen.size.y.toFixed(4)}`);
const slab = chosen.object;
slab.updateMatrixWorld(true);
const screenBox = new THREE.Box3();
slab.traverse((o) => { if (o.isMesh && o.name === "HkNSnYzBPABcqwM") screenBox.setFromObject(o); });
const screenSize = screenBox.getSize(new THREE.Vector3());
console.log(`screen mesh size ${screenSize.x.toFixed(4)} x ${screenSize.y.toFixed(4)}`);
slab.traverse((o) => {
  if (!o.isMesh) return;
  const b = new THREE.Box3().setFromObject(o);
  const s = b.getSize(new THREE.Vector3());
  const c = b.getCenter(new THREE.Vector3());
  const mats = Array.isArray(o.material) ? o.material : [o.material];
  const mapFile = mats[0]?.map?._usdFile?.split("/").pop() || "-";
  const overlap = Math.min(b.max.x, screenBox.max.x) - Math.max(b.min.x, screenBox.min.x);
  const overlapY = Math.min(b.max.y, screenBox.max.y) - Math.max(b.min.y, screenBox.min.y);
  const coversScreen = overlap > screenSize.x * 0.6 && overlapY > screenSize.y * 0.6;
  console.log(`${o.name} ${s.x.toFixed(4)}x${s.y.toFixed(4)}x${s.z.toFixed(4)} zc=${c.z.toFixed(4)} map=${mapFile}${coversScreen ? "  <-- covers screen" : ""}`);
});

console.log("--- meshes intersecting top band of display ---");
const topBandMin = screenBox.max.y - screenSize.y * 0.10;
slab.traverse((o) => {
  if (!o.isMesh || !o.visible) return;
  const b = new THREE.Box3().setFromObject(o);
  if (b.max.y < topBandMin || b.min.y > screenBox.max.y) return;
  if (b.max.x < screenBox.min.x || b.min.x > screenBox.max.x) return;
  const s = b.getSize(new THREE.Vector3());
  const c = b.getCenter(new THREE.Vector3());
  const mats = Array.isArray(o.material) ? o.material : [o.material];
  const mapFile = mats[0]?.map?._usdFile?.split("/").pop() || "-";
  console.log(`${o.name} ${s.x.toFixed(4)}x${s.y.toFixed(4)}x${s.z.toFixed(4)} zc=${c.z.toFixed(4)} yc=${c.y.toFixed(4)} map=${mapFile}`);
});
