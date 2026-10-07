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

import { Outlet, useRouterState } from '@tanstack/react-router';
import { useState, useCallback, useEffect } from 'react';

import { useChromaStore } from '@/hooks/use-chroma-store';
import { hexToStop } from '@/lib/engine/browser';
import { cn } from '@/lib/utils';
import { ShellProvider } from '@/providers/shell.provider';

import { InlineColorPicker } from '../common/inline-color-picker';
import { Panel } from '../panel';
import { GenerateFab } from './generate-fab';
import { LeftRail } from './left-rail';
import { NavDesktop, SECTIONS } from './nav-desktop';
import { PaletteStrip } from './palette-strip';

// Routes where the right panel is closed by default (strip fills full width)
const STRIP_ONLY_ROUTES = new Set(['/palette']);

export function StudioShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { modal, slots, editSlotColor } = useChromaStore();

  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [prevRoute, setPrevRoute] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const activeSection = SECTIONS.find((s) => s.routes.some((r) => pathname.startsWith(r)));
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
      if (editingSlotIndex !== null) editSlotColor(editingSlotIndex, hexToStop(hex));
      handlePickerBack();
    },
    [editingSlotIndex, editSlotColor, handlePickerBack],
  );

  const panelTitle = isPicking ? undefined : (activeSection?.label.toUpperCase() ?? 'Tools');

  return (
    <ShellProvider shell='studio'>
      <main className='desktop-main h-full overflow-hidden' data-studio-shell>
        {/* ── Top nav ── */}
        <NavDesktop className='desktop-main-nav' />

        {/* ── 3-column body ── */}

        {/* Left rail */}
        <LeftRail className='desktop-left' onEditSeed={handleEditSlot} />

        {/* Center: palette strip + FAB */}
        <div className='desktop-main relative flex h-full flex-1 overflow-hidden'>
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
            className='desktop-right'>
            {isPicking && editingSlotIndex !== null && slots[editingSlotIndex] ? (
              /* Picker mode */
              <div className='flex h-full flex-col overflow-hidden'>
                <div className='flex shrink-0 items-center gap-3 border-b border-border px-4 py-2.5'>
                  <button
                    onClick={handlePickerBack}
                    className='inline-flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-[11px] text-muted-foreground transition-colors hover:text-foreground'>
                    ← Back
                  </button>
                  <span className='text-[11px] font-bold text-foreground'>
                    Slot {editingSlotIndex + 1} — Edit Color
                  </span>
                </div>
                <div className='flex-1 overflow-auto p-4'>
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
              <div className='flex h-full flex-col overflow-hidden'>
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
              'absolute top-1/2 right-0 z-10 -translate-y-1/2',
              'flex h-16 w-6 items-center justify-center',
              'rounded-l-md border border-r-0 border-border bg-card',
              'cursor-pointer text-xs text-muted-foreground hover:text-foreground',
              'shadow-sm transition-colors',
            )}
            title='Open panel'
            aria-label='Open tool panel'>
            ‹
          </button>
        )}
      </main>
    </ShellProvider>
  );
}
