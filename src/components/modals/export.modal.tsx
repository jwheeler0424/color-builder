import { useState, useMemo } from "react";
import { useChromaStore } from "@/stores/chroma-store/chroma.store";
import {
  deriveThemeTokens,
  buildFigmaTokens,
  buildTailwindConfig,
  toHexAlpha,
  toCssRgb,
} from "@/lib/utils/colorMath";
import type { ExportTab } from "@/types";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";

// ─── Export Modal ─────────────────────────────────────────────────────────────

const EXPORT_TABS: { id: ExportTab; label: string }[] = [
  { id: "hex", label: "HEX" },
  { id: "css", label: "CSS" },
  { id: "array", label: "JS Array" },
  { id: "scss", label: "SCSS" },
  { id: "figma", label: "Figma" },
  { id: "tailwind", label: "Tailwind" },
];

export function ExportModal() {
  const {
    modal,
    slots,
    utilityColors,
    exportTab,
    closeModal,
    openModal,
    setExportTab,
  } = useChromaStore();
  // Include alpha bytes in hex when a slot has transparency (#RRGGBBAA format)
  const hexes = slots.map((s) =>
    s.color.a !== undefined && s.color.a < 100
      ? toHexAlpha(s.color.hex, s.color.a)
      : s.color.hex,
  );
  const [copied, setCopied] = useState(false);

  const tokens = useMemo(
    () => deriveThemeTokens(slots, utilityColors),
    [slots, utilityColors],
  );

  const content = useMemo(() => {
    switch (exportTab) {
      case "hex":
        return hexes.join("\n");
      case "css": {
        const cssVars = slots
          .map((s, i) => {
            const val =
              s.color.a !== undefined && s.color.a < 100
                ? toCssRgb(s.color.rgb, s.color.a)
                : s.color.hex;
            return `  --color-${i + 1}: ${val};`;
          })
          .join("\n");
        return `:root {\n${cssVars}\n}`;
      }
      case "array":
        return `const palette = [\n${hexes.map((h) => `  '${h}'`).join(",\n")}\n];`;
      case "scss":
        return hexes.map((h, i) => `$color-${i + 1}: ${h};`).join("\n");
      case "figma":
        return buildFigmaTokens(tokens, utilityColors);
      case "tailwind":
        return buildTailwindConfig(tokens, utilityColors);
      default:
        return "";
    }
  }, [exportTab, hexes, tokens, utilityColors]);

  const copy = () => {
    navigator.clipboard.writeText(content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <Dialog
      open={modal === "export"}
      onOpenChange={(open) => !open && closeModal()}
    >
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            title="Export"
            onClick={() => openModal("export")}
          >
            ↗
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm text-primary-foreground bg-background">
        <DialogHeader>
          <DialogTitle>Export</DialogTitle>
        </DialogHeader>
        <div
          style={{
            display: "flex",
            gap: 4,
            marginBottom: 12,
            flexWrap: "wrap",
          }}
        >
          {EXPORT_TABS.map(({ id, label }) => (
            <Button
              key={id}
              variant={exportTab === id ? "default" : "ghost"}
              size="sm"
              onClick={() => setExportTab(id)}
            >
              {label}
            </Button>
          ))}
        </div>
        {exportTab === "figma" && (
          <p style={{ fontSize: 11, color: "var(--ch-t3)", marginBottom: 8 }}>
            Style Dictionary / Figma Tokens JSON — includes palette, semantic
            tokens, and utility colors.
          </p>
        )}
        {exportTab === "tailwind" && (
          <p style={{ fontSize: 11, color: "var(--ch-t3)", marginBottom: 8 }}>
            Tailwind config snippet — pair with CSS Variables output for full
            light/dark support.
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
        <DialogFooter>
          <DialogClose render={<Button variant="ghost">Close</Button>} />
          <Button variant="default" onClick={copy}>
            {copied ? "✓ Copied" : "Copy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
