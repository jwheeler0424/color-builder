import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
  ChromaStore,
  ChromaState,
  PaletteSlot,
  HarmonyMode,
} from "@/types";
import {
  generateUtilityColors,
  mergeUtilityColors,
} from "@/lib/utils/colorMath";
import {
  genPalette,
  cloneSlot,
  hexToStop,
  decodeUrl,
  savePrefs,
} from "@/lib/utils/paletteUtils";

// ─── Slot sanitizer ────────────────────────────────────────────────────────────
// Defends against stale persisted data where rgb values may be 0-1 floats (old
// format) or otherwise corrupt. Re-derives rgb/hsl from the authoritative hex.
function sanitizeSlots(slots: unknown[]): PaletteSlot[] {
  if (!Array.isArray(slots)) return [];
  return slots.flatMap((slot) => {
    if (!slot || typeof slot !== "object") return [];
    const s = slot as Record<string, unknown>;
    const hex = (s.color as Record<string, unknown>)?.hex;
    if (typeof hex !== "string" || !/^#[0-9a-fA-F]{6}$/.test(hex)) return [];
    // Check if rgb values look like 0-1 floats (all < 2) or are missing/NaN
    const rgb = (s.color as Record<string, unknown>)?.rgb as
      | Record<string, unknown>
      | undefined;
    const needsRegen =
      !rgb ||
      typeof rgb.r !== "number" ||
      isNaN(rgb.r as number) ||
      ((rgb.r as number) < 2 && (rgb.g as number) < 2 && (rgb.b as number) < 2);
    const color = needsRegen
      ? hexToStop(hex)
      : (s.color as ReturnType<typeof hexToStop>);
    return [{ color, locked: !!(s as Record<string, unknown>).locked }];
  });
}

// ─── Initial state builder ────────────────────────────────────────────────────

function makeInitialState(): ChromaState {
  const fromUrl = decodeUrl();

  const defaultGradient = {
    type: "linear" as const,
    dir: "to right",
    stops: [
      { hex: "#6366f1", pos: 0 },
      { hex: "#ec4899", pos: 100 },
    ],
    selectedStop: 0,
  };

  const base: Omit<ChromaState, "slots" | "utilityColors" | "mode" | "count"> =
    {
      seeds: [],
      history: [],
      recentColors: [],
      gradient: defaultGradient,
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
    };

  if (fromUrl) {
    const slots: PaletteSlot[] = fromUrl.hexes.map((hex) => ({
      color: hexToStop(hex),
      locked: false,
    }));
    return {
      ...base,
      mode: fromUrl.mode,
      count: fromUrl.hexes.length,
      slots,
      utilityColors: generateUtilityColors(slots),
    };
  }

  const mode: HarmonyMode = "analogous";
  const count = 6;
  const slots = genPalette(mode, count, null).map((color) => ({
    color,
    locked: false,
  }));
  return {
    ...base,
    mode,
    count,
    slots,
    utilityColors: generateUtilityColors(slots),
  };
}

// ─── Zustand store with immer + persist ───────────────────────────────────────

export const useChromaStore = create<ChromaStore>()(
  persist(
    immer((set) => ({
      ...makeInitialState(),

      // ── Palette ─────────────────────────────────────────────────────────────

      setMode: (mode) =>
        set((s) => {
          s.mode = mode;
        }),
      setCount: (count) =>
        set((s) => {
          s.count = count;
        }),
      addSeed: (seed) =>
        set((s) => {
          s.seeds.push(seed);
        }),
      removeSeed: (index) =>
        set((s) => {
          s.seeds.splice(index, 1);
        }),
      setSeeds: (seeds) =>
        set((s) => {
          s.seeds = seeds;
        }),

      generate: () =>
        set((s) => {
          s.history = [...s.history, s.slots.map(cloneSlot)].slice(-25);
          const seedHsls = s.seeds.map((seed) => ({ ...seed.hsl }));
          const newColors = genPalette(
            s.mode,
            s.count,
            seedHsls.length ? seedHsls : null,
          );
          s.slots = newColors.map((color, i) =>
            s.slots[i]?.locked
              ? cloneSlot(s.slots[i])
              : { color, locked: false },
          );
          s.utilityColors = mergeUtilityColors(
            s.utilityColors,
            generateUtilityColors(s.slots),
          );
          savePrefs(s.mode, s.count);
        }),

      undo: () =>
        set((s) => {
          if (!s.history.length) return;
          s.slots = s.history[s.history.length - 1];
          s.history.pop();
        }),

      toggleLock: (index) =>
        set((s) => {
          s.slots[index].locked = !s.slots[index].locked;
        }),
      editSlotColor: (index, color) =>
        set((s) => {
          s.slots[index].color = color;
        }),
      addSlot: (color) =>
        set((s) => {
          s.slots.push({ color, locked: false });
        }),
      removeSlot: (index) =>
        set((s) => {
          s.slots.splice(index, 1);
        }),

      loadPalette: (slots, mode, count) =>
        set((s) => {
          s.history = [...s.history, s.slots.map(cloneSlot)].slice(-25);
          s.slots = slots;
          s.mode = mode;
          s.count = count;
          s.utilityColors = mergeUtilityColors(
            s.utilityColors,
            generateUtilityColors(slots),
          );
        }),

      // ── Picker ──────────────────────────────────────────────────────────────

      setPickerHsl: (hsl) =>
        set((s) => {
          s.pickerHsl = hsl;
        }),
      setPickerAlpha: (alpha) =>
        set((s) => {
          s.pickerAlpha = alpha;
        }),
      addRecent: (hex) =>
        set((s) => {
          s.recentColors = [
            hex,
            ...s.recentColors.filter((x) => x !== hex),
          ].slice(0, 20);
        }),

      // ── Gradient ────────────────────────────────────────────────────────────

      setGradient: (partial) =>
        set((s) => {
          Object.assign(s.gradient, partial);
        }),

      // ── Scale ───────────────────────────────────────────────────────────────

      setScaleHex: (hex) =>
        set((s) => {
          s.scaleHex = hex;
        }),
      setScaleName: (name) =>
        set((s) => {
          s.scaleName = name;
        }),
      setScaleTokenTab: (tab) =>
        set((s) => {
          s.scaleTokenTab = tab;
        }),

      // ── Converter ───────────────────────────────────────────────────────────

      setConvInput: (input) =>
        set((s) => {
          s.convInput = input;
        }),

      // ── Export ──────────────────────────────────────────────────────────────

      setExportTab: (tab) =>
        set((s) => {
          s.exportTab = tab;
        }),

      // ── Modal ───────────────────────────────────────────────────────────────

      openModal: (modal) =>
        set((s) => {
          s.modal = modal;
        }),
      closeModal: () =>
        set((s) => {
          s.modal = null;
        }),
      setSaveName: (name) =>
        set((s) => {
          s.saveName = name;
        }),

      // ── Image extraction ────────────────────────────────────────────────────

      setExtracted: (colors, imgSrc) =>
        set((s) => {
          s.extractedColors = colors;
          s.imgSrc = imgSrc;
        }),

      // ── Utility colors ──────────────────────────────────────────────────────

      setUtilityColor: (role, color) =>
        set((s) => {
          s.utilityColors[role].color = color;
        }),
      toggleUtilityLock: (role) =>
        set((s) => {
          s.utilityColors[role].locked = !s.utilityColors[role].locked;
        }),
      regenUtilityColors: () =>
        set((s) => {
          s.utilityColors = mergeUtilityColors(
            s.utilityColors,
            generateUtilityColors(s.slots),
          );
        }),
    })),
    {
      name: "chroma-v3",
      storage: createJSONStorage(() => localStorage),

      // Persist user data only — exclude ephemeral state
      partialize: (state) => ({
        mode: state.mode,
        count: state.count,
        seeds: state.seeds,
        slots: state.slots,
        recentColors: state.recentColors,
        gradient: state.gradient,
        pickerHsl: state.pickerHsl,
        pickerAlpha: state.pickerAlpha,
        scaleHex: state.scaleHex,
        scaleName: state.scaleName,
        scaleTokenTab: state.scaleTokenTab,
        convInput: state.convInput,
        exportTab: state.exportTab,
        utilityColors: state.utilityColors,
        // Excluded: history, modal, saveName, extractedColors, imgSrc
      }),

      // URL params always win over persisted state
      merge: (persisted, current) => {
        if (decodeUrl()) return current;
        const p = persisted as Partial<ChromaStore>;
        // Sanitize slots on rehydration — guards against stale rgb values from
        // old versions (0–1 float range) that would break all contrast checks
        const slots = p.slots
          ? sanitizeSlots(p.slots as unknown[])
          : current.slots;
        const utilityColors =
          slots !== current.slots
            ? mergeUtilityColors(
                current.utilityColors,
                generateUtilityColors(slots),
              )
            : current.utilityColors;
        return { ...current, ...p, slots, utilityColors };
      },

      version: 1,
    },
  ),
);
