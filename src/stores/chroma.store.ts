import { castDraft } from 'immer';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import type {
  ChromaStore,
  ChromaState,
  PaletteSlot,
  PaletteSnapshot,
  HarmonyMode,
  BrandColor,
  ColorStop,
} from '@/types';

import { MAX_SLOTS } from '@/lib/constants/chroma';
import {
  OKLAB,
  UTILITY_ROLES,
  composePalette,
  colorValue,
  colorToStop,
  cloneSlot,
  hexToStop,
  generateUtilityColors,
  mergeUtilityColors,
  parseColor,
  regenerateUtilityColors,
  renderColor,
  stopToColor,
} from '@/lib/engine/browser';
import { computeColorPalette } from '@/lib/engine/runtime/palette-runtime';
import { decodeUrl, savePrefs } from '@/lib/utils/palette.utils';

let generationController: AbortController | undefined;

function paletteValues(slots: readonly PaletteSlot[]) {
  return slots.map((slot) => slot.color.value ?? parseColor(slot.color.hex));
}

function mergeUtilityLocks(
  slots: readonly PaletteSlot[],
  colors: ChromaState['utilityColors'],
  locks: ChromaState['utilityLocks'],
) {
  return mergeUtilityColors(
    colors,
    generateUtilityColors(paletteValues(slots)),
    new Set(UTILITY_ROLES.filter((role) => locks[role])),
  );
}

function generationSignature(state: ChromaState): string {
  return JSON.stringify([
    state.slots,
    state.seeds,
    state.mode,
    state.count,
    state.seedMode,
    state.temperature,
    state.paletteSpace,
    state.displayGamut,
    state.utilityColors,
  ]);
}

function findClosestPaletteIndex(color: ColorStop, palette: ColorStop[]) {
  const lab = OKLAB.xyzToLab(stopToColor(color).xyz);
  let bestIndex = 0;
  let bestDist = Infinity;

  for (let i = 0; i < palette.length; i++) {
    const d = OKLAB.distance(lab, OKLAB.xyzToLab(stopToColor(palette[i]).xyz));
    if (d < bestDist) {
      bestDist = d;
      bestIndex = i;
    }
  }

  return bestIndex;
}

// ─── Slot sanitizer ───────────────────────────────────────────────────────────

function sanitizeSlots(slots: unknown[]): PaletteSlot[] {
  if (!Array.isArray(slots)) return [];
  return slots.flatMap((slot) => {
    if (!slot || typeof slot !== 'object') return [];
    const s = slot as Record<string, unknown>;
    const raw = s.color as ColorStop | undefined;
    if (!raw || (!raw.value && typeof raw.hex !== 'string')) return [];
    let color: ColorStop;
    try {
      color = colorToStop(stopToColor(raw));
    } catch {
      return [];
    }
    // Ensure stable id — old persisted slots may not have one
    const id = typeof s.id === 'string' ? s.id : crypto.randomUUID();
    return [
      {
        id,
        color,
        locked: !!s.locked,
        name: typeof s.name === 'string' ? s.name : undefined,
      },
    ];
  });
}

// ─── Snapshot helper ──────────────────────────────────────────────────────────

function makeSnapshot(slots: PaletteSlot[], mode: HarmonyMode, label: string): PaletteSnapshot {
  return {
    id: crypto.randomUUID(),
    label,
    mode,
    createdAt: Date.now(),
    slots: slots.map((s) => ({
      id: s.id,
      hex: s.color.hex,
      color: colorToStop(stopToColor(s.color)),
      name: s.name,
      locked: s.locked,
    })),
  };
}

// ─── Initial state ────────────────────────────────────────────────────────────

function makeInitialState(): ChromaState {
  const defaultGradient = {
    type: 'linear' as const,
    dir: 'to right',
    stops: [
      { hex: '#6366f1', pos: 0 },
      { hex: '#ec4899', pos: 100 },
    ],
    selectedStop: 0,
  };
  const SSR_SEEDS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];
  const mode: HarmonyMode = 'analogous';
  const count = 6;
  const slots: PaletteSlot[] = SSR_SEEDS.map((hex) => ({
    id: crypto.randomUUID(),
    color: hexToStop(hex),
    locked: false,
  }));

  return {
    paletteSpace: 'cam16',
    displayGamut: 'srgb',
    generationPending: false,
    generationError: null,
    seeds: [],
    history: [],
    paletteSnapshots: [],
    recentColors: [],
    hoverSlot: null,
    gradient: defaultGradient,
    pickerHex: '#3b82f6',
    pickerAlpha: 100,
    pickerMode: 'hsl' as const,
    scaleHex: '#6366f1',
    scaleName: 'primary',
    scaleTokenTab: 'css',
    convInput: '#e07a5f',
    exportTab: 'hex',
    modal: null,
    saveName: '',
    extractedColors: [],
    imgSrc: null,
    mode,
    count,
    slots,
    seedMode: 'influence' as const,
    temperature: 0,
    utilityColors: generateUtilityColors(paletteValues(slots)),
    utilityLocks: Object.fromEntries(
      UTILITY_ROLES.map((role) => [role, false]),
    ) as ChromaState['utilityLocks'],
    brandColors: [],
  };
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useChromaStore = create<ChromaStore>()(
  persist(
    immer((set, get) => ({
      ...makeInitialState(),
      setPaletteSpace: (space) =>
        set((state) => {
          state.paletteSpace = space;
        }),
      setDisplayGamut: (display) =>
        set((state) => {
          state.displayGamut = display;
        }),

      // ── Palette ─────────────────────────────────────────────────────────────

      setMode: (mode) =>
        set((s) => {
          s.mode = mode;
        }),
      setCount: (count) =>
        set((s) => {
          s.count = count;
        }),
      setHoverSlot: (slot: number | null) =>
        set((s) => {
          s.hoverSlot = slot;
        }),
      addSeed: (seed) =>
        set((s) => {
          s.seeds.push(castDraft(seed));
        }),
      removeSeed: (index) =>
        set((s) => {
          s.seeds.splice(index, 1);
        }),
      setSeeds: (seeds) =>
        set((s) => {
          s.seeds = castDraft(seeds);
        }),
      insertSlot: (atIndex: number) => {
        set((state) => {
          const slots = state.slots;
          if (slots.length >= MAX_SLOTS) return;

          const { mode, temperature } = state;

          const palette = composePalette({
            harmony: mode,
            count: MAX_SLOTS,
            seeds: slots.map((slot) => stopToColor(slot.color)),
            seedMode: 'influence',
            temperature,
          }).map(colorToStop);

          // Project slots onto palette
          const paletteIndexes = slots.map((slot) => findClosestPaletteIndex(slot.color, palette));

          const leftIndex = atIndex > 0 ? paletteIndexes[atIndex - 1] : -1;

          const rightIndex =
            atIndex < paletteIndexes.length ? paletteIndexes[atIndex] : palette.length;

          const candidates = [];

          for (let i = leftIndex + 1; i < rightIndex; i++) {
            const color = palette[i];

            if (!slots.some((slot) => slot.color.hex === color.hex)) {
              candidates.push(color);
            }
          }

          if (!candidates.length) return;

          const newColor = candidates[Math.floor(Math.random() * candidates.length)];

          const newSlot: PaletteSlot = {
            id: crypto.randomUUID(),
            color: newColor,
            locked: false,
          };

          const next = [...slots];
          next.splice(atIndex, 0, castDraft(newSlot));

          return { slots: next };
        });
      },
      generate: () => {
        generationController?.abort();
        const controller = new AbortController();
        generationController = controller;
        const current = get();
        const signature = generationSignature(current);
        const locked = current.slots.flatMap((slot, index) =>
          slot.locked && index < current.count ? [{ index, color: stopToColor(slot.color) }] : [],
        );
        set((state) => {
          state.generationPending = true;
          state.generationError = null;
        });
        void computeColorPalette(
          {
            harmony: current.mode,
            count: current.count,
            seeds: current.seeds.map(stopToColor),
            seedMode: current.seedMode,
            temperature: current.temperature,
            space: current.paletteSpace,
            display: current.displayGamut,
            locked,
          },
          controller.signal,
        )
          .then((values) => {
            if (controller.signal.aborted) return;
            if (generationSignature(get()) !== signature) {
              set((state) => {
                state.generationPending = false;
              });
              return;
            }
            set((state) => {
              state.history = castDraft([...state.history, state.slots.map(cloneSlot)].slice(-25));
              state.paletteSnapshots = castDraft(
                [
                  makeSnapshot(state.slots, state.mode, 'Before generate'),
                  ...state.paletteSnapshots,
                ].slice(0, 50),
              );
              const seedCount = state.seedMode === 'pin' ? state.seeds.length : 0;
              let pinned = 0;
              state.slots = castDraft(
                values.map((value, index) =>
                  state.slots[index]?.locked
                    ? cloneSlot(state.slots[index])
                    : {
                        id: state.slots[index]?.id ?? crypto.randomUUID(),
                        color: colorToStop(value),
                        locked: pinned++ < seedCount,
                      },
                ),
              );
              state.utilityColors = castDraft(
                mergeUtilityLocks(state.slots, state.utilityColors, state.utilityLocks),
              );
              state.generationPending = false;
              savePrefs(state.mode, state.count);
            });
          })
          .catch((error: unknown) => {
            if (controller.signal.aborted) return;
            set((state) => {
              state.generationPending = false;
              state.generationError =
                error instanceof Error ? error.message : 'Palette generation failed.';
            });
          });
      },

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
          s.slots[index].color = castDraft(color);
        }),
      addSlot: (color, index) =>
        set((s) => {
          if (index === undefined) {
            s.slots.push({
              id: crypto.randomUUID(),
              color: castDraft(color),
              locked: false,
            });
            return;
          }

          s.slots.splice(index, 0, {
            id: crypto.randomUUID(),
            color: castDraft(color),
            locked: false,
          });
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
          s.history = castDraft([...s.history, s.slots.map(cloneSlot)].slice(-25));
          s.paletteSnapshots = castDraft(
            [
              makeSnapshot(s.slots as PaletteSlot[], s.mode, `Before load`),
              ...s.paletteSnapshots,
            ].slice(0, 50),
          );
          s.slots = castDraft(slots);
          s.mode = mode;
          s.count = count;
          s.utilityColors = castDraft(mergeUtilityLocks(slots, s.utilityColors, s.utilityLocks));
        }),

      restoreSnapshot: (snap) =>
        set((s) => {
          s.history = castDraft([...s.history, s.slots.map(cloneSlot)].slice(-25));
          s.slots = castDraft(
            snap.slots.map((ss) => ({
              id: ss.id,
              color: ss.color ? colorToStop(stopToColor(ss.color)) : hexToStop(ss.hex),
              locked: ss.locked,
              name: ss.name,
            })),
          );
          s.mode = snap.mode;
          s.count = s.slots.length;
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
          s.recentColors = [hex, ...s.recentColors.filter((x) => x !== hex)].slice(0, 20);
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
          s.extractedColors = castDraft(colors);
          s.imgSrc = imgSrc;
        }),

      // ── Utility colors ──────────────────────────────────────────────────────

      setUtilityColor: (role, color) =>
        set((s) => {
          const rendition = renderColor(color);
          s.utilityColors[role] = castDraft({
            ...s.utilityColors[role],
            hex: rendition.hex,
            value: color,
          });
        }),
      toggleUtilityLock: (role) =>
        set((s) => {
          s.utilityLocks[role] = !s.utilityLocks[role];
        }),
      regenUtilityColors: () =>
        set((s) => {
          s.utilityColors = castDraft(
            regenerateUtilityColors(
              paletteValues(s.slots),
              s.utilityColors,
              new Set(UTILITY_ROLES.filter((role) => s.utilityLocks[role])),
            ),
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
      name: 'chroma-v4',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        paletteSpace: state.paletteSpace,
        displayGamut: state.displayGamut,
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
        utilityLocks: state.utilityLocks,
        paletteSnapshots: state.paletteSnapshots,
        brandColors: state.brandColors,
      }),
      merge: (persisted, current) => {
        if (decodeUrl()) return current;
        const p = persisted as Partial<ChromaStore>;
        const slots = p.slots ? sanitizeSlots(p.slots as unknown[]) : current.slots;
        const utilityColors = generateUtilityColors(paletteValues(slots));
        const utilityLocks = Object.fromEntries(
          UTILITY_ROLES.map((role) => [role, false]),
        ) as ChromaState['utilityLocks'];
        for (const role of Object.keys(utilityColors) as Array<keyof typeof utilityColors>) {
          const stored = p.utilityColors?.[role] as
            | (ChromaState['utilityColors'][typeof role] & {
                locked?: boolean;
                color?: ColorStop;
              })
            | undefined;
          if (!stored) continue;
          try {
            const rawValue = stored.value ?? stored.color?.value;
            const value = rawValue
              ? colorValue(rawValue.xyz, rawValue.alpha, rawValue.display)
              : parseColor(stored.hex ?? stored.color?.hex ?? utilityColors[role].hex);
            utilityColors[role] = { ...utilityColors[role], value, hex: renderColor(value).hex };
            utilityLocks[role] = !!stored.locked;
          } catch {
            continue;
          }
        }
        const seeds = sanitizeSlots((p.seeds ?? current.seeds).map((color) => ({ color }))).map(
          (slot) => slot.color,
        );
        return { ...current, ...p, slots, seeds, utilityColors, utilityLocks };
      },
      migrate: (persisted) => persisted as Partial<ChromaStore>,
      version: 4,
      skipHydration: true,
    },
  ),
);
