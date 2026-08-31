import { useEffect, useLayoutEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { USDLoader } from "three/examples/jsm/loaders/USDLoader.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

const asset = (path) => `${import.meta.env.BASE_URL}assets/${path}`;
const modelUrl = asset("source/iphone-17-p-sim.glb");
const hdrUrl = asset("source/brown_photostudio_04_2k.hdr");
const starterUrl = asset("source/starter-screen.jpg");

// Manufacturer-supplied product geometry. Apple models come from the AR assets
// on each product page; Samsung and Google publish the GLBs used by their own
// interactive product viewers. The source iPhone 17 GLB remains the baseline
// because it includes Ultramock's explicit screen-surface metadata.
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
    url: asset("devices/iphone-17-pro.usdz"),
    variant: "pro",
    slab: true,
    forceOverlay: true,
    overlayOnMesh: "HkNSnYzBPABcqwM",
    hideMeshes: ["gCMlCSdRJrizepS", "vDwikmBvgqpSImF"],
    screenAspect: 1206 / 2622,
  },
  "iPhone 17 Pro Max": {
    type: "usd",
    url: asset("devices/iphone-17-pro.usdz"),
    variant: "pro-max",
    slab: true,
    forceOverlay: true,
    overlayOnMesh: "HkNSnYzBPABcqwM",
    hideMeshes: ["gCMlCSdRJrizepS", "vDwikmBvgqpSImF"],
    screenAspect: 1320 / 2868,
  },
  "Galaxy S26 Ultra": {
    type: "gltf",
    url: asset("devices/galaxy-s26-ultra.glb"),
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
  "Pixel 10 Pro": {
    type: "gltf",
    url: asset("devices/pixel-10-pro.glb"),
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
  "Apple Watch Ultra 3": {
    type: "usd",
    url: asset("devices/watch-ultra-3.usdz"),
    screenNames: ["LBTKGOnjodxPkhe"],
    nativeScreenUv: true,
    screenAspect: 410 / 502,
  },
  "iPad Pro": {
    type: "usd",
    url: asset("devices/ipad-pro.usdz"),
    screenNames: ["lsDiIbtoSGSmWWZ"],
    nativeScreenUv: true,
    screenAspect: 2420 / 1668,
    textureRotation: -Math.PI / 2,
    stripBelow: 0.3,
    removeSubtrees: ["UlaXKoqepypaGMQ"],
    uprightScreen: true,
  },
  "iPad mini": {
    type: "usd",
    url: asset("devices/ipad-mini.usdz"),
    slab: true,
    screenAspect: 1488 / 2266,
    forceOverlay: true,
    overlayOnMesh: "JYsmegxeEHkOedR",
    removeSubtrees: ["UqztaYhhdQQwgTu"],
  },
  "MacBook Neo": {
    type: "usd",
    url: asset("devices/macbook-neo.usdz"),
    screenNames: ["rvnQqsVlUxgRHpf"],
    screenFlipV: true,
    screenAspect: 16 / 10,
  },
  "MacBook Air 13\"": {
    type: "usd",
    url: asset("devices/macbook-air-13.usdz"),
    screenNames: ["lidqkpaVJriYQHN"],
    screenFlipV: true,
    screenAspect: 16 / 10,
  },
  "MacBook Pro 14\"": {
    type: "usd",
    url: asset("devices/macbook-pro-14.usdz"),
    screenNames: ["tfTbkkzhxqpKRgC"],
    screenFlipV: true,
    screenAspect: 16 / 10,
  },
  "MacBook Pro 16\"": {
    type: "usd",
    url: asset("devices/macbook-pro-14.usdz"),
    screenNames: ["tfTbkkzhxqpKRgC"],
    screenFlipV: true,
    screenAspect: 16 / 10,
    shapeScale: [1.138, 1.09, 1.122],
  },
  "iMac 24\"": {
    type: "usd",
    url: asset("devices/imac-24.usdz"),
    screenNames: ["XUnKxWElBQtWRPy"],
    screenAspect: 16 / 9,
    removeSubtrees: ["RdqCKcOrcloXBys", "YBByYyjzwdnRTqR"],
  },
  "Studio Display": {
    type: "usd",
    url: asset("devices/studio-display.usdz"),
    screenNames: ["IZJsAfohLAwOHok"],
    screenAspect: 16 / 9,
    standFinish: true,
  },
  "Apple Vision Pro": {
    type: "usd",
    url: asset("devices/vision-pro.usdz"),
  },
  "XDR Display": {
    type: "usd",
    url: asset("devices/xdr-display.usdz"),
    screenNames: ["IyklIWCEUuwKzOr"],
    screenAspect: 16 / 9,
    standFinish: true,
    standMeshes: ["GkERnwlKXemCPLQ"],
  },
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
  const bezel = roundedMesh(width, height, Math.max(depth * 0.5, 0.028), Math.min(width, height) * 0.075, physicalMaterial(0x080a0c, { roughness: 0.18, metalness: 0.22, clearcoat: 0.9 }));
  bezel.position.z = options.z || 0;
  group.add(bezel);
  const screenMap = cloneTexture(texture, targetAspect);
  const screen = roundedMesh(width * 0.955, height * 0.955, Math.max(depth * 0.18, 0.016), Math.min(width, height) * 0.058, new THREE.MeshBasicMaterial({
    map: screenMap,
    color: 0xffffff,
    toneMapped: false,
  }));
  screen.position.z = (options.z || 0) + Math.max(depth * 0.38, 0.024);
  screen.userData.screenAspect = targetAspect;
  group.add(screen);
  const glass = roundedMesh(width * 0.952, height * 0.952, Math.max(depth * 0.06, 0.009), Math.min(width, height) * 0.054, new THREE.MeshPhysicalMaterial({
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
  const sideButton = (x, y, w = 0.035, h = 0.17) => {
    const button = roundedMesh(w, h, Math.max(depth * 0.6, 0.055), w * 0.45, buttonMaterial, 4);
    button.position.set(x, y, 0);
    group.add(button);
  };
  if (layout === "galaxy") {
    sideButton(width / 2 + 0.018, height * 0.16, 0.035, 0.22);
    sideButton(width / 2 + 0.018, height * 0.02, 0.035, 0.16);
  } else if (layout === "pixel") {
    sideButton(width / 2 + 0.018, height * 0.16, 0.035, 0.23);
    sideButton(width / 2 + 0.018, height * 0.01, 0.035, 0.12);
  } else {
    sideButton(-width / 2 - 0.018, height * 0.18, 0.04, 0.2);
    sideButton(-width / 2 - 0.018, height * 0.03, 0.04, 0.14);
    sideButton(-width / 2 - 0.018, -height * 0.12, 0.04, 0.14);
    sideButton(width / 2 + 0.018, height * 0.2, 0.04, 0.24);
  }
  return buttonMaterial;
}

function addPhoneIsland(group, width, height, depth) {
  const island = roundedMesh(width * 0.34, height * 0.04, Math.max(depth * 0.42, 0.04), height * 0.018, physicalMaterial(0x050607, { roughness: 0.14, metalness: 0.08, clearcoat: 0.9 }), 6);
  island.position.set(0, height * 0.405, depth * 0.78);
  group.add(island);
  addFrontCameraDot(group, width * 0.09, height * 0.405, depth * 0.99, height * 0.012);
}

function addBackCameraSystem(group, width, height, depth, kind, palette) {
  const bumpColor = kind === "iphone" ? 0x8b9699 : kind === "pixel" ? 0x2b3336 : kind === "ipad" ? palette.metal : palette.accent;
  const bumpMaterial = physicalMaterial(bumpColor, { roughness: 0.19, metalness: 0.7, clearcoat: 0.82 });
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
  const bumpRole = kind === "ipad" || kind === "iphone" ? "metal" : "accent";
  const finishables = [{ material: ringMaterial, role: "metal" }, ...(kind === "pixel" ? [] : [{ material: bumpMaterial, role: bumpRole }])];
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
  if (kind === "pixel") {
    const bar = roundedMesh(width * 0.82, height * 0.12, 0.055, height * 0.045, bumpMaterial, 6);
    bar.position.set(0, height * 0.32, -depth / 2 - 0.03);
    group.add(bar);
    camera(-width * 0.22, height * 0.32, 0.07);
    camera(0, height * 0.32, 0.07);
    camera(width * 0.22, height * 0.32, 0.055);
    const flash = new THREE.Mesh(new THREE.SphereGeometry(0.026, 16, 10), new THREE.MeshPhysicalMaterial({ color: 0xe8d6a7, roughness: 0.26, metalness: 0.08 }));
    flash.position.set(width * 0.3, height * 0.32, -depth / 2 - 0.067);
    group.add(flash);
  } else if (kind === "galaxy") {
    camera(width * 0.25, height * 0.32, 0.076);
    camera(width * 0.25, height * 0.12, 0.07);
    camera(width * 0.25, -height * 0.08, 0.06);
    camera(-width * 0.08, height * 0.31, 0.052);
    const flash = new THREE.Mesh(new THREE.SphereGeometry(0.026, 16, 10), new THREE.MeshPhysicalMaterial({ color: 0xe8d6a7, roughness: 0.26, metalness: 0.08 }));
    flash.position.set(-width * 0.09, height * 0.14, -depth / 2 - 0.067);
    group.add(flash);
  } else if (kind === "ipad") {
    const bump = roundedMesh(width * 0.22, height * 0.16, 0.05, height * 0.04, bumpMaterial, 6);
    bump.position.set(width * 0.25, height * 0.35, -depth / 2 - 0.03);
    group.add(bump);
    camera(width * 0.25, height * 0.37, 0.072);
    const flash = new THREE.Mesh(new THREE.SphereGeometry(0.026, 16, 10), new THREE.MeshPhysicalMaterial({ color: 0xe8d6a7, roughness: 0.26, metalness: 0.08 }));
    flash.position.set(width * 0.37, height * 0.31, -depth / 2 - 0.066);
    group.add(flash);
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
  const isGalaxy = mockup === "Galaxy S26 Ultra";
  const isPixel = mockup === "Pixel 10 Pro";
  const isProMax = mockup.includes("Pro Max");
  const width = isGalaxy ? 1.08 : isPixel ? 1.04 : isProMax ? 1.16 : 1.07;
  const height = isGalaxy ? 2.25 : isPixel ? 2.18 : isProMax ? 2.34 : 2.2;
  const depth = isGalaxy ? 0.12 : isPixel ? 0.125 : 0.145;
  const group = new THREE.Group();
  const body = roundedMesh(width, height, depth, isGalaxy ? 0.15 : 0.12, physicalMaterial(palette.metal, { roughness: isGalaxy ? 0.17 : 0.2, metalness: 0.9, clearcoat: 0.78 }));
  group.add(body);
  const backPanel = roundedMesh(width * 0.972, height * 0.976, 0.024, isGalaxy ? 0.14 : 0.11, physicalMaterial(palette.body, { roughness: 0.24, metalness: 0.16, clearcoat: 0.92, clearcoatRoughness: 0.045 }));
  backPanel.position.z = -depth / 2 - 0.009;
  group.add(backPanel);
  const screens = addScreen(group, width * 0.91, height * 0.93, depth, texture, { z: depth * 0.42 });
  if (isGalaxy || isPixel) addFrontCameraDot(group, 0, height * 0.42, depth * 0.83, 0.026);
  else addPhoneIsland(group, width, height, depth);
  const buttonMaterial = addPhoneButtons(group, width, height, depth, palette.metal, isGalaxy ? "galaxy" : isPixel ? "pixel" : "iphone");
  const cameraSystem = addBackCameraSystem(group, width, height, depth, isGalaxy ? "galaxy" : isPixel ? "pixel" : "iphone", palette);
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
  const width = isMini ? 1.42 : 1.64;
  const height = isMini ? 2.16 : 2.34;
  const depth = 0.105;
  const group = new THREE.Group();
  const body = roundedMesh(width, height, depth, 0.12, physicalMaterial(palette.metal, { roughness: 0.2, metalness: 0.88, clearcoat: 0.78 }));
  group.add(body);
  const backPanel = roundedMesh(width * 0.978, height * 0.978, 0.022, 0.11, physicalMaterial(palette.body, { roughness: 0.26, metalness: 0.12, clearcoat: 0.9, clearcoatRoughness: 0.05 }));
  backPanel.position.z = -depth / 2 - 0.008;
  group.add(backPanel);
  const screens = addScreen(group, width * 0.935, height * 0.925, depth, texture, { z: depth * 0.42 });
  addFrontCameraDot(group, 0, height * 0.437, depth * 0.83, 0.019);
  const buttonMaterial = addPhoneButtons(group, width, height, depth, palette.metal, "pixel");
  const cameraSystem = addBackCameraSystem(group, width, height, depth, "ipad", palette);
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
  const isPro16 = mockup.includes("16");
  const width = isNeo ? 2.42 : isPro16 ? 2.86 : isAir ? 2.48 : 2.58;
  const height = isNeo ? 1.48 : isPro16 ? 1.7 : 1.6;
  const depth = isNeo ? 1.42 : isPro16 ? 1.68 : 1.54;
  const group = new THREE.Group();
  const displayAssembly = new THREE.Group();
  displayAssembly.position.set(0, 0.18, -depth * 0.39);
  displayAssembly.rotation.x = -THREE.MathUtils.degToRad(8);
  group.add(displayAssembly);
  const displayShell = roundedMesh(width, height, 0.13, 0.105, physicalMaterial(palette.body, { roughness: 0.18, metalness: 0.84 }));
  displayAssembly.add(displayShell);
  const displayScreen = addScreen(displayAssembly, width * 0.905, height * 0.83, 0.07, texture, { z: 0.078 });
  addFrontCameraDot(displayAssembly, 0, height * 0.405, 0.14, 0.016);
  const base = roundedMesh(width * 1.055, 0.18, depth, 0.075, physicalMaterial(palette.metal, { roughness: 0.3, metalness: 0.78 }));
  base.position.set(0, -0.67, 0.16);
  group.add(base);
  const keyboard = roundedMesh(width * 0.89, 0.038, depth * 0.72, 0.038, physicalMaterial(0x1c2022, { roughness: 0.48, metalness: 0.18 }));
  keyboard.position.set(0, -0.56, 0.23);
  group.add(keyboard);
  const keyMaterial = physicalMaterial(0x555d60, { roughness: 0.5, metalness: 0.12 });
  const keyRows = 4;
  const keyColumns = 12;
  const keyWidth = width * 0.052;
  const keyDepth = depth * 0.072;
  for (let row = 0; row < keyRows; row += 1) {
    for (let column = 0; column < keyColumns; column += 1) {
      const isSpacebar = row === 3 && column >= 4 && column <= 7;
      const key = roundedMesh(isSpacebar ? keyWidth * 1.7 : keyWidth, 0.025, keyDepth, 0.011, keyMaterial, 3);
      key.position.set((column - (keyColumns - 1) / 2) * width * 0.068, -0.53, 0.02 + (row - 1.5) * depth * 0.108);
      group.add(key);
    }
  }
  const trackpad = roundedMesh(width * 0.24, 0.028, depth * 0.25, 0.026, physicalMaterial(0xaeb5b6, { roughness: 0.32, metalness: 0.38 }));
  trackpad.position.set(0, -0.53, 0.65);
  group.add(trackpad);
  const hinge = roundedMesh(width * 0.8, 0.06, 0.13, 0.03, physicalMaterial(palette.metal, { roughness: 0.25, metalness: 0.8 }));
  hinge.position.set(0, -0.55, -depth * 0.39);
  group.add(hinge);
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
  const width = isIMac ? 2.5 : isStudio ? 2.95 : 2.78;
  const height = isIMac ? 1.68 : isStudio ? 1.72 : 1.76;
  const body = roundedMesh(width, height, 0.14, 0.105, physicalMaterial(palette.body, { roughness: 0.17, metalness: 0.84 }));
  group.add(body);
  const screen = addScreen(group, width * (isIMac ? 0.91 : 0.945), height * (isIMac ? 0.79 : 0.905), 0.07, texture, { z: 0.08 });
  let chin = null;
  if (isIMac) {
    chin = roundedMesh(width * 0.91, height * 0.105, 0.05, 0.025, physicalMaterial(palette.body, { roughness: 0.22, metalness: 0.78 }));
    chin.position.set(0, -height * 0.39, 0.11);
    group.add(chin);
  }
  addFrontCameraDot(group, 0, height * 0.415, 0.15, isIMac ? 0.015 : 0.013);
  const neck = roundedMesh(isIMac ? 0.18 : 0.16, isIMac ? 0.64 : isStudio ? 0.6 : 0.68, 0.16, 0.05, physicalMaterial(palette.metal, { roughness: 0.3, metalness: 0.72 }));
  neck.position.y = isIMac ? -1.12 : isStudio ? -1.14 : -1.15;
  group.add(neck);
  const foot = roundedMesh(isIMac ? 0.92 : isStudio ? 1.02 : 0.86, 0.09, isIMac ? 0.62 : 0.56, 0.045, physicalMaterial(palette.metal, { roughness: 0.26, metalness: 0.78 }));
  foot.position.set(0, isIMac ? -1.47 : isStudio ? -1.49 : -1.5, 0.08);
  group.add(foot);
  return {
    group,
    materials: {
      body,
      finishables: [
        { material: body.material, role: "body" },
        ...(chin ? [{ material: chin.material, role: "body" }] : []),
        { material: neck.material, role: "metal" },
        { material: foot.material, role: "metal" },
      ],
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

function createWatch(texture, finish) {
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

function createProceduralDevice(mockup, texture, finish) {
  if (mockup === "Flat") return createFlatDisplay(texture);
  if (mockup === "iPad Pro" || mockup === "iPad mini") return createTablet(mockup, texture, finish);
  if (mockup.includes("MacBook")) return createLaptop(mockup, texture, finish);
  if (mockup === "iMac 24\"") return createDisplay(texture, finish, "imac");
  if (mockup === "Studio Display") return createDisplay(texture, finish, "studio");
  if (mockup === "XDR Display") return createDisplay(texture, finish);
  if (mockup === "Apple Vision Pro") return createVisionPro(texture, finish);
  if (mockup.includes("Watch")) return createWatch(texture, finish);
  const result = createPhone(mockup, texture, finish);
  return result;
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
    const hasRole = asset.screenRole && object.userData?.ultramonkRole === asset.screenRole;
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
  screen.userData.ultramonkScreen = true;
  screen.userData.ultramonkOverlay = true;
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
  screen.userData.ultramonkScreen = true;
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
    if (screen.userData?.ultramonkOverlay) screen.rotation.y += Math.PI;
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
    if (center.y < cutoff || box.max.y < belowScreen) object.userData.ultramonkRole = "standMetal";
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
    object.userData.ultramonkRole = "standMetal";
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
  if (asset.shapeScale) prepared.scale.multiply(new THREE.Vector3().fromArray(asset.shapeScale));
  hideNamedMeshes(prepared, asset.hideMeshes);
  let screen = bindExactScreen(prepared, asset, screenTexture);
  if (asset.uprightScreen) uprightScreenToCamera(prepared, screen);
  if (asset.slab) faceSlabTowardCamera(prepared, screen);
  if (screen && !asset.forceOverlay && !asset.nativeScreenUv) {
    alignScreenUvToWorld(screen);
    if (asset.screenFlipV) flipScreenV(screen);
  }
  if (asset.standFinish) markDisplayStand(prepared, screen);
  if (asset.standMeshes) swapExplicitStandMaterial(prepared, asset.standMeshes);
  prepared.userData.ultramockSource = "manufacturer";
  prepared.userData.ultramockMockup = mockup;
  return prepared;
}

function normalizeObject(object, target = 2.22) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z) || 1;
  object.scale.multiplyScalar(target / maxDimension);
  object.updateMatrixWorld(true);
  const center = new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3());
  object.position.sub(center);
}

function placeGround(ground, object) {
  if (!ground || !object) return;
  object.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(object);
  if (Number.isFinite(bounds.min.y)) ground.position.y = bounds.min.y - 0.012;
}

function enableModelShadows(object) {
  object.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });
}

function fitTarget(mockup) {
  if (mockup === "iPhone 17" || mockup.includes("iPhone") || mockup === "Galaxy S26 Ultra" || mockup === "Pixel 10 Pro") return 1.55;
  if (mockup.includes("Watch")) return 1.48;
  if (mockup === "iPad Pro") return 1.5;
  if (mockup === "iPad mini") return 1.58;
  if (mockup === "Flat") return 1.82;
  if (mockup === "XDR Display" || mockup === "iMac 24\"" || mockup === "Studio Display") return 1.22;
  if (mockup === "Apple Vision Pro") return 1.55;
  if (mockup.includes("MacBook")) return 1.26;
  return 2.08;
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

  const ktx2Loader = new KTX2Loader().setTranscoderPath(asset("basis/"));
  const dracoLoader = new DRACOLoader().setDecoderPath(asset("draco/"));
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
      const isScreen = object.userData?.ultramonkScreen || object.userData?.ultramonkRole === "proDisplayScreen";
      if (isScreen) {
        material.toneMapped = false;
        return;
      }
      material.userData.ultramockBaseColor ||= material.color?.clone();
      material.userData.ultramockBaseRoughness ??= material.roughness;
      material.envMapIntensity = 0.52 + reflectionAmount * 0.58;
      if ("roughness" in material && Number.isFinite(material.userData.ultramockBaseRoughness)) {
        material.roughness = Math.max(0.04, Math.min(1, material.userData.ultramockBaseRoughness * 0.76 + requestedRoughness * 0.24));
      }
      if ("clearcoat" in material) material.clearcoat = Math.max(material.clearcoat || 0, 0.34 + reflectionAmount * 0.34);
      if (material.color && material.userData.ultramockBaseColor) {
        material.color.copy(material.userData.ultramockBaseColor);
        if (object.userData?.ultramonkRole === "standMetal") {
          material.map = null;
          material.color.setHex(finish === "White" ? 0xbac1c4 : palette.metal);
          if ("metalness" in material) material.metalness = 0.72;
          if ("roughness" in material) material.roughness = 0.26;
          return;
        }
        const sourceHsl = material.userData.ultramockBaseColor.getHSL({ h: 0, s: 0, l: 0 });
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
    if (material?.color) material.color.setHex(palette[role] || palette.body);
  });
  if (screen?.material) {
    if ("roughness" in screen.material) screen.material.roughness = Math.max(0.12, Number(reflection?.roughness) || 0.23);
    if ("clearcoat" in screen.material) screen.material.clearcoat = 0.82;
  }
  if (glass?.material) {
    glass.material.opacity = 0.1 + (Number(reflection?.amount) || 0.22) * 0.2;
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
    const runtime = { renderer, scene, camera, root, key, rim, fill, ground, model: null, materials: null, screenTexture, disposables, switching: false };
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
    const displayMockup = mockup === "XDR Display" || mockup === "iMac 24\"" || mockup === "Studio Display";
    const phoneMockup = mockup.includes("iPhone") || mockup === "Galaxy S26 Ultra" || mockup === "Pixel 10 Pro";
    const tabletMockup = mockup === "iPad Pro" || mockup === "iPad mini";
    const watchMockup = mockup.includes("Watch");
    const laptopMockup = mockup.includes("MacBook");
    const headsetMockup = mockup === "Apple Vision Pro";
    const baseCameraZ = mockup === "Flat" ? 4.35 : laptopMockup ? 4.5 : displayMockup ? 4.3 : headsetMockup ? 3.9 : watchMockup ? 3.9 : tabletMockup ? 4.05 : 3.62;
    camera.position.z = baseCameraZ * (tallViewport ? 1.14 : 1);
    camera.position.y = laptopMockup ? 0.48 : 0.04;
    camera.lookAt(0, laptopMockup ? -0.16 : 0, 0);
    camera.updateProjectionMatrix();
    if (root) {
      const xAxis = Number(cameraData.xAxis) || 0;
      const yAxis = Number(cameraData.yAxis) || 0;
      const zAxis = Number(cameraData.zAxis) || 0;
      const rollFactor = mockup === "Flat" ? 0 : laptopMockup || displayMockup ? 0.1 : headsetMockup ? 0.03 : watchMockup ? 0.22 : tabletMockup ? 0.18 : 0.65;
      const turnFactor = mockup === "iPhone 17"
        ? -0.75
        : phoneMockup
          ? -0.62
          : tabletMockup
            ? 0.52
            : laptopMockup || displayMockup
              ? 0.48
              : headsetMockup
                ? 0.42
                : watchMockup
                  ? 0.48
                  : 0.22;
      if (cameraPreset === "Back" && (phoneMockup || tabletMockup || watchMockup)) {
        root.rotation.set(THREE.MathUtils.degToRad(8), Math.PI - THREE.MathUtils.degToRad(10), 0);
      } else {
        root.rotation.set(
          mockup === "Flat" ? 0 : THREE.MathUtils.degToRad(yAxis) * 0.25,
          mockup === "Flat" ? 0 : THREE.MathUtils.degToRad(xAxis) * turnFactor + THREE.MathUtils.degToRad(zAxis) * 0.3,
          -THREE.MathUtils.degToRad(xAxis) * rollFactor + THREE.MathUtils.degToRad(zAxis) * 0.4,
        );
      }
      root.position.x = (Number(cameraData.panX) || 0) * 0.5;
      const verticalOffset = mockup === "Flat" ? 0 : displayMockup ? -0.04 : laptopMockup ? -0.02 : headsetMockup ? 0 : watchMockup ? -0.02 : tabletMockup ? -0.04 : tallViewport ? -0.12 : mockup === "iPhone 17" ? -0.26 : -0.08;
      root.position.y = -(Number(cameraData.panY) || 0) * 0.5 + verticalOffset;
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
