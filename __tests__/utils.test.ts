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
  generateUtilityColors,
  generateSvgSwatch,
  colorValue,
  hexToStop,
  hexToRgb8,
  parseColor,
  regenerateUtilityColors,
  rgb8ToXyz,
  rgb8ToHex,
  rgb8ToHslPercent,
  UTILITY_ROLES,
} from '@/lib/engine/browser';
import { lookupColorName } from '@/lib/tools/color-names';

test('explicit utility regeneration varies every unlocked role and preserves locked objects', () => {
  const palette = ['#6366f1', '#ec4899', '#10b981'].map((hex) => parseColor(hex));
  const initial = generateUtilityColors(palette);
  const keep = new Set(['info', 'focus'] as const);
  const changed = regenerateUtilityColors(palette, initial, keep, () => 0.5);
  expect(changed.info).toBe(initial.info);
  expect(changed.focus).toBe(initial.focus);
  for (const role of ['success', 'warning', 'error', 'neutral'] as const) {
    expect(changed[role].hex).not.toBe(initial[role].hex);
  }
  const repeated = regenerateUtilityColors(palette, changed, keep, () => 0.5);
  for (const role of ['success', 'warning', 'error', 'neutral'] as const)
    expect(repeated[role].hex).not.toBe(changed[role].hex);
  expect(generateUtilityColors(palette)).toEqual(generateUtilityColors(palette));
});

test('all-locked utility regeneration is a no-op and empty palettes still regenerate', () => {
  const initial = generateUtilityColors([]);
  expect(
    regenerateUtilityColors([], initial, new Set(UTILITY_ROLES), () => {
      throw new Error('Locked colors must not consume randomness');
    }),
  ).toBe(initial);
  const unlocked = generateUtilityColors([]);
  const changed = regenerateUtilityColors([], unlocked, new Set(), () => 0.25);
  for (const role of Object.keys(unlocked) as (keyof typeof unlocked)[]) {
    expect(changed[role].hex).not.toBe(unlocked[role].hex);
    expect(changed[role].hex).toMatch(/^#[0-9a-f]{6}$/i);
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

test('engine-backed color naming accepts canonical colors and RGB8 input', () => {
  const color = NAMED[0];
  expect(lookupColorName(parseColor(color.hex), color.hex)).toBeString();
  const rgb = { r: 123, g: 45, b: 67 };
  expect(lookupColorName(colorValue(rgb8ToXyz(rgb)), rgb8ToHex(rgb))).toBeString();
});

test('SVG export can resolve automatic color names without a barrel cycle', () => {
  const rgb = hexToRgb8('#ff0000');
  const name = lookupColorName(colorValue(rgb8ToXyz(rgb)), rgb8ToHex(rgb));
  const svg = generateSvgSwatch(
    [
      {
        id: 'regression',
        color: { hex: '#ff0000', rgb, hsl: rgb8ToHslPercent(rgb) },
        locked: false,
      },
    ],
    { names: [name] },
  );
  expect(svg).toContain(name);
});

test('browser-bundled engine exposes standalone color, conversion and theme APIs', async () => {
  const result = await Bun.build({
    entrypoints: [join(import.meta.dir, '../src/lib/engine/browser.ts')],
    target: 'browser',
  });
  expect(result.success).toBe(true);
  const source = await result.outputs[0].text();
  const bundled = await import(
    `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
  );
  expect(typeof bundled.parseColor).toBe('function');
  expect(typeof bundled.generateEnginePalette).toBe('function');
  expect(typeof bundled.generateUtilityColors).toBe('function');
  expect(typeof bundled.buildThemeCss).toBe('function');
  expect(typeof bundled.extractImageColors).toBe('function');
  expect(typeof bundled.generateSvgSwatch).toBe('function');
  const color = bundled.parseColor('color(display-p3 1 0 0 / 0.5)');
  expect(bundled.renderColor(color).displayLimited).toBe(false);
  const utility = bundled.generateUtilityColors([color]);
  expect(bundled.buildThemeCss(bundled.deriveThemeTokens([color], utility))).toContain(
    '--background:',
  );
  expect(bundled.rgb8ToHex(bundled.hslPercentToRgb8({ h: 210, s: 50, l: 40 }))).toMatch(
    /^#[\da-f]{6}$/i,
  );
  const stop = bundled.colorToStop(color);
  const svg = bundled.generateSvgSwatch([{ id: 'engine', color: stop, locked: false }], {
    title: 'Engine export',
    names: ['P3 red'],
  });
  expect(svg).toContain('Engine export');
  expect(svg).toContain('P3 red');
});
