# Ultramonk recreation design QA

## Findings

- No actionable P0/P1/P2 findings in the final pass.

- [P3] The recreation retains a CSS fallback for browsers without WebGL. This is not present in the final capable-browser capture: the clean desktop and mobile QA tabs both reported `data-renderer-status="ready"`, the CSS fallback had `is-hidden`, and the browser logs contained zero warning/error entries. The production path uses the exact local GLB/HDR/Basis assets plus procedural Three.js device rigs; the fallback remains a resilience path rather than the primary visual.

- The current source and implementation captures are both available at the same CSS viewports: 1121 x 789 desktop and 390 x 844 mobile. Older 325 x 703 source captures remain in the archive, but are not used for the final parity judgment.

## Source and implementation evidence

- Source visual truth — desktop: [`qa-captures/source-fresh-desktop-1121.png`](/Users/magare/Dev/web-app-farm/ultramonk/qa-captures/source-fresh-desktop-1121.png), 1121 x 789 pixels.
- Source visual truth — mobile: [`qa-captures/source-fresh-mobile.png`](/Users/magare/Dev/web-app-farm/ultramonk/qa-captures/source-fresh-mobile.png), 390 x 844 pixels.
- Earlier UI-only browser evidence — desktop: [`qa-captures/desktop-browser-rendered.png`](/Users/magare/Dev/web-app-farm/ultramonk/qa-captures/desktop-browser-rendered.png).
- Earlier UI-only browser evidence — mobile: [`qa-captures/mobile-browser-rendered.png`](/Users/magare/Dev/web-app-farm/ultramonk/qa-captures/mobile-browser-rendered.png).
- Final WebGL renderer — desktop iPhone 17: [`qa-captures/desktop-framing-final-02.png`](/Users/magare/Dev/web-app-farm/ultramonk/qa-captures/desktop-framing-final-02.png), 1121 x 789 at CSS viewport 1121 x 789; status `ready`, fallback hidden.
- Final WebGL renderer — mobile iPhone 17: [`qa-captures/tuned-mobile.png`](/Users/magare/Dev/web-app-farm/ultramonk/qa-captures/tuned-mobile.png), 390 x 844 at CSS viewport 390 x 844; status `ready`, canvas `display:block`, fallback hidden.
- Representative procedural device captures: [`qa-captures/three-device-macbook-keyboard.png`](/Users/magare/Dev/web-app-farm/ultramonk/qa-captures/three-device-macbook-keyboard.png), [`qa-captures/three-device-watch-fixed.png`](/Users/magare/Dev/web-app-farm/ultramonk/qa-captures/three-device-watch-fixed.png), [`qa-captures/three-device-xdr-centered.png`](/Users/magare/Dev/web-app-farm/ultramonk/qa-captures/three-device-xdr-centered.png), [`qa-captures/three-device-ipad.png`](/Users/magare/Dev/web-app-farm/ultramonk/qa-captures/three-device-ipad.png), and the added free devices [`device-ipad-mini.png`](/Users/magare/Dev/web-app-farm/ultramonk/qa-captures/device-ipad-mini.png), [`device-imac-24.png`](/Users/magare/Dev/web-app-farm/ultramonk/qa-captures/device-imac-24.png), [`device-studio-display.png`](/Users/magare/Dev/web-app-farm/ultramonk/qa-captures/device-studio-display.png), and [`device-vision-pro.png`](/Users/magare/Dev/web-app-farm/ultramonk/qa-captures/device-vision-pro.png).
- Normalized implementation evidence — desktop: [`qa-captures/desktop-implementation-current-normalized.png`](/Users/magare/Dev/web-app-farm/ultramonk/qa-captures/desktop-implementation-current-normalized.png), resized to 1121 x 789 with LANCZOS resampling.
- Same-input full-view comparisons: [`qa-captures/desktop-comparison-current.png`](/Users/magare/Dev/web-app-farm/ultramonk/qa-captures/desktop-comparison-current.png) and [`qa-captures/mobile-comparison-current.png`](/Users/magare/Dev/web-app-farm/ultramonk/qa-captures/mobile-comparison-current.png). Each places the source and current implementation side by side.
- Focused comparisons: [`qa-captures/desktop-stage-comparison.png`](/Users/magare/Dev/web-app-farm/ultramonk/qa-captures/desktop-stage-comparison.png), [`qa-captures/desktop-timeline-comparison.png`](/Users/magare/Dev/web-app-farm/ultramonk/qa-captures/desktop-timeline-comparison.png), [`qa-captures/desktop-inspector-comparison.png`](/Users/magare/Dev/web-app-farm/ultramonk/qa-captures/desktop-inspector-comparison.png), [`qa-captures/mobile-full-focus-comparison.png`](/Users/magare/Dev/web-app-farm/ultramonk/qa-captures/mobile-full-focus-comparison.png), and the review montage [`qa-captures/focused-comparisons.png`](/Users/magare/Dev/web-app-farm/ultramonk/qa-captures/focused-comparisons.png).

## Viewports, state, and normalization

- Desktop CSS viewport: 1121 x 789; implementation geometry measured in the browser: top bar x14 y14 w803.3 h40, stage x14 y64 w803.3 h659, compact timeline x14 y733 w803.3 h42, inspector x827.3 y14 w280 h761.3.
- Mobile CSS viewport: 390 x 844; implementation geometry measured in the browser: top bar x14 y14 w362 h40, stage x14 y64 w362 h644, mobile dock x14 y718 w362 h112.
- The final in-app browser measured CSS viewports of 1121 x 789 desktop and 390 x 844 mobile with `devicePixelRatio` 1. The source and renderer evidence were captured at those exact dimensions. The default timeline is compact, and its expand control was separately verified to restore the 181px full timeline.
- State: clean light editor; tour and mobile onboarding tips dismissed; custom scene/default lighting; background set to Image / Whisp; iPhone 17 / White finish; compact Advanced timeline; no effects enabled; empty source upload card; mobile final state on Camera controls.

## Fidelity surface review

- Fonts and typography: local Geist and Geist Mono font files are bundled and loaded with `@font-face`; labels, controls, menus, timeline metadata, and modal copy use the same compact mixed sans/monospace hierarchy as the source. The small UI text, uppercase tracking, button weights, and source/template copy were checked in the focused comparisons.
- Spacing and layout rhythm: the desktop inspector is a fixed 280px column and the main editor uses the measured 10px gutter; the timeline, stage, toolbar, section cards, and mobile dock align with the source geometry. The mobile toolbar spacer issue and desktop nested-inspector layout issue were corrected before this final pass.
- Colors and visual tokens: the light editor uses the source-like #e9e9e9 shell, white/near-white cards, gray borders, orange action/selection accents, black device, and muted mono labels. Dark-mode, locked Pro, selected, recording, toast, guide, and active-control states are represented.
- Image quality and asset fidelity: source raster assets are reused from `public/assets/source` for the Ultramonk mark, Whisp background, starter screen, iPhone device thumbnail, and white back panel. The 17 source template thumbnails and Pro wordmark are bundled under `public/assets/templates`. The source GLB, HDR, and Basis transcoder files are bundled locally and used by `src/ThreeStage.jsx` when WebGL is available. The iPhone GLB's `ultramonkRole: proDisplayScreen` mesh receives the local media texture; non-iPhone selections use physically-based procedural geometry with bevels, clearcoat, metalness, screen glass, side controls, laptop keycaps/trackpad, watch strap/crown, and display stands. The CSS fallback is only used when WebGL creation or model loading fails.
- Copy and content: the source menus, Info modal, Help menu, tour steps, ratio choices, App Store choices, image/video export options, timeline presets, Auto-motion steps, scene/lighting/background/mockup/finish/camera/effect names, mobile tips, and template names were transcribed into the local UI. The template list contains all 17 source names, including the visible PRO suffixes.
- Interaction and accessibility: primary controls are real buttons, tabs, radio controls, range inputs, and upload input affordances with accessible labels; locked Pro controls remain visibly disabled; the final browser console had no error or warning entries.

## Primary interactions tested

- Desktop: top menu; Info modal and waitlist input; Templates popover and all 17 template-card renderings; Help popover; tour restart and tour steps; theme toggle; viewport ratio popover including regular and App Store options; image/video export tabs and option states; timeline Simple/Advanced modes; Add shot; presets; Auto-motion intro/workspace/focus-area/mode states; Add track menu; playhead, loop, guides, zoom, minimize, expand layer, and recording states.
- Inspector: source upload empty state; scene picker including locked Pro upgrade toast; lighting presets and controls; Color/Preset/Image background modes and background picker; mockup picker including the added `iPad mini`, `iMac 24"`, `Studio Display`, and `Apple Vision Pro` options; finish picker; camera presets/manual controls including the rear-facing Back view; effect picker and Glass Border state.
- Mobile: first-use welcome modal; upload/ratio/tilt/dock tips; dock handedness; Effects tab and effect picker; Blur controls, bokeh, radial/directional/tilt mode states; Mockup controls; Scene controls; Camera controls and FOV.
- Console: final clean desktop and mobile tabs returned zero `error` or `warn` entries after reloads; the device option smoke test also kept the renderer at `ready` with the fallback hidden. React/Vite informational output was not counted as a defect.

## Comparison history for resolved P0/P1/P2 iterations

- Earlier P2 desktop layout issue: the inspector was initially nested in the workspace and visually overlaid the main column at the measured desktop viewport. Fix: flatten the workspace JSX siblings and use an explicit desktop grid with a fixed 280px inspector column. Post-fix evidence: [`qa-captures/desktop-implementation-final.png`](/Users/magare/Dev/web-app-farm/ultramonk/qa-captures/desktop-implementation-final.png), the final desktop geometry above, and [`qa-captures/desktop-comparison.png`](/Users/magare/Dev/web-app-farm/ultramonk/qa-captures/desktop-comparison.png).
- Earlier P2 mobile toolbar issue: the desktop spacer pushed the Fill ratio control away from the source position at the mobile breakpoint. Fix: hide `.topbar-spacer` on mobile and preserve the source toolbar order. Post-fix evidence: [`qa-captures/mobile-implementation-post-fix.jpg`](/Users/magare/Dev/web-app-farm/ultramonk/qa-captures/mobile-implementation-post-fix.jpg), the measured mobile top bar above, and [`qa-captures/mobile-comparison.png`](/Users/magare/Dev/web-app-farm/ultramonk/qa-captures/mobile-comparison.png).
- Earlier P2 inspector fidelity issue: the initial implementation used sparse generic inspector rows where the source visibly showed its empty source card, Custom Scene summary, Lighting controls, Image / Whisp background row, and iPhone 17 card. Fix: add source-like summary cards, controls, real thumbnails, exact labels, and the Image / Whisp default. Post-fix evidence: [`qa-captures/desktop-browser-rendered.png`](/Users/magare/Dev/web-app-farm/ultramonk/qa-captures/desktop-browser-rendered.png), [`qa-captures/desktop-inspector-comparison.png`](/Users/magare/Dev/web-app-farm/ultramonk/qa-captures/desktop-inspector-comparison.png), and the expanded inspector implementation in `src/App.jsx` / `src/styles.css`.
- No P0, P1, or P2 issue was observed during the source-to-implementation comparison or the final interaction smoke pass. The source-model material presentation is now aligned with the reference's black display, white finish, and white side rail; WebGL is verified in the final desktop and mobile browser captures.

## Implementation checklist

- [x] Capture and inspect the source desktop and mobile editor states.
- [x] Recreate the responsive editor shell, toolbar, viewport, timeline, inspector, mobile dock, menus, modals, and onboarding.
- [x] Reuse captured source raster assets and bundle the source GLB/HDR and template thumbnail inventory.
- [x] Implement the source controls and visible interaction states across desktop and mobile.
- [x] Preserve the protected Sites runtime and verify the generated build.
- [x] Run the final browser interaction smoke checks and console check.
- [x] Compare full views and focused regions at matched CSS viewports with density normalization recorded.
- [x] Wire the bundled GLB/HDR renderer with KTX2 texture support and an automatic CSS fallback for browsers without WebGL.
- [x] Add physically-based procedural 3D rigs for phone/tablet, laptop, display, and watch states, with camera/lighting/finish/reflection/contact-shadow bindings.
- [x] Add dedicated procedural rigs and picker entries for the free iPad mini, iMac 24", Studio Display, and Apple Vision Pro options.
- [x] Verify every mockup option reaches `ready`, verify representative 3D captures, and verify clean desktop/mobile browser logs.

## Follow-up Polish

- The compact timeline and source-media preview chip are now aligned with the current reference capture. The mobile 3D framing remains intentionally editorial and slightly cropped to match the source composition.

final result: passed
