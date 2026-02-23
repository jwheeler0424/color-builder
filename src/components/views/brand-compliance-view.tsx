/**
 * brand-compliance-view.tsx
 *
 * Checks the current palette against user-defined brand anchor colors.
 * Reports: WCAG contrast vs brand colors, OKLCH distance (perceptual harmony),
 * harmonic compatibility score, and practical pairing recommendations.
 */

import { useState, useMemo } from "react";
import { useChromaStore } from "@/hooks/use-chroma-store";
import { useRegisterHotkey } from "@/providers/hotkey.provider";
import {
  hexToRgb,
  parseHex,
  nearestName,
  cn,
  apcaContrast,
  contrastRatio,
  rgbToOklch,
} from "@/lib/utils";
import { Button } from "../ui/button";
// ─── Helpers ──────────────────────────────────────────────────────────────────

function contrastBadge(ratio: number) {
  if (ratio >= 7) return { label: "AAA", color: "#00c853" };
  if (ratio >= 4.5) return { label: "AA", color: "#69f0ae" };
  if (ratio >= 3) return { label: "AA Lg", color: "#ffd740" };
  return { label: "Fail", color: "#ff1744" };
}

function oklchDist(hexA: string, hexB: string): number {
  const a = rgbToOklch(hexToRgb(hexA));
  const b = rgbToOklch(hexToRgb(hexB));
  // Weighted OKLCH distance: L difference counts less than chroma/hue
  const dL = (a.L - b.L) * 50;
  const dC = (a.C - b.C) * 100;
  const dH =
    (Math.min(Math.abs(a.H - b.H), 360 - Math.abs(a.H - b.H)) / 360) * 100;
  return Math.sqrt(dL * dL + dC * dC + dH * dH);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BrandComplianceView() {
  const slots = useChromaStore((s) => s.slots);
  const brandColors = useChromaStore((s) => s.brandColors);
  const addBrand = useChromaStore((s) => s.addBrandColor);
  const removeBrand = useChromaStore((s) => s.removeBrandColor);
  const updateBrand = useChromaStore((s) => s.updateBrandColor);

  const [hexInput, setHexInput] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [inputErr, setInputErr] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useRegisterHotkey({
    key: "b",
    label: "Add brand color",
    group: "Brand",
    handler: () => {
      document.getElementById("brand-hex-input")?.focus();
    },
  });

  const handleAdd = () => {
    const hex = parseHex(hexInput);
    if (!hex) {
      setInputErr(true);
      setTimeout(() => setInputErr(false), 600);
      return;
    }
    addBrand(hex, labelInput.trim() || nearestName(hexToRgb(hex)));
    setHexInput("");
    setLabelInput("");
  };

  // For each brand color × palette slot: compute all compliance metrics
  const matrix = useMemo(() => {
    return brandColors.map((brand) => ({
      brand,
      pairs: slots.map((slot) => {
        const ratio = contrastRatio(
          hexToRgb(brand.hex),
          hexToRgb(slot.color.hex),
        );
        const apcaVal = Math.abs(
          apcaContrast(hexToRgb(brand.hex), hexToRgb(slot.color.hex)),
        );
        const dist = oklchDist(brand.hex, slot.color.hex);
        const badge = contrastBadge(ratio);
        const harmonious = dist < 25; // within perceptual harmony zone
        const complementary = dist > 60 && dist < 90;
        return { slot, ratio, apcaVal, dist, badge, harmonious, complementary };
      }),
    }));
  }, [brandColors, slots]);

  return (
    <div className="flex-1 overflow-auto p-7">
      <div className="mx-auto max-w-[900px]">
        <div className="mb-6">
          <h2>Brand Compliance</h2>
          <p>
            Check how well your palette pairs with core brand colors — contrast
            ratios, perceptual harmony, and pairing recommendations.
          </p>
        </div>

        {/* Brand color input */}
        <div className="bg-card border border-border rounded-lg p-4 mb-6">
          <div className="text-[10px] tracking-[.1em] uppercase text-muted-foreground mb-3 font-display font-semibold">
            Add Brand Color
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="flex gap-2 items-center">
              {hexInput && parseHex(hexInput) && (
                <div
                  className="w-8 h-8 rounded border border-border flex-shrink-0"
                  style={{ background: parseHex(hexInput) || undefined }}
                />
              )}
              <input
                id="brand-hex-input"
                className={cn(
                  "bg-muted border rounded px-2 py-1.5 text-[12px] font-mono outline-none transition-colors w-28",
                  inputErr
                    ? "border-destructive"
                    : "border-border focus:border-ring",
                )}
                value={hexInput}
                onChange={(e) => setHexInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="#0057B8"
                maxLength={7}
                spellCheck={false}
              />
            </div>
            <input
              className="flex-1 min-w-[140px] bg-muted border border-border rounded px-2 py-1.5 text-[12px] outline-none focus:border-ring transition-colors"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Label (e.g. Brand Blue)"
            />
            <Button variant="default" size="sm" onClick={handleAdd}>
              + Add
            </Button>
          </div>
        </div>

        {/* Brand colors list */}
        {brandColors.length > 0 && (
          <div className="flex gap-3 flex-wrap mb-6">
            {brandColors.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2"
              >
                <div
                  className="w-5 h-5 rounded-sm border border-border"
                  style={{ background: b.hex }}
                />
                {editingId === b.id ? (
                  <input
                    className="bg-muted border border-border rounded px-1.5 py-0.5 text-[11px] w-28 outline-none focus:border-ring"
                    defaultValue={b.label}
                    autoFocus
                    onBlur={(e) => {
                      updateBrand(b.id, { label: e.target.value || b.label });
                      setEditingId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === "Escape")
                        (e.target as HTMLInputElement).blur();
                    }}
                  />
                ) : (
                  <span
                    className="text-[12px] cursor-text hover:text-primary transition-colors"
                    onClick={() => setEditingId(b.id)}
                    title="Click to rename"
                  >
                    {b.label}
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground font-mono">
                  {b.hex.toUpperCase()}
                </span>
                <button
                  className="text-muted-foreground hover:text-destructive text-xs bg-transparent border-none cursor-pointer ml-1"
                  onClick={() => removeBrand(b.id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Compliance matrix */}
        {matrix.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <div className="text-4xl mb-4">🎨</div>
            <p className="text-[13px]">
              Add brand colors above to start checking palette compliance.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {matrix.map(({ brand, pairs }) => (
              <div key={brand.id}>
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-6 h-6 rounded border border-border"
                    style={{ background: brand.hex }}
                  />
                  <span className="font-display font-bold text-[13px]">
                    {brand.label}
                  </span>
                  <span className="text-muted-foreground font-mono text-[11px]">
                    {brand.hex.toUpperCase()}
                  </span>
                </div>

                <div
                  className="grid gap-2"
                  style={{
                    gridTemplateColumns: `repeat(${Math.min(pairs.length, 6)}, 1fr)`,
                  }}
                >
                  {pairs.map(
                    ({
                      slot,
                      ratio,
                      apcaVal,
                      dist,
                      badge,
                      harmonious,
                      complementary,
                    }) => {
                      const name =
                        slot.name || nearestName(hexToRgb(slot.color.hex));
                      return (
                        <div
                          key={slot.id}
                          className="rounded-lg border border-border overflow-hidden"
                          title={`${name}\nContrast: ${ratio.toFixed(2)}:1\nAPCA: ${apcaVal.toFixed(0)}Lc\nΔOKLCH: ${dist.toFixed(1)}`}
                        >
                          {/* Color pair preview */}
                          <div className="h-14 flex">
                            <div
                              className="flex-1"
                              style={{ background: brand.hex }}
                            />
                            <div
                              className="flex-1"
                              style={{ background: slot.color.hex }}
                            />
                          </div>
                          {/* Metrics */}
                          <div className="bg-card p-2">
                            <div className="text-[10px] font-mono font-semibold mb-1 truncate">
                              {name}
                            </div>
                            <div className="flex items-center justify-between gap-1 flex-wrap">
                              <span
                                className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold text-white"
                                style={{ background: badge.color }}
                              >
                                {badge.label}
                              </span>
                              <span className="text-[9px] font-mono text-muted-foreground">
                                {ratio.toFixed(1)}:1
                              </span>
                            </div>
                            <div className="text-[9px] text-muted-foreground mt-1">
                              APCA {apcaVal.toFixed(0)}Lc · Δ{dist.toFixed(0)}
                            </div>
                            {harmonious && (
                              <div
                                className="text-[9px] mt-1"
                                style={{ color: "#69f0ae" }}
                              >
                                ✦ Harmonious
                              </div>
                            )}
                            {complementary && (
                              <div
                                className="text-[9px] mt-1"
                                style={{ color: "#ffd740" }}
                              >
                                ◈ Complementary
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>

                {/* Summary row */}
                <div className="mt-2 flex gap-3 text-[10px] text-muted-foreground">
                  <span>
                    {pairs.filter((p) => p.ratio >= 4.5).length}/{pairs.length}{" "}
                    pass AA
                  </span>
                  <span>
                    {pairs.filter((p) => p.ratio >= 7).length}/{pairs.length}{" "}
                    pass AAA
                  </span>
                  <span>
                    {pairs.filter((p) => p.harmonious).length} harmonious
                  </span>
                  <span>
                    Best:{" "}
                    {pairs.reduce(
                      (best, p) => (p.ratio > best.ratio ? p : best),
                      pairs[0],
                    ).slot.name ||
                      nearestName(
                        hexToRgb(
                          pairs.reduce(
                            (best, p) => (p.ratio > best.ratio ? p : best),
                            pairs[0],
                          ).slot.color.hex,
                        ),
                      )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
