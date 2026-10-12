import type { ColorValue } from './color.ts';

import { OKLAB } from './spaces/oklab.ts';
import { xyzToLch } from './spaces/types.ts';

/** Upper bound of OKLCH chroma used for chart axes. */
export const MAX_CHROMA = 0.37;

export interface OklchPoint {
  lightness: number;
  chroma: number;
  hue: number;
}

export function oklchPoint(color: Pick<ColorValue, 'xyz'>): OklchPoint {
  const { l, c, h } = xyzToLch(OKLAB, color.xyz);
  return { lightness: l, chroma: c, hue: h };
}

export type ScoreDimension = 'balance' | 'accessibility' | 'harmony' | 'uniqueness';
export type RadarScores = Record<ScoreDimension, number>;

export const SCORE_DIMENSIONS: readonly ScoreDimension[] = [
  'balance',
  'accessibility',
  'harmony',
  'uniqueness',
];

export type ScoreLevel = 'good' | 'fair' | 'poor';

export function scoreLevel(value: number): ScoreLevel {
  return value >= 75 ? 'good' : value >= 50 ? 'fair' : 'poor';
}
