import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { batchStaticDevice, deviceBounds, collectDeviceResources, disposeDeviceResources } from '../src/deviceOptimization.js';
import { createAndroidWatch, createWindowsLaptop } from '../src/hardwareDevices.js';

const triangleCount = model => {
  let count=0;
  model.traverseVisible(o=>{if(o.isMesh)count+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});
  return count;
};
const bounds = model => deviceBounds(model);
const equalBounds = (a,b) => {
  assert.ok(a.min.distanceTo(b.min)<1e-4 && a.max.distanceTo(b.max)<1e-4,'visible envelope is preserved');
};

test('static batches preserve geometry and transformed bounds, screens and transparency',()=>{
  const root=new THREE.Group(), parent=new THREE.Group();root.add(parent);
  parent.position.set(2,3,-1);parent.rotation.set(.2,.5,.1);
  for(let i=0;i<6;i++){
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,2,3),new THREE.MeshStandardMaterial({color:0x556677}));
    mesh.position.x=i*2;mesh.rotation.y=i*.1;parent.add(mesh);
  }
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(),new THREE.MeshBasicMaterial());
  screen.userData.openmockScreen=true;parent.add(screen);
  const glass=new THREE.Mesh(new THREE.PlaneGeometry(),new THREE.MeshPhysicalMaterial({transparent:true,opacity:.1}));parent.add(glass);
  const before=bounds(root),triangles=triangleCount(root);
  assert.equal(batchStaticDevice(root),5);
  assert.equal(triangleCount(root),triangles);equalBounds(before,bounds(root));
  assert.equal(screen.parent,parent);assert.equal(glass.parent,parent);
});

test('rigid manufacturer batches preserve nested transforms and live material identity',()=>{
  const model=new THREE.Group();model.rotation.y=.4;model.scale.setScalar(.01);
  const live=new THREE.MeshStandardMaterial({color:0x808080});live.userData.openmockDynamic=true;
  for(let i=0;i<4;i++){
    const wrapper=new THREE.Group();wrapper.rotation.z=i*.1;wrapper.position.set(i,2,-3);model.add(wrapper);
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(),live);mesh.position.y=i;wrapper.add(mesh);
  }
  const before=bounds(model),triangles=triangleCount(model);
  assert.equal(batchStaticDevice(model,{acrossParents:true}),3);
  equalBounds(before,bounds(model));assert.equal(triangleCount(model),triangles);
  const batch=model.children.find(o=>o.isMesh);assert.equal(batch.material,live);
  live.color.setHex(0x123456);assert.equal(batch.material.color.getHex(),0x123456);
});

test('resource cleanup includes detached variants and replaced materials, retaining shared textures',()=>{
  const model=new THREE.Group(),texture=new THREE.Texture();
  const a=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({map:texture}));
  const b=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({map:texture}));model.add(a,b);
  const resources=collectDeviceResources(model),calls=new Map();
  for(const resource of resources)resource.addEventListener('dispose',()=>calls.set(resource,(calls.get(resource)||0)+1));
  const old=a.material;b.removeFromParent();a.material=new THREE.MeshBasicMaterial({map:texture});
  disposeDeviceResources(resources,collectDeviceResources(model));
  assert.equal(calls.get(old),1);assert.equal(calls.get(b.geometry),1);assert.equal(calls.get(b.material),1);
  assert.equal(calls.get(texture),undefined);assert.equal(calls.get(a.geometry),undefined);
  disposeDeviceResources(collectDeviceResources(model));
  assert.equal(calls.get(texture),1);assert.equal(calls.get(a.geometry),1);
});

// Geometry factories use canvas only for labels; no pixel data is needed here.
const withCanvas = fn => {
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({},{get:()=>()=>{}})})};
  try{return fn();}finally{if(previous)globalThis.document=previous;else delete globalThis.document;}
};

test('laptop batches retain footprints, all key geometry, trackpad and live finish controls',()=>withCanvas(()=>{
  for(const kind of ['surface','xps']){
    const laptop=createWindowsLaptop(new THREE.Texture(),'White',kind);
    const before=bounds(laptop.group),triangles=triangleCount(laptop.group);
    assert.ok(batchStaticDevice(laptop.group)>150,'expensive keyboards use far fewer meshes');
    equalBounds(before,bounds(laptop.group));assert.equal(triangleCount(laptop.group),triangles);
    if(kind==='xps')assert.ok(laptop.group.getObjectByName('xps-haptic-trackpad'));
    else{
      const caps=[];laptop.group.traverse(o=>{if(o.material?.userData.openmockDynamic)caps.push(o.material);});
      const colors=caps.map(m=>m.color.getHex());laptop.materials.updateFinish('Black');
      assert.ok(caps.some((m,i)=>m.color.getHex()!==colors[i]),'live finish reaches batched materials');
    }
  }
}));

test('watch strap cache preserves complete geometry and owns independent buffers',()=>withCanvas(()=>{
  for(const [style,expected] of [['galaxy',153728],['pixel',174484]]){
    const a=createAndroidWatch(new THREE.Texture(),style).group;
    const b=createAndroidWatch(new THREE.Texture(),style).group;
    assert.equal(triangleCount(a),expected);assert.equal(triangleCount(b),expected);equalBounds(bounds(a),bounds(b));
    for(let i=0;i<2;i++){
      const ga=a.children[i].geometry,gb=b.children[i].geometry;
      assert.notEqual(ga,gb);assert.notEqual(ga.attributes.position.array,gb.attributes.position.array);
      assert.deepEqual(ga.attributes.position.array,gb.attributes.position.array);
      assert.deepEqual(ga.index.array,gb.index.array);
      ga.attributes.position.array[0]=999;
      assert.notEqual(gb.attributes.position.array[0],999);
    }
  }
}));

const readGLB = path => {
  const bytes=readFileSync(new URL(path,import.meta.url));
  const length=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+length));
  return {json,bytes,bin:bytes.subarray(28+length)};
};
test('optimized Pixel Pro stays within its budget and retains hardware nodes and original texture bytes',()=>{
  const source=readGLB('../public/assets/devices/pixel-10-pro.glb');
  const optimized=readGLB('../public/assets/devices/pixel-10-pro-optimized.glb');
  const count=g=>g.meshes.reduce((sum,m)=>sum+m.primitives.reduce((n,p)=>n+g.accessors[p.indices].count/3,0),0);
  assert.ok(count(optimized.json)<600000 && count(optimized.json)>500000);
  assert.ok(count(optimized.json)<count(source.json)*.5);
  assert.ok(optimized.bytes.length<source.bytes.length*.75);
  assert.deepEqual(optimized.json.nodes.map(n=>n.name).sort(),source.json.nodes.map(n=>n.name).sort());
  for(const node of source.json.nodes){
    if(node.mesh===undefined||['speakerGrills','alumPolished'].includes(node.name))continue;
    const other=optimized.json.nodes.find(n=>n.name===node.name);
    const counts=(g,index)=>g.meshes[index].primitives.map(p=>g.accessors[p.indices].count);
    const originalCounts=counts(source.json,node.mesh),optimizedCounts=counts(optimized.json,other.mesh);
    if(['BackPaint','PlasticBack','RoughPlastic'].includes(node.name)){
      // The encoder's exact weld removes degenerate triangles in these
      // painted sheets, without applying the simplifier to them.
      assert.ok(optimizedCounts[0]>=originalCounts[0]*.9 && optimizedCounts[0]<=originalCounts[0]);
    }else assert.deepEqual(originalCounts,optimizedCounts,`${node.name}: detail geometry is retained`);
  }
  const imageHashes=g=>g.json.images.map(image=>{
    const view=g.json.bufferViews[image.bufferView];
    return createHash('sha256').update(g.bin.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength)).digest('hex');
  }).sort();
  assert.deepEqual(imageHashes(optimized),imageHashes(source),'manufacturer image data is untouched');
});
