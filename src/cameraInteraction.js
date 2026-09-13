import { Euler, Matrix4, Quaternion, Vector3, MathUtils } from "three";
import { clamp, deviceArchetype } from "./editorState.js";

const radians = MathUtils.degToRad;
const degrees = MathUtils.radToDeg;
export const DRAG_DEGREES_PER_PIXEL = 0.24;

// Keep the existing serialized poses and preset compositions. Gestures work
// in view space and convert back to these coordinates only at the boundary.
export function devicePoseConfig(mockup, preset) {
  const arch = deviceArchetype(mockup);
  const phone = arch === "phone" || arch === "foldable";
  const tablet = arch === "tablet" || arch === "ereader";
  const display = ["display", "tv", "browser"].includes(arch);
  const back = preset === "Back" && (phone || tablet || ["watch", "handheld"].includes(arch));
  return {
    flat: arch === "flat",
    yawSign: phone ? -1 : 1,
    rollFactor: arch === "flat" ? 0 : arch === "laptop" || display ? 0.1 : arch === "headset" ? 0.03 : arch === "watch" ? 0.22 : tablet ? 0.18 : arch === "handheld" ? 0.3 : arch === "foldable" ? (mockup.includes("Flip") ? 0.6 : 0.32) : 0.65,
    basePitch: back ? 8 : 0,
    baseYaw: back ? 180 : 0,
  };
}

export function deviceRotation(camera, mockup, preset) {
  const config = devicePoseConfig(mockup, preset);
  return new Euler(
    radians(config.flat ? 0 : config.basePitch + (Number(camera.yAxis) || 0)),
    radians(config.flat ? 0 : config.baseYaw + (Number(camera.xAxis) || 0) * config.yawSign),
    radians((Number(camera.zAxis) || 0) - (Number(camera.xAxis) || 0) * config.rollFactor),
    "YXZ",
  );
}

export function stageCameraView(mockup, tall = false) {
  const arch = deviceArchetype(mockup);
  const display = ["display", "tv", "browser"].includes(arch);
  const z = arch === "flat" ? 4.35 : arch === "laptop" ? 4.5 : arch === "tv" ? 4.75 : display ? 4.3 : ["headset", "watch"].includes(arch) ? 3.9 : ["tablet", "ereader"].includes(arch) ? 4.05 : arch === "handheld" ? 4.1 : arch === "foldable" ? 3.95 : 3.62;
  const position = new Vector3(0, arch === "laptop" ? 0.48 : display ? 0.1 : 0.04, z * (tall ? 1.14 : 1));
  const target = new Vector3(0, arch === "laptop" ? -0.16 : 0, 0);
  const quaternion = new Quaternion().setFromRotationMatrix(new Matrix4().lookAt(position, target, new Vector3(0, 1, 0)));
  return { position, target, quaternion };
}

const nearAngle = (angle, reference) => angle + 360 * Math.round((reference - angle) / 360);
const withinSlider = (angle) => angle > 360 || angle < -360 ? ((angle + 180) % 360 + 360) % 360 - 180 : angle;

export function cameraFromRotation(rotation, camera, mockup, preset) {
  const config = devicePoseConfig(mockup, preset);
  const euler = new Euler().setFromQuaternion(rotation, "YXZ");
  const reference = deviceRotation(camera, mockup, preset);
  // Euler angles have two equivalent representations. Choose the nearest
  // one so the sliders remain continuous through a pole or a full turn.
  const candidates = [
    [degrees(euler.x), degrees(euler.y), degrees(euler.z)],
    [180 - degrees(euler.x), degrees(euler.y) + 180, degrees(euler.z) + 180],
  ].map((angles) => angles.map((angle, i) => nearAngle(angle, degrees([reference.x, reference.y, reference.z][i]))));
  const distance = (angles) => angles.reduce((sum, angle, i) => sum + (angle - degrees([reference.x, reference.y, reference.z][i])) ** 2, 0);
  const [pitch, yaw, roll] = candidates.sort((a, b) => distance(a) - distance(b))[0];
  const xAxis = withinSlider((yaw - config.baseYaw) / config.yawSign);
  return { xAxis, yAxis: withinSlider(pitch - config.basePitch), zAxis: withinSlider(roll + xAxis * config.rollFactor) };
}

// A straight stroke rotates around the screen's axes, regardless of the
// device family, existing roll, front/back view, or number of pointer events.
export function rotateCamera(camera, mockup, preset, dx, dy, { roll = false, tall = false, precision = false } = {}) {
  const scale = DRAG_DEGREES_PER_PIXEL * (precision ? 0.2 : 1);
  const config = devicePoseConfig(mockup, preset);
  if (config.flat) return { zAxis: withinSlider((Number(camera.zAxis) || 0) - dx * scale) };
  const axis = roll ? new Vector3(0, 0, -dx) : new Vector3(dy, dx, 0);
  const angle = radians(axis.length() * scale);
  if (!angle) return { xAxis: camera.xAxis, yAxis: camera.yAxis, zAxis: camera.zAxis };
  axis.normalize().applyQuaternion(stageCameraView(mockup, tall).quaternion);
  const rotation = new Quaternion().setFromEuler(deviceRotation(camera, mockup, preset));
  rotation.premultiply(new Quaternion().setFromAxisAngle(axis, angle));
  return cameraFromRotation(rotation, camera, mockup, preset);
}

// Pan is a fraction of the viewport's half-size. This makes the device
// follow the pointer at every viewport size, field of view and zoom level.
export function moveCamera(camera, dx, dy, bounds, precision = false) {
  const scale = precision ? 0.2 : 1;
  return {
    panX: clamp((Number(camera.panX) || 0) + 2 * dx / Math.max(1, bounds.width) * scale, -1, 1),
    panY: clamp((Number(camera.panY) || 0) + 2 * dy / Math.max(1, bounds.height) * scale, -1, 1),
  };
}

export function zoomCamera(camera, delta, precision = false) {
  return { zoom: clamp((Number(camera.zoom) || 1.9) * Math.exp(-delta * 0.003 * (precision ? 0.2 : 1)), 0.5, 4) };
}
