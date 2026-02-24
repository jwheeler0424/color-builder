/**
 * theme.provider.tsx
 *
 * Lightweight theme provider that exposes the current theme value from the
 * TanStack Router route context (set via SSR cookie in __root.tsx).
 *
 * Theme application:
 *  "dark"  → <html class="dark">  — Tailwind dark: utilities activate
 *  "light" → <html class="light"> — explicit light overrides in globals.css
 *  "auto"  → <html class="auto">  — CSS @media prefers-color-scheme handles it
 *
 * To switch themes, call setThemeServerFn and then router.invalidate().
 * __root.tsx's beforeLoad re-reads the cookie and re-renders <html className>.
 */

import React, { createContext, useContext } from "react";
import type { Theme } from "@/lib/theme";

interface ThemeContextValue {
  theme: Theme;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: "auto" });

interface ThemeProviderProps {
  theme: Theme;
  children: React.ReactNode;
  // Accept and ignore next-themes compat props so callsites need minimal changes
  attribute?: string;
  defaultTheme?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}

export function ThemeProvider({ theme, children }: ThemeProviderProps) {
  return (
    <ThemeContext.Provider value={{ theme }}>{children}</ThemeContext.Provider>
  );
}

/** Read the active theme anywhere in the tree */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
