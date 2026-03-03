import { ShellProvider } from "@/providers/shell.provider";
import { SidebarProvider } from "@/providers/sidebar.provider";
import { useRef } from "react";
import { MainHeader } from "./header";
import { PanelDrawer } from "./panel-drawer";

export function DesktopStudio() {
  const rightPanel = useRef<HTMLElement>(null);
  return (
    <SidebarProvider>
      <ShellProvider shell="studio">
        <main
          className="hidden h-full lg:grid lg:grid-cols-[auto_1fr] xl:grid-rows-[auto_1fr]"
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
            {/* Right panel */}
            <PanelDrawer></PanelDrawer>
          </main>
        </main>
      </ShellProvider>
    </SidebarProvider>
  );
}
