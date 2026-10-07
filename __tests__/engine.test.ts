import { expect, test } from 'bun:test';

import {
  composePalette,
  HARMONY_IDS,
  mix,
  mixColor,
  OKLAB,
  xyzToLch,
} from '../src/lib/engine/browser';
import { findNearestNamedColorXyz } from '../src/lib/engine/colors/named-color-lookup';
import { extractColors as extractPixels } from '../src/lib/engine/extract';
import { sampleGradient, buildGradientCss } from '../src/lib/engine/gradient';
import {
  colorValue,
  cloneSlot,
  colorToStop,
  compositeColor,
  buildColorStoryHtml,
  buildFigmaTokens,
  buildStyleDictionary,
  buildTailwindV3,
  buildTailwindV4,
  buildThemeCss,
  cmykToColor,
  cssColor,
  deriveThemeTokens,
  DISPLAY_P3,
  extractImageColors,
  formatColor,
  generateUtilityColors,
  hexToRgb8,
  hexToStop,
  hslPercentToRgb8,
  hsvPercentToRgb8,
  rgb8ToHex,
  rgb8ToHslPercent,
  rgb8ToHsvPercent,
  rgb8ToXyz,
  hexToXyz,
  parseColor,
  parseHexInput,
  pickerReadings,
  formatPickerColor,
  renderColor,
  simulateVision,
  SRGB,
  stopToColor,
  VISION_TYPES,
  xyzToRgb8,
} from '../src/lib/engine/index';
import {
  computeColorPalette,
  disposePaletteWorkers,
} from '../src/lib/engine/runtime/palette-runtime';
import {
  generateUtilityColors as engineUtilities,
  regenerateUtilityColors as engineReroll,
  deriveThemeTokens as engineTokens,
} from '../src/lib/engine/theme';
import { handleColorNames } from '../src/lib/tools/color-names.server';
import { useChromaStore } from '../src/stores/chroma.store';

test('engine parses and round-trips wide gamut and alpha without converting through hex', () => {
  const color = parseColor('color(display-p3 1 0.2 0.1 / 37%)');
  expect(color.display).toBe('p3');
  expect(color.alpha).toBe(0.37);
  const rendition = renderColor(color);
  expect(rendition.srgbLimited).toBe(true);
  expect(rendition.displayLimited).toBe(false);
  const restored = parseColor(rendition.css);
  color.xyz.forEach((value, index) => expect(restored.xyz[index]).toBeCloseTo(value, 12));
  expect(restored.alpha).toBe(color.alpha);
  expect(color.xyz).toEqual(parseColor('color(display-p3 1 0.2 0.1)').xyz);
});

test('engine accepts alpha hex, CSS keywords, legacy rgba, angles and D50', () => {
  expect(parseColor('#f008').alpha).toBeCloseTo(136 / 255, 12);
  expect(parseColor('#ff000080').alpha).toBeCloseTo(128 / 255, 12);
  expect(parseColor('rgba(255, 0, 0, 0.25)').alpha).toBe(0.25);
  expect(parseColor('transparent').alpha).toBe(0);
  expect([...parseColor('rebeccapurple').xyz]).toEqual([...hexToXyz('#663399')]);
  const turned = parseColor('hsl(0.5turn 100% 50% / 25%)');
  expect(turned.xyz).toEqual(parseColor('hsl(180 100% 50%)').xyz);
  expect(turned.alpha).toBe(0.25);
  const d50 = parseColor('color(xyz-d50 0.9642956764295677 1 0.8251046025104602)');
  expect(d50.xyz[1]).toBeCloseTo(1, 6);
  expect(parseColor('lch(50% 20 1rad)').xyz.every(Number.isFinite)).toBe(true);
  expect(parseColor(cssColor(DISPLAY_P3, turned.xyz, turned.alpha)).alpha).toBe(0.25);
  expect(parseHexInput('#12345680')).toMatchObject({ hex: '#123456', alphaPercent: 50 });
  expect(parseHexInput('bad input')).toBeNull();
});

test('engine validates colors and composites linear XYZ with explicit alpha', () => {
  expect(() => colorValue([NaN, 0, 0])).toThrow();
  expect(() => colorValue([0, 0, 0], 2)).toThrow();
  expect(() => parseColor('color(srgb 1e999 0 0)')).toThrow();
  expect(() => parseColor('rgb(0 0 0 / 20% / 20%)')).toThrow();
  expect(() => parseColor('rgba(0,0,0,2)')).toThrow();
  const white = colorValue(hexToXyz('#ffffff'));
  const front = colorValue(hexToXyz('#000000'), 0.5);
  const composited = compositeColor(front, white);
  expect(composited.alpha).toBe(1);
  expect(composited.xyz[1]).toBeCloseTo(0.5, 12);
  expect(compositeColor(colorValue([0, 0, 0], 0), front)).toEqual(front);
  expect(parseColor(cssColor(SRGB, white.xyz)).alpha).toBe(1);
});

test('engine formats alpha and preserves source XYZ in normal vision', () => {
  const color = parseColor('color(display-p3 1 0 0 / 0.4)');
  const rendition = renderColor(color);
  const formatted = formatColor({ ...rendition, xyz: color.xyz, alpha: color.alpha }, 'oklab', {
    precise: true,
  });
  const restored = parseColor(formatted);
  expect(restored.alpha).toBe(color.alpha);
  color.xyz.forEach((value, index) => expect(restored.xyz[index]).toBeCloseTo(value, 8));
  const direct = parseColor(formatColor(color, 'oklab', { precise: true }));
  expect(direct.alpha).toBe(color.alpha);
  color.xyz.forEach((value, index) => expect(direct.xyz[index]).toBeCloseTo(value, 12));
  expect(simulateVision(color.xyz, 'normal')).toEqual(color.xyz);
  expect(VISION_TYPES).toHaveLength(9);
  for (const vision of VISION_TYPES)
    expect(simulateVision(color.xyz, vision.id).every(Number.isFinite)).toBe(true);
});

test('engine byte and percentage conversions round-trip at the UI boundary', () => {
  for (let channel = 0; channel <= 255; channel++) {
    const rgb = { r: channel, g: 255 - channel, b: (channel * 73) % 256 };
    expect(xyzToRgb8(rgb8ToXyz(rgb))).toEqual(rgb);
    expect(hexToRgb8(rgb8ToHex(rgb))).toEqual(rgb);
    const hsl = hslPercentToRgb8(rgb8ToHslPercent(rgb));
    const hsv = hsvPercentToRgb8(rgb8ToHsvPercent(rgb));
    for (const reconstructed of [hsl, hsv]) {
      expect(Math.abs(reconstructed.r - rgb.r)).toBeLessThanOrEqual(1);
      expect(Math.abs(reconstructed.g - rgb.g)).toBeLessThanOrEqual(1);
      expect(Math.abs(reconstructed.b - rgb.b)).toBeLessThanOrEqual(1);
    }
  }
  expect(() => rgb8ToXyz({ r: 256, g: 0, b: 0 })).toThrow();
  expect(() => hslPercentToRgb8({ h: 0, s: 101, l: 50 })).toThrow();
  expect(() => hsvPercentToRgb8({ h: 0, s: 50, v: NaN })).toThrow();
});

test('engine picker readings derive display values from canonical wide-gamut color', () => {
  const color = parseColor('color(display-p3 0.9 0.25 0.1 / 0.4)');
  const readings = pickerReadings(color);
  expect(readings.rgb).toEqual(renderColor(color).rgb8);
  expect(readings.hsl.s).toBeGreaterThanOrEqual(0);
  expect(readings.hsl.s).toBeLessThanOrEqual(100);
  expect(readings.hsv.v).toBeGreaterThanOrEqual(0);
  expect(readings.hsv.v).toBeLessThanOrEqual(100);
  expect(readings.oklab).toEqual(OKLAB.xyzToLab(color.xyz));
  expect(readings.cmyk).toBeNull();
  expect(formatPickerColor(color, 'oklch')).toStartWith('oklch(');
});

test('composition preserves wide-gamut pins and locks across every harmony', () => {
  const pin = parseColor('color(display-p3 1 0 0 / 0.4)');
  const locked = parseColor('#102030');
  for (const harmony of HARMONY_IDS) {
    const colors = composePalette({
      harmony,
      count: 4,
      seeds: [pin],
      seedMode: 'pin',
      locked: [{ index: 0, color: locked }],
      seed: 42,
      ideal: 'display',
      display: 'p3',
    });
    expect(colors).toHaveLength(4);
    expect(colors[0]?.xyz).toEqual(locked.xyz);
    expect(colors[1]?.xyz).toEqual(pin.xyz);
    expect(colors[1]?.alpha).toBe(pin.alpha);
  }
  expect(() =>
    composePalette({
      harmony: 'triadic',
      count: 1,
      seeds: [pin],
      seedMode: 'pin',
      locked: [{ index: 0, color: locked }],
    }),
  ).toThrow();
});

test('composition is reproducible and all influencing seeds affect its output', () => {
  const config = { harmony: 'triadic' as const, count: 4, seed: 12, ideal: 'display' as const };
  expect(composePalette(config)).toEqual(composePalette(config));
  const primary = parseColor('#ff0000');
  const first = composePalette({ ...config, seeds: [primary, parseColor('#0000ff')] });
  const second = composePalette({ ...config, seeds: [primary, parseColor('#00ff00')] });
  expect(first).not.toEqual(second);
  expect(() => composePalette({ ...config, temperature: NaN })).toThrow();
});

test('application stops preserve XYZ and alpha when cloned and migrate legacy records', () => {
  const source = parseColor('color(display-p3 1 0 0 / 0.37)');
  const original = { id: 'retained', color: colorToStop(source), locked: true, name: 'Custom' };
  const cloned = cloneSlot(original);
  expect(stopToColor(cloned.color)).toEqual(colorValue(source.xyz, source.alpha, source.display));
  expect(cloned.color.value?.xyz).not.toBe(original.color.value?.xyz);
  expect(cloned.id).toBe(original.id);
  expect(cloned.name).toBe(original.name);
  expect(cloned.locked).toBe(true);
  expect(hexToStop('#12345680', 90).value?.alpha).toBeCloseTo(128 / 255, 12);
  expect(hexToStop('#123456', 37).value?.alpha).toBe(0.37);
  expect([
    ...stopToColor({ hex: '#123456', rgb: { r: 0, g: 0, b: 0 }, hsl: { h: 0, s: 0, l: 0 }, a: 25 })
      .xyz,
  ]).toEqual([...hexToXyz('#123456')]);
});

test('engine utilities and tokens keep wide gamut and utility reroll respects roles', () => {
  const palette = [parseColor('color(display-p3 1 0.1 0.2)')];
  const utilities = engineUtilities(palette);
  expect(utilities.focus.value?.display).toBe('p3');
  const changed = engineReroll(palette, utilities, new Set(['focus']), () => 0.25);
  expect(changed.focus).toBe(utilities.focus);
  expect(changed.info.hex).not.toBe(utilities.info.hex);
  expect(engineTokens(palette, changed).semantic[0]?.light).toStartWith('color(display-p3');
});

test('engine theme exports cover CSS, Figma, Tailwind, Style Dictionary and HTML', () => {
  const palette = ['#123456', '#dc143c'];
  const utility = generateUtilityColors(palette);
  const tokens = deriveThemeTokens(palette, utility);
  expect(tokens.palette).toHaveLength(2);
  expect(buildThemeCss(tokens)).toContain('--background:');
  expect(buildTailwindV3(tokens)).toContain('module.exports =');
  expect(buildTailwindV4(tokens)).toContain('@theme {');
  expect(buildFigmaTokens(tokens, utility)).toContain('"semantic"');
  expect(buildStyleDictionary(tokens, utility)).toContain('"$type": "color"');
  const story = buildColorStoryHtml(palette, 'Test <palette>', utility);
  expect(story).toContain('Test &lt;palette&gt;');
  expect(story).toContain('--background:');
  const p3 = parseColor('color(display-p3 1 0 0)');
  const p3Story = buildColorStoryHtml([p3], 'P3', generateUtilityColors([p3]));
  expect(p3Story).toContain('color(display-p3');
});

test('palette runtime bounds concurrent workers and cancels queued computations', async () => {
  const original = globalThis.Worker;
  const tasks: Array<() => void> = [];
  let created = 0;
  class TestWorker {
    onmessage: ((event: { data: unknown }) => void) | null = null;
    onerror = null;
    constructor() {
      created++;
    }
    postMessage() {
      tasks.push(() =>
        this.onmessage?.({ data: { type: 'compose', colors: [colorValue([0, 0, 0])] } }),
      );
    }
    terminate() {}
  }
  disposePaletteWorkers();
  globalThis.Worker = TestWorker as unknown as typeof Worker;
  const firstController = new AbortController();
  const secondController = new AbortController();
  try {
    const config = { harmony: 'triadic' as const, count: 1, ideal: 'display' as const };
    const first = computeColorPalette(config, firstController.signal);
    const second = computeColorPalette(config, secondController.signal);
    const cancelled = second.catch((error: unknown) => error);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(created).toBeLessThanOrEqual(3);
    expect(tasks).toHaveLength(1);
    secondController.abort();
    expect(await cancelled).toMatchObject({ name: 'AbortError' });
    tasks.shift()?.();
    expect(await first).toEqual([colorValue([0, 0, 0])]);
  } finally {
    firstController.abort();
    secondController.abort();
    disposePaletteWorkers();
    globalThis.Worker = original;
  }
});

test('server naming uses original XYZ and validates bounded batches', async () => {
  const value = parseColor('color(display-p3 1 0 0)');
  const response = await handleColorNames(
    new Request('http://localhost/api/color-names', {
      method: 'POST',
      body: JSON.stringify({ colors: [value, '#000000'] }),
    }),
  );
  expect(response.status).toBe(200);
  const data = (await response.json()) as { matches: Array<{ name: string; distance: number }> };
  expect(data.matches).toHaveLength(2);
  expect(data.matches[0]).toEqual(findNearestNamedColorXyz(value.xyz));
  expect(data.matches[1]?.distance).toBe(0);
  const tooMany = await handleColorNames(
    new Request('http://localhost/api/color-names', {
      method: 'POST',
      body: JSON.stringify({ colors: Array(65).fill('#fff') }),
    }),
  );
  expect(tooMany.status).toBe(400);
  const invalid = await handleColorNames(
    new Request('http://localhost/api/color-names', {
      method: 'POST',
      body: JSON.stringify({ colors: [{ xyz: [null, 0, 0] }] }),
    }),
  );
  expect(invalid.status).toBe(400);
  expect((await handleColorNames(new Request('http://localhost/api/color-names'))).status).toBe(
    405,
  );
});

test('RGB stays a plain channel object and canonical color metadata stays on the stop', () => {
  const rgb = hexToRgb8('#123456');
  expect(rgb).toEqual({ r: 18, g: 52, b: 86 });
  expect(Object.keys(xyzToRgb8(rgb8ToXyz(rgb))).sort()).toEqual(['b', 'g', 'r']);
  const source = parseColor('color(display-p3 1 0 0 / 0.37)');
  const stop = colorToStop(source);
  expect(Object.keys(stop.rgb).sort()).toEqual(['b', 'g', 'r']);
  expect(stop.value?.xyz).toEqual(source.xyz);
  expect(stop.value?.alpha).toBe(source.alpha);
});

test('engine mixing preserves XYZ endpoints and premultiplies alpha without RGB metadata', () => {
  const transparent = parseColor('color(display-p3 1 0 0 / 0)');
  const blue = parseColor('color(display-p3 0 0 1)');
  const result = mixColor(transparent, blue, 0.5);
  expect(result.alpha).toBe(0.5);
  expect(result.display).toBe('p3');
  result.xyz.forEach((value, index) => expect(value).toBeCloseTo(blue.xyz[index]!, 8));
  expect(mixColor(transparent, blue, 0).xyz).toEqual(transparent.xyz);
  expect(mixColor(transparent, blue, 1).xyz).toEqual(blue.xyz);
  expect(() => mixColor(transparent, blue, NaN)).toThrow();
  expect(() => mixColor(transparent, blue, -0.1)).toThrow();
});

test('engine OKLCH interpolation follows the short hue arc and differs from OKLab mixing', () => {
  const first = parseColor('oklch(0.6 0.15 350)');
  const second = parseColor('oklch(0.6 0.15 10)');
  const mixed = mix(first.xyz, second.xyz, 0.5, 'oklch');
  const lch = xyzToLch(OKLAB, mixed);
  expect(Math.min(lch.h, 360 - lch.h)).toBeLessThan(0.001);
  expect(lch.c).toBeCloseTo(0.15, 6);
  expect(mixed).not.toEqual(mix(first.xyz, second.xyz, 0.5, 'oklab'));
});

test('engine gradients sample actual mixed colors and retain P3 and alpha in CSS', () => {
  const left = parseColor('color(display-p3 1 0 0 / 0)');
  const right = parseColor('color(display-p3 0 0 1)');
  const gradient = {
    type: 'linear' as const,
    dir: 'to right',
    stops: [
      { color: left, pos: 0 },
      { color: right, pos: 100 },
    ],
  };
  const sampled = sampleGradient(gradient, 50, 'oklab');
  expect(sampled.alpha).toBe(0.5);
  sampled.xyz.forEach((value, index) => expect(value).toBeCloseTo(right.xyz[index]!, 8));
  expect(buildGradientCss(gradient, 'oklch')).toContain('color(display-p3');
  expect(buildGradientCss(gradient, 'oklch')).toContain('/ 0)');
  expect(buildGradientCss(gradient, 'oklch')).toContain('in oklch');
  expect(() => sampleGradient({ ...gradient, stops: [] }, 50)).toThrow();
  expect(() =>
    buildGradientCss({
      ...gradient,
      stops: [
        { color: left, pos: NaN },
        { color: right, pos: 100 },
      ],
    }),
  ).toThrow();
  expect(
    sampleGradient(
      {
        ...gradient,
        stops: [
          { color: left, pos: 0 },
          { color: right, pos: 0 },
        ],
      },
      0,
    ).xyz,
  ).toEqual(right.xyz);
});

test('engine extraction retains the declared pixel gamut and unrounded means', () => {
  const pixels = new Uint8ClampedArray([
    255, 0, 0, 255, 254, 0, 0, 255, 254, 1, 0, 255, 0, 0, 255, 0,
  ]);
  const extracted = extractPixels(pixels, { count: 1, pixelGamut: 'p3' });
  expect(extracted).toHaveLength(1);
  expect(extracted[0]?.display).toBe('p3');
  const expected = parseColor(`color(display-p3 ${254 / 255} ${0.5 / 255} 0)`).xyz;
  extracted[0]?.xyz.forEach((value, index) => expect(value).toBeCloseTo(expected[index]!, 12));
  expect(extracted[0]?.weight).toBe(1);
  expect(() => extractPixels(pixels, { count: Infinity })).toThrow();
});

test('engine image extraction decodes browser images and preserves P3 stops', async () => {
  const originalImage = globalThis.Image;
  const originalCreateElement = document.createElement;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  let revoked = false;
  class ImageStub {
    width = 2;
    height = 1;
    onload: ((event: Event) => unknown) | null = null;
    onerror: ((event: Event | string) => unknown) | null = null;
    set src(_value: string) {
      queueMicrotask(() => this.onload?.(new Event('load')));
    }
  }
  const context = {
    drawImage() {},
    getContextAttributes: () => ({ colorSpace: 'display-p3' as const }),
    getImageData: () =>
      ({
        data: new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 255]),
        colorSpace: 'display-p3',
      }) as ImageData,
  };
  const canvas = { getContext: () => context as unknown as CanvasRenderingContext2D };
  try {
    globalThis.Image = ImageStub as unknown as typeof Image;
    URL.createObjectURL = (() => 'blob:image-test') as typeof URL.createObjectURL;
    URL.revokeObjectURL = (() => {
      revoked = true;
    }) as typeof URL.revokeObjectURL;
    document.createElement = ((name: string) =>
      name === 'canvas'
        ? canvas
        : originalCreateElement.call(document, name)) as Document['createElement'];
    const colors = await extractImageColors(new File([], 'palette.png'), 2);
    expect(colors).toHaveLength(2);
    expect(colors.every((stop) => stop.value?.display === 'p3')).toBe(true);
    expect(colors.every((stop) => stop.value?.xyz.every(Number.isFinite))).toBe(true);
    expect(revoked).toBe(true);
  } finally {
    globalThis.Image = originalImage;
    document.createElement = originalCreateElement;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  }
});

test('adding a canonical midpoint mutates the palette without returning an Immer value', () => {
  const previous = useChromaStore.getState().slots;
  const color = colorToStop(parseColor('color(display-p3 1 0 0 / 0.75)'));
  try {
    expect(() => useChromaStore.getState().addSlot(color)).not.toThrow();
    const slots = useChromaStore.getState().slots;
    expect(slots).toHaveLength(previous.length + 1);
    expect(slots.at(-1)?.color.value).toEqual(color.value);
  } finally {
    useChromaStore.setState({ slots: previous });
  }
});

test('engine CMYK conversion requires and delegates to an ICC converter', () => {
  const color = parseColor('#ff0000');
  expect(pickerReadings(color).cmyk).toBeNull();
  const converter = {
    name: 'Fixture',
    toCmyk: () => [12, 34, 56, 78] as [number, number, number, number],
    toLab: () => ({ L: 50, a: 0, b: 0 }),
  };
  expect(pickerReadings(color, converter).cmyk).toEqual({ c: 12, m: 34, y: 56, k: 78 });
  expect(renderColor(cmykToColor([12, 34, 56, 78], converter)).rgb8).toMatchObject({
    r: expect.any(Number),
    g: expect.any(Number),
    b: expect.any(Number),
  });
});
