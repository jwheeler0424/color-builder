import { useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import type { MixSpace } from "@/types";
import { useChromaStore } from "@/hooks/use-chroma-store";
import {
  parseHex,
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  nearestName,
  mixOklab,
  mixHsl,
  mixRgb,
  textColor,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";

const STEPS = 7;
const MIX_SPACES: { id: MixSpace; label: string; desc: string }[] = [
  {
    id: "oklch",
    label: "OKLab",
    desc: "Perceptually uniform OKLab interpolation — no muddy midpoints",
  },
  { id: "hsl", label: "HSL", desc: "Shortest hue path — familiar results" },
  { id: "rgb", label: "RGB", desc: "Raw channel interpolation" },
];

export default function ColorMixer() {
  const { slots, setSeeds, addSlot, generate } = useChromaStore();
  const navigate = useNavigate();
  const [colorA, setColorA] = useState("#e63946");
  const [colorB, setColorB] = useState("#457b9d");
  const [mixSpace, setMixSpace] = useState<MixSpace>("oklch");

  const rgbA = useMemo(
    () =>
      parseHex(colorA) ? hexToRgb(parseHex(colorA)!) : { r: 230, g: 57, b: 70 },
    [colorA],
  );
  const rgbB = useMemo(
    () =>
      parseHex(colorB)
        ? hexToRgb(parseHex(colorB)!)
        : { r: 69, g: 123, b: 157 },
    [colorB],
  );

  const blendRow = useMemo(() => {
    const mixFn =
      mixSpace === "oklch" ? mixOklab : mixSpace === "hsl" ? mixHsl : mixRgb;
    return Array.from({ length: STEPS }, (_, i) => {
      const t = i / (STEPS - 1);
      const rgb = mixFn(rgbA, rgbB, t);
      return { rgb, hex: rgbToHex(rgb), t };
    });
  }, [rgbA, rgbB, mixSpace]);

  // All three spaces side-by-side for comparison
  const allSpaces = useMemo(() => {
    return MIX_SPACES.map((space) => {
      const fn =
        space.id === "oklch" ? mixOklab : space.id === "hsl" ? mixHsl : mixRgb;
      return {
        ...space,
        steps: Array.from({ length: STEPS }, (_, i) => {
          const t = i / (STEPS - 1);
          const rgb = fn(rgbA, rgbB, t);
          return { rgb, hex: rgbToHex(rgb) };
        }),
      };
    });
  }, [rgbA, rgbB]);

  const useMixAsSeeds = () => {
    const seeds = blendRow.map(({ rgb, hex }) => ({
      hex,
      rgb,
      hsl: rgbToHsl(rgb),
    }));
    setSeeds(seeds);
    generate();
    navigate({ to: "/palette" });
  };

  const addMidpoint = () => {
    const mid = blendRow[Math.floor(STEPS / 2)];
    addSlot({ hex: mid.hex, rgb: mid.rgb, hsl: rgbToHsl(mid.rgb) });
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-[800px] mx-auto">
        <div className="mb-5">
          <h2>Color Mixer</h2>
          <p>
            Blend two colors across different color spaces. OKLab avoids the
            muddy middle-ground problem.
          </p>
        </div>

        {/* Color inputs */}
        <div className="flex gap-6 mb-4">
          {[
            { label: "Color A", val: colorA, set: setColorA, rgb: rgbA },
            { label: "Color B", val: colorB, set: setColorB, rgb: rgbB },
          ].map(({ label, val, set, rgb }) => (
            <div key={label} className="flex-1">
              <div className="text-[10px] tracking-[.1em] uppercase text-muted-foreground mb-2.5 font-display font-semibold">
                {label}
              </div>
              <div className="items-center flex gap-2">
                <div
                  className="rounded border-2 border-input flex-shrink-0"
                  style={{ width: 48, height: 48, background: rgbToHex(rgb) }}
                />
                <div>
                  <input
                    className="w-full bg-muted border border-border font-mono tracking-[.06em] mb-1 rounded px-2 py-1.5 text-[12px] text-foreground font-mono tracking-[.06em] outline-none focus:border-ring transition-colors placeholder:text-muted-foreground"
                    value={val}
                    onChange={(e) => set(e.target.value)}
                    maxLength={7}
                    spellCheck={false}
                    autoComplete="off"
                  />
                  <div className="text-muted-foreground text-[10px]">
                    {nearestName(rgb)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Palette quick-pick */}
        {slots.length > 0 && (
          <div className="mb-4">
            <div className="text-[10px] tracking-[.1em] uppercase text-muted-foreground mb-2.5 font-display font-semibold mb-1.5">
              Pick from Palette (A / B)
            </div>
            <div className="flex-wrap flex gap-1">
              {slots.map((slot, i) => (
                <div key={i} className="relative">
                  <div
                    className="rounded cursor-pointer"
                    style={{
                      width: 28,
                      height: 28,
                      background: slot.color.hex,
                      border: "1px solid rgba(255,255,255,.08)",
                    }}
                    title={slot.color.hex}
                    onClick={() => setColorA(slot.color.hex)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setColorB(slot.color.hex);
                    }}
                  />
                </div>
              ))}
              <div className="text-[10px] text-muted-foreground self-center ml-1">
                Left-click → A · Right-click → B
              </div>
            </div>
          </div>
        )}

        {/* Space selector */}
        <div className="mb-5">
          <div className="text-[10px] tracking-[.1em] uppercase text-muted-foreground mb-2.5 font-display font-semibold mb-2">
            Blend Space
          </div>
          <div className="flex gap-1">
            {MIX_SPACES.map((s) => (
              <Button
                key={s.id}
                variant={mixSpace === s.id ? "default" : "ghost"}
                onClick={() => setMixSpace(s.id)}
              >
                {s.label}
              </Button>
            ))}
          </div>
          <div className="text-muted-foreground mt-1.5 text-[11px]">
            {MIX_SPACES.find((s) => s.id === mixSpace)?.desc}
          </div>
        </div>

        {/* Active blend strip */}
        <div className="text-[10px] tracking-[.1em] uppercase text-muted-foreground mb-2.5 font-display font-semibold mb-2">
          Result
        </div>
        <div className="flex h-[60px] rounded overflow-hidden mb-2">
          {blendRow.map(({ hex, rgb }, i) => {
            const tc = textColor(rgb);
            return (
              <div
                key={i}
                className="mixer-chip flex items-end justify-center pb-1 cursor-pointer"
                style={{ background: hex }}
                title={`${hex} — click to copy`}
                onClick={() =>
                  navigator.clipboard.writeText(hex).catch(() => {})
                }
              >
                <span className="text-[9px]" style={{ color: tc }}>
                  {hex.toUpperCase()}
                </span>
              </div>
            );
          })}
        </div>

        {/* Comparison of all spaces */}
        <div className="text-[10px] tracking-[.1em] uppercase text-muted-foreground mb-2.5 font-display font-semibold mt-6 mb-2.5">
          Space Comparison
        </div>
        <div className="flex flex-col gap-1.5">
          {allSpaces.map((space) => (
            <div key={space.id} className="flex items-center gap-2.5">
              <div className="w-[52px] text-[10px] text-muted-foreground text-right flex-shrink-0">
                {space.label}
              </div>
              <div className="flex-1 h-7 flex rounded overflow-hidden">
                {space.steps.map(({ hex }, i) => (
                  <div key={i} className="flex-1" style={{ background: hex }} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-5">
          <Button variant="default" onClick={useMixAsSeeds}>
            Use Blend as Seeds →
          </Button>
          <Button variant="ghost" onClick={addMidpoint}>
            + Add Midpoint to Palette
          </Button>
        </div>
      </div>
    </div>
  );
}
