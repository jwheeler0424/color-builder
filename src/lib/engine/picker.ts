import type { RGB8, HSLPercent, HSVPercent } from './device.ts';
import type { FormatId } from './formats.ts';
import type { DisplayGamutId } from './gamuts/types.ts';
import type { CmykConverter } from './icc.ts';
import type { Lab, Lch } from './spaces/types.ts';

import { colorValue, renderColor, type ColorValue } from './color.ts';
import { rgbToHsl, rgbToHsv } from './device.ts';
import { formatColor } from './formats.ts';
import { CIELAB } from './spaces/cielab.ts';
import { OKLAB } from './spaces/oklab.ts';
import { clamp, xyzToLch } from './spaces/types.ts';

export interface PickerReadings {
  rgb: RGB8;
  hsl: HSLPercent;
  hsv: HSVPercent;
  oklab: Lab;
  oklch: { L: number; C: number; H: number };
  cmyk: { c: number; m: number; y: number; k: number } | null;
}

export function pickerReadings(value: ColorValue, cmyk?: CmykConverter): PickerReadings {
  const rendition = renderColor(value);
  const rgb = rendition.rgb8;
  const hsl = rgbToHsl(rendition.srgb);
  const hsv = rgbToHsv(rendition.srgb);
  const lab = OKLAB.xyzToLab(value.xyz);
  const lch: Lch = xyzToLch(OKLAB, value.xyz);
  const ink = cmyk?.toCmyk(CIELAB.xyzToLab(value.xyz));
  return {
    rgb,
    hsl: { h: hsl.h, s: clamp(hsl.s * 100, 0, 100), l: clamp(hsl.l * 100, 0, 100) },
    hsv: { h: hsv.h, s: clamp(hsv.s * 100, 0, 100), v: clamp(hsv.l * 100, 0, 100) },
    oklab: lab,
    oklch: { L: lch.l, C: lch.c, H: lch.h },
    cmyk: ink ? { c: ink[0], m: ink[1], y: ink[2], k: ink[3] } : null,
  };
}

export function cmykToColor(
  values: readonly [number, number, number, number],
  converter: CmykConverter,
  display: DisplayGamutId = 'srgb',
): ColorValue {
  return colorValue(CIELAB.labToXyz(converter.toLab(values)), 1, display);
}

export function formatPickerColor(
  value: ColorValue,
  format: Extract<FormatId, 'rgb' | 'hsl' | 'hsv' | 'oklch' | 'oklab' | 'cmyk'>,
  cmyk?: CmykConverter,
): string {
  return formatColor(value, format, { cmyk });
}
