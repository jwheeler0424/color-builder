import type {
  CMYK,
  HSL,
  HSV,
  OKLCH,
  OKLab,
  RGB,
  SemanticToken,
  ThemeTokenSet,
  UtilityColor,
  UtilityColorSet,
  UtilityRole,
} from "@/types";

// ─── Utilities ────────────────────────────────────────────────────────────────

export const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v));

// ─── sRGB linearization (single source of truth) ─────────────────────────────

export function toLinear(v: number): number {
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}
export function fromLinear(v: number): number {
  return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

// ─── Hex ↔ RGB ────────────────────────────────────────────────────────────────

export function hexToRgb(hex: string): RGB {
  const c = hex.replace("#", "");
  // Normalise: expand 3-char, strip any alpha bytes from 8-char (#RRGGBBAA)
  const f6 =
    c.length === 3
      ? c
          .split("")
          .map((x) => x + x)
          .join("")
      : c.slice(0, 6); // safe for both 6-char and 8-char input
  const n = parseInt(f6, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex({ r, g, b }: RGB): string {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

// ─── RGB ↔ HSL ────────────────────────────────────────────────────────────────

export function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255,
    gn = g / 255,
    bn = b / 255;
  const mx = Math.max(rn, gn, bn),
    mn = Math.min(rn, gn, bn);
  const l = (mx + mn) / 2;
  if (mx === mn) return { h: 0, s: 0, l: l * 100 };
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h = 0;
  if (mx === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (mx === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToRgb({ h, s, l }: HSL): RGB {
  const sn = s / 100,
    ln = l / 100;
  if (sn === 0) {
    const v = Math.round(ln * 255);
    return { r: v, g: v, b: v };
  }
  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  const hk = h / 360;
  const ch = (t: number): number => {
    const x = ((t % 1) + 1) % 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 0.5) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return {
    r: Math.round(ch(hk + 1 / 3) * 255),
    g: Math.round(ch(hk) * 255),
    b: Math.round(ch(hk - 1 / 3) * 255),
  };
}

// ─── HSV ──────────────────────────────────────────────────────────────────────

export function rgbToHsv({ r, g, b }: RGB): HSV {
  const rn = r / 255,
    gn = g / 255,
    bn = b / 255;
  const mx = Math.max(rn, gn, bn),
    mn = Math.min(rn, gn, bn),
    d = mx - mn;
  let h = 0;
  if (d > 0) {
    if (mx === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
    else if (mx === gn) h = ((bn - rn) / d + 2) / 6;
    else h = ((rn - gn) / d + 4) / 6;
  }
  return { h: h * 360, s: mx === 0 ? 0 : (d / mx) * 100, v: mx * 100 };
}

// ─── CMYK ─────────────────────────────────────────────────────────────────────

export function rgbToCmyk({ r, g, b }: RGB): CMYK {
  const rn = r / 255,
    gn = g / 255,
    bn = b / 255;
  const k = 1 - Math.max(rn, gn, bn);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  const d = 1 - k;
  return {
    c: Math.round(((1 - rn - k) / d) * 100),
    m: Math.round(((1 - gn - k) / d) * 100),
    y: Math.round(((1 - bn - k) / d) * 100),
    k: Math.round(k * 100),
  };
}

// ─── OKLab / OKLCH ───────────────────────────────────────────────────────────

export function rgbToOklab({ r, g, b }: RGB): OKLab {
  const rl = toLinear(r / 255),
    gl = toLinear(g / 255),
    bl = toLinear(b / 255);
  const l = Math.cbrt(
    0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl,
  );
  const m = Math.cbrt(
    0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl,
  );
  const s = Math.cbrt(
    0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl,
  );
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

export function oklabToLch({ L, a, b }: OKLab): OKLCH {
  return {
    L: L * 100,
    C: Math.sqrt(a * a + b * b) * 100,
    H: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360,
  };
}

// ─── OKLab → linear RGB → sRGB (shared kernel) ────────────────────────────────

function oklabToRgb({ L, a, b }: OKLab): RGB {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l3 = l_ * l_ * l_,
    m3 = m_ * m_ * m_,
    s3 = s_ * s_ * s_;
  const rl = clamp(
    +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    0,
    1,
  );
  const gl = clamp(
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    0,
    1,
  );
  const bl = clamp(
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
    0,
    1,
  );
  return {
    r: Math.round(fromLinear(rl) * 255),
    g: Math.round(fromLinear(gl) * 255),
    b: Math.round(fromLinear(bl) * 255),
  };
}

// ─── OKLCH round-trip ─────────────────────────────────────────────────────────

export function rgbToOklch(rgb: RGB): OKLCH {
  const { L, a, b } = rgbToOklab(rgb);
  const C = Math.sqrt(a * a + b * b);
  const H = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  return { L, C, H };
}

/** Convert OKLCH → sRGB, clamping out-of-gamut via chroma bisection (CSS Color 4 algorithm).
 *  Keeps hue and lightness stable; reduces C until the RGB result is in [0,255]. */
export function oklchToRgb(lch: OKLCH): RGB {
  // Shortcut: achromatic or L at extremes
  if (lch.C < 0.0001) {
    const v = Math.round(fromLinear(clamp(lch.L * lch.L * lch.L, 0, 1)) * 255);
    return { r: clamp(v, 0, 255), g: clamp(v, 0, 255), b: clamp(v, 0, 255) };
  }
  if (lch.L >= 1) return { r: 255, g: 255, b: 255 };
  if (lch.L <= 0) return { r: 0, g: 0, b: 0 };

  const hRad = (lch.H * Math.PI) / 180;
  const lab: OKLab = {
    L: lch.L,
    a: lch.C * Math.cos(hRad),
    b: lch.C * Math.sin(hRad),
  };
  const rgb = oklabToRgb(lab);

  // In gamut — return directly
  if (
    rgb.r >= 0 &&
    rgb.r <= 255 &&
    rgb.g >= 0 &&
    rgb.g <= 255 &&
    rgb.b >= 0 &&
    rgb.b <= 255
  ) {
    return rgb;
  }

  // Binary-search chroma reduction (CSS Color 4 §10.9 algorithm)
  let lo = 0,
    hi = lch.C;
  const eps = 0.0001;
  for (let i = 0; i < 32; i++) {
    const mid = (lo + hi) / 2;
    if (hi - lo < eps) break;
    const midLab: OKLab = {
      L: lch.L,
      a: mid * Math.cos(hRad),
      b: mid * Math.sin(hRad),
    };
    const t = oklabToRgb(midLab);
    const inGamut =
      t.r >= 0 &&
      t.r <= 255 &&
      t.g >= 0 &&
      t.g <= 255 &&
      t.b >= 0 &&
      t.b <= 255;
    if (inGamut) lo = mid;
    else hi = mid;
  }
  const finalLab: OKLab = {
    L: lch.L,
    a: lo * Math.cos(hRad),
    b: lo * Math.sin(hRad),
  };
  return oklabToRgb(finalLab);
}

// ─── Interpolate two colors in OKLab space (perceptually uniform) ─────────────
export function mixOklab(a: RGB, b: RGB, t: number): RGB {
  const la = rgbToOklab(a),
    lb = rgbToOklab(b);
  const mixed: OKLab = {
    L: la.L + (lb.L - la.L) * t,
    a: la.a + (lb.a - la.a) * t,
    b: la.b + (lb.b - la.b) * t,
  };
  return oklabToRgb(mixed);
}

export function mixHsl(a: RGB, b: RGB, t: number): RGB {
  const ha = rgbToHsl(a),
    hb = rgbToHsl(b);
  // Hue interpolation via shortest path
  let dh = hb.h - ha.h;
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  return hslToRgb({
    h: (ha.h + dh * t + 360) % 360,
    s: ha.s + (hb.s - ha.s) * t,
    l: ha.l + (hb.l - ha.l) * t,
  });
}

export function mixRgb(a: RGB, b: RGB, t: number): RGB {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

// ─── Accessibility ────────────────────────────────────────────────────────────

export function luminance({ r, g, b }: RGB): number {
  return (
    0.2126 * toLinear(r / 255) +
    0.7152 * toLinear(g / 255) +
    0.0722 * toLinear(b / 255)
  );
}

export function contrastRatio(a: RGB, b: RGB): number {
  const la = luminance(a),
    lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export type WcagLevel = "AAA" | "AA" | "AA Large" | "Fail";

export function wcagLevel(r: number): WcagLevel {
  if (r >= 7) return "AAA";
  if (r >= 4.5) return "AA";
  if (r >= 3) return "AA Large";
  return "Fail";
}

export function textColor(bg: RGB): string {
  return contrastRatio(bg, { r: 255, g: 255, b: 255 }) >= 4.5
    ? "#ffffff"
    : "#000000";
}

// ─── Perceptual Distance ──────────────────────────────────────────────────────

export function colorDist(a: RGB, b: RGB): number {
  const la = rgbToOklab(a),
    lb = rgbToOklab(b);
  return Math.sqrt(
    (la.L - lb.L) ** 2 + (la.a - lb.a) ** 2 + (la.b - lb.b) ** 2,
  );
}

// ─── Parsers ─────────────────────────────────────────────────────────────────

export function parseHex(s: string): string | null {
  const c = s.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(c))
    return (
      "#" +
      c
        .split("")
        .map((x) => x + x)
        .join("")
    );
  if (/^[0-9a-fA-F]{6}$/.test(c)) return "#" + c;
  // 8-char hex (#RRGGBBAA) — strip alpha bytes, return 6-char opaque hex
  if (/^[0-9a-fA-F]{8}$/.test(c)) return "#" + c.slice(0, 6);
  return null;
}

/** Parse 8-char hex and return alpha 0–100, or null if not an 8-char hex */
export function parseHexAlpha(s: string): number | null {
  const c = s.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{8}$/.test(c)) return null;
  return Math.round((parseInt(c.slice(6), 16) / 255) * 100);
}

/** Strip any alpha bytes from a hex string, returning a safe 6-char hex */
export function opaqueHex(hex: string): string {
  const c = hex.replace(/^#/, "");
  return (
    "#" +
    (c.length === 8
      ? c.slice(0, 6)
      : c.length === 4
        ? c
            .slice(0, 3)
            .split("")
            .map((x) => x + x)
            .join("")
        : c.slice(0, 6))
  );
}

export function parseRgbStr(s: string): RGB | null {
  const m = s.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
  if (!m) return null;
  return {
    r: clamp(Math.round(+m[1]), 0, 255),
    g: clamp(Math.round(+m[2]), 0, 255),
    b: clamp(Math.round(+m[3]), 0, 255),
  };
}

export function parseHslStr(s: string): RGB | null {
  const m = s.match(/hsla?\(\s*([\d.]+)[,\s]\s*([\d.]+)%?[,\s]\s*([\d.]+)%?/);
  if (!m) return null;
  return hslToRgb({
    h: +m[1] % 360,
    s: clamp(+m[2], 0, 100),
    l: clamp(+m[3], 0, 100),
  });
}

export function parseAny(s: string): RGB | null {
  const h = parseHex(s);
  return h ? hexToRgb(h) : parseRgbStr(s) || parseHslStr(s);
}

// ─── Alpha-aware CSS string formatters ───────────────────────────────────────

/** Format an 0-255 integer alpha to 0-1 string, dropping decimals when whole */
function fmtA(alpha: number): string {
  const a = clamp(alpha, 0, 100) / 100;
  return a === 1 ? "1" : a === 0 ? "0" : a.toFixed(2).replace(/0+$/, "");
}

export function toCssRgb(rgb: RGB, alpha = 100): string {
  const a = fmtA(alpha);
  return alpha >= 100
    ? `rgb(${rgb.r} ${rgb.g} ${rgb.b})`
    : `rgb(${rgb.r} ${rgb.g} ${rgb.b} / ${a})`;
}

export function toCssHsl(hsl: HSL, alpha = 100): string {
  const h = Math.round(hsl.h);
  const s = Math.round(hsl.s);
  const l = Math.round(hsl.l);
  return alpha >= 100
    ? `hsl(${h} ${s}% ${l}%)`
    : `hsl(${h} ${s}% ${l}% / ${fmtA(alpha)})`;
}

export function toCssHsv(hsv: HSV, alpha = 100): string {
  // HSV is not a CSS color space — format as a comment/reference string
  const h = Math.round(hsv.h);
  const s = Math.round(hsv.s);
  const v = Math.round(hsv.v);
  return alpha >= 100
    ? `hsv(${h} ${s}% ${v}%)`
    : `hsv(${h} ${s}% ${v}% / ${fmtA(alpha)})`;
}

export function toCssOklch(lch: OKLCH, alpha = 100): string {
  // OKLCH in CSS: oklch(L% C H) — L is 0-1, C is 0-0.4, H is 0-360
  const L = lch.L.toFixed(4);
  const C = lch.C.toFixed(4);
  const H = Math.round(lch.H);
  return alpha >= 100
    ? `oklch(${L} ${C} ${H})`
    : `oklch(${L} ${C} ${H} / ${fmtA(alpha)})`;
}

export function toCssOklab(lab: OKLab, alpha = 100): string {
  const L = lab.L.toFixed(4);
  const a = lab.a.toFixed(4);
  const b = lab.b.toFixed(4);
  return alpha >= 100
    ? `oklab(${L} ${a} ${b})`
    : `oklab(${L} ${a} ${b} / ${fmtA(alpha)})`;
}

/** 8-char hex with alpha: #RRGGBBAA */
export function toHexAlpha(hex: string, alpha: number): string {
  if (alpha >= 100) return hex;
  const aa = Math.round((clamp(alpha, 0, 100) / 100) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${aa}`;
}

// ─── Color Blindness Simulation ───────────────────────────────────────────────

export function applySimMatrix(rgb: RGB, M: number[]): RGB {
  const R = toLinear(rgb.r / 255),
    G = toLinear(rgb.g / 255),
    B = toLinear(rgb.b / 255);
  return {
    r: Math.round(
      fromLinear(clamp(M[0] * R + M[1] * G + M[2] * B, 0, 1)) * 255,
    ),
    g: Math.round(
      fromLinear(clamp(M[3] * R + M[4] * G + M[5] * B, 0, 1)) * 255,
    ),
    b: Math.round(
      fromLinear(clamp(M[6] * R + M[7] * G + M[8] * B, 0, 1)) * 255,
    ),
  };
}

// ─── Scale Generation ─────────────────────────────────────────────────────────

export const SCALE_STEPS = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
];

/**
 * Generate a perceptually uniform tint/shade scale in OKLCH space.
 *
 * Lightness follows a smooth curve:
 *   L(t) = Lmax - (Lmax - Lmin) * t^γ   (γ ≈ 0.9 keeps midtones vivid)
 *
 * Chroma uses a tent curve — peaks at step 400–500 (vibrant midtones),
 * falls to 0 at the extremes (near-white and near-black are always neutral).
 *
 * Hue is held constant, which is exactly what OKLCH guarantees — no hue
 * drift as you lighten or darken (unlike HSL).
 */
export function generateScale(hex: string) {
  const base = rgbToOklch(hexToRgb(hex));

  // Lightness range: 0.97 (near white) → 0.10 (near black)
  const Lmax = 0.97,
    Lmin = 0.1;
  // Chroma: use input chroma but cap to sRGB-safe range (~0.32)
  const Cbase = Math.min(base.C, 0.32);

  return SCALE_STEPS.map((step) => {
    const t = step / 1000; // 0.05 → 0.95

    // Lightness: power curve (γ=0.85) for good visual spacing
    const L = clamp(Lmax - (Lmax - Lmin) * Math.pow(t, 0.85), 0.02, 0.98);

    // Chroma tent: peaks at t=0.4 (step 400), zero at extremes
    // Uses a smooth parabola: C(t) = Cbase * 4t(1-t) * scale
    const chromaTent = 4 * t * (1 - t); // 0 at ends, 1 at t=0.5
    const chromaScale = 1.1 - 0.3 * Math.abs(t - 0.4); // slightly favour step 400
    const C = clamp(Cbase * chromaTent * chromaScale, 0, 0.37);

    const rgb = oklchToRgb({ L, C, H: base.H });
    const hsl = rgbToHsl(rgb);
    return { step, hex: rgbToHex(rgb), rgb, hsl };
  });
}

// ─── Palette Scoring ──────────────────────────────────────────────────────────

export interface PaletteScore {
  balance: number; // Hue spread 0–100
  accessibility: number; // % pairs passing AA
  harmony: number; // Saturation consistency 0–100
  uniqueness: number; // Average OKLab distance 0–100
  overall: number;
}

export function scorePalette(
  slots: { color: { hex: string } }[],
): PaletteScore {
  if (slots.length < 2)
    return {
      balance: 0,
      accessibility: 0,
      harmony: 0,
      uniqueness: 0,
      overall: 0,
    };

  // Always derive from hex — immune to stale stored rgb/hsl values
  const rgbs = slots.map((s) => hexToRgb(s.color.hex));
  const oklchs = rgbs.map((rgb) => rgbToOklch(rgb));

  // ── Hue balance: std-dev of circular hue gaps ────────────────────────────
  const hues = oklchs.map((c) => c.H).sort((a, b) => a - b);
  const gaps = hues.map(
    (h, i) => (hues[(i + 1) % hues.length] - h + 360) % 360,
  );
  const idealGap = 360 / hues.length;
  const gapDev = Math.sqrt(
    gaps.reduce((acc, g) => acc + (g - idealGap) ** 2, 0) / gaps.length,
  );
  const balance = Math.round(Math.max(0, 100 - (gapDev / idealGap) * 100));

  // ── Accessibility: how many colors can display readable text ────────────
  // Measures each swatch's best contrast (on white OR black), not palette-vs-palette.
  // Harmonic palettes intentionally cluster luminance so color-vs-color contrast
  // is expected to be low — this dimension instead asks: is each color usable in a UI?
  // Score = % of colors that achieve AA (4.5:1) on at least one background.
  const WHITE = { r: 255, g: 255, b: 255 } as RGB;
  const BLACK = { r: 0, g: 0, b: 0 } as RGB;
  const aaCount = rgbs.filter(
    (rgb) =>
      Math.max(contrastRatio(rgb, WHITE), contrastRatio(rgb, BLACK)) >= 4.5,
  ).length;
  const accessibility = Math.round((aaCount / rgbs.length) * 100);

  // ── Saturation harmony: consistency of chroma in OKLCH ──────────────────
  // Use OKLCH chroma (perceptually uniform) instead of HSL saturation
  const chromas = oklchs.map((c) => c.C);
  const avgC = chromas.reduce((a, b) => a + b, 0) / chromas.length;
  const chromaDev = Math.sqrt(
    chromas.reduce((acc, c) => acc + (c - avgC) ** 2, 0) / chromas.length,
  );
  // Normalise: max expected deviation ~0.15 (wide range) → score 0
  const harmony = Math.round(Math.max(0, 100 - (chromaDev / 0.15) * 100));

  // ── Uniqueness: average pairwise OKLab distance, normalised ─────────────
  let totalDist = 0,
    totalPairs = 0;
  for (let i = 0; i < rgbs.length; i++)
    for (let j = i + 1; j < rgbs.length; j++) {
      totalDist += colorDist(rgbs[i], rgbs[j]);
      totalPairs++;
    }
  const avgDist = totalDist / totalPairs;
  const uniqueness = Math.round(Math.min(100, avgDist * 500));

  const overall = Math.round(
    (balance + accessibility + harmony + uniqueness) / 4,
  );
  return { balance, accessibility, harmony, uniqueness, overall };
}

// ─── Utility Color Generation ─────────────────────────────────────────────────

const UTILITY_DEFS: Record<
  UtilityRole,
  { label: string; description: string; anchorHue: number }
> = {
  info: {
    label: "Info",
    description: "Informational messages, tooltips, hints",
    anchorHue: 231,
  },
  success: {
    label: "Success",
    description: "Confirmations, completed states, positive actions",
    anchorHue: 142,
  },
  warning: {
    label: "Warning",
    description: "Cautions, pending states, non-critical alerts",
    anchorHue: 85,
  },
  error: {
    label: "Error",
    description: "Destructive actions, validation failures, danger",
    anchorHue: 25,
  },
  neutral: {
    label: "Neutral",
    description: "Disabled states, placeholders, secondary content",
    anchorHue: 0,
  },
  focus: {
    label: "Focus",
    description: "Keyboard focus rings — matches primary palette color",
    anchorHue: 0,
  },
};

/**
 * Derive utility colors from the palette using OKLCH space.
 *
 * All semantic hues (info/success/warning/error) are fixed perceptual angles
 * in OKLCH's hue wheel, then lightly nudged away from any existing palette color
 * to avoid clashing. Lightness and chroma are computed at a consistent
 * perceptual level across all hues.
 *
 * Focus color: derived directly from the most-saturated palette slot (primary),
 * keeping its exact hue and chroma, only normalising lightness to ~0.62 so it
 * reads clearly as a focus ring at any background.
 */
export function generateUtilityColors(
  slots: { color: { hex: string; rgb: RGB; hsl: HSL } }[],
): UtilityColorSet {
  // ── 1. Analyse the palette in OKLCH ────────────────────────────────────────
  // Always derive from hex (canonical) to be immune to stale stored rgb values
  const oklchSlots = slots.map((s) => rgbToOklch(hexToRgb(s.color.hex)));

  const avgL = oklchSlots.length
    ? oklchSlots.reduce((a, c) => a + c.L, 0) / oklchSlots.length
    : 0.55;
  const avgC = oklchSlots.length
    ? oklchSlots.reduce((a, c) => a + c.C, 0) / oklchSlots.length
    : 0.12;

  // Primary: highest-chroma slot — dominant brand hue
  const primary = oklchSlots.reduce(
    (best, c) => (c.C > best.C ? c : best),
    oklchSlots[0] ?? { L: 0.55, C: 0.15, H: 230 },
  );

  // Palette L range — used to keep utility colors visually consistent with palette
  const minL = oklchSlots.length
    ? Math.min(...oklchSlots.map((c) => c.L))
    : 0.35;
  const maxL = oklchSlots.length
    ? Math.max(...oklchSlots.map((c) => c.L))
    : 0.72;

  // Target L for utility icons/text — mid of palette range, clamped to readable band
  // If palette is very light, pull utility darker; very dark → pull lighter
  const targetL = clamp(
    avgL > 0.68 ? avgL - 0.14 : avgL < 0.38 ? avgL + 0.14 : avgL,
    0.44,
    0.64,
  );
  // Target C — match palette saturation character, minimum 0.10 for semantic clarity
  const targetC = clamp(avgC * 0.9 + 0.04, 0.1, 0.22);

  // ── 2. Circular hue distance helper ────────────────────────────────────────
  const hueDist = (a: number, b: number) =>
    Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

  // ── 3. Semantic role definitions with hue ranges ────────────────────────────
  // Each role has a canonical hue centre and a tolerance arc.
  // Error/orange are treated as separate ranges to distinguish red vs warm-orange.
  const ROLE_HUES: Record<UtilityRole, { center: number; arc: number }> = {
    info: { center: 220, arc: 60 }, // blue family: 160°–280°
    success: { center: 148, arc: 50 }, // green family: 98°–198°
    warning: { center: 75, arc: 35 }, // yellow-amber: 40°–110°
    error: { center: 27, arc: 35 }, // orange-red: 352°–62° (wraps), centred at red-orange
    neutral: { center: primary.H, arc: 360 }, // any hue — uses primary
    focus: { center: primary.H, arc: 360 }, // any hue — uses primary
  };

  // ── 4. Core hue resolver ───────────────────────────────────────────────────
  //
  // Strategy:
  //   a) Find all palette slots within `arc` degrees of the role's center hue.
  //   b) If multiple slots qualify, pick the one whose L and C are closest to
  //      the role's target — so we get a "same box" match rather than just
  //      nearest-hue.
  //   c) If a match exists, use its exact hue so the utility color feels
  //      pulled directly from the palette.
  //   d) If no palette slot is close enough, blend between the nearest palette
  //      hue and the canonical role center (weighted by distance) — ensuring
  //      the utility color still feels palette-related rather than generic.
  //
  function resolveRoleHue(role: UtilityRole): number {
    if (!oklchSlots.length) return ROLE_HUES[role].center;
    const { center, arc } = ROLE_HUES[role];

    // Slots within the hue arc for this role
    const candidates = oklchSlots
      .map((c, i) => ({ ...c, i, dist: hueDist(c.H, center) }))
      .filter((c) => c.dist <= arc);

    if (candidates.length > 0) {
      // Score each candidate: prefer slots whose L and C are close to the
      // role targets. Combine hue fit (0–1), L fit, C fit into one score.
      const scored = candidates.map((c) => {
        const hueFit = 1 - c.dist / arc; // 1 = perfect hue match
        const lFit = 1 - Math.abs(c.L - targetL); // 1 = L matches target
        const cFit = 1 - Math.abs(c.C - targetC); // 1 = C matches target
        const score = hueFit * 0.5 + lFit * 0.3 + cFit * 0.2;
        return { ...c, score };
      });
      scored.sort((a, b) => b.score - a.score);
      return scored[0].H;
    }

    // No slot in arc — find nearest slot and blend its hue toward the role center
    // proportional to distance: very far = mostly canonical, nearby = mostly palette
    const nearest = oklchSlots.reduce(
      (b, c) => {
        const d = hueDist(c.H, center);
        return d < b.d ? { d, H: c.H } : b;
      },
      { d: Infinity, H: center },
    );

    // Blend weight: at arc→ 0% palette, at 0°→ 100% palette (linear)
    // Clamp to 120° max distance so we don't go fully canonical for remote hues
    const blendFactor = clamp(1 - nearest.d / 120, 0, 0.6);
    // Shortest-path angular blend
    const delta = ((center - nearest.H + 540) % 360) - 180; // signed shortest arc
    return (nearest.H + delta * (1 - blendFactor) + 360) % 360;
  }

  // ── 5. Warning-specific L adjustment ──────────────────────────────────────
  // Yellow-amber (H≈75°) is perceptually very bright at high L — pull it down
  // so it has similar visual weight to the other semantic colors.
  function warningL(h: number): number {
    const yellowness = Math.max(0, 1 - hueDist(h, 75) / 40); // 1 at H=75, 0 at ±40°
    return clamp(targetL - yellowness * 0.08, 0.42, 0.62);
  }

  // ── 6. Build utility color objects ────────────────────────────────────────
  function makeOklchStop(
    L: number,
    C: number,
    H: number,
  ): UtilityColor["color"] {
    const rgb = oklchToRgb({ L, C, H });
    return { hex: rgbToHex(rgb), rgb, hsl: rgbToHsl(rgb) };
  }
  function makeUtility(
    role: UtilityRole,
    L: number,
    C: number,
    H: number,
  ): UtilityColor {
    return {
      ...UTILITY_DEFS[role],
      role,
      color: makeOklchStop(L, C, H),
      locked: false,
    };
  }

  const infoH = resolveRoleHue("info");
  const successH = resolveRoleHue("success");
  const warningH = resolveRoleHue("warning");
  const errorH = resolveRoleHue("error");

  return {
    info: makeUtility("info", targetL, targetC, infoH),
    success: makeUtility("success", targetL, targetC, successH),
    warning: makeUtility(
      "warning",
      warningL(warningH),
      clamp(targetC * 1.05, 0.09, 0.2),
      warningH,
    ),
    error: makeUtility(
      "error",
      targetL,
      clamp(targetC * 1.1, 0.12, 0.24),
      errorH,
    ),
    // Neutral: primary hue at near-zero chroma — palette-tinted gray, not generic
    neutral: makeUtility(
      "neutral",
      clamp(targetL + 0.05, 0.5, 0.68),
      clamp(primary.C * 0.08, 0.006, 0.035),
      primary.H,
    ),
    // Focus ring: primary color, lightness normalised to be visible as a ring
    focus: makeUtility(
      "focus",
      clamp(primary.L, 0.5, 0.7),
      clamp(primary.C, 0.12, 0.3),
      primary.H,
    ),
  };
}

export function mergeUtilityColors(
  existing: UtilityColorSet,
  generated: UtilityColorSet,
): UtilityColorSet {
  const roles: UtilityRole[] = [
    "info",
    "success",
    "warning",
    "error",
    "neutral",
    "focus",
  ];
  const result = {} as UtilityColorSet;
  for (const role of roles)
    result[role] = existing[role].locked ? existing[role] : generated[role];
  return result;
}

// ─── Theme Token Derivation ────────────────────────────────────────────────────

/**
 * Derive a full design-system token set from the palette, modelled on shadcn/ui's
 * variable system but extended with more surface layers.
 *
 * All neutral shades are generated in OKLCH with near-zero chroma (< 0.015) so they
 * carry a whisper of the dominant palette hue — exactly how shadcn's neutral-zinc
 * theme works. The accent color is the highest-chroma palette slot.
 *
 * Token structure (matches shadcn naming):
 *   background / foreground
 *   card / card-foreground
 *   popover / popover-foreground
 *   primary / primary-foreground
 *   secondary / secondary-foreground
 *   muted / muted-foreground
 *   accent / accent-foreground
 *   destructive / destructive-foreground
 *   border / input / ring
 *
 * Plus our palette-specific additions:
 *   bg-subtle (alternate stripe background)
 *   surface-raised (popovers, tooltips)
 *   text-disabled
 */
export function deriveThemeTokens(
  slots: { color: { hex: string } }[],
  utility: UtilityColorSet,
): ThemeTokenSet {
  if (!slots.length)
    return {
      semantic: [],
      utility: {} as ThemeTokenSet["utility"],
      palette: [],
    };

  // ── Palette analysis in OKLCH ──────────────────────────────────────────────
  // Always derive from hex — immune to stale stored rgb values
  const oklchSlots = slots.map((s) => rgbToOklch(hexToRgb(s.color.hex)));

  // Primary: highest chroma — the "brand" color (maps to 10% accent in 60-30-10)
  const primaryIdx = oklchSlots.reduce(
    (bi, c, i) => (c.C > oklchSlots[bi].C ? i : bi),
    0,
  );
  const primaryLch = oklchSlots[primaryIdx];

  // Dominant hue for chromatic neutrals — carries subtle palette character
  // Shadcn/ui uses ~0.006–0.016 chroma for background tints
  const dominantH = primaryLch.H;
  const tintC = clamp(primaryLch.C * 0.055, 0.005, 0.015);

  // ── OKLCH neutral builder ─────────────────────────────────────────────────
  /** Near-neutral at target lightness, tinted with the palette's dominant hue.
   *  In dark mode, M3 uses tonal elevation (lighter = higher surface level). */
  function mkN(L: number, C = tintC, H = dominantH): string {
    return rgbToHex(oklchToRgb({ L: clamp(L, 0.01, 0.995), C, H }));
  }

  // ── Primary brand tokens ─────────────────────────────────────────────────
  // Light mode: vivid, L≈0.30–0.38 so it reads well on near-white backgrounds
  const primaryLight = rgbToHex(
    oklchToRgb({
      L: clamp(primaryLch.L, 0.26, 0.4),
      C: clamp(primaryLch.C, 0.14, 0.3),
      H: primaryLch.H,
    }),
  );
  // Dark mode: L≈0.70–0.82 for legibility on dark backgrounds
  const primaryDark = rgbToHex(
    oklchToRgb({
      L: clamp(primaryLch.L + 0.36, 0.62, 0.82),
      C: clamp(primaryLch.C * 0.88, 0.1, 0.28),
      H: primaryLch.H,
    }),
  );
  // Foreground on primary: must always pass WCAG AA (4.5:1)
  // Near-white for light-mode primary, near-black for dark-mode primary
  const primaryFgLight = mkN(0.985, 0.004);
  const primaryFgDark = mkN(0.12, 0.01);

  // ── Primary container tokens (M3 pattern: lighter/softer version for backgrounds) ──
  // Used for large sections, hero areas, secondary buttons
  const primaryContainerLight = rgbToHex(
    oklchToRgb({
      L: 0.92,
      C: clamp(primaryLch.C * 0.38, 0.03, 0.1),
      H: primaryLch.H,
    }),
  );
  const primaryContainerDark = rgbToHex(
    oklchToRgb({
      L: 0.24,
      C: clamp(primaryLch.C * 0.35, 0.03, 0.09),
      H: primaryLch.H,
    }),
  );
  const primaryContainerFgLight = rgbToHex(
    oklchToRgb({
      L: 0.2,
      C: clamp(primaryLch.C * 0.5, 0.06, 0.16),
      H: primaryLch.H,
    }),
  );
  const primaryContainerFgDark = rgbToHex(
    oklchToRgb({
      L: 0.88,
      C: clamp(primaryLch.C * 0.45, 0.05, 0.14),
      H: primaryLch.H,
    }),
  );

  // ── Secondary tokens ─────────────────────────────────────────────────────
  // shadcn: secondary = muted elevated surface (30% role in 60-30-10)
  const secondaryLight = mkN(0.96);
  const secondaryDark = mkN(0.18);
  const secondaryFgLight = mkN(0.14);
  const secondaryFgDark = mkN(0.93);

  // ── Accent tokens ────────────────────────────────────────────────────────
  // Used for hover states, selected states, highlights — a tinted surface
  const accentLight = rgbToHex(
    oklchToRgb({
      L: 0.935,
      C: clamp(primaryLch.C * 0.38, 0.03, 0.11),
      H: primaryLch.H,
    }),
  );
  const accentDark = rgbToHex(
    oklchToRgb({
      L: 0.24,
      C: clamp(primaryLch.C * 0.38, 0.03, 0.1),
      H: primaryLch.H,
    }),
  );
  const accentFgLight = mkN(0.14);
  const accentFgDark = mkN(0.93);

  // ── Destructive = error utility ───────────────────────────────────────────
  const errLch = rgbToOklch(utility.error.color.rgb);
  // Light mode: saturated red, dark enough for white bg (L≈0.46)
  const destructiveLight = rgbToHex(
    oklchToRgb({
      L: clamp(errLch.L, 0.42, 0.52),
      C: clamp(errLch.C, 0.18, 0.28),
      H: errLch.H,
    }),
  );
  // Dark mode: lighter red for dark bg readability
  const destructiveDark = rgbToHex(
    oklchToRgb({
      L: clamp(errLch.L + 0.12, 0.56, 0.72),
      C: clamp(errLch.C * 0.88, 0.14, 0.26),
      H: errLch.H,
    }),
  );
  // Subtle destructive: for alert backgrounds
  const destructiveSubtleLight = rgbToHex(
    oklchToRgb({ L: 0.94, C: clamp(errLch.C * 0.28, 0.03, 0.08), H: errLch.H }),
  );
  const destructiveSubtleDark = rgbToHex(
    oklchToRgb({ L: 0.18, C: clamp(errLch.C * 0.28, 0.03, 0.07), H: errLch.H }),
  );

  // ── M3-style surface elevation tiers ─────────────────────────────────────
  // In light mode: surfaces get slightly darker as elevation rises
  // In dark mode: surfaces get progressively LIGHTER (tonal elevation via primary hue)
  // Elevation 0 = page background, Elevation 5 = floating tooltips/modals
  // Based on M3: each level adds ~5% primary tint in dark mode
  const surfaceElevationDark = (level: number) => {
    const tonalL = 0.08 + level * 0.028; // 0.08 → 0.22 across 5 levels
    const tonalC = clamp(primaryLch.C * (0.04 + level * 0.012), 0.004, 0.025);
    return mkN(tonalL, tonalC);
  };

  // 5-level surface containers (M3 tone-based surfaces)
  // Level 0 = background, Level 1–5 = increasing elevation
  const surfaceLight = [
    mkN(0.99), // Lv0 = page bg
    mkN(0.972), // Lv1 = subtle / striped rows
    mkN(0.955), // Lv2 = card
    mkN(0.935), // Lv3 = raised card
    mkN(0.98), // Lv4 = popover (near-white, floating)
  ];
  const surfaceDark = [
    surfaceElevationDark(0), // Lv0 = page bg
    surfaceElevationDark(1), // Lv1 = subtle
    surfaceElevationDark(2), // Lv2 = card
    surfaceElevationDark(3), // Lv3 = raised card
    surfaceElevationDark(5), // Lv4 = popover (highest)
  ];

  // ── Ring = primary ────────────────────────────────────────────────────────
  const ringLight = primaryLight;
  const ringDark = primaryDark;

  const semantic: SemanticToken[] = [
    // ── Layer 0: Page background ─────────────────────────── 60% zone (neutral)
    {
      name: "--background",
      light: surfaceLight[0],
      dark: surfaceDark[0],
      description: "Page / canvas background (60% dominant)",
    },
    {
      name: "--foreground",
      light: mkN(0.1),
      dark: mkN(0.94),
      description: "Default body text",
    },

    // ── Layer 1: Subtle / alternate ──────────────────────── 60% zone
    {
      name: "--surface-dim",
      light: surfaceLight[1],
      dark: surfaceDark[1],
      description: "Subtle bg: striped rows, aside panels, code wells",
    },
    {
      name: "--surface-dim-foreground",
      light: mkN(0.25),
      dark: mkN(0.8),
      description: "Text on dim surface",
    },

    // ── Layer 2: Card ────────────────────────────────────── 30% zone (secondary)
    {
      name: "--card",
      light: surfaceLight[2],
      dark: surfaceDark[2],
      description: "Card / content block background",
    },
    {
      name: "--card-foreground",
      light: mkN(0.1),
      dark: mkN(0.94),
      description: "Card text",
    },

    // ── Layer 3: Raised card / sidebar ───────────────────── 30% zone
    {
      name: "--card-raised",
      light: surfaceLight[3],
      dark: surfaceDark[3],
      description: "Raised card, sidebar, drawer (slightly elevated)",
    },
    {
      name: "--card-raised-foreground",
      light: mkN(0.1),
      dark: mkN(0.94),
      description: "Text on raised card",
    },

    // ── Layer 4: Popover / modal ──────────────────────────── highest surface
    {
      name: "--popover",
      light: surfaceLight[4],
      dark: surfaceDark[4],
      description: "Popover, tooltip, dropdown, modal background",
    },
    {
      name: "--popover-foreground",
      light: mkN(0.1),
      dark: mkN(0.94),
      description: "Popover text",
    },

    // ── Primary brand (10% accent role) ──────────────────────────────────────
    {
      name: "--primary",
      light: primaryLight,
      dark: primaryDark,
      description:
        "Primary CTA: buttons, links, active nav (use sparingly — 10%)",
    },
    {
      name: "--primary-foreground",
      light: primaryFgLight,
      dark: primaryFgDark,
      description: "Text/icon on primary (always high-contrast)",
    },
    {
      name: "--primary-container",
      light: primaryContainerLight,
      dark: primaryContainerDark,
      description:
        "Primary container: large sections, hero bg, secondary CTA surface",
    },
    {
      name: "--primary-container-foreground",
      light: primaryContainerFgLight,
      dark: primaryContainerFgDark,
      description: "Text on primary-container (brand-tinted, not full primary)",
    },

    // ── Secondary ────────────────────────────────────────────────────────────
    {
      name: "--secondary",
      light: secondaryLight,
      dark: secondaryDark,
      description: "Secondary buttons, less-prominent surfaces",
    },
    {
      name: "--secondary-foreground",
      light: secondaryFgLight,
      dark: secondaryFgDark,
      description: "Text on secondary",
    },

    // ── Muted ────────────────────────────────────────────────────────────────
    {
      name: "--muted",
      light: mkN(0.94),
      dark: mkN(0.2),
      description: "Muted surface: disabled states, placeholder backgrounds",
    },
    {
      name: "--muted-foreground",
      light: mkN(0.46),
      dark: mkN(0.62),
      description: "Secondary / placeholder text (reduced emphasis)",
    },

    // ── Accent (tinted hover / selection surface) ──────────────────────────
    {
      name: "--accent",
      light: accentLight,
      dark: accentDark,
      description: "Hover surface, selected state, highlight chip bg",
    },
    {
      name: "--accent-foreground",
      light: accentFgLight,
      dark: accentFgDark,
      description: "Text on accent surface",
    },

    // ── Destructive ──────────────────────────────────────────────────────────
    {
      name: "--destructive",
      light: destructiveLight,
      dark: destructiveDark,
      description: "Error / delete actions (filled)",
    },
    {
      name: "--destructive-foreground",
      light: mkN(0.985, 0.004),
      dark: mkN(0.985, 0.004),
      description: "Text on destructive",
    },
    {
      name: "--destructive-subtle",
      light: destructiveSubtleLight,
      dark: destructiveSubtleDark,
      description: "Error alert background / inline error tint",
    },

    // ── Borders & inputs ─────────────────────────────────────────────────────
    {
      name: "--border",
      light: mkN(0.86),
      dark: mkN(0.26),
      description:
        "Default divider / border — use sparingly (shadow often better)",
    },
    {
      name: "--border-strong",
      light: mkN(0.72),
      dark: mkN(0.4),
      description: "High-emphasis border: active inputs, selected cards",
    },
    {
      name: "--input",
      light: mkN(0.86),
      dark: mkN(0.24),
      description: "Form input border (normal state)",
    },

    // ── Focus ring = primary brand ────────────────────────────────────────────
    {
      name: "--ring",
      light: ringLight,
      dark: ringDark,
      description: "Keyboard focus ring — always matches primary brand color",
    },
  ];

  // ── Utility tokens ─────────────────────────────────────────────────────────
  const utilityTokens = {} as ThemeTokenSet["utility"];
  const roles: UtilityRole[] = [
    "info",
    "success",
    "warning",
    "error",
    "neutral",
    "focus",
  ];
  for (const role of roles) {
    const lch = rgbToOklch(utility[role].color.rgb);
    const base = utility[role].color.hex;

    // Warning is perceptually very bright (yellow), so lighten less in light mode
    const lightLAdj = role === "warning" ? -0.1 : -0.06;
    const darkLAdj = role === "warning" ? +0.04 : +0.08;

    // Light mode: darker/more saturated — readable on white
    const light = rgbToHex(
      oklchToRgb({
        L: clamp(lch.L + lightLAdj, 0.34, 0.55),
        C: clamp(lch.C * 1.05, 0.1, 0.26),
        H: lch.H,
      }),
    );
    // Dark mode: lighter — readable on dark surface
    const dark = rgbToHex(
      oklchToRgb({
        L: clamp(lch.L + darkLAdj, 0.5, 0.78),
        C: clamp(lch.C * 0.88, 0.08, 0.22),
        H: lch.H,
      }),
    );
    // Subtle light: alert background — near-white with a tint of the role hue
    const subtle = rgbToHex(
      oklchToRgb({
        L: 0.945,
        C: clamp(lch.C * 0.3, 0.02, 0.07),
        H: lch.H,
      }),
    );
    // Subtle dark: alert background in dark mode — near-dark with a tint of the role hue
    // Sits above the card surface (L≈0.11) so it's clearly a tinted surface, not flat black
    const subtleDark = rgbToHex(
      oklchToRgb({
        L: 0.16,
        C: clamp(lch.C * 0.32, 0.02, 0.08),
        H: lch.H,
      }),
    );

    utilityTokens[role] = { base, light, dark, subtle, subtleDark };
  }

  return {
    semantic,
    utility: utilityTokens,
    palette: slots.map((sl, i) => ({
      name: `palette-${i + 1}`,
      hex: sl.color.hex,
    })),
  };
}

export function buildThemeCss(tokens: ThemeTokenSet): string {
  const semLight = tokens.semantic
    .map((t) => `  ${t.name}: ${t.light};`)
    .join("\n");
  const semDark = tokens.semantic
    .map((t) => `  ${t.name}: ${t.dark};`)
    .join("\n");
  const utilVars = (mode: "light" | "dark") =>
    Object.entries(tokens.utility)
      .map(([role, v]) => {
        const subtle = mode === "light" ? v.subtle : v.subtleDark;
        return `  --${role}: ${mode === "light" ? v.light : v.dark};\n  --${role}-subtle: ${subtle};`;
      })
      .join("\n");
  const palVars = tokens.palette
    .map((p) => `  --${p.name}: ${p.hex};`)
    .join("\n");

  const header = `/**
 * ─────────────────────────────────────────────────────────
 *  Color System — Generated by Chroma
 * ─────────────────────────────────────────────────────────
 *
 *  Layer 1 · PRIMITIVE  — raw palette values (--palette-1, --palette-2…)
 *  Layer 2 · SEMANTIC   — purpose-named tokens (--background, --primary…)
 *  Layer 3 · COMPONENT  — apply via var(): bg-[--primary] or className=""
 *
 *  60-30-10 proportion guide:
 *   60%  →  --background, --surface-dim          (neutral canvas)
 *   30%  →  --card, --card-raised, --secondary   (content surfaces)
 *   10%  →  --primary                            (brand/CTA — use sparingly!)
 *
 *  Surface elevation (light → dark both work via OKLCH tonal tints):
 *   --background < --surface-dim < --card < --card-raised < --popover
 *
 *  Dark mode: uses tonal elevation (lighter surface = higher level)
 *  based on Material Design 3 / Google HCT research.
 * ─────────────────────────────────────────────────────────
 */`;

  return [
    header,
    ``,
    `/* ─── Light mode (default) ──────────────────────────── */`,
    `:root {`,
    `  /* ── Semantic tokens ─────────────────────────────── */`,
    semLight,
    ``,
    `  /* ── Utility / semantic state colors ────────────── */`,
    utilVars("light"),
    ``,
    `  /* ── Primitive palette ───────────────────────────── */`,
    palVars,
    `}`,
    ``,
    `/* ─── Dark mode (system preference) ─────────────────── */`,
    `@media (prefers-color-scheme: dark) {`,
    `  :root {`,
    semDark
      .split("\n")
      .map((l) => "  " + l)
      .join("\n"),
    ``,
    `    /* Utility */`,
    utilVars("dark")
      .split("\n")
      .map((l) => "  " + l)
      .join("\n"),
    `  }`,
    `}`,
    ``,
    `/* ─── Manual dark: add class="dark" to <html> ────────── */`,
    `.dark {`,
    semDark,
    ``,
    utilVars("dark"),
    `}`,
  ].join("\n");
}

export function buildFigmaTokens(
  tokens: ThemeTokenSet,
  utility: UtilityColorSet,
): string {
  const obj = {
    global: Object.fromEntries(
      tokens.palette.map((p) => [p.name, { value: p.hex, type: "color" }]),
    ),
    semantic: {
      light: Object.fromEntries(
        tokens.semantic.map((t) => [
          t.name.replace(/^--/, ""),
          { value: t.light, type: "color", description: t.description },
        ]),
      ),
      dark: Object.fromEntries(
        tokens.semantic.map((t) => [
          t.name.replace(/^--/, ""),
          { value: t.dark, type: "color", description: t.description },
        ]),
      ),
    },
    utility: Object.fromEntries(
      Object.entries(tokens.utility).map(([role, v]) => [
        role,
        {
          DEFAULT: {
            value: v.base,
            type: "color",
            description: utility[role as UtilityRole].description,
          },
          light: { value: v.light, type: "color" },
          dark: { value: v.dark, type: "color" },
          subtle: { value: v.subtle, type: "color" },
        },
      ]),
    ),
  };
  return JSON.stringify(obj, null, 2);
}

export function buildTailwindConfig(
  tokens: ThemeTokenSet,
  _utility: UtilityColorSet,
): string {
  const utilSection = Object.entries(tokens.utility)
    .map(([role, v]) =>
      [
        `      ${role}: {`,
        `        DEFAULT: '${v.base}',`,
        `        light:   '${v.light}',`,
        `        dark:    '${v.dark}',`,
        `        subtle:  '${v.subtle}',`,
        `      },`,
      ].join("\n"),
    )
    .join("\n");

  const palSection = tokens.palette
    .map((p) => `      '${p.name}': '${p.hex}',`)
    .join("\n");
  const semSection = tokens.semantic
    .map((t) => {
      const key = t.name.replace(/^--/, "");
      return `      '${key}': 'var(${t.name})',`;
    })
    .join("\n");

  return [
    `// tailwind.config.js`,
    `// Paste the CSS Variables output into your global stylesheet first`,
    `/** @type {import('tailwindcss').Config} */`,
    `module.exports = {`,
    `  theme: {`,
    `    extend: {`,
    `      colors: {`,
    `        // Semantic (CSS var-driven, auto light/dark)`,
    semSection,
    ``,
    `        // Utility colors`,
    utilSection,
    ``,
    `        // Raw palette`,
    palSection,
    `      },`,
    `    },`,
    `  },`,
    `}`,
  ].join("\n");
}
