// color-math-export.ts
// Theme token derivation and all export format generators.
// Extracted from color-math.ts for maintainability.

import type {
  RGB,
  UtilityRole,
  UtilityColorSet,
  ThemeTokenSet,
  SemanticToken,
} from "@/types";
import {
  hexToRgb,
  wcagLevel,
  rgbToHex,
  rgbToOklch,
  oklchToRgb,
  contrastRatio,
  clamp,
  textColor,
} from "@/lib/utils/color-math.utils";

// ─── Theme Token Derivation ────────────────────────────────────────────────────

/**
 * Derive a full design-system token set from the palette, modelled on shadcn/ui's
 * variable system but extended with more surface layers.
 *
 * All neutral shades are generated in OKLCH with near-zero chroma (< 0.015) so they
 * carry a whisper of the dominant palette hue — exactly how shadcn's neutral-zinc
 * theme works. The accent color is the highest-chroma palette slot.
 *
 * Token structure (matches shadcn naming):
 *   background / foreground
 *   card / card-foreground
 *   popover / popover-foreground
 *   primary / primary-foreground
 *   secondary / secondary-foreground
 *   muted / muted-foreground
 *   accent / accent-foreground
 *   destructive / destructive-foreground
 *   border / input / ring
 *
 * Plus our palette-specific additions:
 *   bg-subtle (alternate stripe background)
 *   surface-raised (popovers, tooltips)
 *   text-disabled
 */
export function deriveThemeTokens(
  slots: { color: { hex: string } }[],
  utility: UtilityColorSet,
): ThemeTokenSet {
  if (!slots.length)
    return {
      semantic: [],
      utility: {} as ThemeTokenSet["utility"],
      palette: [],
    };

  // ── Palette analysis in OKLCH ──────────────────────────────────────────────
  // Always derive from hex — immune to stale stored rgb values
  const oklchSlots = slots.map((s) => rgbToOklch(hexToRgb(s.color.hex)));

  // Primary: highest chroma — the "brand" color (maps to 10% accent in 60-30-10)
  const primaryIdx = oklchSlots.reduce(
    (bi, c, i) => (c.C > oklchSlots[bi].C ? i : bi),
    0,
  );
  const primaryLch = oklchSlots[primaryIdx];

  // Dominant hue for chromatic neutrals — carries subtle palette character
  // Shadcn/ui uses ~0.006–0.016 chroma for background tints
  const dominantH = primaryLch.H;
  const tintC = clamp(primaryLch.C * 0.055, 0.005, 0.015);

  // ── OKLCH neutral builder ─────────────────────────────────────────────────
  /** Near-neutral at target lightness, tinted with the palette's dominant hue.
   *  In dark mode, M3 uses tonal elevation (lighter = higher surface level). */
  function mkN(L: number, C = tintC, H = dominantH): string {
    return rgbToHex(oklchToRgb({ L: clamp(L, 0.01, 0.995), C, H }));
  }

  // ── Primary brand tokens ─────────────────────────────────────────────────
  // Light mode: vivid, L≈0.30–0.38 so it reads well on near-white backgrounds
  const primaryLight = rgbToHex(
    oklchToRgb({
      L: clamp(primaryLch.L, 0.26, 0.4),
      C: clamp(primaryLch.C, 0.14, 0.3),
      H: primaryLch.H,
    }),
  );
  // Dark mode: L≈0.70–0.82 for legibility on dark backgrounds
  const primaryDark = rgbToHex(
    oklchToRgb({
      L: clamp(primaryLch.L + 0.36, 0.62, 0.82),
      C: clamp(primaryLch.C * 0.88, 0.1, 0.28),
      H: primaryLch.H,
    }),
  );
  // Foreground on primary: must always pass WCAG AA (4.5:1)
  // Near-white for light-mode primary, near-black for dark-mode primary
  const primaryFgLight = mkN(0.985, 0.004);
  const primaryFgDark = mkN(0.12, 0.01);

  // ── Primary container tokens (M3 pattern: lighter/softer version for backgrounds) ──
  // Used for large sections, hero areas, secondary buttons
  const primaryContainerLight = rgbToHex(
    oklchToRgb({
      L: 0.92,
      C: clamp(primaryLch.C * 0.38, 0.03, 0.1),
      H: primaryLch.H,
    }),
  );
  const primaryContainerDark = rgbToHex(
    oklchToRgb({
      L: 0.24,
      C: clamp(primaryLch.C * 0.35, 0.03, 0.09),
      H: primaryLch.H,
    }),
  );
  const primaryContainerFgLight = rgbToHex(
    oklchToRgb({
      L: 0.2,
      C: clamp(primaryLch.C * 0.5, 0.06, 0.16),
      H: primaryLch.H,
    }),
  );
  const primaryContainerFgDark = rgbToHex(
    oklchToRgb({
      L: 0.88,
      C: clamp(primaryLch.C * 0.45, 0.05, 0.14),
      H: primaryLch.H,
    }),
  );

  // ── Secondary tokens ─────────────────────────────────────────────────────
  // shadcn: secondary = muted elevated surface (30% role in 60-30-10)
  const secondaryLight = mkN(0.96);
  const secondaryDark = mkN(0.18);
  const secondaryFgLight = mkN(0.14);
  const secondaryFgDark = mkN(0.93);

  // ── Accent tokens ────────────────────────────────────────────────────────
  // Used for hover states, selected states, highlights — a tinted surface
  const accentLight = rgbToHex(
    oklchToRgb({
      L: 0.935,
      C: clamp(primaryLch.C * 0.38, 0.03, 0.11),
      H: primaryLch.H,
    }),
  );
  const accentDark = rgbToHex(
    oklchToRgb({
      L: 0.24,
      C: clamp(primaryLch.C * 0.38, 0.03, 0.1),
      H: primaryLch.H,
    }),
  );
  const accentFgLight = mkN(0.14);
  const accentFgDark = mkN(0.93);

  // ── Destructive = error utility ───────────────────────────────────────────
  const errLch = rgbToOklch(utility.error.color.rgb);
  // Light mode: saturated red, dark enough for white bg (L≈0.46)
  const destructiveLight = rgbToHex(
    oklchToRgb({
      L: clamp(errLch.L, 0.42, 0.52),
      C: clamp(errLch.C, 0.18, 0.28),
      H: errLch.H,
    }),
  );
  // Dark mode: lighter red for dark bg readability
  const destructiveDark = rgbToHex(
    oklchToRgb({
      L: clamp(errLch.L + 0.12, 0.56, 0.72),
      C: clamp(errLch.C * 0.88, 0.14, 0.26),
      H: errLch.H,
    }),
  );
  // Subtle destructive: for alert backgrounds
  const destructiveSubtleLight = rgbToHex(
    oklchToRgb({ L: 0.94, C: clamp(errLch.C * 0.28, 0.03, 0.08), H: errLch.H }),
  );
  const destructiveSubtleDark = rgbToHex(
    oklchToRgb({ L: 0.18, C: clamp(errLch.C * 0.28, 0.03, 0.07), H: errLch.H }),
  );

  // ── M3-style surface elevation tiers ─────────────────────────────────────
  // In light mode: surfaces get slightly darker as elevation rises
  // In dark mode: surfaces get progressively LIGHTER (tonal elevation via primary hue)
  // Elevation 0 = page background, Elevation 5 = floating tooltips/modals
  // Based on M3: each level adds ~5% primary tint in dark mode
  const surfaceElevationDark = (level: number) => {
    const tonalL = 0.08 + level * 0.028; // 0.08 → 0.22 across 5 levels
    const tonalC = clamp(primaryLch.C * (0.04 + level * 0.012), 0.004, 0.025);
    return mkN(tonalL, tonalC);
  };

  // 5-level surface containers (M3 tone-based surfaces)
  // Level 0 = background, Level 1–5 = increasing elevation
  const surfaceLight = [
    mkN(0.99), // Lv0 = page bg
    mkN(0.972), // Lv1 = subtle / striped rows
    mkN(0.955), // Lv2 = card
    mkN(0.935), // Lv3 = raised card
    mkN(0.98), // Lv4 = popover (near-white, floating)
  ];
  const surfaceDark = [
    surfaceElevationDark(0), // Lv0 = page bg
    surfaceElevationDark(1), // Lv1 = subtle
    surfaceElevationDark(2), // Lv2 = card
    surfaceElevationDark(3), // Lv3 = raised card
    surfaceElevationDark(5), // Lv4 = popover (highest)
  ];

  // ── Ring = primary ────────────────────────────────────────────────────────
  const ringLight = primaryLight;
  const ringDark = primaryDark;

  const semantic: SemanticToken[] = [
    // ── Layer 0: Page background ─────────────────────────── 60% zone (neutral)
    {
      name: "--background",
      light: surfaceLight[0],
      dark: surfaceDark[0],
      description: "Page / canvas background (60% dominant)",
    },
    {
      name: "--foreground",
      light: mkN(0.1),
      dark: mkN(0.94),
      description: "Default body text",
    },

    // ── Layer 1: Subtle / alternate ──────────────────────── 60% zone
    {
      name: "--surface-dim",
      light: surfaceLight[1],
      dark: surfaceDark[1],
      description: "Subtle bg: striped rows, aside panels, code wells",
    },
    {
      name: "--surface-dim-foreground",
      light: mkN(0.25),
      dark: mkN(0.8),
      description: "Text on dim surface",
    },

    // ── Layer 2: Card ────────────────────────────────────── 30% zone (secondary)
    {
      name: "--card",
      light: surfaceLight[2],
      dark: surfaceDark[2],
      description: "Card / content block background",
    },
    {
      name: "--card-foreground",
      light: mkN(0.1),
      dark: mkN(0.94),
      description: "Card text",
    },

    // ── Layer 3: Raised card / sidebar ───────────────────── 30% zone
    {
      name: "--card-raised",
      light: surfaceLight[3],
      dark: surfaceDark[3],
      description: "Raised card, sidebar, drawer (slightly elevated)",
    },
    {
      name: "--card-raised-foreground",
      light: mkN(0.1),
      dark: mkN(0.94),
      description: "Text on raised card",
    },

    // ── Layer 4: Popover / modal ──────────────────────────── highest surface
    {
      name: "--popover",
      light: surfaceLight[4],
      dark: surfaceDark[4],
      description: "Popover, tooltip, dropdown, modal background",
    },
    {
      name: "--popover-foreground",
      light: mkN(0.1),
      dark: mkN(0.94),
      description: "Popover text",
    },

    // ── Primary brand (10% accent role) ──────────────────────────────────────
    {
      name: "--primary",
      light: primaryLight,
      dark: primaryDark,
      description:
        "Primary CTA: buttons, links, active nav (use sparingly — 10%)",
    },
    {
      name: "--primary-foreground",
      light: primaryFgLight,
      dark: primaryFgDark,
      description: "Text/icon on primary (always high-contrast)",
    },
    {
      name: "--primary-container",
      light: primaryContainerLight,
      dark: primaryContainerDark,
      description:
        "Primary container: large sections, hero bg, secondary CTA surface",
    },
    {
      name: "--primary-container-foreground",
      light: primaryContainerFgLight,
      dark: primaryContainerFgDark,
      description: "Text on primary-container (brand-tinted, not full primary)",
    },

    // ── Secondary ────────────────────────────────────────────────────────────
    {
      name: "--secondary",
      light: secondaryLight,
      dark: secondaryDark,
      description: "Secondary buttons, less-prominent surfaces",
    },
    {
      name: "--secondary-foreground",
      light: secondaryFgLight,
      dark: secondaryFgDark,
      description: "Text on secondary",
    },

    // ── Muted ────────────────────────────────────────────────────────────────
    {
      name: "--muted",
      light: mkN(0.94),
      dark: mkN(0.2),
      description: "Muted surface: disabled states, placeholder backgrounds",
    },
    {
      name: "--muted-foreground",
      light: mkN(0.46),
      dark: mkN(0.62),
      description: "Secondary / placeholder text (reduced emphasis)",
    },

    // ── Accent (tinted hover / selection surface) ──────────────────────────
    {
      name: "--accent",
      light: accentLight,
      dark: accentDark,
      description: "Hover surface, selected state, highlight chip bg",
    },
    {
      name: "--accent-foreground",
      light: accentFgLight,
      dark: accentFgDark,
      description: "Text on accent surface",
    },

    // ── Destructive ──────────────────────────────────────────────────────────
    {
      name: "--destructive",
      light: destructiveLight,
      dark: destructiveDark,
      description: "Error / delete actions (filled)",
    },
    {
      name: "--destructive-foreground",
      light: mkN(0.985, 0.004),
      dark: mkN(0.985, 0.004),
      description: "Text on destructive",
    },
    {
      name: "--destructive-subtle",
      light: destructiveSubtleLight,
      dark: destructiveSubtleDark,
      description: "Error alert background / inline error tint",
    },

    // ── Borders & inputs ─────────────────────────────────────────────────────
    {
      name: "--border",
      light: mkN(0.86),
      dark: mkN(0.26),
      description:
        "Default divider / border — use sparingly (shadow often better)",
    },
    {
      name: "--border-strong",
      light: mkN(0.72),
      dark: mkN(0.4),
      description: "High-emphasis border: active inputs, selected cards",
    },
    {
      name: "--input",
      light: mkN(0.86),
      dark: mkN(0.24),
      description: "Form input border (normal state)",
    },

    // ── Focus ring = primary brand ────────────────────────────────────────────
    {
      name: "--ring",
      light: ringLight,
      dark: ringDark,
      description: "Keyboard focus ring — always matches primary brand color",
    },
  ];

  // ── Utility tokens ─────────────────────────────────────────────────────────
  const utilityTokens = {} as ThemeTokenSet["utility"];
  const roles: UtilityRole[] = [
    "info",
    "success",
    "warning",
    "error",
    "neutral",
    "focus",
  ];
  for (const role of roles) {
    const lch = rgbToOklch(utility[role].color.rgb);
    const base = utility[role].color.hex;

    // Warning is perceptually very bright (yellow), so lighten less in light mode
    const lightLAdj = role === "warning" ? -0.1 : -0.06;
    const darkLAdj = role === "warning" ? +0.04 : +0.08;

    // Light mode: darker/more saturated — readable on white
    const light = rgbToHex(
      oklchToRgb({
        L: clamp(lch.L + lightLAdj, 0.34, 0.55),
        C: clamp(lch.C * 1.05, 0.1, 0.26),
        H: lch.H,
      }),
    );
    // Dark mode: lighter — readable on dark surface
    const dark = rgbToHex(
      oklchToRgb({
        L: clamp(lch.L + darkLAdj, 0.5, 0.78),
        C: clamp(lch.C * 0.88, 0.08, 0.22),
        H: lch.H,
      }),
    );
    // Subtle light: alert background — near-white with a tint of the role hue
    const subtle = rgbToHex(
      oklchToRgb({
        L: 0.945,
        C: clamp(lch.C * 0.3, 0.02, 0.07),
        H: lch.H,
      }),
    );
    // Subtle dark: alert background in dark mode — near-dark with a tint of the role hue
    // Sits above the card surface (L≈0.11) so it's clearly a tinted surface, not flat black
    const subtleDark = rgbToHex(
      oklchToRgb({
        L: 0.16,
        C: clamp(lch.C * 0.32, 0.02, 0.08),
        H: lch.H,
      }),
    );

    utilityTokens[role] = { base, light, dark, subtle, subtleDark };
  }

  return {
    semantic,
    utility: utilityTokens,
    palette: semanticSlotNames(slots).map((name, i) => ({
      name,
      hex: slots[i].color.hex,
    })),
  };
}

export function buildThemeCss(tokens: ThemeTokenSet): string {
  const semLight = tokens.semantic
    .map((t) => `  ${t.name}: ${t.light};`)
    .join("\n");
  const semDark = tokens.semantic
    .map((t) => `  ${t.name}: ${t.dark};`)
    .join("\n");
  const utilVars = (mode: "light" | "dark") =>
    Object.entries(tokens.utility)
      .map(([role, v]) => {
        const subtle = mode === "light" ? v.subtle : v.subtleDark;
        return `  --${role}: ${mode === "light" ? v.light : v.dark};\n  --${role}-subtle: ${subtle};`;
      })
      .join("\n");
  const palVars = tokens.palette
    .map((p) => `  --${p.name}: ${p.hex};`)
    .join("\n");

  const header = `/**
 * ─────────────────────────────────────────────────────────
 *  Color System — Generated by Chroma
 * ─────────────────────────────────────────────────────────
 *
 *  Layer 1 · PRIMITIVE  — raw palette values (--palette-1, --palette-2…)
 *  Layer 2 · SEMANTIC   — purpose-named tokens (--background, --primary…)
 *  Layer 3 · COMPONENT  — apply via var(): bg-[--primary] or className=""
 *
 *  60-30-10 proportion guide:
 *   60%  →  --background, --surface-dim          (neutral canvas)
 *   30%  →  --card, --card-raised, --secondary   (content surfaces)
 *   10%  →  --primary                            (brand/CTA — use sparingly!)
 *
 *  Surface elevation (light → dark both work via OKLCH tonal tints):
 *   --background < --surface-dim < --card < --card-raised < --popover
 *
 *  Dark mode: uses tonal elevation (lighter surface = higher level)
 *  based on Material Design 3 / Google HCT research.
 * ─────────────────────────────────────────────────────────
 */`;

  return [
    header,
    ``,
    `/* ─── Light mode (default) ──────────────────────────── */`,
    `:root {`,
    `  /* ── Semantic tokens ─────────────────────────────── */`,
    semLight,
    ``,
    `  /* ── Utility / semantic state colors ────────────── */`,
    utilVars("light"),
    ``,
    `  /* ── Primitive palette ───────────────────────────── */`,
    palVars,
    `}`,
    ``,
    `/* ─── Dark mode (system preference) ─────────────────── */`,
    `@media (prefers-color-scheme: dark) {`,
    `  :root {`,
    semDark
      .split("\n")
      .map((l) => "  " + l)
      .join("\n"),
    ``,
    `    /* Utility */`,
    utilVars("dark")
      .split("\n")
      .map((l) => "  " + l)
      .join("\n"),
    `  }`,
    `}`,
    ``,
    `/* ─── Manual dark: add class="dark" to <html> ────────── */`,
    `.dark {`,
    semDark,
    ``,
    utilVars("dark"),
    `}`,
  ].join("\n");
}

export function buildFigmaTokens(
  tokens: ThemeTokenSet,
  utility: UtilityColorSet,
): string {
  const obj = {
    global: Object.fromEntries(
      tokens.palette.map((p) => [p.name, { value: p.hex, type: "color" }]),
    ),
    semantic: {
      light: Object.fromEntries(
        tokens.semantic.map((t) => [
          t.name.replace(/^--/, ""),
          { value: t.light, type: "color", description: t.description },
        ]),
      ),
      dark: Object.fromEntries(
        tokens.semantic.map((t) => [
          t.name.replace(/^--/, ""),
          { value: t.dark, type: "color", description: t.description },
        ]),
      ),
    },
    utility: Object.fromEntries(
      Object.entries(tokens.utility).map(([role, v]) => [
        role,
        {
          DEFAULT: {
            value: v.base,
            type: "color",
            description: utility[role as UtilityRole].description,
          },
          light: { value: v.light, type: "color" },
          dark: { value: v.dark, type: "color" },
          subtle: { value: v.subtle, type: "color" },
        },
      ]),
    ),
  };
  return JSON.stringify(obj, null, 2);
}

export function buildTailwindConfig(
  tokens: ThemeTokenSet,
  _utility: UtilityColorSet,
): string {
  // Tailwind v4 uses @theme CSS block — no JS config needed for colors
  const paletteVars = tokens.palette
    .map((p) => `  --color-${p.name}: ${p.hex};`)
    .join("\n");

  const utilityVars = Object.entries(tokens.utility)
    .flatMap(([role, v]) => [
      `  --color-${role}: ${v.base};`,
      `  --color-${role}-light: ${v.light};`,
      `  --color-${role}-dark: ${v.dark};`,
      `  --color-${role}-subtle: ${v.subtle};`,
    ])
    .join("\n");

  const semanticVars = tokens.semantic
    .map((t) => `  ${t.name}: ${t.light};  /* dark: ${t.dark} */`)
    .join("\n");

  return [
    `/* Tailwind v4 — paste into your global CSS */`,
    `/* Uses @theme block for design tokens */`,
    ``,
    `@theme {`,
    `  /* ── Palette ─────────────────────────────────────── */`,
    paletteVars,
    ``,
    `  /* ── Utility colors ──────────────────────────────── */`,
    utilityVars,
    ``,
    `  /* ── Semantic tokens (update dark: values for dark mode) */`,
    semanticVars,
    `}`,
  ].join("\n");
}

// ─── Semantic slot naming ─────────────────────────────────────────────────────

/**
 * Assign semantic names to palette slots based on their OKLCH properties.
 * Highest chroma → "primary", second highest → "secondary", rest get nearest color name.
 */
export function semanticSlotNames(
  slots: { color: { hex: string } }[],
): string[] {
  if (!slots.length) return [];
  const oklchs = slots.map((s) => rgbToOklch(hexToRgb(s.color.hex)));
  const indexed = oklchs
    .map((c, i) => ({ i, C: c.C }))
    .sort((a, b) => b.C - a.C);

  const names = new Array(slots.length).fill("");
  const used = new Set<string>();

  const assign = (i: number, name: string) => {
    // Ensure uniqueness by appending -2, -3 etc.
    let n = name;
    let counter = 2;
    while (used.has(n)) n = `${name}-${counter++}`;
    names[i] = n;
    used.add(n);
  };

  indexed.forEach((s, rank) => {
    if (rank === 0) assign(s.i, "primary");
    else if (rank === 1) assign(s.i, "secondary");
    else {
      // Use nearest color name, slugified
      const rgb = hexToRgb(slots[s.i].color.hex);
      // Inline simple name lookup from the LAB nearest approach
      const name = slugify(approxColorName(rgb));
      assign(s.i, name);
    }
  });
  return names;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/** Very lightweight color name approximation for semantic slug generation.
 *  Not as accurate as the full NAMED lookup — that lives in paletteUtils —
 *  but colorMath can't import paletteUtils (circular). Uses basic hue buckets. */
function approxColorName(rgb: RGB): string {
  const lch = rgbToOklch(rgb);
  const h = lch.H,
    C = lch.C,
    L = lch.L;
  if (C < 0.04) return L > 0.75 ? "light-gray" : L < 0.3 ? "dark-gray" : "gray";
  if (h < 30 || h >= 340) return "red";
  if (h < 60) return "orange";
  if (h < 110) return "yellow";
  if (h < 160) return "green";
  if (h < 220) return "teal";
  if (h < 270) return "blue";
  if (h < 310) return "purple";
  return "pink";
}

// ─── Style Dictionary export ──────────────────────────────────────────────────

export function buildStyleDictionary(
  tokens: ThemeTokenSet,
  utility: UtilityColorSet,
): string {
  const names = tokens.palette.map((p) => p.name); // already slugified

  const obj: Record<string, unknown> = {
    color: {
      primitive: Object.fromEntries(
        tokens.palette.map((p, i) => [
          names[i],
          {
            $value: p.hex,
            $type: "color",
            $description: `Palette slot ${i + 1}`,
          },
        ]),
      ),
      semantic: {
        light: Object.fromEntries(
          tokens.semantic.map((t) => [
            t.name.replace(/^--/, "").replace(/-/g, "_"),
            { $value: t.light, $type: "color", $description: t.description },
          ]),
        ),
        dark: Object.fromEntries(
          tokens.semantic.map((t) => [
            t.name.replace(/^--/, "").replace(/-/g, "_"),
            { $value: t.dark, $type: "color", $description: t.description },
          ]),
        ),
      },
      utility: Object.fromEntries(
        (Object.keys(utility) as UtilityRole[]).map((role) => [
          role,
          {
            base: {
              $value: tokens.utility[role].base,
              $type: "color",
              $description: utility[role].description,
            },
            light: { $value: tokens.utility[role].light, $type: "color" },
            dark: { $value: tokens.utility[role].dark, $type: "color" },
            subtle: { $value: tokens.utility[role].subtle, $type: "color" },
            subtle_dark: {
              $value: tokens.utility[role].subtleDark,
              $type: "color",
            },
          },
        ]),
      ),
    },
  };
  return JSON.stringify(obj, null, 2);
}

// ─── Tailwind v4 CSS-first export ─────────────────────────────────────────────

export function buildTailwindV4(
  tokens: ThemeTokenSet,
  _utility: UtilityColorSet,
): string {
  const semVars = tokens.semantic
    .map((t) => {
      const key = t.name.replace(/^--/, "");
      return `  --color-${key}: var(${t.name});`;
    })
    .join("\n");

  const utilVars = Object.entries(tokens.utility)
    .map(([role, v]) =>
      [
        `  --color-${role}: ${v.base};`,
        `  --color-${role}-light: ${v.light};`,
        `  --color-${role}-dark: ${v.dark};`,
        `  --color-${role}-subtle: ${v.subtle};`,
      ].join("\n"),
    )
    .join("\n");

  const palVars = tokens.palette
    .map((p) => `  --color-${p.name}: ${p.hex};`)
    .join("\n");

  return [
    `/* Tailwind v4 — paste this into your main CSS file */`,
    `/* Then add the CSS Variables block from the CSS tab to the same file */`,
    ``,
    `@import "tailwindcss";`,
    ``,
    `@theme {`,
    `  /* Semantic colors (auto light/dark via CSS vars) */`,
    semVars,
    ``,
    `  /* Utility / state colors */`,
    utilVars,
    ``,
    `  /* Raw palette */`,
    palVars,
    `}`,
  ].join("\n");
}

// ─── Color Story HTML export ──────────────────────────────────────────────────

export function buildColorStoryHtml(
  slots: { color: { hex: string } }[],
  harmonyMode: string,
  utility: UtilityColorSet,
  paletteNames: string[],
): string {
  const tokens = deriveThemeTokens(slots, utility);

  const swatchRows = slots
    .map((slot, i) => {
      const rgb = hexToRgb(slot.color.hex);
      const lch = rgbToOklch(rgb);
      const tc = textColor(rgb);
      const onW = contrastRatio(rgb, { r: 255, g: 255, b: 255 });
      const onB = contrastRatio(rgb, { r: 0, g: 0, b: 0 });
      const level = wcagLevel(Math.max(onW, onB));
      return `
      <div class="swatch">
        <div class="swatch-color" style="background:${slot.color.hex}">
          <span class="swatch-hex" style="color:${tc}">${slot.color.hex.toUpperCase()}</span>
        </div>
        <div class="swatch-info">
          <strong>${paletteNames[i] ?? `color-${i + 1}`}</strong>
          <span>L=${Math.round(lch.L * 100)}% C=${lch.C.toFixed(2)} H=${Math.round(lch.H)}°</span>
          <span class="badge badge-${level === "AAA" ? "aaa" : level === "AA" ? "aa" : level === "AA Large" ? "aal" : "fail"}">${level}</span>
        </div>
      </div>`;
    })
    .join("");

  const utilRows = (
    Object.entries(utility) as [UtilityRole, (typeof utility)[UtilityRole]][]
  )
    .map(
      ([role, u]) => `
    <div class="util-swatch">
      <div class="util-color" style="background:${u.color.hex}"></div>
      <span>${role}</span>
      <code>${u.color.hex}</code>
    </div>`,
    )
    .join("");

  const cssVars = buildThemeCss(tokens);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Color Story — ${harmonyMode} palette</title>
<style>
  :root { font-family: system-ui,sans-serif; }
  body { margin: 0; padding: 40px; background: #fafafa; color: #111; }
  h1 { font-size: 28px; font-weight: 800; letter-spacing: -.03em; margin: 0 0 6px; }
  .meta { font-size: 12px; color: #666; margin-bottom: 40px; }
  h2 { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #888; margin: 32px 0 12px; }
  .swatches { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 40px; }
  .swatch { border-radius: 10px; overflow: hidden; border: 1px solid rgba(0,0,0,.1); width: 140px; }
  .swatch-color { height: 100px; display: flex; align-items: flex-end; padding: 8px; }
  .swatch-hex { font-family: monospace; font-size: 11px; font-weight: 700; }
  .swatch-info { padding: 10px; display: flex; flex-direction: column; gap: 3px; font-size: 11px; }
  .badge { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 9px; font-weight: 700; margin-top: 3px; }
  .badge-aaa { background: rgba(34,197,94,.15); color: #16a34a; }
  .badge-aa  { background: rgba(59,130,246,.15); color: #2563eb; }
  .badge-aal { background: rgba(234,179,8,.15);  color: #a16207; }
  .badge-fail{ background: rgba(239,68,68,.13); color: #dc2626; }
  .util-swatches { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 40px; }
  .util-swatch { display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: #fff; border: 1px solid rgba(0,0,0,.08); border-radius: 6px; font-size: 11px; }
  .util-color { width: 20px; height: 20px; border-radius: 4px; border: 1px solid rgba(0,0,0,.1); }
  code { font-size: 10px; color: #666; }
  pre { background: #1e1e1e; color: #d4d4d4; padding: 20px; border-radius: 8px; font-size: 11px; overflow-x: auto; line-height: 1.6; }
  .footer { margin-top: 48px; font-size: 10px; color: #aaa; border-top: 1px solid #eee; padding-top: 16px; }
</style>
</head>
<body>
<h1>Color Story</h1>
<div class="meta">Generated by Chroma v4 · ${harmonyMode} harmony · ${new Date().toLocaleDateString()}</div>

<h2>Palette (${slots.length} colors)</h2>
<div class="swatches">${swatchRows}</div>

<h2>Utility Colors</h2>
<div class="util-swatches">${utilRows}</div>

<h2>CSS Variables</h2>
<pre>${cssVars.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>

<div class="footer">Created with Chroma v4 — perceptual color system builder</div>
</body>
</html>`;
}
