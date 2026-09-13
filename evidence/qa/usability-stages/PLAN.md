# OpenMock Usability Improvement Plan

This plan establishes a staged, bounded roadmap to improve the usability of OpenMock while preserving its distinctive visual character, 3D hardware realism, camera math, rendering optimizations, and all advanced capabilities.

---

## Baseline Usability Walkthrough & Five Ranked Obstacles

During our browser-based inspection at desktop (1440×900) and mobile (390×844) viewports across the core workflow (**Add media → Choose device → Framing/background → Export still**), we identified and ranked five concrete usability obstacles:

### 1. Ambiguous Media State & Missing Replacement Affordance (Rank 1 - Highest Friction)
- **Problem**: On first load, the stage displays an iPhone 17 running a pre-rendered camera mockup (`starter-screen.jpg`). Users cannot immediately tell whether their own media is loaded.
- **Problem**: Once media is uploaded, the inspector `SOURCE` card only provides a tiny `[X]` remove button. There is no explicit "Replace" or "Change media" button, and clicking the card/thumbnail does nothing. To test a different screenshot, users are forced to delete their media first, creating unnecessary friction and fear of losing their state.
- **Problem**: There is no contextual guidance indicating the next logical step after media is loaded.

### 2. Device Selection Overwhelm in an Unfiltered 39-Item Grid (Rank 2)
- **Problem**: Clicking "CHANGE" in the Mockup inspector previously expanded an unfiltered 39-item vertical grid (the catalog contains 39 items after Browser Window was removed) directly inside the narrow inspector column. This pushed essential Camera and Effects controls completely offscreen.
- **Problem**: Scanning through 39 devices without quick category filters (Phones, Laptops, Desktops, Watches, Tablets & readers, Handhelds, etc.) required extensive scrolling and visual hunt-and-peck.

### 3. Disjointed Information Architecture & Deeply Nested Controls in the Inspector (Rank 3)
- **Problem**: In the right-hand inspector, `SCENE` (lighting, background) appeared before `MOCKUP` (device model, finish), whereas the natural mental model is: **Media → Device → Scene & Background → Camera / Angle → Effects**.
- **Problem**: Setting a background image or preset requires navigating multiple nested dropdowns and tab switches (`BACKGROUND` button → Preset/Image tab → `Bg Preset` dropdown → popover), making basic background customization confusing.

### 4. Duplicate Capture Buttons with Unclear Distinctions (Rank 4)
- **Problem**: The top navigation bar features both a standalone camera icon button ("Capture image") and a prominent orange "EXPORT ▾" dropdown button side-by-side.
- **Problem**: Users cannot easily predict what the camera icon does (it triggers an immediate single still download without format/size options) versus the full Export popover, creating hesitation.

### 5. Mobile Workflow Discovery & Stage Interaction Disconnect (Rank 5)
- **Problem**: On mobile (390px), the inspector is collapsed into bottom icon tabs without labels. The primary "Upload Media" action is relegated to a floating icon button without descriptive guidance.
- **Problem**: On small touchscreens, camera gestures (rotate/pan/zoom) can easily conflict with page scrolling or dock tapping without explicit touch feedback.

---

## Four Bounded Usability Stages

### Stage 1: First-Use Discovery & Basic Media/Device Workflow (Completed & Repaired)
- **Objective**: Eliminate initial confusion when opening OpenMock and make adding, replacing, and confirming media intuitive and immediate.
- **Bounded Scope (Max 3 Related Changes)**:
  1. **Enhanced Source Card with Contextual Guidance & Direct Actions**: Clear empty-state messaging ("Upload your screen — drop image/video, paste, or browse"), distinct "Replace" and "Remove" buttons when media is active, and clickable thumbnail to replace.
  2. **Contextual Next-Action Guidance**: Clear indicator when media is active pointing to the next logical action (`Change device →`).
  3. **High-Contrast Device Selection & Summary Toggle**: Visible active badge in the Mockup summary, unequivocal active indicator in the device list, and clear "Done / Close" toggle state.
- **Preservation Requirements**: Zero regressions in 3D canvas rendering, model detail, camera math, undo/redo history, and Sites worker hosting.

### Stage 2: Inspector Clarity & Information Architecture
- **Objective**: Streamline the inspector hierarchy to match the creative workflow and eliminate deeply nested popovers.
- **Stage 2A (Completed)**: Inspector Ordering & Compact Category Filters / Bounded Scrollable Picker:
  1. Logical section flow: Group and sequence panels naturally (**SOURCE → MOCKUP → SCENE → CAMERA → EFFECTS**), preserving each section's independent toggle state.
  2. Compact device category filters: Dynamically derived from `mockupOptions` and `deviceGroup` (`All (39)`, `Phones (13)`, `Tablets & readers (7)`, `Laptops (6)`, `Desktops (3)`, `Watches (5)`, `Handhelds (2)`, `Web & TV (1)`, `Spatial (1)`, `Stage (1)`). Wrapping filter buttons fit the 280px inspector.
  3. Bounded scrollable grid: `.mockup-picker-scroll` with `max-height: 280px; overflow-y: auto; overscroll-behavior: contain;` prevents expanding the catalog from burying Camera and Effects controls.
  4. Active device persistence & indicator: When active device category is filtered out, a persistent notice shows `Active: [Device] ([Category])` with `Show in All` quick reset; the containing category tab displays a subtle active dot. Filters are local view state and never mutate the selected mockup or undo history.
  5. Accessible native controls: Native buttons with `role="tab"`/`aria-selected` and `role="radio"`/`aria-checked`, keyboard focus with visible focus rings, Escape key and "DONE" close actions, and automatic `scrollIntoView` for focused items. "Change device →" from Source card opens the picker and moves focus without losing keyboard context.
- **Stage 2B (Next Stage)**: Scene & Background Controls Clarity:
  1. Simplified Scene & Background picker: Flatten background preset/color selection into direct visual swatches without multi-layer popovers.

### Stage 3: Animation & Timeline Usability
- **Objective**: Make motion creation accessible to non-animators while keeping advanced keyframing powerful.
- **Bounded Scope**:
  1. Simplified Mode onboarding: Clearly explain the difference between Simple (one-click camera movement presets and shot cuts) vs. Advanced (keyframe interpolation and focus pulls).
  2. Visible playhead & transport affordances: Enhance scrubber contrast and add human-readable time/frame indicators.
  3. Visual keyframe markers: Make keyframe selection and easing curves visible directly in the timeline tracks with clear deletion/editing feedback.

### Stage 4: Export, Mobile & Keyboard Verification
- **Objective**: Finalize delivery confidence, eliminate duplicate actions, and polish touch/keyboard ergonomics.
- **Bounded Scope**:
  1. Unified Export Menu: Merge instant capture into the Export popover as a quick "Snapshot" action alongside high-res Image and Video exports.
  2. Mobile dock labeling & discovery: Add subtle tooltips/labels to mobile tab buttons and an onboarding banner for mobile media upload.
  3. Keyboard shortcuts & accessible focus rings: Verify all tools (Space, Shift, Alt, ⌘Z, 1–5) and maintain full WCAG focus rings across dark and light modes.
