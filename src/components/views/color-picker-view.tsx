import React, { useCallback, useMemo, useState } from "react";
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
  oklabToRgb,
  luminance,
  parseHex,
  parseHexAlpha,
  opaqueHex,
  toCssRgb,
  toCssHsl,
  toCssHsv,
  toCssOklch,
  toCssOklab,
  toHexAlpha,
  nearestName,
  hexToStop,
  hsvToRgb,
  cmykToRgb,
  cssString,
} from "@/lib/utils";
import { useChromaStore } from "@/hooks/use-chroma-store";
import { useNavigate } from "@tanstack/react-router";
import ColorWheel from "../common/color-wheel";
import { Button } from "@/components/ui/button";
import { RgbSliders } from "../common/sliders/rgb-sliders";
import { HslSliders } from "../common/sliders/hsl-sliders";
import { HsvSliders } from "../common/sliders/hsv-sliders";
import { OklchSliders } from "../common/sliders/oklch-sliders";
import { OklabSliders } from "../common/sliders/oklab-sliders";
import { CmykSliders } from "../common/sliders/cmyk-sliders";
import HexInput from "../common/hex-input";
import { PanelSection, PanelSectionLabel } from "../layout/panel";

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
  const name = useMemo(() => nearestName(rgb), [rgb]);

  const displayHex = toHexAlpha(pickerHex, pickerAlpha);
  const cssOut = cssString(
    pickerMode,
    rgb,
    hsl,
    hsv,
    oklch,
    oklab,
    cmyk,
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
    (h: HSV) => setPickerHex(rgbToHex(hsvToRgb(h))),
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
  const setCmyk = useCallback(
    (c: { c: number; m: number; y: number; k: number }) =>
      setPickerHex(rgbToHex(cmykToRgb(c))),
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

  const updateColor = useCallback((newHex: string) => {
    setPickerHex(newHex);
    handleHexInput(newHex);
  }, []);

  const [copied, setCopied] = useState(false);
  const copyCss = () => {
    navigator.clipboard.writeText(cssOut).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const handleEyeDropper = async () => {
    if (typeof window !== "undefined" && "EyeDropper" in window) {
      try {
        const dropper = new (window as any).EyeDropper();
        const { sRGBHex } = await dropper.open();
        const h = parseHex(sRGBHex);
        if (h) updateColor(h);
      } catch (e) {
        /* cancelled */
      }
    }
  };

  const MODES = [
    { id: "hsl", label: "HSL" },
    { id: "rgb", label: "RGB" },
    { id: "hsv", label: "HSV" },
    { id: "oklch", label: "OKLCH" },
    { id: "oklab", label: "OKLab" },
    { id: "cmyk", label: "CMYK" },
  ];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <PanelSection>
        <PanelSectionLabel>COLOR PICKER</PanelSectionLabel>
        {/* Color wheel — always visible, speaks HSL */}
        <div className="flex flex-col items-center justify-center gap-1 my-6">
          <ColorWheel hsl={hsl} size={240} onChange={handleWheelChange} />
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 mt-2.5 mb-1.5">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setPickerMode(m.id as PickerMode)}
              title={m.label}
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
        {pickerMode === "cmyk" && (
          <CmykSliders
            cmyk={cmyk}
            alpha={pickerAlpha}
            hex={pickerHex}
            onCmyk={setCmyk}
            onAlpha={setPickerAlpha}
          />
        )}

        <div className="flex flex-col gap-4 w-full max-w-100 mt-3 pb-2">
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
                {/* <label>HEX CODE</label> */}
                <HexInput
                  value={displayHex}
                  onChange={handleHexInput}
                  label="HEX CODE"
                />
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
                onClick={handleEyeDropper}
              >
                ⊕ Pick
              </Button>
            )}
          </div>
        </div>
      </PanelSection>

      {/* Recent colors */}
      {recentColors.length > 0 && (
        <PanelSection>
          <PanelSectionLabel>RECENT COLORS</PanelSectionLabel>
          <div className="flex flex-wrap gap-1.5 pb-2">
            {recentColors.map((rh, i) => (
              <div
                key={i}
                className="w-5.5 h-5.5 rounded cursor-pointer border border-white/10 transition-transform hover:scale-110"
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
        </PanelSection>
      )}

      {/* Color info — all formats */}
      <PanelSection>
        <PanelSectionLabel>COLOR VALUES</PanelSectionLabel>
        <div className="text-[11px] text-muted-foreground leading-[2.1] pb-2">
          <InfoRow label="Name" value={nearestName(rgb)} />
          <InfoRow label="HEX" value={displayHex.toUpperCase()} mono />
          <InfoRow label="RGB" value={toCssRgb(rgb, pickerAlpha)} mono />
          <InfoRow label="HSL" value={toCssHsl(hsl, pickerAlpha)} mono />
          <InfoRow label="HSV" value={toCssHsv(hsv, pickerAlpha)} mono />
          <InfoRow label="OKLCH" value={toCssOklch(oklch, pickerAlpha)} mono />
          <InfoRow label="OKLab" value={toCssOklab(oklab, pickerAlpha)} mono />
          <InfoRow
            label="CMYK"
            value={`${cmyk.c}% ${cmyk.m}% ${cmyk.y}% ${cmyk.k}%`}
          />
          <InfoRow
            label="Lum."
            value={`${(luminance(rgb) * 100).toFixed(1)}%`}
          />
        </div>
      </PanelSection>

      {/* Palette quick-pick */}
      <PanelSection>
        <PanelSectionLabel>PALETTE</PanelSectionLabel>
        <div className="flex flex-wrap gap-1.5 pb-2">
          {slots.map((slot, i) => (
            <div
              key={i}
              className="w-5.5 h-5.5 rounded cursor-pointer border border-white/10 transition-transform hover:scale-110"
              style={{ background: slot.color.hex }}
              title={slot.color.hex}
              onClick={() => setPickerHex(slot.color.hex)}
            />
          ))}
        </div>
      </PanelSection>
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
    <div className="justify-between items-center flex gap-1.5">
      <span className="text-muted-foreground shrink-0 min-w-9.5">{label}</span>
      <span
        style={{
          fontFamily: mono ? "var(--font-mono)" : undefined,
          fontSize: mono ? 9.5 : undefined,
          color: "var(--color-foreground)",
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
