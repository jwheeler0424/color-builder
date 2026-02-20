import { useState, useMemo } from "react";
import { useChromaStore } from "@/stores/chroma-store/chroma.store";
import { encodeUrl, savePalette } from "@/lib/utils/paletteUtils";
import {
  deriveThemeTokens,
  buildFigmaTokens,
  buildTailwindConfig,
} from "@/lib/utils/colorMath";
import type { ExportTab } from "@/types";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

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
  const hexes = slots.map((s) => s.color.hex);
  const [copied, setCopied] = useState(false);

  const tokens = useMemo(
    () => deriveThemeTokens(slots, utilityColors),
    [slots, utilityColors],
  );

  const content = useMemo(() => {
    switch (exportTab) {
      case "hex":
        return hexes.join("\n");
      case "css":
        return `:root {\n${hexes.map((h, i) => `  --color-${i + 1}: ${h};`).join("\n")}\n}`;
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
      <DialogContent className="sm:max-w-sm">
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

// ─── Share Modal ──────────────────────────────────────────────────────────────

export function ShareModal() {
  const { modal, slots, mode, closeModal, openModal } = useChromaStore();
  const hexes = slots.map((s) => s.color.hex);
  const url = encodeUrl(hexes, mode);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <Dialog
      open={modal === "share"}
      onOpenChange={(open) => !open && closeModal()}
    >
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            title="Share URL"
            onClick={() => openModal("share")}
          >
            ⤴
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Share Palette</DialogTitle>
          <DialogDescription>
            Anyone with this URL can load your exact palette.
          </DialogDescription>
        </DialogHeader>
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

// ─── Save Modal ───────────────────────────────────────────────────────────────

export function SaveModal() {
  const { modal, slots, mode, saveName, setSaveName, closeModal, openModal } =
    useChromaStore();
  const hexes = slots.map((s) => s.color.hex);

  const handleSave = () => {
    savePalette(saveName.trim() || "Unnamed", hexes, mode);
    closeModal();
  };

  return (
    <Dialog
      open={modal === "save"}
      onOpenChange={(open) => !open && closeModal()}
    >
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSaveName("");
              openModal("save");
            }}
            title="Save palette"
          >
            ♡
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Save Palette</DialogTitle>
        </DialogHeader>
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
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder="Name your palette…"
          maxLength={40}
          autoFocus
          autoComplete="off"
        />
        <DialogFooter>
          <DialogClose render={<Button variant="ghost">Cancel</Button>} />
          <Button variant="default" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Shortcuts Modal ──────────────────────────────────────────────────────────

export function ShortcutsModal() {
  const shortcuts = [
    { keys: "Space", desc: "Generate new palette" },
    { keys: "Ctrl+Z", desc: "Undo last generation" },
    { keys: "Escape", desc: "Close modal / cancel" },
    { keys: "?", desc: "Show this shortcuts panel" },
  ];
  const { modal, closeModal, openModal } = useChromaStore();
  return (
    <Dialog
      open={modal === "shortcuts"}
      onOpenChange={(open) => !open && closeModal()}
    >
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            title="Shortcuts"
            onClick={() => openModal("shortcuts")}
          >
            ?
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
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
              <span style={{ fontSize: 12, color: "var(--ch-t2)" }}>
                {desc}
              </span>
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
        <DialogFooter>
          <DialogClose render={<Button variant="ghost">Close</Button>} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
