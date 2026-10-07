export type Cubic = readonly [c0: number, c1: number, c2: number, c3: number];

export const evalCubic = ([c0, c1, c2, c3]: Cubic, x: number): number =>
  ((c3 * x + c2) * x + c1) * x + c0;

/** Real roots of a·x² + b·x + c = 0, treating coefficients tiny relative to the rest as zero. */
export function quadraticRoots(a: number, b: number, c: number): number[] {
  const scale = Math.max(Math.abs(a), Math.abs(b), Math.abs(c));
  if (scale === 0) return [];
  if (Math.abs(a) <= 1e-14 * scale) return Math.abs(b) <= 1e-14 * scale ? [] : [-c / b];
  const disc = b * b - 4 * a * c;
  if (disc < 0) return [];
  // Cancellation-free form of the quadratic formula.
  const q = -0.5 * (b + Math.sign(b || 1) * Math.sqrt(disc));
  return q === 0 ? [0] : [q / a, c / q];
}

/** Root of g inside [lo, hi] where g changes sign: Newton's method, bisection-safeguarded. */
export function solveBracketed(
  g: (x: number) => number,
  dg: (x: number) => number,
  lo: number,
  hi: number,
): number {
  const loSign = Math.sign(g(lo));
  let x = (lo + hi) / 2;

  for (let i = 0; i < 100; i++) {
    const gx = g(x);
    if (gx === 0) return x;

    if (Math.sign(gx) === loSign) lo = x;
    else hi = x;

    const slope = dg(x);
    let next = slope !== 0 ? x - gx / slope : NaN;
    if (!(next > lo && next < hi)) next = (lo + hi) / 2;

    if (
      Math.abs(next - x) <= 1e-15 * Math.max(1, Math.abs(x)) ||
      hi - lo <= Number.EPSILON * Math.max(1, Math.abs(x))
    ) {
      return next;
    }
    x = next;
  }
  return x;
}

/**
 * Every x in (lo, hi] where the cubic equals `target`. The critical points split
 * [lo, hi] into monotone stretches, so each stretch holds at most one root.
 */
export function cubicCrossings(cubic: Cubic, target: number, lo: number, hi: number): number[] {
  const [, c1, c2, c3] = cubic;
  const g = (x: number) => evalCubic(cubic, x) - target;
  const dg = (x: number) => (3 * c3 * x + 2 * c2) * x + c1;

  const cuts = [lo];
  for (const x of quadraticRoots(3 * c3, 2 * c2, c1).sort((p, q) => p - q)) {
    if (x > lo && x < hi) cuts.push(x);
  }
  cuts.push(hi);

  const roots: number[] = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = cuts[i]!;
    const b = cuts[i + 1]!;
    const gb = g(b);
    if (gb === 0) roots.push(b);
    else if (g(a) * gb < 0) roots.push(solveBracketed(g, dg, a, b));
  }
  return roots;
}
