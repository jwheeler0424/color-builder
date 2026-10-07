import type { RGB8 } from './device.ts';
import type { DisplayGamutId } from './gamuts/types.ts';
import type { Vec3 } from './math/matrix.ts';

import { DISPLAY_GAMUTS, SRGB, xyzToEncoded } from './gamuts/rgb.ts';
import { containsXyz } from './gamuts/types.ts';
import { cssColor, fitHex, hexToRgb8 } from './output.ts';
import { fitToGamut } from './solver.ts';
import { OKLAB } from './spaces/oklab.ts';
import { lchToXyz, xyzToLch } from './spaces/types.ts';

export interface ColorValue {
  xyz: Vec3;
  alpha: number;
  display: DisplayGamutId;
}

export interface ColorRendition {
  hex: string;
  rgb8: RGB8;
  srgb: Vec3;
  xyz: Vec3;
  css: string;
  displayLimited: boolean;
  srgbLimited: boolean;
}

export function colorValue(xyz: Vec3, alpha = 1, display: DisplayGamutId = 'srgb'): ColorValue {
  if (!Array.isArray(xyz) || xyz.length !== 3 || !xyz.every(Number.isFinite)) {
    throw new Error('Color coordinates must be three finite D65 XYZ values.');
  }
  if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) {
    throw new Error('Color alpha must be between 0 and 1.');
  }
  if (!DISPLAY_GAMUTS.some((gamut) => gamut.id === display)) {
    throw new Error(`Unknown display gamut: ${display}.`);
  }
  return { xyz: [xyz[0], xyz[1], xyz[2]], alpha, display };
}

export function renderColor(input: ColorValue): ColorRendition {
  const color = colorValue(input.xyz, input.alpha, input.display);
  const gamut = DISPLAY_GAMUTS.find((entry) => entry.id === color.display)!;
  const lch = xyzToLch(OKLAB, color.xyz);
  const displayLimited = !containsXyz(gamut, color.xyz, 1e-9);
  const xyz = displayLimited ? lchToXyz(OKLAB, fitToGamut(OKLAB, gamut, lch)) : color.xyz;
  const srgbLimited = !containsXyz(SRGB, color.xyz, 1e-9);
  const srgbXyz = srgbLimited ? lchToXyz(OKLAB, fitToGamut(OKLAB, SRGB, lch)) : color.xyz;
  const hex = fitHex(OKLAB, lch);
  return {
    hex,
    rgb8: hexToRgb8(hex),
    srgb: xyzToEncoded(SRGB, srgbXyz),
    xyz,
    css: cssColor(gamut, xyz, color.alpha),
    displayLimited,
    srgbLimited,
  };
}

export function compositeColor(foreground: ColorValue, background: ColorValue): ColorValue {
  const front = colorValue(foreground.xyz, foreground.alpha, foreground.display);
  const back = colorValue(background.xyz, background.alpha, background.display);
  const alpha = front.alpha + back.alpha * (1 - front.alpha);
  const xyz = front.xyz.map((value, index) =>
    alpha === 0
      ? 0
      : (value * front.alpha + back.xyz[index]! * back.alpha * (1 - front.alpha)) / alpha,
  ) as unknown as Vec3;
  return colorValue(xyz, alpha, front.display);
}
