import * as z from 'zod';

export type Theme = 'light' | 'dark' | 'auto';

const STORAGE_KEY = 'chroma-theme';

const themeValidator = z.enum(['light', 'dark', 'auto']);

export function getTheme(): Theme {
  if (typeof document === 'undefined') return 'auto';

  const cookie = document.cookie
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${STORAGE_KEY}=`));

  if (!cookie) return 'auto';

  try {
    const result = themeValidator.safeParse(
      decodeURIComponent(cookie.slice(STORAGE_KEY.length + 1)),
    );
    return result.success ? result.data : 'auto';
  } catch {
    return 'auto';
  }
}

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.remove('light', 'dark', 'auto');
  document.documentElement.classList.add(theme);
}

export function setTheme(theme: Theme): void {
  const value = themeValidator.parse(theme);
  if (typeof document === 'undefined') return;
  document.cookie = `${STORAGE_KEY}=${value}; Max-Age=31536000; Path=/; SameSite=Lax`;
  applyTheme(value);
}
