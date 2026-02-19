import React, { useState, useMemo } from "react";
import type { ChromaState, ChromaAction, MixSpace } from "@/types";
import {
  parseHex,
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  mixOklab,
  mixHsl,
  mixRgb,
  textColor,
} from "@/lib/utils/colorMath";
import { nearestName } from "@/lib/utils/paletteUtils";
import Button from "./Button";

interface Props {
  state: ChromaState;
  dispatch: React.Dispatch<ChromaAction>;
  generate: () => void;
}

const STEPS = 7;
const MIX_SPACES: { id: MixSpace; label: string; desc: string }[] = [
  {
    id: "oklch",
    label: "OKLab",
    desc: "Perceptually uniform — no muddy midpoints",
  },
  { id: "hsl", label: "HSL", desc: "Shortest hue path — familiar results" },
  { id: "rgb", label: "RGB", desc: "Raw channel interpolation" },
];

export default function ColorMixer({ state, dispatch, generate }: Props) {
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
    dispatch({ type: "SET_SEEDS", seeds });
    dispatch({ type: "SET_VIEW", view: "pal" });
    generate();
  };

  const addMidpoint = () => {
    const mid = blendRow[Math.floor(STEPS / 2)]!;
    dispatch({
      type: "ADD_SLOT",
      color: { hex: mid.hex, rgb: mid.rgb, hsl: rgbToHsl(mid.rgb) },
    });
  };

  return (
    <div className="ch-view-scroll ch-view-pad">
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <div className="ch-view-hd">
          <h2>Color Mixer</h2>
          <p>
            Blend two colors across different color spaces. OKLab avoids the
            muddy middle-ground problem.
          </p>
        </div>

        {/* Color inputs */}
        <div className="ch-mixer-inputs">
          {[
            { label: "Color A", val: colorA, set: setColorA, rgb: rgbA },
            { label: "Color B", val: colorB, set: setColorB, rgb: rgbB },
          ].map(({ label, val, set, rgb }) => (
            <div key={label} className="ch-mixer-input-group">
              <div className="ch-slabel">{label}</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 4,
                    background: rgbToHex(rgb),
                    border: "2px solid var(--ch-b2)",
                    flexShrink: 0,
                  }}
                />
                <div>
                  <input
                    className="ch-inp"
                    value={val}
                    onChange={(e) => set(e.target.value)}
                    maxLength={7}
                    spellCheck={false}
                    autoComplete="off"
                    style={{
                      fontFamily: "var(--ch-fm)",
                      letterSpacing: ".06em",
                      marginBottom: 4,
                    }}
                  />
                  <div style={{ fontSize: 10, color: "var(--ch-t3)" }}>
                    {nearestName(rgb)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Palette quick-pick */}
        {state.slots.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div className="ch-slabel" style={{ marginBottom: 6 }}>
              Pick from Palette (A / B)
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {state.slots.map((slot, i) => (
                <div key={i} style={{ position: "relative" }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 3,
                      background: slot.color.hex,
                      border: "1px solid rgba(255,255,255,.08)",
                      cursor: "pointer",
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
              <div
                style={{
                  fontSize: 10,
                  color: "var(--ch-t3)",
                  alignSelf: "center",
                  marginLeft: 4,
                }}
              >
                Left-click → A · Right-click → B
              </div>
            </div>
          </div>
        )}

        {/* Space selector */}
        <div style={{ marginBottom: 20 }}>
          <div className="ch-slabel" style={{ marginBottom: 8 }}>
            Blend Space
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {MIX_SPACES.map((s) => (
              <Button
                key={s.id}
                variant={mixSpace === s.id ? "primary" : "ghost"}
                onClick={() => setMixSpace(s.id)}
              >
                {s.label}
              </Button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "var(--ch-t3)", marginTop: 6 }}>
            {MIX_SPACES.find((s) => s.id === mixSpace)?.desc}
          </div>
        </div>

        {/* Active blend strip */}
        <div className="ch-slabel" style={{ marginBottom: 8 }}>
          Result
        </div>
        <div className="ch-mixer-strip">
          {blendRow.map(({ hex, rgb }, i) => {
            const tc = textColor(rgb);
            return (
              <div
                key={i}
                className="ch-mixer-chip"
                style={{ background: hex }}
                title={`${hex} — click to copy`}
                onClick={() =>
                  navigator.clipboard.writeText(hex).catch(() => {})
                }
              >
                <span style={{ color: tc, fontSize: 9 }}>
                  {hex.toUpperCase()}
                </span>
              </div>
            );
          })}
        </div>

        {/* Comparison of all spaces */}
        <div className="ch-slabel" style={{ margin: "24px 0 10px" }}>
          Space Comparison
        </div>
        <div className="ch-mixer-compare">
          {allSpaces.map((space) => (
            <div key={space.id} className="ch-mixer-compare-row">
              <div className="ch-mixer-compare-label">{space.label}</div>
              <div className="ch-mixer-compare-strip">
                {space.steps.map(({ hex }, i) => (
                  <div key={i} style={{ flex: 1, background: hex }} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <Button variant="primary" onClick={useMixAsSeeds}>
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
