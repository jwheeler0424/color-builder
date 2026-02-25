import React, { useMemo, useState } from "react";
import { useChromaStore } from "@/hooks/use-chroma-store";
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
  hexToStop,
} from "@/lib/utils";
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
    <div className="mb-3">
      <div className="text-muted-foreground uppercase tracking-[.07em] mb-1.5 font-bold text-[9.5px]">
        Source palette → theme roles
      </div>
      <div className="items-end flex-wrap flex gap-1.5">
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

          const roleLabel = isPrimary ? "default" : (utilRoles[0] ?? null);

          return (
            <div key={i} className="flex-col items-center flex gap-1">
              <div
                style={{
                  width: 36,
                  height: 36,
                  background: hex,
                  borderRadius: isPrimary ? 8 : 6,
                  border: isPrimary
                    ? `2px solid var(--color-foreground)`
                    : "1px solid rgba(128,128,128,.2)",
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                  paddingBottom: 3,
                  boxShadow: isPrimary
                    ? "0 0 0 3px var(--color-primary)"
                    : "none",
                }}
              >
                {roleLabel && (
                  <span
                    className="font-extrabold rounded uppercase"
                    style={{
                      fontSize: 7,
                      color: tc,
                      background: "rgba(0,0,0,0.18)",
                      padding: "1px 3px",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {roleLabel}
                  </span>
                )}
              </div>
              <span
                className="text-[8px] text-muted-foreground font-mono overflow-hidden text-ellipsis whitespace-nowrap"
                style={{ maxWidth: 36 }}
              >
                {hex}
              </span>
            </div>
          );
        })}

        {/* Arrow and role legend */}
        <div className="ml-1 flex flex-col gap-1" style={{ paddingBottom: 14 }}>
          <span className="text-muted-foreground text-[9px]">→ hues drive</span>
          <span className="text-muted-foreground text-[9px]">
            surface tints,
          </span>
          <span className="text-muted-foreground text-[9px]">
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
        <div className="items-center flex gap-1.5">
          <div
            className="rounded shrink-0 w-[18px]"
            style={{ height: 18, background: accent1 }}
          />
          <span
            className="font-extrabold text-sm tracking-[-0.02em]"
            style={{ color: fg }}
          >
            Brand
          </span>
        </div>
        <div className="flex gap-3.5 flex-1 ml-2">
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
          className="inline-block text-[9px] font-bold mb-2"
          style={{
            background: primary,
            color: primaryFg,
            borderRadius: 20,
            padding: "2px 8px",
            letterSpacing: "0.05em",
          }}
        >
          NEW RELEASE
        </div>
        <div
          className="font-extrabold mb-1.5"
          style={{
            color: primaryContainerFg,
            fontSize: 17,
            letterSpacing: "-0.03em",
          }}
        >
          Your workspace, upgraded
        </div>
        <div
          className="text-[10px] mb-3.5"
          style={{ color: primaryContainerFg, opacity: 0.75 }}
        >
          Ship faster with a connected design system built on perceptual color
          science.
        </div>
        {/* Palette swatch dots in hero to show palette presence */}
        <div className="flex items-center gap-1.5 mb-3.5">
          {accentColors.map((hex, i) => (
            <div
              key={i}
              className="rounded h-2"
              style={{ width: 8, background: hex, opacity: 0.9 }}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button style={btnPrimary}>Get started →</button>
          <div style={btnSecondary}>Learn more</div>
        </div>
      </div>

      {/* MAIN — 60% bg with 30% card grid */}
      <div
        className="grid gap-3"
        style={{ padding: "14px 16px", gridTemplateColumns: "1fr 180px" }}
      >
        {/* Content column */}
        <div>
          <div
            className="text-[9px] font-bold uppercase mb-2"
            style={{ color: fgMuted, letterSpacing: "0.08em" }}
          >
            Recent projects
          </div>

          {/* Card grid — palette accent colors used for card accents */}
          <div className="grid gap-2 mb-3 grid-cols-2">
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
                  <div className="h-[3px]" style={{ background: accentHex }} />
                  <div style={{ padding: 10 }}>
                    <div className="font-bold text-[11px] mb-[3px]">
                      {title}
                    </div>
                    <div className="text-[9px] mb-2" style={{ color: fgMuted }}>
                      {meta}
                    </div>
                    <div
                      className="rounded mb-1.5 overflow-hidden"
                      style={{ background: muted, height: 5 }}
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
                    <div className="justify-between items-center flex">
                      <span
                        className="rounded text-[9px] font-semibold px-1.5 py-0.5"
                        style={{ background: badgeBg, color: badgeFg }}
                      >
                        {badge}
                      </span>
                      <span className="text-[9px]" style={{ color: fgMuted }}>
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
                className="shrink-0 w-[14px] h-[14px]"
                style={{ borderRadius: 7, background: color, marginTop: 1 }}
              />
              <div className="text-[9.5px]">
                <span className="font-bold">{bold}</span> {text}
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
            <div className="mb-2 font-bold text-[10.5px]">Quick Actions</div>
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
            <button className="w-full mb-1" style={{ ...btnPrimary }}>
              New Project
            </button>
            <div className="text-center" style={{ ...btnSecondary }}>
              Import
            </div>
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
            <div className="mb-2 font-bold text-[10.5px]">Usage</div>
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
                  className="flex justify-between items-center"
                  style={{ padding: "3px 0" }}
                >
                  <span className="text-[9.5px]" style={{ color: fgMuted }}>
                    {label}
                  </span>
                  <span className="text-[10px] font-bold" style={{ color: fg }}>
                    {value}
                  </span>
                </div>
                <div
                  className="rounded overflow-hidden"
                  style={{ background: muted, height: 5, margin: "2px 0 5px" }}
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
              className="text-[9.5px] font-bold mb-[3px]"
              style={{ color: errorColor || destructive }}
            >
              ⚠ API limit reached
            </div>
            <div className="mb-1.5 text-[9px]">
              Upgrade to continue using the API.
            </div>
            <button
              className="w-full text-[9px]"
              style={{
                ...btnPrimary,
                background: destructive,
                color: destructiveFg,
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
        <span className="text-[9px]" style={{ color: fgMuted }}>
          © 2025 Brand Inc.
        </span>
        {/* Footer uses palette colors as color dots */}
        <div className="items-center flex gap-1.5">
          {accentColors.map((hex, i) => (
            <div
              key={i}
              className="rounded h-1.5"
              style={{ width: 6, background: hex }}
            />
          ))}
          {["Privacy", "Terms", "Help"].map((l) => (
            <span
              key={l}
              className="text-[9px] font-semibold ml-1"
              style={{ color: primary }}
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
    <div className="flex-wrap flex gap-1.5">
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
              className="flex items-center text-[10px] font-bold gap-1.5"
              style={{
                background: color,
                color: tc,
                borderRadius: "5px 5px 0 0",
                padding: "6px 8px",
              }}
            >
              <span className="text-[12px]">{ICONS[role]}</span>
              <span className="capitalize">{role}</span>
            </div>
            <div
              className="text-[9px] font-semibold font-mono"
              style={{
                background: subtle,
                borderRadius: "0 0 5px 5px",
                padding: "4px 8px",
                color: color,
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
    <div className="grid gap-4 grid-cols-2">
      {(["light", "dark"] as const).map((m) => (
        <div key={m}>
          <div className="text-[9.5px] font-bold text-muted-foreground uppercase mb-1.5 tracking-[.08em]">
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
                className="flex items-center gap-1.5 py-1 px-0 border-b border-muted"
              >
                <div
                  className="rounded flex items-center justify-center shrink-0"
                  style={{
                    width: 28,
                    height: 18,
                    background: bgHex,
                    border: "1px solid rgba(128,128,128,.2)",
                  }}
                >
                  <div
                    className="h-[3px]"
                    style={{ width: 12, borderRadius: 1, background: fgHex }}
                  />
                </div>
                <span className="text-secondary-foreground text-[9px] flex-1">
                  {label}
                </span>
                <span className="font-mono text-muted-foreground mr-0.5 text-[9px]">
                  {ratio.toFixed(1)}:1
                </span>
                <span
                  className="text-[8px] font-bold text-white rounded px-1 py-px"
                  style={{ background: badgeColor }}
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
          <div key={label} className="mb-3.5">
            <div className="text-[9.5px] font-bold text-muted-foreground uppercase mb-1.5 pb-1 border-b border-muted tracking-[.08em]">
              {label}
            </div>
            {groupTokens.map((t) => (
              <div
                key={t.name}
                className="grid gap-2 items-center border-b border-muted [grid-template-columns:160px_90px_90px_1fr] py-1 px-0"
              >
                <code className="font-mono text-secondary-foreground text-[9.5px]">
                  {t.name}
                </code>
                {(["light", "dark"] as const).map((m) => (
                  <div key={m} className="items-center flex gap-1.5">
                    <div
                      className="rounded shrink-0 w-4 h-4"
                      style={{
                        background: t[m],
                        border: "1px solid rgba(128,128,128,.2)",
                      }}
                    />
                    <span className="font-mono text-muted-foreground overflow-ellipsis whitespace-nowrap overflow-hidden text-[9px]">
                      {t[m]}
                    </span>
                  </div>
                ))}
                <span className="text-muted-foreground leading-[1.4] text-[9px]">
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
        className="grid gap-1.5 mb-1 py-1 px-0"
        style={{ gridTemplateColumns: "160px 110px 110px 1fr 28px" }}
      >
        {["Token", "Light", "Dark", "Usage", ""].map((h) => (
          <span
            key={h}
            className="text-muted-foreground uppercase font-bold text-[9px]"
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
          <div key={label} className="mb-3.5">
            <div className="text-[9.5px] font-bold text-muted-foreground uppercase mb-1.5 pb-1 border-b border-muted tracking-[.08em]">
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
                    borderBottom: "1px solid var(--color-secondary)",
                    background: isOverridden
                      ? "rgba(99,102,241,.04)"
                      : undefined,
                  }}
                >
                  <div className="items-center flex gap-1">
                    {isOverridden && (
                      <span className="text-primary text-[8px]">✎</span>
                    )}
                    <code className="font-mono text-secondary-foreground overflow-ellipsis whitespace-nowrap overflow-hidden text-[9px]">
                      {t.name}
                    </code>
                  </div>
                  <HexInput
                    value={t.light}
                    onChange={(hex) => onOverride(t.name, "light", hex)}
                    showSwatch
                    className="min-w-0"
                  />
                  <HexInput
                    value={t.dark}
                    onChange={(hex) => onOverride(t.name, "dark", hex)}
                    showSwatch
                    className="min-w-0"
                  />
                  <span className="text-muted-foreground overflow-ellipsis whitespace-nowrap overflow-hidden leading-[1.4] text-[9px]">
                    {t.description}
                  </span>
                  {isOverridden ? (
                    <button
                      onClick={() => onRevert(t.name)}
                      title="Revert to generated"
                      className="bg-transparent border-none cursor-pointer text-[11px] text-muted-foreground p-0"
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
      className="text-[9px] font-bold"
      style={{
        background: b,
        color: c,
        borderRadius: 20,
        padding: "2px 8px",
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
      <span className="leading-[1.4] text-[12px]">{icon}</span>
      <div className="text-[9.5px]">
        <span className="font-bold" style={{ color }}>
          {title}
        </span>
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
          className="text-[10px] font-bold uppercase tracking-[.07em] mb-2"
          style={{ color: fgM }}
        >
          Buttons
        </div>
        <div className="flex-wrap flex gap-1.5">
          <Btn bg={pri} color={priFg} label="default" />
          <Btn bg={sec} color={secFg} label="Secondary" />
          <Btn bg="transparent" color={fg} label="Ghost" />
          <Btn bg={des} color={desFg} label="Destructive" />
          <Btn bg={accent} color={fg} label="Accent" />
        </div>
      </div>

      {/* Badges */}
      <div>
        <div
          className="text-[10px] font-bold uppercase tracking-[.07em] mb-2"
          style={{ color: fgM }}
        >
          Badges
        </div>
        <div className="flex-wrap flex gap-1.5">
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
          className="text-[10px] font-bold uppercase tracking-[.07em] mb-2"
          style={{ color: fgM }}
        >
          Input
        </div>
        <div className="flex-col flex gap-1">
          <div>
            <div
              className="text-[9.5px] font-semibold mb-[3px]"
              style={{ color: fg }}
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
            <div className="text-[9px]" style={{ color: infoL }}>
              We'll never share your email.
            </div>
          </div>
          <div>
            <div
              className="text-[9.5px] font-semibold mb-[3px]"
              style={{ color: fg }}
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
            <div className="text-[9px]" style={{ color: errL }}>
              Password must be 8+ characters.
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div>
        <div
          className="text-[10px] font-bold uppercase tracking-[.07em] mb-2"
          style={{ color: fgM }}
        >
          Alerts
        </div>
        <div className="flex-col flex gap-1.5">
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
          className="text-[10px] font-bold uppercase tracking-[.07em] mb-2"
          style={{ color: fgM }}
        >
          Cards
        </div>
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
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
              <div className="text-[9px] mb-1" style={{ color: fgM }}>
                {title}
              </div>
              <div
                className="text-lg font-extrabold"
                style={{
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
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-5">
          <h2>Theme Generator</h2>
        </div>
        <p className="text-muted-foreground text-[12px]">
          Generate a palette first to see your theme.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mx-auto" style={{ maxWidth: 1060 }}>
        <div className="mb-5">
          <h2>Theme Generator</h2>
          <p>
            A complete color system derived from your palette. Palette hues
            drive surface tints, brand tokens, and utility colors — the preview
            uses your actual palette colors throughout. Built on the{" "}
            <strong>60-30-10 rule</strong> and M3 tonal surface elevation.
          </p>
        </div>

        {/* ─── Palette source + preview ────────────────────────────────── */}
        <div className="mb-7">
          <div className="justify-between items-center mb-2.5 flex">
            <div className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2.5 font-display font-semibold m-0">
              Website Preview
            </div>
            <div className="flex gap-1">
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
          <div className="mt-4">
            <button
              onClick={() => setExpandComponents((v) => !v)}
              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] border rounded font-mono font-bold tracking-[.04em] whitespace-nowrap cursor-pointer transition-colors bg-transparent text-secondary-foreground border-border hover:text-foreground hover:border-input justify-between flex w-full"
            >
              <span>
                Component Showcase — Buttons · Badges · Inputs · Alerts · Cards
              </span>
              <span>{expandComponents ? "▾" : "▸"}</span>
            </button>
            {expandComponents && (
              <div className="mt-2">
                <ComponentShowcase tokens={tokens} mode={previewMode} />
              </div>
            )}
          </div>
        </div>

        {/* ─── Utility Colors ───────────────────────────────────────────── */}
        <div className="mb-7">
          <div className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2.5 font-display font-semibold mb-2.5">
            Utility Colors — derived from palette hues ({previewMode} mode)
          </div>
          <UtilityStrip tokens={tokens} mode={previewMode} />
        </div>

        {/* ─── Contrast Matrix ──────────────────────────────────────────── */}
        <div className="mb-7">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: expandContrast ? 10 : 0,
            }}
          >
            <div className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2.5 font-display font-semibold m-0">
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
            <p className="text-muted-foreground text-[10.5px] mt-1">
              WCAG AA/AAA contrast ratios for all key semantic token pairs —
              click to expand.
            </p>
          )}
        </div>

        {/* ─── Token Table ──────────────────────────────────────────────── */}
        <div className="mb-7">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: expandTokens ? 10 : 0,
            }}
          >
            <div className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2.5 font-display font-semibold m-0">
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
              <div className="grid gap-2 mb-1 [grid-template-columns:160px_90px_90px_1fr] py-1 px-0">
                {["Token", "Light", "Dark", "Usage"].map((h) => (
                  <span
                    key={h}
                    className="text-muted-foreground uppercase font-bold text-[9px]"
                  >
                    {h}
                  </span>
                ))}
              </div>
              {overrideCount > 0 && (
                <div className="justify-between items-center flex mb-2">
                  <span className="text-primary text-[10px]">
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
            <p className="text-muted-foreground text-[10.5px] mt-1">
              View all {tokens.semantic.length} tokens with light/dark values
              and usage guidance — click to expand.
            </p>
          )}
        </div>

        {/* ─── Code Export ─────────────────────────────────────────────── */}
        <div>
          <div className="justify-between items-center mb-2.5 flex">
            <div className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2.5 font-display font-semibold m-0">
              Export
            </div>
            <div className="flex gap-1">
              <div className="flex gap-1 mr-2">
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
            <p className="text-muted-foreground mb-2 leading-relaxed text-[11px]">
              Paste into your global stylesheet. Auto-switches via{" "}
              <code className="bg-muted rounded px-1 py-px">
                prefers-color-scheme
              </code>
              , or force dark by adding{" "}
              <code className="bg-muted rounded px-1 py-px">.dark</code> to{" "}
              <code className="bg-muted rounded px-1 py-px">&lt;html&gt;</code>.
            </p>
          )}
          {activeTab === "figma" && (
            <p className="text-muted-foreground mb-2 leading-relaxed text-[11px]">
              Style Dictionary / Figma Tokens compatible JSON. Import via the
              Tokens Studio plugin.
            </p>
          )}
          {activeTab === "tailwind" && (
            <p className="text-muted-foreground mb-2 leading-relaxed text-[11px]">
              Merge into your{" "}
              <code className="bg-muted rounded px-1 py-px">
                tailwind.config.js
              </code>
              . Semantic colors reference CSS variables so they switch
              automatically with the theme.
            </p>
          )}

          <pre
            className="bg-secondary border border-border rounded p-2.5 text-[10px] leading-[1.7] text-muted-foreground whitespace-pre overflow-x-auto max-h-[300px] overflow-y-auto"
            style={{ maxHeight: 440 }}
          >
            {content}
          </pre>
        </div>
      </div>
    </div>
  );
}
