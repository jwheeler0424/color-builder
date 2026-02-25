/**
 * nav-rail.tsx  — Phase 4 layout component
 *
 * Material Design 3 navigation rail for the tablet layout (640–1023px).
 * Left-side, 64px wide, icons + labels.
 *
 * Shows 4 sections: Create · Analyze · Build · Export
 * Active section is highlighted with a rounded indicator pill (MD3 spec).
 * Tapping a section navigates to its primary route and triggers onSectionChange.
 *
 * MD3 spec references:
 * - Nav rail width: 80px (we use 64px for compactness)
 * - Active indicator: rounded pill, 56×32px
 * - Label: 12sp, centered below icon
 * - Touch target: 48×48px minimum (padded)
 */

import { Link, useRouterState } from "@tanstack/react-router";
import { SECTIONS } from "./nav-desktop";
import { cn } from "@/lib/utils";

interface NavRailProps {
  className?: string;
  /** Called when user taps a section — parent can sync panel state */
  onSectionChange?: (sectionId: string) => void;
}

export function NavRail({ className, onSectionChange }: NavRailProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      className={cn(
        "flex flex-col items-center w-16 bg-card border-r border-border shrink-0 py-2",
        "gap-1",
        className,
      )}
      aria-label="Section navigation"
    >
      {/* Brand mark */}
      <div className="w-12 h-12 flex items-center justify-center mb-1">
        <span className="font-black text-[18px] text-primary">◆</span>
      </div>

      {SECTIONS.map((section) => {
        const isActive = section.routes.some((r) => pathname.startsWith(r));
        return (
          <Link
            key={section.id}
            to={section.primary as Parameters<typeof Link>[0]["to"]}
            onClick={() => onSectionChange?.(section.id)}
            className={cn(
              "flex flex-col items-center justify-center w-14 rounded-xl no-underline",
              "transition-all duration-150 active:scale-95",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              // MD3 active indicator: 56×32px pill around icon
              isActive ? "py-1" : "py-1",
            )}
            aria-current={isActive ? "page" : undefined}
            title={section.label}
          >
            {/* Active indicator pill (MD3) */}
            <div
              className={cn(
                "w-14 h-8 flex items-center justify-center rounded-xl transition-colors mb-1",
                isActive ? "bg-secondary-foreground/10" : "hover:bg-accent/60",
              )}
            >
              <span
                className={cn(
                  "text-[18px] leading-none transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                {section.icon}
              </span>
            </div>
            {/* Label */}
            <span
              className={cn(
                "text-[9px] font-bold tracking-[.03em] text-center leading-none",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              {section.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
