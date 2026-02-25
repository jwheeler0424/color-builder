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
  hexToStop,
  parseHex,
  parseHexAlpha,
  clamp,
  toCssRgb,
  toCssHsl,
  toCssHsv,
  toCssOklch,
  toCssOklab,
  toHexAlpha,
} from "@/lib/utils";
import { useChromaStore } from "@/hooks/use-chroma-store";
import { useNavigate } from "@tanstack/react-router";
import ColorWheel from "../color-wheel";
import { Button } from "@/components/ui/button";
import { ColorPickerPanel } from "../elements/color-picker.panel";
import { ColorSlider } from "../ui/slider-color";

// EyeDropper is a browser API not yet in lib.dom.d.ts
interface EyeDropper {
  open(): Promise<{ sRGBHex: string }>;
}
declare global {
  interface Window {
    EyeDropper?: new () => EyeDropper;
  }
}

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
export function SliderRow({
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
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center text-[11px] font-medium px-0.5">
        <span className="text-muted-foreground uppercase tracking-tight">
          {label}
        </span>
        <span className="font-mono text-foreground tabular-nums bg-secondary/30 px-1.5 py-0.5 rounded leading-none">
          {display}
        </span>
      </div>
      <ColorSlider
        // Use a key based on label to reset internal state if we switch modes (RGB -> HSL)
        key={label}
        value={value}
        onValueChange={onChange}
        min={min}
        max={max}
        step={step}
        trackBg={trackBg}
        isAlpha={isAlpha}
      />
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
    <div className="w-full max-w-100 flex flex-col gap-3.5">
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
      {/* <AlphaSlider alpha={alpha} hex={hex} onChange={onAlpha} /> */}
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
    <div className="w-full max-w-100 flex flex-col gap-3.5">
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
  return (
    <div className="w-full max-w-100 flex flex-col gap-3.5">
      <SliderRow
        label="Hue"
        display={`${Math.round(hsv.h)}°`}
        value={Math.round(hsv.h)}
        min={0}
        max={359}
        trackBg={hsvChannelGrad("h", hsv)}
        onChange={(v) => onHsv({ ...hsv, h: v })}
      />
      <SliderRow
        label="Saturation"
        display={`${Math.round(hsv.s)}%`}
        value={Math.round(hsv.s)}
        min={0}
        max={100}
        trackBg={hsvChannelGrad("s", hsv)}
        onChange={(v) => onHsv({ ...hsv, s: v })}
      />
      <SliderRow
        label="Value"
        display={`${Math.round(hsv.v)}%`}
        value={Math.round(hsv.v)}
        min={0}
        max={100}
        trackBg={hsvChannelGrad("v", hsv)}
        onChange={(v) => onHsv({ ...hsv, v: v })}
      />
      {/* <AlphaSlider alpha={alpha} hex={hex} onChange={onAlpha} /> */}
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
    <div className="w-full max-w-100 flex flex-col gap-3.5">
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
        className="rounded text-[9.5px] text-muted-foreground leading-normal px-2 py-1.25"
        style={{
          background: "rgba(99,102,241,.08)",
          border: "1px solid rgba(99,102,241,.18)",
        }}
      >
        <strong className="text-secondary-foreground">OKLCH</strong> —
        perceptually uniform. Chroma = vividness (0 = gray, 0.4 = max).
        Lightness shifts won't change perceived hue.
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
    <div className="w-full max-w-100 flex flex-col gap-3.5">
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
      {/* <AlphaSlider alpha={alpha} hex={hex} onChange={onAlpha} /> */}
      <div
        className="rounded text-[9.5px] text-muted-foreground leading-normal px-2 py-1.25"
        style={{
          background: "rgba(99,102,241,.08)",
          border: "1px solid rgba(99,102,241,.18)",
        }}
      >
        <strong className="text-secondary-foreground">OKLab</strong> —
        perceptual Lab space. a = green↔red axis, b = blue↔yellow axis. Same
        axes as Photoshop Lab.
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

// ─── Controlled hex input — allows mid-type editing without key reset trick ───

function HexInputField({
  hex,
  onCommit,
}: {
  hex: string;
  onCommit: (v: string) => void;
}) {
  const [raw, setRaw] = React.useState(hex);
  const [invalid, setInvalid] = React.useState(false);

  // Sync when the canonical hex changes from outside (e.g. slider move, wheel)
  React.useEffect(() => {
    setRaw(hex);
    setInvalid(false);
  }, [hex]);

  const handleChange = (v: string) => {
    setRaw(v);
    const ok =
      parseHex(v) ?? (v.length === 9 && /^#[0-9a-fA-F]{8}$/.test(v) ? v : null);
    if (ok) {
      setInvalid(false);
      onCommit(v);
    } else setInvalid(true);
  };

  const handleBlur = () => {
    if (invalid) {
      setRaw(hex);
      setInvalid(false);
    }
  };

  return (
    <input
      className="w-full bg-muted border border-border rounded px-2 py-1.5 text-[12px] text-foreground font-mono tracking-[.06em] outline-none focus:border-ring transition-colors"
      value={raw}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={handleBlur}
      onFocus={(e) => e.target.select()}
      maxLength={9}
      spellCheck={false}
      autoComplete="off"
      style={{ borderColor: invalid ? "rgba(239,68,68,.7)" : undefined }}
    />
  );
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
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center gap-5 p-6 overflow-auto">
        {/* Color wheel — always visible, speaks HSL */}
        <ColorWheel hsl={hsl} size={240} onChange={handleWheelChange} />

        {/* Mode tabs */}
        <div className="flex gap-1 mt-2.5 mb-1.5">
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
                  pickerMode === m.id
                    ? "var(--color-primary)"
                    : "var(--color-secondary)",
                color:
                  pickerMode === m.id
                    ? "#fff"
                    : "var(--color-secondary-foreground)",
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
        <div className="flex flex-col gap-4 w-full max-w-100 mt-3">
          <div className="flex gap-4 w-full">
            {/* Checkerboard shows through for alpha */}
            <div className="relative size-16 shrink-0">
              <div
                className="absolute rounded inset-0"
                style={{
                  background:
                    "repeating-conic-gradient(#444 0% 25%,#222 0% 50%) 0 0/10px 10px",
                }}
              />
              <div
                className="size-full rounded border-2 border-input shrink-0 relative"
                style={{ ...previewStyle }}
              />
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="flex gap-1.5 items-center">
                <label>HEX</label>
                <HexInputField hex={displayHex} onCommit={handleHexInput} />
              </div>
              {/* CSS output string for current mode */}
              <div className="flex items-center gap-1 mt-1 bg-muted rounded px-1.5 py-1">
                <span className="font-mono text-muted-foreground overflow-ellipsis whitespace-nowrap overflow-hidden text-[9px] flex-1">
                  {cssOut}
                </span>
                <button
                  onClick={copyCss}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 9,
                    color: copied ? "#4ade80" : "var(--color-muted-foreground)",
                    padding: "0 2px",
                    flexShrink: 0,
                  }}
                >
                  {copied ? "✓" : "copy"}
                </button>
              </div>
            </div>
          </div>
          <div className="flex gap-1.5 items-center justify-end">
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
                    const dropper = new window.EyeDropper!();
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

      <ColorPickerPanel />
    </div>
  );
}
