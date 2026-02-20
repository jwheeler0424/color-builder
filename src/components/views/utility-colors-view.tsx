import { useState, useEffect, useMemo } from "react";
import type { UtilityRole, UtilityColor } from "@/types";
import { useChromaStore } from "@/stores/chroma-store/chroma.store";
import {
  parseHex,
  textColor,
  contrastRatio,
  wcagLevel,
  hslToRgb,
  rgbToHex,
  deriveThemeTokens,
} from "@/lib/utils/colorMath";
import { hexToStop } from "@/lib/utils/paletteUtils";
import { Button } from "../ui/button";

const ROLE_ICONS: Record<UtilityRole, string> = {
  info: "ℹ",
  success: "✓",
  warning: "⚠",
  error: "✕",
  neutral: "○",
  focus: "◎",
};

function UtilityCard({
  utility,
  onColorChange,
  onToggleLock,
}: {
  utility: UtilityColor;
  onColorChange: (role: UtilityRole, hex: string) => void;
  onToggleLock: (role: UtilityRole) => void;
}) {
  const [editVal, setEditVal] = useState(utility.color.hex);
  const [editErr, setEditErr] = useState(false);
  // Sync input when the color is updated externally (regen, load palette, etc.)
  useEffect(() => {
    setEditVal(utility.color.hex);
  }, [utility.color.hex]);
  const { hex, rgb } = utility.color;
  const tc = textColor(rgb);

  const onWhite = contrastRatio(rgb, { r: 255, g: 255, b: 255 });
  const onBlack = contrastRatio(rgb, { r: 0, g: 0, b: 0 });
  const bestContrast = Math.max(onWhite, onBlack);
  const level = wcagLevel(bestContrast);

  const handleInput = (v: string) => {
    setEditVal(v);
    const h = parseHex(v);
    if (h) {
      setEditErr(false);
      onColorChange(utility.role, h);
    } else setEditErr(true);
  };

  // Subtle background: same hue, low sat, very light
  const subtleBg = rgbToHex(
    hslToRgb({
      h: utility.color.hsl.h,
      s: Math.max(utility.color.hsl.s * 0.2, 6),
      l: 93,
    }),
  );
  const subtleText = rgbToHex(
    hslToRgb({
      h: utility.color.hsl.h,
      s: Math.min(utility.color.hsl.s * 0.9, 75),
      l: 28,
    }),
  );

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

  return (
    <div className="ch-utility-card">
      {/* Swatch + lock */}
      <div className="ch-utility-swatch-row">
        <div className="ch-utility-swatch" style={{ background: hex }}>
          <span style={{ color: tc, fontSize: 18 }}>
            {ROLE_ICONS[utility.role]}
          </span>
        </div>
        <div className="ch-utility-meta">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 4,
            }}
          >
            <span className="ch-utility-label">{utility.label}</span>
            <button
              className={`ch-utility-lock${utility.locked ? " locked" : ""}`}
              onClick={() => onToggleLock(utility.role)}
              title={
                utility.locked
                  ? "Unlock — will update on next generate"
                  : "Lock — protect from re-generation"
              }
            >
              {utility.locked ? "🔒" : "🔓"}
            </button>
          </div>
          <div className="ch-utility-desc">{utility.description}</div>
        </div>
      </div>

      {/* Hex edit */}
      <input
        className={`ch-inp${editErr ? " err" : ""}`}
        value={editVal}
        onChange={(e) => handleInput(e.target.value)}
        maxLength={7}
        spellCheck={false}
        autoComplete="off"
        style={{
          fontFamily: "var(--ch-fm)",
          letterSpacing: ".06em",
          fontSize: 11,
          marginTop: 10,
        }}
      />

      {/* Usage previews */}
      <div className="ch-utility-previews">
        {/* Filled badge */}
        <div className="ch-utility-preview-item">
          <span
            style={{
              fontSize: 10,
              color: "var(--ch-t3)",
              marginBottom: 4,
              display: "block",
            }}
          >
            Filled
          </span>
          <span
            style={{
              background: hex,
              color: tc,
              padding: "3px 10px",
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            {ROLE_ICONS[utility.role]} {utility.label}
          </span>
        </div>
        {/* Subtle badge */}
        <div className="ch-utility-preview-item">
          <span
            style={{
              fontSize: 10,
              color: "var(--ch-t3)",
              marginBottom: 4,
              display: "block",
            }}
          >
            Subtle
          </span>
          <span
            style={{
              background: subtleBg,
              color: subtleText,
              padding: "3px 10px",
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            {ROLE_ICONS[utility.role]} {utility.label}
          </span>
        </div>
        {/* Outline badge */}
        <div className="ch-utility-preview-item">
          <span
            style={{
              fontSize: 10,
              color: "var(--ch-t3)",
              marginBottom: 4,
              display: "block",
            }}
          >
            Outline
          </span>
          <span
            style={{
              border: `1.5px solid ${hex}`,
              color: hex,
              padding: "2px 9px",
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              background: "transparent",
            }}
          >
            {ROLE_ICONS[utility.role]} {utility.label}
          </span>
        </div>
      </div>

      {/* WCAG badge */}
      <div
        style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}
      >
        <span
          style={{
            padding: "2px 7px",
            borderRadius: 3,
            fontSize: 10,
            fontWeight: 700,
            background: BADGE_BG[level],
            color: BADGE_COLOR[level],
          }}
        >
          {level}
        </span>
        <span style={{ fontSize: 10, color: "var(--ch-t3)" }}>
          {bestContrast.toFixed(1)}:1 on {onWhite > onBlack ? "white" : "black"}
        </span>
      </div>
    </div>
  );
}

/** Live alert/toast/banner preview using all 6 utility colors */
function LivePreview() {
  const { utilityColors, slots } = useChromaStore();
  const tokens = useMemo(
    () => deriveThemeTokens(slots, utilityColors),
    [slots, utilityColors],
  );

  const bySat = [...slots].sort((a, b) => b.color.hsl.s - a.color.hsl.s);
  const bgHex = tokens.semantic[0];
  // slots.length > 0
  //   ? [...slots].sort((a, b) => a.color.hsl.l - b.color.hsl.l)[0].color.hex
  //   : "#0f0f0f";
  const surfaceHex =
    slots.length > 1
      ? [...slots].sort((a, b) => a.color.hsl.l - b.color.hsl.l)[1].color.hex
      : "#1a1a1a";

  const roles: UtilityRole[] = ["info", "success", "warning", "error"];

  return (
    <div
      className={`ch-utility-live-preview ${bgHex.light} dark:${bgHex.dark}`}
    >
      <div
        style={{
          fontSize: 10,
          color: "var(--ch-t3)",
          textTransform: "uppercase",
          letterSpacing: ".1em",
          marginBottom: 12,
        }}
      >
        Live Component Preview
      </div>
      {/* Alert banners */}
      {roles.map((role) => {
        const u = utilityColors[role];
        const subtle = rgbToHex(
          hslToRgb({
            h: u.color.hsl.h,
            s: Math.max(u.color.hsl.s * 0.2, 6),
            l: 14,
          }),
        );
        const subtleBorder = rgbToHex(
          hslToRgb({
            h: u.color.hsl.h,
            s: Math.min(u.color.hsl.s * 0.6, 60),
            l: 28,
          }),
        );
        const subtleText = rgbToHex(
          hslToRgb({ h: u.color.hsl.h, s: Math.min(u.color.hsl.s, 75), l: 78 }),
        );
        return (
          <div
            key={role}
            style={{
              background: subtle,
              border: `1px solid ${subtleBorder}`,
              borderRadius: 6,
              padding: "10px 14px",
              marginBottom: 8,
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <span
              style={{
                color: u.color.hex,
                fontSize: 14,
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              {ROLE_ICONS[role]}
            </span>
            <div>
              <div
                style={{
                  color: subtleText,
                  fontWeight: 700,
                  fontSize: 12,
                  marginBottom: 2,
                }}
              >
                {u.label} alert
              </div>
              <div style={{ color: subtleText, fontSize: 11, opacity: 0.8 }}>
                This is an example {u.label.toLowerCase()} message component.
              </div>
            </div>
          </div>
        );
      })}

      {/* Focus ring demo */}
      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(["neutral", "focus"] as UtilityRole[]).map((role) => {
          const u = utilityColors[role];
          return (
            <button
              key={role}
              style={{
                background: surfaceHex,
                border: `2px solid ${role === "focus" ? u.color.hex : "transparent"}`,
                outline: role === "focus" ? `2px solid ${u.color.hex}` : "none",
                outlineOffset: 2,
                borderRadius: 4,
                padding: "6px 14px",
                cursor: "pointer",
                fontSize: 12,
                color: textColor(hexToStop(surfaceHex).rgb),
                opacity: role === "neutral" ? 0.5 : 1,
              }}
            >
              {role === "focus" ? "⌨ Focused button" : "◯ Disabled button"}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function UtilityColorsView() {
  const {
    utilityColors,
    slots,
    setUtilityColor,
    toggleUtilityLock,
    regenUtilityColors,
  } = useChromaStore();
  const roles: UtilityRole[] = [
    "info",
    "success",
    "warning",
    "error",
    "neutral",
    "focus",
  ];
  const handleColorChange = (role: UtilityRole, hex: string) => {
    setUtilityColor(role, hexToStop(hex));
  };

  const handleToggleLock = (role: UtilityRole) => {
    toggleUtilityLock(role);
  };

  const regenAll = () => regenUtilityColors();

  // Build CSS vars preview
  const cssVars = roles
    .map((r) => {
      const u = utilityColors[r];
      return `  --${r}: ${u.color.hex};`;
    })
    .join("\n");

  const [cssCopied, setCssCopied] = useState(false);
  const copyCss = () => {
    navigator.clipboard.writeText(`:root {\n${cssVars}\n}`).catch(() => {});
    setCssCopied(true);
    setTimeout(() => setCssCopied(false), 1400);
  };

  return (
    <div className="ch-view-scroll ch-view-pad">
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div className="ch-view-hd">
          <h2>Utility Colors</h2>
          <p>
            Semantic UI colors derived from your palette. They share the
            palette's character while remaining perceptually distinct. Lock any
            color to protect it during re-generation.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            marginBottom: 24,
            flexWrap: "wrap",
          }}
        >
          <Button variant="default" onClick={regenAll}>
            ↻ Regenerate All
          </Button>
          <Button variant="ghost" onClick={copyCss}>
            {cssCopied ? "✓ Copied CSS" : "Copy CSS Vars"}
          </Button>
        </div>

        {!slots.length && (
          <p style={{ color: "var(--ch-t3)", fontSize: 12, marginBottom: 24 }}>
            Generate a palette first to derive contextual utility colors.
          </p>
        )}

        {/* Color cards grid */}
        <div className="ch-utility-grid">
          {roles.map((role) => (
            <UtilityCard
              key={role}
              utility={utilityColors[role]}
              onColorChange={handleColorChange}
              onToggleLock={handleToggleLock}
            />
          ))}
        </div>

        {/* Live component preview */}
        <div style={{ marginTop: 32 }}>
          <div className="ch-slabel" style={{ marginBottom: 12 }}>
            Component Preview
          </div>
          <LivePreview />
        </div>

        {/* Quick CSS vars */}
        <div style={{ marginTop: 24 }}>
          <div className="ch-slabel" style={{ marginBottom: 8 }}>
            CSS Variables
          </div>
          <pre className="ch-token-pre">{`:root {\n${cssVars}\n}`}</pre>
        </div>
      </div>
    </div>
  );
}
