import { ShellProvider } from "@/providers/shell.provider";
import { useRef } from "react";

export function DesktopStudio() {
  const rightPanel = useRef<HTMLElement>(null);
  return (
    <ShellProvider shell="studio">
      <main
        className="hidden h-full xl:grid xl:grid-cols-[auto_1fr_auto] xl:grid-rows-[auto_1fr]"
        data-studio-shell
      >
        {/* ── Top nav ── */}
        <header className="h-16 col-start-1 col-span-3 bg-blue-900"></header>

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
  );
}
