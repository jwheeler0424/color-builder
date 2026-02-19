import { useReducer, useCallback } from "react";
import type {
  ChromaState,
  ChromaAction,
  PaletteSlot,
  UtilityColorSet,
} from "@/types";
import {
  generateUtilityColors,
  mergeUtilityColors,
} from "@/lib/utils/colorMath";
import { genPalette, cloneSlot, hexToStop } from "@/lib/utils/paletteUtils";
import { savePrefs, decodeUrl } from "@/lib/utils/paletteUtils";

// ─── Default utility colors (neutral fallback before palette exists) ──────────

function defaultUtilityColors(): UtilityColorSet {
  return generateUtilityColors([]);
}

// ─── Initial State ────────────────────────────────────────────────────────────

function makeInitialState(): ChromaState {
  const fromUrl = decodeUrl();

  const defaultState: ChromaState = {
    view: "pal",
    mode: "analogous",
    count: 6,
    seeds: [],
    slots: [],
    history: [],
    recentColors: [],
    gradient: {
      type: "linear",
      dir: "to right",
      stops: [
        { hex: "#6366f1", pos: 0 },
        { hex: "#ec4899", pos: 100 },
      ],
      selectedStop: 0,
    },
    pickerHsl: { h: 210, s: 80, l: 55 },
    pickerAlpha: 100,
    scaleHex: "#6366f1",
    scaleName: "primary",
    scaleTokenTab: "css",
    convInput: "#e07a5f",
    exportTab: "hex",
    modal: null,
    saveName: "",
    extractedColors: [],
    imgSrc: null,
    utilityColors: defaultUtilityColors(),
  };

  if (fromUrl) {
    const slots: PaletteSlot[] = fromUrl.hexes.map((hex) => ({
      color: hexToStop(hex),
      locked: false,
    }));
    const utilityColors = generateUtilityColors(slots);
    return {
      ...defaultState,
      mode: fromUrl.mode,
      count: fromUrl.hexes.length,
      slots,
      utilityColors,
    };
  }

  // Generate initial palette + utility colors
  const colors = genPalette(defaultState.mode, defaultState.count, null);
  const slots: PaletteSlot[] = colors.map((color) => ({
    color,
    locked: false,
  }));
  const utilityColors = generateUtilityColors(slots);
  return { ...defaultState, slots, utilityColors };
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reducer(state: ChromaState, action: ChromaAction): ChromaState {
  switch (action.type) {
    case "SET_VIEW":
      return { ...state, view: action.view };

    case "SET_MODE":
      return { ...state, mode: action.mode };

    case "SET_COUNT":
      return { ...state, count: action.count };

    case "ADD_SEED":
      return { ...state, seeds: [...state.seeds, action.seed] };

    case "REMOVE_SEED":
      return {
        ...state,
        seeds: state.seeds.filter((_, i) => i !== action.index),
      };

    case "SET_SEEDS":
      return { ...state, seeds: action.seeds };

    case "GENERATE": {
      const history = [...state.history, state.slots.map(cloneSlot)].slice(-25);
      const seedHsls = state.seeds.map((s) => ({ ...s.hsl }));
      const colors = genPalette(
        state.mode,
        state.count,
        seedHsls.length ? seedHsls : null,
      );
      const slots = colors.map((color, i) => {
        const prev = state.slots[i];
        return prev?.locked ? prev : { color, locked: false };
      });
      // Re-derive utility colors from new palette, respecting any locked ones
      const generated = generateUtilityColors(slots);
      const utilityColors = mergeUtilityColors(state.utilityColors, generated);
      savePrefs(state.mode, state.count);
      return { ...state, history, slots, utilityColors };
    }

    case "UNDO": {
      if (!state.history.length) return state;
      const history = state.history.slice(0, -1);
      const slots = state.history[state.history.length - 1]!;
      return { ...state, history, slots };
    }

    case "TOGGLE_LOCK": {
      const slots = state.slots.map((slot, i) =>
        i === action.index ? { ...slot, locked: !slot.locked } : slot,
      );
      return { ...state, slots };
    }

    case "EDIT_SLOT_COLOR": {
      const slots = state.slots.map((slot, i) =>
        i === action.index ? { ...slot, color: action.color } : slot,
      );
      return { ...state, slots };
    }

    case "ADD_SLOT": {
      const newSlot: PaletteSlot = { color: action.color, locked: false };
      return { ...state, slots: [...state.slots, newSlot] };
    }

    case "REMOVE_SLOT": {
      const slots = state.slots.filter((_, i) => i !== action.index);
      return { ...state, slots };
    }

    case "SET_PICKER_HSL":
      return { ...state, pickerHsl: action.hsl };

    case "SET_PICKER_ALPHA":
      return { ...state, pickerAlpha: action.alpha };

    case "ADD_RECENT": {
      const recentColors = [
        action.hex,
        ...state.recentColors.filter((x) => x !== action.hex),
      ].slice(0, 20);
      return { ...state, recentColors };
    }

    case "SET_GRADIENT":
      return { ...state, gradient: { ...state.gradient, ...action.gradient } };

    case "SET_SCALE_HEX":
      return { ...state, scaleHex: action.hex };

    case "SET_SCALE_NAME":
      return { ...state, scaleName: action.name };

    case "SET_SCALE_TOKEN_TAB":
      return { ...state, scaleTokenTab: action.tab };

    case "SET_CONV_INPUT":
      return { ...state, convInput: action.input };

    case "SET_EXPORT_TAB":
      return { ...state, exportTab: action.tab };

    case "OPEN_MODAL":
      return { ...state, modal: action.modal };

    case "CLOSE_MODAL":
      return { ...state, modal: null };

    case "SET_SAVE_NAME":
      return { ...state, saveName: action.name };

    case "SET_EXTRACTED":
      return {
        ...state,
        extractedColors: action.colors,
        imgSrc: action.imgSrc,
      };

    case "LOAD_PALETTE": {
      const history = [...state.history, state.slots.map(cloneSlot)].slice(-25);
      const generated = generateUtilityColors(action.slots);
      const utilityColors = mergeUtilityColors(state.utilityColors, generated);
      return {
        ...state,
        history,
        slots: action.slots,
        mode: action.mode,
        count: action.count,
        utilityColors,
      };
    }

    case "SET_UTILITY_COLOR": {
      const utilityColors = {
        ...state.utilityColors,
        [action.role]: {
          ...state.utilityColors[action.role],
          color: action.color,
        },
      };
      return { ...state, utilityColors };
    }

    case "TOGGLE_UTILITY_LOCK": {
      const utilityColors = {
        ...state.utilityColors,
        [action.role]: {
          ...state.utilityColors[action.role],
          locked: !state.utilityColors[action.role].locked,
        },
      };
      return { ...state, utilityColors };
    }

    case "REGEN_UTILITY_COLORS": {
      // Re-generate only unlocked roles
      const generated = generateUtilityColors(state.slots);
      const utilityColors = mergeUtilityColors(state.utilityColors, generated);
      return { ...state, utilityColors };
    }

    default:
      return state;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useChromaStore() {
  const [state, dispatch] = useReducer(reducer, undefined, makeInitialState);

  const generate = useCallback(() => dispatch({ type: "GENERATE" }), []);
  const undo = useCallback(() => dispatch({ type: "UNDO" }), []);

  return { state, dispatch, generate, undo };
}
