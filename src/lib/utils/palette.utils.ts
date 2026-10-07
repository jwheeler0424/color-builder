import type { HarmonyMode, ColorStop, SavedPalette, RGB } from '@/types';

import {
  colorValue,
  composePalette,
  parseColor,
  renderColor,
  type ColorValue,
  type PaletteCompositionConfig,
  encodedToXyz,
  SRGB,
  extractColors as extractPixels,
} from '@/lib/engine/browser';
import { lookupColorName } from '@/lib/tools/color-names';

import { rgbToHex, hslToRgb } from './color-math.utils';
import { colorToStop, stopToColor } from './color-stop.utils';
export { colorToStop, stopToColor, cloneSlot, hexToStop } from './color-stop.utils';

export function nearestName(input: RGB | ColorStop | ColorValue): string {
  if ('xyz' in input) return lookupColorName(input, renderColor(input).hex);
  if ('hex' in input) return lookupColorName(stopToColor(input), input.hex);
  const value = colorValue(encodedToXyz(SRGB, [input.r / 255, input.g / 255, input.b / 255]));
  return lookupColorName(value, rgbToHex(input));
}

export function genPalette(
  mode: HarmonyMode,
  count: number,
  seeds: { h: number; s: number; l: number }[] | null, // incoming seeds are still in HSL (from picker/store)
  seedMode: 'influence' | 'pin' = 'influence',
  temperature: number = 0, // -1 (cool) to +1 (warm) — biases base hue
): ColorStop[] {
  return generatePalette({
    harmony: mode,
    count,
    seeds: seeds?.map((seed) => parseColor(rgbToHex(hslToRgb(seed)))) ?? [],
    seedMode,
    temperature,
  });
}

export function generatePalette(config: PaletteCompositionConfig): ColorStop[] {
  return composePalette(config).map(colorToStop);
}

// ─── Image Extraction — median-cut quantization ───────────────────────────────

export async function extractColors(file: File, count = 8): Promise<ColorStop[]> {
  return new Promise((resolve, reject) => {
    const objUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objUrl);
      const scale = Math.min(1, 200 / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      try {
        const context = c.getContext('2d', { colorSpace: 'display-p3' });
        if (!context) throw new Error('Image decoding is unavailable.');
        context.drawImage(img, 0, 0, w, h);
        const canvasSpace = context.getContextAttributes?.().colorSpace ?? 'srgb';
        let pixels: ImageData;
        try {
          pixels = context.getImageData(0, 0, w, h, { colorSpace: canvasSpace });
        } catch {
          pixels = context.getImageData(0, 0, w, h);
        }
        const pixelGamut = pixels.colorSpace === 'display-p3' ? 'p3' : 'srgb';
        resolve(
          extractPixels(pixels.data, { count, pixelGamut }).map((color) =>
            colorToStop(colorValue(color.xyz, 1, color.display)),
          ),
        );
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objUrl);
      reject(new Error('Could not decode this image.'));
    };
    img.src = objUrl;
  });
}

// ─── localStorage ─────────────────────────────────────────────────────────────

const LS_KEY = 'chroma:palettes';
const LS_PREF_KEY = 'chroma:prefs';

export function loadSaved(): SavedPalette[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  } catch {
    return [];
  }
}
export function savePalette(
  name: string,
  hexes: string[],
  mode: HarmonyMode,
  slotNames?: (string | undefined)[],
): SavedPalette {
  const saved = loadSaved();
  const entry: SavedPalette = {
    id: crypto.randomUUID(),
    name,
    hexes,
    slotNames,
    mode,
    createdAt: Date.now(),
  };
  localStorage.setItem(LS_KEY, JSON.stringify([entry, ...saved].slice(0, 50)));
  return entry;
}
export function deleteSaved(id: string): void {
  localStorage.setItem(LS_KEY, JSON.stringify(loadSaved().filter((p) => p.id !== id)));
}
export function clearSaved(): void {
  localStorage.removeItem(LS_KEY);
}

// Persist user prefs (mode + count)
export function savePrefs(mode: HarmonyMode, count: number): void {
  localStorage.setItem(LS_PREF_KEY, JSON.stringify({ mode, count }));
}

// ─── URL encode/decode ────────────────────────────────────────────────────────

/** Safe check — returns false during SSR where window/location don't exist */
const isBrowser = typeof window !== 'undefined';

export function encodeUrl(hexes: string[], mode: HarmonyMode): string {
  if (!isBrowser) return '';
  const base = `${location.origin}${location.pathname}`;
  return `${base}#p=${hexes.map((h) => h.replace('#', '')).join('-')}&m=${mode}`;
}

export function decodeUrl(): { hexes: string[]; mode: HarmonyMode } | null {
  if (!isBrowser) return null; // SSR — no location, no hash
  try {
    const p = new URLSearchParams(location.hash.slice(1));
    const hexes = (p.get('p') || '')
      .split('-')
      .map((c) => '#' + c)
      .filter((c) => /^#[0-9a-fA-F]{6}$/.test(c));
    const mode = (p.get('m') || 'analogous') as HarmonyMode;
    return hexes.length >= 2 ? { hexes, mode } : null;
  } catch {
    return null;
  }
}
