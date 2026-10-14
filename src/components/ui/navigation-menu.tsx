import { NavigationMenu as NavigationMenuPrimitive } from '@base-ui/react/navigation-menu';
import { IconChevronDown as ChevronDownIcon } from '@tabler/icons-react';
import { cva } from 'class-variance-authority';

import { cn } from '@/lib/utils';

function studioNavigationTriggerClassName(active = false) {
  return cn(
    "relative inline-flex h-full items-center justify-center gap-0.5 rounded-none bg-transparent px-0 py-0 text-[11px] font-bold uppercase no-underline transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:content-[''] xl:gap-1.5 xl:px-3 [&>svg:last-child]:top-0",
    active
      ? 'text-(--section-accent-ink) after:bg-(--section-accent) dark:text-(--section-accent)'
      : 'text-muted-foreground after:bg-transparent hover:text-(--section-accent-ink) hover:after:bg-(--section-accent) dark:hover:text-(--section-accent)',
  );
}

type NavigationMenuPanelProps = {
  title: string;
  number?: string;
  eyebrow: string;
  summary: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  accentSurface: string;
  accentColor: string;
  section: string;
  contentLabel: string;
  countLabel: string;
  sidebarFooter: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
};

function NavigationMenuPanel({
  title,
  number,
  eyebrow,
  summary,
  icon: PanelIcon,
  accent,
  accentSurface,
  accentColor,
  section,
  contentLabel,
  countLabel,
  sidebarFooter,
  footer,
  children,
}: NavigationMenuPanelProps) {
  return (
    <div
      data-slot='navigation-menu-panel'
      data-section={section}
      style={{ '--section-accent': accentColor } as React.CSSProperties}
      className='relative grid max-h-(--available-height) min-h-72 w-[min(56rem,calc(100vw-2rem))] grid-cols-[14.5rem_minmax(0,1fr)] overflow-y-auto rounded-lg border border-border/80 bg-card max-sm:min-h-0 max-sm:grid-cols-1 sm:h-80'>
      <span
        className='pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5'
        style={{ backgroundColor: 'var(--section-accent)' }}
        aria-hidden='true'
      />
      <aside className='flex flex-col border-r border-border bg-muted/20 p-5 max-sm:border-r-0 max-sm:border-b'>
        <div className='flex items-center justify-between gap-4'>
          <span className={cn('font-mono text-[10px] uppercase', accent)}>{eyebrow}</span>
          <span
            className={cn(
              'grid size-9 place-items-center rounded-md border border-border/70',
              accentSurface,
              accent,
            )}>
            <PanelIcon className='size-5' aria-hidden='true' />
          </span>
        </div>
        <div className='mt-7 max-sm:mt-3'>
          <div className='flex items-baseline gap-2'>
            {number && <span className={cn('font-mono text-[10px]', accent)}>{number}</span>}
            <h2 className='text-xl leading-tight font-semibold text-foreground'>{title}</h2>
          </div>
          <p className='mt-2 max-w-56 text-sm leading-5 text-foreground/75'>{summary}</p>
        </div>
        <div className='mt-auto pt-6 max-sm:hidden'>{sidebarFooter}</div>
      </aside>
      <section className='flex min-w-0 flex-col p-5'>
        <div className='flex items-center justify-between border-b border-border/70 pb-3'>
          <p className='font-mono text-[10px] text-foreground/65 uppercase'>{contentLabel}</p>
          <span className='font-mono text-[10px] text-foreground/55'>{countLabel}</span>
        </div>
        <div className='grid grid-cols-2 gap-1.5 pt-3 max-sm:grid-cols-1'>{children}</div>
        <div
          data-slot='navigation-menu-panel-footer'
          className='mt-auto flex items-center justify-between gap-3 border-t border-border/70 pt-3'>
          <span className='font-mono text-[10px] text-muted-foreground'>
            CHROMA ELITE / {title.toUpperCase()}
          </span>
          {footer}
        </div>
      </section>
    </div>
  );
}

function NavigationMenu({ className, children, ...props }: NavigationMenuPrimitive.Root.Props) {
  return (
    <NavigationMenuPrimitive.Root
      data-slot='navigation-menu'
      className={cn(
        'group/navigation-menu relative flex w-full min-w-0 flex-1 items-center justify-center',
        className,
      )}
      {...props}>
      {children}
      <NavigationMenuPositioner />
    </NavigationMenuPrimitive.Root>
  );
}

function NavigationMenuList({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof NavigationMenuPrimitive.List>) {
  return (
    <NavigationMenuPrimitive.List
      data-slot='navigation-menu-list'
      className={cn('group flex flex-1 list-none items-center justify-center gap-0', className)}
      {...props}
    />
  );
}

function NavigationMenuItem({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof NavigationMenuPrimitive.Item>) {
  return (
    <NavigationMenuPrimitive.Item
      data-slot='navigation-menu-item'
      className={cn('relative', className)}
      {...props}
    />
  );
}

const navigationMenuTriggerStyle = cva(
  'bg-background hover:bg-muted focus:bg-muted data-open:hover:bg-muted data-open:focus:bg-muted data-open:bg-muted/50 focus-visible:ring-ring/50 data-popup-open:bg-muted/50 data-popup-open:hover:bg-muted rounded-md px-4 py-2 text-sm font-medium transition-all focus-visible:ring-[3px] focus-visible:outline-1 disabled:opacity-50 group/navigation-menu-trigger inline-flex h-9 w-max items-center justify-center disabled:pointer-events-none outline-none',
);

function NavigationMenuTrigger({
  className,
  children,
  ...props
}: NavigationMenuPrimitive.Trigger.Props) {
  return (
    <NavigationMenuPrimitive.Trigger
      data-slot='navigation-menu-trigger'
      className={cn(navigationMenuTriggerStyle(), 'group', className)}
      {...props}>
      {children}{' '}
      <ChevronDownIcon
        className='relative top-px ml-1 size-3 transition duration-300 group-data-open/navigation-menu-trigger:rotate-180 group-data-popup-open/navigation-menu-trigger:rotate-180'
        aria-hidden='true'
      />
    </NavigationMenuPrimitive.Trigger>
  );
}

function NavigationMenuContent({ className, ...props }: NavigationMenuPrimitive.Content.Props) {
  return (
    <NavigationMenuPrimitive.Content
      data-slot='navigation-menu-content'
      className={cn(
        'group-data-[viewport=false]/navigation-menu: h-full w-auto p-2 pr-2.5 ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[viewport=false]/navigation-menu:rounded-md group-data-[viewport=false]/navigation-menu:bg-popover group-data-[viewport=false]/navigation-menu:text-popover-foreground group-data-[viewport=false]/navigation-menu:shadow group-data-[viewport=false]/navigation-menu:ring-1 group-data-[viewport=false]/navigation-menu:ring-foreground/10 group-data-[viewport=false]/navigation-menu:transition-[opacity,transform] group-data-[viewport=false]/navigation-menu:duration-300 group-data-[viewport=false]/navigation-menu:data-ending-style:scale-95 group-data-[viewport=false]/navigation-menu:data-ending-style:opacity-0 group-data-[viewport=false]/navigation-menu:data-starting-style:scale-95 group-data-[viewport=false]/navigation-menu:data-starting-style:opacity-0 data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52 data-[motion^=from-]:animate-in data-[motion^=from-]:fade-in data-[motion^=to-]:animate-out data-[motion^=to-]:fade-out **:data-[slot=navigation-menu-link]:focus:ring-0 **:data-[slot=navigation-menu-link]:focus:outline-none',
        className,
      )}
      {...props}
    />
  );
}

function NavigationMenuPositioner({
  className,
  side = 'bottom',
  sideOffset = 8,
  align = 'start',
  alignOffset = 0,
  ...props
}: NavigationMenuPrimitive.Positioner.Props) {
  return (
    <NavigationMenuPrimitive.Portal>
      <NavigationMenuPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        className={cn(
          'isolate z-50 h-(--positioner-height) w-(--positioner-width) max-w-(--available-width) transition-[top,left,right,bottom] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] data-instant:transition-none data-[side=bottom]:before:-top-2.5 data-[side=bottom]:before:right-0 data-[side=bottom]:before:left-0',
          className,
        )}
        {...props}>
        <NavigationMenuPrimitive.Popup className='relative h-(--popup-height) w-(--popup-width) origin-(--transform-origin) rounded-lg bg-popover text-popover-foreground shadow ring-1 ring-foreground/10 transition-all ease-[cubic-bezier(0.22,1,0.36,1)] outline-none data-ending-style:scale-90 data-ending-style:opacity-0 data-ending-style:duration-150 data-starting-style:scale-90 data-starting-style:opacity-0 xs:w-(--popup-width)'>
          <NavigationMenuPrimitive.Viewport className='relative size-full overflow-hidden' />
        </NavigationMenuPrimitive.Popup>
      </NavigationMenuPrimitive.Positioner>
    </NavigationMenuPrimitive.Portal>
  );
}

function NavigationMenuLink({ className, ...props }: NavigationMenuPrimitive.Link.Props) {
  return (
    <NavigationMenuPrimitive.Link
      data-slot='navigation-menu-link'
      className={cn(
        "flex items-center gap-1.5 rounded-sm p-2 text-sm transition-all outline-none hover:bg-muted focus:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 data-[active=true]:bg-muted/50 data-[active=true]:hover:bg-muted data-[active=true]:focus:bg-muted [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function NavigationMenuIndicator({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof NavigationMenuPrimitive.Icon>) {
  return (
    <NavigationMenuPrimitive.Icon
      data-slot='navigation-menu-indicator'
      className={cn(
        'top-full z-1   flex h-1.5 items-end justify-center overflow-hidden data-ending-style:opacity-0 data-starting-style:opacity-0',
        className,
      )}
      {...props}>
      <div className='relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm bg-border shadow-md' />
    </NavigationMenuPrimitive.Icon>
  );
}

export {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
  NavigationMenuPositioner,
  NavigationMenuPanel,
  studioNavigationTriggerClassName,
};
