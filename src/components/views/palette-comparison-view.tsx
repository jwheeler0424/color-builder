import { useState, useEffect, useMemo } from "react";
import type { PaletteSlot, SavedPalette } from "@/types";
import { useChromaStore } from "@/hooks/use-chroma-store";
import {
  hexToRgb,
  contrastRatio,
  rgbToOklch,
  nearestName,
  loadSaved,
  hexToStop,
} from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
          let maxDist = 0;
          for (let i = 0; i < oklchs.length; i++)
            for (let j = i + 1; j < oklchs.length; j++)
              maxDist = Math.max(maxDist, hueDist(oklchs[i].H, oklchs[j].H));
          return maxDist;
        })();
  const WHITE = { r: 255, g: 255, b: 255 },
    BLACK = { r: 0, g: 0, b: 0 };
  const aaAny = rgbs.filter(
    (r) => Math.max(contrastRatio(r, WHITE), contrastRatio(r, BLACK)) >= 4.5,
  ).length;
  return { avgChroma, avgLight, hueSpread, aaAny, total: hexes.length };
}

// ─── Swatch strip ─────────────────────────────────────────────────────────────

function SwatchStrip({ hexes, label }: { hexes: string[]; label: string }) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  return (
    <div className="mb-2">
      <div className="text-muted-foreground uppercase tracking-[.07em] mb-[5px] font-bold text-[10px]">
        {label}
      </div>
      <div className="flex-wrap flex gap-[3px]">
        {hexes.map((hex, i) => {
          const rgb = hexToRgb(hex);
          const tc =
            contrastRatio(rgb, { r: 255, g: 255, b: 255 }) >= 4.5
              ? "#fff"
              : "#000";
          return (
            <div
              key={i}
              title={`${nearestName(rgb)} · ${hex} — click to copy`}
              onClick={() => {
                navigator.clipboard.writeText(hex).catch(() => {});
                setCopiedIdx(i);
                setTimeout(() => setCopiedIdx(null), 900);
              }}
              className="rounded-md cursor-pointer flex items-center justify-center flex-shrink-0"
              style={{
                width: 48,
                height: 48,
                background: hex,
                border: "1px solid rgba(128,128,128,.2)",
              }}
            >
              {copiedIdx === i && (
                <span className="text-[9px] font-bold" style={{ color: tc }}>
                  ✓
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Stat comparison row ──────────────────────────────────────────────────────

function StatRow({
  label,
  a,
  b,
  aLabel,
  bLabel,
  unit = "",
  higherIsBetter = true,
}: {
  label: string;
  a: number;
  b: number;
  aLabel: string;
  bLabel: string;
  unit?: string;
  higherIsBetter?: boolean;
}) {
  const delta = b - a;
  const winner = Math.abs(delta) < 0.005 ? "tie" : delta > 0 ? "b" : "a";
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
    <div className="grid gap-2 items-center border-b border-muted [grid-template-columns:1fr_80px_80px] py-[5px] px-0">
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

// ─── Hue diff visualization ───────────────────────────────────────────────────

function HueDiff({ hexesA, hexesB }: { hexesA: string[]; hexesB: string[] }) {
  const oklchsA = hexesA.map((h) => rgbToOklch(hexToRgb(h)));
  const oklchsB = hexesB.map((h) => rgbToOklch(hexToRgb(h)));

  return (
    <div className="flex gap-0.5 items-end h-12 mt-2">
      {/* Hue wheel ticks */}
      {[
        ...oklchsA.map((c, i) => ({ ...c, src: "a", hex: hexesA[i] })),
        ...oklchsB.map((c, i) => ({ ...c, src: "b", hex: hexesB[i] })),
      ].map((c, i) => (
        <div
          key={i}
          style={{
            width: 6,
            height: `${Math.round(c.C * 200)}px`,
            minHeight: 8,
            borderRadius: 3,
            background: c.hex,
            border: `2px solid ${c.src === "a" ? "var(--color-foreground)" : "var(--color-primary)"}`,
            flexShrink: 0,
          }}
          title={`${c.src === "a" ? "A" : "B"}: ${c.hex} H=${Math.round(c.H)}° C=${c.C.toFixed(2)}`}
        />
      ))}
    </div>
  );
}

// ─── Color name diff ──────────────────────────────────────────────────────────

function NameDiff({ hexesA, hexesB }: { hexesA: string[]; hexesB: string[] }) {
  const namesA = hexesA.map((h) => nearestName(hexToRgb(h)));
  const namesB = hexesB.map((h) => nearestName(hexToRgb(h)));
  const allNames = Array.from(new Set([...namesA, ...namesB])).sort();

  return (
    <div className="flex-wrap flex gap-1">
      {allNames.map((name) => {
        const inA = namesA.includes(name);
        const inB = namesB.includes(name);
        const both = inA && inB;
        const onlyA = inA && !inB;
        const onlyB = !inA && inB;
        const hexA = hexesA[namesA.indexOf(name)];
        const hexB = hexesB[namesB.indexOf(name)];

        return (
          <div
            key={name}
            style={{
              padding: "3px 8px",
              borderRadius: 12,
              fontSize: 9,
              fontWeight: 600,
              background: both ? hexA : onlyA ? hexA : hexB,
              border: `2px solid ${both ? "var(--color-foreground)" : onlyA ? "rgba(99,102,241,.6)" : "rgba(236,72,153,.6)"}`,
              color:
                contrastRatio(hexToRgb(both ? hexA : onlyA ? hexA : hexB), {
                  r: 255,
                  g: 255,
                  b: 255,
                }) >= 4.5
                  ? "#fff"
                  : "#000",
              opacity: both ? 1 : 0.75,
            }}
            title={both ? "In both" : onlyA ? "Only in A" : "Only in B"}
          >
            {name}
            <span className="ml-1" style={{ opacity: 0.7 }}>
              {both ? "✓✓" : onlyA ? "A" : "B"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export default function PaletteComparisonView() {
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
    // Pre-select A as current palette (virtual entry), B as first saved
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

  const options: SavedPalette[] = [CURRENT, ...saved];
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

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mx-auto" style={{ maxWidth: 1000 }}>
        <div className="mb-5">
          <h2>Palette Comparison</h2>
          <p>
            Compare two palettes side-by-side — hue spread, chroma, lightness,
            accessibility, and color names.
          </p>
        </div>

        {saved.length === 0 && (
          <div
            className="text-muted-foreground text-[12px]"
            style={{ padding: "20px 0" }}
          >
            Save some palettes first using ♡ in the header, then compare them
            here.
          </div>
        )}

        {/* Palette selectors */}
        <div className="grid gap-4 mb-6 grid-cols-2">
          {[
            { label: "Palette A", sel: selA ?? "__current__", setSel: setSelA },
            { label: "Palette B", sel: selB ?? saved[0]?.id, setSel: setSelB },
          ].map(({ label, sel, setSel }) => (
            <div key={label}>
              <div className="text-[10px] tracking-[.1em] uppercase text-muted-foreground mb-2.5 font-display font-semibold">
                {label}
              </div>
              <select
                value={sel ?? ""}
                onChange={(e) => setSel(e.target.value)}
                className="w-full bg-muted border border-border rounded px-2 py-1.5 text-[12px] text-foreground font-mono tracking-[.06em] outline-none focus:border-ring transition-colors placeholder:text-muted-foreground mb-2"
              >
                {options.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.hexes.length} colors · {p.mode})
                  </option>
                ))}
              </select>
              {sel && options.find((p) => p.id === sel) && (
                <SwatchStrip
                  hexes={options.find((p) => p.id === sel)!.hexes}
                  label=""
                />
              )}
            </div>
          ))}
        </div>

        {palA && palB && statsA && statsB && (
          <>
            {/* Hue diff visualization */}
            <div className="mb-6">
              <div className="text-[10px] tracking-[.1em] uppercase text-muted-foreground mb-2.5 font-display font-semibold">
                Hue / Chroma Spread
              </div>
              <div className="text-muted-foreground mb-1.5 text-[9.5px]">
                Bar height = chroma.{" "}
                <span
                  className="pb-px"
                  style={{ borderBottom: "2px solid var(--color-foreground)" }}
                >
                  A
                </span>{" "}
                vs{" "}
                <span
                  className="pb-px"
                  style={{ borderBottom: "2px solid var(--color-primary)" }}
                >
                  B
                </span>
              </div>
              <HueDiff hexesA={palA.hexes} hexesB={palB.hexes} />
            </div>

            {/* Stats comparison */}
            <div className="mb-6">
              <div className="grid gap-2 mb-1.5 [grid-template-columns:1fr_80px_80px]">
                <span className="text-muted-foreground uppercase font-bold text-[9px]">
                  Metric
                </span>
                <span className="text-foreground text-right font-bold text-[9px]">
                  {palA.name.slice(0, 10)}
                </span>
                <span className="text-primary text-right font-bold text-[9px]">
                  {palB.name.slice(0, 10)}
                </span>
              </div>
              <StatRow
                label="Avg chroma (vividness)"
                a={statsA.avgChroma}
                b={statsB.avgChroma}
                aLabel={palA.name}
                bLabel={palB.name}
                higherIsBetter={true}
              />
              <StatRow
                label="Avg lightness"
                a={statsA.avgLight}
                b={statsB.avgLight}
                aLabel={palA.name}
                bLabel={palB.name}
                unit="%"
                higherIsBetter={false}
              />
              <StatRow
                label="Hue spread"
                a={statsA.hueSpread}
                b={statsB.hueSpread}
                aLabel={palA.name}
                bLabel={palB.name}
                unit="°"
                higherIsBetter={true}
              />
              <StatRow
                label={`AA accessibility (/${Math.max(statsA.total, statsB.total)})`}
                a={statsA.aaAny / statsA.total}
                b={statsB.aaAny / statsB.total}
                aLabel={palA.name}
                bLabel={palB.name}
                unit="%"
                higherIsBetter={true}
              />
              <StatRow
                label="Slot count"
                a={statsA.total}
                b={statsB.total}
                aLabel={palA.name}
                bLabel={palB.name}
                unit=""
                higherIsBetter={false}
              />
            </div>

            {/* Color name overlap */}
            <div className="mb-6">
              <div className="text-[10px] tracking-[.1em] uppercase text-muted-foreground mb-2.5 font-display font-semibold">
                Color Name Overlap
              </div>
              <div className="text-muted-foreground mb-2 text-[9.5px]">
                Chips shared by both palettes are shown at full opacity. Unique
                to A or B are muted.
              </div>
              <NameDiff hexesA={palA.hexes} hexesB={palB.hexes} />
            </div>

            {/* Load buttons */}
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const p = palA;
                  loadPalette(
                    p.hexes.map(
                      (h) =>
                        ({
                          color: hexToStop(h),
                          locked: false,
                        }) as PaletteSlot,
                    ),
                    p.mode,
                    p.hexes.length,
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
                  const p = palB;
                  loadPalette(
                    p.hexes.map(
                      (h) =>
                        ({
                          color: hexToStop(h),
                          locked: false,
                        }) as PaletteSlot,
                    ),
                    p.mode,
                    p.hexes.length,
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
