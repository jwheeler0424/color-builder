import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import type { RGB, HSL, HSV, OKLCH } from "@/types";
import {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  rgbToHsv,
  rgbToOklch,
  oklchToRgb,
  parseHex,
  clamp,
  toCssRgb,
  toCssHsl,
  toCssOklch,
} from "@/lib/utils/colorMath";
import { nearestName } from "@/lib/utils/paletteUtils";
import ColorWheel from "@/components/color-wheel";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

type PickerMode = "rgb" | "hsl" | "hsv" | "oklch";

// ─── Slider helpers ───────────────────────────────────────────────────────────

function channelGrad(steps: number, sample: (t: number) => string): string {
  const stops = Array.from({ length: steps + 1 }, (_, i) => sample(i / steps));
  return `linear-gradient(to right, ${stops.join(", ")})`;
}

function SliderRow({
  label,
  display,
  value,
  min,
  max,
  trackBg,
  onChange,
}: {
  label: string;
  display: string;
  value: number;
  min: number;
  max: number;
  trackBg: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="ch-sliders-row">
      <span className="ch-sliders-label">{label}</span>
      <div className="ch-sliders-track" style={{ background: trackBg }}>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(+e.target.value)}
          className="ch-range"
        />
      </div>
      <span className="ch-sliders-val">{display}</span>
    </div>
  );
}

function RgbSliders({ rgb, onRgb }: { rgb: RGB; onRgb: (r: RGB) => void }) {
  const grad = (ch: "r" | "g" | "b") =>
    channelGrad(6, (t) => rgbToHex({ ...rgb, [ch]: Math.round(t * 255) }));
  return (
    <div className="ch-sliders">
      <SliderRow
        label="R"
        display={String(rgb.r)}
        value={rgb.r}
        min={0}
        max={255}
        trackBg={grad("r")}
        onChange={(v) => onRgb({ ...rgb, r: v })}
      />
      <SliderRow
        label="G"
        display={String(rgb.g)}
        value={rgb.g}
        min={0}
        max={255}
        trackBg={grad("g")}
        onChange={(v) => onRgb({ ...rgb, g: v })}
      />
      <SliderRow
        label="B"
        display={String(rgb.b)}
        value={rgb.b}
        min={0}
        max={255}
        trackBg={grad("b")}
        onChange={(v) => onRgb({ ...rgb, b: v })}
      />
    </div>
  );
}

function HslSliders({
  hsl,
  hex,
  onHsl,
}: {
  hsl: HSL;
  hex: string;
  onHsl: (h: HSL) => void;
}) {
  const hGrad = channelGrad(12, (t) =>
    rgbToHex(hslToRgb({ ...hsl, h: t * 360 })),
  );
  const sGrad = channelGrad(6, (t) =>
    rgbToHex(hslToRgb({ ...hsl, s: t * 100 })),
  );
  const lGrad = channelGrad(6, (t) =>
    rgbToHex(hslToRgb({ ...hsl, l: t * 100 })),
  );
  return (
    <div className="ch-sliders">
      <SliderRow
        label="H"
        display={`${Math.round(hsl.h)}°`}
        value={Math.round(hsl.h)}
        min={0}
        max={360}
        trackBg={hGrad}
        onChange={(v) => onHsl({ ...hsl, h: v })}
      />
      <SliderRow
        label="S"
        display={`${Math.round(hsl.s)}%`}
        value={Math.round(hsl.s)}
        min={0}
        max={100}
        trackBg={sGrad}
        onChange={(v) => onHsl({ ...hsl, s: v })}
      />
      <SliderRow
        label="L"
        display={`${Math.round(hsl.l)}%`}
        value={Math.round(hsl.l)}
        min={0}
        max={100}
        trackBg={lGrad}
        onChange={(v) => onHsl({ ...hsl, l: v })}
      />
    </div>
  );
}

function HsvSliders({ hsv, onHsv }: { hsv: HSV; onHsv: (h: HSV) => void }) {
  function hsvToRgbLocal(h: number, s: number, v: number): RGB {
    const s1 = s / 100,
      v1 = v / 100,
      c = v1 * s1,
      x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
      m = v1 - c;
    let r = 0,
      g = 0,
      b = 0;
    if (h < 60) {
      r = c;
      g = x;
    } else if (h < 120) {
      r = x;
      g = c;
    } else if (h < 180) {
      g = c;
      b = x;
    } else if (h < 240) {
      g = x;
      b = c;
    } else if (h < 300) {
      r = x;
      b = c;
    } else {
      r = c;
      b = x;
    }
    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255),
    };
  }
  const hGrad = channelGrad(12, (t) =>
    rgbToHex(hsvToRgbLocal(t * 360, hsv.s, hsv.v)),
  );
  const sGrad = channelGrad(6, (t) =>
    rgbToHex(hsvToRgbLocal(hsv.h, t * 100, hsv.v)),
  );
  const vGrad = channelGrad(6, (t) =>
    rgbToHex(hsvToRgbLocal(hsv.h, hsv.s, t * 100)),
  );
  return (
    <div className="ch-sliders">
      <SliderRow
        label="H"
        display={`${Math.round(hsv.h)}°`}
        value={Math.round(hsv.h)}
        min={0}
        max={360}
        trackBg={hGrad}
        onChange={(v) => onHsv({ ...hsv, h: v })}
      />
      <SliderRow
        label="S"
        display={`${Math.round(hsv.s)}%`}
        value={Math.round(hsv.s)}
        min={0}
        max={100}
        trackBg={sGrad}
        onChange={(v) => onHsv({ ...hsv, s: v })}
      />
      <SliderRow
        label="V"
        display={`${Math.round(hsv.v)}%`}
        value={Math.round(hsv.v)}
        min={0}
        max={100}
        trackBg={vGrad}
        onChange={(v) => onHsv({ ...hsv, v: v })}
      />
    </div>
  );
}

function OklchSliders({
  oklch,
  onOklch,
}: {
  oklch: OKLCH;
  onOklch: (o: OKLCH) => void;
}) {
  const lGrad = channelGrad(8, (t) => rgbToHex(oklchToRgb({ ...oklch, L: t })));
  const cGrad = channelGrad(8, (t) =>
    rgbToHex(oklchToRgb({ ...oklch, C: clamp(t * 0.37, 0, 0.37) })),
  );
  const hGrad = channelGrad(12, (t) =>
    rgbToHex(oklchToRgb({ ...oklch, H: t * 360 })),
  );
  return (
    <div className="ch-sliders">
      <SliderRow
        label="L"
        display={`${Math.round(oklch.L * 100)}%`}
        value={Math.round(oklch.L * 1000)}
        min={0}
        max={1000}
        trackBg={lGrad}
        onChange={(v) => onOklch({ ...oklch, L: v / 1000 })}
      />
      <SliderRow
        label="C"
        display={oklch.C.toFixed(3)}
        value={Math.round(oklch.C * 1000)}
        min={0}
        max={370}
        trackBg={cGrad}
        onChange={(v) => onOklch({ ...oklch, C: v / 1000 })}
      />
      <SliderRow
        label="H"
        display={`${Math.round(oklch.H)}°`}
        value={Math.round(oklch.H)}
        min={0}
        max={360}
        trackBg={hGrad}
        onChange={(v) => onOklch({ ...oklch, H: v })}
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ColorPickerModalProps {
  /** Initial color hex to edit */
  initialHex: string;
  /** Label shown in modal title e.g. "Slot 1 — Cobalt Blue" */
  title?: string;
  /** Called with the confirmed hex when user clicks Apply */
  onApply: (hex: string) => void;
  /** Called when modal is closed without applying */
  onClose: () => void;
}

export default function ColorPickerModal({
  initialHex,
  title,
  onApply,
  onClose,
}: ColorPickerModalProps) {
  const [hex, setHex] = useState(initialHex);
  const [mode, setMode] = useState<PickerMode>("hsl");
  const [hexInput, setHexInput] = useState(initialHex);
  const [hexInvalid, setHexInvalid] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const rgb = useMemo(() => hexToRgb(hex), [hex]);
  const hsl = useMemo(() => rgbToHsl(rgb), [rgb]);
  const hsv = useMemo(() => rgbToHsv(rgb), [rgb]);
  const oklch = useMemo(() => rgbToOklch(rgb), [rgb]);
  const name = useMemo(() => nearestName(rgb), [rgb]);

  const setColor = useCallback((h: string) => {
    setHex(h);
    setHexInput(h);
    setHexInvalid(false);
  }, []);

  const handleWheelChange = useCallback(
    (partial: Partial<HSL>) => {
      setColor(rgbToHex(hslToRgb({ ...hsl, ...partial })));
    },
    [hsl, setColor],
  );

  const handleHexInput = useCallback((v: string) => {
    setHexInput(v);
    const parsed = parseHex(v);
    if (parsed) {
      setHex(parsed);
      setHexInvalid(false);
    } else setHexInvalid(true);
  }, []);

  const handleHexBlur = useCallback(() => {
    if (hexInvalid) {
      setHexInput(hex);
      setHexInvalid(false);
    }
  }, [hexInvalid, hex]);

  // Escape closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter") onApply(hex);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, onApply, hex]);

  const MODES: { id: PickerMode; label: string }[] = [
    { id: "hsl", label: "HSL" },
    { id: "rgb", label: "RGB" },
    { id: "hsv", label: "HSV" },
    { id: "oklch", label: "OKLCH" },
  ];

  const previewBefore = initialHex;
  const previewAfter = hex;
  const changed = previewBefore.toLowerCase() !== previewAfter.toLowerCase();

  return (
    <div
      ref={overlayRef}
      className="ch-overlay"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className="ch-modal"
        style={{ width: 520, maxWidth: "96vw" }}
        role="dialog"
        aria-label={title ?? "Color Picker"}
      >
        {/* Header */}
        <div className="ch-modal-hd">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Before / after swatches */}
            <div
              style={{
                display: "flex",
                borderRadius: 6,
                overflow: "hidden",
                border: "1px solid var(--ch-b1)",
                flexShrink: 0,
              }}
            >
              <div
                title={`Before: ${previewBefore}`}
                style={{ width: 22, height: 22, background: previewBefore }}
              />
              <div
                title={`After: ${previewAfter}`}
                style={{
                  width: 22,
                  height: 22,
                  background: previewAfter,
                  outline: changed ? "2px solid var(--ch-a)" : undefined,
                  outlineOffset: -2,
                }}
              />
            </div>
            <h2 style={{ fontSize: 14 }}>{title ?? "Edit Color"}</h2>
          </div>
          <button
            className="ch-modal-close"
            onClick={onClose}
            title="Close (Esc)"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="ch-modal-bd" style={{ gap: 14 }}>
          {/* Color wheel */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <ColorWheel hsl={hsl} size={200} onChange={handleWheelChange} />
          </div>

          {/* Mode tabs */}
          <div style={{ display: "flex", gap: 3 }}>
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                style={{
                  flex: 1,
                  padding: "4px 0",
                  borderRadius: 4,
                  fontSize: 10.5,
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  background: mode === m.id ? "var(--ch-a)" : "var(--ch-s2)",
                  color: mode === m.id ? "#fff" : "var(--ch-t2)",
                  transition: "background .12s",
                }}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Sliders */}
          {mode === "rgb" && (
            <RgbSliders rgb={rgb} onRgb={(r) => setColor(rgbToHex(r))} />
          )}
          {mode === "hsl" && (
            <HslSliders
              hsl={hsl}
              hex={hex}
              onHsl={(h) => setColor(rgbToHex(hslToRgb(h)))}
            />
          )}
          {mode === "hsv" && (
            <HsvSliders
              hsv={hsv}
              onHsv={(h) => {
                function hsvRgb(hh: number, s: number, v: number): RGB {
                  const s1 = s / 100,
                    v1 = v / 100,
                    c = v1 * s1,
                    x = c * (1 - Math.abs(((hh / 60) % 2) - 1)),
                    m = v1 - c;
                  let r = 0,
                    g = 0,
                    b = 0;
                  if (hh < 60) {
                    r = c;
                    g = x;
                  } else if (hh < 120) {
                    r = x;
                    g = c;
                  } else if (hh < 180) {
                    g = c;
                    b = x;
                  } else if (hh < 240) {
                    g = x;
                    b = c;
                  } else if (hh < 300) {
                    r = x;
                    b = c;
                  } else {
                    r = c;
                    b = x;
                  }
                  return {
                    r: Math.round((r + m) * 255),
                    g: Math.round((g + m) * 255),
                    b: Math.round((b + m) * 255),
                  };
                }
                setColor(rgbToHex(hsvRgb(h.h, h.s, h.v)));
              }}
            />
          )}
          {mode === "oklch" && (
            <OklchSliders
              oklch={oklch}
              onOklch={(o) => setColor(rgbToHex(oklchToRgb(o)))}
            />
          )}

          {/* Hex input + info */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Large preview swatch */}
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 8,
                flexShrink: 0,
                background: hex,
                border: "1px solid var(--ch-b1)",
                boxShadow: "0 2px 8px rgba(0,0,0,.18)",
              }}
            />
            <div style={{ flex: 1 }}>
              {/* Hex input */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 5,
                }}
              >
                <label
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: ".07em",
                    color: "var(--ch-t3)",
                    flexShrink: 0,
                  }}
                >
                  HEX
                </label>
                <input
                  className="ch-inp"
                  value={hexInput}
                  onChange={(e) => handleHexInput(e.target.value)}
                  onBlur={handleHexBlur}
                  onFocus={(e) => e.target.select()}
                  maxLength={7}
                  spellCheck={false}
                  autoComplete="off"
                  style={{
                    fontFamily: "var(--ch-fm)",
                    letterSpacing: ".06em",
                    flex: 1,
                    borderColor: hexInvalid ? "rgba(239,68,68,.7)" : undefined,
                  }}
                />
              </div>
              {/* Color info */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  { label: "Name", value: name },
                  { label: "RGB", value: toCssRgb(rgb, 100) },
                  { label: "HSL", value: toCssHsl(hsl, 100) },
                  { label: "OKLCH", value: toCssOklch(oklch, 100) },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    style={{ fontSize: 9, color: "var(--ch-t3)" }}
                  >
                    <span style={{ fontWeight: 700, marginRight: 3 }}>
                      {label}
                    </span>
                    <span
                      style={{
                        fontFamily:
                          label !== "Name" ? "var(--ch-fm)" : undefined,
                      }}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick hue palette from the color wheel */}
          <div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: "var(--ch-t3)",
                textTransform: "uppercase",
                letterSpacing: ".07em",
                marginBottom: 5,
              }}
            >
              Hue suggestions
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {Array.from({ length: 12 }, (_, i) => {
                const h = (i / 12) * 360;
                const sugHex = rgbToHex(hslToRgb({ h, s: hsl.s, l: hsl.l }));
                const active = Math.abs(hsl.h - h) < 16;
                return (
                  <div
                    key={i}
                    onClick={() => setColor(sugHex)}
                    title={`H=${Math.round(h)}°`}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 5,
                      cursor: "pointer",
                      background: sugHex,
                      flexShrink: 0,
                      border: active
                        ? "2px solid var(--ch-t1)"
                        : "1px solid rgba(128,128,128,.2)",
                      boxShadow: active ? "0 0 0 2px var(--ch-a)" : "none",
                      transition: "transform .1s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.transform = "scale(1.15)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.transform = "scale(1)")
                    }
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="ch-modal-ft">
          <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
            {changed && (
              <span style={{ fontSize: 10, color: "var(--ch-t3)" }}>
                {initialHex.toUpperCase()} → {hex.toUpperCase()}
              </span>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => onApply(hex)}
            title="Apply (Enter)"
          >
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}
