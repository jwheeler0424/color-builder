import { useMemo, useState } from "react";
import { useChromaStore } from "@/hooks/use-chroma-store";
import {
  contrastRatio,
  wcagLevel,
  hexToRgb,
  nearestName,
  apcaContrast,
  apcaLevel,
  suggestContrastFix,
  type WcagLevel,
  type ApcaLevel,
} from "@/lib/utils";

const WHITE = { r: 255, g: 255, b: 255 };
const BLACK = { r: 0, g: 0, b: 0 };

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

// ─── Per-swatch card ──────────────────────────────────────────────────────────

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
  const onW = contrastRatio(rgb, WHITE);
  const onB = contrastRatio(rgb, BLACK);
  const lvW = wcagLevel(onW);
  const lvB = wcagLevel(onB);
  const apW = apcaContrast(rgb, WHITE);
  const apB = apcaContrast(rgb, BLACK);
  const alW = apcaLevel(apW);
  const alB = apcaLevel(apB);

  // Contrast fix suggestions
  const fixW =
    !useApca && lvW === "Fail" ? suggestContrastFix(hex, WHITE) : null;
  const fixB =
    !useApca && lvB === "Fail" ? suggestContrastFix(hex, BLACK) : null;

  const name = nearestName(rgb);

  return (
    <div className="border border-muted bg-card overflow-hidden rounded-md">
      <div
        className="flex flex-col items-center justify-center gap-0.75"
        style={{ background: hex, height: 72 }}
      >
        <span className="text-white text-[13px] font-extrabold">Aa</span>
        <span className="text-black text-[13px] font-extrabold">Aa</span>
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

        {/* vs White */}
        <div className="items-center flex mb-1.25 gap-1.25">
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
          <div className="text-muted-foreground mb-1 pl-5.75 leading-[1.4] text-[8.5px]">
            💡 {fixW.direction === "darken" ? "Darken" : "Lighten"} to{" "}
            <span className="font-mono" style={{ color: fixW.hex }}>
              {fixW.hex}
            </span>{" "}
            for AA
          </div>
        )}

        {/* vs Black */}
        <div className="items-center flex gap-1.25">
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
          <div className="text-muted-foreground pl-[23px] leading-[1.4] text-[8.5px] mt-1">
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

// ─── Passing pairs matrix (collapsible) ──────────────────────────────────────

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
      <div className="grid gap-1.5 [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]">
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
                className="rounded shrink-0 w-[14px] h-[14px]"
                style={{
                  background: a,
                  border: "1px solid rgba(128,128,128,.2)",
                }}
              />
              <div
                className="rounded shrink-0 w-[14px] h-[14px]"
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

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AccessibilityView() {
  const slots = useChromaStore((s) => s.slots);
  const [useApca, setUseApca] = useState(false);
  const [showPairs, setShowPairs] = useState(false);

  const hexes = useMemo(() => slots.map((s) => s.color.hex), [slots]);

  // Summary stats
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

  if (!slots.length) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-5">
          <h2>Accessibility</h2>
        </div>
        <p className="text-muted-foreground text-[12px]">
          Generate a palette first.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-[900px] mx-auto">
        <div className="mb-5">
          <div className="justify-between items-start flex-wrap flex gap-2.5">
            <div>
              <h2>Accessibility</h2>
              <p>
                Contrast ratios for all palette colors on white and black
                backgrounds.
              </p>
            </div>
            {/* WCAG / APCA toggle */}
            <div className="items-center flex shrink-0 mt-1 gap-1">
              <span className="text-muted-foreground text-[10px]">Mode:</span>
              {([false, true] as const).map((apca) => (
                <button
                  key={String(apca)}
                  className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] border rounded font-mono font-bold tracking-[.04em] whitespace-nowrap cursor-pointer transition-colors ${useApca === apca ? "bg-primary text-primary-foreground border-primary hover:bg-white hover:border-white hover:text-black" : "bg-transparent text-secondary-foreground border-border hover:text-foreground hover:border-input"}`}
                  onClick={() => setUseApca(apca)}
                  title={
                    apca
                      ? "APCA — WCAG 3 perceptual contrast (more accurate)"
                      : "WCAG 2.1 — classic 4.5:1 ratio"
                  }
                >
                  {apca ? "APCA" : "WCAG 2.1"}
                </button>
              ))}
            </div>
          </div>

          {useApca && (
            <div className="text-[10.5px] text-muted-foreground leading-relaxed mt-1.5 bg-card rounded-md px-3 py-2 border border-muted">
              <strong>APCA (WCAG 3 draft)</strong> — more perceptually accurate
              than WCAG 2.1. Lc ≥ 75 preferred · Lc ≥ 60 body text · Lc ≥ 45
              large text / UI · Lc ≥ 30 non-text. Fix suggestions shown for WCAG
              2.1 mode only.
            </div>
          )}
        </div>

        {/* Summary row */}
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

        {/* Per-swatch cards */}
        <div className="grid gap-2.5 mb-5 [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]">
          {slots.map((s, i) => (
            <SwatchCard key={i} hex={s.color.hex} index={i} useApca={useApca} />
          ))}
        </div>

        {/* Pairs matrix */}
        <div className="border-t border-muted pt-4">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: showPairs ? 12 : 0,
            }}
          >
            <div className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2.5 font-display font-semibold m-0">
              Palette color pairs
            </div>
            <button
              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] border rounded font-mono font-bold tracking-[.04em] whitespace-nowrap cursor-pointer transition-colors bg-transparent text-secondary-foreground border-border hover:text-foreground hover:border-input"
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
