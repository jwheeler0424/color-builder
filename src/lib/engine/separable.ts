import type { Gamut } from './gamuts/types.ts';
import type { Piece } from './spaces/types.ts';

/**
 * Exact slab feasibility for separable pieces: xyz(t) = M·(f(u₀), f(u₁), f(u₂)), uⱼ = αⱼ + βⱼt,
 * with f increasing and f′, |f″| monotone on the piece (CAM16's post-adaptation inverse is one).
 *
 * Each slab function g(t) = Σ cⱼ·f(uⱼ(t)) is a sum of three monotone terms, so on any interval
 * its range lies between the sums of the terms' endpoint values, and likewise for g′. Where the
 * g′ bound excludes 0, g is monotone and holds at most one root, found by bracketed Newton with
 * the analytic derivative; elsewhere the interval is bisected. Every crossing is isolated, so
 * the feasible set is exact up to floating point, as with the cubic path.
 *
 * Most slabs are ruled out without any of that: a grid over the live search range [a, T] keeps,
 * per segment, the terms' endpoint values and a second-order Taylor model about the midpoint, all
 * shared by every slab, so a slab costs a few multiply-adds until it might actually bind.
 */
import { BIN_STRIDE } from './gamuts/slab-index.ts';
import { intersect, type Interval } from './intervals.ts';
import { solveBracketed } from './math/polynomial.ts';

const SLACK = 1e-12;
const SEGMENTS = 16;
/** Per segment: t0, t1, then per term f(t0), f(t1), f(mid), slope at mid, curvature bound. */
const CELL = 17;

export function separableFeasible(piece: Piece, gamut: Gamut): Interval[] {
  const { matrix: M, terms, f, df, d2f } = piece.separable!;
  const al0 = terms[0].alpha;
  const al1 = terms[1].alpha;
  const al2 = terms[2].alpha;
  const be0 = terms[0].beta;
  const be1 = terms[1].beta;
  const be2 = terms[2].beta;
  const al = [al0, al1, al2];
  const be = [be0, be1, be2];
  // Matrix columns as scalars: the slab coefficient cⱼ = n·column j.
  const m00 = M[0][0];
  const m10 = M[1][0];
  const m20 = M[2][0];
  const m01 = M[0][1];
  const m11 = M[1][1];
  const m21 = M[2][1];
  const m02 = M[0][2];
  const m12 = M[1][2];
  const m22 = M[2][2];
  const index = gamut.index;

  let current: Interval[] = [[piece.lo, piece.hi]];
  let a = piece.lo;
  let T = piece.hi;

  let G0 = a;
  let width = 0;
  let first = 0;
  let tail = SEGMENTS - 1;
  const cells = new Float64Array(SEGMENTS * CELL);
  const spread = new Float64Array(SEGMENTS);

  const fillSegment = (s: number, t0: number, t1: number) => {
    const o = s * CELL;
    cells[o] = t0;
    cells[o + 1] = t1;
    const tm = (t0 + t1) / 2;
    for (let j = 0; j < 3; j++) {
      const u0 = al[j]! + be[j]! * t0;
      const u1 = al[j]! + be[j]! * t1;
      const um = al[j]! + be[j]! * tm;
      const p = o + 2 + 5 * j;
      cells[p] = f(u0);
      cells[p + 1] = f(u1);
      cells[p + 2] = f(um);
      cells[p + 3] = be[j]! * df(um);
      cells[p + 4] = be[j]! * be[j]! * Math.max(Math.abs(d2f(u0)), Math.abs(d2f(u1)));
    }
    if (!index) return;
    // A bound on |xyz − centre| over the segment, shared by every bin.
    let sum = 0;
    for (let i = 0; i < 3; i++) {
      let lowX = 0;
      let highX = 0;
      for (let j = 0; j < 3; j++) {
        const v1 = M[i]![j]! * cells[o + 2 + 5 * j]!;
        const v2 = M[i]![j]! * cells[o + 3 + 5 * j]!;
        lowX += v1 < v2 ? v1 : v2;
        highX += v1 < v2 ? v2 : v1;
      }
      const far = Math.max(Math.abs(lowX - index.center[i]!), Math.abs(highX - index.center[i]!));
      sum += far * far;
    }
    spread[s] = Math.sqrt(sum);
  };

  // Term values at the two ends of the live range, for the one-check whole-range bound.
  let wa0 = 0;
  let wa1 = 0;
  let wa2 = 0;
  let wt0 = 0;
  let wt1 = 0;
  let wt2 = 0;
  const refreshEnds = () => {
    first = width > 0 ? Math.max(0, Math.floor((a - G0) / width)) : 0;
    const o0 = first * CELL + 2;
    const o1 = tail * CELL + 3;
    wa0 = cells[o0]!;
    wa1 = cells[o0 + 5]!;
    wa2 = cells[o0 + 10]!;
    wt0 = cells[o1]!;
    wt1 = cells[o1 + 5]!;
    wt2 = cells[o1 + 10]!;
  };

  /** Rebuild the grid over [a, T] when the range has halved; otherwise trim the last segment to T. */
  const regrid = (force: boolean) => {
    if (force || T - a < 0.5 * (cells[tail * CELL + 1]! - G0)) {
      G0 = a;
      width = (T - a) / SEGMENTS;
      for (let s = 0; s < SEGMENTS; s++) {
        fillSegment(s, G0 + s * width, s === SEGMENTS - 1 ? T : G0 + (s + 1) * width);
      }
      tail = SEGMENTS - 1;
    } else {
      tail = Math.min(SEGMENTS - 1, Math.max(0, Math.ceil((T - G0) / width) - 1));
      if (cells[tail * CELL + 1] !== T) fillSegment(tail, cells[tail * CELL]!, T);
    }
    refreshEnds();
  };
  regrid(true);

  let low = 0;
  let high = 0;
  /** Range of k₀f(u₀) + k₁f(u₁) + k₂f(u₂) over segment s: the tighter of two rigorous bounds. */
  const segmentBound = (k0: number, k1: number, k2: number, s: number) => {
    const o = s * CELL;
    const half = (cells[o + 1]! - cells[o]!) / 2;
    let v1 = k0 * cells[o + 2]!;
    let v2 = k0 * cells[o + 3]!;
    low = v1 < v2 ? v1 : v2;
    high = v1 < v2 ? v2 : v1;
    v1 = k1 * cells[o + 7]!;
    v2 = k1 * cells[o + 8]!;
    low += v1 < v2 ? v1 : v2;
    high += v1 < v2 ? v2 : v1;
    v1 = k2 * cells[o + 12]!;
    v2 = k2 * cells[o + 13]!;
    low += v1 < v2 ? v1 : v2;
    high += v1 < v2 ? v2 : v1;

    const center = k0 * cells[o + 4]! + k1 * cells[o + 9]! + k2 * cells[o + 14]!;
    const gradient = k0 * cells[o + 5]! + k1 * cells[o + 10]! + k2 * cells[o + 15]!;
    const bend =
      (k0 < 0 ? -k0 : k0) * cells[o + 6]! +
      (k1 < 0 ? -k1 : k1) * cells[o + 11]! +
      (k2 < 0 ? -k2 : k2) * cells[o + 16]!;
    const radius = (gradient < 0 ? -gradient : gradient) * half + 0.5 * bend * half * half;
    if (center - radius > low) low = center - radius;
    if (center + radius < high) high = center + radius;
  };

  let c0 = 0;
  let c1 = 0;
  let c2 = 0;
  const g = (t: number) => c0 * f(al0 + be0 * t) + c1 * f(al1 + be1 * t) + c2 * f(al2 + be2 * t);
  const dg = (t: number) =>
    c0 * be0 * df(al0 + be0 * t) + c1 * be1 * df(al1 + be1 * t) + c2 * be2 * df(al2 + be2 * t);

  const findRoots = (
    target: number,
    p: number,
    q: number,
    out: number[],
    depth: number,
    endpoints?: readonly number[],
    slopes?: readonly number[],
  ) => {
    let lowV = 0;
    let highV = 0;
    let lowD = 0;
    let highD = 0;
    let startValue = 0;
    let endValue = 0;
    const cs = [c0, c1, c2];
    for (let j = 0; j < 3; j++) {
      const v1 = cs[j]! * (endpoints ? endpoints[2 * j]! : f(al[j]! + be[j]! * p));
      const v2 = cs[j]! * (endpoints ? endpoints[2 * j + 1]! : f(al[j]! + be[j]! * q));
      startValue = j === 0 ? v1 : startValue + v1;
      endValue = j === 0 ? v2 : endValue + v2;
      lowV += Math.min(v1, v2);
      highV += Math.max(v1, v2);
      const d1 = cs[j]! * be[j]! * (slopes ? slopes[2 * j]! : df(al[j]! + be[j]! * p));
      const d2 = cs[j]! * be[j]! * (slopes ? slopes[2 * j + 1]! : df(al[j]! + be[j]! * q));
      lowD += Math.min(d1, d2);
      highD += Math.max(d1, d2);
    }
    if (lowV > target || highV < target) return;

    const gp = startValue - target;
    const gq = endValue - target;
    if (lowD > 0 || highD < 0) {
      if (gp === 0) out.push(p);
      else if (gq === 0) out.push(q);
      else if (gp * gq < 0) out.push(solveBracketed((t) => g(t) - target, dg, p, q));
      return;
    }
    if (q - p <= 1e-13 * Math.max(1, Math.abs(q)) || depth > 60) {
      if (gp * gq <= 0) out.push((p + q) / 2);
      return;
    }
    const half = (p + q) / 2;
    findRoots(target, p, half, out, depth + 1);
    findRoots(target, half, q, out, depth + 1);
  };

  const s = gamut.slabs;
  const roots: number[] = [];
  const flagged: number[] = [];

  /** True when lo ≤ k·f ≤ hi holds over all of segment `seg` by either rigorous bound. */
  const segmentFits = (k0: number, k1: number, k2: number, seg: number, lo: number, hi: number) => {
    const o = seg * CELL;
    let v1 = k0 * cells[o + 2]!;
    let v2 = k0 * cells[o + 3]!;
    let mLow = v1 < v2 ? v1 : v2;
    let mHigh = v1 < v2 ? v2 : v1;
    v1 = k1 * cells[o + 7]!;
    v2 = k1 * cells[o + 8]!;
    mLow += v1 < v2 ? v1 : v2;
    mHigh += v1 < v2 ? v2 : v1;
    v1 = k2 * cells[o + 12]!;
    v2 = k2 * cells[o + 13]!;
    mLow += v1 < v2 ? v1 : v2;
    mHigh += v1 < v2 ? v2 : v1;
    if (mLow >= lo && mHigh <= hi) return true;

    const half = (cells[o + 1]! - cells[o]!) / 2;
    const center = k0 * cells[o + 4]! + k1 * cells[o + 9]! + k2 * cells[o + 14]!;
    const gradient = k0 * cells[o + 5]! + k1 * cells[o + 10]! + k2 * cells[o + 15]!;
    const bend =
      (k0 < 0 ? -k0 : k0) * cells[o + 6]! +
      (k1 < 0 ? -k1 : k1) * cells[o + 11]! +
      (k2 < 0 ? -k2 : k2) * cells[o + 16]!;
    const radius = (gradient < 0 ? -gradient : gradient) * half + 0.5 * bend * half * half;
    return Math.max(mLow, center - radius) >= lo && Math.min(mHigh, center + radius) <= hi;
  };

  /** Full treatment for a slab the whole-range bound could not clear. */
  const examine = (k0: number, k1: number, k2: number, lo: number, hi: number) => {
    roots.length = 0;
    flagged.length = 0;
    for (let seg = first; seg <= tail; seg++) {
      if (segmentFits(k0, k1, k2, seg, lo, hi)) continue;
      const p = Math.max(a, cells[seg * CELL]!);
      const q = Math.min(T, cells[seg * CELL + 1]!);
      if (q <= p) continue;
      c0 = k0;
      c1 = k1;
      c2 = k2;
      flagged.push(p, q);
      const offset = seg * CELL;
      const endpoints: number[] = [];
      const slopes: number[] = [];
      for (let term = 0; term < 3; term++) {
        endpoints.push(
          p === cells[offset] ? cells[offset + 2 + 5 * term]! : f(al[term]! + be[term]! * p),
        );
        endpoints.push(
          q === cells[offset + 1] ? cells[offset + 3 + 5 * term]! : f(al[term]! + be[term]! * q),
        );
        slopes.push(df(al[term]! + be[term]! * p), df(al[term]! + be[term]! * q));
      }
      findRoots(lo + SLACK, p, q, roots, 0, endpoints, slopes);
      findRoots(hi - SLACK, p, q, roots, 0, endpoints, slopes);
    }
    if (flagged.length === 0) return;
    // No crossing: each flagged stretch is wholly in or wholly out, so one midpoint decides.
    if (roots.length === 0) {
      let allInside = true;
      for (let i = 0; i < flagged.length; i += 2) {
        const v = g((flagged[i]! + flagged[i + 1]!) / 2);
        if (v < lo || v > hi) allInside = false;
      }
      if (allInside) return;
    }

    const points = [a, T, ...flagged, ...roots].sort((x, y) => x - y);
    const slab: Interval[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const p = points[i]!;
      const q = points[i + 1]!;
      if (q - p < 1e-15) continue;
      const v = g((p + q) / 2);
      if (v < lo || v > hi) continue;
      const last = slab[slab.length - 1];
      if (last && p - last[1] < 1e-12) last[1] = q;
      else slab.push([p, q]);
    }
    current = intersect(current, slab);
    if (current.length === 0) return;
    a = current[0]![0];
    T = current[current.length - 1]![1];
    regrid(false);
  };

  const scan = (from: number, to: number) => {
    let e0 = wa0;
    let e1 = wa1;
    let e2 = wa2;
    let f0 = wt0;
    let f1 = wt1;
    let f2 = wt2;
    for (let k = 5 * from; k < 5 * to; k += 5) {
      const nx = s[k]!;
      const ny = s[k + 1]!;
      const nz = s[k + 2]!;
      const lo = s[k + 3]! - SLACK;
      const hi = s[k + 4]! + SLACK;
      const k0 = nx * m00 + ny * m10 + nz * m20;
      const k1 = nx * m01 + ny * m11 + nz * m21;
      const k2 = nx * m02 + ny * m12 + nz * m22;

      // Whole-range monotone bound first: one check rules out most slabs.
      let v1 = k0 * e0;
      let v2 = k0 * f0;
      let wLow = v1 < v2 ? v1 : v2;
      let wHigh = v1 < v2 ? v2 : v1;
      v1 = k1 * e1;
      v2 = k1 * f1;
      wLow += v1 < v2 ? v1 : v2;
      wHigh += v1 < v2 ? v2 : v1;
      v1 = k2 * e2;
      v2 = k2 * f2;
      wLow += v1 < v2 ? v1 : v2;
      wHigh += v1 < v2 ? v2 : v1;
      if (wLow >= lo && wHigh <= hi) continue;

      examine(k0, k1, k2, lo, hi);
      if (current.length === 0) return;
      e0 = wa0;
      e1 = wa1;
      e2 = wa2;
      f0 = wt0;
      f1 = wt1;
      f2 = wt2;
    }
  };

  if (!index) {
    scan(0, s.length / 5);
    return current;
  }

  const { bins, center } = index;
  const binCount = bins.length / BIN_STRIDE;
  const margin = (b: number) => {
    const o = b * BIN_STRIDE;
    const mx = bins[o]!;
    const my = bins[o + 1]!;
    const mz = bins[o + 2]!;
    const shift = mx * center[0] + my * center[1] + mz * center[2];
    const k0 = mx * m00 + my * m10 + mz * m20;
    const k1 = mx * m01 + my * m11 + mz * m21;
    const k2 = mx * m02 + my * m12 + mz * m22;
    let worst = Infinity;
    for (let seg = first; seg <= tail; seg++) {
      segmentBound(k0, k1, k2, seg);
      const r = bins[o + 3]! * spread[seg]!;
      worst = Math.min(worst, bins[o + 5]! - (high - shift + r), low - shift - r - bins[o + 4]!);
    }
    return worst;
  };

  for (let b = 0; b < binCount && current.length > 0; b++) {
    const firstSlab = bins[b * BIN_STRIDE + 6]!;
    scan(firstSlab, firstSlab + 1);
  }
  for (let b = 0; b < binCount && current.length > 0; b++) {
    if (margin(b) >= 0) continue;
    const o = b * BIN_STRIDE;
    scan(bins[o + 6]! + 1, bins[o + 7]!);
  }
  return current;
}
