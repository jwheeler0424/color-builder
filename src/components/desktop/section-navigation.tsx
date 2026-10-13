import type { ComponentType } from 'react';

import {
  IconAccessible,
  IconAdjustments,
  IconBrush,
  IconChartBar,
  IconChevronRight,
  IconColorSwatch,
  IconEye,
  IconGradienter,
  IconLayoutDashboard,
  IconPhoto,
  IconRulerMeasure,
  IconTrademark,
} from '@tabler/icons-react';
import { Link, useRouterState } from '@tanstack/react-router';

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { useChromaStore } from '@/hooks/use-chroma-store';
import { cn } from '@/lib/utils';

import { SECTIONS, SECTION_TOOLS } from '../layout/nav-desktop';

interface SectionNavigationProps {
  className?: string;
}

interface ToolPresentation {
  description: string;
  icon: ComponentType<{ className?: string }>;
}

const SECTION_PRESENTATION = {
  create: {
    eyebrow: 'Color studio',
    summary: 'Build a palette with character, balance, and room to explore.',
    accent: 'text-rose-300',
    accentSurface: 'bg-rose-300/10',
    accentColor: '#fb7185',
  },
  analyze: {
    eyebrow: 'Color intelligence',
    summary: 'Understand contrast, relationships, perception, and brand coherence.',
    accent: 'text-cyan-300',
    accentSurface: 'bg-cyan-300/10',
    accentColor: '#67e8f9',
  },
  build: {
    eyebrow: 'Creative workbench',
    summary: 'Mix, tune, extract, and shape colors into practical systems.',
    accent: 'text-amber-300',
    accentSurface: 'bg-amber-300/10',
    accentColor: '#fcd34d',
  },
  export: {
    eyebrow: 'Ready to ship',
    summary: 'Turn finished colors into scales, tokens, and implementation-ready themes.',
    accent: 'text-emerald-300',
    accentSurface: 'bg-emerald-300/10',
    accentColor: '#6ee7b7',
  },
} as const;

const TOOL_PRESENTATION: Record<string, ToolPresentation> = {
  '/analyze/accessibility': {
    description: 'Contrast and color-vision checks for every swatch.',
    icon: IconAccessible,
  },
  '/analyze/scoring': {
    description: 'Compare balance and strength across palettes.',
    icon: IconChartBar,
  },
  '/analyze/visualize': {
    description: 'Explore hue, chroma, lightness, and gamut.',
    icon: IconEye,
  },
  '/analyze/brand': {
    description: 'Shape a coherent system around a brand color.',
    icon: IconTrademark,
  },
  '/build/theme': {
    description: 'Tune light and dark roles for clear contrast.',
    icon: IconAdjustments,
  },
  '/build/mixer': {
    description: 'Blend colors and sample the space between them.',
    icon: IconColorSwatch,
  },
  '/build/gradient': {
    description: 'Compose smooth ramps with precise stops.',
    icon: IconGradienter,
  },
  '/build/extract': {
    description: 'Pull color from images and convert between spaces.',
    icon: IconPhoto,
  },
  '/export/scale': {
    description: 'Create useful shades from a single color or palette.',
    icon: IconRulerMeasure,
  },
  '/export/designsystem': {
    description: 'Review design tokens in a realistic interface.',
    icon: IconLayoutDashboard,
  },
  '/export/theme': {
    description: 'Package colors as ready-to-use theme variables.',
    icon: IconBrush,
  },
  '/export/utility': {
    description: 'Map your palette to utility color names.',
    icon: IconColorSwatch,
  },
};

export function SectionNavigation({ className }: SectionNavigationProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const slots = useChromaStore((state) => state.slots);
  const activeSection = SECTIONS.find((section) =>
    section.routes.some((route) => (route === '/' ? pathname === '/' : pathname.startsWith(route))),
  );

  return (
    <NavigationMenu
      delay={120}
      closeDelay={220}
      className={cn('min-w-0 flex-1 justify-center', className)}>
      <NavigationMenuList className='h-full flex-1 justify-center gap-0.5'>
        {SECTIONS.map((section, sectionIndex) => {
          const SectionIcon = section.icon;
          const isActive = section.id === activeSection?.id;
          const linkClassName = cn(
            "relative inline-flex h-full items-center justify-center gap-1 rounded-none border-b-2 border-transparent bg-transparent px-1 py-0 text-[11px] font-bold uppercase no-underline transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:content-[''] xl:px-3",
            isActive
              ? 'border-b-primary text-foreground after:bg-primary'
              : 'text-muted-foreground after:bg-transparent hover:border-b-border hover:text-foreground hover:after:bg-border',
          );
          if (section.id === 'create') {
            return (
              <NavigationMenuItem key={section.id} className='h-full'>
                <NavigationMenuLink
                  render={
                    <Link
                      to={section.primary as Parameters<typeof Link>[0]['to']}
                      aria-current={isActive ? 'page' : undefined}
                    />
                  }
                  active={isActive}
                  className={linkClassName}>
                  <SectionIcon className='size-4' aria-hidden='true' />
                  <span>{section.label}</span>
                </NavigationMenuLink>
              </NavigationMenuItem>
            );
          }
          const presentation =
            SECTION_PRESENTATION[section.id as keyof typeof SECTION_PRESENTATION];
          const tools = SECTION_TOOLS[section.id]!;

          return (
            <NavigationMenuItem key={section.id} className='h-full'>
              <NavigationMenuTrigger
                render={
                  <Link
                    to={section.primary as Parameters<typeof Link>[0]['to']}
                    aria-current={isActive ? 'page' : undefined}
                  />
                }
                className={linkClassName}>
                <SectionIcon className='size-4' aria-hidden='true' />
                <span>{section.label}</span>
              </NavigationMenuTrigger>
              <NavigationMenuContent className='p-0'>
                <div className='relative grid min-h-72 w-[min(56rem,calc(100vw-2rem))] grid-cols-[14.5rem_minmax(0,1fr)] overflow-hidden rounded-lg border border-border/80 bg-card'>
                  <span
                    className='pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5'
                    style={{ backgroundColor: presentation.accentColor }}
                    aria-hidden='true'
                  />
                  <aside className='flex flex-col border-r border-border bg-muted/20 p-5'>
                    <div className='flex items-center justify-between gap-4'>
                      <span className={cn('font-mono text-[10px] uppercase', presentation.accent)}>
                        {presentation.eyebrow}
                      </span>
                      <span
                        className={cn(
                          'grid size-9 place-items-center rounded-md border border-border/70',
                          presentation.accentSurface,
                          presentation.accent,
                        )}>
                        <SectionIcon className='size-5' aria-hidden='true' />
                      </span>
                    </div>
                    <div className='mt-7'>
                      <div className='flex items-baseline gap-2'>
                        <span className={cn('font-mono text-[10px]', presentation.accent)}>
                          {String(sectionIndex + 1).padStart(2, '0')}
                        </span>
                        <h2 className='text-xl leading-tight font-semibold text-foreground'>
                          {section.label}
                        </h2>
                      </div>
                      <p className='mt-2 max-w-56 text-sm leading-5 text-foreground/75'>
                        {presentation.summary}
                      </p>
                    </div>
                    <div className='mt-auto pt-6'>
                      <div className='flex items-center justify-between font-mono text-[10px] text-foreground/65'>
                        <span>Active palette</span>
                        <span>{slots.length} colors</span>
                      </div>
                      <div className='mt-2 flex h-8 overflow-hidden rounded border border-border/70'>
                        {slots.length > 0 ? (
                          slots
                            .slice(0, 8)
                            .map((slot) => (
                              <span
                                key={slot.id}
                                className='min-w-0 flex-1'
                                style={{ backgroundColor: slot.color.hex }}
                              />
                            ))
                        ) : (
                          <span className='flex flex-1 items-center justify-center bg-muted/50 font-mono text-[10px] text-muted-foreground'>
                            No colors yet
                          </span>
                        )}
                      </div>
                    </div>
                  </aside>
                  <section className='min-w-0 p-5'>
                    <div className='flex items-center justify-between border-b border-border/70 pb-3'>
                      <p className='font-mono text-[10px] text-foreground/65 uppercase'>
                        Destinations
                      </p>
                      <span className='font-mono text-[10px] text-foreground/55'>
                        {String(tools.length).padStart(2, '0')} tools
                      </span>
                    </div>
                    <div className='grid grid-cols-2 gap-1.5 pt-3'>
                      {tools.map((tool) => {
                        const toolPresentation = TOOL_PRESENTATION[tool.to];
                        const ToolIcon = toolPresentation.icon;
                        const isToolActive = pathname === tool.to;

                        return (
                          <NavigationMenuLink
                            key={tool.to}
                            render={<Link to={tool.to as Parameters<typeof Link>[0]['to']} />}
                            active={isToolActive}
                            closeOnClick
                            className='group/tool grid min-h-18 min-w-0 grid-cols-[2.25rem_minmax(0,1fr)_1rem] items-center gap-3 rounded-md border border-transparent p-2.5 transition-[background,border-color] hover:border-border/70 hover:bg-muted/55 data-[active=true]:border-border/80 data-[active=true]:bg-muted/45'>
                            <span
                              className={cn(
                                'grid size-9 place-items-center rounded-md border border-border/70 bg-card transition-colors group-hover/tool:border-border',
                                presentation.accentSurface,
                                presentation.accent,
                              )}>
                              <ToolIcon className='size-4' aria-hidden='true' />
                            </span>
                            <span className='flex min-w-0 flex-col gap-0.5'>
                              <span className='truncate text-sm font-medium text-foreground'>
                                {tool.label}
                              </span>
                              <span className='line-clamp-2 text-xs leading-4 text-foreground/65'>
                                {toolPresentation.description}
                              </span>
                            </span>
                            <IconChevronRight
                              className='size-3.5 text-muted-foreground/50 transition-transform group-hover/tool:translate-x-0.5 group-hover/tool:text-foreground'
                              aria-hidden='true'
                            />
                          </NavigationMenuLink>
                        );
                      })}
                    </div>
                    <div className='mt-3 flex items-center justify-between border-t border-border/70 pt-3'>
                      <span className='font-mono text-[10px] text-muted-foreground'>
                        CHROMA ELITE / {section.label.toUpperCase()}
                      </span>
                      <Link
                        to={section.primary as Parameters<typeof Link>[0]['to']}
                        className={cn(
                          'inline-flex items-center gap-1.5 text-xs font-medium text-foreground transition-colors hover:text-primary',
                          presentation.accent,
                        )}>
                        Open {section.label}
                        <IconChevronRight className='size-3.5' aria-hidden='true' />
                      </Link>
                    </div>
                  </section>
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>
          );
        })}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
