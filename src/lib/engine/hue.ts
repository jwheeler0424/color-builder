/**
 * Hue-linear CIELAB.
 *
 * CIELAB's hue angle is not a perceptual hue: its constant-h lines bend (blues drift toward
 * purple), so equal angle turns land on the wrong hues and chroma reduction at fixed h shifts the
 * perceived hue. Here a harmony's hue θ is measured on OKLab's hue circle (fit to hue-linearity
 * data) while lightness L*, chroma C* and ΔE2000 stay CIELAB:
 *
 * - For given (L*, C*), the CIELAB hue h with OKLab hue θ solves φ(h) = OKLab-hue(L*, C*, h) − θ = 0.
 *   φ′(h) = ∇θ·∂XYZ/∂h comes from the chain rule, so the root is polished by bracketed Newton.
 * - Large indexed gamuts bracket the hue-curve boundary using XYZ containment. Small gamuts
 *   use cubic interval boundaries and Illinois regula falsi. Both keep lightness and perceived
 *   hue fixed while fitting chroma; non-neutral origins retain interval-based fitting.
 */
import type { Gamut, RgbGamut } from './gamuts/types.ts';

import { containsXyz } from './gamuts/types.ts';
import { dot } from './math/matrix.ts';
import { solveBracketed } from './math/polynomial.ts';
import { fitChroma, gamutIntervals } from './solver.ts';
import { CIELAB, cielabHueTangent, rgbChromaUpperBound } from './spaces/cielab.ts';
import { oklabHueEvaluation, oklabHueAngle } from './spaces/oklab.ts';
import { lchToXyz, mod360 } from './spaces/types.ts';

const wrap180 = (deg: number) => mod360(deg + 180) - 180;
const fitCaches = new WeakMap<Gamut, Map<string, { c: number; h: number }>>();
const FIT_CACHE_LIMIT = 4096;

/** The CIELAB hue at (L*, C*) whose OKLab hue is θ, or NaN where no such hue exists. */
export function cielabHueFor(l: number, c: number, theta: number, guess = theta): number {
  if (c <= 1e-9 || l <= 0 || l >= CIELAB.lightnessMax) return mod360(guess);
  let pointHue = NaN;
  let evaluation: ReturnType<typeof oklabHueEvaluation> | undefined;
  const at = (hue: number) => {
    if (!evaluation || hue !== pointHue) {
      evaluation = oklabHueEvaluation(lchToXyz(CIELAB, { l, c, h: hue }));
      pointHue = hue;
    }
    return evaluation;
  };
  const phi = (h: number) => wrap180(at(h).hue - theta);
  const dphi = (h: number) => dot(at(h).gradient(), cielabHueTangent(l, c, h));

  // φ increases with h (the CIELAB circle winds once around neutral in OKLab); widen to a bracket.
  for (let span = 30; span <= 180; span *= 2) {
    const lo = guess - span;
    const hi = guess + span;
    const fLo = phi(lo);
    const fHi = phi(hi);
    if (fLo <= 0 && fHi >= 0) {
      const h = solveBracketed(phi, dphi, lo, hi);
      if (Math.abs(phi(h)) < 1e-9) return mod360(h);
    }
  }
  return NaN;
}

/** OKLab hue of an exact color: the harmony hue for hue-linear CIELAB. */
export const perceptualHue = oklabHueAngle;

/**
 * The largest in-gamut chroma ≤ target on the curve of constant L* and OKLab hue θ, with the
 * CIELAB hue it lands on.
 */
export function fitAlongHue(
  gamut: Gamut,
  l: number,
  theta: number,
  target: number,
): { c: number; h: number } {
  let cache = fitCaches.get(gamut);
  if (!cache) {
    cache = new Map();
    fitCaches.set(gamut, cache);
  }
  const key = `${l}|${theta}|${target}`;
  const hit = cache.get(key);
  if (hit) return { ...hit };
  const result = solveAlongHue(gamut, l, theta, target);
  if (cache.size >= FIT_CACHE_LIMIT) cache.delete(cache.keys().next().value!);
  cache.set(key, { ...result });
  return result;
}

function solveAlongHue(
  gamut: Gamut,
  l: number,
  theta: number,
  target: number,
): { c: number; h: number } {
  if (!gamut.index) return solveByBoundaries(gamut, l, theta, target);
  let neutral = cielabHueFor(l, 1, theta);
  if (Number.isNaN(neutral)) neutral = theta;
  if (target <= 0) return { c: 0, h: neutral };
  if (!containsXyz(gamut, lchToXyz(CIELAB, { l, c: 0, h: neutral }), 0)) {
    return solveByBoundaries(gamut, l, theta, target);
  }
  const hueAt = (chroma: number) => cielabHueFor(l, chroma, theta, neutral);
  const fits = (chroma: number, hue: number) =>
    !Number.isNaN(hue) &&
    Math.abs(wrap180(hue - neutral)) < 90 &&
    containsXyz(gamut, lchToXyz(CIELAB, { l, c: chroma, h: hue }), 0);
  const requestedHue = hueAt(target);
  if (fits(target, requestedHue)) return { c: target, h: requestedHue };
  let lower = 0;
  let upper = target;
  const tolerance = 1e-12 * Math.max(1, target);
  for (let iteration = 0; iteration < 60 && upper - lower > tolerance; iteration++) {
    const chroma = (lower + upper) / 2;
    if (fits(chroma, hueAt(chroma))) lower = chroma;
    else upper = chroma;
  }
  return { c: lower, h: hueAt(lower) };
}

function solveByBoundaries(
  gamut: Gamut,
  l: number,
  theta: number,
  target: number,
): { c: number; h: number } {
  // Near neutral the hue map is tame; every solve starts from there and must stay on that branch.
  let h = cielabHueFor(l, 1, theta);
  if (Number.isNaN(h)) h = theta;
  const neutral = h;
  const onBranch = (x: number) => !Number.isNaN(x) && Math.abs(wrap180(x - neutral)) < 90;
  if (target <= 0) return { c: 0, h };
  const atTarget = cielabHueFor(l, target, theta, neutral);
  if (onBranch(atTarget) && fitChroma(CIELAB, gamut, l, atTarget, target) >= target) {
    return { c: target, h: atTarget };
  }

  const hueAt = (c: number) => {
    const next = cielabHueFor(l, c, theta, neutral);
    if (!onBranch(next)) return NaN;
    h = next;
    return next;
  };
  // Unsolvable hues only occur far outside every real gamut, so count them as outside.
  const F = (c: number) => {
    const at = hueAt(c);
    if (Number.isNaN(at)) return c;
    const intervals = gamutIntervals(CIELAB, gamut, l, at);
    for (let index = intervals.length - 1; index >= 0; index--) {
      const [start, end] = intervals[index]!;
      if (start <= c) return c - end;
    }
    return Math.max(c, 1e-9);
  };

  let lo = 0;
  let hi = target;
  let fLo = F(lo);
  let fHi = F(hi);
  if (fLo >= 0) return { c: 0, h: hueAt(0) };
  let side = 0;
  for (let i = 0; i < 100 && hi - lo > 1e-12 * Math.max(1, target); i++) {
    const c = (lo * fHi - hi * fLo) / (fHi - fLo);
    const fc = F(c);
    if (fc <= 0) {
      lo = c;
      fLo = fc;
      // Illinois: halve the stale endpoint so convergence stays superlinear.
      if (side === -1) fHi /= 2;
      side = -1;
    } else {
      hi = c;
      fHi = fc;
      if (side === 1) fLo /= 2;
      side = 1;
    }
  }
  return { c: lo, h: hueAt(lo) };
}

export const maxAlongHue = (gamut: Gamut, l: number, theta: number): number =>
  fitAlongHue(
    gamut,
    l,
    theta,
    'xyzFromLinear' in gamut ? rgbChromaUpperBound(gamut as RgbGamut, l) : CIELAB.chromaSearchMax,
  ).c;
