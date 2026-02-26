import type { HarmonyDef, ThemeDef, CBType, GradientPreset } from "@/types";
import { hexToRgb } from "@/lib/utils";
import ColorNames from "./named-colors/color-names.json";

// ─── Harmonies ────────────────────────────────────────────────────────────────

export const HARMONIES: HarmonyDef[] = [
  {
    id: "analogous",
    label: "Analogous",
    desc: "Adjacent hues — harmonious and serene. (Matsuda V template)",
  },
  {
    id: "complementary",
    label: "Complementary",
    desc: "Colors opposite on the wheel — high contrast.",
  },
  {
    id: "split-comp",
    label: "Split-Comp",
    desc: "A base plus two adjacent to its complement.",
  },
  {
    id: "triadic",
    label: "Triadic",
    desc: "Three evenly-spaced hues — vibrant and diverse.",
  },
  {
    id: "tetradic",
    label: "Tetradic",
    desc: "Four hues in two complementary pairs.",
  },
  { id: "square", label: "Square", desc: "Four hues equally spaced at 90°." },
  {
    id: "monochromatic",
    label: "Monochromatic",
    desc: "One hue, varying saturation and lightness.",
  },
  {
    id: "shades",
    label: "Shades & Tints",
    desc: "Deep shadow to bright highlight on one hue.",
  },
  {
    id: "double-split",
    label: "Double Split",
    desc: "Two split-complementary pairs — complex.",
  },
  {
    id: "compound",
    label: "Compound",
    desc: "Near-complementary — sophisticated, nuanced.",
  },
  {
    id: "natural",
    label: "Natural",
    desc: "Muted, organic, naturalistic tones.",
  },
  {
    id: "random",
    label: "Random",
    desc: "Golden-ratio hue stepping — always harmonious.",
  },
  {
    id: "matsuda_L",
    label: "Matsuda L",
    desc: "Large cluster + small accent at 90° — elegant asymmetry.",
  },
  {
    id: "matsuda_Y",
    label: "Matsuda Y",
    desc: "Wide cluster with a single complement accent.",
  },
  {
    id: "matsuda_X",
    label: "Matsuda X",
    desc: "Two opposite clusters — bold complementary spread.",
  },
  {
    id: "matsuda_T",
    label: "Matsuda T",
    desc: "Half-wheel dominance — warm or cool palette.",
  },
];

// ─── Themes ───────────────────────────────────────────────────────────────────

export const THEMES: ThemeDef[] = [
  // ── ANALOGOUS ──────────────────────────────────────────────────────────────
  {
    name: "Forest",
    mode: "analogous",
    seeds: ["#2D5016", "#5C8A3C", "#8FBC5A", "#C8E6A0", "#3D7A4A"],
  },
  {
    name: "Sunset",
    mode: "analogous",
    seeds: ["#FF6B35", "#F7C59F", "#FF4D6D", "#C9184A", "#FFBA08"],
  },
  {
    name: "Ocean Wave",
    mode: "analogous",
    seeds: ["#0077B6", "#00B4D8", "#90E0EF", "#CAF0F8", "#48CAE4"],
  },
  {
    name: "Mystic Night",
    mode: "analogous",
    seeds: ["#10002B", "#240046", "#3C096C", "#7B2FBE", "#E0AAFF"],
  },
  {
    name: "Rose Garden",
    mode: "analogous",
    seeds: ["#FF006E", "#FB5607", "#FFBE0B", "#FF4D6D", "#C9184A"],
  },
  {
    name: "Desert Sand",
    mode: "analogous",
    seeds: ["#C67B3B", "#DDA15E", "#BC6C25", "#FEFAE0", "#606C38"],
  },
  {
    name: "Aurora",
    mode: "analogous",
    seeds: ["#6A0572", "#AB83A1", "#00F5D4", "#00BBF9", "#F15BB5"],
  },
  {
    name: "Harvest",
    mode: "analogous",
    seeds: ["#D62828", "#F77F00", "#FCBF49", "#EAE2B7", "#003049"],
  },
  {
    name: "Cherry Blossom",
    mode: "analogous",
    seeds: ["#FF85A1", "#FFB3C6", "#FF4D6D", "#FFC2D4", "#FFCCD5"],
  },
  {
    name: "Earth",
    mode: "analogous",
    seeds: ["#8B4513", "#A0522D", "#6B4226", "#DEB887", "#C8A47E"],
  },
  {
    name: "Lagoon",
    mode: "analogous",
    seeds: ["#006D5B", "#40826D", "#ACE1AF", "#20B2AA", "#48D1CC"],
  },
  {
    name: "Volcano",
    mode: "analogous",
    seeds: ["#7B0000", "#BF2600", "#E85D04", "#F48C06", "#FFBA08"],
  },
  {
    name: "Sage Meadow",
    mode: "analogous",
    seeds: ["#606C38", "#8A9A5B", "#DDE5B6", "#ADC178", "#A98467"],
  },
  {
    name: "Twilight",
    mode: "analogous",
    seeds: ["#1A1A2E", "#16213E", "#0F3460", "#533483", "#E94560"],
  },
  {
    name: "Coral Reef",
    mode: "analogous",
    seeds: ["#FF6B6B", "#FF8E53", "#FFA552", "#FFD166", "#06D6A0"],
  },
  {
    name: "Lavender Mist",
    mode: "analogous",
    seeds: ["#C8B8E8", "#B392AC", "#E0AFA0", "#D4C5E2", "#957DAD"],
  },
  {
    name: "Jungle",
    mode: "analogous",
    seeds: ["#1B4332", "#2D6A4F", "#52B788", "#95D5B2", "#D8F3DC"],
  },
  {
    name: "Sahara",
    mode: "analogous",
    seeds: ["#C9A84C", "#E8C46A", "#F4E285", "#B5835A", "#8C5E3C"],
  },
  {
    name: "Blueberry",
    mode: "analogous",
    seeds: ["#2B0A3D", "#4A1070", "#7B2D8B", "#A855B5", "#D4A5E0"],
  },
  {
    name: "Seaglass",
    mode: "analogous",
    seeds: ["#70C1B3", "#B2DBBF", "#F3FFBD", "#62929E", "#546A7B"],
  },
  {
    name: "Autumn Leaves",
    mode: "analogous",
    seeds: ["#A50104", "#CC3A00", "#E55B00", "#F19100", "#F9C74F"],
  },
  {
    name: "Arctic",
    mode: "analogous",
    seeds: ["#CAF0F8", "#ADE8F4", "#90E0EF", "#48CAE4", "#023E8A"],
  },
  {
    name: "Rainforest",
    mode: "analogous",
    seeds: ["#004B23", "#006400", "#007200", "#38B000", "#70E000"],
  },
  {
    name: "Dusty Rose",
    mode: "analogous",
    seeds: ["#9E2A2B", "#C9474A", "#E07A7C", "#F2B5B6", "#FAE0E0"],
  },

  // ── COMPLEMENTARY ──────────────────────────────────────────────────────────
  {
    name: "Blue Lagoon",
    mode: "complementary",
    seeds: ["#006994", "#0099CC", "#66CCDD", "#FFDD99", "#FF9944"],
  },
  {
    name: "Cyber",
    mode: "complementary",
    seeds: ["#00F5D4", "#F72585", "#7209B7", "#3A0CA3", "#4CC9F0"],
  },
  {
    name: "Fiesta",
    mode: "complementary",
    seeds: ["#E63946", "#457B9D", "#1D3557", "#F1FAEE", "#A8DADC"],
  },
  {
    name: "Koi Pond",
    mode: "complementary",
    seeds: ["#FF6B35", "#F7C59F", "#006D77", "#83C5BE", "#EDF6F9"],
  },
  {
    name: "Poppy Field",
    mode: "complementary",
    seeds: ["#D62828", "#F77F00", "#2D6A4F", "#52B788"],
  },
  {
    name: "Electric Dreams",
    mode: "complementary",
    seeds: ["#7400B8", "#6930C3", "#56CFE1", "#72EFDD", "#80FFDB"],
  },
  {
    name: "Matcha Strawberry",
    mode: "complementary",
    seeds: ["#D62828", "#E07A5F", "#3D405B", "#81B29A", "#F2CC8F"],
  },
  {
    name: "Dusk",
    mode: "complementary",
    seeds: ["#FF595E", "#FFCA3A", "#6A4C93", "#1982C4", "#8AC926"],
  },

  // ── SPLIT-COMPLEMENTARY ────────────────────────────────────────────────────
  {
    name: "Crashing Wave",
    mode: "split-comp",
    seeds: ["#023E8A", "#0077B6", "#48CAE4", "#ADE8F4", "#90E0EF"],
  },
  {
    name: "Carnival",
    mode: "split-comp",
    seeds: ["#FF0054", "#FF5400", "#FFBD00", "#390099", "#9E0059"],
  },
  {
    name: "Parrot",
    mode: "split-comp",
    seeds: ["#38B000", "#007200", "#FFBE0B", "#FF5400", "#FB5607"],
  },
  {
    name: "Peacock",
    mode: "split-comp",
    seeds: ["#0077B6", "#023E8A", "#F72585", "#FF6B6B", "#FFDD00"],
  },
  {
    name: "Mardi Gras",
    mode: "split-comp",
    seeds: ["#7B2D8B", "#A855B5", "#FFBE0B", "#38B000", "#1E88E5"],
  },

  // ── TRIADIC ────────────────────────────────────────────────────────────────
  {
    name: "Wildflower",
    mode: "triadic",
    seeds: ["#E040FB", "#00E676", "#FFEB3B", "#FF4081", "#40C4FF"],
  },
  {
    name: "Primary Bold",
    mode: "triadic",
    seeds: ["#E63946", "#FFD60A", "#023E8A"],
  },
  {
    name: "Tropic",
    mode: "triadic",
    seeds: ["#FF006E", "#3A86FF", "#FFBE0B", "#8338EC"],
  },
  {
    name: "Bauhaus",
    mode: "triadic",
    seeds: ["#CC0000", "#0033AA", "#FFCC00", "#333333"],
  },
  {
    name: "Arcade",
    mode: "triadic",
    seeds: ["#FF0A54", "#F5A623", "#00D4FF", "#7B2FBE"],
  },
  {
    name: "Citrus",
    mode: "triadic",
    seeds: ["#FF595E", "#FFCA3A", "#8AC926", "#1982C4", "#6A4C93"],
  },

  // ── TETRADIC ───────────────────────────────────────────────────────────────
  {
    name: "Tapestry",
    mode: "tetradic",
    seeds: ["#9B2226", "#AE2012", "#CA6702", "#EE9B00", "#94D2BD", "#0A9396"],
  },
  {
    name: "Prism",
    mode: "tetradic",
    seeds: ["#F72585", "#7209B7", "#3A86FF", "#06D6A0"],
  },
  {
    name: "Bazaar",
    mode: "tetradic",
    seeds: ["#E63946", "#F4A261", "#2A9D8F", "#264653"],
  },
  {
    name: "Stained Glass",
    mode: "tetradic",
    seeds: ["#9B2226", "#005F73", "#EE9B00", "#0A9396", "#AE2012", "#94D2BD"],
  },
  {
    name: "Gemstone",
    mode: "tetradic",
    seeds: ["#E40066", "#FF7B00", "#00B4A0", "#8000FF"],
  },

  // ── SQUARE ─────────────────────────────────────────────────────────────────
  {
    name: "Neon Arcade",
    mode: "square",
    seeds: ["#FF0090", "#FF8C00", "#00FF90", "#00B0FF"],
  },
  {
    name: "Terracotta Sky",
    mode: "square",
    seeds: ["#C1440E", "#FAD02C", "#2C8FD4", "#5FAD56"],
  },
  {
    name: "Jewel Box",
    mode: "square",
    seeds: ["#9B111E", "#003153", "#228B22", "#8B008B"],
  },

  // ── MONOCHROMATIC ──────────────────────────────────────────────────────────
  {
    name: "Stormy",
    mode: "monochromatic",
    seeds: ["#263238", "#37474F", "#546E7A", "#78909C", "#B0BEC5"],
  },
  {
    name: "Midnight Blue",
    mode: "monochromatic",
    seeds: ["#03045E", "#023E8A", "#0077B6", "#0096C7", "#90E0EF"],
  },
  {
    name: "Amethyst",
    mode: "monochromatic",
    seeds: ["#3A0068", "#6A0DA0", "#9B30D9", "#C77DFF", "#E9C8FF"],
  },
  {
    name: "Ember",
    mode: "monochromatic",
    seeds: ["#7B0000", "#B80000", "#E00000", "#FF4D4D", "#FFAAAA"],
  },
  {
    name: "Parchment",
    mode: "monochromatic",
    seeds: ["#5C4033", "#8B6352", "#C8A882", "#E8D5B7", "#FDF6EC"],
  },
  {
    name: "Glacial",
    mode: "monochromatic",
    seeds: ["#D8EFF4", "#A8D4E0", "#7BBECE", "#4FA3BA", "#2980A0"],
  },
  {
    name: "Obsidian",
    mode: "monochromatic",
    seeds: ["#0D0D0D", "#1A1A1A", "#333333", "#666666", "#999999", "#CCCCCC"],
  },
  {
    name: "Olive Press",
    mode: "monochromatic",
    seeds: ["#2C3A1E", "#4A5E32", "#6B8444", "#96B560", "#C0D898"],
  },

  // ── SHADES ─────────────────────────────────────────────────────────────────
  {
    name: "Deep Indigo",
    mode: "shades",
    seeds: ["#1A0050", "#3D00A0", "#6600FF", "#9955FF", "#CCB3FF"],
  },
  {
    name: "Crimson Tide",
    mode: "shades",
    seeds: ["#5C0000", "#8B0000", "#CC0000", "#FF4444", "#FFAAAA"],
  },
  {
    name: "Pine Forest",
    mode: "shades",
    seeds: ["#0A2A0A", "#1B5E20", "#2E7D32", "#4CAF50", "#A5D6A7"],
  },
  {
    name: "Caramel",
    mode: "shades",
    seeds: ["#3E1F00", "#7B3F00", "#C06000", "#E8A040", "#F5D095"],
  },

  // ── DOUBLE SPLIT ───────────────────────────────────────────────────────────
  {
    name: "Tropical",
    mode: "double-split",
    seeds: ["#00B4D8", "#90E0EF", "#FF9F1C", "#FFBF69", "#CBF3F0"],
  },
  {
    name: "Festival",
    mode: "double-split",
    seeds: ["#FF006E", "#8338EC", "#3A86FF", "#FB5607", "#FFBE0B"],
  },
  {
    name: "Hummingbird",
    mode: "double-split",
    seeds: ["#06D6A0", "#118AB2", "#FFD166", "#EF476F"],
  },
  {
    name: "Bonfire",
    mode: "double-split",
    seeds: ["#FF4800", "#FF8500", "#3D405B", "#0B6E4F"],
  },

  // ── COMPOUND ───────────────────────────────────────────────────────────────
  {
    name: "Sandstorm",
    mode: "compound",
    seeds: ["#C67B3B", "#DDA15E", "#BC6C25", "#4A6FA5", "#166088"],
  },
  {
    name: "Fox & Fern",
    mode: "compound",
    seeds: ["#D4572A", "#F4A261", "#3A7D44", "#2D5016"],
  },
  {
    name: "Ember & Snow",
    mode: "compound",
    seeds: ["#BF2600", "#FF5400", "#006994", "#0099CC", "#66CCDD"],
  },
  {
    name: "Velvet",
    mode: "compound",
    seeds: ["#6A0136", "#A10055", "#FF5FAD", "#2B4590", "#4E79D9"],
  },

  // ── NATURAL ────────────────────────────────────────────────────────────────
  {
    name: "Linen",
    mode: "natural",
    seeds: ["#F5ECD7", "#DEB887", "#A0826D", "#7D5A50", "#4A3728"],
  },
  {
    name: "Slate & Moss",
    mode: "natural",
    seeds: ["#4A4E69", "#9A8C98", "#C9ADA7", "#8A9A5B", "#606C38"],
  },
  {
    name: "Driftwood",
    mode: "natural",
    seeds: ["#B5A99A", "#8B7E74", "#6E6259", "#C4B49A", "#E8DCCC"],
  },
  {
    name: "Wetlands",
    mode: "natural",
    seeds: ["#2D4739", "#4A7C59", "#6FAF7E", "#A3C9A8", "#D4E8D3"],
  },
  {
    name: "Clay",
    mode: "natural",
    seeds: ["#7C3A2D", "#A85648", "#C97A6A", "#E8B09A", "#F5D9CB"],
  },
  {
    name: "Fog",
    mode: "natural",
    seeds: ["#B8C0CC", "#9BA8AB", "#7F9396", "#6A828A", "#536B73"],
  },

  // ── MATSUDA L ──────────────────────────────────────────────────────────────
  {
    name: "Ink & Gold",
    mode: "matsuda_L",
    seeds: ["#1A1A2E", "#16213E", "#0F3460", "#E94560", "#FFD700"],
  },
  {
    name: "Verdant",
    mode: "matsuda_L",
    seeds: ["#1B5E20", "#388E3C", "#66BB6A", "#A5D6A7", "#FF7043"],
  },
  {
    name: "Pewter & Blush",
    mode: "matsuda_L",
    seeds: ["#37474F", "#546E7A", "#78909C", "#B0BEC5", "#FF8A80"],
  },

  // ── MATSUDA Y ──────────────────────────────────────────────────────────────
  {
    name: "Horizon",
    mode: "matsuda_Y",
    seeds: ["#0D47A1", "#1565C0", "#1976D2", "#42A5F5", "#FF8F00"],
  },
  {
    name: "Vineyard",
    mode: "matsuda_Y",
    seeds: ["#4A148C", "#6A1B9A", "#7B1FA2", "#AB47BC", "#CDDC39"],
  },
  {
    name: "Saltwater",
    mode: "matsuda_Y",
    seeds: ["#006064", "#00838F", "#00ACC1", "#4DD0E1", "#FF5722"],
  },

  // ── MATSUDA X ──────────────────────────────────────────────────────────────
  {
    name: "Yin & Yang",
    mode: "matsuda_X",
    seeds: ["#1A1A1A", "#333333", "#E0E0E0", "#FFFFFF"],
  },
  {
    name: "Fire & Ice",
    mode: "matsuda_X",
    seeds: ["#BF2600", "#FF5400", "#023E8A", "#0096C7", "#90E0EF"],
  },
  {
    name: "Orchid & Fern",
    mode: "matsuda_X",
    seeds: ["#880E4F", "#C2185B", "#E91E63", "#1B5E20", "#43A047"],
  },

  // ── MATSUDA T ──────────────────────────────────────────────────────────────
  {
    name: "Golden Hour",
    mode: "matsuda_T",
    seeds: ["#FFBA08", "#F77F00", "#E55B00", "#BF2600", "#7B0000"],
  },
  {
    name: "Nordic",
    mode: "matsuda_T",
    seeds: ["#1A2744", "#2E4272", "#4A6FA5", "#A8C4E0", "#D4E8F5"],
  },
  {
    name: "Blossom",
    mode: "matsuda_T",
    seeds: ["#FF006E", "#FF4081", "#FF80AB", "#FFB3C6", "#FFCCD5"],
  },
];

// ─── Color Blindness Types ───────────────────────────────────────────────────

export const CB_TYPES: CBType[] = [
  {
    id: "normal",
    name: "Normal Vision",
    desc: "Full color perception",
    matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
  },
  {
    id: "deuteranopia",
    name: "Deuteranopia",
    desc: "Green-blind · ~6% of males",
    matrix: [0.367, 0.861, -0.228, 0.28, 0.673, 0.047, -0.012, 0.043, 0.969],
  },
  {
    id: "protanopia",
    name: "Protanopia",
    desc: "Red-blind · ~2% of males",
    matrix: [0.152, 1.053, -0.205, 0.115, 0.786, 0.099, -0.004, -0.048, 1.052],
  },
  {
    id: "tritanopia",
    name: "Tritanopia",
    desc: "Blue-yellow blind · ~0.01%",
    matrix: [1.256, -0.077, -0.179, -0.079, 0.931, 0.148, 0.005, 0.691, 0.304],
  },
  {
    id: "achromatopsia",
    name: "Achromatopsia",
    desc: "Complete color blindness · very rare",
    matrix: [0.299, 0.587, 0.114, 0.299, 0.587, 0.114, 0.299, 0.587, 0.114],
  },
  {
    id: "deuteranomaly",
    name: "Deuteranomaly",
    desc: "Reduced green sensitivity · ~5% of males",
    matrix: [0.531, 0.566, -0.097, 0.176, 0.764, 0.06, -0.004, 0.04, 0.964],
  },
];

// ─── Gradient Presets ─────────────────────────────────────────────────────────

export const GRAD_PRESETS: GradientPreset[] = [
  {
    name: "Ocean Breeze",
    type: "linear",
    dir: "to right",
    stops: [
      { hex: "#0077b6", pos: 0 },
      { hex: "#00b4d8", pos: 50 },
      { hex: "#90e0ef", pos: 100 },
    ],
  },
  {
    name: "Sunset Glow",
    type: "linear",
    dir: "to bottom right",
    stops: [
      { hex: "#ff4d6d", pos: 0 },
      { hex: "#ff9f1c", pos: 50 },
      { hex: "#ffbf69", pos: 100 },
    ],
  },
  {
    name: "Midnight",
    type: "linear",
    dir: "to bottom",
    stops: [
      { hex: "#10002b", pos: 0 },
      { hex: "#3c096c", pos: 50 },
      { hex: "#7b2fbe", pos: 100 },
    ],
  },
  {
    name: "Aurora",
    type: "linear",
    dir: "to right",
    stops: [
      { hex: "#00f5d4", pos: 0 },
      { hex: "#00bbf9", pos: 50 },
      { hex: "#f15bb5", pos: 100 },
    ],
  },
  {
    name: "Forest",
    type: "linear",
    dir: "135deg",
    stops: [
      { hex: "#2d5016", pos: 0 },
      { hex: "#5c8a3c", pos: 50 },
      { hex: "#c8e6a0", pos: 100 },
    ],
  },
  {
    name: "Rose Gold",
    type: "radial",
    dir: "",
    stops: [
      { hex: "#b76e79", pos: 0 },
      { hex: "#fad6a5", pos: 100 },
    ],
  },
  {
    name: "Cyber",
    type: "conic",
    dir: "from 0deg",
    stops: [
      { hex: "#7209b7", pos: 0 },
      { hex: "#f72585", pos: 50 },
      { hex: "#00f5d4", pos: 100 },
    ],
  },
];

// ─── Color Names — pre-parsed at module load ──────────────────────────────────

const NAMED_RAW: [string, string][] = ColorNames.map((color) => [
  color.name,
  color.hex,
]);
/* OLD NAMES
[
  ["Crimson", "#DC143C"],
  ["Firebrick", "#B22222"],
  ["Scarlet", "#FF2400"],
  ["Tomato", "#FF6347"],
  ["Coral", "#FF7F50"],
  ["Indian Red", "#CD5C5C"],
  ["Carmine", "#960018"],
  ["Ruby", "#9B111E"],
  ["Raspberry", "#872657"],
  ["Rose", "#FF007F"],
  ["Hot Pink", "#FF69B4"],
  ["Deep Pink", "#FF1493"],
  ["Flamingo", "#FC8EAC"],
  ["Blush", "#DE5D83"],
  ["Cerise", "#DE3163"],
  ["Amaranth", "#E52B50"],
  ["Orange", "#FF8C00"],
  ["Tangerine", "#F28500"],
  ["Amber", "#FFBF00"],
  ["Pumpkin", "#FF7518"],
  ["Burnt Orange", "#CC5500"],
  ["Terracotta", "#C26A49"],
  ["Sienna", "#A0522D"],
  ["Peru", "#CD853F"],
  ["Copper", "#B87333"],
  ["Ochre", "#CC7722"],
  ["Saffron", "#F4C430"],
  ["Apricot", "#FBCEB1"],
  ["Peach", "#FFCBA4"],
  ["Salmon", "#FA8072"],
  ["Yellow", "#FFE600"],
  ["Gold", "#FFD700"],
  ["Goldenrod", "#DAA520"],
  ["Lemon", "#FFF44F"],
  ["Corn", "#FBEC5D"],
  ["Khaki", "#C3B091"],
  ["Sand", "#C2B280"],
  ["Cream", "#FFFDD0"],
  ["Ivory", "#FFFFF0"],
  ["Beige", "#F5F5DC"],
  ["Wheat", "#F5DEB3"],
  ["Green", "#008000"],
  ["Lime", "#00FF00"],
  ["Forest Green", "#228B22"],
  ["Emerald", "#50C878"],
  ["Jade", "#00A86B"],
  ["Mint", "#98FF98"],
  ["Sage", "#8FAE8B"],
  ["Fern", "#4F7942"],
  ["Moss", "#8A9A5B"],
  ["Olive", "#808000"],
  ["Avocado", "#568203"],
  ["Chartreuse", "#7FFF00"],
  ["Spring Green", "#00FF7F"],
  ["Sea Green", "#2E8B57"],
  ["Aquamarine", "#7FFFD4"],
  ["Tea Green", "#D0F0C0"],
  ["Hunter Green", "#355E3B"],
  ["Pine", "#01796F"],
  ["Viridian", "#40826D"],
  ["Teal", "#008080"],
  ["Cyan", "#00FFFF"],
  ["Turquoise", "#40E0D0"],
  ["Dark Turquoise", "#00CED1"],
  ["Cadet Blue", "#5F9EA0"],
  ["Cerulean", "#007BA7"],
  ["Sky Blue", "#87CEEB"],
  ["Verdigris", "#43B3AE"],
  ["Blue", "#0000FF"],
  ["Navy", "#001F5B"],
  ["Royal Blue", "#4169E1"],
  ["Cobalt", "#0047AB"],
  ["Sapphire", "#0F52BA"],
  ["Cornflower Blue", "#6495ED"],
  ["Dodger Blue", "#1E90FF"],
  ["Steel Blue", "#4682B4"],
  ["Slate Blue", "#6A5ACD"],
  ["Denim", "#1560BD"],
  ["Iris", "#5A4FCF"],
  ["Periwinkle", "#CCCCFF"],
  ["Azure", "#007FFF"],
  ["Baby Blue", "#89CFF0"],
  ["Midnight Blue", "#191970"],
  ["Purple", "#800080"],
  ["Violet", "#EE82EE"],
  ["Indigo", "#4B0082"],
  ["Lavender", "#E6E6FA"],
  ["Mauve", "#E0B0FF"],
  ["Plum", "#DDA0DD"],
  ["Orchid", "#DA70D6"],
  ["Fuchsia", "#FF00FF"],
  ["Wisteria", "#C9A0DC"],
  ["Lilac", "#C8A2C8"],
  ["Heliotrope", "#DF73FF"],
  ["Thistle", "#D8BFD8"],
  ["Medium Purple", "#9370DB"],
  ["Rebecca Purple", "#663399"],
  ["Amethyst", "#9966CC"],
  ["Grape", "#6F2DA8"],
  ["Eggplant", "#614051"],
  ["Pink", "#FFC0CB"],
  ["Carnation", "#FFA6C9"],
  ["Bubblegum", "#FE5BAC"],
  ["Watermelon", "#FC6C85"],
  ["Brown", "#8B4513"],
  ["Chocolate", "#D2691E"],
  ["Caramel", "#C68642"],
  ["Tan", "#D2B48C"],
  ["Mocha", "#8B5A2B"],
  ["Coffee", "#6F4E37"],
  ["Espresso", "#4C2C2A"],
  ["Sepia", "#704214"],
  ["Walnut", "#5C3317"],
  ["Chestnut", "#954535"],
  ["Mahogany", "#C04000"],
  ["Rust", "#B7410E"],
  ["Burnt Sienna", "#E97451"],
  ["White", "#FFFFFF"],
  ["Snow", "#FFFAFA"],
  ["Seashell", "#FFF5EE"],
  ["Antique White", "#FAEBD7"],
  ["Light Gray", "#D3D3D3"],
  ["Silver", "#C0C0C0"],
  ["Gray", "#808080"],
  ["Slate Gray", "#708090"],
  ["Dim Gray", "#696969"],
  ["Charcoal", "#36454F"],
  ["Ash", "#B2BEB5"],
  ["Graphite", "#474A51"],
  ["Jet", "#343434"],
  ["Black", "#000000"],
  ["Rose Gold", "#B76E79"],
  ["Champagne", "#FAD6A5"],
  ["Bronze", "#CD7F32"],
  ["Brass", "#B5A642"],
  ["Gunmetal", "#2A3439"],
  ["Celadon", "#ACE1AF"],
  ["Vermilion", "#E34234"],
];
*/

export const NAMED = NAMED_RAW.map(([name, hex]) => ({
  name,
  hex: hex.toLowerCase(),
  rgb: hexToRgb(hex),
}));
