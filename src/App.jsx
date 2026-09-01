import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  Aperture, BookOpen, Box, Camera, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp,
  CircleHelp, CircleStop, Diamond, ExternalLink, Film, Gamepad2, GripVertical, HelpCircle, ImagePlus,
  Info, Laptop, Layers3, Maximize2, Menu, Minimize2, Moon, MoreHorizontal,
  Move3d, MousePointer2, Music2, Palette, PanelLeft, PanelTop, Pause, Play, Plus, Redo2,
  RefreshCw, RotateCcw, Scan, Send, Settings2, Smartphone, Sparkles, Sun, SunMedium,
  TextCursorInput, Trash2, Tv, Undo2, Upload, Wand2, Watch, X, ZoomIn
} from "lucide-react";
import { ThreeStage } from "./ThreeStage.jsx";
import {
  appStoreOptions, backgroundAssetMap, blurAtTime, cameraAtTime, cameraPresets, clamp, composeAutoMotionKeyframes, createDefaultProject,
  CAMERA_AXIS_MAX, CAMERA_AXIS_MIN, deviceArchetype, deviceGroup, effectOptions, finishOptions, formatTime, getSerializableProject, hydrateProject,
  imageOptions, isAndroidMockup, lightingOptions, mockupOptions, presetBackgrounds, presetOptions,
  ratioOptions, ROTATION_DRAG_SCALE, ROTATION_WHEEL_SCALE, sceneOptions, scenePatch, slugify, templateItems, templatePatch,
  wheelDeltaToDegrees, wheelRotationAxis
} from "./editorState.js";
import { exportImage, exportVideo } from "./exporter.js";

const asset = (path) => `${import.meta.env.BASE_URL}assets/${path}`;

function StageDeviceRealistic({ project, deviceStyle, mockupSlug }) {
  const source = project.media?.src || asset("source/starter-screen.jpg");
  const mediaNode = project.media?.type?.startsWith("video/") ? <video className="starter-screen" src={source} autoPlay muted loop playsInline /> : <img className="starter-screen" src={source} alt="Uploaded product screen" />;
  const common = `mockup-device ${mockupSlug} camera-${slugify(project.cameraPreset)} finish-${slugify(project.finish)}`;
  const arch = deviceArchetype(project.mockup);
  const isLaptop = arch === "laptop";
  const isDisplay = arch === "display";
  const isTV = arch === "tv";
  const isVision = arch === "headset";
  const isWatch = arch === "watch";
  const isTablet = arch === "tablet";
  const isBrowser = arch === "browser";
  const isFoldable = arch === "foldable";
  const isHandheld = arch === "handheld";
  const isEreader = arch === "ereader";
  const isAndroid = isAndroidMockup(project.mockup);
  const isFlat = arch === "flat";
  const effects = project.effects || [];
  const screenEffects = <>
    <div className="screen-sheen" />
    {effects.includes("Glass Border") && <div className="glass-border-effect" style={{ opacity: (project.effectSettings["Glass Border"] || 30) / 100 }} />}
    {effects.includes("Vignette") && <div className="vignette-effect" style={{ opacity: (project.effectSettings.Vignette || 20) / 100 }} />}
    {effects.includes("Grain") && <div className="grain-effect" style={{ opacity: (project.effectSettings.Grain || 14) / 100 }} />}
    {effects.includes("Pixel Grid") && <div className="pixel-grid-effect" />}
    {effects.includes("Chromatic Abb.") && <div className="chromatic-effect" />}
  </>;

  if (isLaptop) return <div className={`${common} device-laptop`} style={deviceStyle}>
    <div className="laptop-screen"><div className="phone-glass">{mediaNode}<span className="laptop-camera" />{screenEffects}</div></div>
    <div className="laptop-base"><div className="laptop-keyboard">{Array.from({ length: 42 }, (_, index) => <i key={index} className={index > 34 && index < 39 ? "wide-key" : ""} />)}<span className="laptop-trackpad" /></div></div>
  </div>;

  if (isDisplay || isTV) return <div className={`${common} device-display ${isTV ? "device-tv" : ""}`} style={deviceStyle}>
    <div className="phone-glass">{mediaNode}<span className="display-camera" />{screenEffects}</div><div className="display-stand" /><div className="display-foot" />
  </div>;

  if (isBrowser) return <div className={`${common} device-browser`} style={deviceStyle}>
    <div className="browser-chrome"><span className="browser-dot browser-dot-red" /><span className="browser-dot browser-dot-amber" /><span className="browser-dot browser-dot-green" /><span className="browser-url" /></div>
    <div className="phone-glass">{mediaNode}{screenEffects}</div>
  </div>;

  if (isVision) return <div className={`${common} device-vision`} style={deviceStyle}>
    <div className="vision-band" /><div className="vision-visor"><div className="vision-lens">{mediaNode}</div><div className="vision-lens">{mediaNode}</div><span className="vision-bridge" /><span className="vision-crown" /></div>
  </div>;

  if (isWatch) return <div className={`${common} device-watch`} style={deviceStyle}>
    <div className="watch-strap watch-strap-top" /><div className="watch-strap watch-strap-bottom" />
    <div className="phone-glass">{mediaNode}{screenEffects}</div><span className="watch-crown" /><span className="watch-action" />
  </div>;

  if (isHandheld) return <div className={`${common} device-handheld`} style={deviceStyle}>
    <div className="handheld-grip handheld-grip-left" /><div className="handheld-grip handheld-grip-right" />
    <div className="phone-glass">{mediaNode}{screenEffects}</div>
  </div>;

  const slabClasses = [
    isTablet ? "tablet-device" : "",
    isEreader ? "ereader-device" : "",
    isFoldable ? (project.mockup.includes("Flip") ? "foldable-device flip-device" : "foldable-device") : "",
    isAndroid ? "android-device" : "",
    isFlat ? "flat-device" : "",
  ].filter(Boolean).join(" ");
  const showRail = !isTablet && !isEreader && !isFlat;
  return <div className={`${common} ${slabClasses}`} style={deviceStyle}>
    {showRail && <div className="phone-side-rail"><img src={asset("source/white-back-panel.png")} alt="" /></div>}
    <div className="phone-glass">{mediaNode}{isAndroid || isFoldable ? <span className="phone-punch-hole" /> : !isTablet && !isEreader && !isFlat ? <span className="phone-top-island" /> : null}{screenEffects}</div>
  </div>;
}

function useMobileViewport() {
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 700);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 700);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return isMobile;
}

function useProjectHistory() {
  const [history, setHistory] = useState(() => {
    try {
      const saved = window.localStorage.getItem("openmock-project");
      return { past: [], present: hydrateProject(saved ? JSON.parse(saved) : null), future: [] };
    } catch {
      return { past: [], present: createDefaultProject(), future: [] };
    }
  });
  const updateProject = useCallback((recipe, { record = true } = {}) => {
    setHistory((current) => {
      const next = typeof recipe === "function" ? recipe(current.present) : { ...current.present, ...recipe };
      // Compare full state: the persistence serializer drops blob-URL media, so
      // using it here would treat every local upload as a no-op change.
      if (JSON.stringify(next) === JSON.stringify(current.present)) return current;
      return { past: record ? [...current.past, current.present].slice(-50) : current.past, present: next, future: record ? [] : current.future };
    });
  }, []);
  const undo = useCallback(() => setHistory((current) => {
    if (!current.past.length) return current;
    const previous = current.past[current.past.length - 1];
    return { past: current.past.slice(0, -1), present: previous, future: [current.present, ...current.future].slice(0, 50) };
  }), []);
  const redo = useCallback(() => setHistory((current) => {
    if (!current.future.length) return current;
    const next = current.future[0];
    return { past: [...current.past, current.present].slice(-50), present: next, future: current.future.slice(1) };
  }), []);
  useEffect(() => {
    try { window.localStorage.setItem("openmock-project", JSON.stringify(getSerializableProject(history.present))); } catch { /* optional */ }
  }, [history.present]);
  return { project: history.present, updateProject, undo, redo, canUndo: history.past.length > 0, canRedo: history.future.length > 0 };
}

function addKeyframe(project, camera, blur = project.blur, time = project.timeline.playhead) {
  const activeId = project.activeTrackId || project.tracks[0]?.id;
  const frameId = `kf-${Date.now()}`;
  let selectedId = frameId;
  return {
    ...project,
    tracks: project.tracks.map((track) => {
      if (track.id !== activeId) return track;
      const frame = { id: frameId, time: Number(time.toFixed(2)), camera: { ...camera }, blur: { ...blur }, easing: "Ease in out" };
      const index = track.keyframes.findIndex((item) => Math.abs(item.time - frame.time) < 0.08);
      const keyframes = index >= 0 ? track.keyframes.map((item, itemIndex) => itemIndex === index ? { ...item, camera: { ...camera }, blur: { ...blur } } : item) : [...track.keyframes, frame].sort((a, b) => a.time - b.time);
      if (index >= 0) selectedId = track.keyframes[index].id;
      return { ...track, keyframes };
    }),
    selectedKeyframeId: selectedId,
  };
}

function getCameraStyle(camera, mockup, cameraPreset) {
  if (mockup === "Flat") return { left: "49%", top: "51%", transform: "translate(-50%,-50%) rotate(0deg) scale(.98)" };
  const xAxis = clamp(Number(camera.xAxis) || 0, CAMERA_AXIS_MIN, CAMERA_AXIS_MAX);
  const yAxis = clamp(Number(camera.yAxis) || 0, CAMERA_AXIS_MIN, CAMERA_AXIS_MAX);
  const zAxis = clamp(Number(camera.zAxis) || 0, CAMERA_AXIS_MIN, CAMERA_AXIS_MAX);
  const arch = deviceArchetype(mockup);
  const phoneMockup = arch === "phone" || arch === "foldable";
  const tabletMockup = arch === "tablet" || arch === "ereader";
  const watchMockup = arch === "watch";
  const laptopMockup = arch === "laptop";
  const displayMockup = arch === "display" || arch === "tv" || arch === "browser";
  const headsetMockup = arch === "headset";
  const handheldMockup = arch === "handheld";
  const rollFactor = laptopMockup || displayMockup ? 0.1 : headsetMockup ? 0.03 : watchMockup ? 0.22 : tabletMockup ? 0.18 : handheldMockup ? 0.3 : arch === "foldable" ? 0.6 : 0.65;
  const backView = cameraPreset === "Back" && (phoneMockup || tabletMockup || watchMockup || handheldMockup);
  const basePitch = backView ? 8 : 0;
  const baseYaw = backView ? 180 : 0;
  const yaw = xAxis * (phoneMockup ? -1 : 1);
  const pitch = basePitch + yAxis;
  const roll = zAxis - xAxis * rollFactor;
  const scale = clamp((Number(camera.zoom) || 1.9) / 1.9, 0.72, 1.36);
  const panX = `${clamp(Number(camera.panX) || 0, -1, 1) * 78}px`;
  const panY = `${clamp(Number(camera.panY) || 0, -1, 1) * 72}px`;
  return { left: `calc(50% + ${panX})`, top: `calc(58% + ${panY})`, transformStyle: "preserve-3d", transform: `translate(-50%,-50%) rotateX(${pitch}deg) rotateY(${baseYaw + yaw}deg) rotateZ(${roll}deg) scale(${1.02 * scale})` };
}

function stageBackground(project) {
  const background = project.background || {};
  if (background.tab === "Color") return { backgroundColor: background.color || "#f2f2f2", backgroundImage: "none" };
  if (background.tab === "Preset") return presetBackgrounds[background.preset] || presetBackgrounds.None;
  return { backgroundColor: "#d9d9d9", backgroundImage: `url(${asset(backgroundAssetMap[background.image] || backgroundAssetMap.Whisp)})` };
}

function IconButton({ label, children, className = "", ...props }) {
  return <button type="button" aria-label={label} title={label} className={`icon-button ${className}`} {...props}>{children}</button>;
}
function TextButton({ children, className = "", ...props }) { return <button type="button" className={`text-button ${className}`} {...props}>{children}</button>; }
function dimensionLabel(value) {
  const match = String(value || "").match(/(\d+)\s*[×x]\s*(\d+)/);
  return match ? `${match[1]} × ${match[2]}` : String(value || "");
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Unable to read this image."));
    reader.readAsDataURL(file);
  });
}

export function App() {
  const isMobileViewport = useMobileViewport();
  const { project, updateProject, undo, redo, canUndo, canRedo } = useProjectHistory();
  const [isDark, setIsDark] = useState(() => window.localStorage.getItem("openmock-theme") === "dark");
  const [reduceMotion, setReduceMotion] = useState(() => window.localStorage.getItem("openmock-reduce-motion") === "1");
  const [showTips, setShowTips] = useState(() => window.localStorage.getItem("openmock-show-tips") !== "0");
  const [popover, setPopover] = useState("");
  const [modal, setModal] = useState("");
  const [toast, setToast] = useState("");
  const [exportTab, setExportTab] = useState("image");
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [mobileControlTab, setMobileControlTab] = useState("camera");
  const [stageHintSeen, setStageHintSeen] = useState(false);
  const [mobileTip, setMobileTip] = useState(() => showTips && isMobileViewport && !window.localStorage.getItem("openmock-mobile-onboarded") ? "welcome" : "");
  const [tourStep, setTourStep] = useState(() => showTips && !isMobileViewport && !window.localStorage.getItem("openmock-tour-seen") ? 1 : 0);
  const [panelSections, setPanelSections] = useState({ source: true, scene: true, lighting: true, background: true, mockup: true, finish: true, reflection: true, camera: true, effects: true });
  const [sceneOpen, setSceneOpen] = useState(false), [lightingOpen, setLightingOpen] = useState(false), [backgroundOpen, setBackgroundOpen] = useState(false), [backgroundPickerOpen, setBackgroundPickerOpen] = useState(false), [mockupOpen, setMockupOpen] = useState(false), [finishOpen, setFinishOpen] = useState(false), [cameraPresetOpen, setCameraPresetOpen] = useState(false), [effectsOpen, setEffectsOpen] = useState(false);
  const [autoAreas, setAutoAreas] = useState([]);
  const stageRef = useRef(null), uploadRef = useRef(null), pointerRef = useRef(null), spaceDownRef = useRef(false);
  const axisHudRef = useRef(null), axisHudTimer = useRef(0);
  const liveMediaUrlsRef = useRef(new Set());

  const notify = useCallback((message) => setToast(message), []);
  // Live on-canvas readout while a stage gesture is driving the camera.
  // Written imperatively so 60Hz gestures don't re-render the editor tree.
  const showAxisHud = useCallback((camera) => {
    setStageHintSeen(true);
    const el = axisHudRef.current;
    if (!el) return;
    const angle = (value) => { const rounded = Math.round(Number(value) || 0); return `${rounded > 0 ? "+" : ""}${rounded}°`; };
    el.querySelector('[data-axis="x"]').textContent = angle(camera.xAxis);
    el.querySelector('[data-axis="y"]').textContent = angle(camera.yAxis);
    el.querySelector('[data-axis="z"]').textContent = angle(camera.zAxis);
    el.querySelector('[data-axis="zoom"]').textContent = `${(Number(camera.zoom) || 0).toFixed(2)}×`;
    el.dataset.active = "1";
    window.clearTimeout(axisHudTimer.current);
    axisHudTimer.current = window.setTimeout(() => { el.dataset.active = ""; }, 900);
  }, []);
  const closePopovers = useCallback(() => { setPopover(""); setSceneOpen(false); setLightingOpen(false); setBackgroundOpen(false); setBackgroundPickerOpen(false); setMockupOpen(false); setFinishOpen(false); setCameraPresetOpen(false); setEffectsOpen(false); }, []);
  const anyPopoverOpen = Boolean(popover || sceneOpen || lightingOpen || backgroundOpen || backgroundPickerOpen || mockupOpen || finishOpen || cameraPresetOpen || effectsOpen);
  useEffect(() => {
    if (!anyPopoverOpen) return undefined;
    const handlePointerDown = (event) => {
      if (event.target.closest(".top-popover, .templates-popover, .export-popover, .topbar, .inspector-panel")) return;
      closePopovers();
    };
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [anyPopoverOpen, closePopovers]);
  useEffect(() => { if (!toast) return undefined; const timer = window.setTimeout(() => setToast(""), 2800); return () => window.clearTimeout(timer); }, [toast]);
  useEffect(() => {
    if (!project.timeline.playing) return undefined;
    const timer = window.setInterval(() => updateProject((current) => {
      const nextTime = Number((current.timeline.playhead + 0.08).toFixed(2));
      if (nextTime >= current.timeline.duration) return { ...current, timeline: { ...current.timeline, playhead: current.timeline.loop ? 0 : current.timeline.duration, playing: current.timeline.loop } };
      return { ...current, timeline: { ...current.timeline, playhead: nextTime } };
    }, { record: false }), 80);
    return () => window.clearInterval(timer);
  }, [project.timeline.playing, project.timeline.loop, updateProject]);

  const handleMediaFile = useCallback(async (file) => {
    if (!file) return;
    if (!file.type?.startsWith("image/") && !file.type?.startsWith("video/")) { notify("Choose an image or video file."); return; }
    if (file.type.startsWith("image/")) {
      try {
        const src = await readFileAsDataUrl(file);
        updateProject((current) => ({ ...current, media: { name: file.name || "Untitled image", type: file.type, src } }));
        notify("Image added and saved with the project.");
      } catch (error) {
        notify(error.message || "This image could not be read.");
      }
      return;
    }
    // Keep superseded blob URLs alive so undoing back to an earlier shot still
    // renders its media; everything is reclaimed when the editor unmounts.
    const url = URL.createObjectURL(file);
    liveMediaUrlsRef.current.add(url);
    updateProject((current) => ({ ...current, media: { name: file.name || "Untitled media", type: file.type, src: url } }));
    notify("Video added for this session. Keep the source file for your next visit.");
  }, [notify, updateProject]);
  useEffect(() => () => { liveMediaUrlsRef.current.forEach((url) => URL.revokeObjectURL(url)); }, []);
  useEffect(() => {
    const handlePaste = (event) => { const file = Array.from(event.clipboardData?.files || []).find((item) => item.type?.startsWith("image/") || item.type?.startsWith("video/")); if (file) { event.preventDefault(); handleMediaFile(file); } };
    window.addEventListener("paste", handlePaste); return () => window.removeEventListener("paste", handlePaste);
  }, [handleMediaFile]);
  useEffect(() => {
    const handleKeyDown = (event) => {
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(event.target?.tagName); const command = event.metaKey || event.ctrlKey;
      if (!typing && event.code === "Space") { spaceDownRef.current = true; event.preventDefault(); return; }
      if (command && event.key.toLowerCase() === "z") { event.preventDefault(); event.shiftKey ? redo() : undo(); return; }
      if (!typing && event.key.toLowerCase() === "t") { updateProject((current) => ({ ...current, timeline: { ...current.timeline, minimized: !current.timeline.minimized } })); return; }
      if (!typing && event.key === "?") { setModal("shortcuts"); return; }
      if (event.key === "Escape") { closePopovers(); setModal(""); setMobileTip(""); updateProject((current) => (current.timeline.presetOpen || current.timeline.trackMenuOpen ? { ...current, timeline: { ...current.timeline, presetOpen: false, trackMenuOpen: false } } : current), { record: false }); }
    };
    const handleKeyUp = (event) => { if (event.code === "Space") spaceDownRef.current = false; };
    const clearSpace = () => { spaceDownRef.current = false; };
    window.addEventListener("keydown", handleKeyDown); window.addEventListener("keyup", handleKeyUp); window.addEventListener("blur", clearSpace);
    return () => { window.removeEventListener("keydown", handleKeyDown); window.removeEventListener("keyup", handleKeyUp); window.removeEventListener("blur", clearSpace); };
  }, [closePopovers, redo, undo, updateProject]);

  const updateCamera = useCallback((patch, { record = true } = {}) => updateProject((current) => { const camera = { ...current.camera, ...patch }; const next = { ...current, camera }; return current.timeline.recording ? addKeyframe(next, camera, current.blur) : next; }, { record }), [updateProject]);
  const updateBlur = useCallback((patch, { record = true } = {}) => updateProject((current) => { const blur = { ...current.blur, ...patch }; const next = { ...current, blur }; return current.timeline.recording ? addKeyframe(next, current.camera, blur) : next; }, { record }), [updateProject]);
  // A camera keyframe can also be pinned without moving any dial.
  const addCameraKeyframe = useCallback(() => updateProject((current) => addKeyframe(current, current.camera, current.blur)), [updateProject]);
  // Scrubbing and playback preview the active track's camera and focus path.
  // Keyed on the playhead only: direct camera edits and keyframe selections
  // must keep the pose the user (or chip) chose.
  useEffect(() => {
    updateProject((current) => ({ ...current, camera: cameraAtTime(current, current.timeline.playhead), blur: blurAtTime(current, current.timeline.playhead) }), { record: false });
  }, [project.timeline.playhead, updateProject]);
  const selectCameraPreset = useCallback((value) => { updateProject((current) => ({ ...current, cameraPreset: value, camera: { ...current.camera, ...cameraPresets[value] } })); setCameraPresetOpen(false); notify(`${value} camera preset applied.`); }, [notify, updateProject]);
  const selectScene = useCallback((value) => {
    const patch = scenePatch(value);
    updateProject((current) => ({ ...current, scene: value, lighting: patch.lighting || current.lighting, background: { ...current.background, ...(patch.background || {}) }, contactShadow: patch.contactShadow ?? current.contactShadow, bgBlur: patch.bgBlur ?? current.bgBlur }));
    setSceneOpen(false);
    notify("Scene applied to all shots.");
  }, [notify, updateProject]);
  const updateBackground = useCallback((patch) => updateProject((current) => ({ ...current, scene: "custom", background: { ...current.background, ...patch } })), [updateProject]);
  const updateEffectSetting = useCallback((effect, value) => updateProject((current) => ({ ...current, effectSettings: { ...current.effectSettings, [effect]: Number(value) } })), [updateProject]);
  const addEffect = useCallback((effect) => { updateProject((current) => current.effects.includes(effect) ? current : { ...current, effects: [...current.effects, effect] }); setEffectsOpen(false); notify(`${effect} effect added.`); }, [notify, updateProject]);
  const removeEffect = useCallback((effect) => { updateProject((current) => ({ ...current, effects: current.effects.filter((item) => item !== effect) })); notify(`${effect} effect removed.`); }, [notify, updateProject]);
  const selectTemplate = useCallback((name) => { const patch = templatePatch(name); updateProject((current) => ({ ...current, ...patch, scene: patch.scene || "custom", background: { ...current.background, ...(patch.background || {}) }, effectSettings: { ...current.effectSettings, ...(patch.effectSettings || {}) } })); closePopovers(); notify(`${name} loaded.`); }, [closePopovers, notify, updateProject]);
  const handleReset = useCallback(() => { updateProject(() => createDefaultProject()); closePopovers(); notify("All controls reset."); }, [closePopovers, notify, updateProject]);

  const handleStagePointerDown = useCallback((event) => { if (event.button !== 0 || modal) return; const bounds = stageRef.current?.getBoundingClientRect(); if (!bounds) return; pointerRef.current = { x: event.clientX, y: event.clientY, camera: { ...project.camera }, blur: { ...project.blur }, bounds }; event.currentTarget.setPointerCapture?.(event.pointerId); }, [modal, project.blur, project.camera]);
  const handleStagePointerMove = useCallback((event) => { const pointer = pointerRef.current; if (!pointer || !stageRef.current) return; const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y; if (isMobileViewport && mobileControlTab === "blur") { updateBlur({ x: clamp((pointer.blur.x ?? 0.5) + dx / pointer.bounds.width, 0, 1), y: clamp((pointer.blur.y ?? 0.52) + dy / pointer.bounds.height, 0, 1) }, { record: false }); return; } if (project.cameraMode === "zoom") updateCamera({ fov: clamp(pointer.camera.fov - dy * 0.08, 1, 120) }, { record: false }); else if (project.cameraMode === "move" || event.shiftKey || spaceDownRef.current) updateCamera({ panX: clamp(pointer.camera.panX + dx / pointer.bounds.width, -1, 1), panY: clamp(pointer.camera.panY + dy / pointer.bounds.height, -1, 1) }, { record: false }); else if (event.altKey) { const patch = { zAxis: clamp(pointer.camera.zAxis + dx * ROTATION_DRAG_SCALE, CAMERA_AXIS_MIN, CAMERA_AXIS_MAX) }; updateCamera(patch, { record: false }); showAxisHud({ ...pointer.camera, ...patch }); } else { const patch = { xAxis: clamp(pointer.camera.xAxis + dx * ROTATION_DRAG_SCALE, CAMERA_AXIS_MIN, CAMERA_AXIS_MAX), yAxis: clamp(pointer.camera.yAxis - dy * ROTATION_DRAG_SCALE, CAMERA_AXIS_MIN, CAMERA_AXIS_MAX) }; updateCamera(patch, { record: false }); showAxisHud({ ...pointer.camera, ...patch }); } }, [isMobileViewport, mobileControlTab, project.cameraMode, showAxisHud, updateBlur, updateCamera]);
  const handleStageWheel = useCallback((event) => { event.preventDefault(); const delta = wheelDeltaToDegrees(event, stageRef.current?.clientHeight || window.innerHeight); if (!delta) return; if (event.ctrlKey || event.metaKey) { const patch = { zoom: clamp(Number(project.camera.zoom) - delta * (0.0018 / ROTATION_WHEEL_SCALE), 0.5, 4) }; updateCamera(patch, { record: false }); showAxisHud({ ...project.camera, ...patch }); return; } const axis = wheelRotationAxis(event); const patch = { [axis]: clamp(Number(project.camera[axis]) + delta, CAMERA_AXIS_MIN, CAMERA_AXIS_MAX) }; updateCamera(patch, { record: false }); showAxisHud({ ...project.camera, ...patch }); }, [project.camera, showAxisHud, updateCamera]);

  const handleSaveProject = useCallback(() => { try { window.localStorage.setItem("openmock-project", JSON.stringify(getSerializableProject(project))); notify(project.media?.type?.startsWith("video/") ? "Project saved. Re-add the local video source next time." : "Project saved locally."); } catch { notify("Project could not be saved in this browser."); } }, [notify, project]);
  const handleCapture = useCallback(async () => { try { await exportImage(project); notify("Image captured and downloaded."); } catch (error) { notify(error.message || "Capture failed."); } }, [notify, project]);
  const handleExportImage = useCallback(async () => { setExporting(true); try { const result = await exportImage(project); notify(`Exported ${result.width} × ${result.height} ${result.format.toUpperCase()} image.`); } catch (error) { notify(error.message || "Image export failed."); } finally { setExporting(false); } }, [notify, project]);
  const handleExportVideo = useCallback(async () => { setExporting(true); setExportProgress(0); try { const result = await exportVideo(project, setExportProgress); notify(`Exported ${result.width} × ${result.height} WEBM video.`); } catch (error) { notify(error.message || "Video export failed."); } finally { setExporting(false); setExportProgress(0); } }, [notify, project]);
  const markTourSeen = useCallback(() => { window.localStorage.setItem("openmock-tour-seen", "1"); setTourStep(0); }, []);
  const markMobileOnboarded = useCallback(() => { window.localStorage.setItem("openmock-mobile-onboarded", "1"); setMobileTip(""); }, []);
  const updateReduceMotion = useCallback((value) => { setReduceMotion(value); window.localStorage.setItem("openmock-reduce-motion", value ? "1" : "0"); }, []);
  const updateShowTips = useCallback((value) => { setShowTips(value); window.localStorage.setItem("openmock-show-tips", value ? "1" : "0"); if (!value) { window.localStorage.setItem("openmock-tour-seen", "1"); window.localStorage.setItem("openmock-mobile-onboarded", "1"); setTourStep(0); setMobileTip(""); } else { window.localStorage.removeItem("openmock-tour-seen"); window.localStorage.removeItem("openmock-mobile-onboarded"); } }, []);
  const appClass = `app-shell ${isDark ? "theme-dark" : "theme-light"} ${reduceMotion ? "reduce-motion" : ""} ${project.timeline.minimized ? "timeline-collapsed" : ""}`;

  return <main className={appClass}>
    <TopBar isDark={isDark} popover={popover} onTogglePopover={(next) => { closePopovers(); setPopover(popover === next ? "" : next); }} onToggleTheme={() => { const next = !isDark; setIsDark(next); window.localStorage.setItem("openmock-theme", next ? "dark" : "light"); }} onOpenInfo={() => { closePopovers(); setModal("info"); }} onCapture={handleCapture} onSaveProject={handleSaveProject} viewportRatio={project.viewportRatio} onSelectRatio={(value) => { updateProject((current) => ({ ...current, viewportRatio: value })); setPopover(""); notify(`Viewport ratio set to ${value}.`); }} exportTab={exportTab} setExportTab={setExportTab} exportOptions={project.export} updateExport={(patch) => updateProject((current) => ({ ...current, export: { ...current.export, ...patch } }))} onExportImage={handleExportImage} onExportVideo={handleExportVideo} exporting={exporting} exportProgress={exportProgress} canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo} />
    <div className="workspace-grid"><div className="main-column"><Stage stageRef={stageRef} project={project} isDark={isDark} isMobile={isMobileViewport} hintSeen={stageHintSeen} onInteract={() => setStageHintSeen(true)} axisHudRef={axisHudRef} onPointerDown={handleStagePointerDown} onPointerMove={handleStagePointerMove} onPointerUp={() => { pointerRef.current = null; }} onWheel={handleStageWheel} onUpload={() => uploadRef.current?.click()} onDrop={(event) => { event.preventDefault(); handleMediaFile(event.dataTransfer?.files?.[0]); }} /><input ref={uploadRef} className="visually-hidden" type="file" accept="image/*,video/*" onChange={(event) => { handleMediaFile(event.target.files?.[0]); event.target.value = ""; }} /><Timeline project={project} updateProject={updateProject} onAutoMotion={() => setModal("auto-intro")} onOpenRecording={() => setModal("recording")} notify={notify} /></div></div>
    {!isMobileViewport && <Inspector project={project} updateProject={updateProject} panelSections={panelSections} setPanelSections={setPanelSections} sceneOpen={sceneOpen} setSceneOpen={setSceneOpen} lightingOpen={lightingOpen} setLightingOpen={setLightingOpen} backgroundOpen={backgroundOpen} setBackgroundOpen={setBackgroundOpen} backgroundPickerOpen={backgroundPickerOpen} setBackgroundPickerOpen={setBackgroundPickerOpen} mockupOpen={mockupOpen} setMockupOpen={setMockupOpen} finishOpen={finishOpen} setFinishOpen={setFinishOpen} cameraPresetOpen={cameraPresetOpen} setCameraPresetOpen={setCameraPresetOpen} effectsOpen={effectsOpen} setEffectsOpen={setEffectsOpen} updateCamera={updateCamera} addCameraKeyframe={addCameraKeyframe} selectCameraPreset={selectCameraPreset} selectScene={selectScene} updateBackground={updateBackground} updateEffectSetting={updateEffectSetting} addEffect={addEffect} removeEffect={removeEffect} onUpload={() => uploadRef.current?.click()} onRemoveMedia={() => updateProject((current) => ({ ...current, media: null }))} onReset={handleReset} isDark={isDark} onToggleTheme={() => { const next = !isDark; setIsDark(next); window.localStorage.setItem("openmock-theme", next ? "dark" : "light"); }} notify={notify} />}
    {isMobileViewport && <MobileDock project={project} updateProject={updateProject} updateBlur={updateBlur} updateCamera={updateCamera} undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo} active={mobileControlTab} setActive={setMobileControlTab} effectsOpen={effectsOpen} setEffectsOpen={setEffectsOpen} addEffect={addEffect} removeEffect={removeEffect} onShowBlurTip={() => showTips && setMobileTip("blur-1")} onUpload={() => uploadRef.current?.click()} notify={notify} />}
    {popover === "menu" && <TopMenu canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo} timelineVisible={!project.timeline.minimized} onToggleTimeline={() => updateProject((current) => ({ ...current, timeline: { ...current.timeline, minimized: !current.timeline.minimized } }))} onInfo={() => { closePopovers(); setModal("info"); }} onHelp={() => setPopover("help")} onPreferences={() => { closePopovers(); setModal("preferences"); }} onSignIn={() => { closePopovers(); setModal("account"); }} onCommunity={() => notify("Community links are available in Info.")} onChangelog={() => { closePopovers(); setModal("changelog"); }} />}
    {popover === "templates" && <TemplatesPopover onUse={selectTemplate} />}{popover === "help" && <HelpPopover onRestart={() => { closePopovers(); setTourStep(1); }} onTimeline={() => { closePopovers(); notify("Timeline tour is ready below."); }} onAuto={() => { closePopovers(); setModal("auto-intro"); }} onShortcuts={() => { closePopovers(); setModal("shortcuts"); }} onContact={() => { closePopovers(); setModal("feedback"); }} onFeedback={() => { closePopovers(); setModal("feedback"); }} />}
    {modal === "info" && <InfoModal onClose={() => setModal("")} notify={notify} />}{modal === "shortcuts" && <ShortcutsModal onClose={() => setModal("")} />}{modal === "preferences" && <PreferencesModal onClose={() => setModal("")} isDark={isDark} onToggleTheme={() => { const next = !isDark; setIsDark(next); window.localStorage.setItem("openmock-theme", next ? "dark" : "light"); }} reduceMotion={reduceMotion} onReduceMotion={updateReduceMotion} showTips={showTips} onShowTips={updateShowTips} />}{modal === "account" && <AccountModal onClose={() => setModal("")} />}{modal === "feedback" && <FeedbackModal onClose={() => setModal("")} notify={notify} />}{modal === "changelog" && <ChangelogModal onClose={() => setModal("")} />}
    {modal === "auto-intro" && <AutoMotionIntro onClose={() => setModal("")} onExplore={() => setModal("auto-workspace")} onShow={() => setModal("auto-workspace")} />}
    {modal === "auto-workspace" && <AutoMotionWorkspace areas={autoAreas} setAreas={setAutoAreas} onClose={() => setModal("")} onCompose={({ motionType, speed }) => {
      const duration = { Fast: 4, Medium: 6, Slow: 8 }[speed] || 4;
      updateProject((current) => {
        const keyframes = composeAutoMotionKeyframes({ areas: autoAreas, camera: current.camera, blur: current.blur, duration, motionType });
        if (keyframes.length < 2) return current;
        const activeId = current.activeTrackId || current.tracks[0]?.id;
        return { ...current, camera: { ...keyframes[0].camera }, blur: { ...keyframes[0].blur }, selectedKeyframeId: keyframes[0].id, timeline: { ...current.timeline, duration, playhead: 0, playing: false, presetOpen: false }, tracks: current.tracks.map((track) => track.id === activeId ? { ...track, duration, keyframes } : track) };
      });
      setAutoAreas([]);
      setModal("");
      notify(`${motionType.toUpperCase()} auto-motion composed at ${speed.toLowerCase()} speed.`);
    }} />}
    {modal === "recording" && <RecordingModal onClose={() => setModal("")} onStart={() => { updateProject((current) => ({ ...current, timeline: { ...current.timeline, recording: true } })); setModal(""); notify("Recording camera and blur keyframes."); }} />}
    {tourStep > 0 && <TourModal step={tourStep} onSkip={markTourSeen} onNext={() => tourStep >= 8 ? markTourSeen() : setTourStep((value) => Math.min(value + 1, 8))} />}{isMobileViewport && mobileTip && <MobileTipRouter tip={mobileTip} onClose={markMobileOnboarded} onNext={(next) => next === "done" ? markMobileOnboarded() : setMobileTip(next)} />}{toast && <div className="toast" role="status">{toast}<button type="button" onClick={() => setToast("")}>×</button></div>}
  </main>;
}

function TopBar({ isDark, popover, onTogglePopover, onToggleTheme, onOpenInfo, onCapture, onSaveProject, viewportRatio, onSelectRatio, exportTab, setExportTab, exportOptions, updateExport, onExportImage, onExportVideo, exporting, exportProgress, canUndo, canRedo, onUndo, onRedo }) {
  return <header className="topbar">
    <IconButton label="Open menu" className="menu-trigger" onClick={() => onTogglePopover("menu")}><Menu size={15} /></IconButton>
    <div className="brand-mark"><img src={asset("source/openmock.svg")} alt="OpenMock" /></div>
    <div className="topbar-links"><TextButton onClick={onOpenInfo}>INFO</TextButton><TextButton onClick={() => onTogglePopover("templates")}>TEMPLATES <ChevronDown size={11} /></TextButton><TextButton onClick={() => onTogglePopover("help")}>HELP</TextButton></div>
    <div className="topbar-spacer" />
    <TextButton aria-label="Viewport ratio" className="ratio-button" onClick={() => onTogglePopover("ratio")}><span>{viewportRatio}</span><ChevronDown size={11} /></TextButton>
    <div className="topbar-spacer" />
    <div className="topbar-history">
      <IconButton label="Undo" onClick={onUndo} disabled={!canUndo}><Undo2 size={14} /></IconButton>
      <IconButton label="Redo" onClick={onRedo} disabled={!canRedo}><Redo2 size={14} /></IconButton>
    </div>
    <span className="topbar-divider" />
    <TextButton className="save-project" onClick={onSaveProject}>Save project</TextButton>
    <IconButton label={isDark ? "Switch to light mode" : "Switch to dark mode"} className="theme-top-button" onClick={onToggleTheme}>{isDark ? <Sun size={14} /> : <Moon size={14} />}</IconButton>
    <IconButton label="Capture image" className="capture-button" onClick={onCapture}><Camera size={15} /></IconButton>
    <TextButton aria-label="Export" className="export-button" onClick={() => onTogglePopover("export")}>EXPORT <ChevronDown size={11} /></TextButton>
    {popover === "ratio" && <RatioPopover value={viewportRatio} onSelect={onSelectRatio} />}
    {popover === "export" && <ExportPopover tab={exportTab} setTab={setExportTab} options={exportOptions} update={updateExport} onExportImage={onExportImage} onExportVideo={onExportVideo} exporting={exporting} progress={exportProgress} />}
  </header>;
}
function TopMenu({ canUndo, canRedo, onUndo, onRedo, timelineVisible, onToggleTimeline, onInfo, onHelp, onPreferences, onSignIn, onCommunity, onChangelog }) { return <div className="top-popover menu-popover" role="menu" aria-label="Open menu"><button type="button" role="menuitem" onClick={onSignIn}>Sign in</button><div className="menu-divider" /><button type="button" role="menuitem" disabled={!canUndo} onClick={onUndo}><Undo2 size={13} />Undo <kbd>⌘Z</kbd></button><button type="button" role="menuitem" disabled={!canRedo} onClick={onRedo}><Redo2 size={13} />Redo <kbd>⇧⌘Z</kbd></button><button type="button" role="menuitem" onClick={onToggleTimeline}><Film size={13} />Toggle timeline <kbd>T</kbd>{timelineVisible && <Check size={13} className="menu-check" />}</button><button type="button" role="menuitem" onClick={onPreferences}><Settings2 size={13} />Preferences</button><div className="menu-divider" /><button type="button" role="menuitem" onClick={onInfo}><Info size={13} />Info</button><button type="button" role="menuitem" onClick={onHelp}><CircleHelp size={13} />Help</button><button type="button" role="menuitem" onClick={onCommunity}><ExternalLink size={13} />Community</button><button type="button" role="menuitem" onClick={onChangelog}><ExternalLink size={13} />Changelog</button></div>; }
function HelpPopover({ onRestart, onTimeline, onAuto, onShortcuts, onContact, onFeedback }) { return <div className="top-popover help-popover" role="menu" aria-label="Help"><button type="button" role="menuitem" onClick={onContact}><ExternalLink size={13} />Contact</button><button type="button" role="menuitem" onClick={onFeedback}><Send size={13} />Send feedback</button><button type="button" role="menuitem" disabled><HelpCircle size={13} />Docs <span className="menu-note">Coming soon</span></button><div className="menu-divider" /><button type="button" role="menuitem" onClick={onRestart}><RefreshCw size={13} />Restart tour</button><button type="button" role="menuitem" onClick={onTimeline}><Film size={13} />Tour the timeline</button><button type="button" role="menuitem" onClick={onAuto}><Wand2 size={13} />Tour Auto-motion</button><button type="button" role="menuitem" onClick={onShortcuts}><kbd>?</kbd>Keyboard shortcuts</button></div>; }
function RatioPopover({ value, onSelect }) { return <div className="top-popover ratio-popover" role="menu" aria-label="Viewport ratio">{ratioOptions.map((option) => <button key={option} type="button" role="menuitem" className={value === option ? "is-selected" : ""} onClick={() => onSelect(option)}><span>{option}</span>{value === option && <Check size={13} />}</button>)}<div className="menu-divider" /><div className="popover-caption">APP STORE</div>{appStoreOptions.map(([label, size]) => <button key={label} type="button" role="menuitem" className="two-line-menu" onClick={() => onSelect(label)}><span>{label}</span><small>{size}</small></button>)}</div>; }
function TemplatesPopover({ onUse }) { return <div className="templates-popover" role="dialog" aria-label="Templates"><div className="templates-head"><span>Starter</span><ChevronDown size={12} /></div><div className="template-grid">{templateItems.map(([name, file]) => <button type="button" className="template-card" key={name} onClick={() => onUse(name)} aria-label={`Use template ${name}`}><span className="template-image"><img src={asset(`templates/${file}`)} alt="" /></span><span>{name}</span></button>)}</div></div>; }

function ExportPopover({ tab, setTab, options, update, onExportImage, onExportVideo, exporting, progress }) { return <div className="export-popover" role="dialog" aria-label="Export"><div className="export-tabs" role="tablist"><button type="button" role="tab" aria-selected={tab === "image"} className={tab === "image" ? "active" : ""} onClick={() => setTab("image")}>Image</button><button type="button" role="tab" aria-selected={tab === "video"} className={tab === "video" ? "active" : ""} onClick={() => setTab("video")}>Video</button></div>{tab === "image" ? <ImageExport options={options} update={update} onExport={onExportImage} exporting={exporting} /> : <VideoExport options={options} update={update} onExport={onExportVideo} exporting={exporting} progress={progress} />}</div>; }
function ImageExport({ options, update, onExport, exporting }) { const summary = options.format === "png" ? "Lossless with transparency." : options.format === "webp" ? "Modern, small image." : "Smallest file. No transparency."; return <div className="export-body"><label className="export-label">Image format<select value={options.format} onChange={(event) => update({ format: event.target.value })}><option value="jpg">JPG — SMALLEST FILE</option><option value="png">PNG — LOSSLESS, TRANSPARENCY</option><option value="webp">WEBP — MODERN, SMALL</option></select><ChevronDown size={13} /></label><SwitchRow label="OpenMock watermark" checked={options.watermark} onChange={(value) => update({ watermark: value })} /><SwitchRow label="Transparent Background" checked={options.transparent} onChange={(value) => update({ transparent: value })} /><div className="export-label">Orientation<div className="segmented-control">{["Landscape", "Square", "Portrait"].map((item) => <button type="button" key={item} className={options.orientation === item ? "selected" : ""} onClick={() => update({ orientation: item, imageSize: item === "Square" ? "Square — 1080×1080" : item === "Portrait" ? "Portrait — 1080×1350" : "16:9 — 1920×1080 (1080P)" })}><span className={`${item.toLowerCase()}-icon`} />{item}</button>)}</div></div><select className="export-select-control" aria-label="Image size" value={options.imageSize} onChange={(event) => update({ imageSize: event.target.value })}><option>16:9 — 1920×1080 (1080P)</option><option>Square — 1080×1080</option><option>Portrait — 1080×1350</option></select><div className="export-summary"><strong>{options.imageSize.includes("Square") ? "1080×1080" : options.imageSize.includes("Portrait") ? "1080×1350" : "1920×1080"}</strong><span>{options.format.toUpperCase()}</span><small>{summary}</small></div><button type="button" className="primary-wide" onClick={onExport} disabled={exporting}>{exporting ? "Exporting…" : "Export Image"} <Camera size={14} /></button></div>; }
const videoSizeOptions = { Landscape: ["16:9 — 1280×720 (720P)", "16:9 — 1920 × 1080 (1080P)"], Square: ["1:1 — 720×720 (720P)", "1:1 — 1080×1080 (1080P)"], Portrait: ["9:16 — 720×1280 (720P)", "9:16 — 1080 × 1920 (1080P)"] };
function VideoExport({ options, update, onExport, exporting, progress }) { const orientation = options.videoOrientation || "Landscape"; const sizes = videoSizeOptions[orientation] || videoSizeOptions.Landscape; const selectedSize = sizes.includes(options.videoSize) ? options.videoSize : sizes[0]; const qualityMbps = { Low: 2.5, Med: 6, High: 10, Ultra: 16 }[options.quality] || 6; return <div className="export-body video-export"><div className="export-label">Orientation<div className="segmented-control">{["Landscape", "Square", "Portrait"].map((item) => <button type="button" key={item} className={orientation === item ? "selected" : ""} onClick={() => update({ videoOrientation: item, videoSize: videoSizeOptions[item][0] })}><span className={`${item.toLowerCase()}-icon`} />{item}</button>)}</div></div><select className="export-select-control" aria-label="Video size" value={selectedSize} onChange={(event) => update({ videoSize: event.target.value })}>{sizes.map((size) => <option key={size}>{size}</option>)}</select><RadioRow label="Quality" options={["Low", "Med", "High", "Ultra"]} selected={options.quality} onSelect={(value) => update({ quality: value })} /><RadioRow label="Frame rate" options={["30 fps", "60 fps"]} selected={`${options.fps} fps`} onSelect={(value) => update({ fps: Number(value.split(" ")[0]) })} /><RadioRow label="Motion Blur" options={["Off", "Low", "Med", "High"]} selected={options.motionBlur} onSelect={(value) => update({ motionBlur: value })} /><SwitchRow label="Transparent Background" checked={options.transparent} onChange={(value) => update({ transparent: value })} /><div className="export-summary"><strong>{dimensionLabel(selectedSize)}</strong><span>{options.fps} fps · ~{qualityMbps} Mbps</span><small>{options.quality} quality · active timeline.</small></div><button type="button" className="primary-wide" onClick={onExport} disabled={exporting}>{exporting ? `Exporting ${Math.round(progress * 100)}%` : "Export Video"} <Film size={14} /></button><p className="export-note">Exports the active track from start to finish, including camera, focus, and motion blur.</p><p className="export-note">Keep this tab open while exporting. If you switch tabs or minimise, the export pauses and resumes when you return.</p></div>; }

function Stage({ stageRef, project, isDark, isMobile, hintSeen, onInteract, axisHudRef, onPointerDown, onPointerMove, onPointerUp, onWheel, onUpload, onDrop }) {
  const [dragOver, setDragOver] = useState(false);
  const [rendererState, setRendererState] = useState({ mockup: null, status: "loading" });
  const rendererStatus = rendererState.mockup === project.mockup ? rendererState.status : "loading";
  const handleRendererStatus = useCallback((status) => {
    setRendererState({ mockup: project.mockup, status });
  }, [project.mockup]);
  // React registers wheel listeners as passive, so preventDefault inside
  // onWheel is ignored and Cmd/Ctrl scrolling would zoom the whole page.
  // A native non-passive listener keeps browser zoom out of the way.
  useEffect(() => {
    const element = stageRef.current;
    if (!element) return undefined;
    const handleWheel = (event) => onWheel(event);
    element.addEventListener("wheel", handleWheel, { passive: false });
    return () => element.removeEventListener("wheel", handleWheel);
  }, [onWheel, stageRef]);
  const background = stageBackground(project);
  const backgroundImage = background.backgroundImage && background.backgroundImage !== "none" ? background.backgroundImage : null;
  const bgBlurPx = Math.round((Number(project.bgBlur) || 0) * 16 * 100) / 100;
  const mockupSlug = slugify(project.mockup);
  const stageClass = `mockup-stage ratio-${slugify(project.viewportRatio)} scene-${slugify(project.scene)} lighting-${slugify(project.lighting)} ${isDark ? "stage-dark" : ""} ${dragOver ? "drag-over" : ""}`;
  const effectClass = (project.effects || []).map(slugify).join(" ");
  const effectStyle = { "--vignette-opacity": `${Number(project.effectSettings?.Vignette || 20) / 100}`, "--grain-opacity": `${Number(project.effectSettings?.Grain || 14) / 100}` };
  const blur = project.blur || {};
  const blurStrength = Math.max(0, Math.min(100, Number(blur.strength) || 0));
  const blurSize = Math.max(0, Math.min(1, Number(blur.size) || 0));
  const blurFalloff = Math.max(0, Math.min(1, Number(blur.falloff) || 0));
  const blurX = clamp(Number.isFinite(Number(blur.x)) ? Number(blur.x) : 0.5, 0, 1) * 100;
  const blurY = clamp(Number.isFinite(Number(blur.y)) ? Number(blur.y) : 0.52, 0, 1) * 100;
  const focusHalf = 5 + blurSize * 24;
  const focusFeather = 6 + blurFalloff * 20;
  const dofVisible = blurStrength > 0;
  const dofStyle = {
    "--dof-blur": `${(blurStrength / 100) * 14}px`,
    "--dof-size": `${20 + blurSize * 60}%`,
    "--dof-falloff": `${18 + blurFalloff * 46}%`,
  };
  const dofMask = blur.mode === "directional"
    ? `linear-gradient(90deg, #000 ${Math.max(0, blurX - focusHalf - focusFeather)}%, transparent ${Math.max(0, blurX - focusHalf)}%, transparent ${Math.min(100, blurX + focusHalf)}%, #000 ${Math.min(100, blurX + focusHalf + focusFeather)}%)`
    : blur.mode === "tilt"
      ? `linear-gradient(180deg, #000 ${Math.max(0, blurY - focusHalf - focusFeather)}%, transparent ${Math.max(0, blurY - focusHalf)}%, transparent ${Math.min(100, blurY + focusHalf)}%, #000 ${Math.min(100, blurY + focusHalf + focusFeather)}%)`
      : `radial-gradient(ellipse var(--dof-size) var(--dof-size) at ${blurX}% ${blurY}%, transparent 34%, #000 calc(34% + var(--dof-falloff)))`;
  const sourcePreview = project.media?.src || asset("source/starter-screen.jpg");

  return <section ref={stageRef} className={stageClass} style={{ backgroundColor: background.backgroundColor }} onPointerDown={(event) => { onInteract(); onPointerDown(event); }} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onDragOver={(event) => { event.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={(event) => { setDragOver(false); onDrop(event); }}>
    <div className="stage-background-layer" style={{ backgroundImage, filter: `blur(${bgBlurPx}px)` }} aria-hidden="true" />
    <ThreeStage enabled cameraState={project.camera} cameraPreset={project.cameraPreset} lighting={project.lighting} lightRotation={project.lightRotation} contactShadow={project.contactShadow} finish={project.finish} reflection={project.reflection} mockup={project.mockup} media={project.media} effects={project.effects} isDark={isDark} onStatusChange={handleRendererStatus} />
    <div className="stage-background-glow" />
    <div className={`three-effects-overlay ${effectClass}`} style={effectStyle} aria-hidden="true">
      {(project.effects || []).includes("Glass Border") && <span className="fx fx-glass-border" />}
      {(project.effects || []).includes("Depth") && <span className="fx fx-depth" />}
      {(project.effects || []).includes("Sharpen") && <span className="fx fx-sharpen" />}
      {(project.effects || []).includes("Fish Eye") && <span className="fx fx-fisheye" />}
      {(project.effects || []).includes("Screen Fade") && <span className="fx fx-screen-fade" />}
      {(project.effects || []).includes("Ghost") && <span className="fx fx-ghost" />}
      {(project.effects || []).includes("Liquid Glass") && <span className="fx fx-liquid-glass" />}
    </div>
    {dofVisible && <div className={`stage-dof-layer dof-${slugify(blur.mode || "radial")} ${blur.bokeh ? "dof-bokeh" : ""}`} style={{ ...dofStyle, WebkitMaskImage: dofMask, maskImage: dofMask }} aria-hidden="true" />}
    {!isMobile && !hintSeen && <div className="stage-hint" role="status"><Move3d size={12} />Drag to orbit<span className="hint-sep">·</span>Scroll to rotate<span className="hint-sep">·</span><kbd>⇧</kbd> tilt<span className="hint-sep">·</span><kbd>⌥</kbd> roll<span className="hint-sep">·</span><kbd>⌘</kbd>/<kbd>Ctrl</kbd> zoom</div>}
    {isMobile && !hintSeen && <div className="stage-hint" role="status"><Move3d size={12} />Drag to rotate the device</div>}
    <div className="stage-axis-hud" ref={axisHudRef} aria-hidden="true"><b>X</b><span data-axis="x" /><b>Y</b><span data-axis="y" /><b>Z</b><span data-axis="z" /><b className="hud-zoom-label">ZOOM</b><span data-axis="zoom" /></div>
    {rendererStatus === "loading" && !dragOver && <div className="stage-loading"><span className="spinner" />Loading device…</div>}
    <button type="button" className="background-chip" aria-label="Source media" onClick={onUpload}><img src={sourcePreview} alt="" /></button>
    <div className="stage-center-mark"><span /></div>
    {rendererStatus === "failed" && <div className="stage-device-fallback"><StageDeviceRealistic project={project} deviceStyle={getCameraStyle(project.camera, project.mockup, project.cameraPreset)} mockupSlug={mockupSlug} /></div>}
    <div className="stage-caption">{isMobile ? "CAMERA" : project.mockup === "Flat" ? "FLAT" : "SHOT 1"}</div>
    {project.timeline.guides && <><span className="guide vertical" /><span className="guide horizontal" /></>}
    {!isMobile && !project.media && <div className="upload-toast"><Upload size={14} /><span>Upload media to get started — or paste / drop.</span><button type="button" onClick={onUpload}>Upload</button></div>}
    {project.media && <div className="media-badge" title={project.media.name}>{project.media.name}</div>}
  </section>;
}
function Timeline({ project, updateProject, onAutoMotion, onOpenRecording, notify }) { const timeline = project.timeline; const setTimeline = (patch, record = true) => updateProject((current) => ({ ...current, timeline: { ...current.timeline, ...patch } }), { record }); const selectTrack = (track) => updateProject((current) => ({ ...current, activeTrackId: track.id, selectedKeyframeId: track.keyframes[0]?.id || null, camera: track.keyframes[0]?.camera ? { ...current.camera, ...track.keyframes[0].camera } : current.camera, blur: track.keyframes[0]?.blur ? { ...current.blur, ...track.keyframes[0].blur } : current.blur })); const addShot = () => updateProject((current) => { const id = `shot-${current.tracks.length + 1}`, name = `Shot ${current.tracks.length + 1}`; return { ...current, tracks: [...current.tracks, { id, name, kind: "scene", duration: 3, selected: false, keyframes: [{ id: `${id}-kf-1`, time: current.timeline.playhead, camera: { ...current.camera }, blur: { ...current.blur }, easing: "Ease in out" }] }], activeTrackId: id, selectedKeyframeId: `${id}-kf-1` }; }); const addTrack = (kind) => { const labels = { media: "Media", text: "Title", logo: "Logo", audio: "Audio" }; updateProject((current) => ({ ...current, tracks: [...current.tracks, { id: `${kind}-${Date.now()}`, name: labels[kind] || "Track", kind, duration: 3, selected: false, keyframes: [] }] })); notify(`${labels[kind] || "Track"} track added.`); }; const applyPreset = (name) => { const duration = 4; updateProject((current) => ({ ...current, timeline: { ...current.timeline, duration, playhead: 0, presetOpen: false }, tracks: current.tracks.map((track, index) => index === 0 ? { ...track, keyframes: [{ id: `${track.id}-preset-a`, time: 0, camera: { ...current.camera, ...cameraPresets.Angled }, blur: { ...current.blur }, easing: "Ease in" }, { id: `${track.id}-preset-b`, time: duration, camera: { ...current.camera, ...cameraPresets[name === "Flat truck" ? "Flat" : name === "Out and back" ? "Hero" : "Detail"] }, blur: { ...current.blur }, easing: "Ease out" }] } : track) })); notify(`${name} preset applied.`); }; const deleteKeyframe = () => updateProject((current) => ({ ...current, selectedKeyframeId: null, tracks: current.tracks.map((track) => ({ ...track, keyframes: track.keyframes.filter((frame) => frame.id !== current.selectedKeyframeId) })) })); const changeEasing = () => updateProject((current) => ({ ...current, tracks: current.tracks.map((track) => ({ ...track, keyframes: track.keyframes.map((frame) => frame.id === current.selectedKeyframeId ? { ...frame, easing: frame.easing === "Linear" ? "Ease in out" : "Linear" } : frame) })) })); if (timeline.minimized) return <section className="timeline-shell timeline-mini"><div className="timeline-toolbar"><IconButton label="Maximize timeline" onClick={() => setTimeline({ minimized: false })}><Maximize2 size={14} /></IconButton><TimelineTransport timeline={timeline} setTimeline={setTimeline} /><span className="mini-time">{formatTime(timeline.playhead)} / {formatTime(timeline.duration)}</span></div></section>; return <section className="timeline-shell"><div className="timeline-toolbar"><div className="timeline-mode" role="radiogroup" aria-label="Timeline mode"><button type="button" role="radio" aria-checked={timeline.mode === "simple"} className={timeline.mode === "simple" ? "selected" : ""} onClick={() => setTimeline({ mode: "simple" })}>SIMPLE</button><button type="button" role="radio" aria-checked={timeline.mode === "advanced"} className={timeline.mode === "advanced" ? "selected" : ""} onClick={() => setTimeline({ mode: "advanced" })}>ADVANCED</button></div><TimelineTransport timeline={timeline} setTimeline={setTimeline} /><span className="timeline-time" aria-label="Playhead time">{formatTime(timeline.playhead)} / {formatTime(timeline.duration)}</span><span className="timeline-spacer" /><div className="timeline-actions"><button type="button" className="timeline-action" onClick={() => setTimeline({ presetOpen: !timeline.presetOpen, trackMenuOpen: false })}>PRESETS</button><button type="button" className="timeline-action" onClick={onAutoMotion}><span className="timeline-long">AUTO-MOTION</span><span className="timeline-short">AUTO</span></button>{timeline.mode === "advanced" ? <button type="button" aria-label={timeline.recording ? "Recording — click to stop auto-keyframe" : "Enable auto-keyframe recording"} className={`record-button ${timeline.recording ? "recording" : ""}`} onClick={timeline.recording ? () => setTimeline({ recording: false }) : onOpenRecording}>{timeline.recording ? <><CircleStop size={12} /><span className="timeline-long">Recording</span><span className="timeline-short">STOP</span></> : <><span className="record-dot" /><span className="timeline-long">RECORD KEYFRAMES</span><span className="timeline-short">REC</span></>}</button> : <button type="button" aria-label="Add shot — captures the current camera and focus as a new shot" className="record-button add-shot" onClick={() => { addShot(); notify("Shot added at the current playhead."); }}><Plus size={13} /> ADD SHOT</button>}</div><span className="toolbar-divider" /><label className="duration-field" title="Project length — sets the timeline duration"><span>LENGTH</span><input aria-label="Project length (minutes:seconds)" value={timeline.projectLength} onChange={(event) => { const value = event.target.value; const match = value.match(/(\d+)\s*[:.]?\s*(\d+)?/); const seconds = match ? (match[2] ? Number(match[1]) * 60 + Number(match[2]) : Number(match[1])) : null; if (seconds && seconds >= 1 && seconds <= 180) setTimeline({ projectLength: value, duration: seconds, playhead: Math.min(timeline.playhead, seconds) }); else setTimeline({ projectLength: value }); }} /></label><IconButton label={timeline.guides ? "Hide center guides" : "Show center guides"} className={timeline.guides ? "active-control" : ""} onClick={() => setTimeline({ guides: !timeline.guides })}><Scan size={14} /></IconButton><input className="timeline-zoom" aria-label="Timeline zoom" type="range" min="0.5" max="2" step="0.1" value={timeline.zoom} style={{ "--fill": `${(timeline.zoom - 0.5) / 1.5 * 100}%` }} onChange={(event) => setTimeline({ zoom: Number(event.target.value) }, false)} /><IconButton label="Add track" className="add-track-button" onClick={() => setTimeline({ trackMenuOpen: !timeline.trackMenuOpen, presetOpen: false })}><Plus size={14} /></IconButton><IconButton label="Minimize timeline" onClick={() => setTimeline({ minimized: true })}><Minimize2 size={14} /></IconButton></div>{timeline.presetOpen && <TimelinePresetPopover onSelect={applyPreset} />}{timeline.trackMenuOpen && <TrackMenu onSelect={(kind) => { addTrack(kind); setTimeline({ trackMenuOpen: false }); }} />}<input className="scrub-track" aria-label="Scrub timeline" type="range" min="0" max={timeline.duration} step="0.1" value={timeline.playhead} style={{ "--fill": `${Math.min(100, timeline.playhead / timeline.duration * 100)}%` }} onChange={(event) => setTimeline({ playhead: Number(event.target.value) }, false)} /><div className="timeline-content">{timeline.mode === "advanced" && <div className="timeline-subtools"><IconButton label="Delete selected keyframe" onClick={deleteKeyframe} disabled={!project.selectedKeyframeId}><Trash2 size={13} /></IconButton><IconButton label="Edit easing for selected keyframe" onClick={changeEasing} disabled={!project.selectedKeyframeId}><Wand2 size={13} /></IconButton><span className="track-title">TRACKS</span><button type="button" className="tiny-action" onClick={() => setTimeline({ expandedTrack: !timeline.expandedTrack })}><Layers3 size={12} /> {timeline.expandedTrack ? "Collapse layer" : "Expand layer"}</button></div>}{project.tracks.map((track, index) => <TrackRow key={track.id} track={track} active={project.activeTrackId === track.id} expanded={timeline.expandedTrack && index === 0} simple={timeline.mode === "simple"} selectedKeyframeId={project.selectedKeyframeId} onSelect={() => selectTrack(track)} onToggle={() => setTimeline({ expandedTrack: !timeline.expandedTrack })} onSelectKeyframe={(frame) => updateProject((current) => ({ ...current, activeTrackId: track.id, selectedKeyframeId: frame.id, camera: { ...current.camera, ...frame.camera }, blur: frame.blur ? { ...current.blur, ...frame.blur } : current.blur }))} />)}<button type="button" className="add-track-row" onClick={() => setTimeline({ trackMenuOpen: true })}><Plus size={12} /> Add track</button></div></section>; }
function TimelineTransport({ timeline, setTimeline }) { return <div className="transport-controls"><IconButton label="Back to start" onClick={() => setTimeline({ playhead: 0 })}><ChevronLeft size={14} /></IconButton><IconButton label={timeline.playing ? "Pause" : "Play"} className="play-control" onClick={() => setTimeline({ playing: !timeline.playing })}>{timeline.playing ? <Pause size={14} /> : <Play size={14} />}</IconButton><IconButton label={timeline.loop ? "Disable loop" : "Enable loop"} className={timeline.loop ? "active-control" : ""} onClick={() => setTimeline({ loop: !timeline.loop })}><RefreshCw size={13} /></IconButton></div>; }
function TrackRow({ track, active, expanded, simple, selectedKeyframeId, onSelect, onToggle, onSelectKeyframe }) { const keyframes = track.keyframes || []; return <div className={`track-row ${active ? "active" : ""}`}><div className="track-label"><IconButton label={expanded ? "Collapse layer" : "Expand layer"} onClick={onToggle}>{expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</IconButton><GripVertical size={11} /><span>{track.name}</span><button type="button" className="row-more" aria-label={`More options for ${track.name}`} onClick={onSelect}><MoreHorizontal size={13} /></button></div><div className={`track-lane ${simple ? "simple-lane" : ""} track-${track.kind}`}><button type="button" className={`shot-segment ${active ? "selected" : ""}`} onClick={onSelect}><span>{track.kind === "scene" ? track.name : track.kind.toUpperCase()}</span>{!simple && keyframes.slice(0, 4).map((frame) => <i key={frame.id} className={frame.id === selectedKeyframeId ? "selected" : ""} onClick={(event) => { event.stopPropagation(); onSelectKeyframe(frame); }} />)}</button></div>{expanded && <div className="keyframe-rows">{keyframes.map((frame) => <button type="button" key={frame.id} className={`keyframe-chip ${frame.id === selectedKeyframeId ? "selected" : ""}`} onClick={() => onSelectKeyframe(frame)}><span>{formatTime(frame.time)}</span><b>{frame.easing}</b><i /></button>)}</div>}</div>; }
function TimelinePresetPopover({ onSelect }) { const presets = ["Scan left to right", "Left – top to bottom", "Low-angle pan up", "Slow zoom out", "Overhead pan", "Out and back", "Fold up", "Flat truck"]; return <div className="timeline-popover preset-popover"><div className="preset-grid">{presets.map((preset, index) => <button type="button" key={preset} onClick={() => onSelect(preset)}><span className={`preset-thumb preset-${index + 1}`} /><span>{preset}</span><small>4s</small></button>)}</div></div>; }
function TrackMenu({ onSelect }) { return <div className="timeline-popover track-popover"><strong>Add to timeline</strong><button type="button" onClick={() => onSelect("media")}><ImagePlus size={14} />Media <small>New shot from image or video</small></button><button type="button" onClick={() => onSelect("text")}><TextCursorInput size={14} />Text <small>Title or caption shot</small></button><button type="button" onClick={() => onSelect("logo")}><Aperture size={14} />Logo <small>Brand mark shot</small></button><button type="button" onClick={() => onSelect("audio")}><Music2 size={14} />Audio <small>Music or voiceover track</small></button></div>; }

function Inspector({ project, updateProject, panelSections, setPanelSections, sceneOpen, setSceneOpen, lightingOpen, setLightingOpen, backgroundOpen, setBackgroundOpen, backgroundPickerOpen, setBackgroundPickerOpen, mockupOpen, setMockupOpen, finishOpen, setFinishOpen, cameraPresetOpen, setCameraPresetOpen, effectsOpen, setEffectsOpen, updateCamera, addCameraKeyframe, selectCameraPreset, selectScene, updateBackground, updateEffectSetting, addEffect, removeEffect, onUpload, onRemoveMedia, onReset, isDark, onToggleTheme, notify }) {
  const sectionToggle = (key) => setPanelSections((current) => ({ ...current, [key]: !current[key] }));
  const sceneLabel = project.scene === "custom" ? "CUSTOM SCENE" : (sceneOptions.find((item) => item[3] === project.scene)?.[0] || "CUSTOM SCENE").toUpperCase();
  const backgroundLabel = project.background.tab === "Color" ? "Color" : project.background.tab === "Preset" ? `Preset · ${project.background.preset}` : `Image · ${project.background.image}`;
  return <aside className="inspector-panel">
    <div className="inspector-top"><IconButton label="Reset all" onClick={onReset}><RotateCcw size={14} /></IconButton><span className="inspector-top-title">EDITOR</span><IconButton label={isDark ? "Switch to light mode" : "Switch to dark mode"} onClick={onToggleTheme}>{isDark ? <Sun size={14} /> : <Moon size={14} />}</IconButton></div>
    <InspectorSection label="SOURCE" meta="SHOT 1" icon={<ImagePlus size={13} />} open={panelSections.source} onToggle={() => sectionToggle("source")}><SourceCard media={project.media} onUpload={onUpload} onRemove={onRemoveMedia} /></InspectorSection>
    <InspectorSection label="SCENE" icon={<SunMedium size={13} />} open={panelSections.scene} onToggle={() => sectionToggle("scene")}><div className="scene-summary"><div className="scene-summary-icon"><Settings2 size={15} /></div><div><strong>{sceneLabel}</strong><span>{project.scene === "custom" ? "CUSTOM LIGHTING + BACKGROUND" : "LIGHTING + BACKGROUND PRESET"}</span></div><button type="button" aria-label="Change scene" className="change-button" onClick={() => setSceneOpen((value) => !value)}>CHANGE</button></div>{sceneOpen && <ScenePicker scene={project.scene} onSelect={selectScene} />}<button type="button" aria-label={`Lighting ${project.lighting}`} className="wide-select" onClick={() => setLightingOpen((value) => !value)}><span><SunMedium size={14} />LIGHTING</span><b>{project.lighting.toUpperCase()}</b><ChevronDown size={12} /></button><div className="lighting-controls"><SliderRow label="LIGHT ROTATION X" value={project.lightRotation.x} min="-360" max="360" step="1" unit="°" onChange={(value) => updateProject((current) => ({ ...current, scene: "custom", lightRotation: { ...current.lightRotation, x: Number(value) } }))} /><SliderRow label="LIGHT ROTATION Y" value={project.lightRotation.y} min="-360" max="360" step="1" unit="°" onChange={(value) => updateProject((current) => ({ ...current, scene: "custom", lightRotation: { ...current.lightRotation, y: Number(value) } }))} /><SwitchRow label="CONTACT SHADOW" checked={project.contactShadow} onChange={(value) => updateProject((current) => ({ ...current, scene: "custom", contactShadow: value }))} /><SliderRow label="BG BLUR" value={project.bgBlur} min="0" max="1" step="0.01" onChange={(value) => updateProject((current) => ({ ...current, scene: "custom", bgBlur: Number(value) }))} /></div>{lightingOpen && <ChoicePopover items={lightingOptions} selected={project.lighting} onSelect={(value) => { updateProject((current) => ({ ...current, scene: "custom", lighting: value })); setLightingOpen(false); notify(`${value} lighting applied.`); }} />}<button type="button" aria-label="Background Image" className="wide-select" onClick={() => setBackgroundOpen((value) => !value)}><span><Palette size={14} />BACKGROUND</span><b>{backgroundLabel}</b><ChevronDown size={12} /></button>{project.background.tab === "Image" && <button type="button" aria-label="Background source" className="background-image-row" onClick={() => setBackgroundPickerOpen((value) => !value)}><span>BG IMAGE</span><span className="background-image-thumb" style={{ backgroundImage: `url(${asset(backgroundAssetMap[project.background.image] || backgroundAssetMap.Whisp)})` }} /><b>{project.background.image.toUpperCase()}</b><ChevronDown size={12} /></button>}{backgroundOpen && <BackgroundPicker background={project.background} update={updateBackground} pickerOpen={backgroundPickerOpen} setPickerOpen={setBackgroundPickerOpen} />}</InspectorSection>
    <InspectorSection label="MOCKUP" icon={<Smartphone size={13} />} open={panelSections.mockup} onToggle={() => sectionToggle("mockup")}><div className="mockup-summary"><div className="mockup-thumb">{project.mockup === "iPhone 17" ? <img src={asset("source/iphone17.png")} alt="" /> : <MockupGlyph name={project.mockup} size={22} />}</div><div><strong>{project.mockup.toUpperCase()}</strong><span>{project.mockup === "iPhone 17" ? "1,206 × 2,622" : "ANY SIZE"}</span></div><button type="button" aria-label="Change mockup" className="change-button" onClick={() => setMockupOpen((value) => !value)}>CHANGE</button></div>{mockupOpen && <MockupPicker mockup={project.mockup} onSelect={(value) => (updateProject((current) => ({ ...current, mockup: value })), setMockupOpen(false), notify(`${value} mockup selected.`))} />}<button type="button" aria-label={`Finish ${project.finish}`} className="wide-select" onClick={() => setFinishOpen((value) => !value)}><span><Box size={14} />FINISH</span><b>{project.finish.toUpperCase()}</b><ChevronDown size={12} /></button>{finishOpen && <ChoicePopover items={finishOptions} selected={project.finish} onSelect={(value) => { updateProject((current) => ({ ...current, finish: value })); setFinishOpen(false); notify(`${value} finish selected.`); }} finish />}<div className="mockup-detail-controls"><SliderRow label="Reflection" value={project.reflection.amount} min="0" max="1" step="0.01" onChange={(value) => updateProject((current) => ({ ...current, reflection: { ...current.reflection, amount: Number(value) } }))} /><SliderRow label="Roughness" value={project.reflection.roughness} min="0" max="1" step="0.01" onChange={(value) => updateProject((current) => ({ ...current, reflection: { ...current.reflection, roughness: Number(value) } }))} /></div></InspectorSection>
    <InspectorSection label="CAMERA" icon={<Camera size={13} />} open={panelSections.camera} onToggle={() => sectionToggle("camera")}><div className="camera-detail-controls"><div className="camera-tabs"><button type="button" className={!cameraPresetOpen ? "selected" : ""} onClick={() => setCameraPresetOpen(false)}>Manual</button><button type="button" aria-label="Camera presets" className={cameraPresetOpen ? "selected" : ""} onClick={() => setCameraPresetOpen((value) => !value)}>Presets</button></div>{cameraPresetOpen ? <CameraPresets selected={project.cameraPreset} onSelect={selectCameraPreset} /> : <CameraControls camera={project.camera} updateCamera={updateCamera} onKeyframe={addCameraKeyframe} />}</div></InspectorSection>
    <InspectorSection label="EFFECTS" icon={<Sparkles size={13} />} meta={project.effects.length ? `${project.effects.length} ACTIVE` : ""} open={panelSections.effects} onToggle={() => sectionToggle("effects")}><div className="effect-detail-controls"><div className="effect-list">{project.effects.map((effect) => <div className="effect-line" key={effect}><span><Sparkles size={13} />{effect}</span><button type="button" aria-label={`Remove ${effect}`} onClick={() => removeEffect(effect)}><X size={12} /></button>{["Glass Border", "Vignette", "Grain", "Sharpen", "Bloom"].includes(effect) && <SliderRow label="Amount" value={project.effectSettings[effect] || 20} min="0" max="100" unit="%" onChange={(value) => updateEffectSetting(effect, value)} />}</div>)}{!project.effects.length && <span className="empty-effect">No effects yet — add a look below.</span>}</div><button type="button" aria-label="Add effect" className="add-effect-button" onClick={() => setEffectsOpen((value) => !value)}><Plus size={13} />ADD EFFECT</button>{effectsOpen && <EffectPicker onSelect={addEffect} />}</div></InspectorSection>
  </aside>;
}

function InspectorSection({ label, meta, icon, open, onToggle, children }) { return <section className={`inspector-section ${open ? "open" : "closed"}`}><button type="button" className="inspector-section-head" aria-expanded={open} onClick={onToggle}><span className="section-icon">{icon}</span><span className="inspector-section-title"><span>{label}</span>{meta && <small>{meta}</small>}</span>{open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}</button>{open && <div className="inspector-section-body">{children}</div>}</section>; }
function SourceCard({ media, onUpload, onRemove }) { return media ? <div className="source-card source-card-filled">{media.type?.startsWith("video/") ? <video src={media.src} muted autoPlay loop playsInline /> : <img src={media.src} alt="Uploaded source" />}<div><strong>{media.name}</strong><span>{media.type?.startsWith("video/") ? "VIDEO SOURCE" : "IMAGE SOURCE"}</span></div><button type="button" aria-label="Remove source media" onClick={onRemove}><X size={14} /></button></div> : <div className="source-card"><div className="source-upload-glyph"><Upload size={15} /></div><div><strong>CLICK TO UPLOAD</strong><span>DRAG &amp; DROP OR PASTE</span></div><button type="button" aria-label="Source media" onClick={onUpload} /></div>; }
function ScenePicker({ scene, onSelect }) { return <div className="picker-grid scene-picker">{sceneOptions.map(([name, subtitle, , value]) => <button type="button" key={name} role="radio" aria-checked={scene === value} className={scene === value ? "selected" : ""} onClick={() => onSelect(value)}><span className={`scene-thumbnail ${value}`} /><span>{name}</span>{subtitle && <small>{subtitle}</small>}</button>)}</div>; }
function ChoicePopover({ items, selected, onSelect, finish = false }) { return <div className={`choice-popover ${finish ? "finish-choice" : ""}`}>{items.map((item) => <button type="button" key={item} className={selected === item ? "selected" : ""} onClick={() => onSelect(item)}>{finish && <span className={`finish-swatch ${slugify(item)}`} />}{item}{selected === item && <Check size={12} />}</button>)}</div>; }
function BackgroundPicker({ background, update, pickerOpen, setPickerOpen }) { return <div className="background-picker"><div className="picker-tabs"><button type="button" className={background.tab === "Color" ? "selected" : ""} onClick={() => update({ tab: "Color" })}>Color</button><button type="button" className={background.tab === "Preset" ? "selected" : ""} onClick={() => update({ tab: "Preset" })}>Preset</button><button type="button" className={background.tab === "Image" ? "selected" : ""} onClick={() => update({ tab: "Image" })}>Image</button></div>{background.tab === "Color" && <div className="color-picker"><label>Bg Color<input aria-label="Background color" value={background.color} onChange={(event) => update({ color: event.target.value })} /></label><div className="color-sample" style={{ background: background.color }} /></div>}{background.tab === "Preset" && <div className="background-choice"><button type="button" className="wide-select" onClick={() => setPickerOpen((value) => !value)}><span><Palette size={13} />Bg Preset</span><b>{background.preset}</b><ChevronDown size={12} /></button>{pickerOpen && <ChoicePopover items={presetOptions} selected={background.preset} onSelect={(value) => { update({ preset: value }); setPickerOpen(false); }} />}</div>}{background.tab === "Image" && <div className="background-choice"><button type="button" className="wide-select" onClick={() => setPickerOpen((value) => !value)}><span><ImagePlus size={13} />Bg Image</span><b>{background.image}</b><ChevronDown size={12} /></button>{pickerOpen && <div className="image-choice-grid">{imageOptions.map((item, index) => <button type="button" key={item} className={background.image === item ? "selected" : ""} onClick={() => { update({ image: item }); setPickerOpen(false); }}><span style={{ backgroundImage: `url(${asset(backgroundAssetMap[item] || `templates/${templateItems[index % templateItems.length][1]}`)})` }} />{item}</button>)}</div>}</div>}</div>; }
function MockupGlyph({ name, size = 25 }) {
  const arch = deviceArchetype(name);
  if (arch === "tablet") return <Layers3 size={size} />;
  if (arch === "ereader") return <BookOpen size={size} />;
  if (arch === "display") return <Box size={size} />;
  if (arch === "tv") return <Tv size={size} />;
  if (arch === "browser") return <PanelTop size={size} />;
  if (arch === "headset") return <Scan size={size} />;
  if (arch === "watch") return <Watch size={size} />;
  if (arch === "handheld") return <Gamepad2 size={size} />;
  if (arch === "laptop") return <Laptop size={size} />;
  return <Smartphone size={size} />;
}
function MockupPicker({ mockup, onSelect }) {
  const groups = [];
  for (const option of mockupOptions) {
    const label = deviceGroup(option[0]);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(option);
    else groups.push({ label, items: [option] });
  }
  return <div className="mockup-picker-grid">{groups.map(({ label, items }, groupIndex) => <Fragment key={`mockup-group-${groupIndex}`}><div className="mockup-group-label">{label}</div>{items.map(([name, tag]) => <button type="button" role="radio" aria-checked={mockup === name} className={mockup === name ? "selected" : ""} key={name} onClick={() => onSelect(name)}><span className={`mockup-thumb ${slugify(name)}`}>{name === "iPhone 17" || name === "Flat" ? <img src={asset(name === "Flat" ? "source/starter-screen.jpg" : "source/iphone17.png")} alt="" /> : <MockupGlyph name={name} />}</span><span>{name}</span>{tag && <small className="free-text">{tag}</small>}</button>)}</Fragment>)}</div>;
}
function SliderRow({ label, value, min = "0", max = "100", step = "1", unit = "", onChange, onKeyframe, disabled = false }) {
  const minNum = Number(min), maxNum = Number(max);
  const fill = `${Math.max(0, Math.min(100, ((Number(value) || 0) - minNum) / (maxNum - minNum) * 100))}%`;
  const decimals = String(step).includes(".") ? String(step).split(".")[1].length : 0;
  return <label className={`slider-row ${onKeyframe ? "has-keyframe" : ""}`}><span>{label}</span><input type="range" min={min} max={max} step={step} value={value} disabled={disabled} style={{ "--fill": fill }} onChange={(event) => onChange?.(event.target.value)} /><output>{typeof value === "number" ? Number(value).toFixed(decimals) : value}{unit}</output>{onKeyframe && <button type="button" aria-label="Add keyframe at playhead" onClick={onKeyframe}><Diamond size={12} /></button>}</label>;
}
function SwitchRow({ label, checked = false, onChange, disabled = false }) { const [local, setLocal] = useState(checked); const active = onChange ? checked : local; return <button type="button" role="switch" aria-checked={active} className="switch-row" disabled={disabled} onClick={() => onChange ? onChange(!checked) : setLocal((value) => !value)}><span>{label}</span><span className={`switch ${active ? "on" : ""}`}><span /></span></button>; }
function RadioRow({ label, options, selected, onSelect }) { return <div className="radio-row"><span className="export-label">{label}</span><div className="radio-options" role="radiogroup" aria-label={label}>{options.map((option) => <button type="button" role="radio" aria-checked={selected === option} key={option} onClick={() => onSelect?.(option)}><span className={`radio-dot ${selected === option ? "on" : ""}`} />{option}</button>)}</div></div>; }
function CameraControls({ camera, updateCamera, onKeyframe }) {
  return <div className="camera-controls">
    <div className="control-group">
      <div className="control-group-head"><span>ROTATION</span><small>±360°</small></div>
      <p className="control-group-note"><span className="nowrap">Canvas: drag orbits · scroll rotates</span><span className="nowrap"><kbd>⇧</kbd> tilt</span><span className="nowrap"><kbd>⌥</kbd> roll</span></p>
      <SliderRow label="X · Turn" value={camera.xAxis} min={CAMERA_AXIS_MIN} max={CAMERA_AXIS_MAX} step="0.01" unit="°" onKeyframe={onKeyframe} onChange={(value) => updateCamera({ xAxis: Number(value) })} />
      <SliderRow label="Y · Tilt" value={camera.yAxis} min={CAMERA_AXIS_MIN} max={CAMERA_AXIS_MAX} step="0.01" unit="°" onKeyframe={onKeyframe} onChange={(value) => updateCamera({ yAxis: Number(value) })} />
      <SliderRow label="Z · Roll" value={camera.zAxis} min={CAMERA_AXIS_MIN} max={CAMERA_AXIS_MAX} step="0.01" unit="°" onKeyframe={onKeyframe} onChange={(value) => updateCamera({ zAxis: Number(value) })} />
    </div>
    <div className="control-group">
      <div className="control-group-head"><span>FRAMING</span></div>
      <SliderRow label="FOV" value={camera.fov} min="1" max="120" step="1" unit="°" onKeyframe={onKeyframe} onChange={(value) => updateCamera({ fov: Number(value) })} />
      <SliderRow label="Zoom" value={camera.zoom} min="0.5" max="4" step="0.01" unit="×" onKeyframe={onKeyframe} onChange={(value) => updateCamera({ zoom: Number(value) })} />
      <SliderRow label="Pan X" value={camera.panX} min="-1" max="1" step="0.01" onKeyframe={onKeyframe} onChange={(value) => updateCamera({ panX: Number(value) })} />
      <SliderRow label="Pan Y" value={camera.panY} min="-1" max="1" step="0.01" onKeyframe={onKeyframe} onChange={(value) => updateCamera({ panY: Number(value) })} />
    </div>
  </div>;
}
function CameraPresets({ selected, onSelect }) { return <div className="camera-presets">{["Hero", "Angled", "Flat", "Bottom", "Detail", "Back"].map((item) => <button type="button" key={item} className={selected === item ? "selected" : ""} onClick={() => onSelect(item)}><span className={`camera-preset-thumb ${slugify(item)}`} /><span>{item}</span></button>)}</div>; }
function EffectPicker({ onSelect }) { return <div className="effect-picker-inline">{effectOptions.map((effect) => <button type="button" key={effect} onClick={() => onSelect(effect)}><Sparkles size={12} />{effect}</button>)}</div>; }

function MobileDock({ project, updateProject, updateBlur, updateCamera, undo, redo, canUndo, canRedo, active, setActive, effectsOpen, setEffectsOpen, addEffect, removeEffect, onShowBlurTip, onUpload, notify }) {
  return <section className={`mobile-dock ${project.mobileDockLeft ? "left-handed" : ""}`}><div className="mobile-control-surface">{active === "settings" && <MobileSettings leftHanded={project.mobileDockLeft} setLeftHanded={(value) => updateProject((current) => ({ ...current, mobileDockLeft: value }))} />}{active === "effects" && <MobileEffects effects={project.effects} effectSettings={project.effectSettings} effectsOpen={effectsOpen} setEffectsOpen={setEffectsOpen} addEffect={addEffect} removeEffect={removeEffect} updateEffectSetting={(effect, value) => updateProject((current) => ({ ...current, effectSettings: { ...current.effectSettings, [effect]: Number(value) } }))} />}{active === "blur" && <MobileBlur blur={project.blur} update={updateBlur} onShowTip={onShowBlurTip} />}{active === "mockup" && <MobileMockup finish={project.finish} mockup={project.mockup} setFinish={(value) => updateProject((current) => ({ ...current, finish: value }))} setMockup={(value) => updateProject((current) => ({ ...current, mockup: value }))} />}{active === "scene" && <MobileScene project={project} updateProject={updateProject} notify={notify} />}{active === "camera" && <MobileCamera mode={project.cameraMode} setMode={(value) => updateProject((current) => ({ ...current, cameraMode: value }))} camera={project.camera} updateCamera={updateCamera} />}</div><div className="mobile-tabs" role="tablist" aria-label="Control set"><button type="button" role="tab" aria-label="Dock settings" aria-selected={active === "settings"} className={active === "settings" ? "selected" : ""} onClick={() => setActive("settings")}><Settings2 size={14} /></button><button type="button" role="tab" aria-label="Effects controls" aria-selected={active === "effects"} className={active === "effects" ? "selected" : ""} onClick={() => setActive("effects")}><Sparkles size={14} /></button><button type="button" role="tab" aria-label="Blur controls" aria-selected={active === "blur"} className={active === "blur" ? "selected" : ""} onClick={() => setActive("blur")}><SunMedium size={14} /></button><button type="button" role="tab" aria-label="Mockup controls" aria-selected={active === "mockup"} className={active === "mockup" ? "selected" : ""} onClick={() => setActive("mockup")}><Smartphone size={14} /></button><button type="button" role="tab" aria-label="Scene controls" aria-selected={active === "scene"} className={active === "scene" ? "selected" : ""} onClick={() => setActive("scene")}><span className="globe-icon" /></button><button type="button" role="tab" aria-label="Camera controls" aria-selected={active === "camera"} className={active === "camera" ? "selected" : ""} onClick={() => setActive("camera")}><Camera size={14} /></button></div><div className="mobile-history"><IconButton label="Undo" onClick={undo} disabled={!canUndo}><Undo2 size={13} /></IconButton><IconButton label="Redo" onClick={redo} disabled={!canRedo}><Redo2 size={13} /></IconButton></div><IconButton label="Source media" className="mobile-upload" onClick={onUpload}><Upload size={14} /></IconButton></section>;
}
function MobileSettings({ leftHanded, setLeftHanded }) { return <div className="mobile-settings"><strong>Settings</strong><div className="handed-buttons"><button type="button" className={leftHanded ? "selected" : ""} onClick={() => setLeftHanded(true)}><PanelLeft size={15} />Left handed</button><button type="button" className={!leftHanded ? "selected" : ""} onClick={() => setLeftHanded(false)}><PanelLeft size={15} />Right handed</button></div></div>; }
function MobileEffects({ effects, effectSettings, effectsOpen, setEffectsOpen, addEffect, removeEffect, updateEffectSetting }) { return <div className="mobile-effects"><strong>Effects</strong>{!effects.length && !effectsOpen && <span>No effects</span>}{effects.map((effect) => <div className="mobile-effect-card" key={effect}><b>[{effect.toUpperCase()}]</b><button type="button" onClick={() => removeEffect(effect)}>REMOVE</button>{effect === "Glass Border" && <SliderRow label="Glass Border" value={effectSettings[effect] || 30} min="0" max="100" onChange={(value) => updateEffectSetting(effect, value)} />}</div>)}<button type="button" className="mobile-add-effect" onClick={() => setEffectsOpen((value) => !value)}><Plus size={13} />Add effect</button>{effectsOpen && <div className="mobile-effect-picker">{effectOptions.map((effect) => <button type="button" key={effect} onClick={() => addEffect(effect)}>{effect}</button>)}</div>}</div>; }
function MobileBlur({ blur, update, onShowTip }) { return <div className="mobile-blur"><strong>Blur</strong><SliderRow label="Str" value={blur.strength} min="0" max="100" onChange={(value) => update({ strength: Number(value) })} /><SliderRow label="Size" value={blur.size} min="0" max="1" step="0.01" onChange={(value) => update({ size: Number(value) })} /><SliderRow label="Fall" value={blur.falloff} min="0" max="1" step="0.01" onChange={(value) => update({ falloff: Number(value) })} /><SwitchRow label="Bokeh" checked={blur.bokeh} onChange={(value) => update({ bokeh: value })} /><button type="button" className="blur-mode-button" onClick={() => { update({ mode: blur.mode === "radial" ? "directional" : blur.mode === "directional" ? "tilt" : "radial" }); onShowTip(); }}>Blur type: {blur.mode === "radial" ? "Radial blur" : blur.mode === "directional" ? "Directional blur" : "Tilt shift blur"}. Activate for {blur.mode === "radial" ? "Directional blur" : blur.mode === "directional" ? "Tilt shift blur" : "Radial blur"}</button></div>; }
function MobileMockup({ finish, setFinish, mockup, setMockup }) { return <div className="mobile-mockup"><strong>Mockup</strong><div className="mobile-dials"><button type="button" onClick={() => setFinish(finish === "White" ? "Black" : "White")}><span className={`finish-swatch ${slugify(finish)}`} />LIGHT<br /><b>{finish.slice(0, 5)}</b></button><button type="button" onClick={() => setMockup(mockup === "iPhone 17" ? "Flat" : "iPhone 17")}><Smartphone size={16} />{mockup === "Flat" ? "FLAT" : "17"}</button><button type="button" onClick={() => setMockup("iPhone 17")}><span>RAD</span><b>0.000</b></button></div></div>; }
function MobileScene({ project, updateProject, notify }) { return <div className="mobile-scene"><strong>Scene</strong><div className="mobile-dials"><button type="button" onClick={() => updateProject((current) => ({ ...current, scene: "custom", lighting: current.lighting === "Default" ? "Studio Soft" : "Default" }))}><span className="finish-swatch white" />LIGHT<br /><b>{project.lighting.toUpperCase()}</b></button><button type="button" onClick={() => { updateProject((current) => ({ ...current, scene: "custom", background: { ...current.background, tab: "Image", image: current.background.image === "Whisp" ? "Sky" : "Whisp" } })); notify("Background & scene settings apply to all shots."); }}><Palette size={15} />BG<br /><b>{project.background.image.toUpperCase()}</b></button></div></div>; }
function MobileCamera({ mode, setMode, camera, updateCamera }) {
  return <div className="mobile-camera">
    <div className="mobile-camera-row">
      <div className="camera-radios" role="radiogroup" aria-label="Viewport drag controls"><button type="button" role="radio" aria-label="Drag moves the camera" aria-checked={mode === "move"} className={mode === "move" ? "selected" : ""} onClick={() => setMode("move")}><Move3d size={14} /></button><button type="button" role="radio" aria-label="Drag tilts the camera" aria-checked={mode === "tilt"} className={mode === "tilt" ? "selected" : ""} onClick={() => setMode("tilt")}><MousePointer2 size={14} /></button><button type="button" role="radio" aria-label="Drag zooms the camera" aria-checked={mode === "zoom"} className={mode === "zoom" ? "selected" : ""} onClick={() => setMode("zoom")}><ZoomIn size={14} /></button></div>
      <label className="mobile-fov-dial" aria-label="Field of view"><span>FOV</span><output>{camera.fov}°</output><input type="range" min="1" max="120" value={camera.fov} onChange={(event) => updateCamera({ fov: Number(event.target.value) })} /></label>
    </div>
    <div className="mobile-rotation" role="group" aria-label="Device rotation">
      <SliderRow label="X" value={camera.xAxis} min={CAMERA_AXIS_MIN} max={CAMERA_AXIS_MAX} step="1" unit="°" onChange={(value) => updateCamera({ xAxis: Number(value) })} />
      <SliderRow label="Y" value={camera.yAxis} min={CAMERA_AXIS_MIN} max={CAMERA_AXIS_MAX} step="1" unit="°" onChange={(value) => updateCamera({ yAxis: Number(value) })} />
      <SliderRow label="Z" value={camera.zAxis} min={CAMERA_AXIS_MIN} max={CAMERA_AXIS_MAX} step="1" unit="°" onChange={(value) => updateCamera({ zAxis: Number(value) })} />
    </div>
  </div>;
}

function ModalShell({ children, className = "", onClose, ariaLabel }) { return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}><div className={`modal-card ${className}`} role="dialog" aria-modal="true" aria-label={ariaLabel}>{onClose && <IconButton label="Close" className="modal-close" onClick={onClose}><X size={15} /></IconButton>}{children}</div></div>; }
function InfoModal({ onClose, notify }) { const [email, setEmail] = useState(""); const [status, setStatus] = useState(""); return <ModalShell className="info-modal" onClose={onClose} ariaLabel="Info"><div className="info-banner"><img src={asset("source/openmock.svg")} alt="OpenMock" /></div><div className="info-main"><img className="info-wordmark" src={asset("source/openmock.svg")} alt="OpenMock" /><strong>Version 2.42.1</strong><p>Open-source prototype by <a href="https://github.com/magare/openmock" target="_blank" rel="noreferrer">magare</a></p><div className="waitlist"><strong>Join the waitlist for V3</strong><div><input aria-label="Email address" type="email" value={email} placeholder="you@email.com" onChange={(event) => setEmail(event.target.value)} /><button type="button" onClick={() => { if (!email.includes("@")) { setStatus("Enter a valid email."); return; } setStatus("You’re on the list."); notify("Waitlist signup saved locally."); }}>Join</button></div>{status && <small className="form-status">{status}</small>}</div><div className="community-links"><span>Community</span><a href="https://github.com/magare/openmock" target="_blank" rel="noreferrer">View on GitHub <ExternalLink size={11} /></a></div></div><div className="info-footer"><span>©2026 OpenMock</span><span><a href="/sign-in">Account</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></span></div></ModalShell>; }
function ShortcutsModal({ onClose }) { return <ModalShell className="shortcuts-modal" onClose={onClose} ariaLabel="Keyboard shortcuts"><div className="modal-heading"><span>Keyboard shortcuts</span><small>?</small></div><div className="shortcut-list"><div><span>Undo</span><kbd>⌘ Z</kbd></div><div><span>Redo</span><kbd>⇧ ⌘ Z</kbd></div><div><span>Toggle timeline</span><kbd>T</kbd></div><div><span>Orbit device</span><kbd>Drag</kbd></div><div><span>Rotate device</span><kbd>Scroll</kbd></div><div><span>Tilt — Y axis</span><kbd>⇧ + scroll</kbd></div><div><span>Roll — Z axis</span><kbd>⌥ + scroll</kbd></div><div><span>Zoom</span><kbd>⌘/Ctrl + scroll</kbd></div><div><span>Move camera</span><kbd>Space + drag</kbd></div><div><span>Paste media</span><kbd>⌘ V</kbd></div></div></ModalShell>; }
function PreferencesModal({ onClose, isDark, onToggleTheme, reduceMotion, onReduceMotion, showTips, onShowTips }) { return <ModalShell className="preferences-modal" onClose={onClose} ariaLabel="Preferences"><div className="modal-heading"><span>Preferences</span><Settings2 size={15} /></div><p className="modal-copy">Local editor preferences are saved in this browser.</p><SwitchRow label="Dark mode" checked={isDark} onChange={onToggleTheme} /><SwitchRow label="Reduce motion" checked={reduceMotion} onChange={onReduceMotion} /><SwitchRow label="Show onboarding tips" checked={showTips} onChange={onShowTips} /><button type="button" className="primary-wide" onClick={onClose}>Done</button></ModalShell>; }
function AccountModal({ onClose }) { return <ModalShell className="account-modal" onClose={onClose} ariaLabel="Account"><div className="modal-heading"><span>Sign in</span><Smartphone size={15} /></div><p className="modal-copy">Sign in is simulated locally in this recreation. Your projects are saved in this browser and every editor feature is available for free.</p><input className="modal-input" aria-label="Email address" type="email" placeholder="you@email.com" /><button type="button" className="primary-wide" onClick={onClose}>Continue</button></ModalShell>; }
function FeedbackModal({ onClose, notify }) { const [message, setMessage] = useState(""); return <ModalShell className="feedback-modal" onClose={onClose} ariaLabel="Send feedback"><div className="modal-heading"><span>Send feedback</span><Send size={15} /></div><p className="modal-copy">Tell the OpenMock team what you’d like to see next.</p><textarea aria-label="Feedback" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Your feedback…" /><button type="button" className="primary-wide" onClick={() => { notify(message ? "Feedback saved locally." : "Write a note before sending."); if (message) onClose(); }}>Send feedback</button></ModalShell>; }
function ChangelogModal({ onClose }) { return <ModalShell className="changelog-modal" onClose={onClose} ariaLabel="Changelog"><div className="modal-heading"><span>Changelog</span><RefreshCw size={15} /></div><div className="changelog-entry"><strong>2.42.1</strong><span>Improved templates, Auto-motion, mobile controls, and export workflows.</span></div><div className="changelog-entry"><strong>2.42.0</strong><span>Added camera keyframe recording and new scene controls.</span></div></ModalShell>; }
function AutoMotionIntro({ onClose, onExplore, onShow }) { return <ModalShell className="auto-intro-modal" onClose={onClose} ariaLabel="Auto-motion"><div className="auto-header"><Wand2 size={18} /><span>Auto-motion</span></div><div className="auto-body"><h2>A new way to add motion to your videos.</h2><div className="auto-steps"><p><b>1</b> Click and drag to draw a focus area on your media – a shiny button, a sidebar or something important.</p><p><b>2</b> Draw your next focus area.</p><p><b>3</b> Repeat as many times as you need and then hit compose! Not happy with it? Hit shuffle.</p></div><div className="auto-note">That’s it, Auto-motion will have done the hard work and created a smooth, beautiful animation between your focus areas.</div><div className="auto-actions"><button type="button" onClick={onExplore}>I’ll explore</button><button type="button" className="primary-button" onClick={onShow}>Show me how</button></div></div></ModalShell>; }
function AutoMotionWorkspace({ areas, setAreas, onClose, onCompose }) {
  const [motionType, setMotionType] = useState("3d");
  const [speed, setSpeed] = useState("Fast");
  const drag = useRef(null);
  const preview = useRef(null);
  const handleDown = (event) => { const bounds = preview.current.getBoundingClientRect(); drag.current = { x: event.clientX - bounds.left, y: event.clientY - bounds.top, bounds }; event.currentTarget.setPointerCapture?.(event.pointerId); };
  const handleUp = (event) => { if (!drag.current) return; const { x, y, bounds } = drag.current; const endX = event.clientX - bounds.left; const endY = event.clientY - bounds.top; const left = Math.min(x, endX) / bounds.width * 100; const top = Math.min(y, endY) / bounds.height * 100; const width = Math.abs(endX - x) / bounds.width * 100; const height = Math.abs(endY - y) / bounds.height * 100; if (width > 3 && height > 3) setAreas((current) => [...current, { x: left, y: top, width, height }]); drag.current = null; };
  return <ModalShell className="auto-workspace-modal" onClose={onClose} ariaLabel="Auto-motion"><div className="workspace-title"><span>AUTO-MOTION</span><button type="button" onClick={() => setAreas([])}>Reset</button></div><p>Draw at least two focus areas in the order the camera should visit them.</p><div ref={preview} className="auto-preview" onPointerDown={handleDown} onPointerUp={handleUp}><img src={asset("source/starter-screen.jpg")} alt="Media focus preview" />{areas.map((area, index) => <span key={`${area.x}-${index}`} className="auto-area" style={{ left: `${area.x}%`, top: `${area.y}%`, width: `${area.width}%`, height: `${area.height}%` }}><b>{index + 1}</b></span>)}</div><div className="workspace-options"><label><input type="radio" name="motion" checked={motionType === "3d"} onChange={() => setMotionType("3d")} />3D motion</label><label><input type="radio" name="motion" checked={motionType === "2d"} onChange={() => setMotionType("2d")} />2D motion</label>{["Fast", "Medium", "Slow"].map((item) => <label key={item}><input type="radio" name="speed" checked={speed === item} onChange={() => setSpeed(item)} />{item}</label>)}</div><button type="button" className="primary-wide" onClick={() => onCompose({ motionType, speed })} disabled={areas.length < 2}>Compose <Wand2 size={14} /></button>{areas.length > 0 && <span className="focus-count">{areas.length} focus area{areas.length > 1 ? "s" : ""}{areas.length < 2 ? " — add one more" : ""}</span>}</ModalShell>;
}
function RecordingModal({ onClose, onStart }) { return <ModalShell className="recording-modal" onClose={onClose} ariaLabel="Recording keyframes"><div className="modal-heading"><span>Recording keyframes</span><CircleStop size={16} /></div><ol><li>Start recording – camera and blur changes will be pinned at the playhead.</li><li>Move the playhead, then tweak a camera dial or a blur control.</li><li>Repeat at new times to build the animation.</li><li>Stop recording, return to the start, and press play.</li></ol><div className="recording-tips"><strong>Tip:</strong> Select a keyframe chip to inspect it, use the diamond buttons to pin the current pose, and use the wand button to change easing.</div><button type="button" className="primary-wide" onClick={onStart}>Start recording <CircleStop size={14} /></button></ModalShell>; }

const tourContent = [["WELCOME TO OPENMOCK", "A quick tour of the editor — about 30 seconds. You can skip any time, and start the tour again from the Help menu."], ["THE VIEWPORT", "Use your mouse or trackpad to interact with the 3D mockup."], ["ADD MEDIA", "Drag and drop an image or video on the viewport, or paste with ⌘V."], ["THE TIMELINE", "Set key frames and animate the camera so you can export dynamic videos."], ["CONTROLS", "Camera, lighting, depth of field, background, and effects — all here. Collapse sections to keep it tidy."], ["THE MENU", "This is the main navigation menu. It includes links to your projects, templates, saving the project, community links, and more."], ["EXPORT", "When you're done, render to PNG, JPEG, or video from here."], ["YOU’RE SET", "Drop in a screenshot to get started. You can replay this tour any time from the Help menu."]];
function TourModal({ step, onSkip, onNext }) { const [title, body] = tourContent[step - 1] || tourContent[0]; if (!tourContent[step - 1]) return null; return <div className="tour-backdrop"><div className="tour-card" role="dialog" aria-label={`Tour step ${step} of 8`}><div className="tour-card-top"><span>{step}/8</span><button type="button" onClick={onSkip}>Skip tour</button></div><div className="tour-icon"><img src={asset("source/openmock.svg")} alt="" /></div><p className="tour-eyebrow">{step === 1 ? "WELCOME TO OPENMOCK" : title}</p><h2>{step === 1 ? "Quick tour" : title}</h2><p>{body}</p>{step === 2 && <div className="tour-controls"><span>Orbit <b>Drag</b></span><span>Rotate <b>Scroll</b></span><span>Tilt — Y axis <b>⇧ + Scroll</b></span><span>Roll — Z axis <b>⌥ + Scroll</b></span><span>Zoom <b>⌘/Ctrl + Scroll</b></span><span>Move <b>Space + Drag</b></span></div>}<button type="button" className="tour-next" onClick={onNext}>{step === 8 ? "Done" : "Next"}<ChevronRight size={14} /></button></div></div>; }
function MobileTipRouter({ tip, onClose, onNext }) { if (tip === "welcome") return <MobileWelcome onClose={() => { window.localStorage.setItem("openmock-mobile-onboarded", "1"); onNext("tip-1"); }} onSend={() => { window.localStorage.setItem("openmock-mobile-onboarded", "1"); onNext("tip-1"); }} />; const content = { "tip-1": ["Mobile tips", "Tap here to upload new media", "tip-2"], "tip-2": ["Mobile tips", "Change the viewport size ratio here", "tip-3"], "tip-3": ["Mobile tips", "Tap, hold and move your finger around on the viewport above to tilt the camera", "tip-4"], "tip-4": ["Mobile tips", "Switch between move, tilt and zoom in the camera dock", "done"], "blur-1": ["Mobile tips", "With Blur selected, drag in the viewport to move the focus area", "blur-2"], "blur-2": ["Mobile tips", "Use Strength, Size, and Falloff for precise focus control", "done"] }[tip]; return <div className="mobile-tour-backdrop"><div className="mobile-tip-card" role="dialog" aria-modal="true" aria-label="Mobile tips"><span className="tip-pip" /><h2>{content[0]}</h2><p>{content[1]}</p><button type="button" className="primary-button" onClick={() => onNext(content[2])}>{content[2] === "done" ? "DONE" : "NEXT"}</button><button type="button" className="tip-skip" onClick={onClose}>Skip</button></div></div>; }
function MobileWelcome({ onClose, onSend }) { return <div className="mobile-tour-backdrop"><div className="mobile-welcome" role="dialog" aria-label="Welcome to OpenMock on mobile"><div className="tour-icon"><img src={asset("source/openmock.svg")} alt="" /></div><h2>Welcome to OpenMock on mobile</h2><p>For the full experience including video editing and animation, switch to desktop — send yourself the link so it’s waiting when you get there.</p><div className="mobile-dialog-actions"><button type="button" onClick={onClose}>Close</button><button type="button" className="primary-button" onClick={onSend}>Send to yourself <Send size={13} /></button></div></div></div>; }
