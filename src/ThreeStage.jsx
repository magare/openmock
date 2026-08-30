import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

const modelUrl = "/assets/source/iphone-17-p-sim.glb";
const hdrUrl = "/assets/source/brown_photostudio_04_2k.hdr";
const starterUrl = "/assets/source/starter-screen.jpg";

const finishPalette = {
  White: { body: 0xe9eeee, metal: 0xcfd5d6, accent: 0xf8f9f8 },
  Black: { body: 0x111416, metal: 0x303536, accent: 0x0a0b0c },
  "Mist Blue": { body: 0xa9c0c8, metal: 0x7e9ba5, accent: 0xd4e0e3 },
  Sage: { body: 0xa6b8aa, metal: 0x7d9787, accent: 0xd5dfd8 },
  Lavender: { body: 0xc0b4cb, metal: 0x9485a1, accent: 0xe0d8e6 },
};

function physicalMaterial(color, options = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.28,
    metalness: 0.72,
    clearcoat: 0.55,
    clearcoatRoughness: 0.12,
    ...options,
  });
}

function roundedMesh(width, height, depth, radius, material, segments = 6) {
  return new THREE.Mesh(new RoundedBoxGeometry(width, height, depth, segments, radius), material);
}

function addScreen(group, width, height, depth, texture, options = {}) {
  const bezel = roundedMesh(width, height, depth * 0.52, Math.min(width, height) * 0.08, physicalMaterial(0x090b0d, { roughness: 0.2, metalness: 0.18, clearcoat: 0.8 }));
  bezel.position.z = options.z || 0;
  group.add(bezel);
  const screen = roundedMesh(width * 0.925, height * 0.925, depth * 0.28, Math.min(width, height) * 0.057, physicalMaterial(0xffffff, {
    map: texture,
    roughness: 0.23,
    metalness: 0.02,
    clearcoat: 0.72,
    clearcoatRoughness: 0.08,
  }));
  screen.position.z = (options.z || 0) + depth * 0.42;
  group.add(screen);
  const glass = roundedMesh(width * 0.92, height * 0.92, depth * 0.12, Math.min(width, height) * 0.054, new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.1,
    roughness: 0.06,
    metalness: 0,
    transmission: 0.22,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    depthWrite: false,
  }));
  glass.position.z = (options.z || 0) + depth * 0.58;
  group.add(glass);
  return { bezel, screen, glass };
}

function addPhoneButtons(group, width, height, depth, accent) {
  const buttonMaterial = physicalMaterial(accent, { roughness: 0.2, metalness: 0.88, clearcoat: 0.7 });
  const sideButton = (x, y, w = 0.035, h = 0.17) => {
    const button = roundedMesh(w, h, depth * 0.52, w * 0.45, buttonMaterial, 4);
    button.position.set(x, y, -depth * 0.03);
    group.add(button);
  };
  sideButton(-width / 2 - 0.018, height * 0.18, 0.04, 0.2);
  sideButton(-width / 2 - 0.018, height * 0.03, 0.04, 0.14);
  sideButton(-width / 2 - 0.018, -height * 0.12, 0.04, 0.14);
  sideButton(width / 2 + 0.018, height * 0.2, 0.04, 0.24);
}

function addPhoneIsland(group, width, height, depth) {
  const island = roundedMesh(width * 0.34, height * 0.035, depth * 0.5, height * 0.017, physicalMaterial(0x050607, { roughness: 0.14, metalness: 0.08, clearcoat: 0.9 }), 5);
  island.position.set(0, height * 0.405, depth * 0.7);
  group.add(island);
  const sensor = new THREE.Mesh(new THREE.SphereGeometry(height * 0.009, 12, 8), new THREE.MeshBasicMaterial({ color: 0x6b7c85 }));
  sensor.position.set(width * 0.09, height * 0.405, depth * 0.98);
  group.add(sensor);
}

function createPhone(mockup, texture, finish) {
  const palette = finishPalette[finish] || finishPalette.White;
  const isTablet = mockup === "iPad Pro" || mockup === "iPad mini";
  const isMiniTablet = mockup === "iPad mini";
  const width = isTablet ? (isMiniTablet ? 1.34 : 1.55) : mockup.includes("Pro Max") ? 1.16 : 1.05;
  const height = isTablet ? (isMiniTablet ? 2.04 : 2.22) : mockup.includes("Pro Max") ? 2.34 : 2.18;
  const depth = isTablet ? 0.105 : 0.15;
  const group = new THREE.Group();
  const body = roundedMesh(width, height, depth, isTablet ? 0.1 : 0.115, physicalMaterial(palette.body, { roughness: 0.2, metalness: 0.82 }));
  group.add(body);
  const screens = addScreen(group, width * 0.89, height * 0.925, depth, texture);
  addPhoneIsland(group, width, height, depth);
  if (!isTablet) addPhoneButtons(group, width, height, depth, palette.metal);
  const lensMaterial = new THREE.MeshPhysicalMaterial({ color: 0x0a0d10, roughness: 0.1, metalness: 0.1, clearcoat: 1 });
  for (const x of [-0.13, 0.13]) {
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.018, 24), lensMaterial);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(x, -height * 0.405, depth * 0.64);
    group.add(lens);
  }
  return { group, materials: { body, screen: screens.screen, glass: screens.glass } };
}

function createLaptop(mockup, texture, finish) {
  const palette = finishPalette[finish] || finishPalette.White;
  const isNeo = mockup === "MacBook Neo";
  const width = isNeo ? 2.45 : 2.62;
  const height = isNeo ? 1.5 : 1.64;
  const depth = 1.52;
  const group = new THREE.Group();
  const displayShell = roundedMesh(width, height, 0.12, 0.11, physicalMaterial(palette.body, { roughness: 0.18, metalness: 0.84 }));
  displayShell.position.y = 0.34;
  group.add(displayShell);
  const displayScreen = addScreen(group, width * 0.91, height * 0.88, 0.06, texture, { z: 0.075 });
  displayScreen.bezel.position.y = 0.34;
  displayScreen.screen.position.y = 0.34;
  displayScreen.glass.position.y = 0.34;
  const base = roundedMesh(width * 1.05, 0.15, depth, 0.07, physicalMaterial(palette.metal, { roughness: 0.29, metalness: 0.75 }));
  base.position.set(0, -0.58, 0.14);
  group.add(base);
  const keyboard = roundedMesh(width * 0.88, 0.035, depth * 0.72, 0.035, physicalMaterial(0x1d2022, { roughness: 0.42, metalness: 0.18 }));
  keyboard.position.set(0, -0.465, 0.25);
  group.add(keyboard);
  const keyMaterial = physicalMaterial(0x596062, { roughness: 0.48, metalness: 0.14 });
  const keyRows = 4;
  const keyColumns = 11;
  const keyWidth = width * 0.055;
  const keyDepth = depth * 0.078;
  for (let row = 0; row < keyRows; row += 1) {
    for (let column = 0; column < keyColumns; column += 1) {
      const key = roundedMesh(keyWidth, 0.026, keyDepth, 0.012, keyMaterial, 3);
      key.position.set((column - (keyColumns - 1) / 2) * width * 0.071, -0.435, 0.02 + (row - 1.5) * depth * 0.115);
      group.add(key);
    }
  }
  const trackpad = roundedMesh(width * 0.22, 0.026, depth * 0.24, 0.025, physicalMaterial(0xaeb5b6, { roughness: 0.32, metalness: 0.38 }));
  trackpad.position.set(0, -0.435, 0.67);
  group.add(trackpad);
  const hinge = roundedMesh(width * 0.8, 0.06, 0.13, 0.03, physicalMaterial(palette.metal, { roughness: 0.25, metalness: 0.8 }));
  hinge.position.set(0, -0.41, 0.04);
  group.add(hinge);
  return { group, materials: { body: displayShell, screen: displayScreen.screen, glass: displayScreen.glass } };
}

function createDisplay(texture, finish, variant = "xdr") {
  const palette = finishPalette[finish] || finishPalette.White;
  const group = new THREE.Group();
  const isIMac = variant === "imac";
  const isStudio = variant === "studio";
  const width = isIMac ? 2.46 : isStudio ? 2.92 : 2.72;
  const height = isIMac ? 1.66 : isStudio ? 1.7 : 1.74;
  const body = roundedMesh(width, height, 0.14, 0.11, physicalMaterial(palette.body, { roughness: 0.17, metalness: 0.84 }));
  group.add(body);
  const screen = addScreen(group, width * (isIMac ? 0.9 : 0.94), height * (isIMac ? 0.8 : 0.91), 0.07, texture, { z: 0.08 });
  if (isIMac) {
    const chin = roundedMesh(width * 0.9, height * 0.1, 0.045, 0.025, physicalMaterial(palette.body, { roughness: 0.22, metalness: 0.78 }));
    chin.position.set(0, -height * 0.39, 0.11);
    group.add(chin);
  }
  const neck = roundedMesh(isIMac ? 0.17 : 0.15, isIMac ? 0.62 : isStudio ? 0.58 : 0.66, 0.15, 0.05, physicalMaterial(palette.metal, { roughness: 0.3, metalness: 0.72 }));
  neck.position.y = isIMac ? -1.1 : isStudio ? -1.12 : -1.13;
  group.add(neck);
  const foot = roundedMesh(isIMac ? 0.88 : isStudio ? 0.98 : 0.82, 0.08, isIMac ? 0.56 : 0.52, 0.04, physicalMaterial(palette.metal, { roughness: 0.26, metalness: 0.78 }));
  foot.position.set(0, isIMac ? -1.42 : isStudio ? -1.44 : -1.45, 0.08);
  group.add(foot);
  return { group, materials: { body, screen: screen.screen, glass: screen.glass } };
}

function createVisionPro(texture, finish) {
  const palette = finishPalette[finish] || finishPalette.White;
  const group = new THREE.Group();
  const visor = roundedMesh(1.68, 0.86, 0.34, 0.22, physicalMaterial(0x2b373c, { roughness: 0.12, metalness: 0.56, clearcoat: 0.92, clearcoatRoughness: 0.06 }));
  visor.position.z = 0.02;
  group.add(visor);
  const cushion = roundedMesh(1.73, 0.72, 0.12, 0.2, physicalMaterial(0x171b1d, { roughness: 0.6, metalness: 0.08 }));
  cushion.position.z = -0.17;
  group.add(cushion);
  const lensMaterial = new THREE.MeshPhysicalMaterial({ color: 0x31515d, map: texture, roughness: 0.11, metalness: 0.24, clearcoat: 1, clearcoatRoughness: 0.04 });
  const lensCover = new THREE.MeshPhysicalMaterial({ color: 0x142126, transparent: true, opacity: 0.32, roughness: 0.04, metalness: 0.22, transmission: 0.18, clearcoat: 1 });
  for (const x of [-0.43, 0.43]) {
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.08, 36), lensMaterial);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(x, 0, 0.22);
    group.add(lens);
    const cover = new THREE.Mesh(new THREE.CircleGeometry(0.285, 36), lensCover);
    cover.position.set(x, 0, 0.265);
    group.add(cover);
  }
  const bridge = roundedMesh(0.28, 0.16, 0.18, 0.055, physicalMaterial(palette.metal, { roughness: 0.22, metalness: 0.82 }));
  bridge.position.set(0, 0.01, 0.2);
  group.add(bridge);
  const sideMaterial = physicalMaterial(palette.metal, { roughness: 0.3, metalness: 0.72 });
  for (const x of [-0.91, 0.91]) {
    const arm = roundedMesh(0.2, 0.34, 0.34, 0.08, sideMaterial);
    arm.position.set(x, -0.02, -0.04);
    group.add(arm);
  }
  const headBand = roundedMesh(2.25, 0.27, 0.13, 0.1, physicalMaterial(0x343a3c, { roughness: 0.46, metalness: 0.24 }));
  headBand.position.set(0, -0.03, -0.29);
  group.add(headBand);
  return { group, materials: { body: visor, screen: { material: lensMaterial }, glass: { material: lensCover } } };
}

function createWatch(texture, finish) {
  const palette = finishPalette[finish] || finishPalette.White;
  const group = new THREE.Group();
  const strap = roundedMesh(0.52, 2.28, 0.1, 0.15, physicalMaterial(0x45494a, { roughness: 0.42, metalness: 0.32 }));
  group.add(strap);
  const body = roundedMesh(0.98, 1.12, 0.22, 0.23, physicalMaterial(palette.body, { roughness: 0.2, metalness: 0.78 }));
  group.add(body);
  const screen = addScreen(group, 0.81, 0.92, 0.085, texture, { z: 0.105 });
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.11, 20), physicalMaterial(palette.metal, { roughness: 0.2, metalness: 0.88 }));
  crown.rotation.z = Math.PI / 2;
  crown.position.set(0.54, 0.18, 0.02);
  group.add(crown);
  return { group, materials: { body, screen: screen.screen, glass: screen.glass } };
}

function createProceduralDevice(mockup, texture, finish) {
  if (mockup.includes("MacBook")) return createLaptop(mockup, texture, finish);
  if (mockup === "iMac 24\"") return createDisplay(texture, finish, "imac");
  if (mockup === "Studio Display") return createDisplay(texture, finish, "studio");
  if (mockup === "XDR Display") return createDisplay(texture, finish);
  if (mockup === "Apple Vision Pro") return createVisionPro(texture, finish);
  if (mockup.includes("Watch")) return createWatch(texture, finish);
  const result = createPhone(mockup, texture, finish);
  return result;
}

function normalizeObject(object, target = 2.22) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  object.position.sub(center);
  const maxDimension = Math.max(size.x, size.y, size.z) || 1;
  object.scale.setScalar(target / maxDimension);
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
  if (mockup === "iPhone 17" || mockup.includes("iPhone") || mockup.includes("Watch") || mockup === "iPad Pro" || mockup === "iPad mini") return 1.58;
  if (mockup === "Flat") return 1.85;
  if (mockup === "XDR Display" || mockup === "iMac 24\"" || mockup === "Studio Display") return 1.72;
  if (mockup === "Apple Vision Pro") return 1.48;
  if (mockup.includes("MacBook")) return 1.85;
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

function applyLoadedModelMaterials(model, finish, reflection, screenTexture) {
  const palette = finishPalette[finish] || finishPalette.White;
  model.traverse((object) => {
    if (!object.isMesh || !object.material) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      let activeMaterial = material;
      const isScreen = object.userData?.ultramonkRole === "proDisplayScreen";
      if (screenTexture && isScreen && material.map !== screenTexture) {
        const screenMaterial = new THREE.MeshBasicMaterial({ map: screenTexture, color: 0xffffff });
        screenMaterial.needsUpdate = true;
        activeMaterial = screenMaterial;
        object.material = Array.isArray(object.material) ? object.material.map((item) => item === material ? screenMaterial : item) : screenMaterial;
      }
      activeMaterial.envMapIntensity = 0.72;
      if ("roughness" in activeMaterial) activeMaterial.roughness = Math.max(0.08, Number(reflection?.roughness) || 0.28);
      if ("clearcoat" in activeMaterial) activeMaterial.clearcoat = 0.72;
      if (activeMaterial.color && !isScreen) {
        activeMaterial.userData.baseColor ||= activeMaterial.color.clone();
        activeMaterial.color.copy(activeMaterial.userData.baseColor);
        const sourceHsl = activeMaterial.userData.baseColor.getHSL({ h: 0, s: 0, l: 0 });
        if (sourceHsl.s > 0.08) activeMaterial.color.setHex(palette.body);
        else if (finish !== "White") activeMaterial.color.lerp(new THREE.Color(palette.body), 0.17);
      }
    });
    object.castShadow = true;
    object.receiveShadow = true;
  });
}

function updateProceduralMaterials(runtime, finish, reflection) {
  const palette = finishPalette[finish] || finishPalette.White;
  const { body, screen, glass } = runtime.materials || {};
  if (body?.material?.color) body.material.color.setHex(palette.body);
  if (screen?.material) {
    screen.material.roughness = Math.max(0.12, Number(reflection?.roughness) || 0.23);
    screen.material.clearcoat = 0.82;
  }
  if (glass?.material) glass.material.opacity = 0.08 + (Number(reflection?.amount) || 0.22) * 0.22;
}

export function ThreeStage({ mockup = "iPhone 17", cameraState, cameraPreset = "Angled", lighting, lightRotation, contactShadow = false, finish, reflection, enabled = true, isDark = false, effects = [], media = null, onReady = () => {} }) {
  const canvasRef = useRef(null);
  const runtimeRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled || !canvasRef.current) return undefined;
    let disposed = false;
    const canvas = canvasRef.current;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
    } catch {
      setFailed(true);
      setReady(false);
      onReady(false);
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
    const runtime = { renderer, scene, camera, root, key, rim, fill, ground, model: null, materials: null, screenTexture, disposables };
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

    const finishSetup = (result) => {
      if (disposed) return;
      normalizeObject(result.group || result, fitTarget(mockup));
      runtime.model = result.group || result;
      runtime.materials = result.materials || null;
      root.add(runtime.model);
      enableModelShadows(runtime.model);
      placeGround(ground, runtime.model);
      setFailed(false);
      setReady(true);
      onReady(true);
    };

    if (mockup === "iPhone 17") {
      const ktx2Loader = new KTX2Loader().setTranscoderPath("/assets/basis/");
      runtime.ktx2Loader = ktx2Loader;
      try {
        ktx2Loader.detectSupport(renderer);
        const loader = new GLTFLoader().setKTX2Loader(ktx2Loader).setMeshoptDecoder(MeshoptDecoder);
        loader.load(modelUrl, (gltf) => {
          if (disposed) return;
          normalizeObject(gltf.scene, fitTarget(mockup));
          runtime.model = gltf.scene;
          root.add(runtime.model);
          placeGround(ground, runtime.model);
          applyLoadedModelMaterials(runtime.model, finish, reflection, screenTexture);
          setFailed(false);
          setReady(true);
          onReady(true);
        }, undefined, () => {
          if (!disposed) finishSetup(createProceduralDevice(mockup, screenTexture, finish));
        });
      } catch {
        finishSetup(createProceduralDevice(mockup, screenTexture, finish));
      }
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
      renderer.render(scene, camera);
    };
    render();
    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      runtimeRef.current = null;
      runtime.ktx2Loader?.dispose();
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
      onReady(false);
    };
  }, [enabled, mockup, media?.src, media?.type, onReady]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    const { camera, model, root, key, rim, fill, ground, renderer } = runtime;
    const cameraData = cameraState || {};
    camera.fov = Number(cameraData.fov) || 24;
    camera.zoom = Math.max(0.5, Math.min(2.2, (Number(cameraData.zoom) || 1.9) / 1.9));
    const tallViewport = runtime.renderer.domElement.clientHeight / Math.max(1, runtime.renderer.domElement.clientWidth) > 1.2;
    const displayMockup = mockup === "XDR Display" || mockup === "iMac 24\"" || mockup === "Studio Display";
    const baseCameraZ = mockup === "Flat" ? 4.05 : mockup.includes("MacBook") || displayMockup ? 3.8 : mockup === "Apple Vision Pro" ? 3.35 : 3.5;
    camera.position.z = baseCameraZ * (tallViewport ? 1.18 : 1);
    camera.position.y = mockup.includes("MacBook") ? 0.58 : 0;
    camera.lookAt(0, mockup.includes("MacBook") ? -0.18 : 0, 0);
    camera.updateProjectionMatrix();
    if (root) {
      const xAxis = Number(cameraData.xAxis) || 0;
      const yAxis = Number(cameraData.yAxis) || 0;
      const zAxis = Number(cameraData.zAxis) || 0;
      const rollFactor = mockup === "Flat" ? 0 : mockup.includes("MacBook") || displayMockup ? 0.14 : mockup === "Apple Vision Pro" ? 0.08 : mockup.includes("Watch") ? 0.34 : mockup === "iPad Pro" || mockup === "iPad mini" ? 0.28 : 0.65;
      const turnFactor = mockup === "iPhone 17" ? -0.75 : 0.22;
      if (cameraPreset === "Back" && mockup === "iPhone 17") {
        root.rotation.set(THREE.MathUtils.degToRad(8), Math.PI - THREE.MathUtils.degToRad(10), 0);
      } else {
        root.rotation.set(
          mockup === "Flat" ? 0 : THREE.MathUtils.degToRad(yAxis) * 0.25,
          mockup === "Flat" ? 0 : THREE.MathUtils.degToRad(xAxis) * turnFactor + THREE.MathUtils.degToRad(zAxis) * 0.3,
          -THREE.MathUtils.degToRad(xAxis) * rollFactor + THREE.MathUtils.degToRad(zAxis) * 0.4,
        );
      }
      root.position.x = (Number(cameraData.panX) || 0) * 0.5;
      const verticalOffset = displayMockup ? -0.2 : mockup.includes("MacBook") ? -0.05 : mockup === "Apple Vision Pro" ? -0.18 : tallViewport ? -0.2 : mockup === "iPhone 17" ? -0.33 : -0.35;
      root.position.y = -(Number(cameraData.panY) || 0) * 0.5 + verticalOffset;
      placeGround(ground, model);
    }
    if (model && !runtime.materials) applyLoadedModelMaterials(model, finish, reflection, runtime.screenTexture);
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
    if (ground?.material) ground.material.opacity = contactShadow ? 0.28 : 0.08;
    renderer.toneMappingExposure = effects.includes("Bloom") ? 1.16 : isDark ? 0.8 : lighting === "Warm Glow" ? 1.08 : 1.02;
  }, [cameraState, cameraPreset, lighting, lightRotation, contactShadow, finish, reflection, isDark, effects, mockup, ready]);

  return <canvas ref={canvasRef} className={`three-stage-canvas ${ready && !failed ? "is-ready" : ""}`} aria-hidden="true" data-renderer-status={failed ? "fallback" : ready ? "ready" : "loading"} />;
}
