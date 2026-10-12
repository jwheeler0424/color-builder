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

import { Outlet, useRouterState } from '@tanstack/react-router';
import { useState, useCallback, useEffect, Suspense } from 'react';

import { useChromaStore } from '@/hooks/use-chroma-store';
import { usePortraitViewport } from '@/hooks/use-stacked-palette';
import { hexToStop } from '@/lib/engine/browser';
import { ShellProvider } from '@/providers/shell.provider';

import { InlineColorPicker } from '../common/inline-color-picker';
import { ThemeToggle } from '../common/theme-toggle';
import { BrandLockup } from '../logo-icon';
import { ExportModal, ShareModal, SaveModal, ShortcutsModal } from '../modals';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';
import ColorPickerView from '../views/color-picker-view';
import { useCommandPalette } from '../views/command-palette';
import { BottomSheet } from './bottom-sheet';
import { GenerateControlsAccordion } from './generate-controls-accordion';
import { SectionToolTabs, isPaletteRoute } from './nav-desktop';
import { NavRail } from './nav-rail';
import { PaletteBar, PaletteSheetBody } from './palette-sheet';
import { PaletteStrip } from './palette-strip';
import { SlotActions } from './slot-editor';

const FALLBACK = (
  <div className='flex flex-1 items-center justify-center p-8 text-[12px] text-muted-foreground'>
    Loading…
  </div>
);

export function TabletShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { modal, slots, editSlotColor, openModal, setSaveName, generate, undo } = useChromaStore();
  const stacked = usePortraitViewport();
  const { setOpen: openCmd } = useCommandPalette();

  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [paletteSheetOpen, setPaletteSheetOpen] = useState(false);

  const isPalettePage = isPaletteRoute(pathname);

  // Close picker and palette sheet when navigating
  useEffect(() => {
    setPickerOpen(false);
    setEditingSlotIndex(null);
    setPaletteSheetOpen(false);
  }, [pathname]);

  const handleEditSlot = useCallback((index: number) => {
    setPaletteSheetOpen(false);
    setEditingSlotIndex(index);
    setPickerOpen(true);
  }, []);

  const handlePickerApply = useCallback(
    (hex: string) => {
      if (editingSlotIndex !== null) editSlotColor(editingSlotIndex, hexToStop(hex));
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
    <ShellProvider shell='tablet'>
      <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
        {/* ── Header (56px, touch-height) ── */}
        <header className='flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4'>
          <BrandLockup compact />
          <div className='flex-1' />

          {/* ⌘K */}
          <button
            onClick={() => openCmd(true)}
            className='flex h-12 w-12 cursor-pointer items-center justify-center rounded-xl border border-transparent bg-transparent text-xl text-muted-foreground transition-colors hover:border-border hover:text-foreground'
            title='Search (⌘K)'>
            🔍
          </button>

          {/* Actions */}
          <button
            onClick={() => openModal('share')}
            className='flex h-12 w-12 cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent text-xl text-muted-foreground transition-colors hover:text-foreground'
            title='Share'>
            ⤴
          </button>
          <button
            onClick={() => {
              setSaveName('');
              openModal('save');
            }}
            className='flex h-12 w-12 cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent text-xl text-muted-foreground transition-colors hover:text-foreground'
            title='Save'>
            ♡
          </button>
          <button
            onClick={() => openModal('export')}
            className='flex h-12 w-12 cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent text-xl text-muted-foreground transition-colors hover:text-foreground'
            title='Export'>
            ↗
          </button>
          <button
            onClick={() => openModal('shortcuts')}
            className='flex h-12 w-12 cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent text-xl text-muted-foreground transition-colors hover:text-foreground'
            title='Keyboard shortcuts'
            aria-label='Keyboard shortcuts'>
            ⌨
          </button>
          <ThemeToggle />
        </header>

        {/* ── Body: rail + content ── */}
        <div className='flex min-h-0 flex-1 overflow-hidden'>
          {/* Nav Rail (64px) */}
          <NavRail />

          <div className='flex min-w-0 flex-1 flex-col overflow-hidden'>
            <SectionToolTabs className='h-11 shrink-0 border-b border-border bg-card px-3' />

            {isPalettePage ? (
              /* Palette page: full swatch strip (all slot actions) + controls, scrolling together */
              <div className='min-h-0 flex-1 [scrollbar-width:thin] overflow-y-auto'>
                {stacked ? (
                  <>
                    <div className='flex min-h-[calc(100dvh-8rem)] flex-col'>
                      <PaletteStrip onEditSlot={handleEditSlot} />
                    </div>
                    <div className='sticky bottom-0 z-10 flex gap-2 bg-background px-4 py-2'>
                      <button
                        onClick={undo}
                        className='h-12 shrink-0 cursor-pointer rounded-xl border-0 bg-secondary px-4 font-mono text-[11px] text-secondary-foreground transition-colors outline-none hover:bg-secondary/80'
                        title='Undo (Ctrl+Z)'
                        aria-label='Undo generate'>
                        ↩ Undo
                      </button>
                      <button
                        onClick={() => generate()}
                        className='flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-0 bg-primary text-sm font-bold tracking-[.03em] text-primary-foreground transition-opacity outline-none active:opacity-80'
                        aria-label='Generate new palette'>
                        <span className='text-[16px] leading-none'>⟳</span>
                        Generate Palette
                      </button>
                    </div>
                  </>
                ) : (
                  <div className='relative h-[64dvh] min-h-[34rem]'>
                    <div className='flex h-full'>
                      <PaletteStrip onEditSlot={handleEditSlot} />
                    </div>
                  </div>
                )}
                {pathname === '/picker' ? (
                  <ColorPickerView />
                ) : (
                  <GenerateControlsAccordion onEditSeed={handleEditSlot} showFooter={!stacked} />
                )}
              </div>
            ) : (
              <>
                <PaletteBar onOpen={() => setPaletteSheetOpen(true)} />
                <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
                  <Suspense fallback={FALLBACK}>
                    <Outlet />
                  </Suspense>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Color picker bottom sheet */}
        <BottomSheet
          open={pickerOpen}
          onClose={handlePickerClose}
          title={
            editingSlotIndex !== null ? `Slot ${editingSlotIndex + 1} — Edit Color` : 'Edit Color'
          }
          heightPct={65}>
          {editingSlotIndex !== null && slots[editingSlotIndex] && (
            <div className='flex flex-col gap-3 p-4'>
              <SlotActions index={editingSlotIndex} onRemoved={handlePickerClose} />
              <InlineColorPicker
                initialHex={slots[editingSlotIndex].color.hex}
                title={`Slot ${editingSlotIndex + 1}`}
                onApply={handlePickerApply}
                onCancel={handlePickerClose}
              />
            </div>
          )}
        </BottomSheet>

        {/* Palette + generate controls on tool pages */}
        <Sheet open={paletteSheetOpen} onOpenChange={setPaletteSheetOpen}>
          <SheetContent side='right'>
            <SheetHeader>
              <SheetTitle>Palette</SheetTitle>
            </SheetHeader>
            <PaletteSheetBody onEditSlot={handleEditSlot} showFooter />
          </SheetContent>
        </Sheet>

        {/* Modals render their own trigger buttons; keep those out of the layout */}
        <div className='hidden'>
          {modal === 'export' && <ExportModal />}
          {modal === 'share' && <ShareModal />}
          {modal === 'save' && <SaveModal />}
          {modal === 'shortcuts' && <ShortcutsModal />}
        </div>
      </div>
    </ShellProvider>
  );
}
