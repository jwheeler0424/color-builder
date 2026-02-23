import { useState } from "react";

import ColorPickerModal from "@/components/modals/color-picker.modal";
import {
  contrastRatio,
  wcagLevel,
  apcaContrast,
  apcaLevel,
  parseHex,
  hexToRgb,
  rgbToHex,
  suggestContrastFix,
  nearestName,
} from "@/lib/utils";
import { useChromaStore } from "@/hooks/use-chroma-store";

export default function ContrastChecker() {
  const slots = useChromaStore((s) => s.slots);
  const [fg, setFg] = useState("#ffffff");
  const [bg, setBg] = useState("#1a1a2e");
  const [useApca, setUseApca] = useState(false);
  const [editingColor, setEditingColor] = useState<"fg" | "bg" | null>(null);

  const fgRgb = parseHex(fg)
    ? hexToRgb(parseHex(fg)!)
    : { r: 255, g: 255, b: 255 };
  const bgRgb = parseHex(bg)
    ? hexToRgb(parseHex(bg)!)
    : { r: 26, g: 26, b: 46 };
  const ratio = contrastRatio(fgRgb, bgRgb);
  const level = wcagLevel(ratio);

  const BADGE_COLOR: Record<string, string> = {
    AAA: "#00e676",
    AA: "#69f0ae",
    "AA Large": "#fff176",
    Fail: "#ff4455",
  };
  const BADGE_BG: Record<string, string> = {
    AAA: "rgba(0,230,118,.18)",
    AA: "rgba(105,240,174,.15)",
    "AA Large": "rgba(255,241,118,.12)",
    Fail: "rgba(255,68,85,.15)",
  };

  const swap = () => {
    const t = fg;
    setFg(bg);
    setBg(t);
  };

  return (
    <>
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-[640px] mx-auto">
          <div className="mb-5">
            <h2>Contrast Checker</h2>
            <p>
              WCAG 2.1 contrast ratio between any two colors. Large text
              requires 3:1, body text requires 4.5:1.
            </p>
          </div>

          {/* Live preview */}
          <div
            className="rounded-lg p-8 mb-5 border border-white/10"
            style={{ background: rgbToHex(bgRgb), color: rgbToHex(fgRgb) }}
          >
            <div className="font-display text-[26px] font-black mb-2">
              Aa Large text sample
            </div>
            <div className="text-sm leading-relaxed mb-1">
              The quick brown fox jumps over the lazy dog
            </div>
            <div className="text-sm leading-relaxed mb-1 opacity-70">
              Secondary / muted text at 70% opacity
            </div>
          </div>

          {/* APCA / WCAG toggle */}
          <div className="justify-end flex mb-2 gap-1">
            <span className="text-[10px] text-muted-foreground self-center">
              Mode:
            </span>
            {([false, true] as const).map((apca) => (
              <button
                key={String(apca)}
                className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] border rounded font-mono font-bold tracking-[.04em] whitespace-nowrap cursor-pointer transition-colors ${useApca === apca ? "bg-primary text-primary-foreground border-primary hover:bg-white hover:border-white hover:text-black" : "bg-transparent text-secondary-foreground border-border hover:text-foreground hover:border-input"}`}
                onClick={() => setUseApca(apca)}
              >
                {apca ? "APCA" : "WCAG 2.1"}
              </button>
            ))}
          </div>

          {/* Ratio display */}
          <div className="flex items-center gap-4 mb-4">
            {!useApca && (
              <>
                <div className="font-display text-[36px] font-black">
                  {ratio.toFixed(2)}:1
                </div>
                <span
                  className="rounded font-bold text-sm"
                  style={{
                    padding: "4px 12px",
                    background: BADGE_BG[level],
                    color: BADGE_COLOR[level],
                  }}
                >
                  {level}
                </span>
              </>
            )}
            {useApca &&
              (() => {
                const lc = Math.abs(apcaContrast(fgRgb, bgRgb));
                const al = apcaLevel(lc);
                const aC: Record<string, string> = {
                  Preferred: "#00e676",
                  Body: "#69f0ae",
                  Large: "#fff176",
                  UI: "#ce93d8",
                  Fail: "#ff4455",
                };
                const aBg: Record<string, string> = {
                  Preferred: "rgba(0,230,118,.18)",
                  Body: "rgba(105,240,174,.15)",
                  Large: "rgba(255,241,118,.12)",
                  UI: "rgba(206,147,216,.12)",
                  Fail: "rgba(255,68,85,.15)",
                };
                return (
                  <>
                    <div className="font-display text-[36px] font-black">
                      Lc{lc.toFixed(0)}
                    </div>
                    <span
                      className="rounded font-bold text-sm"
                      style={{
                        padding: "4px 12px",
                        background: aBg[al],
                        color: aC[al],
                      }}
                    >
                      {al}
                    </span>
                  </>
                );
              })()}
          </div>

          {/* Criteria */}
          <div className="flex flex-col gap-2 mb-6">
            {[
              { label: "AA Large Text (3:1)", pass: ratio >= 3 },
              { label: "AA Normal Text (4.5:1)", pass: ratio >= 4.5 },
              { label: "AAA Large Text (4.5:1)", pass: ratio >= 4.5 },
              { label: "AAA Normal Text (7:1)", pass: ratio >= 7 },
            ].map(({ label, pass }) => (
              <div
                key={label}
                className="text-[13px] text-secondary-foreground"
              >
                <span
                  style={{
                    color: pass ? "#00e676" : "#ff4455",
                    fontWeight: 700,
                    marginRight: 8,
                  }}
                >
                  {pass ? "✓" : "✗"}
                </span>
                {label}
              </div>
            ))}
            <p className="text-[10px] text-muted-foreground mt-1">
              AA Large = headings ≥18pt or bold ≥14pt. AAA Large = same size,
              stricter palette context.
            </p>
          </div>

          {/* Fix suggestion */}
          {!useApca &&
            level === "Fail" &&
            (() => {
              const fix = suggestContrastFix(fg, bgRgb);
              return fix ? (
                <div className="text-[10.5px] text-muted-foreground mb-2 bg-card rounded border border-muted leading-relaxed px-2.5 py-1.5">
                  💡 To reach AA: {fix.direction} foreground to{" "}
                  <span
                    className="font-mono font-bold"
                    style={{ color: fix.hex }}
                  >
                    {fix.hex}
                  </span>
                  <span
                    className="inline-block rounded h-3"
                    style={{
                      width: 12,
                      background: fix.hex,
                      marginLeft: 5,
                      verticalAlign: "middle",
                      border: "1px solid rgba(128,128,128,.3)",
                    }}
                  />
                </div>
              ) : null;
            })()}

          {/* Color pickers */}
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <div className="text-[10px] tracking-[.1em] uppercase text-muted-foreground mb-2.5 font-display font-semibold">
                Foreground
              </div>
              <div className="items-center flex gap-2">
                <div
                  className="rounded border-2 border-input flex-shrink-0 cursor-pointer"
                  style={{ width: 40, height: 40, background: rgbToHex(fgRgb) }}
                  title="Click to pick foreground color"
                  onClick={() => setEditingColor("fg")}
                />
                <input
                  className="w-full bg-muted border border-border rounded px-2 py-1.5 text-[12px] text-foreground font-mono tracking-[.06em] outline-none focus:border-ring transition-colors placeholder:text-muted-foreground"
                  value={fg}
                  onChange={(e) => setFg(e.target.value)}
                  maxLength={7}
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>
              <div className="text-muted-foreground mt-1 text-[10px]">
                {nearestName(fgRgb)}
              </div>
            </div>

            <button
              className="bg-secondary border border-border rounded-full w-9 h-9 flex items-center justify-center cursor-pointer text-secondary-foreground text-base flex-shrink-0 mb-5 hover:border-input hover:text-foreground transition-colors"
              onClick={swap}
              title="Swap colors"
            >
              ⇄
            </button>

            <div className="flex-1">
              <div className="text-[10px] tracking-[.1em] uppercase text-muted-foreground mb-2.5 font-display font-semibold">
                Background
              </div>
              <div className="items-center flex gap-2">
                <div
                  className="rounded border-2 border-input flex-shrink-0 cursor-pointer"
                  style={{ width: 40, height: 40, background: rgbToHex(bgRgb) }}
                  title="Click to pick background color"
                  onClick={() => setEditingColor("bg")}
                />
                <input
                  className="w-full bg-muted border border-border rounded px-2 py-1.5 text-[12px] text-foreground font-mono tracking-[.06em] outline-none focus:border-ring transition-colors placeholder:text-muted-foreground"
                  value={bg}
                  onChange={(e) => setBg(e.target.value)}
                  maxLength={7}
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>
              <div className="text-muted-foreground mt-1 text-[10px]">
                {nearestName(bgRgb)}
              </div>
            </div>
          </div>

          {/* Palette quick-pick */}
          {slots.length > 0 && (
            <div className="mt-6">
              <div className="text-[10px] tracking-[.1em] uppercase text-muted-foreground mb-2.5 font-display font-semibold">
                Quick-pick from Palette
              </div>
              <div className="flex-wrap flex mt-1.5 gap-1">
                {slots.map((slot, i) => (
                  <div key={i} className="flex-col flex gap-[3px]">
                    <div
                      className="rounded cursor-pointer"
                      style={{
                        width: 28,
                        height: 28,
                        background: slot.color.hex,
                        border: "1px solid rgba(255,255,255,.08)",
                      }}
                      onClick={() => setFg(slot.color.hex)}
                      title={`Set FG to ${slot.color.hex}`}
                    />
                    <div className="text-muted-foreground text-center text-[8px]">
                      FG
                    </div>
                    <div
                      className="rounded cursor-pointer"
                      style={{
                        width: 28,
                        height: 28,
                        background: slot.color.hex,
                        border: "1px solid rgba(255,255,255,.08)",
                      }}
                      onClick={() => setBg(slot.color.hex)}
                      title={`Set BG to ${slot.color.hex}`}
                    />
                    <div className="text-muted-foreground text-center text-[8px]">
                      BG
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {editingColor && (
        <ColorPickerModal
          initialHex={editingColor === "fg" ? fg : bg}
          title={
            editingColor === "fg" ? "Foreground color" : "Background color"
          }
          onApply={(hex) => {
            if (editingColor === "fg") setFg(hex);
            else setBg(hex);
            setEditingColor(null);
          }}
          onClose={() => setEditingColor(null)}
        />
      )}
    </>
  );
}
