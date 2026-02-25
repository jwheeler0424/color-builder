/**
 * visualize.view.tsx  — Phase 1 merge
 *
 * Combines: oklch-scatter-view + p3-gamut-view
 * Sub-tabs:  [OKLCH Space] [P3 Gamut]
 */

import { useMemo, useRef, useEffect, useState } from "react";
import { useChromaStore } from "@/hooks/use-chroma-store";
import { useRegisterHotkey } from "@/providers/hotkey.provider";
import {
  hexToRgb,
  rgbToOklch,
  textColor,
  clamp,
  oklchToRgb,
  rgbToHex,
  nearestName,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ─── Tab bar ──────────────────────────────────────────────────────────────────

type Tab = "oklch" | "p3";

function TabBar({
  active,
  setActive,
}: {
  active: Tab;
  setActive: (t: Tab) => void;
}) {
  return (
    <div className="flex border-b border-border shrink-0">
      {(
        [
          ["oklch", "OKLCH Space"],
          ["p3", "P3 Gamut"],
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

function EmptyState({ title }: { title: string }) {
  return (
    <div className="flex-1 p-6">
      <p className="text-muted-foreground text-[12px]">
        Generate a palette first to use {title}.
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OKLCH SCATTER TAB
// ═══════════════════════════════════════════════════════════════════════════════

const CANVAS_W = 440;
const CANVAS_H = 340;
const PAD = { top: 24, right: 20, bottom: 40, left: 48 };
const C_MAX = 0.37;
const L_MAX = 1.0;

function toCanvasX(c: number) {
  return PAD.left + (c / C_MAX) * (CANVAS_W - PAD.left - PAD.right);
}
function toCanvasY(l: number) {
  return PAD.top + (1 - l / L_MAX) * (CANVAS_H - PAD.top - PAD.bottom);
}

function OklchTab() {
  const slots = useChromaStore((s) => s.slots);
  const scatterRef = useRef<HTMLCanvasElement>(null);
  const hueWheelRef = useRef<HTMLCanvasElement>(null);

  const points = useMemo(
    () =>
      slots.map((slot) => {
        const rgb = hexToRgb(slot.color.hex);
        const lch = rgbToOklch(rgb);
        const name = slot.name || nearestName(rgb);
        const tc = textColor(rgb);
        return { slot, lch, name, tc, hex: slot.color.hex };
      }),
    [slots],
  );

  function drawScatter() {
    const canvas = scatterRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_W * dpr;
    canvas.height = CANVAS_H * dpr;
    canvas.style.width = CANVAS_W + "px";
    canvas.style.height = CANVAS_H + "px";
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = "#141414";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.strokeStyle = "rgba(255,255,255,.07)";
    ctx.lineWidth = 1;
    for (let l = 0; l <= 1; l += 0.2) {
      const y = toCanvasY(l);
      ctx.beginPath();
      ctx.moveTo(PAD.left, y);
      ctx.lineTo(CANVAS_W - PAD.right, y);
      ctx.stroke();
    }
    for (let c = 0; c <= C_MAX; c += 0.05) {
      const x = toCanvasX(c);
      ctx.beginPath();
      ctx.moveTo(x, PAD.top);
      ctx.lineTo(x, CANVAS_H - PAD.bottom);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255,255,255,.2)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(PAD.left, PAD.top);
    ctx.lineTo(PAD.left, CANVAS_H - PAD.bottom);
    ctx.lineTo(CANVAS_W - PAD.right, CANVAS_H - PAD.bottom);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.45)";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText(
      "Chroma (C)",
      PAD.left + (CANVAS_W - PAD.left - PAD.right) / 2,
      CANVAS_H - 8,
    );
    ctx.save();
    ctx.translate(14, PAD.top + (CANVAS_H - PAD.top - PAD.bottom) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Lightness (L)", 0, 0);
    ctx.restore();
    ctx.textAlign = "right";
    for (let l = 0; l <= 1.01; l += 0.2) {
      ctx.fillText(l.toFixed(1), PAD.left - 6, toCanvasY(l) + 4);
    }
    ctx.textAlign = "center";
    for (let c = 0; c <= C_MAX; c += 0.1) {
      ctx.fillText(c.toFixed(2), toCanvasX(c), CANVAS_H - PAD.bottom + 14);
    }
    if (points.length > 1) {
      const sorted = [...points].sort((a, b) => a.lch.C - b.lch.C);
      ctx.strokeStyle = "rgba(255,255,255,.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(toCanvasX(sorted[0].lch.C), toCanvasY(sorted[0].lch.L));
      for (let i = 1; i < sorted.length; i++) {
        ctx.lineTo(toCanvasX(sorted[i].lch.C), toCanvasY(sorted[i].lch.L));
      }
      ctx.stroke();
    }
    for (const pt of points) {
      const x = toCanvasX(pt.lch.C);
      const y = toCanvasY(pt.lch.L);
      const r = pt.slot.locked ? 10 : 8;
      ctx.shadowColor = pt.hex;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = pt.hex;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(255,255,255,.4)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      if (pt.slot.locked) {
        ctx.font = "9px sans-serif";
        ctx.fillStyle = "rgba(255,255,255,.9)";
        ctx.textAlign = "center";
        ctx.fillText("🔒", x, y - r - 3);
      }
      ctx.font = "bold 8px monospace";
      ctx.fillStyle = "rgba(255,255,255,.7)";
      ctx.textAlign = "center";
      ctx.fillText(pt.slot.color.hex.toUpperCase(), x, y + r + 10);
    }
  }

  function drawHueWheel() {
    const canvas = hueWheelRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const SIZE = 280;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    canvas.style.width = SIZE + "px";
    canvas.style.height = SIZE + "px";
    ctx.scale(dpr, dpr);
    const cx = SIZE / 2,
      cy = SIZE / 2,
      maxR = SIZE / 2 - 16;
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = "#141414";
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.strokeStyle = "rgba(255,255,255,.08)";
    ctx.lineWidth = 1;
    for (let r = maxR * 0.2; r <= maxR; r += maxR * 0.2) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255,255,255,.06)";
    for (let deg = 0; deg < 360; deg += 30) {
      const rad = ((deg - 90) * Math.PI) / 180;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(rad) * maxR, cy + Math.sin(rad) * maxR);
      ctx.stroke();
    }
    ctx.font = "9px monospace";
    ctx.fillStyle = "rgba(255,255,255,.3)";
    ctx.textAlign = "center";
    const HUE_LABELS: [string, number][] = [
      ["0° R", 0],
      ["60° Y", 60],
      ["120° G", 120],
      ["180° C", 180],
      ["240° B", 240],
      ["300° M", 300],
    ];
    for (const [label, deg] of HUE_LABELS) {
      const rad = ((deg - 90) * Math.PI) / 180;
      ctx.fillText(
        label,
        cx + Math.cos(rad) * (maxR + 10),
        cy + Math.sin(rad) * (maxR + 10) + 3,
      );
    }
    for (const pt of points) {
      const hRad = ((pt.lch.H - 90) * Math.PI) / 180;
      const r = (pt.lch.C / C_MAX) * maxR;
      const x = cx + Math.cos(hRad) * r;
      const y = cy + Math.sin(hRad) * r;
      const dot = pt.slot.locked ? 10 : 8;
      ctx.shadowColor = pt.hex;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(x, y, dot, 0, Math.PI * 2);
      ctx.fillStyle = pt.hex;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(255,255,255,.4)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  useRegisterHotkey({
    key: "r",
    label: "Refresh OKLCH plot",
    group: "OKLCH",
    handler: () => {
      drawScatter();
      drawHueWheel();
    },
  });
  useEffect(() => {
    drawScatter();
    drawHueWheel();
  }, [points]);

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
        <p className="text-muted-foreground text-[11px] mb-6">
          Visualises your palette in perceptual OKLCH space. Equal L = equal
          perceived brightness. Points far apart on the chroma axis are more
          saturated. The hue wheel shows angular spread.
        </p>
        <div className="flex gap-8 flex-wrap items-start">
          <div>
            <div className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2 font-display font-semibold">
              Chroma vs Lightness
            </div>
            <canvas
              ref={scatterRef}
              className="rounded border border-border block"
              style={{ background: "#141414" }}
            />
          </div>
          <div>
            <div className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2 font-display font-semibold">
              Hue Distribution
            </div>
            <canvas
              ref={hueWheelRef}
              className="rounded border border-border block"
              style={{ background: "#141414" }}
            />
            <p className="text-[9px] text-muted-foreground mt-1.5">
              Radius = chroma · Angle = hue
            </p>
          </div>
        </div>
        {stats && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              ["Avg L", stats.avgL],
              ["L Spread", stats.spreadL],
              ["Avg C", stats.avgC],
              ["C Spread", stats.spreadC],
              ["H Range°", stats.hueRange],
            ].map(([label, value]) => (
              <div
                key={label}
                className="bg-card border border-border rounded-lg p-3 text-center"
              >
                <div className="text-[9px] tracking-widest uppercase text-muted-foreground mb-1 font-display">
                  {label}
                </div>
                <div className="font-mono text-[15px] font-bold text-primary">
                  {value}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-5 flex gap-4 flex-wrap text-[10px] text-muted-foreground">
          {points.map((pt) => (
            <div key={pt.slot.id} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full border border-white/20"
                style={{ background: pt.hex }}
              />
              <span>{pt.name}</span>
              <span className="font-mono opacity-60">
                L{parseFloat(pt.lch.L.toFixed(2))} C
                {parseFloat(pt.lch.C.toFixed(3))} H{Math.round(pt.lch.H)}°
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

const SRGB_TO_P3 = [
  0.8225, 0.1774, 0.0, 0.0332, 0.9669, 0.0, 0.0171, 0.0724, 0.9108,
];

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
  return rgbToHex(
    oklchToRgb({ L: lch.L, C: clamp(lch.C * 1.25, lch.C, 0.38), H: lch.H }),
  );
}
function p3CssColor(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const [rP3, gP3, bP3] = srgbToP3(r, g, b);
  return `color(display-p3 ${rP3.toFixed(4)} ${gP3.toFixed(4)} ${bP3.toFixed(4)})`;
}

function P3SwatchCard({
  hex,
  index,
  showP3,
}: {
  hex: string;
  index: number;
  showP3: boolean;
}) {
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
      <div className="flex-col flex">
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
          <span
            className="text-[8.5px] font-bold"
            style={{ color: tc, opacity: 0.8 }}
          >
            sRGB
          </span>
          {wide && (
            <span
              className="absolute text-white font-extrabold rounded tracking-[.04em] top-1 right-1 px-1 py-px"
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
            <span
              className="text-[8.5px] font-bold"
              style={{ color: tc, opacity: 0.8 }}
            >
              P3
            </span>
          </div>
        )}
      </div>
      <div className="px-2.5 py-2">
        <div className="text-[9.5px] font-mono text-secondary-foreground mb-1">
          {hex.toUpperCase()}
        </div>
        <div className="text-muted-foreground mb-1.5 text-[8.5px]">{name}</div>
        <div className="items-center flex mb-1 gap-1.5">
          <span className="text-muted-foreground text-[8.5px]">
            C={lch.C.toFixed(3)}
          </span>
          <span className="text-muted-foreground text-[8.5px]">
            H={Math.round(lch.H)}°
          </span>
        </div>
        {wide ? (
          <div
            className="text-[8px] font-bold rounded inline-block text-primary px-1.5 py-0.5"
            style={{ background: "rgba(99,102,241,.15)" }}
          >
            P3-capable → higher chroma possible
          </div>
        ) : (
          <div className="text-[8px] rounded inline-block bg-muted text-muted-foreground px-1.5 py-0.5">
            sRGB gamut
          </div>
        )}
        {wide && showP3 && (
          <div className="mt-1.5">
            <div className="text-muted-foreground text-[8px]">P3 expanded:</div>
            <div className="flex items-center gap-1 mt-0.5">
              <div
                className="rounded w-3.5 h-3.5"
                style={{
                  background: expanded,
                  border: "1px solid rgba(128,128,128,.2)",
                }}
              />
              <span className="font-mono text-muted-foreground text-[8.5px]">
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
  const wideCount = useMemo(
    () => slots.filter((s) => isWideGamut(s.color.hex)).length,
    [slots],
  );
  const p3Css = useMemo(() => {
    if (!slots.length) return "";
    return `:root {\n${slots.map((s, i) => `  --palette-${i + 1}-srgb: ${s.color.hex};\n  --palette-${i + 1}-p3: ${p3CssColor(s.color.hex)};`).join("\n")}\n}\n\n/* P3 variant for supporting displays */\n@supports (color: color(display-p3 0 0 0)) {\n  :root {\n${slots.map((s, i) => `    --palette-${i + 1}: ${p3CssColor(s.color.hex)};`).join("\n")}\n  }\n}`;
  }, [slots]);

  if (!slots.length) return <EmptyState title="P3 Gamut viewer" />;

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-225 mx-auto">
        <div className="mb-5 justify-between items-start flex-wrap flex gap-2.5">
          <p className="text-muted-foreground text-[11px] max-w-150">
            Display P3 covers ~50% more color volume than sRGB. Colors marked{" "}
            <strong>P3+</strong> have higher chroma available on capable
            displays. The P3 row shows <code>color(display-p3 …)</code> CSS —
            only visible on P3-capable hardware.
          </p>
          <Button
            variant={showP3 ? "default" : "ghost"}
            size="sm"
            onClick={() => setShowP3((v) => !v)}
          >
            {showP3 ? "P3 Preview: On" : "P3 Preview: Off"}
          </Button>
        </div>
        <div className="flex-wrap mb-5 flex gap-2.5">
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
                  color: accent
                    ? "var(--color-primary)"
                    : "var(--color-foreground)",
                }}
              >
                {val}
              </div>
              <div className="text-[9px] text-muted-foreground uppercase tracking-[.05em] mt-0.5">
                {label}
              </div>
            </div>
          ))}
        </div>
        <div className="text-[10.5px] text-muted-foreground leading-relaxed mb-5 bg-card rounded-md px-3.5 py-2.5 border border-muted">
          <strong className="text-secondary-foreground">How P3 works:</strong>{" "}
          sRGB swatches (top) render on all displays. P3 swatches (bottom) use{" "}
          <code className="bg-muted rounded px-1 py-0">
            color(display-p3 …)
          </code>{" "}
          CSS — they only show wider colors on P3-capable hardware. Use the{" "}
          <code className="bg-muted rounded px-1 py-0">@supports</code> block to
          progressively enhance.
        </div>
        <div
          className="grid gap-2.5 mb-7"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          }}
        >
          {slots.map((slot, i) => (
            <P3SwatchCard
              key={i}
              hex={slot.color.hex}
              index={i}
              showP3={showP3}
            />
          ))}
        </div>
        <div>
          <div className="justify-between items-center mb-2.5 flex">
            <div className="text-[10px] tracking-widest uppercase text-muted-foreground font-display font-semibold">
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
          <pre className="bg-secondary border border-border rounded p-2.5 text-[9.5px] leading-[1.7] text-muted-foreground whitespace-pre overflow-x-auto max-h-70 overflow-y-auto">
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
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 pt-5 pb-0 shrink-0">
        <h2 className="mb-1">Visualize</h2>
      </div>
      <TabBar active={activeTab} setActive={setActiveTab} />
      {activeTab === "oklch" && <OklchTab />}
      {activeTab === "p3" && <P3Tab />}
    </div>
  );
}
