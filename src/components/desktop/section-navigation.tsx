import type { ComponentType, CSSProperties } from 'react';

import {
  IconAccessible,
  IconAdjustments,
  IconBrush,
  IconChartBar,
  IconChevronRight,
  IconColorSwatch,
  IconEye,
  IconGradienter,
  IconHeart,
  IconKeyboard,
  IconLayoutDashboard,
  IconPhoto,
  IconRulerMeasure,
  IconRefresh,
  IconShare,
  IconTrademark,
} from '@tabler/icons-react';
import { Link, useRouterState } from '@tanstack/react-router';

import { MarketingResourcesMenuItem } from '@/components/marketing/marketing-menu';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuPanel,
  NavigationMenuTrigger,
  studioNavigationTriggerClassName,
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

interface MenuEntry extends ToolPresentation {
  label: string;
  to?: string;
  onClick?: () => void;
  disabled?: boolean;
}

const SECTION_PRESENTATION = {
  create: {
    eyebrow: 'Color studio',
    summary: 'Build a palette with character, balance, and room to explore.',
    accent: 'text-(--section-create-ink) dark:text-(--section-create-accent)',
    accentSurface: 'bg-(--section-create-accent)/10',
    accentColor: 'var(--section-create-accent)',
    accentInkColor: 'var(--section-create-ink)',
  },
  analyze: {
    eyebrow: 'Color intelligence',
    summary: 'Understand contrast, relationships, perception, and brand coherence.',
    accent: 'text-(--section-analyze-ink) dark:text-(--section-analyze-accent)',
    accentSurface: 'bg-(--section-analyze-accent)/10',
    accentColor: 'var(--section-analyze-accent)',
    accentInkColor: 'var(--section-analyze-ink)',
  },
  build: {
    eyebrow: 'Creative workbench',
    summary: 'Mix, tune, extract, and shape colors into practical systems.',
    accent: 'text-(--section-build-ink) dark:text-(--section-build-accent)',
    accentSurface: 'bg-(--section-build-accent)/10',
    accentColor: 'var(--section-build-accent)',
    accentInkColor: 'var(--section-build-ink)',
  },
  export: {
    eyebrow: 'Ready to ship',
    summary: 'Turn finished colors into scales, tokens, and implementation-ready themes.',
    accent: 'text-(--section-export-ink) dark:text-(--section-export-accent)',
    accentSurface: 'bg-(--section-export-accent)/10',
    accentColor: 'var(--section-export-accent)',
    accentInkColor: 'var(--section-export-ink)',
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
  const generate = useChromaStore((state) => state.generate);
  const generationPending = useChromaStore((state) => state.generationPending);
  const openModal = useChromaStore((state) => state.openModal);
  const setSaveName = useChromaStore((state) => state.setSaveName);
  const paletteActions: MenuEntry[] = [
    {
      label: 'Generate palette',
      description: 'Explore a fresh palette while keeping your locked colors.',
      icon: IconRefresh,
      onClick: () => generate(),
      disabled: generationPending,
    },
    {
      label: 'Save palette',
      description: 'Give your current palette a name and save a copy.',
      icon: IconHeart,
      onClick: () => {
        setSaveName('');
        openModal('save');
      },
    },
    {
      label: 'Share palette',
      description: 'Create a link to the colors you are working with.',
      icon: IconShare,
      onClick: () => openModal('share'),
    },
    {
      label: 'Keyboard shortcuts',
      description: 'Keep the studio commands you use most close at hand.',
      icon: IconKeyboard,
      onClick: () => openModal('shortcuts'),
    },
  ];
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
          const presentation =
            SECTION_PRESENTATION[section.id as keyof typeof SECTION_PRESENTATION];
          const sectionStyle = {
            '--section-accent': presentation.accentColor,
            '--section-accent-ink': presentation.accentInkColor,
          } as CSSProperties;
          const linkClassName = studioNavigationTriggerClassName(isActive);
          const isPalette = section.id === 'create';
          const tools: MenuEntry[] = isPalette
            ? paletteActions
            : SECTION_TOOLS[section.id]!.map((tool) => ({
                ...tool,
                ...TOOL_PRESENTATION[tool.to]!,
              }));

          return (
            <NavigationMenuItem
              key={section.id}
              className='h-full'
              data-section={section.id}
              style={sectionStyle}>
              <NavigationMenuTrigger
                nativeButton={false}
                render={
                  <Link
                    to={section.primary as Parameters<typeof Link>[0]['to']}
                    aria-current={isActive ? 'page' : undefined}
                  />
                }
                className={linkClassName}>
                <SectionIcon
                  className={cn('size-4', isActive && presentation.accent)}
                  aria-hidden='true'
                />
                <span className='relative top-0.5'>{section.label}</span>
              </NavigationMenuTrigger>
              <NavigationMenuContent className='p-0'>
                <NavigationMenuPanel
                  title={section.label}
                  number={String(sectionIndex + 1).padStart(2, '0')}
                  eyebrow={presentation.eyebrow}
                  summary={presentation.summary}
                  icon={SectionIcon}
                  accent={presentation.accent}
                  accentSurface={presentation.accentSurface}
                  accentColor={presentation.accentColor}
                  section={section.id}
                  contentLabel={isPalette ? 'Palette actions' : 'Destinations'}
                  countLabel={`${String(tools.length).padStart(2, '0')} ${isPalette ? 'actions' : 'tools'}`}
                  sidebarFooter={
                    <>
                      <div className='flex items-center justify-between font-mono text-2xs text-foreground/65'>
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
                          <span className='flex flex-1 items-center justify-center bg-muted/50 font-mono text-2xs text-muted-foreground'>
                            No colors yet
                          </span>
                        )}
                      </div>
                    </>
                  }
                  footer={
                    <Link
                      to={section.primary as Parameters<typeof Link>[0]['to']}
                      className={cn(
                        'inline-flex items-center gap-1.5 text-xs font-medium underline-offset-4 transition-colors hover:underline',
                        presentation.accent,
                      )}>
                      Open {section.label}
                      <IconChevronRight className='size-3.5' aria-hidden='true' />
                    </Link>
                  }>
                  {tools.map((tool) => {
                    const ToolIcon = tool.icon;
                    const isToolActive = tool.to !== undefined && pathname === tool.to;

                    return (
                      <NavigationMenuLink
                        key={tool.to ?? tool.label}
                        render={
                          tool.to ? (
                            <Link to={tool.to as Parameters<typeof Link>[0]['to']} />
                          ) : (
                            <button
                              type='button'
                              aria-label={tool.label}
                              disabled={tool.disabled}
                              onClick={tool.onClick}
                            />
                          )
                        }
                        active={isToolActive}
                        closeOnClick
                        className='group/tool grid min-h-18 min-w-0 grid-cols-[2.25rem_minmax(0,1fr)_1rem] items-center gap-3 rounded-md border border-transparent p-2.5 text-left transition-[background,border-color] hover:border-(--section-accent) hover:bg-muted/55 disabled:pointer-events-none disabled:opacity-50 data-[active=true]:border-(--section-accent) data-[active=true]:bg-muted/45'>
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
                            {tool.description}
                          </span>
                        </span>
                        <IconChevronRight
                          className='size-3.5 text-muted-foreground/50 transition-transform group-hover/tool:translate-x-0.5 group-hover/tool:text-foreground'
                          aria-hidden='true'
                        />
                      </NavigationMenuLink>
                    );
                  })}
                </NavigationMenuPanel>
              </NavigationMenuContent>
            </NavigationMenuItem>
          );
        })}
        <MarketingResourcesMenuItem />
        <MarketingResourcesMenuItem kind='support' />
      </NavigationMenuList>
    </NavigationMenu>
  );
}
