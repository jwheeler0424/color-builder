import type { ChromaState, PaletteSlot } from "@/types";
import {
  contrastRatio,
  wcagLevel,
  type WcagLevel,
} from "@/lib/utils/colorMath";

interface Props {
  state: ChromaState;
}

const BADGE: Record<WcagLevel, { bg: string; color: string }> = {
  AAA: { bg: "rgba(0,230,118,.18)", color: "#00e676" },
  AA: { bg: "rgba(105,240,174,.15)", color: "#69f0ae" },
  "AA Large": { bg: "rgba(255,241,118,.12)", color: "#fff176" },
  Fail: { bg: "rgba(255,68,85,.15)", color: "#ff4455" },
};

function Badge({ level }: { level: WcagLevel }) {
  const s = BADGE[level];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 6px",
        borderRadius: 2,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: ".03em",
        background: s.bg,
        color: s.color,
      }}
    >
      {level}
    </span>
  );
}

export default function AccessibilityView({ state }: Props) {
  const { slots } = state;

  if (!slots.length) {
    return (
      <div className="ch-view-scroll ch-view-pad">
        <div className="ch-view-hd">
          <h2>Accessibility Matrix</h2>
        </div>
        <p style={{ color: "var(--ch-t3)", fontSize: 12 }}>
          Generate a palette first.
        </p>
      </div>
    );
  }

  // Build passing pairs
  const pairs: {
    a: (typeof slots)[0];
    b: (typeof slots)[0];
    ratio: number;
    level: WcagLevel;
  }[] = [];
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const ratio = contrastRatio(slots[i]!.color.rgb, slots[j]!.color.rgb);
      const level = wcagLevel(ratio);
      if (level !== "Fail")
        pairs.push({
          a: slots[i] as PaletteSlot,
          b: slots[j] as PaletteSlot,
          ratio,
          level,
        });
    }
  }
  pairs.sort((a, b) => b.ratio - a.ratio);

  return (
    <div className="ch-view-scroll ch-view-pad">
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <div className="ch-view-hd">
          <h2>Accessibility Matrix</h2>
          <p>WCAG 2.1 contrast ratios for every color pair in your palette.</p>
        </div>

        {/* Matrix table */}
        <div style={{ overflowX: "auto" }}>
          <table className="ch-a11y-table">
            <thead>
              <tr>
                <th>↓ on →</th>
                {slots.map((_, i) => (
                  <th key={i}>{i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.map((sa, i) => (
                <tr key={i}>
                  <td>
                    <span
                      style={{
                        display: "inline-block",
                        width: 10,
                        height: 10,
                        background: sa.color.hex,
                        borderRadius: 2,
                        border: "1px solid rgba(255,255,255,.08)",
                        verticalAlign: "middle",
                        marginRight: 4,
                      }}
                    />
                    <span style={{ fontSize: 10, color: "var(--ch-t3)" }}>
                      {i + 1}
                    </span>
                  </td>
                  {slots.map((sb, j) => {
                    if (i === j)
                      return (
                        <td key={j} className="ch-a11y-self">
                          —
                        </td>
                      );
                    const ratio = contrastRatio(sa.color.rgb, sb.color.rgb);
                    const level = wcagLevel(ratio);
                    return (
                      <td key={j}>
                        <Badge level={level} />
                        <div
                          style={{
                            fontSize: 10,
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

        {/* Top passing pairs */}
        <div style={{ marginTop: 24 }}>
          <div className="ch-slabel" style={{ marginBottom: 12 }}>
            Top Passing Pairs
          </div>
          <div className="ch-a11y-pairs-grid">
            {pairs.slice(0, 8).map(({ a, b, ratio, level }, i) => (
              <div key={i} className="ch-a11y-pair-card">
                <div
                  style={{
                    height: 64,
                    background: a.color.hex,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    gap: 3,
                    padding: 8,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--ch-fd)",
                      fontSize: 14,
                      fontWeight: 700,
                      color: b.color.hex,
                    }}
                  >
                    Aa Sample
                  </div>
                  <div
                    style={{ fontSize: 10, color: b.color.hex, opacity: 0.8 }}
                  >
                    Body text preview
                  </div>
                </div>
                <div
                  style={{
                    padding: "8px 10px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", gap: 4 }}>
                    {[a, b].map((x, xi) => (
                      <div
                        key={xi}
                        style={{
                          width: 10,
                          height: 10,
                          background: x.color.hex,
                          borderRadius: 2,
                          border: "1px solid rgba(255,255,255,.08)",
                        }}
                      />
                    ))}
                  </div>
                  <span style={{ fontSize: 10, color: "var(--ch-t3)" }}>
                    {ratio.toFixed(1)}:1
                  </span>
                  <Badge level={level} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
