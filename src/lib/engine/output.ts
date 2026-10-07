import type { RGB8 } from './device.ts';
import type { Vec3 } from './math/matrix.ts';

import { optimalSolid } from './gamuts/optimal.ts';
import { DISPLAY_GAMUTS, SRGB, encodedToXyz, xyzToEncoded } from './gamuts/rgb.ts';
import { containsXyz, type DisplayGamutId, type RgbGamut } from './gamuts/types.ts';
import { fitChroma, maxChroma } from './solver.ts';
import { clamp, lchToLab, lchToXyz, type ColorSpace, type Lch } from './spaces/types.ts';

export function isHex(input: string): boolean {
  return /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(input.trim());
}

/** "#F80", "f80", "#FF8800" -> "#ff8800" */
export function normalizeHex(input: string): string {
  let h = input.trim().replace(/^#/, '').toLowerCase();
  if (h.length === 3) h = h.replace(/./g, '$&$&');
  if (!/^[0-9a-f]{6}$/.test(h)) throw new Error(`Invalid hex color: "${input}"`);
  return `#${h}`;
}

/** Encoded sRGB channels in 0..1. */
export function hexToEncoded(hex: string): Vec3 {
  const n = parseInt(normalizeHex(hex).slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function hexToRgb8(hex: string): RGB8 {
  const [r, g, b] = hexToEncoded(hex).map((value) => Math.round(value * 255));
  return { r, g, b };
}

export function rgb8ToHex({ r, g, b }: RGB8): string {
  const channels = [r, g, b];
  if (!channels.every((value) => Number.isInteger(value) && value >= 0 && value <= 255)) {
    throw new Error('8-bit RGB channels must be integers between 0 and 255.');
  }
  return `#${channels.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

export const hexToXyz = (hex: string): Vec3 => encodedToXyz(SRGB, hexToEncoded(hex));

const byteHex = (v: number) => v.toString(16).padStart(2, '0');
const srgbByteLinear = Float64Array.from({ length: 256 }, (_, value) => SRGB.decode(value / 255));

/**
 * The 8-bit sRGB color perceptually closest to `color` (by the space's own ΔE). Rounding each
 * channel alone is not optimal, and in dark colors the optimum can sit a few steps away, so
 * the search grows cube shells around the rounded value until a whole shell brings no improvement.
 */
export function bestHex(space: ColorSpace, color: Lch): string {
  const target = lchToLab(color);
  const center = xyzToEncoded(SRGB, lchToXyz(space, color)).map((v) =>
    Math.min(255, Math.max(0, Math.round(v * 255))),
  );

  let best = center;
  let bestDistance = Infinity;
  const consider = (red: number, green: number, blue: number) => {
    if (red < 0 || red > 255 || green < 0 || green > 255 || blue < 0 || blue > 255) return false;
    const linearRed = srgbByteLinear[red]!;
    const linearGreen = srgbByteLinear[green]!;
    const linearBlue = srgbByteLinear[blue]!;
    const [xRow, yRow, zRow] = SRGB.xyzFromLinear;
    const lab = space.xyzToLab([
      xRow[0] * linearRed + xRow[1] * linearGreen + xRow[2] * linearBlue,
      yRow[0] * linearRed + yRow[1] * linearGreen + yRow[2] * linearBlue,
      zRow[0] * linearRed + zRow[1] * linearGreen + zRow[2] * linearBlue,
    ]);
    const distance = space.distance(target, lab);
    if (distance >= bestDistance) return false;
    bestDistance = distance;
    best = [red, green, blue];
    return true;
  };

  consider(center[0]!, center[1]!, center[2]!);
  for (let r = 1; r <= 32; r++) {
    let improved = false;
    for (let dr = -r; dr <= r; dr++) {
      for (let dg = -r; dg <= r; dg++) {
        for (let db = -r; db <= r; db++) {
          if (Math.max(Math.abs(dr), Math.abs(dg), Math.abs(db)) !== r) continue;
          if (consider(center[0]! + dr, center[1]! + dg, center[2]! + db)) improved = true;
        }
      }
    }
    if (!improved && r >= 2) break;
  }
  return `#${best.map(byteHex).join('')}`;
}

/** `bestHex` after reducing chroma at constant lightness and hue until the color fits sRGB. */
export function fitHex(space: ColorSpace, color: Lch): string {
  const l = clamp(color.l, 0, space.lightnessMax);
  const c = fitChroma(space, SRGB, l, color.h, Math.max(0, color.c));
  return bestHex(space, { l, c, h: color.h });
}

/** Full-precision CSS `color()` value in an RGB gamut, e.g. `color(display-p3 0.1 0.2 0.3)`. */
export function cssColor(gamut: RgbGamut, xyz: Vec3, alpha = 1): string {
  if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) {
    throw new Error('Color alpha must be between 0 and 1.');
  }
  // Boundary colors land within float noise of a cube face; snap that noise, nothing more.
  const [r, g, b] = xyzToEncoded(gamut, xyz).map((v) =>
    Math.abs(v) < 1e-12 ? 0 : Math.abs(v - 1) < 1e-12 ? 1 : v,
  );
  return `color(${gamut.cssId} ${r} ${g} ${b}${alpha === 1 ? '' : ` / ${alpha}`})`;
}

export interface GamutReport {
  srgb: boolean;
  p3: boolean;
  rec2020: boolean;
  /** Inside the optimal color solid: a physically possible surface color under D65. */
  optimal: boolean;
  /** Each display's max chroma as a share of the optimal solid's, at this lightness and hue. */
  ceiling: Record<DisplayGamutId, number>;
}

export function gamutReport(space: ColorSpace, color: Lch, epsilon = 1e-9): GamutReport {
  const xyz = lchToXyz(space, color);
  const solid = optimalSolid();
  const physical = maxChroma(space, solid, color.l, color.h);
  const [srgb, p3, rec2020] = DISPLAY_GAMUTS.map((gamut) => ({
    inside: containsXyz(gamut, xyz, epsilon),
    share: physical > 0 ? maxChroma(space, gamut, color.l, color.h) / physical : 0,
  })) as [
    { inside: boolean; share: number },
    { inside: boolean; share: number },
    { inside: boolean; share: number },
  ];
  return {
    srgb: srgb.inside,
    p3: p3.inside,
    rec2020: rec2020.inside,
    optimal: containsXyz(solid, xyz, epsilon),
    ceiling: { srgb: srgb.share, p3: p3.share, rec2020: rec2020.share },
  };
}
