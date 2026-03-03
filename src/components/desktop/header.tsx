/**
 * header.tsx
 *
 * Main Desktop Header
 */

import { cn } from "@/lib/utils";
import { usePanel } from "../layout/panel";
import { Button } from "@/components/ui/button";
// ─── MainHeader ───────────────────────────────────────────────────────────────

interface MainHeaderProps {
  className?: string;
}

export function MainHeader({ className }: MainHeaderProps) {
  const togglePanel = usePanel((state) => state.togglePanel);
  return (
    <header className={cn("h-16 col-start-1 col-span-3", className)}>
      <Button variant="ghost" onClick={() => togglePanel("main-right")}>
        Toggle Panel
      </Button>
    </header>
  );
}
