import { useMemo, useState } from "react";
import { useChromaStore } from "@/hooks/use-chroma-store";
import {
  hexToRgb,
  rgbToOklch,
  clamp,
  oklchToRgb,
  nearestName,
  rgbToHex,
  textColor,
} from "@/lib/utils";
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
        border: `1px solid ${wide ? "rgba(99,102,241,.4)" : "var(--color-secondary)"}`,
        background: "var(--color-card)",
      }}
    >
      {/* Swatch pair: sRGB top, P3 bottom (if enabled) */}
      <div className="flex-col flex">
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
            className="text-[8.5px] font-bold"
            style={{ color: tc, opacity: 0.8 }}
          >
            sRGB
          </span>
          {wide && (
            <span
              className="absolute text-white font-extrabold rounded tracking-[.04em] top-1 right-1 px-1 py-px"
              style={{ background: "rgba(99,102,241,.9)", fontSize: 7 }}
            >
              P3+
            </span>
          )}
        </div>
        {/* P3 swatch — uses CSS color(display-p3 ...) syntax */}
        {showP3 && (
          <div
            className="flex items-center justify-center"
            style={{ background: p3Css, height: 44 }}
          >
            <span
              className="text-[8.5px] font-bold"
              style={{ color: tc, opacity: 0.8 }}
            >
              P3
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-2.5 py-2">
        <div className="text-[9.5px] font-mono text-secondary-foreground mb-[3px]">
          {hex.toUpperCase()}
        </div>
        <div className="text-muted-foreground mb-1.5 text-[8.5px]">{name}</div>

        <div className="items-center flex mb-1 gap-1.5">
          <span className="text-muted-foreground text-[8.5px]">
            C={lch.C.toFixed(3)}
          </span>
          <span className="text-muted-foreground text-[8.5px]">
            H={Math.round(lch.H)}°
          </span>
        </div>

        {wide ? (
          <div
            className="text-[8px] font-bold rounded inline-block text-primary px-1.5 py-0.5"
            style={{ background: "rgba(99,102,241,.15)" }}
          >
            P3-capable → higher chroma possible
          </div>
        ) : (
          <div className="text-[8px] rounded inline-block bg-muted text-muted-foreground px-1.5 py-0.5">
            sRGB gamut
          </div>
        )}

        {/* Expanded P3 preview hex */}
        {wide && showP3 && (
          <div className="mt-[5px]">
            <div className="text-muted-foreground text-[8px]">P3 expanded:</div>
            <div className="flex items-center gap-1 mt-0.5">
              <div
                className="rounded w-[14px] h-[14px]"
                style={{
                  background: expanded,
                  border: "1px solid rgba(128,128,128,.2)",
                }}
              />
              <span className="font-mono text-muted-foreground text-[8.5px]">
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
  const slots = useChromaStore((s) => s.slots);
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
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-5">
          <h2>P3 Wide Gamut</h2>
        </div>
        <p className="text-muted-foreground text-[12px]">
          Generate a palette first.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-[900px] mx-auto">
        <div className="mb-5">
          <div className="justify-between items-start flex-wrap flex gap-2.5">
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
              variant={showP3 ? "default" : "ghost"}
              size="sm"
              onClick={() => setShowP3((v) => !v)}
            >
              {showP3 ? "P3 Preview: On" : "P3 Preview: Off"}
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="flex-wrap mb-5 flex gap-2.5">
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
                background: "var(--color-card)",
                borderRadius: 6,
                border: `1px solid ${accent ? "rgba(99,102,241,.3)" : "var(--color-secondary)"}`,
                padding: "8px 12px",
              }}
            >
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 800,
                  color: accent
                    ? "var(--color-primary)"
                    : "var(--color-foreground)",
                }}
              >
                {val}
              </div>
              <div className="text-[9px] text-muted-foreground uppercase tracking-[.05em] mt-0.5">
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Info banner */}
        <div className="text-[10.5px] text-muted-foreground leading-relaxed mb-5 bg-card rounded-md px-[14px] py-2.5 border border-muted">
          <strong className="text-secondary-foreground">How P3 works:</strong>{" "}
          sRGB swatches (top) render on all displays. P3 swatches (bottom) use{" "}
          <code className="bg-muted rounded px-[3px] py-0">
            color(display-p3 …)
          </code>{" "}
          CSS — they only show wider colors on P3-capable hardware. On sRGB
          displays, they fall back to the sRGB equivalent. Use the{" "}
          <code className="bg-muted rounded px-[3px] py-0">@supports</code>{" "}
          block in the export to progressively enhance with P3.
        </div>

        {/* Swatch grid */}
        <div
          className="grid gap-2.5 mb-7"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
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
          <div className="justify-between items-center mb-2.5 flex">
            <div className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2.5 font-display font-semibold m-0">
              CSS with P3 @supports fallback
            </div>
            <Button variant="ghost" size="sm" onClick={copyP3}>
              {copiedCss ? "✓ Copied" : "Copy"}
            </Button>
          </div>
          <pre
            className="bg-secondary border border-border rounded p-2.5 text-[10px] leading-[1.7] text-muted-foreground whitespace-pre overflow-x-auto max-h-[300px] overflow-y-auto text-[9.5px]"
            style={{ maxHeight: 280 }}
          >
            {p3Css}
          </pre>
        </div>
      </div>
    </div>
  );
}
