// color-math-scale.ts
// Scale generation, palette scoring, and utility color generation.
// Extracted from color-math.ts for maintainability.

import type { ColorStop, UtilityRole, UtilityColorSet } from '@/types';

import * as engine from '@/lib/engine/browser';

import { colorToStop, hexToStop, stopToColor } from './color-stop.utils';

// ─── Scale Generation ─────────────────────────────────────────────────────────

/**
 * Generate a perceptually uniform tint/shade scale in OKLCH space.
 *
 * Lightness follows a smooth curve:
 *   L(t) = Lmax - (Lmax - Lmin) * t^γ   (γ ≈ 0.9 keeps midtones vivid)
 *
 * Chroma uses a tent curve — peaks at step 400–500 (vibrant midtones),
 * falls to 0 at the extremes (near-white and near-black are always neutral).
 *
 * Hue is held constant, which is exactly what OKLCH guarantees — no hue
 * drift as you lighten or darken (unlike HSL).
 */
export function generateScale(hex: string) {
  const value = engine.parseColor(hex);
  return engine
    .generateScale({ baseColor: { xyz: value.xyz }, display: value.display })
    .map(({ step, color }) => ({
      step,
      ...colorToStop(engine.colorValue(color.xyz, value.alpha, value.display)),
    }));
}

// ─── Palette Scoring ──────────────────────────────────────────────────────────

export interface PaletteScore {
  balance: number; // Hue spread 0–100
  accessibility: number; // % pairs passing AA
  harmony: number; // Saturation consistency 0–100
  uniqueness: number; // Average OKLab distance 0–100
  overall: number;
}

export function scorePalette(slots: { color: Pick<ColorStop, 'hex' | 'value'> }[]): PaletteScore {
  return engine.scorePalette(
    slots.map((slot) => (slot.color.value ?? engine.parseColor(slot.color.hex)).xyz),
  );
}

// ─── Utility Color Generation ─────────────────────────────────────────────────

const UTILITY_DEFS: Record<UtilityRole, { label: string; description: string; anchorHue: number }> =
  {
    info: {
      label: 'Info',
      description: 'Informational messages, tooltips, hints',
      anchorHue: 231,
    },
    success: {
      label: 'Success',
      description: 'Confirmations, completed states, positive actions',
      anchorHue: 142,
    },
    warning: {
      label: 'Warning',
      description: 'Cautions, pending states, non-critical alerts',
      anchorHue: 85,
    },
    error: {
      label: 'Error',
      description: 'Destructive actions, validation failures, danger',
      anchorHue: 25,
    },
    neutral: {
      label: 'Neutral',
      description: 'Disabled states, placeholders, secondary content',
      anchorHue: 0,
    },
    focus: {
      label: 'Focus',
      description: 'Keyboard focus rings — matches primary palette color',
      anchorHue: 0,
    },
  };

/**
 * Derive utility colors from the palette using OKLCH space.
 *
 * All semantic hues (info/success/warning/error) are fixed perceptual angles
 * in OKLCH's hue wheel, then lightly nudged away from any existing palette color
 * to avoid clashing. Lightness and chroma are computed at a consistent
 * perceptual level across all hues.
 *
 * Focus color: derived directly from the most-saturated palette slot (primary),
 * keeping its exact hue and chroma, only normalising lightness to ~0.62 so it
 * reads clearly as a focus ring at any background.
 */
export function generateUtilityColors(slots: { color: ColorStop }[]): UtilityColorSet {
  return adaptUtilities(engine.generateUtilityColors(slots.map((slot) => stopToColor(slot.color))));
}

function adaptUtilities(colors: engine.UtilityColorSet): UtilityColorSet {
  return Object.fromEntries(
    engine.UTILITY_ROLES.map((role) => {
      const entry = colors[role];
      return [
        role,
        {
          ...UTILITY_DEFS[role],
          ...entry,
          color: entry.value ? colorToStop(entry.value) : hexToStop(entry.hex),
          locked: false,
        },
      ];
    }),
  ) as unknown as UtilityColorSet;
}

export function regenerateUtilityColors(
  slots: Parameters<typeof generateUtilityColors>[0],
  existing: UtilityColorSet,
  random: () => number = Math.random,
): UtilityColorSet {
  const roles = Object.keys(existing) as UtilityRole[];
  if (roles.every((role) => existing[role].locked)) return existing;
  const inputs = Object.fromEntries(
    roles.map((role) => [
      role,
      {
        role,
        label: existing[role].label,
        description: existing[role].description,
        hex: existing[role].color.hex,
        value: stopToColor(existing[role].color),
      },
    ]),
  ) as engine.UtilityColorSet;
  const keep = new Set(roles.filter((role) => existing[role].locked));
  return mergeUtilityColors(
    existing,
    adaptUtilities(
      engine.regenerateUtilityColors(
        slots.map((slot) => stopToColor(slot.color)),
        inputs,
        keep,
        random,
      ),
    ),
  );
}

export function mergeUtilityColors(
  existing: UtilityColorSet,
  generated: UtilityColorSet,
): UtilityColorSet {
  const roles: UtilityRole[] = ['info', 'success', 'warning', 'error', 'neutral', 'focus'];
  const result = {} as UtilityColorSet;
  for (const role of roles) result[role] = existing[role].locked ? existing[role] : generated[role];
  return result;
}
