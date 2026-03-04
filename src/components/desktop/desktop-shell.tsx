import { ShellProvider } from "@/providers/shell.provider";
import { useRef } from "react";
import { MainHeader } from "./header";
import { Panel, PanelContent, PanelHeader } from "../layout/panel";

export function DesktopStudio() {
  const rightPanel = useRef<HTMLElement>(null);
  return (
    <ShellProvider shell="studio">
      <main
        className="hidden bg-secondary dark:bg-background h-full lg:grid lg:grid-cols-[auto_1fr_auto] xl:grid-rows-[auto_1fr]"
        data-studio-shell
      >
        {/* ── Top nav ── */}
        <MainHeader />

        {/* ── 3-column body ── */}

        {/* Left rail */}
        <aside className="h-full col-start-1 row-start-2 w-18 p-2">
          <main className="h-full w-full rounded-md bg-card border border-border/30"></main>
        </aside>

        {/* Main content */}
        <main className="flex flex-1">
          <section className="flex flex-col grow"></section>
        </main>

        {/* Right panel */}
        <Panel panelId={"main-right"}>
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
