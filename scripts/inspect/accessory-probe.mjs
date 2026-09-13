import * as THREE from "three";
import { USDLoader } from "three/examples/jsm/loaders/USDLoader.js";
import { readFile } from "node:fs/promises";

globalThis.Blob ??= class {};
globalThis.URL.createObjectURL = () => "blob:shim";
class ShimImage { set src(v){this._src=v; setTimeout(()=>this.onload?.(),0);} get src(){return this._src;} decode(){return Promise.resolve();} get width(){return 8;} get height(){return 8;} }
globalThis.Image = ShimImage;
globalThis.createImageBitmap = async () => ({ width: 8, height: 8, close() {} });
THREE.TextureLoader.prototype.load = function (url, onLoad) { const t = new THREE.Texture(); setTimeout(() => onLoad?.(t), 0); return t; };

for (const name of process.argv.slice(2).length ? process.argv.slice(2) : ["imac-24"]) {
  const data = await readFile(`public/assets/devices/${name}.usdz`);
  const loader = new USDLoader();
  const group = loader.parse(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), "assets/devices/x/");
  await new Promise((r) => setTimeout(r, 30));
  group.updateMatrixWorld(true);
  console.log(`\n===== ${name} =====`);
  const visit = (obj, depth) => {
    if (depth > 4) return;
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    let meshes = 0;
    obj.traverse((c) => { if (c.isMesh) meshes += 1; });
    const label = `${"  ".repeat(depth)}${obj.name || obj.type || "?"} [${meshes}m] ${size.x.toFixed(3)}x${size.y.toFixed(3)}x${size.z.toFixed(3)} y(${box.min.y.toFixed(3)}..${box.max.y.toFixed(3)}) z=${center.z.toFixed(3)}`;
    console.log(label);
    obj.children.forEach((c) => visit(c, depth + 1));
  };
  visit(group, 0);
}
