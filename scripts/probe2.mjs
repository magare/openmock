import * as THREE from "three";
import { USDLoader } from "three/examples/jsm/loaders/USDLoader.js";
import { readFile } from "node:fs/promises";
globalThis.Blob ??= class {};
globalThis.URL.createObjectURL = () => "blob:shim";
class ShimImage { set src(v){this._src=v; setTimeout(()=>this.onload?.(),0);} get src(){return this._src;} decode(){return Promise.resolve();} get width(){return 4;} get height(){return 4;} }
globalThis.Image = ShimImage;
globalThis.createImageBitmap = async () => ({ width: 4, height: 4, close() {} });
THREE.TextureLoader.prototype.load = function (url, onLoad) { const t = new THREE.Texture(); setTimeout(() => onLoad?.(t), 0); return t; };
for (const f of process.argv.slice(2)) {
  const loader = new USDLoader();
  const data = await readFile(f);
  const group = loader.parse(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), "assets/devices/x/");
  await new Promise((r) => setTimeout(r, 30));
  let meshes = 0, textured = 0;
  group.traverse((o) => { if (o.isMesh) { meshes++; if (o.material?.map) textured++; } });
  console.log(f.split("/").pop(), "meshes:", meshes, "textured:", textured);
}
