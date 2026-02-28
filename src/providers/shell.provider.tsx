/* eslint-disable react-refresh/only-export-components */
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
