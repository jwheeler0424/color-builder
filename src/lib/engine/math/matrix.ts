export type Vec3 = readonly [number, number, number];
export type Mat3 = readonly [Vec3, Vec3, Vec3];

export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

export const mulVec = (m: Mat3, v: Vec3): Vec3 => [dot(m[0], v), dot(m[1], v), dot(m[2], v)];

export function mulMat(a: Mat3, b: Mat3): Mat3 {
  const col = (j: number): Vec3 => [b[0][j]!, b[1][j]!, b[2][j]!];
  const [c0, c1, c2] = [mulVec(a, col(0)), mulVec(a, col(1)), mulVec(a, col(2))];
  return [
    [c0[0], c1[0], c2[0]],
    [c0[1], c1[1], c2[1]],
    [c0[2], c1[2], c2[2]],
  ];
}

export function invert(m: Mat3): Mat3 {
  const [[a, b, c], [d, e, f], [g, h, i]] = m;
  const A = e * i - f * h;
  const B = f * g - d * i;
  const C = d * h - e * g;
  const det = a * A + b * B + c * C;
  return [
    [A / det, (c * h - b * i) / det, (b * f - c * e) / det],
    [B / det, (a * i - c * g) / det, (c * d - a * f) / det],
    [C / det, (b * g - a * h) / det, (a * e - b * d) / det],
  ];
}
