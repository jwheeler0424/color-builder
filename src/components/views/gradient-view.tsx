import { useState, useMemo, useCallback } from "react";
import type { GradientStop, GradientState, GradientType } from "@/types";
import { useChromaStore } from "@/hooks/useChromaStore";
import {
  parseHex,
  clamp,
  applySimMatrix,
  hexToRgb,
  rgbToHex,
} from "@/lib/utils/colorMath";
import { GRAD_PRESETS, CB_TYPES } from "@/lib/constants/chroma";
import GradientStopBar from "../gradient-stop-bar";
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
  const inSpace = interp !== "srgb" ? ` in ${interp}` : "";
  if (grad.type === "radial")
    return `radial-gradient(circle at center${inSpace}, ${str})`;
  if (grad.type === "conic")
    return `conic-gradient(${grad.dir || "from 0deg"}, ${str})`;
  return `linear-gradient(${inSpace ? inSpace.trim() + ", " : ""}${grad.dir}, ${str})`;
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
    <div className="ch-view-grad">
      <div className="ch-grad-main">
        <div className="ch-view-hd">
          <h2>Gradient Generator</h2>
          <p>
            Build CSS gradients from your palette or custom color stops. Drag
            handles to reposition.
          </p>
        </div>

        {/* Full-width preview */}
        <div className="ch-grad-preview" style={{ background: css }} />

        {/* CVD simulation preview */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            margin: "8px 0 4px",
          }}
        >
          <button
            className="ch-btn ch-btn-ghost ch-btn-sm"
            onClick={() => setShowCvd((v) => !v)}
          >
            {showCvd ? "▾ Hide CVD Preview" : "▸ Color Blindness Preview"}
          </button>
        </div>
        {showCvd && (
          <div style={{ marginBottom: 10 }}>
            {CB_TYPES.filter((t) => t.id !== "normal").map((cbType) => {
              const simStops = g.stops.map((stop) => {
                const rgb = applySimMatrix(hexToRgb(stop.hex), cbType.matrix);
                return { ...stop, hex: rgbToHex(rgb) };
              });
              const simState = { ...g, stops: simStops };
              const simCss = buildCss(simState, interpSpace);
              return (
                <div
                  key={cbType.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 4,
                  }}
                >
                  <div
                    style={{
                      height: 18,
                      flex: 1,
                      borderRadius: 4,
                      background: simCss,
                      border: "1px solid rgba(128,128,128,.15)",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 9,
                      color: "var(--ch-t3)",
                      minWidth: 90,
                      textAlign: "right",
                    }}
                  >
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
        <div style={{ fontSize: 11, color: "var(--ch-t3)", marginBottom: 6 }}>
          CSS Output
        </div>
        <div className="ch-grad-css-box">
          {`background: ${css};\nbackground-image: ${css};`}
        </div>
        <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
          <Button variant="ghost" size="sm" onClick={copyCss}>
            {copied ? "✓ Copied" : "Copy CSS"}
          </Button>
          <Button variant="ghost" size="sm" onClick={loadFromPalette}>
            ← Load from Palette
          </Button>
        </div>
      </div>

      {/* Side panel */}
      <div className="ch-grad-panel">
        {/* Type */}
        <div>
          <div className="ch-slabel">Type</div>
          <div style={{ display: "flex", gap: 4 }}>
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
            <div className="ch-slabel">Direction</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
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
            <div className="ch-slabel">Starting Angle</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
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
          <div className="ch-slabel">
            Selected Stop ({g.selectedStop + 1} of {g.stops.length})
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 3,
                background: selectedStop?.hex,
                border: "2px solid var(--ch-b2)",
                flexShrink: 0,
              }}
            />
            <input
              className="ch-inp"
              value={selectedStop?.hex ?? ""}
              onChange={(e) => handleStopColor(e.target.value)}
              maxLength={7}
              spellCheck={false}
              autoComplete="off"
              style={{ fontFamily: "var(--ch-fm)", letterSpacing: ".06em" }}
            />
          </div>
          <div className="ch-slider-label">
            Position: <span>{selectedStop?.pos ?? 0}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            className="ch-range"
            value={selectedStop?.pos ?? 0}
            onChange={(e) => handleMoveStop(g.selectedStop, +e.target.value)}
          />
        </div>

        {/* Interpolation space */}
        <div>
          <div className="ch-slabel">Interpolation Space</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
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
            <div
              style={{
                fontSize: 9.5,
                color: "var(--ch-t3)",
                marginTop: 5,
                lineHeight: 1.5,
              }}
            >
              CSS Color 4 syntax — requires Chrome 111+ / Safari 16.4+. Firefox
              support landing soon.
            </div>
          )}
        </div>

        {/* Easing */}
        <div>
          <div className="ch-slabel">Stop Distribution Easing</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
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
          <div
            style={{
              fontSize: 9.5,
              color: "var(--ch-t3)",
              marginTop: 4,
              lineHeight: 1.5,
            }}
          >
            Redistributes middle stop positions. First and last stops stay
            fixed.
          </div>
        </div>

        {/* Presets */}
        <div>
          <div className="ch-slabel">Presets</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {GRAD_PRESETS.map((p, i) => (
              <button
                key={i}
                className="ch-btn ch-btn-ghost ch-btn-sm"
                style={{
                  textAlign: "left",
                  justifyContent: "flex-start",
                  gap: 8,
                }}
                onClick={() =>
                  setGrad({
                    ...p,
                    stops: p.stops.map((s) => ({ ...s })),
                    selectedStop: 0,
                  })
                }
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 32,
                    height: 10,
                    borderRadius: 2,
                    flexShrink: 0,
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
