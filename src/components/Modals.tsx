import React, { useState, useMemo } from "react";
import type { ChromaState, ChromaAction, ExportTab } from "@/types";
import { encodeUrl, savePalette } from "@/lib/utils/paletteUtils";
import {
  deriveThemeTokens,
  buildFigmaTokens,
  buildTailwindConfig,
} from "@/lib/utils/colorMath";
import Modal from "./Modal";
import Button from "./Button";

interface Props {
  state: ChromaState;
  dispatch: React.Dispatch<ChromaAction>;
}

// ─── Export Modal ─────────────────────────────────────────────────────────────

const EXPORT_TABS: { id: ExportTab; label: string }[] = [
  { id: "hex", label: "HEX" },
  { id: "css", label: "CSS" },
  { id: "array", label: "JS Array" },
  { id: "scss", label: "SCSS" },
  { id: "figma", label: "Figma" },
  { id: "tailwind", label: "Tailwind" },
];

export function ExportModal({ state, dispatch }: Props) {
  const hexes = state.slots.map((s) => s.color.hex);
  const [copied, setCopied] = useState(false);

  const tokens = useMemo(
    () => deriveThemeTokens(state.slots, state.utilityColors),
    [state.slots, state.utilityColors],
  );

  const content = useMemo(() => {
    switch (state.exportTab) {
      case "hex":
        return hexes.join("\n");
      case "css":
        return `:root {\n${hexes.map((h, i) => `  --color-${i + 1}: ${h};`).join("\n")}\n}`;
      case "array":
        return `const palette = [\n${hexes.map((h) => `  '${h}'`).join(",\n")}\n];`;
      case "scss":
        return hexes.map((h, i) => `$color-${i + 1}: ${h};`).join("\n");
      case "figma":
        return buildFigmaTokens(tokens, state.utilityColors);
      case "tailwind":
        return buildTailwindConfig(tokens, state.utilityColors);
    }
  }, [state.exportTab, hexes, tokens, state.utilityColors]);

  const copy = () => {
    navigator.clipboard.writeText(content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <Modal
      title="Export"
      onClose={() => dispatch({ type: "CLOSE_MODAL" })}
      width={560}
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => dispatch({ type: "CLOSE_MODAL" })}
          >
            Close
          </Button>
          <Button variant="primary" onClick={copy}>
            {copied ? "✓ Copied" : "Copy"}
          </Button>
        </>
      }
    >
      <div
        style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}
      >
        {EXPORT_TABS.map(({ id, label }) => (
          <Button
            key={id}
            variant={state.exportTab === id ? "primary" : "ghost"}
            size="sm"
            onClick={() => dispatch({ type: "SET_EXPORT_TAB", tab: id })}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Contextual hint for new tabs */}
      {state.exportTab === "figma" && (
        <p style={{ fontSize: 11, color: "var(--ch-t3)", marginBottom: 8 }}>
          Style Dictionary / Figma Tokens JSON — includes palette, semantic
          tokens, and utility colors.
        </p>
      )}
      {state.exportTab === "tailwind" && (
        <p style={{ fontSize: 11, color: "var(--ch-t3)", marginBottom: 8 }}>
          Tailwind config snippet — pair with CSS variables from the Theme
          Generator for full light/dark support.
        </p>
      )}

      <pre className="ch-expre">{content}</pre>

      <div
        style={{
          display: "flex",
          height: 24,
          borderRadius: 2,
          overflow: "hidden",
          gap: 2,
          marginTop: 8,
        }}
      >
        {hexes.map((h, i) => (
          <div key={i} style={{ flex: 1, background: h }} />
        ))}
      </div>
    </Modal>
  );
}

// ─── Share Modal ──────────────────────────────────────────────────────────────

export function ShareModal({ state, dispatch }: Props) {
  const hexes = state.slots.map((s) => s.color.hex);
  const url = encodeUrl(hexes, state.mode);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <Modal
      title="Share Palette"
      onClose={() => dispatch({ type: "CLOSE_MODAL" })}
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => dispatch({ type: "CLOSE_MODAL" })}
          >
            Close
          </Button>
          <Button variant="primary" onClick={copy}>
            {copied ? "✓ Copied" : "Copy URL"}
          </Button>
        </>
      }
    >
      <p style={{ fontSize: 12, color: "var(--ch-t3)", marginBottom: 10 }}>
        Anyone with this URL can load your exact palette.
      </p>
      <textarea
        readOnly
        value={url}
        rows={2}
        style={{
          width: "100%",
          background: "var(--ch-s2)",
          border: "1px solid var(--ch-b1)",
          borderRadius: 2,
          color: "var(--ch-t2)",
          fontFamily: "var(--ch-fm)",
          fontSize: 11,
          padding: 9,
          resize: "none",
          outline: "none",
          lineHeight: 1.6,
        }}
      />
      <div
        style={{
          display: "flex",
          height: 24,
          borderRadius: 2,
          overflow: "hidden",
          gap: 2,
          marginTop: 8,
        }}
      >
        {hexes.map((h, i) => (
          <div key={i} style={{ flex: 1, background: h }} />
        ))}
      </div>
    </Modal>
  );
}

// ─── Save Modal ───────────────────────────────────────────────────────────────

export function SaveModal({ state, dispatch }: Props) {
  const hexes = state.slots.map((s) => s.color.hex);

  const handleSave = () => {
    savePalette(state.saveName.trim() || "Unnamed", hexes, state.mode);
    dispatch({ type: "CLOSE_MODAL" });
  };

  return (
    <Modal
      title="Save Palette"
      onClose={() => dispatch({ type: "CLOSE_MODAL" })}
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => dispatch({ type: "CLOSE_MODAL" })}
          >
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save
          </Button>
        </>
      }
    >
      <div
        style={{
          display: "flex",
          height: 36,
          borderRadius: 3,
          overflow: "hidden",
          gap: 2,
          marginBottom: 12,
        }}
      >
        {hexes.map((h, i) => (
          <div key={i} style={{ flex: 1, background: h }} />
        ))}
      </div>
      <input
        className="ch-inp"
        value={state.saveName}
        onChange={(e) =>
          dispatch({ type: "SET_SAVE_NAME", name: e.target.value })
        }
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
        placeholder="Name your palette…"
        maxLength={40}
        autoFocus
        autoComplete="off"
      />
    </Modal>
  );
}

// ─── Keyboard Shortcuts Modal ─────────────────────────────────────────────────

export function ShortcutsModal({
  dispatch,
}: {
  dispatch: React.Dispatch<ChromaAction>;
}) {
  const shortcuts = [
    { keys: "Space", desc: "Generate new palette" },
    { keys: "Ctrl+Z", desc: "Undo last generation" },
    { keys: "Escape", desc: "Close modal / cancel" },
    { keys: "?", desc: "Show this shortcuts panel" },
  ];

  return (
    <Modal
      title="Keyboard Shortcuts"
      onClose={() => dispatch({ type: "CLOSE_MODAL" })}
      footer={
        <Button
          variant="ghost"
          onClick={() => dispatch({ type: "CLOSE_MODAL" })}
        >
          Close
        </Button>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {shortcuts.map(({ keys, desc }) => (
          <div
            key={keys}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: 12, color: "var(--ch-t2)" }}>{desc}</span>
            <kbd
              style={{
                display: "inline-block",
                padding: "2px 8px",
                border: "1px solid var(--ch-b2)",
                borderRadius: 3,
                fontSize: 11,
                color: "var(--ch-t3)",
                fontFamily: "var(--ch-fm)",
                background: "var(--ch-s2)",
              }}
            >
              {keys}
            </kbd>
          </div>
        ))}
      </div>
    </Modal>
  );
}
