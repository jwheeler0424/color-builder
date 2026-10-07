# Chroma v4 — Color Design Studio

A professional-grade color palette generator and design system toolkit built with **React 19**,
**TypeScript**, **TanStack Router**, **Zustand**, and **Tailwind CSS v4**. Chroma v4 combines
perceptually accurate color science (OKLCH, APCA) with a fully responsive studio layout across
desktop, tablet, and mobile.

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
- **14 Harmony Algorithms** — Complementary, Analogous, Triadic, Tetradic, Split-Complementary,
  Double-Split, Square, Monochromatic, Shades, Tints, Matsuda L/Y/X/T templates
- **OKLCH Color Picker** — RGB, HSL, HSV, OKLCH, and OKLab modes; alpha channel; color wheel; hue
  suggestion chips; eyedropper API
- **Seed Color Pinning** — Lock specific colors as generation seeds
- **Temperature Controls** — Warm/cool bias slider
- **Saved Palettes** — Persist palettes to `localStorage`; restore, compare, load into editor

### Analyze

- **Accessibility** — WCAG 2.1 contrast pairs matrix (AA/AAA/Fail), APCA lightness contrast,
  per-slot badge analysis; Color Blind simulation (8 CVD types via LMS matrix transforms)
- **Score & Compare** — Radar chart scoring across hue balance, accessibility, chroma harmony, and uniqueness;
  side-by-side palette comparison
- **Visualize** — OKLCH lightness/chroma scatter and hue/chroma polar distribution; P3 swatch previews;
  out-of-gamut flagging
- **Brand Compliance** — Brand color matching, minimum contrast ratio enforcement, usage proportion
  guidelines

### Build

- **Color Mixer** — Interpolate between 2–5 colors in RGB, OKLab, or OKLCH space with midpoint
  preview
- **Gradient Editor** — Linear, radial, and conic gradients; draggable stops; interpolation spaces
  (sRGB, OKLab, OKLCH, HSL); easing curves; CSS/SVG export
- **Extract & Convert** — Extract dominant colors from uploaded images (median-cut algorithm);
  convert any color format to hex/RGB/HSL/HSV/CMYK/OKLab/OKLCH

### Export

- **Scales** — Tint/shade scales (50–950 steps) for single colors or entire palettes; export as CSS
  custom properties, JavaScript objects, Tailwind config, or JSON
- **Design Tokens** — Semantic token system (primary, secondary, accent, neutral, semantic);
  light/dark split; Figma Tokens JSON; Style Dictionary; Tailwind v4 `@theme` blocks; CSS preview
  with realistic app mockup
- **Theme Generator** — shadcn/ui-compatible Tailwind v4 theme; Material Design 3 surface elevation;
  60-30-10 proportion system; live dark/light preview
- **Utility Colors** — Mathematically derived semantic colors (destructive, warning, success, info)
  from palette hues; OKLCH hue-box matching

### System

- **Command Palette** — ⌘K / Ctrl+K fuzzy search across all tools and actions
- **SVG Export** — Downloadable swatch sheet from any palette
- **URL Sharing** — Palette state encoded in URL for easy sharing
- **REST API** — Standalone HTTP server exposing color utilities as endpoints

---

## Getting Started

### Prerequisites

- Bun 1.4.2 or newer

### Install and run

```bash
# Install dependencies
bun install

# Start dev server
bun run dev
```

The app runs at `http://localhost:5173`.

Development generates the file-based TanStack routes, starts a route watcher, and serves the HTML
entrypoint with Bun HMR. New and changed route files are picked up automatically. Use
`PORT=5174 bun run dev` to change the port.

The app is a client-side SPA using TanStack React Router. It does not use TanStack Start or
server-side rendering.

### Production server

```bash
bun run start
# Equivalent production preview:
bun run preview
```

Like the sibling page-builder, these commands serve and bundle **source HTML** with Bun in
production mode. They do not serve `dist`. Deploy the source, installed dependencies (including
build tooling), and Bun. Production disables HMR, browser-console forwarding, and the route watcher.

### Static export

```bash
bun run build
```

This generates routes and writes bundled HTML, JavaScript, CSS, fonts, and the contents of `public/`
to `dist/`. A static host must rewrite application URLs to `index.html` while serving asset URLs
normally. Assets use root-relative URLs; deploy at the origin root.

### Checks and tests

```bash
bun run check-types
bun run lint
bun run format
bun test
bun run test:coverage
```

Tests use `bun:test`, Happy DOM, and Testing Library with DOM matchers and automatic cleanup. Oxc
provides linting and formatting. `bun run lint:fix` applies lint fixes; `bun run format:fix` formats
files. `bun run check` also applies lint fixes.

`bun run generate-routes` and `bun run watch-routes` remain available independently. The generated
route tree and the archived `__old__/` sources are excluded from Oxc.

The sample `/api/hello` HTTP handlers have been removed. `/api/palette` remains a client-side UI
page, not a server endpoint.

### Sequential color-name review

The review worker requires an installed, signed-in GitHub Copilot CLI and consumes model requests.
Run a bounded series of 300-color batches with:

```bash
bun scripts/review-color-batches.ts --from 9 --through 100 --batch-workers 3
```

Three batch workers receive disjoint frozen color lists and prepare candidates concurrently.
A single coordinator rechecks cross-batch name ownership, saves in batch order, and advances
the public queue. `--batch-workers` accepts 1 through 4 and defaults to 3.
Each batch generates three 100-color slices concurrently, with worker tools disabled and hexes
mapped from immutable row IDs. A 12-color quality sample and targeted repairs replace routine
full-batch rewrites. Completed slices are checkpointed for restart. Combined candidates must cover
the exact queue, pass naming-quality guards, and satisfy the builder's name ownership and fit
checks before being saved. The next queue is loaded only after a validated batch is saved.
Existing batches are not overwritten. The legacy SQLite snapshot is rebuilt and verified at the end
of the run.

Progress and rejected candidates are kept in the ignored `.cache/color-review/` directory.
Rerun the same command after fixing a failure to resume from the first unsaved batch. Failures
stop the runner; do not treat a saved candidate as an accepted batch. On Windows the runner
uses the npm-installed CLI entry point to avoid shell quoting issues. A custom installation can
be selected with `COLOR_REVIEW_CLI_ENTRY`, pointing to `@github/copilot/npm-loader.js`.
Set `COLOR_REVIEW_MODEL` to select a CLI-supported model; otherwise the CLI default is used.

### CSV duplicate-name cleanup

Audit the current catalog before renaming:

```bash
bun scripts/audit-color-names.ts
```

Use `bun scripts/audit-color-names.ts --check` for a read-only review without writing a queue.

The source is `src/lib/engine/colors/colors.csv`, not the outdated CSV under `scripts/`.
Before writing the queue, the audit opens `src/lib/engine/colors/colors.sqlite` read-only,
checks SQLite integrity, and requires every CSV name and hex to match both the `colors` and
`color_oklab` tables, independent of row order. Any mismatch stops the audit before publication.
This writes `src/lib/engine/colors/color-name-renames.csv` without changing either catalog.
Each queued row includes its one-based data-row index, hex, current name, reasons, an optional
CSS-name suggestion, duplicate keeper, and an empty `New Name` field for manual review.
The audit checks codes/numeric labels, parentheses, names over three whitespace-separated
words, and normalized duplicates. Formulaic naming structures and suspected misspellings
are not flagged. Unflagged names are not a guarantee of semantic fit.
Individually reviewed numeric references (such as `Windows 95 Desktop`, `French 75`, and
scientific names) are recorded by exact hex and current name in the audit script's `reviewedNames`
map, independent of the removed legacy review directory. These approvals suppress only the
code/numeric-label flag, not duplicates, CSS ownership, parentheses, or the three-word limit.
Changed names or different hexes require fresh review; digits alone do not prove a name is a code.
The audit also detects letter-only hex labels and Unicode numeric characters.
Standard CSS names are reserved for their exact RGB hex
values. Capitalization and spaces are ignored when matching CSS names, so `Light Blue` is
accepted for `#ADD8E6`; the three-word limit still applies.
Equivalent CSS aliases (such as aqua/cyan and gray/grey) are accepted, and a correctly
matched CSS row takes priority over an earlier duplicate. Colors absent from the catalog are
not added. The rename CSV is a review queue, not an input to the duplicate-only override builder.

The `New Name` column contains the proposed replacements. Verify it without changing any files:

```bash
bun scripts/fill-color-name-renames.ts
```

Verification requires every queued row to have a name, at most three words, no codes or parentheses,
and no collision with any current catalog name or another proposal. Comparisons normalize Unicode,
case, spaces, and hyphens. CSV names must match both SQLite name tables, and SQLite integrity must
pass. The live CSV and database are never updated by this command.
Individually authored names are stored in `color-name-replacements.json`, bound to the queue's
row/name/hex fingerprint and ordered by lightness within hue groups. Use `--write` to republish the
complete authored list; `--write --partial` supports completed groups while authoring. Existing
nonmatching proposals are never overwritten. The audit refuses to clear a queue with populated
replacement names.

Apply the reviewed `New Name` column to the engine CSV and both SQLite name tables:

```bash
bun scripts/fill-color-name-renames.ts --apply
```

This validates staged copies, checks that all non-name CSV fields and SQLite data/schema remain
unchanged, and updates the live SQLite names in a transaction without replacing the open database
file. CSV publication failures roll back the transaction. Originals are retained alongside the
datasets as `colors.csv.before-renames` and `colors.sqlite.before-renames`; existing backup or
staging files are never overwritten. The reviewed queue remains the record of old and new names.

The direct CSV workflow copies all rows and all 17 columns from
`scripts/color-db/names/combined-color-queue.csv` into `colors.csv` in the same directory:

```bash
bun scripts/build-colors-csv.ts
```

Only handwritten entries in `duplicate-name-overrides.json` change names. Each entry identifies
the one-based data row (excluding the header), hex, original name, and replacement name.
All other fields and the source file remain unchanged. Existing unrecorded edits to the output
are rejected rather than overwritten.

`duplicate-color-names.csv` lists every remaining conflicting row. One occurrence per group
can keep its original name; the others need distinct names. Comparisons ignore case and
surrounding whitespace and normalize Unicode. The report counts parsed records, not physical
text lines, because quoted fields may contain newlines. No automatic suffixes are added.

Run `bun scripts/build-colors-csv.ts --require-unique` when manual cleanup is finished; it
fails while any duplicate-name groups remain. Build the SQLite database from the cleaned CSV with:

```bash
bun run build:colors
```

The database is written to `src/lib/constants/color-db/colors.sqlite`; `HEX Code` is its primary
key, so lookups by hex use SQLite's primary-key index. The former generated-data pipeline remains
available as `bun run build:colors:legacy` and writes to `legacy-colors.sqlite`.

For individually AI-authored replacements using the signed-in Copilot CLI:

```bash
bun scripts/review-csv-duplicates.ts --workers 3
```

For a faster, model-free pass, generate descriptive names from each color's hue, saturation, and
lightness values instead:

```bash
bun scripts/review-csv-duplicates.ts --rules
```

This keeps one original name per duplicate group, records generated names in the same override file,
and verifies uniqueness and preservation of all non-name fields.

Workers receive disjoint duplicate rows and can only return proposed names, not edit files.
The coordinator preserves one original occurrence of every name, rejects all global name
clashes and code/suffix names, and records accepted replacements in the handwritten override
file. It refreshes the output and duplicate report every 1,000 accepted names and at shutdown.
Final verification requires zero duplicate names and unchanged non-name data for every row.
This can take hours and consumes model requests. Templates and automatic suffixes are not used.

Progress and reusable draft checkpoints are stored in `.cache/csv-name-review/`. Rerun the
same command after a graceful failure to continue from the remaining duplicates. A lock
prevents two CSV coordinators from running simultaneously; never remove an active runner's lock.
`COLOR_REVIEW_MODEL` and `COLOR_REVIEW_CLI_ENTRY` also apply to this CSV worker.

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

Chroma uses **TanStack Router** with file-based routing. The URL structure reflects the four main
sections:

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

**Legacy routes** (old flat URLs) are preserved as HTTP redirects so bookmarks and external links
remain functional:

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
| Build       | Bun HTML bundler + bun-plugin-tailwind                |
| Charts      | TanStack Charts 0.18.0 (Alpha), SVG renderer          |
| Tests       | Bun test + Happy DOM + Testing Library                |
| Code Checks | Oxc (Oxlint + Oxfmt)                                  |
| Drag & Drop | @dnd-kit/core (vendored shim, real packages optional) |

### Charts

The scoring radar and the two OKLCH plots use the React adapter from
`@tanstack/charts`. Definitions live in `src/lib/tools/palette-charts.ts`; the
shared host in `src/components/ui/chart.tsx` measures container widths on animation
frames to keep narrow panels and responsive shells stable. Charts inherit theme
colors and support pointer and keyboard tooltips. The numeric summaries remain
available alongside the plots.

The package is pinned to `0.18.0` because its Alpha API can change between minor
releases. Its `mark` module is initialized before other chart imports to avoid a
circular-import issue with Bun browser HMR; no dependency files are patched.
`d3-shape` supplies the radar's closed curve. The interactive color picker and P3
swatches remain application-owned graphics.

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

The store is the single source of truth. Components never derive color data themselves — they call
store actions or pass to utility functions. Palette state is persisted to `localStorage` under the
key `chroma-v4`.

### Key Design Decisions

**Slots vs. colors** — The store manages `ColorSlot[]` objects (id, color, locked) rather than raw
hex arrays. Stable slot IDs power drag-and-drop reordering without React key conflicts.

**OKLCH canonical** — All internal color representation is `ColorStop { r, g, b, a }` (0–255, float
alpha). OKLCH is computed on-demand for display and generation — never stored, avoiding rounding
drift on repeated edits.

**Merged views** — Logically related views (e.g., WCAG contrast + color blind simulation) are
combined into single files with internal tab bars. This reduces navigation depth and keeps related
context visible together.

---

## Color Science

All color math lives in `src/chroma/color-math.ts` (re-exported from `color-math-scale.ts` and
`color-math-export.ts`).

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
| `scorePalette(slots)`                               | Four radar dimensions plus overall score    |
| `semanticSlotNames(hexes)`                          | Assign semantic names (primary, secondary…) |

### Harmony Modes

`analogous` · `complementary` · `triadic` · `tetradic` · `split-complementary` · `double-split` ·
`square` · `monochromatic` · `shades` · `tints` · `matsuda-L` · `matsuda-Y` · `matsuda-X` ·
`matsuda-T`

Matsuda templates implement the arc-based harmonic template system from Matsuda's CHA research
paper, operating natively in OKLCH hue space.

### Color Vision Deficiency Simulation

`applySimMatrix(rgb, type)` applies LMS-space matrix transforms for: `deuteranopia` · `protanopia` ·
`tritanopia` · `deuteranomaly` · `protanomaly` · `tritanomaly` · `achromatopsia` · `achromatomaly`

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

`chroma-shell.tsx` dispatches to one of three layout shells based on viewport width using Tailwind's
responsive prefix strategy (CSS-only, no JS media query listeners):

| Breakpoint   | Shell         | Layout                                                         |
| ------------ | ------------- | -------------------------------------------------------------- |
| `< 640px`    | `MobileShell` | Bottom tab bar, horizontal scroll strip, FAB, bottom sheets    |
| `640–1023px` | `TabletShell` | Icon nav rail, horizontal palette strip, collapsible accordion |
| `≥ 1024px`   | `StudioShell` | 3-column: left rail + palette strip, main panel, right outlet  |

All three shells render simultaneously in the DOM — Tailwind `hidden`/`flex` classes toggle which is
visible. This avoids hydration mismatches from JS-based media queries.

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
import { useShell } from '../shell-context';

function MyComponent() {
  const shell = useShell(); // 'studio' | 'tablet' | 'mobile' | null
  // ...
}
```

`palette-view.tsx` uses this to conditionally render the palette strip panel inside the studio
layout vs. as a standalone page on other shells.

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

Active state uses **prefix matching** (`pathname.startsWith(route)`) so `/analyze/scoring` correctly
highlights the Analyze section.

### Command Palette

Triggered with `⌘K` (Mac) or `Ctrl+K` (Windows/Linux). Searches across all 14 tools and 10 common
actions. Implemented via `useCommandPalette()` context hook.

```typescript
import { useCommandPalette } from '../components/command-palette';

const { setOpen } = useCommandPalette();
setOpen(true); // open programmatically
```

---

## Component Reference

### Shared components

**`<Button>`** — `variant`: `primary | secondary | ghost | destructive`; `size`: `sm | md | lg`

**`<HexInput>`** — Validated hex input field. Fires `onChange` only on valid 6-digit hex. Shows
inline color preview swatch.

**`<ColorPickerModal>`** — Full-featured modal with color wheel, RGB/HSL/HSV/OKLCH sliders, alpha
channel, hue chips.

**`<InlineColorPicker>`** — Same picker UI but without the modal overlay — embeddable inside
panels/sheets.

**`<Modal>`** — Base modal wrapper with focus trap, Escape to close, backdrop click to close.

### Layout components

**`<Panel>`** — Generic collapsible panel. Props: `title`, `open`, `onToggle`, `className`.

**`<AccordionSection>`** — Animated height accordion. Uses `ResizeObserver`-based measurement for
smooth open/close.

**`<BottomSheet>`** — Mobile slide-up sheet. Props: `open`, `onClose`, `title`, `height`
(`half | full | auto`).

**`<SlotCard>`** — Individual palette slot. Renders hex, name badge, lock icon, drag handle.
Connects to dnd-kit via `useSortable`.

**`<PaletteStrip>`** — Vertical slot list (desktop). Manages `DndContext` + `SortableContext`.

**`<PaletteStripHorizontal>`** — Horizontal scrolling slot strip (tablet/mobile). Supports touch
momentum scroll.

---

## REST API

A standalone Express server at `api/server.ts` exposes color utilities over HTTP. Run it separately
from the frontend:

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

Palette slot reordering uses the `@dnd-kit` API. The project currently ships with a **vendored
shim** at `src/chroma/vendor/dnd-kit/` that implements the same API surface without the npm package
dependency.

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

The current Bun setup resolves the real packages directly. No vendor aliases or bundler
configuration changes are needed.

See [`DND_KIT_UPGRADE.md`](./DND_KIT_UPGRADE.md) for full details.

---

## Theming

Chroma uses Tailwind CSS v4's `@theme` block for design tokens, and a cookie-based light/dark/auto
theme system.

### Theme switching

The active theme (`light | dark | auto`) is stored in the `chroma-theme` cookie and read client-side
before the first render and when the router is invalidated. The `<html>` element receives the
matching class:

- `light` → `<html class="light">` → CSS `.light { ... }` block
- `dark` → `<html class="dark">` → Tailwind `dark:` utilities activate
- `auto` → `<html class="auto">` → `@media (prefers-color-scheme)` handles it

Switching theme calls `setTheme()` and invalidates the router. The cookie lasts one year, uses
`Path=/` and `SameSite=Lax`, and invalid cookie values fall back to `auto`. Theme changes preserve
unrelated HTML classes. No server functions or theme localStorage are needed.

### Using the theme in components

```typescript
import { useTheme } from '../providers/theme.provider';

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

Shortcuts are registered via `useRegisterHotkey()` from `hotkey-context.tsx`. Components register
handlers on mount and clean up on unmount.

---

## Upgrading dnd-kit

### Overview

`palette-view.tsx` uses `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities` for the
drag-to-reorder palette slots feature.

Because the packages couldn't be installed during development, a **vendor shim** lives at:

```text
src/chroma/vendor/dnd-kit/
├── core/       → @dnd-kit/core
├── sortable/   → @dnd-kit/sortable
└── utilities/  → @dnd-kit/utilities
```

The shim implements the exact same public API as the real packages, so `palette-view.tsx` and any
future component can import `@dnd-kit/*` without knowing whether it's the shim or the real thing.

---

### Migrating to the real packages (recommended)

Once you have internet access:

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

The current Bun setup already resolves these real packages directly, with no vendor aliases in the
bundler or TypeScript configuration.

Then delete the vendor directory:

```bash
rm -rf src/chroma/vendor/dnd-kit
```

No changes needed in any component file — they all import from `@dnd-kit/*` already.

---

### What the shim implements

#### `@dnd-kit/core`

| Export                                                          | Status                                                    |
| --------------------------------------------------------------- | --------------------------------------------------------- |
| `DndContext`                                                    | ✅ Full — sensors, collision detection, all drag callbacks |
| `DragOverlay`                                                   | ✅ Renders dragged clone in a portal                       |
| `useDraggable`                                                  | ✅ Full — pointer + keyboard activation, transform         |
| `useDroppable`                                                  | ✅ Full — rect-based collision registration                |
| `useSensor`, `useSensors`                                       | ✅                                                         |
| `PointerSensor`, `KeyboardSensor`, `MouseSensor`, `TouchSensor` | ✅                                                         |
| `closestCenter`                                                 | ✅ Distance-to-center collision                            |
| `closestCorners`, `rectIntersection`, `pointerWithin`           | ✅                                                         |
| `useDndMonitor`                                                 | Stub (no-op)                                              |
| `MeasuringStrategy`, `MeasuringConfiguration`                   | Types only                                                |

#### `@dnd-kit/sortable`

| Export                          | Status                                                          |
| ------------------------------- | --------------------------------------------------------------- |
| `SortableContext`               | ✅ Full — item registration, index tracking                      |
| `useSortable`                   | ✅ Full — combines useDraggable + useDroppable, shift transforms |
| `arrayMove`, `arraySwap`        | ✅                                                               |
| `horizontalListSortingStrategy` | ✅                                                               |
| `verticalListSortingStrategy`   | ✅                                                               |
| `rectSortingStrategy`           | ✅                                                               |
| `sortableKeyboardCoordinates`   | ✅ (stub — keyboard nav handled by KeyboardSensor)               |
| `defaultAnimateLayoutChanges`   | ✅                                                               |

#### `@dnd-kit/utilities`

| Export                                  | Status                       |
| --------------------------------------- | ---------------------------- |
| `CSS.Transform.toString`                | ✅ Matches real output format |
| `CSS.Transition.toString`               | ✅                            |
| `isKeyboardEvent`, `isTouchEvent`       | ✅                            |
| `Coordinates`, `Transform`, `Translate` | Types                        |

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
