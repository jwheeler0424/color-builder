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
    <header className={cn("h-16 col-start-1 col-span-3", className)}></header>
  );
}
