/**
 * palette-view.tsx  — Phase 2/3 refactored
 *
 * The /palette route component. Adapts based on shell context:
 *
 *   Desktop (StudioShell):
 *     - Strip + controls already visible in shell columns
 *     - Renders PaletteStudioPanel (quick actions) in the right panel
 *
 *   Tablet (TabletShell) / Mobile (MobileShell):
 *     - CREATE section bypasses <Outlet> entirely — this component not rendered
 *
 *   Standalone (no shell / direct embed):
 *     - Renders full layout: PaletteStrip + sidebar controls
 */

import { useState } from "react";
import { PaletteStrip } from "../layout/palette-strip";
import { GenerateControls, GenerateFooter } from "../layout/generate-controls";
import { useChromaStore } from "@/hooks/use-chroma-store";
import { useShell } from "@/providers/shell.provider";

// ─── Standalone full layout ───────────────────────────────────────────────────

function StandalonePaletteView() {
  const [editingSlot, setEditingSlot] = useState<number | null>(null);

  return (
    <div className="flex flex-1 overflow-hidden">
      <PaletteStrip onEditSlot={setEditingSlot} />
      <aside className="w-[320px] bg-card border-l border-border flex flex-col overflow-hidden shrink-0">
        <div className="flex-1 overflow-y-auto [scrollbar-width:thin]">
          <GenerateControls onEditSeed={setEditingSlot} />
        </div>
        <GenerateFooter />
      </aside>
    </div>
  );
}

// ─── Studio panel hint ────────────────────────────────────────────────────────
// Shown in the right panel when /palette is active in StudioShell.
// Strip and controls are already visible in their columns.

function PaletteStudioPanel() {
  const { generate, undo, openModal, setSaveName, slots } = useChromaStore();

  return (
    <div className="flex flex-col h-full overflow-auto p-5 gap-4">
      <div>
        <p className="text-[10px] tracking-widest uppercase text-muted-foreground font-semibold mb-1">
          Palette
        </p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {slots.length} colors · drag slots to reorder, lock to protect,
          double-click to edit color.
        </p>
      </div>

      {slots.length > 0 && (
        <div className="flex h-8 rounded-md overflow-hidden gap-0.5">
          {slots.map((s) => (
            <div
              key={s.id}
              className="flex-1"
              style={{ background: s.color.hex }}
            />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <button
          onClick={generate}
          className="w-full h-10 text-[12px] font-bold rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer border-0"
        >
          ⟳ Generate New Palette
        </button>
        <button
          onClick={undo}
          className="w-full h-9 text-[11px] font-mono rounded-md border border-border bg-secondary text-secondary-foreground hover:border-input transition-colors cursor-pointer"
        >
          ↩ Undo Last Generate
        </button>
      </div>

      <div className="border-t border-border pt-3 flex flex-col gap-2">
        <p className="text-[10px] tracking-widest uppercase text-muted-foreground font-semibold">
          Export
        </p>
        <button
          onClick={() => openModal("export")}
          className="w-full h-9 text-[11px] font-mono rounded-md border border-border bg-secondary text-secondary-foreground hover:border-input transition-colors cursor-pointer"
        >
          ↗ Export Palette
        </button>
        <button
          onClick={() => {
            setSaveName("");
            openModal("save");
          }}
          className="w-full h-9 text-[11px] font-mono rounded-md border border-border bg-secondary text-secondary-foreground hover:border-input transition-colors cursor-pointer"
        >
          ♡ Save Palette
        </button>
        <button
          onClick={() => openModal("share")}
          className="w-full h-9 text-[11px] font-mono rounded-md border border-border bg-secondary text-secondary-foreground hover:border-input transition-colors cursor-pointer"
        >
          ⤴ Share URL
        </button>
      </div>

      <div className="border-t border-border pt-3">
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          <kbd>Space</kbd> generate · <kbd>Ctrl+Z</kbd> undo · <kbd>Ctrl+E</kbd>{" "}
          export · <kbd>?</kbd> all shortcuts
        </p>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function PaletteView() {
  const shell = useShell();

  // Inside any shell, the palette strip and controls are already mounted
  // by the shell layout — render the quick-action panel variant instead
  if (shell === "studio") return <PaletteStudioPanel />;

  // Tablet/mobile: CREATE section bypasses <Outlet>, so this component
  // is only rendered for non-CREATE routes — render nothing meaningful
  if (shell === "tablet" || shell === "mobile") return null;

  // No shell — standalone/legacy embed: full layout
  return <StandalonePaletteView />;
}

export default PaletteView;
