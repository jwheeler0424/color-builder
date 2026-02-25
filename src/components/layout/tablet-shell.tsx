/**
 * tablet-shell.tsx  — Phase 4 layout component
 *
 * Tablet Adaptive Layout (640–1023px):
 *
 *   ┌──────────────────────────────────────────────────────┐
 *   │  HEADER (56px — taller for touch targets)             │
 *   │  [◆ Chroma]                    [⌘K]  [♡]  [↗]  [?]  │
 *   ├─────────┬────────────────────────────────────────────┤
 *   │         │  PALETTE STRIP — horizontal, ~140px        │
 *   │  NAV    │  [██][██][██][██][██][██][██]  →           │
 *   │  RAIL   ├────────────────────────────────────────────┤
 *   │  (64px) │                                             │
 *   │         │  ACTIVE PANEL — full width, scrollable      │
 *   │  ✦ Cr   │                                             │
 *   │  ◎ An   │  CREATE:  GenerateControlsAccordion         │
 *   │  ⬡ Bu   │  Others:  <Outlet /> (tool view)           │
 *   │  ↗ Ex   │                                             │
 *   │         │                                             │
 *   └─────────┴────────────────────────────────────────────┘
 *
 * Color picker: opens as a BottomSheet (65% screen height).
 * Saved palettes: BottomSheet triggered from nav (future enhancement).
 * All touch targets: minimum 48×48px (Material Design spec).
 */

import { useState, useCallback, useEffect, Suspense } from "react";
import { Outlet, useRouterState } from "@tanstack/react-router";
import { NavRail } from "./nav-rail";
import { PaletteStripHorizontal } from "./palette-strip-horizontal";
import { GenerateControlsAccordion } from "./generate-controls-accordion";
import { BottomSheet } from "./bottom-sheet";
import { ExportModal, ShareModal, SaveModal, ShortcutsModal } from "../modals";
import { useCommandPalette } from "../views/command-palette";
import { useChromaStore } from "@/hooks/use-chroma-store";
import { hexToStop } from "@/lib/utils";
import { InlineColorPicker } from "../common/inline-color-picker";
import { SECTIONS } from "./nav-desktop";
import { ShellProvider } from "@/providers/shell.provider";

const FALLBACK = (
  <div className="flex-1 flex items-center justify-center text-muted-foreground text-[12px] p-8">
    Loading…
  </div>
);

// CREATE section routes — show accordion instead of outlet
const CREATE_ROUTES = new Set(["/palette", "/picker"]);

export function TabletShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { modal, slots, editSlotColor, openModal, setSaveName } =
    useChromaStore();
  const { setOpen: openCmd } = useCommandPalette();

  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const isCreateSection =
    SECTIONS.find((s) => s.routes.some((r) => pathname.startsWith(r)))?.id ===
    "create";

  // Close picker when navigating
  useEffect(() => {
    setPickerOpen(false);
    setEditingSlotIndex(null);
  }, [pathname]);

  const handleEditSlot = useCallback((index: number) => {
    setEditingSlotIndex(index);
    setPickerOpen(true);
  }, []);

  const handlePickerApply = useCallback(
    (hex: string) => {
      if (editingSlotIndex !== null)
        editSlotColor(editingSlotIndex, hexToStop(hex));
      setPickerOpen(false);
      setEditingSlotIndex(null);
    },
    [editingSlotIndex, editSlotColor],
  );

  const handlePickerClose = useCallback(() => {
    setPickerOpen(false);
    setEditingSlotIndex(null);
  }, []);

  return (
    <ShellProvider shell="tablet">
      <div className="flex flex-col h-full overflow-hidden">
        {/* ── Header (56px, touch-height) ── */}
        <header className="flex items-center h-14 px-4 border-b border-border bg-card shrink-0 gap-3">
          <div className="font-display text-[15px] font-black tracking-tight text-foreground shrink-0">
            Chroma
            <sup className="text-[9px] text-muted-foreground font-normal">
              v4
            </sup>
          </div>
          <div className="flex-1" />

          {/* ⌘K */}
          <button
            onClick={() => openCmd(true)}
            className="w-12 h-12 flex items-center justify-center rounded-xl border border-transparent text-muted-foreground hover:text-foreground hover:border-border transition-colors cursor-pointer bg-transparent text-xl"
            title="Search (⌘K)"
          >
            🔍
          </button>

          {/* Actions */}
          <button
            onClick={() => openModal("share")}
            className="w-12 h-12 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 text-xl"
            title="Share"
          >
            ⤴
          </button>
          <button
            onClick={() => {
              setSaveName("");
              openModal("save");
            }}
            className="w-12 h-12 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 text-xl"
            title="Save"
          >
            ♡
          </button>
          <button
            onClick={() => openModal("export")}
            className="w-12 h-12 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 text-xl"
            title="Export"
          >
            ↗
          </button>
        </header>

        {/* ── Body: rail + content ── */}
        <div className="flex flex-1 overflow-hidden">
          {/* Nav Rail (64px) */}
          <NavRail />

          {/* Right: palette strip + panel */}
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Horizontal palette strip (140px) */}
            <PaletteStripHorizontal
              onEditSlot={handleEditSlot}
              height={140}
              slotWidth={100}
            />

            {/* Active panel */}
            <div className="flex-1 overflow-y-auto [scrollbar-width:thin]">
              {isCreateSection ? (
                /* CREATE: show accordion generate controls */
                <GenerateControlsAccordion
                  onEditSeed={handleEditSlot}
                  showFooter
                />
              ) : (
                /* Other sections: show route view */
                <Suspense fallback={FALLBACK}>
                  <Outlet />
                </Suspense>
              )}
            </div>
          </div>
        </div>

        {/* Color picker bottom sheet */}
        <BottomSheet
          open={pickerOpen}
          onClose={handlePickerClose}
          title={
            editingSlotIndex !== null
              ? `Slot ${editingSlotIndex + 1} — Edit Color`
              : "Edit Color"
          }
          heightPct={65}
        >
          {editingSlotIndex !== null && slots[editingSlotIndex] && (
            <div className="p-4">
              <InlineColorPicker
                initialHex={slots[editingSlotIndex].color.hex}
                title={`Slot ${editingSlotIndex + 1}`}
                onApply={handlePickerApply}
                onCancel={handlePickerClose}
              />
            </div>
          )}
        </BottomSheet>

        {/* Modals */}
        {modal === "export" && <ExportModal />}
        {modal === "share" && <ShareModal />}
        {modal === "save" && <SaveModal />}
        {modal === "shortcuts" && <ShortcutsModal />}
      </div>
    </ShellProvider>
  );
}
