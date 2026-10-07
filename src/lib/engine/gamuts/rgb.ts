import type { RgbGamut } from './types.ts';

import { invert, mulVec, type Mat3, type Vec3 } from '../math/matrix.ts';

const srgbEncode = (v: number): number => {
  const abs = Math.abs(v);
  return abs > 0.0031308 ? Math.sign(v) * (1.055 * abs ** (1 / 2.4) - 0.055) : 12.92 * v;
};

const srgbDecode = (v: number): number => {
  const abs = Math.abs(v);
  return abs <= 0.04045 ? v / 12.92 : Math.sign(v) * ((abs + 0.055) / 1.055) ** 2.4;
};

/** CSS Color 4 uses the BT.1886 reference EOTF (pure 2.4 gamma) for rec2020. */
const rec2020Encode = (v: number): number => Math.sign(v) * Math.abs(v) ** (1 / 2.4);
const rec2020Decode = (v: number): number => Math.sign(v) * Math.abs(v) ** 2.4;

function rgbGamut(
  id: RgbGamut['id'],
  label: string,
  cssId: RgbGamut['cssId'],
  xyzFromLinear: Mat3,
  encode: (v: number) => number,
  decode: (v: number) => number,
): RgbGamut {
  const linearFromXyz = invert(xyzFromLinear);
  const slabs = new Float64Array(15);
  linearFromXyz.forEach((row, i) => slabs.set([row[0], row[1], row[2], 0, 1], i * 5));
  return { id, label, cssId, xyzFromLinear, linearFromXyz, encode, decode, slabs };
}

// Rational matrices from CSS Color 4, derived from the primaries and D65 (0.3127, 0.3290).
export const SRGB = rgbGamut(
  'srgb',
  'sRGB',
  'srgb',
  [
    [506752 / 1228815, 87881 / 245763, 12673 / 70218],
    [87098 / 409605, 175762 / 245763, 12673 / 175545],
    [7918 / 409605, 87881 / 737289, 1001167 / 1053270],
  ],
  srgbEncode,
  srgbDecode,
);

export const DISPLAY_P3 = rgbGamut(
  'p3',
  'Display P3',
  'display-p3',
  [
    [608311 / 1250200, 189793 / 714400, 198249 / 1000160],
    [35783 / 156275, 247089 / 357200, 198249 / 2500400],
    [0, 32229 / 714400, 5220557 / 5000800],
  ],
  srgbEncode,
  srgbDecode,
);

export const REC2020 = rgbGamut(
  'rec2020',
  'Rec.2020',
  'rec2020',
  [
    [63426534 / 99577255, 20160776 / 139408157, 47086771 / 278816314],
    [26158966 / 99577255, 472592308 / 697040785, 8267143 / 139408157],
    [0, 19567812 / 697040785, 295819943 / 278816314],
  ],
  rec2020Encode,
  rec2020Decode,
);

export const DISPLAY_GAMUTS: readonly RgbGamut[] = [SRGB, DISPLAY_P3, REC2020];

/** D65 white as XYZ with Y = 1, from the chromaticity (0.3127, 0.3290). */
export const WHITE_D65: Vec3 = [0.3127 / 0.329, 1, (1 - 0.3127 - 0.329) / 0.329];

/** Encoded RGB in 0..1 (unclamped, so out-of-gamut colors show up as values outside 0..1). */
export const xyzToEncoded = (gamut: RgbGamut, xyz: Vec3): Vec3 =>
  mulVec(gamut.linearFromXyz, xyz).map(gamut.encode) as unknown as Vec3;

export const encodedToXyz = (gamut: RgbGamut, rgb: Vec3): Vec3 =>
  mulVec(gamut.xyzFromLinear, rgb.map(gamut.decode) as unknown as Vec3);
