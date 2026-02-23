import type { CMYK, HSL, HSV, OKLCH, OKLab, RGB } from "@/types";

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

export function oklabToRgb({ L, a, b }: OKLab): RGB {
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

// ─── APCA Contrast (WCAG 3 / Accessible Perceptual Contrast Algorithm) ────────
// Reference implementation: https://github.com/Myndex/apca-w3
// Lc value scale: ≥60 = body text, ≥45 = large text, ≥30 = non-text UI
// Positive = dark text on light bg; negative = light text on dark bg.

function apcaSRGB(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** APCA perceptual luminance (Ys) — uses APCA-specific exponent 2.4 */
function apcaLuminance({ r, g, b }: RGB): number {
  return (
    0.2126729 * apcaSRGB(r / 255) +
    0.7151522 * apcaSRGB(g / 255) +
    0.072175 * apcaSRGB(b / 255)
  );
}

/**
 * APCA Lc value — the Accessible Perceptual Contrast Algorithm.
 * Returns a signed value: positive = dark text on light bg, negative = light on dark.
 * Use Math.abs(apcaContrast(fg, bg)) for the magnitude.
 *
 * Interpretation (magnitude):
 *   ≥ 75 → Preferred body text (7pt–11pt)
 *   ≥ 60 → Minimum body text, preferred for non-critical content
 *   ≥ 45 → Large text (18pt+), UI components, input borders
 *   ≥ 30 → Non-text elements, icons, decorative
 *   < 30 → Insufficient for any meaningful visual distinction
 */
export function apcaContrast(fg: RGB, bg: RGB): number {
  const Yfg = apcaLuminance(fg);
  const Ybg = apcaLuminance(bg);
  const Ntxt = 0.57,
    Nbg = 0.56,
    Rtxt = 0.62,
    Rbg = 0.65;
  const scale = 1.14,
    offset = 0.027;

  let Sapc = 0;
  if (Ybg > Yfg) {
    // Dark text on light bg (positive Lc)
    const Spl = Math.pow(Ybg, Nbg) - Math.pow(Yfg, Ntxt);
    Sapc = Spl < 0.1 ? 0 : Spl * scale - offset;
  } else {
    // Light text on dark bg (negative Lc)
    const Spl = Math.pow(Ybg, Rbg) - Math.pow(Yfg, Rtxt);
    Sapc = Spl > -0.1 ? 0 : Spl * scale + offset;
  }
  return Math.round(Sapc * 100);
}

export type ApcaLevel = "Preferred" | "Body" | "Large" | "UI" | "Fail";

export function apcaLevel(lc: number): ApcaLevel {
  const mag = Math.abs(lc);
  if (mag >= 75) return "Preferred";
  if (mag >= 60) return "Body";
  if (mag >= 45) return "Large";
  if (mag >= 30) return "UI";
  return "Fail";
}

// ─── Contrast Fix Suggestions ─────────────────────────────────────────────────

/**
 * Find the minimum OKLCH lightness adjustment to reach a target WCAG contrast.
 * Returns the adjusted hex, or null if already passing.
 * Direction: 'lighten' pushes toward white, 'darken' pushes toward black.
 */
export function suggestContrastFix(
  hex: string,
  bg: RGB,
  targetRatio = 4.5,
): { hex: string; direction: "lighten" | "darken" } | null {
  const rgb = hexToRgb(hex);
  if (contrastRatio(rgb, bg) >= targetRatio) return null;

  const lch = rgbToOklch(rgb);
  const bgLum = luminance(bg);
  const direction: "lighten" | "darken" = bgLum > 0.5 ? "darken" : "lighten";

  // Binary search: find L that achieves target ratio
  let lo = direction === "lighten" ? lch.L : 0;
  let hi = direction === "lighten" ? 1 : lch.L;
  let best = hex;

  for (let i = 0; i < 32; i++) {
    const mid = (lo + hi) / 2;
    const candidate = oklchToRgb({
      L: mid,
      C: lch.C * (1 - Math.abs(mid - lch.L) * 0.3),
      H: lch.H,
    });
    const ratio = contrastRatio(candidate, bg);
    if (ratio >= targetRatio) {
      best = rgbToHex(candidate);
      if (direction === "lighten") hi = mid;
      else lo = mid;
    } else {
      if (direction === "lighten") lo = mid;
      else hi = mid;
    }
    if (hi - lo < 0.001) break;
  }

  return best === hex ? null : { hex: best, direction };
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
  if (c.length === 8) return "#" + c.slice(0, 6);
  if (c.length === 3)
    return (
      "#" +
      c
        .split("")
        .map((x) => x + x)
        .join("")
    );
  return "#" + c.slice(0, 6);
}

function parseRgbStr(s: string): RGB | null {
  const m = s.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
  if (!m) return null;
  return {
    r: clamp(Math.round(+m[1]), 0, 255),
    g: clamp(Math.round(+m[2]), 0, 255),
    b: clamp(Math.round(+m[3]), 0, 255),
  };
}

function parseHslStr(s: string): RGB | null {
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

// ─── Re-exports from split modules ──────────────────────────────────────────
// These re-exports preserve backward compatibility for all existing imports.
export {
  generateScale,
  scorePalette,
  generateUtilityColors,
  mergeUtilityColors,
} from "./color-math-scale.utils";
export {
  deriveThemeTokens,
  buildFigmaTokens,
  buildTailwindConfig,
  buildTailwindV4,
  buildStyleDictionary,
  buildColorStoryHtml,
  semanticSlotNames,
  buildThemeCss,
} from "./color-math-export.utils";
