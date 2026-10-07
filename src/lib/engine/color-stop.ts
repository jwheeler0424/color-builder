import type { ColorValue } from './color.ts';
import type { HSLPercent, RGB8 } from './device.ts';

import { colorValue, renderColor } from './color.ts';
import { rgb8ToHslPercent } from './device.ts';
import { parseColor } from './parse.ts';

export interface ColorStop {
  value?: ColorValue;
  css?: string;
  hex: string;
  readonly rgb: RGB8;
  readonly hsl: HSLPercent;
  a?: number;
}

export interface PaletteSlot {
  id: string;
  color: ColorStop;
  locked: boolean;
  name?: string;
}

export function stopToColor(stop: ColorStop): ColorValue {
  return stop.value
    ? colorValue(stop.value.xyz, stop.value.alpha, stop.value.display)
    : parseStopInput(stop.hex, stop.a);
}

function parseStopInput(input: string, alpha?: number): ColorValue {
  const parsed = parseColor(input);
  const explicit =
    /^#?[\da-f]{4}$|^#?[\da-f]{8}$/i.test(input.trim()) ||
    input.includes('/') ||
    /^\s*(rgba|hsla)\(/i.test(input) ||
    input.trim().toLowerCase() === 'transparent';
  return colorValue(
    parsed.xyz,
    !explicit && alpha !== undefined ? alpha / 100 : parsed.alpha,
    parsed.display,
  );
}

export function colorToStop(value: ColorValue): ColorStop {
  const canonical = colorValue(value.xyz, value.alpha, value.display);
  const rendition = renderColor(canonical);
  return {
    value: canonical,
    css: rendition.css,
    hex: rendition.hex,
    rgb: rendition.rgb8,
    hsl: rgb8ToHslPercent(rendition.rgb8),
    ...(canonical.alpha < 1 ? { a: canonical.alpha * 100 } : {}),
  };
}

export function cloneSlot(slot: PaletteSlot): PaletteSlot {
  return {
    id: slot.id,
    color: colorToStop(stopToColor(slot.color)),
    locked: slot.locked,
    name: slot.name,
  };
}

export function hexToStop(input: string, alpha?: number): ColorStop {
  return colorToStop(parseStopInput(input, alpha));
}
