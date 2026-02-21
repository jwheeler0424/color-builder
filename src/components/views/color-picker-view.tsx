import React, { useCallback, useMemo } from "react";
import type { RGB, HSL, HSV, OKLCH } from "@/types";
import {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  rgbToHsv,
  rgbToCmyk,
  rgbToOklab,
  rgbToOklch,
  oklchToRgb,
  oklabToLch,
  oklabToRgb,
  luminance,
  parseHex,
  parseHexAlpha,
  opaqueHex,
  clamp,
  toCssRgb,
  toCssHsl,
  toCssHsv,
  toCssOklch,
  toCssOklab,
  toHexAlpha,
} from "@/lib/utils/colorMath";
import { nearestName, hexToStop } from "@/lib/utils/paletteUtils";
import { useChromaStore } from "@/hooks/useChromaStore";
import { useNavigate } from "@tanstack/react-router";
import ColorWheel from "@/components/color-wheel";
import { Button } from "../ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

type PickerMode = "rgb" | "hsl" | "hsv" | "oklch" | "oklab";

const MODES: { id: PickerMode; label: string; desc: string }[] = [
  { id: "rgb", label: "RGB", desc: "Red, Green, Blue — 0 to 255 per channel" },
  { id: "hsl", label: "HSL", desc: "Hue, Saturation, Lightness — CSS native" },
  {
    id: "hsv",
    label: "HSV",
    desc: "Hue, Saturation, Value — common in design tools",
  },
  {
    id: "oklch",
    label: "OKLCH",
    desc: "Perceptually uniform — same space as palette generation",
  },
  {
    id: "oklab",
    label: "OKLab",
    desc: "Perceptual Lab — a/b axes match Photoshop Lab mode",
  },
];

// ─── Slider track helpers ─────────────────────────────────────────────────────

/** Build a CSS gradient by sampling `steps+1` points along a single channel sweep */
function channelGrad(steps: number, fn: (t: number) => string): string {
  const stops = Array.from({ length: steps + 1 }, (_, i) => fn(i / steps));
  return `linear-gradient(to right, ${stops.join(", ")})`;
}

function rgbChannelGrad(channel: "r" | "g" | "b", rgb: RGB) {
  return channelGrad(6, (t) => {
    const v = Math.round(t * 255);
    const c =
      channel === "r"
        ? { ...rgb, r: v }
        : channel === "g"
          ? { ...rgb, g: v }
          : { ...rgb, b: v };
    return rgbToHex(c);
  });
}

function hslChannelGrad(channel: "h" | "s" | "l", hsl: HSL) {
  return channelGrad(8, (t) => {
    const c: HSL =
      channel === "h"
        ? { ...hsl, h: t * 360 }
        : channel === "s"
          ? { ...hsl, s: t * 100 }
          : { ...hsl, l: t * 100 };
    return rgbToHex(hslToRgb(c));
  });
}

function hsvChannelGrad(channel: "h" | "s" | "v", hsv: HSV) {
  return channelGrad(8, (t) => {
    const ch =
      channel === "h"
        ? { ...hsv, h: t * 360 }
        : channel === "s"
          ? { ...hsv, s: t * 100 }
          : { ...hsv, v: t * 100 };
    // Convert HSV -> RGB inline
    const { h, s: sv, v: vv } = ch;
    const sn = sv / 100,
      vn = vv / 100;
    const c = vn * sn,
      x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
      m = vn - c;
    let r = 0,
      g = 0,
      b = 0;
    const seg = Math.floor(h / 60) % 6;
    if (seg === 0) {
      r = c;
      g = x;
    } else if (seg === 1) {
      r = x;
      g = c;
    } else if (seg === 2) {
      g = c;
      b = x;
    } else if (seg === 3) {
      g = x;
      b = c;
    } else if (seg === 4) {
      r = x;
      b = c;
    } else {
      r = c;
      b = x;
    }
    return rgbToHex({
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255),
    });
  });
}

function oklchChannelGrad(channel: "L" | "C" | "H", oklch: OKLCH) {
  return channelGrad(8, (t) => {
    const c: OKLCH =
      channel === "L"
        ? { ...oklch, L: t }
        : channel === "C"
          ? { ...oklch, C: t * 0.4 }
          : { ...oklch, H: t * 360 };
    return rgbToHex(oklchToRgb(c));
  });
}

function oklabChannelGrad(
  channel: "L" | "a" | "b",
  oklab: { L: number; a: number; b: number },
) {
  return channelGrad(8, (t) => {
    const c =
      channel === "L"
        ? { ...oklab, L: t }
        : channel === "a"
          ? { ...oklab, a: (t - 0.5) * 0.8 }
          : { ...oklab, b: (t - 0.5) * 0.8 };
    return rgbToHex(oklabToRgb(c));
  });
}

function alphaGrad(hex: string) {
  return `linear-gradient(to right, transparent, ${hex})`;
}

// ─── Shared slider row ────────────────────────────────────────────────────────

function SliderRow({
  label,
  value,
  display,
  min,
  max,
  step = 1,
  trackBg,
  onChange,
  isAlpha = false,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step?: number;
  trackBg: string;
  onChange: (v: number) => void;
  isAlpha?: boolean;
}) {
  return (
    <div className="ch-slider-row">
      <div className="ch-slider-label">
        {label} <span>{display}</span>
      </div>
      <div
        className={isAlpha ? "ch-alpha-track" : "ch-sat-track"}
        style={{ background: trackBg }}
      >
        {isAlpha && <div className="ch-alpha-checker" />}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(+e.target.value)}
        />
      </div>
    </div>
  );
}

// ─── Alpha slider (shared across all modes) ───────────────────────────────────

function AlphaSlider({
  alpha,
  hex,
  onChange,
}: {
  alpha: number;
  hex: string;
  onChange: (a: number) => void;
}) {
  return (
    <SliderRow
      label="Alpha"
      display={`${alpha}%`}
      value={alpha}
      min={0}
      max={100}
      trackBg={alphaGrad(hex)}
      onChange={onChange}
      isAlpha
    />
  );
}

// ─── Mode slider sets ─────────────────────────────────────────────────────────

function RgbSliders({
  rgb,
  alpha,
  hex,
  onRgb,
  onAlpha,
}: {
  rgb: RGB;
  alpha: number;
  hex: string;
  onRgb: (rgb: RGB) => void;
  onAlpha: (a: number) => void;
}) {
  return (
    <div className="ch-sliders">
      <SliderRow
        label="Red"
        display={String(rgb.r)}
        value={rgb.r}
        min={0}
        max={255}
        trackBg={rgbChannelGrad("r", rgb)}
        onChange={(v) => onRgb({ ...rgb, r: v })}
      />
      <SliderRow
        label="Green"
        display={String(rgb.g)}
        value={rgb.g}
        min={0}
        max={255}
        trackBg={rgbChannelGrad("g", rgb)}
        onChange={(v) => onRgb({ ...rgb, g: v })}
      />
      <SliderRow
        label="Blue"
        display={String(rgb.b)}
        value={rgb.b}
        min={0}
        max={255}
        trackBg={rgbChannelGrad("b", rgb)}
        onChange={(v) => onRgb({ ...rgb, b: v })}
      />
      <AlphaSlider alpha={alpha} hex={hex} onChange={onAlpha} />
    </div>
  );
}

function HslSliders({
  hsl,
  alpha,
  hex,
  onHsl,
  onAlpha,
}: {
  hsl: HSL;
  alpha: number;
  hex: string;
  onHsl: (hsl: HSL) => void;
  onAlpha: (a: number) => void;
}) {
  return (
    <div className="ch-sliders">
      <SliderRow
        label="Hue"
        display={`${Math.round(hsl.h)}°`}
        value={Math.round(hsl.h)}
        min={0}
        max={359}
        trackBg={hslChannelGrad("h", hsl)}
        onChange={(v) => onHsl({ ...hsl, h: v })}
      />
      <SliderRow
        label="Saturation"
        display={`${Math.round(hsl.s)}%`}
        value={Math.round(hsl.s)}
        min={0}
        max={100}
        trackBg={hslChannelGrad("s", hsl)}
        onChange={(v) => onHsl({ ...hsl, s: v })}
      />
      <SliderRow
        label="Lightness"
        display={`${Math.round(hsl.l)}%`}
        value={Math.round(hsl.l)}
        min={0}
        max={100}
        trackBg={hslChannelGrad("l", hsl)}
        onChange={(v) => onHsl({ ...hsl, l: v })}
      />
      <AlphaSlider alpha={alpha} hex={hex} onChange={onAlpha} />
    </div>
  );
}

function HsvSliders({
  hsv,
  alpha,
  hex,
  onHsv,
  onAlpha,
}: {
  hsv: HSV;
  alpha: number;
  hex: string;
  onHsv: (hsv: HSV) => void;
  onAlpha: (a: number) => void;
}) {
  // HSV -> RGB inline for commit
  function hsvToRgb(h: HSV): RGB {
    const sn = h.s / 100,
      vn = h.v / 100;
    const c = vn * sn,
      x = c * (1 - Math.abs(((h.h / 60) % 2) - 1)),
      m = vn - c;
    let r = 0,
      g = 0,
      b = 0;
    const seg = Math.floor(h.h / 60) % 6;
    if (seg === 0) {
      r = c;
      g = x;
    } else if (seg === 1) {
      r = x;
      g = c;
    } else if (seg === 2) {
      g = c;
      b = x;
    } else if (seg === 3) {
      g = x;
      b = c;
    } else if (seg === 4) {
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
  const commit = (h: HSV) => onHsv(h);
  return (
    <div className="ch-sliders">
      <SliderRow
        label="Hue"
        display={`${Math.round(hsv.h)}°`}
        value={Math.round(hsv.h)}
        min={0}
        max={359}
        trackBg={hsvChannelGrad("h", hsv)}
        onChange={(v) => commit({ ...hsv, h: v })}
      />
      <SliderRow
        label="Saturation"
        display={`${Math.round(hsv.s)}%`}
        value={Math.round(hsv.s)}
        min={0}
        max={100}
        trackBg={hsvChannelGrad("s", hsv)}
        onChange={(v) => commit({ ...hsv, s: v })}
      />
      <SliderRow
        label="Value"
        display={`${Math.round(hsv.v)}%`}
        value={Math.round(hsv.v)}
        min={0}
        max={100}
        trackBg={hsvChannelGrad("v", hsv)}
        onChange={(v) => commit({ ...hsv, v: v })}
      />
      <AlphaSlider alpha={alpha} hex={hex} onChange={onAlpha} />
    </div>
  );
}

function OklchSliders({
  oklch,
  alpha,
  hex,
  onOklch,
  onAlpha,
}: {
  oklch: OKLCH;
  alpha: number;
  hex: string;
  onOklch: (o: OKLCH) => void;
  onAlpha: (a: number) => void;
}) {
  return (
    <div className="ch-sliders">
      <SliderRow
        label="Lightness"
        display={`${Math.round(oklch.L * 100)}%`}
        value={Math.round(oklch.L * 100)}
        min={0}
        max={100}
        trackBg={oklchChannelGrad("L", oklch)}
        onChange={(v) => onOklch({ ...oklch, L: v / 100 })}
      />
      <SliderRow
        label="Chroma"
        display={oklch.C.toFixed(3)}
        value={Math.round(oklch.C * 1000)}
        min={0}
        max={400}
        trackBg={oklchChannelGrad("C", oklch)}
        onChange={(v) => onOklch({ ...oklch, C: clamp(v / 1000, 0, 0.4) })}
      />
      <SliderRow
        label="Hue"
        display={`${Math.round(oklch.H)}°`}
        value={Math.round(oklch.H)}
        min={0}
        max={359}
        trackBg={oklchChannelGrad("H", oklch)}
        onChange={(v) => onOklch({ ...oklch, H: v })}
      />
      <AlphaSlider alpha={alpha} hex={hex} onChange={onAlpha} />
      <div
        style={{
          padding: "5px 8px",
          borderRadius: 4,
          background: "rgba(99,102,241,.08)",
          border: "1px solid rgba(99,102,241,.18)",
          fontSize: 9.5,
          color: "var(--ch-t3)",
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: "var(--ch-t2)" }}>OKLCH</strong> — perceptually
        uniform. Chroma = vividness (0 = gray, 0.4 = max). Lightness shifts
        won't change perceived hue.
      </div>
    </div>
  );
}

function OklabSliders({
  oklab,
  alpha,
  hex,
  onOklab,
  onAlpha,
}: {
  oklab: { L: number; a: number; b: number };
  alpha: number;
  hex: string;
  onOklab: (o: { L: number; a: number; b: number }) => void;
  onAlpha: (a: number) => void;
}) {
  return (
    <div className="ch-sliders">
      <SliderRow
        label="Lightness"
        display={`${Math.round(oklab.L * 100)}%`}
        value={Math.round(oklab.L * 1000)}
        min={0}
        max={1000}
        trackBg={oklabChannelGrad("L", oklab)}
        onChange={(v) => onOklab({ ...oklab, L: v / 1000 })}
      />
      <SliderRow
        label="a (green↔red)"
        display={oklab.a.toFixed(3)}
        value={Math.round((oklab.a + 0.4) * 1000)}
        min={0}
        max={800}
        trackBg={oklabChannelGrad("a", oklab)}
        onChange={(v) => onOklab({ ...oklab, a: v / 1000 - 0.4 })}
      />
      <SliderRow
        label="b (blue↔yellow)"
        display={oklab.b.toFixed(3)}
        value={Math.round((oklab.b + 0.4) * 1000)}
        min={0}
        max={800}
        trackBg={oklabChannelGrad("b", oklab)}
        onChange={(v) => onOklab({ ...oklab, b: v / 1000 - 0.4 })}
      />
      <AlphaSlider alpha={alpha} hex={hex} onChange={onAlpha} />
      <div
        style={{
          padding: "5px 8px",
          borderRadius: 4,
          background: "rgba(99,102,241,.08)",
          border: "1px solid rgba(99,102,241,.18)",
          fontSize: 9.5,
          color: "var(--ch-t3)",
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: "var(--ch-t2)" }}>OKLab</strong> — perceptual
        Lab space. a = green↔red axis, b = blue↔yellow axis. Same axes as
        Photoshop Lab.
      </div>
    </div>
  );
}

// ─── CSS output string for current mode ──────────────────────────────────────

function cssString(
  mode: PickerMode,
  rgb: RGB,
  hsl: HSL,
  hsv: HSV,
  oklch: OKLCH,
  oklab: { L: number; a: number; b: number },
  alpha: number,
): string {
  switch (mode) {
    case "rgb":
      return toCssRgb(rgb, alpha);
    case "hsl":
      return toCssHsl(hsl, alpha);
    case "hsv":
      return toCssHsv(hsv, alpha);
    case "oklch":
      return toCssOklch(oklch, alpha);
    case "oklab":
      return toCssOklab(oklab, alpha);
  }
}

// ─── HSV to RGB (needed for committing HSV slider changes) ───────────────────

function hsvToRgbFn(h: number, s: number, v: number): RGB {
  const sn = s / 100,
    vn = v / 100;
  const c = vn * sn,
    x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
    m = vn - c;
  let r = 0,
    g = 0,
    b = 0;
  const seg = Math.floor(h / 60) % 6;
  if (seg === 0) {
    r = c;
    g = x;
  } else if (seg === 1) {
    r = x;
    g = c;
  } else if (seg === 2) {
    g = c;
    b = x;
  } else if (seg === 3) {
    g = x;
    b = c;
  } else if (seg === 4) {
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

// ─── Main View ────────────────────────────────────────────────────────────────

export default function ColorPickerView() {
  const {
    pickerHex,
    pickerAlpha,
    pickerMode,
    setPickerHex,
    setPickerAlpha,
    setPickerMode,
    recentColors,
    slots,
    setSeeds,
    addRecent,
    addSlot,
    generate,
  } = useChromaStore();
  const navigate = useNavigate();

  // All derived values from canonical hex
  const rgb = useMemo(() => hexToRgb(pickerHex), [pickerHex]);
  const hsl = useMemo(() => rgbToHsl(rgb), [rgb]);
  const hsv = useMemo(() => rgbToHsv(rgb), [rgb]);
  const oklch = useMemo(() => rgbToOklch(rgb), [rgb]);
  const oklab = useMemo(() => rgbToOklab(rgb), [rgb]);
  const cmyk = useMemo(() => rgbToCmyk(rgb), [rgb]);
  const lch = useMemo(() => oklabToLch(oklab), [oklab]); // for display only

  const displayHex = toHexAlpha(pickerHex, pickerAlpha);
  const cssOut = cssString(
    pickerMode,
    rgb,
    hsl,
    hsv,
    oklch,
    oklab,
    pickerAlpha,
  );
  const previewStyle =
    pickerAlpha < 100
      ? {
          background: `rgba(${rgb.r},${rgb.g},${rgb.b},${(pickerAlpha / 100).toFixed(2)})`,
        }
      : { background: pickerHex };

  // Setters — each converts its space back to hex as canonical
  const setRgb = useCallback(
    (r: RGB) => setPickerHex(rgbToHex(r)),
    [setPickerHex],
  );
  const setHsl = useCallback(
    (h: HSL) => setPickerHex(rgbToHex(hslToRgb(h))),
    [setPickerHex],
  );
  const setHsv = useCallback(
    (h: HSV) => setPickerHex(rgbToHex(hsvToRgbFn(h.h, h.s, h.v))),
    [setPickerHex],
  );
  const setOklch = useCallback(
    (o: OKLCH) => setPickerHex(rgbToHex(oklchToRgb(o))),
    [setPickerHex],
  );
  const setOklab = useCallback(
    (o: { L: number; a: number; b: number }) =>
      setPickerHex(rgbToHex(oklabToRgb(o))),
    [setPickerHex],
  );

  // ColorWheel speaks HSL
  const handleWheelChange = useCallback(
    (partial: Partial<HSL>) => {
      setHsl({ ...hsl, ...partial });
    },
    [hsl, setHsl],
  );

  const handleHexInput = useCallback(
    (v: string) => {
      const base = parseHex(v); // handles 3, 6, and 8-char (strips alpha bytes)
      if (!base) return;
      setPickerHex(base);
      const alpha = parseHexAlpha(v); // null if not 8-char
      if (alpha !== null) setPickerAlpha(alpha);
    },
    [setPickerHex, setPickerAlpha],
  );

  const useSeed = useCallback(() => {
    setSeeds([
      hexToStop(pickerHex, pickerAlpha < 100 ? pickerAlpha : undefined),
    ]);
    addRecent(displayHex);
    generate();
    navigate({ to: "/palette" });
  }, [pickerHex, setSeeds, addRecent, generate, navigate]);

  const addToPalette = useCallback(() => {
    addSlot(hexToStop(pickerHex, pickerAlpha < 100 ? pickerAlpha : undefined));
    addRecent(displayHex);
  }, [pickerHex, addSlot, addRecent]);

  const [copied, setCopied] = React.useState(false);
  const copyCss = () => {
    navigator.clipboard.writeText(cssOut).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="ch-view-picker">
      <div className="ch-picker-main">
        {/* Color wheel — always visible, speaks HSL */}
        <ColorWheel hsl={hsl} size={240} onChange={handleWheelChange} />

        {/* Mode tabs */}
        <div style={{ display: "flex", gap: 3, margin: "10px 0 6px" }}>
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setPickerMode(m.id)}
              title={m.desc}
              style={{
                flex: 1,
                padding: "4px 0",
                borderRadius: 4,
                fontSize: 10.5,
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                background:
                  pickerMode === m.id ? "var(--ch-a)" : "var(--ch-s2)",
                color: pickerMode === m.id ? "#fff" : "var(--ch-t2)",
                transition: "background .12s",
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Sliders for active mode */}
        {pickerMode === "rgb" && (
          <RgbSliders
            rgb={rgb}
            alpha={pickerAlpha}
            hex={pickerHex}
            onRgb={setRgb}
            onAlpha={setPickerAlpha}
          />
        )}
        {pickerMode === "hsl" && (
          <HslSliders
            hsl={hsl}
            alpha={pickerAlpha}
            hex={pickerHex}
            onHsl={setHsl}
            onAlpha={setPickerAlpha}
          />
        )}
        {pickerMode === "hsv" && (
          <HsvSliders
            hsv={hsv}
            alpha={pickerAlpha}
            hex={pickerHex}
            onHsv={setHsv}
            onAlpha={setPickerAlpha}
          />
        )}
        {pickerMode === "oklch" && (
          <OklchSliders
            oklch={oklch}
            alpha={pickerAlpha}
            hex={pickerHex}
            onOklch={setOklch}
            onAlpha={setPickerAlpha}
          />
        )}
        {pickerMode === "oklab" && (
          <OklabSliders
            oklab={oklab}
            alpha={pickerAlpha}
            hex={pickerHex}
            onOklab={setOklab}
            onAlpha={setPickerAlpha}
          />
        )}

        {/* Preview + hex input */}
        <div className="ch-color-preview-row" style={{ marginTop: 12 }}>
          {/* Checkerboard shows through for alpha */}
          <div
            style={{
              position: "relative",
              width: 56,
              height: 56,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 4,
                background:
                  "repeating-conic-gradient(#444 0% 25%,#222 0% 50%) 0 0/10px 10px",
              }}
            />
            <div
              className="ch-cprev"
              style={{ ...previewStyle, position: "relative" }}
            />
          </div>
          <div className="ch-cprev-inputs">
            <div className="ch-hex-inp-row">
              <label>HEX</label>
              <input
                className="ch-inp"
                defaultValue={displayHex}
                key={displayHex}
                onChange={(e) => handleHexInput(e.target.value)}
                maxLength={9}
                spellCheck={false}
                autoComplete="off"
                style={{ letterSpacing: ".06em", fontFamily: "var(--ch-fm)" }}
              />
            </div>
            {/* CSS output string for current mode */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                marginTop: 4,
                background: "var(--ch-s2)",
                borderRadius: 4,
                padding: "3px 6px",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--ch-fm)",
                  fontSize: 9,
                  color: "var(--ch-t3)",
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {cssOut}
              </span>
              <button
                onClick={copyCss}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 9,
                  color: copied ? "#4ade80" : "var(--ch-t3)",
                  padding: "0 2px",
                  flexShrink: 0,
                }}
              >
                {copied ? "✓" : "copy"}
              </button>
            </div>
            <div style={{ display: "flex", gap: 5, marginTop: 5 }}>
              <Button variant="default" size="sm" onClick={useSeed}>
                → Seed Palette
              </Button>
              <Button variant="ghost" size="sm" onClick={addToPalette}>
                + Add
              </Button>
              {typeof window !== "undefined" && "EyeDropper" in window && (
                <Button
                  variant="ghost"
                  size="sm"
                  title="Sample color from screen (EyeDropper API)"
                  onClick={async () => {
                    try {
                      const dropper = new (window as any).EyeDropper();
                      const { sRGBHex } = await dropper.open();
                      const h = parseHex(sRGBHex);
                      if (h) {
                        setPickerHex(h);
                        addRecent(h);
                      }
                    } catch {
                      /* user cancelled */
                    }
                  }}
                >
                  ⊕ Pick
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="ch-picker-panel">
        {/* Recent colors */}
        {recentColors.length > 0 && (
          <div>
            <div className="ch-slabel">Recent</div>
            <div className="ch-recent-swatches">
              {recentColors.map((rh, i) => (
                <div
                  key={i}
                  className="ch-rswatch"
                  style={{ background: rh }}
                  title={rh}
                  onClick={() => {
                    const alpha = parseHexAlpha(rh);
                    setPickerHex(opaqueHex(rh));
                    if (alpha !== null) setPickerAlpha(alpha);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Color info — all formats */}
        <div>
          <div className="ch-slabel">Color Values</div>
          <div className="ch-picker-info">
            <InfoRow label="Name" value={nearestName(rgb)} />
            <InfoRow label="HEX" value={displayHex.toUpperCase()} mono />
            <InfoRow label="RGB" value={toCssRgb(rgb, pickerAlpha)} mono />
            <InfoRow label="HSL" value={toCssHsl(hsl, pickerAlpha)} mono />
            <InfoRow label="HSV" value={toCssHsv(hsv, pickerAlpha)} mono />
            <InfoRow
              label="OKLCH"
              value={toCssOklch(oklch, pickerAlpha)}
              mono
            />
            <InfoRow
              label="OKLab"
              value={toCssOklab(oklab, pickerAlpha)}
              mono
            />
            <InfoRow
              label="CMYK"
              value={`${cmyk.c}% ${cmyk.m}% ${cmyk.y}% ${cmyk.k}%`}
            />
            <InfoRow
              label="Lum."
              value={`${(luminance(rgb) * 100).toFixed(1)}%`}
            />
          </div>
        </div>

        {/* Palette quick-pick */}
        {slots.length > 0 && (
          <div>
            <div className="ch-slabel">Palette</div>
            <div className="ch-recent-swatches">
              {slots.map((slot, i) => (
                <div
                  key={i}
                  className="ch-rswatch"
                  style={{ background: slot.color.hex }}
                  title={slot.color.hex}
                  onClick={() => setPickerHex(slot.color.hex)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 6,
      }}
    >
      <span style={{ color: "var(--ch-t3)", flexShrink: 0, minWidth: 38 }}>
        {label}
      </span>
      <span
        style={{
          fontFamily: mono ? "var(--ch-fm)" : undefined,
          fontSize: mono ? 9.5 : undefined,
          color: "var(--ch-t1)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flex: 1,
          textAlign: "right",
          cursor: "pointer",
        }}
        title={`Click to copy: ${value}`}
        onClick={copy}
      >
        {copied ? "✓ copied" : value}
      </span>
    </div>
  );
}
