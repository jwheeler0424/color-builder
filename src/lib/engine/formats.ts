import type { CmykConverter } from './icc.ts';
import type { Vec3 } from './math/matrix.ts';

import { rgbToHsl, rgbToHsv } from './device.ts';
import { hexToEncoded } from './output.ts';
import { CAM16_UCS } from './spaces/cam16.ts';
import { CIELAB } from './spaces/cielab.ts';
import { OKLAB } from './spaces/oklab.ts';
import { labToLch } from './spaces/types.ts';

export type FormatId =
  | 'hex'
  | 'rgb'
  | 'cmyk'
  | 'hsl'
  | 'hsv'
  | 'oklch'
  | 'oklab'
  | 'cielab'
  | 'cam16ucs';

export const FORMATS: ReadonlyArray<{ id: FormatId; label: string; desc: string }> = [
  { id: 'hex', label: 'HEX', desc: 'Best 8-bit sRGB match.' },
  { id: 'rgb', label: 'RGB', desc: '8-bit sRGB channels, same color as the hex.' },
  { id: 'cmyk', label: 'CMYK', desc: 'Ink percentages through a loaded ICC output profile.' },
  { id: 'hsl', label: 'HSL', desc: 'sRGB hue, saturation, lightness.' },
  { id: 'hsv', label: 'HSV', desc: 'sRGB hue, saturation, value.' },
  { id: 'oklch', label: 'OKLCH', desc: 'OKLab lightness, chroma, hue.' },
  { id: 'oklab', label: 'OKLab', desc: 'OKLab lightness and opponent axes a, b.' },
  { id: 'cielab', label: 'CIELAB', desc: 'CIE L*a*b* with a D50 white, as in CSS lab().' },
  {
    id: 'cam16ucs',
    label: 'CAM16-UCS',
    desc: "CAM16-UCS J', a', b' under the default web viewing conditions (not a CSS syntax).",
  },
];

export interface FormattableColor {
  hex: string;
  alpha?: number;
  /** Exact XYZ (D65) of the color. */
  xyz: Vec3;
  /** Exact encoded sRGB of its sRGB rendition, 0..1. */
  srgb: Vec3;
}

export interface FormatOptions {
  /** Full float precision instead of display rounding. */
  precise?: boolean;
  cmyk?: CmykConverter;
}

const unit = (v: number) => Math.min(1, Math.max(0, v));

/** One color written in one format, e.g. `oklch(0.623 0.188 259.8)`. */
function formatOpaqueColor(
  color: FormattableColor,
  format: FormatId,
  { precise = false, cmyk }: FormatOptions = {},
): string {
  const n = (v: number, digits: number) =>
    precise ? String(v) : String(Number(v.toFixed(digits)));
  const pct = (v: number) => `${n(v * 100, 1)}%`;

  switch (format) {
    case 'hex':
      return color.hex;
    case 'rgb': {
      const [r, g, b] = hexToEncoded(color.hex).map((v) => Math.round(v * 255));
      return `rgb(${r} ${g} ${b})`;
    }
    case 'hsl': {
      const { h, s, l } = rgbToHsl(color.srgb.map(unit) as unknown as Vec3);
      return `hsl(${n(h, 1)} ${pct(s)} ${pct(l)})`;
    }
    case 'hsv': {
      const { h, s, l } = rgbToHsv(color.srgb.map(unit) as unknown as Vec3);
      return `hsv(${n(h, 1)} ${pct(s)} ${pct(l)})`;
    }
    case 'oklch': {
      const { l, c, h } = labToLch(OKLAB, OKLAB.xyzToLab(color.xyz));
      return `oklch(${n(l, 3)} ${n(c, 4)} ${n(h, 1)})`;
    }
    case 'oklab': {
      const { L, a, b } = OKLAB.xyzToLab(color.xyz);
      return `oklab(${n(L, 3)} ${n(a, 4)} ${n(b, 4)})`;
    }
    case 'cielab': {
      const { L, a, b } = CIELAB.xyzToLab(color.xyz);
      return `lab(${n(L, 2)} ${n(a, 2)} ${n(b, 2)})`;
    }
    case 'cam16ucs': {
      const { L, a, b } = CAM16_UCS.xyzToLab(color.xyz);
      return `cam16ucs(${n(L, 2)} ${n(a, 2)} ${n(b, 2)})`;
    }
    case 'cmyk': {
      if (!cmyk) return 'cmyk: load an ICC profile';
      const [c, m, y, k] = cmyk.toCmyk(CIELAB.xyzToLab(color.xyz));
      const p = (v: number) => `${n(v, 1)}%`;
      return `cmyk(${p(c)} ${p(m)} ${p(y)} ${p(k)})`;
    }
  }
}

export function formatColor(
  color: FormattableColor,
  format: FormatId,
  options: FormatOptions = {},
): string {
  const alpha = color.alpha ?? 1;
  if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1)
    throw new Error('Color alpha must be between 0 and 1.');
  const text = formatOpaqueColor(color, format, options);
  if (alpha === 1) return text;
  if (format === 'hex')
    return `${text}${Math.round(alpha * 255)
      .toString(16)
      .padStart(2, '0')}`;
  if (!text.endsWith(')')) return text;
  return `${text.slice(0, -1)} / ${alpha})`;
}
