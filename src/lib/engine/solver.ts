import { BIN_STRIDE } from './gamuts/slab-index.ts';
import { containsXyz, type Gamut } from './gamuts/types.ts';
import { intersect, type Interval } from './intervals.ts';
/**
 * Exact gamut boundaries along perceptual lines, for any space and any convex gamut.
 *
 * Along a line of constant (l, h) or (c, h), XYZ is a vector (piecewise) cubic in the free
 * variable t, so every slab constraint lo ≤ n·xyz(t) ≤ hi is a scalar cubic inequality.
 * Its roots come from calculus (critical points of the cubic, then Newton), so each slab's
 * feasible set is exact; intersecting them gives the exact feasible set of the gamut.
 * Spaces whose XYZ is not polynomial (CAM16) use the separable-monotone path in separable.ts.
 */
import { cubicCrossings, evalCubic, type Cubic } from './math/polynomial.ts';
import { separableFeasible } from './separable.ts';
import { clamp, lchToXyz, type ColorSpace, type Lch, type Piece } from './spaces/types.ts';

export type { Interval } from './intervals.ts';

const SLACK = 1e-12;

/** Ranges thinner than this (e.g. a lone gamut corner) are a single point, not a color range. */
const MIN_INTERVAL = 1e-6;

/** Where lo ≤ cubic ≤ hi on [a, b]: between consecutive roots nothing changes, so one midpoint decides. */
function slabFeasible(cubic: Cubic, lo: number, hi: number, a: number, b: number): Interval[] {
  const points = [a, ...cubicCrossings(cubic, lo, a, b), ...cubicCrossings(cubic, hi, a, b), b];
  points.sort((p, q) => p - q);

  const out: Interval[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p = points[i]!;
    const q = points[i + 1]!;
    if (q - p < 1e-15) continue;
    const v = evalCubic(cubic, (p + q) / 2);
    if (v < lo - SLACK || v > hi + SLACK) continue;
    const last = out[out.length - 1];
    if (last && p - last[1] < 1e-12) last[1] = q;
    else out.push([p, q]);
  }
  return out;
}

const range = new Float64Array(2);

/** Exact [min, max] of a cubic on [a, b] (ends or critical points), written into `range` without allocating. */
function rangeOf(c0: number, c1: number, c2: number, c3: number, a: number, b: number): void {
  const va = ((c3 * a + c2) * a + c1) * a + c0;
  const vb = ((c3 * b + c2) * b + c1) * b + c0;
  let min = va < vb ? va : vb;
  let max = va < vb ? vb : va;
  // Critical points: roots of 3c3·x² + 2c2·x + c1.
  const qa = 3 * c3;
  const qb = 2 * c2;
  const scale = Math.max(Math.abs(qa), Math.abs(qb), Math.abs(c1));
  if (scale > 0) {
    let r1 = NaN;
    let r2 = NaN;
    if (Math.abs(qa) <= 1e-14 * scale) {
      if (Math.abs(qb) > 1e-14 * scale) r1 = -c1 / qb;
    } else {
      const disc = qb * qb - 4 * qa * c1;
      if (disc >= 0) {
        const q = -0.5 * (qb + (qb < 0 ? -1 : 1) * Math.sqrt(disc));
        r1 = q / qa;
        r2 = q !== 0 ? c1 / q : NaN;
      }
    }
    if (r1 > a && r1 < b) {
      const v = ((c3 * r1 + c2) * r1 + c1) * r1 + c0;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    if (r2 > a && r2 < b) {
      const v = ((c3 * r2 + c2) * r2 + c1) * r2 + c0;
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  range[0] = min;
  range[1] = max;
}

function pieceFeasible(piece: Piece, gamut: Gamut): Interval[] {
  if (!piece.coeffs) return separableFeasible(piece, gamut);
  const s = gamut.slabs;
  const [A0, A1, A2, A3] = piece.coeffs;
  let current: Interval[] = [[piece.lo, piece.hi]];
  let a = piece.lo;
  let T = piece.hi;

  const scan = (first: number, end: number) => {
    for (let k = 5 * first; k < 5 * end; k += 5) {
      const nx = s[k]!;
      const ny = s[k + 1]!;
      const nz = s[k + 2]!;
      const lo = s[k + 3]!;
      const hi = s[k + 4]!;
      const c0 = nx * A0[0] + ny * A0[1] + nz * A0[2];
      const c1 = nx * A1[0] + ny * A1[1] + nz * A1[2];
      const c2 = nx * A2[0] + ny * A2[1] + nz * A2[2];
      const c3 = nx * A3[0] + ny * A3[1] + nz * A3[2];

      rangeOf(c0, c1, c2, c3, a, T);
      if (range[0]! >= lo - SLACK && range[1]! <= hi + SLACK) continue;
      current = intersect(current, slabFeasible([c0, c1, c2, c3], lo, hi, a, T));
      if (current.length === 0) return;
      a = current[0]![0];
      T = current[current.length - 1]![1];
    }
  };

  const index = gamut.index;
  if (!index) {
    scan(0, s.length / 5);
    return current;
  }
  const bins = index.bins;
  const [cx, cy, cz] = index.center;

  // Every normal n in a bin is within ε of its centre m, so |n·y − m·y| ≤ ε|y| with y = xyz − centre.
  const B0x = A0[0] - cx;
  const B0y = A0[1] - cy;
  const B0z = A0[2] - cz;
  const n0 = Math.hypot(B0x, B0y, B0z);
  const n1 = Math.hypot(...A1);
  const n2 = Math.hypot(...A2);
  const n3 = Math.hypot(...A3);
  const binCount = bins.length / BIN_STRIDE;
  const margin = (b: number) => {
    const o = b * BIN_STRIDE;
    const mx = bins[o]!;
    const my = bins[o + 1]!;
    const mz = bins[o + 2]!;
    rangeOf(
      mx * B0x + my * B0y + mz * B0z,
      mx * A1[0] + my * A1[1] + mz * A1[2],
      mx * A2[0] + my * A2[1] + mz * A2[2],
      mx * A3[0] + my * A3[1] + mz * A3[2],
      a,
      T,
    );
    const spread = bins[o + 3]! * (((n3 * T + n2) * T + n1) * T + n0);
    // Distance from the bin's tightest slab walls; negative means some slab may bind.
    return Math.min(bins[o + 5]! - (range[1]! + spread), range[0]! - spread - bins[o + 4]!);
  };

  // One real slab per bin first: a cheap pass that pulls the search range in near the boundary.
  for (let b = 0; b < binCount && current.length > 0; b++) {
    const first = bins[b * BIN_STRIDE + 6]!;
    scan(first, first + 1);
  }
  for (let b = 0; b < binCount && current.length > 0; b++) {
    if (margin(b) >= 0) continue;
    const o = b * BIN_STRIDE;
    scan(bins[o + 6]! + 1, bins[o + 7]!);
  }
  return current;
}

function feasible(pieces: Piece[], gamut: Gamut): Interval[] {
  const merged: Interval[] = [];
  for (const piece of pieces) {
    for (const [a, b] of pieceFeasible(piece, gamut)) {
      const last = merged[merged.length - 1];
      if (last && a - last[1] < 1e-12) last[1] = Math.max(last[1], b);
      else merged.push([a, b]);
    }
  }
  return merged.filter(([a, b]) => a === 0 || b - a >= MIN_INTERVAL);
}

const cache = new Map<string, Interval[]>();

/** The chroma ranges that are inside `gamut` at this lightness and hue, in increasing order. */
export function gamutIntervals(space: ColorSpace, gamut: Gamut, l: number, h: number): Interval[] {
  if (l <= 0 || l >= space.lightnessMax) return [[0, 0]];
  const key = `${space.id}|${gamut.id}|${l}|${h}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const param = space.chromaParam?.(l, h);
  const found = feasible(space.chromaPieces(l, h, param?.max ?? space.chromaSearchMax), gamut);
  const mapped: Interval[] = param
    ? found.map(([a, b]) => [param.toChroma(a), param.toChroma(b)])
    : found;
  const result: Interval[] = mapped.length > 0 ? mapped : [[0, 0]];
  if (cache.size > 20000) cache.clear();
  cache.set(key, result);
  return result;
}

/** The lightness ranges that can hold this chroma at this hue. Empty past the hue's peak. */
export function lightnessIntervals(
  space: ColorSpace,
  gamut: Gamut,
  c: number,
  h: number,
): Interval[] {
  if (c <= 0) return [[0, space.lightnessMax]];
  if (!space.lightnessPieces) throw new Error(`${space.id} has no lightness pieces.`);
  return feasible(space.lightnessPieces(c, h, space.lightnessMax), gamut);
}

export function maxChroma(space: ColorSpace, gamut: Gamut, l: number, h: number): number {
  const intervals = gamutIntervals(space, gamut, l, h);
  return intervals[intervals.length - 1]![1];
}

/** The largest in-gamut chroma that does not exceed `target`. */
export function fitChroma(
  space: ColorSpace,
  gamut: Gamut,
  l: number,
  h: number,
  target: number,
): number {
  if (target === 0) return target;
  // A target that is already inside is its own answer; one membership test beats a full solve.
  if (target > 0 && l > 0 && l < space.lightnessMax) {
    if (containsXyz(gamut, lchToXyz(space, { l, c: target, h }), 0)) return target;
  }
  const intervals = gamutIntervals(space, gamut, l, h);
  for (let i = intervals.length - 1; i >= 0; i--) {
    const [start, end] = intervals[i]!;
    if (start <= target) return Math.min(target, end);
  }
  return 0;
}

function nearestInWindow(
  intervals: Interval[],
  x: number,
  lo: number,
  hi: number,
): number | undefined {
  let best: number | undefined;
  let bestDistance = Infinity;
  for (const [a, b] of intervals) {
    const start = Math.max(a, lo);
    const end = Math.min(b, hi);
    if (start > end) continue;
    const candidate = clamp(x, start, end);
    const distance = Math.abs(candidate - x);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  return best;
}

/**
 * Move lightness by at most `maxShift` to keep `targetChroma`: the smallest shift that
 * reaches it, else (bisecting on chroma) the most chroma any lightness in the window allows.
 */
export function adaptLightness(
  space: ColorSpace,
  gamut: Gamut,
  l: number,
  h: number,
  targetChroma: number,
  maxShift: number,
): { l: number; c: number } {
  const lo = clamp(l - maxShift, 0, space.lightnessMax);
  const hi = clamp(l + maxShift, 0, space.lightnessMax);
  if (!space.lightnessPieces) return adaptBySearch(space, gamut, l, h, targetChroma, lo, hi);
  const reach = (c: number) => nearestInWindow(lightnessIntervals(space, gamut, c, h), l, lo, hi);

  const direct = reach(targetChroma);
  if (direct !== undefined) return { l: direct, c: targetChroma };

  let good = 0;
  let goodL = clamp(l, 0, space.lightnessMax);
  let bad = targetChroma;
  for (let i = 0; i < 60; i++) {
    const mid = (good + bad) / 2;
    const candidate = reach(mid);
    if (candidate !== undefined) {
      good = mid;
      goodL = candidate;
    } else {
      bad = mid;
    }
  }
  return { l: goodL, c: good };
}

/**
 * adaptLightness for spaces without lightness pieces: work on the exact peak-chroma function
 * P(L) = maxChroma(L, h) over the window. The window is sampled, then the nearest crossing of
 * P = target is found by Illinois regula falsi, or, if the target is out of reach, the sampled
 * maximum is refined by Brent's method (P is smooth and unimodal around the hue's cusp).
 */
function adaptBySearch(
  space: ColorSpace,
  gamut: Gamut,
  l: number,
  h: number,
  target: number,
  lo: number,
  hi: number,
): { l: number; c: number } {
  return adaptLightnessByChroma(
    (lightness) => maxChroma(space, gamut, lightness, h),
    l,
    target,
    lo,
    hi,
    space.lightnessMax,
  );
}

export function adaptLightnessByChroma(
  peak: (lightness: number) => number,
  l: number,
  target: number,
  lo: number,
  hi: number,
  lightnessMax: number,
): { l: number; c: number } {
  const tol = 1e-12 * lightnessMax;
  if (peak(l) >= target) return { l, c: target };

  const samples = Array.from({ length: 9 }, (_, i) => lo + ((hi - lo) * i) / 8);
  const values = samples.map(peak);
  const order = samples
    .map((_, i) => i)
    .sort((x, y) => Math.abs(samples[x]! - l) - Math.abs(samples[y]! - l));
  const hit = order.find((i) => values[i]! >= target);

  if (hit !== undefined) {
    // Bracket between the reachable sample and its neighbour toward l, which is not reachable.
    let inside = samples[hit]!;
    let outside =
      samples[hit]! > l ? Math.max(l, samples[hit - 1] ?? l) : Math.min(l, samples[hit + 1] ?? l);
    if (peak(outside) >= target) outside = l;
    let fIn = values[hit]! - target;
    let fOut = peak(outside) - target;
    let side = 0;
    for (let i = 0; i < 100 && Math.abs(inside - outside) > tol; i++) {
      const x = inside - (fIn * (inside - outside)) / (fIn - fOut);
      const fx = peak(x) - target;
      if (fx >= 0) {
        inside = x;
        fIn = fx;
        if (side === 1) fOut /= 2;
        side = 1;
      } else {
        outside = x;
        fOut = fx;
        if (side === -1) fIn /= 2;
        side = -1;
      }
    }
    return { l: inside, c: target };
  }

  let best = 0;
  values.forEach((v, i) => {
    if (v > values[best]!) best = i;
  });
  const L = brentMax(
    peak,
    samples[Math.max(0, best - 1)]!,
    samples[best]!,
    samples[Math.min(samples.length - 1, best + 1)]!,
    tol,
  );
  return { l: L, c: Math.min(target, peak(L)) };
}

/** Brent's method (parabolic steps with golden-section fallback) for the maximum of f on [a, b]. */
function brentMax(f: (x: number) => number, a: number, x: number, b: number, tol: number): number {
  const golden = (3 - Math.sqrt(5)) / 2;
  let w = x;
  let v = x;
  let fx = -f(x);
  let fw = fx;
  let fv = fx;
  let d = 0;
  let e = 0;
  for (let i = 0; i < 100; i++) {
    const m = (a + b) / 2;
    const tol1 = tol + 1e-10 * Math.abs(x);
    if (Math.abs(x - m) <= 2 * tol1 - (b - a) / 2) break;
    let parabolic = false;
    if (Math.abs(e) > tol1) {
      let r = (x - w) * (fx - fv);
      let q = (x - v) * (fx - fw);
      let p = (x - v) * q - (x - w) * r;
      q = 2 * (q - r);
      if (q > 0) p = -p;
      q = Math.abs(q);
      r = e;
      e = d;
      if (Math.abs(p) < Math.abs(0.5 * q * r) && p > q * (a - x) && p < q * (b - x)) {
        d = p / q;
        parabolic = true;
      }
    }
    if (!parabolic) {
      e = x < m ? b - x : a - x;
      d = golden * e;
    }
    const u = x + (Math.abs(d) >= tol1 ? d : Math.sign(d || 1) * tol1);
    const fu = -f(u);
    if (fu <= fx) {
      if (u < x) b = x;
      else a = x;
      v = w;
      fv = fw;
      w = x;
      fw = fx;
      x = u;
      fx = fu;
    } else {
      if (u < x) a = u;
      else b = u;
      if (fu <= fw || w === x) {
        v = w;
        fv = fw;
        w = u;
        fw = fu;
      } else if (fu <= fv || v === x || v === w) {
        v = u;
        fv = fu;
      }
    }
  }
  return x;
}

export const inGamut = (space: ColorSpace, gamut: Gamut, color: Lch, epsilon = 1e-9): boolean =>
  containsXyz(gamut, lchToXyz(space, color), epsilon);

/** Reduce chroma only, keeping lightness and hue exactly. */
export function fitToGamut(space: ColorSpace, gamut: Gamut, color: Lch): Lch {
  const l = clamp(color.l, 0, space.lightnessMax);
  return { l, h: color.h, c: fitChroma(space, gamut, l, color.h, color.c) };
}

/** Share of the gamut's chroma a color uses at its lightness and hue: 0..1. */
export function relativeChroma(space: ColorSpace, gamut: Gamut, color: Lch): number {
  const limit = maxChroma(space, gamut, color.l, color.h);
  return limit > 0 ? Math.min(1, color.c / limit) : 0;
}
