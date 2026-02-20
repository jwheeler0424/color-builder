import React, { useMemo, useState } from "react";
import { useChromaStore } from "@/hooks/useChromaStore";
import {
  deriveThemeTokens,
  textColor,
  rgbToOklch,
} from "@/lib/utils/colorMath";
import type { PaletteSlot } from "@/types";

type PreviewMode = "light" | "dark" | "split";

/** Parse hex → RGB for textColor() inline use */
function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

// ─── Mini App Preview ─────────────────────────────────────────────────────────

function MiniApp({
  tokens,
  slots,
  mode,
}: {
  tokens: ReturnType<typeof deriveThemeTokens>;
  slots: PaletteSlot[];
  mode: "light" | "dark";
}) {
  const get = (name: string) =>
    tokens.semantic.find((t) => t.name === name)?.[mode] ?? "#888";

  const bg = get("--background");
  const fg = get("--foreground");
  const fgMuted = get("--muted-foreground");
  const card = get("--card");
  const surfaceDim = get("--surface-dim");
  const cardRaised = get("--card-raised");
  const primary = get("--primary");
  const primaryFg = get("--primary-foreground");
  const primaryCont = get("--primary-container");
  const primaryContFg = get("--primary-container-foreground");
  const secondary = get("--secondary");
  const secondaryFg = get("--secondary-foreground");
  const muted = get("--muted");
  const border = get("--border");
  const destructive = get("--destructive");
  const destructiveFg = get("--destructive-foreground");
  const ring = get("--ring");

  const util = tokens.utility;
  const successColor =
    mode === "light" ? util.success?.light : util.success?.dark;
  const successSubtle =
    mode === "light" ? util.success?.subtle : util.success?.subtleDark;
  const infoColor = mode === "light" ? util.info?.light : util.info?.dark;
  const infoSubtle =
    mode === "light" ? util.info?.subtle : util.info?.subtleDark;
  const errorColor = mode === "light" ? util.error?.light : util.error?.dark;
  const warningColor =
    mode === "light" ? util.warning?.light : util.warning?.dark;
  const warningSubtle =
    mode === "light" ? util.warning?.subtle : util.warning?.subtleDark;

  const accentColors = [...slots]
    .sort((a, b) => rgbToOklch(b.color.rgb).C - rgbToOklch(a.color.rgb).C)
    .slice(0, 4)
    .map((s) => s.color.hex);
  const a1 = accentColors[0] ?? primary;
  const a2 = accentColors[1] ?? primary;
  const a3 = accentColors[2] ?? primary;

  const btnPrimary: React.CSSProperties = {
    background: primary,
    color: primaryFg,
    border: "none",
    borderRadius: 5,
    padding: "6px 14px",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
  };
  const btnOutline: React.CSSProperties = {
    background: "transparent",
    color: fg,
    border: `1px solid ${border}`,
    borderRadius: 5,
    padding: "6px 14px",
    fontSize: 11,
    cursor: "pointer",
  };

  return (
    <div
      style={{
        background: bg,
        color: fg,
        borderRadius: 8,
        overflow: "hidden",
        border: `1px solid ${border}`,
        fontFamily: "system-ui, sans-serif",
        fontSize: 11,
        lineHeight: 1.5,
      }}
    >
      {/* Mode badge row */}
      <div
        style={{
          background: surfaceDim,
          borderBottom: `1px solid ${border}`,
          padding: "5px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", gap: 4 }}>
          {accentColors.map((hex, i) => (
            <div
              key={i}
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: hex,
              }}
            />
          ))}
        </div>
        <span
          style={{
            fontSize: 9,
            color: fgMuted,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: ".06em",
          }}
        >
          {mode === "light" ? "☀ Light" : "☾ Dark"}
        </span>
      </div>

      {/* Nav */}
      <div
        style={{
          background: card,
          borderBottom: `1px solid ${border}`,
          padding: "9px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: 4,
            background: a1,
            flexShrink: 0,
          }}
        />
        <span style={{ fontWeight: 800, fontSize: 12, color: fg, flex: 1 }}>
          Brand
        </span>
        {["Docs", "Pricing", "Blog"].map((l) => (
          <span key={l} style={{ color: fgMuted, fontSize: 10 }}>
            {l}
          </span>
        ))}
        <button style={{ ...btnPrimary, padding: "4px 10px", fontSize: 10 }}>
          Sign in
        </button>
      </div>

      {/* Hero — primary-container */}
      <div
        style={{
          background: primaryCont,
          padding: "16px 14px",
          borderBottom: `1px solid ${border}`,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            background: primary,
            color: primaryFg,
            borderRadius: 20,
            padding: "2px 8px",
            fontSize: 8.5,
            fontWeight: 700,
            letterSpacing: ".05em",
            marginBottom: 7,
          }}
        >
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: primaryFg,
              opacity: 0.7,
            }}
          />
          JUST LAUNCHED
        </div>
        <div
          style={{
            color: primaryContFg,
            fontSize: 16,
            fontWeight: 800,
            letterSpacing: "-0.025em",
            marginBottom: 5,
          }}
        >
          Design at the speed of thought
        </div>
        <div
          style={{
            color: primaryContFg,
            opacity: 0.72,
            fontSize: 10,
            marginBottom: 12,
            lineHeight: 1.6,
          }}
        >
          Your palette, your tokens, your system — built automatically.
        </div>
        <div style={{ display: "flex", gap: 7 }}>
          <button style={btnPrimary}>Get started →</button>
          <button style={btnOutline}>View demo</button>
        </div>
      </div>

      {/* Feature cards */}
      <div
        style={{
          padding: "12px 14px",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
          borderBottom: `1px solid ${border}`,
        }}
      >
        {[
          {
            title: "Color Science",
            desc: "OKLCH perceptual palette",
            accent: a1,
          },
          {
            title: "Dark Mode",
            desc: "M3 tonal surface elevation",
            accent: a2,
          },
          { title: "Accessibility", desc: "WCAG AA/AAA contrast", accent: a3 },
        ].map(({ title, desc, accent }) => (
          <div
            key={title}
            style={{
              background: card,
              border: `1px solid ${border}`,
              borderRadius: 6,
              padding: 10,
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 5,
                background: accent,
                marginBottom: 7,
                opacity: 0.9,
              }}
            />
            <div style={{ fontWeight: 700, fontSize: 10.5, marginBottom: 3 }}>
              {title}
            </div>
            <div style={{ color: fgMuted, fontSize: 9.5, lineHeight: 1.5 }}>
              {desc}
            </div>
          </div>
        ))}
      </div>

      {/* Alerts — utility colors, fully mode-aware */}
      <div
        style={{
          padding: "10px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 5,
          borderBottom: `1px solid ${border}`,
        }}
      >
        {[
          {
            bg: successSubtle ?? surfaceDim,
            borderColor: successColor ?? primary,
            icon: "✓",
            label: "Deployment complete",
            sub: "All checks passed",
          },
          {
            bg: infoSubtle ?? surfaceDim,
            borderColor: infoColor ?? primary,
            icon: "ℹ",
            label: "New version available",
            sub: "v3.2.1 ready to install",
          },
          {
            bg: warningSubtle ?? muted,
            borderColor: warningColor ?? primary,
            icon: "⚠",
            label: "Usage at 84%",
            sub: "Consider upgrading your plan",
          },
        ].map(({ bg: alertBg, borderColor, icon, label, sub }) => (
          <div
            key={label}
            style={{
              background: alertBg,
              border: `1px solid ${borderColor}`,
              borderRadius: 5,
              padding: "6px 10px",
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: borderColor,
                color: textColor(hexToRgb(borderColor)),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {icon}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 10 }}>{label}</div>
              <div style={{ fontSize: 9, color: fgMuted }}>{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Input + focus ring demo */}
      <div
        style={{
          padding: "10px 14px",
          background: surfaceDim,
          display: "flex",
          gap: 8,
          alignItems: "center",
        }}
      >
        <div
          style={{
            flex: 1,
            background: card,
            border: `2px solid ${ring}`,
            borderRadius: 5,
            padding: "6px 10px",
            color: fgMuted,
            fontSize: 10,
            boxShadow: `0 0 0 3px ${ring}40`,
          }}
        >
          Enter your email…
        </div>
        <button style={btnPrimary}>Subscribe</button>
        <button
          style={{
            background: destructive,
            color: destructiveFg,
            border: "none",
            borderRadius: 5,
            padding: "6px 10px",
            fontSize: 10,
            fontWeight: 600,
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// ─── Token Role Legend ────────────────────────────────────────────────────────

function TokenLegend({
  tokens,
  mode,
}: {
  tokens: ReturnType<typeof deriveThemeTokens>;
  mode: "light" | "dark";
}) {
  const groups = [
    {
      label: "60% Neutral surface",
      ids: ["--background", "--surface-dim", "--card", "--card-raised"],
    },
    {
      label: "30% Content surface",
      ids: ["--secondary", "--muted", "--popover"],
    },
    {
      label: "10% Brand / CTA",
      ids: ["--primary", "--primary-container", "--ring"],
    },
  ];

  return (
    <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
      {groups.map(({ label, ids }) => (
        <div key={label} style={{ flex: "1 1 160px" }}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: "var(--ch-t3)",
              textTransform: "uppercase",
              letterSpacing: ".07em",
              marginBottom: 6,
            }}
          >
            {label}
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {ids.map((id) => {
              const tok = tokens.semantic.find((t) => t.name === id);
              const hex = tok?.[mode];
              if (!hex) return null;
              return (
                <div
                  key={id}
                  title={id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 5,
                      background: hex,
                      border: "1px solid rgba(128,128,128,.2)",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 7.5,
                      color: "var(--ch-t3)",
                      fontFamily: "var(--ch-fm)",
                      maxWidth: 28,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      textAlign: "center",
                    }}
                  >
                    {id.replace("--", "")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Utility Color Panel ──────────────────────────────────────────────────────

function UtilityPanel({
  tokens,
}: {
  tokens: ReturnType<typeof deriveThemeTokens>;
}) {
  const ICONS: Record<string, string> = {
    info: "ℹ",
    success: "✓",
    warning: "⚠",
    error: "✕",
    neutral: "○",
    focus: "◎",
  };
  const roles = Object.keys(tokens.utility) as (keyof typeof tokens.utility)[];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      {(["light", "dark"] as const).map((m) => (
        <div key={m}>
          <div
            style={{
              fontSize: 9.5,
              fontWeight: 700,
              color: "var(--ch-t3)",
              textTransform: "uppercase",
              letterSpacing: ".07em",
              marginBottom: 7,
            }}
          >
            {m === "light" ? "☀ Light" : "☾ Dark"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {roles.map((role) => {
              const color =
                m === "light"
                  ? tokens.utility[role].light
                  : tokens.utility[role].dark;
              const subtle =
                m === "light"
                  ? tokens.utility[role].subtle
                  : tokens.utility[role].subtleDark;
              return (
                <div
                  key={role}
                  style={{
                    background: subtle,
                    border: `1px solid ${color}`,
                    borderRadius: 6,
                    padding: "6px 10px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: color,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                    }}
                  >
                    <span style={{ color: textColor(hexToRgb(color)) }}>
                      {ICONS[role]}
                    </span>
                  </div>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: 10,
                      textTransform: "capitalize",
                      flex: 1,
                    }}
                  >
                    {role}
                  </span>
                  <div
                    style={{ display: "flex", gap: 3, alignItems: "center" }}
                  >
                    <div
                      title="filled"
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 3,
                        background: color,
                        border: "1px solid rgba(128,128,128,.2)",
                      }}
                    />
                    <div
                      title="subtle"
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 3,
                        background: subtle,
                        border: `1px solid ${color}`,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 8.5,
                        color: "var(--ch-t3)",
                        fontFamily: "var(--ch-fm)",
                        marginLeft: 2,
                      }}
                    >
                      {color}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function CssPreview() {
  const { slots, utilityColors } = useChromaStore();
  const [previewMode, setPreviewMode] = useState<PreviewMode>("split");

  const tokens = useMemo(
    () => deriveThemeTokens(slots, utilityColors),
    [slots, utilityColors],
  );

  if (!slots.length) {
    return (
      <div className="ch-view-scroll ch-view-pad">
        <div className="ch-view-hd">
          <h2>Live CSS Preview</h2>
        </div>
        <p style={{ color: "var(--ch-t3)", fontSize: 12 }}>
          Generate a palette first to see the preview.
        </p>
      </div>
    );
  }

  const showLight = previewMode === "light" || previewMode === "split";
  const showDark = previewMode === "dark" || previewMode === "split";

  return (
    <div className="ch-view-scroll ch-view-pad">
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div className="ch-view-hd">
          <h2>Live CSS Preview</h2>
          <p>
            Your palette applied to a real UI — nav, hero, cards, alerts (with
            correct dark subtle backgrounds), inputs with focus ring, and
            destructive actions. Both light and dark use your generated theme
            tokens throughout.
          </p>
        </div>

        {/* Mode toggle */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
          {(
            [
              { key: "split", label: "⬛ Split" },
              { key: "light", label: "☀ Light only" },
              { key: "dark", label: "☾ Dark only" },
            ] as { key: PreviewMode; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPreviewMode(key)}
              style={{
                background:
                  previewMode === key ? "var(--ch-a)" : "var(--ch-s2)",
                color: previewMode === key ? "#fff" : "var(--ch-t2)",
                border: "none",
                borderRadius: 5,
                padding: "5px 12px",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* App previews */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: showLight && showDark ? "1fr 1fr" : "1fr",
            gap: 16,
            marginBottom: 28,
          }}
        >
          {showLight && <MiniApp tokens={tokens} slots={slots} mode="light" />}
          {showDark && <MiniApp tokens={tokens} slots={slots} mode="dark" />}
        </div>

        {/* Token legend */}
        <div style={{ marginBottom: 28 }}>
          <div className="ch-slabel" style={{ marginBottom: 10 }}>
            Token roles ({previewMode === "dark" ? "dark" : "light"} mode)
          </div>
          <TokenLegend
            tokens={tokens}
            mode={previewMode === "dark" ? "dark" : "light"}
          />
        </div>

        {/* Utility panel */}
        <div>
          <div className="ch-slabel" style={{ marginBottom: 10 }}>
            Utility colors — filled + correct subtle backgrounds for both modes
          </div>
          <UtilityPanel tokens={tokens} />
        </div>
      </div>
    </div>
  );
}
