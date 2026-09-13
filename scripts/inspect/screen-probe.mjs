import * as THREE from "three";
import { USDLoader } from "three/examples/jsm/loaders/USDLoader.js";
import { readFile } from "node:fs/promises";

globalThis.Blob ??= class {};
globalThis.URL.createObjectURL = () => "blob:shim";
class ShimImage { set src(v){this._src=v; setTimeout(()=>this.onload?.(),0);} get src(){return this._src;} decode(){return Promise.resolve();} get width(){return 8;} get height(){return 8;} }
globalThis.Image = ShimImage;
globalThis.createImageBitmap = async () => ({ width: 8, height: 8, close() {} });
THREE.TextureLoader.prototype.load = function (url, onLoad) { const t = new THREE.Texture(); setTimeout(() => onLoad?.(t), 0); return t; };

const data = await readFile("public/assets/devices/iphone-17-pro.usdz");
const loader = new USDLoader();
const group = loader.parse(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), "assets/devices/x/");
await new Promise((r) => setTimeout(r, 30));
group.updateMatrixWorld(true);

// replicate isolateIPhoneProVariant size filter to enumerate slabs
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
console.log("slabs:", candidates.length);
const byVariant = new Map();
candidates.forEach((candidate) => {
  const key = Math.round(candidate.size.y * 10000);
  const current = byVariant.get(key);
  if (!current || candidate.depth > current.depth) byVariant.set(key, candidate);
});
const variants = [...byVariant.values()].sort((a, b) => a.size.y - b.size.y);
for (const [i, v] of variants.entries()) {
  const size = v.size;
  console.log(`variant[${i}] size ${size.x.toFixed(4)} x ${size.y.toFixed(4)} x ${size.z.toFixed(4)}`);
  // center of the slab
  const sc = new THREE.Box3().setFromObject(v.object).getCenter(new THREE.Vector3());
  console.log("  slab center local-ish:", sc.x.toFixed(4), sc.y.toFixed(4), sc.z.toFixed(4));
  v.object.traverse((o) => {
    if (!o.isMesh) return;
    const b = new THREE.Box3().setFromObject(o);
    const s = b.getSize(new THREE.Vector3());
    const c = b.getCenter(new THREE.Vector3());
    if (o.name === "HkNSnYzBPABcqwM") {
      console.log("  SCREEN", o.name, "size", s.x.toFixed(4), s.y.toFixed(4), s.z.toFixed(4), "center", c.x.toFixed(4), c.y.toFixed(4), c.z.toFixed(4));
    }
  });
}
