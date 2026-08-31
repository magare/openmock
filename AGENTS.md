# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Prototype feedback

- 2026-08-31: Device rotation range widened from ±180° to ±225° (180 + 45 on each end) per user request — applies to the X/Y/Z Axis sliders in `CameraControls` and the stage drag clamps in `handleStagePointerMove` (`src/App.jsx`). Regression captures: `qa-captures/rotation-225-x.png`, `qa-captures/rotation-minus225-x.png`, `qa-captures/rotation-minus225-y.png`, `qa-captures/rotation-drag-past180.png`.
- 2026-08-30: User reports that the reconstruction does not look like Ultramonk. Treat visual fidelity to https://www.ultramonk.io/ and the captured source screenshots as the priority for future changes.
- 2026-08-30: User wants every selectable device mockup to look realistic, with the supplied iPhone 17 GLB treated as the quality bar for geometry, materials, camera framing, and hardware detail across the catalog.
- 2026-08-31: Device realism decisions (user directive: every device must look like the physical hardware):
  - Every catalog mockup loads its manufacturer model: Apple USDZ AR assets for the iPhone 17 Pro family, Watch Ultra 3, iPads, MacBooks, iMac, Studio Display, Vision Pro, and XDR; Samsung/Google viewer GLBs for Galaxy S26 Ultra and Pixel 10 Pro. The supplied Ultramonk iPhone 17 GLB stays the baseline for the base iPhone. Procedural rigs remain only as WebGL-failure fallbacks and for `Flat`.
  - Manufacturer USDZ materials must have `aoMap` stripped in `prepareExactDevice` — the converted geometry lacks the second UV set those textures reference, and leaving them produces structured noise on rails, decks, and stands.
  - Media screens bind per device, chosen by what renders correctly: native mesh UVs with `flipY` kept true when the baked screenshot renders upright (Watch, iPad Pro, with per-device quarter-turn or v-flip corrections), hidden-mesh overlay quads when UV rewrite is unreliable (iPhone Pro family, Pixel, iPad mini), and the world-space UV rewrite for the displays that tolerate it (MacBooks need `screenFlipV`, iMac/Studio/XDR do not).
  - Accessories that ship inside AR assets are removed per config: Apple Pencil from both iPads, Magic Keyboard and Magic Mouse from iMac 24.
  - The iPhone 17 Pro USDZ packs eight overlapping color-variant phones; `isolateIPhoneProVariant` must delete every other candidate slab, not just non-top-level scene children.
  - XDR Display gets a stainless stand via explicit `standMeshes` material swap because its stand is merged into assembly meshes; its foot stays dark (merged geometry, accepted).
  - Regression evidence and per-device captures live in `qa-captures/goal-sweep-final2/` (angled sweep + montage), `qa-captures/orientation-front/` (front-on), and `qa-captures/rear/` (camera decks). Probe tooling: `scripts/device-sweep.mjs`, `scripts/orientation-front.mjs`, `scripts/rear-sweep.mjs`, `scripts/material-probe.mjs`, `scripts/slab-probe.mjs`, `scripts/montage.mjs`.
