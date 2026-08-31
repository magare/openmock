import test from "node:test";
import assert from "node:assert/strict";
import {
  cameraPresets,
  createDefaultProject,
  formatTime,
  getSerializableProject,
  hydrateProject,
  clamp,
  slugify,
  templatePatch,
  templateItems,
  mockupOptions,
  sceneOptions,
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
