import { useMemo, useState } from "react";
import { useChromaStore } from "@/hooks/useChromaStore";
import {
  contrastRatio,
  wcagLevel,
  hexToRgb,
  type WcagLevel,
} from "@/lib/utils/colorMath";

// ─── Types & helpers ──────────────────────────────────────────────────────────

const WHITE = { r: 255, g: 255, b: 255 };
const BLACK = { r: 0, g: 0, b: 0 };

const BADGE_STYLE: Record<WcagLevel, { bg: string; fg: string }> = {
  AAA: { bg: "rgba(34,197,94,.18)", fg: "#16a34a" },
  AA: { bg: "rgba(59,130,246,.15)", fg: "#2563eb" },
  "AA Large": { bg: "rgba(234,179,8,.15)", fg: "#a16207" },
  Fail: { bg: "rgba(239,68,68,.13)", fg: "#dc2626" },
};

function Badge({
  level,
  size = "sm",
}: {
  level: WcagLevel;
  size?: "sm" | "xs";
}) {
  const s = BADGE_STYLE[level];
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

// ─── Per-swatch accessibility card ────────────────────────────────────────────

function SwatchCard({ hex, index }: { hex: string; index: number }) {
  const rgb = hexToRgb(hex);
  const onW = contrastRatio(rgb, WHITE);
  const onB = contrastRatio(rgb, BLACK);
  const lvW = wcagLevel(onW);
  const lvB = wcagLevel(onB);

  // Best text color for display
  const bestText = onW >= onB ? "#ffffff" : "#000000";
  const bestRatio = Math.max(onW, onB);

  return (
    <div
      style={{
        borderRadius: 8,
        overflow: "hidden",
        border: "1px solid var(--ch-s2)",
        background: "var(--ch-s1)",
      }}
    >
      {/* Swatch preview — large block */}
      <div
        style={{
          background: hex,
          height: 80,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
        }}
      >
        <span
          style={{
            color: "#ffffff",
            fontSize: 13,
            fontWeight: 800,
            lineHeight: 1,
          }}
        >
          Aa
        </span>
        <span
          style={{
            color: "#000000",
            fontSize: 13,
            fontWeight: 800,
            lineHeight: 1,
          }}
        >
          Aa
        </span>
      </div>

      {/* Info rows */}
      <div style={{ padding: "8px 10px" }}>
        {/* Hex + index */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 8,
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
              fontSize: 10,
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

        {/* White text contrast */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            marginBottom: 4,
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
            <span
              style={{
                color: "#fff",
                fontSize: 10,
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              A
            </span>
          </div>
          <span style={{ fontSize: 9.5, color: "var(--ch-t2)", flex: 1 }}>
            White text
          </span>
          <span
            style={{
              fontSize: 9,
              color: "var(--ch-t3)",
              fontFamily: "var(--ch-fm)",
              marginRight: 4,
            }}
          >
            {onW.toFixed(1)}:1
          </span>
          <Badge level={lvW} size="xs" />
        </div>

        {/* Black text contrast */}
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
            <span
              style={{
                color: "#000",
                fontSize: 10,
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              A
            </span>
          </div>
          <span style={{ fontSize: 9.5, color: "var(--ch-t2)", flex: 1 }}>
            Black text
          </span>
          <span
            style={{
              fontSize: 9,
              color: "var(--ch-t3)",
              fontFamily: "var(--ch-fm)",
              marginRight: 4,
            }}
          >
            {onB.toFixed(1)}:1
          </span>
          <Badge level={lvB} size="xs" />
        </div>

        {/* Best option callout */}
        <div
          style={{
            marginTop: 7,
            padding: "4px 7px",
            borderRadius: 4,
            background: `${hex}22`,
            border: `1px solid ${hex}44`,
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 2,
              background: hex,
              border: "1px solid rgba(128,128,128,.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span style={{ color: bestText, fontSize: 9, fontWeight: 800 }}>
              A
            </span>
          </div>
          <span style={{ fontSize: 9, color: "var(--ch-t2)" }}>
            Best: {bestText === "#ffffff" ? "white" : "black"} (
            {bestRatio.toFixed(1)}:1)
          </span>
          {bestRatio >= 4.5 && (
            <span style={{ fontSize: 8, color: "#16a34a", fontWeight: 700 }}>
              ✓ Normal text
            </span>
          )}
          {bestRatio >= 3 && bestRatio < 4.5 && (
            <span style={{ fontSize: 8, color: "#a16207", fontWeight: 700 }}>
              △ Large only
            </span>
          )}
          {bestRatio < 3 && (
            <span style={{ fontSize: 8, color: "#dc2626", fontWeight: 700 }}>
              ✕ Decorative only
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Palette-vs-palette matrix ────────────────────────────────────────────────

type MatrixMode = "all" | "passing";

function PairMatrix({
  slots,
  mode,
}: {
  slots: { color: { hex: string } }[];
  mode: MatrixMode;
}) {
  const hexes = slots.map((s) => s.color.hex);

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", fontSize: 10 }}>
        <thead>
          <tr>
            <th
              style={{
                padding: "5px 8px",
                textAlign: "left",
                fontSize: 9,
                color: "var(--ch-t3)",
                fontWeight: 700,
                borderBottom: "1px solid var(--ch-s2)",
              }}
            >
              ↓ on →
            </th>
            {hexes.map((hex, j) => (
              <th
                key={j}
                style={{
                  padding: "5px 6px",
                  textAlign: "center",
                  borderBottom: "1px solid var(--ch-s2)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 3,
                      background: hex,
                      border: "1px solid rgba(128,128,128,.2)",
                    }}
                  />
                  <span style={{ fontSize: 8, color: "var(--ch-t3)" }}>
                    #{j + 1}
                  </span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hexes.map((hexA, i) => (
            <tr key={i}>
              <td
                style={{
                  padding: "4px 8px",
                  borderBottom: "1px solid var(--ch-s2)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 3,
                      background: hexA,
                      border: "1px solid rgba(128,128,128,.2)",
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 8.5, color: "var(--ch-t3)" }}>
                    #{i + 1}
                  </span>
                </div>
              </td>
              {hexes.map((hexB, j) => {
                if (i === j)
                  return (
                    <td
                      key={j}
                      style={{
                        padding: "4px 6px",
                        textAlign: "center",
                        background: "var(--ch-s2)",
                        borderBottom: "1px solid var(--ch-s2)",
                        fontSize: 10,
                        color: "var(--ch-t3)",
                      }}
                    >
                      —
                    </td>
                  );
                const ratio = contrastRatio(hexToRgb(hexA), hexToRgb(hexB));
                const level = wcagLevel(ratio);
                const isFail = level === "Fail";
                if (mode === "passing" && isFail)
                  return (
                    <td
                      key={j}
                      style={{
                        padding: "4px 6px",
                        textAlign: "center",
                        borderBottom: "1px solid var(--ch-s2)",
                        opacity: 0.2,
                        fontSize: 9,
                        color: "var(--ch-t3)",
                      }}
                    >
                      —
                    </td>
                  );
                return (
                  <td
                    key={j}
                    style={{
                      padding: "4px 6px",
                      textAlign: "center",
                      borderBottom: "1px solid var(--ch-s2)",
                      background: isFail ? "transparent" : `${hexB}18`,
                    }}
                  >
                    {/* Mini preview: hexA text on hexB bg */}
                    <div
                      style={{
                        width: 28,
                        height: 18,
                        borderRadius: 3,
                        background: hexB,
                        margin: "0 auto 3px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px solid rgba(128,128,128,.15)",
                      }}
                    >
                      <span
                        style={{ color: hexA, fontSize: 9, fontWeight: 800 }}
                      >
                        Aa
                      </span>
                    </div>
                    <Badge level={level} size="xs" />
                    <div
                      style={{
                        fontSize: 8,
                        color: "var(--ch-t3)",
                        marginTop: 2,
                      }}
                    >
                      {ratio.toFixed(1)}:1
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Top passing pairs ────────────────────────────────────────────────────────

function PassingPairs({ slots }: { slots: { color: { hex: string } }[] }) {
  type Pair = { hexA: string; hexB: string; ratio: number; level: WcagLevel };
  const pairs: Pair[] = [];

  // Also include vs white and vs black
  const all = [...slots.map((s) => s.color.hex), "#ffffff", "#000000"];

  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const ratio = contrastRatio(hexToRgb(all[i]), hexToRgb(all[j]));
      const level = wcagLevel(ratio);
      if (level !== "Fail") {
        pairs.push({ hexA: all[i], hexB: all[j], ratio, level });
      }
    }
  }
  pairs.sort((a, b) => b.ratio - a.ratio);

  if (!pairs.length) {
    return (
      <div
        style={{
          padding: "20px",
          textAlign: "center",
          color: "var(--ch-t3)",
          fontSize: 11,
          border: "1px dashed var(--ch-s2)",
          borderRadius: 8,
        }}
      >
        No passing pairs found between palette colors.
        <br />
        <span
          style={{ fontSize: 10, opacity: 0.7, marginTop: 4, display: "block" }}
        >
          Harmonic palettes use similar luminance values by design — add a very
          light or very dark color to the palette for accessible text
          combinations.
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
        gap: 8,
      }}
    >
      {pairs.slice(0, 12).map(({ hexA, hexB, ratio, level }, i) => (
        <div
          key={i}
          style={{
            borderRadius: 7,
            overflow: "hidden",
            border: "1px solid var(--ch-s2)",
          }}
        >
          {/* Preview: hexA text on hexB bg */}
          <div
            style={{
              height: 56,
              background: hexB,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 2,
              padding: "4px 8px",
            }}
          >
            <span style={{ color: hexA, fontSize: 14, fontWeight: 800 }}>
              Aa
            </span>
            <span style={{ color: hexA, fontSize: 9, opacity: 0.8 }}>
              Sample text
            </span>
          </div>
          <div
            style={{
              padding: "5px 8px",
              background: "var(--ch-s1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", gap: 3 }}>
              {[hexA, hexB].map((h, xi) => (
                <div
                  key={xi}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    background: h,
                    border: "1px solid rgba(128,128,128,.2)",
                  }}
                />
              ))}
            </div>
            <span
              style={{
                fontSize: 8.5,
                color: "var(--ch-t3)",
                fontFamily: "var(--ch-fm)",
              }}
            >
              {ratio.toFixed(1)}:1
            </span>
            <Badge level={level} size="xs" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── WCAG Guide ───────────────────────────────────────────────────────────────

function WcagGuide() {
  const rows = [
    {
      level: "AAA" as WcagLevel,
      ratio: "≥ 7:1",
      use: "Body text, best for vision-impaired users",
    },
    {
      level: "AA" as WcagLevel,
      ratio: "≥ 4.5:1",
      use: "Normal-size body text (minimum required)",
    },
    {
      level: "AA Large" as WcagLevel,
      ratio: "≥ 3:1",
      use: "Large text (18pt+) and UI components",
    },
    {
      level: "Fail" as WcagLevel,
      ratio: "< 3:1",
      use: "Decorative use only, not for text",
    },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {rows.map(({ level, ratio, use }) => (
        <div
          key={level}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "4px 0",
            borderBottom: "1px solid var(--ch-s2)",
          }}
        >
          <Badge level={level} />
          <span
            style={{
              fontSize: 9.5,
              fontFamily: "var(--ch-fm)",
              color: "var(--ch-t3)",
              width: 48,
            }}
          >
            {ratio}
          </span>
          <span style={{ fontSize: 9.5, color: "var(--ch-t2)" }}>{use}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export default function AccessibilityView() {
  const { slots } = useChromaStore();
  const [matrixMode, setMatrixMode] = useState<MatrixMode>("all");
  const [showMatrix, setShowMatrix] = useState(false);

  const hexes = slots.map((s) => s.color.hex);

  // Summary stats
  const stats = useMemo(() => {
    let aaPass = 0,
      aaLargePass = 0,
      totalPairs = 0;
    const extended = [...hexes, "#ffffff", "#000000"];
    for (let i = 0; i < hexes.length; i++) {
      for (let j = 0; j < extended.length; j++) {
        if (hexes[i] === extended[j]) continue;
        const r = contrastRatio(hexToRgb(hexes[i]), hexToRgb(extended[j]));
        const lv = wcagLevel(r);
        totalPairs++;
        if (lv === "AA" || lv === "AAA") aaPass++;
        if (lv !== "Fail") aaLargePass++;
      }
    }
    // Each color vs white and black
    const swatchResults = hexes.map((hex) => {
      const rgb = hexToRgb(hex);
      const onW = contrastRatio(rgb, WHITE);
      const onB = contrastRatio(rgb, BLACK);
      return { hex, onW, onB, best: Math.max(onW, onB) };
    });
    const readable = swatchResults.filter((s) => s.best >= 4.5).length;
    return { aaPass, aaLargePass, totalPairs, readable, total: hexes.length };
  }, [hexes.join(",")]);

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
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div className="ch-view-hd">
          <h2>Accessibility</h2>
          <p>
            WCAG 2.1 contrast analysis for your palette. Each color is checked
            against white and black text — the combinations that matter in
            practice. The color-vs-color matrix shows which palette pairs can be
            used together.
          </p>
        </div>

        {/* ── Summary stats ── */}
        <div
          style={{
            display: "flex",
            gap: 10,
            marginBottom: 24,
            flexWrap: "wrap",
          }}
        >
          {[
            {
              value: `${stats.readable}/${stats.total}`,
              label: "colors readable",
              sub: "support AA text on white or black",
              ok: stats.readable === stats.total,
            },
            {
              value: `${stats.aaPass}`,
              label: "AA passing combos",
              sub: "including vs white and black",
              ok: stats.aaPass > 0,
            },
            {
              value: `${stats.aaLargePass}`,
              label: "AA Large+ combos",
              sub: "usable for large text and icons",
              ok: stats.aaLargePass > 0,
            },
          ].map(({ value, label, sub, ok }) => (
            <div
              key={label}
              style={{
                flex: "1 1 160px",
                background: ok ? "rgba(34,197,94,.07)" : "rgba(239,68,68,.07)",
                border: `1px solid ${ok ? "rgba(34,197,94,.25)" : "rgba(239,68,68,.2)"}`,
                borderRadius: 8,
                padding: "12px 14px",
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  color: ok ? "#16a34a" : "#dc2626",
                }}
              >
                {value}
              </div>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: "var(--ch-t1)",
                  marginBottom: 2,
                }}
              >
                {label}
              </div>
              <div style={{ fontSize: 9, color: "var(--ch-t3)" }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* ── Per-swatch cards ── */}
        <div className="ch-slabel" style={{ marginBottom: 12 }}>
          Each color vs white and black text
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 10,
            marginBottom: 28,
          }}
        >
          {slots.map((slot, i) => (
            <SwatchCard key={i} hex={slot.color.hex} index={i} />
          ))}
        </div>

        {/* ── Passing pairs ── */}
        <div style={{ marginBottom: 28 }}>
          <div className="ch-slabel" style={{ marginBottom: 12 }}>
            Passing combinations (palette + white + black)
          </div>
          <PassingPairs slots={slots} />
        </div>

        {/* ── Color-vs-color matrix ── */}
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: showMatrix ? 12 : 0,
            }}
          >
            <div className="ch-slabel" style={{ margin: 0 }}>
              Palette color-vs-color matrix
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {showMatrix &&
                (["all", "passing"] as MatrixMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMatrixMode(m)}
                    style={{
                      background:
                        matrixMode === m ? "var(--ch-a)" : "var(--ch-s2)",
                      color: matrixMode === m ? "#fff" : "var(--ch-t2)",
                      border: "none",
                      borderRadius: 4,
                      padding: "3px 8px",
                      fontSize: 10,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {m === "all" ? "All pairs" : "Passing only"}
                  </button>
                ))}
              <button
                onClick={() => setShowMatrix((v) => !v)}
                style={{
                  background: "var(--ch-s2)",
                  color: "var(--ch-t2)",
                  border: "none",
                  borderRadius: 4,
                  padding: "3px 8px",
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {showMatrix ? "Collapse ↑" : "Expand ↓"}
              </button>
            </div>
          </div>
          {!showMatrix && (
            <p style={{ fontSize: 10.5, color: "var(--ch-t3)", marginTop: 4 }}>
              Full N×N matrix showing contrast ratios between every pair of
              palette colors. Note: harmonic palettes intentionally cluster
              colors at similar luminance — low pair-contrast is expected and by
              design.
            </p>
          )}
          {showMatrix && <PairMatrix slots={slots} mode={matrixMode} />}
        </div>

        {/* ── WCAG reference ── */}
        <div>
          <div className="ch-slabel" style={{ marginBottom: 10 }}>
            WCAG 2.1 contrast reference
          </div>
          <WcagGuide />
        </div>
      </div>
    </div>
  );
}
