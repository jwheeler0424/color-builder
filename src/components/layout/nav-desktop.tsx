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
 *   PALETTE → /
 *   ANALYZE → /accessibility, /scoring, /oklch-scatter
 *   BUILD   → /mixer, /gradient, /extract
 *   EXPORT  → /scale, /designsystem, /theme, /utility, /brand
 */

import type { ComponentType, CSSProperties } from 'react';

import {
  IconChartRadar,
  IconCheck,
  IconChevronDown,
  IconDownload,
  IconPalette,
  IconSearch,
  IconTools,
} from '@tabler/icons-react';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

import { useCommandModifier } from '../../hooks/use-command-modifier';
import { ThemeToggle } from '../common/theme-toggle';
import { ExportModal, SaveModal, ShareModal, ShortcutsModal } from '../modals';
import { Kbd } from '../ui/kbd';
import { useCommandPalette } from '../views/command-palette';

// ─── Section definitions ──────────────────────────────────────────────────────

interface SectionDef {
  id: string;
  label: string;
  primary: string; // primary route — navigated to when section is clicked
  routes: string[]; // all routes that belong to this section (for active detection)
  icon: ComponentType<{ className?: string }>;
}

export const SECTIONS: SectionDef[] = [
  {
    id: 'create',
    label: 'Palette',
    icon: IconPalette,
    primary: '/',
    routes: ['/', '/picker'],
  },
  {
    id: 'analyze',
    label: 'Analyze',
    icon: IconChartRadar,
    primary: '/analyze/accessibility',
    routes: ['/analyze/accessibility', '/analyze/scoring', '/analyze/visualize', '/analyze/brand'],
  },
  {
    id: 'build',
    label: 'Build',
    icon: IconTools,
    primary: '/build/mixer',
    routes: ['/build/theme', '/build/mixer', '/build/gradient', '/build/extract'],
  },
  {
    id: 'export',
    label: 'Export',
    icon: IconDownload,
    primary: '/export/scale',
    routes: ['/export/scale', '/export/designsystem', '/export/theme', '/export/utility'],
  },
];

export const SECTION_COLORS = {
  create: { light: 'var(--section-create-accent)', dark: 'var(--section-create-ink)' },
  analyze: { light: 'var(--section-analyze-accent)', dark: 'var(--section-analyze-ink)' },
  build: { light: 'var(--section-build-accent)', dark: 'var(--section-build-ink)' },
  export: { light: 'var(--section-export-accent)', dark: 'var(--section-export-ink)' },
  product: { light: 'var(--section-product-accent)', dark: 'var(--section-product-ink)' },
  support: { light: 'var(--section-support-accent)', dark: 'var(--section-support-ink)' },
} as const;

// Routes where the palette owns the main area instead of the route view
export const PALETTE_ROUTES = new Set(['/', '/picker']);

export function isPaletteRoute(pathname: string) {
  return PALETTE_ROUTES.has(pathname);
}

// ─── Section tools (for the dropdown sub-nav inside each section) ─────────────

export const SECTION_TOOLS: Record<string, { to: string; label: string }[]> = {
  create: [{ to: '/', label: 'Palette' }],
  analyze: [
    { to: '/analyze/accessibility', label: 'Accessibility' },
    { to: '/analyze/scoring', label: 'Score & Compare' },
    { to: '/analyze/visualize', label: 'Visualize' },
    { to: '/analyze/brand', label: 'Brand' },
  ],
  build: [
    { to: '/build/theme', label: 'Theme' },
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
}

export function NavDesktop({ className }: NavDesktopProps) {
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
    s.routes.some((r) => (r === '/' ? pathname === '/' : pathname.startsWith(r))),
  );
  return { pathname, section };
}

/** Compact switcher for tools within the current primary section. */
export function SectionToolMenu() {
  const { pathname, section } = useActiveSection();
  const navigate = useNavigate();
  const tools = section ? SECTION_TOOLS[section.id] : undefined;
  if (!section || !tools || tools.length < 2) return null;

  const activeTool = tools.find((tool) => pathname === tool.to) ?? tools[0]!;
  const colors = SECTION_COLORS[section.id as keyof typeof SECTION_COLORS];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant='ghost'
            size='sm'
            className='h-8 max-w-40 gap-2 px-2.5 font-mono text-[10px] text-(--section-accent-ink) hover:text-foreground dark:text-(--section-accent)'
            style={
              {
                '--section-accent': colors.light,
                '--section-accent-ink': colors.dark,
              } as CSSProperties
            }
            aria-label={`Choose ${section.label} tool`}>
            <span className='truncate'>{activeTool.label}</span>
            <IconChevronDown className='size-3 shrink-0' aria-hidden='true' />
          </Button>
        }
      />
      <DropdownMenuContent align='start' className='min-w-44'>
        {tools.map((tool) => {
          const isActive = pathname === tool.to;
          return (
            <DropdownMenuItem
              key={tool.to}
              onClick={() =>
                void navigate({ to: tool.to as Parameters<typeof navigate>[0]['to'] })
              }>
              <span className='flex-1'>{tool.label}</span>
              {isActive && <IconCheck className='size-4' aria-hidden='true' />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Palette · Analyze · Build · Export section links */
export function SectionTabs({ className }: { className?: string }) {
  const { section: activeSection } = useActiveSection();

  return (
    <nav className={cn('flex h-full items-stretch', className)} aria-label='Sections'>
      {SECTIONS.map((section) => {
        const isActive = section.id === activeSection?.id;
        const SectionIcon = section.icon;
        const colors = SECTION_COLORS[section.id as keyof typeof SECTION_COLORS];
        return (
          <Link
            key={section.id}
            to={section.primary as Parameters<typeof Link>[0]['to']}
            aria-current={isActive ? 'page' : undefined}
            style={
              {
                '--section-accent': colors.light,
                '--section-accent-ink': colors.dark,
              } as CSSProperties
            }
            className={cn(
              "relative inline-flex h-full items-center gap-1.5 px-2.5 text-[11px] font-bold tracking-[.07em] uppercase no-underline transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:content-[''] xl:px-4",
              isActive
                ? 'text-(--section-accent-ink) after:bg-(--section-accent) dark:text-(--section-accent)'
                : 'text-muted-foreground after:bg-transparent hover:text-(--section-accent-ink) hover:after:bg-(--section-accent) dark:hover:text-(--section-accent)',
            )}>
            <SectionIcon className='size-4' aria-hidden='true' />
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
export function SectionToolTabs({ className }: { className?: string }) {
  const { pathname, section: activeSection } = useActiveSection();
  const tools = activeSection ? SECTION_TOOLS[activeSection.id] : undefined;
  if (!activeSection || !tools || tools.length < 2) return null;
  const colors = SECTION_COLORS[activeSection.id as keyof typeof SECTION_COLORS];

  return (
    <nav
      className={cn(
        'flex h-full min-w-0 scrollbar-none items-center gap-0.5 overflow-x-auto',
        className,
      )}
      style={
        {
          '--section-accent': colors.light,
          '--section-accent-ink': colors.dark,
        } as CSSProperties
      }
      aria-label={`${activeSection?.label} tools`}>
      {tools.map((tool) => {
        const isToolActive = pathname === tool.to;
        return (
          <Link
            key={tool.to}
            to={tool.to as Parameters<typeof Link>[0]['to']}
            aria-current={isToolActive ? 'page' : undefined}
            className={cn(
              'inline-flex shrink-0 items-center rounded px-2 py-1 font-mono text-[10px]',
              'tracking-[.04em] whitespace-nowrap no-underline transition-colors',
              isToolActive
                ? 'bg-(--section-accent)/10 text-(--section-accent-ink) dark:text-(--section-accent)'
                : 'text-muted-foreground hover:text-(--section-accent-ink) dark:hover:text-(--section-accent)',
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
  const commandModifier = useCommandModifier();
  return (
    <button
      onClick={onClick}
      aria-label='Search tools'
      className={cn(
        'inline-flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-[10px]',
        'cursor-pointer tracking-[.04em] whitespace-nowrap transition-colors',
        'border-border bg-muted text-muted-foreground hover:border-input hover:text-foreground',
      )}
      title={`Search tools (${commandModifier}K)`}>
      <IconSearch className='size-3.5 opacity-70' aria-hidden='true' />
      <span className='hidden 2xl:inline'>Search</span>
      <Kbd className='ml-0.5 h-5 min-w-0 rounded border border-border/60 bg-background/50 px-1.5 font-mono text-[10px] font-medium text-foreground/75 shadow-none'>
        {commandModifier === '⌘' ? '⌘K' : 'Ctrl K'}
      </Kbd>
    </button>
  );
}
