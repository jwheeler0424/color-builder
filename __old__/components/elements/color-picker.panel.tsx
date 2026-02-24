import React, { useMemo } from "react";
import {
  hexToRgb,
  rgbToHsl,
  rgbToHsv,
  rgbToCmyk,
  rgbToOklab,
  rgbToOklch,
  oklabToLch,
  nearestName,
  luminance,
  parseHexAlpha,
  opaqueHex,
  toCssRgb,
  toCssHsl,
  toCssHsv,
  toCssOklch,
  toCssOklab,
  toHexAlpha,
} from "@/lib/utils";
import { useChromaStore } from "@/hooks/use-chroma-store";
import { Button } from "../ui/button";

// ─── Section helpers ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2.5 font-semibold">
      {children}
    </p>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-3.5 border-b border-border">{children}</div>;
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

export function ColorPickerPanel() {
  const {
    pickerHex,
    pickerAlpha,
    setPickerHex,
    setPickerAlpha,
    recentColors,
    slots,
  } = useChromaStore();

  // All derived values from canonical hex
  const rgb = useMemo(() => hexToRgb(pickerHex), [pickerHex]);
  const hsl = useMemo(() => rgbToHsl(rgb), [rgb]);
  const hsv = useMemo(() => rgbToHsv(rgb), [rgb]);
  const oklch = useMemo(() => rgbToOklch(rgb), [rgb]);
  const oklab = useMemo(() => rgbToOklab(rgb), [rgb]);
  const cmyk = useMemo(() => rgbToCmyk(rgb), [rgb]);
  const lch = useMemo(() => oklabToLch(oklab), [oklab]); // for display only

  const displayHex = toHexAlpha(pickerHex, pickerAlpha);

  return (
    <aside className="w-[320px] bg-card border-l border-border flex flex-col h-full shrink-0">
      {/* Recent colors */}
      {recentColors.length > 0 && (
        <Section>
          <SectionLabel>Recent</SectionLabel>
          <div className="flex items-center gap-2.5">
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
        </Section>
      )}

      {/* Color info — all formats */}
      <Section>
        <SectionLabel>Color Values</SectionLabel>
        <div className="text-[11px] text-muted-foreground leading-[2.1]">
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
      </Section>

      {/* Palette quick-pick */}
      {slots.length > 0 && (
        <Section>
          <SectionLabel>Palette</SectionLabel>
          <div className="flex flex-wrap gap-2.5 p-px">
            {slots.map((slot, i) => (
              <Button
                key={i}
                className="cursor-pointer transition-transform hover:scale-110"
                style={{ background: slot.color.hex }}
                title={slot.color.hex}
                size={"icon-sm"}
                onClick={() => setPickerHex(slot.color.hex)}
              />
            ))}
          </div>
        </Section>
      )}
    </aside>
  );
}
