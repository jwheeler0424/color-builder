import type { DisplayGamutId } from './gamuts/types.ts';
import type { Vec3 } from './math/matrix.ts';
import type { Lab } from './spaces/types.ts';

import { colorValue, renderColor } from './color.ts';
import { rgbToHsl } from './device.ts';
import { DISPLAY_GAMUTS, encodedToXyz } from './gamuts/rgb.ts';
import { generateEnginePalette, type EngineColor, type EnginePaletteConfig } from './palette.ts';
import { OKLAB } from './spaces/oklab.ts';

export interface ExtractedColor {
  /** Exact XYZ (D65) of the bucket's mean sRGB. */
  xyz: Vec3;
  display: DisplayGamutId;
  /** The mean rounded to 8 bits. */
  hex: string;
  /** Share of the image's opaque pixels this color stands for. */
  weight: number;
}

export interface ExtractOptions {
  pixelGamut?: DisplayGamutId;
  /** Most colors returned. Default 8. */
  count?: number;
  /** Pixels with alpha below this are skipped. Default 128. */
  minAlpha?: number;
  /** Colors closer than this OKLab ΔE merge into the larger one. Default 0.08. */
  minDistance?: number;
}

/** Reorders idx[lo, hi) so idx[k] holds the k-th smallest channel value (Hoare quickselect). */
function select(idx: Uint32Array, channel: Uint8Array, lo: number, hi: number, k: number) {
  let right = hi - 1;
  let left = lo;
  while (right > left) {
    const pivot = channel[idx[(left + right) >>> 1]!]!;
    let i = left;
    let j = right;
    while (i <= j) {
      while (channel[idx[i]!]! < pivot) i++;
      while (channel[idx[j]!]! > pivot) j--;
      if (i <= j) {
        const t = idx[i]!;
        idx[i++] = idx[j]!;
        idx[j--] = t;
      }
    }
    if (k <= j) right = j;
    else if (k >= i) left = i;
    else return;
  }
}

/**
 * Dominant colors of an RGBA image (e.g. `ImageData.data`) by median cut, keeping only usable
 * colors (HSL saturation ≥ 8%, lightness 10–92%), most saturated first.
 */
export function extractColors(
  rgba: ArrayLike<number>,
  { count = 8, minAlpha = 128, minDistance = 0.08, pixelGamut = 'srgb' }: ExtractOptions = {},
): ExtractedColor[] {
  const gamut = DISPLAY_GAMUTS.find((entry) => entry.id === pixelGamut);
  if (!gamut) throw new Error('Unknown image pixel gamut.');
  if (
    !Number.isInteger(count) ||
    count < 1 ||
    count > 64 ||
    !Number.isFinite(minDistance) ||
    minDistance < 0 ||
    !Number.isFinite(minAlpha) ||
    minAlpha < 0 ||
    minAlpha > 255 ||
    rgba.length % 4 !== 0
  )
    throw new Error('Invalid image extraction options or pixel data.');
  const total = rgba.length >>> 2;
  const channels = [new Uint8Array(total), new Uint8Array(total), new Uint8Array(total)] as const;
  const [r, g, b] = channels;
  let n = 0;
  for (let p = 0; p < total; p++) {
    const o = p << 2;
    if (rgba[o + 3]! < minAlpha) continue;
    r[n] = rgba[o]!;
    g[n] = rgba[o + 1]!;
    b[n] = rgba[o + 2]!;
    n++;
  }
  if (n === 0 || count < 1) return [];

  const idx = new Uint32Array(n);
  for (let i = 0; i < n; i++) idx[i] = i;
  const depth = Math.ceil(Math.log2(count * 2));
  const buckets: Array<{ rgb: Vec3; size: number }> = [];
  const stack: Array<[number, number, number]> = [[0, n, depth]];
  while (stack.length) {
    const [lo, hi, d] = stack.pop()!;
    let widest = 0;
    let widestRange = 0;
    if (d > 0 && hi - lo > 1) {
      for (let c = 0; c < 3; c++) {
        const channel = channels[c]!;
        let min = 255;
        let max = 0;
        for (let i = lo; i < hi; i++) {
          const v = channel[idx[i]!]!;
          if (v < min) min = v;
          if (v > max) max = v;
        }
        if (max - min > widestRange) {
          widestRange = max - min;
          widest = c;
        }
      }
    }
    if (widestRange === 0) {
      let sr = 0;
      let sg = 0;
      let sb = 0;
      for (let i = lo; i < hi; i++) {
        const p = idx[i]!;
        sr += r[p]!;
        sg += g[p]!;
        sb += b[p]!;
      }
      const size = hi - lo;
      buckets.push({ rgb: [sr / size, sg / size, sb / size], size });
      continue;
    }
    // Split at the median, but keep pixels equal to it on one side so no run of one color is cut.
    const channel = channels[widest]!;
    const mid = (lo + hi) >>> 1;
    select(idx, channel, lo, hi, mid);
    const pivot = channel[idx[mid]!]!;
    let lt = lo;
    let gt = hi;
    for (let i = lo; i < gt;) {
      const v = channel[idx[i]!]!;
      if (v < pivot) {
        const t = idx[i]!;
        idx[i++] = idx[lt]!;
        idx[lt++] = t;
      } else if (v > pivot) {
        const t = idx[i]!;
        idx[i] = idx[--gt]!;
        idx[gt] = t;
      } else i++;
    }
    const split = lt === lo || (gt !== hi && gt - mid < mid - lt) ? gt : lt;
    stack.push([lo, split, d - 1], [split, hi, d - 1]);
  }

  const kept: Array<{ rgb: Vec3; size: number; lab: Lab; saturation: number }> = [];
  buckets.sort((x, y) => y.size - x.size);
  for (const { rgb, size } of buckets) {
    const encoded = rgb.map((v) => v / 255) as unknown as Vec3;
    const { s, l } = rgbToHsl(encoded);
    if (s < 0.08 || l < 0.1 || l > 0.92) continue;
    const lab = OKLAB.xyzToLab(encodedToXyz(gamut, encoded));
    const twin = kept.find((k) => OKLAB.distance(k.lab, lab) < minDistance);
    if (twin) twin.size += size;
    else kept.push({ rgb, size, lab, saturation: s });
  }

  return kept
    .sort((x, y) => y.saturation - x.saturation)
    .slice(0, count)
    .map(({ rgb, size }) => {
      const xyz = encodedToXyz(gamut, rgb.map((value) => value / 255) as unknown as Vec3);
      const hex =
        pixelGamut === 'srgb'
          ? `#${rgb.map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')}`
          : renderColor(colorValue(xyz, 1, pixelGamut)).hex;
      return { xyz, hex, display: pixelGamut, weight: size / n };
    });
}

export interface ImageHarmony {
  source: ExtractedColor;
  palette: EngineColor[];
}

/** A harmony palette for each color extracted from an RGBA image, each based on its exact color. */
export function extractHarmonies(
  rgba: ArrayLike<number>,
  config: Omit<EnginePaletteConfig, 'baseColor'>,
  options?: ExtractOptions,
): ImageHarmony[] {
  return extractColors(rgba, options).map((source) => ({
    source,
    palette: generateEnginePalette({ ...config, baseColor: { xyz: source.xyz } }),
  }));
}
