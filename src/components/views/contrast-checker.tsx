import { useState } from "react";
import {
  contrastRatio,
  wcagLevel,
  apcaContrast,
  apcaLevel,
  parseHex,
  hexToRgb,
  rgbToHex,
  suggestContrastFix,
} from "@/lib/utils/colorMath";
import { nearestName } from "@/lib/utils/paletteUtils";
import { useChromaStore } from "@/hooks/useChromaStore";

export default function ContrastChecker() {
  const { slots } = useChromaStore();
  const [fg, setFg] = useState("#ffffff");
  const [bg, setBg] = useState("#1a1a2e");
  const [useApca, setUseApca] = useState(false);

  const fgRgb = parseHex(fg)
    ? hexToRgb(parseHex(fg)!)
    : { r: 255, g: 255, b: 255 };
  const bgRgb = parseHex(bg)
    ? hexToRgb(parseHex(bg)!)
    : { r: 26, g: 26, b: 46 };
  const ratio = contrastRatio(fgRgb, bgRgb);
  const level = wcagLevel(ratio);

  const BADGE_COLOR: Record<string, string> = {
    AAA: "#00e676",
    AA: "#69f0ae",
    "AA Large": "#fff176",
    Fail: "#ff4455",
  };
  const BADGE_BG: Record<string, string> = {
    AAA: "rgba(0,230,118,.18)",
    AA: "rgba(105,240,174,.15)",
    "AA Large": "rgba(255,241,118,.12)",
    Fail: "rgba(255,68,85,.15)",
  };

  const swap = () => {
    const t = fg;
    setFg(bg);
    setBg(t);
  };

  return (
    <div className="ch-view-scroll ch-view-pad">
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div className="ch-view-hd">
          <h2>Contrast Checker</h2>
          <p>
            WCAG 2.1 contrast ratio between any two colors. Large text requires
            3:1, body text requires 4.5:1.
          </p>
        </div>

        {/* Live preview */}
        <div
          className="ch-contrast-preview"
          style={{ background: rgbToHex(bgRgb), color: rgbToHex(fgRgb) }}
        >
          <div className="ch-contrast-preview-lg">Aa Large text sample</div>
          <div className="ch-contrast-preview-sm">
            The quick brown fox jumps over the lazy dog
          </div>
          <div className="ch-contrast-preview-sm" style={{ opacity: 0.7 }}>
            Secondary / muted text at 70% opacity
          </div>
        </div>

        {/* APCA / WCAG toggle */}
        <div
          style={{
            display: "flex",
            gap: 4,
            justifyContent: "flex-end",
            marginBottom: 8,
          }}
        >
          <span
            style={{ fontSize: 10, color: "var(--ch-t3)", alignSelf: "center" }}
          >
            Mode:
          </span>
          {([false, true] as const).map((apca) => (
            <button
              key={String(apca)}
              className={`ch-btn ch-btn-sm ${useApca === apca ? "ch-btn-primary" : "ch-btn-ghost"}`}
              onClick={() => setUseApca(apca)}
            >
              {apca ? "APCA" : "WCAG 2.1"}
            </button>
          ))}
        </div>

        {/* Ratio display */}
        <div className="ch-contrast-ratio-row">
          {!useApca && (
            <>
              <div className="ch-contrast-ratio-num">{ratio.toFixed(2)}:1</div>
              <span
                style={{
                  padding: "4px 12px",
                  borderRadius: 3,
                  fontWeight: 700,
                  fontSize: 14,
                  background: BADGE_BG[level],
                  color: BADGE_COLOR[level],
                }}
              >
                {level}
              </span>
            </>
          )}
          {useApca &&
            (() => {
              const lc = Math.abs(apcaContrast(fgRgb, bgRgb));
              const al = apcaLevel(lc);
              const aC: Record<string, string> = {
                Preferred: "#00e676",
                Body: "#69f0ae",
                Large: "#fff176",
                UI: "#ce93d8",
                Fail: "#ff4455",
              };
              const aBg: Record<string, string> = {
                Preferred: "rgba(0,230,118,.18)",
                Body: "rgba(105,240,174,.15)",
                Large: "rgba(255,241,118,.12)",
                UI: "rgba(206,147,216,.12)",
                Fail: "rgba(255,68,85,.15)",
              };
              return (
                <>
                  <div className="ch-contrast-ratio-num">Lc{lc.toFixed(0)}</div>
                  <span
                    style={{
                      padding: "4px 12px",
                      borderRadius: 3,
                      fontWeight: 700,
                      fontSize: 14,
                      background: aBg[al],
                      color: aC[al],
                    }}
                  >
                    {al}
                  </span>
                </>
              );
            })()}
        </div>

        {/* Criteria */}
        <div className="ch-contrast-criteria">
          {[
            { label: "AA Large Text (3:1)", pass: ratio >= 3 },
            { label: "AA Normal Text (4.5:1)", pass: ratio >= 4.5 },
            { label: "AAA Large Text (4.5:1)", pass: ratio >= 4.5 },
            { label: "AAA Normal Text (7:1)", pass: ratio >= 7 },
          ].map(({ label, pass }) => (
            <div key={label} className="ch-contrast-criterion">
              <span
                style={{
                  color: pass ? "#00e676" : "#ff4455",
                  fontWeight: 700,
                  marginRight: 8,
                }}
              >
                {pass ? "✓" : "✗"}
              </span>
              {label}
            </div>
          ))}
        </div>

        {/* Fix suggestion */}
        {!useApca &&
          level === "Fail" &&
          (() => {
            const fix = suggestContrastFix(fg, bgRgb);
            return fix ? (
              <div
                style={{
                  fontSize: 10.5,
                  color: "var(--ch-t3)",
                  marginBottom: 8,
                  padding: "6px 10px",
                  background: "var(--ch-s1)",
                  borderRadius: 5,
                  border: "1px solid var(--ch-s2)",
                  lineHeight: 1.6,
                }}
              >
                💡 To reach AA: {fix.direction} foreground to{" "}
                <span
                  style={{
                    fontFamily: "var(--ch-fm)",
                    fontWeight: 700,
                    color: fix.hex,
                  }}
                >
                  {fix.hex}
                </span>
                <span
                  style={{
                    display: "inline-block",
                    width: 12,
                    height: 12,
                    borderRadius: 2,
                    background: fix.hex,
                    marginLeft: 5,
                    verticalAlign: "middle",
                    border: "1px solid rgba(128,128,128,.3)",
                  }}
                />
              </div>
            ) : null;
          })()}

        {/* Color pickers */}
        <div className="ch-contrast-pickers">
          <div className="ch-contrast-picker">
            <div className="ch-slabel">Foreground</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 3,
                  background: rgbToHex(fgRgb),
                  border: "2px solid var(--ch-b2)",
                  flexShrink: 0,
                }}
              />
              <input
                className="ch-inp"
                value={fg}
                onChange={(e) => setFg(e.target.value)}
                maxLength={7}
                spellCheck={false}
                autoComplete="off"
                style={{ fontFamily: "var(--ch-fm)", letterSpacing: ".06em" }}
              />
            </div>
            <div style={{ fontSize: 10, color: "var(--ch-t3)", marginTop: 4 }}>
              {nearestName(fgRgb)}
            </div>
          </div>

          <button
            className="ch-contrast-swap"
            onClick={swap}
            title="Swap colors"
          >
            ⇄
          </button>

          <div className="ch-contrast-picker">
            <div className="ch-slabel">Background</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 3,
                  background: rgbToHex(bgRgb),
                  border: "2px solid var(--ch-b2)",
                  flexShrink: 0,
                }}
              />
              <input
                className="ch-inp"
                value={bg}
                onChange={(e) => setBg(e.target.value)}
                maxLength={7}
                spellCheck={false}
                autoComplete="off"
                style={{ fontFamily: "var(--ch-fm)", letterSpacing: ".06em" }}
              />
            </div>
            <div style={{ fontSize: 10, color: "var(--ch-t3)", marginTop: 4 }}>
              {nearestName(bgRgb)}
            </div>
          </div>
        </div>

        {/* Palette quick-pick */}
        {slots.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div className="ch-slabel">Quick-pick from Palette</div>
            <div
              style={{
                display: "flex",
                gap: 4,
                flexWrap: "wrap",
                marginTop: 6,
              }}
            >
              {slots.map((slot, i) => (
                <div
                  key={i}
                  style={{ display: "flex", flexDirection: "column", gap: 3 }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 3,
                      background: slot.color.hex,
                      border: "1px solid rgba(255,255,255,.08)",
                      cursor: "pointer",
                    }}
                    onClick={() => setFg(slot.color.hex)}
                    title={`Set FG to ${slot.color.hex}`}
                  />
                  <div
                    style={{
                      fontSize: 8,
                      color: "var(--ch-t3)",
                      textAlign: "center",
                    }}
                  >
                    FG
                  </div>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 3,
                      background: slot.color.hex,
                      border: "1px solid rgba(255,255,255,.08)",
                      cursor: "pointer",
                    }}
                    onClick={() => setBg(slot.color.hex)}
                    title={`Set BG to ${slot.color.hex}`}
                  />
                  <div
                    style={{
                      fontSize: 8,
                      color: "var(--ch-t3)",
                      textAlign: "center",
                    }}
                  >
                    BG
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
