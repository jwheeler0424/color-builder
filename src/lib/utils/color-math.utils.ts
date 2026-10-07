import type { Mat3 } from '@/lib/engine/math/matrix';
import type { CMYK, HSL, HSV, OKLCH, OKLab, PickerMode, RGB } from '@/types';

import * as engine from '@/lib/engine/browser';
import { getCmykConverter } from '@/lib/tools/cmyk-profile';

export function rgbToXyz(rgb: RGB): engine.Vec3 {
  return engine.encodedToXyz(engine.SRGB, [rgb.r / 255, rgb.g / 255, rgb.b / 255]);
}

export function xyzToRgb(xyz: engine.Vec3): RGB {
  const channels = engine.xyzToEncoded(engine.SRGB, xyz);
  return {
    r: Math.round(clamp(channels[0], 0, 1) * 255),
    g: Math.round(clamp(channels[1], 0, 1) * 255),
    b: Math.round(clamp(channels[2], 0, 1) * 255),
  };
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

// ─── sRGB linearization (single source of truth) ─────────────────────────────

export function toLinear(v: number): number {
  return engine.SRGB.decode(v);
}
export function fromLinear(v: number): number {
  return engine.SRGB.encode(v);
}

// ─── Hex ↔ RGB ────────────────────────────────────────────────────────────────

export function hexToRgb(hex: string): RGB {
  const value = engine.parseColor(hex);
  const rendition = engine.renderColor(value);
  const channels = engine.hexToEncoded(rendition.hex);
  return {
    r: Math.round(channels[0] * 255),
    g: Math.round(channels[1] * 255),
    b: Math.round(channels[2] * 255),
  };
}

export function rgbToHex({ r, g, b }: RGB): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

// ─── RGB ↔ HSL ────────────────────────────────────────────────────────────────

export function rgbToHsl({ r, g, b }: RGB): HSL {
  const result = engine.rgbToHsl([r / 255, g / 255, b / 255]);
  return { h: result.h, s: result.s * 100, l: result.l * 100 };
}

export function hslToRgb({ h, s, l }: HSL): RGB {
  const channels = engine.hslToRgb({ h, s: s / 100, l: l / 100 });
  return {
    r: Math.round(channels[0] * 255),
    g: Math.round(channels[1] * 255),
    b: Math.round(channels[2] * 255),
  };
}

// ─── RGB ↔ HSV ──────────────────────────────────────────────────────────────────────

export function rgbToHsv({ r, g, b }: RGB): HSV {
  const result = engine.rgbToHsv([r / 255, g / 255, b / 255]);
  return { h: result.h, s: result.s * 100, v: result.l * 100 };
}

export function hsvToRgb({ h, s, v }: HSV): RGB {
  const channels = engine.hsvToRgb({ h, s: s / 100, l: v / 100 });
  return {
    r: Math.round(channels[0] * 255),
    g: Math.round(channels[1] * 255),
    b: Math.round(channels[2] * 255),
  };
}

// ─── RGB ↔ CMYK ─────────────────────────────────────────────────────────────────────

export function rgbToCmyk(rgb: RGB): CMYK | null {
  const converter = getCmykConverter();
  if (!converter) return null;
  const [c, m, y, k] = converter.toCmyk(engine.CIELAB.xyzToLab(rgbToXyz(rgb)));
  return { c, m, y, k };
}

export function cmykToRgb({ c, m, y, k }: CMYK): RGB {
  const converter = getCmykConverter();
  if (!converter) throw new Error('Load a CMYK ICC profile to convert ink values.');
  const xyz = engine.CIELAB.labToXyz(converter.toLab([c, m, y, k]));
  return hexToRgb(engine.renderColor(engine.colorValue(xyz)).hex);
}

// ─── OKLab / OKLCH ───────────────────────────────────────────────────────────

export function rgbToOklab(rgb: RGB): OKLab {
  return engine.OKLAB.xyzToLab(rgbToXyz(rgb));
}

export function oklabToLch({ L, a, b }: OKLab): OKLCH {
  const lch = engine.labToLch(engine.OKLAB, { L, a, b });
  return { L: lch.l * 100, C: lch.c * 100, H: lch.h };
}

export function lchToOklab({ L, C, H }: OKLCH): OKLab {
  return engine.lchToLab({ l: L / 100, c: C / 100, h: H });
}

// ─── OKLab → linear RGB → sRGB (shared kernel) ────────────────────────────────

export function oklabToRgb({ L, a, b }: OKLab): RGB {
  return hexToRgb(engine.fitHex(engine.OKLAB, engine.labToLch(engine.OKLAB, { L, a, b })));
}

// ─── OKLCH round-trip ─────────────────────────────────────────────────────────

export function rgbToOklch(rgb: RGB): OKLCH {
  const lch = engine.xyzToLch(engine.OKLAB, rgbToXyz(rgb));
  return { L: lch.l, C: lch.c, H: lch.h };
}

/** Convert OKLCH → sRGB, clamping out-of-gamut via chroma bisection (CSS Color 4 algorithm).
 *  Keeps hue and lightness stable; reduces C until the RGB result is in [0,255]. */
export function oklchToRgb(lch: OKLCH): RGB {
  return hexToRgb(engine.fitHex(engine.OKLAB, { l: lch.L, c: lch.C, h: lch.H }));
}

// ─── Interpolate two colors in OKLab space (perceptually uniform) ─────────────
export function mixOklab(a: RGB, b: RGB, t: number): RGB {
  return xyzToRgb(engine.mix(rgbToXyz(a), rgbToXyz(b), t, 'oklab'));
}

export function mixHsl(a: RGB, b: RGB, t: number): RGB {
  return xyzToRgb(engine.mix(rgbToXyz(a), rgbToXyz(b), t, 'hsl'));
}

export function mixRgb(a: RGB, b: RGB, t: number): RGB {
  return xyzToRgb(engine.mix(rgbToXyz(a), rgbToXyz(b), t, 'rgb'));
}

// ─── Accessibility ────────────────────────────────────────────────────────────

export function luminance(rgb: RGB): number {
  return engine.luminance(rgbToXyz(rgb));
}

export function contrastRatio(a: RGB, b: RGB): number {
  return engine.contrastRatio(rgbToXyz(a), rgbToXyz(b));
}

export type WcagLevel = 'AAA' | 'AA' | 'AA Large' | 'Fail';

export function wcagLevel(r: number): WcagLevel {
  return engine.wcagLevel(r);
}

export function textColor(bg: RGB): string {
  return engine.textColor(rgbToXyz(bg));
}

// ─── APCA Contrast (WCAG 3 / Accessible Perceptual Contrast Algorithm) ────────
// Reference implementation: https://github.com/Myndex/apca-w3
// Lc value scale: ≥60 = body text, ≥45 = large text, ≥30 = non-text UI
// Positive = dark text on light bg; negative = light text on dark bg.

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
  return engine.apcaContrast(rgbToXyz(fg), rgbToXyz(bg));
}

export type ApcaLevel = 'Preferred' | 'Body' | 'Large' | 'UI' | 'Fail';

export function apcaLevel(lc: number): ApcaLevel {
  return engine.apcaLevel(lc);
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
): { hex: string; direction: 'lighten' | 'darken' } | null {
  return engine.contrastFix(engine.parseColor(hex).xyz, rgbToXyz(bg), targetRatio);
}

// ─── Perceptual Distance ──────────────────────────────────────────────────────

export function colorDist(a: RGB, b: RGB): number {
  return engine.OKLAB.distance(
    engine.OKLAB.xyzToLab(rgbToXyz(a)),
    engine.OKLAB.xyzToLab(rgbToXyz(b)),
  );
}

// ─── Parsers ─────────────────────────────────────────────────────────────────

export function parseHex(s: string): string | null {
  const c = s.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(c))
    return (
      '#' +
      c
        .split('')
        .map((x) => x + x)
        .join('')
    );
  if (/^[0-9a-fA-F]{6}$/.test(c)) return '#' + c;
  // 8-char hex (#RRGGBBAA) — strip alpha bytes, return 6-char opaque hex
  if (/^[0-9a-fA-F]{8}$/.test(c)) return '#' + c.slice(0, 6);
  return null;
}

/** Parse 8-char hex and return alpha 0–100, or null if not an 8-char hex */
export function parseHexAlpha(s: string): number | null {
  const c = s.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{8}$/.test(c)) return null;
  return Math.round((parseInt(c.slice(6), 16) / 255) * 100);
}

/** Strip any alpha bytes from a hex string, returning a safe 6-char hex */
export function opaqueHex(hex: string): string {
  const c = hex.replace(/^#/, '');
  if (c.length === 8) return '#' + c.slice(0, 6);
  if (c.length === 3)
    return (
      '#' +
      c
        .split('')
        .map((x) => x + x)
        .join('')
    );
  return '#' + c.slice(0, 6);
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
  return a === 1 ? '1' : a === 0 ? '0' : a.toFixed(2).replace(/0+$/, '');
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
  return alpha >= 100 ? `hsl(${h} ${s}% ${l}%)` : `hsl(${h} ${s}% ${l}% / ${fmtA(alpha)})`;
}

export function toCssHsv(hsv: HSV, alpha = 100): string {
  // HSV is not a CSS color space — format as a comment/reference string
  const h = Math.round(hsv.h);
  const s = Math.round(hsv.s);
  const v = Math.round(hsv.v);
  return alpha >= 100 ? `hsv(${h} ${s}% ${v}%)` : `hsv(${h} ${s}% ${v}% / ${fmtA(alpha)})`;
}

export function toCssOklch(lch: OKLCH, alpha = 100): string {
  // OKLCH in CSS: oklch(L% C H) — L is 0-1, C is 0-0.4, H is 0-360
  const L = lch.L.toFixed(4);
  const C = lch.C.toFixed(4);
  const H = Math.round(lch.H);
  return alpha >= 100 ? `oklch(${L} ${C} ${H})` : `oklch(${L} ${C} ${H} / ${fmtA(alpha)})`;
}

export function toCssOklab(lab: OKLab, alpha = 100): string {
  const L = lab.L.toFixed(4);
  const a = lab.a.toFixed(4);
  const b = lab.b.toFixed(4);
  return alpha >= 100 ? `oklab(${L} ${a} ${b})` : `oklab(${L} ${a} ${b} / ${fmtA(alpha)})`;
}

export function toCssCmyk(cmyk: CMYK, alpha = 100): string {
  const c = Math.round(cmyk.c);
  const m = Math.round(cmyk.m);
  const y = Math.round(cmyk.y);
  const k = Math.round(cmyk.k);
  return alpha >= 100
    ? `device-cmyk(${c}% ${m}% ${y}% ${k}%)`
    : `device-cmyk(${c}% ${m}% ${y}% ${k}% / ${fmtA(alpha)})`;
}

/** 8-char hex with alpha: #RRGGBBAA */
export function toHexAlpha(hex: string, alpha: number): string {
  if (alpha >= 100) return hex;
  const aa = Math.round((clamp(alpha, 0, 100) / 100) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${aa}`;
}

// ─── Color Blindness Simulation ───────────────────────────────────────────────

export function applySimMatrix(rgb: RGB, M: number[]): RGB {
  if (M.length !== 9 || !M.every(Number.isFinite))
    throw new Error('A simulation matrix requires nine finite values.');
  const matrix: Mat3 = [
    [M[0], M[1], M[2]],
    [M[3], M[4], M[5]],
    [M[6], M[7], M[8]],
  ];
  return xyzToRgb(engine.simulateMatrix(rgbToXyz(rgb), matrix));
}

// ─── CSS output string for current mode ──────────────────────────────────────

export function cssString(
  mode: PickerMode,
  rgb: RGB,
  hsl: HSL,
  hsv: HSV,
  oklch: OKLCH,
  oklab: OKLab,
  cmyk: CMYK | null,
  alpha: number,
): string {
  switch (mode) {
    case 'rgb':
      return toCssRgb(rgb, alpha);
    case 'hsl':
      return toCssHsl(hsl, alpha);
    case 'hsv':
      return toCssHsv(hsv, alpha);
    case 'oklch':
      return toCssOklch(oklch, alpha);
    case 'oklab':
      return toCssOklab(oklab, alpha);
    case 'cmyk':
      return cmyk ? toCssCmyk(cmyk, alpha) : 'CMYK: ICC profile required';
  }
}

// ─── Re-exports from split modules ──────────────────────────────────────────
// These re-exports preserve backward compatibility for all existing imports.
export {
  generateScale,
  scorePalette,
  generateUtilityColors,
  regenerateUtilityColors,
  mergeUtilityColors,
} from './color-math-scale.utils';
export {
  deriveThemeTokens,
  buildFigmaTokens,
  buildTailwindConfig,
  buildTailwindV4,
  buildStyleDictionary,
  buildColorStoryHtml,
  semanticSlotNames,
  buildThemeCss,
} from './color-math-export.utils';
