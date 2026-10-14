/**
 * chroma-shell.tsx
 *
 * Root layout shell — wraps all routes.
 * Responsive layout dispatch:
 *
 *   < 600px   → MobileShell  (Phase 5: bottom nav, snap strip, full-screen sheet)
 *   600–1023px → TabletShell  (Phase 4: nav rail, horizontal strip, bottom sheet)
 *   ≥ 1024px  → DesktopStudio  (Phase 3: palette, tool, and supporting panels)
 *
 * Container queries select the visible shell before client-side layout logic
 * runs. All shell variants remain mounted; shared studio dialogs live here so
 * only one global modal layer responds to the palette store.
 *
 * Wrappers: HotkeyProvider → CommandPaletteProvider → layout shell
 */

import { useEffect } from 'react';

import { MobileShell } from '@/components/layout/mobile-shell';
import { TabletShell } from '@/components/layout/tablet-shell';
import { ExportModal, SaveModal, ShareModal, ShortcutsModal } from '@/components/modals';
import { useChromaStore } from '@/hooks/use-chroma-store';
import { subscribeColorNames } from '@/lib/engine/colors/color-names';
import { useRegisterHotkey } from '@/providers/hotkey.provider';

import { DesktopStudio } from './desktop/desktop-shell';

export function ChromaShell() {
  const { modal, closeModal, openModal, generate, undo, setSaveName } = useChromaStore();

  useRegisterHotkey({
    key: 'space',
    label: 'Generate palette',
    group: 'Palette',
    handler: generate,
  });
  useRegisterHotkey({
    key: 'z',
    ctrl: true,
    label: 'Undo generate',
    group: 'Palette',
    handler: undo,
  });
  useRegisterHotkey({
    key: '?',
    shift: true,
    label: 'Keyboard shortcuts',
    group: 'App',
    handler: () => openModal('shortcuts'),
  });
  useRegisterHotkey({
    key: 'e',
    ctrl: true,
    label: 'Export palette',
    group: 'App',
    handler: () => openModal('export'),
  });
  useRegisterHotkey({
    key: 's',
    ctrl: true,
    shift: true,
    label: 'Save palette',
    group: 'Palette',
    handler: () => {
      setSaveName('');
      openModal('save');
    },
  });

  // Rehydrate store on mount (TanStack Start SSR)
  useEffect(() => {
    void useChromaStore.persist?.rehydrate?.();
  }, []);

  useEffect(
    () =>
      subscribeColorNames(() => {
        useChromaStore.setState((state) => ({
          slots: state.slots.map((slot) => ({
            ...slot,
            color: { ...slot.color, rgb: { ...slot.color.rgb } },
          })),
          seeds: state.seeds.map((color) => ({ ...color, rgb: { ...color.rgb } })),
          utilityColors: Object.fromEntries(
            Object.entries(state.utilityColors).map(([role, entry]) => [
              role,
              {
                ...entry,
                value: entry.value
                  ? { ...entry.value, xyz: [...entry.value.xyz] as typeof entry.value.xyz }
                  : undefined,
              },
            ]),
          ) as typeof state.utilityColors,
        }));
      }),
    [],
  );

  // Global Escape → close modal (each shell also handles this locally,
  // but keep it here as a safety net)
  useEffect(() => {
    if (!modal) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [modal, closeModal]);

  return (
    <main className='app-shell-container flex min-h-0 w-full flex-1 flex-col'>
      <section className='hidden min-h-0 flex-1 flex-col shell-mobile:flex'>
        <MobileShell />
      </section>
      <section className='hidden min-h-0 flex-1 flex-col shell-tablet:flex'>
        <TabletShell />
      </section>
      <section className='hidden min-h-0 flex-1 flex-col shell-desktop:flex'>
        <DesktopStudio />
      </section>
      <div className='hidden'>
        {modal === 'export' && <ExportModal />}
        {modal === 'share' && <ShareModal />}
        {modal === 'save' && <SaveModal />}
        {modal === 'shortcuts' && <ShortcutsModal />}
      </div>
    </main>
  );
}
