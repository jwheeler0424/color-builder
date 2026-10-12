import { expect, test } from 'bun:test';

import {
  MAX_CHROMA,
  decodePaletteHash,
  encodePaletteHash,
  getCmykConverter,
  oklchPoint,
  parseColor,
  scoreLevel,
  setCmykConverter,
} from '@/lib/engine/browser';

test('palette hash round-trips and rejects fewer than two valid colors', () => {
  const hash = encodePaletteHash(['#6366f1', '#ec4899'], 'triadic');
  expect(hash).toBe('#p=6366f1-ec4899&m=triadic');
  expect(decodePaletteHash(hash)).toEqual({ hexes: ['#6366f1', '#ec4899'], mode: 'triadic' });
  expect(decodePaletteHash('#p=6366f1-zzzzzz')).toBeNull();
  expect(decodePaletteHash('#p=6366f1-ec4899')?.mode).toBe('analogous');
});

test('chart data exposes OKLCH coordinates and score levels', () => {
  const point = oklchPoint(parseColor('#ff0000'));
  expect(point.lightness).toBeGreaterThan(0.6);
  expect(point.chroma).toBeLessThanOrEqual(MAX_CHROMA);
  expect([scoreLevel(80), scoreLevel(60), scoreLevel(10)]).toEqual(['good', 'fair', 'poor']);
});

test('cmyk converter registry stores and clears the shared converter', () => {
  const converter = {} as NonNullable<ReturnType<typeof getCmykConverter>>;
  setCmykConverter(converter);
  expect(getCmykConverter()).toBe(converter);
  setCmykConverter(null);
  expect(getCmykConverter()).toBeNull();
});
