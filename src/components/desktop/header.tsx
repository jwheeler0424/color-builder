/**
 * header.tsx
 *
 * Main Desktop Header
 */

import { cn } from "@/lib/utils";
import { usePanelStore } from "@/stores/panel.store";
import { Button } from "@/components/ui/button";
// ─── MainHeader ───────────────────────────────────────────────────────────────

interface MainHeaderProps {
  className?: string;
}

export function MainHeader({ className }: MainHeaderProps) {
  const togglePanel = usePanelStore((state) => state.togglePanel);
  return (
    <header className={cn("h-16 col-start-1 col-span-3", className)}>
      <Button variant="ghost" onClick={() => togglePanel("main-right")}>
        Toggle Panel
      </Button>
    </header>
  );
}
