/**
 * HSL and HSV: cylindrical re-parametrizations of the sRGB cube (encoded values, 0..1).
 * Every (h, s, l|v) with s, l, v in [0, 1] is an sRGB color, so these spaces need no gamut solving.
 */
import type { Vec3 } from './math/matrix.ts';

import { mod360 } from './spaces/types.ts';

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
