/**
 * CAM16 (Li et al. 2017) and its uniform colour space CAM16-UCS, as a ColorSpace.
 *
 * Lab coordinates are (J′, a′, b′) with J′ = 1.7J/(1 + 0.007J) and M′ = ln(1 + 0.0228M)/0.0228.
 * Along a line of constant (J, h) the post-adaptation responses are affine in one parameter γ
 * (the a, b magnitude), and XYZ is M16⁻¹·D⁻¹·(f(Rₐ), f(Gₐ), f(Bₐ)) with f the inverse response
 * compression: a separable-monotone curve, which separable.ts solves exactly.
 */
import { invert, mulVec, type Mat3, type Vec3 } from '../math/matrix.ts';
import {
  DEG_TO_RAD,
  mod360,
  type ChromaParam,
  type ColorSpace,
  type Lch,
  type Piece,
  type Term,
} from './types.ts';

const M16: Mat3 = [
  [0.401288, 0.650173, -0.051461],
  [-0.250268, 1.204414, 0.045854],
  [-0.002079, 0.048952, 0.953127],
];
const M16_INV: Mat3 = invert(M16);

const SURROUNDS = {
  average: { F: 1, c: 0.69, Nc: 1 },
  dim: { F: 0.9, c: 0.59, Nc: 0.9 },
  dark: { F: 0.8, c: 0.525, Nc: 0.8 },
} as const;

export interface ViewingConditions {
  /** Adopted white, XYZ with Y = 100. */
  white: Vec3;
  /** Adapting luminance L_A in cd/m². */
  adaptingLuminance: number;
  /** Background luminance factor Y_b (relative to Y_w = 100). */
  background: number;
  surround: keyof typeof SURROUNDS;
  discountIlluminant?: boolean;
}

const lstarToY = (lstar: number) =>
  100 * (lstar > 8 ? ((lstar + 16) / 116) ** 3 : lstar / (24389 / 27));

/** The web-UI conditions used by Material's HCT: D65, L_A = (200/π)·Y(L* 50)/100, Y_b = Y(L* 50), average. */
export const DEFAULT_VIEWING: ViewingConditions = {
  white: [(0.3127 / 0.329) * 100, 100, ((1 - 0.3127 - 0.329) / 0.329) * 100],
  adaptingLuminance: ((200 / Math.PI) * lstarToY(50)) / 100,
  background: lstarToY(50),
  surround: 'average',
};

export interface Cam16 {
  J: number;
  C: number;
  h: number;
  M: number;
}

export interface Cam16Model {
  forward(xyz: Vec3): Cam16;
  /** XYZ (Y = 1 scale) from lightness J, colourfulness M and hue h. */
  inverse(J: number, M: number, h: number): Vec3;
  /** XYZ along constant (J, h) as a separable piece set in γ, plus γ ↔ M. */
  chromaLine(
    J: number,
    h: number,
    maxM: number,
  ): { pieces: Piece[]; max: number; toM(g: number): number };
}

export function cam16Model(vc: ViewingConditions = DEFAULT_VIEWING): Cam16Model {
  const { F, c, Nc } = SURROUNDS[vc.surround];
  const LA = vc.adaptingLuminance;
  const rgbW = mulVec(M16, vc.white);
  const D = vc.discountIlluminant
    ? 1
    : Math.min(1, Math.max(0, F * (1 - (1 / 3.6) * Math.exp((-LA - 42) / 92))));
  const yW = vc.white[1];
  const rgbD = rgbW.map((w) => (D * yW) / w + 1 - D) as unknown as Vec3;
  const k = 1 / (5 * LA + 1);
  const k4 = k ** 4;
  const FL = k4 * (5 * LA) + 0.1 * (1 - k4) ** 2 * Math.cbrt(5 * LA);
  const n = vc.background / yW;
  const z = 1.48 + Math.sqrt(n);
  const Nbb = 0.725 / n ** 0.2;
  const Ncb = Nbb;
  const flRoot = FL ** 0.25;
  const chromaScale = (1.64 - 0.29 ** n) ** 0.73;

  const compress = (v: number) => {
    const af = ((FL * Math.abs(v)) / 100) ** 0.42;
    return (Math.sign(v) * 400 * af) / (af + 27.13);
  };
  // Inverse response compression, increasing; f′ grows with |u| on each side of 0.
  const expand = (u: number) => {
    const a = Math.abs(u);
    const sign = u < 0 ? -1 : u > 0 ? 1 : u;
    return sign * (100 / FL) * ((27.13 * a) / (400 - a)) ** (1 / 0.42);
  };
  const expandSlope = (u: number) => {
    const a = Math.abs(u);
    const ratio = (27.13 * a) / (400 - a);
    return (100 / FL) * (1 / 0.42) * ratio ** (1 / 0.42 - 1) * ((27.13 * 400) / (400 - a) ** 2);
  };
  // f″ = sign(u)·K·[p(p−1)r^(p−2)r′² + p·r^(p−1)r″], every factor growing with |u|.
  const expandCurvature = (u: number) => {
    const a = Math.abs(u);
    const p = 1 / 0.42;
    const r = (27.13 * a) / (400 - a);
    const r1 = (27.13 * 400) / (400 - a) ** 2;
    const r2 = (2 * 27.13 * 400) / (400 - a) ** 3;
    return (
      Math.sign(u) * (100 / FL) * (p * (p - 1) * r ** (p - 2) * r1 * r1 + p * r ** (p - 1) * r2)
    );
  };

  const rgbAW = rgbW.map((w, i) => compress(rgbD[i]! * w));
  const Aw = (2 * rgbAW[0]! + rgbAW[1]! + 0.05 * rgbAW[2]!) * Nbb;

  const eHue = (h: number) => 0.25 * (Math.cos(h * DEG_TO_RAD + 2) + 3.8);
  const p1Of = (h: number) => (50000 / 13) * Nc * Ncb * eHue(h);
  const p2Of = (J: number) => (Aw * (J / 100) ** (1 / (c * z))) / Nbb;

  // XYZ (Y = 1) = OUT · (expanded R, G, B).
  const OUT: Mat3 = M16_INV.map((row) => row.map((v, j) => v / rgbD[j]! / 100)) as unknown as Mat3;

  const forward = (xyz: Vec3): Cam16 => {
    const rgb = mulVec(M16, [xyz[0] * 100, xyz[1] * 100, xyz[2] * 100]);
    const [rA, gA, bA] = rgb.map((v, i) => compress(rgbD[i]! * v)) as [number, number, number];
    const a = (11 * rA - 12 * gA + bA) / 11;
    const b = (rA + gA - 2 * bA) / 9;
    const u = (20 * rA + 20 * gA + 21 * bA) / 20;
    const p2 = (40 * rA + 20 * gA + bA) / 20;
    const h = mod360((Math.atan2(b, a) * 180) / Math.PI);
    const A = p2 * Nbb;
    const J = A > 0 ? 100 * (A / Aw) ** (c * z) : 0;
    const t = (p1Of(h) * Math.hypot(a, b)) / (u + 0.305);
    const C = t ** 0.9 * Math.sqrt(J / 100) * chromaScale;
    return { J, C, h, M: C * flRoot };
  };

  /** The post-adaptation coefficients along (J, h): uⱼ(γ) = αⱼ + βⱼγ. */
  const line = (J: number, h: number) => {
    const p2 = p2Of(J);
    const cos = Math.cos(h * DEG_TO_RAD);
    const sin = Math.sin(h * DEG_TO_RAD);
    const alpha = (460 * p2) / 1403;
    const terms: [Term, Term, Term] = [
      { alpha, beta: (451 * cos + 288 * sin) / 1403 },
      { alpha, beta: (-891 * cos - 261 * sin) / 1403 },
      { alpha, beta: (-220 * cos - 6300 * sin) / 1403 },
    ];
    // γ = K·t / (P + Q·t), where t is the CAM16 chroma-magnitude variable.
    return { p2, terms, K: 23 * (p2 + 0.305), P: 23 * p1Of(h), Q: 11 * cos + 108 * sin };
  };

  const tOfM = (J: number, M: number) =>
    J <= 0 ? 0 : (M / flRoot / Math.sqrt(J / 100) / chromaScale) ** (1 / 0.9);
  const mOfT = (J: number, t: number) => t ** 0.9 * chromaScale * Math.sqrt(J / 100) * flRoot;

  const inverse = (J: number, M: number, h: number): Vec3 => {
    if (J <= 0) return [0, 0, 0];
    const { terms, K, P, Q } = line(J, h);
    const t = tOfM(J, M);
    const gamma = (K * t) / (P + Q * t);
    return mulVec(
      OUT,
      terms.map((term) => expand(term.alpha + term.beta * gamma)) as unknown as Vec3,
    );
  };

  const chromaLine = (J: number, h: number, maxM: number) => {
    const { terms, K, P, Q } = line(J, h);
    const gammaOf = (t: number) => (K * t) / (P + Q * t);
    // γ is valid while every |uⱼ| < 400; when Q < 0, γ(t) runs to infinity before the M cap.
    const tMax = tOfM(J, maxM);
    let max = Q < 0 && P + Q * tMax <= 0 ? Infinity : gammaOf(tMax);
    for (const { alpha, beta } of terms) {
      if (beta > 0) max = Math.min(max, (400 - alpha) / beta);
      if (beta < 0) max = Math.min(max, (-400 - alpha) / beta);
    }
    max *= 1 - 1e-9;

    const cuts = [0, max];
    for (const { alpha, beta } of terms) {
      const at = beta !== 0 ? -alpha / beta : -1;
      if (at > 0 && at < max) cuts.push(at);
    }
    cuts.sort((x, y) => x - y);
    const pieces: Piece[] = [];
    for (let i = 0; i < cuts.length - 1; i++) {
      if (cuts[i + 1]! <= cuts[i]!) continue;
      pieces.push({
        lo: cuts[i]!,
        hi: cuts[i + 1]!,
        separable: { matrix: OUT, terms, f: expand, df: expandSlope, d2f: expandCurvature },
      });
    }
    const toM = (g: number) => mOfT(J, (P * g) / (K - Q * g));
    return { pieces, max, toM };
  };

  return { forward, inverse, chromaLine };
}

const jPrime = (J: number) => (1.7 * J) / (1 + 0.007 * J);
const jFromPrime = (Jp: number) => Jp / (1.7 - 0.007 * Jp);
const mPrime = (M: number) => Math.log1p(0.0228 * M) / 0.0228;
const mFromPrime = (Mp: number) => Math.expm1(0.0228 * Mp) / 0.0228;

export function createCam16Ucs(vc: ViewingConditions = DEFAULT_VIEWING): ColorSpace {
  const model = cam16Model(vc);
  const lines = new Map<string, ReturnType<Cam16Model['chromaLine']>>();
  const lineAt = (l: number, h: number, maxMp: number) => {
    const key = `${l}|${h}|${maxMp}`;
    let line = lines.get(key);
    if (!line) {
      if (lines.size > 256) lines.clear();
      line = model.chromaLine(jFromPrime(l), h, mFromPrime(maxMp));
      lines.set(key, line);
    }
    return line;
  };

  const space: ColorSpace = {
    id: 'cam16ucs',
    lightnessMax: 100,
    chromaSearchMax: 100,
    achromaticChroma: 1e-4,

    labToXyz({ L, a, b }) {
      const h = mod360((Math.atan2(b, a) * 180) / Math.PI);
      return model.inverse(jFromPrime(L), mFromPrime(Math.hypot(a, b)), h);
    },

    xyzToLab(xyz) {
      const { J, M, h } = model.forward(xyz);
      const Mp = mPrime(M);
      return { L: jPrime(J), a: Mp * Math.cos(h * DEG_TO_RAD), b: Mp * Math.sin(h * DEG_TO_RAD) };
    },

    chromaParam(l, h): ChromaParam {
      const line = lineAt(l, h, space.chromaSearchMax);
      return { max: line.max, toChroma: (g) => mPrime(line.toM(g)) };
    },

    chromaPieces(l, h, max) {
      return lineAt(l, h, space.chromaSearchMax).pieces.filter((p) => p.lo < max);
    },

    distance: (x, y) => Math.hypot(x.L - y.L, x.a - y.a, x.b - y.b),

    // M′ is log-compressed; a share of M′ would drain colourfulness far faster than a share of M.
    linearChroma: { to: mFromPrime, from: mPrime },

    // No CSS syntax for CAM16; XYZ D65 carries the exact color.
    css(color: Lch) {
      const [X, Y, Z] = space.labToXyz({
        L: color.l,
        a: color.c * Math.cos(color.h * DEG_TO_RAD),
        b: color.c * Math.sin(color.h * DEG_TO_RAD),
      });
      return `color(xyz-d65 ${X} ${Y} ${Z})`;
    },
  };
  return space;
}

export const CAM16_UCS: ColorSpace = createCam16Ucs();
