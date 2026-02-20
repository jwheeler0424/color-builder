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

// ─── OKLab → linear RGB → sRGB (shared kernel) ────────────────────────────────

function oklabToRgb({ L, a, b }: OKLab): RGB {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
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
  const bl = clamp(
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
    0,
    1,
  );
  return {
    r: Math.round(fromLinear(rl) * 255),
    g: Math.round(fromLinear(gl) * 255),
    b: Math.round(fromLinear(bl) * 255),
  };
}

// ─── OKLCH round-trip ─────────────────────────────────────────────────────────

export function rgbToOklch(rgb: RGB): OKLCH {
  const { L, a, b } = rgbToOklab(rgb);
  const C = Math.sqrt(a * a + b * b);
  const H = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  return { L, C, H };
}

/** Convert OKLCH → sRGB, clamping out-of-gamut via chroma bisection (CSS Color 4 algorithm).
 *  Keeps hue and lightness stable; reduces C until the RGB result is in [0,255]. */
export function oklchToRgb(lch: OKLCH): RGB {
  // Shortcut: achromatic or L at extremes
  if (lch.C < 0.0001) {
    const v = Math.round(fromLinear(clamp(lch.L * lch.L * lch.L, 0, 1)) * 255);
    return { r: clamp(v, 0, 255), g: clamp(v, 0, 255), b: clamp(v, 0, 255) };
  }
  if (lch.L >= 1) return { r: 255, g: 255, b: 255 };
  if (lch.L <= 0) return { r: 0, g: 0, b: 0 };

  const hRad = (lch.H * Math.PI) / 180;
  const lab: OKLab = {
    L: lch.L,
    a: lch.C * Math.cos(hRad),
    b: lch.C * Math.sin(hRad),
  };
  const rgb = oklabToRgb(lab);

  // In gamut — return directly
  if (
    rgb.r >= 0 &&
    rgb.r <= 255 &&
    rgb.g >= 0 &&
    rgb.g <= 255 &&
    rgb.b >= 0 &&
    rgb.b <= 255
  ) {
    return rgb;
  }

  // Binary-search chroma reduction (CSS Color 4 §10.9 algorithm)
  let lo = 0,
    hi = lch.C;
  const eps = 0.0001;
  for (let i = 0; i < 32; i++) {
    const mid = (lo + hi) / 2;
    if (hi - lo < eps) break;
    const midLab: OKLab = {
      L: lch.L,
      a: mid * Math.cos(hRad),
      b: mid * Math.sin(hRad),
    };
    const t = oklabToRgb(midLab);
    const inGamut =
      t.r >= 0 &&
      t.r <= 255 &&
      t.g >= 0 &&
      t.g <= 255 &&
      t.b >= 0 &&
      t.b <= 255;
    if (inGamut) lo = mid;
    else hi = mid;
  }
  const finalLab: OKLab = {
    L: lch.L,
    a: lo * Math.cos(hRad),
    b: lo * Math.sin(hRad),
  };
  return oklabToRgb(finalLab);
}

// ─── Interpolate two colors in OKLab space (perceptually uniform) ─────────────
export function mixOklab(a: RGB, b: RGB, t: number): RGB {
  const la = rgbToOklab(a),
    lb = rgbToOklab(b);
  const mixed: OKLab = {
    L: la.L + (lb.L - la.L) * t,
    a: la.a + (lb.a - la.a) * t,
    b: la.b + (lb.b - la.b) * t,
  };
  return oklabToRgb(mixed);
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
    r: clamp(Math.round(+m[1]), 0, 255),
    g: clamp(Math.round(+m[2]), 0, 255),
    b: clamp(Math.round(+m[3]), 0, 255),
  };
}

export function parseHslStr(s: string): RGB | null {
  const m = s.match(/hsla?\(\s*([\d.]+)[,\s]\s*([\d.]+)%?[,\s]\s*([\d.]+)%?/);
  if (!m) return null;
  return hslToRgb({
    h: +m[1] % 360,
    s: clamp(+m[2], 0, 100),
    l: clamp(+m[3], 0, 100),
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
      fromLinear(clamp(M[0] * R + M[1] * G + M[2] * B, 0, 1)) * 255,
    ),
    g: Math.round(
      fromLinear(clamp(M[3] * R + M[4] * G + M[5] * B, 0, 1)) * 255,
    ),
    b: Math.round(
      fromLinear(clamp(M[6] * R + M[7] * G + M[8] * B, 0, 1)) * 255,
    ),
  };
}

// ─── Scale Generation ─────────────────────────────────────────────────────────

export const SCALE_STEPS = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
];

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
    (h, i) => (hues[(i + 1) % hues.length] - h + 360) % 360,
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
      if (contrastRatio(slots[i].color.rgb, slots[j].color.rgb) >= 4.5)
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
      totalDist += colorDist(slots[i].color.rgb, slots[j].color.rgb);
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
  // Derive palette character in OKLCH
  const oklchSlots = slots.map((s) => rgbToOklch(s.color.rgb));
  const avgL = oklchSlots.length
    ? oklchSlots.reduce((a, c) => a + c.L, 0) / oklchSlots.length
    : 0.55;
  const avgC = oklchSlots.length
    ? oklchSlots.reduce((a, c) => a + c.C, 0) / oklchSlots.length
    : 0.12;

  // Derive primary: highest-chroma slot
  const primary = oklchSlots.reduce(
    (best, c, _i) => (c.C > (best?.C ?? 0) ? c : best),
    oklchSlots[0] ?? { L: 0.55, C: 0.15, H: 230 },
  );

  // Target lightness/chroma for utility colors — slightly lower L than palette average for
  // semantic distinction; chroma is strong but sRGB-clamped
  const targetL = clamp(
    avgL > 0.65 ? 0.52 : avgL < 0.35 ? 0.58 : 0.55,
    0.46,
    0.62,
  );
  const targetC = clamp(avgC * 0.8 + 0.07, 0.1, 0.22);

  /** Nudge hue away from palette hues by up to 18° to avoid clash */
  function nudgeHue(h: number): number {
    if (!oklchSlots.length) return h;
    const nearest = oklchSlots.reduce(
      (best, c) => {
        const d = Math.min(Math.abs(c.H - h), 360 - Math.abs(c.H - h));
        return d < best.d ? { d, h: c.H } : best;
      },
      { d: Infinity, h },
    );
    if (nearest.d < 18) {
      const dir = (h - nearest.h + 360) % 360 > 180 ? -1 : 1;
      return (h + dir * (18 - nearest.d) + 360) % 360;
    }
    return h;
  }

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

  return {
    info: makeUtility(
      "info",
      targetL,
      targetC,
      nudgeHue(UTILITY_DEFS.info.anchorHue),
    ),
    success: makeUtility(
      "success",
      targetL,
      targetC,
      nudgeHue(UTILITY_DEFS.success.anchorHue),
    ),
    warning: makeUtility(
      "warning",
      targetL + 0.06,
      clamp(targetC * 1.2, 0.1, 0.2),
      nudgeHue(UTILITY_DEFS.warning.anchorHue),
    ),
    error: makeUtility(
      "error",
      targetL,
      clamp(targetC * 1.1, 0.12, 0.24),
      nudgeHue(UTILITY_DEFS.error.anchorHue),
    ),
    neutral: makeUtility(
      "neutral",
      targetL + 0.04,
      clamp(primary.C * 0.08, 0.01, 0.04),
      primary.H,
    ),

    // Focus = primary palette color, lightness normalised to ~0.62 for ring visibility
    focus: makeUtility(
      "focus",
      clamp(primary.L, 0.55, 0.72),
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
  slots: { color: { hex: string; rgb: RGB; hsl: HSL } }[],
  utility: UtilityColorSet,
): ThemeTokenSet {
  if (!slots.length)
    return {
      semantic: [],
      utility: {} as ThemeTokenSet["utility"],
      palette: [],
    };

  // ── Palette analysis in OKLCH ──────────────────────────────────────────────
  const oklchSlots = slots.map((s) => rgbToOklch(s.color.rgb));

  // Primary: highest chroma — the "brand" color
  const primaryIdx = oklchSlots.reduce(
    (bi, c, i) => (c.C > oklchSlots[bi].C ? i : bi),
    0,
  );
  const primaryLch = oklchSlots[primaryIdx];

  // Secondary: highest chroma excluding primary, or next slot
  const secondaryIdx = oklchSlots.reduce(
    (bi, c, i) =>
      i !== primaryIdx && c.C > (bi < 0 ? 0 : oklchSlots[bi].C) ? i : bi,
    primaryIdx === 0 ? 1 : 0,
  );
  const secondaryLch = oklchSlots[secondaryIdx] ?? primaryLch;

  // Dominant hue for chromatic neutrals (carries the palette character)
  const dominantH = primaryLch.H;
  // Chromatic neutral chroma: very subtle tint — ~0.008–0.014 (shadcn uses ~0.006–0.012)
  const tintC = clamp(primaryLch.C * 0.06, 0.006, 0.016);

  // ── OKLCH neutral builder ─────────────────────────────────────────────────
  /** Make a near-neutral (low-chroma) color at a given perceived lightness */
  function mkN(L: number, C = tintC): string {
    return rgbToHex(oklchToRgb({ L: clamp(L, 0.01, 0.99), C, H: dominantH }));
  }

  // ── Primary accent tokens ─────────────────────────────────────────────────
  // Light mode primary: vivid, at L≈0.30 (dark enough to read on white bg)
  const primaryLight = rgbToHex(
    oklchToRgb({
      L: clamp(primaryLch.L, 0.22, 0.38),
      C: clamp(primaryLch.C, 0.14, 0.32),
      H: primaryLch.H,
    }),
  );
  // Dark mode primary: lighter version, L≈0.75 (legible on dark bg)
  const primaryDark = rgbToHex(
    oklchToRgb({
      L: clamp(primaryLch.L + 0.35, 0.6, 0.85),
      C: clamp(primaryLch.C * 0.85, 0.1, 0.28),
      H: primaryLch.H,
    }),
  );
  // Foreground on primary: always high contrast
  const primaryFgLight = mkN(0.98, 0.005);
  const primaryFgDark = mkN(0.12, 0.01);

  // ── Secondary tokens ─────────────────────────────────────────────────────
  const secondaryLight = mkN(0.96); // light bg, near-white with tint
  const secondaryDark = mkN(0.2); // dark bg, elevated surface
  const secondaryFgLight = mkN(0.15);
  const secondaryFgDark = mkN(0.95);

  // ── Accent (same as primary, slightly shifted) ────────────────────────────
  const accentLight = rgbToHex(
    oklchToRgb({
      L: 0.94,
      C: clamp(primaryLch.C * 0.4, 0.04, 0.12),
      H: primaryLch.H,
    }),
  );
  const accentDark = rgbToHex(
    oklchToRgb({
      L: 0.26,
      C: clamp(primaryLch.C * 0.4, 0.04, 0.1),
      H: primaryLch.H,
    }),
  );
  const accentFgLight = primaryLight;
  const accentFgDark = primaryDark;

  // ── Destructive = error utility ───────────────────────────────────────────
  const errLch = rgbToOklch(utility.error.color.rgb);
  const destructiveLight = rgbToHex(
    oklchToRgb({
      L: clamp(errLch.L, 0.44, 0.56),
      C: clamp(errLch.C, 0.18, 0.28),
      H: errLch.H,
    }),
  );
  const destructiveDark = rgbToHex(
    oklchToRgb({
      L: clamp(errLch.L + 0.08, 0.52, 0.68),
      C: clamp(errLch.C * 0.9, 0.14, 0.26),
      H: errLch.H,
    }),
  );

  // ── Ring (focus ring) = focus utility = primary ───────────────────────────
  const ringLight = primaryLight;
  const ringDark = primaryDark;

  const semantic = [
    // ── Page background / foreground ──────────────────────────────────────
    {
      name: "--background",
      light: mkN(0.99),
      dark: mkN(0.07),
      description: "Page / canvas background",
    },
    {
      name: "--foreground",
      light: mkN(0.1),
      dark: mkN(0.96),
      description: "Default text color",
    },

    // ── Card ─────────────────────────────────────────────────────────────
    {
      name: "--card",
      light: mkN(1.0),
      dark: mkN(0.11),
      description: "Card background",
    },
    {
      name: "--card-foreground",
      light: mkN(0.1),
      dark: mkN(0.96),
      description: "Card text",
    },

    // ── Popover ──────────────────────────────────────────────────────────
    {
      name: "--popover",
      light: mkN(1.0),
      dark: mkN(0.15),
      description: "Popover / tooltip background",
    },
    {
      name: "--popover-foreground",
      light: mkN(0.1),
      dark: mkN(0.96),
      description: "Popover text",
    },

    // ── Primary brand ────────────────────────────────────────────────────
    {
      name: "--primary",
      light: primaryLight,
      dark: primaryDark,
      description: "Primary brand / CTA color",
    },
    {
      name: "--primary-foreground",
      light: primaryFgLight,
      dark: primaryFgDark,
      description: "Text on primary",
    },

    // ── Secondary ────────────────────────────────────────────────────────
    {
      name: "--secondary",
      light: secondaryLight,
      dark: secondaryDark,
      description: "Secondary / muted action color",
    },
    {
      name: "--secondary-foreground",
      light: secondaryFgLight,
      dark: secondaryFgDark,
      description: "Text on secondary",
    },

    // ── Muted ────────────────────────────────────────────────────────────
    {
      name: "--muted",
      light: mkN(0.95),
      dark: mkN(0.2),
      description: "Muted / disabled background",
    },
    {
      name: "--muted-foreground",
      light: mkN(0.44),
      dark: mkN(0.6),
      description: "Muted / placeholder text",
    },

    // ── Accent ───────────────────────────────────────────────────────────
    {
      name: "--accent",
      light: accentLight,
      dark: accentDark,
      description: "Accent tint (hover states, highlights)",
    },
    {
      name: "--accent-foreground",
      light: accentFgLight,
      dark: accentFgDark,
      description: "Text on accent",
    },

    // ── Destructive ──────────────────────────────────────────────────────
    {
      name: "--destructive",
      light: destructiveLight,
      dark: destructiveDark,
      description: "Destructive action (delete, error)",
    },
    {
      name: "--destructive-foreground",
      light: mkN(0.98, 0.005),
      dark: mkN(0.98, 0.005),
      description: "Text on destructive",
    },

    // ── Borders / inputs ─────────────────────────────────────────────────
    {
      name: "--border",
      light: mkN(0.88),
      dark: mkN(0.24),
      description: "Default border",
    },
    {
      name: "--input",
      light: mkN(0.88),
      dark: mkN(0.22),
      description: "Input border",
    },

    // ── Focus ring = primary ──────────────────────────────────────────────
    {
      name: "--ring",
      light: ringLight,
      dark: ringDark,
      description: "Focus ring (matches primary brand color)",
    },

    // ── Extended (not in shadcn core, useful additions) ──────────────────
    {
      name: "--bg-subtle",
      light: mkN(0.95),
      dark: mkN(0.1),
      description: "Subtle alt background (stripes, well)",
    },
    {
      name: "--surface-raised",
      light: mkN(1.0),
      dark: mkN(0.18),
      description: "Raised surface above card (tooltip, dropdown)",
    },
    {
      name: "--text-disabled",
      light: mkN(0.64),
      dark: mkN(0.38),
      description: "Disabled / placeholder text",
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
    // Light mode: slightly darker/more saturated for readability on white
    const light = rgbToHex(
      oklchToRgb({
        L: clamp(lch.L - 0.06, 0.36, 0.52),
        C: clamp(lch.C, 0.1, 0.24),
        H: lch.H,
      }),
    );
    // Dark mode: lighter for readability on dark backgrounds
    const dark = rgbToHex(
      oklchToRgb({
        L: clamp(lch.L + 0.06, 0.52, 0.72),
        C: clamp(lch.C * 0.9, 0.09, 0.22),
        H: lch.H,
      }),
    );
    // Subtle: very low chroma at high lightness — for alert backgrounds
    const subtle = rgbToHex(
      oklchToRgb({ L: 0.94, C: clamp(lch.C * 0.35, 0.02, 0.08), H: lch.H }),
    );
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
  // tokens.semantic[*].name already includes the -- prefix
  const semLight = tokens.semantic
    .map((t) => `  ${t.name}: ${t.light};`)
    .join("\n");
  const semDark = tokens.semantic
    .map((t) => `  ${t.name}: ${t.dark};`)
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
    .map((t) => {
      const key = t.name.replace(/^--/, "");
      return `      '${key}': 'var(${t.name})',`;
    })
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
