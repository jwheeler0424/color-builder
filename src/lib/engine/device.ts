/**
 * HSL and HSV: cylindrical re-parametrizations of the sRGB cube (encoded values, 0..1).
 * Every (h, s, l|v) with s, l, v in [0, 1] is an sRGB color, so these spaces need no gamut solving.
 */
import type { Vec3 } from './math/matrix.ts';

import { SRGB, encodedToXyz, xyzToEncoded } from './gamuts/rgb.ts';
import { mod360 } from './spaces/types.ts';

export interface RGB8 {
  r: number;
  g: number;
  b: number;
}

export interface HSLPercent {
  h: number;
  s: number;
  l: number;
}

export interface HSVPercent {
  h: number;
  s: number;
  v: number;
}

export interface Hsx {
  h: number;
  s: number;
  /** Lightness for HSL, value for HSV. */
  l: number;
}

function hueOf([r, g, b]: Vec3, max: number, delta: number): number {
  if (delta === 0) return 0;
  if (max === r) return mod360(60 * ((g - b) / delta));
  if (max === g) return 60 * ((b - r) / delta + 2);
  return 60 * ((r - g) / delta + 4);
}

export function rgbToHsl(rgb: Vec3): Hsx {
  const max = Math.max(...rgb);
  const min = Math.min(...rgb);
  const delta = max - min;
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return { h: hueOf(rgb, max, delta), s, l };
}

export function rgbToHsv(rgb: Vec3): Hsx {
  const max = Math.max(...rgb);
  const delta = max - Math.min(...rgb);
  return { h: hueOf(rgb, max, delta), s: max === 0 ? 0 : delta / max, l: max };
}

/** The shared hexcone: chroma c at hue h, lifted by m. */
function fromChroma(h: number, c: number, m: number): Vec3 {
  const hp = mod360(h) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r, g, b] =
    hp < 1
      ? [c, x, 0]
      : hp < 2
        ? [x, c, 0]
        : hp < 3
          ? [0, c, x]
          : hp < 4
            ? [0, x, c]
            : hp < 5
              ? [x, 0, c]
              : [c, 0, x];
  return [r + m, g + m, b + m];
}

export function hslToRgb({ h, s, l }: Hsx): Vec3 {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  return fromChroma(h, c, l - c / 2);
}

export function hsvToRgb({ h, s, l: v }: Hsx): Vec3 {
  const c = v * s;
  return fromChroma(h, c, v - c);
}

function validateRgb8({ r, g, b }: RGB8): Vec3 {
  const channels = [r, g, b];
  if (!channels.every((value) => Number.isInteger(value) && value >= 0 && value <= 255)) {
    throw new Error('8-bit RGB channels must be integers between 0 and 255.');
  }
  return [r / 255, g / 255, b / 255];
}

function byteChannels(rgb: Vec3): RGB8 {
  return {
    r: Math.round(Math.min(1, Math.max(0, rgb[0])) * 255),
    g: Math.round(Math.min(1, Math.max(0, rgb[1])) * 255),
    b: Math.round(Math.min(1, Math.max(0, rgb[2])) * 255),
  };
}

export function rgb8ToXyz(rgb: RGB8): Vec3 {
  return encodedToXyz(SRGB, validateRgb8(rgb));
}

export function xyzToRgb8(xyz: Vec3): RGB8 {
  return byteChannels(xyzToEncoded(SRGB, xyz));
}

export function rgb8ToHslPercent(rgb: RGB8): HSLPercent {
  const { h, s, l } = rgbToHsl(validateRgb8(rgb));
  return { h, s: s * 100, l: l * 100 };
}

export function hslPercentToRgb8(hsl: HSLPercent): RGB8 {
  if (
    ![hsl.h, hsl.s, hsl.l].every(Number.isFinite) ||
    hsl.s < 0 ||
    hsl.s > 100 ||
    hsl.l < 0 ||
    hsl.l > 100
  ) {
    throw new Error('HSL saturation and lightness must be percentages between 0 and 100.');
  }
  return byteChannels(hslToRgb({ h: hsl.h, s: hsl.s / 100, l: hsl.l / 100 }));
}

export function rgb8ToHsvPercent(rgb: RGB8): HSVPercent {
  const { h, s, l } = rgbToHsv(validateRgb8(rgb));
  return { h, s: s * 100, v: l * 100 };
}

export function hsvPercentToRgb8(hsv: HSVPercent): RGB8 {
  if (
    ![hsv.h, hsv.s, hsv.v].every(Number.isFinite) ||
    hsv.s < 0 ||
    hsv.s > 100 ||
    hsv.v < 0 ||
    hsv.v > 100
  ) {
    throw new Error('HSV saturation and value must be percentages between 0 and 100.');
  }
  return byteChannels(hsvToRgb({ h: hsv.h, s: hsv.s / 100, l: hsv.v / 100 }));
}
