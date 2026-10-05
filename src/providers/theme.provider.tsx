/**
 * theme.provider.tsx
 *
 * Lightweight theme provider that exposes the current theme value from the
 * TanStack Router route context (read from a browser cookie in __root.tsx).
 *
 * Theme application:
 *  "dark"  → <html class="dark">  — Tailwind dark: utilities activate
 *  "light" → <html class="light"> — explicit light overrides in globals.css
 *  "auto"  → <html class="auto">  — CSS @media prefers-color-scheme handles it
 *
 * To switch themes, call setTheme and then router.invalidate().
 * __root.tsx's beforeLoad re-reads the cookie; the provider applies its class.
 */

import React, { createContext, useContext, useLayoutEffect } from 'react';

import { applyTheme, type Theme } from '@/lib/theme';

interface ThemeContextValue {
  theme: Theme;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'auto' });

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
  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return <ThemeContext.Provider value={{ theme }}>{children}</ThemeContext.Provider>;
}

/** Read the active theme anywhere in the tree */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
