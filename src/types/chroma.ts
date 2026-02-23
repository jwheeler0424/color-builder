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
  readonly rgb: RGB;
  readonly hsl: HSL;
  a?: number;
}

export interface PaletteSlot {
  /** Stable UUID – used as React key and for drag-reorder identity */
  id: string;
  color: ColorStop;
  locked: boolean;
  /** User-assigned token name. Undefined = auto-named from nearestName() */
  name?: string;
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
  | "random"
  | "matsuda_L"
  | "matsuda_Y"
  | "matsuda_X"
  | "matsuda_T";

export interface HarmonyDef {
  id: HarmonyMode;
  label: string;
  desc: string;
}
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
  /** Parallel to hexes – user token names */
  slotNames?: (string | undefined)[];
  mode: HarmonyMode;
  createdAt: number;
}

// ─── Palette History (persistent snapshots) ───────────────────────────────────

export interface PaletteSnapshot {
  id: string;
  /** Human label, e.g. "Before generate" */
  label: string;
  slots: Array<{ id: string; hex: string; name?: string; locked: boolean }>;
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
    {
      base: string;
      light: string;
      dark: string;
      subtle: string;
      subtleDark: string;
    }
  >;
  palette: { name: string; hex: string }[];
}

// ─── Mixer ────────────────────────────────────────────────────────────────────

export type MixSpace = "oklch" | "hsl" | "rgb";

// ─── Export ───────────────────────────────────────────────────────────────────

export type ExportTab =
  | "hex"
  | "css"
  | "array"
  | "scss"
  | "figma"
  | "tailwind"
  | "svg";

// ─── Brand Compliance ─────────────────────────────────────────────────────────

export interface BrandColor {
  id: string;
  label: string;
  hex: string;
}

// ─── App State ────────────────────────────────────────────────────────────────

export interface ChromaState {
  mode: HarmonyMode;
  count: number;
  seeds: ColorStop[];
  slots: PaletteSlot[];
  history: PaletteSlot[][];
  paletteSnapshots: PaletteSnapshot[];
  recentColors: string[];
  gradient: GradientState;
  seedMode: "influence" | "pin";
  temperature: number;
  pickerHex: string;
  pickerAlpha: number;
  pickerMode: "rgb" | "hsl" | "hsv" | "oklch" | "oklab";
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
  brandColors: BrandColor[];
}

// ─── Store Actions ────────────────────────────────────────────────────────────

export interface ChromaActions {
  setMode: (mode: HarmonyMode) => void;
  setCount: (count: number) => void;
  addSeed: (seed: ColorStop) => void;
  removeSeed: (index: number) => void;
  setSeeds: (seeds: ColorStop[]) => void;
  generate: () => void;
  undo: () => void;
  toggleLock: (index: number) => void;
  editSlotColor: (index: number, color: ColorStop) => void;
  addSlot: (color: ColorStop) => void;
  removeSlot: (index: number) => void;
  reorderSlots: (fromIndex: number, toIndex: number) => void;
  renameSlot: (index: number, name: string | undefined) => void;
  loadPalette: (slots: PaletteSlot[], mode: HarmonyMode, count: number) => void;
  restoreSnapshot: (snap: PaletteSnapshot) => void;
  setSeedMode: (mode: "influence" | "pin") => void;
  setTemperature: (t: number) => void;
  setPickerHex: (hex: string) => void;
  setPickerAlpha: (alpha: number) => void;
  setPickerMode: (mode: ChromaState["pickerMode"]) => void;
  addRecent: (hex: string) => void;
  setGradient: (partial: Partial<GradientState>) => void;
  setScaleHex: (hex: string) => void;
  setScaleName: (name: string) => void;
  setScaleTokenTab: (tab: TokenFormat) => void;
  setConvInput: (input: string) => void;
  setExportTab: (tab: ExportTab) => void;
  openModal: (modal: ChromaState["modal"]) => void;
  closeModal: () => void;
  setSaveName: (name: string) => void;
  setExtracted: (colors: RGB[], imgSrc: string) => void;
  setUtilityColor: (role: UtilityRole, color: ColorStop) => void;
  toggleUtilityLock: (role: UtilityRole) => void;
  regenUtilityColors: () => void;
  addBrandColor: (hex: string, label: string) => void;
  removeBrandColor: (id: string) => void;
  updateBrandColor: (
    id: string,
    patch: Partial<Omit<BrandColor, "id">>,
  ) => void;
}

export type ChromaStore = ChromaState & ChromaActions;
