import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { Suspense, useCallback, useEffect, useState } from 'react';

import { useChromaStore } from '@/hooks/use-chroma-store';
import { ShellProvider } from '@/providers/shell.provider';

import { isPaletteRoute } from '../layout/nav-desktop';
import { PaletteStrip } from '../layout/palette-strip';
import { PaletteTools, type PaletteToolTab } from '../layout/palette-tools';
import { SlotEditor } from '../layout/slot-editor';
import { Panel, PanelContent, PanelHeader, usePanel } from '../panel';
import { MainHeader } from './header';

const FALLBACK = (
  <div className='flex flex-1 items-center justify-center p-8 text-[12px] text-muted-foreground'>
    Loading…
  </div>
);

export function DesktopStudio() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const openPanel = usePanel((state) => state.openPanel);
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [toolTab, setToolTab] = useState<PaletteToolTab>('generate');

  const isPalettePage = isPaletteRoute(pathname);
  const isPickerRoute = pathname === '/picker';
  // On palette routes the URL owns the Picker tab so /picker links and back/forward work
  const activeTab: PaletteToolTab = isPickerRoute
    ? 'picker'
    : isPalettePage && toolTab === 'picker'
      ? 'generate'
      : toolTab;

  useEffect(() => {
    openPanel('main-right');
  }, [openPanel]);

  useEffect(() => {
    setEditingSlotIndex(null);
    if (isPickerRoute) openPanel('main-right');
  }, [pathname, isPickerRoute, openPanel]);

  const handleTabChange = useCallback(
    (tab: PaletteToolTab) => {
      setToolTab(tab);
      if (!isPalettePage) return;
      if (tab === 'picker' && !isPickerRoute) void navigate({ to: '/picker' });
      else if (tab !== 'picker' && isPickerRoute) void navigate({ to: '/palette' });
    },
    [isPalettePage, isPickerRoute, navigate],
  );

  const handleEditSlot = useCallback(
    (index: number) => {
      setEditingSlotIndex(index);
      openPanel('main-right');
    },
    [openPanel],
  );

  // With the Picker tab open, clicking a palette color loads it into the picker
  const slots = useChromaStore((s) => s.slots);
  const setPickerHex = useChromaStore((s) => s.setPickerHex);
  const handleSelectSlot = useCallback(
    (index: number) => {
      if (activeTab === 'picker') {
        const slot = slots[index];
        if (slot) setPickerHex(slot.color.hex);
      } else handleEditSlot(index);
    },
    [activeTab, slots, setPickerHex, handleEditSlot],
  );

  return (
    <ShellProvider shell='studio'>
      {/* ── Top nav ── */}
      <MainHeader />

      <main className='relative flex min-h-0 grow overflow-hidden bg-card' data-studio-shell>
        {/* Main pane: the palette on palette routes, the tool page everywhere else */}
        {isPalettePage ? (
          <main className='relative flex min-w-0 flex-1 grow overflow-hidden'>
            <PaletteStrip onEditSlot={handleEditSlot} />
          </main>
        ) : (
          <main className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'>
            <Suspense fallback={FALLBACK}>
              <Outlet />
            </Suspense>
          </main>
        )}

        {/* Supporting pane: palette tools */}
        <Panel panelId={'main-right'} className='flex flex-col gap-1 bg-background'>
          {editingSlotIndex !== null ? (
            <PanelContent>
              <SlotEditor index={editingSlotIndex} onClose={() => setEditingSlotIndex(null)} />
            </PanelContent>
          ) : (
            <>
              <PanelHeader className='px-3.5 pt-3.5 pb-2'>
                <h2 className='text-base font-bold tracking-tight'>Palette Tools</h2>
              </PanelHeader>
              <PanelContent>
                <PaletteTools
                  tab={activeTab}
                  onTabChange={handleTabChange}
                  onSelectSlot={handleSelectSlot}
                />
              </PanelContent>
            </>
          )}
        </Panel>
      </main>
    </ShellProvider>
  );
}
