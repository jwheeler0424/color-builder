import { expect, test } from 'bun:test';
import { join } from 'node:path';

import {
  applyEasing,
  buildCss,
  buildPreviewCss,
  EASING_OPTIONS,
  redistributeGradientStops,
} from '@/components/views/gradient-view';
import { NAMED } from '@/lib/constants/chroma';
import {
  generateSvgSwatch,
  generateUtilityColors,
  regenerateUtilityColors,
  hexToRgb,
  hexToStop,
  nearestName,
  rgbToHsl,
} from '@/lib/utils';

test('explicit utility regeneration varies every unlocked role and preserves locked objects', () => {
  const slots = ['#6366f1', '#ec4899', '#10b981'].map((hex) => ({ color: hexToStop(hex) }));
  const initial = generateUtilityColors(slots);
  initial.info = { ...initial.info, locked: true, color: hexToStop('#123456') };
  initial.focus = { ...initial.focus, locked: true };
  const changed = regenerateUtilityColors(slots, initial, () => 0.5);
  expect(changed.info).toBe(initial.info);
  expect(changed.focus).toBe(initial.focus);
  for (const role of ['success', 'warning', 'error', 'neutral'] as const) {
    expect(changed[role].color.hex).not.toBe(initial[role].color.hex);
    expect(changed[role].locked).toBe(false);
  }
  const repeated = regenerateUtilityColors(slots, changed, () => 0.5);
  for (const role of ['success', 'warning', 'error', 'neutral'] as const)
    expect(repeated[role].color.hex).not.toBe(changed[role].color.hex);
  expect(generateUtilityColors(slots)).toEqual(generateUtilityColors(slots));
});

test('all-locked utility regeneration is a no-op and empty palettes still regenerate', () => {
  const initial = generateUtilityColors([]);
  for (const role of Object.keys(initial) as (keyof typeof initial)[]) initial[role].locked = true;
  expect(
    regenerateUtilityColors([], initial, () => {
      throw new Error('Locked colors must not consume randomness');
    }),
  ).toBe(initial);
  const unlocked = generateUtilityColors([]);
  const changed = regenerateUtilityColors([], unlocked, () => 0.25);
  for (const role of Object.keys(unlocked) as (keyof typeof unlocked)[]) {
    expect(changed[role].color.hex).not.toBe(unlocked[role].color.hex);
    expect(changed[role].color.hex).toMatch(/^#[0-9a-f]{6}$/i);
  }
});

test('gradient interpolation uses one valid prelude and preserves stop positions', () => {
  const gradient = {
    type: 'linear' as const,
    dir: 'to right',
    selectedStop: 0,
    stops: [
      { hex: '#000000', pos: 0 },
      { hex: '#ffffff', pos: 100 },
    ],
  };
  expect(buildCss(gradient, 'oklab')).toBe(
    'linear-gradient(to right in oklab, #000000 0%, #ffffff 100%)',
  );
  expect(buildCss({ ...gradient, type: 'radial' }, 'oklch')).toBe(
    'radial-gradient(circle at center in oklch, #000000 0%, #ffffff 100%)',
  );
  expect(buildCss({ ...gradient, type: 'conic' }, 'oklab')).toBe(
    'conic-gradient(from 0deg in oklab, #000000 0%, #ffffff 100%)',
  );
});

test('gradient easing curves preserve endpoints and stop order', () => {
  for (const { id } of EASING_OPTIONS) {
    expect(applyEasing(0, id)).toBe(0);
    expect(applyEasing(1, id)).toBe(1);
    let previous = 0;
    for (let index = 1; index <= 100; index++) {
      const position = applyEasing(index / 100, id);
      expect(position).toBeGreaterThanOrEqual(previous);
      expect(position).toBeLessThanOrEqual(1);
      previous = position;
    }
  }
  expect(applyEasing(0.5, 'cubic-in')).toBe(0.125);
  expect(applyEasing(0.5, 'cubic-out')).toBe(0.875);
  expect(applyEasing(0.5, 'sine-in-out')).toBeCloseTo(0.5);
});

test('stop distribution preserves selected color and the existing endpoint range', () => {
  const gradient = {
    type: 'linear' as const,
    dir: 'to right',
    selectedStop: 0,
    stops: [
      { hex: '#00ff00', pos: 50 },
      { hex: '#ff0000', pos: 20 },
      { hex: '#0000ff', pos: 80 },
    ],
  };
  const distributed = redistributeGradientStops(gradient, 'cubic-in');
  expect(distributed.stops.map((stop) => stop.pos)).toEqual([20, 27.5, 80]);
  expect(distributed.stops[distributed.selectedStop].hex).toBe('#00ff00');
  expect(gradient.stops[0].pos).toBe(50);
  expect(redistributeGradientStops({ ...gradient, stops: [] }, 'linear').stops).toEqual([]);
  expect(
    redistributeGradientStops({ ...gradient, stops: [gradient.stops[0]] }, 'linear').stops,
  ).toEqual([gradient.stops[0]]);
});

test('color vision updates preview colors without changing exported stops', () => {
  const gradient = {
    type: 'linear' as const,
    dir: 'to right',
    selectedStop: 0,
    stops: [
      { hex: '#ff0000', pos: 0 },
      { hex: '#00ff00', pos: 100 },
    ],
  };
  const original = buildCss(gradient, 'oklab');
  expect(buildPreviewCss(gradient, 'oklab', 'normal')).toBe(original);
  expect(buildPreviewCss(gradient, 'oklab', 'unknown')).toBe(original);
  expect(buildPreviewCss(gradient, 'oklab', 'deuteranopia')).not.toBe(original);
  expect(buildPreviewCss(gradient, 'oklab', 'achromatopsia')).not.toBe(original);
  expect(gradient.stops.map((stop) => stop.hex)).toEqual(['#ff0000', '#00ff00']);
});

test('nearestName is callable after loading constants through the utility barrel', () => {
  const color = NAMED[0];
  expect(typeof nearestName).toBe('function');
  expect(nearestName(hexToRgb(color.hex))).toBe(color.name);
  expect(nearestName({ r: 123, g: 45, b: 67 })).toBeString();
});

test('SVG export can resolve automatic color names without a barrel cycle', () => {
  const rgb = hexToRgb('#ff0000');
  const svg = generateSvgSwatch([
    {
      id: 'regression',
      color: { hex: '#ff0000', rgb, hsl: rgbToHsl(rgb) },
      locked: false,
    },
  ]);
  expect(svg).toContain(nearestName(rgb));
});

test('browser-bundled utilities expose a callable nearestName', async () => {
  const result = await Bun.build({
    entrypoints: [join(import.meta.dir, '../src/lib/utils/index.ts')],
    target: 'browser',
  });
  expect(result.success).toBe(true);
  const source = await result.outputs[0].text();
  const bundled = await import(
    `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
  );
  expect(typeof bundled.nearestName).toBe('function');
  expect(bundled.nearestName({ r: 255, g: 0, b: 0 })).toBe(nearestName({ r: 255, g: 0, b: 0 }));
});
