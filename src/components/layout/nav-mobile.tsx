/**
 * nav-mobile.tsx  — Phase 5 layout component
 *
 * Mobile bottom tab bar with center Generate FAB.
 * Follows iOS Human Interface Guidelines and Material Design 3 bottom nav spec.
 *
 * 5 items: Create · Analyze · [⟳ FAB] · Build · Export
 * The center Generate FAB is elevated (shadow, primary color).
 *
 * Safe area: padding-bottom uses env(safe-area-inset-bottom) for iPhone home bar.
 * Touch target: minimum 44×44px per Apple HIG (stricter than Material's 48px).
 */

import { Link, useRouterState } from "@tanstack/react-router";
import { useChromaStore } from "@/hooks/use-chroma-store";
import { SECTIONS } from "./nav-desktop";
import { cn } from "@/lib/utils";

interface NavMobileProps {
  className?: string;
}

export function NavMobile({ className }: NavMobileProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const generate = useChromaStore((s) => s.generate);

  // Split sections around the FAB: 2 left, 2 right
  const leftSections = SECTIONS.slice(0, 2);
  const rightSections = SECTIONS.slice(2);

  return (
    <nav
      className={cn(
        "flex items-end justify-around bg-card border-t border-border shrink-0",
        "px-2",
        className,
      )}
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 8px), 8px)" }}
      aria-label="Main navigation"
    >
      {/* Left sections */}
      {leftSections.map((section) => {
        const isActive = section.routes.some((r) => pathname.startsWith(r));
        return (
          <Link
            key={section.id}
            to={section.primary as Parameters<typeof Link>[0]["to"]}
            className={cn(
              "flex flex-col items-center justify-center",
              "min-w-12 min-h-12 pt-2 pb-1",
              "no-underline transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <span className="text-[20px] leading-none mb-1">
              {section.icon}
            </span>
            <span className="text-[9px] font-bold tracking-[.04em]">
              {section.label}
            </span>
          </Link>
        );
      })}

      {/* Center Generate FAB */}
      <div className="flex flex-col items-center justify-end -mt-4 pb-1">
        <button
          onClick={generate}
          className={cn(
            "w-14 h-14 rounded-full",
            "bg-primary text-primary-foreground",
            "flex items-center justify-center",
            "text-[22px] font-bold leading-none",
            "shadow-lg shadow-primary/40",
            "active:scale-95 transition-all cursor-pointer border-0",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          )}
          title="Generate palette (Space)"
          aria-label="Generate new palette"
        >
          ⟳
        </button>
        <span className="text-[8px] text-muted-foreground mt-1 font-bold tracking-[.04em]">
          GEN
        </span>
      </div>

      {/* Right sections */}
      {rightSections.map((section) => {
        const isActive = section.routes.some((r) => pathname.startsWith(r));
        return (
          <Link
            key={section.id}
            to={section.primary as Parameters<typeof Link>[0]["to"]}
            className={cn(
              "flex flex-col items-center justify-center",
              "min-w-12 min-h-12 pt-2 pb-1",
              "no-underline transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <span className="text-[20px] leading-none mb-1">
              {section.icon}
            </span>
            <span className="text-[9px] font-bold tracking-[.04em]">
              {section.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
