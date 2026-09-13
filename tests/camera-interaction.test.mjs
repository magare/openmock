import test from "node:test";
import assert from "node:assert/strict";
import { Quaternion, Vector3, MathUtils } from "three";
import { cameraPresets, mockupOptions } from "../src/editorState.js";
import { deviceRotation, rotateCamera, moveCamera, zoomCamera, stageCameraView } from "../src/cameraInteraction.js";

const pose = (camera, mockup, preset) => new Quaternion().setFromEuler(deviceRotation(camera, mockup, preset));
const near = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-6, `${message}: ${actual} vs ${expected}`);

test("horizontal, vertical and roll strokes follow the screen for every 3D device and pose", () => {
  for (const [mockup] of mockupOptions) {
    if (mockup === "Flat") continue;
    for (const preset of ["Flat", "Angled", "Back"]) {
      for (const rolled of [false, true]) {
        const camera = { ...cameraPresets[preset], ...(rolled ? { xAxis: 173, yAxis: 124, zAxis: -87 } : {}) };
        for (const tall of [false, true]) {
          for (const [dx, dy, roll, axis] of [[80, 0, false, [0, 1, 0]], [0, 80, false, [1, 0, 0]], [80, 0, true, [0, 0, -1]]]) {
            const before = pose(camera, mockup, preset);
            const next = { ...camera, ...rotateCamera(camera, mockup, preset, dx, dy, { roll, tall }) };
            const after = pose(next, mockup, preset);
            const view = stageCameraView(mockup, tall).quaternion;
            const delta = view.clone().invert().multiply(after).multiply(before.clone().invert()).multiply(view);
            const expected = new Quaternion().setFromAxisAngle(new Vector3(...axis), MathUtils.degToRad(19.2));
            near(Math.abs(delta.dot(expected)), 1, `${mockup} ${preset} screen axis ${axis}`);
            assert.ok([next.xAxis, next.yAxis, next.zAxis].every((value) => Number.isFinite(value) && Math.abs(value) <= 360));
          }
        }
      }
    }
  }
});

test("returning to the drag origin restores the pose; Fine reduces angular movement fivefold", () => {
  const camera = cameraPresets.Angled;
  const origin = rotateCamera(camera, "iPhone 17", "Angled", 0, 0);
  assert.equal(origin.xAxis, camera.xAxis);
  assert.equal(origin.yAxis, camera.yAxis);
  assert.equal(origin.zAxis, camera.zAxis);
  const start = pose(camera, "iPhone 17", "Angled");
  const end = pose({ ...camera, ...rotateCamera(camera, "iPhone 17", "Angled", 100, 0, { precision: true }) }, "iPhone 17", "Angled");
  near(MathUtils.radToDeg(start.angleTo(end)), 4.8, "fine angle");
});

test("repeated drags continue through full turns and vertical poles", () => {
  for (const [dx, dy] of [[150, 0], [0, 150], [95, 70]]) {
    let camera = { ...cameraPresets.Flat };
    for (let turn = 0; turn < 40; turn += 1) {
      const before = pose(camera, "iPhone 16", "Flat");
      camera = { ...camera, ...rotateCamera(camera, "iPhone 16", "Flat", dx, dy) };
      const after = pose(camera, "iPhone 16", "Flat");
      near(MathUtils.radToDeg(before.angleTo(after)), Math.hypot(dx, dy) * 0.24, "continues moving");
    }
  }
});

test("Move tracks pixels consistently across viewport sizes and zoom levels", () => {
  for (const bounds of [{ width: 1200, height: 700 }, { width: 350, height: 600 }]) {
    for (const zoom of [0.5, 1.9, 4]) {
      const camera = { panX: 0, panY: 0, zoom };
      const next = moveCamera(camera, 60, -30, bounds);
      near(next.panX * bounds.width / 2, 60, "horizontal pixel travel");
      near(next.panY * bounds.height / 2, -30, "vertical pixel travel");
      near(moveCamera(camera, 60, -30, bounds, true).panX, next.panX / 5, "fine travel");
    }
  }
});

test("zoom is proportional, reversible, bounded and independent of camera rotation", () => {
  const camera = { ...cameraPresets.Angled };
  const closer = zoomCamera(camera, -100);
  assert.ok(closer.zoom > camera.zoom);
  assert.deepEqual(Object.keys(closer), ["zoom"]);
  near(zoomCamera(closer, 100).zoom, camera.zoom, "opposite scroll restores zoom");
  assert.equal(zoomCamera(camera, -10000).zoom, 4);
  assert.equal(zoomCamera(camera, 10000).zoom, 0.5);
});
