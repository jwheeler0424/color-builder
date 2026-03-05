import { ShellProvider } from "@/providers/shell.provider";
import { useCallback, useState } from "react";
import { MainHeader } from "./header";
import { Panel, PanelContent, PanelHeader } from "../layout/panel";
import { PaletteStrip } from "../layout/palette-strip";
import { useRouterState } from "@tanstack/react-router";

const STRIP_ONLY_ROUTES = new Set(["/palette"]);

export function DesktopStudio() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [prevRoute, setPrevRoute] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const isStripOnly = STRIP_ONLY_ROUTES.has(pathname);
  const isPicking = editingSlotIndex !== null;
  const handleEditSlot = useCallback(
    (index: number) => {
      setPrevRoute(isStripOnly ? null : pathname);
      setEditingSlotIndex(index);
      setPanelOpen(true);
    },
    [pathname, isStripOnly],
  );
  return (
    <ShellProvider shell="studio">
      <main
        className="hidden bg-card h-full lg:grid lg:grid-cols-[auto_1fr_auto] xl:grid-rows-[auto_1fr]"
        data-studio-shell
      >
        {/* ── Top nav ── */}
        <MainHeader />

        {/* ── 3-column body ── */}

        {/* Left rail */}
        <aside className="h-full col-start-1 row-start-2 w-18 p-2">
          <main className="h-full w-full rounded-md bg-background border border-border/30"></main>
        </aside>

        {/* Main content */}
        <main className="flex flex-1 transition-all duration-300 ease-in-out h-full overflow-hidden relative">
          <section className="flex flex-col grow transition-all duration-300 ease-in-out">
            <PaletteStrip onEditSlot={handleEditSlot} />
          </section>
        </main>

        {/* Right panel */}
        <Panel
          panelId={"main-right"}
          className="bg-background flex flex-col gap-4"
        >
          <PanelHeader>
            <h2 className="text-xl font-bold">Project Pro</h2>
          </PanelHeader>
          <PanelContent>
            Here is some text Here is some text Here is some text Here is some
            text Here is some text
          </PanelContent>
        </Panel>
      </main>
    </ShellProvider>
  );
}
