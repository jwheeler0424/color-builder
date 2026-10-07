import type { Vec3 } from './math/matrix.ts';

import { SRGB, encodedToXyz, xyzToEncoded } from './gamuts/rgb.ts';
import { fitHex, hexToXyz } from './output.ts';
import { fitChroma } from './solver.ts';
import { OKLAB } from './spaces/oklab.ts';
import { clamp, lchToXyz, xyzToLch } from './spaces/types.ts';

export const WHITE_XYZ: Vec3 = encodedToXyz(SRGB, [1, 1, 1]);
export const BLACK_XYZ: Vec3 = [0, 0, 0];

/** WCAG relative luminance: XYZ Y, clipped to the display range. */
export const luminance = (xyz: Vec3): number => clamp(xyz[1], 0, 1);

/** WCAG 2 contrast ratio, 1..21. */
export function contrastRatio(a: Vec3, b: Vec3): number {
  const la = luminance(a);
  const lb = luminance(b);
  return la > lb ? (la + 0.05) / (lb + 0.05) : (lb + 0.05) / (la + 0.05);
}

export type WcagLevel = 'AAA' | 'AA' | 'AA Large' | 'Fail';

export function wcagLevel(ratio: number): WcagLevel {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'AA Large';
  return 'Fail';
}

/** White or black text, whichever contrasts more with `background`. */
export const textColor = (background: Vec3): '#ffffff' | '#000000' =>
  contrastRatio(background, WHITE_XYZ) >= contrastRatio(background, BLACK_XYZ)
    ? '#ffffff'
    : '#000000';

// APCA-W3 0.0.98G-4g constants.
const APCA_BLACK_THRESHOLD = 0.022;
const APCA_BLACK_CLAMP = 1.414;
const APCA_SCALE = 1.14;
const APCA_OFFSET = 0.027;
const APCA_LO_CLIP = 0.1;
const APCA_DELTA_Y_MIN = 0.0005;

/** APCA screen luminance: simple 2.4 exponent on clipped encoded sRGB, with APCA's coefficients. */
function apcaY(xyz: Vec3): number {
  const [r, g, b] = xyzToEncoded(SRGB, xyz).map((v) => clamp(v, 0, 1) ** 2.4) as unknown as Vec3;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  return y > APCA_BLACK_THRESHOLD ? y : y + (APCA_BLACK_THRESHOLD - y) ** APCA_BLACK_CLAMP;
}

/** APCA lightness contrast Lc: positive for dark text on light, negative for light on dark. */
export function apcaContrast(text: Vec3, background: Vec3): number {
  const txt = apcaY(text);
  const bg = apcaY(background);
  if (Math.abs(bg - txt) < APCA_DELTA_Y_MIN) return 0;
  if (bg > txt) {
    const sapc = (bg ** 0.56 - txt ** 0.57) * APCA_SCALE;
    return sapc < APCA_LO_CLIP ? 0 : (sapc - APCA_OFFSET) * 100;
  }
  const sapc = (bg ** 0.65 - txt ** 0.62) * APCA_SCALE;
  return sapc > -APCA_LO_CLIP ? 0 : (sapc + APCA_OFFSET) * 100;
}

export type ApcaLevel = 'Preferred' | 'Body' | 'Large' | 'UI' | 'Fail';

export function apcaLevel(lc: number): ApcaLevel {
  const magnitude = Math.abs(lc);
  if (magnitude >= 75) return 'Preferred';
  if (magnitude >= 60) return 'Body';
  if (magnitude >= 45) return 'Large';
  if (magnitude >= 30) return 'UI';
  return 'Fail';
}

export interface ContrastFix {
  hex: string;
  direction: 'lighten' | 'darken';
}

/**
 * The smallest OKLCH lightness change (hue kept, chroma eased off 30% per unit of lightness moved
 * and fitted to sRGB) whose 8-bit color reaches `target` against `background`; null if it already
 * does. When neither direction can reach the target, the end with the most contrast is returned.
 */
export function contrastFix(color: Vec3, background: Vec3, target = 4.5): ContrastFix | null {
  if (contrastRatio(color, background) >= target) return null;
  const { l, c, h } = xyzToLch(OKLAB, color);
  const at = (lightness: number) => {
    const chroma = c * (1 - Math.abs(lightness - l) * 0.3);
    return { l: lightness, c: fitChroma(OKLAB, SRGB, lightness, h, chroma), h };
  };
  const ratioAt = (lightness: number) => contrastRatio(lchToXyz(OKLAB, at(lightness)), background);

  const preferred =
    contrastRatio(background, BLACK_XYZ) > contrastRatio(background, WHITE_XYZ) ? 0 : 1;
  const end =
    ratioAt(preferred) >= target || ratioAt(1 - preferred) < target ? preferred : 1 - preferred;
  const direction = end === 1 ? 'lighten' : 'darken';
  if (ratioAt(end) < target) return { hex: fitHex(OKLAB, at(end)), direction };

  let near = l;
  let far = end;
  for (let i = 0; i < 50 && Math.abs(far - near) > 1e-9; i++) {
    const mid = (near + far) / 2;
    if (ratioAt(mid) >= target) far = mid;
    else near = mid;
  }
  // 8-bit rounding can land just short; step on until the hex itself passes.
  const step = end === 1 ? 0.001 : -0.001;
  for (let lightness = far; ; lightness = clamp(lightness + step, 0, 1)) {
    const hex = fitHex(OKLAB, at(lightness));
    if (contrastRatio(hexToXyz(hex), background) >= target || lightness === end) {
      return { hex, direction };
    }
  }
}
