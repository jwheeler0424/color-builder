# Project Structure

```text
src/
  lib/
    types.ts                   — all shared types
    colorMath.ts               — pure color functions (zero deps)
    constants.ts               — HARMONIES, THEMES, CB_TYPES, GRAD_PRESETS, NAMED
    storage.ts                 — localStorage + URL encode/decode
    imageExtract.ts            — median-cut
  hooks/
    useChromaStore.ts          — single useReducer store, all state
  components/
    Chroma.tsx               — root, layout, keyboard shortcuts
    PaletteView.tsx          — palette strip + sidebar
    ColorPickerView.tsx      — wheel + sliders + alpha (Phase 1.2)
    TintScaleView.tsx        — scale + token export
    ColorBlindView.tsx       — simulation cards
    GradientView.tsx         — gradient generator + draggable stops (Phase 1.1)
    ConverterView.tsx        — format converter
    AccessibilityView.tsx    — WCAG matrix + pairs
    ImageExtractView.tsx     — drop zone + extraction
    SavedView.tsx            — saved palettes grid
    ContrastChecker.tsx      — Phase 2.1
    ColorMixer.tsx           — Phase 2.2
    PaletteScoring.tsx       — Phase 2.5
    CssPreview.tsx           — Phase 2.4
    shared/
      Modal.tsx
      Button.tsx
      SlabInput.tsx
      ColorWheel.tsx         — canvas wheel, reused by picker + mixer
      GradientStopBar.tsx    — draggable stop bar (Phase 1.1)
  chroma.css                 — all styles as single CSS file
  App.tsx
```
