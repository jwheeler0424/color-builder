import type { ColorValue } from './color.ts';

import { compositeColor } from './color.ts';
import { apcaContrast, contrastRatio } from './contrast.ts';
import { DISPLAY_GAMUTS } from './gamuts/rgb.ts';
import { fitChroma } from './solver.ts';
import { OKLAB } from './spaces/oklab.ts';
import { clamp, lchToXyz, xyzToLch } from './spaces/types.ts';

export type ThemeContrastTarget = { standard: 'wcag' } | { standard: 'apca'; target: 45 | 60 | 75 };

export interface ThemeColorRecommendation {
  color: ColorValue;
  score: number;
  target: number;
  meetsTarget: boolean;
  reachable: boolean;
  direction: 'lighten' | 'darken' | 'none';
}

const WCAG_AA_TARGET = 4.5;
const LIGHTNESS_EPSILON = 1e-6;

function scoreContrast(color: ColorValue, background: ColorValue, target: ThemeContrastTarget) {
  const visible = compositeColor(color, background);
  return target.standard === 'wcag'
    ? contrastRatio(visible.xyz, background.xyz)
    : Math.abs(apcaContrast(visible.xyz, background.xyz));
}

function makeCandidate(
  source: ColorValue,
  lightness: number,
  original: ReturnType<typeof xyzToLch>,
  display: (typeof DISPLAY_GAMUTS)[number],
) {
  const l = clamp(lightness, LIGHTNESS_EPSILON, 1 - LIGHTNESS_EPSILON);
  const chroma = Math.max(0, original.c * (1 - Math.abs(l - original.l) * 0.3));
  const c = fitChroma(OKLAB, display, l, original.h, chroma);
  return {
    color: {
      xyz: lchToXyz(OKLAB, { l, c, h: original.h }),
      alpha: source.alpha,
      display: source.display,
    },
    l,
  };
}

/** Find the least OKLCH-lightness adjustment that reaches the selected text-contrast target. */
export function recommendThemeColor(
  source: ColorValue,
  background: ColorValue,
  target: ThemeContrastTarget,
): ThemeColorRecommendation {
  if (background.alpha !== 1) throw new Error('Theme contrast backgrounds must be opaque.');

  const required = target.standard === 'wcag' ? WCAG_AA_TARGET : target.target;
  const original = xyzToLch(OKLAB, source.xyz);
  const display = DISPLAY_GAMUTS.find((gamut) => gamut.id === source.display);
  if (!display) throw new Error(`Unknown display gamut: ${source.display}.`);

  const sourceScore = scoreContrast(source, background, target);
  if (sourceScore >= required) {
    return {
      color: source,
      score: sourceScore,
      target: required,
      meetsTarget: true,
      reachable: true,
      direction: 'none',
    };
  }

  const findPassing = (end: 0 | 1) => {
    const endColor = makeCandidate(source, end, original, display);
    if (scoreContrast(endColor.color, background, target) < required) return null;

    let failing = original.l;
    let passing = endColor.l;
    for (let i = 0; i < 48; i++) {
      const middle = (failing + passing) / 2;
      const candidate = makeCandidate(source, middle, original, display);
      if (scoreContrast(candidate.color, background, target) >= required) passing = middle;
      else failing = middle;
    }

    const candidate = makeCandidate(source, passing, original, display);
    return {
      ...candidate,
      score: scoreContrast(candidate.color, background, target),
      direction: end === 1 ? ('lighten' as const) : ('darken' as const),
    };
  };

  const dark = findPassing(0);
  const light = findPassing(1);
  const passing = [dark, light].filter((candidate) => candidate !== null);
  if (passing.length > 0) {
    const best = passing.reduce((left, right) =>
      Math.abs(left.l - original.l) <= Math.abs(right.l - original.l) ? left : right,
    );
    return {
      color: best.color,
      score: best.score,
      target: required,
      meetsTarget: true,
      reachable: true,
      direction: best.direction,
    };
  }

  const endpoints = [
    { candidate: makeCandidate(source, 0, original, display), direction: 'darken' as const },
    { candidate: makeCandidate(source, 1, original, display), direction: 'lighten' as const },
  ].map(({ candidate, direction }) => ({
    ...candidate,
    score: scoreContrast(candidate.color, background, target),
    direction,
  }));
  const best = endpoints[0]!.score >= endpoints[1]!.score ? endpoints[0]! : endpoints[1]!;
  return {
    color: best.color,
    score: best.score,
    target: required,
    meetsTarget: false,
    reachable: false,
    direction: best.direction,
  };
}

export function themeColorFingerprint(color: ColorValue): string {
  return JSON.stringify([color.xyz, color.alpha, color.display]);
}
