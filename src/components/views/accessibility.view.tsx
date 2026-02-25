/**
 * accessibility.view.tsx  — Phase 1 merge
 *
 * Combines: accessibility-view + contrast-checker + color-blind-view
 * Sub-tabs:  [WCAG Slots] [Contrast Checker] [Color Blind]
 */

import { useMemo, useState } from "react";
import { useChromaStore } from "@/hooks/use-chroma-store";
import {
  contrastRatio,
  wcagLevel,
  hexToRgb,
  apcaContrast,
  apcaLevel,
  suggestContrastFix,
  parseHex,
  rgbToHex,
  applySimMatrix,
  textColor,
  type WcagLevel,
  type ApcaLevel,
  nearestName,
} from "@/lib/utils";
import { CB_TYPES } from "@/lib/constants/chroma";
import ColorPickerModal from "@/components/modals/color-picker.modal";

// ─── Shared badge helpers ─────────────────────────────────────────────────────

const WCAG_BADGE: Record<WcagLevel, { bg: string; fg: string }> = {
  AAA: { bg: "rgba(34,197,94,.18)", fg: "#16a34a" },
  AA: { bg: "rgba(59,130,246,.15)", fg: "#2563eb" },
  "AA Large": { bg: "rgba(234,179,8,.15)", fg: "#a16207" },
  Fail: { bg: "rgba(239,68,68,.13)", fg: "#dc2626" },
};
const APCA_BADGE: Record<ApcaLevel, { bg: string; fg: string }> = {
  Preferred: { bg: "rgba(34,197,94,.18)", fg: "#16a34a" },
  Body: { bg: "rgba(59,130,246,.15)", fg: "#2563eb" },
  Large: { bg: "rgba(234,179,8,.15)", fg: "#a16207" },
  UI: { bg: "rgba(168,85,247,.15)", fg: "#7c3aed" },
  Fail: { bg: "rgba(239,68,68,.13)", fg: "#dc2626" },
};

function WcagBadge({
  level,
  size = "sm",
}: {
  level: WcagLevel;
  size?: "sm" | "xs";
}) {
  const s = WCAG_BADGE[level];
  return (
    <span
      style={{
        display: "inline-block",
        padding: size === "xs" ? "1px 4px" : "2px 6px",
        borderRadius: 3,
        fontWeight: 700,
        fontSize: size === "xs" ? 8.5 : 10,
        letterSpacing: ".03em",
        background: s.bg,
        color: s.fg,
      }}
    >
      {level}
    </span>
  );
}

function ApcaBadge({
  level,
  lc,
  size = "sm",
}: {
  level: ApcaLevel;
  lc: number;
  size?: "sm" | "xs";
}) {
  const s = APCA_BADGE[level];
  return (
    <span
      style={{
        display: "inline-block",
        padding: size === "xs" ? "1px 4px" : "2px 6px",
        borderRadius: 3,
        fontWeight: 700,
        fontSize: size === "xs" ? 8.5 : 10,
        letterSpacing: ".03em",
        background: s.bg,
        color: s.fg,
      }}
      title={`Lc ${Math.abs(lc)}`}
    >
      {level} (Lc{Math.abs(lc)})
    </span>
  );
}

// ─── Sub-tab: WCAG Slots ──────────────────────────────────────────────────────

const WHITE = { r: 255, g: 255, b: 255 };
const BLACK = { r: 0, g: 0, b: 0 };

function SwatchCard({
  hex,
  index,
  useApca,
}: {
  hex: string;
  index: number;
  useApca: boolean;
}) {
  const rgb = hexToRgb(hex);
  const onW = contrastRatio(rgb, WHITE),
    onB = contrastRatio(rgb, BLACK);
  const lvW = wcagLevel(onW),
    lvB = wcagLevel(onB);
  const apW = apcaContrast(rgb, WHITE),
    apB = apcaContrast(rgb, BLACK);
  const alW = apcaLevel(apW),
    alB = apcaLevel(apB);
  const fixW =
    !useApca && lvW === "Fail" ? suggestContrastFix(hex, WHITE) : null;
  const fixB =
    !useApca && lvB === "Fail" ? suggestContrastFix(hex, BLACK) : null;
  const name = nearestName(rgb);

  return (
    <div className="border border-muted bg-card overflow-hidden rounded-md">
      <div
        className="flex flex-col items-center justify-center gap-1"
        style={{ background: hex, height: 72 }}
      >
        <span className="text-white text-sm font-extrabold">Aa</span>
        <span className="text-black text-sm font-extrabold">Aa</span>
      </div>
      <div className="px-2.5 py-2">
        <div className="items-center flex mb-1.5 gap-1.5">
          <div
            className="rounded h-2.5"
            style={{
              width: 10,
              background: hex,
              border: "1px solid rgba(128,128,128,.2)",
            }}
          />
          <span className="font-mono text-secondary-foreground text-[9.5px] flex-1">
            {hex.toUpperCase()}
          </span>
          <span className="text-muted-foreground text-[9px]">#{index + 1}</span>
        </div>
        <div className="text-muted-foreground mb-2 text-[9px]">{name}</div>
        <div className="items-center flex mb-1.5 gap-1.5">
          <div
            className="rounded flex items-center justify-center shrink-0 w-4.5"
            style={{
              height: 18,
              background: hex,
              border: "1px solid rgba(128,128,128,.2)",
            }}
          >
            <span className="font-bold text-white text-[10px]">A</span>
          </div>
          <span className="text-secondary-foreground text-[9px] flex-1">
            on White
          </span>
          {useApca ? (
            <ApcaBadge level={alW} lc={apW} size="xs" />
          ) : (
            <>
              <span className="text-muted-foreground mr-0.5 text-[9px]">
                {onW.toFixed(1)}:1
              </span>
              <WcagBadge level={lvW} size="xs" />
            </>
          )}
        </div>
        {fixW && !useApca && (
          <div className="text-muted-foreground mb-1 pl-6 leading-[1.4] text-[8.5px]">
            💡 {fixW.direction === "darken" ? "Darken" : "Lighten"} to{" "}
            <span className="font-mono" style={{ color: fixW.hex }}>
              {fixW.hex}
            </span>{" "}
            for AA
          </div>
        )}
        <div className="items-center flex gap-1.5">
          <div
            className="rounded flex items-center justify-center shrink-0 w-4.5"
            style={{
              height: 18,
              background: hex,
              border: "1px solid rgba(128,128,128,.2)",
            }}
          >
            <span className="font-bold text-black text-[10px]">A</span>
          </div>
          <span className="text-secondary-foreground text-[9px] flex-1">
            on Black
          </span>
          {useApca ? (
            <ApcaBadge level={alB} lc={apB} size="xs" />
          ) : (
            <>
              <span className="text-muted-foreground mr-0.5 text-[9px]">
                {onB.toFixed(1)}:1
              </span>
              <WcagBadge level={lvB} size="xs" />
            </>
          )}
        </div>
        {fixB && !useApca && (
          <div className="text-muted-foreground pl-6 leading-[1.4] text-[8.5px] mt-1">
            💡 {fixB.direction === "darken" ? "Darken" : "Lighten"} to{" "}
            <span className="font-mono" style={{ color: fixB.hex }}>
              {fixB.hex}
            </span>{" "}
            for AA
          </div>
        )}
      </div>
    </div>
  );
}

function PairsMatrix({
  hexes,
  useApca,
}: {
  hexes: string[];
  useApca: boolean;
}) {
  const pairs: { a: string; b: string; wcag: number; apca: number }[] = [];
  for (let i = 0; i < hexes.length; i++)
    for (let j = i + 1; j < hexes.length; j++) {
      const rgbA = hexToRgb(hexes[i]),
        rgbB = hexToRgb(hexes[j]);
      pairs.push({
        a: hexes[i],
        b: hexes[j],
        wcag: contrastRatio(rgbA, rgbB),
        apca: apcaContrast(rgbA, rgbB),
      });
    }
  const passing = pairs.filter((p) =>
    useApca ? Math.abs(p.apca) >= 45 : p.wcag >= 4.5,
  );
  return (
    <div>
      <div className="text-muted-foreground mb-2.5 text-[10.5px]">
        {passing.length} of {pairs.length} pairs pass{" "}
        {useApca ? "APCA Large (Lc≥45)" : "WCAG AA (4.5:1)"}
      </div>
      <div className="grid gap-1.5 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
        {pairs.map(({ a, b, wcag, apca }, i) => {
          const passes = useApca ? Math.abs(apca) >= 45 : wcag >= 4.5;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 8px",
                borderRadius: 5,
                border: "1px solid var(--color-secondary)",
                background: passes
                  ? "rgba(34,197,94,.04)"
                  : "var(--color-card)",
                opacity: passes ? 1 : 0.5,
              }}
            >
              <div
                className="rounded shrink-0 w-3.5 h-3.5"
                style={{
                  background: a,
                  border: "1px solid rgba(128,128,128,.2)",
                }}
              />
              <div
                className="rounded shrink-0 w-3.5 h-3.5"
                style={{
                  background: b,
                  border: "1px solid rgba(128,128,128,.2)",
                }}
              />
              <span className="font-mono text-muted-foreground text-[8.5px] flex-1">
                {useApca ? `Lc${Math.abs(apca)}` : `${wcag.toFixed(1)}:1`}
              </span>
              <span
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  padding: "1px 4px",
                  borderRadius: 2,
                  background: passes
                    ? "rgba(34,197,94,.18)"
                    : "rgba(239,68,68,.13)",
                  color: passes ? "#16a34a" : "#dc2626",
                }}
              >
                {passes ? "PASS" : "FAIL"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WcagSlotsTab() {
  const slots = useChromaStore((s) => s.slots);
  const [useApca, setUseApca] = useState(false);
  const [showPairs, setShowPairs] = useState(false);
  const hexes = useMemo(() => slots.map((s) => s.color.hex), [slots]);
  const stats = useMemo(() => {
    const rgbs = hexes.map(hexToRgb);
    const aaOnWhite = rgbs.filter((r) => contrastRatio(r, WHITE) >= 4.5).length;
    const aaOnBlack = rgbs.filter((r) => contrastRatio(r, BLACK) >= 4.5).length;
    const aaaAny = rgbs.filter(
      (r) => Math.max(contrastRatio(r, WHITE), contrastRatio(r, BLACK)) >= 7,
    ).length;
    const aaAny = rgbs.filter(
      (r) => Math.max(contrastRatio(r, WHITE), contrastRatio(r, BLACK)) >= 4.5,
    ).length;
    const pairsTotal = (hexes.length * (hexes.length - 1)) / 2;
    let pairsAA = 0;
    for (let i = 0; i < hexes.length; i++)
      for (let j = i + 1; j < hexes.length; j++)
        if (contrastRatio(rgbs[i], rgbs[j]) >= 4.5) pairsAA++;
    return { aaOnWhite, aaOnBlack, aaAny, aaaAny, pairsAA, pairsTotal };
  }, [hexes]);

  if (!slots.length) return <EmptyState title="Accessibility" />;

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-225 mx-auto">
        <div className="mb-5 justify-between items-start flex-wrap flex gap-2.5">
          <div>
            <p className="text-muted-foreground text-[11px]">
              Contrast ratios for all palette colors on white and black
              backgrounds.
            </p>
          </div>
          <div className="items-center flex shrink-0 gap-1">
            <span className="text-muted-foreground text-[10px]">Mode:</span>
            {([false, true] as const).map((apca) => (
              <button
                key={String(apca)}
                className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] border rounded font-mono font-bold tracking-[.04em] whitespace-nowrap cursor-pointer transition-colors ${useApca === apca ? "bg-primary text-primary-foreground border-primary" : "bg-transparent text-secondary-foreground border-border hover:text-foreground hover:border-input"}`}
                onClick={() => setUseApca(apca)}
              >
                {apca ? "APCA" : "WCAG 2.1"}
              </button>
            ))}
          </div>
        </div>
        {useApca && (
          <div className="text-[10.5px] text-muted-foreground leading-relaxed mb-4 bg-card rounded-md px-3 py-2 border border-muted">
            <strong>APCA (WCAG 3 draft)</strong> — more perceptually accurate.
            Lc ≥ 75 preferred · Lc ≥ 60 body text · Lc ≥ 45 large text / UI.
          </div>
        )}
        <div className="flex-wrap mb-5 flex gap-2">
          {[
            {
              label: "AA on white",
              val: `${stats.aaOnWhite}/${slots.length}`,
              pass: stats.aaOnWhite === slots.length,
            },
            {
              label: "AA on black",
              val: `${stats.aaOnBlack}/${slots.length}`,
              pass: stats.aaOnBlack === slots.length,
            },
            {
              label: "AA any bg",
              val: `${stats.aaAny}/${slots.length}`,
              pass: stats.aaAny === slots.length,
            },
            {
              label: "AAA any bg",
              val: `${stats.aaaAny}/${slots.length}`,
              pass: stats.aaaAny === slots.length,
            },
            {
              label: "Passing pairs",
              val: `${stats.pairsAA}/${stats.pairsTotal}`,
              pass: stats.pairsAA === stats.pairsTotal,
            },
          ].map(({ label, val, pass }) => (
            <div
              key={label}
              className="bg-card rounded-md border border-muted flex-[1_1_100px] px-3 py-2"
            >
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 800,
                  color: pass ? "#16a34a" : "var(--color-foreground)",
                }}
              >
                {val}
              </div>
              <div className="text-[9px] text-muted-foreground uppercase tracking-[.05em] mt-0.5">
                {label}
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-2.5 mb-5 grid-cols-[repeat(auto-fill,minmax(150px,1fr))]">
          {slots.map((s, i) => (
            <SwatchCard key={i} hex={s.color.hex} index={i} useApca={useApca} />
          ))}
        </div>
        <div className="border-t border-muted pt-4">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: showPairs ? 12 : 0,
            }}
          >
            <div className="text-[10px] tracking-widest uppercase text-muted-foreground font-display font-semibold">
              Palette color pairs
            </div>
            <button
              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] border rounded font-mono font-bold tracking-[.04em] cursor-pointer transition-colors bg-transparent text-secondary-foreground border-border hover:text-foreground hover:border-input"
              onClick={() => setShowPairs((v) => !v)}
            >
              {showPairs ? "Hide ↑" : "Show pairs ↓"}
            </button>
          </div>
          {showPairs && <PairsMatrix hexes={hexes} useApca={useApca} />}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-tab: Contrast Checker ────────────────────────────────────────────────

function ContrastCheckerTab() {
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
        <div className="max-w-160 mx-auto">
          <div
            className="mb-5 rounded-lg p-8 border border-white/10"
            style={{ background: rgbToHex(bgRgb), color: rgbToHex(fgRgb) }}
          >
            <div className="font-display text-[26px] font-black mb-2">
              Aa Large text sample
            </div>
            <div className="text-sm leading-relaxed mb-1">
              The quick brown fox jumps over the lazy dog
            </div>
            <div className="text-sm leading-relaxed opacity-70">
              Secondary / muted text at 70% opacity
            </div>
          </div>
          <div className="justify-end flex mb-2 gap-1">
            <span className="text-[10px] text-muted-foreground self-center">
              Mode:
            </span>
            {([false, true] as const).map((apca) => (
              <button
                key={String(apca)}
                className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] border rounded font-mono font-bold tracking-[.04em] cursor-pointer transition-colors ${useApca === apca ? "bg-primary text-primary-foreground border-primary" : "bg-transparent text-secondary-foreground border-border hover:text-foreground hover:border-input"}`}
                onClick={() => setUseApca(apca)}
              >
                {apca ? "APCA" : "WCAG 2.1"}
              </button>
            ))}
          </div>
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
          <div className="flex flex-col gap-2 mb-6">
            {[
              { label: "AA Large Text (3:1)", pass: ratio >= 3 },
              { label: "AA Normal Text (4.5:1)", pass: ratio >= 4.5 },
              { label: "AAA Large Text (4.5:1)", pass: ratio >= 4.5 },
              { label: "AAA Normal Text (7:1)", pass: ratio >= 7 },
            ].map(({ label, pass }) => (
              <div key={label} className="text-sm text-secondary-foreground">
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
          </div>
          {!useApca &&
            level === "Fail" &&
            (() => {
              const fix = suggestContrastFix(fg, bgRgb);
              return fix ? (
                <div className="text-[10.5px] text-muted-foreground mb-4 bg-card rounded border border-muted leading-relaxed px-2.5 py-1.5">
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
          <div className="flex items-end gap-3">
            {(["fg", "bg"] as const).map((role, ri) => {
              const hex = role === "fg" ? fg : bg;
              const setHex = role === "fg" ? setFg : setBg;
              const rgb = role === "fg" ? fgRgb : bgRgb;
              return (
                <div className="flex-1" key={role}>
                  <div className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2.5 font-display font-semibold">
                    {role === "fg" ? "Foreground" : "Background"}
                  </div>
                  <div className="items-center flex gap-2">
                    <div
                      className="rounded border-2 border-input shrink-0 cursor-pointer"
                      style={{
                        width: 40,
                        height: 40,
                        background: rgbToHex(rgb),
                      }}
                      onClick={() => setEditingColor(role)}
                    />
                    <input
                      className="w-full bg-muted border border-border rounded px-2 py-1.5 text-[12px] text-foreground font-mono tracking-[.06em] outline-none focus:border-ring transition-colors"
                      value={hex}
                      onChange={(e) => setHex(e.target.value)}
                      maxLength={7}
                      spellCheck={false}
                      autoComplete="off"
                    />
                  </div>
                  <div className="text-muted-foreground mt-1 text-[10px]">
                    {nearestName(rgb)}
                  </div>
                  {ri === 0 && (
                    <button
                      className="bg-secondary border border-border rounded-full w-9 h-9 flex items-center justify-center cursor-pointer text-secondary-foreground text-base shrink-0 mt-2 hover:border-input hover:text-foreground transition-colors"
                      onClick={swap}
                      title="Swap colors"
                    >
                      ⇄
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {slots.length > 0 && (
            <div className="mt-6">
              <div className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2.5 font-display font-semibold">
                Quick-pick from Palette
              </div>
              <div className="flex-wrap flex mt-1.5 gap-1">
                {slots.map((slot, i) => (
                  <div key={i} className="flex-col flex gap-1">
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
      <ColorPickerModal
        isOpen={!!editingColor}
        initialHex={editingColor === "fg" ? fg : bg}
        title={editingColor === "fg" ? "Foreground color" : "Background color"}
        onApply={(hex) => {
          if (editingColor === "fg") setFg(hex);
          else setBg(hex);
          setEditingColor(null);
        }}
        onClose={() => setEditingColor(null)}
      />
    </>
  );
}

// ─── Sub-tab: Color Blind ─────────────────────────────────────────────────────

function ColorBlindTab() {
  const slots = useChromaStore((s) => s.slots);
  if (!slots.length) return <EmptyState title="Color Blindness Simulator" />;
  return (
    <div className="flex-1 overflow-auto p-6">
      <p className="text-muted-foreground text-[11px] mb-5">
        How your palette appears under different types of color vision
        deficiency.
      </p>
      <div className="grid grid-cols-2 gap-3.5 max-w-240">
        {CB_TYPES.map((cbType) => {
          const simSlots =
            cbType.id === "normal"
              ? slots
              : slots.map((slot) => ({
                  ...slot,
                  color: {
                    ...slot.color,
                    rgb: applySimMatrix(
                      hexToRgb(slot.color.hex),
                      cbType.matrix,
                    ),
                    hex: rgbToHex(
                      applySimMatrix(hexToRgb(slot.color.hex), cbType.matrix),
                    ),
                  },
                }));
          return (
            <div
              key={cbType.id}
              className="bg-card border border-border rounded overflow-hidden"
            >
              <div className="px-3.5 py-2.5 border-b border-border flex justify-between items-baseline gap-2">
                <div className="font-display text-sm font-bold">
                  {cbType.name}
                </div>
                <div className="text-[10px] text-muted-foreground text-right">
                  {cbType.desc}
                </div>
              </div>
              <div className="h-15 flex">
                {simSlots.map((slot, i) => {
                  const tc = textColor(hexToRgb(slot.color.hex));
                  return (
                    <div
                      key={i}
                      className="flex-1 flex items-end p-1"
                      style={{ background: slot.color.hex }}
                    >
                      <span
                        className="text-[9px] font-mono [writing-mode:vertical-rl] rotate-180 opacity-70"
                        style={{ color: tc }}
                      >
                        {slot.color.hex.toUpperCase()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Shared: empty state ──────────────────────────────────────────────────────

function EmptyState({ title }: { title: string }) {
  return (
    <div className="flex-1 overflow-auto p-6">
      <p className="text-muted-foreground text-[12px]">
        Generate a palette first to use {title}.
      </p>
    </div>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

type Tab = "wcag" | "contrast" | "colorblind";
const TABS: { id: Tab; label: string }[] = [
  { id: "wcag", label: "WCAG Slots" },
  { id: "contrast", label: "Contrast Checker" },
  { id: "colorblind", label: "Color Blind" },
];

function TabBar({
  active,
  setActive,
}: {
  active: Tab;
  setActive: (t: Tab) => void;
}) {
  return (
    <div className="flex border-b border-border shrink-0">
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => setActive(t.id)}
          className={`px-4 py-2.5 text-[10px] font-bold tracking-[.08em] uppercase border-r border-border cursor-pointer transition-colors ${active === t.id ? "text-foreground border-b-2 border-b-primary bg-accent/30 -mb-px" : "text-muted-foreground hover:text-foreground"}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

export default function AccessibilityView() {
  const [activeTab, setActiveTab] = useState<Tab>("wcag");
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 pt-5 pb-0 shrink-0">
        <h2 className="mb-1">Accessibility</h2>
      </div>
      <TabBar active={activeTab} setActive={setActiveTab} />
      {activeTab === "wcag" && <WcagSlotsTab />}
      {activeTab === "contrast" && <ContrastCheckerTab />}
      {activeTab === "colorblind" && <ColorBlindTab />}
    </div>
  );
}
