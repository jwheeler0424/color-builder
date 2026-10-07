import type { RgbGamut } from '../gamuts/types.ts';

import { invert, mulMat, mulVec, type Mat3, type Vec3 } from '../math/matrix.ts';
import {
  DEG_TO_RAD,
  buildPieces,
  cubeOf,
  mod360,
  type ColorSpace,
  type Lab,
  type Lch,
  type Term,
} from './types.ts';

/** CIE constants: κ = 24389/27, ε = (6/29)³, δ = 6/29. */
const KAPPA = 24389 / 27;
const EPSILON = 216 / 24389;
const DELTA = 6 / 29;

export const WHITE_D50: Vec3 = [0.3457 / 0.3585, 1, (1 - 0.3457 - 0.3585) / 0.3585];

/** Bradford D65 -> D50, as published in CSS Color 4. */
export const XYZ_D50_FROM_D65: Mat3 = [
  [1.0479297925449969, 0.022946870601609652, -0.05019226628920524],
  [0.02962780877005599, 0.9904344267538799, -0.017073799063418826],
  [-0.009243040646204504, 0.015055191490298152, 0.7518742814281371],
];

export const XYZ_D65_FROM_D50: Mat3 = invert(XYZ_D50_FROM_D65);

/** Maps (finv(fx), finv(fy), finv(fz)) straight to XYZ D65. */
const XYZ_D65_FROM_LAB_TERMS: Mat3 = mulMat(XYZ_D65_FROM_D50, [
  [WHITE_D50[0], 0, 0],
  [0, WHITE_D50[1], 0],
  [0, 0, WHITE_D50[2]],
]);

const labF = (t: number): number => (t > EPSILON ? Math.cbrt(t) : (KAPPA * t + 16) / 116);
const labFInverse = (t: number): number => (t > DELTA ? t ** 3 : (116 * t - 16) / KAPPA);
const labFInverseSlope = (t: number): number => (t > DELTA ? 3 * t * t : 116 / KAPPA);

const rgbBounds = new WeakMap<RgbGamut, { matrix: Mat3; values: Map<number, number> }>();

/** Fixed-L* cube sections have edge-intersection vertices; monotone Lab transforms bound their chroma. */
export function rgbChromaUpperBound(gamut: RgbGamut, lightness: number): number {
  if (lightness <= 0 || lightness >= 100) return 0;
  let cache = rgbBounds.get(gamut);
  if (!cache) {
    cache = { matrix: mulMat(XYZ_D50_FROM_D65, gamut.xyzFromLinear), values: new Map() };
    rgbBounds.set(gamut, cache);
  }
  const hit = cache.values.get(lightness);
  if (hit !== undefined) return hit;
  const [xRow, yRow, zRow] = cache.matrix;
  const fy = (lightness + 16) / 116;
  const targetY = labFInverse(fy);
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let axis = 0; axis < 3; axis++) {
    const first = (axis + 1) % 3;
    const second = (axis + 2) % 3;
    for (let corner = 0; corner < 4; corner++) {
      const rgb: [number, number, number] = [0, 0, 0];
      rgb[first] = corner & 1;
      rgb[second] = corner >> 1;
      const channel =
        (targetY - yRow[first]! * rgb[first]! - yRow[second]! * rgb[second]!) / yRow[axis]!;
      if (channel < -1e-10 || channel > 1 + 1e-10) continue;
      rgb[axis] = channel;
      const x = xRow[0] * rgb[0] + xRow[1] * rgb[1] + xRow[2] * rgb[2];
      const z = zRow[0] * rgb[0] + zRow[1] * rgb[1] + zRow[2] * rgb[2];
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }
  }
  const maxA = Math.max(
    Math.abs(500 * (labF(minX / WHITE_D50[0]) - fy)),
    Math.abs(500 * (labF(maxX / WHITE_D50[0]) - fy)),
  );
  const maxB = Math.max(
    Math.abs(200 * (fy - labF(minZ / WHITE_D50[2]))),
    Math.abs(200 * (fy - labF(maxZ / WHITE_D50[2]))),
  );
  const bound =
    Number.isFinite(maxA) && Number.isFinite(maxB)
      ? Math.hypot(maxA, maxB) * (1 + 1e-12) + 1e-5
      : 600;
  if (cache.values.size >= 256) cache.values.delete(cache.values.keys().next().value!);
  cache.values.set(lightness, bound);
  return bound;
}

/** ∂XYZ/∂h (per degree) at CIELAB (L*, C*, h): the tangent of the constant-(L*, C*) circle. */
export function cielabHueTangent(l: number, c: number, h: number): Vec3 {
  const hr = h * DEG_TO_RAD;
  const fy = (l + 16) / 116;
  const fx = fy + (c * Math.cos(hr)) / 500;
  const fz = fy - (c * Math.sin(hr)) / 200;
  return mulVec(XYZ_D65_FROM_LAB_TERMS, [
    labFInverseSlope(fx) * ((-c * Math.sin(hr) * DEG_TO_RAD) / 500),
    0,
    labFInverseSlope(fz) * ((-c * Math.cos(hr) * DEG_TO_RAD) / 200),
  ]);
}

function termCubic(term: Term, mid: number) {
  if (term.alpha + term.beta * mid > DELTA) return cubeOf(term);
  return [(116 * term.alpha - 16) / KAPPA, (116 * term.beta) / KAPPA, 0, 0] as const;
}

const hueDegrees = (b: number, aPrime: number): number =>
  aPrime === 0 && b === 0 ? 0 : mod360((Math.atan2(b, aPrime) * 180) / Math.PI);

/** CIEDE2000 (Sharma, Wu and Dalal's formulation). */
export function deltaE2000(x: Lab, y: Lab): number {
  const c1 = Math.hypot(x.a, x.b);
  const c2 = Math.hypot(y.a, y.b);
  const cBar7 = ((c1 + c2) / 2) ** 7;
  const g = 0.5 * (1 - Math.sqrt(cBar7 / (cBar7 + 25 ** 7)));

  const a1 = (1 + g) * x.a;
  const a2 = (1 + g) * y.a;
  const c1p = Math.hypot(a1, x.b);
  const c2p = Math.hypot(a2, y.b);
  const h1p = hueDegrees(x.b, a1);
  const h2p = hueDegrees(y.b, a2);

  const dL = y.L - x.L;
  const dC = c2p - c1p;
  const chromatic = c1p * c2p !== 0;

  let dh = 0;
  if (chromatic) {
    dh = h2p - h1p;
    if (dh > 180) dh -= 360;
    else if (dh < -180) dh += 360;
  }
  const dH = 2 * Math.sqrt(c1p * c2p) * Math.sin((dh * DEG_TO_RAD) / 2);

  const lBar = (x.L + y.L) / 2;
  const cBar = (c1p + c2p) / 2;

  let hBar: number;
  if (!chromatic) hBar = h1p + h2p;
  else if (Math.abs(h1p - h2p) <= 180) hBar = (h1p + h2p) / 2;
  else hBar = h1p + h2p < 360 ? (h1p + h2p + 360) / 2 : (h1p + h2p - 360) / 2;

  const rad = (deg: number) => deg * DEG_TO_RAD;
  const T =
    1 -
    0.17 * Math.cos(rad(hBar - 30)) +
    0.24 * Math.cos(rad(2 * hBar)) +
    0.32 * Math.cos(rad(3 * hBar + 6)) -
    0.2 * Math.cos(rad(4 * hBar - 63));

  const dTheta = 30 * Math.exp(-(((hBar - 275) / 25) ** 2));
  const cBarP7 = cBar ** 7;
  const rC = 2 * Math.sqrt(cBarP7 / (cBarP7 + 25 ** 7));
  const sL = 1 + (0.015 * (lBar - 50) ** 2) / Math.sqrt(20 + (lBar - 50) ** 2);
  const sC = 1 + 0.045 * cBar;
  const sH = 1 + 0.015 * cBar * T;
  const rT = -Math.sin(rad(2 * dTheta)) * rC;

  const l = dL / sL;
  const c = dC / sC;
  const h = dH / sH;
  return Math.sqrt(l * l + c * c + h * h + rT * c * h);
}

/** CIELAB with a D50 white, matching CSS `lab()` / `lch()`. */
export const CIELAB: ColorSpace = {
  id: 'cielab',
  lightnessMax: 100,
  chromaSearchMax: 600,
  achromaticChroma: 0.0015,

  labToXyz({ L, a, b }) {
    const fy = (L + 16) / 116;
    return mulVec(XYZ_D65_FROM_LAB_TERMS, [
      labFInverse(fy + a / 500),
      labFInverse(fy),
      labFInverse(fy - b / 200),
    ]);
  },

  xyzToLab(xyz) {
    const [x, y, z] = mulVec(XYZ_D50_FROM_D65, xyz);
    const fx = labF(x / WHITE_D50[0]);
    const fy = labF(y / WHITE_D50[1]);
    const fz = labF(z / WHITE_D50[2]);
    return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
  },

  chromaPieces(l, h, max) {
    const fy = (l + 16) / 116;
    const terms: [Term, Term, Term] = [
      { alpha: fy, beta: Math.cos(h * DEG_TO_RAD) / 500 },
      { alpha: fy, beta: 0 },
      { alpha: fy, beta: -Math.sin(h * DEG_TO_RAD) / 200 },
    ];
    return buildPieces(terms, XYZ_D65_FROM_LAB_TERMS, max, termCubic, DELTA);
  },

  lightnessPieces(c, h, max) {
    const a = c * Math.cos(h * DEG_TO_RAD);
    const b = c * Math.sin(h * DEG_TO_RAD);
    const terms: [Term, Term, Term] = [
      { alpha: 16 / 116 + a / 500, beta: 1 / 116 },
      { alpha: 16 / 116, beta: 1 / 116 },
      { alpha: 16 / 116 - b / 200, beta: 1 / 116 },
    ];
    return buildPieces(terms, XYZ_D65_FROM_LAB_TERMS, max, termCubic, DELTA);
  },

  distance: deltaE2000,

  css: ({ l, c, h }: Lch) => `lch(${l} ${c} ${h})`,
};
