import type { QueryClient } from '@tanstack/react-query';

import { HeadContent, Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import * as React from 'react';

import { DefaultCatchBoundary } from '@/components/default-catch-boundary';
import { NotFound } from '@/components/not-found';
import { ToasterGlobal } from '@/components/ui/toast';
import { CommandPaletteProvider } from '@/components/views/command-palette';
import { getTheme, type Theme } from '@/lib/theme';
import { seo } from '@/lib/utils/seo';
import { HotkeyProvider } from '@/providers/hotkey.provider';
import { ThemeProvider } from '@/providers/theme.provider';

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      ...seo({
        title:
          'Chroma ELITE - A powerful color palette generator and editor built with TanStack Router',
        description: `Chroma ELITE is a type-safe, client-first, color palette generator and editor built with TanStack Router. `,
      }),
    ],
    links: [{ rel: 'manifest', href: '/site.webmanifest', color: '#282828' }],
  }),
  errorComponent: (props) => (
    <RootLayout theme={getTheme()}>
      <DefaultCatchBoundary {...props} />
    </RootLayout>
  ),
  notFoundComponent: () => <NotFound />,
  beforeLoad: () => ({ theme: getTheme() }),
  component: RootComponent,
});

function RootComponent() {
  const { theme } = Route.useRouteContext();
  return (
    <RootLayout theme={theme}>
      <Outlet />
    </RootLayout>
  );
}

function RootLayout({ children, theme }: { children: React.ReactNode; theme: Theme }) {
  return (
    <>
      <HeadContent />
      <HotkeyProvider>
        <CommandPaletteProvider>
          <ThemeProvider theme={theme}>{children}</ThemeProvider>
        </CommandPaletteProvider>
      </HotkeyProvider>
      <ToasterGlobal />
    </>
  );
}
