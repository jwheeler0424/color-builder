import { createContext, useContext, useSyncExternalStore } from 'react';

import { useShell } from '@/providers/shell.provider';

const PORTRAIT_QUERY = '(orientation: portrait)';

function subscribePortrait(onChange: () => void) {
  const query = window.matchMedia(PORTRAIT_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

export function usePortraitViewport(): boolean {
  return useSyncExternalStore(
    subscribePortrait,
    () => window.matchMedia(PORTRAIT_QUERY).matches,
    () => false,
  );
}

/** Phones and portrait tablets use rows; landscape tablets use columns. */
export function useStackedPalette(): boolean {
  const shell = useShell();
  const portrait = usePortraitViewport();
  return shell === 'mobile' || (shell === 'tablet' && portrait);
}

/** How the palette strip lays out its swatches. */
export type StripLayout = 'columns' | 'rows';

export const StripLayoutContext = createContext<StripLayout>('columns');

export function useStripLayout(): StripLayout {
  return useContext(StripLayoutContext);
}
