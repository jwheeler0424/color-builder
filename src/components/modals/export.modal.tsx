import { useState, useMemo } from "react";
import { useChromaStore } from "@/stores/chroma-store/chroma.store";
import {
  deriveThemeTokens,
  buildFigmaTokens,
  buildTailwindConfig,
  buildColorStoryHtml,
  semanticSlotNames,
  toHexAlpha,
  toCssRgb,
} from "@/lib/utils";
import type { ExportTab } from "@/types";
import { generateSvgSwatch, downloadSvg } from "@/lib/utils/svg-export";
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
  { id: "svg", label: "SVG" },
];

export function ExportModal() {
  // Include alpha bytes in hex when a slot has transparency (#RRGGBBAA format)
  const modal = useChromaStore((s) => s.modal);
  const slots = useChromaStore((s) => s.slots);
  const utilityColors = useChromaStore((s) => s.utilityColors);
  const exportTab = useChromaStore((s) => s.exportTab);
  const setExportTab = useChromaStore((s) => s.setExportTab);
  const closeModal = useChromaStore((s) => s.closeModal);
  const openModal = useChromaStore((s) => s.openModal);

  const hexes = useMemo(
    () =>
      slots.map((s) =>
        s.color.a !== undefined && s.color.a < 100
          ? toHexAlpha(s.color.hex, s.color.a)
          : s.color.hex,
      ),
    [slots],
  );

  const [copied, setCopied] = useState(false);

  const tokens = useMemo(
    () => deriveThemeTokens(slots, utilityColors),
    [slots, utilityColors],
  );

  const svgContent = useMemo(
    () =>
      exportTab === "svg" ? generateSvgSwatch(slots, { title: "Palette" }) : "",
    [exportTab, slots],
  );

  const content = useMemo((): string => {
    switch (exportTab) {
      case "hex":
        return hexes.join("\n");
      case "css": {
        const cssVars = slots
          .map((s, i) => {
            const name = s.name || `color-${i + 1}`;
            const val =
              s.color.a !== undefined && s.color.a < 100
                ? toCssRgb(s.color.rgb, s.color.a)
                : s.color.hex;
            return `  --${name}: ${val};`;
          })
          .join("\n");
        return `:root {\n${cssVars}\n}`;
      }
      case "array":
        return `const palette = [\n${hexes.map((h) => `  '${h}'`).join(",\n")}\n];`;
      case "scss":
        return slots
          .map((s, i) => `$${s.name || `color-${i + 1}`}: ${hexes[i]};`)
          .join("\n");
      case "figma":
        return buildFigmaTokens(tokens, utilityColors);
      case "tailwind":
        return buildTailwindConfig(tokens, utilityColors);
      case "svg":
        return svgContent;
      default:
        return "";
    }
  }, [exportTab, hexes, slots, tokens, utilityColors, svgContent]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const handleDownloadSvg = () => downloadSvg(svgContent, "palette.svg");

  const downloadStory = () => {
    const names = semanticSlotNames(slots);
    const html = buildColorStoryHtml(
      slots,
      useChromaStore.getState().mode,
      utilityColors,
      names,
    );
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "color-story.html";
    a.click();
    URL.revokeObjectURL(url);
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
            className="text-muted-foreground"
          >
            ↗
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Export Palette</DialogTitle>
        </DialogHeader>
        {/* Tab bar */}
        <div className="flex gap-1 flex-wrap">
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

        {/* SVG preview */}
        {exportTab === "svg" ? (
          <div
            className="w-full border border-border rounded overflow-auto bg-muted"
            style={{ maxHeight: 220 }}
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : (
          <textarea
            readOnly
            value={content}
            rows={10}
            onFocus={(e) => e.target.select()}
            className="w-full bg-muted border border-border rounded px-3 py-2.5 text-[11px] text-foreground font-mono leading-relaxed resize-none outline-none focus:border-ring transition-colors"
          />
        )}

        {/* Palette preview strip */}
        <div className="flex h-5 rounded overflow-hidden gap-px">
          {slots.map((s) => (
            <div
              key={s.id}
              className="flex-1"
              style={{ background: s.color.hex }}
            />
          ))}
        </div>
        <DialogFooter>
          {exportTab === "svg" ? (
            <Button variant="ghost" onClick={handleDownloadSvg}>
              ↓ Download SVG
            </Button>
          ) : (
            <Button variant="ghost" onClick={downloadStory}>
              ↓ Color Story
            </Button>
          )}
          <DialogClose render={<Button variant="ghost">Close</Button>} />
          <Button variant="default" onClick={handleCopy}>
            {copied ? "✓ Copied" : "Copy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
