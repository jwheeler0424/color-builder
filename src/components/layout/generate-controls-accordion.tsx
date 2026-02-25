/**
 * generate-controls-accordion.tsx  — Phase 4 layout component
 *
 * Accordion version of GenerateControls for tablet/mobile.
 * Each setting section collapses independently.
 *
 * Default open: Count, Seeds (most used on touch).
 * Default closed: Themes, Seed Behavior, Temperature, Harmony (secondary).
 */

import { useState, useCallback, useRef } from "react";
import { AccordionSection } from "./accordion-section";
import { useChromaStore } from "@/hooks/use-chroma-store";
import { useRegisterHotkey } from "@/providers/hotkey.provider";
import { cn, parseHex, hexToStop } from "@/lib/utils";
import { HARMONIES, THEMES } from "@/lib/constants/chroma";

interface GenerateControlsAccordionProps {
  onEditSeed?: (index: number) => void;
  /** Add a Generate button at the bottom */
  showFooter?: boolean;
}

export function GenerateControlsAccordion({
  onEditSeed,
  showFooter = true,
}: GenerateControlsAccordionProps) {
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

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedGenerate = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => generate(), 180);
  }, [generate]);

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
    <div className="flex flex-col">
      {/* ── Count (open by default) ── */}
      <AccordionSection id="count" title="Colors" defaultOpen>
        <div className="flex items-center gap-3 pt-1">
          <span className="font-black text-[20px] text-primary tabular-nums min-w-[1.8rem] text-center">
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
            className="flex-1 h-9" // h-9 = 36px for touch
          />
        </div>
      </AccordionSection>

      {/* ── Themes ── */}
      <AccordionSection id="themes" title="Themes">
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          {THEMES.map((t, i) => (
            <div
              key={i}
              className="rounded overflow-hidden cursor-pointer border border-border active:opacity-70 transition-opacity"
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
      </AccordionSection>

      {/* ── Seeds (open by default) ── */}
      <AccordionSection
        id="seeds"
        title={`Seed Colors${seeds.length ? ` (${seeds.length})` : ""}`}
        defaultOpen
      >
        <div className="flex flex-col gap-1.5 pt-1 mb-2">
          {seeds.map((s, i) => (
            <div key={i} className="flex items-center gap-2 min-h-11">
              <button
                className="w-9 h-9 rounded-md border border-border/50 shrink-0"
                style={{ background: s.hex }}
                onClick={() => onEditSeed?.(i)}
                title={`Edit seed: ${s.hex}`}
              />
              <span
                className="flex-1 text-[11px] tracking-[.05em] uppercase text-muted-foreground cursor-pointer hover:text-foreground transition-colors font-mono"
                onClick={() => onEditSeed?.(i)}
              >
                {s.hex.toUpperCase()}
              </span>
              <button
                className="w-11 h-11 flex items-center justify-center text-muted-foreground hover:text-destructive text-xl transition-colors cursor-pointer"
                onClick={() => removeSeed(i)}
                title="Remove seed"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className={cn(
              "flex-1 bg-muted border rounded-md px-3 py-2.5 text-[12px] text-foreground font-mono h-11",
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
            onClick={handleAddSeed}
            className="h-11 px-4 rounded-md border border-border bg-secondary text-secondary-foreground text-[12px] font-bold cursor-pointer transition-colors hover:border-input active:opacity-70"
          >
            + Add
          </button>
        </div>
      </AccordionSection>

      {/* ── Seed behavior ── */}
      <AccordionSection id="seedmode" title="Seed Behavior">
        <div className="flex gap-2 pt-1">
          {(
            [
              { id: "influence", label: "Influence" },
              { id: "pin", label: "Pin" },
            ] as const
          ).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setSeedMode(id)}
              className={cn(
                "flex-1 h-11 rounded-md border text-[12px] font-bold cursor-pointer transition-colors",
                seedMode === id
                  ? "bg-primary border-primary text-primary-foreground"
                  : "bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-input",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed mt-2">
          {seedMode === "pin"
            ? "Seed colors appear as locked slots in the palette."
            : "Seed hue guides generation but the exact color may shift."}
        </p>
      </AccordionSection>

      {/* ── Temperature ── */}
      <AccordionSection
        id="temp"
        title={`Temperature — ${temperature < -0.2 ? "❄ Cool" : temperature > 0.2 ? "🌅 Warm" : "⚪ Neutral"}`}
      >
        <div className="flex items-center gap-3 pt-1">
          <span className="text-[11px] text-muted-foreground">❄</span>
          <input
            type="range"
            min={-100}
            max={100}
            value={Math.round(temperature * 100)}
            onChange={(e) => {
              setTemperature(+e.target.value / 100);
              debouncedGenerate();
            }}
            className="flex-1 h-9"
          />
          <span className="text-[11px] text-muted-foreground">🌅</span>
        </div>
      </AccordionSection>

      {/* ── Harmony ── */}
      <AccordionSection id="harmony" title="Harmony">
        <p className="text-[11px] text-muted-foreground mb-2 leading-relaxed min-h-[2em]">
          {HARMONIES.find((h) => h.id === mode)?.desc ?? ""}
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {HARMONIES.map((h) => (
            <button
              key={h.id}
              onClick={() => {
                setMode(h.id);
                generate();
              }}
              className={cn(
                "h-11 px-2 rounded-md border text-[11px] font-mono cursor-pointer text-left transition-colors active:opacity-70",
                mode === h.id
                  ? "bg-primary border-primary text-primary-foreground font-bold"
                  : "bg-secondary border-border text-muted-foreground hover:border-input hover:text-foreground",
              )}
            >
              {h.label}
            </button>
          ))}
        </div>
      </AccordionSection>

      {/* Palette preview */}
      {slots.length > 0 && (
        <div className="px-4 py-3 border-b border-border">
          <p className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2 font-semibold">
            Preview
          </p>
          <div className="flex h-5 rounded overflow-hidden gap-0.5">
            {slots.map((s) => (
              <div
                key={s.id}
                className="flex-1"
                style={{ background: s.color.hex }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      {showFooter && (
        <div className="px-4 py-3">
          <button
            className="w-full h-12 text-sm font-bold rounded-md bg-primary text-primary-foreground hover:opacity-90 active:opacity-75 transition-opacity cursor-pointer border-0"
            onClick={generate}
          >
            ⟳ Generate
          </button>
        </div>
      )}
    </div>
  );
}
