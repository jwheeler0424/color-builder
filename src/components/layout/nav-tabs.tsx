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

import { cn } from "@/lib/utils";

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

export function NavTabs<T extends string>({
  tabs,
  active,
  onChange,
  className,
}: NavTabsProps<T>) {
  return (
    <div
      className={cn("flex border-b border-border shrink-0", className)}
      role="tablist"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={active === tab.id}
          title={tab.title}
          onClick={() => onChange(tab.id)}
          className={cn(
            "inline-flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-bold",
            "tracking-[.08em] uppercase border-r border-border cursor-pointer transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
            active === tab.id
              ? "text-foreground border-b-2 border-b-primary bg-accent/30 -mb-px"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
          {tab.badge !== undefined && (
            <span
              className={cn(
                "inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full text-[8px] font-bold",
                active === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
