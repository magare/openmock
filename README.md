# OpenMock

A React and Three.js mockup editor for composing device scenes and exporting images and video.

## Development

```sh
npm ci
npm run dev
```

The local editor runs at http://localhost:5199. Browser QA scripts use the same port; Vite fails clearly if it is occupied.

## Validation

```sh
npm run build
npm test
```

The build produces `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`. Run the build before the Sites tests on a fresh checkout.

## Repository map

| Location | Contents |
| --- | --- |
| `src/` | Editor UI, state, Three.js rendering, export, and styles |
| `public/assets/` | Runtime device models, images, fonts, and decoders |
| `tests/` | Editor-state and Sites worker regression tests |
| `scripts/qa/` | Browser checks, screenshot sweeps, and montage generation |
| `scripts/inspect/` | Device geometry, material, and texture diagnostics |
| `scripts/prepare-sites-build.mjs` | Sites build packaging |
| `worker/`, `.openai/` | Sites runtime and hosting contract |
| `.github/workflows/` | GitHub Pages deployment |
| `docs/` | Reconstruction notes and design QA history |
| `evidence/reference/` | Captures of the source design |
| `evidence/qa/` | Preserved QA captures and reports, grouped by iteration |
| `evidence/qa/legacy/` | Early screenshots previously loose at the repository root |
| `AGENTS.md` | Agent instructions and durable prototype decisions |

See [tooling instructions](scripts/README.md), [evidence conventions](evidence/README.md), [recreation notes](docs/recreation-notes.md), and [design QA](docs/design-qa.md). Paths quoted in historical notes are relative to the repository root.
