import { ShellProvider } from "@/providers/shell.provider";
import { useCallback, useEffect, useState } from "react";
import { MainHeader } from "./header";
import { Panel, PanelContent, PanelHeader, usePanel } from "../panel";
import { PaletteStrip } from "../layout/palette-strip";
import { Outlet, useRouterState } from "@tanstack/react-router";
import { SECTION_TOOLS } from "../layout/nav-desktop";
// import { LeftRail } from "./left-rail";

const STRIP_ONLY_ROUTES = new Set(["/palette"]);

export function DesktopStudio() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const openPanel = usePanel((state) => state.openPanel);
  const closePanel = usePanel((state) => state.closePanel);
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [prevRoute, setPrevRoute] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const isStripOnly = STRIP_ONLY_ROUTES.has(pathname);
  const isPicking = editingSlotIndex !== null;
  const activeTool = Object.values(SECTION_TOOLS)
    .flat()
    .find((tool) => tool.to === pathname);

  useEffect(() => {
    if (isStripOnly) closePanel("main-right");
    else openPanel("main-right");
  }, [pathname, isStripOnly, openPanel, closePanel]);

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

      <main className="bg-card h-full flex grow relative overflow-hidden" data-studio-shell>
        {/* ── 3-column body ── */}

        {/* Left rail */}
        {/* <LeftRail /> */}

        {/* Main content */}
        <main className="flex flex-1 h-full grow overflow-hidden relative">
          <PaletteStrip onEditSlot={handleEditSlot} />
        </main>

        {/* Right panel */}
        <Panel panelId={"main-right"} className="bg-background flex flex-col gap-4">
          <PanelHeader>
            <h2 className="text-xl font-bold">{activeTool?.label ?? "Tools"}</h2>
          </PanelHeader>
          <PanelContent>
            <Outlet />
          </PanelContent>
        </Panel>
      </main>
    </ShellProvider>
  );
}
