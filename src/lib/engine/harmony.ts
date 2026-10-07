/**
 * Harmony rules. A rule decides hue, lightness and a chroma request for each slot; the
 * palette pipeline resolves chroma against the gamuts afterwards.
 *
 * Lightness here is normalized to 0..1 and scaled by the space's lightness range.
 * Rules whose slots all request the base chroma at evenly spaced hues (complementary,
 * triadic, square, pentadic, hexadic, ...) keep the neutral-centroid balance; rules that
 * vary chroma on purpose (monochromatic, shades, natural) do not.
 */
import { anchorLightness } from './harmony-lightness.ts';
import { clamp, mod360, type Lch } from './spaces/types.ts';

/** `relative` is a share of the ideal gamut's chroma, or of the display's when `of` is "display". */
export type ChromaSpec =
  | { kind: 'base' }
  | { kind: 'relative'; value: number; of?: 'ideal' | 'display' };

export interface HarmonySlot {
  l: number;
  h: number;
  /** Degrees from the base hue, in (-180, 360). */
  hueOffset: number;
  isBase: boolean;
  chroma: ChromaSpec;
  /** HSL/HSV only: solve the device hue so the color's OKLab hue lands here. */
  perceptualHue?: number;
}

export interface HarmonyContext {
  base: Lch;
  /** The base's share of the ideal gamut's chroma at its lightness and hue. */
  baseRelative: number;
  lightnessMax: number;
  count: number;
  options: HarmonyOptions;
  /** The palette's generation space; rules may adapt to it. */
  space?: 'oklch' | 'cielab' | 'cam16' | 'hsl' | 'hsv';
  /** The base's share of the display gamut's chroma at its lightness and hue. */
  baseDisplayRelative?: number;
  /** OKLab hue of the base. */
  basePerceptualHue?: number;
}

/** What a sampler proposes for one slot; omitted fields default to the base's. */
export interface SlotDraft {
  hueOffset: number;
  /** Normalized lightness, 0..1. */
  l?: number;
  chroma?: ChromaSpec;
}

/** Source of slots for the "random" rule; swap in another (e.g. a curated color list) later. */
export interface HarmonySampler {
  sample(index: number, context: HarmonyContext): SlotDraft;
}

export interface HarmonyOptions {
  /** Max degrees between analogous neighbours. Default 30. */
  analogousAngle?: number;
  /** Seeds lightness jitter for "random". Without it, "random" is pure golden-angle stepping. */
  seed?: number;
  sampler?: HarmonySampler;
  /** Which side of the base the Matsuda L accent sits on. Default 1 (+90°). */
  matsudaOrientation?: 1 | -1;
  /** Strength of the designer hue shift in Shades & Tints (not CIELAB). 0 turns it off. Default 1. */
  shadeHueShift?: number;
  /** Natural only: chroma relative to the selected display gamut (default) or ideal gamut. */
  naturalChroma?: 'ideal' | 'display';
}

export type HarmonyId =
  | 'analogous'
  | 'complementary'
  | 'split-comp'
  | 'triadic'
  | 'tetradic'
  | 'square'
  | 'monochromatic'
  | 'shades'
  | 'double-split'
  | 'compound'
  | 'natural'
  | 'random'
  | 'matsuda_L'
  | 'matsuda_Y'
  | 'matsuda_X'
  | 'matsuda_T'
  | 'matsuda_i'
  | 'matsuda_I'
  | 'matsuda_N'
  | 'accented-analogous'
  | 'pentadic'
  | 'hexadic';

export interface HarmonyDef {
  id: HarmonyId;
  label: string;
  desc: string;
  build(context: HarmonyContext): HarmonySlot[];
  /** Ramp rules also expose their continuous curve, so the pipeline can space steps evenly by ΔE. */
  ramp?(context: HarmonyContext): RampSpec | undefined;
}

/** A one-parameter family of slots over normalized lightness [from, to], with the base at `base`. */
export interface RampSpec {
  from: number;
  to: number;
  base: number;
  at(l: number): HarmonySlot;
}

const L_MIN = 0.15;
const L_MAX = 0.95;
const GOLDEN_ANGLE = 180 * (3 - Math.sqrt(5));
const BASE: ChromaSpec = { kind: 'base' };

/** A hue sector of the wheel, as an offset from the base hue and a width, both in degrees. */
interface Sector {
  center: number;
  width: number;
}

/** Matsuda's hue templates with the sector widths from Cohen-Or et al. (2006). */
const MATSUDA = {
  i: [{ center: 0, width: 18 }],
  V: [{ center: 0, width: 93.6 }],
  L: [
    { center: 0, width: 79.2 },
    { center: 90, width: 18 },
  ],
  I: [
    { center: 0, width: 18 },
    { center: 180, width: 18 },
  ],
  T: [{ center: 0, width: 180 }],
  Y: [
    { center: 0, width: 93.6 },
    { center: 180, width: 18 },
  ],
  X: [
    { center: 0, width: 93.6 },
    { center: 180, width: 93.6 },
  ],
} satisfies Record<string, Sector[]>;

const normalizedBaseL = (ctx: HarmonyContext) => ctx.base.l / ctx.lightnessMax;

function slot(
  ctx: HarmonyContext,
  hueOffset: number,
  l: number,
  chroma: ChromaSpec,
  isBase = false,
): HarmonySlot {
  return {
    l: isBase ? ctx.base.l : clamp(l, 0, 1) * ctx.lightnessMax,
    h: mod360(ctx.base.h + hueOffset),
    hueOffset,
    isBase,
    chroma,
  };
}

/** 0, +step, -step, +2·step, ... */
const alternate = (pass: number, step: number) =>
  pass === 0 ? 0 : (pass % 2 === 1 ? 1 : -1) * Math.ceil(pass / 2) * step;

/** Largest swing ±0.35, never more than 0.15 per step. */
const passStep = (passes: number) =>
  Math.min(0.15, 0.35 / Math.max(1, Math.ceil((passes - 1) / 2)));

/** Evenly spaced lightness from lo to hi, with the step nearest the base snapped onto it. */
function ramp(
  ctx: HarmonyContext,
  lo: number,
  hi: number,
  target = normalizedBaseL(ctx),
): { values: number[]; baseIndex: number } {
  const n = ctx.count;
  if (n === 1) return { values: [target], baseIndex: 0 };
  const values = Array.from({ length: n }, (_, i) => lo + ((hi - lo) * i) / (n - 1));
  let baseIndex = 0;
  values.forEach((v, i) => {
    if (Math.abs(v - target) < Math.abs(values[baseIndex]! - target)) baseIndex = i;
  });
  values[baseIndex] = target;
  return { values, baseIndex };
}

/** Hues dealt round-robin across fixed offsets; later passes alternate lighter and darker. */
function fromAnchors(ctx: HarmonyContext, offsets: number[]): HarmonySlot[] {
  const passes = Math.ceil(ctx.count / offsets.length);
  const lightness = anchorLightness(normalizedBaseL(ctx), passes);
  return Array.from({ length: ctx.count }, (_, i) => {
    const pass = Math.floor(i / offsets.length);
    return slot(ctx, offsets[i % offsets.length]!, lightness[pass]!, BASE, i === 0);
  });
}

/** k offsets inside a sector centred on the base, the base exactly at the centre. */
function centeredOffsets(k: number, width: number, maxStep = Infinity): number[] {
  if (k === 1) return [0];
  const b = Math.floor((k - 1) / 2);
  const step = Math.sign(maxStep) * Math.min(Math.abs(maxStep), width / 2 / Math.ceil((k - 1) / 2));
  return Array.from({ length: k }, (_, i) => (i - b) * step);
}

/** k offsets spread edge to edge across a sector. */
const spreadOffsets = ({ center, width }: Sector, k: number): number[] =>
  k === 1
    ? [center]
    : Array.from({ length: k }, (_, i) => center - width / 2 + (width * i) / (k - 1));

/** How many hues each sector gets: at least one each, the rest in proportion to width. */
function allot(count: number, sectors: Sector[]): number[] {
  if (count <= sectors.length) return sectors.map((_, i) => (i < count ? 1 : 0));
  const extra = count - sectors.length;
  const total = sectors.reduce((s, x) => s + x.width, 0);
  const quotas = sectors.map((s) => (extra * s.width) / total);
  const shares = quotas.map((q) => 1 + Math.floor(q));
  let left = count - shares.reduce((s, x) => s + x, 0);
  const order = quotas
    .map((q, i) => ({ i, frac: q - Math.floor(q) }))
    .sort((x, y) => y.frac - x.frac || x.i - y.i);
  for (const { i } of order) {
    if (left-- <= 0) break;
    shares[i]!++;
  }
  return shares;
}

/** A Matsuda template: hues fill each sector; narrow sectors also step lightness so hues stay distinct. */
function fromSectors(ctx: HarmonyContext, sectors: Sector[]): HarmonySlot[] {
  const baseL = normalizedBaseL(ctx);
  const slots: HarmonySlot[] = [];
  allot(ctx.count, sectors).forEach((k, s) => {
    if (k === 0) return;
    const sector = sectors[s]!;
    const offsets = s === 0 ? centeredOffsets(k, sector.width) : spreadOffsets(sector, k);
    const step = sector.width < 45 ? passStep(k) : 0;
    // Hues nearest the sector centre keep the base lightness; the rest alternate outwards.
    const byCentre = offsets
      .map((offset, i) => ({ offset, i }))
      .sort(
        (x, y) =>
          Math.abs(x.offset - sector.center) - Math.abs(y.offset - sector.center) || x.i - y.i,
      );
    const rank = new Map(byCentre.map(({ i }, r) => [i, r]));
    offsets.forEach((offset, i) => {
      const isBase = s === 0 && offset === 0;
      const l = clamp(baseL + alternate(rank.get(i)!, step), L_MIN, L_MAX);
      slots.push(slot(ctx, offset, l, BASE, isBase));
    });
  });
  return slots;
}

const signedDelta = (from: number, to: number) => mod360(to - from + 180) - 180;

const SHADE_DARK = 0.2;
const SHADE_LIGHT = 0.97;
/** Red-orange: designer ramps turn their darks toward it and their tints away from it. */
const WARM_ANCHOR = 30;

/**
 * The designer hue shift at ramp position l (Tailwind/Radix style): darks turn toward the warm
 * anchor so yellows go amber rather than olive, tints turn half as far the other way. Yellows,
 * where dark shades look muddiest, turn most; the turn never passes the anchor.
 */
function shadeHueShift(hue: number, l: number, baseL: number, strength: number): number {
  const toward = signedDelta(hue, WARM_ANCHOR);
  const yellowness = Math.exp(-((signedDelta(hue, 95) / 35) ** 2));
  const turn = Math.min(4 + 20 * yellowness, Math.abs(toward)) * Math.sign(toward || 1) * strength;
  if (l < baseL) return (turn * (baseL - l)) / Math.max(1e-9, baseL - SHADE_DARK);
  return (-0.5 * turn * (l - baseL)) / Math.max(1e-9, SHADE_LIGHT - baseL);
}

/**
 * Shades & Tints as a continuous ramp. For every space but CIELAB, chroma is the base's share of
 * the display gamut at each lightness, so it tapers smoothly to black and white without clipping;
 * HSV makes shades by mixing with black and tints by mixing with white, placed on the
 * HSL-lightness ramp so both ends get room; HSL and HSV solve their hue so the perceived (OKLab)
 * hue follows the ramp. CIELAB keeps its original ramp.
 */
function shadeRamp(ctx: HarmonyContext, monochromatic = false): RampSpec {
  if (ctx.space === 'cielab' || ctx.space === undefined) {
    const base = normalizedBaseL(ctx);
    return {
      from: Math.min(0.12, base),
      to: Math.max(0.97, base),
      base,
      at: (l) => slot(ctx, 0, l, { kind: 'relative', value: ctx.baseRelative }),
    };
  }

  const hsv = ctx.space === 'hsv';
  const device = hsv || ctx.space === 'hsl';
  // For HSV, ramp positions are HSL lightness, L = V(1 − S/2).
  const baseL = hsv ? ctx.base.l * (1 - ctx.base.c / 2) : normalizedBaseL(ctx);
  const from = Math.min(SHADE_DARK, baseL);
  const to = Math.max(SHADE_LIGHT, baseL);
  const strength = monochromatic ? 0 : (ctx.options.shadeHueShift ?? 1);
  const referenceHue = device ? (ctx.basePerceptualHue ?? ctx.base.h) : ctx.base.h;
  // A gentle extra taper (to 65% at the ends) keeps light tints from staying neon where the gamut
  // is wide. CAM16 skips it: its colourfulness already models how saturation reads across lightness.
  const taper = monochromatic ? 0.45 : ctx.space === 'cam16' ? 0 : 0.35;

  const at = (l: number): HarmonySlot => {
    const shift = monochromatic ? 0 : shadeHueShift(referenceHue, l, baseL, strength);
    let lightness = l;
    const reach =
      l < baseL
        ? (baseL - l) / Math.max(1e-9, baseL - from)
        : (l - baseL) / Math.max(1e-9, to - baseL);
    let chroma: ChromaSpec = {
      kind: 'relative',
      value: (ctx.baseDisplayRelative ?? ctx.baseRelative) * (1 - taper * Math.min(1, reach) ** 2),
      of: 'display',
    };
    if (hsv) {
      const { l: V, c: S } = ctx.base;
      if (l <= baseL) {
        lightness = (V * l) / Math.max(1e-9, baseL);
        chroma = { kind: 'relative', value: S };
      } else {
        // Mixing with white by t lifts HSL lightness linearly; then V′ = V + t(1 − V), S′ = S·V(1 − t)/V′.
        const t = (l - baseL) / Math.max(1e-9, 1 - baseL);
        lightness = V + t * (1 - V);
        chroma = { kind: 'relative', value: (S * V * (1 - t)) / lightness };
      }
      if (monochromatic && chroma.kind === 'relative') {
        chroma = { ...chroma, value: chroma.value * (1 - taper * Math.min(1, reach) ** 2) };
      }
    }
    const out = slot(ctx, shift, lightness, chroma);
    if (device) out.perceptualHue = mod360(referenceHue + shift);
    return out;
  };
  return { from, to, base: baseL, at };
}

/** Sample a continuous ramp at evenly spaced positions, the nearest snapped onto the base. */
function sampleRamp(ctx: HarmonyContext, spec: RampSpec): HarmonySlot[] {
  const { values, baseIndex } = ramp(ctx, spec.from, spec.to, spec.base);
  return values.map((l, i) => (i === baseIndex ? slot(ctx, 0, l, BASE, true) : spec.at(l)));
}

/** Golden-angle hue stepping from the base; a seed adds deterministic lightness jitter. */
export function goldenAngleSampler(seed?: number): HarmonySampler {
  return {
    sample(index, ctx) {
      const hueOffset = mod360(index * GOLDEN_ANGLE);
      if (seed === undefined || index === 0) return { hueOffset };
      let t = Math.imul((seed ^ Math.imul(index, 0x9e3779b1)) >>> 0, 0x85ebca6b);
      t = Math.imul(t ^ (t >>> 13), 0xc2b2ae35);
      const unit = ((t ^ (t >>> 16)) >>> 0) / 4294967296;
      return { hueOffset, l: clamp(normalizedBaseL(ctx) + (unit - 0.5) * 0.2, L_MIN, L_MAX) };
    },
  };
}

const fixed = (offsets: number[]) => (ctx: HarmonyContext) => fromAnchors(ctx, offsets);
const sectors = (template: Sector[]) => (ctx: HarmonyContext) => fromSectors(ctx, template);

export const HARMONIES: HarmonyDef[] = [
  {
    id: 'analogous',
    label: 'Analogous',
    desc: 'Adjacent hues — harmonious and serene. (Matsuda V template)',
    build(ctx) {
      if (ctx.options.analogousAngle === 0) return fromAnchors(ctx, [0]);
      const offsets = centeredOffsets(
        ctx.count,
        MATSUDA.V[0]!.width,
        ctx.options.analogousAngle ?? 30,
      );
      return offsets.map((offset) => slot(ctx, offset, normalizedBaseL(ctx), BASE, offset === 0));
    },
  },
  {
    id: 'complementary',
    label: 'Complementary',
    desc: 'Colors opposite on the wheel — high contrast.',
    build: fixed([0, 180]),
  },
  {
    id: 'split-comp',
    label: 'Split-Comp',
    desc: 'A base plus two adjacent to its complement.',
    build: fixed([0, 150, 210]),
  },
  {
    id: 'triadic',
    label: 'Triadic',
    desc: 'Three evenly-spaced hues — vibrant and diverse.',
    build: fixed([0, 120, 240]),
  },
  {
    id: 'tetradic',
    label: 'Tetradic',
    desc: 'Four hues in two complementary pairs.',
    build: fixed([0, 60, 180, 240]),
  },
  {
    id: 'square',
    label: 'Square',
    desc: 'Four hues equally spaced at 90°.',
    build: fixed([0, 90, 180, 270]),
  },
  {
    id: 'monochromatic',
    label: 'Monochromatic',
    desc: 'One hue, varying saturation and lightness.',
    build(ctx) {
      if (ctx.space !== 'cielab' && ctx.space !== undefined) {
        return sampleRamp(ctx, shadeRamp(ctx, true));
      }
      const { values, baseIndex } = ramp(ctx, L_MIN, L_MAX);
      const baseL = values[baseIndex]!;
      const span = Math.max(baseL - values[0]!, values[values.length - 1]! - baseL) || 1;
      return values.map((l, i) => {
        if (i === baseIndex) return slot(ctx, 0, l, BASE, true);
        // Most saturated at the base's lightness, tapering to 55% of it at the ends.
        const value = ctx.baseRelative * (0.55 + 0.45 * (1 - Math.abs(l - baseL) / span));
        return slot(ctx, 0, l, { kind: 'relative', value });
      });
    },
    ramp: (ctx) =>
      ctx.space !== 'cielab' && ctx.space !== undefined ? shadeRamp(ctx, true) : undefined,
  },
  {
    id: 'shades',
    label: 'Shades & Tints',
    desc: 'Deep shadow to bright highlight on one hue.',
    build(ctx) {
      return sampleRamp(ctx, shadeRamp(ctx));
    },
    ramp: shadeRamp,
  },
  {
    id: 'double-split',
    label: 'Double Split',
    desc: 'Two split-complementary pairs — complex.',
    build: fixed([0, 30, 150, 210, 330]),
  },
  {
    id: 'compound',
    label: 'Compound',
    desc: 'Near-complementary — sophisticated, nuanced.',
    build: fixed([0, 30, 165, 195]),
  },
  {
    id: 'natural',
    label: 'Natural',
    desc: 'Muted, organic, naturalistic tones.',
    build(ctx) {
      const offsets = centeredOffsets(ctx.count, 80);
      const baseL = normalizedBaseL(ctx);
      let rank = 0;
      return offsets.map((offset) => {
        if (offset === 0) return slot(ctx, 0, baseL, BASE, true);
        rank++;
        // Pull a quarter of the way toward yellow-orange (hue ≈ 70°), as earth tones lean.
        const hue = ctx.base.h + offset;
        const pulled = offset + 0.25 * signedDelta(hue, 70);
        const value = 0.3 + 0.25 * ((rank * 0.6180339887498949) % 1);
        const l = clamp(baseL + alternate(rank, 0.08), L_MIN, L_MAX);
        const chroma: ChromaSpec =
          ctx.options.naturalChroma === 'ideal'
            ? { kind: 'relative', value }
            : { kind: 'relative', value, of: 'display' };
        return slot(ctx, pulled, l, chroma);
      });
    },
  },
  {
    id: 'random',
    label: 'Random',
    desc: 'Golden-ratio hue stepping — always harmonious.',
    build(ctx) {
      const sampler = ctx.options.sampler ?? goldenAngleSampler(ctx.options.seed);
      return Array.from({ length: ctx.count }, (_, i) => {
        if (i === 0) return slot(ctx, 0, normalizedBaseL(ctx), BASE, true);
        const draft = sampler.sample(i, ctx);
        return slot(ctx, draft.hueOffset, draft.l ?? normalizedBaseL(ctx), draft.chroma ?? BASE);
      });
    },
  },
  {
    id: 'matsuda_L',
    label: 'Matsuda L',
    desc: 'Large cluster + small accent at 90° — elegant asymmetry.',
    build: (ctx) =>
      fromSectors(ctx, [
        MATSUDA.L[0]!,
        { ...MATSUDA.L[1]!, center: 90 * (ctx.options.matsudaOrientation ?? 1) },
      ]),
  },
  {
    id: 'matsuda_Y',
    label: 'Matsuda Y',
    desc: 'Wide cluster with a single complement accent.',
    build: sectors(MATSUDA.Y),
  },
  {
    id: 'matsuda_X',
    label: 'Matsuda X',
    desc: 'Two opposite clusters — bold complementary spread.',
    build: sectors(MATSUDA.X),
  },
  {
    id: 'matsuda_T',
    label: 'Matsuda T',
    desc: 'Half-wheel dominance — warm or cool palette.',
    build: sectors(MATSUDA.T),
  },
  {
    id: 'matsuda_i',
    label: 'Matsuda i',
    desc: 'One narrow hue sector — near-monochrome with subtle hue drift.',
    build: sectors(MATSUDA.i),
  },
  {
    id: 'matsuda_I',
    label: 'Matsuda I',
    desc: 'Two narrow opposite sectors — tight complementary.',
    build: sectors(MATSUDA.I),
  },
  {
    id: 'matsuda_N',
    label: 'Matsuda N',
    desc: 'Neutrals only — a gray ramp at the base lightness range.',
    build(ctx) {
      const { values, baseIndex } = ramp(ctx, L_MIN, L_MAX);
      return values.map((l, i) => slot(ctx, 0, l, { kind: 'relative', value: 0 }, i === baseIndex));
    },
  },
  {
    id: 'accented-analogous',
    label: 'Accented Analogous',
    desc: 'Analogous trio plus a complementary accent.',
    build: fixed([0, -30, 30, 180]),
  },
  {
    id: 'pentadic',
    label: 'Pentadic',
    desc: 'Five hues equally spaced at 72°.',
    build: fixed([0, 72, 144, 216, 288]),
  },
  {
    id: 'hexadic',
    label: 'Hexadic',
    desc: 'Six hues equally spaced at 60°.',
    build: fixed([0, 60, 120, 180, 240, 300]),
  },
];

export const HARMONY_IDS: readonly HarmonyId[] = HARMONIES.map((h) => h.id);

export function getHarmony(id: HarmonyId): HarmonyDef {
  const def = HARMONIES.find((h) => h.id === id);
  if (!def) throw new Error(`Unknown harmony "${id}".`);
  return def;
}
