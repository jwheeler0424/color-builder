/* eslint-disable react-refresh/only-export-components */
/**
 * shell-context.tsx
 *
 * Provides a way for route components to know which shell they're inside,
 * so they can adapt their rendering accordingly.
 *
 * StudioShell / TabletShell / MobileShell each provide their shell type.
 * PaletteView reads this to decide whether to render standalone or not.
 */

import React, { createContext, useContext } from "react";

export type ShellType = "studio" | "tablet" | "mobile" | null;

const ShellContext = createContext<ShellType>(null);

export function ShellProvider({
  shell,
  children,
}: {
  shell: ShellType;
  children: React.ReactNode;
}) {
  return (
    <ShellContext.Provider value={shell}>{children}</ShellContext.Provider>
  );
}

export function useShell(): ShellType {
  return useContext(ShellContext);
}
