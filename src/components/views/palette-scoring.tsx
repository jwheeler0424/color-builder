import { useChromaStore } from "@/hooks/use-chroma-store";
import { useMemo } from "react";
import { scorePalette, hexToRgb, nearestName } from "@/lib/utils";
// Pure SVG radar chart
function RadarChart({ scores }: { scores: Record<string, number> }) {
  const SIZE = 200;
  const cx = SIZE / 2,
    cy = SIZE / 2,
    r = 80;
  const entries = Object.entries(scores);
  const n = entries.length;
  const angles = entries.map((_, i) => ((i / n) * 360 - 90) * (Math.PI / 180));

  const gridLevels = [20, 40, 60, 80, 100];

  const polarPoint = (angle: number, value: number) => {
    const pct = value / 100;
    return {
      x: cx + r * pct * Math.cos(angle),
      y: cy + r * pct * Math.sin(angle),
    };
  };

  const dataPoints = entries.map(([, v], i) => polarPoint(angles[i], v));
  const dataPath =
    dataPoints
      .map(
        (p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`,
      )
      .join(" ") + " Z";

  const labelOffset = 20;
  const labels = entries.map(([key, val], i) => {
    const lp = polarPoint(angles[i], 100 + labelOffset);
    return { key, val, x: lp.x, y: lp.y };
  });

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      {/* Grid circles */}
      {gridLevels.map((pct) => (
        <circle
          key={pct}
          cx={cx}
          cy={cy}
          r={(pct / 100) * r}
          fill="none"
          stroke="rgba(255,255,255,.06)"
          strokeWidth={1}
        />
      ))}
      {/* Spoke lines */}
      {angles.map((angle, i) => {
        const end = polarPoint(angle, 100);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={end.x.toFixed(1)}
            y2={end.y.toFixed(1)}
            stroke="rgba(255,255,255,.08)"
            strokeWidth={1}
          />
        );
      })}
      {/* Data polygon */}
      <path
        d={dataPath}
        fill="rgba(232,255,0,.15)"
        stroke="#e8ff00"
        strokeWidth={1.5}
      />
      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle
          key={i}
          cx={p.x.toFixed(1)}
          cy={p.y.toFixed(1)}
          r={4}
          fill="#e8ff00"
        />
      ))}
      {/* Labels */}
      {labels.map(({ key, val, x, y }) => (
        <text
          key={key}
          x={x.toFixed(1)}
          y={y.toFixed(1)}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={9}
          fill="rgba(255,255,255,.5)"
          fontFamily="Space Mono, monospace"
        >
          {key.charAt(0).toUpperCase() + key.slice(1)}
        </text>
      ))}
    </svg>
  );
}

export default function PaletteScoring() {
  const slots = useChromaStore((s) => s.slots);
  const score = useMemo(() => scorePalette(slots), [slots]);
  // Memoize color names — nearestName is O(160) per call
  const slotNames = useMemo(
    () => slots.map((s) => nearestName(hexToRgb(s.color.hex))),
    [slots],
  );

  if (!slots.length) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-5">
          <h2>Palette Scoring</h2>
        </div>
        <p className="text-muted-foreground text-[12px]">
          Generate a palette first.
        </p>
      </div>
    );
  }

  const { balance, accessibility, harmony, uniqueness, overall } = score;
  const radarData = { balance, accessibility, harmony, uniqueness };

  const scoreColor = (v: number) =>
    v >= 75 ? "#00e676" : v >= 50 ? "#fff176" : "#ff4455";

  const feedback: { label: string; value: number; note: string }[] = [
    {
      label: "Hue Balance",
      value: balance,
      note:
        balance >= 75
          ? "Well-distributed hues across the spectrum."
          : balance >= 50
            ? "Hues are somewhat clustered. Try a triadic or square harmony."
            : "Very clustered hues. Consider widening the hue spread.",
    },
    {
      label: "Accessibility",
      value: accessibility,
      note:
        accessibility >= 75
          ? "Most colors can display readable text on white or black — great for UI use."
          : accessibility >= 40
            ? "Some colors support AA text. Consider adding lighter or darker tones."
            : "Few colors pass AA text contrast. Add a very light or very dark color to the palette.",
    },
    {
      label: "Chroma Harmony",
      value: harmony,
      note:
        harmony >= 75
          ? "Chroma is consistent — palette feels cohesive and balanced."
          : harmony >= 50
            ? "Moderate chroma variation. Can work well for expressive palettes."
            : "High chroma variance. Mix vivid and muted tones more intentionally.",
    },
    {
      label: "Uniqueness",
      value: uniqueness,
      note:
        uniqueness >= 75
          ? "Colors are very distinct from each other — excellent for labeling."
          : uniqueness >= 40
            ? "Moderate distinctiveness."
            : "Colors are perceptually similar. Increasing lightness or hue spread will help.",
    },
  ];

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mx-auto" style={{ maxWidth: 760 }}>
        <div className="mb-5">
          <h2>Palette Scoring</h2>
          <p>
            Objective evaluation across four dimensions. Scores are relative,
            not absolute targets.
          </p>
        </div>

        <div className="flex gap-8 items-start mt-2">
          {/* Radar */}
          <div className="flex flex-col items-center gap-3 flex-shrink-0">
            <RadarChart scores={radarData} />
            <div className="text-center">
              <div
                className="text-[36px] font-extrabold font-display"
                style={{ color: scoreColor(overall) }}
              >
                {overall}
              </div>
              <div className="text-muted-foreground uppercase tracking-[.1em] text-[10px]">
                Overall
              </div>
            </div>
          </div>

          {/* Score bars */}
          <div className="flex-1 flex flex-col gap-5">
            {feedback.map(({ label, value, note }) => (
              <div key={label} className="flex flex-col">
                <div className="justify-between flex mb-1">
                  <span className="font-bold text-[12px]">{label}</span>
                  <span
                    className="text-[12px] font-extrabold"
                    style={{ color: scoreColor(value) }}
                  >
                    {value}
                  </span>
                </div>
                <div
                  className="rounded mb-1.5 h-1"
                  style={{ background: "var(--color-input)" }}
                >
                  <div
                    style={{
                      height: "100%",
                      borderRadius: 2,
                      width: `${value}%`,
                      background: scoreColor(value),
                      transition: "width .4s cubic-bezier(.16,1,.3,1)",
                    }}
                  />
                </div>
                <div className="text-muted-foreground leading-[1.5] text-[11px]">
                  {note}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Palette preview */}
        <div className="mt-6">
          <div className="text-[10px] tracking-[.1em] uppercase text-muted-foreground mb-2.5 font-display font-semibold mb-2">
            Your Palette
          </div>
          <div className="flex h-[52px] rounded overflow-hidden">
            {slots.map((slot, i) => (
              <div
                key={i}
                className="flex-1 flex items-end"
                style={{ background: slot.color.hex, padding: "0 0 4px 4px" }}
              >
                <span
                  style={{
                    fontSize: 8,
                    color:
                      slot.color.hex === "#000000" ? "#fff" : "rgba(0,0,0,.6)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {slotNames[i]?.split(" ")[0]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
