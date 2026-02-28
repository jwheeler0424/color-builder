/**
 * header.tsx
 *
 * Main Desktop Header
 */

import { cn } from "@/lib/utils";
// ─── MainHeader ───────────────────────────────────────────────────────────────

interface MainHeaderProps {
  className?: string;
}

export function MainHeader({ className }: MainHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-center h-16 px-4 border-b border-border bg-card shrink-0 gap-0",
        className,
      )}
    ></header>
  );
}
