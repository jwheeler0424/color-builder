/**
 * score.view.tsx  — Phase 1 merge
 *
 * Combines: palette-scoring + palette-comparison-view
 * Sub-tabs:  [Score] [Compare]
 */

import { useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";

import type { SavedPalette } from "@/types";

import { Button } from "@/components/ui/button";
import { Chart } from "@/components/ui/chart";
import { useChromaStore } from "@/hooks/use-chroma-store";
import { createScoreChart, type RadarScores } from "@/lib/tools/palette-charts";
import {
  scorePalette,
  hexToRgb,
  contrastRatio,
  rgbToOklch,
  nearestName,
  loadSaved,
  hexToStop,
} from "@/lib/utils";

// ─── Shared helpers ───────────────────────────────────────────────────────────

function TabBar({
  active,
  setActive,
}: {
  active: "score" | "compare";
  setActive: (t: "score" | "compare") => void;
}) {
  return (
    <div className="flex shrink-0 border-b border-border">
      {(
        [
          ["score", "Score"],
          ["compare", "Compare"],
        ] as const
      ).map(([id, label]) => (
        <button
          key={id}
          onClick={() => setActive(id)}
          className={`cursor-pointer border-r border-border px-4 py-2.5 text-[10px] font-bold tracking-[.08em] uppercase transition-colors ${active === id ? "-mb-px border-b-2 border-b-primary bg-accent/30 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Sub-tab: Score ───────────────────────────────────────────────────────────

function RadarChart({ scores }: { scores: RadarScores }) {
  return (
    <Chart
      definition={createScoreChart(scores)}
      ariaLabel="Palette scores: balance, accessibility, harmony and uniqueness, from zero to one hundred"
      height={260}
      className="rounded-md border border-border/70 bg-muted/35 p-2"
    />
  );
}

function ScoreTab() {
  const slots = useChromaStore((s) => s.slots);
  const score = useMemo(() => scorePalette(slots), [slots]);
  const slotNames = useMemo(() => slots.map((s) => nearestName(hexToRgb(s.color.hex))), [slots]);

  if (!slots.length) return <EmptyState />;

  const { balance, accessibility, harmony, uniqueness, overall } = score;
  const scoreColor = (v: number) => (v >= 75 ? "#00e676" : v >= 50 ? "#fff176" : "#ff4455");
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
        <p className="mb-5 text-[11px] text-muted-foreground">
          Objective evaluation across four dimensions. Scores are relative, not absolute targets.
        </p>
        <div className="mt-2 flex min-w-0 flex-wrap items-start gap-6">
          <div className="mx-auto flex w-full max-w-80 min-w-0 flex-col items-center gap-3">
            <RadarChart scores={{ balance, accessibility, harmony, uniqueness }} />
            <div className="text-center">
              <div
                className="font-display text-[36px] font-extrabold"
                style={{ color: scoreColor(overall) }}
              >
                {overall}
              </div>
              <div className="text-[10px] tracking-widest text-muted-foreground uppercase">
                Overall
              </div>
            </div>
          </div>
          <div className="flex min-w-0 flex-1 basis-64 flex-col gap-5">
            {feedback.map(({ label, value, note }) => (
              <div key={label} className="flex flex-col">
                <div className="mb-1 flex justify-between">
                  <span className="text-[12px] font-bold">{label}</span>
                  <span className="text-[12px] font-extrabold" style={{ color: scoreColor(value) }}>
                    {value}
                  </span>
                </div>
                <div className="mb-1.5 h-1 rounded" style={{ background: "var(--color-input)" }}>
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
                <div className="text-[11px] leading-normal text-muted-foreground">{note}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6">
          <div className="mb-2 font-display text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
            Your Palette
          </div>
          <div className="flex h-13 overflow-hidden rounded">
            {slots.map((slot, i) => (
              <div
                key={i}
                className="flex flex-1 items-end"
                style={{ background: slot.color.hex, padding: "0 0 4px 4px" }}
              >
                <span
                  style={{
                    fontSize: 8,
                    color: slot.color.hex === "#000000" ? "#fff" : "rgba(0,0,0,.6)",
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
    <div className="flex flex-wrap gap-1">
      {hexes.map((hex, i) => (
        <div
          key={i}
          title={`${hex} — click to copy`}
          onClick={() => {
            navigator.clipboard.writeText(hex).catch(() => {});
            setCopiedIdx(i);
            setTimeout(() => setCopiedIdx(null), 900);
          }}
          className="flex shrink-0 cursor-pointer items-center justify-center rounded-md"
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
                  contrastRatio(hexToRgb(hex), { r: 255, g: 255, b: 255 }) >= 4.5 ? "#fff" : "#000",
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
  const betterSide = higherIsBetter ? winner : winner === "a" ? "b" : winner === "b" ? "a" : "tie";
  const fmt = (v: number) =>
    unit === "%" ? `${Math.round(v * 100)}%` : unit === "°" ? `${Math.round(v)}°` : v.toFixed(3);
  return (
    <div className="grid grid-cols-[1fr_80px_80px] items-center gap-2 border-b border-muted py-1.5">
      <span className="text-[10px] text-secondary-foreground">{label}</span>
      <span
        style={{
          fontSize: 10,
          fontFamily: "var(--font-mono)",
          textAlign: "right",
          fontWeight: betterSide === "a" ? 700 : 400,
          color: betterSide === "a" ? "var(--color-foreground)" : "var(--color-muted-foreground)",
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
          color: betterSide === "b" ? "var(--color-foreground)" : "var(--color-muted-foreground)",
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
  const statsA = useMemo(() => (palA ? paletteStats(palA.hexes) : null), [palA]);
  const statsB = useMemo(() => (palB ? paletteStats(palB.hexes) : null), [palB]);

  if (saved.length === 0)
    return (
      <div className="flex-1 overflow-auto p-6">
        <p className="text-[12px] text-muted-foreground">
          Save some palettes first using ♡ in the header, then compare them here.
        </p>
      </div>
    );

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mx-auto" style={{ maxWidth: 1000 }}>
        <p className="mb-5 text-[11px] text-muted-foreground">
          Compare two palettes side-by-side — hue spread, chroma, lightness, accessibility, and
          color names.
        </p>
        <div className="mb-6 grid grid-cols-2 gap-4">
          {(
            [
              ["Palette A", selA ?? "__current__", setSelA],
              ["Palette B", selB ?? saved[0]?.id, setSelB],
            ] as const
          ).map(([label, sel, setSel]) => (
            <div key={label}>
              <div className="mb-2.5 font-display text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                {label}
              </div>
              <select
                value={sel ?? ""}
                onChange={(e) => (setSel as (v: string) => void)(e.target.value)}
                className="mb-2 w-full rounded border border-border bg-muted px-2 py-1.5 font-mono text-[12px] text-foreground transition-colors outline-none focus:border-ring"
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
              <div className="mb-2.5 font-display text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                Stats Comparison
              </div>
              <div className="mb-1.5 grid grid-cols-[1fr_80px_80px] gap-2">
                <span className="text-[9px] font-bold text-muted-foreground uppercase">Metric</span>
                <span className="text-right text-[9px] font-bold text-foreground">
                  {palA.name.slice(0, 12)}
                </span>
                <span className="text-right text-[9px] font-bold text-primary">
                  {palB.name.slice(0, 12)}
                </span>
              </div>
              <StatRow label="Avg chroma (vividness)" a={statsA.avgChroma} b={statsB.avgChroma} />
              <StatRow
                label="Avg lightness"
                a={statsA.avgLight}
                b={statsB.avgLight}
                unit="%"
                higherIsBetter={false}
              />
              <StatRow label="Hue spread" a={statsA.hueSpread} b={statsB.hueSpread} unit="°" />
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
      <p className="text-[12px] text-muted-foreground">Generate a palette first.</p>
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

export default function ScoreView() {
  const [activeTab, setActiveTab] = useState<"score" | "compare">("score");
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="shrink-0 px-6 pt-5 pb-0">
        <h2 className="mb-1">Score & Compare</h2>
      </div>
      <TabBar active={activeTab} setActive={setActiveTab} />
      {activeTab === "score" && <ScoreTab />}
      {activeTab === "compare" && <CompareTab />}
    </div>
  );
}
