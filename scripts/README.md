# Tooling

Run scripts from the repository root. Browser tools use `playwright-core` and an installed Google Chrome (`channel: "chrome"`). Start the development server at port 5199 before browser checks.

## QA

```sh
npm run qa:ui -- evidence/qa/local/ui quick
npm run qa:gestures -- evidence/qa/local/gestures
npm run qa:scene
npm run qa:devices
node scripts/qa/montage.mjs evidence/qa/local/ui
```

- `ui-capture.mjs`: UI state screenshots; arguments are output directory and `quick` or `full`.
- `device-sweep.mjs`: catalog render sweep; optional arguments are JSON device/name pairs, output directory, and camera preset.
- `device-performance.mjs`: profiles all catalog devices in the live editor; arguments are output directory and an optional JSON array of device names. Diagnostics are injected into the served development module and never ship with the app. `DEVICE_SCREENSHOTS=1` also captures each device.
- `device-stability.mjs`: front/angled/back/side and finish captures, repeated switching, GPU cleanup, delayed downloads, image/video replacement, and mobile resizing. Arguments are output directory and an optional JSON array of device names. It uses `device-review.html` as an isolated renderer fixture.
- `gesture-probe.mjs`: rotation, Move/Roll/Fine, scroll zoom, gesture undo/redo, saved-pose reload, pointer cancellation, framing, and responsive controls; optional output directory. Failures exit nonzero.
- `scene-probe.mjs`: scene/background behavior checks.
- `iphone16-check.mjs`: targeted iPhone 16 poses.
- `orientation-front.mjs`, `orientation-sweep.mjs`, `rear-sweep.mjs`: device orientation diagnostics.
- `montage.mjs`: combines a directory of PNG captures into a contact sheet.

Some historical probes contain fixed device lists and output paths. Inspect those settings before rerunning; a rerun can overwrite captures. Prefer `evidence/qa/local/` for disposable output when a script accepts an output directory.

## Model inspection

`inspect/` contains focused development diagnostics rather than automated regression gates:

- `mesh-inspect.mjs`, `usdz-summary.mjs`: model structure and mesh counts (file path arguments).
- `accessory-probe.mjs`: accessory subtree inspection (device basename arguments).
- `material-probe.mjs`, `screen-probe.mjs`, `slab-probe.mjs`, `xdr-stand-probe.mjs`: targeted USDZ diagnostics.
- `browser-glb-inspect.mjs`: Draco GLB inspection in Chrome (filenames under `public/assets/devices/`).
- `texture-probe.mjs`: rendered texture diagnostic.
- `slot-toggle-probe.mjs` and `slot-toggle-probe.html`: browser material-channel comparisons.

`prepare-sites-build.mjs` stays at its existing path because it is part of the deployment contract.

`node scripts/prepare-pixel-model.mjs` regenerates only the optimized Pixel 10 Pro/XL derivative, using the pinned glTF Transform CLI toolchain through npx. It retains the original GLB and its texture images, simplifying only the two geometry outliers. Measurements and error limits are documented in `evidence/qa/device-optimization/README.md`.
