/**
 * Builds src/lib/constants/color-db/colors.sqlite in the Color-Pedia format.
 * - Hand-written entries in scripts/color-db/core/*.json are used verbatim.
 * - Hand-reviewed names in scripts/color-db/names/batch-*.json override every other name source.
 * - Every other color (Color-Pedia + named-colors CSV) is composed from the hand-authored
 *   knowledge in scripts/color-db/knowledge.ts, so all text is derived from the color itself.
 * Run with: bun run build:colors
 * Export the next colors needing a reviewed name: bun run build:colors -- --next-batch [size]
 */
import { Database } from 'bun:sqlite';
import { parquetReadObjects } from 'hyparquet';
import { compressors } from 'hyparquet-compressors';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import type { RGB } from '@/types';

import { luminance, rgbToHsl, rgbToOklab } from '@/lib/utils/color-math.utils';

import {
  CHROMA_BANDS,
  DESCRIPTION_TEMPLATES,
  FAMILIES,
  LIGHT_BANDS,
  PAIRING_TEMPLATES,
  SYMBOLISM_TEMPLATES,
  TONE_LABELS,
  USE_TEMPLATES,
  type ChromaBand,
  type FamilyKey,
  type LightBand,
} from './color-db/knowledge';

const ROOT = new URL('../src/lib/constants/', import.meta.url);
const CORE_DIR = new URL('./color-db/core/', import.meta.url);
const NAMES_DIR = new URL('./color-db/names/', import.meta.url);
const queueFileArg = process.argv.indexOf('--queue-file');
const customQueuePath = queueFileArg === -1 ? undefined : process.argv[queueFileArg + 1];
if (queueFileArg !== -1 && (!customQueuePath || customQueuePath.startsWith('--')))
  throw new Error('--queue-file requires a file path');
const QUEUE_PATH = customQueuePath ?? new URL('./color-db/names/queue.txt', import.meta.url);
const CSV_PATH = new URL('named-colors/color-names.csv', ROOT);
const PARQUET_PATH = new URL('color-pedia/color_pedia.parquet', ROOT);
const OUT_PATH = new URL('color-db/legacy-colors.sqlite', ROOT);

// Best-fit threshold for Color-Pedia's own "Contrast Level" labels (matches ~93% of them).
const LIGHT_LUMINANCE = 0.62;
const HUE_TOLERANCE = 45;

type Lab = { L: number; a: number; b: number };
type Entry = {
  name: string;
  hex: string;
  category: string;
  description: string;
  emotion: string;
  personality: string;
  mood: string;
  symbolism: string;
  useCase: string;
  keywords: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const normHex = (h: string): string => {
  const c = h.replace('#', '').trim();
  return (
    '#' +
    (c.length === 3
      ? c
          .split('')
          .map((x) => x + x)
          .join('')
      : c
    ).toUpperCase()
  );
};
const hexRgb = (hex: string): RGB => {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};
const labOf = (hex: string) => rgbToOklab(hexRgb(hex));
const lch = ({ L, a, b }: Lab) => ({
  L,
  C: Math.hypot(a, b),
  H: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360,
});
const dist = (p: Lab, q: Lab) => Math.hypot(p.L - q.L, p.a - q.a, p.b - q.b);
const hueDiff = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
const pick = <T>(arr: T[], seed: string): T => arr[hash(seed) % arr.length];
/** Up to n distinct items, deterministic per seed. */
function pickN<T>(arr: T[], n: number, seed: string): T[] {
  const out: T[] = [];
  const start = hash(seed);
  for (let i = 0; out.length < Math.min(n, arr.length); i++) {
    const v = arr[(start + i * 7) % arr.length];
    if (!out.includes(v)) out.push(v);
  }
  return out;
}
const dedupeWords = (words: string[]) => [
  ...new Map(words.filter(Boolean).map((w) => [w.toLowerCase(), w])).values(),
];
const fixArticles = (s: string) => s.replace(/\b([Aa]) (?=[aeiouAEIOU])/g, '$1n ');
const fill = (tpl: string, vars: Record<string, string>) =>
  tpl.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '');

// ─── Classification ──────────────────────────────────────────────────────────

const HUE_BINS: [number, FamilyKey][] = [
  [40, 'Red'],
  [80, 'Orange'],
  [118, 'Yellow'],
  [135, 'Lime'],
  [165, 'Green'],
  [220, 'Cyan'],
  [280, 'Blue'],
  [300, 'Indigo'],
  [330, 'Purple'],
  [352, 'Magenta'],
  [360, 'Red'],
];

function classify(lab: Lab): {
  family: FamilyKey;
  light: LightBand;
  chroma: ChromaBand;
  neutral: boolean;
} {
  const { L, C, H } = lch(lab);
  const light: LightBand =
    L < 0.3 ? 'very dark' : L < 0.45 ? 'dark' : L < 0.65 ? 'medium' : L < 0.82 ? 'light' : 'pale';
  const scale = L < 0.3 || L > 0.85 ? 0.6 : 1;
  const chroma: ChromaBand =
    C < 0.05 * scale
      ? 'grayish'
      : C < 0.09 * scale
        ? 'muted'
        : C < 0.14 * scale
          ? 'moderate'
          : C < 0.2 * scale
            ? 'strong'
            : 'vivid';

  if (C < 0.025)
    return {
      family: L < 0.18 ? 'Black' : L > 0.94 ? 'White' : 'Gray',
      light,
      chroma: 'grayish',
      neutral: true,
    };
  if (L > 0.82 && C < 0.07 && H >= 30 && H < 115)
    return { family: 'Beige', light, chroma, neutral: false };
  if (H >= 35 && H < 100 && L < 0.66 && C < 0.17)
    return { family: 'Brown', light, chroma, neutral: false };
  if (H >= 100 && H < 135 && L < 0.6) return { family: 'Olive', light, chroma, neutral: false };
  if ((H >= 330 || H < 40) && L > 0.72) return { family: 'Pink', light, chroma, neutral: false };
  let family = HUE_BINS.find(([max]) => H < max)![1];
  if (family === 'Cyan' && L < 0.65) family = 'Teal';
  return { family, light, chroma, neutral: false };
}

function undertone(lab: Lab, family: FamilyKey, neutral: boolean): string {
  const { C, H } = lch(lab);
  if (neutral) {
    if (C < 0.008) return '';
    const tint =
      H < 70
        ? 'warm'
        : H < 120
          ? 'yellow'
          : H < 170
            ? 'green'
            : H < 230
              ? 'cool aqua'
              : H < 290
                ? 'cool blue'
                : 'violet';
    return ` with a faint ${tint} tint`;
  }
  const { range, undertones } = FAMILIES[family];
  if (!range) return '';
  const width = (range[1] - range[0] + 360) % 360 || 360;
  const t = ((H - range[0] + 360) % 360) / width;
  return t < 0.33 ? ` with ${undertones[0]}` : t > 0.67 ? ` with ${undertones[1]}` : '';
}

// ─── Naming ──────────────────────────────────────────────────────────────────

// Words that read wrong on very light or very dark colors.
const DARK_ONLY = new Set([
  'Navy',
  'Garnet',
  'Ink',
  'Inkwell',
  'Obsidian',
  'Espresso',
  'Mahogany',
  'Eggplant',
  'Mulberry',
  'Petrol',
  'Spruce',
  'Forest',
  'Lapis',
  'Ultramarine',
  'Burgundy',
  'Abyss',
  'Midnight',
  'Molasses',
  'Truffle',
  'Tobacco',
  'Coal',
  'Tar',
  'Soot',
  'Void',
  'Nightfall',
  'Nightshade',
  'Deep Teal',
  'Bloodstone',
  'Army Green',
]);
const LIGHT_ONLY = new Set([
  'Sky',
  'Butter',
  'Blush',
  'Petal',
  'Lilac',
  'Cream',
  'Lemon',
  'Canary',
  'Seafoam',
  'Mint',
  'Chiffon',
  'Cotton Candy',
  'Ballet',
  'Meringue',
  'Snowdrop',
  'Vanilla',
  'Lavender',
  'Sorbet',
  'Macaron',
  'Cupcake',
  'Lullaby',
  'Frost',
  'Pearl',
  'Cloud',
  'Chalk',
  'Sugar',
  'Lemonade',
  'Custard',
  'Shallows',
  'Glacier',
]);

function fitsLightness(word: string, light: LightBand) {
  if ((light === 'light' || light === 'pale') && DARK_ONLY.has(word)) return false;
  if ((light === 'dark' || light === 'very dark') && LIGHT_ONLY.has(word)) return false;
  return true;
}

const usedNames = new Set<string>();
const claim = (name: string) => {
  const k = name.toLowerCase();
  if (!name || usedNames.has(k)) return false;
  usedNames.add(k);
  return true;
};

const tierCache = new Map<string, string[][]>();

function nameTiers(
  family: FamilyKey,
  light: LightBand,
  chroma: ChromaBand,
  neutral: boolean,
): string[][] {
  const key = `${family}|${light}|${chroma}|${neutral}`;
  const cached = tierCache.get(key);
  if (cached) return cached;
  const fam = FAMILIES[family];
  const hues = fam.hueWords.filter((w) => fitsLightness(w, light));
  const plainHues = hues.slice(0, 3);
  const nouns = fam.nameNouns.filter((w) => fitsLightness(w, light));
  const lightMods = LIGHT_BANDS[light].nameModifiers;
  const chromaMods = neutral ? [] : CHROMA_BANDS[chroma].nameModifiers;
  const mods = [...lightMods, ...chromaMods];
  const ok = (a: string, b: string) => !a.includes(b) && !b.includes(a);
  // Ordered from shortest/plainest to longest, e.g. "Misty Teal", "Soft Dusty Rose", "Misty Harbor Blue".
  const tiers: string[][] = [
    [
      ...mods.flatMap((m) => hues.filter((h) => ok(m, h)).map((h) => `${m} ${h}`)),
      ...nouns.flatMap((n) => hues.filter((h) => ok(n, h)).map((h) => `${n} ${h}`)),
    ],
    lightMods.flatMap((l) =>
      chromaMods
        .filter((c) => ok(l, c))
        .flatMap((c) => hues.filter((h) => ok(c, h)).map((h) => `${l} ${c} ${h}`)),
    ),
    mods.flatMap((m) =>
      nouns
        .filter((n) => ok(m, n))
        .flatMap((n) => plainHues.filter((h) => ok(n, h)).map((h) => `${m} ${n} ${h}`)),
    ),
    mods.flatMap((m) =>
      nouns
        .filter((n) => ok(m, n))
        .flatMap((n) =>
          hues
            .slice(3)
            .filter((h) => ok(n, h))
            .map((h) => `${m} ${n} ${h}`),
        ),
    ),
    lightMods.flatMap((l) =>
      chromaMods
        .filter((c) => ok(l, c))
        .flatMap((c) =>
          nouns.flatMap((n) => plainHues.filter((h) => ok(n, h)).map((h) => `${l} ${c} ${n} ${h}`)),
        ),
    ),
  ].filter((t) => t.length);
  tierCache.set(key, tiers);
  return tiers;
}

function composeName(
  hex: string,
  family: FamilyKey,
  light: LightBand,
  chroma: ChromaBand,
  neutral: boolean,
): string {
  const tiers = nameTiers(family, light, chroma, neutral);
  const start = hash(hex);
  for (const tier of tiers)
    for (let i = 0; i < tier.length; i++) {
      const name = tier[(start + i * 7919) % tier.length];
      if (claim(name)) return name;
    }
  const base = pick(tiers[tiers.length - 1], hex);
  stats.suffixed_names++;
  for (let n = 2; ; n++) if (claim(`${base} ${n}`)) return `${base} ${n}`;
}

// ─── Text composition ────────────────────────────────────────────────────────

/** The opposite hue on the OKLCH wheel, phrased for the color's lightness. */
function complementOf(lab: Lab, neutral: boolean, seed: string): string {
  const { L, H } = lch(lab);
  if (neutral)
    return pick(
      ['deep blue', 'warm red', 'golden yellow', 'emerald green', 'rich teal', 'burnt orange'],
      seed,
    );
  const opposite = HUE_BINS.find(([max]) => (H + 180) % 360 < max)![1];
  const tone = L < 0.45 ? 'pale' : L > 0.8 ? 'deep' : pick(['soft', 'bright', 'muted'], seed);
  return `${tone} ${FAMILIES[opposite].noun}`;
}

const temperatureOf = (lab: Lab) => {
  const { C, H } = lch(lab);
  return C < 0.01 ? 'warm or cool' : H < 110 || H >= 330 ? 'cool' : 'warm';
};

function compose(hex: string, name: string): Omit<Entry, 'name' | 'hex'> {
  const lab = labOf(hex);
  const { family, light, chroma, neutral } = classify(lab);
  const fam = FAMILIES[family];
  const lb = LIGHT_BANDS[light];
  const cb = CHROMA_BANDS[chroma];
  const s = (salt: string) => `${hex}:${salt}`;

  const toneLabel = neutral
    ? { 'very dark': 'Deep', dark: 'Dark', medium: 'Mid', light: 'Light', pale: 'Pale' }[light]
    : TONE_LABELS[light][chroma];
  const category = `${family} Family (${toneLabel} ${pick(
    fam.hueWords.filter((w) => fitsLightness(w, light)),
    s('cat'),
  )})`;

  const description = fixArticles(
    fill(pick(DESCRIPTION_TEMPLATES, s('desc')), {
      name,
      adj: pick(lb.adjectives, s('adj')),
      chroma: neutral ? 'neutral' : pick(cb.adjectives, s('chroma')),
      noun: fam.noun,
      undertone: undertone(lab, family, neutral),
      imagery: pick(fam.imagery, s('img')),
      note: pick([...lb.notes, ...(neutral ? [] : cb.notes)], s('note')),
    }),
  );

  const band = neutral || hash(s('band')) % 2 ? lb : cb;
  const emotion = dedupeWords([
    ...pickN(fam.emotions, hash(s('en')) % 3 === 0 ? 2 : 1, s('e')),
    pick(band.emotions, s('e2')),
  ]);
  const personality = dedupeWords([
    ...pickN(fam.personalities, 2, s('p')),
    ...(hash(s('pn')) % 2 ? [pick(lb.personalities, s('p2'))] : []),
  ]);
  const mood = dedupeWords([
    pick(fam.moods, s('m')),
    pick((neutral ? lb : cb).moods, s('m2')),
    ...(hash(s('mn')) % 3 === 0 ? [pick(lb.moods, s('m3'))] : []),
  ]);

  const [sym1, sym2] = pickN(fam.symbolism, 2, s('sym'));
  const symbolism = fill(pick(SYMBOLISM_TEMPLATES, s('symt')), {
    name,
    sym1,
    sym2,
    band: pick((neutral ? lb : cb).adjectives, s('symb')),
    bandSym: pick([...lb.symbolism, ...(neutral ? [] : cb.symbolism)], s('syms')),
  });

  const [use1, use2] = pickN(fam.uses, 2, s('use'));
  const pairing = fill(pick(PAIRING_TEMPLATES, s('pair')), {
    complement: complementOf(lab, neutral, s('comp')),
    neutral: temperatureOf(lab),
  });
  const useCase = fill(pick(USE_TEMPLATES, s('uset')), {
    use1,
    use2,
    use3: pick([...lb.uses, ...(neutral ? [] : cb.uses)], s('use3')),
    pairing,
  });

  const nameWords = name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z][A-Za-z'-]+$/.test(w))
    .slice(0, 3);
  const keywords = dedupeWords([
    ...nameWords,
    ...pickN(fam.keywords, 3, s('k')),
    pick(lb.keywords, s('k2')),
    ...(neutral ? [] : [pick(cb.keywords, s('k3'))]),
    emotion[0],
    mood[0],
  ]).slice(0, 9);

  return {
    category,
    description,
    emotion: emotion.join(', '),
    personality: personality.join(', '),
    mood: mood.join(', '),
    symbolism,
    useCase,
    keywords: keywords.join(', '),
  };
}

// ─── Color-Pedia name review ─────────────────────────────────────────────────

const TERM_HEX: Record<string, string> = {
  red: '#FF0000',
  orange: '#FFA500',
  yellow: '#FFFF00',
  green: '#008000',
  blue: '#0000FF',
  purple: '#800080',
  violet: '#8F00FF',
  pink: '#FFC0CB',
  brown: '#8B4513',
  cyan: '#00FFFF',
  teal: '#008080',
  magenta: '#FF00FF',
  indigo: '#4B0082',
  maroon: '#800000',
  lavender: '#B57EDC',
  olive: '#808000',
  navy: '#000080',
  turquoise: '#40E0D0',
  crimson: '#DC143C',
  gold: '#FFD700',
  golden: '#FFD700',
  coral: '#FF7F50',
  lime: '#32CD32',
  mint: '#98FF98',
  aqua: '#00FFFF',
  scarlet: '#FF2400',
  amber: '#FFBF00',
  rose: '#FF007F',
  plum: '#8E4585',
  lilac: '#C8A2C8',
  cobalt: '#0047AB',
  emerald: '#50C878',
  sapphire: '#0F52BA',
  ruby: '#E0115F',
  burgundy: '#800020',
  peach: '#FFE5B4',
  fuchsia: '#FF00FF',
  periwinkle: '#CCCCFF',
  sage: '#9CAF88',
  sienna: '#A0522D',
  mauve: '#E0B0FF',
  beige: '#F5F5DC',
  ivory: '#FFFFF0',
  cream: '#FFFDD0',
  taupe: '#483C32',
  tan: '#D2B48C',
  khaki: '#C3B091',
  salmon: '#FA8072',
  chartreuse: '#7FFF00',
  jade: '#00A86B',
  azure: '#007FFF',
  cerulean: '#007BA7',
  vermilion: '#E34234',
  ochre: '#CC7722',
  wine: '#722F37',
  cherry: '#D2042D',
  lemon: '#FFF700',
  mustard: '#FFDB58',
  rust: '#B7410E',
  copper: '#B87333',
  raspberry: '#E30B5C',
  tangerine: '#F28500',
  marigold: '#EAA221',
  mahogany: '#C04000',
  chestnut: '#954535',
  seafoam: '#93E9BE',
  aquamarine: '#7FFFD4',
  orchid: '#DA70D6',
  gray: '#808080',
  grey: '#808080',
  black: '#000000',
  white: '#FFFFFF',
  silver: '#C0C0C0',
  charcoal: '#36454F',
  slate: '#708090',
};
const TERM_LCH = Object.fromEntries(Object.entries(TERM_HEX).map(([k, h]) => [k, lch(labOf(h))]));

const colorTermsIn = (name: string) =>
  (name.toLowerCase().match(/[a-z]+/g) ?? []).filter((w) => TERM_LCH[w]);

/** True when every color word in the name roughly matches the color's hue and saturation. */
function nameFits(name: string, lab: Lab): boolean {
  const terms = colorTermsIn(name);
  if (!terms.length) return false;
  const c = lch(lab);
  return terms.every((t) => {
    const ref = TERM_LCH[t];
    if (ref.C < 0.03) return c.C < 0.06;
    if (c.C < 0.03) return false;
    if (ref.C < 0.07 && c.C > ref.C + 0.1) return false;
    return hueDiff(ref.H, c.H) <= HUE_TOLERANCE;
  });
}

function cleanPediaName(raw: string): string {
  let s = raw.trim();
  const common = s.match(/\bor\s+(.+?)\s*\(\s*common name\s*\)/i);
  if (common) s = common[1];
  s = s
    .replace(/\([^)]*\)?/g, ' ')
    .replace(/#[0-9a-f]{3,8}\b|\b(?=[0-9a-f]*\d)[0-9a-f]{6}\b|\b\d+\b/gi, ' ')
    .replace(/\b(hexadecimal|hex\s*codes?|hex|common\s*name)\b\s*:?/gi, ' ')
    .replace(/["“”]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s.,;:\-–]+|[\s.,;:\-–]+$/g, '')
    .replace(/^or\b\s*/i, '')
    .trim();
  return s.replace(/[A-Za-z][A-Za-z']*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

// ─── Load sources ────────────────────────────────────────────────────────────

const t0 = performance.now();

const core = new Map<string, Entry>();
for (const file of readdirSync(CORE_DIR).filter((f) => f.endsWith('.json'))) {
  for (const e of JSON.parse(readFileSync(new URL(file, CORE_DIR), 'utf8')) as Entry[]) {
    const hex = normHex(e.hex);
    if (core.has(hex)) throw new Error(`Duplicate core hex ${hex} (${e.name})`);
    core.set(hex, { ...e, hex });
  }
}

const csvNames = new Map<string, { name: string; good: boolean }>();
for (const raw of readFileSync(CSV_PATH, 'utf8').split(/\r?\n/).slice(1)) {
  const parts = raw.split(',');
  const hexIdx = parts.findIndex((p) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(p.trim()));
  if (hexIdx < 1) continue;
  const hex = normHex(parts[hexIdx]);
  const good = parts[hexIdx + 1]?.trim() === 'x';
  const existing = csvNames.get(hex);
  if (!existing || (good && !existing.good)) csvNames.set(hex, { name: parts[0].trim(), good });
}

const pediaRows = (await parquetReadObjects({
  file: await Bun.file(PARQUET_PATH).arrayBuffer(),
  compressors,
})) as Record<string, unknown>[];
const pedia = pediaRows.map((r) => {
  const hex = normHex(String(r['HEX Code']));
  return { hex, name: cleanPediaName(String(r['Color Name'])), lab: labOf(hex) };
});

// ─── Assign names ────────────────────────────────────────────────────────────

const allHexes = [
  ...new Set([...core.keys(), ...csvNames.keys(), ...pedia.map((p) => p.hex)]),
].sort();
const names = new Map<string, string>();
const sourceOf = new Map<string, string>();
const stats = {
  core: 0,
  reviewed_names: 0,
  csv_names: 0,
  color_pedia_names: 0,
  composed_names: 0,
  suffixed_names: 0,
};

for (const [hex, e] of core) {
  if (!claim(e.name)) throw new Error(`Duplicate core name ${e.name}`);
  names.set(hex, e.name);
  stats.core++;
}

// Reviewed batches: [{ "hex": "#RRGGBB", "name": "..." }], written by hand.
const batchFiles = readdirSync(NAMES_DIR)
  .filter((f) => /^batch-\d+\.json$/.test(f))
  .sort();
const reviewBatches = batchFiles.map((file) => ({
  file,
  content: readFileSync(new URL(file, NAMES_DIR), 'utf8'),
}));
const candidateArg = process.argv.indexOf('--candidate');
if (candidateArg !== -1) {
  const candidatePath = process.argv[candidateArg + 1];
  if (!candidatePath || candidatePath.startsWith('--'))
    throw new Error('--candidate requires a JSON file path');
  reviewBatches.push({ file: candidatePath, content: readFileSync(candidatePath, 'utf8') });
}
const fitWarnings: string[] = [];
const reviewedByName = new Map<string, string>();
for (const { file, content } of reviewBatches) {
  for (const { hex: rawHex, name } of JSON.parse(content) as { hex: string; name: string }[]) {
    const hex = normHex(rawHex);
    if (core.has(hex)) throw new Error(`${file}: ${hex} is a core color`);
    if (names.has(hex)) throw new Error(`${file}: ${hex} was already reviewed`);
    if (!claim(name)) throw new Error(`${file}: name "${name}" (${hex}) is already used`);
    if (/[a-z]/i.test(name) && colorTermsIn(name).length && !nameFits(name, labOf(hex)))
      fitWarnings.push(`${file}: "${name}" may not match ${hex}`);
    names.set(hex, name);
    reviewedByName.set(name.toLowerCase(), hex);
    stats.reviewed_names++;
  }
}

// A reviewed name must not take a curated CSV name away from a different color.
const collisions = [...csvNames]
  .filter(([hex, { name }]) => {
    const owner = reviewedByName.get(name.toLowerCase());
    return owner && owner !== hex && !reviewedByName.has(names.get(hex)?.toLowerCase() ?? '');
  })
  .map(
    ([hex, { name }]) =>
      `"${name}" belongs to ${hex} in the CSV but is used for ${reviewedByName.get(name.toLowerCase())}`,
  );
if (collisions.length)
  throw new Error(`Reviewed names collide with CSV names:\n${collisions.join('\n')}`);

if (process.argv.includes('--export-name-owners')) {
  const owners = new Map([...csvNames].map(([hex, { name }]) => [name.toLowerCase(), hex]));
  for (const [hex, name] of names) owners.set(name.toLowerCase(), hex);
  console.log(JSON.stringify([...owners]));
  process.exit(0);
}

if (process.argv.includes('--check-names')) {
  const candidateWarnings = fitWarnings.filter(
    (warning) => candidateArg !== -1 && warning.startsWith(`${process.argv[candidateArg + 1]}:`),
  );
  for (const warning of candidateWarnings) console.warn(warning);
  console.log(
    `Validated ${stats.reviewed_names} reviewed names; ${candidateWarnings.length} candidate fit warnings.`,
  );
  process.exit(0);
}

for (const [hex, { name }] of csvNames) {
  if (names.has(hex) || !claim(name)) continue;
  names.set(hex, name);
  sourceOf.set(hex, 'named-colors');
  stats.csv_names++;
}

// Each accurate Color-Pedia name goes to the single color closest to that name's average color.
const byPediaName = new Map<string, typeof pedia>();
for (const p of pedia) {
  if (names.has(p.hex) || !nameFits(p.name, p.lab)) continue;
  const k = p.name.toLowerCase();
  (byPediaName.get(k) ?? byPediaName.set(k, []).get(k)!).push(p);
}
for (const group of byPediaName.values()) {
  const n = group.length;
  const mean = group.reduce(
    (m, p) => ({ L: m.L + p.lab.L / n, a: m.a + p.lab.a / n, b: m.b + p.lab.b / n }),
    { L: 0, a: 0, b: 0 },
  );
  const medoid = group.reduce((best, p) => (dist(p.lab, mean) < dist(best.lab, mean) ? p : best));
  if (!claim(medoid.name)) continue;
  names.set(medoid.hex, medoid.name);
  sourceOf.set(medoid.hex, 'color-pedia');
  stats.color_pedia_names++;
}

for (const hex of allHexes) {
  if (names.has(hex)) continue;
  const { family, light, chroma, neutral } = classify(labOf(hex));
  names.set(hex, composeName(hex, family, light, chroma, neutral));
  sourceOf.set(hex, 'composed');
  stats.composed_names++;
}

for (const w of fitWarnings.slice(0, 25)) console.warn(w);

// Pending colors are ordered by family, then hue, then lightness so each batch covers one region of color.
const nextBatchArg = process.argv.indexOf('--next-batch');
if (nextBatchArg !== -1) {
  const size = Number(process.argv[nextBatchArg + 1]) || 300;
  const familyOrder = Object.keys(FAMILIES);
  const pending = [...sourceOf.keys()]
    .map((hex) => {
      const lab = labOf(hex);
      const c = classify(lab);
      const { L, C, H } = lch(lab);
      return { hex, ...c, L, C, H };
    })
    .sort(
      (a, b) =>
        familyOrder.indexOf(a.family) - familyOrder.indexOf(b.family) || a.H - b.H || a.L - b.L,
    )
    .slice(0, size)
    .map((p) =>
      [
        p.hex,
        names.get(p.hex),
        sourceOf.get(p.hex),
        p.family,
        `${p.light}/${p.neutral ? 'neutral' : p.chroma}`,
        `L${p.L.toFixed(2)} C${p.C.toFixed(3)} H${p.H.toFixed(0)}`,
      ].join(' | '),
    );
  writeFileSync(
    QUEUE_PATH,
    `hex | current name | source | family | tone | oklch\n${pending.join('\n')}\n`,
  );
  console.log(
    `Wrote ${pending.length} pending colors to ${QUEUE_PATH instanceof URL ? fileURLToPath(QUEUE_PATH) : QUEUE_PATH}; ${sourceOf.size} colors still need a reviewed name.`,
  );
  process.exit(0);
}

// ─── Write SQLite ────────────────────────────────────────────────────────────

const outFile = fileURLToPath(OUT_PATH);
mkdirSync(new URL('.', OUT_PATH), { recursive: true });
for (const ext of ['', '-wal', '-shm', '-journal']) rmSync(outFile + ext, { force: true });
const db = new Database(outFile, { create: true });
db.run('PRAGMA journal_mode = OFF');
db.run(`
CREATE TABLE colors (
  "Color Name"     TEXT NOT NULL UNIQUE,
  "HEX Code"       TEXT NOT NULL PRIMARY KEY,
  "Category"       TEXT NOT NULL,
  "Description"    TEXT NOT NULL,
  "Emotion"        TEXT NOT NULL,
  "Personality"    TEXT NOT NULL,
  "Mood"           TEXT NOT NULL,
  "Symbolism"      TEXT NOT NULL,
  "Use Case"       TEXT NOT NULL,
  "Keywords"       TEXT NOT NULL,
  "R"              INTEGER NOT NULL,
  "G"              INTEGER NOT NULL,
  "B"              INTEGER NOT NULL,
  "Hue"            REAL NOT NULL,
  "Saturation"     REAL NOT NULL,
  "Lightness"      REAL NOT NULL,
  "Contrast Level" TEXT NOT NULL
) WITHOUT ROWID;
`);

const r2 = (n: number) => Math.round(n * 100) / 100;
const insert = db.prepare(`INSERT INTO colors VALUES (${Array(17).fill('?').join(',')})`);
db.transaction(() => {
  for (const hex of allHexes) {
    const name = names.get(hex)!;
    const e = core.get(hex) ?? { name, hex, ...compose(hex, name) };
    const rgb = hexRgb(hex);
    const hsl = rgbToHsl(rgb);
    insert.run(
      e.name,
      hex,
      e.category,
      e.description,
      e.emotion,
      e.personality,
      e.mood,
      e.symbolism,
      e.useCase,
      e.keywords,
      rgb.r,
      rgb.g,
      rgb.b,
      r2(hsl.h),
      r2(hsl.s),
      r2(hsl.l),
      luminance(rgb) > LIGHT_LUMINANCE ? 'Light' : 'Dark',
    );
  }
})();
db.run('VACUUM');

const distinct = (col: string) =>
  (db.query(`SELECT count(DISTINCT "${col}") n FROM colors`).get() as { n: number }).n;
console.table({
  ...stats,
  awaiting_review: sourceOf.size,
  total_colors: allHexes.length,
  distinct_descriptions: distinct('Description'),
  distinct_symbolism: distinct('Symbolism'),
  distinct_use_cases: distinct('Use Case'),
  distinct_keywords: distinct('Keywords'),
});
db.close();
console.log(
  `Wrote ${outFile} (${(Bun.file(outFile).size / 1048576).toFixed(1)} MB) in ${((performance.now() - t0) / 1000).toFixed(1)}s`,
);
