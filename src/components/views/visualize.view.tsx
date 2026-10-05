/**
 * visualize.view.tsx  — Phase 1 merge
 *
 * Combines: oklch-scatter-view + p3-gamut-view
 * Sub-tabs:  [OKLCH Space] [P3 Gamut]
 */

import { Lock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Chart } from "@/components/ui/chart";
import { useChromaStore } from "@/hooks/use-chroma-store";
import { createChromaChart, createHueChart } from "@/lib/tools/palette-charts";
import {
  hexToRgb,
  rgbToOklch,
  textColor,
  clamp,
  oklchToRgb,
  rgbToHex,
  nearestName,
} from "@/lib/utils";
import { useRegisterHotkey } from "@/providers/hotkey.provider";

// ─── Tab bar ──────────────────────────────────────────────────────────────────

type Tab = "oklch" | "p3";

function TabBar({ active, setActive }: { active: Tab; setActive: (t: Tab) => void }) {
  return (
    <div className="flex shrink-0 border-b border-border">
      {(
        [
          ["oklch", "OKLCH Space"],
          ["p3", "P3 Gamut"],
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

function EmptyState({ title }: { title: string }) {
  return (
    <div className="flex-1 p-6">
      <p className="text-[12px] text-muted-foreground">Generate a palette first to use {title}.</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OKLCH SCATTER TAB
// ═══════════════════════════════════════════════════════════════════════════════

function OklchTab() {
  const slots = useChromaStore((s) => s.slots);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener("chroma:refresh-plots", refresh);
    return () => window.removeEventListener("chroma:refresh-plots", refresh);
  }, []);

  const points = useMemo(
    () =>
      slots.map((slot) => {
        const rgb = hexToRgb(slot.color.hex);
        const lch = rgbToOklch(rgb);
        const name = slot.name || nearestName(rgb);
        return {
          slot,
          lch,
          name,
          hex: slot.color.hex,
          id: slot.id,
          locked: slot.locked,
          lightness: lch.L,
          chroma: lch.C,
          hue: lch.H,
        };
      }),
    [slots],
  );

  useRegisterHotkey({
    key: "r",
    label: "Refresh OKLCH plot",
    group: "OKLCH",
    handler: () => window.dispatchEvent(new Event("chroma:refresh-plots")),
  });

  const stats = useMemo(() => {
    if (!points.length) return null;
    const Ls = points.map((p) => p.lch.L);
    const Cs = points.map((p) => p.lch.C);
    const Hs = points.map((p) => p.lch.H);
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const spread = (arr: number[]) => Math.max(...arr) - Math.min(...arr);
    return {
      avgL: avg(Ls).toFixed(2),
      spreadL: spread(Ls).toFixed(2),
      avgC: avg(Cs).toFixed(3),
      spreadC: spread(Cs).toFixed(3),
      hueRange: spread(Hs).toFixed(0),
    };
  }, [points]);

  if (!slots.length) return <EmptyState title="OKLCH visualizer" />;

  return (
    <div className="flex-1 overflow-auto p-7">
      <div className="mx-auto max-w-225">
        <p className="mb-6 text-[11px] text-muted-foreground">
          Visualises your palette in perceptual OKLCH space. Equal L = equal perceived brightness.
          Points far apart on the chroma axis are more saturated. The hue wheel shows angular
          spread.
        </p>
        <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,17.5rem),1fr))] gap-6">
          <div className="w-full max-w-md min-w-0">
            <div className="mb-2 font-display text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              Chroma vs Lightness
            </div>
            <Chart
              key={`scatter-${revision}`}
              definition={createChromaChart(points)}
              ariaLabel="Palette chroma versus lightness"
              height={320}
              className="rounded-md border border-border/70 bg-muted/35 p-2"
            />
          </div>
          <div className="w-full max-w-80 min-w-0">
            <div className="mb-2 font-display text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              Hue Distribution
            </div>
            <Chart
              key={`hue-${revision}`}
              definition={createHueChart(points)}
              ariaLabel="Palette hue and chroma distribution"
              height={280}
              className="rounded-md border border-border/70 bg-muted/35 p-2"
            />
            <p className="mt-1.5 text-[9px] text-muted-foreground">Radius = chroma · Angle = hue</p>
          </div>
        </div>
        {stats && (
          <div className="mt-6 grid grid-cols-2 gap-3">
            {[
              ["Avg L", stats.avgL],
              ["L Spread", stats.spreadL],
              ["Avg C", stats.avgC],
              ["C Spread", stats.spreadC],
              ["H Range°", stats.hueRange],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-border bg-card p-3 text-center">
                <div className="mb-1 font-display text-[9px] tracking-widest text-muted-foreground uppercase">
                  {label}
                </div>
                <div className="font-mono text-[15px] font-bold text-primary">{value}</div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-5 flex flex-wrap gap-4 text-[10px] text-muted-foreground">
          {points.map((pt) => (
            <div key={pt.slot.id} className="flex items-center gap-1.5">
              <div
                className="h-3 w-3 rounded-full border border-white/20"
                style={{ background: pt.hex }}
              />
              <span>{pt.name}</span>
              <span className="font-mono">{pt.hex.toUpperCase()}</span>
              {pt.locked && <Lock className="size-3" aria-label="Locked color" />}
              <span className="font-mono opacity-60">
                L{parseFloat(pt.lch.L.toFixed(2))} C{parseFloat(pt.lch.C.toFixed(3))} H
                {Math.round(pt.lch.H)}°
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// P3 GAMUT TAB
// ═══════════════════════════════════════════════════════════════════════════════

const SRGB_TO_P3 = [0.8225, 0.1774, 0.0, 0.0332, 0.9669, 0.0, 0.0171, 0.0724, 0.9108];

function srgbLinear(c: number) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function p3Gamma(c: number) {
  return c <= 0.0030186 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}
function srgbToP3(r: number, g: number, b: number): [number, number, number] {
  const rL = srgbLinear(r / 255),
    gL = srgbLinear(g / 255),
    bL = srgbLinear(b / 255);
  const M = SRGB_TO_P3;
  return [
    p3Gamma(clamp(M[0] * rL + M[1] * gL + M[2] * bL, 0, 1)),
    p3Gamma(clamp(M[3] * rL + M[4] * gL + M[5] * bL, 0, 1)),
    p3Gamma(clamp(M[6] * rL + M[7] * gL + M[8] * bL, 0, 1)),
  ];
}

function isWideGamut(hex: string): boolean {
  return rgbToOklch(hexToRgb(hex)).C > 0.25;
}
function expandToP3(hex: string): string {
  const lch = rgbToOklch(hexToRgb(hex));
  return rgbToHex(oklchToRgb({ L: lch.L, C: clamp(lch.C * 1.25, lch.C, 0.38), H: lch.H }));
}
function p3CssColor(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const [rP3, gP3, bP3] = srgbToP3(r, g, b);
  return `color(display-p3 ${rP3.toFixed(4)} ${gP3.toFixed(4)} ${bP3.toFixed(4)})`;
}

function P3SwatchCard({ hex, index, showP3 }: { hex: string; index: number; showP3: boolean }) {
  const rgb = hexToRgb(hex);
  const lch = rgbToOklch(rgb);
  const wide = isWideGamut(hex);
  const expanded = wide ? expandToP3(hex) : hex;
  const p3Css = p3CssColor(hex);
  const name = nearestName(rgb);
  const tc = textColor(rgb);

  return (
    <div
      style={{
        borderRadius: 8,
        overflow: "hidden",
        border: `1px solid ${wide ? "rgba(99,102,241,.4)" : "var(--color-secondary)"}`,
        background: "var(--color-card)",
      }}
    >
      <div className="flex flex-col">
        <div
          style={{
            background: hex,
            height: showP3 ? 44 : 72,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <span className="text-[8.5px] font-bold" style={{ color: tc, opacity: 0.8 }}>
            sRGB
          </span>
          {wide && (
            <span
              className="absolute top-1 right-1 rounded px-1 py-px font-extrabold tracking-[.04em] text-white"
              style={{ background: "rgba(99,102,241,.9)", fontSize: 7 }}
            >
              P3+
            </span>
          )}
        </div>
        {showP3 && (
          <div
            className="flex items-center justify-center"
            style={{ background: p3Css, height: 44 }}
          >
            <span className="text-[8.5px] font-bold" style={{ color: tc, opacity: 0.8 }}>
              P3
            </span>
          </div>
        )}
      </div>
      <div className="px-2.5 py-2">
        <div className="mb-1 font-mono text-[9.5px] text-secondary-foreground">
          {hex.toUpperCase()}
        </div>
        <div className="mb-1.5 text-[8.5px] text-muted-foreground">{name}</div>
        <div className="mb-1 flex items-center gap-1.5">
          <span className="text-[8.5px] text-muted-foreground">C={lch.C.toFixed(3)}</span>
          <span className="text-[8.5px] text-muted-foreground">H={Math.round(lch.H)}°</span>
        </div>
        {wide ? (
          <div
            className="inline-block rounded px-1.5 py-0.5 text-[8px] font-bold text-primary"
            style={{ background: "rgba(99,102,241,.15)" }}
          >
            P3-capable → higher chroma possible
          </div>
        ) : (
          <div className="inline-block rounded bg-muted px-1.5 py-0.5 text-[8px] text-muted-foreground">
            sRGB gamut
          </div>
        )}
        {wide && showP3 && (
          <div className="mt-1.5">
            <div className="text-[8px] text-muted-foreground">P3 expanded:</div>
            <div className="mt-0.5 flex items-center gap-1">
              <div
                className="h-3.5 w-3.5 rounded"
                style={{
                  background: expanded,
                  border: "1px solid rgba(128,128,128,.2)",
                }}
              />
              <span className="font-mono text-[8.5px] text-muted-foreground">
                {expanded.toUpperCase()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function P3Tab() {
  const slots = useChromaStore((s) => s.slots);
  const [showP3, setShowP3] = useState(true);
  const [copiedCss, setCopiedCss] = useState(false);
  const wideCount = useMemo(() => slots.filter((s) => isWideGamut(s.color.hex)).length, [slots]);
  const p3Css = useMemo(() => {
    if (!slots.length) return "";
    return `:root {\n${slots.map((s, i) => `  --palette-${i + 1}-srgb: ${s.color.hex};\n  --palette-${i + 1}-p3: ${p3CssColor(s.color.hex)};`).join("\n")}\n}\n\n/* P3 variant for supporting displays */\n@supports (color: color(display-p3 0 0 0)) {\n  :root {\n${slots.map((s, i) => `    --palette-${i + 1}: ${p3CssColor(s.color.hex)};`).join("\n")}\n  }\n}`;
  }, [slots]);

  if (!slots.length) return <EmptyState title="P3 Gamut viewer" />;

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mx-auto max-w-225">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-2.5">
          <p className="max-w-150 text-[11px] text-muted-foreground">
            Display P3 covers ~50% more color volume than sRGB. Colors marked <strong>P3+</strong>{" "}
            have higher chroma available on capable displays. The P3 row shows{" "}
            <code>color(display-p3 …)</code> CSS — only visible on P3-capable hardware.
          </p>
          <Button
            variant={showP3 ? "default" : "ghost"}
            size="sm"
            onClick={() => setShowP3((v) => !v)}
          >
            {showP3 ? "P3 Preview: On" : "P3 Preview: Off"}
          </Button>
        </div>
        <div className="mb-5 flex flex-wrap gap-2.5">
          {[
            {
              label: "P3-capable colors",
              val: `${wideCount}/${slots.length}`,
              accent: wideCount > 0,
            },
            {
              label: "sRGB-only colors",
              val: `${slots.length - wideCount}/${slots.length}`,
              accent: false,
            },
            { label: "Gamut expansion", val: "C × 1.25", accent: false },
          ].map(({ label, val, accent }) => (
            <div
              key={label}
              style={{
                flex: "1 1 120px",
                background: "var(--color-card)",
                borderRadius: 6,
                border: `1px solid ${accent ? "rgba(99,102,241,.3)" : "var(--color-secondary)"}`,
                padding: "8px 12px",
              }}
            >
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 800,
                  color: accent ? "var(--color-primary)" : "var(--color-foreground)",
                }}
              >
                {val}
              </div>
              <div className="mt-0.5 text-[9px] tracking-[.05em] text-muted-foreground uppercase">
                {label}
              </div>
            </div>
          ))}
        </div>
        <div className="mb-5 rounded-md border border-muted bg-card px-3.5 py-2.5 text-[10.5px] leading-relaxed text-muted-foreground">
          <strong className="text-secondary-foreground">How P3 works:</strong> sRGB swatches (top)
          render on all displays. P3 swatches (bottom) use{" "}
          <code className="rounded bg-muted px-1 py-0">color(display-p3 …)</code> CSS — they only
          show wider colors on P3-capable hardware. Use the{" "}
          <code className="rounded bg-muted px-1 py-0">@supports</code> block to progressively
          enhance.
        </div>
        <div
          className="mb-7 grid gap-2.5"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          }}
        >
          {slots.map((slot, i) => (
            <P3SwatchCard key={i} hex={slot.color.hex} index={i} showP3={showP3} />
          ))}
        </div>
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <div className="font-display text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              CSS with P3 @supports fallback
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(p3Css).catch(() => {});
                setCopiedCss(true);
                setTimeout(() => setCopiedCss(false), 1400);
              }}
            >
              {copiedCss ? "✓ Copied" : "Copy"}
            </Button>
          </div>
          <pre className="max-h-70 overflow-x-auto overflow-y-auto rounded border border-border bg-secondary p-2.5 text-[9.5px] leading-[1.7] whitespace-pre text-muted-foreground">
            {p3Css}
          </pre>
        </div>
      </div>
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

export default function VisualizeView() {
  const [activeTab, setActiveTab] = useState<Tab>("oklch");
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="shrink-0 px-6 pt-5 pb-0">
        <h2 className="mb-1">Visualize</h2>
      </div>
      <TabBar active={activeTab} setActive={setActiveTab} />
      {activeTab === "oklch" && <OklchTab />}
      {activeTab === "p3" && <P3Tab />}
    </div>
  );
}
