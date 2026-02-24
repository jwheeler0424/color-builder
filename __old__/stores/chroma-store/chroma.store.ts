import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
  ChromaStore,
  ChromaState,
  PaletteSlot,
  PaletteSnapshot,
  HarmonyMode,
  BrandColor,
} from "@/types";
import {
  generateUtilityColors,
  mergeUtilityColors,
} from "@/lib/utils/color-math.utils";
import {
  genPalette,
  cloneSlot,
  hexToStop,
  decodeUrl,
  savePrefs,
} from "@/lib/utils/palette.utils";

// ─── Slot sanitizer ───────────────────────────────────────────────────────────

function sanitizeSlots(slots: unknown[]): PaletteSlot[] {
  if (!Array.isArray(slots)) return [];
  return slots.flatMap((slot) => {
    if (!slot || typeof slot !== "object") return [];
    const s = slot as Record<string, unknown>;
    const rawHex = (s.color as Record<string, unknown>)?.hex;
    if (typeof rawHex !== "string" || !/^#[0-9a-fA-F]{6,8}$/.test(rawHex))
      return [];
    const rgb = (s.color as Record<string, unknown>)?.rgb as
      | Record<string, unknown>
      | undefined;
    const needsRegen =
      !rgb ||
      typeof rgb.r !== "number" ||
      isNaN(rgb.r as number) ||
      ((rgb.r as number) < 2 && (rgb.g as number) < 2 && (rgb.b as number) < 2);
    const storedA = (s.color as Record<string, unknown>)?.a;
    const alpha = typeof storedA === "number" ? storedA : undefined;
    const color = needsRegen
      ? hexToStop(rawHex, alpha)
      : (s.color as ReturnType<typeof hexToStop>);
    if (alpha !== undefined && color.a === undefined) color.a = alpha;
    // Ensure stable id — old persisted slots may not have one
    const id = typeof s.id === "string" ? s.id : crypto.randomUUID();
    return [
      {
        id,
        color,
        locked: !!s.locked,
        name: typeof s.name === "string" ? s.name : undefined,
      },
    ];
  });
}

// ─── Snapshot helper ──────────────────────────────────────────────────────────

function makeSnapshot(
  slots: PaletteSlot[],
  mode: HarmonyMode,
  label: string,
): PaletteSnapshot {
  return {
    id: crypto.randomUUID(),
    label,
    mode,
    createdAt: Date.now(),
    slots: slots.map((s) => ({
      id: s.id,
      hex: s.color.hex,
      name: s.name,
      locked: s.locked,
    })),
  };
}

// ─── Initial state ────────────────────────────────────────────────────────────

function makeInitialState(): ChromaState {
  const defaultGradient = {
    type: "linear" as const,
    dir: "to right",
    stops: [
      { hex: "#6366f1", pos: 0 },
      { hex: "#ec4899", pos: 100 },
    ],
    selectedStop: 0,
  };
  const SSR_SEEDS = [
    "#6366f1",
    "#ec4899",
    "#f59e0b",
    "#10b981",
    "#3b82f6",
    "#8b5cf6",
  ];
  const mode: HarmonyMode = "analogous";
  const count = 6;
  const slots: PaletteSlot[] = SSR_SEEDS.map((hex) => ({
    id: crypto.randomUUID(),
    color: hexToStop(hex),
    locked: false,
  }));

  return {
    seeds: [],
    history: [],
    paletteSnapshots: [],
    recentColors: [],
    gradient: defaultGradient,
    pickerHex: "#3b82f6",
    pickerAlpha: 100,
    pickerMode: "hsl" as const,
    scaleHex: "#6366f1",
    scaleName: "primary",
    scaleTokenTab: "css",
    convInput: "#e07a5f",
    exportTab: "hex",
    modal: null,
    saveName: "",
    extractedColors: [],
    imgSrc: null,
    mode,
    count,
    slots,
    seedMode: "influence" as const,
    temperature: 0,
    utilityColors: generateUtilityColors(slots),
    brandColors: [],
  };
}

// ─── Store ────────────────────────────────────────────────────────────────────

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
          // Push to in-memory undo history (last 25)
          s.history = [...s.history, s.slots.map(cloneSlot)].slice(-25);
          // Push persistent snapshot (last 50)
          s.paletteSnapshots = [
            makeSnapshot(s.slots as PaletteSlot[], s.mode, "Before generate"),
            ...s.paletteSnapshots,
          ].slice(0, 50);
          const seedHsls = s.seeds.map((seed) => ({ ...seed.hsl }));
          const newColors = genPalette(
            s.mode,
            s.count,
            seedHsls.length ? seedHsls : null,
            s.seedMode,
            s.temperature,
          );
          const seedCount = s.seedMode === "pin" ? s.seeds.length : 0;
          s.slots = newColors.map((color, i) =>
            s.slots[i]?.locked
              ? cloneSlot(s.slots[i])
              : {
                  id: s.slots[i]?.id ?? crypto.randomUUID(),
                  color,
                  locked: i < seedCount,
                  name: undefined,
                },
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
          s.slots.push({ id: crypto.randomUUID(), color, locked: false });
        }),
      removeSlot: (index) =>
        set((s) => {
          s.slots.splice(index, 1);
        }),

      reorderSlots: (fromIndex, toIndex) =>
        set((s) => {
          const moved = s.slots.splice(fromIndex, 1)[0];
          s.slots.splice(toIndex, 0, moved);
        }),

      renameSlot: (index, name) =>
        set((s) => {
          s.slots[index].name = name;
        }),

      loadPalette: (slots, mode, count) =>
        set((s) => {
          s.history = [...s.history, s.slots.map(cloneSlot)].slice(-25);
          s.paletteSnapshots = [
            makeSnapshot(s.slots as PaletteSlot[], s.mode, `Before load`),
            ...s.paletteSnapshots,
          ].slice(0, 50);
          s.slots = slots;
          s.mode = mode;
          s.count = count;
          s.utilityColors = mergeUtilityColors(
            s.utilityColors,
            generateUtilityColors(slots),
          );
        }),

      restoreSnapshot: (snap) =>
        set((s) => {
          s.history = [...s.history, s.slots.map(cloneSlot)].slice(-25);
          s.slots = snap.slots.map((ss) => ({
            id: ss.id,
            color: hexToStop(ss.hex),
            locked: ss.locked,
            name: ss.name,
          }));
          s.mode = snap.mode;
        }),

      // ── Picker ──────────────────────────────────────────────────────────────

      setSeedMode: (mode) =>
        set((s) => {
          s.seedMode = mode;
        }),
      setTemperature: (t) =>
        set((s) => {
          s.temperature = t;
        }),
      setPickerHex: (hex) =>
        set((s) => {
          s.pickerHex = hex;
        }),
      setPickerAlpha: (alpha) =>
        set((s) => {
          s.pickerAlpha = alpha;
        }),
      setPickerMode: (mode) =>
        set((s) => {
          s.pickerMode = mode;
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

      // ── Brand colors ─────────────────────────────────────────────────────────

      addBrandColor: (hex, label) =>
        set((s) => {
          s.brandColors.push({ id: crypto.randomUUID(), hex, label });
        }),
      removeBrandColor: (id) =>
        set((s) => {
          s.brandColors = s.brandColors.filter((b: BrandColor) => b.id !== id);
        }),
      updateBrandColor: (id, patch) =>
        set((s) => {
          const b = s.brandColors.find((b: BrandColor) => b.id === id);
          if (b) Object.assign(b, patch);
        }),
    })),
    {
      name: "chroma-v4",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        mode: state.mode,
        count: state.count,
        seeds: state.seeds,
        slots: state.slots,
        recentColors: state.recentColors,
        gradient: state.gradient,
        seedMode: state.seedMode,
        temperature: state.temperature,
        pickerHex: state.pickerHex,
        pickerAlpha: state.pickerAlpha,
        pickerMode: state.pickerMode,
        scaleHex: state.scaleHex,
        scaleName: state.scaleName,
        scaleTokenTab: state.scaleTokenTab,
        convInput: state.convInput,
        exportTab: state.exportTab,
        utilityColors: state.utilityColors,
        paletteSnapshots: state.paletteSnapshots,
        brandColors: state.brandColors,
      }),
      merge: (persisted, current) => {
        if (decodeUrl()) return current;
        const p = persisted as Partial<ChromaStore>;
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
      version: 3,
      skipHydration: true,
    },
  ),
);
