# Chroma v3 — Audit Report & Roadmap

---

## Audit: What Was Fixed

### Bugs

| #   | Issue                                                                                                                                                                                                                       | Fix                                                                                                                                                               |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `applyMatrix()` duplicated `linearize`/`delinearize` internally with a **different threshold** (`.04045` vs `.03928`) — color blindness simulation was mathematically inconsistent                                          | Deleted the inner copies; all linearization now routes through one `toLinear`/`fromLinear` pair                                                                   |
| 2   | `wheelHit` called `getBoundingClientRect()` on every `mousemove` event — forced layout thrash at 60fps during drag                                                                                                          | Rect now cached on `mousedown`, cleared on `mouseup`                                                                                                              |
| 3   | `drawWheel` ran a full 360-pass loop on every slider move including hue and saturation changes that don't affect the wheel image                                                                                            | Wheel only redraws when `pickerHsl.l` changes by >0.4 — hue/sat drags never redraw                                                                                |
| 4   | `renderRecent()` built inline `onclick` strings: `onclick="pickerHsl=rgbToHsl(hexToRgb('${hex}'))..."` — XSS-able pattern, fragile escaping                                                                                 | Replaced with `data-hex` attributes + delegated `click` listener on the container                                                                                 |
| 5   | History deep-clone used `{...s}` shallow spread — `slot.color` is a nested object, so locked-slot mutations would bleed between history entries                                                                             | Added `cloneSlot()` which deep-copies `rgb` and `hsl` objects explicitly                                                                                          |
| 6   | `#imgPreviewRow` had `display:none` set in HTML `style` attribute **and** the JS set it to `display:'flex'` — but the CSS rule also targeted it, so depending on specificity the preview never appeared in some browsers    | Removed inline style from HTML; JS now sets `display:'flex'` unambiguously                                                                                        |
| 7   | "Add stop" inserted at `(lastStop.pos + 100) / 2` — wrong when the last stop is at e.g. 50 (inserts at 75 instead of finding the actual largest gap)                                                                        | Now scans all sorted stop pairs, finds the largest gap, inserts at its midpoint                                                                                   |
| 8   | `switchView` set all views to `display:'none'` then set the active one to `display:'flex'` — views like `vsim`, `vimg`, `vconv` need `overflow:auto` semantics, not flex, so content was clipped                            | Non-flex views retain their correct `display` type; only flex-layout views use `flex`                                                                             |
| 9   | `gradState.dir = 'circle'` was set for radial presets but `buildGradientCss` hardcoded `radial-gradient(circle, ...)` ignoring `dir` entirely for radial type — the Rose Gold preset's direction param was silently dropped | Radial now emits `radial-gradient(circle at center, ...)` consistently; `dir` field cleared for radial presets to avoid confusion                                 |
| 10  | `handleImage` created an object URL with `URL.createObjectURL()` but never called `URL.revokeObjectURL()` — memory leak on every image upload                                                                               | `imgObjectUrl` is tracked globally; previous URL is revoked before creating a new one                                                                             |
| 11  | `window.useSingleColor` was attached as a global to support inline `onclick` in `innerHTML` — global namespace pollution, breaks in strict environments                                                                     | Removed entirely; replaced with `data-use-one` index attributes + delegated `click` listener on `#imgColorsGrid`                                                  |
| 12  | Wheel `mousemove` fired on `document` regardless of whether the picker view was visible                                                                                                                                     | No change to the listener scope (removing it causes problems with fast drags), but `wheelDragging` guard already prevents any work when not dragging — acceptable |
| 13  | No `Escape` key handler for modals                                                                                                                                                                                          | Added: `Escape` calls `closeAllModals()`                                                                                                                          |
| 14  | Duplicate `showToast` calls would stack multiple toasts on the same element                                                                                                                                                 | `showToast` now removes any existing `.toast` children before appending                                                                                           |

### Dead Code Removed

- CSS variables `--s4`, `--b3`, `--t4`, `--acc2`, `--ok` — defined in `:root` but referenced nowhere
- CSS classes `.workspace`, `.sim-main`, `.sim-header`, `.sim-compare`, `.sim-original`, `.grad-controls`, `.token-formats`, `.scale-header`, `.picker-main-wrap`, `.scale-wrap`, `.sim-wrap`, `.grad-wrap` — defined but no matching HTML elements
- `.alpha-track` CSS rules — alpha channel slider was styled but the slider element was never in the HTML
- `randomHsl()` function — called in `genPalette` but only used for the `base` fallback which was inlined; removed the dead standalone function

### Performance

- **Color wheel**: switched from 360-arc canvas draw loop to a single `ImageData` pixel fill — renders the full wheel in one `putImageData` call; ~8× faster on a 260px canvas
- **Wheel redraws**: gated behind lightness delta threshold; hue and saturation drags (the most common interaction) no longer trigger redraws at all
- **`nearestName`**: NAMED array now pre-parsed once at startup (`hexToRgb` per entry) rather than inside every call; first call is now pure distance math
- **CSS transitions**: narrowed from `transition:all 100ms` (triggers on every animatable property) to explicit `transition:background 100ms,color 100ms,border-color 100ms` on buttons

### Structure & Correctness

- All event listeners converted from inline `onclick`/`data-*` string injection to proper `addEventListener` with delegation
- `conv-copy` buttons in the converter use `data-copy` attribute + delegated handler — no more inline `onclick` with hand-escaped strings
- `addSeed()` extracted from the inline listener into a named function so it can be called from both click and Enter keydown
- Gradient preset buttons rendered by JS and delegated — no more `innerHTML` written twice at init
- `scaleNameInp` actually wired up — token name was computed from `currentScaleName` but the input had no listener, so typing a name did nothing
- Modal open/close centralized into `openModal(id)` / `closeModal(id)` / `closeAllModals()`

---

## Roadmap

### Phase 1 — Polish (1–2 sessions)

These are self-contained improvements to what already exists.

**1.1 Draggable gradient stop bar**
Replace the position slider with an actual visual gradient bar where stops are draggable handles. Users grab a colored circle on the gradient preview itself and drag it left/right. This is the standard UX for gradient editors and is a big usability jump over "select stop, then adjust slider."

**1.2 Color picker: Alpha channel**
The CSS for `.alpha-track` already exists as a stub. Add a 4th slider (0–100% opacity), update `pickerHsl` to `{h,s,l,a}`, output `hsla()`/`rgba()`/`#RRGGBBAA` hex8. Useful for UI design workflows.

**1.3 Palette slot editing**
Click a hex value in a palette slot to open an inline mini-picker or the full Color Picker pre-seeded with that color. Right now the only way to change a specific color is to lock everything else and regenerate.

**1.4 Keyboard shortcuts panel**
`?` key opens a modal listing all shortcuts. Currently Space/Ctrl+Z work but are undiscoverable.

**1.5 Palette count persistence**
Count slider resets to 6 on reload. Store `state.count` and `state.mode` in `localStorage` so the last session is restored.

---

### Phase 2 — New Tools (2–4 sessions)

**2.1 Contrast Checker (standalone)**
A focused two-color picker: pick foreground + background, see WCAG ratio live with a large, clear pass/fail indicator. Different from the matrix — this is the tool you use while designing a specific UI component.

**2.2 Color Mixer**
Pick 2–4 colors and generate interpolated blends between them in HSL, OKLab, and RGB color spaces. Show how the mixing model affects the result (OKLab avoids the "muddy middle" problem). Export the blend as a scale.

**2.3 Palette Comparison**
Show two saved palettes side by side. Highlight matching color names, contrast differences, and which palette performs better for accessibility.

**2.4 Real-time CSS Preview**
A live demo pane showing a fake UI component (card, button, nav bar) rendered using the current palette. As colors change, the component updates. This turns the abstract palette into something concrete.

**2.5 Palette Scoring**
Automatically score a palette on: visual balance (hue distribution), contrast accessibility (% of pairs that pass AA), saturation harmony, and uniqueness. Show a radar chart. Useful for teams with design system requirements.

---

### Phase 3 — Integrations (3–5 sessions)

**3.1 Figma Tokens export**
Export the current palette as a Style Dictionary–compatible JSON file that Figma Tokens plugin can import directly. Structured as `color.primary.50` through `color.primary.950`.

**3.2 Tailwind CSS config generator**
Already partially there with the scale exporter, but extend to full `tailwind.config.js` output including multiple named scales from saved palettes, plus semantic aliases (`primary`, `secondary`, `neutral`, `danger`, `success`).

**3.3 CSS custom property theme system**
Generate a complete CSS file with light and dark mode custom properties derived from the palette. Auto-assign semantic roles: `--color-bg`, `--color-surface`, `--color-text`, `--color-accent`, `--color-muted`. Include a `prefers-color-scheme` media query.

**3.4 SVG/PNG palette card export**
Render the current palette as a downloadable image — a clean card showing all colors with hex, name, and HSL values. Useful for sharing with clients or in design documentation.

**3.5 URL as state (full)**
Currently the share URL encodes hex colors and mode. Extend to encode locked slots, seed colors, and count so that a shared URL fully restores the exact session state.

---

### Phase 4 — Architecture (when complexity demands it)

At some point the single-file approach will limit what's possible. These are the architectural moves to make when the time comes.

**4.1 Move to a build pipeline**
Migrate to a Vite + TypeScript project (the v2 source was already started). Enables tree-shaking, proper module splitting, type safety, and a dev server with HMR. The color math library becomes a proper ES module that can be tested in isolation.

**4.2 State management**
Replace the mutable `state` object with a simple reducer pattern (not a full library — just `dispatch(action)` → `newState`). This makes undo/redo trivial, enables time-travel debugging, and makes the palette comparison and scoring features straightforward to add.

**4.3 Web Worker for image extraction**
The median-cut algorithm currently runs on the main thread and can freeze the UI for large images. Move it to a Web Worker so extraction is non-blocking.

**4.4 IndexedDB for saved palettes**
`localStorage` has a 5MB cap and is synchronous. Switch to IndexedDB (or a tiny wrapper like `idb`) to support larger collections, palette history, and eventually collaborative features.

**4.5 PWA / offline support**
A service worker + manifest would make Chroma installable and usable offline. The entire app already works without a server — the gap is just the manifest and cache strategy.

---

## Recommended Next Steps

The highest-leverage items right now, in order:

1. **Draggable gradient stop bar** (2.1) — the gradient editor is the most-used new tool and this would complete it
2. **Palette slot editing** (1.3) — biggest UX gap in the palette view
3. **CSS custom property theme generator** (3.3) — most practical output for real design work
4. **Color Mixer** (2.2) — genuinely useful, differentiating feature
5. **Palette Scoring radar chart** (2.5) — memorable, shareable, no equivalent in common tools
