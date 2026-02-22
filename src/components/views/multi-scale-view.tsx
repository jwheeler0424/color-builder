import { useMemo, useState } from "react";
import { useChromaStore } from "@/hooks/useChromaStore";
import {
  generateScale,
  textColor,
  hexToRgb,
  semanticSlotNames,
} from "@/lib/utils/colorMath";
import { nearestName } from "@/lib/utils/paletteUtils";
import { Button } from "@/components/ui/button";

const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

type ExportFmt = "css" | "tailwind" | "json";

function buildMultiScaleTokens(
  scales: { name: string; steps: ReturnType<typeof generateScale> }[],
  fmt: ExportFmt,
): string {
  switch (fmt) {
    case "css":
      return `:root {\n${scales
        .flatMap(({ name, steps }) =>
          steps.map(({ step, hex }) => `  --${name}-${step}: ${hex};`),
        )
        .join("\n")}\n}`;

    case "tailwind":
      return `// tailwind.config.js\ncolors: {\n${scales
        .map(
          ({ name, steps }) =>
            `  ${name}: {\n${steps.map(({ step, hex }) => `    '${step}': '${hex}',`).join("\n")}\n  },`,
        )
        .join("\n")}\n}`;

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

export default function MultiScaleView() {
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

  const copy = () => {
    navigator.clipboard.writeText(tokens).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  if (!slots.length) {
    return (
      <div className="ch-view-scroll ch-view-pad">
        <div className="ch-view-hd">
          <h2>Multi-Scale Palette</h2>
        </div>
        <p style={{ color: "var(--ch-t3)", fontSize: 12 }}>
          Generate a palette first.
        </p>
      </div>
    );
  }

  return (
    <div className="ch-view-scroll ch-view-pad">
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div className="ch-view-hd">
          <h2>Multi-Scale Palette</h2>
          <p>
            Full 50–950 tint scale for every palette color simultaneously — like
            Tailwind, Radix, or shadcn's color system. Click any chip to copy
            its hex.
          </p>
        </div>

        {/* Scale grid */}
        <div style={{ overflowX: "auto", marginBottom: 28 }}>
          <table style={{ borderCollapse: "collapse", minWidth: 600 }}>
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    fontSize: 9,
                    fontWeight: 700,
                    color: "var(--ch-t3)",
                    textTransform: "uppercase",
                    letterSpacing: ".07em",
                    padding: "0 8px 8px 0",
                    whiteSpace: "nowrap",
                  }}
                >
                  Color
                </th>
                {STEPS.map((step) => (
                  <th
                    key={step}
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: "var(--ch-t3)",
                      textTransform: "uppercase",
                      letterSpacing: ".06em",
                      padding: "0 2px 8px",
                      textAlign: "center",
                      minWidth: 44,
                    }}
                  >
                    {step}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scales.map((scale, si) => (
                <tr key={si}>
                  {/* Row label */}
                  <td
                    style={{
                      paddingRight: 10,
                      paddingBottom: 4,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <div
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 3,
                          background: scale.hex,
                          border: "1px solid rgba(128,128,128,.2)",
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "var(--ch-t2)",
                        }}
                      >
                        {scale.name}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 8.5,
                        color: "var(--ch-t3)",
                        marginTop: 2,
                        paddingLeft: 20,
                      }}
                    >
                      {nearestName(hexToRgb(scale.hex))}
                    </div>
                  </td>

                  {/* Scale chips */}
                  {scale.steps.map(({ step, hex, rgb }) => {
                    const tc = textColor(rgb);
                    const isHovered =
                      hoveredCell?.slot === si && hoveredCell?.step === step;
                    return (
                      <td
                        key={step}
                        style={{ padding: "0 2px 4px", textAlign: "center" }}
                      >
                        <div
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 5,
                            background: hex,
                            cursor: "pointer",
                            border: isHovered
                              ? "2px solid var(--ch-t1)"
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
                              style={{
                                fontSize: 7.5,
                                fontFamily: "var(--ch-fm)",
                                color: tc,
                                fontWeight: 700,
                              }}
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

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 24,
            flexWrap: "wrap",
          }}
        >
          {scales.map((scale, i) => {
            const s500 = scale.steps.find((s) => s.step === 500);
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 10px",
                  background: "var(--ch-s1)",
                  borderRadius: 6,
                  border: "1px solid var(--ch-s2)",
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    background: scale.hex,
                    border: "1px solid rgba(128,128,128,.2)",
                    flexShrink: 0,
                  }}
                />
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "var(--ch-t1)",
                    }}
                  >
                    {scale.name}
                  </div>
                  <div
                    style={{
                      fontSize: 8.5,
                      color: "var(--ch-t3)",
                      fontFamily: "var(--ch-fm)",
                    }}
                  >
                    500: {s500?.hex ?? "—"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Export */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
              flexWrap: "wrap",
              gap: 6,
            }}
          >
            <div className="ch-slabel" style={{ margin: 0 }}>
              Export All Scales
            </div>
            <div style={{ display: "flex", gap: 4 }}>
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
              <Button variant="ghost" size="sm" onClick={copy}>
                {copied ? "✓ Copied" : "Copy"}
              </Button>
            </div>
          </div>
          <pre className="ch-token-pre" style={{ maxHeight: 320, fontSize: 9 }}>
            {tokens}
          </pre>
        </div>
      </div>
    </div>
  );
}
