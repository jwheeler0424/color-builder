import React, { useMemo, useState } from "react";
import type { ChromaState, ChromaAction } from "@/types";
import {
  deriveThemeTokens,
  buildThemeCss,
  buildFigmaTokens,
  buildTailwindConfig,
  textColor,
} from "@/lib/utils/colorMath";
import { hexToStop } from "@/lib/utils/paletteUtils";
import Button from "../Button";

interface Props {
  state: ChromaState;
  dispatch: React.Dispatch<ChromaAction>;
}

type ThemeTab = "css" | "figma" | "tailwind";

const TAB_LABELS: Record<ThemeTab, string> = {
  css: "CSS Variables",
  figma: "Figma Tokens",
  tailwind: "Tailwind Config",
};

/** Tiny live preview card showing light and dark mode side by side */
function ThemePreview({
  tokens,
}: {
  tokens: ReturnType<typeof deriveThemeTokens>;
}) {
  const get = (name: string, mode: "light" | "dark") => {
    const t = tokens.semantic.find((s) => s.name === name);
    return t ? t[mode] : "#888";
  };

  return (
    <div className="ch-theme-preview-pair">
      {(["light", "dark"] as const).map((mode) => {
        const bg = get("color-bg", mode);
        const surface = get("color-surface", mode);
        const border = get("color-border", mode);
        const text = get("color-text", mode);
        const muted = get("color-text-muted", mode);
        const accent = get("color-accent", mode);
        const accentTc = textColor(hexToStop(accent).rgb);

        return (
          <div
            key={mode}
            className="ch-theme-preview-card"
            style={{ background: bg, border: `1px solid ${border}` }}
          >
            <div
              style={{
                background: surface,
                borderBottom: `1px solid ${border}`,
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ color: text, fontWeight: 700, fontSize: 11 }}>
                {mode === "light" ? "☀ Light mode" : "☾ Dark mode"}
              </span>
              <span
                style={{
                  background: accent,
                  color: accentTc,
                  padding: "3px 9px",
                  borderRadius: 3,
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                Accent
              </span>
            </div>
            <div style={{ padding: "10px 12px" }}>
              <div
                style={{
                  color: text,
                  fontWeight: 600,
                  fontSize: 12,
                  marginBottom: 4,
                }}
              >
                Heading text
              </div>
              <div
                style={{
                  color: muted,
                  fontSize: 10,
                  lineHeight: 1.5,
                  marginBottom: 10,
                }}
              >
                Muted secondary text showing hierarchy.
              </div>
              <div style={{ display: "flex", gap: 5 }}>
                <div
                  style={{
                    background: accent,
                    color: accentTc,
                    padding: "5px 10px",
                    borderRadius: 3,
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  Primary
                </div>
                <div
                  style={{
                    border: `1px solid ${border}`,
                    color: text,
                    padding: "5px 10px",
                    borderRadius: 3,
                    fontSize: 10,
                  }}
                >
                  Secondary
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Utility preview grid in both modes */
function UtilityModePreview({
  tokens,
}: {
  tokens: ReturnType<typeof deriveThemeTokens>;
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
    <div className="ch-theme-utility-preview">
      {(["light", "dark"] as const).map((mode) => (
        <div key={mode} style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 10,
              color: "var(--ch-t3)",
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: ".07em",
            }}
          >
            {mode === "light" ? "☀ Light" : "☾ Dark"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {roles.map((role) => {
              const color =
                tokens.utility[role][mode === "light" ? "light" : "dark"];
              const tc = textColor(hexToStop(color).rgb);
              return (
                <div
                  key={role}
                  style={{
                    background: color,
                    color: tc,
                    padding: "5px 10px",
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  <span>{ICONS[role]}</span>
                  <span style={{ textTransform: "capitalize" }}>{role}</span>
                  <span
                    style={{
                      marginLeft: "auto",
                      opacity: 0.75,
                      fontFamily: "var(--ch-fm)",
                      fontSize: 9,
                    }}
                  >
                    {color}
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

export default function ThemeGeneratorView({ state }: Props) {
  const [activeTab, setActiveTab] = useState<ThemeTab>("css");
  const [copied, setCopied] = useState(false);

  const tokens = useMemo(
    () => deriveThemeTokens(state.slots, state.utilityColors),
    [state.slots, state.utilityColors],
  );

  const content = useMemo(() => {
    if (!state.slots.length) return "";
    switch (activeTab) {
      case "css":
        return buildThemeCss(tokens);
      case "figma":
        return buildFigmaTokens(tokens, state.utilityColors);
      case "tailwind":
        return buildTailwindConfig(tokens, state.utilityColors);
    }
  }, [tokens, state.utilityColors, activeTab, state.slots.length]);

  const copy = () => {
    navigator.clipboard.writeText(content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  if (!state.slots.length) {
    return (
      <div className="ch-view-scroll ch-view-pad">
        <div className="ch-view-hd">
          <h2>Theme Generator</h2>
        </div>
        <p style={{ color: "var(--ch-t3)", fontSize: 12 }}>
          Generate a palette first.
        </p>
      </div>
    );
  }

  return (
    <div className="ch-view-scroll ch-view-pad">
      <div style={{ maxWidth: 1020, margin: "0 auto" }}>
        <div className="ch-view-hd">
          <h2>Theme Generator</h2>
          <p>
            Full light/dark token system derived from your palette and utility
            colors. Includes semantic tokens, utility colors for both modes, and
            all palette values.
          </p>
        </div>

        {/* Light + dark preview */}
        <div className="ch-slabel" style={{ marginBottom: 10 }}>
          Mode Preview
        </div>
        <ThemePreview tokens={tokens} />

        {/* Utility mode preview */}
        <div className="ch-slabel" style={{ margin: "24px 0 10px" }}>
          Utility Colors per Mode
        </div>
        <UtilityModePreview tokens={tokens} />

        {/* Semantic token table */}
        <div className="ch-slabel" style={{ margin: "24px 0 10px" }}>
          Semantic Tokens
        </div>
        <div className="ch-theme-token-table">
          <div className="ch-theme-token-header">
            <span>Token</span>
            <span>Light</span>
            <span>Dark</span>
            <span>Description</span>
          </div>
          {tokens.semantic.map((t) => (
            <div key={t.name} className="ch-theme-token-row">
              <code
                style={{
                  fontSize: 10,
                  color: "var(--ch-t2)",
                  fontFamily: "var(--ch-fm)",
                }}
              >
                {`var(${t.name})`}
              </code>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 3,
                    background: t.light,
                    border: "1px solid rgba(255,255,255,.08)",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: "var(--ch-fm)",
                    color: "var(--ch-t2)",
                  }}
                >
                  {t.light}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 3,
                    background: t.dark,
                    border: "1px solid rgba(255,255,255,.08)",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: "var(--ch-fm)",
                    color: "var(--ch-t2)",
                  }}
                >
                  {t.dark}
                </span>
              </div>
              <span style={{ fontSize: 10, color: "var(--ch-t3)" }}>
                {t.description}
              </span>
            </div>
          ))}
        </div>

        {/* Code output */}
        <div style={{ marginTop: 32 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <div style={{ display: "flex", gap: 4 }}>
              {(Object.keys(TAB_LABELS) as ThemeTab[]).map((tab) => (
                <Button
                  key={tab}
                  variant={activeTab === tab ? "primary" : "ghost"}
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

          {activeTab === "css" && (
            <p
              style={{
                fontSize: 11,
                color: "var(--ch-t3)",
                marginBottom: 8,
                lineHeight: 1.6,
              }}
            >
              Paste into your global stylesheet. Tokens switch automatically via{" "}
              <code
                style={{
                  background: "var(--ch-s2)",
                  padding: "1px 4px",
                  borderRadius: 2,
                }}
              >
                prefers-color-scheme
              </code>
              , or force dark mode by adding{" "}
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
              Style Dictionary / Figma Tokens plugin compatible JSON. Import via
              the Tokens Studio plugin or feed into a Style Dictionary pipeline.
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
              . Semantic colors use CSS variables so they update with the theme
              — no extra config needed.
            </p>
          )}

          <pre className="ch-token-pre" style={{ maxHeight: 420 }}>
            {content}
          </pre>
        </div>
      </div>
    </div>
  );
}
