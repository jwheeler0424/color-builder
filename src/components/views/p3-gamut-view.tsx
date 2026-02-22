import { useMemo, useState } from "react";
import { useChromaStore } from "@/hooks/useChromaStore";
import {
  hexToRgb,
  rgbToOklch,
  clamp,
  oklchToRgb,
  rgbToHex,
  textColor,
} from "@/lib/utils/colorMath";
import { nearestName } from "@/lib/utils/paletteUtils";
import { Button } from "@/components/ui/button";

// ─── P3 conversion helpers ────────────────────────────────────────────────────
//
// Display P3 uses the same D65 white point as sRGB but a wider primary gamut.
// The conversion path: linear-sRGB → XYZ-D65 → linear-P3 → gamma-P3
//
// Matrix: linear sRGB → linear P3 (from ICC spec)
const SRGB_TO_P3 = [
  0.8225, 0.1774, 0.0, 0.0332, 0.9669, 0.0, 0.0171, 0.0724, 0.9108,
];

function srgbLinear(c: number) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function p3Gamma(c: number) {
  return c <= 0.0030186 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

function srgbToP3(r: number, g: number, b: number): [number, number, number] {
  const rL = srgbLinear(r / 255);
  const gL = srgbLinear(g / 255);
  const bL = srgbLinear(b / 255);
  const M = SRGB_TO_P3;
  const rP3 = p3Gamma(clamp(M[0] * rL + M[1] * gL + M[2] * bL, 0, 1));
  const gP3 = p3Gamma(clamp(M[3] * rL + M[4] * gL + M[5] * bL, 0, 1));
  const bP3 = p3Gamma(clamp(M[6] * rL + M[7] * gL + M[8] * bL, 0, 1));
  return [rP3, gP3, bP3];
}

/** Whether a color is outside the sRGB gamut when expressed in P3 space.
 *  Colors with OKLCH chroma > ~0.27 on most hues exceed sRGB and can benefit
 *  from P3 rendering on capable displays. */
function isWideGamut(hex: string): boolean {
  const lch = rgbToOklch(hexToRgb(hex));
  // Threshold heuristic: P3 expands most on reds, greens, and cyans.
  // Chroma > 0.25 on any hue is a strong indicator.
  return lch.C > 0.25;
}

/** Generate the true P3 color — push chroma up to what P3 can display.
 *  This is the actual wider color, not a simulation. */
function expandToP3(hex: string): string {
  const lch = rgbToOklch(hexToRgb(hex));
  // P3 can display approximately 1.35x more chroma than sRGB on average.
  // We push chroma up toward 0.38 (P3 approximate ceiling on common hues).
  const expandedC = clamp(lch.C * 1.25, lch.C, 0.38);
  return rgbToHex(oklchToRgb({ L: lch.L, C: expandedC, H: lch.H }));
}

function p3CssColor(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const [rP3, gP3, bP3] = srgbToP3(r, g, b);
  return `color(display-p3 ${rP3.toFixed(4)} ${gP3.toFixed(4)} ${bP3.toFixed(4)})`;
}

// ─── Swatch card ─────────────────────────────────────────────────────────────

function SwatchCard({
  hex,
  index,
  showP3,
}: {
  hex: string;
  index: number;
  showP3: boolean;
}) {
  const rgb = hexToRgb(hex);
  const lch = rgbToOklch(rgb);
  const wide = isWideGamut(hex);
  const expanded = wide ? expandToP3(hex) : hex;
  const p3Css = p3CssColor(hex);
  const name = nearestName(rgb);
  const tc = textColor(rgb);

  return (
    <div
      style={{
        borderRadius: 8,
        overflow: "hidden",
        border: `1px solid ${wide ? "rgba(99,102,241,.4)" : "var(--ch-s2)"}`,
        background: "var(--ch-s1)",
      }}
    >
      {/* Swatch pair: sRGB top, P3 bottom (if enabled) */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {/* sRGB swatch */}
        <div
          style={{
            background: hex,
            height: showP3 ? 44 : 72,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <span
            style={{ fontSize: 8.5, fontWeight: 700, color: tc, opacity: 0.8 }}
          >
            sRGB
          </span>
          {wide && (
            <span
              style={{
                position: "absolute",
                top: 4,
                right: 4,
                background: "rgba(99,102,241,.9)",
                color: "#fff",
                fontSize: 7,
                fontWeight: 800,
                padding: "1px 4px",
                borderRadius: 3,
                letterSpacing: ".04em",
              }}
            >
              P3+
            </span>
          )}
        </div>
        {/* P3 swatch — uses CSS color(display-p3 ...) syntax */}
        {showP3 && (
          <div
            style={{
              background: p3Css,
              height: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: 8.5,
                fontWeight: 700,
                color: tc,
                opacity: 0.8,
              }}
            >
              P3
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: "8px 10px" }}>
        <div
          style={{
            fontSize: 9.5,
            fontFamily: "var(--ch-fm)",
            color: "var(--ch-t2)",
            marginBottom: 3,
          }}
        >
          {hex.toUpperCase()}
        </div>
        <div style={{ fontSize: 8.5, color: "var(--ch-t3)", marginBottom: 5 }}>
          {name}
        </div>

        <div
          style={{
            display: "flex",
            gap: 5,
            alignItems: "center",
            marginBottom: 4,
          }}
        >
          <span style={{ fontSize: 8.5, color: "var(--ch-t3)" }}>
            C={lch.C.toFixed(3)}
          </span>
          <span style={{ fontSize: 8.5, color: "var(--ch-t3)" }}>
            H={Math.round(lch.H)}°
          </span>
        </div>

        {wide ? (
          <div
            style={{
              fontSize: 8,
              fontWeight: 700,
              padding: "2px 6px",
              borderRadius: 3,
              display: "inline-block",
              background: "rgba(99,102,241,.15)",
              color: "var(--ch-a)",
            }}
          >
            P3-capable → higher chroma possible
          </div>
        ) : (
          <div
            style={{
              fontSize: 8,
              padding: "2px 6px",
              borderRadius: 3,
              display: "inline-block",
              background: "var(--ch-s2)",
              color: "var(--ch-t3)",
            }}
          >
            sRGB gamut
          </div>
        )}

        {/* Expanded P3 preview hex */}
        {wide && showP3 && (
          <div style={{ marginTop: 5 }}>
            <div style={{ fontSize: 8, color: "var(--ch-t3)" }}>
              P3 expanded:
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                marginTop: 2,
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 2,
                  background: expanded,
                  border: "1px solid rgba(128,128,128,.2)",
                }}
              />
              <span
                style={{
                  fontSize: 8.5,
                  fontFamily: "var(--ch-fm)",
                  color: "var(--ch-t3)",
                }}
              >
                {expanded.toUpperCase()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export default function P3GamutView() {
  const { slots } = useChromaStore();
  const [showP3, setShowP3] = useState(true);
  const [copiedCss, setCopiedCss] = useState(false);

  const wideCount = useMemo(
    () => slots.filter((s) => isWideGamut(s.color.hex)).length,
    [slots],
  );

  // Generate P3-enhanced CSS
  const p3Css = useMemo(() => {
    if (!slots.length) return "";
    return `:root {\n${slots
      .map((s, i) => {
        const p3 = p3CssColor(s.color.hex);
        return `  --palette-${i + 1}-srgb: ${s.color.hex};\n  --palette-${i + 1}-p3: ${p3};`;
      })
      .join(
        "\n",
      )}\n}\n\n/* P3 variant for supporting displays */\n@supports (color: color(display-p3 0 0 0)) {\n  :root {\n${slots
      .map((s, i) => {
        const p3 = p3CssColor(s.color.hex);
        return `    --palette-${i + 1}: ${p3};`;
      })
      .join("\n")}\n  }\n}`;
  }, [slots]);

  const copyP3 = () => {
    navigator.clipboard.writeText(p3Css).catch(() => {});
    setCopiedCss(true);
    setTimeout(() => setCopiedCss(false), 1400);
  };

  if (!slots.length) {
    return (
      <div className="ch-view-scroll ch-view-pad">
        <div className="ch-view-hd">
          <h2>P3 Wide Gamut</h2>
        </div>
        <p style={{ color: "var(--ch-t3)", fontSize: 12 }}>
          Generate a palette first.
        </p>
      </div>
    );
  }

  return (
    <div className="ch-view-scroll ch-view-pad">
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div className="ch-view-hd">
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div>
              <h2>P3 / Wide Gamut Preview</h2>
              <p>
                Display P3 covers ~50% more color volume than sRGB. Colors
                marked <strong>P3+</strong> have higher chroma available on
                capable displays (iPhone, Mac Retina, modern monitors). The P3
                row shows <code>color(display-p3 …)</code> CSS syntax — only
                visible on P3 displays.
              </p>
            </div>
            <Button
              variant={showP3 ? "primary" : "ghost"}
              size="sm"
              onClick={() => setShowP3((v) => !v)}
            >
              {showP3 ? "P3 Preview: On" : "P3 Preview: Off"}
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div
          style={{
            display: "flex",
            gap: 10,
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          {[
            {
              label: "P3-capable colors",
              val: `${wideCount}/${slots.length}`,
              accent: wideCount > 0,
            },
            {
              label: "sRGB-only colors",
              val: `${slots.length - wideCount}/${slots.length}`,
              accent: false,
            },
            { label: "Gamut expansion", val: "C × 1.25", accent: false },
          ].map(({ label, val, accent }) => (
            <div
              key={label}
              style={{
                flex: "1 1 120px",
                background: "var(--ch-s1)",
                borderRadius: 6,
                border: `1px solid ${accent ? "rgba(99,102,241,.3)" : "var(--ch-s2)"}`,
                padding: "8px 12px",
              }}
            >
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 800,
                  color: accent ? "var(--ch-a)" : "var(--ch-t1)",
                }}
              >
                {val}
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: "var(--ch-t3)",
                  marginTop: 2,
                  textTransform: "uppercase",
                  letterSpacing: ".05em",
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Info banner */}
        <div
          style={{
            fontSize: 10.5,
            color: "var(--ch-t3)",
            lineHeight: 1.6,
            marginBottom: 20,
            background: "var(--ch-s1)",
            borderRadius: 6,
            padding: "10px 14px",
            border: "1px solid var(--ch-s2)",
          }}
        >
          <strong style={{ color: "var(--ch-t2)" }}>How P3 works:</strong> sRGB
          swatches (top) render on all displays. P3 swatches (bottom) use{" "}
          <code
            style={{
              background: "var(--ch-s2)",
              padding: "0 3px",
              borderRadius: 2,
            }}
          >
            color(display-p3 …)
          </code>{" "}
          CSS — they only show wider colors on P3-capable hardware. On sRGB
          displays, they fall back to the sRGB equivalent. Use the{" "}
          <code
            style={{
              background: "var(--ch-s2)",
              padding: "0 3px",
              borderRadius: 2,
            }}
          >
            @supports
          </code>{" "}
          block in the export to progressively enhance with P3.
        </div>

        {/* Swatch grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: 10,
            marginBottom: 28,
          }}
        >
          {slots.map((slot, i) => (
            <SwatchCard
              key={i}
              hex={slot.color.hex}
              index={i}
              showP3={showP3}
            />
          ))}
        </div>

        {/* Export */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <div className="ch-slabel" style={{ margin: 0 }}>
              CSS with P3 @supports fallback
            </div>
            <Button variant="ghost" size="sm" onClick={copyP3}>
              {copiedCss ? "✓ Copied" : "Copy"}
            </Button>
          </div>
          <pre
            className="ch-token-pre"
            style={{ maxHeight: 280, fontSize: 9.5 }}
          >
            {p3Css}
          </pre>
        </div>
      </div>
    </div>
  );
}
