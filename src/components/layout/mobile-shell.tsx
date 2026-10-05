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

import { Outlet, useRouterState } from '@tanstack/react-router';
import { useState, useCallback, useEffect, Suspense } from 'react';

import { useChromaStore } from '@/hooks/use-chroma-store';
import { cn, hexToStop } from '@/lib/utils';
import { ShellProvider } from '@/providers/shell.provider';

import { InlineColorPicker } from '../common/inline-color-picker';
import { ThemeToggle } from '../common/theme-toggle';
import { ExportModal, ShareModal, SaveModal, ShortcutsModal } from '../modals';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';
import ColorPickerView from '../views/color-picker-view';
import { useCommandPalette } from '../views/command-palette';
import { BottomSheet } from './bottom-sheet';
import { GenerateControlsAccordion } from './generate-controls-accordion';
import { SectionToolTabs, isPaletteRoute } from './nav-desktop';
import { NavMobile } from './nav-mobile';
import { PaletteBar, PaletteSheetBody } from './palette-sheet';
import { PaletteStrip } from './palette-strip';
import { SlotActions } from './slot-editor';

const FALLBACK = (
  <div className='flex items-center justify-center p-8 text-[12px] text-muted-foreground'>
    Loading…
  </div>
);

export function MobileShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { modal, slots, editSlotColor, generate, undo, openModal, setSaveName } = useChromaStore();
  const { setOpen: openCmd } = useCommandPalette();

  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [paletteSheetOpen, setPaletteSheetOpen] = useState(false);

  const isPalettePage = isPaletteRoute(pathname);

  // Close picker and palette sheet on navigation
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
    <ShellProvider shell='mobile'>
      <div
        className='flex min-h-0 flex-1 flex-col overflow-hidden'
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        {/* ── Header (52px) ── */}
        <header className='flex h-13 shrink-0 items-center gap-2 border-b border-border bg-card px-4'>
          <div className='shrink-0 font-display text-[15px] font-black tracking-tight text-foreground'>
            Chroma
            <sup className='text-[9px] font-normal text-muted-foreground'>v4</sup>
          </div>
          <div className='flex-1' />

          {/* Search button — 44×44px touch target */}
          <button
            onClick={() => openCmd(true)}
            className='flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent text-xl text-muted-foreground transition-colors hover:text-foreground'
            title='Search (⌘K)'
            aria-label='Open search'>
            🔍
          </button>

          {/* Export */}
          <button
            onClick={() => openModal('export')}
            className='flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent text-xl text-muted-foreground transition-colors hover:text-foreground'
            title='Export palette'
            aria-label='Export palette'>
            ↗
          </button>

          <ThemeToggle />

          {/* Share, Save, Shortcuts */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className='flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent text-xl text-muted-foreground transition-colors hover:text-foreground'
              title='More actions'
              aria-label='More actions'>
              ⋯
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-44'>
              <DropdownMenuItem onClick={() => openModal('share')}>⤴ Share URL</DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSaveName('');
                  openModal('save');
                }}>
                ♡ Save Palette
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openModal('shortcuts')}>
                ⌨ Keyboard Shortcuts
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <SectionToolTabs className='h-11 shrink-0 border-b border-border bg-card px-3' />

        {isPalettePage ? (
          /* Palette page: full swatch strip (all slot actions), generate bar, controls */
          <div className='min-h-0 flex-1 [scrollbar-width:thin] overflow-y-auto'>
            <div className='flex h-[60dvh] min-h-108 [scrollbar-width:thin] overflow-x-auto [&>.slot-item]:min-w-44'>
              <PaletteStrip onEditSlot={handleEditSlot} />
            </div>

            <div className='sticky top-0 z-10 flex gap-2 border-b border-border bg-card px-4 py-2'>
              <button
                onClick={undo}
                className='h-12 shrink-0 cursor-pointer rounded-xl border border-border bg-secondary px-4 font-mono text-[11px] text-secondary-foreground transition-colors hover:border-input'
                title='Undo (Ctrl+Z)'
                aria-label='Undo generate'>
                ↩ Undo
              </button>
              <button
                onClick={generate}
                className={cn(
                  'h-12 w-full rounded-xl',
                  'bg-primary text-primary-foreground',
                  'text-sm font-bold tracking-[.03em]',
                  'flex items-center justify-center gap-2',
                  'cursor-pointer border-0 transition-opacity active:opacity-80',
                  'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none',
                )}
                aria-label='Generate new palette'>
                <span className='text-[16px] leading-none'>⟳</span>
                Generate Palette
              </button>
            </div>

            {pathname === '/picker' ? (
              <ColorPickerView />
            ) : (
              <GenerateControlsAccordion onEditSeed={handleEditSlot} showFooter={false} />
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

        {/* ── Bottom nav ── */}
        <NavMobile />

        {/* ── Color picker (full-screen bottom sheet, 95%) ── */}
        <BottomSheet
          open={pickerOpen}
          onClose={handlePickerClose}
          title={
            editingSlotIndex !== null ? `Slot ${editingSlotIndex + 1} — Edit Color` : 'Edit Color'
          }
          heightPct={95}>
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
          <SheetContent side='bottom' className='max-h-[90dvh]'>
            <SheetHeader>
              <SheetTitle>Palette</SheetTitle>
            </SheetHeader>
            <PaletteSheetBody onEditSlot={handleEditSlot} showFooter={false} />
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
