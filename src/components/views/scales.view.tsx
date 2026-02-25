/**
 * scales.view.tsx  — Phase 1 merge
 *
 * Combines: tint-scale-view + multi-scale-view
 * Sub-tabs:  [Single Color] [Full Palette]
 */

import React, { useState, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useChromaStore } from "@/hooks/use-chroma-store";
import {
  generateScale,
  textColor,
  parseHex,
  hexToRgb,
  semanticSlotNames,
  hexToStop,
  nearestName,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import ColorPickerModal from "@/components/modals/color-picker.modal";

// ─── Tab bar ──────────────────────────────────────────────────────────────────

type Tab = "single" | "palette";

function TabBar({
  active,
  setActive,
}: {
  active: Tab;
  setActive: (t: Tab) => void;
}) {
  return (
    <div className="flex border-b border-border shrink-0">
      {(
        [
          ["single", "Single Color"],
          ["palette", "Full Palette"],
        ] as const
      ).map(([id, label]) => (
        <button
          key={id}
          onClick={() => setActive(id)}
          className={`px-4 py-2.5 text-[10px] font-bold tracking-[.08em] uppercase border-r border-border cursor-pointer transition-colors ${active === id ? "text-foreground border-b-2 border-b-primary bg-accent/30 -mb-px" : "text-muted-foreground hover:text-foreground"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLE COLOR TAB (was TintScaleView)
// ═══════════════════════════════════════════════════════════════════════════════

const TOKEN_TABS = ["css", "js", "tailwind", "json"] as const;

function buildSingleTokens(
  scale: ReturnType<typeof generateScale>,
  name: string,
  tab: string,
): string {
  switch (tab) {
    case "css":
      return `:root {\n${scale.map(({ step, hex }) => `  --${name}-${step}: ${hex};`).join("\n")}\n}`;
    case "js":
      return `export const ${name} = {\n${scale.map(({ step, hex }) => `  '${step}': '${hex}',`).join("\n")}\n};`;
    case "tailwind":
      return `// tailwind.config.js\ncolors: {\n  ${name}: {\n${scale.map(({ step, hex }) => `    '${step}': '${hex}',`).join("\n")}\n  }\n}`;
    case "json":
      return JSON.stringify(
        {
          [name]: Object.fromEntries(scale.map(({ step, hex }) => [step, hex])),
        },
        null,
        2,
      );
    default:
      return "";
  }
}

function SingleColorTab() {
  const {
    scaleHex,
    scaleName,
    scaleTokenTab,
    slots,
    generate,
    setSeeds,
    setScaleHex,
    setScaleName,
    setScaleTokenTab,
  } = useChromaStore();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [inputVal, setInputVal] = useState(scaleHex);
  const [showPicker, setShowPicker] = useState(false);

  React.useEffect(() => {
    setInputVal(scaleHex);
  }, [scaleHex]);

  const scale = useMemo(() => generateScale(scaleHex), [scaleHex]);
  const tokens = useMemo(
    () => buildSingleTokens(scale, scaleName, scaleTokenTab),
    [scale, scaleName, scaleTokenTab],
  );

  const handleInput = (v: string) => {
    setInputVal(v);
    const h = parseHex(v);
    if (h) setScaleHex(h);
  };

  const handleGenerate = () => {
    const h = parseHex(inputVal);
    if (h) setScaleHex(h);
    else if (slots.length) {
      const h2 = slots[0].color.hex;
      setInputVal(h2);
      setScaleHex(h2);
    }
  };

  const useAsSeeds = () => {
    const picks = [1, 3, 5, 7, 9].map((i) => scale[i]).filter(Boolean);
    setSeeds(picks.map(({ hex }) => hexToStop(hex)));
    generate();
    navigate({ to: "/palette" });
  };

  return (
    <>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-auto p-6">
          <p className="text-muted-foreground text-[11px] mb-5">
            50–950 design token scale from any base color. Click a chip to copy.
          </p>

          <div className="flex gap-2 items-center mb-6 max-w-150">
            <div
              className="w-11 h-11 rounded border-2 border-input shrink-0 cursor-pointer"
              style={{ background: scaleHex }}
              title="Click to pick color"
              onClick={() => setShowPicker(true)}
            />
            <input
              className="flex-1 bg-muted border border-border rounded px-2 py-1.5 text-[12px] text-foreground font-mono tracking-[.06em] outline-none focus:border-ring transition-colors"
              value={inputVal}
              onChange={(e) => handleInput(e.target.value)}
              placeholder="#3B82F6"
              maxLength={7}
              spellCheck={false}
              autoComplete="off"
            />
            <Button variant="default" size="sm" onClick={handleGenerate}>
              Generate
            </Button>
          </div>

          <div className="flex rounded overflow-hidden h-13 max-w-225">
            {scale.map(({ step, hex, rgb }) => {
              const tc = textColor(rgb);
              return (
                <div
                  key={step}
                  className="flex flex-col items-center justify-center gap-0.5 font-mono text-[10px] cursor-pointer flex-1"
                  style={{ background: hex }}
                  title={`${step}: ${hex} — click to copy`}
                  onClick={() =>
                    navigator.clipboard.writeText(hex).catch(() => {})
                  }
                >
                  <div
                    className="font-bold tracking-[.04em]"
                    style={{ color: tc }}
                  >
                    {step}
                  </div>
                  <div className="opacity-65 text-[9px]" style={{ color: tc }}>
                    {hex.toUpperCase()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right panel */}
        <div className="w-[320px] bg-card border-l border-border overflow-y-auto shrink-0 p-4">
          <div className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2 font-display font-semibold">
            Token Name
          </div>
          <input
            className="w-full bg-muted border border-border rounded px-2 py-1.5 text-[12px] text-foreground font-mono tracking-[.06em] outline-none focus:border-ring transition-colors mb-3"
            value={scaleName}
            onChange={(e) => setScaleName(e.target.value.trim() || "primary")}
            placeholder="primary"
            maxLength={24}
            autoComplete="off"
          />

          <div className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2 font-display font-semibold">
            Export Format
          </div>
          <div className="flex-wrap mb-2.5 flex gap-1">
            {TOKEN_TABS.map((tab) => (
              <Button
                key={tab}
                variant={scaleTokenTab === tab ? "default" : "ghost"}
                size="sm"
                onClick={() => setScaleTokenTab(tab)}
              >
                {tab.toUpperCase()}
              </Button>
            ))}
          </div>

          <pre className="bg-secondary border border-border rounded p-2.5 text-[10px] leading-[1.7] text-muted-foreground whitespace-pre overflow-x-auto max-h-75 overflow-y-auto">
            {tokens}
          </pre>
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2"
            onClick={() => {
              navigator.clipboard.writeText(tokens).catch(() => {});
              setCopied(true);
              setTimeout(() => setCopied(false), 1400);
            }}
          >
            {copied ? "✓ Copied" : "Copy"}
          </Button>

          <div className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2 font-display font-semibold mt-4">
            Use in Palette
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={useAsSeeds}
          >
            Use scale as seeds →
          </Button>
        </div>
      </div>

      <ColorPickerModal
        isOpen={showPicker}
        initialHex={scaleHex}
        title="Base color — Tint Scale"
        onApply={(hex) => {
          setScaleHex(hex);
          setInputVal(hex);
          setShowPicker(false);
        }}
        onClose={() => setShowPicker(false)}
      />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FULL PALETTE TAB (was MultiScaleView)
// ═══════════════════════════════════════════════════════════════════════════════

const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
type ExportFmt = "css" | "tailwind" | "json";

function buildMultiScaleTokens(
  scales: { name: string; steps: ReturnType<typeof generateScale> }[],
  fmt: ExportFmt,
): string {
  switch (fmt) {
    case "css":
      return `:root {\n${scales.flatMap(({ name, steps }) => steps.map(({ step, hex }) => `  --${name}-${step}: ${hex};`)).join("\n")}\n}`;
    case "tailwind":
      return `// tailwind.config.js\ncolors: {\n${scales.map(({ name, steps }) => `  ${name}: {\n${steps.map(({ step, hex }) => `    '${step}': '${hex}',`).join("\n")}\n  },`).join("\n")}\n}`;
    case "json":
      return JSON.stringify(
        Object.fromEntries(
          scales.map(({ name, steps }) => [
            name,
            Object.fromEntries(steps.map(({ step, hex }) => [step, hex])),
          ]),
        ),
        null,
        2,
      );
  }
}

function FullPaletteTab() {
  const { slots } = useChromaStore();
  const [fmt, setFmt] = useState<ExportFmt>("css");
  const [copied, setCopied] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{
    slot: number;
    step: number;
  } | null>(null);

  const slotNames = useMemo(() => semanticSlotNames(slots), [slots]);
  const scales = useMemo(
    () =>
      slots.map((slot, i) => ({
        name: slotNames[i] ?? `color-${i + 1}`,
        hex: slot.color.hex,
        steps: generateScale(slot.color.hex),
      })),
    [slots, slotNames],
  );

  const tokens = useMemo(
    () =>
      buildMultiScaleTokens(
        scales.map((s) => ({ name: s.name, steps: s.steps })),
        fmt,
      ),
    [scales, fmt],
  );

  if (!slots.length) {
    return (
      <div className="flex-1 p-6">
        <p className="text-muted-foreground text-[12px]">
          Generate a palette first.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mx-auto max-w-270">
        <p className="text-muted-foreground text-[11px] mb-5">
          Full 50–950 tint scale for every palette color simultaneously — like
          Tailwind, Radix, or shadcn's color system. Click any chip to copy its
          hex.
        </p>

        <div className="overflow-x-auto mb-7">
          <table style={{ borderCollapse: "collapse", minWidth: 600 }}>
            <thead>
              <tr>
                <th
                  className="text-[9px] font-bold text-muted-foreground uppercase tracking-[.07em] whitespace-nowrap text-left"
                  style={{ padding: "0 8px 8px 0" }}
                >
                  Color
                </th>
                {STEPS.map((step) => (
                  <th
                    key={step}
                    className="text-[9px] font-bold text-muted-foreground uppercase tracking-[.06em] text-center"
                    style={{ padding: "0 2px 8px", minWidth: 44 }}
                  >
                    {step}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scales.map((scale, si) => (
                <tr key={si}>
                  <td
                    className="pb-1 whitespace-nowrap"
                    style={{ paddingRight: 10 }}
                  >
                    <div className="items-center flex gap-1.5">
                      <div
                        className="rounded shrink-0 w-3.5 h-3.5"
                        style={{
                          background: scale.hex,
                          border: "1px solid rgba(128,128,128,.2)",
                        }}
                      />
                      <span className="text-secondary-foreground font-bold text-[10px]">
                        {scale.name}
                      </span>
                    </div>
                    <div
                      className="text-[8.5px] text-muted-foreground mt-0.5"
                      style={{ paddingLeft: 20 }}
                    >
                      {nearestName(hexToRgb(scale.hex))}
                    </div>
                  </td>
                  {scale.steps.map(({ step, hex, rgb }) => {
                    const tc = textColor(rgb);
                    const isHovered =
                      hoveredCell?.slot === si && hoveredCell?.step === step;
                    return (
                      <td
                        key={step}
                        className="text-center"
                        style={{ padding: "0 2px 4px" }}
                      >
                        <div
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 5,
                            background: hex,
                            cursor: "pointer",
                            border: isHovered
                              ? "2px solid var(--color-foreground)"
                              : "1px solid rgba(128,128,128,.15)",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            padding: "0 0 3px",
                            transition: "transform .1s",
                            transform: isHovered ? "scale(1.12)" : "none",
                          }}
                          title={`${scale.name}-${step}: ${hex}`}
                          onClick={() =>
                            navigator.clipboard.writeText(hex).catch(() => {})
                          }
                          onMouseEnter={() =>
                            setHoveredCell({ slot: si, step })
                          }
                          onMouseLeave={() => setHoveredCell(null)}
                        >
                          {isHovered && (
                            <span
                              className="text-[7.5px] font-mono font-bold"
                              style={{ color: tc }}
                            >
                              {hex.slice(1).toUpperCase()}
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-3 mb-6 flex-wrap">
          {scales.map((scale, i) => {
            const s500 = scale.steps.find((s) => s.step === 500);
            return (
              <div
                key={i}
                className="flex items-center gap-1.5 bg-card rounded-md border border-muted px-2.5 py-1.5"
              >
                <div
                  className="rounded shrink-0"
                  style={{
                    width: 20,
                    height: 20,
                    background: scale.hex,
                    border: "1px solid rgba(128,128,128,.2)",
                  }}
                />
                <div>
                  <div className="text-foreground font-bold text-[10px]">
                    {scale.name}
                  </div>
                  <div className="font-mono text-muted-foreground text-[8.5px]">
                    500: {s500?.hex ?? "—"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div>
          <div className="justify-between items-center flex-wrap mb-2.5 flex gap-1.5">
            <div className="text-[10px] tracking-widest uppercase text-muted-foreground font-display font-semibold">
              Export All Scales
            </div>
            <div className="flex gap-1">
              {(["css", "tailwind", "json"] as const).map((f) => (
                <Button
                  key={f}
                  variant={fmt === f ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFmt(f)}
                >
                  {f === "css"
                    ? "CSS Vars"
                    : f === "tailwind"
                      ? "Tailwind"
                      : "JSON"}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(tokens).catch(() => {});
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1400);
                }}
              >
                {copied ? "✓ Copied" : "Copy"}
              </Button>
            </div>
          </div>
          <pre className="bg-secondary border border-border rounded p-2.5 text-[9px] leading-[1.7] text-muted-foreground whitespace-pre overflow-x-auto max-h-80 overflow-y-auto">
            {tokens}
          </pre>
        </div>
      </div>
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

export default function ScalesView() {
  const [activeTab, setActiveTab] = useState<Tab>("single");
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 pt-5 pb-0 shrink-0">
        <h2 className="mb-1">Scales</h2>
      </div>
      <TabBar active={activeTab} setActive={setActiveTab} />
      {activeTab === "single" && <SingleColorTab />}
      {activeTab === "palette" && <FullPaletteTab />}
    </div>
  );
}
