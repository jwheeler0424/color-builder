import type {
  HarmonyMode,
  ColorStop,
  PaletteSlot,
  SavedPalette,
} from "@/types";
import {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  rgbToOklch,
  oklchToRgb,
  clamp,
  colorDist,
  parseHexAlpha,
  opaqueHex,
} from "./color-math.utils";
import { NAMED } from "@/lib/constants/chroma";

// ─── Color Naming ─────────────────────────────────────────────────────────────
// Pre-flattened float array: [r0,g0,b0, r1,g1,b1, ...] — avoids object property
// access in the hot loop and keeps the data fully packed for cache efficiency.

let _namedFlat: Float32Array | null = null;
let _namedByHex: Map<string, string[]> | null = null;
let _namedByName: Map<string, string[]> | null = null;

function normalizeNameQuery(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function normalizeHexQuery(value: string): string {
  const hex = value.trim().replace(/^#/, "").toLowerCase();
  if (/^[0-9a-f]{3}$/.test(hex)) {
    return `#${hex}`;
  }
  if (/^[0-9a-f]{6}$/.test(hex)) {
    return `#${hex}`;
  }
  return "";
}

function getNamedFlat(): Float32Array {
  if (_namedFlat) return _namedFlat;
  _namedFlat = new Float32Array(NAMED.length * 3);
  for (let i = 0; i < NAMED.length; i++) {
    _namedFlat[i * 3] = NAMED[i].rgb.r;
    _namedFlat[i * 3 + 1] = NAMED[i].rgb.g;
    _namedFlat[i * 3 + 2] = NAMED[i].rgb.b;
  }
  return _namedFlat;
}

function getNamedIndexes(): {
  byHex: Map<string, string[]>;
  byName: Map<string, string[]>;
} {
  if (_namedByHex && _namedByName) {
    return { byHex: _namedByHex, byName: _namedByName };
  }

  const byHex = new Map<string, string[]>();
  const byName = new Map<string, string[]>();

  for (const color of NAMED) {
    const hexKey = normalizeHexQuery(color.hex);
    const nameKey = normalizeNameQuery(color.name);

    if (hexKey) {
      const names = byHex.get(hexKey);
      if (names) names.push(color.name);
      else byHex.set(hexKey, [color.name]);
    }

    const hexes = byName.get(nameKey);
    if (hexes) hexes.push(color.hex);
    else byName.set(nameKey, [color.hex]);
  }

  _namedByHex = byHex;
  _namedByName = byName;
  return { byHex, byName };
}

function exactNameMatchFromHex(hex: string): string | null {
  const { byHex } = getNamedIndexes();
  const key = normalizeHexQuery(hex);
  if (!key) return null;
  const names = byHex.get(key);
  return names?.[0] ?? null;
}

export function nearestName(rgb: { r: number; g: number; b: number }): string {
  const exact = exactNameMatchFromHex(rgbToHex(rgb));
  if (exact) return exact;

  const flat = getNamedFlat();
  const { r, g, b } = rgb;
  let bestIdx = 0;
  let bestD = Infinity;
  for (let i = 0; i < NAMED.length; i++) {
    const dr = r - flat[i * 3];
    const dg = g - flat[i * 3 + 1];
    const db = b - flat[i * 3 + 2];
    const d = dr * dr + dg * dg + db * db; // squared — no sqrt needed for comparison
    if (d < bestD) {
      bestD = d;
      bestIdx = i;
    }
  }
  return NAMED[bestIdx].name;
}

// ─── OKLCH Palette Generation ─────────────────────────────────────────────────
//
// All harmony math works directly in OKLCH space.
//
// Why OKLCH over HSL for palette generation:
//  • Equal L values produce equal perceived brightness regardless of hue —
//    a blue at L=0.55 and a yellow at L=0.55 look equally bright. HSL fails
//    this: yellow at HSL L=50% looks far lighter than blue at L=50%.
//  • Hue rotations follow the perceptual color wheel, not the RGB wheel, so
//    complementary / triadic angles feel more balanced visually.
//  • Gamut mapping (chroma bisection) keeps out-of-sRGB colors valid.
//
// Chroma strategy:
//  Palette chroma lives in 0.08–0.22 for general palettes. Seeds push this
//  higher if the input color is very saturated. We cap at 0.30 to stay safely
//  inside sRGB across all hue/lightness combinations.
//
// Lightness distribution:
//  Colors within a harmony share similar L (perceptual uniformity).
//  When count > anchor-hues, we offset L by ±0.08 per "cycle" so adjacent
//  colors of the same hue are distinguishable.

function rotateHue(h: number, d: number): number {
  return (((h + d) % 360) + 360) % 360;
}

/** Build a ColorStop from OKLCH values — gamut-maps automatically */
function makeStop(L: number, C: number, H: number): ColorStop {
  const rgb = oklchToRgb({ L, C, H });
  return { hex: rgbToHex(rgb), rgb, hsl: rgbToHsl(rgb) };
}

/**
 * Matsuda Harmonic Templates — precise implementation from:
 *   Cohen-Or et al. (2006) "Color Harmonization", ACM SIGGRAPH
 *   as cited in Zaeimi & Ghoddosian (2020) Color Harmony Algorithm
 *
 * Each template defines one or more arc ranges (in OKLCH hue degrees)
 * relative to a base hue H=0. The template can be rotated so that
 * its "anchor sector" aligns with any input hue.
 *
 * Arc widths from Appendix A of the CHA paper:
 *   Large area (V, X, Y): 26% of 360° = 93.6°
 *   Small area (i, L, I, Y): 5% of 360° = 18°
 *   L large area: 22% of 360° = 79.2°
 *   T area: 50% of 360° = 180°
 *
 * Templates i, I, N are excluded (per paper: i≈I, N has no hue).
 * We use: V (slice), L (L-shape), Y (Y-shape), X (double-slice), T (half-wheel)
 * plus standard color-theory modes: complementary, triadic, split-comp, etc.
 *
 * A template arc is {center, width} in degrees. We sample N hues uniformly
 * within the template's arcs, biased toward arc centers (more natural results).
 */

interface TemplateArc {
  center: number;
  width: number;
}

const MATSUDA_TEMPLATES: Record<string, TemplateArc[]> = {
  // V type: one wide arc (26% = 93.6°) — analogous cluster
  matsuda_V: [{ center: 0, width: 93.6 }],
  // L type: one large (22% = 79.2°) + one small (5% = 18°) at 90°
  matsuda_L: [
    { center: 0, width: 79.2 },
    { center: 90, width: 18 },
  ],
  // Y type: one large (26% = 93.6°) + one small (5% = 18°) opposite
  matsuda_Y: [
    { center: 0, width: 93.6 },
    { center: 180, width: 18 },
  ],
  // X type: two large arcs (26% each) at 180° — complementary clusters
  matsuda_X: [
    { center: 0, width: 93.6 },
    { center: 180, width: 93.6 },
  ],
  // T type: one half-wheel (50% = 180°) — warm or cool dominance
  matsuda_T: [{ center: 0, width: 180 }],
};

/** Sample n hues from a set of template arcs (rotated to anchorH).
 *  Uses a bias toward arc centers (Gaussian-like weighting via cosine)
 *  so colors feel cohesive rather than randomly spread. */
function sampleArcs(arcs: TemplateArc[], anchorH: number, n: number): number[] {
  const hues: number[] = [];
  // Distribute n samples across arcs proportionally to their width
  const totalWidth = arcs.reduce((s, a) => s + a.width, 0);
  let remaining = n;

  for (let ai = 0; ai < arcs.length; ai++) {
    const arc = arcs[ai];
    const count =
      ai === arcs.length - 1
        ? remaining
        : Math.max(1, Math.round((arc.width / totalWidth) * n));
    remaining -= count;

    for (let i = 0; i < count; i++) {
      // Bias toward center: use cosine-weighted sampling
      // u ∈ [-1, 1] biased toward 0 via u = sin(random * π - π/2)
      const u = Math.sin(Math.random() * Math.PI - Math.PI / 2);
      const offset = u * (arc.width / 2);
      hues.push((((anchorH + arc.center + offset) % 360) + 360) % 360);
    }
  }
  return hues;
}

/**
 * Anchor hue angles for each harmony mode.
 *
 * For Matsuda template modes: returns the set of arc-sampled hues for n colors.
 * For geometric modes: returns exact hue positions (unchanged — these are
 * already correct in perceptual OKLCH space).
 *
 * OKLCH hue landmarks (approximate):
 *   Red ≈ 25°, Orange ≈ 55°, Yellow ≈ 90°, Yellow-Green ≈ 115°,
 *   Green ≈ 142°, Cyan ≈ 195°, Blue ≈ 260°, Purple ≈ 305°, Pink ≈ 340°
 */
function anchorHues(mode: HarmonyMode, h: number): number[] {
  switch (mode) {
    case "complementary":
      return [h, rotateHue(h, 180)];
    case "split-comp":
      return [h, rotateHue(h, 150), rotateHue(h, 210)];
    case "triadic":
      return [h, rotateHue(h, 120), rotateHue(h, 240)];
    case "tetradic":
    case "square":
      return [h, rotateHue(h, 90), rotateHue(h, 180), rotateHue(h, 270)];
    case "double-split":
      return [
        rotateHue(h, -30),
        h,
        rotateHue(h, 30),
        rotateHue(h, 150),
        rotateHue(h, 210),
      ];
    case "compound":
      return [h, rotateHue(h, 150), rotateHue(h, 180), rotateHue(h, 210)];
    // Matsuda template modes — sample fixed 5 hues for multi-seed compatibility
    case "analogous":
    case "matsuda_L":
    case "matsuda_Y":
    case "matsuda_X":
    case "matsuda_T":
      return getMatsudaHues(mode, h, 5) ?? [h];
    default:
      return [h];
  }
}

/** Get arc-sampled hues for Matsuda template modes — used when count > hue anchors */
function getMatsudaHues(
  mode: HarmonyMode,
  anchorH: number,
  n: number,
): number[] | null {
  const templateMap: Partial<Record<HarmonyMode, string>> = {
    analogous: "matsuda_V",
    matsuda_L: "matsuda_L",
    matsuda_Y: "matsuda_Y",
    matsuda_X: "matsuda_X",
    matsuda_T: "matsuda_T",
  };
  const key = templateMap[mode];
  if (!key) return null;
  return sampleArcs(MATSUDA_TEMPLATES[key], anchorH, n);
}

export function genPalette(
  mode: HarmonyMode,
  count: number,
  seeds: { h: number; s: number; l: number }[] | null, // incoming seeds are still in HSL (from picker/store)
  seedMode: "influence" | "pin" = "influence",
  temperature: number = 0, // -1 (cool) to +1 (warm) — biases base hue
): ColorStop[] {
  // Convert seed HSL → OKLCH for internal work
  const seedsOklch = seeds?.length
    ? seeds.map((s) => rgbToOklch(hslToRgb(s)))
    : null;

  // Base color in OKLCH
  const baseRaw = seedsOklch?.[0] ?? {
    L: 0.42 + Math.random() * 0.25,
    C: 0.1 + Math.random() * 0.14,
    H: Math.random() * 360,
  };

  // Temperature bias: nudge hue toward warm (0-120) or cool (180-300) arc
  // when no seed is present. With a seed, temperature nudges the hue slightly.
  let base = baseRaw;
  if (temperature !== 0 && !seeds?.length) {
    // Warm target hue: 30 (orange-red), cool target: 240 (blue)
    const warmH = 30,
      coolH = 240;
    const targetH = temperature > 0 ? warmH : coolH;
    const blend = Math.abs(temperature) * 0.6; // max 60% blend toward target
    const dH = ((targetH - baseRaw.H + 540) % 360) - 180; // shortest path
    base = { ...baseRaw, H: (baseRaw.H + dH * blend + 360) % 360 };
  } else if (temperature !== 0 && seeds?.length) {
    // With seed: gentle nudge only — respect the seed's intent
    const warmH = 30,
      coolH = 240;
    const targetH = temperature > 0 ? warmH : coolH;
    const blend = Math.abs(temperature) * 0.18;
    const dH = ((targetH - baseRaw.H + 540) % 360) - 180;
    base = { ...baseRaw, H: (baseRaw.H + dH * blend + 360) % 360 };
  }

  // Target chroma — inherit from seed or use moderate default
  const targetC = clamp(base.C, 0.08, 0.26);
  // Target lightness — inherit from seed, clamped to visible midrange
  const targetL = clamp(base.L, 0.32, 0.72);

  // ── Special modes ───────────────────────────────────────────────────────────

  if (mode === "monochromatic") {
    // Same hue and chroma, sweep lightness from light→dark
    return Array.from({ length: count }, (_, i) => {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const L = clamp(0.88 - t * 0.7, 0.1, 0.92); // L: 0.88 → 0.18
      const C = targetC * (1 - 0.35 * Math.abs(t - 0.5)); // chroma peaks at midpoint
      return makeStop(L, C, base.H);
    });
  }

  if (mode === "shades") {
    // Like monochromatic but chroma fades toward extremes more aggressively
    return Array.from({ length: count }, (_, i) => {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const L = clamp(0.93 - t * 0.82, 0.06, 0.94);
      const C = targetC * Math.sin(t * Math.PI) * 0.9; // smooth sine fade
      return makeStop(L, C, base.H);
    });
  }

  if (mode === "natural") {
    // Organic: hue wanders ±40°, low-moderate chroma, varied lightness
    return Array.from({ length: count }, () => {
      const L = clamp(0.3 + Math.random() * 0.45, 0.25, 0.78);
      const C = clamp(0.04 + Math.random() * 0.14, 0.02, 0.18);
      const H = rotateHue(base.H + (Math.random() - 0.5) * 80, 0);
      return makeStop(L, C, H);
    });
  }

  if (mode === "random") {
    // Golden-angle hue series for good visual spread
    const bH = Math.random() * 360;
    return Array.from({ length: count }, (_, i) => {
      const L = clamp(0.35 + Math.random() * 0.3, 0.28, 0.72);
      const C = clamp(0.1 + Math.random() * 0.16, 0.08, 0.28);
      return makeStop(L, C, rotateHue(bH + i * 137.508, 0)); // golden angle
    });
  }

  // ── Matsuda template modes (analogous) — sample full count from arcs ────────
  const matsudaHues = getMatsudaHues(mode, base.H, count);
  if (matsudaHues) {
    return matsudaHues.map((H) => {
      const L = clamp(targetL + (Math.random() - 0.5) * 0.18, 0.28, 0.74);
      const C = clamp(targetC + (Math.random() - 0.5) * 0.06, 0.06, 0.28);
      return makeStop(L, C, H);
    });
  }

  // ── Pin mode: single seed appears verbatim as first slot ──────────────────
  // When seedMode === 'pin', the first seed color is placed exactly as-is.
  // If there are multiple pinned seeds, all appear verbatim; rest are generated.
  if (seedMode === "pin" && seedsOklch && seedsOklch.length > 0) {
    const pinned = seedsOklch.map((s) => makeStop(s.L, s.C, s.H));
    const need = Math.max(0, count - pinned.length);
    const hues = anchorHues(mode, seedsOklch[0].H);
    const generated: ColorStop[] = [];
    for (let i = 0; i < need; i++) {
      const H = hues[i % hues.length];
      const L = clamp(targetL + (Math.random() - 0.5) * 0.22, 0.28, 0.75);
      const C = clamp(targetC + (Math.random() - 0.5) * 0.06, 0.06, 0.28);
      generated.push(makeStop(L, C, H));
    }
    return [...pinned, ...generated].slice(0, count);
  }

  // ── Multi-seed influence: honour all seeds, fill gaps from harmony hues ────
  if (seedsOklch && seedsOklch.length > 1) {
    // Multi-seed compositing: find the rotation that minimises total angular distance
    const allHues = seedsOklch.map((s) => s.H);
    const hues0 = anchorHues(mode, seedsOklch[0].H);
    // Try rotating template to each seed; pick the orientation with min total dist
    let bestHues = hues0,
      bestCost = Infinity;
    for (const seedH of allHues) {
      const candidate = anchorHues(mode, seedH);
      const cost = allHues.reduce((sum, sh) => {
        const minDist = Math.min(
          ...candidate.map((ch) => {
            const d = Math.abs(ch - sh);
            return Math.min(d, 360 - d);
          }),
        );
        return sum + minDist;
      }, 0);
      if (cost < bestCost) {
        bestCost = cost;
        bestHues = candidate;
      }
    }
    const stops = seedsOklch.map((s) => makeStop(s.L, s.C, s.H));
    const need = count - stops.length;
    for (let i = 0; i < need; i++) {
      const H = bestHues[i % bestHues.length];
      const L = clamp(targetL + (Math.random() - 0.5) * 0.22, 0.28, 0.75);
      const C = clamp(targetC + (Math.random() - 0.5) * 0.06, 0.06, 0.28);
      stops.push(makeStop(L, C, H));
    }
    return stops.slice(0, count);
  }

  // ── Standard single-seed harmony ───────────────────────────────────────────
  const hues = anchorHues(mode, base.H);
  const cyclesNeeded = Math.ceil(count / hues.length);

  return Array.from({ length: count }, (_, i) => {
    const hueIdx = i % hues.length;
    const cycle = Math.floor(i / hues.length);

    // Lightness: slight stagger per cycle to distinguish same-hue colors
    // Uses a cosine curve so the variation is smooth: ±0.09 over the range
    const lOffset =
      cyclesNeeded > 1
        ? (cycle / (cyclesNeeded - 1) - 0.5) * 0.18
        : (Math.random() - 0.5) * 0.14;
    const L = clamp(targetL + lOffset, 0.24, 0.78);

    // Chroma: small random variation ±0.04 for natural variation
    const C = clamp(targetC + (Math.random() - 0.5) * 0.08, 0.06, 0.3);

    return makeStop(L, C, hues[hueIdx]);
  });
}

// ─── Slot Helpers ────────────────────────────────────────────────────────────

export function cloneSlot(slot: PaletteSlot): PaletteSlot {
  const color: ColorStop = {
    hex: slot.color.hex,
    rgb: { ...slot.color.rgb },
    hsl: { ...slot.color.hsl },
  };
  if (slot.color.a !== undefined) color.a = slot.color.a;
  return {
    id: slot.id,
    color,
    locked: slot.locked,
    name: slot.name,
  };
}

export function hexToStop(hex: string, alpha?: number): ColorStop {
  // Handle 8-char hex (#RRGGBBAA) — extract alpha, normalise hex to 6-char
  const rawAlpha = parseHexAlpha(hex);
  const safeHex = opaqueHex(hex);
  const rgb = hexToRgb(safeHex);
  const resolvedAlpha = rawAlpha !== null ? rawAlpha : alpha;
  const stop: ColorStop = { hex: safeHex, rgb, hsl: rgbToHsl(rgb) };
  if (resolvedAlpha !== undefined && resolvedAlpha < 100)
    stop.a = resolvedAlpha;
  return stop;
}

// ─── Image Extraction — median-cut quantization ───────────────────────────────

type Pixel = { r: number; g: number; b: number };

function medianCut(px: Pixel[], depth: number): Pixel[][] {
  if (depth === 0 || !px.length) return [px];
  let mnR = 255,
    mxR = 0,
    mnG = 255,
    mxG = 0,
    mnB = 255,
    mxB = 0;
  for (const { r, g, b } of px) {
    if (r < mnR) mnR = r;
    if (r > mxR) mxR = r;
    if (g < mnG) mnG = g;
    if (g > mxG) mxG = g;
    if (b < mnB) mnB = b;
    if (b > mxB) mxB = b;
  }
  const rR = mxR - mnR,
    gR = mxG - mnG,
    bR = mxB - mnB;
  const mx = Math.max(rR, gR, bR);
  const key = mx === rR ? "r" : mx === gR ? "g" : "b";
  px.sort((a, b) => a[key] - b[key]);
  const mid = Math.floor(px.length / 2);
  return [
    ...medianCut(px.slice(0, mid), depth - 1),
    ...medianCut(px.slice(mid), depth - 1),
  ];
}

function avgBucket(b: Pixel[]): Pixel {
  if (!b.length) return { r: 128, g: 128, b: 128 };
  const s = b.reduce((a, p) => ({ r: a.r + p.r, g: a.g + p.g, b: a.b + p.b }), {
    r: 0,
    g: 0,
    b: 0,
  });
  return {
    r: Math.round(s.r / b.length),
    g: Math.round(s.g / b.length),
    b: Math.round(s.b / b.length),
  };
}

function isUsable(rgb: Pixel): boolean {
  const { s, l } = rgbToHsl(rgb);
  return s >= 8 && l >= 10 && l <= 92;
}

function dedupColors(cs: Pixel[], threshold = 0.08): Pixel[] {
  const r: Pixel[] = [];
  for (const c of cs)
    if (!r.some((x) => colorDist(c, x) < threshold)) r.push(c);
  return r;
}

export async function extractColors(file: File, count = 8): Promise<Pixel[]> {
  return new Promise((resolve, reject) => {
    const objUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objUrl);
      const scale = Math.min(1, 200 / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      const px: Pixel[] = [];
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue;
        px.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
      }
      if (!px.length) return resolve([]);
      const depth = Math.ceil(Math.log2(count * 2));
      const buckets = medianCut([...px], depth);
      const avgs = buckets.map(avgBucket).filter(isUsable);
      const dd = dedupColors(avgs);
      dd.sort((a, b) => rgbToHsl(b).s - rgbToHsl(a).s);
      resolve(dd.slice(0, count));
    };
    img.onerror = reject;
    img.src = objUrl;
  });
}

// ─── localStorage ─────────────────────────────────────────────────────────────

const LS_KEY = "chroma:palettes";
const LS_PREF_KEY = "chroma:prefs";

export function loadSaved(): SavedPalette[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}
export function savePalette(
  name: string,
  hexes: string[],
  mode: HarmonyMode,
  slotNames?: (string | undefined)[],
): SavedPalette {
  const saved = loadSaved();
  const entry: SavedPalette = {
    id: crypto.randomUUID(),
    name,
    hexes,
    slotNames,
    mode,
    createdAt: Date.now(),
  };
  localStorage.setItem(LS_KEY, JSON.stringify([entry, ...saved].slice(0, 50)));
  return entry;
}
export function deleteSaved(id: string): void {
  localStorage.setItem(
    LS_KEY,
    JSON.stringify(loadSaved().filter((p) => p.id !== id)),
  );
}
export function clearSaved(): void {
  localStorage.removeItem(LS_KEY);
}

// Persist user prefs (mode + count)
export function savePrefs(mode: HarmonyMode, count: number): void {
  localStorage.setItem(LS_PREF_KEY, JSON.stringify({ mode, count }));
}

// ─── URL encode/decode ────────────────────────────────────────────────────────

/** Safe check — returns false during SSR where window/location don't exist */
const isBrowser = typeof window !== "undefined";

export function encodeUrl(hexes: string[], mode: HarmonyMode): string {
  if (!isBrowser) return "";
  const base = `${location.origin}${location.pathname}`;
  return `${base}#p=${hexes.map((h) => h.replace("#", "")).join("-")}&m=${mode}`;
}

export function decodeUrl(): { hexes: string[]; mode: HarmonyMode } | null {
  if (!isBrowser) return null; // SSR — no location, no hash
  try {
    const p = new URLSearchParams(location.hash.slice(1));
    const hexes = (p.get("p") || "")
      .split("-")
      .map((c) => "#" + c)
      .filter((c) => /^#[0-9a-fA-F]{6}$/.test(c));
    const mode = (p.get("m") || "analogous") as HarmonyMode;
    return hexes.length >= 2 ? { hexes, mode } : null;
  } catch {
    return null;
  }
}
