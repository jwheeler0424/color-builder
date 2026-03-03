/**
 * header.tsx
 *
 * Main Desktop Header
 */

import { cn } from "@/lib/utils";
import { useDrawerStore } from "@/stores/drawer.store";
import { Button } from "@/components/ui/button";
// ─── MainHeader ───────────────────────────────────────────────────────────────

interface MainHeaderProps {
  className?: string;
}

export function MainHeader({ className }: MainHeaderProps) {
  const toggleSidebar = useDrawerStore((state) => state.toggleSidebar);
  return (
    <header className={cn("h-16 col-start-1 col-span-3", className)}>
      <Button variant="ghost" onClick={toggleSidebar}>
        Toggle Sidebar
      </Button>
    </header>
  );
}
