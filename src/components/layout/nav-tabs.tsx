/**
 * nav-tabs.tsx  — Phase 2 layout component
 *
 * Reusable tab bar used across all merged views.
 * Replaces the inline TabBar defined locally in each *.view.tsx file.
 *
 * Usage:
 *   <NavTabs<'score' | 'compare'>
 *     tabs={[
 *       { id: 'score',   label: 'Score'   },
 *       { id: 'compare', label: 'Compare' },
 *     ]}
 *     active={tab}
 *     onChange={setTab}
 *   />
 */

import { cn } from '@/lib/utils';

export interface TabDef<T extends string> {
  id: T;
  label: string;
  /** Optional badge — e.g. count or "NEW" */
  badge?: string | number;
  /** Tooltip */
  title?: string;
}

interface NavTabsProps<T extends string> {
  tabs: TabDef<T>[];
  active: T;
  onChange: (id: T) => void;
  /** Extra className on the container */
  className?: string;
}

export function NavTabs<T extends string>({ tabs, active, onChange, className }: NavTabsProps<T>) {
  return (
    <div className={cn('flex shrink-0 border-b border-border', className)} role='tablist'>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role='tab'
          aria-selected={active === tab.id}
          title={tab.title}
          onClick={() => onChange(tab.id)}
          className={cn(
            'inline-flex items-center gap-1.5 px-4 py-2.5 text-2xs font-bold',
            'cursor-pointer border-r border-border tracking-[.08em] uppercase transition-colors',
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset',
            active === tab.id
              ? '-mb-px border-b-2 border-b-primary bg-accent/30 text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}>
          {tab.label}
          {tab.badge !== undefined && (
            <span
              className={cn(
                'inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-2xs font-bold',
                active === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground',
              )}>
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
