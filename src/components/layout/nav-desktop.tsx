/**
 * nav-desktop.tsx  — Phase 3 layout component
 *
 * The 4-section top navigation bar for the Desktop Studio layout (≥1024px).
 * Sections: PALETTE · ANALYZE · BUILD · EXPORT
 *
 * Each section routes to its primary tool and lights up active for all tools
 * within that section (via prefix matching).
 *
 * Sections map to the 14 consolidated tools from Phase 1:
 *   PALETTE → /palette
 *   ANALYZE → /accessibility, /scoring, /oklch-scatter
 *   BUILD   → /mixer, /gradient, /extract
 *   EXPORT  → /scale, /designsystem, /theme, /utility, /brand
 */

import { Link, useRouterState } from '@tanstack/react-router';

import { cn } from '@/lib/utils';

import { ThemeToggle } from '../common/theme-toggle';
import { ExportModal, SaveModal, ShareModal, ShortcutsModal } from '../modals';
import { useCommandPalette } from '../views/command-palette';

// ─── Section definitions ──────────────────────────────────────────────────────

interface SectionDef {
  id: string;
  label: string;
  primary: string; // primary route — navigated to when section is clicked
  routes: string[]; // all routes that belong to this section (for active detection)
  icon: string;
}

export const SECTIONS: SectionDef[] = [
  {
    id: 'create',
    label: 'Palette',
    icon: '✦',
    primary: '/palette',
    routes: ['/palette', '/picker'],
  },
  {
    id: 'analyze',
    label: 'Analyze',
    icon: '◎',
    primary: '/analyze/accessibility',
    routes: ['/analyze/accessibility', '/analyze/scoring', '/analyze/visualize', '/analyze/brand'],
  },
  {
    id: 'build',
    label: 'Build',
    icon: '⬡',
    primary: '/build/mixer',
    routes: ['/build/mixer', '/build/gradient', '/build/extract'],
  },
  {
    id: 'export',
    label: 'Export',
    icon: '↗',
    primary: '/export/scale',
    routes: ['/export/scale', '/export/designsystem', '/export/theme', '/export/utility'],
  },
];

// Routes where the palette owns the main area instead of the route view
export const PALETTE_ROUTES = new Set(['/', '/palette', '/picker']);

export function isPaletteRoute(pathname: string) {
  return PALETTE_ROUTES.has(pathname);
}

// ─── Section tools (for the dropdown sub-nav inside each section) ─────────────

export const SECTION_TOOLS: Record<string, { to: string; label: string }[]> = {
  create: [{ to: '/palette', label: 'Palette' }],
  analyze: [
    { to: '/analyze/accessibility', label: 'Accessibility' },
    { to: '/analyze/scoring', label: 'Score & Compare' },
    { to: '/analyze/visualize', label: 'Visualize' },
    { to: '/analyze/brand', label: 'Brand' },
  ],
  build: [
    { to: '/build/mixer', label: 'Mixer' },
    { to: '/build/gradient', label: 'Gradients' },
    { to: '/build/extract', label: 'Extract & Convert' },
  ],
  export: [
    { to: '/export/scale', label: 'Scales' },
    { to: '/export/designsystem', label: 'Tokens & Preview' },
    { to: '/export/theme', label: 'Theme' },
    { to: '/export/utility', label: 'Utility Colors' },
  ],
};

// ─── NavDesktop ───────────────────────────────────────────────────────────────

interface NavDesktopProps {
  /** Extra className — typically not needed */
  className?: string;
  /** Called when theme toggle is clicked */
  onThemeToggle?: () => void;
}

export function NavDesktop({ className, onThemeToggle }: NavDesktopProps) {
  const { setOpen: openPalette } = useCommandPalette();

  return (
    <header
      className={cn(
        'flex h-12 shrink-0 items-center gap-0 border-b border-border bg-card px-4',
        className,
      )}>
      <SectionTabs className='flex-1' />
      <SectionToolTabs className='mx-3 border-r border-l border-border px-3' />

      {/* Right: ⌘K + actions */}
      <div className='flex shrink-0 items-center gap-1.5'>
        <SearchButton onClick={() => openPalette(true)} />

        {/* Action buttons */}
        <ThemeToggle />
        <ShareModal />
        <SaveModal />
        <ExportModal />
        <ShortcutsModal />
      </div>
    </header>
  );
}

// ─── Shared nav pieces ────────────────────────────────────────────────────────────

function useActiveSection() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const section = SECTIONS.find((s) =>
    s.routes.some((r) => pathname.startsWith(r) || (r === '/palette' && pathname === '/')),
  );
  return { pathname, section };
}

/** Palette · Analyze · Build · Export section links */
export function SectionTabs({ className }: { className?: string }) {
  const { section: activeSection } = useActiveSection();

  return (
    <nav className={cn('flex h-full items-stretch', className)} aria-label='Sections'>
      {SECTIONS.map((section) => {
        const isActive = section.id === activeSection?.id;
        return (
          <Link
            key={section.id}
            to={section.primary as Parameters<typeof Link>[0]['to']}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'inline-flex items-center gap-1.5 px-4 text-[11px] font-bold tracking-[.07em]',
              'border-b-2 uppercase no-underline transition-colors',
              isActive
                ? 'border-b-primary text-foreground'
                : 'border-b-transparent text-muted-foreground hover:border-b-border hover:text-foreground',
            )}>
            <span className='text-sm leading-none'>{section.icon}</span>
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Tool links for the active section; scrolls sideways when space is tight */
export function SectionToolTabs({ className }: { className?: string }) {
  const { pathname, section: activeSection } = useActiveSection();
  const tools = activeSection ? SECTION_TOOLS[activeSection.id] : undefined;
  if (!tools || tools.length < 2) return null;

  return (
    <nav
      className={cn(
        'flex h-full min-w-0 [scrollbar-width:none] items-center gap-0.5 overflow-x-auto',
        className,
      )}
      aria-label={`${activeSection?.label} tools`}>
      {tools.map((tool) => {
        const isToolActive = pathname === tool.to || (tool.to === '/palette' && pathname === '/');
        return (
          <Link
            key={tool.to}
            to={tool.to as Parameters<typeof Link>[0]['to']}
            aria-current={isToolActive ? 'page' : undefined}
            className={cn(
              'inline-flex shrink-0 items-center rounded px-2 py-1 font-mono text-[10px]',
              'tracking-[.04em] whitespace-nowrap no-underline transition-colors',
              isToolActive
                ? 'bg-accent text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}>
            {tool.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** ⌘K command palette pill */
export function SearchButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-[10px]',
        'cursor-pointer tracking-[.04em] whitespace-nowrap transition-colors',
        'border-border bg-muted text-muted-foreground hover:border-input hover:text-foreground',
      )}
      title='Search tools (⌘K)'>
      <span className='opacity-70'>🔍</span>
      <span className='hidden lg:inline'>Search</span>
      <kbd className='ml-0.5 text-[8px] opacity-50'>⌘K</kbd>
    </button>
  );
}
