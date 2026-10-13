import { IconChevronLeft } from '@tabler/icons-react';
import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { Suspense, useCallback, useEffect, useState } from 'react';

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
      else if (tab !== 'picker' && isPickerRoute) void navigate({ to: '/' });
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
            style={{ width: panelOpen ? 'var(--panel-width)' : '0px', zIndex: 20 }}
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
          <div className='group pointer-events-none absolute top-10 -left-12 z-30 h-10 w-12 overflow-hidden'>
            <span
              className='pointer-events-none absolute top-0 right-0 z-10 h-10 w-0 bg-background transition-[width] duration-150 ease-out group-hover:w-5 group-hover:duration-300'
              aria-hidden='true'
            />
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type='button'
                    className='pointer-events-auto absolute inset-0 z-30 h-10 w-12 cursor-pointer rounded-full bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-ring'
                    onClick={() => togglePanel('main-right')}
                    aria-label={panelOpen ? 'Hide side panel' : 'Show side panel'}
                    aria-expanded={panelOpen}
                    aria-controls='panel-region-main-right'>
                    <span
                      className={`pointer-events-none absolute top-0 -right-5 z-30 flex size-10 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-[translate,background-color] duration-150 ease-out group-hover:-translate-x-5 group-hover:bg-accent group-hover:duration-300`}>
                      <IconChevronLeft
                        className={`size-4 ${panelOpen ? '-translate-x-1 rotate-180' : '-translate-x-2'} transition-[translate,rotate] duration-150 ease-out group-hover:translate-x-0 group-hover:duration-300`}
                        aria-hidden='true'
                      />
                    </span>
                  </button>
                }
              />
              <TooltipContent side='top' align='end' sideOffset={6}>
                {panelOpen ? 'Hide side panel' : 'Show side panel'}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </main>
    </ShellProvider>
  );
}
