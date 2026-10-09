/**
 * nav-rail.tsx  — Phase 4 layout component
 *
 * Material Design 3 navigation rail for the tablet layout (640–1023px).
 * Left-side, 64px wide, icons + labels.
 *
 * Shows 4 sections: Palette · Analyze · Build · Export
 * Active section is highlighted with a rounded indicator pill (MD3 spec).
 * Tapping a section navigates to its primary route and triggers onSectionChange.
 *
 * MD3 spec references:
 * - Nav rail width: 80px (we use 64px for compactness)
 * - Active indicator: rounded pill, 56×32px
 * - Label: 12sp, centered below icon
 * - Touch target: 48×48px minimum (padded)
 */

import { Link, useRouterState } from '@tanstack/react-router';

import { cn } from '@/lib/utils';

import { SECTIONS } from './nav-desktop';

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
        'flex w-16 shrink-0 flex-col items-center border-r border-border bg-card py-2',
        'gap-1',
        className,
      )}
      aria-label='Section navigation'>
      {/* Brand mark */}
      <div className='mb-1 flex h-12 w-12 items-center justify-center'>
        <span className='text-[18px] font-black text-primary'>◆</span>
      </div>

      {SECTIONS.map((section) => {
        const isActive = section.routes.some((r) => pathname.startsWith(r));
        return (
          <Link
            key={section.id}
            to={section.primary as Parameters<typeof Link>[0]['to']}
            onClick={() => onSectionChange?.(section.id)}
            className={cn(
              'flex w-14 flex-col items-center justify-center rounded-xl no-underline',
              'transition-all duration-150 active:scale-95',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              // MD3 active indicator: 56×32px pill around icon
              isActive ? 'py-1' : 'py-1',
            )}
            aria-current={isActive ? 'page' : undefined}
            title={section.label}>
            {/* Active indicator pill (MD3) */}
            <div
              className={cn(
                'mb-1 flex h-8 w-14 items-center justify-center rounded-xl transition-colors',
                isActive ? 'bg-secondary-foreground/10' : 'hover:bg-accent/60',
              )}>
              <span
                className={cn(
                  'text-[18px] leading-none transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )}>
                {section.icon}
              </span>
            </div>
            {/* Label */}
            <span
              className={cn(
                'text-center text-[9px] leading-none font-bold tracking-[.03em]',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )}>
              {section.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
