# Chroma v4 — Color Design Studio

A professional-grade color palette generator and design system toolkit built with **React 19**, **TypeScript**, **TanStack Router**, **Zustand**, and **Tailwind CSS v4**. Chroma v4 combines perceptually accurate color science (OKLCH, APCA) with a fully responsive studio layout across desktop, tablet, and mobile.

---

## Table of Contents

- [Features](#features)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Route Hierarchy](#route-hierarchy)
- [Architecture](#architecture)
- [Color Science](#color-science)
- [State Management](#state-management)
- [Responsive Layout System](#responsive-layout-system)
- [Navigation](#navigation)
- [Component Reference](#component-reference)
- [REST API](#rest-api)
- [Drag and Drop](#drag-and-drop)
- [Theming](#theming)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Upgrading dnd-kit](#upgrading-dnd-kit)

---

## Features

### Create

- **Palette Workspace** — 2–12 color slots with drag-to-reorder, lock/unlock, per-slot editing
- **14 Harmony Algorithms** — Complementary, Analogous, Triadic, Tetradic, Split-Complementary, Double-Split, Square, Monochromatic, Shades, Tints, Matsuda L/Y/X/T templates
- **OKLCH Color Picker** — RGB, HSL, HSV, OKLCH, and OKLab modes; alpha channel; color wheel; hue suggestion chips; eyedropper API
- **Seed Color Pinning** — Lock specific colors as generation seeds
- **Temperature Controls** — Warm/cool bias slider
- **Saved Palettes** — Persist palettes to `localStorage`; restore, compare, load into editor

### Analyze

- **Accessibility** — WCAG 2.1 contrast pairs matrix (AA/AAA/Fail), APCA lightness contrast, per-slot badge analysis; Color Blind simulation (8 CVD types via LMS matrix transforms)
- **Score & Compare** — Radar chart scoring across harmony, contrast, diversity, saturation balance; side-by-side palette comparison
- **Visualize** — OKLCH 3D scatter plot (L/C/H axes); P3 wide-gamut boundary visualization; out-of-gamut flagging
- **Brand Compliance** — Brand color matching, minimum contrast ratio enforcement, usage proportion guidelines

### Build

- **Color Mixer** — Interpolate between 2–5 colors in RGB, OKLab, or OKLCH space with midpoint preview
- **Gradient Editor** — Linear, radial, and conic gradients; draggable stops; interpolation spaces (sRGB, OKLab, OKLCH, HSL); easing curves; CSS/SVG export
- **Extract & Convert** — Extract dominant colors from uploaded images (median-cut algorithm); convert any color format to hex/RGB/HSL/HSV/CMYK/OKLab/OKLCH

### Export

- **Scales** — Tint/shade scales (50–950 steps) for single colors or entire palettes; export as CSS custom properties, JavaScript objects, Tailwind config, or JSON
- **Design Tokens** — Semantic token system (primary, secondary, accent, neutral, semantic); light/dark split; Figma Tokens JSON; Style Dictionary; Tailwind v4 `@theme` blocks; CSS preview with realistic app mockup
- **Theme Generator** — shadcn/ui-compatible Tailwind v4 theme; Material Design 3 surface elevation; 60-30-10 proportion system; live dark/light preview
- **Utility Colors** — Mathematically derived semantic colors (destructive, warning, success, info) from palette hues; OKLCH hue-box matching

### System

- **Command Palette** — ⌘K / Ctrl+K fuzzy search across all tools and actions
- **SVG Export** — Downloadable swatch sheet from any palette
- **URL Sharing** — Palette state encoded in URL for easy sharing
- **REST API** — Standalone HTTP server exposing color utilities as endpoints

---

## Getting Started

### Prerequisites

- Node.js ≥ 18 (or Bun)
- npm, yarn, pnpm, or bun

### Install and run

```bash
# Clone or unzip the project
cd chroma-v4

# Install dependencies
npm install
# or: bun install

# Start dev server
npm run dev
# or: bun run dev
```

The app runs at `http://localhost:5173`.

### Build for production

```bash
npm run build
npm run preview
```

### Install real dnd-kit (optional)

The project ships with a vendored shim at `src/chroma/vendor/dnd-kit/`. To switch to the real packages:

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Then remove the three alias entries from `vite.config.ts` and `tsconfig.app.json`. See [Upgrading dnd-kit](#upgrading-dnd-kit).

---

## Project Structure

```text
chroma-v4/
├── api/                          # Standalone REST API server
│   ├── server.ts                 # Express HTTP server
│   └── README.md                 # API endpoint documentation
│
├── routes/                       # TanStack Router file-based routes
│   ├── __root.tsx                # Root layout — HTML shell, providers
│   ├── index.tsx                 # Redirect → /palette
│   ├── _chroma.tsx               # Pathless layout — wraps all chroma routes
│   ├── _chroma/
│   │   ├── palette.tsx           # CREATE: Palette workspace
│   │   ├── picker.tsx            # CREATE: Color picker
│   │   ├── saved.tsx             # CREATE: Saved palettes
│   │   │
│   │   ├── analyze.tsx           # ANALYZE: Section layout (renders <Outlet/>)
│   │   ├── analyze/
│   │   │   ├── index.tsx         # Redirect → /analyze/accessibility
│   │   │   ├── accessibility.tsx # WCAG + Contrast + Color Blind (merged)
│   │   │   ├── scoring.tsx       # Score + Comparison (merged)
│   │   │   ├── visualize.tsx     # OKLCH Scatter + P3 Gamut (merged)
│   │   │   └── brand.tsx         # Brand compliance
│   │   │
│   │   ├── build.tsx             # BUILD: Section layout (renders <Outlet/>)
│   │   ├── build/
│   │   │   ├── index.tsx         # Redirect → /build/mixer
│   │   │   ├── mixer.tsx         # Color mixer
│   │   │   ├── gradient.tsx      # Gradient editor
│   │   │   └── extract.tsx       # Image extract + Converter (merged)
│   │   │
│   │   ├── export.tsx            # EXPORT: Section layout (renders <Outlet/>)
│   │   ├── export/
│   │   │   ├── index.tsx         # Redirect → /export/scale
│   │   │   ├── scale.tsx         # Single + Multi-scale (merged)
│   │   │   ├── designsystem.tsx  # Design tokens + CSS Preview (merged)
│   │   │   ├── theme.tsx         # Theme generator
│   │   │   └── utility.tsx       # Utility colors
│   │   │
│   │   └── [legacy redirects]    # Old flat URLs preserved for bookmarks
│
└── src/
    └── chroma/
        ├── chroma-shell.tsx      # Root responsive layout dispatcher
        ├── color-math.ts         # Core color science (OKLCH, APCA, WCAG…)
        ├── color-math-scale.ts   # Scale/token generation functions
        ├── color-math-export.ts  # Export format helpers
        ├── color-math.ts         # Central re-export
        ├── palette-utils.ts      # Harmony algorithms, image extraction
        ├── use-chroma-store.ts   # Zustand store (global state)
        ├── types.ts              # TypeScript types
        ├── constants.ts          # Color constants, CVD matrices
        ├── hotkey-context.tsx    # Keyboard shortcut registration
        ├── shell-context.tsx     # Shell type context (studio/tablet/mobile)
        ├── svg-export.ts         # SVG swatch generation
        ├── lib/utils.ts          # Tailwind cn() utility
        ├── index.ts              # Public exports
        │
        ├── components/
        │   ├── palette-view.tsx              # Palette workspace view
        │   ├── color-picker-view.tsx         # Standalone color picker page
        │   ├── saved-view.tsx                # Saved palettes browser
        │   ├── color-mixer.tsx               # Color mixing tool
        │   ├── gradient-view.tsx             # Gradient builder
        │   ├── theme-generator-view.tsx      # Theme generator
        │   ├── utility-colors-view.tsx       # Utility color generator
        │   ├── brand-compliance-view.tsx     # Brand compliance checker
        │   ├── design-system-view.tsx        # Design token exporter
        │   ├── css-preview.tsx               # CSS variable preview
        │   ├── command-palette.tsx           # ⌘K command palette
        │   │
        │   ├── accessibility.view.tsx        # MERGED: WCAG + Contrast + CVD
        │   ├── score.view.tsx                # MERGED: Scoring + Comparison
        │   ├── visualize.view.tsx            # MERGED: OKLCH + P3
        │   ├── scales.view.tsx               # MERGED: Single + Multi scale
        │   ├── extract.view.tsx              # MERGED: Extract + Converter
        │   ├── tokens.view.tsx               # MERGED: Tokens + CSS Preview
        │   │
        │   ├── layout/
        │   │   ├── studio-shell.tsx          # Desktop 3-column layout
        │   │   ├── tablet-shell.tsx          # Tablet adaptive layout
        │   │   ├── mobile-shell.tsx          # Mobile touch-first layout
        │   │   ├── nav-desktop.tsx           # Top navigation bar
        │   │   ├── nav-rail.tsx              # Tablet icon rail
        │   │   ├── nav-mobile.tsx            # Mobile bottom tab bar
        │   │   ├── nav-tabs.tsx              # Sub-tool pill tabs
        │   │   ├── palette-strip.tsx         # Vertical palette strip (desktop)
        │   │   ├── palette-strip-horizontal.tsx  # Horizontal strip (tablet/mobile)
        │   │   ├── slot-card.tsx             # Individual color slot card
        │   │   ├── left-rail.tsx             # Desktop left column wrapper
        │   │   ├── panel.tsx                 # Generic collapsible panel
        │   │   ├── bottom-sheet.tsx          # Mobile slide-up sheet
        │   │   ├── accordion-section.tsx     # Animated accordion
        │   │   ├── generate-controls.tsx     # Algorithm/seed controls
        │   │   ├── generate-controls-accordion.tsx  # Accordion variant
        │   │   └── generate-fab.tsx          # Mobile generate FAB button
        │   │
        │   ├── shared/
        │   │   ├── color-picker-modal.tsx    # Full-featured color picker modal
        │   │   ├── inline-color-picker.tsx   # Embeddable picker (no overlay)
        │   │   ├── color-wheel.tsx           # SVG color wheel component
        │   │   ├── gradient-stop-bar.tsx     # Draggable gradient stop bar
        │   │   ├── hex-input.tsx             # Validated hex color input
        │   │   ├── button.tsx                # Shared button component
        │   │   └── modal.tsx                 # Base modal wrapper
        │   │
        │   └── modals/
        │       ├── export-modal.tsx          # Multi-format export dialog
        │       ├── save-modal.tsx            # Save palette dialog
        │       ├── share-modal.tsx           # URL share dialog
        │       ├── shortcuts-modal.tsx       # Keyboard shortcuts reference
        │       └── index.ts                  # Modal barrel export
        │
        └── vendor/
            └── dnd-kit/                      # @dnd-kit vendored shim
                ├── core/index.tsx            # DnDContext, sensors, collision
                ├── sortable/index.tsx        # SortableContext, useSortable
                └── utilities/index.ts        # CSS transform helpers
```

---

## Route Hierarchy

Chroma uses **TanStack Router** with file-based routing. The URL structure reflects the four main sections:

```text
/                       → redirect to /palette

/palette                Create: Palette workspace
/picker                 Create: Color picker
/saved                  Create: Saved palettes

/analyze                → redirect to /analyze/accessibility
/analyze/accessibility  Analyze: WCAG + APCA + Color Blind simulation
/analyze/scoring        Analyze: Palette scoring + Comparison
/analyze/visualize      Analyze: OKLCH scatter + P3 gamut
/analyze/brand          Analyze: Brand compliance

/build                  → redirect to /build/mixer
/build/mixer            Build: Color mixer
/build/gradient         Build: Gradient editor
/build/extract          Build: Image extract + Format converter

/export                 → redirect to /export/scale
/export/scale           Export: Tint/shade scales
/export/designsystem    Export: Design tokens + CSS preview
/export/theme           Export: Tailwind/shadcn theme generator
/export/utility         Export: Semantic utility colors
```

**Legacy routes** (old flat URLs) are preserved as HTTP redirects so bookmarks and external links remain functional:

| Old URL          | Redirects to             |
| ---------------- | ------------------------ |
| `/accessibility` | `/analyze/accessibility` |
| `/contrast`      | `/analyze/accessibility` |
| `/colorblind`    | `/analyze/accessibility` |
| `/scoring`       | `/analyze/scoring`       |
| `/comparison`    | `/analyze/scoring`       |
| `/oklch-scatter` | `/analyze/visualize`     |
| `/p3`            | `/analyze/visualize`     |
| `/mixer`         | `/build/mixer`           |
| `/gradient`      | `/build/gradient`        |
| `/extract`       | `/build/extract`         |
| `/converter`     | `/build/extract`         |
| `/scale`         | `/export/scale`          |
| `/multiscale`    | `/export/scale`          |
| `/designsystem`  | `/export/designsystem`   |
| `/preview`       | `/export/designsystem`   |
| `/theme`         | `/export/theme`          |
| `/utility`       | `/export/utility`        |
| `/brand`         | `/analyze/brand`         |

---

## Architecture

### Tech Stack

| Layer       | Technology                                            |
| ----------- | ----------------------------------------------------- |
| Framework   | React 19 + TypeScript                                 |
| Routing     | TanStack Router v1 (file-based)                       |
| State       | Zustand + Immer + persist middleware                  |
| Styling     | Tailwind CSS v4 + shadcn/ui token convention          |
| Build       | Vite 6                                                |
| Drag & Drop | @dnd-kit/core (vendored shim, real packages optional) |

### Data Flow

```text
User interaction
      ↓
  Zustand store  (use-chroma-store.ts)
      ↓
  React components read state via selectors
      ↓
  color-math.ts / palette-utils.ts  (pure functions, no side effects)
      ↓
  Derived display values / tokens / exports
```

The store is the single source of truth. Components never derive color data themselves — they call store actions or pass to utility functions. Palette state is persisted to `localStorage` under the key `chroma-v4`.

### Key Design Decisions

**Slots vs. colors** — The store manages `ColorSlot[]` objects (id, color, locked) rather than raw hex arrays. Stable slot IDs power drag-and-drop reordering without React key conflicts.

**OKLCH canonical** — All internal color representation is `ColorStop { r, g, b, a }` (0–255, float alpha). OKLCH is computed on-demand for display and generation — never stored, avoiding rounding drift on repeated edits.

**Merged views** — Logically related views (e.g., WCAG contrast + color blind simulation) are combined into single files with internal tab bars. This reduces navigation depth and keeps related context visible together.

---

## Color Science

All color math lives in `src/chroma/color-math.ts` (re-exported from `color-math-scale.ts` and `color-math-export.ts`).

### Conversions

| Function          | Description                               |
| ----------------- | ----------------------------------------- |
| `hexToRgb(hex)`   | Hex string → `{r,g,b}`                    |
| `rgbToHex(rgb)`   | `{r,g,b}` → hex string                    |
| `rgbToHsl(rgb)`   | → `{h,s,l}` (0–360, 0–100, 0–100)         |
| `rgbToHsv(rgb)`   | → `{h,s,v}`                               |
| `rgbToOklch(rgb)` | → `{L,C,H}` (perceptual)                  |
| `rgbToOklab(rgb)` | → `{L,a,b}`                               |
| `oklchToRgb(lch)` | Gamut-mapped back to sRGB                 |
| `rgbToCmyk(rgb)`  | → `{c,m,y,k}` (0–100)                     |
| `parseAny(input)` | Parse any color string format → `{r,g,b}` |

### Contrast

| Function                     | Description                                            |
| ---------------------------- | ------------------------------------------------------ |
| `contrastRatio(fg, bg)`      | WCAG 2.1 contrast ratio (1–21)                         |
| `wcagLevel(ratio, large?)`   | → `'AAA' \| 'AA' \| 'AA Large' \| 'Fail'`              |
| `apcaContrast(fg, bg)`       | APCA Lc value (perceptual lightness contrast)          |
| `apcaLevel(lc)`              | → `'Preferred' \| 'Body' \| 'Large' \| 'UI' \| 'Fail'` |
| `suggestContrastFix(fg, bg)` | Returns adjusted hex that passes WCAG AA               |

### Palette Generation

| Function                                            | Description                                 |
| --------------------------------------------------- | ------------------------------------------- |
| `generatePalette(mode, count, base?, seeds?, temp)` | Generate palette using harmony algorithm    |
| `generateScale(hex, steps)`                         | Tint/shade scale from 50 to 950             |
| `scorePalette(hexes)`                               | Radar chart scores across 5 dimensions      |
| `semanticSlotNames(hexes)`                          | Assign semantic names (primary, secondary…) |

### Harmony Modes

`analogous` · `complementary` · `triadic` · `tetradic` · `split-complementary` · `double-split` · `square` · `monochromatic` · `shades` · `tints` · `matsuda-L` · `matsuda-Y` · `matsuda-X` · `matsuda-T`

Matsuda templates implement the arc-based harmonic template system from Matsuda's CHA research paper, operating natively in OKLCH hue space.

### Color Vision Deficiency Simulation

`applySimMatrix(rgb, type)` applies LMS-space matrix transforms for:
`deuteranopia` · `protanopia` · `tritanopia` · `deuteranomaly` · `protanomaly` · `tritanomaly` · `achromatopsia` · `achromatomaly`

---

## State Management

The Zustand store is defined in `src/chroma/use-chroma-store.ts`.

### State Shape

```typescript
interface ChromaState {
  // Palette
  slots: ColorSlot[]; // Current palette (2–12 slots)
  mode: HarmonyMode; // Active harmony algorithm
  seedHexes: string[]; // Pinned seed colors
  temperature: number; // Warm/cool bias (-1 to 1)

  // Extracted / imported colors
  extractedColors: string[];
  imgSrc: string | null;

  // Saved palettes
  savedPalettes: SavedPalette[];

  // UI state
  activeModal: ModalType | null;
  editSlotIndex: number | null;
  saveName: string;
}
```

### Key Actions

```typescript
// Palette generation
generate()                           // Re-generate with current settings
loadPalette(slots, mode, count)      // Load a saved palette

// Slot editing
editSlotColor(index, color)          // Update a slot's color (ColorStop)
toggleLock(index)                    // Lock/unlock a slot
removeSlot(index)                    // Remove a slot
addSlot()                            // Append a new slot
reorderSlots(from, to)               // Drag-and-drop reorder

// Modal control
openModal(type)  closeModal()

// Persistence
savePalette(name)                    // Save to savedPalettes[]
deleteSavedPalette(id)
```

---

## Responsive Layout System

`chroma-shell.tsx` dispatches to one of three layout shells based on viewport width using Tailwind's responsive prefix strategy (CSS-only, no JS media query listeners):

| Breakpoint   | Shell         | Layout                                                         |
| ------------ | ------------- | -------------------------------------------------------------- |
| `< 640px`    | `MobileShell` | Bottom tab bar, horizontal scroll strip, FAB, bottom sheets    |
| `640–1023px` | `TabletShell` | Icon nav rail, horizontal palette strip, collapsible accordion |
| `≥ 1024px`   | `StudioShell` | 3-column: left rail + palette strip, main panel, right outlet  |

All three shells render simultaneously in the DOM — Tailwind `hidden`/`flex` classes toggle which is visible. This avoids hydration mismatches from JS-based media queries.

### Desktop Studio Layout

```text
┌──────────────────────────────────────────────────────────┐
│ HEADER  [Logo]  [Create] [Analyze] [Build] [Export]  ⚙   │
├────────────────────┬─────────────────────────────────────┤
│                    │                                     │
│  PALETTE STRIP     │    ACTIVE PANEL                     │
│  (vertical, fixed) │    <Outlet /> renders here          │
│                    │                                     │
│  ■ slot 1          │    [Tab] [Tab] [Tab]                │
│  ■ slot 2          │    ─────────────────────────        │
│  ■ slot 3          │    Tab content                      │
│  ■ slot 4          │                                     │
├────────────────────│                                     │
│  GENERATE CONTROLS │                                     │
│  (accordion)       │                                     │
└────────────────────┴─────────────────────────────────────┘
```

### ShellContext

Components that need to know which shell is active use `useShell()`:

```typescript
import { useShell } from "../shell-context";

function MyComponent() {
  const shell = useShell(); // 'studio' | 'tablet' | 'mobile' | null
  // ...
}
```

`palette-view.tsx` uses this to conditionally render the palette strip panel inside the studio layout vs. as a standalone page on other shells.

---

## Navigation

### Section definitions (`nav-desktop.tsx`)

The four main sections are defined in `SECTIONS` and `SECTION_TOOLS`:

```typescript
// SECTIONS — top-level nav links
SECTIONS = [
  { id: 'create',  primary: '/palette',               routes: ['/palette', '/picker', '/saved'] },
  { id: 'analyze', primary: '/analyze/accessibility', routes: ['/analyze/accessibility', ...] },
  { id: 'build',   primary: '/build/mixer',           routes: ['/build/mixer', ...] },
  { id: 'export',  primary: '/export/scale',          routes: ['/export/scale', ...] },
]
```

Active state uses **prefix matching** (`pathname.startsWith(route)`) so `/analyze/scoring` correctly highlights the Analyze section.

### Command Palette

Triggered with `⌘K` (Mac) or `Ctrl+K` (Windows/Linux). Searches across all 14 tools and 10 common actions. Implemented via `useCommandPalette()` context hook.

```typescript
import { useCommandPalette } from "../components/command-palette";

const { setOpen } = useCommandPalette();
setOpen(true); // open programmatically
```

---

## Component Reference

### Shared components

**`<Button>`** — `variant`: `primary | secondary | ghost | destructive`; `size`: `sm | md | lg`

**`<HexInput>`** — Validated hex input field. Fires `onChange` only on valid 6-digit hex. Shows inline color preview swatch.

**`<ColorPickerModal>`** — Full-featured modal with color wheel, RGB/HSL/HSV/OKLCH sliders, alpha channel, hue chips.

**`<InlineColorPicker>`** — Same picker UI but without the modal overlay — embeddable inside panels/sheets.

**`<Modal>`** — Base modal wrapper with focus trap, Escape to close, backdrop click to close.

### Layout components

**`<Panel>`** — Generic collapsible panel. Props: `title`, `open`, `onToggle`, `className`.

**`<AccordionSection>`** — Animated height accordion. Uses `ResizeObserver`-based measurement for smooth open/close.

**`<BottomSheet>`** — Mobile slide-up sheet. Props: `open`, `onClose`, `title`, `height` (`half | full | auto`).

**`<SlotCard>`** — Individual palette slot. Renders hex, name badge, lock icon, drag handle. Connects to dnd-kit via `useSortable`.

**`<PaletteStrip>`** — Vertical slot list (desktop). Manages `DndContext` + `SortableContext`.

**`<PaletteStripHorizontal>`** — Horizontal scrolling slot strip (tablet/mobile). Supports touch momentum scroll.

---

## REST API

A standalone Express server at `api/server.ts` exposes color utilities over HTTP. Run it separately from the frontend:

```bash
cd api
npx ts-node server.ts
# Server: http://localhost:3001
```

### Endpoints

| Method | Path                    | Description                                |
| ------ | ----------------------- | ------------------------------------------ |
| `GET`  | `/api/health`           | Server status and endpoint list            |
| `POST` | `/api/palette/generate` | Generate palette from harmony mode         |
| `POST` | `/api/palette/analyze`  | OKLCH data + contrast matrix for hex array |
| `POST` | `/api/color/convert`    | Convert hex → all formats                  |
| `POST` | `/api/color/contrast`   | WCAG contrast ratio between two colors     |
| `POST` | `/api/gradient/css`     | Generate CSS gradient string from stops    |
| `POST` | `/api/export/svg`       | Generate SVG swatch sheet                  |

Full request/response examples are in [`api/README.md`](./api/README.md).

---

## Drag and Drop

Palette slot reordering uses the `@dnd-kit` API. The project currently ships with a **vendored shim** at `src/chroma/vendor/dnd-kit/` that implements the same API surface without the npm package dependency.

The shim implements:

- `DndContext` with `PointerSensor` and `KeyboardSensor`
- `SortableContext` with `verticalListSortingStrategy` / `horizontalListSortingStrategy`
- `useSortable` hook
- `arrayMove` utility
- `CSS.Transform.toString` helper

### Upgrading to real dnd-kit

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Then remove from `vite.config.ts`:

```typescript
// Remove these three alias entries:
'@dnd-kit/core':      path.resolve(...),
'@dnd-kit/sortable':  path.resolve(...),
'@dnd-kit/utilities': path.resolve(...),
```

And from `tsconfig.app.json`, remove the three `paths` entries for `@dnd-kit/*`. No source code changes required — the API is identical.

See [`DND_KIT_UPGRADE.md`](./DND_KIT_UPGRADE.md) for full details.

---

## Theming

Chroma uses Tailwind CSS v4's `@theme` block for design tokens, and a cookie-based light/dark/auto theme system.

### Theme switching

The active theme (`light | dark | auto`) is stored in a cookie and read server-side on every render. The `<html>` element receives the class directly:

- `light` → `<html class="light">` → CSS `.light { ... }` block
- `dark` → `<html class="dark">` → Tailwind `dark:` utilities activate
- `auto` → no class → `@media (prefers-color-scheme)` handles it

Switching theme calls `setThemeServerFn()` and invalidates the router. No `next-themes`, no `localStorage` — a single source of truth.

### Using the theme in components

```typescript
import { useTheme } from "../providers/theme.provider";

const { theme } = useTheme(); // 'light' | 'dark' | 'auto'
```

---

## Keyboard Shortcuts

| Shortcut        | Action                                              |
| --------------- | --------------------------------------------------- |
| `Space`         | Generate new palette                                |
| `⌘K` / `Ctrl+K` | Open command palette                                |
| `⌘Z` / `Ctrl+Z` | Undo last generation                                |
| `⌘E` / `Ctrl+E` | Open export modal                                   |
| `1` – `4`       | Jump to section (Create / Analyze / Build / Export) |
| `L`             | Lock/unlock active slot                             |
| `?`             | Open shortcuts reference                            |
| `Escape`        | Close modal / command palette                       |

Shortcuts are registered via `useRegisterHotkey()` from `hotkey-context.tsx`. Components register handlers on mount and clean up on unmount.

---

## Upgrading dnd-kit

### Overview

`palette-view.tsx` uses `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities`
for the drag-to-reorder palette slots feature.

Because the packages couldn't be installed during development, a **vendor shim** lives at:

```text
src/chroma/vendor/dnd-kit/
├── core/       → @dnd-kit/core
├── sortable/   → @dnd-kit/sortable
└── utilities/  → @dnd-kit/utilities
```

The shim implements the exact same public API as the real packages, so `palette-view.tsx`
and any future component can import `@dnd-kit/*` without knowing whether it's the shim
or the real thing.

---

### Migrating to the real packages (recommended)

Once you have internet access:

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Then remove the vendor alias from **`vite.config.ts`**:

```diff
  resolve: {
-   alias: {
-     '@dnd-kit/core':      path.resolve(__dirname, 'src/chroma/vendor/dnd-kit/core'),
-     '@dnd-kit/sortable':  path.resolve(__dirname, 'src/chroma/vendor/dnd-kit/sortable'),
-     '@dnd-kit/utilities': path.resolve(__dirname, 'src/chroma/vendor/dnd-kit/utilities'),
-   },
  },
```

And remove the `paths` block from **`tsconfig.app.json`**:

```diff
  "compilerOptions": {
-   "baseUrl": ".",
-   "paths": {
-     "@dnd-kit/core":      ["src/chroma/vendor/dnd-kit/core/index.tsx"],
-     "@dnd-kit/sortable":  ["src/chroma/vendor/dnd-kit/sortable/index.tsx"],
-     "@dnd-kit/utilities": ["src/chroma/vendor/dnd-kit/utilities/index.ts"]
-   }
  }
```

Then delete the vendor directory:

```bash
rm -rf src/chroma/vendor/dnd-kit
```

No changes needed in any component file — they all import from `@dnd-kit/*` already.

---

### What the shim implements

#### `@dnd-kit/core`

| Export                                                          | Status                                                     |
| --------------------------------------------------------------- | ---------------------------------------------------------- |
| `DndContext`                                                    | ✅ Full — sensors, collision detection, all drag callbacks |
| `DragOverlay`                                                   | ✅ Renders dragged clone in a portal                       |
| `useDraggable`                                                  | ✅ Full — pointer + keyboard activation, transform         |
| `useDroppable`                                                  | ✅ Full — rect-based collision registration                |
| `useSensor`, `useSensors`                                       | ✅                                                         |
| `PointerSensor`, `KeyboardSensor`, `MouseSensor`, `TouchSensor` | ✅                                                         |
| `closestCenter`                                                 | ✅ Distance-to-center collision                            |
| `closestCorners`, `rectIntersection`, `pointerWithin`           | ✅                                                         |
| `useDndMonitor`                                                 | Stub (no-op)                                               |
| `MeasuringStrategy`, `MeasuringConfiguration`                   | Types only                                                 |

#### `@dnd-kit/sortable`

| Export                          | Status                                                           |
| ------------------------------- | ---------------------------------------------------------------- |
| `SortableContext`               | ✅ Full — item registration, index tracking                      |
| `useSortable`                   | ✅ Full — combines useDraggable + useDroppable, shift transforms |
| `arrayMove`, `arraySwap`        | ✅                                                               |
| `horizontalListSortingStrategy` | ✅                                                               |
| `verticalListSortingStrategy`   | ✅                                                               |
| `rectSortingStrategy`           | ✅                                                               |
| `sortableKeyboardCoordinates`   | ✅ (stub — keyboard nav handled by KeyboardSensor)               |
| `defaultAnimateLayoutChanges`   | ✅                                                               |

#### `@dnd-kit/utilities`

| Export                                  | Status                        |
| --------------------------------------- | ----------------------------- |
| `CSS.Transform.toString`                | ✅ Matches real output format |
| `CSS.Transition.toString`               | ✅                            |
| `isKeyboardEvent`, `isTouchEvent`       | ✅                            |
| `Coordinates`, `Transform`, `Translate` | Types                         |

---

### How palette drag-and-drop works

```text
User grabs slot              → PointerSensor detects distance > 5px
DndContext.onDragStart       → activeSlotId set → DragOverlay renders clone
Pointer moves                → collision detection runs each frame
                             → overId = closest slot center
DndContext.onDragEnd         → arrayMove in store via reorderSlots()
                             → activeSlotId cleared → DragOverlay removed
```

Keyboard:

```text
Tab to slot → Space/Enter → Arrow keys to shift → Space/Enter to commit → Escape cancels
```

## License

MIT
