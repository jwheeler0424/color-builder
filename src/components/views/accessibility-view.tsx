import { useMemo, useState } from "react";
import { useChromaStore } from "@/hooks/useChromaStore";
import {
  contrastRatio,
  wcagLevel,
  hexToRgb,
  apcaContrast,
  apcaLevel,
  suggestContrastFix,
  type WcagLevel,
  type ApcaLevel,
} from "@/lib/utils/colorMath";
import { nearestName } from "@/lib/utils/paletteUtils";

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
    <div
      style={{
        borderRadius: 8,
        overflow: "hidden",
        border: "1px solid var(--ch-s2)",
        background: "var(--ch-s1)",
      }}
    >
      <div
        style={{
          background: hex,
          height: 72,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
        }}
      >
        <span style={{ color: "#ffffff", fontSize: 13, fontWeight: 800 }}>
          Aa
        </span>
        <span style={{ color: "#000000", fontSize: 13, fontWeight: 800 }}>
          Aa
        </span>
      </div>

      <div style={{ padding: "8px 10px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 6,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: hex,
              border: "1px solid rgba(128,128,128,.2)",
            }}
          />
          <span
            style={{
              fontSize: 9.5,
              fontFamily: "var(--ch-fm)",
              color: "var(--ch-t2)",
              flex: 1,
            }}
          >
            {hex.toUpperCase()}
          </span>
          <span style={{ fontSize: 9, color: "var(--ch-t3)" }}>
            #{index + 1}
          </span>
        </div>
        <div style={{ fontSize: 9, color: "var(--ch-t3)", marginBottom: 8 }}>
          {name}
        </div>

        {/* vs White */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            marginBottom: 5,
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 3,
              background: hex,
              border: "1px solid rgba(128,128,128,.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>
              A
            </span>
          </div>
          <span style={{ fontSize: 9, color: "var(--ch-t2)", flex: 1 }}>
            on White
          </span>
          {useApca ? (
            <ApcaBadge level={alW} lc={apW} size="xs" />
          ) : (
            <>
              <span
                style={{ fontSize: 9, color: "var(--ch-t3)", marginRight: 2 }}
              >
                {onW.toFixed(1)}:1
              </span>
              <WcagBadge level={lvW} size="xs" />
            </>
          )}
        </div>
        {fixW && !useApca && (
          <div
            style={{
              fontSize: 8.5,
              color: "var(--ch-t3)",
              paddingLeft: 23,
              marginBottom: 4,
              lineHeight: 1.4,
            }}
          >
            💡 {fixW.direction === "darken" ? "Darken" : "Lighten"} to{" "}
            <span style={{ fontFamily: "var(--ch-fm)", color: fixW.hex }}>
              {fixW.hex}
            </span>{" "}
            for AA
          </div>
        )}

        {/* vs Black */}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 3,
              background: hex,
              border: "1px solid rgba(128,128,128,.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span style={{ color: "#000", fontSize: 10, fontWeight: 700 }}>
              A
            </span>
          </div>
          <span style={{ fontSize: 9, color: "var(--ch-t2)", flex: 1 }}>
            on Black
          </span>
          {useApca ? (
            <ApcaBadge level={alB} lc={apB} size="xs" />
          ) : (
            <>
              <span
                style={{ fontSize: 9, color: "var(--ch-t3)", marginRight: 2 }}
              >
                {onB.toFixed(1)}:1
              </span>
              <WcagBadge level={lvB} size="xs" />
            </>
          )}
        </div>
        {fixB && !useApca && (
          <div
            style={{
              fontSize: 8.5,
              color: "var(--ch-t3)",
              paddingLeft: 23,
              marginTop: 4,
              lineHeight: 1.4,
            }}
          >
            💡 {fixB.direction === "darken" ? "Darken" : "Lighten"} to{" "}
            <span style={{ fontFamily: "var(--ch-fm)", color: fixB.hex }}>
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
      <div style={{ fontSize: 10.5, color: "var(--ch-t3)", marginBottom: 10 }}>
        {passing.length} of {pairs.length} pairs pass{" "}
        {useApca ? "APCA Large (Lc≥45)" : "WCAG AA (4.5:1)"}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
          gap: 6,
        }}
      >
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
                border: "1px solid var(--ch-s2)",
                background: passes ? "rgba(34,197,94,.04)" : "var(--ch-s1)",
                opacity: passes ? 1 : 0.5,
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 2,
                  background: a,
                  border: "1px solid rgba(128,128,128,.2)",
                  flexShrink: 0,
                }}
              />
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 2,
                  background: b,
                  border: "1px solid rgba(128,128,128,.2)",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 8.5,
                  color: "var(--ch-t3)",
                  flex: 1,
                  fontFamily: "var(--ch-fm)",
                }}
              >
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
  const { slots } = useChromaStore();
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
      <div className="ch-view-scroll ch-view-pad">
        <div className="ch-view-hd">
          <h2>Accessibility</h2>
        </div>
        <p style={{ color: "var(--ch-t3)", fontSize: 12 }}>
          Generate a palette first.
        </p>
      </div>
    );
  }

  return (
    <div className="ch-view-scroll ch-view-pad">
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div className="ch-view-hd">
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div>
              <h2>Accessibility</h2>
              <p>
                Contrast ratios for all palette colors on white and black
                backgrounds.
              </p>
            </div>
            {/* WCAG / APCA toggle */}
            <div
              style={{
                display: "flex",
                gap: 4,
                alignItems: "center",
                flexShrink: 0,
                marginTop: 4,
              }}
            >
              <span style={{ fontSize: 10, color: "var(--ch-t3)" }}>Mode:</span>
              {([false, true] as const).map((apca) => (
                <button
                  key={String(apca)}
                  className={`ch-btn ch-btn-sm ${useApca === apca ? "ch-btn-primary" : "ch-btn-ghost"}`}
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
            <div
              style={{
                fontSize: 10.5,
                color: "var(--ch-t3)",
                lineHeight: 1.6,
                marginTop: 6,
                background: "var(--ch-s1)",
                borderRadius: 6,
                padding: "8px 12px",
                border: "1px solid var(--ch-s2)",
              }}
            >
              <strong>APCA (WCAG 3 draft)</strong> — more perceptually accurate
              than WCAG 2.1. Lc ≥ 75 preferred · Lc ≥ 60 body text · Lc ≥ 45
              large text / UI · Lc ≥ 30 non-text. Fix suggestions shown for WCAG
              2.1 mode only.
            </div>
          )}
        </div>

        {/* Summary row */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
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
              style={{
                flex: "1 1 100px",
                background: "var(--ch-s1)",
                borderRadius: 6,
                border: "1px solid var(--ch-s2)",
                padding: "8px 12px",
              }}
            >
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 800,
                  color: pass ? "#16a34a" : "var(--ch-t1)",
                }}
              >
                {val}
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: "var(--ch-t3)",
                  marginTop: 2,
                  textTransform: "uppercase",
                  letterSpacing: ".05em",
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Per-swatch cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))",
            gap: 10,
            marginBottom: 20,
          }}
        >
          {slots.map((s, i) => (
            <SwatchCard key={i} hex={s.color.hex} index={i} useApca={useApca} />
          ))}
        </div>

        {/* Pairs matrix */}
        <div style={{ borderTop: "1px solid var(--ch-s2)", paddingTop: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: showPairs ? 12 : 0,
            }}
          >
            <div className="ch-slabel" style={{ margin: 0 }}>
              Palette color pairs
            </div>
            <button
              className="ch-btn ch-btn-ghost ch-btn-sm"
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
