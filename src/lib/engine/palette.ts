import type { DisplayGamutId, Gamut, RgbGamut } from './gamuts/types.ts';
import type { Vec3 } from './math/matrix.ts';

import { hslToRgb, hsvToRgb, rgbToHsl, rgbToHsv } from './device.ts';
import { optimalSolid } from './gamuts/optimal.ts';
import { DISPLAY_GAMUTS, SRGB, encodedToXyz, xyzToEncoded } from './gamuts/rgb.ts';
import { containsXyz } from './gamuts/types.ts';
import {
  getHarmony,
  type HarmonyContext,
  type HarmonyId,
  type HarmonyOptions,
  type HarmonySlot,
} from './harmony.ts';
import { fitAlongHue, maxAlongHue, perceptualHue } from './hue.ts';
import { minCostAssignment } from './math/assignment.ts';
import { bestHex, cssColor, hexToEncoded, hexToXyz, isHex, normalizeHex } from './output.ts';
import { adaptLightness, adaptLightnessByChroma, fitChroma, inGamut, maxChroma } from './solver.ts';
import { CAM16_UCS } from './spaces/cam16.ts';
import { CIELAB } from './spaces/cielab.ts';
import { OKLAB, oklabHueAngle } from './spaces/oklab.ts';
import {
  clamp,
  lchToLab,
  lchToXyz,
  mod360,
  xyzToLch,
  type ColorSpace,
  type Lab,
  type Lch,
} from './spaces/types.ts';

export type SpaceId = 'oklch' | 'cielab' | 'cam16' | 'hsl' | 'hsv';

/** Either `{ Crimson: "#DC143C" }` or `[{ name: "Crimson", hex: "#DC143C" }]`. */
export type ColorCatalog = Record<string, string> | ReadonlyArray<{ name: string; hex: string }>;

/**
 * - "match": every color requests the base's chroma.
 * - "relative": every color requests the base's share of the ideal gamut at its own (L, h).
 */
export type ChromaMode = 'match' | 'relative';

export interface EnginePaletteConfig extends HarmonyOptions {
  /** Hex, a catalog name when a catalog is given, or an exact XYZ (D65, Y in 0..1) color. */
  baseColor: string | { xyz: Vec3 };
  count: number;
  harmony: HarmonyId;
  /** Default "cam16" (CAM16-UCS). */
  space?: SpaceId;
  /** The display the colors must fit. Default "srgb". */
  display?: DisplayGamutId;
  /** Where the palette is solved before display mapping. Default "optimal". */
  ideal?: 'optimal' | 'display';
  /** Default "match". */
  chroma?: ChromaMode;
  /** How far, as a fraction of the lightness range, display mapping may move lightness to keep chroma. Default 0. */
  maxLightnessShift?: number;
  /** CIELAB hue-shifted colors only: fraction toward white (>0) or black (<0), after chroma recovery. Range -1..1; default 0. */
  relativeLightnessShift?: number;
  /**
   * CIELAB only. "linear" (default) turns harmony hues on OKLab's hue-linear circle and fits
   * chroma along constant perceived hue; "native" uses CIELAB's own hue angle.
   */
  cielabHue?: 'linear' | 'native';
  catalog?: ColorCatalog;
}

export interface CatalogMatch {
  name: string;
  hex: string;
  /** ΔE in the palette's space (CIEDE2000 or ΔEOK) from the exact display color. */
  distance: number;
}

export interface EngineColor {
  /** Best 8-bit sRGB; for wider displays this is the sRGB fallback. */
  hex: string;
  /** The color as solved in the ideal gamut. For HSL/HSV, (l, c, h) = (lightness or value, saturation, hue). */
  ideal: Lch;
  /** The ideal color mapped exactly into the display gamut. */
  color: Lch;
  /** Exact XYZ (D65) of `color`. */
  xyz: Vec3;
  /** Exact encoded sRGB (0..1, unrounded) of the sRGB rendition behind `hex`. */
  srgb: Vec3;
  hueOffset: number;
  isBase: boolean;
  /** The requested chroma did not fit the ideal gamut. */
  idealLimited: boolean;
  /** The ideal chroma did not fit the display gamut. */
  displayLimited: boolean;
  lightnessShift: number;
  css: {
    /** `oklch(...)`, `lch(...)` or `hsl(...)`, unrounded. */
    space: string;
    /** `color(<display> r g b)`, unrounded. */
    display: string;
  };
  match?: CatalogMatch;
}

const SPACES: Record<'oklch' | 'cielab' | 'cam16', ColorSpace> = {
  oklch: OKLAB,
  cielab: CIELAB,
  cam16: CAM16_UCS,
};

/** How harmony hues map onto a space's hue angle, and how chroma is fitted along them. */
interface HueModel {
  harmonyHue(color: Lch, xyz: Vec3): number;
  /** Largest in-gamut chroma ≤ target at (l, harmony hue), with the space hue it lands on. */
  fit(gamut: Gamut, l: number, hue: number, target: number): { c: number; h: number };
  max(gamut: Gamut, l: number, hue: number): number;
}

const nativeHue = (space: ColorSpace): HueModel => ({
  harmonyHue: (color) => color.h,
  fit: (gamut, l, h, target) => ({ c: fitChroma(space, gamut, l, h, target), h }),
  max: (gamut, l, h) => maxChroma(space, gamut, l, h),
});

const LINEAR_CIELAB: HueModel = {
  harmonyHue: (_, xyz) => perceptualHue(xyz),
  fit: fitAlongHue,
  max: maxAlongHue,
};

const DEVICE_SPACES = {
  hsl: { fromRgb: rgbToHsl, toRgb: hslToRgb },
  hsv: { fromRgb: rgbToHsv, toRgb: hsvToRgb },
};

const isDevice = (id: SpaceId): id is keyof typeof DEVICE_SPACES => id === 'hsl' || id === 'hsv';

const hslCss = (rgb: Vec3) => {
  const { h, s, l } = rgbToHsl(rgb);
  return `hsl(${h} ${s * 100}% ${l * 100}%)`;
};

const displayGamut = (id: DisplayGamutId): RgbGamut => DISPLAY_GAMUTS.find((g) => g.id === id)!;

interface CatalogEntry {
  name: string;
  hex: string;
  lab: Lab;
}

function prepareCatalog(space: ColorSpace, catalog: ColorCatalog): CatalogEntry[] {
  const pairs = Array.isArray(catalog)
    ? (catalog as ReadonlyArray<{ name: string; hex: string }>).map((c) => [c.name, c.hex] as const)
    : Object.entries(catalog as Record<string, string>);
  return pairs.map(([name, hex]) => {
    const normalized = normalizeHex(hex);
    return { name, hex: normalized, lab: space.xyzToLab(hexToXyz(normalized)) };
  });
}

function resolveBaseHex(baseColor: string, entries: CatalogEntry[] | undefined): string {
  if (isHex(baseColor)) return normalizeHex(baseColor);
  const named = entries?.find((e) => e.name.toLowerCase() === baseColor.trim().toLowerCase());
  if (named) return named.hex;
  throw new Error(
    entries
      ? `Base color "${baseColor}" is neither a valid hex value nor a name in the catalog.`
      : `Base color "${baseColor}" is not a valid hex value.`,
  );
}

/** An 8-bit hex base, or an exact XYZ one that may lie outside sRGB or the display. */
type Base = { hex: string; xyz?: undefined } | { hex?: undefined; xyz: Vec3 };

function resolveBase(
  baseColor: EnginePaletteConfig['baseColor'],
  entries: CatalogEntry[] | undefined,
): Base {
  if (typeof baseColor === 'string') return { hex: resolveBaseHex(baseColor, entries) };
  const xyz = baseColor?.xyz;
  if (!Array.isArray(xyz) || xyz.length !== 3 || !xyz.every(Number.isFinite) || xyz[1] < 0) {
    throw new Error('Base color xyz must be three finite numbers with Y >= 0.');
  }
  return { xyz: [xyz[0], xyz[1], xyz[2]] };
}

/** Pin the base to its nearest entry, then assign the rest by minimum total ΔE (Hungarian). */
function assignToCatalog(
  space: ColorSpace,
  targets: Lab[],
  baseIndex: number,
  entries: CatalogEntry[],
): CatalogMatch[] {
  const n = targets.length;
  const m = entries.length;
  const match = (entry: CatalogEntry, distance: number) => ({
    name: entry.name,
    hex: entry.hex,
    distance,
  });

  let pinned = 0;
  let pinnedDistance = Infinity;
  entries.forEach((entry, i) => {
    const d = space.distance(targets[baseIndex]!, entry.lab);
    if (d < pinnedDistance) {
      pinnedDistance = d;
      pinned = i;
    }
  });

  const matches = new Array<CatalogMatch>(n);
  matches[baseIndex] = match(entries[pinned]!, pinnedDistance);
  const rows = targets.map((_, i) => i).filter((i) => i !== baseIndex);
  if (rows.length === 0) return matches;

  const columns: number[] = [];
  for (let copy = 0; copy < Math.ceil(n / m); copy++) {
    for (let i = 0; i < m; i++) if (copy > 0 || i !== pinned) columns.push(i);
  }
  const cost = rows.map((r) => columns.map((c) => space.distance(targets[r]!, entries[c]!.lab)));
  const chosen = minCostAssignment(cost);
  rows.forEach((row, k) => {
    matches[row] = match(entries[columns[chosen[k]!]!]!, cost[k]![chosen[k]!]!);
  });
  return matches;
}

interface Resolved {
  ideal: Lch;
  color: Lch;
  idealLimited: boolean;
  displayLimited: boolean;
}

const cam16NeutralLimits = new WeakMap<Gamut, number>();

function cam16NeutralLimit(gamut: Gamut): number {
  const cached = cam16NeutralLimits.get(gamut);
  if (cached !== undefined) return cached;
  let lo = 0;
  let hi = CAM16_UCS.lightnessMax;
  for (let iteration = 0; iteration < 45; iteration++) {
    const mid = (lo + hi) / 2;
    if (inGamut(CAM16_UCS, gamut, { l: mid, c: 0, h: 0 }, 0)) lo = mid;
    else hi = mid;
  }
  cam16NeutralLimits.set(gamut, lo);
  return lo;
}

function resolveSlot(
  space: ColorSpace,
  hue: HueModel,
  ideal: Gamut,
  display: RgbGamut,
  slot: HarmonySlot,
  base: Lch,
  baseRelative: () => number,
  config: EnginePaletteConfig,
): Resolved {
  const { chroma = 'match', maxLightnessShift = 0 } = config;
  let target: number;
  if (slot.chroma.kind === 'relative' && slot.chroma.value === 0) {
    target = slot.chroma.value;
  } else if (slot.chroma.kind === 'relative') {
    const limit = slot.chroma.of === 'display' ? display : ideal;
    const max = hue.max(limit, slot.l, slot.h);
    const linear = slot.chroma.of === 'display' ? space.linearChroma : undefined;
    target = linear ? linear.from(slot.chroma.value * linear.to(max)) : slot.chroma.value * max;
  } else if (chroma === 'relative') target = baseRelative() * hue.max(ideal, slot.l, slot.h);
  else target = base.c;

  const fitted = hue.fit(ideal, slot.l, slot.h, target);
  const idealColor: Lch = { l: slot.l, c: fitted.c, h: fitted.h };

  const adapt =
    maxLightnessShift > 0 &&
    slot.hueOffset !== 0 &&
    slot.chroma.kind === 'base' &&
    chroma === 'match';
  if (
    adapt &&
    hue === LINEAR_CIELAB &&
    (fitted.c < target || !inGamut(space, display, idealColor))
  ) {
    const limits = new Map<number, number>();
    const peak = (lightness: number) => {
      const cached = limits.get(lightness);
      if (cached !== undefined) return cached;
      const displayMax = hue.max(display, lightness, slot.h);
      const physical = hue.fit(ideal, lightness, slot.h, displayMax);
      const mapped = hue.fit(display, lightness, slot.h, physical.c);
      limits.set(lightness, mapped.c);
      return mapped.c;
    };
    const shift = maxLightnessShift * space.lightnessMax;
    const moved = adaptLightnessByChroma(
      peak,
      slot.l,
      target,
      clamp(slot.l - shift, 0, space.lightnessMax),
      clamp(slot.l + shift, 0, space.lightnessMax),
      space.lightnessMax,
    );
    return resolveSlot(space, hue, ideal, display, { ...slot, l: moved.l }, base, baseRelative, {
      ...config,
      maxLightnessShift: 0,
    });
  }
  let color: Lch;
  if (inGamut(space, display, idealColor)) {
    color = idealColor;
  } else if (adapt) {
    const moved = adaptLightness(
      space,
      display,
      slot.l,
      fitted.h,
      fitted.c,
      maxLightnessShift * space.lightnessMax,
    );
    // The shift is found at the ideal's space hue; refit there to stay on the harmony hue.
    const refit = hue.fit(display, moved.l, slot.h, moved.c);
    color = { l: moved.l, c: refit.c, h: refit.h };
  } else {
    const refit = hue.fit(display, slot.l, slot.h, fitted.c);
    color = { l: slot.l, c: refit.c, h: refit.h };
  }

  if (space === CAM16_UCS && !inGamut(space, display, color)) {
    const limit = Math.min(cam16NeutralLimit(ideal), cam16NeutralLimit(display));
    if (slot.l > limit) {
      return resolveSlot(
        space,
        hue,
        ideal,
        display,
        { ...slot, l: limit },
        base,
        baseRelative,
        config,
      );
    }
  }

  return {
    ideal: idealColor,
    color,
    idealLimited: fitted.c < target - 1e-9 * Math.max(1, target),
    displayLimited: color.c < fitted.c - 1e-9 * Math.max(1, fitted.c),
  };
}

export function generateEnginePalette(config: EnginePaletteConfig): EngineColor[] {
  const { count, maxLightnessShift = 0, relativeLightnessShift = 0 } = config;
  if (!Number.isInteger(count) || count < 1 || count > 64) {
    throw new Error(`count must be an integer between 1 and 64 (got ${count}).`);
  }
  if (
    config.naturalChroma !== undefined &&
    config.naturalChroma !== 'ideal' &&
    config.naturalChroma !== 'display'
  ) {
    throw new Error(
      `naturalChroma must be "ideal" or "display" (got ${String(config.naturalChroma)}).`,
    );
  }
  if (!Number.isFinite(maxLightnessShift) || maxLightnessShift < 0 || maxLightnessShift > 1) {
    throw new Error(
      `maxLightnessShift must be a number between 0 and 1 (got ${maxLightnessShift}).`,
    );
  }
  if (
    !Number.isFinite(relativeLightnessShift) ||
    relativeLightnessShift < -1 ||
    relativeLightnessShift > 1
  ) {
    throw new Error(
      `relativeLightnessShift must be a number between -1 and 1 (got ${relativeLightnessShift}).`,
    );
  }

  const spaceId = config.space ?? 'cam16';
  const display = displayGamut(config.display ?? 'srgb');
  // Device spaces have no perceptual metric of their own, so they match and round in OKLab.
  const metric = isDevice(spaceId) ? OKLAB : SPACES[spaceId];

  const entries = config.catalog ? prepareCatalog(metric, config.catalog) : undefined;
  if (entries && entries.length === 0) throw new Error('catalog is empty.');

  const baseInput = resolveBase(config.baseColor, entries);
  const colors = isDevice(spaceId)
    ? deviceColors(spaceId, config, display, baseInput)
    : perceptualColors(spaceId, SPACES[spaceId], config, display, baseInput);

  if (entries) {
    const matches = assignToCatalog(
      metric,
      colors.map((c) => metric.xyzToLab(c.xyz)),
      Math.max(
        0,
        colors.findIndex((c) => c.isBase),
      ),
      entries,
    );
    colors.forEach((color, i) => {
      color.match = matches[i]!;
    });
  }
  return colors;
}

function perceptualColors(
  spaceId: 'oklch' | 'cielab' | 'cam16',
  space: ColorSpace,
  config: EnginePaletteConfig,
  display: RgbGamut,
  baseInput: Base,
): EngineColor[] {
  const ideal: Gamut = (config.ideal ?? 'optimal') === 'optimal' ? optimalSolid() : display;
  const hue = space === CIELAB && config.cielabHue !== 'native' ? LINEAR_CIELAB : nativeHue(space);
  const baseXyz = baseInput.xyz ?? hexToXyz(baseInput.hex);
  const base = xyzToLch(space, baseXyz);
  const baseHue = hue.harmonyHue(base, baseXyz);
  let relative: number | undefined;
  const baseRelative = () => {
    if (relative === undefined) {
      const limit = hue.max(ideal, base.l, baseHue);
      relative = limit > 0 ? Math.min(1, base.c / limit) : 0;
    }
    return relative;
  };
  let displayRelative: number | undefined;

  const ctx: HarmonyContext = {
    base: { ...base, h: baseHue },
    get baseRelative() {
      return baseRelative();
    },
    lightnessMax: space.lightnessMax,
    count: config.count,
    options: config,
    space: spaceId,
    get baseDisplayRelative() {
      if (displayRelative === undefined) {
        const displayLimit = hue.max(display, base.l, baseHue);
        displayRelative =
          displayLimit > 0
            ? Math.min(
                1,
                space.linearChroma
                  ? space.linearChroma.to(base.c) / space.linearChroma.to(displayLimit)
                  : base.c / displayLimit,
              )
            : 0;
      }
      return displayRelative;
    },
    basePerceptualHue: oklabHueAngle(baseXyz),
  };
  const resolveColor = (slot: HarmonySlot): Resolved => {
    const resolved = resolveSlot(space, hue, ideal, display, slot, base, baseRelative, config);
    const amount = config.relativeLightnessShift ?? 0;
    if (space !== CIELAB || amount === 0 || slot.isBase || slot.hueOffset === 0) return resolved;
    const lightness = resolved.color.l;
    const shifted =
      amount > 0 ? lightness + (space.lightnessMax - lightness) * amount : lightness * (1 + amount);
    return resolveSlot(space, hue, ideal, display, { ...slot, l: shifted }, base, baseRelative, {
      ...config,
      maxLightnessShift: 0,
    });
  };
  const resolveLab = (slot: HarmonySlot) =>
    lchToLab(slot.isBase && slot.chroma.kind === 'base' ? base : resolveColor(slot).color);
  const slots = harmonySlots(config.harmony, ctx, resolveLab, (x, y) => space.distance(x, y));

  return slots.map((slot): EngineColor => {
    if (slot.isBase && slot.chroma.kind === 'base') {
      if (baseInput.xyz) return exactBase(space, hue, display, base, baseHue, baseXyz, slot);
      return {
        hex: baseInput.hex,
        ideal: base,
        color: base,
        xyz: baseXyz,
        srgb: hexToEncoded(baseInput.hex),
        hueOffset: slot.hueOffset,
        isBase: true,
        idealLimited: false,
        displayLimited: false,
        lightnessShift: 0,
        css: { space: space.css(base), display: cssColor(display, baseXyz) },
      };
    }

    const resolved = resolveColor(slot);
    let srgbColor = resolved.color;
    if (display !== SRGB) {
      const fallback = hue.fit(SRGB, resolved.color.l, slot.h, resolved.color.c);
      srgbColor = { l: resolved.color.l, c: fallback.c, h: fallback.h };
    }
    const xyz = lchToXyz(space, resolved.color);
    return {
      hex: bestHex(space, srgbColor),
      ...resolved,
      xyz,
      srgb: xyzToEncoded(SRGB, lchToXyz(space, srgbColor)),
      hueOffset: slot.hueOffset,
      isBase: slot.isBase,
      lightnessShift: resolved.color.l - slot.l,
      css: { space: space.css(resolved.color), display: cssColor(display, xyz) },
    };
  });
}

/** An exact XYZ base: kept as is where it fits, otherwise mapped in at its own lightness and hue. */
function exactBase(
  space: ColorSpace,
  hue: HueModel,
  display: RgbGamut,
  base: Lch,
  baseHue: number,
  baseXyz: Vec3,
  slot: HarmonySlot,
): EngineColor {
  const within = (gamut: RgbGamut): Lch => {
    if (containsXyz(gamut, baseXyz)) return base;
    const l = clamp(base.l, 0, space.lightnessMax);
    return { l, ...hue.fit(gamut, l, baseHue, base.c) };
  };
  const color = within(display);
  const srgbColor = display === SRGB ? color : within(SRGB);
  const xyz = color === base ? baseXyz : lchToXyz(space, color);
  return {
    hex: bestHex(space, srgbColor),
    ideal: base,
    color,
    xyz,
    srgb: xyzToEncoded(SRGB, srgbColor === base ? baseXyz : lchToXyz(space, srgbColor)),
    hueOffset: slot.hueOffset,
    isBase: true,
    idealLimited: false,
    displayLimited: color !== base,
    lightnessShift: 0,
    css: { space: space.css(color), display: cssColor(display, xyz) },
  };
}

/**
 * The device (HSL/HSV) hue at fixed saturation and lightness whose OKLab hue is θ: Illinois regula
 * falsi on the wrapped hue error, bracketed around the slot's own hue. Falls back to that hue
 * near neutral, where perceived hue is undefined.
 */
function deviceHueFor(toXyz: (color: Lch) => Vec3, color: Lch, theta: number): number {
  if (color.c < 1e-3 || color.l < 1e-3 || color.l > 1 - 1e-3) return color.h;
  const err = (h: number) => mod360(oklabHueAngle(toXyz({ ...color, h })) - theta + 180) - 180;
  for (const span of [30, 60, 120]) {
    let lo = color.h - span;
    let hi = color.h + span;
    let fLo = err(lo);
    let fHi = err(hi);
    if (!(fLo <= 0 && fHi >= 0)) continue;
    let side = 0;
    for (let i = 0; i < 100 && hi - lo > 1e-10; i++) {
      const x = lo - (fLo * (hi - lo)) / (fHi - fLo);
      const fx = err(x);
      if (fx === 0) return mod360(x);
      if (fx < 0) {
        lo = x;
        fLo = fx;
        if (side === -1) fHi /= 2;
        side = -1;
      } else {
        hi = x;
        fHi = fx;
        if (side === 1) fLo /= 2;
        side = 1;
      }
    }
    return mod360((lo + hi) / 2);
  }
  return color.h;
}

/** Steps per side used to measure a ramp's length before spacing its colors. */
const RAMP_SAMPLES = 8;

/**
 * A harmony's slots. Ramp rules are respaced so each color sits the same ΔE from its neighbour.
 * The resolved curve is sampled on each side of the base (densified where the colors land) and
 * interpolated; colors are chained outward from the base at a fixed ΔE, and that ΔE is the largest
 * one that fits the ramp. Distances are chords between neighbours, not arc length, because the
 * curve bends at the gamut cusp and a step's chord there is shorter than the arc it covers.
 */
function harmonySlots(
  id: HarmonyId,
  ctx: HarmonyContext,
  measure: (slot: HarmonySlot) => Lab,
  distance: (x: Lab, y: Lab) => number,
): HarmonySlot[] {
  const def = getHarmony(id);
  const spec = def.ramp?.(ctx);
  if (!spec || ctx.count < 3) return def.build(ctx);

  const base: HarmonySlot = {
    l: ctx.base.l,
    h: ctx.base.h,
    hueOffset: 0,
    isBase: true,
    chroma: { kind: 'base' },
  };
  const baseLab = measure(base);
  const side = (start: number, end: number) => {
    // Positions are kept as the fraction u ∈ [0, 1] of the way from `start` to `end`.
    const samples = Array.from({ length: RAMP_SAMPLES + 1 }, (_, i) => {
      const u = i / RAMP_SAMPLES;
      return {
        u,
        lab: i === 0 || start === end ? baseLab : measure(spec.at(start + (end - start) * u)),
      };
    });
    const labAt = (u: number): Lab => {
      let i = 1;
      while (i < samples.length - 1 && samples[i]!.u < u) i++;
      const a = samples[i - 1]!;
      const b = samples[i]!;
      const f = b.u > a.u ? Math.min(1, Math.max(0, (u - a.u) / (b.u - a.u))) : 0;
      return {
        L: a.lab.L + f * (b.lab.L - a.lab.L),
        a: a.lab.a + f * (b.lab.a - a.lab.a),
        b: a.lab.b + f * (b.lab.b - a.lab.b),
      };
    };
    const startLab = samples[0]!.lab;
    const endLab = samples[samples.length - 1]!.lab;
    const endDistance = distance(startLab, endLab);
    /** Up to k positions chained `step` apart from `start`; fewer when the end comes first. */
    const chain = (step: number, k: number) => {
      const out: number[] = [];
      let u0 = 0;
      let lab0 = startLab;
      while (out.length < k) {
        const remainingDistance = distance(lab0, endLab);
        if (!(remainingDistance >= step)) break;
        let lo = u0;
        let hi = 1;
        let lowerError = -step;
        let upperError = remainingDistance - step;
        let previousSide = 0;
        for (let iteration = 0; iteration < 100 && hi - lo > 1e-12; iteration++) {
          let mid = lo - (lowerError * (hi - lo)) / (upperError - lowerError);
          if (!Number.isFinite(mid) || mid <= lo || mid >= hi) mid = (lo + hi) / 2;
          const error = distance(lab0, labAt(mid)) - step;
          if (error === 0) {
            lo = mid;
            hi = mid;
            break;
          }
          if (error < 0) {
            lo = mid;
            lowerError = error;
            if (previousSide === -1) upperError /= 2;
            previousSide = -1;
          } else {
            hi = mid;
            upperError = error;
            if (previousSide === 1) lowerError /= 2;
            previousSide = 1;
          }
        }
        u0 = (lo + hi) / 2;
        lab0 = labAt(u0);
        out.push(u0);
      }
      return out;
    };
    /** The largest step at which k chained steps still fit before the end. */
    const maxStep = (k: number) => {
      let lo = 0;
      let hi = endDistance / Math.max(1, k) + 1e-9;
      // The chain may bend, so k chords can need a step above the straight-line share.
      while (chain(hi, k).length === k) hi *= 1.5;
      for (let it = 0; it < 30; it++) {
        const mid = (lo + hi) / 2;
        if (chain(mid, k).length === k) lo = mid;
        else hi = mid;
      }
      return lo;
    };
    const span = () => endDistance;
    // Measuring at the placed points themselves makes the interpolation exact where colors land.
    const refine = (us: number[]) => {
      const labs = us.map((u) =>
        start === end || u === 0 ? baseLab : measure(spec.at(start + (end - start) * u)),
      );
      for (let index = 0; index < us.length; index++)
        samples.push({ u: us[index]!, lab: labs[index]! });
      samples.sort((x, y) => x.u - y.u);
      return labs;
    };
    const at = (u: number) => spec.at(start + (end - start) * u);
    return { chain, maxStep, span, refine, at };
  };
  const dark = side(spec.base, spec.from);
  const light = side(spec.base, spec.to);

  // One ΔE step for the whole ramp: split the steps between the sides to make it as large as
  // possible; the side that can't take a whole number of them stops short of its end.
  const steps = ctx.count - 1;
  const choose = () => {
    const darkLimits = new Array<number | undefined>(steps + 1);
    const lightLimits = new Array<number | undefined>(steps + 1);
    const darkLimit = (count: number) =>
      count === 0 ? Infinity : (darkLimits[count] ??= dark.maxStep(count));
    const lightLimit = (count: number) =>
      count === 0 ? Infinity : (lightLimits[count] ??= light.maxStep(count));
    let lo = 0;
    let hi = steps;
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      if (darkLimit(mid) > lightLimit(steps - mid)) lo = mid;
      else hi = mid;
    }
    const candidates = [...new Set([0, 1, lo, hi, steps - 1, steps])].sort(
      (left, right) => left - right,
    );
    let darkSteps = 0;
    let step = 0;
    for (const k of candidates) {
      const kl = steps - k;
      const common = Math.min(darkLimit(k), lightLimit(kl));
      // A side may go without steps only when it spans under half a step.
      if (k === 0 && dark.span() > 0.5 * common) continue;
      if (kl === 0 && light.span() > 0.5 * common) continue;
      if (Number.isFinite(common) && common > step) {
        step = common;
        darkSteps = k;
      }
    }
    return { step, darkSteps, lightSteps: steps - darkSteps };
  };
  let plan = choose();
  let darkPositions: number[] = [];
  let lightPositions: number[] = [];
  for (let pass = 0; pass < 8; pass++) {
    darkPositions = dark.chain(plan.step, plan.darkSteps);
    lightPositions = light.chain(plan.step, plan.lightSteps);
    const darkLabs = dark.refine(darkPositions);
    const lightLabs = light.refine(lightPositions);
    const accurate = (labs: Lab[]) =>
      labs.every(
        (lab, index) =>
          Math.abs(distance(index === 0 ? baseLab : labs[index - 1]!, lab) - plan.step) <=
          0.005 * plan.step,
      );
    if (accurate(darkLabs) && accurate(lightLabs)) break;
    plan = choose();
  }

  const darks = darkPositions.reverse().map((u) => dark.at(u));
  const lights = lightPositions.map((u) => light.at(u));
  return [...darks, base, ...lights];
}

/** HSL/HSV: harmonies act on the sRGB cube directly, so every color is in every display gamut. */
function deviceColors(
  kind: keyof typeof DEVICE_SPACES,
  config: EnginePaletteConfig,
  display: RgbGamut,
  baseInput: Base,
): EngineColor[] {
  const model = DEVICE_SPACES[kind];
  const { rgb: baseRgb, mapped: baseMapped } = baseInput.xyz
    ? deviceBase(baseInput.xyz)
    : { rgb: hexToEncoded(baseInput.hex), mapped: false };
  const baseXyz = encodedToXyz(SRGB, baseRgb);
  const baseHex = baseInput.hex ?? bestHex(OKLAB, xyzToLch(OKLAB, baseXyz));
  const { h, s, l } = model.fromRgb(baseRgb);
  const base: Lch = { l, c: s, h };
  const toXyz = (color: Lch) =>
    encodedToXyz(SRGB, model.toRgb({ h: color.h, s: color.c, l: color.l }));

  const slots = harmonySlots(
    config.harmony,
    {
      base,
      baseRelative: s,
      lightnessMax: 1,
      count: config.count,
      options: config,
      space: kind,
      baseDisplayRelative: s,
      basePerceptualHue: oklabHueAngle(baseXyz),
    },
    (slot) =>
      OKLAB.xyzToLab(
        slot.isBase && slot.chroma.kind === 'base'
          ? baseXyz
          : encodedToXyz(SRGB, model.toRgb(deviceColor(slot))),
      ),
    (x, y) => OKLAB.distance(x, y),
  );

  function deviceColor(slot: HarmonySlot): { h: number; s: number; l: number } {
    const color: Lch = {
      l: clamp(slot.l, 0, 1),
      c: clamp(slot.chroma.kind === 'relative' ? slot.chroma.value : s, 0, 1),
      h: slot.h,
    };
    if (slot.perceptualHue !== undefined) color.h = deviceHueFor(toXyz, color, slot.perceptualHue);
    return { h: color.h, s: color.c, l: color.l };
  }

  return slots.map((slot): EngineColor => {
    const exactBase = slot.isBase && slot.chroma.kind === 'base';
    const hsx = exactBase ? { h, s, l } : deviceColor(slot);
    const color: Lch = { l: hsx.l, c: hsx.s, h: hsx.h };
    const rgb = exactBase ? baseRgb : model.toRgb(hsx);
    const xyz = encodedToXyz(SRGB, rgb);
    return {
      hex: exactBase ? baseHex : bestHex(OKLAB, xyzToLch(OKLAB, xyz)),
      ideal: color,
      color,
      xyz,
      srgb: rgb,
      hueOffset: slot.hueOffset,
      isBase: slot.isBase,
      idealLimited: false,
      displayLimited: exactBase && baseMapped,
      lightnessShift: 0,
      css: { space: hslCss(rgb), display: cssColor(display, xyz) },
    };
  });
}

/** Device spaces live in the sRGB cube: an XYZ base outside it is mapped in at its OKLCH L and h. */
function deviceBase(xyz: Vec3): { rgb: Vec3; mapped: boolean } {
  const inside = containsXyz(SRGB, xyz);
  let target = xyz;
  if (!inside) {
    const { l, c, h } = xyzToLch(OKLAB, xyz);
    const lightness = clamp(l, 0, 1);
    target = lchToXyz(OKLAB, { l: lightness, c: fitChroma(OKLAB, SRGB, lightness, h, c), h });
  }
  const rgb = xyzToEncoded(SRGB, target).map((v) => clamp(v, 0, 1)) as unknown as Vec3;
  return { rgb, mapped: !inside };
}
