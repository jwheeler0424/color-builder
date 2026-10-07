import type { Mat3, Vec3 } from './math/matrix.ts';

import { SRGB } from './gamuts/rgb.ts';
import { mulVec } from './math/matrix.ts';
import { clamp } from './spaces/types.ts';

export type VisionType =
  | 'normal'
  | 'deuteranopia'
  | 'protanopia'
  | 'tritanopia'
  | 'achromatopsia'
  | 'deuteranomaly'
  | 'protanomaly'
  | 'tritanomaly'
  | 'achromatomaly';

/** Simulation matrices act on linear sRGB. */
export const VISION_TYPES: ReadonlyArray<{
  id: VisionType;
  name: string;
  desc: string;
  matrix: Mat3;
}> = [
  {
    id: 'normal',
    name: 'Normal Vision',
    desc: 'Full color perception',
    matrix: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
  },
  {
    id: 'deuteranopia',
    name: 'Deuteranopia',
    desc: 'Green-blind · ~6% of males',
    matrix: [
      [0.367, 0.861, -0.228],
      [0.28, 0.673, 0.047],
      [-0.012, 0.043, 0.969],
    ],
  },
  {
    id: 'protanopia',
    name: 'Protanopia',
    desc: 'Red-blind · ~2% of males',
    matrix: [
      [0.152, 1.053, -0.205],
      [0.115, 0.786, 0.099],
      [-0.004, -0.048, 1.052],
    ],
  },
  {
    id: 'tritanopia',
    name: 'Tritanopia',
    desc: 'Blue-yellow blind · ~0.01%',
    matrix: [
      [1.256, -0.077, -0.179],
      [-0.079, 0.931, 0.148],
      [0.005, 0.691, 0.304],
    ],
  },
  {
    id: 'achromatopsia',
    name: 'Achromatopsia',
    desc: 'Complete color blindness · very rare',
    matrix: [
      [0.299, 0.587, 0.114],
      [0.299, 0.587, 0.114],
      [0.299, 0.587, 0.114],
    ],
  },
  {
    id: 'deuteranomaly',
    name: 'Deuteranomaly',
    desc: 'Reduced green sensitivity · ~5% of males',
    matrix: [
      [0.531, 0.566, -0.097],
      [0.176, 0.764, 0.06],
      [-0.004, 0.04, 0.964],
    ],
  },
  {
    id: 'protanomaly',
    name: 'Protanomaly',
    desc: 'Reduced red sensitivity',
    matrix: [
      [0.385, 0.769, -0.154],
      [0.101, 0.83, 0.07],
      [-0.007, -0.022, 1.03],
    ],
  },
  {
    id: 'tritanomaly',
    name: 'Tritanomaly',
    desc: 'Reduced blue sensitivity',
    matrix: [
      [1.105, -0.047, -0.058],
      [-0.032, 0.972, 0.061],
      [0.001, 0.318, 0.681],
    ],
  },
  {
    id: 'achromatomaly',
    name: 'Achromatomaly',
    desc: 'Partial color blindness',
    matrix: [
      [0.618, 0.32, 0.062],
      [0.163, 0.775, 0.062],
      [0.163, 0.32, 0.516],
    ],
  },
];

const MATRICES = new Map(VISION_TYPES.map((v) => [v.id, v.matrix]));

/** How `xyz` (D65) appears with the given color vision, clipped to sRGB. */
export function simulateVision(xyz: Vec3, type: VisionType): Vec3 {
  if (type === 'normal') return [xyz[0], xyz[1], xyz[2]];
  const matrix = MATRICES.get(type);
  if (!matrix) throw new Error(`Unknown vision type: ${type}.`);
  return simulateMatrix(xyz, matrix);
}

export function simulateMatrix(xyz: Vec3, matrix: Mat3): Vec3 {
  const linear = mulVec(SRGB.linearFromXyz, xyz).map((v) => clamp(v, 0, 1)) as unknown as Vec3;
  const seen = mulVec(matrix, linear).map((v) => clamp(v, 0, 1)) as unknown as Vec3;
  return mulVec(SRGB.xyzFromLinear, seen);
}
