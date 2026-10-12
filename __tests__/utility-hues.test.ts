import { expect, test } from 'bun:test';

import {
  ROLE_HUES,
  deriveThemeTokens,
  generateUtilityColors,
  parseColor,
  regenerateUtilityColors,
} from '@/lib/engine/browser';
import { OKLAB } from '@/lib/engine/spaces/oklab';
import { xyzToLch } from '@/lib/engine/spaces/types';

const hue = (hex: string) => xyzToLch(OKLAB, parseColor(hex).xyz).h;
const distance = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
};

const PALETTES = [
  ['#6366f1', '#ec4899', '#10b981'],
  ['#e11d48'],
  ['#f59e0b', '#ef4444'],
  ['#0ea5e9', '#22c55e'],
  ['#7c3aed', '#c026d3'],
  ['#111111', '#f5f5f5'],
  ['#84cc16', '#facc15', '#fb923c'],
  ['#14b8a6'],
  ['#fdf2f8', '#fce7f3'],
];

test('utility roles stay in their hue family for every palette and reroll', () => {
  for (const hexes of PALETTES) {
    const palette = hexes.map((hex) => parseColor(hex));
    const sets = [generateUtilityColors(palette)];
    sets.push(regenerateUtilityColors(palette, sets[0]!, new Set(), () => 0.9));
    sets.push(regenerateUtilityColors(palette, sets[1]!, new Set(), () => 0.05));
    for (const set of sets) {
      const tokens = deriveThemeTokens(palette, set).utility;
      for (const role of ['info', 'success', 'warning', 'error'] as const) {
        const { center, arc } = ROLE_HUES[role];
        // Allow a few degrees for sRGB quantization of low-chroma tints.
        for (const key of ['base', 'light', 'dark'] as const)
          expect(distance(hue(tokens[role][key]), center)).toBeLessThanOrEqual(arc + 8);
      }
    }
  }
});

test('utility roles reuse suitable palette colors instead of generating near-duplicates', () => {
  const palette = ['#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed'].map((hex) =>
    parseColor(hex),
  );
  const utility = generateUtilityColors(palette);
  expect(utility.info.hex).toBe('#2563eb');
  expect(utility.success.hex).toBe('#16a34a');
  expect(utility.error.hex).toBe('#dc2626');
  expect(utility.warning.hex).toBe('#d97706');
  const generated = generateUtilityColors(['#7c3aed', '#c026d3'].map((hex) => parseColor(hex)));
  for (const role of ['info', 'success', 'warning', 'error'] as const)
    expect(['#7c3aed', '#c026d3']).not.toContain(generated[role].hex);
});
