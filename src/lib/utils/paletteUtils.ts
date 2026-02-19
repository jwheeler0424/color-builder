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
  clamp,
  colorDist,
} from "./colorMath";
import { NAMED } from "./constants";

// ─── Color Naming ─────────────────────────────────────────────────────────────

export function nearestName(rgb: { r: number; g: number; b: number }): string {
  let best = NAMED[0]!;
  let bestD = colorDist(rgb, best.rgb);
  for (let i = 1; i < NAMED.length; i++) {
    const d = colorDist(rgb, NAMED[i]!.rgb);
    if (d < bestD) {
      bestD = d;
      best = NAMED[i]!;
    }
  }
  return best.name;
}

// ─── Harmony Generation ───────────────────────────────────────────────────────

function rotateHue(h: number, d: number): number {
  return (((h + d) % 360) + 360) % 360;
}

function makeStop(hsl: { h: number; s: number; l: number }): ColorStop {
  const rgb = hslToRgb(hsl);
  return { hex: rgbToHex(rgb), rgb, hsl };
}

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
    case "analogous":
      return [-2, -1, 0, 1, 2].map((i) => rotateHue(h, i * 30));
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
    default:
      return [h];
  }
}

export function genPalette(
  mode: HarmonyMode,
  count: number,
  seeds: { h: number; s: number; l: number }[] | null,
): ColorStop[] {
  const base = seeds?.length
    ? seeds[0]!
    : {
        h: Math.random() * 360,
        s: 40 + Math.random() * 50,
        l: 35 + Math.random() * 35,
      };

  if (mode === "monochromatic") {
    return Array.from({ length: count }, (_, i) => {
      const t = count === 1 ? 0.5 : i / (count - 1);
      return makeStop({
        h: base.h,
        s: clamp(base.s + (Math.random() - 0.5) * 12, 10, 95),
        l: 15 + t * 70,
      });
    });
  }
  if (mode === "shades") {
    return Array.from({ length: count }, (_, i) => {
      const t = count === 1 ? 0.5 : i / (count - 1);
      return makeStop({
        h: base.h,
        s: clamp(base.s - t * 20, 10, 95),
        l: 8 + t * 82,
      });
    });
  }
  if (mode === "natural") {
    return Array.from({ length: count }, () =>
      makeStop({
        h: rotateHue(base.h + (Math.random() - 0.5) * 50, 0),
        s: 15 + Math.random() * 45,
        l: 25 + Math.random() * 50,
      }),
    );
  }
  if (mode === "random") {
    const bh = Math.random() * 360;
    return Array.from({ length: count }, (_, i) =>
      makeStop({
        h: rotateHue(bh + i * 137.508, 0),
        s: 45 + Math.random() * 45,
        l: 35 + Math.random() * 35,
      }),
    );
  }

  // Multi-seed: honour all seeds, fill gaps from harmony hues
  if (seeds && seeds.length > 1) {
    const stops = seeds.map((s) => makeStop(s));
    const need = count - stops.length;
    const hues = anchorHues(mode, seeds[0]!.h);
    for (let i = 0; i < need; i++) {
      stops.push(
        makeStop({
          h: hues[i % hues.length]!,
          s: clamp(seeds[0]!.s + (Math.random() - 0.5) * 15, 25, 95),
          l: clamp(seeds[0]!.l + (Math.random() - 0.5) * 30, 20, 80),
        }),
      );
    }
    return stops.slice(0, count);
  }

  // Standard hue-based
  const hues = anchorHues(mode, base.h);
  const total = Math.ceil(count / hues.length);
  return Array.from({ length: count }, (_, i) => {
    const cycle = Math.floor(i / hues.length);
    const lv =
      total > 1 ? (cycle / (total - 1)) * 40 - 20 : (Math.random() - 0.5) * 22;
    return makeStop({
      h: hues[i % hues.length]!,
      s: clamp(base.s + (Math.random() - 0.5) * 15, 25, 95),
      l: clamp(base.l + lv, 20, 80),
    });
  });
}

// ─── Slot Helpers ────────────────────────────────────────────────────────────

export function cloneSlot(slot: PaletteSlot): PaletteSlot {
  return {
    locked: slot.locked,
    color: {
      hex: slot.color.hex,
      rgb: { ...slot.color.rgb },
      hsl: { ...slot.color.hsl },
    },
  };
}

export function hexToStop(hex: string): ColorStop {
  const rgb = hexToRgb(hex);
  return { hex, rgb, hsl: rgbToHsl(rgb) };
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
        if (data[i + 3]! < 128) continue;
        px.push({ r: data[i]!, g: data[i + 1]!, b: data[i + 2]! });
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
): SavedPalette {
  const saved = loadSaved();
  const entry: SavedPalette = {
    id: crypto.randomUUID(),
    name,
    hexes,
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
export function loadPrefs(): { mode: HarmonyMode; count: number } | null {
  try {
    return JSON.parse(localStorage.getItem(LS_PREF_KEY) || "null");
  } catch {
    return null;
  }
}

// ─── URL encode/decode ────────────────────────────────────────────────────────

export function encodeUrl(hexes: string[], mode: HarmonyMode): string {
  const base = `${location.origin}${location.pathname}`;
  return `${base}#p=${hexes.map((h) => h.replace("#", "")).join("-")}&m=${mode}`;
}

export function decodeUrl(): { hexes: string[]; mode: HarmonyMode } | null {
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
