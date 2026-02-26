/**
 * generate-controls.tsx  — Phase 2 layout component
 *
 * All palette generation controls extracted from palette-view.tsx:
 *   - Color count slider
 *   - Theme presets grid
 *   - Seed colors (list + add input)
 *   - Seed behavior (influence / pin)
 *   - Temperature slider
 *   - Harmony selector
 *   - Token names hint
 *   - Palette preview strip
 *   - Generate button (footer)
 *
 * Used by:
 *   - Phase 2: PaletteView sidebar (width 320px)
 *   - Phase 3: Desktop Studio left rail (width 240px, collapsible)
 *   - Phase 4: Tablet accordion drawer
 *
 * Props:
 *   onEdit(i) — called when a seed color swatch is clicked for editing
 */

import React, { useState, useCallback, useRef } from "react";
import { useChromaStore } from "@/hooks/use-chroma-store";
import { useRegisterHotkey } from "@/providers/hotkey.provider";
import { cn, parseHex, hexToStop } from "@/lib/utils";
import { HARMONIES, THEMES } from "@/lib/constants/chroma";

// ─── Section helpers ──────────────────────────────────────────────────────────

function Section({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-3.5 border-b border-border">{children}</div>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2.5 font-semibold">
      {children}
    </p>
  );
}

// ─── Grip icon for hint ───────────────────────────────────────────────────────

function GripInline() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="inline"
    >
      <circle cx="9" cy="5" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="9" cy="19" r="1.5" />
      <circle cx="15" cy="5" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="15" cy="19" r="1.5" />
    </svg>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface GenerateControlsProps {
  /** Called when a seed swatch is clicked to open the picker */
  onEditSeed?: (index: number) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GenerateControls({ onEditSeed }: GenerateControlsProps) {
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
    setSeedMode,
    setTemperature,
    openModal,
  } = useChromaStore();

  const [seedInp, setSeedInp] = useState("");
  const [seedErr, setSeedErr] = useState(false);

  // Debounce generate for sliders
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedGenerate = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => generate(), 180);
  }, [generate]);

  // Hotkeys — registered here so they work whenever the palette view is mounted
  useRegisterHotkey({
    key: "space",
    label: "Generate palette",
    group: "Palette",
    handler: generate,
  });
  useRegisterHotkey({
    key: "z",
    ctrl: true,
    label: "Undo generate",
    group: "Palette",
    handler: undo,
  });
  useRegisterHotkey({
    key: "?",
    label: "Keyboard shortcuts",
    group: "App",
    handler: () => openModal("shortcuts"),
  });
  useRegisterHotkey({
    key: "e",
    ctrl: true,
    label: "Export palette",
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
    <>
      {/* ── Colors count ── */}
      <Section>
        <SectionLabel>Colors</SectionLabel>
        <div className="flex items-center gap-2.5">
          <span className="font-black text-[22px] text-primary tabular-nums min-w-6 text-center">
            {count}
          </span>
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

      {/* ── Theme presets ── */}
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
                  <div key={j} className="flex-1" style={{ background: h }} />
                ))}
              </div>
              <div className="px-2 py-1.5 bg-secondary text-[11px] font-semibold text-secondary-foreground">
                {t.name}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Seed colors ── */}
      <Section>
        <SectionLabel>Seed Colors</SectionLabel>
        <div className="flex flex-col gap-1 mb-2">
          {seeds.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <button
                className="w-4 h-4 rounded-sm border border-white/10 shrink-0"
                style={{ background: s.hex }}
                onClick={() => onEditSeed?.(i)}
                title={`Edit seed: ${s.hex}`}
              />
              <span
                className="flex-1 text-[10px] tracking-[.05em] uppercase text-muted-foreground cursor-pointer hover:text-foreground transition-colors font-mono"
                onClick={() => onEditSeed?.(i)}
              >
                {s.hex.toUpperCase()}
              </span>
              <button
                className="text-muted-foreground hover:text-destructive text-sm leading-none transition-colors bg-transparent border-none cursor-pointer"
                onClick={() => removeSeed(i)}
                title="Remove seed"
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
          <button
            className="inline-flex items-center justify-center px-3 py-1.5 text-[11px] font-mono font-bold rounded border border-border bg-secondary text-secondary-foreground hover:text-foreground hover:border-input transition-colors cursor-pointer"
            onClick={handleAddSeed}
          >
            + Add
          </button>
        </div>
      </Section>

      {/* ── Seed behavior ── */}
      <Section>
        <SectionLabel>Seed Behavior</SectionLabel>
        <div className="flex gap-1 mb-2">
          {(
            [
              {
                id: "influence",
                label: "Influence",
                title: "Seed hue guides generation",
              },
              {
                id: "pin",
                label: "Pin",
                title: "Seed appears as a locked slot",
              },
            ] as const
          ).map(({ id, label, title }) => (
            <button
              key={id}
              title={title}
              onClick={() => setSeedMode(id)}
              className={cn(
                "inline-flex items-center justify-center px-3 py-1.5 text-[11px] font-mono font-bold rounded border cursor-pointer transition-colors",
                seedMode === id
                  ? "bg-primary border-primary text-primary-foreground"
                  : "bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-input",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-[9.5px] text-muted-foreground leading-relaxed">
          {seedMode === "pin"
            ? "Seed colors appear exactly in the palette as locked slots."
            : "Seed hue guides generation but the exact color may shift."}
        </p>
      </Section>

      {/* ── Temperature ── */}
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

      {/* ── Harmony ── */}
      <Section>
        <SectionLabel>Harmony</SectionLabel>
        <p className="text-[11px] text-muted-foreground mb-2 leading-relaxed min-h-[2.4em]">
          {HARMONIES.find((h) => h.id === mode)?.desc ?? ""}
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

      {/* ── Token names hint ── */}
      <Section>
        <SectionLabel>Token Names</SectionLabel>
        <p className="text-[9.5px] text-muted-foreground leading-relaxed">
          Click any color name to rename it as a design token. Use the{" "}
          <GripInline /> handle to drag and reorder. Arrow keys work when a slot
          is focused.
        </p>
      </Section>

      {/* ── Palette preview ── */}
      {slots.length > 0 && (
        <Section>
          <SectionLabel>Preview</SectionLabel>
          <div className="flex h-5.5 rounded overflow-hidden gap-0.5 mt-2">
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
    </>
  );
}

// ─── GenerateFooter ───────────────────────────────────────────────────────────
// The sticky "Generate" button at the bottom of the controls panel.

export function GenerateFooter() {
  const generate = useChromaStore((s) => s.generate);
  return (
    <div className="px-4 py-3 border-t border-r border-border bg-card shrink-0">
      <button
        className="w-full py-2.5 text-[12px] font-bold rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer border-0"
        onClick={generate}
      >
        ⟳ Generate
      </button>
      <p className="text-[10px] text-muted-foreground text-center mt-1.5">
        <kbd>Space</kbd> generate · <kbd>Ctrl+Z</kbd> undo · <kbd>?</kbd>{" "}
        shortcuts
      </p>
    </div>
  );
}
