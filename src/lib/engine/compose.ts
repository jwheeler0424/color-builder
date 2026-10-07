import type { Vec3 } from './math/matrix.ts';

import { colorValue, type ColorValue } from './color.ts';
import { getHarmony } from './harmony.ts';
import { generateEnginePalette, type EnginePaletteConfig } from './palette.ts';
import { CAM16_UCS } from './spaces/cam16.ts';
import { CIELAB } from './spaces/cielab.ts';
import { OKLAB } from './spaces/oklab.ts';
import { lchToXyz, mod360, xyzToLch, type ColorSpace } from './spaces/types.ts';

export interface PaletteCompositionConfig extends Omit<EnginePaletteConfig, 'baseColor'> {
  seeds?: readonly ColorValue[];
  seedMode?: 'influence' | 'pin';
  temperature?: number;
  locked?: ReadonlyArray<{ index: number; color: ColorValue }>;
}

export function seededRandom(seed: number): () => number {
  if (!Number.isSafeInteger(seed)) throw new Error('Random seed must be a safe integer.');
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function composePalette(config: PaletteCompositionConfig): ColorValue[] {
  const { count, harmony, seedMode = 'influence', temperature = 0, display = 'srgb' } = config;
  if (!Number.isInteger(count) || count < 1 || count > 64)
    throw new Error('Palette count must be between 1 and 64.');
  if (!Number.isFinite(temperature) || Math.abs(temperature) > 1)
    throw new Error('Temperature must be between -1 and 1.');
  if (seedMode !== 'pin' && seedMode !== 'influence') throw new Error('Unknown seed mode.');
  const seeds = (config.seeds ?? []).map((color) =>
    colorValue(color.xyz, color.alpha, color.display),
  );
  const reserved = new Map<number, ColorValue>();
  for (const lock of config.locked ?? []) {
    if (
      !Number.isInteger(lock.index) ||
      lock.index < 0 ||
      lock.index >= count ||
      reserved.has(lock.index)
    ) {
      throw new Error('Locked palette positions must be unique and within the palette.');
    }
    reserved.set(lock.index, colorValue(lock.color.xyz, lock.color.alpha, lock.color.display));
  }
  if (seedMode === 'pin') {
    for (const seed of seeds) {
      const index = Array.from({ length: count }, (_, position) => position).find(
        (position) => !reserved.has(position),
      );
      if (index === undefined)
        throw new Error('There are more pinned seeds than unlocked palette positions.');
      reserved.set(index, seed);
    }
  }
  const random = config.seed === undefined ? Math.random : seededRandom(config.seed);
  const space: ColorSpace =
    config.space === 'oklch'
      ? OKLAB
      : config.space === 'cielab' && config.cielabHue === 'native'
        ? CIELAB
        : CAM16_UCS;
  const source = seeds.length ? seeds : [...reserved.values()];
  let baseXyz: Vec3 =
    source[0]?.xyz ??
    lchToXyz(OKLAB, { l: 0.42 + random() * 0.25, c: 0.1 + random() * 0.14, h: random() * 360 });
  if (source.length > 1) {
    const values = source.map((color) => xyzToLch(space, color.xyz));
    const base = {
      l: values.reduce((sum, value) => sum + value.l, 0) / values.length,
      c: values.reduce((sum, value) => sum + value.c, 0) / values.length,
      h: values[0]!.h,
    };
    const rule = getHarmony(harmony);
    let cost = Infinity;
    let hue = base.h;
    const candidates = [
      ...values.map((value) => value.h),
      ...Array.from({ length: 24 }, (_, index) => index * 15),
    ];
    for (const candidate of candidates) {
      const slots = rule.build({
        base: { ...base, h: candidate },
        baseRelative: 0.5,
        baseDisplayRelative: 0.5,
        lightnessMax: space.lightnessMax,
        count,
        options: config,
        space: space === OKLAB ? 'oklch' : space === CIELAB ? 'cielab' : 'cam16',
      });
      const nextCost = values.reduce(
        (sum, value) =>
          sum +
          Math.min(...slots.map((slot) => Math.abs(mod360(slot.h - value.h + 180) - 180))) ** 2,
        0,
      );
      if (nextCost < cost) {
        cost = nextCost;
        hue = candidate;
      }
    }
    baseXyz = lchToXyz(space, { ...base, h: hue });
  }
  if (temperature !== 0) {
    const base = xyzToLch(OKLAB, baseXyz);
    const target = temperature > 0 ? 30 : 240;
    const shift = mod360(target - base.h + 180) - 180;
    baseXyz = lchToXyz(OKLAB, {
      ...base,
      h: mod360(base.h + shift * Math.abs(temperature) * (source.length ? 0.18 : 0.6)),
    });
  }
  const colors = generateEnginePalette({ ...config, baseColor: { xyz: baseXyz } });
  return colors.map((color, index) => reserved.get(index) ?? colorValue(color.xyz, 1, display));
}
