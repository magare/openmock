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

const targets = process.argv.slice(2).length ? process.argv.slice(2) : [
  "macbook-air-13",
  "watch-ultra-3",
  "iphone-17-pro",
  "imac-24",
  "studio-display",
];

for (const name of targets) {
  const file = `public/assets/devices/${name}.usdz`;
  const data = await readFile(file);
  const loader = new USDLoader();
  const group = loader.parse(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), "assets/devices/x/");
  await new Promise((r) => setTimeout(r, 30));
  group.updateMatrixWorld(true);
  console.log(`\n===== ${name} =====`);
  const seen = new Map();
  group.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach((m) => {
      const key = `${o.name}|${m?.name}`;
      if (seen.has(key)) return;
      seen.set(key, true);
      const slots = ["map", "normalMap", "roughnessMap", "metalnessMap", "aoMap", "emissiveMap", "clearcoatMap", "clearcoatNormalMap", "clearcoatRoughnessMap", "alphaMap"].filter((s) => m && m[s]);
      const desc = slots.map((s) => `${s}=${(m[s]._usdFile || "?").split("/").pop()}`).join(", ");
      const col = m?.color ? `#${m.color.getHexString()}` : "?";
      console.log(`  mesh=${o.name} mat=${m?.name ?? "?"} color=${col} metal=${m?.metalness?.toFixed?.(2)} rough=${m?.roughness?.toFixed?.(2)} ${desc}`);
    });
  });
}
