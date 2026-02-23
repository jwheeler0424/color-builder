/**
 * oklch-scatter-view.tsx
 *
 * OKLCH Perceptual Color Space Visualizer
 *
 * Renders palette colors as a scatter plot in OKLCH (C, L) space:
 *   X axis = Chroma  (0 → 0.37, chromatic range of sRGB)
 *   Y axis = Lightness (0 → 1, perceptual brightness)
 *   Dot color = actual hex value
 *   Dot size = larger for locked slots
 *
 * A second "Hue wheel" panel shows all colors projected onto the hue circle
 * at their actual chroma radius — visualising hue spread.
 */

import { useMemo, useRef, useEffect } from "react";
import { useChromaStore } from "@/hooks/use-chroma-store";
import { useRegisterHotkey } from "@/providers/hotkey.provider";
import { hexToRgb, rgbToOklch, textColor, nearestName } from "@/lib/utils";

const CANVAS_W = 440;
const CANVAS_H = 340;
const PAD = { top: 24, right: 20, bottom: 40, left: 48 };

const C_MAX = 0.37;
const L_MAX = 1.0;

function toCanvasX(c: number) {
  return PAD.left + (c / C_MAX) * (CANVAS_W - PAD.left - PAD.right);
}
function toCanvasY(l: number) {
  // Y: 0 at top, L=1 should be at top
  return PAD.top + (1 - l / L_MAX) * (CANVAS_H - PAD.top - PAD.bottom);
}

// ─── Main View ────────────────────────────────────────────────────────────────

export default function OklchScatterView() {
  const slots = useChromaStore((s) => s.slots);
  const scatterRef = useRef<HTMLCanvasElement>(null);
  const hueWheelRef = useRef<HTMLCanvasElement>(null);

  useRegisterHotkey({
    key: "r",
    label: "Refresh OKLCH plot",
    group: "OKLCH",
    handler: () => {
      drawScatter();
      drawHueWheel();
    },
  });

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

  // ── Scatter plot ─────────────────────────────────────────────────────────

  function drawScatter() {
    const canvas = scatterRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // HiDPI
    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_W * dpr;
    canvas.height = CANVAS_H * dpr;
    canvas.style.width = CANVAS_W + "px";
    canvas.style.height = CANVAS_H + "px";
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Background
    ctx.fillStyle = "#141414";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Grid lines
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

    // Axes
    ctx.strokeStyle = "rgba(255,255,255,.2)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(PAD.left, PAD.top);
    ctx.lineTo(PAD.left, CANVAS_H - PAD.bottom);
    ctx.lineTo(CANVAS_W - PAD.right, CANVAS_H - PAD.bottom);
    ctx.stroke();

    // Axis labels
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

    // Axis tick labels
    ctx.textAlign = "right";
    for (let l = 0; l <= 1.01; l += 0.2) {
      ctx.fillText(l.toFixed(1), PAD.left - 6, toCanvasY(l) + 4);
    }
    ctx.textAlign = "center";
    for (let c = 0; c <= C_MAX; c += 0.1) {
      ctx.fillText(c.toFixed(2), toCanvasX(c), CANVAS_H - PAD.bottom + 14);
    }

    // Draw connecting lines (order: left to right by chroma)
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

    // Draw dots
    for (const pt of points) {
      const x = toCanvasX(pt.lch.C);
      const y = toCanvasY(pt.lch.L);
      const r = pt.slot.locked ? 10 : 8;

      // Shadow
      ctx.shadowColor = pt.hex;
      ctx.shadowBlur = 8;

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = pt.hex;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Border
      ctx.strokeStyle = "rgba(255,255,255,.4)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Lock indicator
      if (pt.slot.locked) {
        ctx.font = "9px sans-serif";
        ctx.fillStyle = "rgba(255,255,255,.9)";
        ctx.textAlign = "center";
        ctx.fillText("🔒", x, y - r - 3);
      }

      // Name label
      ctx.font = "bold 8px monospace";
      ctx.fillStyle = "rgba(255,255,255,.7)";
      ctx.textAlign = "center";
      ctx.fillText(pt.slot.color.hex.toUpperCase(), x, y + r + 10);
    }
  }

  // ── Hue wheel ────────────────────────────────────────────────────────────

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

    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const maxR = SIZE / 2 - 16;

    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = "#141414";
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Hue ring background (thin grey ring for orientation)
    ctx.strokeStyle = "rgba(255,255,255,.08)";
    ctx.lineWidth = 1;
    for (let r = maxR * 0.2; r <= maxR; r += maxR * 0.2) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Radial guides every 30°
    ctx.strokeStyle = "rgba(255,255,255,.06)";
    for (let deg = 0; deg < 360; deg += 30) {
      const rad = ((deg - 90) * Math.PI) / 180;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(rad) * maxR, cy + Math.sin(rad) * maxR);
      ctx.stroke();
    }

    // Hue labels
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
      const lx = cx + Math.cos(rad) * (maxR + 10);
      const ly = cy + Math.sin(rad) * (maxR + 10);
      ctx.fillText(label, lx, ly + 3);
    }

    // Draw dots — radius = chroma (normalised), angle = hue
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

  useEffect(() => {
    drawScatter();
    drawHueWheel();
  }, [points]);

  // ── Stats ─────────────────────────────────────────────────────────────────

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

  return (
    <div className="flex-1 overflow-auto p-7">
      <div className="mx-auto max-w-[900px]">
        <div className="mb-6">
          <h2>OKLCH Color Space</h2>
          <p>
            Visualises your palette in perceptual OKLCH space. Equal L = equal
            perceived brightness. Points far apart on the chroma axis are more
            saturated. The hue wheel shows angular spread.
          </p>
        </div>

        <div className="flex gap-8 flex-wrap items-start">
          {/* Scatter plot */}
          <div>
            <div className="text-[10px] tracking-[.1em] uppercase text-muted-foreground mb-2 font-display font-semibold">
              Chroma vs Lightness
            </div>
            <canvas
              ref={scatterRef}
              className="rounded border border-border block"
              style={{ background: "#141414" }}
            />
          </div>

          {/* Hue wheel */}
          <div>
            <div className="text-[10px] tracking-[.1em] uppercase text-muted-foreground mb-2 font-display font-semibold">
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

        {/* Stats */}
        {stats && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              { label: "Avg L", value: stats.avgL },
              { label: "L Spread", value: stats.spreadL },
              { label: "Avg C", value: stats.avgC },
              { label: "C Spread", value: stats.spreadC },
              { label: "H Range°", value: stats.hueRange },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="bg-card border border-border rounded-lg p-3 text-center"
              >
                <div className="text-[9px] tracking-[.1em] uppercase text-muted-foreground mb-1 font-display">
                  {label}
                </div>
                <div className="font-mono text-[15px] font-bold text-primary">
                  {value}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Legend */}
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
