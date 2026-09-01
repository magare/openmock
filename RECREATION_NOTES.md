# OpenMock recreation notes

This folder contains the runnable local OpenMock editor prototype. Its visual reference was inspected in the Codex in-app browser on 2026-08-30. The source is an interactive editor workspace rather than a conventional marketing page.

## Run and build

```bash
npm install
npm run dev
npm run build
npm run test:sites
npm run test:editor
```

The production build is prepared for the generated Sites packaging contract by the starter project. The app lives in `src/App.jsx` and `src/styles.css`; source media is copied into `public/assets/source`, and captured template thumbnails are in `public/assets/templates`.

## Reference identity

- Page title: `OpenMock — Turn product screens into premium visuals`.
- Product type: browser-based 3D mockup editor for turning product screens into premium stills and animated videos.
- Reference version shown in the Info panel: `2.42.1`.
- Reference footer: `©2026 OpenMock`.
- Reference author link: `@joshmillgate`.
- Reference community links: Discord and X/Twitter.
- The reference loaded a Three.js-style GLB device model and an HDR studio environment in addition to the raster UI and background assets. The exact `iphone-17-p-sim.glb` and `brown_photostudio_04_2k.hdr` files are bundled under `public/assets/source` and wired through `src/ThreeStage.jsx` with local Basis transcoder files. Browsers without WebGL automatically use the responsive local CSS device fallback so the editor remains usable in constrained preview environments.

## Desktop geometry observed

At the captured 1121 × 789 desktop viewport:

- Page background is a very light neutral gray, approximately `#e9e9e9`.
- Outer page inset is approximately 14px.
- The left editor column is approximately 803px wide.
- The right inspector is fixed at approximately 280px wide.
- The gap between the left column and inspector is approximately 10px.
- Top toolbar height is approximately 40px.
- Main viewport begins around y=64px, has a rounded 16px frame, and is approximately 803 × 659px in the source's compact default state.
- Timeline begins around y=733px and is approximately 42px high in the source's compact default state; it expands to the full editor timeline on demand.
- Inspector begins at the top page inset and extends down to the bottom page inset; it has a rounded 16px frame and its own vertical scroll.
- The main viewport and right inspector stay visually separate; timeline controls belong to the left column.
- The UI uses a compact Geist-like sans/monospace pairing. Labels, toolbar commands, timeline metadata, and numeric controls use a small uppercase/monospace treatment.
- Primary accent is warm orange, approximately `#f07d28`.
- Most controls are compact rounded pills or small cards with 6–11px corner radii.

## Desktop toolbar

The reference toolbar contains these visible concepts, in order:

1. Main menu button.
2. OpenMock circular mark.
3. `INFO`.
4. `TEMPLATES` with a down chevron.
5. `HELP`.
6. A `FREE CAPTURES` indicator.
7. At wider breakpoints, a local `Save project` control.
8. `FREE` pill.
9. `FILL` viewport ratio control.
10. Dark `EXPORT` control.

The clone keeps the inspector theme toggle in the inspector, and also exposes a compact theme control in the top bar where the mobile source does.

## Main viewport

The reference initial state shows:

- A light abstract whisp background with broad diagonal white curves.
- An angled black-and-white iPhone 17-style mockup.
- The supplied camera-style starter screen on the front of the device.
- A small circular source-media thumbnail in the upper-right corner of the viewport on mobile.
- No extra stage label in the current capable desktop capture.
- A black upload toast reading `Upload media to get started — or paste / drop.` with an orange `Upload` action.
- A subtle center point; center guides can be enabled from the timeline toolbar.

The recreation keeps the same visual hierarchy and uses the captured starter screen, whisp background, white device panel, and OpenMock mark from the source asset inventory.

## 3D renderer implementation

The stage is now a real Three.js renderer whenever WebGL is available. `src/ThreeStage.jsx` owns one transparent `WebGLRenderer` per stage, renders in sRGB with ACES filmic tone mapping, keeps the drawing buffer for local captures, decodes the source GLB's Meshopt-compressed geometry and Basis textures, and reports its lifecycle through `data-renderer-status="loading"`, `"ready"`, or `"fallback"`. The iPhone display uses an unlit source-media material so the supplied black camera UI stays legible, while colorful source body materials map to the selected finish. The CSS device is hidden only after the WebGL scene is ready, so model swaps cannot leave two devices composited on top of each other.

### Exact source model path

- The `iPhone 17`, `iPhone 17 Pro`, and `iPhone 17 Pro Max` options use `public/assets/source/iphone-17-p-sim.glb`, the exact compressed model discovered from the reference page, so the full iPhone family shares the same high-detail physical source.
- `KTX2Loader` points at `public/assets/basis/` and calls `detectSupport(renderer)` before `GLTFLoader` loads the model, matching the model's `KHR_texture_basisu` requirement.
- The model's `proDisplayScreen` role metadata is identified from the GLB extras and receives the current local image/video screen texture. This keeps uploaded media mapped to the actual 3D display surface rather than only to a fallback DOM image.
- The source `brown_photostudio_04_2k.hdr` is loaded through `HDRLoader`, converted with `PMREMGenerator`, and assigned as the local scene environment.
- Loaded meshes use physical material properties from the source model plus controlled clearcoat, roughness, environment intensity, cast-shadow, and receive-shadow settings. Finish changes recolor the hardware while leaving the screen texture neutral.

### Procedural 3D device rigs

The other mockups use local geometry so every picker option still produces a genuine 3D object even though only the iPhone family source GLB was available locally:

- Phone/tablet variants use rounded metal bodies, raised bezels, separate display/glass layers, side buttons, a top island, camera sensors, and tablet proportions.
- `iPad mini` is an additional free tablet option with a narrower, shorter tablet body and the same screen-media, finish, reflection, camera, and shadow bindings as `iPad Pro`.
- MacBook variants use a separate display shell and screen, hinged base, keyboard deck, individual rounded keycaps, trackpad, hinge, and a metal chassis.
- `iMac 24"` uses a compact desktop display shell with a wider chin, neck, and weighted foot; `Studio Display` uses a wider near-edge-to-edge panel with its own stand proportions.
- `XDR Display` uses a large rounded display shell, inset screen/glass, neck, and weighted foot.
- `Apple Vision Pro` uses a dedicated headset rig with a rounded visor, two textured lens surfaces, transparent lens covers, bridge, side arms, cushion, and rear head band.
- `Apple Watch Ultra 3` uses a rounded metal case, raised screen/glass, separate strap, and side crown.
- `Flat` is a front-facing rounded device treatment with no camera roll, while phone, tablet, watch, laptop, and display states use device-specific roll multipliers so wide hardware does not become an unusable diagonal crop.

All procedural parts use `MeshPhysicalMaterial` with metalness, roughness, clearcoat, transmission/opacity where appropriate, local screen media textures, soft bevels, and real directional shadows. The camera effect maps the source camera values into 3D rotation, pan, FOV, zoom, and device-specific distance. Tall mobile viewports increase camera distance to preserve the source's large editorial crop without clipping the entire model.

### Lighting, finish, and effects bindings

- The scene combines hemisphere fill, warm key, cool rim, and front fill lights. The Lighting picker changes their intensities and color; the Light Rotation sliders rotate the key source; Contact Shadow changes the ground shadow opacity and all device meshes are shadow casters/receivers.
- Reflection amount and roughness update the procedural glass and loaded physical materials. Finish options drive the hardware palette for white, black, mist blue, sage, and lavender states.
- The stage background remains the source local CSS image/preset/color surface behind the transparent renderer. Vignette, grain, pixel-grid, and chromatic-aberration effects are rendered as stage overlays so they remain visible over WebGL; Bloom increases renderer exposure while the glass/clearcoat response remains in the 3D materials.
- The same renderer is enabled on desktop and mobile. If WebGL creation or the GLB path fails, the existing local CSS device fallback remains available and all controls continue to work.

## Main menu

Clicking `Open menu` opens a white compact menu. The observed items are:

- Sign in.
- Undo — `⌘Z`.
- Redo — `⇧⌘Z`, disabled initially.
- Toggle timeline — `T`, checked initially.
- Preferences.
- Info.
- Help.
- Community.
- Changelog.

The clone keeps the menu interactions and routes `Info` and `Help` into the matching local panels.

## Info panel

The Info panel is a centered modal with a dark OpenMock banner, light content, and a dark footer. Observed content:

- OpenMock mark.
- `Version 2.42.1`.
- `Made by @joshmillgate`.
- `Join the waitlist for V3`.
- Email field with `you@email.com` placeholder and `Join` action.
- `Community` heading.
- `Join Discord`.
- `Follow on X`.
- `©2026 OpenMock`.
- `Account`, `Privacy`, and `Terms` footer links.

The clone includes the modal and realistic local form behavior without submitting any external form.

## Templates panel

`TEMPLATES` opens a card grid under the toolbar. The observed selector begins with a `Starter` heading and loads thumbnail cards. The reference template names, in DOM order, are:

- Concrete Macbook — FREE.
- Macbook 2 — FREE.
- Dark Room Macbook — FREE.
- Macbook 1 — FREE.
- Watch ultra 1 — FREE.
- iPhone 1 — FREE.
- iPhone 2 — FREE.
- App Store iPhone Images.
- XDR 1 — FREE.
- Tablet corner.
- Linear.
- Brutal phone — FREE.
- Spectrum Warfare.
- Hero detail.
- Flat look.
- Violet Glass.
- Clean demo.

The local cards use the downloaded reference thumbnails, and selecting one gives local feedback rather than changing a remote project.

## Help panel

`HELP` opens a menu with:

- Contact.
- Send feedback.
- Docs — `Coming soon`, disabled.
- Restart tour.
- Tour the timeline.
- Tour Auto-motion.
- Keyboard shortcuts — `?`.

The clone implements the tour restart, timeline-tour feedback, Auto-motion launch, and keyboard-shortcuts modal locally.

## Welcome tour

The first desktop visit shows an 8-step dark tour modal. The reference copy is:

1. `WELCOME TO OPENMOCK` — a roughly 30-second editor tour that can be skipped or restarted from Help.
2. `THE VIEWPORT` — use mouse or trackpad to interact with the 3D mockup. Controls: orbit with scroll or click-drag, tilt with Shift + scroll, roll with Option + scroll, zoom with Cmd/Ctrl + scroll, and move with Space + click-drag.
3. `ADD MEDIA` — drag and drop an image/video on the viewport or paste with `⌘V`.
4. `THE TIMELINE` — set keyframes and animate the camera for dynamic videos.
5. `CONTROLS` — camera, lighting, depth of field, background, and effects are in the sidebar; collapse sections to keep it tidy.
6. `THE MENU` — navigation, projects, templates, saving, community links, and more.
7. `EXPORT` — render to PNG, JPEG, or video.
8. `YOU’RE SET` — drop in a screenshot to get started; the tour can be replayed from Help.

The clone persists a completed desktop tour in local storage so the clean editor is available on later visits, while `Restart tour` reopens it.

## Viewport ratio menu

The `FILL` selector exposes these ratios:

- Fill.
- 21:9.
- 16:9.
- 3:2.
- 4:3.
- 1:1.
- 4:5.
- 3:4.
- 2:3.
- 9:16.

It also exposes App Store presets:

- App Store · iPhone — 1290 × 2796.
- App Store · iPad — 2064 × 2752.
- App Store · Mac — 2880 × 1800.
- App Store Video · Horizontal — 1920 × 1080.
- App Store Video · Vertical — 1080 × 1920.

The clone keeps these labels, selection state, and local ratio feedback. Ratio changes preserve the editor chrome and update the stage class for responsive framing.

## Export panel

`EXPORT` opens a two-tab panel.

### Image tab

- Image format selector: `JPG — SMALLEST FILE` initially.
- Alternatives: `PNG — LOSSLESS, TRANSPARENCY` and `WEBP — MODERN, SMALL`.
- `OpenMock watermark` switch, unchecked initially so exports are clean by default.
- `Transparent Background` switch, off initially.
- Orientation segmented control: Landscape selected, Square, Portrait.
- Size selector: `16:9 — 1920×1080 (1080P)`.
- Summary: `1920×1080`, `JPG`, `Smallest file. No transparency.`.
- `Export Image` action.

### Video tab

- Orientation: Landscape selected; Square and Portrait are available.
- Size: `16:9 — 1280×720 (720P)`.
- Quality: Low, Med selected, High, and Ultra are available.
- Frame rate: 30 fps selected, 60 fps.
- Motion Blur: Off selected; Low, Med, and High are available.
- Transparent Background switch.
- Summary: `1280 × 720`, `30 fps · ~7 Mbps`, `Balanced quality and size.`.
- `Export Video` action.
- Exports all 2 scenes back to back.
- Warning to keep the tab open because minimising or switching tabs pauses the export.

The clone reproduces the panel and controls without creating a real export or contacting a remote service.

## Timeline

The reference defaults to Advanced mode and contains two scene/shot rows.

### Toolbar

- Timeline resize handle.
- `SIMPLE` / `ADVANCED` mode selector; Advanced is selected initially.
- `PRESETS`.
- `AUTO-MOTION`.
- In Advanced mode, `RECORD KEYFRAMES`.
- In Simple mode, `ADD SHOT`.
- Playhead time, initially around `00:00.0 / 00:06.00`.
- Duration input, initially `0:12`.
- Back to start.
- Play/Pause.
- Loop toggle.
- Add track.
- Center guides toggle.
- Timeline zoom slider.
- Minimize timeline.
- Scrub timeline slider.

### Simple mode

Simple mode displays two rounded shot clips. Adding a shot at the current playhead adds a third shot segment to Shot 1 and exposes selected-shot feedback.

### Advanced mode

Advanced mode displays shot tracks and keyframe controls. Selecting/expanding a layer exposes representative rows for:

- Pan X — `0.03`.
- Pan Y — `-0.17`.
- X Axis — `-24.52`.
- Y Axis — `8.25`.

The clone supports expanding the layer, play/pause progression, loop state, scrubbing, center guides, timeline minimising, and the recording flow.

### Add-track menu

The observed menu heading is `Add to timeline`. Items:

- Media — `New shot from image or video`.
- Text — `Title or caption shot`.
- Logo — `Brand mark shot`.
- Audio — `Music or voiceover track`.

### Recording keyframes

The reference opens a `Recording keyframes` modal with four instructions:

1. Press REC; camera and blur changes are recorded.
2. Move the playhead and tweak a sidebar or viewport dial.
3. Repeat to build animations.
4. Stop recording and view the animation.

It also explains copying/pasting keyframes, drag-selecting multiple keyframes, moving them, and changing easing. The clone includes the modal, Start recording action, active Recording state, and stop behavior.

## Auto-motion

The reference Auto-motion onboarding modal has an orange header and explains:

- Draw a focus area on important media.
- Draw the next focus area.
- Repeat as needed, then compose; shuffle is available when the motion is not right.
- Auto-motion creates a smooth animation between focus areas.

It provides `I’ll explore` and `Show me how`. The clone opens the onboarding panel, supports continuing into an Auto-motion workspace, shows 3D/2D and Fast/Medium/Slow options, supports drawing a focus box over the viewport, Reset, and Compose feedback.

## Inspector sections

The right inspector is scrollable and contains these visible sections:

### Source

- `SOURCE` header.
- Empty upload card with upload icon.
- `CLICK TO UPLOAD`.
- `DRAG & DROP OR PASTE`.

### Scene

`Change scene` opens a card/radio selector:

- Custom scene — `Custom lighting + background`, FREE.
- Dark Room MacBook — FREE.
- Concrete Dark — FREE.
- Studio — FREE.

The clone preserves the selected custom state and makes every scene preset directly selectable.

### Lighting

Observed choices:

- Default.
- Studio Soft.
- Dark Rim.
- Two Tone.
- Warm Glow.

The clone updates the selected label and stage state.

### Background

The background selector has Color, Preset, and Image tabs.

Color state:

- `Bg Color`.
- `#F2F2F2` initially.
- Color swatch/input.

Preset state:

- `Bg Preset`.
- None, Mono, Metal, Airy, Aurora, Spectrum, Sunset, Ocean, Violet, Emerald, Ember.

Image state:

- `Bg Image`.
- Glaze, Crystal, Liquid Metal, Clouds, Spectrum, Sunrise, Whisp, Bubble, Onyx, Feather, Citrus, Cobalt, Blush, Indigo, Heather, Palm Shadow, Prism, Sky, Sundrape.
- All image choices are available in the local editor.

Changing preset/image shows the source notification `Background & scene settings apply to all shots.` The clone reproduces this toast.

### Mockup

Observed choices:

- Flat — Any size.
- iPhone 17 — FREE, selected initially.
- iPhone 17 Pro — FREE.
- iPhone 17 Pro Max — FREE.
- Galaxy S26 Ultra — FREE.
- Pixel 10 Pro — FREE.
- Apple Watch Ultra 3 — FREE.
- iPad Pro — FREE.
- iPad mini — FREE.
- MacBook Neo — FREE.
- MacBook Air 13\" — FREE.
- MacBook Pro 14\" — FREE.
- MacBook Pro 16\" — FREE.
- iMac 24\" — FREE.
- Studio Display — FREE.
- Apple Vision Pro — FREE.
- XDR Display — FREE.

The clone uses the downloaded iPhone asset for the picker and all device entries are directly selectable.

### Finish

Observed choices:

- White.
- Black.
- Mist Blue.
- Sage.
- Lavender.

The clone shows matching swatches and changes the device frame tint.

### Reflection and surface controls

The reference exposes reflection-related controls, background blur, light rotation, contact shadow, and border radius at different scroll positions. The clone includes representative reflection/roughness sliders and border/surface control labels in the same compact inspector language.

### Camera

The reference has Manual and Presets modes.

Presets:

- Hero.
- Angled.
- Flat.
- Bottom.
- Detail.
- Back (rear-side inspection view).

Manual control labels:

- X Axis — `-24.52`.
- Y Axis — `8.25`.
- Z Axis — `0`.
- FOV — `24`.
- Zoom — `1.90`.
- Pan X — `0.06`.
- Pan Y — `-0.17`.

The clone includes preset thumbnails, camera mode switching, sliders, stage transforms for the camera preset choices, and a rear-facing Back preset for inspecting the hardware surface.

### Effects

The observed Add effect menu contains:

- Depth — disabled for the current model.
- Glass Border.
- Sharpen.
- Vignette.
- Grain.
- Fish Eye.
- Pixel Grid.
- Chromatic Abb.
- Bloom.
- Screen Fade.
- Ghost — disabled for the current model.
- Liquid Glass.

The clone supports adding/removing effects, shows a local compatibility message for Depth/Ghost, and visually applies Glass Border, Vignette, and Grain to the stage.

## Mobile behavior

The reference mobile canvas is a separate responsive editor mode rather than a compressed desktop sidebar.

### Mobile welcome and tips

On first mobile visit:

- A modal says `Welcome to OpenMock on mobile`.
- It recommends switching to desktop for the full video-editing and animation experience.
- Buttons are Close and Send to yourself.

After closing, the source shows a mobile tips sequence:

1. Tap here to upload new media.
2. Change the viewport size ratio here.
3. Tap, hold, and move around the viewport to tilt the camera.
4. Switch between move, tilt, and zoom in the camera dock.

The clone reproduces the mobile welcome and tips overlays.

### Mobile top toolbar

The compact mobile toolbar shows:

- Menu.
- OpenMock mark.
- Fill ratio.
- Free access indicator.
- Theme control.
- Orange capture button.

The mobile menu keeps Sign in, Info, Help, Community, and Changelog. The ratio menu keeps the regular and App Store options.

### Mobile canvas and dock

The source shows a large angled device viewport followed by a circular camera-control dock and a lower tab dock. The bottom tabs are:

- Dock settings.
- Effects controls.
- Blur controls.
- Mockup controls.
- Scene controls.
- Camera controls.

Camera controls expose MOVE, TILT, and ZOOM radio buttons and a 24° FOV control. The clone uses the same accessible tab names and selected states.

### Mobile dock settings

- Settings heading.
- Left handed.
- Right handed, selected initially.

The clone moves Undo/Redo and upload controls when Left handed is selected.

### Mobile effects

- `Effects` heading.
- `No effects` initially.
- Add effect.
- Same effect picker as desktop, with unavailable Depth/Ghost entries disabled.
- Glass Border card shows `[GLASS BORDER]`, a `30` value, a ruler slider, and REMOVE.

### Mobile blur

The radial blur state shows:

- Strength — 10.
- Focus size — 0.53.
- Blur falloff — 0.00.
- Bokeh switch, checked.
- Blur-type control: Radial blur → Directional blur.

Directional blur adds an angle control at 0° and retains strength/falloff/Bokeh. The clone toggles radial/directional/tilt states and uses the same mobile blur tips copy.

### Mobile mockup and scene

The mobile Mockup tab exposes compact light/finish, mockup, and border-radius controls. The Scene tab exposes compact lighting/background controls and the all-shots notification behavior.

## Captured reference evidence

The `source-captures` directory contains the browser captures used for implementation and QA, including:

- `desktop-editor.png`, `desktop-dark.png`, and the scrolled inspector states.
- `menu-open.png`, `info-open.png`, `templates-loaded.png`, `help-open.png`.
- `viewport-ratio-open.png`, `export-open.png`, `export-video.png`.
- Tour step captures.
- Timeline presets, simple/advanced, add-shot, add-track, recording, keyframe, playback, guides, loop, and minimized states.
- Auto-motion onboarding/workspace/focus/mode captures.
- Scene, lighting, background, mockup, finish, camera, and effects captures.
- Mobile welcome/tips/clean/dock/settings/effects/blur/control captures.

These captures are retained so future visual iterations can be checked against the same source states.

## Local source assets

The asset bundle was downloaded from the loaded source page rather than hotlinked:

- `public/assets/source/openmock.svg` — source brand mark.
- `public/assets/source/icon.png` — source icon raster.
- `public/assets/source/whisp.jpeg` — source whisp background.
- `public/assets/source/placeholder.jpg` — source upload placeholder asset.
- `public/assets/source/starter-screen.jpg` — source starter camera screen.
- `public/assets/source/iphone17.png` — source device thumbnail.
- `public/assets/source/white-back-panel.png` — source device finish asset.
- `public/assets/source/iphone-17-p-sim.glb` — exact source device model fetched from the reference page.
- `public/assets/source/brown_photostudio_04_2k.hdr` — exact source studio environment fetched from the reference page.
- `public/assets/source/pro-wordmark.png` — source PRO badge.
- `public/assets/fonts/Geist.woff2` and `public/assets/fonts/GeistMono.woff2` — downloaded source font files.
- `public/assets/templates/*.jpg` — the captured template thumbnail set.

## Intentional local boundaries

This is a frontend recreation. It does not:

- Sign a user into OpenMock.
- Submit the waitlist email form.
- Publish or save to a remote OpenMock account.
- Export to a remote account or cloud render service.
- Send feedback or email.
- Charge for editor access; every local editor capability is available without a purchase.
- Rebuild the remote account, billing, or cloud render services.

## Functional local implementation

- Project state is persisted to browser storage and supports undo/redo, reset, keyboard shortcuts, and mobile history controls.
- Local image/video files can be selected through the source card, dragged onto the stage, or pasted from the clipboard. Object URLs are cleaned up when replaced or unmounted.
- Camera orbit/tilt/roll, pan, zoom/FOV, scroll-axis camera movement, Space-drag camera movement, manual camera controls, presets, center guides, and the mobile camera modes update the shared project state.
- Image export writes local JPG, PNG, or WEBP files at the selected orientation/size and respects the free watermark and transparent-background switches. Video export writes a local WEBM recording through `MediaRecorder` with free landscape, square, and portrait sizes, quality, frame-rate, motion-blur, and transparency controls.
- Captures are unlimited; the toolbar exposes `FREE CAPTURES` and no capture counter or upgrade prompt is used.
- Timeline controls include Simple/Advanced modes, shots and tracks, scrub/play/loop, duration, zoom, presets, auto-keyframe recording, keyframe selection/deletion/easing, minimized mode, and the Auto-motion focus-area workspace.
- Inspector and mobile dock controls are wired to the same project model: scene, lighting, background color/preset/image, mockup, finish, reflection, camera, effects, blur, handedness, and onboarding states.
- The 3D renderer uses the bundled GLB/HDR/KTX2 pipeline for the iPhone family and physically-based procedural rigs for the remaining phone, tablet, laptop, display, watch, and Flat options. It reports `ready`, `loading`, or `fallback`; the fallback is intentionally local and does not hotlink source assets.

The primary editor journey is local and functional: open menus, inspect Info/Templates/Help, change theme/ratio, switch export tabs, switch timeline modes, add shots/tracks, play/loop/scrub, open recording and Auto-motion flows, open inspector controls, change scene/lighting/background/mockup/finish/camera/effects, import media, export stills/video, and use the mobile control dock.
