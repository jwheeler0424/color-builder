import type { Mat3, Vec3 } from '../math/matrix.ts';
import type { Cubic } from '../math/polynomial.ts';

export interface Lab {
  L: number;
  a: number;
  b: number;
}

export interface Lch {
  l: number;
  c: number;
  h: number;
}

/**
 * XYZ (D65) on [lo, hi] of a free variable t, in one of two exact forms:
 * - `coeffs`: a vector cubic, xyz(t) = Σ coeffs[n]·tⁿ;
 * - `separable`: xyz(t) = matrix · (f(αⱼ + βⱼ·t))ⱼ with f increasing and f′ monotone on the piece.
 */
export interface Piece {
  lo: number;
  hi: number;
  coeffs?: readonly [Vec3, Vec3, Vec3, Vec3];
  separable?: Separable;
}

export interface Separable {
  matrix: Mat3;
  terms: readonly [Term, Term, Term];
  f: (u: number) => number;
  df: (u: number) => number;
  /** f″, with |f″| monotone on the piece. */
  d2f: (u: number) => number;
}

/** A chroma line solved in another parameter t (monotone in chroma). */
export interface ChromaParam {
  max: number;
  toChroma(t: number): number;
}

export interface ColorSpace {
  id: 'cielab' | 'oklab' | 'cam16ucs';
  lightnessMax: number;
  /** Upper end of every chroma search; beyond any gamut this engine knows. */
  chromaSearchMax: number;
  /** Below this chroma the hue is reported as 0. */
  achromaticChroma: number;
  labToXyz(lab: Lab): Vec3;
  xyzToLab(xyz: Vec3): Lab;
  /** XYZ along constant (l, h) as chroma (or `chromaParam`'s t) runs over [0, max]. */
  chromaPieces(l: number, h: number, max: number): Piece[];
  /** When present, chroma pieces are parametrized by t instead of chroma. */
  chromaParam?(l: number, h: number): ChromaParam;
  /** XYZ along constant (c, h) as lightness runs over [0, max]; absent when not separable. */
  lightnessPieces?(c: number, h: number, max: number): Piece[];
  distance(x: Lab, y: Lab): number;
  css(color: Lch): string;
  /** When chroma is a compressed scale, the linear one that shares ("x% of max") should use. */
  linearChroma?: { to(c: number): number; from(m: number): number };
}

export const clamp = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v));

export const mod360 = (deg: number): number => ((deg % 360) + 360) % 360;

export const DEG_TO_RAD = Math.PI / 180;

export function lchToLab({ l, c, h }: Lch): Lab {
  const hr = mod360(h) * DEG_TO_RAD;
  return { L: l, a: c * Math.cos(hr), b: c * Math.sin(hr) };
}

export function labToLch(space: ColorSpace, { L, a, b }: Lab): Lch {
  const c = Math.hypot(a, b);
  return {
    l: L,
    c,
    h: c <= space.achromaticChroma ? 0 : mod360((Math.atan2(b, a) * 180) / Math.PI),
  };
}

export const lchToXyz = (space: ColorSpace, color: Lch): Vec3 => space.labToXyz(lchToLab(color));

export const xyzToLch = (space: ColorSpace, xyz: Vec3): Lch => labToLch(space, space.xyzToLab(xyz));

/** An argument that is affine in the free variable: alpha + beta·t. */
export interface Term {
  alpha: number;
  beta: number;
}

/**
 * Split [0, max] wherever a term crosses `breakAt` (a branch change of `termCubic`),
 * then express XYZ on each piece as a vector cubic: xyz = matrix · (termCubic_j).
 */
export function buildPieces(
  terms: readonly [Term, Term, Term],
  matrix: Mat3,
  max: number,
  termCubic: (term: Term, mid: number) => Cubic,
  breakAt?: number,
): Piece[] {
  const cuts = [0, max];
  if (breakAt !== undefined) {
    for (const { alpha, beta } of terms) {
      if (beta === 0) continue;
      const t = (breakAt - alpha) / beta;
      if (t > 0 && t < max) cuts.push(t);
    }
  }
  cuts.sort((p, q) => p - q);

  const pieces: Piece[] = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const lo = cuts[i]!;
    const hi = cuts[i + 1]!;
    if (hi <= lo) continue;
    const cubics = terms.map((term) => termCubic(term, (lo + hi) / 2));
    const coeff = (n: number): Vec3 => {
      const at = (row: Vec3) =>
        row[0] * cubics[0]![n]! + row[1] * cubics[1]![n]! + row[2] * cubics[2]![n]!;
      return [at(matrix[0]), at(matrix[1]), at(matrix[2])];
    };
    pieces.push({ lo, hi, coeffs: [coeff(0), coeff(1), coeff(2), coeff(3)] });
  }
  return pieces;
}

/** (alpha + beta·t)³ expanded in t. */
export const cubeOf = ({ alpha, beta }: Term): Cubic => [
  alpha ** 3,
  3 * alpha * alpha * beta,
  3 * alpha * beta * beta,
  beta ** 3,
];
