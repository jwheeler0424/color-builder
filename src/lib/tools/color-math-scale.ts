// color-math-scale.ts
// Scale generation, palette scoring, and utility color generation.
// Extracted from color-math.ts for maintainability.

import type {
  RGB,
  HSL,
  UtilityRole,
  UtilityColor,
  UtilityColorSet,
} from "@/types";
import {
  hexToRgb,
  colorDist,
  rgbToHex,
  rgbToHsl,
  rgbToOklch,
  oklchToRgb,
  contrastRatio,
  clamp,
} from "@/lib/utils/color-math.utils";

// ─── Scale Generation ─────────────────────────────────────────────────────────

const SCALE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

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
  const base = rgbToOklch(hexToRgb(hex));

  // Lightness range: 0.97 (near white) → 0.10 (near black)
  const Lmax = 0.97,
    Lmin = 0.1;
  // Chroma: use input chroma but cap to sRGB-safe range (~0.32)
  const Cbase = Math.min(base.C, 0.32);

  return SCALE_STEPS.map((step) => {
    const t = step / 1000; // 0.05 → 0.95

    // Lightness: power curve (γ=0.85) for good visual spacing
    const L = clamp(Lmax - (Lmax - Lmin) * Math.pow(t, 0.85), 0.02, 0.98);

    // Chroma tent: peaks at t=0.4 (step 400), zero at extremes
    // Uses a smooth parabola: C(t) = Cbase * 4t(1-t) * scale
    const chromaTent = 4 * t * (1 - t); // 0 at ends, 1 at t=0.5
    const chromaScale = 1.1 - 0.3 * Math.abs(t - 0.4); // slightly favour step 400
    const C = clamp(Cbase * chromaTent * chromaScale, 0, 0.37);

    const rgb = oklchToRgb({ L, C, H: base.H });
    const hsl = rgbToHsl(rgb);
    return { step, hex: rgbToHex(rgb), rgb, hsl };
  });
}

// ─── Palette Scoring ──────────────────────────────────────────────────────────

export interface PaletteScore {
  balance: number; // Hue spread 0–100
  accessibility: number; // % pairs passing AA
  harmony: number; // Saturation consistency 0–100
  uniqueness: number; // Average OKLab distance 0–100
  overall: number;
}

export function scorePalette(
  slots: { color: { hex: string } }[],
): PaletteScore {
  if (slots.length < 2)
    return {
      balance: 0,
      accessibility: 0,
      harmony: 0,
      uniqueness: 0,
      overall: 0,
    };

  // Always derive from hex — immune to stale stored rgb/hsl values
  const rgbs = slots.map((s) => hexToRgb(s.color.hex));
  const oklchs = rgbs.map((rgb) => rgbToOklch(rgb));

  // ── Hue balance: std-dev of circular hue gaps ────────────────────────────
  const hues = oklchs.map((c) => c.H).sort((a, b) => a - b);
  const gaps = hues.map(
    (h, i) => (hues[(i + 1) % hues.length] - h + 360) % 360,
  );
  const idealGap = 360 / hues.length;
  const gapDev = Math.sqrt(
    gaps.reduce((acc, g) => acc + (g - idealGap) ** 2, 0) / gaps.length,
  );
  const balance = Math.round(Math.max(0, 100 - (gapDev / idealGap) * 100));

  // ── Accessibility: how many colors can display readable text ────────────
  // Measures each swatch's best contrast (on white OR black), not palette-vs-palette.
  // Harmonic palettes intentionally cluster luminance so color-vs-color contrast
  // is expected to be low — this dimension instead asks: is each color usable in a UI?
  // Score = % of colors that achieve AA (4.5:1) on at least one background.
  const WHITE = { r: 255, g: 255, b: 255 } as RGB;
  const BLACK = { r: 0, g: 0, b: 0 } as RGB;
  const aaCount = rgbs.filter(
    (rgb) =>
      Math.max(contrastRatio(rgb, WHITE), contrastRatio(rgb, BLACK)) >= 4.5,
  ).length;
  const accessibility = Math.round((aaCount / rgbs.length) * 100);

  // ── Saturation harmony: consistency of chroma in OKLCH ──────────────────
  // Use OKLCH chroma (perceptually uniform) instead of HSL saturation
  const chromas = oklchs.map((c) => c.C);
  const avgC = chromas.reduce((a, b) => a + b, 0) / chromas.length;
  const chromaDev = Math.sqrt(
    chromas.reduce((acc, c) => acc + (c - avgC) ** 2, 0) / chromas.length,
  );
  // Normalise: max expected deviation ~0.15 (wide range) → score 0
  const harmony = Math.round(Math.max(0, 100 - (chromaDev / 0.15) * 100));

  // ── Uniqueness: average pairwise OKLab distance, normalised ─────────────
  let totalDist = 0,
    totalPairs = 0;
  for (let i = 0; i < rgbs.length; i++)
    for (let j = i + 1; j < rgbs.length; j++) {
      totalDist += colorDist(rgbs[i], rgbs[j]);
      totalPairs++;
    }
  const avgDist = totalDist / totalPairs;
  const uniqueness = Math.round(Math.min(100, avgDist * 500));

  const overall = Math.round(
    (balance + accessibility + harmony + uniqueness) / 4,
  );
  return { balance, accessibility, harmony, uniqueness, overall };
}

// ─── Utility Color Generation ─────────────────────────────────────────────────

const UTILITY_DEFS: Record<
  UtilityRole,
  { label: string; description: string; anchorHue: number }
> = {
  info: {
    label: "Info",
    description: "Informational messages, tooltips, hints",
    anchorHue: 231,
  },
  success: {
    label: "Success",
    description: "Confirmations, completed states, positive actions",
    anchorHue: 142,
  },
  warning: {
    label: "Warning",
    description: "Cautions, pending states, non-critical alerts",
    anchorHue: 85,
  },
  error: {
    label: "Error",
    description: "Destructive actions, validation failures, danger",
    anchorHue: 25,
  },
  neutral: {
    label: "Neutral",
    description: "Disabled states, placeholders, secondary content",
    anchorHue: 0,
  },
  focus: {
    label: "Focus",
    description: "Keyboard focus rings — matches primary palette color",
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
export function generateUtilityColors(
  slots: { color: { hex: string; rgb: RGB; hsl: HSL } }[],
): UtilityColorSet {
  // ── 1. Analyse the palette in OKLCH ────────────────────────────────────────
  // Always derive from hex (canonical) to be immune to stale stored rgb values
  const oklchSlots = slots.map((s) => rgbToOklch(hexToRgb(s.color.hex)));

  const avgL = oklchSlots.length
    ? oklchSlots.reduce((a, c) => a + c.L, 0) / oklchSlots.length
    : 0.55;
  const avgC = oklchSlots.length
    ? oklchSlots.reduce((a, c) => a + c.C, 0) / oklchSlots.length
    : 0.12;

  // Primary: highest-chroma slot — dominant brand hue
  const primary = oklchSlots.reduce(
    (best, c) => (c.C > best.C ? c : best),
    oklchSlots[0] ?? { L: 0.55, C: 0.15, H: 230 },
  );

  // Palette L range — used to keep utility colors visually consistent with palette
  const minL = oklchSlots.length
    ? Math.min(...oklchSlots.map((c) => c.L))
    : 0.35;
  const maxL = oklchSlots.length
    ? Math.max(...oklchSlots.map((c) => c.L))
    : 0.72;

  // Target L for utility icons/text — mid of palette range, clamped to readable band
  // If palette is very light, pull utility darker; very dark → pull lighter
  const targetL = clamp(
    avgL > 0.68 ? avgL - 0.14 : avgL < 0.38 ? avgL + 0.14 : avgL,
    0.44,
    0.64,
  );
  // Target C — match palette saturation character, minimum 0.10 for semantic clarity
  const targetC = clamp(avgC * 0.9 + 0.04, 0.1, 0.22);

  // ── 2. Circular hue distance helper ────────────────────────────────────────
  const hueDist = (a: number, b: number) =>
    Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

  // ── 3. Semantic role definitions with hue ranges ────────────────────────────
  // Each role has a canonical hue centre and a tolerance arc.
  // Error/orange are treated as separate ranges to distinguish red vs warm-orange.
  const ROLE_HUES: Record<UtilityRole, { center: number; arc: number }> = {
    info: { center: 220, arc: 60 }, // blue family: 160°–280°
    success: { center: 148, arc: 50 }, // green family: 98°–198°
    warning: { center: 75, arc: 35 }, // yellow-amber: 40°–110°
    error: { center: 27, arc: 35 }, // orange-red: 352°–62° (wraps), centred at red-orange
    neutral: { center: primary.H, arc: 360 }, // any hue — uses primary
    focus: { center: primary.H, arc: 360 }, // any hue — uses primary
  };

  // ── 4. Core hue resolver ───────────────────────────────────────────────────
  //
  // Strategy:
  //   a) Find all palette slots within `arc` degrees of the role's center hue.
  //   b) If multiple slots qualify, pick the one whose L and C are closest to
  //      the role's target — so we get a "same box" match rather than just
  //      nearest-hue.
  //   c) If a match exists, use its exact hue so the utility color feels
  //      pulled directly from the palette.
  //   d) If no palette slot is close enough, blend between the nearest palette
  //      hue and the canonical role center (weighted by distance) — ensuring
  //      the utility color still feels palette-related rather than generic.
  //
  function resolveRoleHue(role: UtilityRole): number {
    if (!oklchSlots.length) return ROLE_HUES[role].center;
    const { center, arc } = ROLE_HUES[role];

    // Slots within the hue arc for this role
    const candidates = oklchSlots
      .map((c, i) => ({ ...c, i, dist: hueDist(c.H, center) }))
      .filter((c) => c.dist <= arc);

    if (candidates.length > 0) {
      // Score each candidate: prefer slots whose L and C are close to the
      // role targets. Combine hue fit (0–1), L fit, C fit into one score.
      const scored = candidates.map((c) => {
        const hueFit = 1 - c.dist / arc; // 1 = perfect hue match
        const lFit = 1 - Math.abs(c.L - targetL); // 1 = L matches target
        const cFit = 1 - Math.abs(c.C - targetC); // 1 = C matches target
        const score = hueFit * 0.5 + lFit * 0.3 + cFit * 0.2;
        return { ...c, score };
      });
      scored.sort((a, b) => b.score - a.score);
      return scored[0].H;
    }

    // No slot in arc — find nearest slot and blend its hue toward the role center
    // proportional to distance: very far = mostly canonical, nearby = mostly palette
    const nearest = oklchSlots.reduce(
      (b, c) => {
        const d = hueDist(c.H, center);
        return d < b.d ? { d, H: c.H } : b;
      },
      { d: Infinity, H: center },
    );

    // Blend weight: at arc→ 0% palette, at 0°→ 100% palette (linear)
    // Clamp to 120° max distance so we don't go fully canonical for remote hues
    const blendFactor = clamp(1 - nearest.d / 120, 0, 0.6);
    // Shortest-path angular blend
    let delta = ((center - nearest.H + 540) % 360) - 180; // signed shortest arc
    return (nearest.H + delta * (1 - blendFactor) + 360) % 360;
  }

  // ── 5. Warning-specific L adjustment ──────────────────────────────────────
  // Yellow-amber (H≈75°) is perceptually very bright at high L — pull it down
  // so it has similar visual weight to the other semantic colors.
  function warningL(h: number): number {
    const yellowness = Math.max(0, 1 - hueDist(h, 75) / 40); // 1 at H=75, 0 at ±40°
    return clamp(targetL - yellowness * 0.08, 0.42, 0.62);
  }

  // ── 6. Build utility color objects ────────────────────────────────────────
  function makeOklchStop(
    L: number,
    C: number,
    H: number,
  ): UtilityColor["color"] {
    const rgb = oklchToRgb({ L, C, H });
    return { hex: rgbToHex(rgb), rgb, hsl: rgbToHsl(rgb) };
  }
  function makeUtility(
    role: UtilityRole,
    L: number,
    C: number,
    H: number,
  ): UtilityColor {
    return {
      ...UTILITY_DEFS[role],
      role,
      color: makeOklchStop(L, C, H),
      locked: false,
    };
  }

  const infoH = resolveRoleHue("info");
  const successH = resolveRoleHue("success");
  const warningH = resolveRoleHue("warning");
  const errorH = resolveRoleHue("error");

  return {
    info: makeUtility("info", targetL, targetC, infoH),
    success: makeUtility("success", targetL, targetC, successH),
    warning: makeUtility(
      "warning",
      warningL(warningH),
      clamp(targetC * 1.05, 0.09, 0.2),
      warningH,
    ),
    error: makeUtility(
      "error",
      targetL,
      clamp(targetC * 1.1, 0.12, 0.24),
      errorH,
    ),
    // Neutral: primary hue at near-zero chroma — palette-tinted gray, not generic
    neutral: makeUtility(
      "neutral",
      clamp(targetL + 0.05, 0.5, 0.68),
      clamp(primary.C * 0.08, 0.006, 0.035),
      primary.H,
    ),
    // Focus ring: primary color, lightness normalised to be visible as a ring
    focus: makeUtility(
      "focus",
      clamp(primary.L, 0.5, 0.7),
      clamp(primary.C, 0.12, 0.3),
      primary.H,
    ),
  };
}

export function mergeUtilityColors(
  existing: UtilityColorSet,
  generated: UtilityColorSet,
): UtilityColorSet {
  const roles: UtilityRole[] = [
    "info",
    "success",
    "warning",
    "error",
    "neutral",
    "focus",
  ];
  const result = {} as UtilityColorSet;
  for (const role of roles)
    result[role] = existing[role].locked ? existing[role] : generated[role];
  return result;
}
