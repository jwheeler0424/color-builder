/**
 * chroma-shell.tsx
 *
 * Root layout shell — wraps all routes.
 * Responsive layout dispatch:
 *
 *   < 640px   → MobileShell  (Phase 5: bottom nav, snap strip, full-screen sheet)
 *   640–1023px → TabletShell  (Phase 4: nav rail, horizontal strip, bottom sheet)
 *   ≥ 1024px  → StudioShell  (Phase 3: 3-column, left rail, right panel)
 *
 * Only the shell matching the viewport is mounted, so route views and hotkeys
 * run once. App-wide palette hotkeys are registered here so they work on every
 * page and device.
 *
 * Wrappers: HotkeyProvider → CommandPaletteProvider → layout shell
 */

import { useEffect, useSyncExternalStore } from 'react';

import { MobileShell } from '@/components/layout/mobile-shell';
import { TabletShell } from '@/components/layout/tablet-shell';
import { useChromaStore } from '@/hooks/use-chroma-store';
import { useRegisterHotkey } from '@/providers/hotkey.provider';

import { DesktopStudio } from './desktop/desktop-shell';

type ShellKind = 'mobile' | 'tablet' | 'desktop';

// Mirrors Tailwind's sm (40rem) and lg (64rem) breakpoints
const DESKTOP_QUERY = '(min-width: 64rem)';
const TABLET_QUERY = '(min-width: 40rem)';

function getShellKind(): ShellKind {
  if (typeof window === 'undefined') return 'desktop';
  if (window.matchMedia(DESKTOP_QUERY).matches) return 'desktop';
  if (window.matchMedia(TABLET_QUERY).matches) return 'tablet';
  return 'mobile';
}

function subscribeShellKind(onChange: () => void) {
  const queries = [DESKTOP_QUERY, TABLET_QUERY].map((q) => window.matchMedia(q));
  queries.forEach((mql) => mql.addEventListener('change', onChange));
  return () => queries.forEach((mql) => mql.removeEventListener('change', onChange));
}

export function ChromaShell() {
  const { modal, closeModal, openModal, generate, undo, setSaveName } = useChromaStore();
  const shellKind = useSyncExternalStore(subscribeShellKind, getShellKind, () => 'desktop');

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
    useChromaStore.persist?.rehydrate?.();
  }, []);

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
    <main className='flex min-h-0 w-full flex-1 flex-col'>
      {shellKind === 'mobile' && (
        <section className='flex min-h-0 flex-1 flex-col'>
          <MobileShell />
        </section>
      )}

      {shellKind === 'tablet' && (
        <section className='flex min-h-0 flex-1 flex-col'>
          <TabletShell />
        </section>
      )}

      {shellKind === 'desktop' && (
        <section className='flex min-h-0 flex-1 flex-col'>
          <DesktopStudio />
        </section>
      )}
    </main>
  );
}
