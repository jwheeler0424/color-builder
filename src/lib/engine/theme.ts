import type { DisplayGamutId } from './gamuts/types.ts';

import { colorValue, renderColor, type ColorValue } from './color.ts';
import { fitHex } from './output.ts';
import { parseColor } from './parse.ts';
import { OKLAB } from './spaces/oklab.ts';
import { clamp, lchToXyz, xyzToLch, type Lch } from './spaces/types.ts';

export type UtilityRole = 'info' | 'success' | 'warning' | 'error' | 'neutral' | 'focus';

export const UTILITY_ROLES: readonly UtilityRole[] = [
  'info',
  'success',
  'warning',
  'error',
  'neutral',
  'focus',
];

export interface UtilityColor {
  role: UtilityRole;
  label: string;
  description: string;
  hex: string;
  value?: ColorValue;
}

export type UtilityColorSet = Record<UtilityRole, UtilityColor>;

export interface SemanticToken {
  name: string;
  light: string;
  dark: string;
  description: string;
}

export interface UtilityTokens {
  base: string;
  light: string;
  dark: string;
  subtle: string;
  subtleDark: string;
}

export interface ThemeTokenSet {
  semantic: SemanticToken[];
  utility: Record<UtilityRole, UtilityTokens>;
  palette: { name: string; hex: string }[];
}

const UTILITY_DEFS: Record<UtilityRole, { label: string; description: string }> = {
  info: { label: 'Info', description: 'Informational messages, tooltips, hints' },
  success: { label: 'Success', description: 'Confirmations, completed states, positive actions' },
  warning: { label: 'Warning', description: 'Cautions, pending states, non-critical alerts' },
  error: { label: 'Error', description: 'Destructive actions, validation failures, danger' },
  neutral: { label: 'Neutral', description: 'Disabled states, placeholders, secondary content' },
  focus: { label: 'Focus', description: 'Keyboard focus rings — matches primary palette color' },
};

/** OKLCH hue centre and tolerance arc of each semantic role. */
const ROLE_HUES: Record<'info' | 'success' | 'warning' | 'error', { center: number; arc: number }> =
  {
    info: { center: 220, arc: 60 },
    success: { center: 148, arc: 50 },
    warning: { center: 75, arc: 35 },
    error: { center: 27, arc: 35 },
  };

export type ThemeColorInput = string | ColorValue;
const readColor = (input: ThemeColorInput): ColorValue =>
  typeof input === 'string' ? parseColor(input) : colorValue(input.xyz, input.alpha, input.display);
const oklch = (input: ThemeColorInput): Lch => xyzToLch(OKLAB, readColor(input).xyz);
const hexOf = (l: number, c: number, h: number) => fitHex(OKLAB, { l, c, h });
const hueDistance = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
};
const mostChromatic = (colors: Lch[]) =>
  colors.reduce((best, c) => (c.c > best.c ? c : best), colors[0]!);

/**
 * Semantic state colors drawn from a palette (hex). Each role takes the hue of the palette color
 * that best fits its hue arc and the palette's lightness/chroma, or leans the nearest palette hue
 * toward the role's canonical hue; neutral and focus follow the most chromatic color.
 */
export function generateUtilityColors(
  palette: readonly ThemeColorInput[],
  display: DisplayGamutId = palette.length ? readColor(palette[0]!).display : 'srgb',
): UtilityColorSet {
  const colors = palette.map(oklch);
  const n = colors.length;
  const avgL = n ? colors.reduce((s, c) => s + c.l, 0) / n : 0.55;
  const avgC = n ? colors.reduce((s, c) => s + c.c, 0) / n : 0.12;
  const primary = n ? mostChromatic(colors) : { l: 0.55, c: 0.15, h: 230 };
  // Very light or dark palettes pull utility colors back toward the readable middle.
  const targetL = clamp(avgL > 0.68 ? avgL - 0.14 : avgL < 0.38 ? avgL + 0.14 : avgL, 0.44, 0.64);
  const targetC = clamp(avgC * 0.9 + 0.04, 0.1, 0.22);

  const roleHue = (role: keyof typeof ROLE_HUES): number => {
    const { center, arc } = ROLE_HUES[role];
    if (!n) return center;
    let best: { h: number; score: number } | undefined;
    for (const c of colors) {
      const distance = hueDistance(c.h, center);
      if (distance > arc) continue;
      const score =
        (1 - distance / arc) * 0.5 +
        (1 - Math.abs(c.l - targetL)) * 0.3 +
        (1 - Math.abs(c.c - targetC)) * 0.2;
      if (!best || score > best.score) best = { h: c.h, score };
    }
    if (best) return best.h;
    let nearest = colors[0]!.h;
    for (const c of colors) {
      if (hueDistance(c.h, center) < hueDistance(nearest, center)) nearest = c.h;
    }
    const keep = clamp(1 - hueDistance(nearest, center) / 120, 0, 0.6);
    const delta = ((center - nearest + 540) % 360) - 180;
    return (nearest + delta * (1 - keep) + 360) % 360;
  };

  const make = (role: UtilityRole, l: number, c: number, h: number): UtilityColor => {
    const rendition = renderColor(colorValue(lchToXyz(OKLAB, { l, c, h }), 1, display));
    return {
      role,
      ...UTILITY_DEFS[role],
      hex: rendition.hex,
      value: colorValue(rendition.xyz, 1, display),
    };
  };
  const warningH = roleHue('warning');
  // Amber reads bright, so it sits darker to carry the same weight as the other roles.
  const warningL = clamp(
    targetL - Math.max(0, 1 - hueDistance(warningH, 75) / 40) * 0.08,
    0.42,
    0.62,
  );

  return {
    info: make('info', targetL, targetC, roleHue('info')),
    success: make('success', targetL, targetC, roleHue('success')),
    warning: make('warning', warningL, clamp(targetC * 1.05, 0.09, 0.2), warningH),
    error: make('error', targetL, clamp(targetC * 1.1, 0.12, 0.24), roleHue('error')),
    neutral: make(
      'neutral',
      clamp(targetL + 0.05, 0.5, 0.68),
      clamp(primary.c * 0.08, 0.006, 0.035),
      primary.h,
    ),
    focus: make('focus', clamp(primary.l, 0.5, 0.7), clamp(primary.c, 0.12, 0.3), primary.h),
  };
}

/** `generated`, except for the roles in `keep`, which stay as they are in `existing`. */
export function mergeUtilityColors(
  existing: UtilityColorSet,
  generated: UtilityColorSet,
  keep: ReadonlySet<UtilityRole>,
): UtilityColorSet {
  const merged = { ...generated };
  for (const role of keep) merged[role] = existing[role];
  return merged;
}

export function regenerateUtilityColors(
  palette: readonly ThemeColorInput[],
  existing: UtilityColorSet,
  keep: ReadonlySet<UtilityRole> = new Set(),
  random: () => number = Math.random,
): UtilityColorSet {
  if (UTILITY_ROLES.every((role) => keep.has(role))) return existing;
  const generated = generateUtilityColors(palette);
  const result = { ...existing };
  for (const role of UTILITY_ROLES) {
    if (keep.has(role)) continue;
    const base = oklch(generated[role].value ?? generated[role].hex);
    const direction = random() < 0.5 ? -1 : 1;
    const l = clamp(base.l + direction * (0.025 + random() * 0.04), 0.42, 0.72);
    const c = clamp(
      base.c * (0.88 + random() * 0.24),
      role === 'neutral' ? 0.006 : 0.08,
      role === 'neutral' ? 0.035 : role === 'focus' ? 0.3 : 0.26,
    );
    const h =
      (base.h + (role === 'neutral' || role === 'focus' ? 0 : (random() - 0.5) * 12) + 360) % 360;
    const display = generated[role].value?.display ?? 'srgb';
    let value = colorValue(lchToXyz(OKLAB, { l, c, h }), 1, display);
    let rendition = renderColor(value);
    if (rendition.hex.toLowerCase() === existing[role].hex.toLowerCase()) {
      const previous = oklch(existing[role].value ?? existing[role].hex);
      value = colorValue(
        lchToXyz(OKLAB, {
          l: clamp(previous.l + (previous.l >= 0.58 ? -0.08 : 0.08), 0.42, 0.72),
          c: base.c,
          h: base.h,
        }),
        1,
        display,
      );
      rendition = renderColor(value);
    }
    result[role] = {
      ...generated[role],
      hex: rendition.hex,
      value: colorValue(rendition.xyz, 1, display),
    };
  }
  return result;
}

/** Coarse OKLCH hue-bucket names for token slugs. */
function hueName({ l, c, h }: Lch): string {
  if (c < 0.04) return l > 0.75 ? 'light-gray' : l < 0.3 ? 'dark-gray' : 'gray';
  if (h < 30 || h >= 340) return 'red';
  if (h < 60) return 'orange';
  if (h < 110) return 'yellow';
  if (h < 160) return 'green';
  if (h < 220) return 'teal';
  if (h < 270) return 'blue';
  if (h < 310) return 'purple';
  return 'pink';
}

/** Token names for palette colors: the two most chromatic are primary and secondary, the rest by hue. */
export function semanticSlotNames(palette: readonly ThemeColorInput[]): string[] {
  const colors = palette.map(oklch);
  const names = new Array<string>(colors.length);
  const used = new Set<string>();
  colors
    .map((c, i) => ({ c, i }))
    .sort((x, y) => y.c.c - x.c.c)
    .forEach(({ c, i }, rank) => {
      const name = rank === 0 ? 'primary' : rank === 1 ? 'secondary' : hueName(c);
      let unique = name;
      for (let k = 2; used.has(unique); k++) unique = `${name}-${k}`;
      used.add(unique);
      names[i] = unique;
    });
  return names;
}

/**
 * A shadcn/ui-style light and dark token set: near-neutral surfaces tinted with the most chromatic
 * palette hue, brand tokens from that color, destructive from the error role, and per-role
 * utility variants.
 */
export function deriveThemeTokens(
  palette: readonly ThemeColorInput[],
  utility: UtilityColorSet,
): ThemeTokenSet {
  if (!palette.length)
    return { semantic: [], utility: {} as ThemeTokenSet['utility'], palette: [] };
  const display = readColor(palette[0]!).display;
  const hexOf = (l: number, c: number, h: number) => {
    const rendition = renderColor(colorValue(lchToXyz(OKLAB, { l, c, h }), 1, display));
    return display === 'srgb' ? rendition.hex : rendition.css;
  };
  const p = mostChromatic(palette.map(oklch));
  const tint = clamp(p.c * 0.055, 0.005, 0.015);
  const neutral = (l: number, c = tint) => hexOf(clamp(l, 0.01, 0.995), c, p.h);
  const brand = (l: number, c: number) => hexOf(l, c, p.h);
  const elevatedDark = (level: number) =>
    neutral(0.08 + level * 0.028, clamp(p.c * (0.04 + level * 0.012), 0.004, 0.025));

  const primaryLight = brand(clamp(p.l, 0.26, 0.4), clamp(p.c, 0.14, 0.3));
  const primaryDark = brand(clamp(p.l + 0.36, 0.62, 0.82), clamp(p.c * 0.88, 0.1, 0.28));
  const e = oklch(utility.error.value ?? utility.error.hex);
  const err = (l: number, c: number) => hexOf(l, c, e.h);
  const text = neutral(0.1);
  const textDark = neutral(0.94);
  const onColor = neutral(0.985, 0.004);

  const rows: Array<[string, string, string, string]> = [
    ['--background', neutral(0.99), elevatedDark(0), 'Page / canvas background (60% dominant)'],
    ['--foreground', text, textDark, 'Default body text'],
    [
      '--surface-dim',
      neutral(0.972),
      elevatedDark(1),
      'Subtle bg: striped rows, aside panels, code wells',
    ],
    ['--surface-dim-foreground', neutral(0.25), neutral(0.8), 'Text on dim surface'],
    ['--card', neutral(0.955), elevatedDark(2), 'Card / content block background'],
    ['--card-foreground', text, textDark, 'Card text'],
    [
      '--card-raised',
      neutral(0.935),
      elevatedDark(3),
      'Raised card, sidebar, drawer (slightly elevated)',
    ],
    ['--card-raised-foreground', text, textDark, 'Text on raised card'],
    ['--popover', neutral(0.98), elevatedDark(5), 'Popover, tooltip, dropdown, modal background'],
    ['--popover-foreground', text, textDark, 'Popover text'],
    [
      '--primary',
      primaryLight,
      primaryDark,
      'Primary CTA: buttons, links, active nav (use sparingly — 10%)',
    ],
    [
      '--primary-foreground',
      onColor,
      neutral(0.12, 0.01),
      'Text/icon on primary (always high-contrast)',
    ],
    [
      '--primary-container',
      brand(0.92, clamp(p.c * 0.38, 0.03, 0.1)),
      brand(0.24, clamp(p.c * 0.35, 0.03, 0.09)),
      'Primary container: large sections, hero bg, secondary CTA surface',
    ],
    [
      '--primary-container-foreground',
      brand(0.2, clamp(p.c * 0.5, 0.06, 0.16)),
      brand(0.88, clamp(p.c * 0.45, 0.05, 0.14)),
      'Text on primary-container (brand-tinted, not full primary)',
    ],
    ['--secondary', neutral(0.96), neutral(0.18), 'Secondary buttons, less-prominent surfaces'],
    ['--secondary-foreground', neutral(0.14), neutral(0.93), 'Text on secondary'],
    [
      '--muted',
      neutral(0.94),
      neutral(0.2),
      'Muted surface: disabled states, placeholder backgrounds',
    ],
    [
      '--muted-foreground',
      neutral(0.46),
      neutral(0.62),
      'Secondary / placeholder text (reduced emphasis)',
    ],
    [
      '--accent',
      brand(0.935, clamp(p.c * 0.38, 0.03, 0.11)),
      brand(0.24, clamp(p.c * 0.38, 0.03, 0.1)),
      'Hover surface, selected state, highlight chip bg',
    ],
    ['--accent-foreground', neutral(0.14), neutral(0.93), 'Text on accent surface'],
    [
      '--destructive',
      err(clamp(e.l, 0.42, 0.52), clamp(e.c, 0.18, 0.28)),
      err(clamp(e.l + 0.12, 0.56, 0.72), clamp(e.c * 0.88, 0.14, 0.26)),
      'Error / delete actions (filled)',
    ],
    ['--destructive-foreground', onColor, onColor, 'Text on destructive'],
    [
      '--destructive-subtle',
      err(0.94, clamp(e.c * 0.28, 0.03, 0.08)),
      err(0.18, clamp(e.c * 0.28, 0.03, 0.07)),
      'Error alert background / inline error tint',
    ],
    [
      '--border',
      neutral(0.86),
      neutral(0.26),
      'Default divider / border — use sparingly (shadow often better)',
    ],
    [
      '--border-strong',
      neutral(0.72),
      neutral(0.4),
      'High-emphasis border: active inputs, selected cards',
    ],
    ['--input', neutral(0.86), neutral(0.24), 'Form input border (normal state)'],
    [
      '--ring',
      primaryLight,
      primaryDark,
      'Keyboard focus ring — always matches primary brand color',
    ],
  ];

  const utilityTokens = {} as ThemeTokenSet['utility'];
  for (const role of UTILITY_ROLES) {
    const input = readColor(utility[role].value ?? utility[role].hex);
    const base = display === 'srgb' ? utility[role].hex : renderColor(input).css;
    const { l, c, h } = oklch(base);
    const warning = role === 'warning';
    utilityTokens[role] = {
      base,
      light: hexOf(clamp(l + (warning ? -0.1 : -0.06), 0.34, 0.55), clamp(c * 1.05, 0.1, 0.26), h),
      dark: hexOf(clamp(l + (warning ? 0.04 : 0.08), 0.5, 0.78), clamp(c * 0.88, 0.08, 0.22), h),
      subtle: hexOf(0.945, clamp(c * 0.3, 0.02, 0.07), h),
      subtleDark: hexOf(0.16, clamp(c * 0.32, 0.02, 0.08), h),
    };
  }

  const names = semanticSlotNames(palette);
  return {
    semantic: rows.map(([name, light, dark, description]) => ({ name, light, dark, description })),
    utility: utilityTokens,
    palette: palette.map((input, i) => {
      const value = readColor(input);
      const rendition = renderColor(value);
      return {
        name: names[i]!,
        hex: value.display === 'srgb' && value.alpha === 1 ? rendition.hex : rendition.css,
      };
    }),
  };
}
