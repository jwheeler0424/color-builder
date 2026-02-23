import React, { useState, useCallback, useRef, useMemo } from "react";
import type { PaletteSlot } from "@/types";
import {
  cn,
  textColor,
  hexToRgb,
  parseHex,
  rgbToHsl,
  nearestName,
  hexToStop,
} from "@/lib/utils";
import { HARMONIES, THEMES } from "@/lib/constants/chroma";
import { useChromaStore } from "@/hooks/use-chroma-store";
import { useRegisterHotkey } from "@/providers/hotkey.provider";
import { Button } from "@/components/ui/button";
import ColorPickerModal from "@/components/modals/color-picker.modal";

// ─── Slot component ───────────────────────────────────────────────────────────

interface SlotProps {
  slot: PaletteSlot;
  index: number;
  isDragging: boolean;
  isDragOver: boolean;
  onEdit: (i: number) => void;
  onDragStart: (i: number, e: React.DragEvent) => void;
  onDragOver: (i: number, e: React.DragEvent) => void;
  onDrop: (i: number) => void;
  onDragEnd: () => void;
}

function PaletteSlotComponent({
  slot,
  index,
  isDragging,
  isDragOver,
  onEdit,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: SlotProps) {
  const { toggleLock, renameSlot } = useChromaStore();
  const [toastVisible, setToastVisible] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  const rgb = useMemo(() => hexToRgb(slot.color.hex), [slot.color.hex]);
  const hsl = useMemo(() => rgbToHsl(rgb), [rgb]);
  const tc = useMemo(() => textColor(rgb), [rgb]);
  const autoName = useMemo(() => nearestName(rgb), [rgb]);
  const displayName = slot.name || autoName;

  const bg =
    slot.color.a !== undefined && slot.color.a < 100
      ? `rgba(${rgb.r},${rgb.g},${rgb.b},${(slot.color.a / 100).toFixed(2)})`
      : slot.color.hex;

  const handleCopy = () => {
    navigator.clipboard.writeText(slot.color.hex).catch(() => {});
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 1100);
  };

  const startNameEdit = () => {
    setNameInput(slot.name || "");
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.select(), 0);
  };

  const commitName = () => {
    const trimmed = nameInput.trim();
    renameSlot(index, trimmed || undefined);
    setEditingName(false);
  };

  return (
    <div
      className={cn(
        "slot-item flex flex-col justify-end p-3 relative group cursor-grab select-none",
        isDragOver && "ring-2 ring-inset ring-white/60",
        isDragging && "opacity-40",
      )}
      style={{ background: bg }}
      draggable
      onDragStart={(e) => onDragStart(index, e)}
      onDragOver={(e) => onDragOver(index, e)}
      onDrop={() => onDrop(index)}
      onDragEnd={onDragEnd}
      onDoubleClick={() => onEdit(index)}
    >
      {/* Copied toast */}
      {toastVisible && (
        <div className="toast-anim absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/90 text-white text-[11px] px-3 py-1 rounded pointer-events-none whitespace-nowrap z-10">
          Copied!
        </div>
      )}

      {/* Action buttons */}
      <div className="slot-acts absolute top-2.5 right-2 flex flex-col gap-1 opacity-0 transition-opacity duration-100">
        <button
          className="w-[26px] h-[26px] rounded border-none bg-black/45 backdrop-blur flex items-center justify-center text-[12px] cursor-pointer transition-all hover:bg-black/70 hover:scale-105"
          style={{ color: slot.locked ? "var(--color-primary)" : tc }}
          onClick={() => toggleLock(index)}
          title={slot.locked ? "Unlock" : "Lock"}
        >
          {slot.locked ? "🔒" : "🔓"}
        </button>
        <button
          className="w-[26px] h-[26px] rounded border-none bg-black/45 backdrop-blur flex items-center justify-center text-[12px] cursor-pointer transition-all hover:bg-black/70 hover:scale-105"
          style={{ color: tc }}
          onClick={() => onEdit(index)}
          title="Edit color"
        >
          ✏️
        </button>
        <button
          className="w-[26px] h-[26px] rounded border-none bg-black/45 backdrop-blur flex items-center justify-center text-[12px] cursor-pointer transition-all hover:bg-black/70 hover:scale-105"
          style={{ color: tc }}
          onClick={handleCopy}
          title="Copy hex"
        >
          📋
        </button>
      </div>

      {/* Color info */}
      <div className="flex flex-col gap-0.5">
        {/* Token name — click to edit */}
        {editingName ? (
          <input
            ref={nameInputRef}
            className="font-display text-[10px] font-semibold bg-black/30 border border-white/30 rounded px-1 text-white outline-none w-full"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitName();
              if (e.key === "Escape") setEditingName(false);
            }}
            placeholder={autoName}
            maxLength={32}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div
            className="font-display text-[10px] font-semibold opacity-70 cursor-text hover:opacity-100 transition-opacity"
            style={{ color: tc }}
            title="Click to rename token"
            onClick={(e) => {
              e.stopPropagation();
              startNameEdit();
            }}
          >
            {displayName}
            {slot.name && <span className="ml-1 opacity-40">✎</span>}
          </div>
        )}

        <div
          className="font-mono text-[12px] font-bold tracking-[.06em] uppercase cursor-pointer"
          style={{ color: tc }}
          onClick={handleCopy}
        >
          {slot.color.hex.toUpperCase()}
        </div>
        <div className="text-[10px] opacity-55" style={{ color: tc }}>
          {Math.round(hsl.h)}° {Math.round(hsl.s)}% {Math.round(hsl.l)}%
          {slot.color.a !== undefined && slot.color.a < 100 && (
            <> · {slot.color.a}%</>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Section helpers ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] tracking-[.1em] uppercase text-muted-foreground mb-2.5 font-display font-semibold">
      {children}
    </div>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-3.5 border-b border-border">{children}</div>;
}

// ─── Main View ────────────────────────────────────────────────────────────────

export default function PaletteView() {
  const {
    slots,
    seeds,
    count,
    mode,
    seedMode,
    temperature,
    generate,
    undo,
    setMode,
    setCount,
    addSeed,
    removeSeed,
    setSeeds,
    editSlotColor,
    setSeedMode,
    setTemperature,
    reorderSlots,
    openModal,
  } = useChromaStore();

  const [seedInp, setSeedInp] = useState("");
  const [seedErr, setSeedErr] = useState(false);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [editingSeed, setEditingSeed] = useState<number | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  // ── Generate debounce ──────────────────────────────────────────────────────
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedGenerate = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => generate(), 180);
  }, [generate]);

  // ── Hotkeys ────────────────────────────────────────────────────────────────
  useRegisterHotkey({
    key: "space",
    label: "Generate palette",
    group: "Palette",
    handler: generate,
  });
  useRegisterHotkey({
    key: "z",
    ctrl: true,
    label: "Undo last generate",
    group: "Palette",
    handler: undo,
  });
  useRegisterHotkey({
    key: "?",
    label: "Show keyboard shortcuts",
    group: "App",
    handler: () => openModal("shortcuts"),
  });
  useRegisterHotkey({
    key: "e",
    ctrl: true,
    label: "Open export",
    group: "App",
    handler: () => openModal("export"),
  });
  useRegisterHotkey({
    key: "s",
    ctrl: true,
    shift: true,
    label: "Save palette",
    group: "Palette",
    handler: () => openModal("save"),
  });

  // ── Drag-to-reorder ────────────────────────────────────────────────────────
  const handleDragStart = useCallback((index: number, e: React.DragEvent) => {
    setDragFrom(index);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((index: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(index);
  }, []);

  const handleDrop = useCallback(
    (toIndex: number) => {
      if (dragFrom !== null && dragFrom !== toIndex) {
        reorderSlots(dragFrom, toIndex);
      }
      setDragFrom(null);
      setDragOver(null);
    },
    [dragFrom, reorderSlots],
  );

  const handleDragEnd = useCallback(() => {
    setDragFrom(null);
    setDragOver(null);
  }, []);

  // ── Seed input ─────────────────────────────────────────────────────────────
  const handleAddSeed = useCallback(() => {
    const hex = parseHex(seedInp);
    if (!hex) {
      setSeedErr(true);
      setTimeout(() => setSeedErr(false), 600);
      return;
    }
    addSeed(hexToStop(hex));
    setSeedInp("");
  }, [seedInp, addSeed]);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* ── Color strip ── */}
      <div className="flex flex-1 overflow-hidden">
        {slots.map((slot, i) => (
          <PaletteSlotComponent
            key={slot.id}
            slot={slot}
            index={i}
            isDragging={dragFrom === i}
            isDragOver={dragOver === i}
            onEdit={setEditingSlot}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
          />
        ))}
      </div>

      {/* ── Slot picker modal ── */}
      {editingSlot !== null && slots[editingSlot] && (
        <ColorPickerModal
          initialHex={slots[editingSlot].color.hex}
          title={`Slot ${editingSlot + 1} — ${slots[editingSlot].name || nearestName(hexToRgb(slots[editingSlot].color.hex))}`}
          onApply={(hex) => {
            editSlotColor(editingSlot, hexToStop(hex));
            setEditingSlot(null);
          }}
          onClose={() => setEditingSlot(null)}
        />
      )}

      {/* ── Seed picker modal ── */}
      {editingSeed !== null && seeds[editingSeed] && (
        <ColorPickerModal
          initialHex={seeds[editingSeed].hex}
          title={`Seed ${editingSeed + 1} — ${nearestName(hexToRgb(seeds[editingSeed].hex))}`}
          onApply={(hex) => {
            setSeeds(
              seeds.map((s, i) => (i === editingSeed ? hexToStop(hex) : s)),
            );
            setEditingSeed(null);
          }}
          onClose={() => setEditingSeed(null)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className="w-[320px] bg-card border-l border-border flex flex-col overflow-hidden flex-shrink-0">
        <div className="flex-1 overflow-y-auto [scrollbar-width:thin]">
          {/* Count */}
          <Section>
            <SectionLabel>Colors</SectionLabel>
            <div className="flex items-center gap-2.5">
              <div className="font-display text-[22px] font-black text-primary min-w-[26px] text-center">
                {count}
              </div>
              <input
                type="range"
                min={4}
                max={12}
                value={count}
                onChange={(e) => {
                  setCount(+e.target.value);
                  debouncedGenerate();
                }}
                className="flex-1"
              />
              <span className="text-[10px] text-muted-foreground">12</span>
            </div>
          </Section>

          {/* Themes */}
          <Section>
            <SectionLabel>Themes</SectionLabel>
            <div className="grid grid-cols-2 gap-1.5">
              {THEMES.map((t, i) => (
                <div
                  key={i}
                  className="rounded overflow-hidden cursor-pointer border border-border hover:border-input transition-colors"
                  title={t.name}
                  onClick={() => {
                    setMode(t.mode);
                    setSeeds(t.seeds.map((h) => hexToStop(h.toLowerCase())));
                    generate();
                  }}
                >
                  <div className="h-8 flex">
                    {t.seeds.slice(0, 5).map((h, j) => (
                      <div
                        key={j}
                        className="flex-1"
                        style={{ background: h }}
                      />
                    ))}
                  </div>
                  <div className="px-2 py-1.5 bg-secondary font-display text-[11px] font-semibold text-secondary-foreground">
                    {t.name}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Seeds */}
          <Section>
            <SectionLabel>Seed Colors</SectionLabel>
            <div className="flex flex-col gap-1 mb-2">
              {seeds.map((s, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div
                    className="w-[18px] h-[18px] rounded-sm border border-white/10 flex-shrink-0 cursor-pointer"
                    style={{ background: s.hex }}
                    title="Click to edit"
                    onClick={() => setEditingSeed(i)}
                  />
                  <span
                    className="flex-1 text-[10px] tracking-[.05em] uppercase text-secondary-foreground cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => setEditingSeed(i)}
                  >
                    {s.hex.toUpperCase()}
                  </span>
                  <button
                    className="bg-transparent border-none text-muted-foreground hover:text-destructive text-sm leading-none cursor-pointer transition-colors"
                    onClick={() => removeSeed(i)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-1.5">
              <input
                className={cn(
                  "flex-1 bg-muted border rounded px-2 py-1.5 text-[11px] text-foreground font-mono",
                  "outline-none focus:border-ring transition-colors placeholder:text-muted-foreground",
                  seedErr ? "border-destructive" : "border-border",
                )}
                value={seedInp}
                onChange={(e) => setSeedInp(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddSeed()}
                placeholder="#F4A261"
                maxLength={7}
                spellCheck={false}
                autoComplete="off"
              />
              <Button variant="ghost" size="sm" onClick={handleAddSeed}>
                + Add
              </Button>
            </div>
          </Section>

          {/* Seed behavior */}
          <Section>
            <SectionLabel>Seed Behavior</SectionLabel>
            <div className="flex gap-1 mb-2">
              {(
                [
                  {
                    id: "influence",
                    label: "Influence",
                    title:
                      "Seed hue guides generation — exact color not forced",
                  },
                  {
                    id: "pin",
                    label: "Pin",
                    title: "Seed color appears verbatim as a locked slot",
                  },
                ] as const
              ).map(({ id, label, title }) => (
                <Button
                  key={id}
                  variant={seedMode === id ? "default" : "ghost"}
                  size="sm"
                  title={title}
                  onClick={() => setSeedMode(id)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <p className="text-[9.5px] text-muted-foreground leading-relaxed">
              {seedMode === "pin"
                ? "Seed colors appear exactly in the palette as locked slots."
                : "Seed hue guides generation but the exact color may shift."}
            </p>
          </Section>

          {/* Temperature */}
          <Section>
            <SectionLabel>
              Temperature{" "}
              <span className="font-normal text-muted-foreground">
                {temperature < -0.2
                  ? "❄ Cool"
                  : temperature > 0.2
                    ? "🌅 Warm"
                    : "⚪ Neutral"}
              </span>
            </SectionLabel>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-muted-foreground">❄</span>
              <input
                type="range"
                min={-100}
                max={100}
                value={Math.round(temperature * 100)}
                onChange={(e) => {
                  setTemperature(+e.target.value / 100);
                  debouncedGenerate();
                }}
                className="flex-1"
              />
              <span className="text-[9px] text-muted-foreground">🌅</span>
            </div>
          </Section>

          {/* Harmony */}
          <Section>
            <SectionLabel>Harmony</SectionLabel>
            <p className="text-[11px] text-muted-foreground mb-2 leading-relaxed min-h-[2.4em]">
              {HARMONIES.find((h) => h.id === mode)?.desc || ""}
            </p>
            <div className="grid grid-cols-2 gap-1">
              {HARMONIES.map((h) => (
                <button
                  key={h.id}
                  onClick={() => {
                    setMode(h.id);
                    generate();
                  }}
                  className={cn(
                    "px-2 py-1.5 rounded border text-[11px] font-mono cursor-pointer text-left transition-all",
                    mode === h.id
                      ? "bg-primary border-primary text-primary-foreground font-bold"
                      : "bg-secondary border-border text-muted-foreground hover:border-input hover:text-foreground",
                  )}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </Section>

          {/* Slot names tip */}
          <Section>
            <SectionLabel>Token Names</SectionLabel>
            <p className="text-[9.5px] text-muted-foreground leading-relaxed">
              Click any color name in the strip above to rename it as a design
              token. Drag slots to reorder.
            </p>
          </Section>

          {/* Preview strip */}
          {slots.length > 0 && (
            <Section>
              <SectionLabel>Preview</SectionLabel>
              <div className="flex h-[22px] rounded overflow-hidden gap-0.5 mt-2">
                {slots.map((s) => (
                  <div
                    key={s.id}
                    className="flex-1"
                    style={{ background: s.color.hex }}
                  />
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* Generate bar */}
        <div className="px-4 py-3 border-t border-border bg-card flex-shrink-0">
          <Button
            variant="default"
            className="w-full py-2.5 text-[12px]"
            onClick={generate}
          >
            ⟳ Generate
          </Button>
          <p className="text-[10px] text-muted-foreground text-center mt-1.5">
            <kbd>Space</kbd> generate · <kbd>Ctrl+Z</kbd> undo · <kbd>?</kbd>{" "}
            shortcuts
          </p>
        </div>
      </aside>
    </div>
  );
}
