import React, { useMemo, useState } from "react";
import { useChromaStore } from "@/hooks/useChromaStore";
import {
  deriveThemeTokens,
  buildThemeCss,
  buildFigmaTokens,
  buildTailwindConfig,
  buildStyleDictionary,
  buildTailwindV4,
  semanticSlotNames,
  textColor,
  contrastRatio,
  rgbToOklch,
  hexToRgb,
} from "@/lib/utils/colorMath";
import { hexToStop } from "@/lib/utils/paletteUtils";
import type { PaletteSlot } from "@/types";
import { Button } from "@/components/ui/button";
import HexInput from "@/components/hex-input";

type ThemeTab = "css" | "figma" | "tailwind" | "tailwind4" | "styledictionary";
type PreviewMode = "light" | "dark";

const TAB_LABELS: Record<ThemeTab, string> = {
  css: "CSS Variables",
  figma: "Figma / SD",
  tailwind: "Tailwind v3",
  tailwind4: "Tailwind v4",
  styledictionary: "Style Dictionary",
};

// ─── Palette Source Strip ─────────────────────────────────────────────────────

/** Shows the raw palette swatches with their semantic role assignments */
function PaletteSourceStrip({
  slots,
  tokens,
  mode,
}: {
  slots: PaletteSlot[];
  tokens: ReturnType<typeof deriveThemeTokens>;
  mode: PreviewMode;
}) {
  const primaryHex = tokens.semantic.find((t) => t.name === "--primary")?.[
    mode
  ];
  const containerHex = tokens.semantic.find(
    (t) => t.name === "--primary-container",
  )?.[mode];

  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          fontSize: 9.5,
          fontWeight: 700,
          color: "var(--ch-t3)",
          textTransform: "uppercase",
          letterSpacing: ".07em",
          marginBottom: 6,
        }}
      >
        Source palette → theme roles
      </div>
      <div
        style={{
          display: "flex",
          gap: 6,
          alignItems: "flex-end",
          flexWrap: "wrap",
        }}
      >
        {slots.map((slot, i) => {
          const hex = slot.color.hex;
          const slotRgb = hexToRgb(slot.color.hex);
          const lch = rgbToOklch(slotRgb);
          const tc = textColor(slotRgb);

          // Determine which role this slot contributes to
          const isPrimary = hex === primaryHex;
          // Check if this slot's hue is close to each utility anchor
          const utilRoles: string[] = [];
          const hueDist = (a: number, b: number) =>
            Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
          if (hueDist(lch.H, 231) <= 70) utilRoles.push("info");
          if (hueDist(lch.H, 142) <= 70) utilRoles.push("success");
          if (hueDist(lch.H, 85) <= 70) utilRoles.push("warn");
          if (hueDist(lch.H, 25) <= 70) utilRoles.push("error");

          const roleLabel = isPrimary ? "primary" : (utilRoles[0] ?? null);

          return (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  background: hex,
                  borderRadius: isPrimary ? 8 : 6,
                  border: isPrimary
                    ? `2px solid var(--ch-t1)`
                    : "1px solid rgba(128,128,128,.2)",
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                  paddingBottom: 3,
                  boxShadow: isPrimary ? "0 0 0 3px var(--ch-a)" : "none",
                }}
              >
                {roleLabel && (
                  <span
                    style={{
                      fontSize: 7,
                      fontWeight: 800,
                      color: tc,
                      background: "rgba(0,0,0,0.18)",
                      borderRadius: 2,
                      padding: "1px 3px",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {roleLabel}
                  </span>
                )}
              </div>
              <span
                style={{
                  fontSize: 8,
                  color: "var(--ch-t3)",
                  fontFamily: "var(--ch-fm)",
                  maxWidth: 36,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {hex}
              </span>
            </div>
          );
        })}

        {/* Arrow and role legend */}
        <div
          style={{
            marginLeft: 4,
            display: "flex",
            flexDirection: "column",
            gap: 3,
            paddingBottom: 14,
          }}
        >
          <span style={{ fontSize: 9, color: "var(--ch-t3)" }}>
            → hues drive
          </span>
          <span style={{ fontSize: 9, color: "var(--ch-t3)" }}>
            surface tints,
          </span>
          <span style={{ fontSize: 9, color: "var(--ch-t3)" }}>
            brand & utility
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Website Mockup Preview ───────────────────────────────────────────────────

function WebsiteMockup({
  tokens,
  slots,
  mode,
}: {
  tokens: ReturnType<typeof deriveThemeTokens>;
  slots: PaletteSlot[];
  mode: PreviewMode;
}) {
  const get = (name: string): string => {
    const t = tokens.semantic.find((s) => s.name === name);
    return t ? t[mode] : "#888";
  };

  const bg = get("--background");
  const fg = get("--foreground");
  const fgMuted = get("--muted-foreground");
  const card = get("--card");
  const cardRaised = get("--card-raised");
  const surfaceDim = get("--surface-dim");
  const primary = get("--primary");
  const primaryFg = get("--primary-foreground");
  const primaryContainer = get("--primary-container");
  const primaryContainerFg = get("--primary-container-foreground");
  const secondary = get("--secondary");
  const secondaryFg = get("--secondary-foreground");
  const muted = get("--muted");
  const destructive = get("--destructive");
  const destructiveFg = get("--destructive-foreground");
  const border = get("--border");
  const utility = tokens.utility;

  // Palette-derived colors for UI accents — use actual slot colors adjusted for mode
  // Sort slots by chroma descending to get most saturated first
  const sortedSlots = [...slots].sort(
    (a, b) =>
      rgbToOklch(hexToRgb(b.color.hex)).C - rgbToOklch(hexToRgb(a.color.hex)).C,
  );
  // Pick up to 4 accent colors from the actual palette for variety in the mockup
  const accentColors = sortedSlots.slice(0, 4).map((s) => s.color.hex);
  const accent1 = accentColors[0] || primary;
  const accent2 = accentColors[1] || primary;
  const accent3 = accentColors[2] || primary;
  const accent4 = accentColors[3] || primary;

  const infoColor = mode === "light" ? utility.info?.light : utility.info?.dark;
  const successColor =
    mode === "light" ? utility.success?.light : utility.success?.dark;
  const warningColor =
    mode === "light" ? utility.warning?.light : utility.warning?.dark;
  const errorColor =
    mode === "light" ? utility.error?.light : utility.error?.dark;

  const btnPrimary: React.CSSProperties = {
    background: primary,
    color: primaryFg,
    border: "none",
    borderRadius: 5,
    padding: "5px 11px",
    fontSize: 10,
    fontWeight: 700,
    cursor: "pointer",
  };
  const btnSecondary: React.CSSProperties = {
    background: secondary,
    color: secondaryFg,
    border: `1px solid ${border}`,
    borderRadius: 5,
    padding: "5px 11px",
    fontSize: 10,
    fontWeight: 600,
  };

  // Subtle backgrounds are mode-aware: light mode = near-white tint, dark mode = deep tinted surface
  const infoSubtle =
    (mode === "light" ? utility.info?.subtle : utility.info?.subtleDark) ??
    surfaceDim;
  const successSubtle =
    (mode === "light"
      ? utility.success?.subtle
      : utility.success?.subtleDark) ?? surfaceDim;
  const errorSubtle =
    (mode === "light" ? utility.error?.subtle : utility.error?.subtleDark) ??
    muted;
  const warningSubtle =
    (mode === "light"
      ? utility.warning?.subtle
      : utility.warning?.subtleDark) ?? muted;

  return (
    <div
      style={{
        background: bg,
        color: fg,
        borderRadius: 10,
        overflow: "hidden",
        border: `1px solid ${border}`,
        fontFamily: "system-ui, sans-serif",
        fontSize: 11,
        lineHeight: 1.5,
        userSelect: "none",
      }}
    >
      {/* NAV — card surface (30% zone) */}
      <div
        style={{
          background: card,
          borderBottom: `1px solid ${border}`,
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        {/* Logo uses first palette color */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 5,
              background: accent1,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontWeight: 800,
              fontSize: 13,
              color: fg,
              letterSpacing: "-0.02em",
            }}
          >
            Brand
          </span>
        </div>
        <div style={{ display: "flex", gap: 14, flex: 1, marginLeft: 8 }}>
          {["Dashboard", "Projects", "Team", "Settings"].map((link, i) => (
            <span
              key={link}
              style={{
                color: i === 0 ? primary : fgMuted,
                fontSize: 10,
                fontWeight: i === 0 ? 700 : 500,
              }}
            >
              {link}
            </span>
          ))}
        </div>
        <button style={btnPrimary}>Upgrade Plan</button>
      </div>

      {/* HERO — primary-container (tinted brand surface) */}
      <div
        style={{
          background: primaryContainer,
          padding: "20px 16px",
          borderBottom: `1px solid ${border}`,
        }}
      >
        <div
          style={{
            display: "inline-block",
            background: primary,
            color: primaryFg,
            borderRadius: 20,
            padding: "2px 8px",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.05em",
            marginBottom: 8,
          }}
        >
          NEW RELEASE
        </div>
        <div
          style={{
            color: primaryContainerFg,
            fontSize: 17,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            marginBottom: 6,
          }}
        >
          Your workspace, upgraded
        </div>
        <div
          style={{
            color: primaryContainerFg,
            fontSize: 10,
            opacity: 0.75,
            marginBottom: 14,
          }}
        >
          Ship faster with a connected design system built on perceptual color
          science.
        </div>
        {/* Palette swatch dots in hero to show palette presence */}
        <div
          style={{
            display: "flex",
            gap: 5,
            marginBottom: 14,
            alignItems: "center",
          }}
        >
          {accentColors.map((hex, i) => (
            <div
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                background: hex,
                opacity: 0.9,
              }}
            />
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btnPrimary}>Get started →</button>
          <div style={btnSecondary}>Learn more</div>
        </div>
      </div>

      {/* MAIN — 60% bg with 30% card grid */}
      <div
        style={{
          padding: "14px 16px",
          display: "grid",
          gridTemplateColumns: "1fr 180px",
          gap: 12,
        }}
      >
        {/* Content column */}
        <div>
          <div
            style={{
              color: fgMuted,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Recent projects
          </div>

          {/* Card grid — palette accent colors used for card accents */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginBottom: 12,
            }}
          >
            {[
              {
                title: "Design System",
                meta: "Updated 2h ago",
                pct: 80,
                accentHex: accent1,
                badgeBg: successSubtle,
                badgeFg: successColor || primary,
                badge: "Active",
              },
              {
                title: "Mobile App",
                meta: "Updated yesterday",
                pct: 55,
                accentHex: accent2,
                badgeBg: warningSubtle,
                badgeFg: warningColor || primary,
                badge: "Review",
              },
              {
                title: "Landing Page",
                meta: "Updated 3d ago",
                pct: 30,
                accentHex: accent3,
                badgeBg: muted,
                badgeFg: fgMuted,
                badge: "Draft",
              },
              {
                title: "API Docs",
                meta: "Updated 1w ago",
                pct: 100,
                accentHex: accent4,
                badgeBg: successSubtle,
                badgeFg: successColor || primary,
                badge: "Complete",
              },
            ].map(
              ({ title, meta, pct, accentHex, badgeBg, badgeFg, badge }, i) => (
                <div
                  key={i}
                  style={{
                    background: card,
                    border: `1px solid ${border}`,
                    borderRadius: 7,
                    padding: 0,
                    overflow: "hidden",
                  }}
                >
                  {/* Color accent bar from the actual palette color */}
                  <div style={{ height: 3, background: accentHex }} />
                  <div style={{ padding: 10 }}>
                    <div
                      style={{ fontWeight: 700, fontSize: 11, marginBottom: 3 }}
                    >
                      {title}
                    </div>
                    <div
                      style={{ color: fgMuted, fontSize: 9, marginBottom: 8 }}
                    >
                      {meta}
                    </div>
                    <div
                      style={{
                        background: muted,
                        borderRadius: 4,
                        height: 5,
                        marginBottom: 6,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          background: accentHex,
                          borderRadius: 4,
                        }}
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span
                        style={{
                          background: badgeBg,
                          color: badgeFg,
                          borderRadius: 3,
                          padding: "2px 6px",
                          fontSize: 9,
                          fontWeight: 600,
                        }}
                      >
                        {badge}
                      </span>
                      <span style={{ fontSize: 9, color: fgMuted }}>
                        {pct}%
                      </span>
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>

          {/* Alert banners — utility colors derived from palette */}
          {[
            {
              color: infoColor || primary,
              subtle: infoSubtle,
              icon: "ℹ",
              bold: "Version 3.2 available",
              text: "— Performance improvements and bug fixes.",
            },
            {
              color: successColor || primary,
              subtle: successSubtle,
              icon: "✓",
              bold: "Deployment successful",
              text: "— All checks passed. Live at 14:32 UTC.",
            },
          ].map(({ color, subtle, icon, bold, text }, i) => (
            <div
              key={i}
              style={{
                background: subtle,
                border: `1px solid ${color}`,
                borderRadius: 6,
                padding: "8px 10px",
                display: "flex",
                gap: 6,
                alignItems: "flex-start",
                marginBottom: i === 0 ? 8 : 0,
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  background: color,
                  flexShrink: 0,
                  marginTop: 1,
                }}
              />
              <div style={{ fontSize: 9.5 }}>
                <span style={{ fontWeight: 700 }}>{bold}</span> {text}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar — raised card (30% secondary surface) */}
        <div>
          {/* Quick actions */}
          <div
            style={{
              background: cardRaised,
              border: `1px solid ${border}`,
              borderRadius: 7,
              padding: 10,
              marginBottom: 8,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 10.5, marginBottom: 8 }}>
              Quick Actions
            </div>
            <input
              style={{
                width: "100%",
                background: muted,
                border: `1px solid ${border}`,
                borderRadius: 4,
                padding: "5px 7px",
                fontSize: 10,
                color: fgMuted,
                boxSizing: "border-box",
                marginBottom: 6,
              }}
              readOnly
              defaultValue="Search…"
            />
            <button style={{ ...btnPrimary, width: "100%", marginBottom: 4 }}>
              New Project
            </button>
            <div style={{ ...btnSecondary, textAlign: "center" }}>Import</div>
          </div>

          {/* Usage stats — progress bars use palette accent colors */}
          <div
            style={{
              background: cardRaised,
              border: `1px solid ${border}`,
              borderRadius: 7,
              padding: 10,
              marginBottom: 8,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 10.5, marginBottom: 8 }}>
              Usage
            </div>
            {[
              { label: "Storage", value: "4.2 GB", pct: 42, color: accent1 },
              { label: "Bandwidth", value: "12 GB", pct: 68, color: accent2 },
              {
                label: "API calls",
                value: "8,400",
                pct: 84,
                color: errorColor || accent3,
              },
            ].map(({ label, value, pct, color }) => (
              <div key={label}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "3px 0",
                  }}
                >
                  <span style={{ fontSize: 9.5, color: fgMuted }}>{label}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: fg }}>
                    {value}
                  </span>
                </div>
                <div
                  style={{
                    background: muted,
                    borderRadius: 4,
                    height: 5,
                    margin: "2px 0 5px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: "100%",
                      borderRadius: 4,
                      background: color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Error state */}
          <div
            style={{
              background: errorSubtle,
              border: `1px solid ${errorColor || destructive}`,
              borderRadius: 7,
              padding: "8px 10px",
            }}
          >
            <div
              style={{
                fontSize: 9.5,
                fontWeight: 700,
                color: errorColor || destructive,
                marginBottom: 3,
              }}
            >
              ⚠ API limit reached
            </div>
            <div style={{ fontSize: 9, marginBottom: 6 }}>
              Upgrade to continue using the API.
            </div>
            <button
              style={{
                ...btnPrimary,
                background: destructive,
                color: destructiveFg,
                width: "100%",
                fontSize: 9,
              }}
            >
              Upgrade now
            </button>
          </div>
        </div>
      </div>

      {/* FOOTER — surface-dim */}
      <div
        style={{
          background: surfaceDim,
          borderTop: `1px solid ${border}`,
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: 9, color: fgMuted }}>© 2025 Brand Inc.</span>
        {/* Footer uses palette colors as color dots */}
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          {accentColors.map((hex, i) => (
            <div
              key={i}
              style={{ width: 6, height: 6, borderRadius: 3, background: hex }}
            />
          ))}
          {["Privacy", "Terms", "Help"].map((l) => (
            <span
              key={l}
              style={{
                color: primary,
                fontSize: 9,
                fontWeight: 600,
                marginLeft: 4,
              }}
            >
              {l}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Utility Strip ────────────────────────────────────────────────────────────

function UtilityStrip({
  tokens,
  mode,
}: {
  tokens: ReturnType<typeof deriveThemeTokens>;
  mode: PreviewMode;
}) {
  const roles = Object.keys(tokens.utility) as (keyof typeof tokens.utility)[];
  const ICONS: Record<string, string> = {
    info: "ℹ",
    success: "✓",
    warning: "⚠",
    error: "✕",
    neutral: "○",
    focus: "◎",
  };

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {roles.map((role) => {
        const color =
          mode === "light"
            ? tokens.utility[role].light
            : tokens.utility[role].dark;
        const subtle =
          mode === "light"
            ? tokens.utility[role].subtle
            : tokens.utility[role].subtleDark;
        const tc = textColor(hexToStop(color).rgb);
        return (
          <div key={role} style={{ flex: "1 1 80px" }}>
            <div
              style={{
                background: color,
                color: tc,
                borderRadius: "5px 5px 0 0",
                padding: "6px 8px",
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              <span style={{ fontSize: 12 }}>{ICONS[role]}</span>
              <span style={{ textTransform: "capitalize" }}>{role}</span>
            </div>
            <div
              style={{
                background: subtle,
                borderRadius: "0 0 5px 5px",
                padding: "4px 8px",
                fontSize: 9,
                color: color,
                fontWeight: 600,
                fontFamily: "var(--ch-fm)",
              }}
            >
              {color}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Contrast Matrix ──────────────────────────────────────────────────────────

function ContrastMatrix({
  tokens,
}: {
  tokens: ReturnType<typeof deriveThemeTokens>;
}) {
  const pairs = [
    { label: "Body text / background", fg: "--foreground", bg: "--background" },
    {
      label: "Muted text / background",
      fg: "--muted-foreground",
      bg: "--background",
    },
    { label: "Body text / card", fg: "--foreground", bg: "--card" },
    {
      label: "Primary fg / primary",
      fg: "--primary-foreground",
      bg: "--primary",
    },
    {
      label: "Container fg / container",
      fg: "--primary-container-foreground",
      bg: "--primary-container",
    },
    {
      label: "Secondary fg / secondary",
      fg: "--secondary-foreground",
      bg: "--secondary",
    },
    {
      label: "Destruct fg / destructive",
      fg: "--destructive-foreground",
      bg: "--destructive",
    },
  ];

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
              letterSpacing: ".08em",
              marginBottom: 6,
            }}
          >
            {m === "light" ? "☀ Light mode" : "☾ Dark mode"}
          </div>
          {pairs.map(({ label, fg, bg }) => {
            const fgHex =
              tokens.semantic.find((t) => t.name === fg)?.[m] ?? "#888";
            const bgHex =
              tokens.semantic.find((t) => t.name === bg)?.[m] ?? "#fff";
            const ratio = contrastRatio(
              hexToStop(fgHex).rgb,
              hexToStop(bgHex).rgb,
            );
            const aaa = ratio >= 7,
              aa = ratio >= 4.5,
              aaLarge = ratio >= 3;
            const badgeColor = aaa
              ? "#22c55e"
              : aa
                ? "#3b82f6"
                : aaLarge
                  ? "#f59e0b"
                  : "#ef4444";
            const badgeLabel = aaa
              ? "AAA"
              : aa
                ? "AA"
                : aaLarge
                  ? "AA+"
                  : "FAIL";

            return (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 0",
                  borderBottom: "1px solid var(--ch-s2)",
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 18,
                    borderRadius: 3,
                    background: bgHex,
                    border: "1px solid rgba(128,128,128,.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: 12,
                      height: 3,
                      borderRadius: 1,
                      background: fgHex,
                    }}
                  />
                </div>
                <span style={{ fontSize: 9, color: "var(--ch-t2)", flex: 1 }}>
                  {label}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    fontFamily: "var(--ch-fm)",
                    color: "var(--ch-t3)",
                    marginRight: 2,
                  }}
                >
                  {ratio.toFixed(1)}:1
                </span>
                <span
                  style={{
                    fontSize: 8,
                    fontWeight: 700,
                    color: "#fff",
                    background: badgeColor,
                    borderRadius: 3,
                    padding: "1px 4px",
                  }}
                >
                  {badgeLabel}
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Token Table ──────────────────────────────────────────────────────────────

function TokenTable({
  tokens,
}: {
  tokens: ReturnType<typeof deriveThemeTokens>;
}) {
  const groups = [
    {
      label: "Surface Layers (60–30%)",
      ids: [
        "--background",
        "--surface-dim",
        "--card",
        "--card-raised",
        "--popover",
        "--surface-dim-foreground",
        "--card-foreground",
        "--card-raised-foreground",
        "--popover-foreground",
      ],
    },
    {
      label: "Primary Brand (10% CTA)",
      ids: [
        "--primary",
        "--primary-foreground",
        "--primary-container",
        "--primary-container-foreground",
      ],
    },
    {
      label: "Secondary & Accent",
      ids: [
        "--secondary",
        "--secondary-foreground",
        "--accent",
        "--accent-foreground",
        "--muted",
        "--muted-foreground",
      ],
    },
    { label: "Text", ids: ["--foreground"] },
    {
      label: "Destructive / Error",
      ids: [
        "--destructive",
        "--destructive-foreground",
        "--destructive-subtle",
      ],
    },
    {
      label: "Borders, Inputs & Focus",
      ids: ["--border", "--border-strong", "--input", "--ring"],
    },
  ];

  return (
    <div>
      {groups.map(({ label, ids }) => {
        const groupTokens = ids.flatMap((id) =>
          tokens.semantic.filter((t) => t.name === id),
        );
        if (!groupTokens.length) return null;
        return (
          <div key={label} style={{ marginBottom: 14 }}>
            <div
              style={{
                fontSize: 9.5,
                fontWeight: 700,
                color: "var(--ch-t3)",
                textTransform: "uppercase",
                letterSpacing: ".08em",
                marginBottom: 5,
                paddingBottom: 4,
                borderBottom: "1px solid var(--ch-s2)",
              }}
            >
              {label}
            </div>
            {groupTokens.map((t) => (
              <div
                key={t.name}
                style={{
                  display: "grid",
                  gridTemplateColumns: "160px 90px 90px 1fr",
                  gap: 8,
                  alignItems: "center",
                  padding: "4px 0",
                  borderBottom: "1px solid var(--ch-s2)",
                }}
              >
                <code
                  style={{
                    fontSize: 9.5,
                    color: "var(--ch-t2)",
                    fontFamily: "var(--ch-fm)",
                  }}
                >
                  {t.name}
                </code>
                {(["light", "dark"] as const).map((m) => (
                  <div
                    key={m}
                    style={{ display: "flex", alignItems: "center", gap: 5 }}
                  >
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 3,
                        background: t[m],
                        border: "1px solid rgba(128,128,128,.2)",
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 9,
                        fontFamily: "var(--ch-fm)",
                        color: "var(--ch-t3)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {t[m]}
                    </span>
                  </div>
                ))}
                <span
                  style={{
                    fontSize: 9,
                    color: "var(--ch-t3)",
                    lineHeight: 1.4,
                  }}
                >
                  {t.description}
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─── Editable Token Table ─────────────────────────────────────────────────────

function EditableTokenTable({
  tokens,
  overrides,
  onOverride,
  onRevert,
}: {
  tokens: ReturnType<typeof deriveThemeTokens>;
  overrides: Record<string, { light: string; dark: string }>;
  onOverride: (name: string, mode: "light" | "dark", hex: string) => void;
  onRevert: (name: string) => void;
}) {
  const groups = [
    {
      label: "Surface Layers (60–30%)",
      ids: [
        "--background",
        "--surface-dim",
        "--card",
        "--card-raised",
        "--popover",
        "--surface-dim-foreground",
        "--card-foreground",
        "--card-raised-foreground",
        "--popover-foreground",
      ],
    },
    {
      label: "Primary Brand (10% CTA)",
      ids: [
        "--primary",
        "--primary-foreground",
        "--primary-container",
        "--primary-container-foreground",
      ],
    },
    {
      label: "Secondary & Accent",
      ids: [
        "--secondary",
        "--secondary-foreground",
        "--accent",
        "--accent-foreground",
        "--muted",
        "--muted-foreground",
      ],
    },
    { label: "Text", ids: ["--foreground"] },
    {
      label: "Destructive / Error",
      ids: [
        "--destructive",
        "--destructive-foreground",
        "--destructive-subtle",
      ],
    },
    {
      label: "Borders, Inputs & Focus",
      ids: ["--border", "--border-strong", "--input", "--ring"],
    },
  ];

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "160px 110px 110px 1fr 28px",
          gap: 6,
          padding: "4px 0",
          marginBottom: 4,
        }}
      >
        {["Token", "Light", "Dark", "Usage", ""].map((h) => (
          <span
            key={h}
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: "var(--ch-t3)",
              textTransform: "uppercase",
            }}
          >
            {h}
          </span>
        ))}
      </div>
      {groups.map(({ label, ids }) => {
        const groupTokens = ids.flatMap((id) =>
          tokens.semantic.filter((t) => t.name === id),
        );
        if (!groupTokens.length) return null;
        return (
          <div key={label} style={{ marginBottom: 14 }}>
            <div
              style={{
                fontSize: 9.5,
                fontWeight: 700,
                color: "var(--ch-t3)",
                textTransform: "uppercase",
                letterSpacing: ".08em",
                marginBottom: 5,
                paddingBottom: 4,
                borderBottom: "1px solid var(--ch-s2)",
              }}
            >
              {label}
            </div>
            {groupTokens.map((t) => {
              const isOverridden = !!overrides[t.name];
              return (
                <div
                  key={t.name}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "160px 110px 110px 1fr 28px",
                    gap: 6,
                    alignItems: "center",
                    padding: "4px 0",
                    borderBottom: "1px solid var(--ch-s2)",
                    background: isOverridden
                      ? "rgba(99,102,241,.04)"
                      : undefined,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 3 }}
                  >
                    {isOverridden && (
                      <span style={{ fontSize: 8, color: "var(--ch-a)" }}>
                        ✎
                      </span>
                    )}
                    <code
                      style={{
                        fontSize: 9,
                        color: "var(--ch-t2)",
                        fontFamily: "var(--ch-fm)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {t.name}
                    </code>
                  </div>
                  <HexInput
                    value={t.light}
                    onChange={(hex) => onOverride(t.name, "light", hex)}
                    showSwatch
                    style={{ minWidth: 0 }}
                  />
                  <HexInput
                    value={t.dark}
                    onChange={(hex) => onOverride(t.name, "dark", hex)}
                    showSwatch
                    style={{ minWidth: 0 }}
                  />
                  <span
                    style={{
                      fontSize: 9,
                      color: "var(--ch-t3)",
                      lineHeight: 1.4,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t.description}
                  </span>
                  {isOverridden ? (
                    <button
                      onClick={() => onRevert(t.name)}
                      title="Revert to generated"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 11,
                        color: "var(--ch-t3)",
                        padding: 0,
                      }}
                    >
                      ↩
                    </button>
                  ) : (
                    <span />
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── Component Showcase ───────────────────────────────────────────────────────

function ComponentShowcase({
  tokens,
  mode,
}: {
  tokens: ReturnType<typeof deriveThemeTokens>;
  mode: PreviewMode;
}) {
  const get = (name: string) =>
    tokens.semantic.find((t) => t.name === name)?.[mode] ?? "#888";
  const pri = get("--primary"),
    priFg = get("--primary-foreground");
  const sec = get("--secondary"),
    secFg = get("--secondary-foreground");
  const bg = get("--background"),
    fg = get("--foreground");
  const muted = get("--muted"),
    fgM = get("--muted-foreground");
  const des = get("--destructive"),
    desFg = get("--destructive-foreground");
  const border = get("--border"),
    input = get("--input"),
    ring = get("--ring");
  const card = get("--card"),
    cardFg = get("--card-foreground");
  const accent = get("--accent");
  const u = tokens.utility;

  const Btn = ({
    bg: b,
    color: c,
    label,
    width,
  }: {
    bg: string;
    color: string;
    label: string;
    width?: string;
  }) => (
    <button
      style={{
        background: b,
        color: c,
        border: `1px solid ${border}`,
        borderRadius: 5,
        padding: "5px 12px",
        fontSize: 10,
        fontWeight: 700,
        cursor: "pointer",
        width: width ?? "auto",
      }}
    >
      {label}
    </button>
  );

  const Badge = ({
    bg: b,
    color: c,
    label,
  }: {
    bg: string;
    color: string;
    label: string;
  }) => (
    <span
      style={{
        background: b,
        color: c,
        borderRadius: 20,
        padding: "2px 8px",
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.04em",
      }}
    >
      {label}
    </span>
  );

  const Alert = ({
    color,
    subtle,
    icon,
    title,
    body,
  }: {
    color: string;
    subtle: string;
    icon: string;
    title: string;
    body: string;
  }) => (
    <div
      style={{
        background: subtle,
        border: `1px solid ${color}`,
        borderRadius: 6,
        padding: "8px 10px",
        display: "flex",
        gap: 8,
        alignItems: "flex-start",
      }}
    >
      <span style={{ fontSize: 12, lineHeight: 1.4 }}>{icon}</span>
      <div style={{ fontSize: 9.5 }}>
        <span style={{ fontWeight: 700, color }}>{title}</span>
        <span style={{ color: fg, opacity: 0.8 }}> — {body}</span>
      </div>
    </div>
  );

  const lOrD = (l: string, d: string) => (mode === "light" ? l : d);
  const infoL = u.info?.light ?? pri,
    infoS = lOrD(u.info?.subtle ?? muted, u.info?.subtleDark ?? muted);
  const successL = u.success?.light ?? pri,
    successS = lOrD(u.success?.subtle ?? muted, u.success?.subtleDark ?? muted);
  const warnL = u.warning?.light ?? pri,
    warnS = lOrD(u.warning?.subtle ?? muted, u.warning?.subtleDark ?? muted);
  const errL = u.error?.light ?? des,
    errS = lOrD(u.error?.subtle ?? muted, u.error?.subtleDark ?? muted);

  return (
    <div
      style={{
        background: bg,
        color: fg,
        borderRadius: 8,
        border: `1px solid ${border}`,
        padding: 16,
        fontFamily: "system-ui,sans-serif",
        userSelect: "none",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 16,
      }}
    >
      {/* Buttons */}
      <div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: fgM,
            textTransform: "uppercase",
            letterSpacing: ".07em",
            marginBottom: 8,
          }}
        >
          Buttons
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <Btn bg={pri} color={priFg} label="Primary" />
          <Btn bg={sec} color={secFg} label="Secondary" />
          <Btn bg="transparent" color={fg} label="Ghost" />
          <Btn bg={des} color={desFg} label="Destructive" />
          <Btn bg={accent} color={fg} label="Accent" />
        </div>
      </div>

      {/* Badges */}
      <div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: fgM,
            textTransform: "uppercase",
            letterSpacing: ".07em",
            marginBottom: 8,
          }}
        >
          Badges
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          <Badge bg={`${pri}22`} color={pri} label="Default" />
          <Badge bg={successS} color={successL} label="Success" />
          <Badge bg={warnS} color={warnL} label="Warning" />
          <Badge bg={errS} color={errL} label="Error" />
          <Badge bg={muted} color={fgM} label="Neutral" />
        </div>
      </div>

      {/* Input */}
      <div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: fgM,
            textTransform: "uppercase",
            letterSpacing: ".07em",
            marginBottom: 8,
          }}
        >
          Input
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div>
            <div
              style={{
                fontSize: 9.5,
                fontWeight: 600,
                color: fg,
                marginBottom: 3,
              }}
            >
              Email address
            </div>
            <div
              style={{
                background: input,
                border: `1px solid ${border}`,
                borderRadius: 5,
                padding: "5px 9px",
                fontSize: 9.5,
                color: fgM,
                marginBottom: 3,
                outline: `2px solid ${ring}`,
              }}
            >
              name@company.com
            </div>
            <div style={{ fontSize: 9, color: infoL }}>
              We'll never share your email.
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 9.5,
                fontWeight: 600,
                color: fg,
                marginBottom: 3,
              }}
            >
              Password
            </div>
            <div
              style={{
                background: input,
                border: `1px solid ${errL}`,
                borderRadius: 5,
                padding: "5px 9px",
                fontSize: 9.5,
                color: fg,
                marginBottom: 3,
              }}
            >
              ••••••
            </div>
            <div style={{ fontSize: 9, color: errL }}>
              Password must be 8+ characters.
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: fgM,
            textTransform: "uppercase",
            letterSpacing: ".07em",
            marginBottom: 8,
          }}
        >
          Alerts
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <Alert
            color={infoL}
            subtle={infoS}
            icon="ℹ"
            title="Note"
            body="v3.2 now available."
          />
          <Alert
            color={successL}
            subtle={successS}
            icon="✓"
            title="Success"
            body="Deployment complete."
          />
          <Alert
            color={warnL}
            subtle={warnS}
            icon="⚠"
            title="Warning"
            body="Storage at 90%."
          />
          <Alert
            color={errL}
            subtle={errS}
            icon="✕"
            title="Error"
            body="Payment failed."
          />
        </div>
      </div>

      {/* Card */}
      <div style={{ gridColumn: "1 / -1" }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: fgM,
            textTransform: "uppercase",
            letterSpacing: ".07em",
            marginBottom: 8,
          }}
        >
          Cards
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 8,
          }}
        >
          {[
            {
              title: "Total Revenue",
              val: "$24,521",
              change: "+12.5%",
              positive: true,
              accent: infoL,
            },
            {
              title: "Active Users",
              val: "3,842",
              change: "+4.1%",
              positive: true,
              accent: successL,
            },
            {
              title: "Churn Rate",
              val: "1.8%",
              change: "+0.3%",
              positive: false,
              accent: errL,
            },
          ].map(({ title, val, change, positive, accent: a }) => (
            <div
              key={title}
              style={{
                background: card,
                border: `1px solid ${border}`,
                borderRadius: 7,
                padding: "10px 12px",
                borderTop: `3px solid ${a}`,
              }}
            >
              <div style={{ fontSize: 9, color: fgM, marginBottom: 4 }}>
                {title}
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: cardFg,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.1,
                }}
              >
                {val}
              </div>
              <div
                style={{
                  fontSize: 9.5,
                  color: positive ? successL : errL,
                  marginTop: 4,
                }}
              >
                {change}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export default function ThemeGeneratorView() {
  const { slots, utilityColors } = useChromaStore();
  const [activeTab, setActiveTab] = useState<ThemeTab>("css");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("light");
  const [copied, setCopied] = useState(false);
  const [expandTokens, setExpandTokens] = useState(false);
  const [expandContrast, setExpandContrast] = useState(false);
  const [expandComponents, setExpandComponents] = useState(false);

  const tokens = useMemo(
    () => deriveThemeTokens(slots, utilityColors),
    [slots, utilityColors],
  );
  const slotNames = useMemo(() => semanticSlotNames(slots), [slots]);
  const [tokenOverrides, setTokenOverrides] = useState<
    Record<string, { light: string; dark: string }>
  >({});

  const mergedTokens = useMemo(
    () => ({
      ...tokens,
      semantic: tokens.semantic.map((t) => {
        const o = tokenOverrides[t.name];
        return o
          ? { ...t, light: o.light ?? t.light, dark: o.dark ?? t.dark }
          : t;
      }),
    }),
    [tokens, tokenOverrides],
  );

  const overrideToken = (name: string, mode: "light" | "dark", hex: string) => {
    setTokenOverrides((prev) => ({
      ...prev,
      [name]: {
        light:
          mode === "light"
            ? hex
            : (prev[name]?.light ??
              tokens.semantic.find((t) => t.name === name)?.light ??
              hex),
        dark:
          mode === "dark"
            ? hex
            : (prev[name]?.dark ??
              tokens.semantic.find((t) => t.name === name)?.dark ??
              hex),
      },
    }));
  };
  const revertToken = (name: string) => {
    setTokenOverrides((prev) => {
      const n = { ...prev };
      delete n[name];
      return n;
    });
  };
  const overrideCount = Object.keys(tokenOverrides).length;

  const content = useMemo((): string => {
    if (!slots.length) return "";
    switch (activeTab) {
      case "css":
        return buildThemeCss(mergedTokens);
      case "figma":
        return buildFigmaTokens(mergedTokens, utilityColors);
      case "tailwind":
        return buildTailwindConfig(mergedTokens, utilityColors);
      case "tailwind4":
        return buildTailwindV4(mergedTokens, utilityColors);
      case "styledictionary":
        return buildStyleDictionary(mergedTokens, utilityColors);
      default:
        return "";
    }
  }, [mergedTokens, utilityColors, activeTab, slots.length]);

  const copy = () => {
    navigator.clipboard.writeText(content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  if (!slots.length) {
    return (
      <div className="ch-view-scroll ch-view-pad">
        <div className="ch-view-hd">
          <h2>Theme Generator</h2>
        </div>
        <p style={{ color: "var(--ch-t3)", fontSize: 12 }}>
          Generate a palette first to see your theme.
        </p>
      </div>
    );
  }

  return (
    <div className="ch-view-scroll ch-view-pad">
      <div style={{ maxWidth: 1060, margin: "0 auto" }}>
        <div className="ch-view-hd">
          <h2>Theme Generator</h2>
          <p>
            A complete color system derived from your palette. Palette hues
            drive surface tints, brand tokens, and utility colors — the preview
            uses your actual palette colors throughout. Built on the{" "}
            <strong>60-30-10 rule</strong> and M3 tonal surface elevation.
          </p>
        </div>

        {/* ─── Palette source + preview ────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <div className="ch-slabel" style={{ margin: 0 }}>
              Website Preview
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {(["light", "dark"] as const).map((m) => (
                <Button
                  key={m}
                  variant={previewMode === m ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setPreviewMode(m)}
                >
                  {m === "light" ? "☀ Light" : "☾ Dark"}
                </Button>
              ))}
            </div>
          </div>

          {/* Source palette strip — shows how palette → theme roles */}
          <PaletteSourceStrip
            slots={slots}
            tokens={tokens}
            mode={previewMode}
          />

          <WebsiteMockup tokens={tokens} slots={slots} mode={previewMode} />

          {/* Component Showcase */}
          <div style={{ marginTop: 16 }}>
            <button
              onClick={() => setExpandComponents((v) => !v)}
              className="ch-btn ch-btn-ghost ch-btn-sm"
              style={{
                width: "100%",
                justifyContent: "space-between",
                display: "flex",
              }}
            >
              <span>
                Component Showcase — Buttons · Badges · Inputs · Alerts · Cards
              </span>
              <span>{expandComponents ? "▾" : "▸"}</span>
            </button>
            {expandComponents && (
              <div style={{ marginTop: 8 }}>
                <ComponentShowcase tokens={tokens} mode={previewMode} />
              </div>
            )}
          </div>
        </div>

        {/* ─── Utility Colors ───────────────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <div className="ch-slabel" style={{ marginBottom: 10 }}>
            Utility Colors — derived from palette hues ({previewMode} mode)
          </div>
          <UtilityStrip tokens={tokens} mode={previewMode} />
        </div>

        {/* ─── Contrast Matrix ──────────────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: expandContrast ? 10 : 0,
            }}
          >
            <div className="ch-slabel" style={{ margin: 0 }}>
              Accessibility / Contrast Pairs
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandContrast((v) => !v)}
            >
              {expandContrast ? "Collapse ↑" : "Expand ↓"}
            </Button>
          </div>
          {expandContrast && <ContrastMatrix tokens={tokens} />}
          {!expandContrast && (
            <p style={{ fontSize: 10.5, color: "var(--ch-t3)", marginTop: 4 }}>
              WCAG AA/AAA contrast ratios for all key semantic token pairs —
              click to expand.
            </p>
          )}
        </div>

        {/* ─── Token Table ──────────────────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: expandTokens ? 10 : 0,
            }}
          >
            <div className="ch-slabel" style={{ margin: 0 }}>
              All Semantic Tokens ({tokens.semantic.length} tokens, light +
              dark)
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandTokens((v) => !v)}
            >
              {expandTokens ? "Collapse ↑" : "Expand ↓"}
            </Button>
          </div>
          {expandTokens && (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "160px 90px 90px 1fr",
                  gap: 8,
                  padding: "4px 0",
                  marginBottom: 4,
                }}
              >
                {["Token", "Light", "Dark", "Usage"].map((h) => (
                  <span
                    key={h}
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: "var(--ch-t3)",
                      textTransform: "uppercase",
                    }}
                  >
                    {h}
                  </span>
                ))}
              </div>
              {overrideCount > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontSize: 10, color: "var(--ch-a)" }}>
                    ✎ {overrideCount} token{overrideCount > 1 ? "s" : ""}{" "}
                    overridden
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTokenOverrides({})}
                  >
                    ↩ Revert all
                  </Button>
                </div>
              )}
              <EditableTokenTable
                tokens={mergedTokens}
                overrides={tokenOverrides}
                onOverride={overrideToken}
                onRevert={revertToken}
              />
            </>
          )}
          {!expandTokens && (
            <p style={{ fontSize: 10.5, color: "var(--ch-t3)", marginTop: 4 }}>
              View all {tokens.semantic.length} tokens with light/dark values
              and usage guidance — click to expand.
            </p>
          )}
        </div>

        {/* ─── Code Export ─────────────────────────────────────────────── */}
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
              Export
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <div style={{ display: "flex", gap: 4, marginRight: 8 }}>
                {(Object.keys(TAB_LABELS) as ThemeTab[]).map((tab) => (
                  <Button
                    key={tab}
                    variant={activeTab === tab ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab(tab)}
                  >
                    {TAB_LABELS[tab]}
                  </Button>
                ))}
              </div>
              <Button variant="ghost" size="sm" onClick={copy}>
                {copied ? "✓ Copied" : "Copy"}
              </Button>
            </div>
          </div>

          {activeTab === "css" && (
            <p
              style={{
                fontSize: 11,
                color: "var(--ch-t3)",
                marginBottom: 8,
                lineHeight: 1.6,
              }}
            >
              Paste into your global stylesheet. Auto-switches via{" "}
              <code
                style={{
                  background: "var(--ch-s2)",
                  padding: "1px 4px",
                  borderRadius: 2,
                }}
              >
                prefers-color-scheme
              </code>
              , or force dark by adding{" "}
              <code
                style={{
                  background: "var(--ch-s2)",
                  padding: "1px 4px",
                  borderRadius: 2,
                }}
              >
                .dark
              </code>{" "}
              to{" "}
              <code
                style={{
                  background: "var(--ch-s2)",
                  padding: "1px 4px",
                  borderRadius: 2,
                }}
              >
                &lt;html&gt;
              </code>
              .
            </p>
          )}
          {activeTab === "figma" && (
            <p
              style={{
                fontSize: 11,
                color: "var(--ch-t3)",
                marginBottom: 8,
                lineHeight: 1.6,
              }}
            >
              Style Dictionary / Figma Tokens compatible JSON. Import via the
              Tokens Studio plugin.
            </p>
          )}
          {activeTab === "tailwind" && (
            <p
              style={{
                fontSize: 11,
                color: "var(--ch-t3)",
                marginBottom: 8,
                lineHeight: 1.6,
              }}
            >
              Merge into your{" "}
              <code
                style={{
                  background: "var(--ch-s2)",
                  padding: "1px 4px",
                  borderRadius: 2,
                }}
              >
                tailwind.config.js
              </code>
              . Semantic colors reference CSS variables so they switch
              automatically with the theme.
            </p>
          )}

          <pre className="ch-token-pre" style={{ maxHeight: 440 }}>
            {content}
          </pre>
        </div>
      </div>
    </div>
  );
}
