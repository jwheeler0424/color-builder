/**
 * mobile-shell.tsx  — Phase 5 layout component
 *
 * Mobile Touch-First Layout (< 600px):
 *
 *   ┌────────────────────────────────┐
 *   │  HEADER (52px)                  │
 *   │  [Brand]       [Search] [Tools] │
 *   ├────────────────────────────────┤
 *   │  PALETTE STRIP (44vh)           │
 *   │  horizontal scroll + snap       │
 *   │  [██] [██] [██] [██]  →        │
 *   │  ● ○ ○ ○ ○ (dot indicators)   │
 *   ├────────────────────────────────┤
 *   │  [Generate Palette]              │
 *   │  (sticky full-width bar, 52px)  │
 *   ├────────────────────────────────┤
 *   │  CONTENT AREA (scrollable)      │
 *   │  CREATE:  accordion sections    │
 *   │  Others:  tool view via Outlet  │
 *   │                                 │
 *   ├────────────────────────────────┤
 *   │  BOTTOM NAV (56px + safe area)  │
 *   │  [Palette] [Analyze] [Build] ... │
 *   │  Cr  An   GEN   Bu  Ex         │
 *   └────────────────────────────────┘
 *
 * Color picker: full-screen bottom sheet (95% height).
 * All touch targets: minimum 44×44px (Apple HIG, WCAG AAA).
 * Safe area insets: env(safe-area-inset-*) for notch/home bar.
 */

import {
  IconArrowBackUp,
  IconArrowUpRight,
  IconDots,
  IconHeart,
  IconKeyboard,
  IconRefresh,
  IconSearch,
  IconShare,
} from '@tabler/icons-react';
import { Outlet, useRouterState } from '@tanstack/react-router';
import { useState, useCallback, Suspense } from 'react';

import { useChromaStore } from '@/hooks/use-chroma-store';
import { useCommandModifier } from '@/hooks/use-command-modifier';
import { hexToStop } from '@/lib/engine/browser';
import { cn } from '@/lib/utils';
import { ShellProvider } from '@/providers/shell.provider';

import { InlineColorPicker } from '../common/inline-color-picker';
import { ThemeToggle } from '../common/theme-toggle';
import { BrandLockup } from '../logo-icon';
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
  const commandModifier = useCommandModifier();
  const { modal, slots, editSlotColor, generate, undo, openModal, setSaveName } = useChromaStore();
  const { setOpen: openCmd } = useCommandPalette();

  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [paletteSheetOpen, setPaletteSheetOpen] = useState(false);
  const [previousPathname, setPreviousPathname] = useState(pathname);

  const isPalettePage = isPaletteRoute(pathname);

  if (previousPathname !== pathname) {
    setPreviousPathname(pathname);
    setPickerOpen(false);
    setEditingSlotIndex(null);
    setPaletteSheetOpen(false);
  }

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
          <BrandLockup compact />
          <div className='flex-1' />

          {/* Search button — 44×44px touch target */}
          <button
            onClick={() => openCmd(true)}
            className='flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent text-xl text-muted-foreground transition-colors hover:text-foreground'
            title={`Search (${commandModifier}K)`}
            aria-label={`Open search (${commandModifier}K)`}>
            <IconSearch className='size-5' aria-hidden='true' />
          </button>

          {/* Export */}
          <button
            onClick={() => openModal('export')}
            className='flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent text-xl text-muted-foreground transition-colors hover:text-foreground'
            title='Export palette'
            aria-label='Export palette'>
            <IconArrowUpRight className='size-5' aria-hidden='true' />
          </button>

          <ThemeToggle />

          {/* Share, Save, Shortcuts */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className='flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent text-xl text-muted-foreground transition-colors hover:text-foreground'
              title='More actions'
              aria-label='More actions'>
              <IconDots className='size-5' aria-hidden='true' />
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-44'>
              <DropdownMenuItem onClick={() => openModal('share')}>
                <IconShare className='size-4' />
                Share URL
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSaveName('');
                  openModal('save');
                }}>
                <IconHeart className='size-4' />
                Save Palette
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openModal('shortcuts')}>
                <IconKeyboard className='size-4' />
                Keyboard Shortcuts
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <SectionToolTabs className='h-11 shrink-0 border-b border-border bg-card px-3' />

        {isPalettePage ? (
          /* Palette page: full swatch strip (all slot actions), generate bar, controls */
          <div className='min-h-0 flex-1 scrollbar-thin overflow-y-auto'>
            <div className='flex min-h-[calc(100dvh-14rem)] flex-col'>
              <PaletteStrip onEditSlot={handleEditSlot} />
            </div>

            <div className='sticky top-0 z-10 flex gap-2 bg-background px-4 py-2'>
              <button
                onClick={undo}
                className='h-12 shrink-0 cursor-pointer rounded-xl border-0 bg-secondary px-4 font-mono text-[11px] text-secondary-foreground transition-colors outline-none hover:bg-secondary/80'
                title='Undo (Ctrl+Z)'
                aria-label='Undo generate'>
                <IconArrowBackUp className='size-4' aria-hidden='true' />
                Undo
              </button>
              <button
                onClick={() => generate()}
                className={cn(
                  'h-12 w-full rounded-xl',
                  'bg-primary text-primary-foreground',
                  'text-sm font-bold tracking-[.03em]',
                  'flex items-center justify-center gap-2',
                  'cursor-pointer border-0 transition-opacity outline-none active:opacity-80',
                  'outline-none',
                )}
                aria-label='Generate new palette'>
                <IconRefresh className='size-4' aria-hidden='true' />
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
