import { useState, useEffect, useMemo } from "react";
import type { SavedPalette } from "@/types";
import { useChromaStore } from "@/hooks/useChromaStore";
import { hexToRgb, contrastRatio, rgbToOklch } from "@/lib/utils/colorMath";
import { nearestName, loadSaved, hexToStop } from "@/lib/utils/paletteUtils";
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
    <div style={{ marginBottom: 8 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: "var(--ch-t3)",
          marginBottom: 5,
          textTransform: "uppercase",
          letterSpacing: ".07em",
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
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
              style={{
                width: 48,
                height: 48,
                borderRadius: 6,
                background: hex,
                cursor: "pointer",
                border: "1px solid rgba(128,128,128,.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {copiedIdx === i && (
                <span style={{ fontSize: 9, fontWeight: 700, color: tc }}>
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
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 80px 80px",
        gap: 8,
        alignItems: "center",
        padding: "5px 0",
        borderBottom: "1px solid var(--ch-s2)",
      }}
    >
      <span style={{ fontSize: 10, color: "var(--ch-t2)" }}>{label}</span>
      <span
        style={{
          fontSize: 10,
          fontFamily: "var(--ch-fm)",
          textAlign: "right",
          fontWeight: betterSide === "a" ? 700 : 400,
          color: betterSide === "a" ? "var(--ch-t1)" : "var(--ch-t3)",
        }}
      >
        {fmt(a)}
      </span>
      <span
        style={{
          fontSize: 10,
          fontFamily: "var(--ch-fm)",
          textAlign: "right",
          fontWeight: betterSide === "b" ? 700 : 400,
          color: betterSide === "b" ? "var(--ch-t1)" : "var(--ch-t3)",
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
    <div
      style={{
        display: "flex",
        gap: 2,
        alignItems: "flex-end",
        height: 48,
        marginTop: 8,
      }}
    >
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
            border: `2px solid ${c.src === "a" ? "var(--ch-t1)" : "var(--ch-a)"}`,
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
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
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
              border: `2px solid ${both ? "var(--ch-t1)" : onlyA ? "rgba(99,102,241,.6)" : "rgba(236,72,153,.6)"}`,
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
            <span style={{ marginLeft: 4, opacity: 0.7 }}>
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
  const { slots, mode, loadPalette } = useChromaStore();
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
    <div className="ch-view-scroll ch-view-pad">
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div className="ch-view-hd">
          <h2>Palette Comparison</h2>
          <p>
            Compare two palettes side-by-side — hue spread, chroma, lightness,
            accessibility, and color names.
          </p>
        </div>

        {saved.length === 0 && (
          <div
            style={{ color: "var(--ch-t3)", fontSize: 12, padding: "20px 0" }}
          >
            Save some palettes first using ♡ in the header, then compare them
            here.
          </div>
        )}

        {/* Palette selectors */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginBottom: 24,
          }}
        >
          {[
            { label: "Palette A", sel: selA ?? "__current__", setSel: setSelA },
            { label: "Palette B", sel: selB ?? saved[0]?.id, setSel: setSelB },
          ].map(({ label, sel, setSel }) => (
            <div key={label}>
              <div className="ch-slabel">{label}</div>
              <select
                value={sel ?? ""}
                onChange={(e) => setSel(e.target.value)}
                className="ch-inp"
                style={{ width: "100%", marginBottom: 8 }}
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
            <div style={{ marginBottom: 24 }}>
              <div className="ch-slabel">Hue / Chroma Spread</div>
              <div
                style={{
                  fontSize: 9.5,
                  color: "var(--ch-t3)",
                  marginBottom: 6,
                }}
              >
                Bar height = chroma.{" "}
                <span
                  style={{
                    borderBottom: "2px solid var(--ch-t1)",
                    paddingBottom: 1,
                  }}
                >
                  A
                </span>{" "}
                vs{" "}
                <span
                  style={{
                    borderBottom: "2px solid var(--ch-a)",
                    paddingBottom: 1,
                  }}
                >
                  B
                </span>
              </div>
              <HueDiff hexesA={palA.hexes} hexesB={palB.hexes} />
            </div>

            {/* Stats comparison */}
            <div style={{ marginBottom: 24 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 80px 80px",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: "var(--ch-t3)",
                    textTransform: "uppercase",
                  }}
                >
                  Metric
                </span>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: "var(--ch-t1)",
                    textAlign: "right",
                  }}
                >
                  {palA.name.slice(0, 10)}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: "var(--ch-a)",
                    textAlign: "right",
                  }}
                >
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
            <div style={{ marginBottom: 24 }}>
              <div className="ch-slabel">Color Name Overlap</div>
              <div
                style={{
                  fontSize: 9.5,
                  color: "var(--ch-t3)",
                  marginBottom: 8,
                }}
              >
                Chips shared by both palettes are shown at full opacity. Unique
                to A or B are muted.
              </div>
              <NameDiff hexesA={palA.hexes} hexesB={palB.hexes} />
            </div>

            {/* Load buttons */}
            <div style={{ display: "flex", gap: 8 }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const p = palA;
                  loadPalette(
                    p.hexes.map((h) => ({
                      color: hexToStop(h),
                      locked: false,
                    })),
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
                    p.hexes.map((h) => ({
                      color: hexToStop(h),
                      locked: false,
                    })),
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
