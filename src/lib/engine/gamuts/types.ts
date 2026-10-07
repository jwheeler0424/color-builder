import type { Mat3, Vec3 } from '../math/matrix.ts';

import { BIN_STRIDE } from './slab-index.ts';

/**
 * A convex gamut in XYZ (D65): every slab k demands lo_k ≤ n_k·xyz ≤ hi_k.
 * Slabs are packed five numbers each: nx, ny, nz, lo, hi.
 */
export interface Gamut {
  id: GamutId;
  label: string;
  slabs: Float64Array;
  /** Optional normal-direction bins over `slabs` (see slab-index.ts). */
  index?: { bins: Float64Array; center: Vec3 };
}

export type DisplayGamutId = 'srgb' | 'p3' | 'rec2020';
export type GamutId = DisplayGamutId | 'optimal';

export interface RgbGamut extends Gamut {
  id: DisplayGamutId;
  /** The colorspace name used by CSS `color()`. */
  cssId: 'srgb' | 'display-p3' | 'rec2020';
  xyzFromLinear: Mat3;
  linearFromXyz: Mat3;
  /** Linear light -> encoded signal (extended to negative values by symmetry). */
  encode: (v: number) => number;
  decode: (v: number) => number;
}

export function containsXyz(gamut: Gamut, [x, y, z]: Vec3, epsilon = 1e-9): boolean {
  const s = gamut.slabs;
  const check = (from: number, to: number) => {
    for (let k = 5 * from; k < 5 * to; k += 5) {
      const v = s[k]! * x + s[k + 1]! * y + s[k + 2]! * z;
      if (v < s[k + 3]! - epsilon || v > s[k + 4]! + epsilon) return false;
    }
    return true;
  };
  if (!gamut.index) return check(0, s.length / 5);

  // A bin whose centre normal clears its tightest walls by ε·|xyz − centre| holds no violated slab.
  const { bins, center } = gamut.index;
  const dx = x - center[0];
  const dy = y - center[1];
  const dz = z - center[2];
  const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
  for (let o = 0; o < bins.length; o += BIN_STRIDE) {
    const d = bins[o]! * dx + bins[o + 1]! * dy + bins[o + 2]! * dz;
    const spread = bins[o + 3]! * r;
    if (d - spread >= bins[o + 4]! - epsilon && d + spread <= bins[o + 5]! + epsilon) continue;
    if (!check(bins[o + 6]!, bins[o + 7]!)) return false;
  }
  return true;
}
