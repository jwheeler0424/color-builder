// src/routes/__root.tsx
/// <reference types="vite/client" />
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { PacerDevtoolsPanel } from "@tanstack/react-pacer-devtools";
import * as React from "react";
import type { QueryClient } from "@tanstack/react-query";
import { DefaultCatchBoundary } from "@/components/default-catch-boundary";
import { NotFound } from "@/components/not-found";
import appCss from "@/styles/globals.css?url";
import { seo } from "@/lib/utils/seo";
import { ThemeProvider } from "@/providers/theme.provider";
import { HotkeyProvider } from "@/providers/hotkey.provider";
import { getThemeServerFn, Theme } from "@/lib/theme";
import { CommandPaletteProvider } from "@/components/views/command-palette";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      ...seo({
        title:
          "Chroma ELITE - A powerful color palette generator and editor built with TanStack Router",
        description: `Chroma ELITE is a type-safe, client-first, color palette generator and editor built with TanStack Router. `,
      }),
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/apple-touch-icon.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/favicon-32x32.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        href: "/favicon-16x16.png",
      },
      { rel: "manifest", href: "/site.webmanifest", color: "#282828" },
      { rel: "icon", href: "/favicon.ico" },
    ],
    // scripts: [
    //   {
    //     src: "/customScript.js",
    //     type: "text/javascript",
    //   },
    // ],
  }),
  errorComponent: (props) => (
    <RootDocument theme="auto">
      <DefaultCatchBoundary {...props} />
    </RootDocument>
  ),
  notFoundComponent: () => <NotFound />,
  beforeLoad: async () => ({ theme: await getThemeServerFn() }),
  component: RootComponent,
});

function RootComponent() {
  const { theme } = Route.useRouteContext();
  return (
    <RootDocument theme={theme}>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({
  children,
  theme,
}: {
  children: React.ReactNode;
  theme: Theme;
}) {
  const htmlClass = theme === "auto" ? "" : theme;
  return (
    <html className={htmlClass}>
      <head>
        <HeadContent />
      </head>
      <body>
        <HotkeyProvider>
          <CommandPaletteProvider>
            <ThemeProvider theme={theme}>{children}</ThemeProvider>
          </CommandPaletteProvider>
        </HotkeyProvider>
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "TanStack Query",
              render: <ReactQueryDevtoolsPanel />,
              defaultOpen: true,
            },
            {
              name: "TanStack Router",
              render: <TanStackRouterDevtoolsPanel />,
              defaultOpen: false,
            },
            {
              name: "TanStack Pacer",
              render: <PacerDevtoolsPanel />,
              defaultOpen: false,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}
