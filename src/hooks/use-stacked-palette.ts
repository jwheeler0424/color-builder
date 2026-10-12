import { createContext, useContext, useSyncExternalStore } from 'react';

import { useShell } from '@/providers/shell.provider';

// Square counts as landscape, so only strictly taller-than-wide viewports match
const PORTRAIT_QUERY = '(aspect-ratio < 1)';

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(PORTRAIT_QUERY);
  mql.addEventListener('change', onChange);
  window.addEventListener('resize', onChange);
  return () => {
    mql.removeEventListener('change', onChange);
    window.removeEventListener('resize', onChange);
  };
}

export function usePortraitViewport(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(PORTRAIT_QUERY).matches,
    () => false,
  );
}

/** Rows on phones and portrait tablets; tall columns on square or landscape viewports. */
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
