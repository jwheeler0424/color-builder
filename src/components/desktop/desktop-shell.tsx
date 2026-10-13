import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { Suspense, useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useChromaStore } from '@/hooks/use-chroma-store';
import { ShellProvider } from '@/providers/shell.provider';

import { isPaletteRoute } from '../layout/nav-desktop';
import { PaletteStrip } from '../layout/palette-strip';
import { PaletteTools, type PaletteToolTab } from '../layout/palette-tools';
import { SlotEditor } from '../layout/slot-editor';
import { Panel, PanelContent, PanelHeader, usePanel } from '../panel';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
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
  const togglePanel = usePanel((state) => state.togglePanel);
  const panelOpen = usePanel((state) => state.open('main-right'));
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [toolTab, setToolTab] = useState<PaletteToolTab>('generate');
  const [previousPathname, setPreviousPathname] = useState(pathname);

  const isPalettePage = isPaletteRoute(pathname);
  const isPickerRoute = pathname === '/picker';
  if (previousPathname !== pathname) {
    setPreviousPathname(pathname);
    setEditingSlotIndex(null);
  }
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
    if (isPickerRoute) openPanel('main-right');
  }, [isPickerRoute, openPanel]);

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
        <div className='relative flex h-full min-w-0'>
          <Panel
            panelId='main-right'
            style={{ width: panelOpen ? 'var(--panel-width)' : '0px' }}
            className='flex flex-col gap-1 bg-background'>
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
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant='ghost'
                  size='icon-sm'
                  className='group absolute top-10 left-0 z-40 h-10 w-20 -translate-x-1/2 rounded-full border-0 bg-transparent p-0 shadow-none hover:bg-transparent focus-visible:ring-2 focus-visible:ring-ring active:bg-transparent'
                  onClick={() => togglePanel('main-right')}
                  aria-label={panelOpen ? 'Hide side panel' : 'Show side panel'}
                  aria-expanded={panelOpen}
                  aria-controls='panel-region-main-right'>
                  <span
                    className='pointer-events-none absolute top-0 left-1/2 z-0 h-10 w-10 -translate-x-1/2 rounded-full border border-border bg-background shadow-sm transition-[left,width,transform,background-color] duration-150 group-hover:left-0 group-hover:w-full group-hover:translate-x-0 group-hover:bg-accent group-focus-visible:left-0 group-focus-visible:w-full group-focus-visible:translate-x-0 group-focus-visible:bg-accent'
                    aria-hidden='true'
                  />
                  <span className='pointer-events-none absolute top-0 left-1/2 z-10 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-transform duration-150 group-hover:-translate-x-full group-focus-visible:-translate-x-full'>
                    {panelOpen ? (
                      <IconChevronRight className='size-4' aria-hidden='true' />
                    ) : (
                      <IconChevronLeft className='size-4' aria-hidden='true' />
                    )}
                  </span>
                </Button>
              }
            />
            <TooltipContent side='top' align='end' alignOffset={32} sideOffset={6}>
              {panelOpen ? 'Hide side panel' : 'Show side panel'}
            </TooltipContent>
          </Tooltip>
        </div>
      </main>
    </ShellProvider>
  );
}
