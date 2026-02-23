import { useState, useMemo } from "react";
import ColorPickerModal from "@/components/modals/color-picker.modal";
import { useChromaStore } from "@/hooks/use-chroma-store";
import {
  parseAny,
  rgbToHex,
  rgbToHsl,
  rgbToHsv,
  rgbToCmyk,
  rgbToOklab,
  oklabToLch,
  nearestName,
} from "@/lib/utils";

// ─── ConvCard ─────────────────────────────────────────────────────────────────
// Pure display component — no modal, no store access

function ConvCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <div className="bg-card border border-border rounded p-3.5 relative">
      <div className="text-[10px] tracking-widest uppercase text-muted-foreground mb-1.5 font-display">
        {label}
      </div>
      <div className="font-mono text-[12px] break-all mb-0.5">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
      <button
        className="absolute top-2.5 right-2.5 bg-secondary border border-border rounded text-muted-foreground text-[10px] px-1.5 py-0.5 cursor-pointer font-mono hover:text-foreground transition-colors"
        onClick={copy}
      >
        {copied ? "✓" : "copy"}
      </button>
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export default function ConverterView() {
  const [showPicker, setShowPicker] = useState(false);
  const convInput = useChromaStore((s) => s.convInput);
  const setConvInput = useChromaStore((s) => s.setConvInput);

  const rgb = useMemo(
    () => parseAny(convInput) ?? { r: 224, g: 122, b: 95 },
    [convInput],
  );
  const hex = useMemo(() => rgbToHex(rgb), [rgb]);
  const hsl = useMemo(() => rgbToHsl(rgb), [rgb]);
  const hsv = useMemo(() => rgbToHsv(rgb), [rgb]);
  const cmyk = useMemo(() => rgbToCmyk(rgb), [rgb]);
  const oklab = useMemo(() => rgbToOklab(rgb), [rgb]);
  const lch = useMemo(() => oklabToLch(oklab), [oklab]);
  const name = useMemo(() => nearestName(rgb), [rgb]);

  return (
    <>
      <div className="flex-1 overflow-auto p-7">
        <div className="mx-auto max-w-165">
          <div className="mb-5">
            <h2>Color Format Converter</h2>
            <p>
              Paste any hex, rgb(), or hsl() value to see all formats instantly.
            </p>
          </div>

          {/* Input row */}
          <div className="flex gap-2.5 mb-6 items-center">
            <div
              className="w-14 h-14 rounded border-2 border-input shrink-0 transition-colors duration-150 cursor-pointer"
              style={{ background: hex }}
              title="Click to pick color"
              onClick={() => setShowPicker(true)}
            />
            <input
              className="w-full bg-muted border border-border rounded px-3 py-2.75 text-[13px] text-foreground font-mono tracking-[.06em] outline-none focus:border-ring transition-colors placeholder:text-muted-foreground"
              value={convInput}
              onChange={(e) => setConvInput(e.target.value)}
              placeholder="#F4A261  ·  rgb(244,162,97)  ·  hsl(27,89%,67%)"
              spellCheck={false}
              autoComplete="off"
            />
          </div>

          {/* Format cards */}
          <div className="grid grid-cols-2 gap-2">
            <ConvCard label="HEX" value={hex} />
            <ConvCard
              label="CSS RGB"
              value={`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`}
              sub={`R:${rgb.r} G:${rgb.g} B:${rgb.b}`}
            />
            <ConvCard
              label="CSS HSL"
              value={`hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`}
              sub={`H:${Math.round(hsl.h)}° S:${Math.round(hsl.s)}% L:${Math.round(hsl.l)}%`}
            />
            <ConvCard
              label="HSV / HSB"
              value={`hsv(${Math.round(hsv.h)}, ${Math.round(hsv.s)}%, ${Math.round(hsv.v)}%)`}
              sub={`H:${Math.round(hsv.h)}° S:${Math.round(hsv.s)}% V:${Math.round(hsv.v)}%`}
            />
            <ConvCard
              label="CMYK"
              value={`cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`}
              sub={`C:${cmyk.c} M:${cmyk.m} Y:${cmyk.y} K:${cmyk.k}`}
            />
            <ConvCard
              label="OKLab"
              value={`oklab(${oklab.L.toFixed(3)}, ${oklab.a.toFixed(3)}, ${oklab.b.toFixed(3)})`}
            />
            <ConvCard
              label="OKLCH"
              value={`oklch(${lch.L.toFixed(1)}% ${(lch.C / 100).toFixed(3)} ${Math.round(lch.H)})`}
              sub={`L:${lch.L.toFixed(1)} C:${(lch.C / 100).toFixed(3)} H:${Math.round(lch.H)}°`}
            />
            <ConvCard label="Nearest Name" value={name} />
          </div>
        </div>
      </div>

      {/* Modern Modal Implementation */}
      <ColorPickerModal
        isOpen={showPicker}
        initialHex={hex}
        title="Converter Picker"
        onApply={(newHex) => {
          setConvInput(newHex);
          setShowPicker(false);
        }}
        onClose={() => setShowPicker(false)}
      />
    </>
  );
}
