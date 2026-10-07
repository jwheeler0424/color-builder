import type { Vec3 } from '../math/matrix.ts';
import type { Gamut } from './types.ts';

import { D65_SPD, X_BAR, Y_BAR, Z_BAR } from '../data/cie.ts';
import { WHITE_D65 } from './rgb.ts';
import { BIN_STRIDE, buildSlabIndex } from './slab-index.ts';

/**
 * The optimal color solid (Rösch–MacAdam) for CIE 1931 2° under D65.
 *
 * CIE defines tristimulus values as a 1 nm sum, so a reflectance r ∈ [0, 1]ⁿ gives
 * XYZ = Σ r_k·w_k with w_k = S(λ_k)·(x̄, ȳ, z̄)(λ_k). The set of all such XYZ is a
 * zonohedron: the Minkowski sum of the segments [0, w_k]. Its facets lie on the
 * planes spanned by each generator pair, n = w_i × w_j, and the zonohedron is
 * exactly the intersection of the slabs Σ min(0, n·w_k) ≤ n·xyz ≤ Σ max(0, n·w_k).
 * No assumption about the spectral locus being convex is needed.
 */
let cached: Gamut | undefined;

/** Generators scaled so a perfect reflector has Y = 1 and lands exactly on the D65 white used everywhere else. */
export function optimalGenerators(): Float64Array {
  const n = X_BAR.length;
  let x = 0;
  let y = 0;
  let z = 0;
  for (let k = 0; k < n; k++) {
    x += D65_SPD[k]! * X_BAR[k]!;
    y += D65_SPD[k]! * Y_BAR[k]!;
    z += D65_SPD[k]! * Z_BAR[k]!;
  }
  // The tabulated D65 integrates to within ~1e-4 of the 4-digit chromaticity; absorb it per axis.
  const sx = WHITE_D65[0] / x;
  const sy = 1 / y;
  const sz = WHITE_D65[2] / z;

  const raw: number[][] = [];
  for (let k = 0; k < n; k++) {
    const w = [
      D65_SPD[k]! * X_BAR[k]! * sx,
      D65_SPD[k]! * Y_BAR[k]! * sy,
      D65_SPD[k]! * Z_BAR[k]! * sz,
    ];
    if (w[0] === 0 && w[1] === 0 && w[2] === 0) continue;

    // Exactly parallel neighbours are one segment; merging keeps every facet normal well-defined.
    const last = raw[raw.length - 1];
    if (last) {
      const c = Math.hypot(
        last[1]! * w[2]! - last[2]! * w[1]!,
        last[2]! * w[0]! - last[0]! * w[2]!,
        last[0]! * w[1]! - last[1]! * w[0]!,
      );
      if (c <= 1e-12 * Math.hypot(...last) * Math.hypot(...w)) {
        for (let i = 0; i < 3; i++) last[i] = last[i]! + w[i]!;
        continue;
      }
    }
    raw.push(w);
  }
  return Float64Array.from(raw.flat());
}

/**
 * Every facet slab, with supports from angular prefix sums instead of an O(n) sum per pair.
 *
 * Fix generator a = w_i and project all generators onto the plane ⊥ a, giving 2-D u_k with
 * (a × w_j)·w_k = |a|·cross(u_j, u_k). So hi_ij = cross(u_j, Σ u_k over the half-turn
 * counter-clockwise of u_j) / |u_j|, a contiguous range once the u_k are sorted by angle,
 * and lo_ij = cross(u_j, Σ u_k) / |u_j| − hi_ij. Generators on the half-plane edges
 * contribute exactly zero, so ties need no care. Total cost O(n² log n).
 */
export function optimalSlabs(
  w: Float64Array,
  startGenerator = 0,
  endGenerator = w.length / 3,
): Float64Array {
  const n = w.length / 3;
  if (
    !Number.isInteger(startGenerator) ||
    !Number.isInteger(endGenerator) ||
    startGenerator < 0 ||
    endGenerator < startGenerator ||
    endGenerator > n
  ) {
    throw new RangeError('Invalid optimal-solid generator range.');
  }
  let maxSlabs = 0;
  for (let i = startGenerator; i < endGenerator; i++) maxSlabs += n - i - 1;
  const slabs = new Float64Array(maxSlabs * 5);
  let count = 0;

  const ux = new Float64Array(n);
  const uy = new Float64Array(n);
  const angle = new Float64Array(n);
  const order: number[] = [];
  const px = new Float64Array(2 * n + 1);
  const py = new Float64Array(2 * n + 1);

  for (let i = startGenerator; i < endGenerator; i++) {
    const ax = w[3 * i]!;
    const ay = w[3 * i + 1]!;
    const az = w[3 * i + 2]!;
    const aNorm = Math.hypot(ax, ay, az);
    // Right-handed basis (e1, e2, â) of the plane ⊥ a.
    const helper =
      Math.abs(ax) < Math.abs(ay)
        ? Math.abs(ax) < Math.abs(az)
          ? 0
          : 2
        : Math.abs(ay) < Math.abs(az)
          ? 1
          : 2;
    const hx = helper === 0 ? 1 : 0;
    const hy = helper === 1 ? 1 : 0;
    const hz = helper === 2 ? 1 : 0;
    let e1x = ay * hz - az * hy;
    let e1y = az * hx - ax * hz;
    let e1z = ax * hy - ay * hx;
    const e1n = Math.hypot(e1x, e1y, e1z);
    e1x /= e1n;
    e1y /= e1n;
    e1z /= e1n;
    const e2x = (ay * e1z - az * e1y) / aNorm;
    const e2y = (az * e1x - ax * e1z) / aNorm;
    const e2z = (ax * e1y - ay * e1x) / aNorm;

    order.length = 0;
    let tx = 0;
    let ty = 0;
    for (let k = 0; k < n; k++) {
      const x = w[3 * k]! * e1x + w[3 * k + 1]! * e1y + w[3 * k + 2]! * e1z;
      const y = w[3 * k]! * e2x + w[3 * k + 1]! * e2y + w[3 * k + 2]! * e2z;
      ux[k] = x;
      uy[k] = y;
      angle[k] = Math.atan2(y, x);
      if (k !== i) {
        order.push(k);
        tx += x;
        ty += y;
      }
    }
    order.sort((p, q) => angle[p]! - angle[q]!);

    const m = order.length;
    for (let r = 0; r < 2 * m; r++) {
      const k = order[r % m]!;
      px[r + 1] = px[r]! + ux[k]!;
      py[r + 1] = py[r]! + uy[k]!;
    }

    // For each u_j, the counter-clockwise half-turn is order[p+1 .. end), end advancing monotonically.
    let end = 1;
    for (let p = 0; p < m; p++) {
      const j = order[p]!;
      const limit = angle[j]! + Math.PI;
      if (end < p + 1) end = p + 1;
      while (end < p + m) {
        const k = order[end % m]!;
        const theta = angle[k]! + (end >= m ? 2 * Math.PI : 0);
        if (theta >= limit) break;
        end++;
      }
      if (j <= i) continue;

      const bx = w[3 * j]!;
      const by = w[3 * j + 1]!;
      const bz = w[3 * j + 2]!;
      const nx = ay * bz - az * by;
      const ny = az * bx - ax * bz;
      const nz = ax * by - ay * bx;
      const norm2 = nx * nx + ny * ny + nz * nz;
      if (norm2 <= 1e-24 * aNorm * aNorm * (bx * bx + by * by + bz * bz)) continue;
      const norm = Math.sqrt(norm2);

      const uNorm = Math.sqrt(ux[j]! * ux[j]! + uy[j]! * uy[j]!);
      const sx = px[end]! - px[p + 1]!;
      const sy = py[end]! - py[p + 1]!;
      const hi = (ux[j]! * sy - uy[j]! * sx) / uNorm;
      const lo = (ux[j]! * ty - uy[j]! * tx) / uNorm - hi;
      const at = 5 * count++;
      slabs[at] = nx / norm;
      slabs[at + 1] = ny / norm;
      slabs[at + 2] = nz / norm;
      slabs[at + 3] = lo;
      slabs[at + 4] = hi;
    }
  }
  return slabs.slice(0, 5 * count);
}

export function optimalSolid(): Gamut {
  if (cached) return cached;
  return buildOptimalSolidFromSlabs(optimalSlabs(optimalGenerators()));
}

export function buildOptimalSolidFromSlabs(slabs: Float64Array): Gamut {
  if (cached) return cached;
  // The zonohedron is centrally symmetric about half the white point.
  const center = WHITE_D65.map((v) => v / 2) as unknown as Vec3;
  const indexed = buildSlabIndex(slabs, center);
  cached = solidFrom(indexed.slabs, indexed.bins, center);
  return cached;
}

const solidFrom = (slabs: Float64Array, bins: Float64Array, center: Vec3): Gamut => ({
  id: 'optimal',
  label: 'Optimal color solid (D65, CIE 1931 2°)',
  slabs,
  index: { bins, center },
});

const FORMAT_VERSION = 1;
const HEADER = 6;

/** The built solid as one little-endian Float64 buffer: version, slab count, bin count, centre, slabs, bins. */
export function serializeOptimalSolid(): ArrayBuffer {
  const { slabs, index } = optimalSolid();
  const { bins, center } = index!;
  const out = new Float64Array(HEADER + slabs.length + bins.length);
  out.set([FORMAT_VERSION, slabs.length / 5, bins.length / BIN_STRIDE, ...center]);
  out.set(slabs, HEADER);
  out.set(bins, HEADER + slabs.length);
  return out.buffer;
}

/** Install a solid produced by `serializeOptimalSolid`, skipping the build. */
export function loadOptimalSolid(buffer: ArrayBuffer): Gamut {
  if (buffer.byteLength < HEADER * 8 || buffer.byteLength % 8 !== 0)
    throw new Error('Invalid optimal solid buffer length.');
  const data = new Float64Array(buffer);
  if (data[0] !== FORMAT_VERSION) throw new Error(`Unsupported optimal solid format ${data[0]}.`);
  if (
    !Number.isSafeInteger(data[1]) ||
    !Number.isSafeInteger(data[2]) ||
    data[1]! < 1 ||
    data[2]! < 1 ||
    HEADER + 5 * data[1]! + BIN_STRIDE * data[2]! !== data.length ||
    !data.every(Number.isFinite)
  )
    throw new Error('Invalid optimal solid data.');
  const slabEnd = HEADER + 5 * data[1]!;
  cached = solidFrom(
    data.subarray(HEADER, slabEnd),
    data.subarray(slabEnd, slabEnd + BIN_STRIDE * data[2]!),
    [data[3]!, data[4]!, data[5]!],
  );
  return cached;
}
