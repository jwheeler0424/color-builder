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

import { Link, useRouterState } from '@tanstack/react-router';

import { useChromaStore } from '@/hooks/use-chroma-store';
import { cn } from '@/lib/utils';

import { SECTIONS } from './nav-desktop';

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
        'relative z-100 flex w-full shrink-0 items-end justify-around border-t border-border bg-transparent px-2',
        className,
      )}
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 8px), 8px)' }}
      aria-label='Main navigation'
      data-mobile-footer=''>
      {/* Left sections */}
      {leftSections.map((section) => {
        const isActive = section.routes.some((r) => pathname.startsWith(r));
        return (
          <Link
            key={section.id}
            to={section.primary as Parameters<typeof Link>[0]['to']}
            className={cn(
              'flex flex-col items-center justify-center',
              'min-h-12 min-w-12 pt-2 pb-1',
              'no-underline transition-colors',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset',
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
            aria-current={isActive ? 'page' : undefined}>
            <span className='mb-1 text-[20px] leading-none'>{section.icon}</span>
            <span className='text-[9px] font-bold tracking-[.04em]'>{section.label}</span>
          </Link>
        );
      })}

      {/* Center Generate FAB */}
      <div className='relative flex h-12 w-14 shrink-0 items-end justify-center'>
        <button
          onClick={generate}
          className={cn(
            'absolute top-0 left-1/2 z-101 h-14 w-14 -translate-x-1/2 -translate-y-7 rounded-full',
            'bg-primary text-primary-foreground',
            'flex items-center justify-center',
            'text-[22px] leading-none font-bold',
            'shadow-lg shadow-primary/40',
            'cursor-pointer border-0 transition-all active:scale-95',
            'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none',
          )}
          title='Generate palette (Space)'
          aria-label='Generate new palette'>
          ⟳
        </button>
      </div>
      <span className='absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] leading-3 font-bold tracking-[.04em] text-foreground'>
        GEN
      </span>

      {/* Right sections */}
      {rightSections.map((section) => {
        const isActive = section.routes.some((r) => pathname.startsWith(r));
        return (
          <Link
            key={section.id}
            to={section.primary as Parameters<typeof Link>[0]['to']}
            className={cn(
              'flex flex-col items-center justify-center',
              'min-h-12 min-w-12 pt-2 pb-1',
              'no-underline transition-colors',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset',
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
            aria-current={isActive ? 'page' : undefined}>
            <span className='mb-1 text-[20px] leading-none'>{section.icon}</span>
            <span className='text-[9px] font-bold tracking-[.04em]'>{section.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
