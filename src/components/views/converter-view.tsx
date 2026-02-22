import { useState } from "react";
import ColorPickerModal from "@/components/modals/color-picker.modal";
import { useChromaStore } from "@/hooks/useChromaStore";
import {
  parseAny,
  rgbToHex,
  rgbToHsl,
  rgbToHsv,
  rgbToCmyk,
  rgbToOklab,
  oklabToLch,
} from "@/lib/utils/colorMath";
import { nearestName } from "@/lib/utils/paletteUtils";

function ConvCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const { convInput, setConvInput } = useChromaStore();
  const rgb = parseAny(convInput);
  const hex = rgb ? rgbToHex(rgb) : undefined;
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <>
      <div className="ch-conv-card">
        <div className="ch-conv-label">{label}</div>
        <div className="ch-conv-val">{value}</div>
        {sub && <div className="ch-conv-sub">{sub}</div>}
        <button className="ch-conv-copy" onClick={copy}>
          {copied ? "✓" : "copy"}
        </button>
      </div>
      {showPicker && (
        <ColorPickerModal
          initialHex={hex ?? "#3b82f6"}
          title="Color Converter"
          onApply={(h) => {
            setConvInput(h);
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
}

export default function ConverterView() {
  const [showPicker, setShowPicker] = useState(false);
  const { convInput, setConvInput } = useChromaStore();
  const rgb = parseAny(convInput) ?? { r: 224, g: 122, b: 95 };
  const hex = rgbToHex(rgb);
  const hsl = rgbToHsl(rgb);
  const hsv = rgbToHsv(rgb);
  const cmyk = rgbToCmyk(rgb);
  const oklab = rgbToOklab(rgb);
  const lch = oklabToLch(oklab);

  return (
    <>
      <div className="ch-view-scroll" style={{ padding: 28 }}>
        <div style={{ maxWidth: 660, margin: "0 auto" }}>
          <div className="ch-view-hd">
            <h2>Color Format Converter</h2>
            <p>
              Paste any hex, rgb(), or hsl() value to see all formats instantly.
            </p>
          </div>
          <div
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 24,
              alignItems: "center",
            }}
          >
            <div
              className="ch-conv-swatch"
              style={{ background: hex, cursor: "pointer" }}
              title="Click to pick color"
              onClick={() => setShowPicker(true)}
            />
            <input
              className="ch-inp"
              value={convInput}
              onChange={(e) => setConvInput(e.target.value)}
              placeholder="#F4A261  ·  rgb(244,162,97)  ·  hsl(27,89%,67%)"
              spellCheck={false}
              autoComplete="off"
              style={{ fontSize: 13, padding: "11px 12px" }}
            />
          </div>
          <div className="ch-conv-grid">
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
            <ConvCard label="Nearest Name" value={nearestName(rgb)} />
          </div>
        </div>
      </div>
      {showPicker && (
        <ColorPickerModal
          initialHex={hex ?? "#3b82f6"}
          title="Color Converter"
          onApply={(h) => {
            setConvInput(h);
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
}
