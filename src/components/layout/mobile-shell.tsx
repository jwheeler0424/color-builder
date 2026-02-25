/**
 * mobile-shell.tsx  — Phase 5 layout component
 *
 * Mobile Touch-First Layout (< 640px):
 *
 *   ┌────────────────────────────────┐
 *   │  HEADER (52px)                  │
 *   │  [◆ Chroma]      [🔍]  [⚙]    │
 *   ├────────────────────────────────┤
 *   │  PALETTE STRIP (44vh)           │
 *   │  horizontal scroll + snap       │
 *   │  [██] [██] [██] [██]  →        │
 *   │  ● ○ ○ ○ ○ (dot indicators)   │
 *   ├────────────────────────────────┤
 *   │  [⟳ Generate Palette]           │
 *   │  (sticky full-width bar, 52px)  │
 *   ├────────────────────────────────┤
 *   │  CONTENT AREA (scrollable)      │
 *   │  CREATE:  accordion sections    │
 *   │  Others:  tool view via Outlet  │
 *   │                                 │
 *   ├────────────────────────────────┤
 *   │  BOTTOM NAV (56px + safe area)  │
 *   │  [✦] [◎] [ ⟳ ] [⬡] [↗]       │
 *   │  Cr  An   GEN   Bu  Ex         │
 *   └────────────────────────────────┘
 *
 * Color picker: full-screen bottom sheet (95% height).
 * All touch targets: minimum 44×44px (Apple HIG, WCAG AAA).
 * Safe area insets: env(safe-area-inset-*) for notch/home bar.
 */

import { useState, useCallback, useEffect, Suspense } from "react";
import { Outlet, useRouterState } from "@tanstack/react-router";
import { NavMobile } from "./nav-mobile";
import { PaletteStripHorizontal } from "./palette-strip-horizontal";
import { GenerateControlsAccordion } from "./generate-controls-accordion";
import { BottomSheet } from "./bottom-sheet";
import { ExportModal, ShareModal, SaveModal, ShortcutsModal } from "../modals";
import { useCommandPalette } from "../views/command-palette";
import { useChromaStore } from "@/hooks/use-chroma-store";
import { InlineColorPicker } from "../common/inline-color-picker";
import { SECTIONS } from "./nav-desktop";
import { cn, hexToStop } from "@/lib/utils";
import { ShellProvider } from "@/providers/shell.provider";

const FALLBACK = (
  <div className="flex items-center justify-center p-8 text-muted-foreground text-[12px]">
    Loading…
  </div>
);

export function MobileShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { modal, slots, editSlotColor, generate, openModal, setSaveName } =
    useChromaStore();
  const { setOpen: openCmd } = useCommandPalette();

  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const isCreateSection =
    SECTIONS.find((s) => s.routes.some((r) => pathname.startsWith(r)))?.id ===
    "create";

  // Close picker on navigation
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
    <ShellProvider shell="mobile">
      <div
        className="flex flex-col h-full overflow-hidden"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        {/* ── Header (52px) ── */}
        <header className="flex items-center h-13 px-4 border-b border-border bg-card shrink-0 gap-2">
          <div className="font-display text-[15px] font-black tracking-tight text-foreground shrink-0">
            Chroma
            <sup className="text-[9px] text-muted-foreground font-normal">
              v4
            </sup>
          </div>
          <div className="flex-1" />

          {/* Search button — 44×44px touch target */}
          <button
            onClick={() => openCmd(true)}
            className="w-11 h-11 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 text-xl"
            title="Search (⌘K)"
            aria-label="Open search"
          >
            🔍
          </button>

          {/* Export */}
          <button
            onClick={() => openModal("export")}
            className="w-11 h-11 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 text-xl"
            title="Export palette"
            aria-label="Export palette"
          >
            ↗
          </button>
        </header>

        {/* ── Palette strip (44% viewport height) ── */}
        <PaletteStripHorizontal
          onEditSlot={handleEditSlot}
          height="44dvh"
          slotWidth={80}
          showDots
        />

        {/* ── Generate bar (sticky, 52px) ── */}
        <div className="shrink-0 px-4 py-2 border-b border-border bg-card">
          <button
            onClick={generate}
            className={cn(
              "w-full h-12 rounded-xl",
              "bg-primary text-primary-foreground",
              "font-bold text-sm tracking-[.03em]",
              "flex items-center justify-center gap-2",
              "active:opacity-80 transition-opacity cursor-pointer border-0",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            )}
            aria-label="Generate new palette"
          >
            <span className="text-[16px] leading-none">⟳</span>
            Generate Palette
          </button>
        </div>

        {/* ── Content area (scrollable) ── */}
        <div className="flex-1 overflow-y-auto [scrollbar-width:thin]">
          {isCreateSection ? (
            <GenerateControlsAccordion
              onEditSeed={handleEditSlot}
              showFooter={false}
            />
          ) : (
            <Suspense fallback={FALLBACK}>
              <Outlet />
            </Suspense>
          )}
        </div>

        {/* ── Bottom nav ── */}
        <NavMobile />

        {/* ── Color picker (full-screen bottom sheet, 95%) ── */}
        <BottomSheet
          open={pickerOpen}
          onClose={handlePickerClose}
          title={
            editingSlotIndex !== null
              ? `Slot ${editingSlotIndex + 1} — Edit Color`
              : "Edit Color"
          }
          heightPct={95}
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
