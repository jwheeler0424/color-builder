import type { Vec3 } from './math/matrix.ts';

import { BLACK_XYZ, WHITE_XYZ, contrastRatio } from './contrast.ts';
import { generateEnginePalette, type EngineColor, type EnginePaletteConfig } from './palette.ts';
import { OKLAB } from './spaces/oklab.ts';
import { labToLch } from './spaces/types.ts';

export const SCALE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

export type ScaleConfig = Omit<EnginePaletteConfig, 'harmony' | 'count'>;

export interface ScaleStep {
  step: (typeof SCALE_STEPS)[number];
  color: EngineColor;
}

/**
 * A 50–950 tint/shade scale: the Shades & Tints harmony with one color per step, lightest first.
 * The base keeps its exact color at whichever step its lightness falls on (`color.isBase`).
 */
export function generateScale(config: ScaleConfig): ScaleStep[] {
  const colors = generateEnginePalette({
    ...config,
    harmony: 'shades',
    count: SCALE_STEPS.length,
  });
  return colors.reverse().map((color, i) => ({ step: SCALE_STEPS[i]!, color }));
}

export interface PaletteScore {
  /** How evenly hues spread round the wheel, 0–100. */
  balance: number;
  /** Share of colors that reach WCAG AA (4.5:1) against white or black, 0–100. */
  accessibility: number;
  /** Consistency of OKLCH chroma, 0–100. */
  harmony: number;
  /** Average pairwise OKLab distance, 0–100. */
  uniqueness: number;
  overall: number;
}

export function scorePalette(colors: readonly Vec3[]): PaletteScore {
  const n = colors.length;
  if (n < 2) return { balance: 0, accessibility: 0, harmony: 0, uniqueness: 0, overall: 0 };
  const labs = colors.map((xyz) => OKLAB.xyzToLab(xyz));
  const lchs = labs.map((lab) => labToLch(OKLAB, lab));

  const hues = lchs.map((c) => c.h).sort((a, b) => a - b);
  const ideal = 360 / n;
  let gapVariance = 0;
  for (let i = 0; i < n; i++) {
    const gap = (hues[(i + 1) % n]! - hues[i]! + 360) % 360;
    gapVariance += (gap - ideal) ** 2;
  }
  const balance = Math.round(Math.max(0, 100 - (Math.sqrt(gapVariance / n) / ideal) * 100));

  const readable = colors.filter(
    (xyz) => Math.max(contrastRatio(xyz, WHITE_XYZ), contrastRatio(xyz, BLACK_XYZ)) >= 4.5,
  ).length;
  const accessibility = Math.round((readable / n) * 100);

  const meanC = lchs.reduce((s, c) => s + c.c, 0) / n;
  const chromaDev = Math.sqrt(lchs.reduce((s, c) => s + (c.c - meanC) ** 2, 0) / n);
  const harmony = Math.round(Math.max(0, 100 - (chromaDev / 0.15) * 100));

  let total = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) total += OKLAB.distance(labs[i]!, labs[j]!);
  }
  const uniqueness = Math.round(Math.min(100, (total / ((n * (n - 1)) / 2)) * 500));

  const overall = Math.round((balance + accessibility + harmony + uniqueness) / 4);
  return { balance, accessibility, harmony, uniqueness, overall };
}
