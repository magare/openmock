import { useEffect, useLayoutEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { USDLoader } from "three/examples/jsm/loaders/USDLoader.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { deviceArchetype, isAndroidMockup } from "./editorState.js";

const localAssetUrl = (path) => `${import.meta.env.BASE_URL}assets/${path}`;
const modelUrl = localAssetUrl("source/iphone-17-p-sim.glb");
const hdrUrl = localAssetUrl("source/brown_photostudio_04_2k.hdr");
const starterUrl = localAssetUrl("source/starter-screen.jpg");

// Manufacturer-supplied product geometry. Apple models come from the AR assets
// on each product page; Samsung and Google publish the GLBs used by their own
// interactive product viewers. The source iPhone 17 GLB remains the baseline
// because it includes OpenMock's explicit screen-surface metadata.
const exactDeviceAssets = {
  "iPhone 17": {
    type: "gltf",
    url: modelUrl,
    screenRole: "proDisplayScreen",
    screenAspect: 1290 / 2796,
    screenFlipV: true,
  },
  "iPhone 17 Pro": {
    type: "usd",
    url: localAssetUrl("devices/iphone-17-pro.usdz"),
    variant: "pro",
    slab: true,
    forceOverlay: true,
    overlayOnMesh: "HkNSnYzBPABcqwM",
    hideMeshes: ["gCMlCSdRJrizepS", "vDwikmBvgqpSImF"],
    screenAspect: 1206 / 2622,
  },
  "iPhone 17 Pro Max": {
    type: "usd",
    url: localAssetUrl("devices/iphone-17-pro.usdz"),
    variant: "pro-max",
    slab: true,
    forceOverlay: true,
    overlayOnMesh: "HkNSnYzBPABcqwM",
    hideMeshes: ["gCMlCSdRJrizepS", "vDwikmBvgqpSImF"],
    screenAspect: 1320 / 2868,
  },
  "Galaxy S26 Ultra": {
    type: "gltf",
    url: localAssetUrl("devices/galaxy-s26-ultra.glb"),
    slab: true,
    forceOverlay: true,
    screenOverlay: {
      width: 0.0731,
      height: 0.15855,
      position: [0, 0, 0.00378],
      rotation: [0, 0, 0],
      radius: 0.0038,
    },
    screenAspect: 1440 / 3120,
  },
  "Galaxy S26": {
    type: "gltf",
    url: localAssetUrl("devices/galaxy-s26.glb"),
    screenNames: ["M1_Display_Activearea"],
    nativeScreenUv: true,
    screenAspect: 1080 / 2340,
    slab: true,
  },
  "Galaxy S26+": {
    type: "gltf",
    url: localAssetUrl("devices/galaxy-s26-plus.glb"),
    screenNames: ["M2_Display_Activearea"],
    nativeScreenUv: true,
    screenAspect: 1080 / 2340,
    slab: true,
  },
  "Pixel 10": {
    type: "gltf",
    url: localAssetUrl("devices/pixel-10.glb"),
    slab: true,
    forceOverlay: true,
    screenOverlay: {
      width: 0.06545,
      height: 0.14635,
      position: [0, 0.0014, -0.00442],
      rotation: [0, 0, 0],
      facing: -1,
      flipU: true,
      radius: 0.0032,
    },
    screenAspect: 1080 / 2424,
  },
  "Pixel 10 Pro": {
    type: "gltf",
    url: localAssetUrl("devices/pixel-10-pro.glb"),
    slab: true,
    forceOverlay: true,
    screenOverlay: {
      width: 0.06545,
      height: 0.14635,
      position: [0, 0.0014, -0.00442],
      rotation: [0, 0, 0],
      facing: -1,
      flipU: true,
      radius: 0.0032,
    },
    screenAspect: 1280 / 2856,
  },
  "Pixel 10 Pro XL": {
    type: "gltf",
    url: localAssetUrl("devices/pixel-10-pro.glb"),
    slab: true,
    forceOverlay: true,
    screenOverlay: {
      width: 0.06545,
      height: 0.14635,
      position: [0, 0.0014, -0.00442],
      rotation: [0, 0, 0],
      facing: -1,
      flipU: true,
      radius: 0.0032,
    },
    screenAspect: 1344 / 2992,
  },
  "iPhone 17 Air": {
    type: "usd",
    url: localAssetUrl("devices/iphone-air.usdz"),
    screenNames: ["tppzCQmnlKcHIpP"],
    nativeScreenUv: true,
    screenAspect: 1260 / 2736,
    shapeRotateY: Math.PI / 2,
    slab: true,
  },
  "iPad (A16)": {
    type: "usd",
    url: localAssetUrl("devices/ipad-a16.usdz"),
    screenNames: ["YnQokSaETxDhiat"],
    nativeScreenUv: true,
    screenAspect: 1640 / 2360,
    slab: true,
  },
  "iPad Air 13\"": {
    type: "usd",
    url: localAssetUrl("devices/ipad-air.usdz"),
    screenNames: ["duUosXawNfgWFdH"],
    nativeScreenUv: true,
    screenAspect: 2732 / 2048,
    textureRotation: -Math.PI / 2,
    removeSubtrees: ["QdVymQOGxMntlvX", "woLibcGqiFnwmFQ"],
    uprightScreen: true,
  },
  "iPad Air 11\"": {
    type: "usd",
    url: localAssetUrl("devices/ipad-air.usdz"),
    screenNames: ["duUosXawNfgWFdH"],
    nativeScreenUv: true,
    screenAspect: 2360 / 1640,
    textureRotation: -Math.PI / 2,
    removeSubtrees: ["QdVymQOGxMntlvX", "woLibcGqiFnwmFQ"],
    uprightScreen: true,
    shapeScale: [0.8824, 0.8306, 0.84],
  },
  "Apple Watch Ultra 3": {
    type: "usd",
    url: localAssetUrl("devices/watch-ultra-3.usdz"),
    screenNames: ["LBTKGOnjodxPkhe"],
    nativeScreenUv: true,
    screenAspect: 410 / 502,
  },
  "iPad Pro": {
    type: "usd",
    url: localAssetUrl("devices/ipad-pro.usdz"),
    screenNames: ["lsDiIbtoSGSmWWZ"],
    nativeScreenUv: true,
    screenAspect: 2420 / 1668,
    textureRotation: -Math.PI / 2,
    stripBelow: 0.3,
    // The AR download includes a Magic Keyboard and pencil rail as sibling
    // assemblies. Keep the bare iPad assembly (which owns the screen mesh).
    removeSubtrees: ["UlaXKoqepypaGMQ", "PoBqSMmyhhcJsBX"],
    uprightScreen: true,
  },
  "iPad mini": {
    type: "usd",
    url: localAssetUrl("devices/ipad-mini.usdz"),
    slab: true,
    screenAspect: 1488 / 2266,
    forceOverlay: true,
    overlayOnMesh: "JYsmegxeEHkOedR",
    removeSubtrees: ["UqztaYhhdQQwgTu"],
  },
  "MacBook Neo": {
    type: "usd",
    url: localAssetUrl("devices/macbook-neo.usdz"),
    screenNames: ["rvnQqsVlUxgRHpf"],
    screenFlipV: true,
    screenAspect: 16 / 10,
  },
  "MacBook Air 13\"": {
    type: "usd",
    url: localAssetUrl("devices/macbook-air-13.usdz"),
    screenNames: ["lidqkpaVJriYQHN"],
    screenFlipV: true,
    screenAspect: 16 / 10,
  },
  "MacBook Pro 14\"": {
    type: "usd",
    url: localAssetUrl("devices/macbook-pro-14.usdz"),
    screenNames: ["tfTbkkzhxqpKRgC"],
    screenFlipV: true,
    screenAspect: 16 / 10,
  },
  "MacBook Pro 16\"": {
    type: "usd",
    url: localAssetUrl("devices/macbook-pro-14.usdz"),
    screenNames: ["tfTbkkzhxqpKRgC"],
    screenFlipV: true,
    screenAspect: 16 / 10,
    shapeScale: [1.138, 1.09, 1.122],
  },
  "iMac 24\"": {
    type: "usd",
    url: localAssetUrl("devices/imac-24.usdz"),
    screenNames: ["XUnKxWElBQtWRPy"],
    screenAspect: 16 / 9,
    removeSubtrees: ["RdqCKcOrcloXBys", "YBByYyjzwdnRTqR"],
  },
  "Studio Display": {
    type: "usd",
    url: localAssetUrl("devices/studio-display.usdz"),
    screenNames: ["IZJsAfohLAwOHok"],
    screenAspect: 16 / 9,
    standFinish: true,
  },
  "Apple Vision Pro": {
    type: "usd",
    url: localAssetUrl("devices/vision-pro.usdz"),
  },
  "XDR Display": {
    type: "usd",
    url: localAssetUrl("devices/xdr-display.usdz"),
    screenNames: ["IyklIWCEUuwKzOr"],
    screenAspect: 16 / 9,
    standFinish: true,
    standMeshes: ["GkERnwlKXemCPLQ"],
  },
};

// Real AR assets (Apple product pages) and viewer models (Samsung compare
// tooling) for the new watches and foldables. Both Samsung GLBs are posed
// open: the inner display (Main_Display) faces forward, and the cover display
// (Sub_Display) rides on the back over the hinge.
exactDeviceAssets["Apple Watch Series 11"] = {
  type: "usd",
  url: localAssetUrl("devices/watch-series-11.usdz"),
  screenNames: ["WJGSzuMjppLwYru"],
  nativeScreenUv: true,
  screenAspect: 416 / 496,
};
exactDeviceAssets["Apple Watch SE 3"] = {
  type: "usd",
  url: localAssetUrl("devices/watch-se-3.usdz"),
  screenNames: ["YzRtkPWMxJWtiye"],
  nativeScreenUv: true,
  screenAspect: 396 / 484,
};
exactDeviceAssets["Galaxy Z Fold 8"] = {
  type: "gltf",
  url: localAssetUrl("devices/galaxy-z-fold8.glb"),
  screenNames: ["Main_Display"],
  nativeScreenUv: true,
  screenAspect: 2184 / 1968,
};
exactDeviceAssets["Galaxy Z Flip 8"] = {
  type: "gltf",
  url: localAssetUrl("devices/galaxy-z-flip8.glb"),
  // Both foldables ship posed open: the inner display faces forward, and the
  // square cover display (Sub_Display) sits on the back over the hinge. The
  // Flip's native UVs mirror the screen horizontally, hence flipU.
  screenNames: ["Main_Display"],
  nativeScreenUv: true,
  screenAspect: 1080 / 2520,
  flipV: true,
};
const finishPalette = {
  White: { body: 0xdfe5e5, metal: 0xbfc9cb, accent: 0xf0f3f2 },
  Black: { body: 0x111416, metal: 0x303536, accent: 0x0a0b0c },
  "Mist Blue": { body: 0xa9c0c8, metal: 0x7e9ba5, accent: 0xd4e0e3 },
  Sage: { body: 0xa6b8aa, metal: 0x7d9787, accent: 0xd5dfd8 },
  Lavender: { body: 0xc0b4cb, metal: 0x9485a1, accent: 0xe0d8e6 },
};

function physicalMaterial(color, options = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.24,
    metalness: 0.78,
    clearcoat: 0.68,
    clearcoatRoughness: 0.08,
    ...options,
  });
}

function roundedMesh(width, height, depth, radius, material, segments = 6) {
  return new THREE.Mesh(new RoundedBoxGeometry(width, height, depth, segments, radius), material);
}

// A thin extruded capsule. RoundedBoxGeometry caps its corner radius at half
// the depth, so a slab-shaped pill would render as a rounded rectangle — the
// iPhone 16's camera pill needs the stadium profile in the face plane.
// facing = -1 (default) points the cap toward -z for rear hardware; +1 toward
// +z. The returned geometry spans z 0..depth with the cap at the z=0 end.
function stadiumMesh(width, height, depth, material, facing = -1) {
  const shape = new THREE.Shape();
  if (width >= height) {
    // Horizontal capsule: arcs on the short sides, straight rails top/bottom.
    const radius = height / 2;
    shape.moveTo(-(width / 2 - radius), -radius);
    shape.lineTo(width / 2 - radius, -radius);
    shape.absarc(width / 2 - radius, 0, radius, -Math.PI / 2, Math.PI / 2, false);
    shape.lineTo(-(width / 2 - radius), radius);
    shape.absarc(-(width / 2 - radius), 0, radius, Math.PI / 2, Math.PI * 1.5, false);
  } else {
    // Vertical capsule: arcs top and bottom, straight rails left/right.
    const halfWidth = width / 2;
    shape.moveTo(-halfWidth, -height / 2 + halfWidth);
    shape.lineTo(-halfWidth, height / 2 - halfWidth);
    shape.absarc(0, height / 2 - halfWidth, halfWidth, Math.PI, 0, true);
    shape.lineTo(halfWidth, -height / 2 + halfWidth);
    shape.absarc(0, -height / 2 + halfWidth, halfWidth, 0, Math.PI, true);
  }
  const bevel = Math.min(0.008, depth * 0.2);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: Math.max(depth - bevel * 2, bevel * 2), bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 28 });
  geometry.translate(0, 0, bevel);
  if (facing > 0) geometry.rotateY(Math.PI);
  return new THREE.Mesh(geometry, material);
}

// Same idea for rounded-rectangle slabs: keeps the face corner radius that
// RoundedBoxGeometry would clamp away, so phone bodies can show the real
// ~11mm corner rounding instead of a squared-off shell.
function extrudedSlabGeometry(width, height, depth, radius) {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const safeRadius = Math.min(radius, halfWidth, halfHeight);
  const shape = new THREE.Shape();
  shape.moveTo(-halfWidth + safeRadius, -halfHeight);
  shape.lineTo(halfWidth - safeRadius, -halfHeight);
  shape.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + safeRadius);
  shape.lineTo(halfWidth, halfHeight - safeRadius);
  shape.quadraticCurveTo(halfWidth, halfHeight, halfWidth - safeRadius, halfHeight);
  shape.lineTo(-halfWidth + safeRadius, halfHeight);
  shape.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - safeRadius);
  shape.lineTo(-halfWidth, -halfHeight + safeRadius);
  shape.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + safeRadius, -halfHeight);
  const bevel = Math.min(0.01, depth * 0.18);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: Math.max(depth - bevel * 2, bevel * 2), bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 16 });
  geometry.translate(0, 0, -(depth - bevel * 2) / 2);
  return geometry;
}

// The back-glass Apple logo, drawn once to a canvas from the standard apple
// silhouette vector path (384x512 viewBox) and applied as an alpha map to a
// polished insert — mirror-finish on every body color, like the real thing.
let appleLogoTexture = null;
function getAppleLogoTexture() {
  if (appleLogoTexture) return appleLogoTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 342;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  // Draw flipped: the texture uploads with flipY disabled (Chrome rejects
  // FLIP_Y on some upload paths) so the plane must compensate in the canvas.
  const scale = Math.min(canvas.width / 384, canvas.height / 512) * 0.98;
  ctx.translate((canvas.width - 384 * scale) / 2, canvas.height - (canvas.height - 512 * scale) / 2);
  ctx.scale(scale, -scale);
  ctx.fill(new Path2D("M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"));
  appleLogoTexture = new THREE.CanvasTexture(canvas);
  appleLogoTexture.flipY = false;
  appleLogoTexture.colorSpace = THREE.NoColorSpace;
  return appleLogoTexture;
}

function addAppleLogo(group, width, height, z) {
  const logoWidth = width * 0.185;
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xc7cfd2,
    metalness: 0.65,
    roughness: 0.24,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    transparent: true,
    alphaMap: getAppleLogoTexture(),
  });
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(logoWidth, logoWidth * (512 / 384)), material);
  logo.rotation.y = Math.PI;
  logo.position.set(0, height * 0.005, z);
  group.add(logo);
  return logo;
}

function cloneTexture(texture, targetAspect) {
  if (!texture) return null;
  // A single live texture keeps late-loading images and video frames in sync
  // across the screen surfaces that belong to one mockup.
  const map = texture;
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.ClampToEdgeWrapping;
  map.wrapT = THREE.ClampToEdgeWrapping;
  map.userData = { ...(map.userData || {}), targetAspect };
  if (map.image) map.needsUpdate = true;
  return map;
}

function addScreen(group, width, height, depth, texture, options = {}) {
  const targetAspect = width / Math.max(0.001, height);
  // faceRadius opts the stack into extruded slabs that keep their corner
  // rounding (used where the phone body itself is properly rounded).
  const faceRadius = options.faceRadius || 0;
  const slab = (w, h, d, r, material, segments) => (faceRadius
    ? new THREE.Mesh(extrudedSlabGeometry(w, h, d, r), material)
    : roundedMesh(w, h, d, r, material, segments));
  const bezel = slab(width, height, Math.max(depth * 0.5, 0.028), faceRadius || Math.min(width, height) * 0.075, physicalMaterial(0x080a0c, { roughness: 0.18, metalness: 0.22, clearcoat: 0.9 }), 6);
  bezel.position.z = options.z || 0;
  group.add(bezel);
  const screenMap = cloneTexture(texture, targetAspect);
  const screen = slab(width * 0.955, height * 0.955, Math.max(depth * 0.18, 0.016), faceRadius ? faceRadius * 0.955 : Math.min(width, height) * 0.058, new THREE.MeshBasicMaterial({
    map: screenMap,
    color: 0xffffff,
    toneMapped: false,
  }));
  screen.position.z = (options.z || 0) + Math.max(depth * 0.38, 0.024);
  screen.userData.screenAspect = targetAspect;
  group.add(screen);
  const glass = slab(width * 0.952, height * 0.952, Math.max(depth * 0.06, 0.009), faceRadius ? faceRadius * 0.952 : Math.min(width, height) * 0.054, new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.18,
    roughness: 0.08,
    metalness: 0,
    transmission: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    depthWrite: false,
  }));
  glass.position.z = (options.z || 0) + Math.max(depth * 0.52, 0.034);
  glass.userData.screenAspect = targetAspect;
  group.add(glass);
  return { bezel, screen, glass };
}

function addFrontCameraDot(group, x, y, z, radius = 0.024) {
  const outer = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.018, 24), new THREE.MeshPhysicalMaterial({
    color: 0x07090a,
    roughness: 0.18,
    metalness: 0.08,
    clearcoat: 0.7,
  }));
  outer.rotation.x = Math.PI / 2;
  outer.position.set(x, y, z);
  group.add(outer);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.48, 20), new THREE.MeshPhysicalMaterial({
    color: 0x314b58,
    roughness: 0.12,
    metalness: 0.15,
    clearcoat: 1,
  }));
  lens.position.set(x, y, z + 0.011);
  group.add(lens);
}

function addPhoneButtons(group, width, height, depth, accent, layout = "iphone") {
  const buttonMaterial = physicalMaterial(accent, { roughness: 0.2, metalness: 0.88, clearcoat: 0.7 });
  const sideButton = (x, y, w = 0.035, h = 0.17, zDepth = Math.max(depth * 0.6, 0.055)) => {
    const button = roundedMesh(w, h, zDepth, w * 0.45, buttonMaterial, 4);
    button.position.set(x, y, 0);
    group.add(button);
  };
  if (layout === "galaxy") {
    sideButton(width / 2 + 0.018, height * 0.16, 0.035, 0.22);
    sideButton(width / 2 + 0.018, height * 0.02, 0.035, 0.16);
  } else if (layout === "pixel") {
    sideButton(width / 2 + 0.018, height * 0.16, 0.035, 0.23);
    sideButton(width / 2 + 0.018, height * 0.01, 0.035, 0.12);
  } else if (layout === "iphone-16") {
    // Measured from Apple's official render: the 16's keys are near-flush
    // slivers (~1mm proud, thin blades), not tabs. Action button high on the
    // phone's left with the volume pair below; long power key on the right
    // with the nearly flush Camera Control lower down.
    const blade = Math.max(depth * 0.28, 0.03);
    sideButton(-width / 2 - 0.001, height * 0.281, 0.03, height * 0.04, blade);
    sideButton(-width / 2 - 0.001, height * 0.191, 0.03, height * 0.064, blade);
    sideButton(-width / 2 - 0.001, height * 0.097, 0.03, height * 0.066, blade);
    sideButton(width / 2 + 0.001, height * 0.145, 0.03, height * 0.113, blade);
    const cameraControl = roundedMesh(0.02, height * 0.055, blade * 0.8, 0.007, buttonMaterial, 4);
    cameraControl.position.set(width / 2 - 0.002, -height * 0.1, 0);
    group.add(cameraControl);
  } else {
    sideButton(-width / 2 - 0.018, height * 0.18, 0.04, 0.2);
    sideButton(-width / 2 - 0.018, height * 0.03, 0.04, 0.14);
    sideButton(-width / 2 - 0.018, -height * 0.12, 0.04, 0.14);
    sideButton(width / 2 + 0.018, height * 0.2, 0.04, 0.24);
  }
  return buttonMaterial;
}

function addPhoneIsland(group, width, height, depth) {
  // Full-capsule Dynamic Island: RoundedBoxGeometry clamps radius to half the
  // depth, which squashes it into a plain rounded bar. Size/height measured
  // off Apple's official iPhone 16 renders (~19mm capsule high on the face).
  const islandDepth = Math.max(depth * 0.42, 0.04);
  const island = stadiumMesh(width * 0.28, height * 0.04, islandDepth, physicalMaterial(0x050607, { roughness: 0.14, metalness: 0.08, clearcoat: 0.9 }), 1);
  island.position.set(0, height * 0.454, depth * 0.99);
  group.add(island);
  addFrontCameraDot(group, width * 0.09, height * 0.454, depth * 0.99, height * 0.012);
}

function addBackCameraSystem(group, width, height, depth, kind, palette) {
  const isGalaxyBase = kind === "galaxy-s26";
  const bumpColor = kind === "iphone" || kind === "iphone-16" || kind === "iphone-air" ? palette.metal : kind === "pixel" ? 0x2b3336 : kind === "ipad" || kind === "ipad-air" ? palette.metal : isGalaxyBase ? palette.body : palette.accent;
  const bumpMaterial = physicalMaterial(bumpColor, { roughness: 0.19, metalness: 0.7, clearcoat: 0.82 });
  if (isGalaxyBase) {
    bumpMaterial.transparent = true;
    bumpMaterial.opacity = 0.78;
  }
  const lensMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x071219,
    roughness: 0.09,
    metalness: 0.38,
    clearcoat: 1,
    clearcoatRoughness: 0.025,
    envMapIntensity: 0.85,
    iridescence: 0.18,
    iridescenceIOR: 1.32,
  });
  const ringMaterial = new THREE.MeshPhysicalMaterial({ color: palette.metal, roughness: 0.18, metalness: 0.82, clearcoat: 0.9 });
  const extraFinishables = [];
  const bumpRole = kind === "ipad" || kind === "ipad-air" || kind === "iphone" || kind === "iphone-16" || kind === "iphone-air" ? "metal" : isGalaxyBase ? "body" : "accent";
  const finishables = [{ material: ringMaterial, role: "metal" }, ...(kind === "pixel" ? [] : [{ material: bumpMaterial, role: bumpRole }]), ...extraFinishables];
  const camera = (x, y, radius = 0.075) => {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.16, radius * 1.16, 0.028, 28), ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, y, -depth / 2 - 0.045);
    group.add(ring);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.04, 28), lensMaterial);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(x, y, -depth / 2 - 0.064);
    group.add(lens);
  };
  const flash = (x, y, radius = 0.026, depthOffset = 0.067) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 10), new THREE.MeshPhysicalMaterial({ color: 0xe8d6a7, roughness: 0.26, metalness: 0.08 }));
    mesh.position.set(x, y, -depth / 2 - depthOffset);
    group.add(mesh);
  };
  if (kind === "pixel") {
    const bar = roundedMesh(width * 0.82, height * 0.12, 0.055, height * 0.045, bumpMaterial, 6);
    bar.position.set(0, height * 0.32, -depth / 2 - 0.03);
    group.add(bar);
    camera(-width * 0.22, height * 0.32, 0.07);
    camera(0, height * 0.32, 0.07);
    camera(width * 0.22, height * 0.32, 0.055);
    flash(width * 0.3, height * 0.32);
  } else if (kind === "galaxy-s26") {
    // The S26/S26+ use one translucent ambient-island carrying three lenses;
    // this is intentionally a separate treatment from the four-lens Ultra.
    const island = roundedMesh(width * 0.31, height * 0.39, 0.052, height * 0.06, bumpMaterial, 8);
    island.position.set(width * 0.22, height * 0.3, -depth / 2 - 0.03);
    group.add(island);
    camera(width * 0.22, height * 0.42, 0.066);
    camera(width * 0.22, height * 0.3, 0.061);
    camera(width * 0.22, height * 0.18, 0.056);
    flash(width * 0.35, height * 0.15, 0.022);
  } else if (kind === "iphone-16") {
    // Geometry measured from Apple's official iPhone 16 renders: a compact
    // vertical stadium pill hugging the top corner (0.28w x 0.24h, center at
    // +0.32w/+0.36h), two snug lens rings a quarter-pill apart, a tiny rear
    // mic INSIDE the pill near its center-side edge, and a small flash just
    // past the centerline at pill mid-height. Lenses get their own materials:
    // bright aluminum rings around deep glossy black glass with a small
    // offset inner element — flat gray discs read as nothing.
    // Fractions rebalanced for the narrower body so the pill, flash and mic
    // keep their measured absolute sizes on the face.
    const pillCenterX = width * 0.33;
    const pillCenterY = height * 0.36;
    const pill = stadiumMesh(width * 0.29, height * 0.24, 0.05, bumpMaterial);
    pill.position.set(pillCenterX, pillCenterY, -depth / 2 - 0.062);
    group.add(pill);
    const ringMetal = physicalMaterial(palette.metal, { roughness: 0.11, metalness: 0.95, clearcoat: 1, clearcoatRoughness: 0.06 });
    extraFinishables.push({ material: ringMetal, role: "metal" });
    const glassBlack = physicalMaterial(0x04060a, { roughness: 0.05, metalness: 0.08, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 0.32 });
    const innerElement = physicalMaterial(0x8fa9bd, { roughness: 0.16, metalness: 0.7, clearcoat: 1, clearcoatRoughness: 0.05 });
    const lensPitch = height * 0.062;
    const ringOuter = 0.09 * 1.16;
    for (const y of [pillCenterY + lensPitch, pillCenterY - lensPitch]) {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(ringOuter, ringOuter, 0.028, 40), ringMetal);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(pillCenterX, y, -depth / 2 - 0.073);
      group.add(ring);
      // The glass cap must sit PROUD of the solid ring cylinder's face or the
      // ring's cap occludes it entirely from straight-on views.
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.086, 0.086, 0.026, 40), glassBlack);
      glass.rotation.x = Math.PI / 2;
      glass.position.set(pillCenterX, y, -depth / 2 - 0.08);
      group.add(glass);
      const pupil = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.012, 28), innerElement);
      pupil.rotation.x = Math.PI / 2;
      pupil.position.set(pillCenterX + 0.012, y + 0.012, -depth / 2 - 0.0875);
      group.add(pupil);
    }
    const rearMic = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.012, 16), glassBlack);
    rearMic.rotation.x = Math.PI / 2;
    rearMic.position.set(width * 0.247, pillCenterY, -depth / 2 - 0.064);
    group.add(rearMic);
    // Flash: cream dome with a faint dark bezel ring, like the real window.
    const flashRing = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.004, 10, 28), glassBlack);
    flashRing.position.set(width * 0.11, pillCenterY, -depth / 2 - 0.024);
    group.add(flashRing);
    flash(width * 0.114, pillCenterY, 0.0294, 0.03);
  } else if (kind === "iphone-air") {
    // iPhone Air has one large Fusion camera on a broad top camera plateau.
    const island = roundedMesh(width * 0.57, height * 0.18, 0.052, height * 0.045, bumpMaterial, 8);
    island.position.set(width * 0.13, height * 0.36, -depth / 2 - 0.03);
    group.add(island);
    camera(width * 0.28, height * 0.36, 0.084);
    flash(width * 0.02, height * 0.36, 0.021);
    const mic = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 8), lensMaterial);
    mic.position.set(-width * 0.13, height * 0.36, -depth / 2 - 0.068);
    group.add(mic);
  } else if (kind === "galaxy") {
    camera(width * 0.25, height * 0.32, 0.076);
    camera(width * 0.25, height * 0.12, 0.07);
    camera(width * 0.25, -height * 0.08, 0.06);
    camera(-width * 0.08, height * 0.31, 0.052);
    flash(-width * 0.09, height * 0.14);
  } else if (kind === "galaxy-tab") {
    // The Tab S11 Ultra uses two clean, separate camera rings on its very
    // thin rear shell; a phone-like rectangular camera island looks wrong.
    camera(width * 0.39, height * 0.4, 0.054);
    camera(width * 0.39, height * 0.29, 0.049);
    flash(width * 0.27, height * 0.34, 0.018);
  } else if (kind === "ipad" || kind === "ipad-air") {
    const bump = roundedMesh(width * 0.22, height * 0.16, 0.05, height * 0.04, bumpMaterial, 6);
    bump.position.set(width * 0.25, height * 0.35, -depth / 2 - 0.03);
    group.add(bump);
    camera(width * 0.25, height * 0.37, 0.072);
    flash(width * 0.37, height * 0.31);
  } else {
    const bump = roundedMesh(width * 0.42, height * 0.29, 0.06, height * 0.07, bumpMaterial, 6);
    bump.position.set(width * 0.22, height * 0.3, -depth / 2 - 0.032);
    group.add(bump);
    camera(width * 0.32, height * 0.37, 0.075);
    camera(width * 0.12, height * 0.37, 0.072);
    camera(width * 0.32, height * 0.17, 0.062);
    const flash = new THREE.Mesh(new THREE.SphereGeometry(0.034, 18, 12), new THREE.MeshPhysicalMaterial({ color: 0xf0d59c, roughness: 0.25, metalness: 0.12 }));
    flash.position.set(width * 0.09, height * 0.18, -depth / 2 - 0.068);
    group.add(flash);
  }
  return { finishables };
}

function createPhone(mockup, texture, finish) {
  const palette = finishPalette[finish] || finishPalette.White;
  const isGalaxy = mockup.startsWith("Galaxy");
  const isPixel = mockup.startsWith("Pixel");
  const isGalaxyBase = mockup === "Galaxy S26" || mockup === "Galaxy S26+";
  const isIPhone16 = mockup === "iPhone 16";
  const isUltra = mockup.includes("Ultra");
  const isProMax = mockup.includes("Pro Max");
  const isXL = mockup.includes("XL");
  const isPlus = mockup.includes("+");
  const isAir = mockup.includes("Air");
  // Apple's official renders show the 16 body at ~0.47 width-to-height —
  // slimmer than the old 1.07/2.2 shell read.
  const width = isUltra ? 1.08 : isProMax ? 1.16 : isXL ? 1.1 : isPlus ? 1.08 : isAir ? 1.04 : isIPhone16 || isGalaxy || isPixel ? 1.03 : 1.07;
  const height = isUltra ? 2.25 : isProMax ? 2.34 : isXL ? 2.38 : isPlus ? 2.28 : isAir ? 2.27 : isIPhone16 ? 2.2 : 2.2;
  // The 16/16 Plus are 7.8mm thin — noticeably slimmer than the Pro shells.
  const depth = isAir ? 0.085 : isIPhone16 ? 0.115 : isUltra ? 0.12 : isPixel ? 0.125 : isProMax ? 0.145 : 0.13;
  const group = new THREE.Group();
  // The 16's unibody keeps its real ~11mm corner rounding: RoundedBoxGeometry
  // clamps radius to half the depth, which squares thin phone shells, so this
  // body uses an extruded rounded-rect profile instead.
  const bodyRadius = width * 0.15;
  const body = isIPhone16
    ? new THREE.Mesh(extrudedSlabGeometry(width, height, depth, bodyRadius), physicalMaterial(palette.metal, { roughness: 0.2, metalness: 0.9, clearcoat: 0.78 }))
    : roundedMesh(width, height, depth, isGalaxy ? 0.15 : 0.12, physicalMaterial(palette.metal, { roughness: isGalaxy ? 0.17 : 0.2, metalness: 0.9, clearcoat: 0.78 }));
  group.add(body);
  // The 16's back is matte frosted glass, not gloss — low sheen keeps the
  // highlight wash-out that made earlier renders read plasticky.
  const backPanel = isIPhone16
    ? new THREE.Mesh(extrudedSlabGeometry(width * 0.972, height * 0.976, 0.024, bodyRadius * 0.88), physicalMaterial(palette.body, { roughness: 0.46, metalness: 0.06, clearcoat: 0.24, clearcoatRoughness: 0.3 }))
    : roundedMesh(width * 0.972, height * 0.976, 0.024, isGalaxy ? 0.14 : 0.11, physicalMaterial(palette.body, { roughness: 0.24, metalness: 0.16, clearcoat: 0.92, clearcoatRoughness: 0.045 }));
  backPanel.position.z = -depth / 2 - 0.009;
  group.add(backPanel);
  if (isIPhone16) addAppleLogo(group, width, height, -depth / 2 - 0.026);
  // The 16's screen glass runs nearly edge to edge: content ≈ 0.9w with thin
  // even bezels, per Apple's official renders.
  const screens = addScreen(group, width * (isIPhone16 ? 0.94 : 0.91), height * (isIPhone16 ? 0.985 : 0.93), depth, texture, { z: depth * 0.42, ...(isIPhone16 ? { faceRadius: bodyRadius * 0.8 } : {}) });
  if (isGalaxy || isPixel) addFrontCameraDot(group, 0, height * 0.42, depth * 0.83, 0.026);
  else addPhoneIsland(group, width, height, depth);
  const buttonMaterial = addPhoneButtons(group, width, height, depth, palette.metal, isGalaxy ? "galaxy" : isPixel ? "pixel" : isIPhone16 ? "iphone-16" : "iphone");
  const cameraKind = isGalaxyBase ? "galaxy-s26" : isPixel ? "pixel" : isIPhone16 ? "iphone-16" : isAir ? "iphone-air" : isGalaxy ? "galaxy" : "iphone";
  const cameraSystem = addBackCameraSystem(group, width, height, depth, cameraKind, palette);
  return {
    group,
    materials: {
      body,
      finishables: [
        { material: body.material, role: "metal" },
        { material: backPanel.material, role: "body" },
        { material: buttonMaterial, role: "metal" },
        ...(cameraSystem?.finishables || []),
      ],
      screen: screens.screen,
      glass: screens.glass,
    },
  };
}

function createTablet(mockup, texture, finish) {
  const palette = finishPalette[finish] || finishPalette.White;
  const isMini = mockup === "iPad mini";
  const isGalaxyTab = mockup.includes("Tab");
  const isTabUltra = isGalaxyTab && mockup.includes("Ultra");
  const isA16 = mockup === "iPad (A16)";
  const isAir = mockup.includes("iPad Air");
  const isAir13 = mockup === "iPad Air 13\"";
  const width = isMini ? 1.42 : isTabUltra ? 1.68 : isAir13 ? 1.78 : isAir ? 1.68 : isA16 ? 1.7 : 1.68;
  const height = isMini ? 2.16 : isTabUltra ? 2.63 : isAir13 ? 2.34 : isAir ? 2.25 : isA16 ? 2.35 : 2.34;
  const depth = isTabUltra ? 0.054 : 0.105;
  const group = new THREE.Group();
  const body = roundedMesh(width, height, depth, 0.12, physicalMaterial(palette.metal, { roughness: 0.2, metalness: 0.88, clearcoat: 0.78 }));
  group.add(body);
  const backPanel = roundedMesh(width * 0.978, height * 0.978, 0.022, 0.11, physicalMaterial(palette.body, { roughness: 0.26, metalness: 0.12, clearcoat: 0.9, clearcoatRoughness: 0.05 }));
  backPanel.position.z = -depth / 2 - 0.008;
  group.add(backPanel);
  const screens = addScreen(group, width * 0.935, height * 0.925, depth, texture, { z: depth * 0.42 });
  if (isGalaxyTab || isAir || isA16) addFrontCameraDot(group, width * 0.437, 0, depth * 0.83, 0.019);
  else addFrontCameraDot(group, 0, height * 0.437, depth * 0.83, 0.019);
  const buttonMaterial = addPhoneButtons(group, width, height, depth, palette.metal, isGalaxyTab ? "galaxy" : "pixel");
  const cameraSystem = addBackCameraSystem(group, width, height, depth, isGalaxyTab ? "galaxy-tab" : isAir || isA16 ? "ipad-air" : "ipad", palette);
  if (isGalaxyTab) {
    const stylus = roundedMesh(0.068, height * 0.48, 0.046, 0.028, physicalMaterial(0x252a2c, { roughness: 0.42, metalness: 0.44 }), 6);
    stylus.position.set(-width * 0.31, -height * 0.01, -depth / 2 - 0.033);
    group.add(stylus);
    const stylusTip = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.052, 18), physicalMaterial(0x939b9d, { roughness: 0.3, metalness: 0.72 }));
    stylusTip.rotation.z = Math.PI / 2;
    stylusTip.position.set(-width * 0.31, -height * 0.255, -depth / 2 - 0.034);
    group.add(stylusTip);
  }
  return {
    group,
    materials: {
      body,
      finishables: [
        { material: body.material, role: "metal" },
        { material: backPanel.material, role: "body" },
        { material: buttonMaterial, role: "metal" },
        ...(cameraSystem?.finishables || []),
      ],
      screen: screens.screen,
      glass: screens.glass,
    },
  };
}

function createFlatDisplay(texture) {
  const group = new THREE.Group();
  const body = roundedMesh(2.5, 1.58, 0.09, 0.08, physicalMaterial(0x0b0d0f, { roughness: 0.34, metalness: 0.32, clearcoat: 0.62 }));
  group.add(body);
  const screens = addScreen(group, 2.42, 1.5, 0.09, texture, { z: 0.038 });
  return { group, materials: { body: null, finishables: [], screen: screens.screen, glass: screens.glass } };
}

function createLaptop(mockup, texture, finish) {
  const palette = finishPalette[finish] || finishPalette.White;
  const isNeo = mockup === "MacBook Neo";
  const isAir = mockup.includes("Air");
  const isSurface = mockup.includes("Surface");
  const isXPS = mockup.includes("XPS");
  const isPro16 = mockup.includes("16");
  const width = isNeo ? 2.42 : isXPS ? 2.74 : isPro16 ? 2.86 : isAir ? 2.48 : isSurface ? 2.62 : 2.58;
  // Match the real footprints: the XPS 16 is 358.18 x 240.05 mm and the
  // 15-inch Surface is notably deeper than a 16:10 MacBook-style base.
  const depth = isNeo ? 1.42 : isPro16 ? 1.68 : isXPS ? 1.84 : isSurface ? 1.88 : 1.54;
  const displayAspect = isSurface ? 3 / 2 : 16 / 10;
  const displayHeight = width / displayAspect;
  const baseY = 0.18 - displayHeight / 2 - 0.01;
  const group = new THREE.Group();
  const displayAssembly = new THREE.Group();
  displayAssembly.position.set(0, 0.18, -depth * 0.39);
  displayAssembly.rotation.x = -THREE.MathUtils.degToRad(8);
  group.add(displayAssembly);
  const displayShell = roundedMesh(width, displayHeight, 0.11, isXPS ? 0.045 : isSurface ? 0.1 : 0.09, physicalMaterial(isXPS ? 0x24282a : palette.body, { roughness: 0.18, metalness: 0.84 }));
  if (isXPS) displayShell.material.userData.openmockFixedColor = true;
  displayAssembly.add(displayShell);
  const screenInsetWidth = isXPS ? 0.958 : isSurface ? 0.89 : 0.925;
  const screenInsetHeight = isXPS ? 0.9 : isSurface ? 0.86 : 0.87;
  const displayScreen = addScreen(displayAssembly, width * screenInsetWidth, displayHeight * screenInsetHeight, 0.06, texture, { z: 0.068 });
  addFrontCameraDot(displayAssembly, 0, displayHeight * 0.435, 0.13, 0.014);
  const baseMaterial = physicalMaterial(isXPS ? 0x202426 : palette.metal, { roughness: isXPS ? 0.38 : 0.3, metalness: 0.78 });
  if (isXPS) baseMaterial.userData.openmockFixedColor = true;
  const base = roundedMesh(width * 1.055, 0.14, depth, 0.06, baseMaterial);
  base.position.set(0, baseY, 0.16);
  group.add(base);
  // Recessed keyboard well with a six-row key matrix (function row on top,
  // wide spacebar at the bottom) sitting inside it, trackpad below.
  const well = roundedMesh(width * (isXPS ? 0.94 : 0.88), 0.03, depth * (isSurface ? 0.7 : 0.66), 0.024, physicalMaterial(isXPS ? 0x202426 : isSurface ? 0x202527 : 0x111416, { roughness: 0.55, metalness: 0.14 }));
  well.position.set(0, baseY + 0.09, -depth * 0.09);
  group.add(well);
  const keyMaterial = physicalMaterial(isXPS ? 0x313738 : isSurface ? 0x2d3335 : 0x3c4346, { roughness: 0.5, metalness: 0.12 });
  const keyRows = 6;
  const keyColumns = isXPS ? 14 : 13;
  const keyWidth = width * (isXPS ? 0.052 : 0.049);
  const keyDepth = depth * 0.07;
  if (isXPS) {
    // XPS 16's capacitive function row is a continuous glass strip rather
    // than another row of raised keys.
    const functionStrip = roundedMesh(width * 0.82, 0.018, depth * 0.055, 0.014, physicalMaterial(0x111416, { roughness: 0.2, metalness: 0.22, clearcoat: 0.88 }), 5);
    functionStrip.position.set(0, baseY + 0.124, -depth * 0.305);
    group.add(functionStrip);
  }
  for (let row = 0; row < keyRows; row += 1) {
    const isFunctionRow = row === 0;
    if (isXPS && isFunctionRow) continue;
    for (let column = 0; column < keyColumns; column += 1) {
      const isSpacebar = row === keyRows - 1 && column >= 4 && column <= 8;
      const key = roundedMesh(isSpacebar ? keyWidth * 3.6 : isFunctionRow ? keyWidth * 1.15 : keyWidth, 0.022, isFunctionRow ? keyDepth * 0.8 : keyDepth, 0.009, keyMaterial, 3);
      key.position.set((column - (keyColumns - 1) / 2) * width * (isXPS ? 0.055 : 0.064), baseY + 0.12, -depth * 0.3 + row * depth * 0.098);
      group.add(key);
    }
  }
  const trackpad = roundedMesh(width * (isXPS ? 0.4 : isSurface ? 0.3 : 0.3), 0.02, depth * (isXPS ? 0.31 : 0.26), 0.022, physicalMaterial(isXPS ? 0x292e30 : isSurface ? 0x8f9798 : 0x9fa6a8, { roughness: isXPS ? 0.32 : 0.26, metalness: 0.42, clearcoat: 0.8 }));
  trackpad.position.set(0, baseY + 0.083, depth * 0.42);
  group.add(trackpad);
  const hingeMaterial = physicalMaterial(isXPS ? 0x202426 : palette.metal, { roughness: 0.25, metalness: 0.8 });
  if (isXPS) hingeMaterial.userData.openmockFixedColor = true;
  const hinge = roundedMesh(width * 0.82, 0.06, 0.12, 0.03, hingeMaterial);
  hinge.position.set(0, baseY + 0.095, -depth * 0.39);
  group.add(hinge);
  const footMaterial = physicalMaterial(0x15181a, { roughness: 0.7, metalness: 0.05 });
  for (const side of [-1, 1]) {
    const foot = roundedMesh(width * 0.08, 0.05, 0.1, 0.02, footMaterial, 3);
    foot.position.set(side * width * 0.4, baseY - 0.08, -depth * 0.3);
    group.add(foot);
  }
  return {
    group,
    materials: {
      body: displayShell,
      finishables: [
        { material: displayShell.material, role: "body" },
        { material: base.material, role: "metal" },
        { material: hinge.material, role: "metal" },
      ],
      screen: displayScreen.screen,
      glass: displayScreen.glass,
    },
  };
}

function createDisplay(texture, finish, variant = "xdr") {
  const palette = finishPalette[finish] || finishPalette.White;
  const group = new THREE.Group();
  const isIMac = variant === "imac";
  const isStudio = variant === "studio";
  const isTV = variant === "tv";
  const width = isTV ? 3.5 : isIMac ? 2.5 : isStudio ? 2.95 : 2.78;
  const height = isTV ? 2.0 : isIMac ? 1.68 : isStudio ? 1.72 : 1.76;
  // TV bezels stay black regardless of the chosen finish, like real hardware.
  const body = roundedMesh(width, height, isTV ? 0.08 : 0.14, 0.105, isTV ? physicalMaterial(0x0b0d0f, { roughness: 0.34, metalness: 0.32, clearcoat: 0.62 }) : physicalMaterial(palette.body, { roughness: 0.17, metalness: 0.84 }));
  group.add(body);
  const screen = addScreen(group, width * (isTV ? 0.972 : isIMac ? 0.91 : 0.945), height * (isTV ? 0.945 : isIMac ? 0.79 : 0.905), 0.07, texture, { z: 0.08 });
  let chin = null;
  if (isIMac) {
    chin = roundedMesh(width * 0.91, height * 0.105, 0.05, 0.025, physicalMaterial(palette.body, { roughness: 0.22, metalness: 0.78 }));
    chin.position.set(0, -height * 0.39, 0.11);
    group.add(chin);
  }
  if (!isTV) addFrontCameraDot(group, 0, height * 0.415, 0.15, isIMac ? 0.015 : 0.013);
  // TVs keep their real black hardware: nothing in finishables, so the
  // finish picker never repaints the panel or feet.
  const finishables = isTV ? [] : [{ material: body.material, role: "body" }, ...(chin ? [{ material: chin.material, role: "body" }] : [])];
  if (isTV) {
    // Two slim feet at the panel edges, like a living-room TV.
    const footMaterial = physicalMaterial(0x1c1f21, { roughness: 0.4, metalness: 0.5 });
    for (const side of [-1, 1]) {
      const tvFoot = roundedMesh(0.1, 0.34, 0.5, 0.035, footMaterial, 3);
      tvFoot.position.set(side * width * 0.4, -height * 0.5 - 0.14, 0);
      group.add(tvFoot);
    }
  } else {
    const neck = roundedMesh(isIMac ? 0.18 : 0.16, isIMac ? 0.64 : isStudio ? 0.6 : 0.68, 0.16, 0.05, physicalMaterial(palette.metal, { roughness: 0.3, metalness: 0.72 }));
    neck.position.y = isIMac ? -1.12 : isStudio ? -1.14 : -1.15;
    group.add(neck);
    const foot = roundedMesh(isIMac ? 0.92 : isStudio ? 1.02 : 0.86, 0.09, isIMac ? 0.62 : 0.56, 0.045, physicalMaterial(palette.metal, { roughness: 0.26, metalness: 0.78 }));
    foot.position.set(0, isIMac ? -1.47 : isStudio ? -1.49 : -1.5, 0.08);
    group.add(foot);
    finishables.push({ material: neck.material, role: "metal" }, { material: foot.material, role: "metal" });
  }
  return {
    group,
    materials: {
      body: isTV ? null : body,
      finishables,
      screen: screen.screen,
      glass: screen.glass,
    },
  };
}

function createVisionPro(texture, finish) {
  const group = new THREE.Group();
  const visor = roundedMesh(1.86, 0.94, 0.3, 0.24, physicalMaterial(0x303b3f, { roughness: 0.2, metalness: 0.74, clearcoat: 0.98, clearcoatRoughness: 0.035, envMapIntensity: 0.62 }));
  visor.position.z = 0.02;
  group.add(visor);
  const cushion = roundedMesh(1.9, 0.76, 0.13, 0.21, physicalMaterial(0x14191b, { roughness: 0.64, metalness: 0.06 }));
  cushion.position.z = -0.18;
  group.add(cushion);
  const lensMaterial = new THREE.MeshPhysicalMaterial({ color: 0x10252a, roughness: 0.13, metalness: 0.34, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 0.58, iridescence: 0.12, iridescenceIOR: 1.3 });
  const lensScreen = cloneTexture(texture, 1);
  const lensScreenMaterial = new THREE.MeshBasicMaterial({ color: 0x142d34, map: lensScreen, transparent: true, opacity: 0.02, toneMapped: false, depthWrite: false });
  const lensCover = new THREE.MeshPhysicalMaterial({ color: 0x0b1a1f, transparent: true, opacity: 0.36, roughness: 0.16, metalness: 0.28, clearcoat: 1, clearcoatRoughness: 0.028, envMapIntensity: 0.54, depthWrite: false });
  const frontGlass = roundedMesh(1.76, 0.8, 0.05, 0.2, new THREE.MeshPhysicalMaterial({ color: 0x0c1b20, transparent: true, opacity: 0.72, roughness: 0.12, metalness: 0.36, clearcoat: 1, clearcoatRoughness: 0.025, envMapIntensity: 0.62, depthWrite: false }));
  frontGlass.position.set(0, 0, 0.19);
  group.add(frontGlass);
  for (const x of [-0.43, 0.43]) {
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.07, 48), lensMaterial);
    lens.rotation.x = Math.PI / 2;
    lens.scale.y = 0.88;
    lens.position.set(x, 0, 0.215);
    group.add(lens);
    const content = new THREE.Mesh(new THREE.CircleGeometry(0.148, 48), lensScreenMaterial.clone());
    content.scale.y = 0.88;
    content.position.set(x, 0, 0.25);
    content.userData.screenAspect = 1;
    group.add(content);
    const cover = new THREE.Mesh(new THREE.CircleGeometry(0.16, 48), lensCover);
    cover.scale.y = 0.88;
    cover.position.set(x, 0, 0.264);
    group.add(cover);
  }
  const bridge = roundedMesh(0.27, 0.15, 0.18, 0.055, physicalMaterial(0x343f43, { roughness: 0.24, metalness: 0.72 }));
  bridge.position.set(0, 0.01, 0.2);
  group.add(bridge);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.12, 24), physicalMaterial(0x9ca6a8, { roughness: 0.2, metalness: 0.86, clearcoat: 0.75 }));
  crown.rotation.z = Math.PI / 2;
  crown.position.set(0.91, 0.3, 0.03);
  group.add(crown);
  const topButton = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.09, 20), physicalMaterial(0x879295, { roughness: 0.22, metalness: 0.82 }));
  topButton.rotation.z = Math.PI / 2;
  topButton.position.set(0.88, 0.46, 0.04);
  group.add(topButton);
  const sensorMaterial = new THREE.MeshPhysicalMaterial({ color: 0x0b1012, roughness: 0.16, metalness: 0.22, clearcoat: 0.9 });
  for (const x of [-0.3, 0, 0.3]) {
    const sensor = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.035, 20), sensorMaterial);
    sensor.rotation.x = Math.PI / 2;
    sensor.position.set(x, -0.36, 0.21);
    group.add(sensor);
  }
  const sideMaterial = physicalMaterial(0x263135, { roughness: 0.3, metalness: 0.7 });
  for (const x of [-0.91, 0.91]) {
    const arm = roundedMesh(0.17, 0.28, 0.28, 0.075, sideMaterial);
    arm.position.set(x, -0.02, -0.04);
    group.add(arm);
  }
  const headBand = roundedMesh(2.35, 0.28, 0.14, 0.1, physicalMaterial(0x303a3d, { roughness: 0.5, metalness: 0.2 }));
  headBand.position.set(0, -0.04, -0.3);
  group.add(headBand);
  return { group, materials: { body: null, finishables: [], screen: { material: lensScreenMaterial }, glass: { material: frontGlass.material } } };
}

function createWatch(texture, finish, { style = "apple" } = {}) {
  if (style === "galaxy" || style === "pixel") return createRoundWatch(texture, finish, style);
  const palette = finishPalette[finish] || finishPalette.White;
  const group = new THREE.Group();
  const strapMaterial = physicalMaterial(0x252c2f, { roughness: 0.62, metalness: 0.08, clearcoat: 0.18 });
  for (const y of [-0.86, 0.86]) {
    const strap = roundedMesh(0.53, 0.94, 0.1, 0.15, strapMaterial, 7);
    strap.position.set(0, y, -0.16);
    group.add(strap);
  }
  const strapLoopMaterial = physicalMaterial(0x4d575a, { roughness: 0.34, metalness: 0.62 });
  for (const y of [-1.16, 1.16]) {
    const loop = roundedMesh(0.59, 0.08, 0.12, 0.03, strapLoopMaterial, 4);
    loop.position.set(0, y, -0.12);
    group.add(loop);
  }
  const body = roundedMesh(1.02, 1.14, 0.24, 0.23, physicalMaterial(palette.body, { roughness: 0.2, metalness: 0.82 }));
  group.add(body);
  const rearPanel = roundedMesh(0.86, 0.98, 0.05, 0.18, physicalMaterial(0x30383b, { roughness: 0.48, metalness: 0.28, clearcoat: 0.5 }));
  rearPanel.position.z = -0.145;
  group.add(rearPanel);
  const sensorHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.045, 48), new THREE.MeshPhysicalMaterial({ color: 0x13181a, roughness: 0.22, metalness: 0.48, clearcoat: 0.9 }));
  sensorHousing.rotation.x = Math.PI / 2;
  sensorHousing.position.set(0, 0, -0.185);
  group.add(sensorHousing);
  const sensorGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 48), new THREE.MeshPhysicalMaterial({ color: 0x1f4c51, roughness: 0.16, metalness: 0.32, clearcoat: 1, envMapIntensity: 0.62 }));
  sensorGlass.rotation.x = Math.PI / 2;
  sensorGlass.position.set(0, 0, -0.216);
  group.add(sensorGlass);
  const sensorLedMaterial = new THREE.MeshPhysicalMaterial({ color: 0x819fa0, roughness: 0.18, metalness: 0.12, clearcoat: 0.7 });
  for (const [x, y] of [[-0.27, 0.2], [0.27, 0.2], [-0.27, -0.2], [0.27, -0.2]]) {
    const led = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.025, 20), sensorLedMaterial);
    led.rotation.x = Math.PI / 2;
    led.position.set(x, y, -0.19);
    group.add(led);
  }
  const screen = addScreen(group, 0.83, 0.93, 0.095, texture, { z: 0.11 });
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.13, 24), physicalMaterial(palette.metal, { roughness: 0.2, metalness: 0.88 }));
  crown.rotation.z = Math.PI / 2;
  crown.position.set(0.57, 0.19, 0.02);
  group.add(crown);
  const crownGuard = roundedMesh(0.08, 0.2, 0.18, 0.03, physicalMaterial(palette.metal, { roughness: 0.25, metalness: 0.82 }), 4);
  crownGuard.position.set(0.53, 0.19, 0);
  group.add(crownGuard);
  const action = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 20), physicalMaterial(0xb36c37, { roughness: 0.3, metalness: 0.55 }));
  action.rotation.z = Math.PI / 2;
  action.position.set(0.56, -0.06, 0.01);
  group.add(action);
  return { group, materials: { body, finishables: [{ material: body.material, role: "body" }], screen: screen.screen, glass: screen.glass } };
}

// Round Samsung/Google watches. Their identity comes from the case transition
// and band attachment: Watch8 has a slim cushion chassis with a Dynamic Lug,
// while Pixel Watch 4 is an edgeless domed circle with an integrated band.
function createRoundWatch(texture, finish, style) {
  void finish;
  const isPixel = style === "pixel";
  const group = new THREE.Group();
  const caseRadius = isPixel ? 0.52 : 0.535;
  const caseHeight = isPixel ? 0.22 : 0.17;
  const faceZ = caseHeight / 2;
  const bandWidth = isPixel ? 0.385 : 0.43;
  const bandMaterial = physicalMaterial(isPixel ? 0x2a3032 : 0x202426, { roughness: 0.62, metalness: 0.06, clearcoat: 0.16 });
  const caseMaterial = physicalMaterial(isPixel ? 0xaeb7b9 : 0x32393b, { roughness: isPixel ? 0.16 : 0.28, metalness: 0.88, clearcoat: 0.68 });
  caseMaterial.userData.openmockFixedColor = true;

  // A continuous band with a slight backwards pitch reads as flexible
  // silicone from every preset without the toy-like grooves of stacked parts.
  for (const sign of [-1, 1]) {
    const connector = roundedMesh(isPixel ? 0.35 : 0.29, 0.19, 0.12, 0.055, isPixel ? bandMaterial : caseMaterial, 7);
    connector.position.set(0, sign * caseRadius * 0.88, -0.035);
    group.add(connector);
    const strap = roundedMesh(bandWidth, 0.93, 0.09, 0.062, bandMaterial, 9);
    strap.position.set(0, sign * (caseRadius + 0.43), -0.13);
    strap.rotation.x = -sign * THREE.MathUtils.degToRad(7);
    group.add(strap);
  }

  const body = isPixel
    ? new THREE.Mesh(new THREE.CylinderGeometry(caseRadius, caseRadius * 0.97, caseHeight, 72), caseMaterial)
    : roundedMesh(1.025, 1.025, caseHeight, 0.31, caseMaterial, 10);
  if (isPixel) body.rotation.x = Math.PI / 2;
  group.add(body);

  const sensorHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.038, 56), new THREE.MeshPhysicalMaterial({ color: 0x151a1c, roughness: 0.2, metalness: 0.42, clearcoat: 0.9 }));
  sensorHousing.rotation.x = Math.PI / 2;
  sensorHousing.position.z = -faceZ - 0.015;
  group.add(sensorHousing);
  const sensorGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.175, 0.03, 48), new THREE.MeshPhysicalMaterial({ color: 0x18383d, roughness: 0.14, metalness: 0.28, clearcoat: 1, envMapIntensity: 0.56 }));
  sensorGlass.rotation.x = Math.PI / 2;
  sensorGlass.position.z = -faceZ - 0.036;
  group.add(sensorGlass);
  const sensorLensMaterial = new THREE.MeshPhysicalMaterial({ color: 0x071013, roughness: 0.1, metalness: 0.3, clearcoat: 1, envMapIntensity: 0.62 });
  for (const [x, y, radius] of [[-0.08, 0.06, 0.033], [0.08, 0.06, 0.033], [-0.08, -0.06, 0.027], [0.08, -0.06, 0.027]]) {
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.02, 24), sensorLensMaterial);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(x, y, -faceZ - 0.055);
    group.add(lens);
  }

  const screenRadius = isPixel ? 0.505 : 0.455;
  if (!isPixel) {
    const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.478, 0.025, 16, 72), physicalMaterial(0x121517, { roughness: 0.28, metalness: 0.5, clearcoat: 0.55 }));
    bezel.position.z = faceZ + 0.004;
    group.add(bezel);
  }
  const screenMap = cloneTexture(texture, 1);
  const screen = new THREE.Mesh(new THREE.CircleGeometry(screenRadius, 72), new THREE.MeshBasicMaterial({ map: screenMap, color: 0xffffff, toneMapped: false }));
  screen.position.z = faceZ + 0.009;
  screen.userData.screenAspect = 1;
  group.add(screen);

  // A shallow hemisphere produces the Pixel's signature domed edge without
  // the opaque, mirror-like bubble that hid the display in the old mockup.
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: isPixel ? 0.055 : 0.04,
    roughness: 0.1,
    metalness: 0,
    transmission: 0.08,
    clearcoat: 1,
    clearcoatRoughness: 0.035,
    depthWrite: false,
  });
  glassMaterial.userData.openmockOpacityScale = 0.24;
  const glass = new THREE.Mesh(new THREE.SphereGeometry(screenRadius + 0.014, 72, 18, 0, Math.PI * 2, 0, Math.PI / 2), glassMaterial);
  glass.scale.y = isPixel ? 0.13 : 0.08;
  glass.rotation.x = Math.PI / 2;
  glass.position.z = faceZ + 0.008;
  glass.userData.screenAspect = 1;
  group.add(glass);

  if (isPixel) {
    const crownMaterial = physicalMaterial(0x9da7a9, { roughness: 0.2, metalness: 0.9, clearcoat: 0.7 });
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.073, 0.073, 0.095, 32), crownMaterial);
    crown.rotation.z = Math.PI / 2;
    crown.position.set(caseRadius + 0.035, 0.01, 0);
    group.add(crown);
    const sideButton = roundedMesh(0.065, 0.115, 0.085, 0.028, crownMaterial, 5);
    sideButton.position.set(caseRadius + 0.01, 0.17, -0.015);
    group.add(sideButton);
  } else {
    const buttonMaterial = physicalMaterial(0x646e70, { roughness: 0.25, metalness: 0.86, clearcoat: 0.6 });
    for (const y of [-0.135, 0.135]) {
      const button = roundedMesh(0.065, 0.17, 0.09, 0.03, buttonMaterial, 5);
      button.position.set(0.545, y, -0.005);
      group.add(button);
    }
    const speakerGrille = roundedMesh(0.035, 0.16, 0.018, 0.01, physicalMaterial(0x0e1112, { roughness: 0.5, metalness: 0.28 }), 3);
    speakerGrille.position.set(-0.537, 0, -0.005);
    group.add(speakerGrille);
  }

  return { group, materials: { body, finishables: [{ material: body.material, role: "body" }], screen: { material: screen.material }, glass: { material: glass.material } } };
}

// Desktop browser chrome: a flat window with a traffic-light toolbar and URL
// pill above the media panel. Chrome takes the finish accent, the body the
// finish color, so the finish picker still personalizes the frame.
function createBrowserWindow(texture, finish) {
  const palette = finishPalette[finish] || finishPalette.White;
  const group = new THREE.Group();
  const width = 2.66;
  const height = 1.74;
  const depth = 0.1;
  const windowBody = roundedMesh(width, height, depth, 0.07, physicalMaterial(palette.body, { roughness: 0.3, metalness: 0.4, clearcoat: 0.66 }));
  group.add(windowBody);
  const toolbar = roundedMesh(width * 0.955, height * 0.125, 0.024, 0.03, physicalMaterial(palette.accent, { roughness: 0.4, metalness: 0.16 }));
  toolbar.position.set(0, height * 0.4325, depth * 0.44);
  group.add(toolbar);
  const tabRow = roundedMesh(width * 0.955, height * 0.062, 0.02, 0.018, physicalMaterial(palette.body, { roughness: 0.46, metalness: 0.12 }));
  tabRow.position.set(0, height * 0.3395, depth * 0.46);
  group.add(tabRow);
  const dotColors = [0xec6a5e, 0xf4bf4f, 0x61c554];
  for (const [index, color] of dotColors.entries()) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.021, 18, 12), physicalMaterial(color, { roughness: 0.3, metalness: 0.05 }));
    dot.position.set(-width * 0.43 + index * 0.075, height * 0.4325, depth * 0.5);
    group.add(dot);
  }
  for (const x of [-width * 0.1, width * 0.16]) {
    const tab = roundedMesh(width * 0.24, height * 0.055, 0.016, 0.014, physicalMaterial(0xffffff, { roughness: 0.4, metalness: 0.03 }), 4);
    tab.position.set(x, height * 0.4325, depth * 0.5);
    group.add(tab);
  }
  const urlPill = roundedMesh(width * 0.82, height * 0.042, 0.014, 0.01, physicalMaterial(0xf6f7f7, { roughness: 0.42, metalness: 0.04 }));
  urlPill.position.set(0, height * 0.3395, depth * 0.52);
  group.add(urlPill);
  const screens = addScreen(group, width * 0.955, height * 0.66, depth, texture, { z: depth * 0.44 });
  screens.screen.position.y = screens.glass.position.y = screens.bezel.position.y = -height * 0.09;
  return {
    group,
    materials: {
      body: windowBody,
      finishables: [
        { material: windowBody.material, role: "body" },
        { material: toolbar.material, role: "accent" },
      ],
      screen: screens.screen,
      glass: screens.glass,
    },
  };
}

// Foldables. The Fold renders open like the real device: a near-square inner
// display with a vertical crease, a hinge spine along the left edge, and the
// Samsung camera column on the back-right. The Flip renders closed-tall with
// a horizontal crease and a cover-display window with cameras on the back.
function createFoldable(mockup, texture, finish) {
  const palette = finishPalette[finish] || finishPalette.White;
  const isFlip = mockup.includes("Flip");
  const width = isFlip ? 1.02 : 2.06;
  const height = isFlip ? 2.24 : 1.86;
  const depth = 0.13;
  const group = new THREE.Group();
  const body = roundedMesh(width, height, depth, isFlip ? 0.13 : 0.11, physicalMaterial(palette.metal, { roughness: 0.17, metalness: 0.9, clearcoat: 0.78 }));
  group.add(body);
  const backPanel = roundedMesh(width * 0.972, height * 0.976, 0.024, 0.1, physicalMaterial(palette.body, { roughness: 0.24, metalness: 0.16, clearcoat: 0.92, clearcoatRoughness: 0.045 }));
  backPanel.position.z = -depth / 2 - 0.009;
  group.add(backPanel);
  const screens = addScreen(group, width * 0.94, height * 0.94, depth, texture, { z: depth * 0.42 });
  const crease = roundedMesh(isFlip ? width * 0.9 : 0.014, isFlip ? 0.014 : height * 0.9, 0.006, 0.002, physicalMaterial(0x0b0d0e, { roughness: 0.22, metalness: 0.18 }), 3);
  crease.position.set(0, 0, depth * 0.42 + 0.048);
  group.add(crease);
  if (isFlip) {
    addFrontCameraDot(group, width * 0.15, height * 0.41, depth * 0.83, 0.022);
    const coverWindow = roundedMesh(width * 0.74, height * 0.3, 0.014, 0.05, physicalMaterial(0x0c0f11, { roughness: 0.1, metalness: 0.3, clearcoat: 1 }), 4);
    coverWindow.position.set(0, height * 0.28, -depth / 2 - 0.02);
    group.add(coverWindow);
  } else {
    const spine = new THREE.Mesh(new THREE.CylinderGeometry(depth * 0.52, depth * 0.52, height * 0.985, 28), physicalMaterial(palette.metal, { roughness: 0.24, metalness: 0.85 }));
    spine.position.set(-width / 2 + depth * 0.1, 0, 0);
    group.add(spine);
    addFrontCameraDot(group, width * 0.26, height * 0.42, depth * 0.83, 0.018);
  }
  const buttonMaterial = addPhoneButtons(group, width, height, depth, palette.metal, "galaxy");
  const cameraSystem = addBackCameraSystem(group, width, height, depth, "galaxy", palette);
  return {
    group,
    materials: {
      body,
      finishables: [
        { material: body.material, role: "metal" },
        { material: backPanel.material, role: "body" },
        { material: buttonMaterial, role: "metal" },
        ...(cameraSystem?.finishables || []),
      ],
      screen: screens.screen,
      glass: screens.glass,
    },
  };
}

// Gaming handhelds, modeled on the real hardware colorways. The Switch 2 is a
// thin black slate with detachable dark rails (blue/red inner accent lines),
// sticks and diamond button clusters; the Deck is an all-black body with
// integrated angled grips, dual trackpads, a d-pad, and diamond face buttons.
// Finish is intentionally not applied: these devices ship in fixed colorways.
function createHandheld(mockup, texture, finish) {
  void finish;
  const isDeck = mockup.includes("Steam");
  const group = new THREE.Group();
  const bodyMaterial = physicalMaterial(isDeck ? 0x17191b : 0x131517, { roughness: 0.44, metalness: 0.22, clearcoat: 0.38 });
  const railMaterial = physicalMaterial(isDeck ? 0x101215 : 0x282c2e, { roughness: 0.5, metalness: 0.16, clearcoat: 0.3 });
  const detailMaterial = physicalMaterial(0x0a0c0d, { roughness: 0.4, metalness: 0.34 });
  const capMaterial = physicalMaterial(0x1e2224, { roughness: 0.55, metalness: 0.18 });
  // Real overall proportions: Steam Deck is 298 x 117 x 49 mm; Switch 2 is
  // 272 x 116 x 13.9 mm, with a 7.9-inch display occupying most of the slate.
  const bodyWidth = isDeck ? 2.98 : 2.12;
  const bodyHeight = isDeck ? 1.17 : 1.12;
  const depth = isDeck ? 0.36 : 0.15;
  const body = roundedMesh(bodyWidth, bodyHeight, depth, isDeck ? 0.13 : 0.1, bodyMaterial);
  group.add(body);
  const screenWidth = bodyWidth * (isDeck ? 0.535 : 0.825);
  const screenHeight = isDeck ? screenWidth / 1.6 : screenWidth / (16 / 9);
  const screens = addScreen(group, screenWidth, screenHeight, depth * 0.7, texture, { z: depth * 0.52 });
  const accentMaterial = (side) => physicalMaterial(side < 0 ? 0x00b8c8 : 0xff2d55, { roughness: 0.42, metalness: 0.1 });
  const stick = (x, y, ringColor = null) => {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.115, 0.045, 28), detailMaterial);
    base.rotation.x = Math.PI / 2;
    base.position.set(x, y, depth * 0.52);
    group.add(base);
    if (ringColor !== null) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.012, 12, 36), physicalMaterial(ringColor, { roughness: 0.4, metalness: 0.12 }));
      ring.position.set(x, y, depth * 0.55);
      group.add(ring);
    }
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.07, 24, 16), capMaterial);
    cap.scale.z = 0.6;
    cap.position.set(x, y, depth * 0.58);
    group.add(cap);
  };
  const roundButton = (x, y, radius = 0.042) => {
    const button = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.035, 20), detailMaterial);
    button.rotation.x = Math.PI / 2;
    button.position.set(x, y, depth * 0.52);
    group.add(button);
  };
  const rearButton = (x, y, radius = 0.038) => {
    const button = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.028, 20), detailMaterial);
    button.rotation.x = Math.PI / 2;
    button.position.set(x, y, -depth * 0.54);
    group.add(button);
  };
  if (isDeck) {
    const gripMaterial = physicalMaterial(0x111316, { roughness: 0.58, metalness: 0.14, clearcoat: 0.24 });
    for (const side of [-1, 1]) {
      const grip = roundedMesh(0.62, 1.16, 0.5, 0.2, gripMaterial);
      grip.position.set(side * bodyWidth * 0.4, -bodyHeight * 0.25, -0.06);
      grip.rotation.x = -0.42;
      grip.rotation.z = side * 0.14;
      group.add(grip);
      const trigger = roundedMesh(0.4, 0.07, 0.16, 0.03, detailMaterial, 3);
      trigger.position.set(side * bodyWidth * 0.4, bodyHeight * 0.52, -0.04);
      group.add(trigger);
      stick(side * bodyWidth * 0.37, bodyHeight * 0.27);
      roundButton(side * bodyWidth * 0.37, -bodyHeight * 0.02, 0.052);
      const trackpad = roundedMesh(0.345, 0.335, 0.022, 0.046, physicalMaterial(0x0d0f11, { roughness: 0.24, metalness: 0.2, clearcoat: 0.9 }));
      trackpad.position.set(side * bodyWidth * 0.285, -bodyHeight * 0.31, depth * 0.5);
      group.add(trackpad);
    }
    const dpadX = roundedMesh(0.24, 0.07, 0.03, 0.014, detailMaterial, 3);
    dpadX.position.set(-bodyWidth * 0.31, -bodyHeight * 0.1, depth * 0.52);
    group.add(dpadX);
    const dpadY = roundedMesh(0.07, 0.24, 0.03, 0.014, detailMaterial, 3);
    dpadY.position.set(-bodyWidth * 0.31, -bodyHeight * 0.1, depth * 0.52);
    group.add(dpadY);
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      roundButton(bodyWidth * 0.31 + dx * 0.075, bodyHeight * 0.27 + dy * 0.075, 0.045);
    }
    for (const x of [-screenWidth * 0.42, screenWidth * 0.42]) {
      const speaker = roundedMesh(0.06, 0.22, 0.012, 0.028, physicalMaterial(0x0b0d0f, { roughness: 0.5, metalness: 0.2 }), 3);
      speaker.position.set(x, 0, depth * 0.5);
      group.add(speaker);
    }
  } else {
    const railWidth = 0.29;
    for (const side of [-1, 1]) {
      const rail = roundedMesh(railWidth, bodyHeight * 1.03, depth * 1.12, railWidth * 0.42, railMaterial);
      rail.position.set(side * (bodyWidth / 2 + railWidth * 0.46), 0, 0);
      group.add(rail);
      const accent = roundedMesh(0.018, bodyHeight * 0.92, depth * 0.9, 0.008, accentMaterial(side), 3);
      accent.position.set(side * (bodyWidth / 2 - 0.012), 0, 0);
      group.add(accent);
      const trigger = roundedMesh(railWidth * 0.9, 0.06, 0.14, 0.026, detailMaterial, 3);
      trigger.position.set(side * (bodyWidth / 2 + railWidth * 0.46), bodyHeight * 0.52, 0);
      group.add(trigger);
      const railX = side * (bodyWidth / 2 + railWidth * 0.46);
      if (side < 0) {
        stick(railX, bodyHeight * 0.21);
        roundButton(railX + 0.058, -bodyHeight * 0.08, 0.036);
        roundButton(railX - 0.058, -bodyHeight * 0.08, 0.036);
        roundButton(railX, -bodyHeight * 0.08 + 0.058, 0.036);
        roundButton(railX, -bodyHeight * 0.08 - 0.058, 0.036);
        roundButton(railX, bodyHeight * 0.42, 0.026);
      } else {
        for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
          roundButton(railX + dx * 0.064, bodyHeight * 0.24 + dy * 0.064, 0.044);
        }
        stick(railX, -bodyHeight * 0.12);
        roundButton(railX + 0.045, -bodyHeight * 0.34, 0.026);
        roundButton(railX - 0.045, -bodyHeight * 0.34, 0.026);
      }
    }
  }
  if (isDeck) {
    // Steam Deck's rear shell has a broad exhaust near the top and four rear
    // grip buttons, which become visible when the editor is turned to Back.
    const ventMaterial = physicalMaterial(0x090b0c, { roughness: 0.58, metalness: 0.18 });
    for (let index = -3; index <= 3; index += 1) {
      const vent = roundedMesh(0.07, 0.035, 0.014, 0.014, ventMaterial, 3);
      vent.position.set(index * 0.085, bodyHeight * 0.34, -depth * 0.54);
      group.add(vent);
    }
    for (const side of [-1, 1]) {
      rearButton(side * bodyWidth * 0.36, bodyHeight * 0.02, 0.034);
      rearButton(side * bodyWidth * 0.36, -bodyHeight * 0.2, 0.034);
    }
  } else {
    // Switch 2's wide U-shaped kickstand spans most of the tablet rear.
    const kickstand = roundedMesh(bodyWidth * 0.9, bodyHeight * 0.41, 0.026, 0.035, physicalMaterial(0x202426, { roughness: 0.46, metalness: 0.28 }), 6);
    kickstand.position.set(0, -bodyHeight * 0.17, -depth * 0.58);
    group.add(kickstand);
    const kickstandHinge = roundedMesh(bodyWidth * 0.82, 0.035, 0.02, 0.014, detailMaterial, 3);
    kickstandHinge.position.set(0, bodyHeight * 0.035, -depth * 0.6);
    group.add(kickstandHinge);
    const rearVent = roundedMesh(bodyWidth * 0.28, 0.05, 0.014, 0.018, detailMaterial, 3);
    rearVent.position.set(0, bodyHeight * 0.38, -depth * 0.54);
    group.add(rearVent);
  }
  return { group, materials: { body: null, finishables: [], screen: screens.screen, glass: screens.glass } };
}

// Kindle Paperwhite: dark charcoal polyurethane body, black glass front with
// a flush matte screen, power button on the top edge. Fixed colorway — real
// units are black, so the finish picker deliberately has no effect here.
function createEreader(texture, finish) {
  void finish;
  const group = new THREE.Group();
  const width = 1.16;
  const height = 1.62;
  const depth = 0.09;
  const body = roundedMesh(width, height, depth, 0.055, physicalMaterial(0x1f2224, { roughness: 0.68, metalness: 0.06, clearcoat: 0.14 }));
  group.add(body);
  const screens = addScreen(group, width * 0.9, height * 0.84, depth, texture, { z: depth * 0.42 });
  screens.screen.position.y = screens.glass.position.y = screens.bezel.position.y = height * 0.06;
  const power = roundedMesh(0.16, 0.03, 0.02, 0.012, physicalMaterial(0x101213, { roughness: 0.55, metalness: 0.15 }), 3);
  power.position.set(width * 0.26, height * 0.5, 0);
  group.add(power);
  return {
    group,
    materials: { body: null, finishables: [], screen: screens.screen, glass: screens.glass },
  };
}

function createProceduralDevice(mockup, texture, finish) {
  switch (deviceArchetype(mockup)) {
    case "flat": return createFlatDisplay(texture);
    case "browser": return createBrowserWindow(texture, finish);
    case "tv": return createDisplay(texture, finish, "tv");
    case "headset": return createVisionPro(texture, finish);
    case "watch": return createWatch(texture, finish, isAndroidMockup(mockup) ? { style: mockup.startsWith("Pixel") ? "pixel" : "galaxy" } : {});
    case "foldable": return createFoldable(mockup, texture, finish);
    case "handheld": return createHandheld(mockup, texture, finish);
    case "ereader": return createEreader(texture, finish);
    case "tablet": return createTablet(mockup, texture, finish);
    case "laptop": return createLaptop(mockup, texture, finish);
    case "display":
      if (mockup === "iMac 24\"") return createDisplay(texture, finish, "imac");
      if (mockup === "Studio Display") return createDisplay(texture, finish, "studio");
      return createDisplay(texture, finish);
    default: return createPhone(mockup, texture, finish);
  }
}

function meshCount(object) {
  let count = 0;
  object.traverse((child) => { if (child.isMesh) count += 1; });
  return count;
}

function isolateIPhoneProVariant(scene, variant) {
  scene.updateMatrixWorld(true);
  const candidates = [];
  const visit = (object, depth = 0) => {
    if (object.children.length) {
      const size = new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
      const count = meshCount(object);
      if (count > 30 && size.x > 0.065 && size.x < 0.09 && size.y > 0.14 && size.y < 0.18 && size.z > 0.009 && size.z < 0.02) {
        candidates.push({ object, depth, size, count });
      }
    }
    object.children.forEach((child) => visit(child, depth + 1));
  };
  visit(scene);
  if (!candidates.length) return scene;

  const byVariant = new Map();
  candidates.forEach((candidate) => {
    const key = Math.round(candidate.size.y * 10000);
    const current = byVariant.get(key);
    if (!current || candidate.depth > current.depth) byVariant.set(key, candidate);
  });
  const variants = [...byVariant.values()].sort((a, b) => a.size.y - b.size.y);
  const chosen = variant === "pro-max" ? variants.at(-1) : variants[0];
  if (!chosen?.object) return scene;

  scene.attach(chosen.object);
  // Color variants ship as overlapping full phones. Drop every other candidate
  // slab (nested ones included) so only one body remains.
  candidates.forEach((candidate) => {
    if (candidate.object === chosen.object) return;
    let parent = candidate.object.parent;
    candidate.object.removeFromParent();
    while (parent && parent !== scene && parent.children.length === 0) {
      const next = parent.parent;
      parent.removeFromParent();
      parent = next;
    }
  });
  [...scene.children].forEach((child) => {
    if (child !== chosen.object) scene.remove(child);
  });
  return scene;
}

function findExactScreen(model, asset) {
  let screen = null;
  model.traverse((object) => {
    if (screen || !object.isMesh) return;
    const hasName = asset.screenNames?.includes(object.name);
    const hasRole = asset.screenRole && (object.userData?.openmockRole === asset.screenRole || Object.values(object.userData || {}).includes(asset.screenRole));
    if (hasName || hasRole) screen = object;
  });
  return screen;
}

function roundedPlaneGeometry(width, height, radius = 0) {
  if (!radius) return new THREE.PlaneGeometry(width, height);
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const safeRadius = Math.min(radius, halfWidth, halfHeight);
  const shape = new THREE.Shape();
  shape.moveTo(-halfWidth + safeRadius, -halfHeight);
  shape.lineTo(halfWidth - safeRadius, -halfHeight);
  shape.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + safeRadius);
  shape.lineTo(halfWidth, halfHeight - safeRadius);
  shape.quadraticCurveTo(halfWidth, halfHeight, halfWidth - safeRadius, halfHeight);
  shape.lineTo(-halfWidth + safeRadius, halfHeight);
  shape.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - safeRadius);
  shape.lineTo(-halfWidth, -halfHeight + safeRadius);
  shape.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + safeRadius, -halfHeight);
  const geometry = new THREE.ShapeGeometry(shape, 10);
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let index = 0; index < position.count; index += 1) {
    uv.setXY(index, (position.getX(index) + halfWidth) / width, (position.getY(index) + halfHeight) / height);
  }
  uv.needsUpdate = true;
  return geometry;
}

function addExactScreenOverlay(model, overlay, texture, screenAspect) {
  const screenMap = cloneTexture(texture, screenAspect);
  const material = new THREE.MeshBasicMaterial({
    map: screenMap,
    color: 0xffffff,
    toneMapped: false,
    side: THREE.FrontSide,
  });
  const screen = new THREE.Mesh(roundedPlaneGeometry(overlay.width, overlay.height, overlay.radius), material);
  screen.position.fromArray(overlay.position);
  screen.rotation.fromArray(overlay.rotation);
  if (overlay.facing === -1) screen.rotation.y += Math.PI;
  if (overlay.flipU) {
    // A quad viewed from its backside shows horizontally mirrored media. The
    // Pixel panel is authored facing away from the camera, so pre-mirror the
    // overlay's own UVs and let the backface view cancel the flip.
    const uv = screen.geometry.attributes.uv;
    for (let index = 0; index < uv.count; index += 1) uv.setX(index, 1 - uv.getX(index));
    uv.needsUpdate = true;
  }
  screen.userData.screenAspect = screenAspect;
  screen.userData.openmockScreen = true;
  screen.userData.openmockOverlay = true;
  model.add(screen);
  return screen;
}

function overlayBoundsOnMesh(model, meshName, inset = 0.995) {
  // Place a media quad exactly over one of the model's own surfaces. Some
  // manufacturer display meshes fight direct texture binding (stacked variant
  // slabs, layered panels), so the mesh is hidden and replaced by a clean
  // overlay at its measured footprint.
  let target = null;
  model.traverse((object) => {
    if (!target && object.isMesh && object.name === meshName) target = object;
  });
  if (!target) return null;
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(target).applyMatrix4(new THREE.Matrix4().copy(model.matrixWorld).invert());
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  target.visible = false;
  return {
    width: size.x * inset,
    height: size.y * inset,
    position: [center.x, center.y, box.max.z + 0.0004],
    rotation: [0, 0, 0],
    radius: Math.min(size.x, size.y) * 0.045,
  };
}

function alignScreenUvToWorld(screen) {
  // Manufacturer display meshes mix UV conventions (v-up, v-down, mirrored
  // node transforms, atlas sub-ranges). Rather than rebuilding UVs from world
  // position — which glitches skinned or layered panels — detect how the
  // existing UV axes relate to the panel's world axes and only correct
  // direction and range. Requires flipY=false: v must end up growing downward
  // from the panel top (v=0 samples the top row of the media).
  const geometry = screen.geometry;
  const uv = geometry.attributes.uv;
  const position = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  if (!uv || !position || !normal) return;
  screen.updateWorldMatrix(true, false);
  const matrixWorld = screen.matrixWorld;
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrixWorld);
  const count = position.count;
  const facing = new Uint8Array(count);
  const worldX = new Float32Array(count);
  const worldY = new Float32Array(count);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const faceNormal = new THREE.Vector3();
  const triCount = geometry.index ? geometry.index.count / 3 : count / 3;
  const readTri = (i0, i1, i2, zSigns) => {
    a.fromBufferAttribute(position, i0).applyMatrix4(matrixWorld);
    b.fromBufferAttribute(position, i1).applyMatrix4(matrixWorld);
    c.fromBufferAttribute(position, i2).applyMatrix4(matrixWorld);
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    faceNormal.crossVectors(ab, ac).applyMatrix3(normalMatrix);
    zSigns.push(faceNormal.z);
  };
  const zSigns = [];
  if (geometry.index) {
    const index = geometry.index;
    for (let i = 0; i < index.count; i += 3) readTri(index.getX(i), index.getX(i + 1), index.getX(i + 2), zSigns);
  } else {
    for (let i = 0; i < count; i += 3) readTri(i, i + 1, i + 2, zSigns);
  }
  // The display surface may be authored with normals pointing away from the
  // camera (mirrored node transforms). Pick the dominant normal direction by
  // total area so the visible panel gets rewritten, not a hidden layer.
  let positiveArea = 0;
  for (const z of zSigns) positiveArea += z;
  const dominantSign = positiveArea >= 0 ? 1 : -1;
  const markTriangle = (i0, i1, i2, triIndex) => {
    if (Math.sign(zSigns[triIndex]) !== dominantSign) return;
    facing[i0] = 1;
    facing[i1] = 1;
    facing[i2] = 1;
  };
  if (geometry.index) {
    const index = geometry.index;
    for (let i = 0, t = 0; i < index.count; i += 3, t += 1) markTriangle(index.getX(i), index.getX(i + 1), index.getX(i + 2), t);
  } else {
    for (let i = 0, t = 0; i < count; i += 3, t += 1) markTriangle(i, i + 1, i + 2, t);
  }
  let marked = 0;
  let sumU = 0;
  let sumV = 0;
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < count; i += 1) {
    if (!facing[i]) continue;
    marked += 1;
    a.fromBufferAttribute(position, i).applyMatrix4(matrixWorld);
    worldX[i] = a.x;
    worldY[i] = a.y;
    sumU += uv.getX(i);
    sumV += uv.getY(i);
    sumX += a.x;
    sumY += a.y;
  }
  if (marked < 3) return;
  const meanU = sumU / marked;
  const meanV = sumV / marked;
  const meanX = sumX / marked;
  const meanY = sumY / marked;
  let cux = 0;
  let cuy = 0;
  let cvx = 0;
  let cvy = 0;
  for (let i = 0; i < count; i += 1) {
    if (!facing[i]) continue;
    const du = uv.getX(i) - meanU;
    const dv = uv.getY(i) - meanV;
    cux += du * (worldX[i] - meanX);
    cuy += du * (worldY[i] - meanY);
    cvx += dv * (worldX[i] - meanX);
    cvy += dv * (worldY[i] - meanY);
  }
  const swaps = Math.abs(cuy) > Math.abs(cux);
  // u must grow rightward (with world X); v must grow downward from the panel
  // top because flipY=false puts the media's top row at v=0.
  const flipU = swaps ? cvy < 0 : cux < 0;
  const flipV = swaps ? cvx < 0 : cvy < 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < count; i += 1) {
    if (!facing[i]) continue;
    let u = uv.getX(i);
    let v = uv.getY(i);
    if (swaps) {
      const temp = u;
      u = v;
      v = temp;
    }
    if (flipU) u = -u;
    if (flipV) v = -v;
    uv.setXY(i, u, v);
    minX = Math.min(minX, u);
    maxX = Math.max(maxX, u);
    minY = Math.min(minY, v);
    maxY = Math.max(maxY, v);
  }
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  if (spanX <= 1e-5 || spanY <= 1e-5) return;
  for (let i = 0; i < count; i += 1) {
    if (!facing[i]) continue;
    uv.setXY(i, (uv.getX(i) - minX) / spanX, (uv.getY(i) - minY) / spanY);
  }
  uv.needsUpdate = true;
}

function bindExactScreen(model, asset, screenTexture) {
  let overlay = asset.screenOverlay;
  if (asset.overlayOnMesh) overlay = overlayBoundsOnMesh(model, asset.overlayOnMesh) || overlay;
  let screen = asset.forceOverlay ? null : findExactScreen(model, asset);
  if (!screen && overlay) {
    screen = addExactScreenOverlay(model, overlay, screenTexture, asset.screenAspect);
  }
  if (!screen || !screenTexture) return screen;

  // Overlay quads carry bottom-left-origin UVs and need a flipped upload.
  // Bound manufacturer meshes keep the loader's upload convention (native
  // screen UVs) or get their UVs rewritten from world space in
  // prepareExactDevice, which expects an unflipped upload.
  screenTexture.flipY = Boolean(asset.forceOverlay || asset.nativeScreenUv);
  // Texture rotation happens around the center so flipped mappings stay in
  // the 0-1 range; fitScreenTextures no longer resets this.
  screenTexture.center.set(0.5, 0.5);
  screenTexture.rotation = asset.textureRotation || 0;
  const textureRotation = asset.textureRotation || 0;
  screenTexture.userData = {
    ...(screenTexture.userData || {}),
    quarterTurn: Math.abs(Math.abs(textureRotation) - Math.PI / 2) < 0.1,
  };
  screenTexture.needsUpdate = true;
  const screenMaterial = new THREE.MeshBasicMaterial({
    map: screenTexture,
    color: 0xffffff,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
  screen.material = screenMaterial;
  screen.userData.screenAspect = asset.screenAspect;
  screen.userData.openmockScreen = true;
  return screen;
}

function faceSlabTowardCamera(model, screen) {
  if (!screen) return;
  model.updateMatrixWorld(true);
  const modelCenter = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
  const screenCenter = new THREE.Box3().setFromObject(screen).getCenter(new THREE.Vector3());
  if (screenCenter.z < modelCenter.z) {
    model.rotation.y += Math.PI;
    // An overlay quad would face away from the camera after the flip and show
    // mirrored media through its backside, so turn it around with the model.
    if (screen.userData?.openmockOverlay) screen.rotation.y += Math.PI;
  }
}

function markDisplayStand(model, screen) {
  if (!screen) return;
  model.updateMatrixWorld(true);
  const modelSize = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
  const screenBounds = new THREE.Box3().setFromObject(screen);
  const cutoff = screenBounds.min.y - modelSize.y * 0.025;
  const belowScreen = screenBounds.min.y + modelSize.y * 0.05;
  model.traverse((object) => {
    if (!object.isMesh || object === screen) return;
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    if (center.y < cutoff || box.max.y < belowScreen) object.userData.openmockRole = "standMetal";
  });
}

function swapExplicitStandMaterial(model, names = []) {
  // Some manufacturer displays merge the stand into whole-assembly meshes, so
  // position-based stand marking cannot reach it. Those meshes get a
  // dedicated stainless material that the finish picker can still retint.
  if (!names.length) return;
  model.traverse((object) => {
    if (!object.isMesh || !names.includes(object.name)) return;
    object.material = new THREE.MeshStandardMaterial({ color: 0xbac1c4, metalness: 0.72, roughness: 0.26, envMapIntensity: 0.65 });
    object.userData.openmockRole = "standMetal";
  });
}

function stripBelowRatio(model, ratio) {
  // Some Apple AR assets bundle desk accessories (iPad Pro ships on a Magic
  // Keyboard). Detach meshes anchored below the given fraction of the height
  // so the mockup shows the bare device.
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  const cutoff = bounds.min.y + ratio * (bounds.max.y - bounds.min.y);
  const removed = [];
  model.traverse((object) => {
    if (!object.isMesh) return;
    const box = new THREE.Box3().setFromObject(object);
    if (box.max.y < cutoff) removed.push(object);
  });
  removed.forEach((object) => {
    let parent = object.parent;
    object.removeFromParent();
    while (parent && parent !== model && parent.children.length === 0) {
      const next = parent.parent;
      parent.removeFromParent();
      parent = next;
    }
  });
}

function stripBrokenAOMaps(model) {
  // Manufacturer USDZ files reference a second UV set the converted geometry
  // does not carry, so the ambient-occlusion channel samples garbage texels
  // and every surface it touches renders as structured noise.
  model.traverse((object) => {
    if (!object.isMesh || !object.material) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      if (material.aoMap) {
        material.aoMap = null;
        material.needsUpdate = true;
      }
    });
  });
}

function removeNamedSubtrees(model, names = []) {
  if (!names.length) return;
  const removed = [];
  model.traverse((object) => {
    if (names.includes(object.name)) removed.push(object);
  });
  removed.forEach((object) => {
    let parent = object.parent;
    object.removeFromParent();
    while (parent && parent !== model && parent.children.length === 0) {
      const next = parent.parent;
      parent.removeFromParent();
      parent = next;
    }
  });
}

function hideNamedMeshes(model, names = []) {
  if (!names.length) return;
  model.traverse((object) => {
    if (object.isMesh && names.includes(object.name)) object.visible = false;
  });
}

function uprightScreenToCamera(model, screen) {
  // AR product assets are often posed reclined for viewing. Rotate the model
  // about X so the display's normal points at the camera while keeping the
  // hardware's own yaw and roll.
  if (!screen?.geometry?.attributes.normal) return;
  model.updateMatrixWorld(true);
  const normal = new THREE.Vector3();
  const worldQuat = new THREE.Quaternion();
  screen.matrixWorld.decompose(new THREE.Vector3(), worldQuat, new THREE.Vector3());
  const middle = Math.floor(screen.geometry.attributes.normal.count / 2);
  normal.fromBufferAttribute(screen.geometry.attributes.normal, middle).applyQuaternion(worldQuat).normalize();
  if (normal.z < 0) normal.multiplyScalar(-1);
  model.rotation.x += Math.atan2(normal.y, normal.z);
  model.updateMatrixWorld(true);
}

function flipScreenV(screen) {
  // After alignScreenUvToWorld normalizes the display UVs, some source meshes
  // still render vertically mirrored media. Flipping v about the panel turns
  // that into the upright orientation without touching the cover crop.
  if (!screen?.geometry?.attributes.uv) return;
  const uv = screen.geometry.attributes.uv;
  for (let index = 0; index < uv.count; index += 1) uv.setY(index, 1 - uv.getY(index));
  uv.needsUpdate = true;
}

// Companion to flipScreenV for meshes whose UVs store the screen mirrored
// horizontally (the Z Flip's inner display does).
function flipScreenU(screen) {
  if (!screen?.geometry?.attributes.uv) return;
  const uv = screen.geometry.attributes.uv;
  for (let index = 0; index < uv.count; index += 1) uv.setX(index, 1 - uv.getX(index));
  uv.needsUpdate = true;
}

function prepareExactDevice(model, mockup, asset, screenTexture) {
  let prepared = model;
  if (asset.variant) prepared = isolateIPhoneProVariant(prepared, asset.variant);
  stripBrokenAOMaps(prepared);
  removeNamedSubtrees(prepared, asset.removeSubtrees);
  if (asset.stripBelow) stripBelowRatio(prepared, asset.stripBelow);
  if (asset.shapeRotateZ) {
    prepared.rotation.z += asset.shapeRotateZ;
    prepared.updateMatrixWorld(true);
  }
  if (asset.shapeRotateY) {
    prepared.rotation.y += asset.shapeRotateY;
    prepared.updateMatrixWorld(true);
  }
  if (asset.shapeScale) prepared.scale.multiply(new THREE.Vector3().fromArray(asset.shapeScale));
  if (asset.yawFlip) prepared.rotation.y += Math.PI;
  hideNamedMeshes(prepared, asset.hideMeshes);
  let screen = bindExactScreen(prepared, asset, screenTexture);
  if (asset.uprightScreen) uprightScreenToCamera(prepared, screen);
  if (asset.slab) faceSlabTowardCamera(prepared, screen);
  if (asset.flipU) flipScreenU(screen);
  if (asset.flipV) flipScreenV(screen);
  if (screen && !asset.forceOverlay && !asset.nativeScreenUv) {
    alignScreenUvToWorld(screen);
    if (asset.screenFlipV) flipScreenV(screen);
  }
  if (asset.standFinish) markDisplayStand(prepared, screen);
  if (asset.standMeshes) swapExplicitStandMaterial(prepared, asset.standMeshes);
  prepared.userData.openmockSource = "manufacturer";
  prepared.userData.openmockMockup = mockup;
  return prepared;
}

// Bounds over meshes that are actually rendered: manufacturer assets can
// carry hidden variant slabs or helper geometry that Box3.setFromObject would
// otherwise count, which would silently de-center the visible device.
function visibleMeshBounds(object, target = new THREE.Box3()) {
  target.makeEmpty();
  object.updateWorldMatrix(true, true);
  const isOpaqueMesh = (node) => {
    if (!node.isMesh || !node.material) return false;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    return materials.some((material) => material.visible !== false && material.opacity !== 0 && !material.isShadowMaterial);
  };
  const walk = (node) => {
    if (!node.visible) return;
    if (isOpaqueMesh(node)) target.expandByObject(node);
    for (const child of node.children) walk(child);
  };
  walk(object);
  if (target.isEmpty()) target.setFromObject(object);
  return target;
}

function normalizeObject(object, target = 2.22) {
  const box = visibleMeshBounds(object);
  const size = box.getSize(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z) || 1;
  object.scale.multiplyScalar(target / maxDimension);
  object.updateMatrixWorld(true);
  const center = visibleMeshBounds(object).getCenter(new THREE.Vector3());
  object.position.sub(center);
}

function placeGround(ground, object) {
  if (!ground || !object) return;
  object.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(object);
  if (Number.isFinite(bounds.min.y)) ground.position.y = bounds.min.y - 0.012;
}

// Keeps the posed device centered and fully inside the frame: the projected
// footprint of the rotated model must fit the reference frustum with even
// breathing room, so orbiting, rolling, or a short stage never crop the device.
// The reference frustum ignores the live zoom/FOV on purpose — those sliders
// must keep their framing effect (zooming past the fit is the requested crop).
// Pan stays a deliberate user offset and is applied after the centering.
function refitStage(runtime, panX = 0, panY = 0) {
  const { model, root, camera, modelHalf } = runtime;
  if (!model || !modelHalf) return;
  const quaternion = root.quaternion;
  const ax = new THREE.Vector3(modelHalf.x, 0, 0).applyQuaternion(quaternion);
  const ay = new THREE.Vector3(0, modelHalf.y, 0).applyQuaternion(quaternion);
  const az = new THREE.Vector3(0, 0, modelHalf.z).applyQuaternion(quaternion);
  const extentX = Math.abs(ax.x) + Math.abs(ay.x) + Math.abs(az.x);
  const extentY = Math.abs(ax.y) + Math.abs(ay.y) + Math.abs(az.y);
  const refHalfH = Math.tan(THREE.MathUtils.degToRad(24) / 2) * Math.max(0.5, camera.position.z);
  const refHalfW = refHalfH * Math.max(0.2, camera.aspect || 1);
  // extentX/extentY are already half-heights of the rotated box (computed
  // from the model's half extents), so they compare against refHalf directly.
  const fit = Math.min(
    1,
    (0.85 * refHalfH) / Math.max(1e-3, extentY),
    (0.85 * refHalfW) / Math.max(1e-3, extentX),
  );
  root.scale.setScalar(Math.max(0.25, fit));
  // Perspective makes the rotated device's on-screen bounds asymmetric, so
  // centering the world-space box is not enough — project the scaled box and
  // nudge the root until the projected bounds are centered. Pan is a
  // deliberate user offset and is applied on top of the correction.
  camera.updateMatrixWorld();
  const corner = new THREE.Vector3();
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let index = 0; index < 8; index += 1) {
    corner.set(
      (index & 1 ? modelHalf.x : -modelHalf.x) * fit,
      (index & 2 ? modelHalf.y : -modelHalf.y) * fit,
      (index & 4 ? modelHalf.z : -modelHalf.z) * fit,
    ).applyQuaternion(quaternion).project(camera);
    minX = Math.min(minX, corner.x); maxX = Math.max(maxX, corner.x);
    minY = Math.min(minY, corner.y); maxY = Math.max(maxY, corner.y);
  }
  const halfHWorldLive = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.position.z / Math.max(0.05, camera.zoom);
  root.position.x = panX * 0.5 - ((minX + maxX) / 2) * halfHWorldLive * Math.max(0.2, camera.aspect || 1);
  root.position.y = -panY * 0.5 - ((minY + maxY) / 2) * halfHWorldLive;
  runtime.renderer.domElement.dataset.openmockFit = fit.toFixed(3);
}

function enableModelShadows(object) {
  object.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });
}

function fitTarget(mockup) {
  const arch = deviceArchetype(mockup);
  if (arch === "flat") return 1.82;
  if (arch === "browser") return 1.78;
  if (arch === "watch") return 1.48;
  if (arch === "tablet") {
    if (mockup === "iPad mini") return 1.58;
    if (mockup === "Galaxy Tab S11 Ultra") return 1.52;
    return 1.5;
  }
  if (arch === "display") return 1.22;
  if (arch === "tv") return 1.5;
  if (arch === "headset") return 1.55;
  if (arch === "laptop") {
    if (mockup === "Surface Laptop 15\"" || mockup === "Dell XPS 16") return 1.42;
    return 1.26;
  }
  if (arch === "foldable") return mockup.includes("Flip") ? 1.55 : 1.7;
  if (arch === "handheld") return 2.1;
  if (arch === "ereader") return 1.66;
  return 1.55;
}

function loadScreenTexture(media, disposables) {
  const source = media?.src || starterUrl;
  if (media?.type?.startsWith("video/")) {
    const video = document.createElement("video");
    video.src = source;
    video.muted = true;
    video.loop = true;
    video.autoplay = true;
    video.playsInline = true;
    video.play().catch(() => {});
    const texture = new THREE.VideoTexture(video);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    disposables.push(() => { video.pause(); video.removeAttribute("src"); video.load(); texture.dispose(); });
    return texture;
  }
  const texture = new THREE.TextureLoader().load(source);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  disposables.push(() => texture.dispose());
  return texture;
}

async function loadExactModel(asset, renderer, runtime) {
  if (asset.type === "usd") {
    const loader = new USDLoader();
    return loader.loadAsync(asset.url);
  }

  const ktx2Loader = new KTX2Loader().setTranscoderPath(localAssetUrl("basis/"));
  const dracoLoader = new DRACOLoader().setDecoderPath(localAssetUrl("draco/"));
  ktx2Loader.detectSupport(renderer);
  runtime.ktx2Loader = ktx2Loader;
  runtime.dracoLoader = dracoLoader;
  const loader = new GLTFLoader()
    .setKTX2Loader(ktx2Loader)
    .setDRACOLoader(dracoLoader)
    .setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(asset.url);
  return gltf.scene;
}

function fitScreenTextures(object) {
  if (!object) return;
  object.traverse((child) => {
    if (!child.isMesh || !child.userData?.screenAspect || !child.material?.map) return;
    const map = child.material.map;
    const image = map.image;
    const imageWidth = image?.videoWidth || image?.naturalWidth || image?.width;
    const imageHeight = image?.videoHeight || image?.naturalHeight || image?.height;
    if (!imageWidth || !imageHeight) return;
    const sourceAspect = map.userData?.quarterTurn ? imageHeight / imageWidth : imageWidth / imageHeight;
    const targetAspect = Number(child.userData.screenAspect) || sourceAspect;
    const signature = `${sourceAspect.toFixed(4)}:${targetAspect.toFixed(4)}`;
    if (map.userData?.coverSignature === signature) return;
    // A quarter-turned texture scales the displayed horizontal axis through
    // the v axis (and vice versa), so the cover-crop axes swap with it. The
    // offsets account for the texture's rotation center so the crop window
    // stays centered on the media.
    const rotated = Boolean(map.userData?.quarterTurn);
    const centerX = map.center.x;
    const centerY = map.center.y;
    if (sourceAspect > targetAspect) {
      const visibleWidth = targetAspect / sourceAspect;
      if (rotated) {
        map.repeat.set(1, visibleWidth);
        map.offset.set(0, (1 - visibleWidth) * (0.5 - centerY));
      } else {
        map.repeat.set(visibleWidth, 1);
        map.offset.set((1 - visibleWidth) * (0.5 - centerX), 0);
      }
    } else {
      const visibleHeight = sourceAspect / targetAspect;
      if (rotated) {
        map.repeat.set(visibleHeight, 1);
        map.offset.set((1 - visibleHeight) * (0.5 - centerX), 0);
      } else {
        map.repeat.set(1, visibleHeight);
        map.offset.set(0, (1 - visibleHeight) * (0.5 - centerY));
      }
    }
    map.userData = { ...(map.userData || {}), coverSignature: signature };
    map.needsUpdate = true;
  });
}

function applyLoadedModelMaterials(model, finish, reflection) {
  const palette = finishPalette[finish] || finishPalette.White;
  const tint = new THREE.Color(palette.body);
  const requestedRoughness = Math.max(0.04, Math.min(0.9, Number(reflection?.roughness) || 0.28));
  const reflectionAmount = Math.max(0, Math.min(1, Number(reflection?.amount) || 0));
  model.traverse((object) => {
    if (!object.isMesh || !object.material) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      const isScreen = object.userData?.openmockScreen || Object.values(object.userData || {}).includes("proDisplayScreen");
      if (isScreen) {
        material.toneMapped = false;
        return;
      }
      material.userData.openmockBaseColor ||= material.color?.clone();
      material.userData.openmockBaseRoughness ??= material.roughness;
      material.envMapIntensity = 0.52 + reflectionAmount * 0.58;
      if ("roughness" in material && Number.isFinite(material.userData.openmockBaseRoughness)) {
        material.roughness = Math.max(0.04, Math.min(1, material.userData.openmockBaseRoughness * 0.76 + requestedRoughness * 0.24));
      }
      if ("clearcoat" in material) material.clearcoat = Math.max(material.clearcoat || 0, 0.34 + reflectionAmount * 0.34);
      if (material.color && material.userData.openmockBaseColor) {
        material.color.copy(material.userData.openmockBaseColor);
        if (object.userData?.openmockRole === "standMetal") {
          material.map = null;
          material.color.setHex(finish === "White" ? 0xbac1c4 : palette.metal);
          if ("metalness" in material) material.metalness = 0.72;
          if ("roughness" in material) material.roughness = 0.26;
          return;
        }
        const sourceHsl = material.userData.openmockBaseColor.getHSL({ h: 0, s: 0, l: 0 });
        const tintable = !material.map && sourceHsl.l > 0.12;
        if (tintable && sourceHsl.s > 0.07) material.color.lerp(tint, finish === "White" ? 0.58 : 0.64);
        else if (tintable && finish !== "White") material.color.lerp(tint, 0.22);
      }
    });
    object.castShadow = true;
    object.receiveShadow = true;
  });
}

function updateProceduralMaterials(runtime, finish, reflection) {
  const palette = finishPalette[finish] || finishPalette.White;
  const { body, finishables, screen, glass } = runtime.materials || {};
  const refs = finishables?.length ? finishables : body ? [{ material: body.material, role: "body" }] : [];
  refs.forEach(({ material, role }) => {
    if (material?.userData?.openmockFixedColor) return;
    if (material?.color) material.color.setHex(palette[role] || palette.body);
  });
  if (screen?.material) {
    if ("roughness" in screen.material) screen.material.roughness = Math.max(0.12, Number(reflection?.roughness) || 0.23);
    if ("clearcoat" in screen.material) screen.material.clearcoat = 0.82;
  }
  if (glass?.material) {
    const opacityScale = glass.material.userData?.openmockOpacityScale ?? 1;
    glass.material.opacity = (0.1 + (Number(reflection?.amount) || 0.22) * 0.2) * opacityScale;
    if ("roughness" in glass.material) glass.material.roughness = Math.max(0.035, Number(reflection?.roughness) || 0.08);
  }
}

export function ThreeStage({ mockup = "iPhone 17", cameraState, cameraPreset = "Angled", lighting, lightRotation, contactShadow = false, finish, reflection, enabled = true, isDark = false, effects = [], media = null, onStatusChange = () => {} }) {
  const canvasRef = useRef(null);
  const runtimeRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useLayoutEffect(() => {
    const runtime = runtimeRef.current;
    if (runtime) {
      runtime.switching = true;
      runtime.root.visible = false;
      runtime.ground.visible = false;
      runtime.renderer.clear(true, true, true);
    }
    setReady(false);
    setFailed(false);
    onStatusChange("loading");
  }, [enabled, mockup, media?.src, media?.type, onStatusChange]);

  useEffect(() => {
    if (!enabled || !canvasRef.current) return undefined;
    onStatusChange("loading");
    let disposed = false;
    const canvas = canvasRef.current;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
    } catch {
      setFailed(true);
      setReady(false);
      onStatusChange("failed");
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(24, 1, 0.01, 100);
    camera.position.set(0, 0, 3.1);
    camera.lookAt(0, 0, 0);
    const hemi = new THREE.HemisphereLight(0xffffff, 0x4a4e50, 0.72);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xfffaf2, 1.45);
    key.position.set(2.2, 4.5, 4.2);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0004;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xb8d7ff, 0.62);
    rim.position.set(-3.5, 1.8, -4);
    scene.add(rim);
    const fill = new THREE.DirectionalLight(0xffffff, 0.32);
    fill.position.set(-2, 1, 4);
    scene.add(fill);
    const root = new THREE.Group();
    scene.add(root);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.ShadowMaterial({ color: 0x1b1d1f, opacity: 0.2 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.17;
    ground.position.z = -0.3;
    ground.receiveShadow = true;
    scene.add(ground);

    const disposables = [];
    const screenTexture = loadScreenTexture(media, disposables);
    const runtime = { renderer, scene, camera, root, key, rim, fill, ground, model: null, materials: null, screenTexture, disposables, switching: false, modelHalf: null, lastPanX: 0, lastPanY: 0, lastFitAspect: 1 };
    runtimeRef.current = runtime;

    const resize = () => {
      const width = Math.max(1, canvas.clientWidth);
      const height = Math.max(1, canvas.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const finishSetup = (result, asset = null) => {
      if (disposed) return;
      let model = result.group || result;
      if (asset) model = prepareExactDevice(model, mockup, asset, screenTexture);
      normalizeObject(model, fitTarget(mockup));
      runtime.model = model;
      runtime.materials = asset ? null : result.materials || null;
      runtime.exact = Boolean(asset);
      runtime.switching = false;
      root.visible = true;
      ground.visible = true;
      root.add(runtime.model);
      enableModelShadows(runtime.model);
      if (asset) applyLoadedModelMaterials(runtime.model, finish, reflection);
      fitScreenTextures(runtime.model);
      placeGround(ground, runtime.model);
      // Cache the model's axis-aligned half extents in root space so the
      // framing fit can react to rotation without re-traversing the mesh tree.
      const savedRotation = root.rotation.clone();
      const savedPosition = root.position.clone();
      root.rotation.set(0, 0, 0);
      root.position.set(0, 0, 0);
      root.updateMatrixWorld(true);
      const localBox = visibleMeshBounds(runtime.model);
      runtime.modelHalf = localBox.getSize(new THREE.Vector3()).multiplyScalar(0.5);
      root.rotation.copy(savedRotation);
      root.position.copy(savedPosition);
      root.updateMatrixWorld(true);
      setFailed(false);
      setReady(true);
      onStatusChange("ready");
    };

    const exactAsset = exactDeviceAssets[mockup];
    if (exactAsset) {
      loadExactModel(exactAsset, renderer, runtime)
        .then((model) => finishSetup(model, exactAsset))
        .catch((error) => {
          console.warn(`Unable to load exact ${mockup} model; using the local fallback.`, error);
          if (!disposed) finishSetup(createProceduralDevice(mockup, screenTexture, finish));
        });
    } else {
      finishSetup(createProceduralDevice(mockup, screenTexture, finish));
    }

    new HDRLoader().load(hdrUrl, (texture) => {
      if (disposed) { texture.dispose(); return; }
      const pmrem = new THREE.PMREMGenerator(renderer);
      const environment = pmrem.fromEquirectangular(texture).texture;
      scene.environment = environment;
      texture.dispose();
      pmrem.dispose();
    }, undefined, () => {});

    let frame;
    const render = () => {
      if (disposed) return;
      frame = window.requestAnimationFrame(render);
      resize();
      if (runtime.switching) {
        renderer.clear(true, true, true);
      } else {
        // Re-fit when the stage shape changes (responsive resize) so the
        // device stays centered and fully visible at every aspect ratio.
        if (runtime.modelHalf && Math.abs((camera.aspect || 0) - (runtime.lastFitAspect ?? -1)) > 0.005) {
          refitStage(runtime, runtime.lastPanX, runtime.lastPanY);
          runtime.lastFitAspect = camera.aspect;
          placeGround(ground, runtime.model);
        }
        fitScreenTextures(runtime.model);
        renderer.render(scene, camera);
      }
    };
    render();
    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      runtimeRef.current = null;
      runtime.ktx2Loader?.dispose();
      runtime.dracoLoader?.dispose();
      runtime.disposables.forEach((dispose) => dispose());
      renderer.dispose();
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => {
            Object.values(material).forEach((value) => { if (value?.isTexture) value.dispose(); });
            material.dispose();
          });
        }
      });
      setReady(false);
      onStatusChange("loading");
    };
  }, [enabled, mockup, media?.src, media?.type, onStatusChange]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    const { camera, model, root, key, rim, fill, ground, renderer, scene } = runtime;
    const cameraData = cameraState || {};
    camera.fov = Number(cameraData.fov) || 24;
    camera.zoom = Math.max(0.5, Math.min(2.2, (Number(cameraData.zoom) || 1.9) / 1.9));
    const tallViewport = runtime.renderer.domElement.clientHeight / Math.max(1, runtime.renderer.domElement.clientWidth) > 1.2;
    const arch = deviceArchetype(mockup);
    const flatMockup = arch === "flat";
    const displayMockup = arch === "display" || arch === "tv" || arch === "browser";
    const phoneMockup = arch === "phone" || arch === "foldable";
    const tabletMockup = arch === "tablet" || arch === "ereader";
    const watchMockup = arch === "watch";
    const laptopMockup = arch === "laptop";
    const headsetMockup = arch === "headset";
    const handheldMockup = arch === "handheld";
    const baseCameraZ = flatMockup ? 4.35 : laptopMockup ? 4.5 : arch === "tv" ? 4.75 : displayMockup ? 4.3 : headsetMockup ? 3.9 : watchMockup ? 3.9 : tabletMockup ? 4.05 : handheldMockup ? 4.1 : arch === "foldable" ? 3.95 : 3.62;
    camera.position.z = baseCameraZ * (tallViewport ? 1.14 : 1);
    camera.position.y = laptopMockup ? 0.48 : displayMockup ? 0.1 : 0.04;
    camera.lookAt(0, laptopMockup ? -0.16 : 0, 0);
    camera.updateProjectionMatrix();
    if (root) {
      const xAxis = Number(cameraData.xAxis) || 0;
      const yAxis = Number(cameraData.yAxis) || 0;
      const zAxis = Number(cameraData.zAxis) || 0;
      const rollFactor = flatMockup ? 0 : laptopMockup || displayMockup ? 0.1 : headsetMockup ? 0.03 : watchMockup ? 0.22 : tabletMockup ? 0.18 : handheldMockup ? 0.3 : arch === "foldable" ? (mockup.includes("Flip") ? 0.6 : 0.32) : 0.65;
      const yawSign = phoneMockup ? -1 : 1;
      const backView = cameraPreset === "Back" && (phoneMockup || tabletMockup || watchMockup || handheldMockup);
      const basePitch = backView ? 8 : 0;
      const baseYaw = backView ? 180 : 0;
      // Camera axes are actual degrees now. Keep a small device-specific roll
      // contribution from X for the existing editorial presets, while Z is an
      // independent full-turn roll control.
      root.rotation.order = "YXZ";
      root.rotation.set(
        flatMockup ? 0 : THREE.MathUtils.degToRad(basePitch + yAxis),
        flatMockup ? 0 : THREE.MathUtils.degToRad(baseYaw + xAxis * yawSign),
        flatMockup ? 0 : THREE.MathUtils.degToRad(zAxis - xAxis * rollFactor),
      );
      refitStage(runtime, Number(cameraData.panX) || 0, Number(cameraData.panY) || 0);
      runtime.lastPanX = Number(cameraData.panX) || 0;
      runtime.lastPanY = Number(cameraData.panY) || 0;
      runtime.lastFitAspect = camera.aspect;
      placeGround(ground, root);
    }
    if (model && !runtime.materials) applyLoadedModelMaterials(model, finish, reflection);
    if (runtime.materials) updateProceduralMaterials(runtime, finish, reflection);
    if (key) {
      const brightness = lighting === "Dark Rim" ? 0.54 : lighting === "Studio Soft" ? 1.82 : lighting === "Two Tone" ? 1.22 : lighting === "Warm Glow" ? 1.52 : 1.45;
      key.intensity = brightness;
      key.color.set(lighting === "Warm Glow" ? 0xffd5aa : 0xfffaf2);
      key.position.set(2.2, 4.5, 4.2);
      key.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad((Number(lightRotation?.y) || 263) - 263) * 0.35);
      key.position.applyAxisAngle(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(Number(lightRotation?.x) || 0) * 0.15);
    }
    if (rim) rim.intensity = lighting === "Two Tone" ? 1.15 : lighting === "Dark Rim" ? 1.42 : 0.62;
    if (fill) fill.intensity = lighting === "Dark Rim" ? 0.14 : lighting === "Studio Soft" ? 0.48 : 0.32;
    scene.environmentIntensity = lighting === "Dark Rim" ? 0.22 : lighting === "Two Tone" ? 0.9 : lighting === "Warm Glow" ? 0.82 : lighting === "Studio Soft" ? 1.14 : 1;
    if (ground?.material) ground.material.opacity = contactShadow ? 0.28 : 0.08;
    renderer.toneMappingExposure = effects.includes("Bloom") ? 1.16 : isDark ? 0.8 : lighting === "Warm Glow" ? 1.08 : 1.02;
  }, [cameraState, cameraPreset, lighting, lightRotation, contactShadow, finish, reflection, isDark, effects, mockup, ready]);

  return <canvas ref={canvasRef} className={`three-stage-canvas ${ready && !failed ? "is-ready" : ""}`} aria-hidden="true" data-renderer-status={failed ? "fallback" : ready ? "ready" : "loading"} />;
}
