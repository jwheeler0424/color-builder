/**
 * studio-shell.tsx  — Phase 3 layout component
 *
 * The Desktop Studio Layout (≥1024px):
 *
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │  NAV DESKTOP (48px)                                              │
 *   │  [Chroma]  [CREATE][ANALYZE][BUILD][EXPORT]  [tools]  [ K ]      │
 *   ├────────────────┬────────────────────────┬────────────────────────┤
 *   │  LEFT RAIL     │   PALETTE STRIP        │  RIGHT PANEL           │
 *   │  (240px)       │   (flex center)        │  (340px, closeable)    │
 *   │  Generate      │                        │                        │
 *   │  controls      │  Slots (draggable)     │  <Outlet />            │
 *   │                │                        │  (active route view)   │
 *   │  [ Generate ]  │   [ FAB ]              │                        │
 *   └────────────────┴────────────────────────┴────────────────────────┘
 *
 * Architecture:
 * - LEFT RAIL: Always renders GenerateControls regardless of active route.
 * - CENTER: Always renders PaletteStrip (the draggable slot canvas).
 * - RIGHT PANEL: Renders <Outlet /> — the TanStack Router active route view.
 *   - On /palette: panel closed (strip is the full focus).
 *   - On all other routes: panel open, showing that tool.
 *   - On slot double-click: panel shows ColorPickerModal for that slot.
 */

import { useState, useCallback, useEffect } from "react";
import { Outlet, useRouterState } from "@tanstack/react-router";
import { NavDesktop, SECTIONS } from "./nav-desktop";
import { LeftRail } from "./left-rail";
import { PaletteStrip } from "./palette-strip";
import { GenerateFab } from "./generate-fab";
import { Panel } from "./panel";
import { useChromaStore } from "@/hooks/use-chroma-store";
import { cn, hexToStop } from "@/lib/utils";
import { InlineColorPicker } from "../common/inline-color-picker";
import { ShellProvider } from "@/providers/shell.provider";

// Routes where the right panel is closed by default (strip fills full width)
const STRIP_ONLY_ROUTES = new Set(["/palette"]);

export function StudioShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { modal, slots, editSlotColor } = useChromaStore();

  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [prevRoute, setPrevRoute] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const activeSection = SECTIONS.find((s) =>
    s.routes.some((r) => pathname.startsWith(r)),
  );
  const isStripOnly = STRIP_ONLY_ROUTES.has(pathname);
  const isPicking = editingSlotIndex !== null;

  // Auto-open/close panel based on route
  useEffect(() => {
    if (isStripOnly) {
      if (!isPicking) setPanelOpen(false);
    } else {
      setPanelOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleEditSlot = useCallback(
    (index: number) => {
      setPrevRoute(isStripOnly ? null : pathname);
      setEditingSlotIndex(index);
      setPanelOpen(true);
    },
    [pathname, isStripOnly],
  );

  const handlePickerBack = useCallback(() => {
    setEditingSlotIndex(null);
    if (!prevRoute) setPanelOpen(false);
  }, [prevRoute]);

  const handlePickerApply = useCallback(
    (hex: string) => {
      if (editingSlotIndex !== null)
        editSlotColor(editingSlotIndex, hexToStop(hex));
      handlePickerBack();
    },
    [editingSlotIndex, editSlotColor, handlePickerBack],
  );

  const panelTitle = isPicking
    ? undefined
    : (activeSection?.label.toUpperCase() ?? "Tools");

  return (
    <ShellProvider shell="studio">
      <div className="flex flex-col h-full overflow-hidden" data-studio-shell>
        {/* ── Top nav ── */}
        <NavDesktop />

        {/* ── 3-column body ── */}
        <div className="flex flex-1 overflow-hidden relative">
          {/* Left rail */}
          <LeftRail onEditSeed={handleEditSlot} />

          {/* Center: palette strip + FAB */}
          <div className="flex-1 overflow-hidden relative flex">
            <PaletteStrip onEditSlot={handleEditSlot} />
            <GenerateFab />
          </div>

          {/* Right panel */}
          {panelOpen && (
            <Panel
              open
              title={isPicking ? undefined : panelTitle}
              width={340}
              onClose={() => {
                setEditingSlotIndex(null);
                setPanelOpen(false);
              }}
            >
              {isPicking &&
              editingSlotIndex !== null &&
              slots[editingSlotIndex] ? (
                /* Picker mode */
                <div className="flex flex-col h-full overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-border flex items-center gap-3 shrink-0">
                    <button
                      onClick={handlePickerBack}
                      className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 p-0"
                    >
                      ← Back
                    </button>
                    <span className="text-[11px] font-bold text-foreground">
                      Slot {editingSlotIndex + 1} — Edit Color
                    </span>
                  </div>
                  <div className="flex-1 overflow-auto p-4">
                    <InlineColorPicker
                      initialHex={slots[editingSlotIndex].color.hex}
                      title={`Slot ${editingSlotIndex + 1}`}
                      onApply={handlePickerApply}
                      onCancel={handlePickerBack}
                    />
                  </div>
                </div>
              ) : (
                /* Tool view */
                <div className="flex flex-col h-full overflow-hidden">
                  <Outlet />
                </div>
              )}
            </Panel>
          )}

          {/* Panel toggle tab when closed on non-strip-only routes */}
          {!panelOpen && !isStripOnly && (
            <button
              onClick={() => setPanelOpen(true)}
              className={cn(
                "absolute right-0 top-1/2 -translate-y-1/2 z-10",
                "w-6 h-16 flex items-center justify-center",
                "bg-card border border-border border-r-0 rounded-l-md",
                "text-muted-foreground hover:text-foreground text-xs cursor-pointer",
                "transition-colors shadow-sm",
              )}
              title="Open panel"
              aria-label="Open tool panel"
            >
              ‹
            </button>
          )}
        </div>
      </div>
    </ShellProvider>
  );
}
