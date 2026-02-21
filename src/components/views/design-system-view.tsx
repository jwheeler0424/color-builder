import React, { useMemo, useState, useCallback } from "react";
import { useChromaStore } from "@/hooks/useChromaStore";
import {
  deriveThemeTokens,
  buildThemeCss,
  buildFigmaTokens,
  buildTailwindConfig,
  buildStyleDictionary,
  buildTailwindV4,
  semanticSlotNames,
  contrastRatio,
  wcagLevel,
  apcaContrast,
  textColor,
  hexToRgb,
  rgbToOklch,
} from "@/lib/utils/colorMath";
import type {
  PaletteSlot,
  SemanticToken,
  UtilityColorSet,
  UtilityRole,
} from "@/types";
import { Button } from "@/components/ui/button";
import HexInput from "@/components/hex-input";

type Mode = "light" | "dark";
type ExportFormat =
  | "css"
  | "tailwind3"
  | "tailwind4"
  | "figma"
  | "styledictionary";

// ─── Token override store (local to this view, persisted via parent store later) ──

type Overrides = Record<string, { light: string; dark: string }>;

function mergeTokens(
  tokens: SemanticToken[],
  overrides: Overrides,
): SemanticToken[] {
  return tokens.map((t) => {
    const o = overrides[t.name];
    if (!o) return t;
    return { ...t, light: o.light ?? t.light, dark: o.dark ?? t.dark };
  });
}

// ─── Token group definitions ──────────────────────────────────────────────────

const TOKEN_GROUPS: {
  label: string;
  desc: string;
  ids: string[];
  fourValue?: boolean;
}[] = [
  {
    label: "Page Surfaces",
    desc: "Background layers following the 60-30-10 rule. Each tier needs a matching text color.",
    fourValue: true,
    ids: [
      "--background",
      "--foreground",
      "--surface-dim",
      "--surface-dim-foreground",
      "--card",
      "--card-foreground",
      "--card-raised",
      "--card-raised-foreground",
      "--popover",
      "--popover-foreground",
    ],
  },
  {
    label: "Brand / Primary",
    desc: "The main brand color — CTA buttons, active states, links.",
    fourValue: true,
    ids: [
      "--primary",
      "--primary-foreground",
      "--primary-container",
      "--primary-container-foreground",
    ],
  },
  {
    label: "Secondary & Muted",
    desc: "Supporting actions, secondary buttons, dimmed text, ghost surfaces.",
    ids: [
      "--secondary",
      "--secondary-foreground",
      "--accent",
      "--accent-foreground",
      "--muted",
      "--muted-foreground",
    ],
  },
  {
    label: "Borders, Inputs & Focus",
    desc: "Structural colors — separators, form controls, keyboard focus ring.",
    ids: ["--border", "--border-strong", "--input", "--ring"],
  },
  {
    label: "Destructive / Error",
    desc: "Error states, destructive actions, deletion confirmations.",
    ids: ["--destructive", "--destructive-foreground", "--destructive-subtle"],
  },
];

// ─── Component preview ────────────────────────────────────────────────────────

function ComponentPreview({
  tokens,
  slots,
  mode,
}: {
  tokens: SemanticToken[];
  slots: PaletteSlot[];
  mode: Mode;
}) {
  const get = (name: string) =>
    tokens.find((t) => t.name === name)?.[mode] ?? "#888";

  const bg = get("--background");
  const fg = get("--foreground");
  const fgM = get("--muted-foreground");
  const card = get("--card");
  const cardR = get("--card-raised");
  const pri = get("--primary");
  const priFg = get("--primary-foreground");
  const priC = get("--primary-container");
  const priCFg = get("--primary-container-foreground");
  const sec = get("--secondary");
  const secFg = get("--secondary-foreground");
  const muted = get("--muted");
  const des = get("--destructive");
  const desFg = get("--destructive-foreground");
  const border = get("--border");
  const ring = get("--ring");
  const input = get("--input");
  const surfD = get("--surface-dim");

  const sorted = [...slots].sort(
    (a, b) =>
      rgbToOklch(hexToRgb(b.color.hex)).C - rgbToOklch(hexToRgb(a.color.hex)).C,
  );
  const a1 = sorted[0]?.color.hex ?? pri;
  const a2 = sorted[1]?.color.hex ?? sec;
  const a3 = sorted[2]?.color.hex ?? muted;
  const a4 = sorted[3]?.color.hex ?? pri;

  const BtnPri: React.CSSProperties = {
    background: pri,
    color: priFg,
    border: "none",
    borderRadius: 5,
    padding: "5px 12px",
    fontSize: 10,
    fontWeight: 700,
    cursor: "pointer",
  };
  const BtnSec: React.CSSProperties = {
    background: sec,
    color: secFg,
    border: `1px solid ${border}`,
    borderRadius: 5,
    padding: "5px 12px",
    fontSize: 10,
    fontWeight: 600,
  };
  const BtnGhost: React.CSSProperties = {
    background: "transparent",
    color: fg,
    border: `1px solid ${border}`,
    borderRadius: 5,
    padding: "5px 12px",
    fontSize: 10,
    fontWeight: 500,
  };
  const BtnDes: React.CSSProperties = {
    background: des,
    color: desFg,
    border: "none",
    borderRadius: 5,
    padding: "5px 12px",
    fontSize: 10,
    fontWeight: 700,
  };

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
      {/* Nav */}
      <div
        style={{
          background: card,
          borderBottom: `1px solid ${border}`,
          padding: "8px 14px",
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
        <span
          style={{ fontWeight: 800, fontSize: 12, letterSpacing: "-0.02em" }}
        >
          Brand
        </span>
        <div style={{ display: "flex", gap: 12, flex: 1, marginLeft: 6 }}>
          {["Dashboard", "Projects", "Settings"].map((l, i) => (
            <span
              key={l}
              style={{
                color: i === 0 ? pri : fgM,
                fontSize: 10,
                fontWeight: i === 0 ? 700 : 400,
              }}
            >
              {l}
            </span>
          ))}
        </div>
        <button style={BtnPri}>Upgrade</button>
      </div>

      {/* Hero — primary-container */}
      <div
        style={{
          background: priC,
          padding: "14px",
          borderBottom: `1px solid ${border}`,
        }}
      >
        <div
          style={{
            display: "inline-block",
            background: pri,
            color: priFg,
            borderRadius: 20,
            padding: "2px 8px",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.05em",
            marginBottom: 6,
          }}
        >
          NEW
        </div>
        <div
          style={{
            color: priCFg,
            fontSize: 15,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            marginBottom: 4,
          }}
        >
          Your design system, ready to ship
        </div>
        <div
          style={{
            color: priCFg,
            fontSize: 10,
            opacity: 0.75,
            marginBottom: 10,
          }}
        >
          Built on perceptual color science with full accessibility stats.
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={BtnPri}>Get started →</button>
          <div style={BtnSec}>Learn more</div>
        </div>
      </div>

      {/* Main grid */}
      <div
        style={{
          padding: "12px 14px",
          display: "grid",
          gridTemplateColumns: "1fr 160px",
          gap: 10,
        }}
      >
        <div>
          {/* Cards */}
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: fgM,
              textTransform: "uppercase",
              letterSpacing: ".08em",
              marginBottom: 6,
            }}
          >
            Projects
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 6,
              marginBottom: 10,
            }}
          >
            {[
              {
                title: "Design System",
                pct: 80,
                accent: a1,
                badge: "Active",
                badgeBg: "rgba(34,197,94,.15)",
                badgeFg: "#16a34a",
              },
              {
                title: "Mobile App",
                pct: 55,
                accent: a2,
                badge: "Review",
                badgeBg: "rgba(234,179,8,.15)",
                badgeFg: "#a16207",
              },
              {
                title: "Landing Page",
                pct: 30,
                accent: a3,
                badge: "Draft",
                badgeBg: muted,
                badgeFg: fgM,
              },
              {
                title: "API Docs",
                pct: 100,
                accent: a4,
                badge: "Complete",
                badgeBg: "rgba(34,197,94,.15)",
                badgeFg: "#16a34a",
              },
            ].map(({ title, pct, accent, badge, badgeBg, badgeFg }) => (
              <div
                key={title}
                style={{
                  background: card,
                  border: `1px solid ${border}`,
                  borderRadius: 6,
                  overflow: "hidden",
                }}
              >
                <div style={{ height: 3, background: accent }} />
                <div style={{ padding: 8 }}>
                  <div
                    style={{ fontWeight: 700, fontSize: 10, marginBottom: 4 }}
                  >
                    {title}
                  </div>
                  <div
                    style={{
                      background: muted,
                      borderRadius: 3,
                      height: 4,
                      marginBottom: 5,
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        background: accent,
                        borderRadius: 3,
                      }}
                    />
                  </div>
                  <span
                    style={{
                      background: badgeBg,
                      color: badgeFg,
                      borderRadius: 3,
                      padding: "1px 5px",
                      fontSize: 8.5,
                      fontWeight: 600,
                    }}
                  >
                    {badge}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Alerts */}
          <div
            style={{
              background: "rgba(59,130,246,.1)",
              border: "1px solid rgba(59,130,246,.4)",
              borderRadius: 5,
              padding: "7px 9px",
              display: "flex",
              gap: 6,
              marginBottom: 6,
            }}
          >
            <span style={{ fontSize: 11 }}>ℹ</span>
            <span style={{ fontSize: 9.5 }}>
              <strong>v3.2 available</strong> — Performance improvements and new
              exports.
            </span>
          </div>
          <div
            style={{
              background: "rgba(34,197,94,.1)",
              border: "1px solid rgba(34,197,94,.4)",
              borderRadius: 5,
              padding: "7px 9px",
              display: "flex",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 11 }}>✓</span>
            <span style={{ fontSize: 9.5 }}>
              <strong>Deployment successful</strong> — All checks passed.
            </span>
          </div>
        </div>

        {/* Sidebar */}
        <div>
          <div
            style={{
              background: cardR,
              border: `1px solid ${border}`,
              borderRadius: 6,
              padding: 9,
              marginBottom: 7,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 10, marginBottom: 7 }}>
              Quick Actions
            </div>
            {/* Input */}
            <div
              style={{
                background: input,
                border: `1px solid ${border}`,
                borderRadius: 4,
                padding: "4px 6px",
                fontSize: 9.5,
                color: fgM,
                marginBottom: 5,
                outline: `2px solid ${ring}`,
              }}
            >
              Search…
            </div>
            <button
              style={{
                ...BtnPri,
                width: "100%",
                marginBottom: 4,
                textAlign: "center",
              }}
            >
              New Project
            </button>
            <div style={{ ...BtnGhost, textAlign: "center" }}>Import</div>
          </div>

          {/* Button showcase */}
          <div
            style={{
              background: cardR,
              border: `1px solid ${border}`,
              borderRadius: 6,
              padding: 9,
              marginBottom: 7,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 10, marginBottom: 6 }}>
              Buttons
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <button style={{ ...BtnPri, textAlign: "center" }}>
                Primary
              </button>
              <div style={{ ...BtnSec, textAlign: "center" }}>Secondary</div>
              <div style={{ ...BtnGhost, textAlign: "center" }}>Ghost</div>
              <button style={{ ...BtnDes, textAlign: "center" }}>
                Destructive
              </button>
            </div>
          </div>

          {/* Error card */}
          <div
            style={{
              background: "rgba(239,68,68,.08)",
              border: `1px solid ${des}`,
              borderRadius: 6,
              padding: 8,
            }}
          >
            <div
              style={{
                fontSize: 9.5,
                fontWeight: 700,
                color: des,
                marginBottom: 3,
              }}
            >
              ⚠ API limit reached
            </div>
            <div style={{ fontSize: 9, marginBottom: 5 }}>
              Upgrade to continue.
            </div>
            <button
              style={{
                ...BtnDes,
                width: "100%",
                fontSize: 9,
                textAlign: "center",
              }}
            >
              Upgrade now
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          background: surfD,
          borderTop: `1px solid ${border}`,
          padding: "6px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: 9, color: fgM }}>© 2025 Brand Inc.</span>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {[a1, a2, a3, a4].map((h, i) => (
            <div
              key={i}
              style={{ width: 6, height: 6, borderRadius: 3, background: h }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Token editor row ─────────────────────────────────────────────────────────

function TokenRow({
  token,
  overrides,
  mode,
  onOverride,
  onRevert,
}: {
  token: SemanticToken;
  overrides: Overrides;
  mode: Mode;
  onOverride: (name: string, m: Mode, hex: string) => void;
  onRevert: (name: string) => void;
}) {
  const isOverridden = !!overrides[token.name];
  const val = overrides[token.name]?.[mode] ?? token[mode];
  const otherMode: Mode = mode === "light" ? "dark" : "light";
  const otherVal = overrides[token.name]?.[otherMode] ?? token[otherMode];

  const rgb = hexToRgb(val);
  const onW = contrastRatio(rgb, { r: 255, g: 255, b: 255 });
  const onB = contrastRatio(rgb, { r: 0, g: 0, b: 0 });
  const bestRatio = Math.max(onW, onB);
  const passes = bestRatio >= 4.5;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "180px 1fr 1fr 80px 28px",
        gap: 6,
        alignItems: "center",
        padding: "5px 0",
        borderBottom: "1px solid var(--ch-s2)",
        background: isOverridden ? "rgba(99,102,241,.04)" : undefined,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {isOverridden && (
          <span style={{ fontSize: 8, color: "var(--ch-a)", fontWeight: 700 }}>
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
          {token.name}
        </code>
      </div>

      {/* Active mode editable */}
      <HexInput
        value={val}
        onChange={(hex) => onOverride(token.name, mode, hex)}
        showSwatch
        style={{ minWidth: 0 }}
      />

      {/* Other mode editable */}
      <HexInput
        value={otherVal}
        onChange={(hex) => onOverride(token.name, otherMode, hex)}
        showSwatch
        style={{ minWidth: 0 }}
      />

      {/* Contrast badge */}
      <span
        style={{
          fontSize: 8.5,
          fontWeight: 700,
          padding: "2px 5px",
          borderRadius: 3,
          textAlign: "center",
          background: passes ? "rgba(34,197,94,.15)" : "rgba(239,68,68,.12)",
          color: passes ? "#16a34a" : "#dc2626",
        }}
        title={`Best contrast: ${bestRatio.toFixed(1)}:1`}
      >
        {passes ? `✓ ${bestRatio.toFixed(1)}` : `✗ ${bestRatio.toFixed(1)}`}
      </span>

      {/* Revert */}
      {isOverridden && (
        <button
          onClick={() => onRevert(token.name)}
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
      )}
    </div>
  );
}

// ─── Utility token row ────────────────────────────────────────────────────────

function UtilityTokenRow({
  role,
  utility,
  mode,
}: {
  role: UtilityRole;
  utility: ReturnType<typeof deriveThemeTokens>["utility"];
  mode: Mode;
}) {
  const u = utility[role];
  const color = mode === "light" ? u.light : u.dark;
  const subtle = mode === "light" ? u.subtle : u.subtleDark;
  const tc = textColor(hexToRgb(color));

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 0",
        borderBottom: "1px solid var(--ch-s2)",
      }}
    >
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: 4,
          background: color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontSize: 10,
          color: tc,
          fontWeight: 700,
        }}
      >
        {role[0].toUpperCase()}
      </div>
      <span
        style={{
          fontSize: 10,
          color: "var(--ch-t2)",
          flex: 1,
          textTransform: "capitalize",
          fontWeight: 600,
        }}
      >
        {role}
      </span>
      <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
        {[
          { label: mode, hex: color },
          { label: "subtle", hex: subtle },
          { label: "base", hex: u.base },
        ].map(({ label, hex }) => (
          <div
            key={label}
            title={`${label}: ${hex}`}
            style={{ display: "flex", alignItems: "center", gap: 3 }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: 2,
                background: hex,
                border: "1px solid rgba(128,128,128,.2)",
              }}
            />
            <span
              style={{
                fontSize: 8,
                color: "var(--ch-t3)",
                fontFamily: "var(--ch-fm)",
              }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Accessibility panel ──────────────────────────────────────────────────────

function AccessibilityPanel({
  tokens,
  mode,
}: {
  tokens: SemanticToken[];
  mode: Mode;
}) {
  const pairs = [
    { fg: "--foreground", bg: "--background", label: "Body text / page" },
    {
      fg: "--muted-foreground",
      bg: "--background",
      label: "Muted text / page",
    },
    { fg: "--foreground", bg: "--card", label: "Body text / card" },
    {
      fg: "--primary-foreground",
      bg: "--primary",
      label: "Primary button text",
    },
    {
      fg: "--primary-container-foreground",
      bg: "--primary-container",
      label: "Container text",
    },
    {
      fg: "--secondary-foreground",
      bg: "--secondary",
      label: "Secondary button text",
    },
    {
      fg: "--destructive-foreground",
      bg: "--destructive",
      label: "Destructive text",
    },
  ];

  const get = (name: string) =>
    tokens.find((t) => t.name === name)?.[mode] ?? "#888";

  const results = pairs.map(({ fg, bg, label }) => {
    const fgHex = get(fg),
      bgHex = get(bg);
    const fgRgb = hexToRgb(fgHex),
      bgRgb = hexToRgb(bgHex);
    const ratio = contrastRatio(fgRgb, bgRgb);
    const level = wcagLevel(ratio);
    const lc = Math.abs(apcaContrast(fgRgb, bgRgb));
    return { label, fgHex, bgHex, ratio, level, lc };
  });

  const passing = results.filter((r) => r.level !== "Fail").length;
  const score = Math.round((passing / results.length) * 100);

  return (
    <div>
      {/* Score badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            flexShrink: 0,
            background:
              score >= 80
                ? "rgba(34,197,94,.15)"
                : score >= 50
                  ? "rgba(234,179,8,.15)"
                  : "rgba(239,68,68,.12)",
            border: `2px solid ${score >= 80 ? "#16a34a" : score >= 50 ? "#a16207" : "#dc2626"}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontSize: 16,
              fontWeight: 800,
              color:
                score >= 80 ? "#16a34a" : score >= 50 ? "#a16207" : "#dc2626",
              lineHeight: 1,
            }}
          >
            {score}%
          </span>
          <span
            style={{ fontSize: 7.5, color: "var(--ch-t3)", lineHeight: 1.2 }}
          >
            pairs AA
          </span>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ch-t1)" }}>
            {passing}/{results.length} pairs pass WCAG AA
          </div>
          <div
            style={{ fontSize: 10.5, color: "var(--ch-t3)", lineHeight: 1.5 }}
          >
            4.5:1 for body text · 3:1 for large text / UI
          </div>
        </div>
      </div>

      {results.map(({ label, fgHex, bgHex, ratio, level, lc }) => {
        const COLORS: Record<string, string> = {
          AAA: "#16a34a",
          AA: "#2563eb",
          "AA Large": "#a16207",
          Fail: "#dc2626",
        };
        const BG: Record<string, string> = {
          AAA: "rgba(34,197,94,.14)",
          AA: "rgba(59,130,246,.12)",
          "AA Large": "rgba(234,179,8,.12)",
          Fail: "rgba(239,68,68,.1)",
        };
        return (
          <div
            key={label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "5px 0",
              borderBottom: "1px solid var(--ch-s2)",
            }}
          >
            {/* Preview swatch */}
            <div
              style={{
                width: 32,
                height: 20,
                borderRadius: 3,
                background: bgHex,
                border: "1px solid rgba(128,128,128,.2)",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: 16,
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
              }}
            >
              {ratio.toFixed(1)}:1
            </span>
            <span
              style={{ fontSize: 9, color: "var(--ch-t3)", marginRight: 2 }}
            >
              Lc{lc}
            </span>
            <span
              style={{
                fontSize: 8,
                fontWeight: 700,
                padding: "1px 5px",
                borderRadius: 3,
                background: BG[level],
                color: COLORS[level],
              }}
            >
              {level}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Export panel ─────────────────────────────────────────────────────────────

function ExportPanel({
  tokens,
  utilityColors,
}: {
  tokens: ReturnType<typeof deriveThemeTokens>;
  utilityColors: UtilityColorSet;
}) {
  const [fmt, setFmt] = useState<ExportFormat>("css");
  const [copied, setCopied] = useState(false);

  const content = useMemo(() => {
    switch (fmt) {
      case "css":
        return buildThemeCss(tokens);
      case "tailwind3":
        return buildTailwindConfig(tokens, utilityColors);
      case "tailwind4":
        return buildTailwindV4(tokens, utilityColors);
      case "figma":
        return buildFigmaTokens(tokens, utilityColors);
      case "styledictionary":
        return buildStyleDictionary(tokens, utilityColors);
    }
  }, [fmt, tokens, utilityColors]);

  const TABS: { id: ExportFormat; label: string }[] = [
    { id: "css", label: "CSS Vars" },
    { id: "tailwind3", label: "Tailwind v3" },
    { id: "tailwind4", label: "Tailwind v4" },
    { id: "figma", label: "Figma" },
    { id: "styledictionary", label: "Style Dict" },
  ];

  const DESCRIPTIONS: Record<ExportFormat, string> = {
    css: "Paste into your global stylesheet. Includes :root {} and .dark {} blocks.",
    tailwind3:
      "Merge into tailwind.config.js. Colors reference CSS vars for automatic dark mode.",
    tailwind4: "Tailwind v4 CSS-first @theme {} block. Requires Tailwind v4+.",
    figma: "Import via Tokens Studio plugin. Style Dictionary compatible.",
    styledictionary:
      "Amazon Style Dictionary format. Use with sd transform or any SD-compatible pipeline.",
  };

  const copy = () => {
    navigator.clipboard.writeText(content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
          flexWrap: "wrap",
          gap: 6,
        }}
      >
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          {TABS.map((t) => (
            <Button
              key={t.id}
              variant={fmt === t.id ? "default" : "ghost"}
              size="sm"
              onClick={() => setFmt(t.id)}
            >
              {t.label}
            </Button>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={copy}>
          {copied ? "✓ Copied" : "Copy"}
        </Button>
      </div>
      <p
        style={{
          fontSize: 10.5,
          color: "var(--ch-t3)",
          marginBottom: 8,
          lineHeight: 1.6,
        }}
      >
        {DESCRIPTIONS[fmt]}
      </p>
      <pre className="ch-token-pre" style={{ maxHeight: 360, fontSize: 9.5 }}>
        {content}
      </pre>
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export default function DesignSystemView() {
  const { slots, utilityColors } = useChromaStore();
  const [mode, setMode] = useState<Mode>("light");
  const [overrides, setOverrides] = useState<Overrides>({});
  const [expandedGroup, setExpandedGroup] = useState<string | null>(
    "Page Surfaces",
  );
  const [activePanel, setActivePanel] = useState<
    "tokens" | "utility" | "preview" | "accessibility" | "export"
  >("preview");

  const baseTokens = useMemo(
    () => deriveThemeTokens(slots, utilityColors),
    [slots, utilityColors],
  );

  const slotNames = useMemo(() => semanticSlotNames(slots), [slots]);

  // Tokens with overrides applied
  const tokens = useMemo(
    () => ({
      ...baseTokens,
      semantic: mergeTokens(baseTokens.semantic, overrides),
    }),
    [baseTokens, overrides],
  );

  const handleOverride = useCallback(
    (name: string, m: Mode, hex: string) => {
      setOverrides((prev) => ({
        ...prev,
        [name]: {
          light:
            m === "light"
              ? hex
              : (prev[name]?.light ??
                baseTokens.semantic.find((t) => t.name === name)?.light ??
                hex),
          dark:
            m === "dark"
              ? hex
              : (prev[name]?.dark ??
                baseTokens.semantic.find((t) => t.name === name)?.dark ??
                hex),
        },
      }));
    },
    [baseTokens.semantic],
  );

  const handleRevert = useCallback((name: string) => {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const revertAll = () => setOverrides({});
  const overrideCount = Object.keys(overrides).length;

  if (!slots.length) {
    return (
      <div className="ch-view-scroll ch-view-pad">
        <div className="ch-view-hd">
          <h2>Design System Studio</h2>
        </div>
        <p style={{ color: "var(--ch-t3)", fontSize: 12 }}>
          Generate a palette first to build your design system.
        </p>
      </div>
    );
  }

  const PANELS: { id: typeof activePanel; label: string }[] = [
    { id: "preview", label: "⬛ Preview" },
    { id: "tokens", label: "⚙ Tokens" },
    { id: "utility", label: "🎨 Utility" },
    { id: "accessibility", label: "♿ Accessibility" },
    { id: "export", label: "↗ Export" },
  ];

  return (
    <div className="ch-view-scroll ch-view-pad">
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        {/* Header */}
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
              <h2>Design System Studio</h2>
              <p>
                Edit tokens, preview components in real time, check
                accessibility, and export in any format. Palette slot{" "}
                <strong>{slotNames[0] ?? "primary"}</strong> drives the primary
                brand color.
              </p>
            </div>
            <div
              style={{
                display: "flex",
                gap: 4,
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              {(["light", "dark"] as const).map((m) => (
                <Button
                  key={m}
                  variant={mode === m ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setMode(m)}
                >
                  {m === "light" ? "☀ Light" : "☾ Dark"}
                </Button>
              ))}
              {overrideCount > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={revertAll}
                  title="Revert all token overrides"
                >
                  ↩ Revert all ({overrideCount})
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Palette source strip */}
        <div
          style={{
            marginBottom: 16,
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: 9.5,
              color: "var(--ch-t3)",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: ".07em",
            }}
          >
            Palette →
          </span>
          {slots.map((slot, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: i === 0 ? 8 : 5,
                  background: slot.color.hex,
                  border:
                    i === 0
                      ? "2px solid var(--ch-t1)"
                      : "1px solid rgba(128,128,128,.2)",
                  boxShadow: i === 0 ? "0 0 0 3px var(--ch-a)" : "none",
                }}
              />
              <span
                style={{
                  fontSize: 7.5,
                  color: "var(--ch-t3)",
                  fontFamily: "var(--ch-fm)",
                }}
              >
                {slotNames[i]}
              </span>
            </div>
          ))}
        </div>

        {/* Panel nav */}
        <div
          style={{
            display: "flex",
            gap: 3,
            marginBottom: 18,
            flexWrap: "wrap",
            borderBottom: "1px solid var(--ch-s2)",
            paddingBottom: 10,
          }}
        >
          {PANELS.map((p) => (
            <Button
              key={p.id}
              variant={activePanel === p.id ? "default" : "ghost"}
              size="sm"
              onClick={() => setActivePanel(p.id)}
            >
              {p.label}
            </Button>
          ))}
        </div>

        {/* ── Preview panel ── */}
        {activePanel === "preview" && (
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              {(["light", "dark"] as const).map((m) => (
                <div key={m}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "var(--ch-t3)",
                      marginBottom: 8,
                      textTransform: "uppercase",
                      letterSpacing: ".07em",
                    }}
                  >
                    {m === "light" ? "☀ Light mode" : "☾ Dark mode"}
                  </div>
                  <ComponentPreview
                    tokens={tokens.semantic}
                    slots={slots}
                    mode={m}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Token editor panel ── */}
        {activePanel === "tokens" && (
          <div>
            {/* Header row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "180px 1fr 1fr 80px 28px",
                gap: 6,
                padding: "4px 0",
                marginBottom: 4,
                borderBottom: "2px solid var(--ch-s2)",
              }}
            >
              {["Token", "Light", "Dark", "Contrast", ""].map((h) => (
                <span
                  key={h}
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: "var(--ch-t3)",
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                  }}
                >
                  {h}
                </span>
              ))}
            </div>

            {TOKEN_GROUPS.map((group) => {
              const groupTokens = group.ids.flatMap((id) =>
                tokens.semantic.filter((t) => t.name === id),
              );
              if (!groupTokens.length) return null;
              const isOpen = expandedGroup === group.label;

              return (
                <div key={group.label} style={{ marginBottom: 8 }}>
                  <button
                    onClick={() =>
                      setExpandedGroup(isOpen ? null : group.label)
                    }
                    style={{
                      width: "100%",
                      textAlign: "left",
                      background: "var(--ch-s1)",
                      border: "1px solid var(--ch-s2)",
                      borderRadius: 5,
                      padding: "7px 10px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 9.5,
                        fontWeight: 700,
                        color: "var(--ch-t1)",
                        flex: 1,
                      }}
                    >
                      {group.label}
                    </span>
                    <span style={{ fontSize: 9, color: "var(--ch-t3)" }}>
                      {groupTokens.length} tokens
                    </span>
                    <span style={{ fontSize: 11, color: "var(--ch-t3)" }}>
                      {isOpen ? "▾" : "▸"}
                    </span>
                  </button>

                  {isOpen && (
                    <div
                      style={{
                        padding: "6px 0",
                        borderBottom: "1px solid var(--ch-s2)",
                      }}
                    >
                      {group.desc && (
                        <p
                          style={{
                            fontSize: 10.5,
                            color: "var(--ch-t3)",
                            margin: "0 0 8px",
                            lineHeight: 1.5,
                          }}
                        >
                          {group.desc}
                        </p>
                      )}
                      {groupTokens.map((t) => (
                        <TokenRow
                          key={t.name}
                          token={t}
                          overrides={overrides}
                          mode={mode}
                          onOverride={handleOverride}
                          onRevert={handleRevert}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Utility colors panel ── */}
        {activePanel === "utility" && (
          <div>
            <p
              style={{
                fontSize: 11,
                color: "var(--ch-t3)",
                marginBottom: 12,
                lineHeight: 1.6,
              }}
            >
              Utility colors are derived from the palette hues and
              locked/unlocked individually in the Utility tab. Each has a base,
              light mode, dark mode, and subtle (tinted) variant.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "180px 1fr 1fr 1fr",
                gap: 6,
                padding: "4px 0",
                marginBottom: 4,
                borderBottom: "2px solid var(--ch-s2)",
              }}
            >
              {["Role", "Color", "Subtle", "Base"].map((h) => (
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
            {(Object.keys(tokens.utility) as UtilityRole[]).map((role) => (
              <UtilityTokenRow
                key={role}
                role={role}
                utility={tokens.utility}
                mode={mode}
              />
            ))}
          </div>
        )}

        {/* ── Accessibility panel ── */}
        {activePanel === "accessibility" && (
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 20,
              }}
            >
              {(["light", "dark"] as const).map((m) => (
                <div key={m}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "var(--ch-t3)",
                      marginBottom: 10,
                      textTransform: "uppercase",
                      letterSpacing: ".07em",
                    }}
                  >
                    {m === "light" ? "☀ Light mode" : "☾ Dark mode"}
                  </div>
                  <AccessibilityPanel tokens={tokens.semantic} mode={m} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Export panel ── */}
        {activePanel === "export" && (
          <ExportPanel tokens={tokens} utilityColors={utilityColors} />
        )}
      </div>
    </div>
  );
}
