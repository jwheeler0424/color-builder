import React, { useMemo, useState } from "react";
import { useChromaStore } from "@/hooks/use-chroma-store";
import {
  deriveThemeTokens,
  textColor,
  rgbToOklch,
  hexToRgb,
} from "@/lib/utils/color-math.utils";
import type { PaletteSlot } from "@/types";

type PreviewMode = "light" | "dark" | "split";

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
    .sort(
      (a, b) =>
        rgbToOklch(hexToRgb(b.color.hex)).C -
        rgbToOklch(hexToRgb(a.color.hex)).C,
    )
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
        <div className="flex gap-1">
          {accentColors.map((hex, i) => (
            <div
              key={i}
              className="rounded-full"
              style={{ width: 7, height: 7, background: hex }}
            />
          ))}
        </div>
        <span
          className="text-[9px] font-semibold uppercase tracking-[.06em]"
          style={{ color: fgMuted }}
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
        <div className="rounded shrink-0 w-4 h-4" style={{ background: a1 }} />
        <span
          className="font-extrabold text-[12px] flex-1"
          style={{ color: fg }}
        >
          Brand
        </span>
        {["Docs", "Pricing", "Blog"].map((l) => (
          <span key={l} className="text-[10px]" style={{ color: fgMuted }}>
            {l}
          </span>
        ))}
        <button className="text-[10px] px-2.5 py-1" style={{ ...btnPrimary }}>
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
          className="inline-flex items-center text-[8.5px] font-bold tracking-[.05em] gap-1.5 mb-[7px]"
          style={{
            background: primary,
            color: primaryFg,
            borderRadius: 20,
            padding: "2px 8px",
          }}
        >
          <div
            className="rounded-full"
            style={{ width: 5, height: 5, background: primaryFg, opacity: 0.7 }}
          />
          JUST LAUNCHED
        </div>
        <div
          className="text-base font-extrabold mb-1.5"
          style={{ color: primaryContFg, letterSpacing: "-0.025em" }}
        >
          Design at the speed of thought
        </div>
        <div
          className="text-[10px] mb-3 leading-relaxed"
          style={{ color: primaryContFg, opacity: 0.72 }}
        >
          Your palette, your tokens, your system — built automatically.
        </div>
        <div className="flex gap-[7px]">
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
              className="rounded mb-[7px]"
              style={{
                width: 24,
                height: 24,
                background: accent,
                opacity: 0.9,
              }}
            />
            <div className="font-bold text-[10.5px] mb-[3px]">{title}</div>
            <div
              className="text-[9.5px] leading-[1.5]"
              style={{ color: fgMuted }}
            >
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
              className="rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 w-[18px]"
              style={{
                height: 18,
                background: borderColor,
                color: textColor(hexToRgb(borderColor)),
              }}
            >
              {icon}
            </div>
            <div>
              <div className="font-bold text-[10px]">{label}</div>
              <div className="text-[9px]" style={{ color: fgMuted }}>
                {sub}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input + focus ring demo */}
      <div
        className="flex gap-2 items-center"
        style={{ padding: "10px 14px", background: surfaceDim }}
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
          className="border-none rounded text-[10px] font-semibold px-2.5 py-1.5"
          style={{ background: destructive, color: destructiveFg }}
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
    <div className="flex-wrap flex gap-5">
      {groups.map(({ label, ids }) => (
        <div key={label} className="flex-[1_1_160px]">
          <div className="text-muted-foreground uppercase tracking-[.07em] mb-1.5 font-bold text-[9px]">
            {label}
          </div>
          <div className="flex-wrap flex gap-1">
            {ids.map((id) => {
              const tok = tokens.semantic.find((t) => t.name === id);
              const hex = tok?.[mode];
              if (!hex) return null;
              return (
                <div
                  key={id}
                  title={id}
                  className="flex-col items-center flex gap-0.5"
                >
                  <div
                    className="rounded"
                    style={{
                      width: 24,
                      height: 24,
                      background: hex,
                      border: "1px solid rgba(128,128,128,.2)",
                    }}
                  />
                  <span className="text-[7.5px] text-muted-foreground font-mono overflow-hidden text-ellipsis whitespace-nowrap text-center max-w-7">
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
    <div className="grid gap-4 grid-cols-2">
      {(["light", "dark"] as const).map((m) => (
        <div key={m}>
          <div className="text-[9.5px] font-bold text-muted-foreground uppercase tracking-[.07em] mb-[7px]">
            {m === "light" ? "☀ Light" : "☾ Dark"}
          </div>
          <div className="flex-col flex gap-1.5">
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
                    className="rounded-full shrink-0 flex items-center justify-center text-[10px]"
                    style={{ width: 20, height: 20, background: color }}
                  >
                    <span style={{ color: textColor(hexToRgb(color)) }}>
                      {ICONS[role]}
                    </span>
                  </div>
                  <span className="capitalize font-bold text-[10px] flex-1">
                    {role}
                  </span>
                  <div className="items-center flex gap-1">
                    <div
                      title="filled"
                      className="rounded w-[14px] h-[14px]"
                      style={{
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
                    <span className="text-[8.5px] text-muted-foreground font-mono ml-0.5">
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
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-5">
          <h2>Live CSS Preview</h2>
        </div>
        <p className="text-muted-foreground text-[12px]">
          Generate a palette first to see the preview.
        </p>
      </div>
    );
  }

  const showLight = previewMode === "light" || previewMode === "split";
  const showDark = previewMode === "dark" || previewMode === "split";

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-[960px] mx-auto">
        <div className="mb-5">
          <h2>Live CSS Preview</h2>
          <p>
            Your palette applied to a real UI — nav, hero, cards, alerts (with
            correct dark subtle backgrounds), inputs with focus ring, and
            destructive actions. Both light and dark use your generated theme
            tokens throughout.
          </p>
        </div>

        {/* Mode toggle */}
        <div className="mb-5 flex gap-1">
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
                  previewMode === key
                    ? "var(--color-primary)"
                    : "var(--color-secondary)",
                color:
                  previewMode === key
                    ? "#fff"
                    : "var(--color-secondary-foreground)",
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
        <div className="mb-7">
          <div className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2.5 font-display font-semibold mb-2.5">
            Token roles ({previewMode === "dark" ? "dark" : "light"} mode)
          </div>
          <TokenLegend
            tokens={tokens}
            mode={previewMode === "dark" ? "dark" : "light"}
          />
        </div>

        {/* Utility panel */}
        <div>
          <div className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2.5 font-display font-semibold mb-2.5">
            Utility colors — filled + correct subtle backgrounds for both modes
          </div>
          <UtilityPanel tokens={tokens} />
        </div>
      </div>
    </div>
  );
}
