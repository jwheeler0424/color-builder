import type { CSSProperties } from 'react';

import {
  IconBox,
  IconBook2,
  IconChevronRight,
  IconCode,
  IconFileText,
  IconHelpCircle,
  IconLayoutDashboard,
  IconShieldLock,
  IconSparkles,
  IconTag,
} from '@tabler/icons-react';
import { Link, useRouterState } from '@tanstack/react-router';

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
import { cn } from '@/lib/utils';

const MARKETING_LINKS = [
  {
    to: '/overview',
    label: 'Overview',
    navLabel: 'Overview',
    description: 'The product and the complete color workflow.',
    icon: IconLayoutDashboard,
  },
  {
    to: '/features',
    label: 'Features',
    navLabel: 'Features',
    description: 'Palette tools, accessibility analysis, themes, and exports.',
    icon: IconSparkles,
  },
  {
    to: '/pricing',
    label: 'Pricing',
    navLabel: 'Pricing',
    description: 'Compare Free, Pro, and Team plans.',
    icon: IconTag,
  },
  {
    to: '/api',
    label: 'Developer API',
    navLabel: 'API',
    description: 'Color generation, analysis, and API integration.',
    icon: IconCode,
  },
  {
    to: '/support',
    label: 'Help center',
    navLabel: 'Help',
    description: 'Guides and answers about palettes, contrast, exports, plans, and API access.',
    icon: IconHelpCircle,
  },
  {
    to: '/documentation',
    label: 'Documentation',
    navLabel: 'Docs',
    description: 'References for the application shell, design system, and styles.',
    icon: IconBook2,
  },
  {
    to: '/privacy',
    label: 'Privacy Policy',
    navLabel: 'Privacy',
    description: 'Information handling, browser storage, choices, and privacy rights.',
    icon: IconShieldLock,
  },
  {
    to: '/terms',
    label: 'Terms of Use',
    navLabel: 'Terms',
    description: 'Conditions for using the studio, your content, and available services.',
    icon: IconFileText,
  },
] as const;

const PAGE_GROUPS = [
  { label: 'Product and developers', pages: MARKETING_LINKS.slice(0, 4) },
  { label: 'Learning and support', pages: MARKETING_LINKS.slice(4) },
] as const;

export function MarketingResourcesMenuItem({
  kind = 'product',
  compact = false,
  className,
}: {
  kind?: 'product' | 'support';
  compact?: boolean;
  className?: string;
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isSupport = kind === 'support';
  const label = isSupport ? 'Support' : 'Product';
  const MenuIcon = isSupport ? IconHelpCircle : IconBox;
  const group = PAGE_GROUPS[isSupport ? 1 : 0];
  const currentPage = MARKETING_LINKS.find((item) => item.to === pathname);
  const isActive = group.pages.some((item) => item.to === pathname);
  const accent = isSupport
    ? 'text-(--section-support-ink) dark:text-(--section-support-accent)'
    : 'text-(--section-product-ink) dark:text-(--section-product-accent)';
  const accentColor = isSupport ? 'var(--section-support-accent)' : 'var(--section-product-accent)';
  const accentInkColor = isSupport ? 'var(--section-support-ink)' : 'var(--section-product-ink)';
  const accentSurface = isSupport
    ? 'bg-(--section-support-accent)/10'
    : 'bg-(--section-product-accent)/10';

  return (
    <NavigationMenuItem
      className='h-full'
      data-section={kind}
      style={
        {
          '--section-accent': accentColor,
          '--section-accent-ink': accentInkColor,
        } as CSSProperties
      }>
      <NavigationMenuTrigger
        aria-label={label}
        title={label}
        className={cn(
          studioNavigationTriggerClassName(isActive),
          compact && 'min-h-11 min-w-11 px-2 [&>svg:last-child]:hidden',
          className,
        )}>
        <MenuIcon className={cn('size-4 shrink-0', isActive && accent)} aria-hidden='true' />
        {!compact && <span className='relative top-0.5'>{label}</span>}
      </NavigationMenuTrigger>
      <NavigationMenuContent className='p-0'>
        <NavigationMenuPanel
          title={label}
          eyebrow={isSupport ? 'Learning & support' : 'Product & developers'}
          summary={
            isSupport
              ? 'Practical color guidance, answers to common questions, and clear data practices.'
              : 'Explore the studio, compare plans, and connect the color engine to your workflow.'
          }
          icon={MenuIcon}
          accent={accent}
          accentSurface={accentSurface}
          accentColor={accentColor}
          section={kind}
          contentLabel={group.label}
          countLabel={`${String(group.pages.length).padStart(2, '0')} pages`}
          sidebarFooter={
            <>
              <div className='flex items-center justify-between font-mono text-2xs text-foreground/65'>
                <span>Current page</span>
                <span>{currentPage ? 'Product site' : 'Studio'}</span>
              </div>
              <div className='mt-2 flex h-8 items-center gap-2 rounded border border-border/70 px-2 font-mono text-2xs text-foreground/65'>
                <MenuIcon className={cn('size-3.5 shrink-0', accent)} aria-hidden='true' />
                <span className='truncate'>{currentPage?.label ?? 'Color studio'}</span>
              </div>
            </>
          }
          footer={
            <Link
              to={isSupport ? '/support' : '/overview'}
              className={cn(
                'inline-flex items-center gap-1.5 text-xs font-medium underline-offset-4 transition-colors hover:underline',
                accent,
              )}>
              Open {label}
              <IconChevronRight className='size-3.5' aria-hidden='true' />
            </Link>
          }>
          <nav
            aria-label={`Chroma ${kind}`}
            className='col-span-full grid grid-cols-2 gap-1.5 max-sm:grid-cols-1'>
            {group.pages.map((item) => (
              <NavigationMenuLink
                key={item.to}
                render={
                  <Link
                    to={item.to}
                    aria-label={item.label}
                    aria-current={pathname === item.to ? 'page' : undefined}
                  />
                }
                active={pathname === item.to}
                closeOnClick
                className='group/tool grid min-h-18 min-w-0 grid-cols-[2.25rem_minmax(0,1fr)_1rem] items-center gap-3 rounded-md border border-transparent p-2.5 text-left transition-[background,border-color] hover:border-(--section-accent) hover:bg-muted/55 data-[active=true]:border-(--section-accent) data-[active=true]:bg-muted/45'>
                <span
                  className={cn(
                    'grid size-9 place-items-center rounded-md border border-border/70 transition-colors group-hover/tool:border-border',
                    accentSurface,
                    accent,
                  )}>
                  <item.icon className='size-4' aria-hidden='true' />
                </span>
                <span className='flex min-w-0 flex-col gap-0.5'>
                  <span className='truncate text-sm font-medium text-foreground'>{item.label}</span>
                  <span className='line-clamp-2 text-xs leading-4 text-foreground/65'>
                    {item.description}
                  </span>
                </span>
                <IconChevronRight
                  className='size-3.5 text-muted-foreground/50 transition-transform group-hover/tool:translate-x-0.5 group-hover/tool:text-foreground'
                  aria-hidden='true'
                />
              </NavigationMenuLink>
            ))}
          </nav>
        </NavigationMenuPanel>
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
}

export function MarketingResourcesNavigation({
  compact = false,
  variant = 'studio',
  className,
}: {
  compact?: boolean;
  variant?: 'studio' | 'marketing';
  className?: string;
}) {
  return (
    <NavigationMenu className={cn('w-auto flex-none self-stretch', className)}>
      <NavigationMenuList className='h-full flex-none'>
        <MarketingResourcesMenuItem
          compact={compact}
          className={
            variant === 'marketing' ? 'text-sm text-foreground normal-case' : undefined
          }
        />
        <MarketingResourcesMenuItem
          kind='support'
          compact={compact}
          className={
            variant === 'marketing' ? 'text-sm text-foreground normal-case' : undefined
          }
        />
      </NavigationMenuList>
    </NavigationMenu>
  );
}
