import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// The catalog profile identifies these draw-call outliers. Keep the other
// models on their original path, including all manufacturer screen meshes.
export const batchedDevices = new Set([
  'Surface Laptop 15"', 'Dell XPS 16', 'Nintendo Switch 2', 'Steam Deck', 'Apple Vision Pro',
]);

const visibleMaterial = node => [node.material].flat().some(material => material && material.visible !== false && material.opacity !== 0 && !material.isShadowMaterial);

export function deviceBounds(object, target = new THREE.Box3()) {
  target.makeEmpty();object.updateWorldMatrix(true,true);
  const box=new THREE.Box3(),matrix=new THREE.Matrix4();
  const walk=node=>{
    if(!node.visible)return;
    if(node.userData.openmockPartBounds){
      for(const part of node.userData.openmockPartBounds){
        matrix.multiplyMatrices(node.matrixWorld,part.matrix);
        target.union(box.copy(part.box).applyMatrix4(matrix));
      }
      return;
    }
    if(node.isMesh && visibleMaterial(node))target.expandByObject(node);
    for(const child of node.children)walk(child);
  };
  walk(object);
  if(target.isEmpty())target.setFromObject(object);
  return target;
}

// Merge only static, opaque siblings. Keeping each batch in its original
// parent preserves articulated lids/controllers, transforms and bounds.
// Live finish materials are grouped by identity, never by their initial color.
export function batchStaticDevice(model, { acrossParents = false } = {}) {
  const materialKeys = new Map();
  const keyForMaterial = material => {
    if (material.userData.openmockDynamic || Object.values(material).some(value => value?.isTexture)) return material.uuid;
    if (!materialKeys.has(material)) {
      const json = material.toJSON();
      delete json.uuid; delete json.name; delete json.metadata;
      materialKeys.set(material, JSON.stringify(json));
    }
    return materialKeys.get(material);
  };
  const parents = [];
  const allMeshes = [];
  model.updateWorldMatrix(true, true);
  const inverseRoot = model.matrixWorld.clone().invert();
  model.traverseVisible(object => {
    if (object.children.length) parents.push(object);
    if (object.isMesh) allMeshes.push(object);
  });
  // A merged AABB can grow when rotated. Keep the original part boxes for
  // normalization, camera fit and ground placement, without rendering nodes.
  const partBounds=allMeshes.filter(visibleMaterial).map(mesh=>{
    if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
    return {box:mesh.geometry.boundingBox.clone(),matrix:new THREE.Matrix4().multiplyMatrices(inverseRoot,mesh.matrixWorld)};
  });
  const retiredGeometries = new Set(), retiredMaterials = new Set();
  let removedMeshes = 0;
  for (const parent of acrossParents ? [model] : parents) {
    const groups = new Map();
    for (const mesh of acrossParents ? allMeshes : parent.children) {
      const material = mesh.material, geometry = mesh.geometry;
      if (!mesh.visible || !mesh.isMesh || mesh.isSkinnedMesh || mesh.isInstancedMesh || mesh.children.length ||
          !material || Array.isArray(material) || !material.visible || material.transparent || material.transmission > 0 ||
          mesh.userData.openmockScreen || mesh.userData.screenAspect || mesh.userData.openmockKeepMesh ||
          !geometry || Object.keys(geometry.morphAttributes).length || geometry.drawRange.start !== 0 || geometry.drawRange.count !== Infinity) continue;
      mesh.updateMatrix();
      if (mesh.matrix.determinant() <= 0) continue;
      const attributes = Object.entries(geometry.attributes).map(([name, a]) => `${name}:${a.itemSize}:${a.normalized}:${a.array?.constructor.name}`).sort().join('|');
      const key = `${keyForMaterial(material)}:${attributes}:${mesh.renderOrder}:${mesh.layers.mask}:${mesh.castShadow}:${mesh.receiveShadow}:${JSON.stringify(mesh.userData)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(mesh);
    }
    for (const meshes of groups.values()) {
      if (meshes.length < 3) continue;
      const copies = meshes.map(mesh => {
        const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
        geometry.applyMatrix4(acrossParents ? new THREE.Matrix4().multiplyMatrices(inverseRoot, mesh.matrixWorld) : mesh.matrix);
        return geometry;
      });
      const geometry = mergeGeometries(copies, false);
      copies.forEach(copy => copy.dispose());
      if (!geometry) continue;
      const first = meshes[0];
      const batch = new THREE.Mesh(geometry, first.material);
      batch.name = 'openmock-static-batch';
      batch.castShadow = first.castShadow; batch.receiveShadow = first.receiveShadow;
      batch.renderOrder = first.renderOrder; batch.layers.mask = first.layers.mask;
      batch.userData = { ...first.userData };
      parent.add(batch);
      for (const mesh of meshes) {
        mesh.removeFromParent();
        retiredGeometries.add(mesh.geometry); retiredMaterials.add(mesh.material);
      }
      removedMeshes += meshes.length - 1;
    }
  }
  // Sources can be shared with unbatched meshes; release only unused ones.
  model.traverse(object => {
    retiredGeometries.delete(object.geometry);
    for (const material of [object.material].flat()) retiredMaterials.delete(material);
  });
  retiredGeometries.forEach(geometry => geometry.dispose());
  retiredMaterials.forEach(material => material.dispose());
  if(removedMeshes)model.userData.openmockPartBounds=partBounds;
  return removedMeshes;
}

// Track the complete loaded asset before pruning variants/accessories or
// replacing screen materials. Scene traversal alone cannot release those
// detached resources, nor a model that finishes loading after a switch.
export function collectDeviceResources(object, resources = new Set()) {
  object.traverse(node => {
    if (node.geometry) resources.add(node.geometry);
    for (const material of [node.material].flat()) {
      if (!material) continue;
      resources.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) resources.add(value);
    }
  });
  return resources;
}

export function disposeDeviceResources(resources, retained = new Set()) {
  for (const resource of resources) if (!retained.has(resource)) resource.dispose();
  resources.clear();
}
