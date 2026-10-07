/**
 * Groups slabs by normal direction so the solver can rule out a whole group with one bound.
 *
 * Normals are binned on a cube map. For a bin with unit centre m and radius ε = max |n − m|,
 * any slab normal n satisfies |n·v − m·v| ≤ ε·|v| for every vector v, which gives a
 * conservative range for all of the bin's slab cubics at once.
 */
import type { Vec3 } from '../math/matrix.ts';
export interface SlabIndex {
  /** Slabs reordered so each bin is contiguous (nx, ny, nz, lo, hi). */
  slabs: Float64Array;
  /** Per bin: mx, my, mz, ε, max lo, min hi, first slab, end slab (in slab units). Walls are relative to `center`. */
  bins: Float64Array;
  center: Vec3;
}

export const BIN_STRIDE = 8;

/** Bounds are taken about `center`; pick a point deep inside so |xyz − center| stays small. */
export function buildSlabIndex(slabs: Float64Array, center: Vec3, grid = 32): SlabIndex {
  const count = slabs.length / 5;
  const binOf = new Int32Array(count);
  const binCount = 6 * grid * grid;
  const sizes = new Int32Array(binCount);

  const cell = (x: number) => Math.min(grid - 1, Math.floor(((x + 1) / 2) * grid));
  for (let s = 0; s < count; s++) {
    const n0 = slabs[5 * s]!;
    const n1 = slabs[5 * s + 1]!;
    const n2 = slabs[5 * s + 2]!;
    const a0 = Math.abs(n0);
    const a1 = Math.abs(n1);
    const a2 = Math.abs(n2);
    const axis = a0 >= a1 && a0 >= a2 ? 0 : a1 >= a2 ? 1 : 2;
    const major = axis === 0 ? n0 : axis === 1 ? n1 : n2;
    const u = (axis === 0 ? n1 : axis === 1 ? n2 : n0) / Math.abs(major);
    const v = (axis === 0 ? n2 : axis === 1 ? n0 : n1) / Math.abs(major);
    const face = axis * 2 + (major < 0 ? 1 : 0);
    binOf[s] = (face * grid + cell(u)) * grid + cell(v);
    sizes[binOf[s]!]!++;
  }

  const starts = new Int32Array(binCount + 1);
  for (let b = 0; b < binCount; b++) starts[b + 1] = starts[b]! + sizes[b]!;
  const fill = starts.slice(0, binCount);
  const ordered = new Float64Array(slabs.length);
  for (let s = 0; s < count; s++) {
    const at = 5 * fill[binOf[s]!]!++;
    for (let f = 0; f < 5; f++) ordered[at + f] = slabs[5 * s + f]!;
  }

  const bins: number[] = [];
  for (let b = 0; b < binCount; b++) {
    const first = starts[b]!;
    const end = starts[b + 1]!;
    if (first === end) continue;
    let mx = 0;
    let my = 0;
    let mz = 0;
    let loMax = -Infinity;
    let hiMin = Infinity;
    for (let s = first; s < end; s++) {
      mx += ordered[5 * s]!;
      my += ordered[5 * s + 1]!;
      mz += ordered[5 * s + 2]!;
      const shift =
        ordered[5 * s]! * center[0] +
        ordered[5 * s + 1]! * center[1] +
        ordered[5 * s + 2]! * center[2];
      loMax = Math.max(loMax, ordered[5 * s + 3]! - shift);
      hiMin = Math.min(hiMin, ordered[5 * s + 4]! - shift);
    }
    const norm = Math.hypot(mx, my, mz);
    mx /= norm;
    my /= norm;
    mz /= norm;
    let eps2 = 0;
    for (let s = first; s < end; s++) {
      const dx = ordered[5 * s]! - mx;
      const dy = ordered[5 * s + 1]! - my;
      const dz = ordered[5 * s + 2]! - mz;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > eps2) eps2 = d2;
    }
    // Pad ε by a few ulps so rounding in the dot products can't make the bound unsafe.
    bins.push(mx, my, mz, Math.sqrt(eps2) + 1e-15, loMax, hiMin, first, end);
  }
  return { slabs: ordered, bins: Float64Array.from(bins), center };
}
