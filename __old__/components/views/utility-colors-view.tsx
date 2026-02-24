import React, { useState, useEffect } from "react";
import type { UtilityRole, UtilityColor } from "@/types";
import { useChromaStore } from "@/hooks/use-chroma-store";
import {
  parseHex,
  textColor,
  contrastRatio,
  wcagLevel,
  hslToRgb,
  rgbToHex,
  hexToRgb,
  hexToStop,
  rgbToOklch,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
  onEdit,
}: {
  utility: UtilityColor;
  onColorChange: (role: UtilityRole, hex: string) => void;
  onToggleLock: (role: UtilityRole) => void;
  onEdit?: () => void;
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
    <div className="bg-secondary border border-border rounded-md p-4 hover:border-input transition-colors">
      {/* Swatch + lock */}
      <div className="flex items-start gap-3">
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 border-2 border-white/10"
          style={{ background: hex }}
        >
          <span className="text-lg" style={{ color: tc }}>
            {ROLE_ICONS[utility.role]}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="items-center flex mb-1 gap-2">
            <span className="font-display text-sm font-bold text-foreground">
              {utility.label}
            </span>
            <button
              className={`bg-transparent border-none cursor-pointer text-[13px] p-0 opacity-50 hover:opacity-100 transition-opacity leading-none${utility.locked ? " locked" : ""}`}
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
          <div className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">
            {utility.description}
          </div>
        </div>
      </div>

      {/* Hex edit */}
      <input
        className={`w-full bg-muted border rounded px-2 py-1.5 text-[12px] text-foreground font-mono tracking-[.06em] outline-none focus:border-ring transition-colors placeholder:text-muted-foreground ${editErr ? "border-destructive" : "border-border"}`}
        value={editVal}
        onChange={(e) => handleInput(e.target.value)}
        maxLength={7}
        spellCheck={false}
        autoComplete="off"
        style={{ marginTop: 10 }}
      />

      {/* Usage previews */}
      <div className="flex gap-2.5 mt-3 flex-wrap">
        {/* Filled badge */}
        <div className="flex flex-col">
          <span className="text-muted-foreground block mb-1 text-[10px]">
            Filled
          </span>
          <span
            className="text-[11px] font-bold inline-flex items-center gap-[5px]"
            style={{
              background: hex,
              color: tc,
              padding: "3px 10px",
              borderRadius: 12,
            }}
          >
            {ROLE_ICONS[utility.role]} {utility.label}
          </span>
        </div>
        {/* Subtle badge */}
        <div className="flex flex-col">
          <span className="text-muted-foreground block mb-1 text-[10px]">
            Subtle
          </span>
          <span
            className="text-[11px] font-bold inline-flex items-center gap-[5px]"
            style={{
              background: subtleBg,
              color: subtleText,
              padding: "3px 10px",
              borderRadius: 12,
            }}
          >
            {ROLE_ICONS[utility.role]} {utility.label}
          </span>
        </div>
        {/* Outline badge */}
        <div className="flex flex-col">
          <span className="text-muted-foreground block mb-1 text-[10px]">
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
      <div className="items-center flex mt-2 gap-1.5">
        <span
          className="rounded text-[10px] font-bold"
          style={{
            padding: "2px 7px",
            background: BADGE_BG[level],
            color: BADGE_COLOR[level],
          }}
        >
          {level}
        </span>
        <span className="text-muted-foreground text-[10px]">
          {bestContrast.toFixed(1)}:1 on {onWhite > onBlack ? "white" : "black"}
        </span>
      </div>
    </div>
  );
}

/** Live alert/toast/banner preview using all 6 utility colors */
function LivePreview() {
  const { utilityColors, slots } = useChromaStore();
  // Sort by perceptual lightness (OKLCH L) derived from hex — immune to stale hsl
  const byL = [...slots].sort(
    (a, b) =>
      rgbToOklch(hexToRgb(a.color.hex)).L - rgbToOklch(hexToRgb(b.color.hex)).L,
  );
  const bgHex = byL.length > 0 ? byL[0].color.hex : "#0f0f0f";
  const surfaceHex = byL.length > 1 ? byL[1].color.hex : "#1a1a1a";

  const roles: UtilityRole[] = ["info", "success", "warning", "error"];

  return (
    <div
      className="rounded-lg p-5 border border-border"
      style={{ background: bgHex }}
    >
      <div className="text-muted-foreground uppercase tracking-widest mb-3 text-[10px]">
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
              className="text-sm shrink-0"
              style={{ color: u.color.hex, marginTop: 1 }}
            >
              {ROLE_ICONS[role]}
            </span>
            <div>
              <div
                className="font-bold text-[12px] mb-0.5"
                style={{ color: subtleText }}
              >
                {u.label} alert
              </div>
              <div
                className="text-[11px]"
                style={{ color: subtleText, opacity: 0.8 }}
              >
                This is an example {u.label.toLowerCase()} message component.
              </div>
            </div>
          </div>
        );
      })}

      {/* Focus ring demo */}
      <div className="flex-wrap flex mt-3 gap-2">
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
  const [editingRole, setEditingRole] = React.useState<UtilityRole | null>(
    null,
  );
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
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-[960px] mx-auto">
        <div className="mb-5">
          <h2>Utility Colors</h2>
          <p>
            Semantic UI colors derived from your palette. They share the
            palette's character while remaining perceptually distinct. Lock any
            color to protect it during re-generation.
          </p>
        </div>

        <div className="flex gap-2.5 mb-6 flex-wrap">
          <Button variant="default" onClick={regenAll}>
            ↻ Regenerate All
          </Button>
          <Button variant="ghost" onClick={copyCss}>
            {cssCopied ? "✓ Copied CSS" : "Copy CSS Vars"}
          </Button>
        </div>

        {!slots.length && (
          <p className="text-muted-foreground text-[12px] mb-6">
            Generate a palette first to derive contextual utility colors.
          </p>
        )}

        {/* Color cards grid */}
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
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
          <div className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2.5 font-display font-semibold mb-3">
            Component Preview
          </div>
          <LivePreview />
        </div>

        {/* Quick CSS vars */}
        <div className="mt-6">
          <div className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2.5 font-display font-semibold mb-2">
            CSS Variables
          </div>
          <pre className="bg-secondary border border-border rounded p-2.5 text-[10px] leading-[1.7] text-muted-foreground whitespace-pre overflow-x-auto max-h-[300px] overflow-y-auto">{`:root {\n${cssVars}\n}`}</pre>
        </div>
      </div>
    </div>
  );
}
