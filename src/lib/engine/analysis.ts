import type { Vec3 } from './math/matrix.ts';

import { contrastRatio, wcagLevel, type WcagLevel } from './contrast.ts';
import { simulateVision, type VisionType } from './simulate.ts';
import { CIELAB, deltaE2000 } from './spaces/cielab.ts';

export interface PaletteContrastPair {
  firstIndex: number;
  secondIndex: number;
  ratio: number;
  level: WcagLevel;
}

export interface PaletteVisionPair {
  vision: VisionType;
  firstIndex: number | null;
  secondIndex: number | null;
  deltaE: number | null;
}

const DIAGNOSTIC_VISIONS: VisionType[] = ['normal', 'protanopia', 'deuteranopia', 'tritanopia'];

/** WCAG text contrast for each unique pair, treating palette colors as opaque. */
export function paletteContrastPairs(colors: readonly Vec3[]): PaletteContrastPair[] {
  const pairs: PaletteContrastPair[] = [];
  for (let firstIndex = 0; firstIndex < colors.length; firstIndex++) {
    for (let secondIndex = firstIndex + 1; secondIndex < colors.length; secondIndex++) {
      const ratio = contrastRatio(colors[firstIndex]!, colors[secondIndex]!);
      pairs.push({ firstIndex, secondIndex, ratio, level: wcagLevel(ratio) });
    }
  }
  return pairs;
}

/** Closest pair under common color-vision simulations, reported as relative Delta E 2000. */
export function paletteVisionPairs(colors: readonly Vec3[]): PaletteVisionPair[] {
  return DIAGNOSTIC_VISIONS.map((vision) => {
    if (colors.length < 2) return { vision, firstIndex: null, secondIndex: null, deltaE: null };

    const labs = colors.map((color) => CIELAB.xyzToLab(simulateVision(color, vision)));
    let firstIndex = 0;
    let secondIndex = 1;
    let deltaE = Infinity;
    for (let i = 0; i < labs.length; i++) {
      for (let j = i + 1; j < labs.length; j++) {
        const distance = deltaE2000(labs[i]!, labs[j]!);
        if (distance < deltaE) {
          firstIndex = i;
          secondIndex = j;
          deltaE = distance;
        }
      }
    }
    return { vision, firstIndex, secondIndex, deltaE };
  });
}
