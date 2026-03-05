import { ShellProvider } from "@/providers/shell.provider";
import { useCallback, useState } from "react";
import { MainHeader } from "./header";
import { Panel, PanelContent, PanelHeader } from "../panel";
import { PaletteStrip } from "../layout/palette-strip";
import { useRouterState } from "@tanstack/react-router";
// import { LeftRail } from "./left-rail";

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
      {/* ── Top nav ── */}
      <MainHeader />

      <main
        className="bg-card h-full flex grow relative overflow-hidden"
        data-studio-shell
      >
        {/* ── 3-column body ── */}

        {/* Left rail */}
        {/* <LeftRail /> */}

        {/* Main content */}
        <main className="flex flex-1 h-full grow overflow-hidden relative">
          <PaletteStrip onEditSlot={handleEditSlot} />
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
