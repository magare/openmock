# Selective device optimization · 2026-09-13

Profiled all 39 catalog entries. Changed nine devices with measured geometry, draw-call, or construction costs; other device assets and geometry remain unchanged.

| Device | Measured change |
| --- | --- |
| Pixel 10 Pro / Pro XL | 1,266,076 → 579,611 rendered model triangles (54% fewer); geometry buffers 54.41 → 27.34 MiB; GLB 6,365,212 → 4,584,848 bytes (28% smaller). |
| Surface Laptop 15" | 450 → 36 draw calls per frame (92% fewer). |
| Dell XPS 16 | 393 → 43 draw calls (89% fewer). |
| Nintendo Switch 2 | 245 → 52 draw calls (79% fewer). |
| Steam Deck | 206 → 64 draw calls (69% fewer). |
| Apple Vision Pro | 351 → 303 draw calls (14% fewer), retaining textured components individually. |
| Galaxy Watch 8 / Pixel Watch 4 | Direct recursive subdivision replaces repeated triangle-array copies/sorts. Same geometry and complete welded straps. Four cached strap shapes are cloned for subsequent selections; repeated factory calls measured 10–66 ms vs 735–1,291 ms before. |

Chrome, 1121 × 900 CSS pixels, DPR 2; the source fixture uses the editor's default lighting and Angled pose. Draw calls include the shadow/transmission passes counted by Three r185. Geometry memory is the sum of vertex/index typed arrays. Texture byte estimates in raw reports are not GPU allocation measurements. Local load times and main-thread timings vary with cache, shader compilation and host load; no cross-hardware FPS claim is made. The final profiler records idle draws separately, then forces one second of active draws to measure rendering cost.

The Pixel asset retains all manufacturer image bytes (SHA-256 checked), hardware node names, cameras, flash, sensors, lenses, logo and display details. Only `speakerGrills` and `alumPolished` are simplified. Topological borders are locked; error limits are 0.0001 and 0.00001 respectively. Draco output uses 20-bit positions, 14-bit normals and 16-bit UVs. Exact welding removes degenerate faces from three painted sheets. The manufacturer's original GLB remains intact. Regeneration: `node scripts/prepare-pixel-model.mjs`.

Opaque static batches preserve materials, original part bounds, normals, UVs, and triangle counts. Screens and transparent glass stay separate. Surface finish callbacks still reach the correct materials, and the Dell trackpad boundary remains visible. Watch straps retain their original triangle counts, holes, smooth normals and independent geometry ownership.

The baseline's same-page switching test reproduced `texImage3D: FLIP_Y or PREMULTIPLY_ALPHA isn't allowed` warnings. Teardown now resets WebGL state before reusing the canvas. It also releases HDR/shadow render targets, pruned variants/accessories, replaced screen materials and stale loading results. Overlapping requests share reference-counted decoder workers, preventing duplicate KTX2 initialization during React startup; the final request disposes the workers after decoding finishes. Screen fitting visits only actual display surfaces, and ResizeObserver controls drawing-buffer resizing. Settled devices retain their canvas image without repeated GPU/shadow passes; camera, controls, resize, loaded textures/HDR and advancing video invalidate the frame.

Validation covers 40 clean visual views (front, angled, back, side, Black finish across eight distinct rigs), repeated device switches, a deliberately delayed model download, image/video replacement, idle rendering and camera invalidation, responsive resizing, geometry bounds, material identity, cache ownership and asset budgets. Geometry buffers return to zero after teardown; device textures and render targets are released (Three r185 retains its internal fallback sampler).

Reports: `before.json`, `after.json`, `stability.json`, `watch-build-times.json`, and `visual-comparison.json`. Full captures remain in the ignored `output/playwright/device-stability/` folder; selected views are preserved here. Browser checks run through `scripts/qa/device-performance.mjs`, `scripts/qa/device-stability.mjs`, and `scripts/qa/gesture-probe.mjs`.

Final gates: 39/39 devices ready with finite framing, zero browser warnings/errors and zero idle redraws; all movement/undo/resize probes pass. Build succeeds, editor/geometry tests pass 30/30, Sites tests pass 4/4, and `git diff --check` is clean. The protected Sites files remain unchanged. The existing Vite bundle-size advisory remains; this change targets device rendering and asset costs.

Implementation references: [Three.js object batching](https://threejs.org/manual/en/optimize-lots-of-objects.html), [resource disposal](https://threejs.org/manual/en/how-to-dispose-of-objects.html), [renderer state reset](https://threejs.org/docs/pages/WebGLRenderer.html), and [glTF Transform](https://gltf-transform.dev/cli).
