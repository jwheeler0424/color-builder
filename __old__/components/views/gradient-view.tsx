import { useState, useMemo, useCallback } from "react";
import type { GradientStop, GradientState, GradientType } from "@/types";
import { useChromaStore } from "@/hooks/use-chroma-store";
import {
  parseHex,
  clamp,
  applySimMatrix,
  hexToRgb,
  rgbToHex,
} from "@/lib/utils";
import { GRAD_PRESETS, CB_TYPES } from "@/lib/constants/chroma";
import GradientStopBar from "@/components/gradient-stop-bar";
import { Button } from "@/components/ui/button";

// Apply easing to redistribute stop positions (redistributes evenly-spaced stops)
function applyEasing(t: number, mode: string): number {
  switch (mode) {
    case "ease-in":
      return t * t;
    case "ease-out":
      return 1 - (1 - t) * (1 - t);
    case "ease-in-out":
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    case "front-loaded":
      return Math.pow(t, 0.5); // square root — fast at start
    case "back-loaded":
      return Math.pow(t, 2.5); // cubic — slow then fast
    default:
      return t; // linear
  }
}

const DIRECTIONS = [
  { label: "→", val: "to right" },
  { label: "←", val: "to left" },
  { label: "↓", val: "to bottom" },
  { label: "↑", val: "to top" },
  { label: "↘", val: "to bottom right" },
  { label: "↙", val: "to bottom left" },
  { label: "135°", val: "135deg" },
  { label: "45°", val: "45deg" },
];

function buildCss(
  grad: GradientState,
  interp: "srgb" | "oklab" | "oklch" = "srgb",
): string {
  const sorted = grad.stops.slice().sort((a, b) => a.pos - b.pos);
  const str = sorted.map((x) => `${x.hex} ${x.pos}%`).join(", ");
  // CSS Color 4 interpolation hint: "in <space>" goes at the START of the gradient args,
  // before the direction/shape. e.g. linear-gradient(in oklab, to right, ...)
  const inSpace = interp !== "srgb" ? `in ${interp}, ` : "";
  if (grad.type === "radial")
    return `radial-gradient(${inSpace}circle at center, ${str})`;
  if (grad.type === "conic")
    return `conic-gradient(${inSpace}${grad.dir || "from 0deg"}, ${str})`;
  return `linear-gradient(${inSpace}${grad.dir}, ${str})`;
}

export default function GradientView() {
  const { gradient, slots, setGradient } = useChromaStore();
  const [copied, setCopied] = useState(false);
  const [interpSpace, setInterpSpace] = useState<"srgb" | "oklab" | "oklch">(
    "srgb",
  );
  const [showCvd, setShowCvd] = useState(false);
  const [easing, setEasing] = useState<
    | "linear"
    | "ease-in"
    | "ease-out"
    | "ease-in-out"
    | "front-loaded"
    | "back-loaded"
  >("linear");
  const g = gradient;
  const css = useMemo(() => buildCss(g, interpSpace), [g, interpSpace]);
  const selectedStop = g.stops[g.selectedStop] ?? g.stops[0];

  const setGrad = useCallback(
    (partial: Partial<GradientState>) => setGradient(partial),
    [setGradient],
  );

  const handleMoveStop = useCallback(
    (index: number, pos: number) => {
      const stops = g.stops.map((s, i) => (i === index ? { ...s, pos } : s));
      setGrad({ stops });
    },
    [g.stops, setGrad],
  );

  const handleAddStop = useCallback(
    (pos: number) => {
      // Find the colour at that position by interpolating nearest stops
      const sorted = g.stops.slice().sort((a, b) => a.pos - b.pos);
      let hex = "#ffffff";
      for (let i = 0; i < sorted.length - 1; i++) {
        if (pos >= sorted[i].pos && pos <= sorted[i + 1].pos) {
          hex = sorted[i].hex; // use left neighbour's colour as default
          break;
        }
      }
      const stops = [...g.stops, { hex, pos }];
      setGrad({ stops, selectedStop: stops.length - 1 });
    },
    [g.stops, setGrad],
  );

  const handleRemoveStop = useCallback(
    (index: number) => {
      if (g.stops.length <= 2) return;
      const stops = g.stops.filter((_, i) => i !== index);
      setGrad({
        stops,
        selectedStop: clamp(g.selectedStop, 0, stops.length - 1),
      });
    },
    [g.stops, g.selectedStop, setGrad],
  );

  const handleStopColor = (v: string) => {
    const h = parseHex(v);
    if (!h) return;
    const stops = g.stops.map((s, i) =>
      i === g.selectedStop ? { ...s, hex: h } : s,
    );
    setGrad({ stops });
  };

  const copyCss = () => {
    navigator.clipboard
      .writeText(`background: ${css};\nbackground-image: ${css};`)
      .catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const loadFromPalette = () => {
    if (!slots.length) return;
    const n = slots.length;
    const stops: GradientStop[] = slots.map((slot, i) => ({
      hex: slot.color.hex,
      pos: Math.round((i / (n - 1 || 1)) * 100),
    }));
    setGrad({ stops, selectedStop: 0 });
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 flex flex-col overflow-auto p-6">
        <div className="mb-5">
          <h2>Gradient Generator</h2>
          <p>
            Build CSS gradients from your palette or custom color stops. Drag
            handles to reposition.
          </p>
        </div>

        {/* Full-width preview */}
        <div
          className="w-full h-[200px] rounded border border-border mb-4 shrink-0 max-w-[960px]"
          style={{ background: css }}
        />

        {/* CVD simulation preview */}
        <div
          className="flex items-center gap-1.5"
          style={{ margin: "8px 0 4px" }}
        >
          <button
            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] border rounded font-mono font-bold tracking-[.04em] whitespace-nowrap cursor-pointer transition-colors bg-transparent text-secondary-foreground border-border hover:text-foreground hover:border-input"
            onClick={() => setShowCvd((v) => !v)}
          >
            {showCvd ? "▾ Hide CVD Preview" : "▸ Color Blindness Preview"}
          </button>
        </div>
        {showCvd && (
          <div className="mb-2.5">
            {CB_TYPES.filter((t) => t.id !== "normal").map((cbType) => {
              const simStops = g.stops.map((stop) => {
                const rgb = applySimMatrix(hexToRgb(stop.hex), cbType.matrix);
                return { ...stop, hex: rgbToHex(rgb) };
              });
              const simState = { ...g, stops: simStops };
              const simCss = buildCss(simState, interpSpace);
              return (
                <div key={cbType.id} className="items-center flex mb-1 gap-2">
                  <div
                    className="flex-1 rounded"
                    style={{
                      height: 18,
                      background: simCss,
                      border: "1px solid rgba(128,128,128,.15)",
                    }}
                  />
                  <span className="text-[9px] text-muted-foreground min-w-[90px] text-right">
                    {cbType.name}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Draggable stop bar — Phase 1.1 */}
        <GradientStopBar
          stops={g.stops}
          selectedStop={g.selectedStop}
          gradientCss={css}
          onSelectStop={(i) => setGrad({ selectedStop: i })}
          onMoveStop={handleMoveStop}
          onAddStop={handleAddStop}
          onRemoveStop={handleRemoveStop}
        />

        {/* CSS output */}
        <div className="text-muted-foreground mb-1.5 text-[11px]">
          CSS Output
        </div>
        <div className="bg-secondary border border-border rounded p-3 font-mono text-[11px] leading-[1.8] text-muted-foreground whitespace-pre-wrap break-all max-w-[960px]">
          {`background: ${css};\nbackground-image: ${css};`}
        </div>
        <div className="flex mt-2 gap-1.5">
          <Button variant="ghost" size="sm" onClick={copyCss}>
            {copied ? "✓ Copied" : "Copy CSS"}
          </Button>
          <Button variant="ghost" size="sm" onClick={loadFromPalette}>
            ← Load from Palette
          </Button>
        </div>
      </div>

      {/* Side panel */}
      <div className="w-[320px] bg-card border-l border-border overflow-y-auto shrink-0 p-4 flex flex-col gap-3.5">
        {/* Type */}
        <div>
          <div className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2.5 font-display font-semibold">
            Type
          </div>
          <div className="flex gap-1">
            {(["linear", "radial", "conic"] as GradientType[]).map((t) => (
              <Button
                key={t}
                variant={g.type === t ? "default" : "ghost"}
                size="sm"
                onClick={() => setGrad({ type: t })}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Direction (linear only) */}
        {g.type === "linear" && (
          <div>
            <div className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2.5 font-display font-semibold">
              Direction
            </div>
            <div className="flex-wrap flex gap-1">
              {DIRECTIONS.map(({ label, val }) => (
                <Button
                  key={val}
                  variant={g.dir === val ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setGrad({ dir: val })}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Conic from angle */}
        {g.type === "conic" && (
          <div>
            <div className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2.5 font-display font-semibold">
              Starting Angle
            </div>
            <div className="flex-wrap flex gap-1">
              {["from 0deg", "from 45deg", "from 90deg", "from 180deg"].map(
                (d) => (
                  <Button
                    key={d}
                    variant={g.dir === d ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setGrad({ dir: d })}
                  >
                    {d.replace("from ", "")}
                  </Button>
                ),
              )}
            </div>
          </div>
        )}

        {/* Selected stop editor */}
        <div>
          <div className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2.5 font-display font-semibold">
            Selected Stop ({g.selectedStop + 1} of {g.stops.length})
          </div>
          <div className="items-center mb-2.5 flex gap-2">
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 3,
                background: selectedStop?.hex,
                border: "2px solid var(--color-input)",
                flexShrink: 0,
              }}
            />
            <input
              className="w-full bg-muted border border-border rounded px-2 py-1.5 text-[12px] text-foreground font-mono tracking-[.06em] outline-none focus:border-ring transition-colors placeholder:text-muted-foreground"
              value={selectedStop?.hex ?? ""}
              onChange={(e) => handleStopColor(e.target.value)}
              maxLength={7}
              spellCheck={false}
              autoComplete="off"
            />
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground">
            Position: <span>{selectedStop?.pos ?? 0}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={selectedStop?.pos ?? 0}
            onChange={(e) => handleMoveStop(g.selectedStop, +e.target.value)}
          />
        </div>

        {/* Interpolation space */}
        <div>
          <div className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2.5 font-display font-semibold">
            Interpolation Space
          </div>
          <div className="flex-wrap flex gap-1">
            {(
              [
                {
                  id: "srgb",
                  label: "sRGB",
                  title:
                    "Standard CSS — can produce muddy midpoints on complementary pairs",
                },
                {
                  id: "oklab",
                  label: "OKLab",
                  title: "CSS Color 4 — perceptually uniform, vivid midpoints",
                },
                {
                  id: "oklch",
                  label: "OKLCH",
                  title:
                    "CSS Color 4 — hue-aware, great for analogous gradients",
                },
              ] as const
            ).map(({ id, label, title }) => (
              <Button
                key={id}
                variant={interpSpace === id ? "default" : "ghost"}
                size="sm"
                title={title}
                onClick={() => setInterpSpace(id)}
              >
                {label}
              </Button>
            ))}
          </div>
          {interpSpace !== "srgb" && (
            <div className="text-[9.5px] text-muted-foreground leading-[1.5] mt-[5px]">
              CSS Color 4 syntax — requires Chrome 111+ / Safari 16.4+. Firefox
              support landing soon.
            </div>
          )}
        </div>

        {/* Easing */}
        <div>
          <div className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2.5 font-display font-semibold">
            Stop Distribution Easing
          </div>
          <div className="flex-wrap flex gap-1">
            {(
              [
                { id: "linear", label: "Linear" },
                { id: "ease-in", label: "Ease In" },
                { id: "ease-out", label: "Ease Out" },
                { id: "ease-in-out", label: "S-Curve" },
                { id: "front-loaded", label: "Front" },
                { id: "back-loaded", label: "Back" },
              ] as const
            ).map(({ id, label }) => (
              <Button
                key={id}
                variant={easing === id ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  setEasing(id);
                  if (g.stops.length < 2) return;
                  // Re-distribute stops according to easing function
                  const sorted = [...g.stops].sort((a, b) => a.pos - b.pos);
                  const n = sorted.length - 1;
                  const newStops = sorted.map((s, i) => {
                    if (i === 0 || i === n) return s;
                    const t = i / n;
                    return { ...s, pos: Math.round(applyEasing(t, id) * 100) };
                  });
                  setGrad({ stops: newStops });
                }}
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="text-muted-foreground leading-[1.5] text-[9.5px] mt-1">
            Redistributes middle stop positions. First and last stops stay
            fixed.
          </div>
        </div>

        {/* Presets */}
        <div>
          <div className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2.5 font-display font-semibold">
            Presets
          </div>
          <div className="flex-col flex gap-1">
            {GRAD_PRESETS.map((p, i) => (
              <button
                key={i}
                className="inline-flex items-center gap-2 px-2 py-1 text-[10px] border rounded font-mono font-bold tracking-[.04em] whitespace-nowrap cursor-pointer transition-colors bg-transparent text-secondary-foreground border-border hover:text-foreground hover:border-input justify-start text-left"
                onClick={() =>
                  setGrad({
                    ...p,
                    stops: p.stops.map((s) => ({ ...s })),
                    selectedStop: 0,
                  })
                }
              >
                <span
                  className="inline-block rounded shrink-0 h-2.5"
                  style={{
                    width: 32,
                    background: buildCss({
                      ...p,
                      stops: p.stops,
                      selectedStop: 0,
                    }),
                  }}
                />
                {p.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
