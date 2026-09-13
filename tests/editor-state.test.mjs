import test from "node:test";
import assert from "node:assert/strict";
import {
  CAMERA_AXIS_MAX,
  CAMERA_AXIS_MIN,
  cameraPresets,
  createDefaultProject,
  blurAtTime,
  cameraAtTime,
  composeAutoMotionKeyframes,
  easeValue,
  formatTime,
  getSerializableProject,
  hydrateProject,
  clamp,
  slugify,
  templatePatch,
  templateItems,
  scenePatch,
  sceneOptions,
  mockupOptions,
  deviceArchetype,
  deviceGroup,
  isAndroidMockup,
  effectOptions,
} from "../src/editorState.js";

test("creates a source-shaped default project", () => {
  const project = createDefaultProject();

  assert.equal(project.viewportRatio, "Fill");
  assert.equal(project.mockup, "iPhone 17");
  assert.equal(project.cameraPreset, "Angled");
  assert.deepEqual(project.camera, cameraPresets.Angled);
  assert.equal(project.tracks.length, 2);
  assert.equal(project.tracks[0].keyframes.length, 4);
  assert.equal(project.timeline.mode, "advanced");
  assert.equal(project.export.format, "jpg");
  assert.equal(templateItems.length, 17);
});

test("exposes the additional free device mockups", () => {
  const names = new Set(mockupOptions.map(([name]) => name));
  for (const name of ["iPad mini", "iMac 24\"", "Studio Display", "Apple Vision Pro"]) {
    assert.equal(names.has(name), true);
    const option = mockupOptions.find(([optionName]) => optionName === name);
    assert.deepEqual(option.slice(1), ["FREE", false]);
  }
});

test("keeps every catalog and export capability available for free", () => {
  assert.equal(templateItems.every(([, , locked]) => locked === false), true);
  assert.equal(sceneOptions.every(([, , locked]) => locked === false), true);
  assert.equal(mockupOptions.every(([, tag, locked]) => tag === "FREE" && locked === false), true);
  assert.equal(effectOptions.includes("Depth"), true);
  assert.equal(effectOptions.includes("Ghost"), true);

  const project = createDefaultProject();
  assert.equal(project.export.watermark, false);
  assert.equal(project.export.videoOrientation, "Landscape");
});

test("keeps editor utility values predictable", () => {
  assert.equal(formatTime(0), "00:00.0");
  assert.equal(formatTime(1.87), "00:01.8");
  assert.equal(formatTime(-3), "00:00.0");
  assert.equal(slugify('MacBook Pro 14"'), "macbook-pro-14");
  assert.equal(clamp(4, 0, 2), 2);
  assert.equal(clamp(-1, 0, 2), 0);
  assert.equal(clamp("1.5", 0, 2), 1.5);
});

test("keeps full-turn manual axis controls", () => {
  assert.equal(CAMERA_AXIS_MIN, -360);
  assert.equal(CAMERA_AXIS_MAX, 360);
});

test("template patches carry functional camera, scene, and effect changes", () => {
  assert.deepEqual(templatePatch("Flat look").camera, cameraPresets.Flat);
  assert.equal(templatePatch("Flat look").mockup, "Flat");
  assert.equal(templatePatch("Dark Room Macbook").lighting, "Dark Rim");
  assert.equal(templatePatch("Concrete Macbook").mockup, "MacBook Neo");
  assert.deepEqual(templatePatch("Violet Glass").effects, ["Glass Border"]);
  assert.deepEqual(templatePatch("Unknown template"), {});
});

test("hydrates partial persisted state without dropping defaults", () => {
  const project = hydrateProject({
    camera: { xAxis: 12 },
    background: { tab: "Color", color: "#ff00aa" },
    timeline: { playhead: 3.2 },
    effectSettings: { Grain: 42 },
  });

  assert.equal(project.camera.xAxis, 12);
  assert.equal(project.camera.fov, cameraPresets.Angled.fov);
  assert.equal(project.background.tab, "Color");
  assert.equal(project.background.image, "Whisp");
  assert.equal(project.timeline.playhead, 3.2);
  assert.equal(project.timeline.duration, 6);
  assert.equal(project.effectSettings.Grain, 42);
  assert.equal(project.effectSettings.Vignette, 20);
  assert.equal(project.tracks.length, 2);
});

test("serializes local project state without persisting object URLs", () => {
  const project = createDefaultProject();
  project.media = { name: "screen.png", type: "image/png", src: "blob:http://localhost/example" };
  assert.equal(getSerializableProject(project).media, null);

  project.media = { name: "screen.png", type: "image/png", src: "data:image/png;base64,abc" };
  assert.deepEqual(getSerializableProject(project).media, project.media);
});

test("scene presets apply their lighting and background environment", () => {
  const values = new Set(sceneOptions.map(([, , , value]) => value));
  for (const value of ["custom", "dark-room", "concrete", "studio"]) {
    assert.equal(values.has(value), true);
  }

  assert.deepEqual(scenePatch("custom"), {});

  const darkRoom = scenePatch("dark-room");
  assert.equal(darkRoom.lighting, "Dark Rim");
  assert.equal(darkRoom.contactShadow, true);
  assert.equal(darkRoom.background.tab, "Color");
  assert.equal(darkRoom.background.color, "#0b0c0d");

  const concrete = scenePatch("concrete");
  assert.equal(concrete.lighting, "Default");
  assert.equal(concrete.background.tab, "Preset");
  assert.equal(concrete.background.preset, "Metal");

  const studio = scenePatch("studio");
  assert.equal(studio.lighting, "Studio Soft");
  assert.equal(studio.background.tab, "Image");
  assert.equal(studio.background.image, "Whisp");
  assert.equal(studio.contactShadow, false);

  assert.deepEqual(scenePatch("unknown-scene"), {});
});

test("easing curves stay within the unit range", () => {
  assert.equal(easeValue(0, "Linear"), 0);
  assert.equal(easeValue(1, "Ease in out"), 1);
  assert.equal(easeValue(0.5, "Linear"), 0.5);
  assert.equal(easeValue(0.5, "Ease in"), 0.25);
  assert.equal(easeValue(0.5, "Ease out"), 0.75);
  assert.equal(easeValue(0.5, "Ease in out"), 0.5);
  assert.equal(easeValue(2, "Linear"), 1);
  assert.equal(easeValue(-1, "Ease in"), 0);
});

test("cameraAtTime interpolates the active track between keyframes", () => {
  const project = createDefaultProject();
  const start = { ...cameraPresets.Angled };
  project.tracks = [{
    id: "shot-1",
    name: "Shot 1",
    kind: "scene",
    duration: 4,
    selected: true,
    keyframes: [
      { id: "a", time: 0, camera: { ...start, xAxis: 0, zoom: 1 }, easing: "Linear" },
      { id: "b", time: 4, camera: { ...start, xAxis: 100, zoom: 3 }, easing: "Ease in out" },
    ],
  }];
  project.activeTrackId = "shot-1";

  assert.equal(cameraAtTime(project, 0).xAxis, 0);
  assert.equal(cameraAtTime(project, 4).xAxis, 100);
  assert.equal(cameraAtTime(project, 2).xAxis, 50);
  assert.equal(cameraAtTime(project, 2).zoom, 2);
  // Beyond the last keyframe the end pose holds.
  assert.equal(cameraAtTime(project, 9).xAxis, 100);
  // The playback camera keeps unrelated live camera properties.
  assert.equal(cameraAtTime(project, 2).fov, start.fov);
});

test("cameraAtTime falls back to the live camera without keyframes", () => {
  const project = createDefaultProject();
  project.tracks = [{ id: "shot-1", name: "Shot 1", kind: "scene", duration: 4, selected: true, keyframes: [] }];
  project.activeTrackId = "shot-1";
  assert.equal(cameraAtTime(project, 2), project.camera);
});

test("blurAtTime interpolates recorded focus pulls", () => {
  const project = createDefaultProject();
  project.tracks = [{
    id: "shot-1",
    keyframes: [
      { id: "a", time: 0, camera: { ...project.camera }, blur: { ...project.blur, strength: 0, size: 0.2, x: 0.2, y: 0.3, mode: "radial" }, easing: "Linear" },
      { id: "b", time: 4, camera: { ...project.camera }, blur: { ...project.blur, strength: 80, size: 0.8, x: 0.8, y: 0.7, mode: "tilt" }, easing: "Linear" },
    ],
  }];
  project.activeTrackId = "shot-1";

  const halfway = blurAtTime(project, 2);
  assert.equal(halfway.strength, 40);
  assert.equal(halfway.size, 0.5);
  assert.equal(halfway.x, 0.5);
  assert.equal(halfway.y, 0.5);
  assert.equal(halfway.mode, "tilt");
});

test("Auto-motion requires a path and respects 2D versus 3D motion", () => {
  const project = createDefaultProject();
  const oneArea = [{ x: 10, y: 20, width: 20, height: 20 }];
  assert.deepEqual(composeAutoMotionKeyframes({ areas: oneArea, camera: project.camera, blur: project.blur }), []);

  const areas = [...oneArea, { x: 70, y: 60, width: 20, height: 20 }];
  const twoDimensional = composeAutoMotionKeyframes({ areas, camera: project.camera, blur: project.blur, duration: 8, motionType: "2d" });
  assert.equal(twoDimensional.length, 2);
  assert.equal(twoDimensional[0].time, 0);
  assert.equal(twoDimensional[1].time, 8);
  assert.equal(twoDimensional[0].camera.xAxis, project.camera.xAxis);
  assert.notEqual(twoDimensional[0].camera.panX, twoDimensional[1].camera.panX);
  assert.notEqual(twoDimensional[0].blur.x, twoDimensional[1].blur.x);

  const threeDimensional = composeAutoMotionKeyframes({ areas, camera: project.camera, blur: project.blur, duration: 4, motionType: "3d" });
  assert.notEqual(threeDimensional[0].camera.xAxis, project.camera.xAxis);
  assert.equal(threeDimensional[1].time, 4);
});

test("maps every catalog mockup onto a device archetype", () => {
  const names = mockupOptions.map(([name]) => name);
  assert.equal(new Set(names).size, names.length, "catalog names must stay unique");
  for (const name of names) assert.equal(typeof deviceArchetype(name), "string", name);

  assert.equal(deviceArchetype("iPhone 16"), "phone");
  assert.equal(deviceArchetype("iPhone 17 Air"), "phone");
  assert.equal(deviceArchetype("Galaxy S26+"), "phone");
  assert.equal(deviceArchetype("Galaxy Z Fold 8"), "foldable");
  assert.equal(deviceArchetype("Galaxy Z Flip 8"), "foldable");
  assert.equal(deviceArchetype("Apple Watch SE 3"), "watch");
  assert.equal(deviceArchetype("Galaxy Watch 8"), "watch");
  assert.equal(deviceArchetype("Pixel Watch 4"), "watch");
  assert.equal(deviceArchetype("Galaxy Tab S11 Ultra"), "tablet");
  assert.equal(deviceArchetype("iPad Air 13\""), "tablet");
  assert.equal(deviceArchetype("Kindle Paperwhite"), "ereader");
  assert.equal(deviceArchetype("Nintendo Switch 2"), "handheld");
  assert.equal(deviceArchetype("Steam Deck"), "handheld");
  assert.equal(deviceArchetype("TV 65\""), "tv");
  assert.equal(deviceArchetype("Surface Laptop 15\""), "laptop");
  assert.equal(deviceArchetype("Dell XPS 16"), "laptop");
  assert.equal(deviceArchetype("Apple Vision Pro"), "headset");
  assert.equal(deviceArchetype("Flat"), "flat");
});

test("groups the picker catalog into labeled sections", () => {
  const groups = mockupOptions.map(([name]) => deviceGroup(name));
  assert.equal(groups[0], "Stage");
  assert.equal(groups.filter((label) => label === "Phones").length, 13);
  assert.equal(groups.filter((label) => label === "Watches").length, 5);
  assert.equal(groups.at(-1), "Spatial");
  assert.equal(new Set(groups).size < groups.length, true);
});

test("flags Samsung and Google devices for punch-hole and round-watch rendering", () => {
  for (const name of ["Galaxy S26", "Galaxy S26+", "Galaxy S26 Ultra", "Galaxy Z Fold 8", "Galaxy Z Flip 8", "Galaxy Tab S11 Ultra", "Galaxy Watch 8", "Pixel 10", "Pixel 10 Pro", "Pixel 10 Pro XL", "Pixel Watch 4"]) {
    assert.equal(isAndroidMockup(name), true, name);
  }
  for (const name of ["iPhone 16", "iPhone 17", "iPhone 17 Pro Max", "iPad Pro", "Apple Watch Ultra 3", "MacBook Neo", "Surface Laptop 15\"", "Flat"]) {
    assert.equal(isAndroidMockup(name), false, name);
  }
});
