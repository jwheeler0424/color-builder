import { invert, mulVec, type Mat3, type Vec3 } from '../math/matrix.ts';
import {
  DEG_TO_RAD,
  buildPieces,
  cubeOf,
  mod360,
  type ColorSpace,
  type Lch,
  type Term,
} from './types.ts';

// CSS Color 4 matrices, recomputed at 64-bit precision for a consistent D65 white.
const LMS_FROM_XYZ: Mat3 = [
  [0.819022437996703, 0.3619062600528904, -0.1288737815209879],
  [0.0329836539323885, 0.9292868615863434, 0.0361446663506424],
  [0.0481771893596242, 0.2642395317527308, 0.6335478284694309],
];

const OKLAB_FROM_LMS: Mat3 = [
  [0.210454268309314, 0.7936177747023054, -0.0040720430116193],
  [1.9779985324311684, -2.4285922420485799, 0.450593709617411],
  [0.0259040424655478, 0.7827717124575296, -0.8086757549230774],
];

// Exact inverses, so both directions round-trip to the last bit the matrices allow.
const XYZ_FROM_LMS: Mat3 = invert(LMS_FROM_XYZ);
const LMS_FROM_OKLAB: Mat3 = invert(OKLAB_FROM_LMS);

const terms = (alpha: (row: Mat3[number]) => number, beta: (row: Mat3[number]) => number) =>
  LMS_FROM_OKLAB.map((row) => ({ alpha: alpha(row), beta: beta(row) })) as [Term, Term, Term];

export function oklabHueAngle(xyz: Vec3): number {
  const roots = mulVec(LMS_FROM_XYZ, xyz).map(Math.cbrt);
  const [, opponentA, opponentB] = mulVec(OKLAB_FROM_LMS, roots as unknown as Vec3);
  return mod360(Math.atan2(opponentB, opponentA) / DEG_TO_RAD);
}

/** OKLab hue (degrees) of an XYZ color, and its gradient ∂h/∂XYZ by the chain rule. */
export function oklabHue(xyz: Vec3): { hue: number; gradient: Vec3 } {
  const lp = mulVec(LMS_FROM_XYZ, xyz).map(Math.cbrt);
  const [, a, b] = mulVec(OKLAB_FROM_LMS, lp as unknown as Vec3);
  return { hue: mod360(Math.atan2(b, a) / DEG_TO_RAD), gradient: hueGradient(lp, a, b) };
}

function hueGradient(roots: number[], opponentA: number, opponentB: number): Vec3 {
  const radiusSquared = opponentA * opponentA + opponentB * opponentB;
  const scaleA = -opponentB / radiusSquared;
  const scaleB = opponentA / radiusSquared;
  const derivativeL =
    (scaleA * OKLAB_FROM_LMS[1][0] + scaleB * OKLAB_FROM_LMS[2][0]) / (3 * roots[0]! * roots[0]!);
  const derivativeM =
    (scaleA * OKLAB_FROM_LMS[1][1] + scaleB * OKLAB_FROM_LMS[2][1]) / (3 * roots[1]! * roots[1]!);
  const derivativeS =
    (scaleA * OKLAB_FROM_LMS[1][2] + scaleB * OKLAB_FROM_LMS[2][2]) / (3 * roots[2]! * roots[2]!);
  return [
    (derivativeL * LMS_FROM_XYZ[0][0] +
      derivativeM * LMS_FROM_XYZ[1][0] +
      derivativeS * LMS_FROM_XYZ[2][0]) /
      DEG_TO_RAD,
    (derivativeL * LMS_FROM_XYZ[0][1] +
      derivativeM * LMS_FROM_XYZ[1][1] +
      derivativeS * LMS_FROM_XYZ[2][1]) /
      DEG_TO_RAD,
    (derivativeL * LMS_FROM_XYZ[0][2] +
      derivativeM * LMS_FROM_XYZ[1][2] +
      derivativeS * LMS_FROM_XYZ[2][2]) /
      DEG_TO_RAD,
  ];
}

export function oklabHueEvaluation(xyz: Vec3): { hue: number; gradient(): Vec3 } {
  const roots = mulVec(LMS_FROM_XYZ, xyz).map(Math.cbrt);
  const [, opponentA, opponentB] = mulVec(OKLAB_FROM_LMS, roots as unknown as Vec3);
  let gradient: Vec3 | undefined;
  return {
    hue: mod360(Math.atan2(opponentB, opponentA) / DEG_TO_RAD),
    gradient: () => (gradient ??= hueGradient(roots, opponentA, opponentB)),
  };
}

export const OKLAB: ColorSpace = {
  id: 'oklab',
  lightnessMax: 1,
  chromaSearchMax: 1.5,
  achromaticChroma: 0.000004,

  labToXyz({ L, a, b }) {
    const [l, m, s] = mulVec(LMS_FROM_OKLAB, [L, a, b]);
    return mulVec(XYZ_FROM_LMS, [l ** 3, m ** 3, s ** 3]);
  },

  xyzToLab(xyz) {
    const [l, m, s] = mulVec(LMS_FROM_XYZ, xyz);
    const [L, a, b] = mulVec(OKLAB_FROM_LMS, [Math.cbrt(l), Math.cbrt(m), Math.cbrt(s)]);
    return { L, a, b };
  },

  chromaPieces(l, h, max) {
    const cos = Math.cos(h * DEG_TO_RAD);
    const sin = Math.sin(h * DEG_TO_RAD);
    const t = terms(
      (row) => row[0] * l,
      (row) => row[1] * cos + row[2] * sin,
    );
    return buildPieces(t, XYZ_FROM_LMS, max, cubeOf);
  },

  lightnessPieces(c, h, max) {
    const a = c * Math.cos(h * DEG_TO_RAD);
    const b = c * Math.sin(h * DEG_TO_RAD);
    const t = terms(
      (row) => row[1] * a + row[2] * b,
      (row) => row[0],
    );
    return buildPieces(t, XYZ_FROM_LMS, max, cubeOf);
  },

  distance: (x, y) => Math.hypot(x.L - y.L, x.a - y.a, x.b - y.b),

  css: ({ l, c, h }: Lch) => `oklch(${l} ${c} ${h})`,
};
