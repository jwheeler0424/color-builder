import { render } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'bun:test';

import { applyTheme, getTheme, setTheme } from '@/lib/theme';
import { ThemeProvider } from '@/providers/theme.provider';

beforeEach(() => {
  document.cookie = 'chroma-theme=; Max-Age=0; Path=/';
  document.documentElement.className = 'unrelated';
});

describe('theme cookies', () => {
  test('defaults missing, invalid and malformed cookies to auto', () => {
    expect(getTheme()).toBe('auto');
    for (const value of ['invalid', '%', '%E0%A4%A']) {
      document.cookie = `chroma-theme=${value}; Path=/`;
      expect(getTheme()).toBe('auto');
    }
  });

  test('reads valid themes alongside unrelated cookies', () => {
    document.cookie = 'other=dark; Path=/';
    for (const theme of ['light', 'dark', 'auto'] as const) {
      document.cookie = `chroma-theme=${theme}; Path=/`;
      expect(getTheme()).toBe(theme);
    }
  });

  test('persists a one-year root cookie and applies the theme immediately', () => {
    let assignedCookie = '';
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      set: (value: string) => {
        assignedCookie = value;
      },
    });
    try {
      setTheme('dark');
      expect(assignedCookie).toBe('chroma-theme=dark; Max-Age=31536000; Path=/; SameSite=Lax');
      expect(document.documentElement.className).toBe('unrelated dark');
    } finally {
      Reflect.deleteProperty(document, 'cookie');
    }
    setTheme('dark');
    expect(getTheme()).toBe('dark');
  });
});

test('applies the initial cookie without removing unrelated HTML classes', () => {
  document.cookie = 'chroma-theme=light; Path=/';
  applyTheme(getTheme());
  expect(document.documentElement.className).toBe('unrelated light');
});

test('provider switches classes and explicitly applies auto for system CSS', () => {
  const view = render(<ThemeProvider theme='dark'>Studio</ThemeProvider>);
  expect(view.getByText('Studio')).toBeInTheDocument();
  expect(document.documentElement).toHaveClass('unrelated', 'dark');
  view.rerender(<ThemeProvider theme='light'>Studio</ThemeProvider>);
  expect(document.documentElement).toHaveClass('unrelated', 'light');
  expect(document.documentElement).not.toHaveClass('dark');
  view.rerender(<ThemeProvider theme='auto'>Studio</ThemeProvider>);
  expect(document.documentElement).toHaveClass('unrelated', 'auto');
  expect(document.documentElement).not.toHaveClass('light', 'dark');
});
