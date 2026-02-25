/**
 * score.view.tsx  — Phase 1 merge
 *
 * Combines: palette-scoring + palette-comparison-view
 * Sub-tabs:  [Score] [Compare]
 */

import { useState, useEffect, useMemo } from "react";
import type { SavedPalette } from "@/types";
import { useChromaStore } from "@/hooks/use-chroma-store";
import {
  scorePalette,
  hexToRgb,
  contrastRatio,
  rgbToOklch,
  nearestName,
  loadSaved,
  hexToStop,
} from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

// ─── Shared helpers ───────────────────────────────────────────────────────────

function TabBar({
  active,
  setActive,
}: {
  active: "score" | "compare";
  setActive: (t: "score" | "compare") => void;
}) {
  return (
    <div className="flex border-b border-border shrink-0">
      {(
        [
          ["score", "Score"],
          ["compare", "Compare"],
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

// ─── Sub-tab: Score ───────────────────────────────────────────────────────────

function RadarChart({ scores }: { scores: Record<string, number> }) {
  const SIZE = 200,
    cx = SIZE / 2,
    cy = SIZE / 2,
    r = 80;
  const entries = Object.entries(scores),
    n = entries.length;
  const angles = entries.map((_, i) => ((i / n) * 360 - 90) * (Math.PI / 180));
  const gridLevels = [20, 40, 60, 80, 100];
  const polarPoint = (angle: number, value: number) => ({
    x: cx + r * (value / 100) * Math.cos(angle),
    y: cy + r * (value / 100) * Math.sin(angle),
  });
  const dataPoints = entries.map(([, v], i) => polarPoint(angles[i], v));
  const dataPath =
    dataPoints
      .map(
        (p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`,
      )
      .join(" ") + " Z";
  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
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
      <path
        d={dataPath}
        fill="rgba(232,255,0,.15)"
        stroke="#e8ff00"
        strokeWidth={1.5}
      />
      {dataPoints.map((p, i) => (
        <circle
          key={i}
          cx={p.x.toFixed(1)}
          cy={p.y.toFixed(1)}
          r={4}
          fill="#e8ff00"
        />
      ))}
      {entries.map(([key, val], i) => {
        const lp = polarPoint(angles[i], 100 + 20);
        return (
          <text
            key={key}
            x={lp.x.toFixed(1)}
            y={lp.y.toFixed(1)}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={9}
            fill="rgba(255,255,255,.5)"
            fontFamily="Space Mono, monospace"
          >
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </text>
        );
      })}
    </svg>
  );
}

function ScoreTab() {
  const slots = useChromaStore((s) => s.slots);
  const score = useMemo(() => scorePalette(slots), [slots]);
  const slotNames = useMemo(
    () => slots.map((s) => nearestName(hexToRgb(s.color.hex))),
    [slots],
  );

  if (!slots.length) return <EmptyState />;

  const { balance, accessibility, harmony, uniqueness, overall } = score;
  const scoreColor = (v: number) =>
    v >= 75 ? "#00e676" : v >= 50 ? "#fff176" : "#ff4455";
  const feedback = [
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
          ? "Most colors support readable text on white or black — great for UI use."
          : accessibility >= 40
            ? "Some colors support AA text. Consider adding lighter or darker tones."
            : "Few colors pass AA text contrast. Add a very light or very dark color.",
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
        <p className="text-muted-foreground text-[11px] mb-5">
          Objective evaluation across four dimensions. Scores are relative, not
          absolute targets.
        </p>
        <div className="flex gap-8 items-start mt-2">
          <div className="flex flex-col items-center gap-3 shrink-0">
            <RadarChart
              scores={{ balance, accessibility, harmony, uniqueness }}
            />
            <div className="text-center">
              <div
                className="text-[36px] font-extrabold font-display"
                style={{ color: scoreColor(overall) }}
              >
                {overall}
              </div>
              <div className="text-muted-foreground uppercase tracking-widest text-[10px]">
                Overall
              </div>
            </div>
          </div>
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
                <div className="text-muted-foreground leading-normal text-[11px]">
                  {note}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6">
          <div className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2 font-display font-semibold">
            Your Palette
          </div>
          <div className="flex h-13 rounded overflow-hidden">
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

// ─── Sub-tab: Compare ─────────────────────────────────────────────────────────

function hueDist(a: number, b: number) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

function paletteStats(hexes: string[]) {
  const rgbs = hexes.map(hexToRgb);
  const oklchs = hexes.map((h) => rgbToOklch(hexToRgb(h)));
  const avgChroma = oklchs.reduce((s, c) => s + c.C, 0) / oklchs.length;
  const avgLight = oklchs.reduce((s, c) => s + c.L, 0) / oklchs.length;
  const hueSpread =
    oklchs.length < 2
      ? 0
      : (() => {
          let max = 0;
          for (let i = 0; i < oklchs.length; i++)
            for (let j = i + 1; j < oklchs.length; j++)
              max = Math.max(max, hueDist(oklchs[i].H, oklchs[j].H));
          return max;
        })();
  const WHITE = { r: 255, g: 255, b: 255 },
    BLACK = { r: 0, g: 0, b: 0 };
  const aaAny = rgbs.filter(
    (r) => Math.max(contrastRatio(r, WHITE), contrastRatio(r, BLACK)) >= 4.5,
  ).length;
  return { avgChroma, avgLight, hueSpread, aaAny, total: hexes.length };
}

function SwatchStrip({ hexes }: { hexes: string[] }) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  return (
    <div className="flex-wrap flex gap-1">
      {hexes.map((hex, i) => (
        <div
          key={i}
          title={`${hex} — click to copy`}
          onClick={() => {
            navigator.clipboard.writeText(hex).catch(() => {});
            setCopiedIdx(i);
            setTimeout(() => setCopiedIdx(null), 900);
          }}
          className="rounded-md cursor-pointer flex items-center justify-center shrink-0"
          style={{
            width: 40,
            height: 40,
            background: hex,
            border: "1px solid rgba(128,128,128,.2)",
          }}
        >
          {copiedIdx === i && (
            <span
              className="text-[9px] font-bold"
              style={{
                color:
                  contrastRatio(hexToRgb(hex), { r: 255, g: 255, b: 255 }) >=
                  4.5
                    ? "#fff"
                    : "#000",
              }}
            >
              ✓
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function StatRow({
  label,
  a,
  b,
  unit = "",
  higherIsBetter = true,
}: {
  label: string;
  a: number;
  b: number;
  unit?: string;
  higherIsBetter?: boolean;
}) {
  const delta = b - a,
    winner = Math.abs(delta) < 0.005 ? "tie" : delta > 0 ? "b" : "a";
  const betterSide = higherIsBetter
    ? winner
    : winner === "a"
      ? "b"
      : winner === "b"
        ? "a"
        : "tie";
  const fmt = (v: number) =>
    unit === "%"
      ? `${Math.round(v * 100)}%`
      : unit === "°"
        ? `${Math.round(v)}°`
        : v.toFixed(3);
  return (
    <div className="grid gap-2 items-center border-b border-muted grid-cols-[1fr_80px_80px] py-1.5">
      <span className="text-secondary-foreground text-[10px]">{label}</span>
      <span
        style={{
          fontSize: 10,
          fontFamily: "var(--font-mono)",
          textAlign: "right",
          fontWeight: betterSide === "a" ? 700 : 400,
          color:
            betterSide === "a"
              ? "var(--color-foreground)"
              : "var(--color-muted-foreground)",
        }}
      >
        {fmt(a)}
      </span>
      <span
        style={{
          fontSize: 10,
          fontFamily: "var(--font-mono)",
          textAlign: "right",
          fontWeight: betterSide === "b" ? 700 : 400,
          color:
            betterSide === "b"
              ? "var(--color-foreground)"
              : "var(--color-muted-foreground)",
        }}
      >
        {fmt(b)}
      </span>
    </div>
  );
}

function CompareTab() {
  const slots = useChromaStore((s) => s.slots);
  const mode = useChromaStore((s) => s.mode);
  const loadPalette = useChromaStore((s) => s.loadPalette);
  const navigate = useNavigate();
  const [saved, setSaved] = useState<SavedPalette[]>([]);
  const [selA, setSelA] = useState<string | null>(null);
  const [selB, setSelB] = useState<string | null>(null);

  useEffect(() => {
    const all = loadSaved();
    setSaved(all);
    if (all.length > 0) setSelB(all[0].id);
  }, []);

  const CURRENT: SavedPalette = useMemo(
    () => ({
      id: "__current__",
      name: "Current Palette",
      hexes: slots.map((s) => s.color.hex),
      mode,
      createdAt: Date.now(),
    }),
    [slots, mode],
  );
  const options = [CURRENT, ...saved];
  const palA = options.find((p) => p.id === (selA ?? "__current__")) ?? CURRENT;
  const palB = options.find((p) => p.id === selB) ?? saved[0];
  const statsA = useMemo(
    () => (palA ? paletteStats(palA.hexes) : null),
    [palA],
  );
  const statsB = useMemo(
    () => (palB ? paletteStats(palB.hexes) : null),
    [palB],
  );

  if (saved.length === 0)
    return (
      <div className="flex-1 overflow-auto p-6">
        <p className="text-muted-foreground text-[12px]">
          Save some palettes first using ♡ in the header, then compare them
          here.
        </p>
      </div>
    );

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mx-auto" style={{ maxWidth: 1000 }}>
        <p className="text-muted-foreground text-[11px] mb-5">
          Compare two palettes side-by-side — hue spread, chroma, lightness,
          accessibility, and color names.
        </p>
        <div className="grid gap-4 mb-6 grid-cols-2">
          {(
            [
              ["Palette A", selA ?? "__current__", setSelA],
              ["Palette B", selB ?? saved[0]?.id, setSelB],
            ] as const
          ).map(([label, sel, setSel]) => (
            <div key={label}>
              <div className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2.5 font-display font-semibold">
                {label}
              </div>
              <select
                value={sel ?? ""}
                onChange={(e) =>
                  (setSel as (v: string) => void)(e.target.value)
                }
                className="w-full bg-muted border border-border rounded px-2 py-1.5 text-[12px] text-foreground font-mono outline-none focus:border-ring transition-colors mb-2"
              >
                {options.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.hexes.length} colors · {p.mode})
                  </option>
                ))}
              </select>
              {sel && options.find((p) => p.id === sel) && (
                <SwatchStrip hexes={options.find((p) => p.id === sel)!.hexes} />
              )}
            </div>
          ))}
        </div>
        {palA && palB && statsA && statsB && (
          <>
            <div className="mb-6">
              <div className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2.5 font-display font-semibold">
                Stats Comparison
              </div>
              <div className="grid gap-2 mb-1.5 grid-cols-[1fr_80px_80px]">
                <span className="text-muted-foreground uppercase font-bold text-[9px]">
                  Metric
                </span>
                <span className="text-foreground text-right font-bold text-[9px]">
                  {palA.name.slice(0, 12)}
                </span>
                <span className="text-primary text-right font-bold text-[9px]">
                  {palB.name.slice(0, 12)}
                </span>
              </div>
              <StatRow
                label="Avg chroma (vividness)"
                a={statsA.avgChroma}
                b={statsB.avgChroma}
              />
              <StatRow
                label="Avg lightness"
                a={statsA.avgLight}
                b={statsB.avgLight}
                unit="%"
                higherIsBetter={false}
              />
              <StatRow
                label="Hue spread"
                a={statsA.hueSpread}
                b={statsB.hueSpread}
                unit="°"
              />
              <StatRow
                label={`AA accessibility (/${Math.max(statsA.total, statsB.total)})`}
                a={statsA.aaAny / statsA.total}
                b={statsB.aaAny / statsB.total}
                unit="%"
              />
              <StatRow
                label="Slot count"
                a={statsA.total}
                b={statsB.total}
                higherIsBetter={false}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  loadPalette(
                    palA.hexes.map((h) => ({
                      id: crypto.randomUUID(),
                      color: hexToStop(h),
                      locked: false,
                    })),
                    palA.mode,
                    palA.hexes.length,
                  );
                  navigate({ to: "/palette" });
                }}
              >
                ↓ Load A into editor
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  loadPalette(
                    palB.hexes.map((h) => ({
                      id: crypto.randomUUID(),
                      color: hexToStop(h),
                      locked: false,
                    })),
                    palB.mode,
                    palB.hexes.length,
                  );
                  navigate({ to: "/palette" });
                }}
              >
                ↓ Load B into editor
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 overflow-auto p-6">
      <p className="text-muted-foreground text-[12px]">
        Generate a palette first.
      </p>
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

export default function ScoreView() {
  const [activeTab, setActiveTab] = useState<"score" | "compare">("score");
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 pt-5 pb-0 shrink-0">
        <h2 className="mb-1">Score & Compare</h2>
      </div>
      <TabBar active={activeTab} setActive={setActiveTab} />
      {activeTab === "score" && <ScoreTab />}
      {activeTab === "compare" && <CompareTab />}
    </div>
  );
}
