/* eslint-disable no-useless-assignment */
import type {
  CMYK,
  HSL,
  HSV,
  OKLCH,
  OKLab,
  RGB,
  ThemeTokenSet,
  UtilityColor,
  UtilityColorSet,
  UtilityRole,
} from "@/types";

// ─── Utilities ────────────────────────────────────────────────────────────────

export const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v));

// ─── sRGB linearization (single source of truth) ─────────────────────────────

export function toLinear(v: number): number {
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}
export function fromLinear(v: number): number {
  return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

// ─── Hex ↔ RGB ────────────────────────────────────────────────────────────────

export function hexToRgb(hex: string): RGB {
  const c = hex.replace("#", "");
  const f =
    c.length === 3
      ? c
          .split("")
          .map((x) => x + x)
          .join("")
      : c;
  const n = parseInt(f, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex({ r, g, b }: RGB): string {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

// ─── RGB ↔ HSL ────────────────────────────────────────────────────────────────

export function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255,
    gn = g / 255,
    bn = b / 255;
  const mx = Math.max(rn, gn, bn),
    mn = Math.min(rn, gn, bn);
  const l = (mx + mn) / 2;
  if (mx === mn) return { h: 0, s: 0, l: l * 100 };
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h = 0;
  if (mx === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (mx === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToRgb({ h, s, l }: HSL): RGB {
  const sn = s / 100,
    ln = l / 100;
  if (sn === 0) {
    const v = Math.round(ln * 255);
    return { r: v, g: v, b: v };
  }
  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  const hk = h / 360;
  const ch = (t: number): number => {
    const x = ((t % 1) + 1) % 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 0.5) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return {
    r: Math.round(ch(hk + 1 / 3) * 255),
    g: Math.round(ch(hk) * 255),
    b: Math.round(ch(hk - 1 / 3) * 255),
  };
}

// ─── HSV ──────────────────────────────────────────────────────────────────────

export function rgbToHsv({ r, g, b }: RGB): HSV {
  const rn = r / 255,
    gn = g / 255,
    bn = b / 255;
  const mx = Math.max(rn, gn, bn),
    mn = Math.min(rn, gn, bn),
    d = mx - mn;
  let h = 0;
  if (d > 0) {
    if (mx === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
    else if (mx === gn) h = ((bn - rn) / d + 2) / 6;
    else h = ((rn - gn) / d + 4) / 6;
  }
  return { h: h * 360, s: mx === 0 ? 0 : (d / mx) * 100, v: mx * 100 };
}

// ─── CMYK ─────────────────────────────────────────────────────────────────────

export function rgbToCmyk({ r, g, b }: RGB): CMYK {
  const rn = r / 255,
    gn = g / 255,
    bn = b / 255;
  const k = 1 - Math.max(rn, gn, bn);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  const d = 1 - k;
  return {
    c: Math.round(((1 - rn - k) / d) * 100),
    m: Math.round(((1 - gn - k) / d) * 100),
    y: Math.round(((1 - bn - k) / d) * 100),
    k: Math.round(k * 100),
  };
}

// ─── OKLab / OKLCH ───────────────────────────────────────────────────────────

export function rgbToOklab({ r, g, b }: RGB): OKLab {
  const rl = toLinear(r / 255),
    gl = toLinear(g / 255),
    bl = toLinear(b / 255);
  const l = Math.cbrt(
    0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl,
  );
  const m = Math.cbrt(
    0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl,
  );
  const s = Math.cbrt(
    0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl,
  );
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

export function oklabToLch({ L, a, b }: OKLab): OKLCH {
  return {
    L: L * 100,
    C: Math.sqrt(a * a + b * b) * 100,
    H: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360,
  };
}

// Interpolate two colors in OKLab space (perceptually uniform)
export function mixOklab(a: RGB, b: RGB, t: number): RGB {
  const la = rgbToOklab(a),
    lb = rgbToOklab(b);
  const mixed: OKLab = {
    L: la.L + (lb.L - la.L) * t,
    a: la.a + (lb.a - la.a) * t,
    b: la.b + (lb.b - la.b) * t,
  };
  // OKLab → linear RGB → sRGB
  const l_ = mixed.L + 0.3963377774 * mixed.a + 0.2158037573 * mixed.b;
  const m_ = mixed.L - 0.1055613458 * mixed.a - 0.0638541728 * mixed.b;
  const s_ = mixed.L - 0.0894841775 * mixed.a - 1.291485548 * mixed.b;
  const l3 = l_ * l_ * l_,
    m3 = m_ * m_ * m_,
    s3 = s_ * s_ * s_;
  const rl = clamp(
    +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    0,
    1,
  );
  const gl = clamp(
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    0,
    1,
  );
  const bl2 = clamp(
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
    0,
    1,
  );
  return {
    r: Math.round(fromLinear(rl) * 255),
    g: Math.round(fromLinear(gl) * 255),
    b: Math.round(fromLinear(bl2) * 255),
  };
}

export function mixHsl(a: RGB, b: RGB, t: number): RGB {
  const ha = rgbToHsl(a),
    hb = rgbToHsl(b);
  // Hue interpolation via shortest path
  let dh = hb.h - ha.h;
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  return hslToRgb({
    h: (ha.h + dh * t + 360) % 360,
    s: ha.s + (hb.s - ha.s) * t,
    l: ha.l + (hb.l - ha.l) * t,
  });
}

export function mixRgb(a: RGB, b: RGB, t: number): RGB {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

// ─── Accessibility ────────────────────────────────────────────────────────────

export function luminance({ r, g, b }: RGB): number {
  return (
    0.2126 * toLinear(r / 255) +
    0.7152 * toLinear(g / 255) +
    0.0722 * toLinear(b / 255)
  );
}

export function contrastRatio(a: RGB, b: RGB): number {
  const la = luminance(a),
    lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export type WcagLevel = "AAA" | "AA" | "AA Large" | "Fail";

export function wcagLevel(r: number): WcagLevel {
  if (r >= 7) return "AAA";
  if (r >= 4.5) return "AA";
  if (r >= 3) return "AA Large";
  return "Fail";
}

export function textColor(bg: RGB): string {
  return contrastRatio(bg, { r: 255, g: 255, b: 255 }) >= 4.5
    ? "#ffffff"
    : "#000000";
}

// ─── Perceptual Distance ──────────────────────────────────────────────────────

export function colorDist(a: RGB, b: RGB): number {
  const la = rgbToOklab(a),
    lb = rgbToOklab(b);
  return Math.sqrt(
    (la.L - lb.L) ** 2 + (la.a - lb.a) ** 2 + (la.b - lb.b) ** 2,
  );
}

// ─── Parsers ─────────────────────────────────────────────────────────────────

export function parseHex(s: string): string | null {
  const c = s.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(c))
    return (
      "#" +
      c
        .split("")
        .map((x) => x + x)
        .join("")
    );
  if (/^[0-9a-fA-F]{6}$/.test(c)) return "#" + c;
  return null;
}

export function parseRgbStr(s: string): RGB | null {
  const m = s.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
  if (!m) return null;
  return {
    r: clamp(Math.round(+m[1]!), 0, 255),
    g: clamp(Math.round(+m[2]!), 0, 255),
    b: clamp(Math.round(+m[3]!), 0, 255),
  };
}

export function parseHslStr(s: string): RGB | null {
  const m = s.match(/hsla?\(\s*([\d.]+)[,\s]\s*([\d.]+)%?[,\s]\s*([\d.]+)%?/);
  if (!m) return null;
  return hslToRgb({
    h: +m[1]! % 360,
    s: clamp(+m[2]!, 0, 100),
    l: clamp(+m[3]!, 0, 100),
  });
}

export function parseAny(s: string): RGB | null {
  const h = parseHex(s);
  return h ? hexToRgb(h) : parseRgbStr(s) || parseHslStr(s);
}

// ─── Color Blindness Simulation ───────────────────────────────────────────────

export function applySimMatrix(rgb: RGB, M: number[]): RGB {
  const R = toLinear(rgb.r / 255),
    G = toLinear(rgb.g / 255),
    B = toLinear(rgb.b / 255);
  return {
    r: Math.round(
      fromLinear(clamp(M[0]! * R + M[1]! * G + M[2]! * B, 0, 1)) * 255,
    ),
    g: Math.round(
      fromLinear(clamp(M[3]! * R + M[4]! * G + M[5]! * B, 0, 1)) * 255,
    ),
    b: Math.round(
      fromLinear(clamp(M[6]! * R + M[7]! * G + M[8]! * B, 0, 1)) * 255,
    ),
  };
}

// ─── Scale Generation ─────────────────────────────────────────────────────────

export const SCALE_STEPS = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
];

export function generateScale(hex: string) {
  const hsl = rgbToHsl(hexToRgb(hex));
  return SCALE_STEPS.map((step) => {
    const t = step / 1000;
    const l = clamp(95 - t * 88, 5, 95);
    const s = clamp(hsl.s * (1 - Math.abs(t - 0.45) * 0.5), 0, 100);
    const rgb = hslToRgb({ h: hsl.h, s, l });
    return { step, hex: rgbToHex(rgb), rgb, hsl: { h: hsl.h, s, l } };
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
  slots: { color: { rgb: RGB; hsl: HSL } }[],
): PaletteScore {
  if (slots.length < 2)
    return {
      balance: 0,
      accessibility: 0,
      harmony: 0,
      uniqueness: 0,
      overall: 0,
    };

  // Hue balance: std-dev of hue gaps on circle
  const hues = slots.map((s) => s.color.hsl.h).sort((a, b) => a - b);
  const gaps = hues.map(
    (h, i) => (hues[(i + 1) % hues.length]! - h + 360) % 360,
  );
  const idealGap = 360 / hues.length;
  const gapDev = Math.sqrt(
    gaps.reduce((acc, g) => acc + (g - idealGap) ** 2, 0) / gaps.length,
  );
  const balance = Math.round(Math.max(0, 100 - (gapDev / idealGap) * 100));

  // Accessibility: pairs passing AA (4.5:1)
  let passPairs = 0,
    totalPairs = 0;
  for (let i = 0; i < slots.length; i++)
    for (let j = i + 1; j < slots.length; j++) {
      totalPairs++;
      if (contrastRatio(slots[i]!.color.rgb, slots[j]!.color.rgb) >= 4.5)
        passPairs++;
    }
  const accessibility = Math.round((passPairs / totalPairs) * 100);

  // Saturation harmony: inverse of std-dev of saturations
  const sats = slots.map((s) => s.color.hsl.s);
  const avgS = sats.reduce((a, b) => a + b, 0) / sats.length;
  const satDev = Math.sqrt(
    sats.reduce((acc, s) => acc + (s - avgS) ** 2, 0) / sats.length,
  );
  const harmony = Math.round(Math.max(0, 100 - satDev * 1.5));

  // Uniqueness: average pairwise OKLab distance, normalised
  let totalDist = 0;
  for (let i = 0; i < slots.length; i++)
    for (let j = i + 1; j < slots.length; j++)
      totalDist += colorDist(slots[i]!.color.rgb, slots[j]!.color.rgb);
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
    anchorHue: 210,
  },
  success: {
    label: "Success",
    description: "Confirmations, completed states, positive actions",
    anchorHue: 145,
  },
  warning: {
    label: "Warning",
    description: "Cautions, pending states, non-critical alerts",
    anchorHue: 42,
  },
  error: {
    label: "Error",
    description: "Destructive actions, validation failures, danger",
    anchorHue: 5,
  },
  neutral: {
    label: "Neutral",
    description: "Disabled states, placeholders, secondary content",
    anchorHue: 0,
  },
  focus: {
    label: "Focus",
    description: "Keyboard focus rings, interactive highlights",
    anchorHue: 0,
  },
};

export function generateUtilityColors(
  slots: { color: { hex: string; rgb: RGB; hsl: HSL } }[],
): UtilityColorSet {
  const avgSat = slots.length
    ? slots.reduce((s, sl) => s + sl.color.hsl.s, 0) / slots.length
    : 60;
  const avgLit = slots.length
    ? slots.reduce((s, sl) => s + sl.color.hsl.l, 0) / slots.length
    : 50;
  const bySat = [...slots].sort((a, b) => b.color.hsl.s - a.color.hsl.s);
  const dominantHue = bySat[0]?.color.hsl.h ?? 210;

  const targetSat = clamp(avgSat * 0.7 + 30, 45, 90);
  const targetLit = clamp(avgLit > 60 ? 42 : avgLit < 35 ? 52 : 47, 40, 58);

  function nudgeAwayFromPalette(hue: number): number {
    if (!slots.length) return hue;
    const nearest = slots.reduce(
      (best, sl) => {
        const d = Math.min(
          Math.abs(sl.color.hsl.h - hue),
          360 - Math.abs(sl.color.hsl.h - hue),
        );
        return d < best.d ? { d, h: sl.color.hsl.h } : best;
      },
      { d: Infinity, h: hue },
    );
    if (nearest.d < 20) {
      const dir = (hue - nearest.h + 360) % 360 > 180 ? -1 : 1;
      return (hue + dir * (20 - nearest.d) + 360) % 360;
    }
    return hue;
  }

  function makeStop(
    hue: number,
    sat: number,
    lit: number,
  ): { hex: string; rgb: RGB; hsl: HSL } {
    const rgb = hslToRgb({ h: hue, s: sat, l: lit });
    return { hex: rgbToHex(rgb), rgb, hsl: { h: hue, s: sat, l: lit } };
  }

  function makeUtility(role: UtilityRole, hue: number): UtilityColor {
    const def = UTILITY_DEFS[role];
    const sat =
      role === "neutral"
        ? clamp(targetSat * 0.18, 6, 20)
        : role === "warning"
          ? clamp(targetSat * 0.9, 55, 88)
          : targetSat;
    const lit =
      role === "warning"
        ? clamp(targetLit + 6, 44, 62)
        : role === "neutral"
          ? clamp(targetLit + 4, 44, 62)
          : targetLit;
    return { ...def, role, color: makeStop(hue, sat, lit), locked: false };
  }

  return {
    info: makeUtility(
      "info",
      nudgeAwayFromPalette(UTILITY_DEFS.info.anchorHue),
    ),
    success: makeUtility(
      "success",
      nudgeAwayFromPalette(UTILITY_DEFS.success.anchorHue),
    ),
    warning: makeUtility(
      "warning",
      nudgeAwayFromPalette(UTILITY_DEFS.warning.anchorHue),
    ),
    error: makeUtility(
      "error",
      nudgeAwayFromPalette(UTILITY_DEFS.error.anchorHue),
    ),
    neutral: makeUtility("neutral", dominantHue),
    focus: makeUtility("focus", nudgeAwayFromPalette((dominantHue + 60) % 360)),
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

// ─── Theme Token Derivation ────────────────────────────────────────────────────

export function deriveThemeTokens(
  slots: { color: { hex: string; rgb: RGB; hsl: HSL } }[],
  utility: UtilityColorSet,
): ThemeTokenSet {
  if (!slots.length)
    return {
      semantic: [],
      utility: {} as ThemeTokenSet["utility"],
      palette: [],
    };

  const byLit = [...slots].sort((a, b) => a.color.hsl.l - b.color.hsl.l);
  const bySat = [...slots].sort((a, b) => b.color.hsl.s - a.color.hsl.s);
  const accentHsl = bySat[0]!.color.hsl;
  const accentDark = rgbToHex(
    hslToRgb({
      h: accentHsl.h,
      s: clamp(accentHsl.s, 55, 95),
      l: clamp(accentHsl.l, 45, 65),
    }),
  );
  const accentLight = rgbToHex(
    hslToRgb({
      h: accentHsl.h,
      s: clamp(accentHsl.s, 55, 85),
      l: clamp(accentHsl.l - 8, 35, 55),
    }),
  );
  const baseHue = byLit[0]!.color.hsl.h;
  const mkN = (l: number, s = 4) => rgbToHex(hslToRgb({ h: baseHue, s, l }));

  const semantic = [
    {
      name: "color-bg",
      light: mkN(98),
      dark: mkN(7),
      description: "Page / canvas background",
    },
    {
      name: "color-bg-subtle",
      light: mkN(94),
      dark: mkN(11),
      description: "Subtle background (stripes, hover)",
    },
    {
      name: "color-surface",
      light: mkN(100),
      dark: mkN(14),
      description: "Card / panel background",
    },
    {
      name: "color-surface-raised",
      light: mkN(100),
      dark: mkN(18),
      description: "Raised surface (popover, tooltip)",
    },
    {
      name: "color-border",
      light: mkN(88),
      dark: mkN(22),
      description: "Default border",
    },
    {
      name: "color-border-strong",
      light: mkN(78),
      dark: mkN(32),
      description: "Strong / focus border",
    },
    {
      name: "color-text",
      light: mkN(9),
      dark: mkN(96),
      description: "Primary text",
    },
    {
      name: "color-text-muted",
      light: mkN(42),
      dark: mkN(58),
      description: "Secondary / muted text",
    },
    {
      name: "color-text-disabled",
      light: mkN(62),
      dark: mkN(38),
      description: "Disabled text",
    },
    {
      name: "color-accent",
      light: accentLight,
      dark: accentDark,
      description: "Brand accent / CTA",
    },
    {
      name: "color-accent-subtle",
      light: `${accentLight}22`,
      dark: `${accentDark}22`,
      description: "Accent tint background",
    },
  ];

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
    const { h, s } = utility[role].color.hsl;
    const base = utility[role].color.hex;
    const light = rgbToHex(
      hslToRgb({
        h,
        s: clamp(s - 10, 30, 85),
        l: role === "warning" ? 38 : 40,
      }),
    );
    const dark = rgbToHex(
      hslToRgb({ h, s: clamp(s, 40, 90), l: role === "warning" ? 52 : 54 }),
    );
    const subtle = rgbToHex(hslToRgb({ h, s: clamp(s * 0.3, 8, 30), l: 93 }));
    utilityTokens[role] = { base, light, dark, subtle };
  }

  return {
    semantic,
    utility: utilityTokens,
    palette: slots.map((sl, i) => ({
      name: `palette-${i + 1}`,
      hex: sl.color.hex,
    })),
  };
}

export function buildThemeCss(tokens: ThemeTokenSet): string {
  const semLight = tokens.semantic
    .map((t) => `  --${t.name}: ${t.light};`)
    .join("\n");
  const semDark = tokens.semantic
    .map((t) => `  --${t.name}: ${t.dark};`)
    .join("\n");
  const utilVars = (mode: "light" | "dark") =>
    Object.entries(tokens.utility)
      .map(
        ([role, v]) =>
          `  --${role}: ${mode === "light" ? v.light : v.dark};\n  --${role}-subtle: ${v.subtle};`,
      )
      .join("\n");
  const palVars = tokens.palette
    .map((p) => `  --${p.name}: ${p.hex};`)
    .join("\n");

  return [
    `/* ─── Light mode (default) ─────────────────── */`,
    `:root {`,
    semLight,
    ``,
    `  /* Utility */`,
    utilVars("light"),
    ``,
    `  /* Palette */`,
    palVars,
    `}`,
    ``,
    `/* ─── Dark mode (auto) ─────────────────────── */`,
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
    `/* ─── Force dark: add class="dark" to <html> ─ */`,
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
          t.name.replace("color-", ""),
          { value: t.light, type: "color", description: t.description },
        ]),
      ),
      dark: Object.fromEntries(
        tokens.semantic.map((t) => [
          t.name.replace("color-", ""),
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
  const utilSection = Object.entries(tokens.utility)
    .map(([role, v]) =>
      [
        `      ${role}: {`,
        `        DEFAULT: '${v.base}',`,
        `        light:   '${v.light}',`,
        `        dark:    '${v.dark}',`,
        `        subtle:  '${v.subtle}',`,
        `      },`,
      ].join("\n"),
    )
    .join("\n");

  const palSection = tokens.palette
    .map((p) => `      '${p.name}': '${p.hex}',`)
    .join("\n");
  const semSection = tokens.semantic
    .map((t) => `      '${t.name.replace("color-", "")}': 'var(--${t.name})',`)
    .join("\n");

  return [
    `// tailwind.config.js`,
    `// Paste the CSS Variables output into your global stylesheet first`,
    `/** @type {import('tailwindcss').Config} */`,
    `module.exports = {`,
    `  theme: {`,
    `    extend: {`,
    `      colors: {`,
    `        // Semantic (CSS var-driven, auto light/dark)`,
    semSection,
    ``,
    `        // Utility colors`,
    utilSection,
    ``,
    `        // Raw palette`,
    palSection,
    `      },`,
    `    },`,
    `  },`,
    `}`,
  ].join("\n");
}
