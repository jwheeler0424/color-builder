import type { DisplayGamutId } from './gamuts/types.ts';
import type { Vec3 } from './math/matrix.ts';

import { colorValue, type ColorValue } from './color.ts';
import { hslToRgb, rgbToHsl } from './device.ts';
import { DISPLAY_GAMUTS, SRGB, encodedToXyz, xyzToEncoded } from './gamuts/rgb.ts';
import { OKLAB } from './spaces/oklab.ts';
import { clamp, lchToXyz, mod360, xyzToLch } from './spaces/types.ts';

export type MixSpace = 'oklab' | 'oklch' | 'hsl' | 'rgb';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const encoded = (xyz: Vec3) =>
  xyzToEncoded(SRGB, xyz).map((v) => clamp(v, 0, 1)) as unknown as Vec3;

/**
 * The color a fraction `t` of the way from `a` to `b` (XYZ D65 in and out). OKLab interpolates
 * perceptually and may leave sRGB; HSL takes the shorter way round the hue circle; RGB is a plain
 * blend of encoded sRGB. HSL and RGB clip their inputs to sRGB.
 */
export function mix(a: Vec3, b: Vec3, t: number, space: MixSpace = 'oklab'): Vec3 {
  if (!Number.isFinite(t)) throw new Error('Mix progress must be finite.');
  if (space === 'oklch') {
    const first = xyzToLch(OKLAB, a);
    const second = xyzToLch(OKLAB, b);
    const hue = first.c <= OKLAB.achromaticChroma ? second.h : first.h;
    const endHue = second.c <= OKLAB.achromaticChroma ? hue : second.h;
    const shift = mod360(endHue - hue + 180) - 180;
    return lchToXyz(OKLAB, {
      l: lerp(first.l, second.l, t),
      c: lerp(first.c, second.c, t),
      h: mod360(hue + shift * t),
    });
  }
  if (space === 'oklab') {
    const x = OKLAB.xyzToLab(a);
    const y = OKLAB.xyzToLab(b);
    return OKLAB.labToXyz({ L: lerp(x.L, y.L, t), a: lerp(x.a, y.a, t), b: lerp(x.b, y.b, t) });
  }
  const ra = encoded(a);
  const rb = encoded(b);
  if (space === 'rgb') {
    return encodedToXyz(SRGB, [
      lerp(ra[0], rb[0], t),
      lerp(ra[1], rb[1], t),
      lerp(ra[2], rb[2], t),
    ]);
  }
  const x = rgbToHsl(ra);
  const y = rgbToHsl(rb);
  // A gray has no hue of its own: borrow the other end's so the blend doesn't swing through red.
  const hx = x.s === 0 ? y.h : x.h;
  const hy = y.s === 0 ? x.h : y.h;
  const dh = mod360(hy - hx + 180) - 180;
  return encodedToXyz(
    SRGB,
    hslToRgb({ h: mod360(hx + dh * t), s: lerp(x.s, y.s, t), l: lerp(x.l, y.l, t) }),
  );
}

export interface MixOptions {
  display?: DisplayGamutId;
  rgbGamut?: DisplayGamutId;
}

export function mixColor(
  first: ColorValue,
  second: ColorValue,
  progress: number,
  space: MixSpace = 'oklab',
  options: MixOptions = {},
): ColorValue {
  const front = colorValue(first.xyz, first.alpha, first.display);
  const back = colorValue(second.xyz, second.alpha, second.display);
  const display = options.display ?? front.display;
  if (!Number.isFinite(progress) || progress < 0 || progress > 1)
    throw new Error('Mix progress must be between 0 and 1.');
  if (progress === 0) return colorValue(front.xyz, front.alpha, display);
  if (progress === 1) return colorValue(back.xyz, back.alpha, display);
  const alpha = lerp(front.alpha, back.alpha, progress);
  if (alpha === 0) return colorValue([0, 0, 0], 0, display);
  const weight = (back.alpha * progress) / alpha;
  if (space === 'oklch') {
    const weighted = xyzToLch(OKLAB, mix(front.xyz, back.xyz, weight, 'oklch'));
    const hue = xyzToLch(OKLAB, mix(front.xyz, back.xyz, progress, 'oklch')).h;
    return colorValue(lchToXyz(OKLAB, { ...weighted, h: hue }), alpha, display);
  }
  if (space === 'rgb' || space === 'hsl') {
    const gamut = DISPLAY_GAMUTS.find((entry) => entry.id === (options.rgbGamut ?? 'srgb'));
    if (!gamut) throw new Error('Unknown RGB interpolation gamut.');
    const left = xyzToEncoded(gamut, front.xyz);
    const right = xyzToEncoded(gamut, back.xyz);
    if (space === 'rgb')
      return colorValue(
        encodedToXyz(gamut, [
          lerp(left[0], right[0], weight),
          lerp(left[1], right[1], weight),
          lerp(left[2], right[2], weight),
        ]),
        alpha,
        display,
      );
    const start = rgbToHsl(left.map((value) => clamp(value, 0, 1)) as unknown as Vec3);
    const end = rgbToHsl(right.map((value) => clamp(value, 0, 1)) as unknown as Vec3);
    const hue = start.s === 0 ? end.h : start.h;
    const endHue = end.s === 0 ? hue : end.h;
    return colorValue(
      encodedToXyz(
        gamut,
        hslToRgb({
          h: mod360(hue + (mod360(endHue - hue + 180) - 180) * progress),
          s: lerp(start.s, end.s, weight),
          l: lerp(start.l, end.l, weight),
        }),
      ),
      alpha,
      display,
    );
  }
  return colorValue(mix(front.xyz, back.xyz, weight, space), alpha, display);
}
