import colorNames from 'color-name';

import type { FormatId } from './formats.ts';
import type { CmykConverter } from './icc.ts';
import type { Vec3 } from './math/matrix.ts';

import { colorValue, renderColor, type ColorValue } from './color.ts';
import { hslToRgb, hsvToRgb } from './device.ts';
import { DISPLAY_GAMUTS, SRGB, encodedToXyz } from './gamuts/rgb.ts';
import { mulVec } from './math/matrix.ts';
import { hexToXyz, isHex } from './output.ts';
import { CAM16_UCS } from './spaces/cam16.ts';
import { CIELAB, XYZ_D65_FROM_D50 } from './spaces/cielab.ts';
import { OKLAB } from './spaces/oklab.ts';
import { lchToLab, type ColorSpace, type Lab } from './spaces/types.ts';

export interface ParsedColor extends ColorValue {
  format: FormatId | 'color' | 'lch';
}

export interface ParseOptions {
  /** Required to read `cmyk(...)`: ink only has a color through an output profile. */
  cmyk?: CmykConverter;
}

export interface ParsedHexInput {
  color: ParsedColor;
  hex: string;
  alphaPercent: number;
  hasAlpha: boolean;
}

export function parseHexInput(input: string): ParsedHexInput | null {
  if (!/^#?(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(input.trim())) return null;
  try {
    const color = parseColor(input);
    return {
      color,
      hex: renderColor(color).hex,
      alphaPercent: Math.round(color.alpha * 100),
      hasAlpha: /^#?(?:[0-9a-f]{8})$/i.test(input.trim()),
    };
  } catch {
    return null;
  }
}

interface Arg {
  value: number;
  percent: boolean;
}

const NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;
const CALL = /^([a-z0-9-]+)\(\s*([^()]*?)\s*\)$/i;

function readArgs(body: string, input: string): Arg[] {
  return body
    .split(/\s*,\s*|\s+/)
    .filter(Boolean)
    .map((part) => {
      let text = part.toLowerCase();
      const percent = text.endsWith('%');
      if (percent) text = text.slice(0, -1);
      let angleScale = 1;
      for (const [suffix, scale] of [
        ['deg', 1],
        ['grad', 0.9],
        ['rad', 180 / Math.PI],
        ['turn', 360],
      ] as const) {
        if (text.endsWith(suffix)) {
          text = text.slice(0, -suffix.length);
          angleScale = scale;
          break;
        }
      }
      if (!NUMBER.test(text)) throw new Error(`"${part}" is not a number in "${input}".`);
      const value = Number(text) * angleScale;
      if (!Number.isFinite(value)) throw new Error(`"${part}" is not finite in "${input}".`);
      return { value, percent };
    });
}

/** `scale` is what 100% means; plain numbers are taken as they are. */
const scaled = ({ value, percent }: Arg, scale: number) =>
  percent ? (value / 100) * scale : value;

function inRange(value: number, min: number, max: number, what: string, input: string): number {
  if (!(value >= min && value <= max)) {
    throw new Error(`${what} must be between ${min} and ${max} in "${input}".`);
  }
  return value;
}

function perceptual(space: ColorSpace, lab: Lab, input: string): Vec3 {
  // Allow float noise from round trips, e.g. white's lightness 1.0000000000000002.
  const slack = space.lightnessMax * 1e-9;
  inRange(lab.L, -slack, space.lightnessMax + slack, 'Lightness', input);
  return space.labToXyz(lab);
}

/**
 * Reads one color: hex (`#rgb`, `#rrggbb`), or `rgb()`, `hsl()`, `hsv()`, `cmyk()`/`device-cmyk()`,
 * `oklch()`, `oklab()`, `lab()` (CIELAB D50) or `cam16ucs()` with space- or comma-separated values,
 * as written by `formatColor`. Throws with a readable message when the input is not a color.
 */
export function parseColor(input: string, { cmyk }: ParseOptions = {}): ParsedColor {
  const text = input.trim().toLowerCase();
  if (isHex(text)) return { ...colorValue(hexToXyz(text)), format: 'hex' };
  if (/^#?[\da-f]{4}$|^#?[\da-f]{8}$/i.test(text)) {
    let hex = text.replace(/^#/, '');
    if (hex.length === 4) hex = hex.replace(/./g, '$&$&');
    return {
      ...colorValue(hexToXyz(hex.slice(0, 6)), parseInt(hex.slice(6), 16) / 255),
      format: 'hex',
    };
  }
  if (text === 'transparent') return { ...colorValue([0, 0, 0], 0), format: 'rgb' };
  if (Object.hasOwn(colorNames, text)) {
    const rgb = colorNames[text as keyof typeof colorNames];
    return {
      ...colorValue(encodedToXyz(SRGB, [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255])),
      format: 'rgb',
    };
  }

  const call = CALL.exec(text);
  if (!call) throw new Error(`"${input}" is not a recognized color.`);
  const name = call[1]!.replace(/^rgba$/, 'rgb').replace(/^hsla$/, 'hsl');
  const parts = call[2]!.split('/');
  if (parts.length > 2) throw new Error(`Invalid alpha in "${input}".`);
  let body = parts[0]!;
  let display: ColorValue['display'] = 'srgb';
  let colorSpace = '';
  if (name === 'color') {
    const match = /^([a-z0-9-]+)\s+(.+)$/.exec(body);
    if (!match) throw new Error(`Missing color space in "${input}".`);
    colorSpace = match[1]!;
    body = match[2]!;
    const gamut = DISPLAY_GAMUTS.find((entry) => entry.cssId === colorSpace);
    if (gamut) display = gamut.id;
  }
  const args = readArgs(body, input);
  const expected = name === 'cmyk' || name === 'device-cmyk' ? 4 : 3;
  let alpha = 1;
  if (parts[1] !== undefined) {
    const alphaArgs = readArgs(parts[1], input);
    if (alphaArgs.length !== 1) throw new Error(`Invalid alpha in "${input}".`);
    alpha = inRange(scaled(alphaArgs[0]!, 1), 0, 1, 'Alpha', input);
  } else if (args.length === expected + 1 && (call[1] === 'rgba' || call[1] === 'hsla')) {
    alpha = inRange(scaled(args.pop()!, 1), 0, 1, 'Alpha', input);
  }
  if (args.length !== expected) {
    throw new Error(`${name}() takes ${expected} values, got ${args.length} in "${input}".`);
  }
  const [a, b, c, d] = args as [Arg, Arg, Arg, Arg?];
  const unit = (arg: Arg, what: string) => inRange(scaled(arg, 100) / 100, 0, 1, what, input);
  const result = (xyz: Vec3, format: ParsedColor['format']): ParsedColor => ({
    ...colorValue(xyz, alpha, display),
    format,
  });

  switch (name) {
    case 'color': {
      const coordinates: Vec3 = [scaled(a, 1), scaled(b, 1), scaled(c, 1)];
      const gamut = DISPLAY_GAMUTS.find((entry) => entry.cssId === colorSpace);
      if (gamut) return result(encodedToXyz(gamut, coordinates), 'color');
      if (colorSpace === 'xyz' || colorSpace === 'xyz-d65') return result(coordinates, 'color');
      if (colorSpace === 'xyz-d50') return result(mulVec(XYZ_D65_FROM_D50, coordinates), 'color');
      throw new Error(`Unsupported color space: "${colorSpace}".`);
    }
    case 'rgb': {
      const channel = (arg: Arg) =>
        inRange(arg.percent ? arg.value / 100 : arg.value / 255, 0, 1, 'RGB channels', input);
      return result(encodedToXyz(SRGB, [channel(a), channel(b), channel(c)]), 'rgb');
    }
    case 'hsl':
    case 'hsv': {
      const hsx = { h: a.value, s: unit(b, 'Saturation'), l: unit(c, 'Lightness') };
      const rgb = name === 'hsl' ? hslToRgb(hsx) : hsvToRgb(hsx);
      return result(encodedToXyz(SRGB, rgb), name);
    }
    case 'oklch':
    case 'oklab': {
      const L = scaled(a, 1);
      const lab =
        name === 'oklch'
          ? lchToLab({ l: L, c: inRange(scaled(b, 0.4), 0, Infinity, 'Chroma', input), h: c.value })
          : { L, a: scaled(b, 0.4), b: scaled(c, 0.4) };
      return result(perceptual(OKLAB, lab, input), name);
    }
    case 'lab':
      return result(
        perceptual(CIELAB, { L: scaled(a, 100), a: scaled(b, 125), b: scaled(c, 125) }, input),
        'cielab',
      );
    case 'lch':
      return result(
        perceptual(
          CIELAB,
          lchToLab({
            l: scaled(a, 100),
            c: inRange(scaled(b, 150), 0, Infinity, 'Chroma', input),
            h: c.value,
          }),
          input,
        ),
        'lch',
      );
    case 'cam16ucs':
      return result(
        perceptual(CAM16_UCS, { L: scaled(a, 100), a: b.value, b: c.value }, input),
        'cam16ucs',
      );
    case 'cmyk':
    case 'device-cmyk': {
      if (!cmyk) throw new Error('Load a CMYK ICC profile to read CMYK values.');
      const ink = (arg: Arg) =>
        inRange(arg.percent ? arg.value : arg.value * 100, 0, 100, 'Ink', input);
      return result(CIELAB.labToXyz(cmyk.toLab([ink(a), ink(b), ink(c), ink(d!)])), 'cmyk');
    }
  }
  throw new Error(`"${name}()" is not a supported color format.`);
}
