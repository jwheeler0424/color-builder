import { createContext, useContext } from 'react';

import { useShell } from '@/providers/shell.provider';

/** Phones use rows; tablet orientation is handled by the app-shell container query. */
export function useStackedPalette(): boolean {
  const shell = useShell();
  return shell === 'mobile';
}

/** How the palette strip lays out its swatches. */
export type StripLayout = 'columns' | 'rows';

export const StripLayoutContext = createContext<StripLayout>('columns');

export function useStripLayout(): StripLayout {
  return useContext(StripLayoutContext);
}
