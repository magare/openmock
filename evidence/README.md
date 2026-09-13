# Visual evidence

- `reference/` preserves captures of the source editor.
- `qa/` preserves implementation screenshots, device reference images, and diagnostic reports.
- `qa/legacy/` collects the early screenshots formerly at the repository root.
- `qa/local/` is ignored by Git for disposable new runs.

Existing iteration folders and filenames are retained so captures can still be compared against the history in `docs/` and `AGENTS.md`. Historical report contents are preserved, including paths recorded when those reports were generated. These files are development evidence, not runtime assets; shipped assets belong in `public/assets/`.

For new evidence, use a named folder under `qa/`, such as `qa/2026-09-12-camera-framing/`, and record its purpose in the design QA notes. Only commit captures that support a reproducible finding or an approved visual decision.
