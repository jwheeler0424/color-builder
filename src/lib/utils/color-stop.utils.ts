import type { ColorStop, PaletteSlot } from '@/types';

import {
  colorValue,
  hexToEncoded,
  parseColor,
  renderColor,
  rgbToHsl,
  type ColorValue,
} from '@/lib/engine/browser';

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
  const channels = hexToEncoded(rendition.hex);
  const hsl = rgbToHsl(channels);
  return {
    value: canonical,
    css: rendition.css,
    hex: rendition.hex,
    rgb: {
      r: Math.round(channels[0] * 255),
      g: Math.round(channels[1] * 255),
      b: Math.round(channels[2] * 255),
    },
    hsl: { h: hsl.h, s: hsl.s * 100, l: hsl.l * 100 },
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
