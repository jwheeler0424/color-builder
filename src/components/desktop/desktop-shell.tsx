import { ShellProvider } from "@/providers/shell.provider";
import { SidebarProvider } from "@/providers/sidebar.provider";
import { useRef } from "react";
import { MainHeader } from "./header";

export function DesktopStudio() {
  const rightPanel = useRef<HTMLElement>(null);
  return (
    <SidebarProvider>
      <ShellProvider shell="studio">
        <main
          className="hidden h-full xl:grid xl:grid-cols-[auto_1fr_auto] xl:grid-rows-[auto_1fr]"
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

          <main className="flex flex-1 flex-col gap-4 p-4"></main>

          {/* Right panel */}
          <aside
            ref={rightPanel}
            className="relative overflow-hidden h-full col-start-3 row-start-2 bg-green-950"
          ></aside>
        </main>
      </ShellProvider>
    </SidebarProvider>
  );
}
