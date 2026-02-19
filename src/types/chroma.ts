// ─── Primitives ───────────────────────────────────────────────────────────────

export interface RGB {
  r: number;
  g: number;
  b: number;
}
export interface HSL {
  h: number;
  s: number;
  l: number;
}
export interface HSV {
  h: number;
  s: number;
  v: number;
}
export interface CMYK {
  c: number;
  m: number;
  y: number;
  k: number;
}
export interface OKLab {
  L: number;
  a: number;
  b: number;
}
export interface OKLCH {
  L: number;
  C: number;
  H: number;
}

// ─── Palette ──────────────────────────────────────────────────────────────────

export interface ColorStop {
  hex: string;
  rgb: RGB;
  hsl: HSL;
}

export interface PaletteSlot {
  color: ColorStop;
  locked: boolean;
}

export type HarmonyMode =
  | "analogous"
  | "complementary"
  | "split-comp"
  | "triadic"
  | "tetradic"
  | "square"
  | "monochromatic"
  | "shades"
  | "double-split"
  | "compound"
  | "natural"
  | "random";

export interface HarmonyDef {
  id: HarmonyMode;
  label: string;
  desc: string;
}

// ─── Themes ───────────────────────────────────────────────────────────────────

export interface ThemeDef {
  name: string;
  mode: HarmonyMode;
  seeds: string[];
}

// ─── Gradient ─────────────────────────────────────────────────────────────────

export type GradientType = "linear" | "radial" | "conic";

export interface GradientStop {
  hex: string;
  pos: number;
}

export interface GradientState {
  type: GradientType;
  dir: string;
  stops: GradientStop[];
  selectedStop: number;
}

export interface GradientPreset {
  name: string;
  type: GradientType;
  dir: string;
  stops: GradientStop[];
}

// ─── Color Blindness ─────────────────────────────────────────────────────────

export interface CBType {
  id: string;
  name: string;
  desc: string;
  matrix: number[];
}

// ─── Scale ────────────────────────────────────────────────────────────────────

export interface ScaleEntry {
  step: number;
  hex: string;
  rgb: RGB;
  hsl: HSL;
}

export type TokenFormat = "css" | "js" | "tailwind" | "json";

// ─── Saved ────────────────────────────────────────────────────────────────────

export interface SavedPalette {
  id: string;
  name: string;
  hexes: string[];
  mode: HarmonyMode;
  createdAt: number;
}

// ─── Utility Colors ───────────────────────────────────────────────────────────

export type UtilityRole =
  | "info"
  | "success"
  | "warning"
  | "error"
  | "neutral"
  | "focus";

export interface UtilityColor {
  role: UtilityRole;
  label: string;
  description: string;
  /** Semantic hue anchor the generator targets (degrees) */
  anchorHue: number;
  color: ColorStop;
  locked: boolean;
}

export type UtilityColorSet = Record<UtilityRole, UtilityColor>;

// ─── Theme Tokens ─────────────────────────────────────────────────────────────

export interface SemanticToken {
  name: string;
  light: string;
  dark: string;
  description: string;
}

export interface ThemeTokenSet {
  semantic: SemanticToken[];
  utility: Record<
    UtilityRole,
    { base: string; light: string; dark: string; subtle: string }
  >;
  palette: { name: string; hex: string }[];
}

// ─── App Views ────────────────────────────────────────────────────────────────

export type ViewId =
  | "pal"
  | "pick"
  | "scale"
  | "sim"
  | "grad"
  | "conv"
  | "a11y"
  | "img"
  | "saved"
  | "contrast"
  | "mixer"
  | "scoring"
  | "preview"
  | "utility"
  | "theme";

// ─── Mixer ────────────────────────────────────────────────────────────────────

export type MixSpace = "oklch" | "hsl" | "rgb";

export interface MixerColor {
  hex: string;
  rgb: RGB;
}

// ─── Export tabs ──────────────────────────────────────────────────────────────

export type ExportTab = "hex" | "css" | "array" | "scss" | "figma" | "tailwind";

// ─── App State ────────────────────────────────────────────────────────────────

export interface ChromaState {
  view: ViewId;
  mode: HarmonyMode;
  count: number;
  seeds: ColorStop[];
  slots: PaletteSlot[];
  history: PaletteSlot[][];
  recentColors: string[];
  gradient: GradientState;
  pickerHsl: HSL;
  pickerAlpha: number;
  scaleHex: string;
  scaleName: string;
  scaleTokenTab: TokenFormat;
  convInput: string;
  exportTab: ExportTab;
  modal: "export" | "share" | "save" | "shortcuts" | null;
  saveName: string;
  extractedColors: RGB[];
  imgSrc: string | null;
  utilityColors: UtilityColorSet;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export type ChromaAction =
  | { type: "SET_VIEW"; view: ViewId }
  | { type: "SET_MODE"; mode: HarmonyMode }
  | { type: "SET_COUNT"; count: number }
  | { type: "ADD_SEED"; seed: ColorStop }
  | { type: "REMOVE_SEED"; index: number }
  | { type: "SET_SEEDS"; seeds: ColorStop[] }
  | { type: "GENERATE" }
  | { type: "UNDO" }
  | { type: "TOGGLE_LOCK"; index: number }
  | { type: "EDIT_SLOT_COLOR"; index: number; color: ColorStop }
  | { type: "ADD_SLOT"; color: ColorStop }
  | { type: "REMOVE_SLOT"; index: number }
  | { type: "SET_PICKER_HSL"; hsl: HSL }
  | { type: "SET_PICKER_ALPHA"; alpha: number }
  | { type: "ADD_RECENT"; hex: string }
  | { type: "SET_GRADIENT"; gradient: Partial<GradientState> }
  | { type: "SET_SCALE_HEX"; hex: string }
  | { type: "SET_SCALE_NAME"; name: string }
  | { type: "SET_SCALE_TOKEN_TAB"; tab: TokenFormat }
  | { type: "SET_CONV_INPUT"; input: string }
  | { type: "SET_EXPORT_TAB"; tab: ExportTab }
  | { type: "OPEN_MODAL"; modal: ChromaState["modal"] }
  | { type: "CLOSE_MODAL" }
  | { type: "SET_SAVE_NAME"; name: string }
  | { type: "SET_EXTRACTED"; colors: RGB[]; imgSrc: string }
  | {
      type: "LOAD_PALETTE";
      slots: PaletteSlot[];
      mode: HarmonyMode;
      count: number;
    }
  | { type: "SET_UTILITY_COLOR"; role: UtilityRole; color: ColorStop }
  | { type: "TOGGLE_UTILITY_LOCK"; role: UtilityRole }
  | { type: "REGEN_UTILITY_COLORS" };
