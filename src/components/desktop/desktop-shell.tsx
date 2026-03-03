import { ShellProvider } from "@/providers/shell.provider";
import { SidebarProvider } from "@/providers/sidebar.provider";
import { useRef } from "react";
import { MainHeader } from "./header";
import { Panel } from "./panel";

export function DesktopStudio() {
  const rightPanel = useRef<HTMLElement>(null);
  return (
    <SidebarProvider>
      <ShellProvider shell="studio">
        <main
          className="hidden h-full lg:grid lg:grid-cols-[auto_1fr_auto] xl:grid-rows-[auto_1fr]"
          data-studio-shell
        >
          {/* ── Top nav ── */}
          <MainHeader className="bg-blue-900"></MainHeader>

          {/* ── 3-column body ── */}

          {/* Left rail */}
          <aside className="h-full col-start-1 row-start-2 w-18 p-2">
            <main className="h-full w-full rounded-md bg-green-950"></main>
          </aside>

          {/* Main content */}
          <main className="flex flex-1">
            <section className="flex flex-col grow"></section>
          </main>

          {/* Right panel */}
          <Panel panelId={"main-right"}>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold">Project Pro</h2>
            </div>
            <main className="relative h-full grow overflow-hidden bg-amber-500">
              Here is some text Here is some text Here is some text Here is some
              text Here is some text
            </main>
          </Panel>
        </main>
      </ShellProvider>
    </SidebarProvider>
  );
}
