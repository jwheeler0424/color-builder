import { IconArrowUpRight, IconCheck, IconPalette } from '@tabler/icons-react';
import { Link, useRouterState } from '@tanstack/react-router';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const MARKETING_LINKS = [
  { to: '/overview', label: 'Overview' },
  { to: '/features', label: 'Features' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/api', label: 'Developer API' },
  { to: '/guides', label: 'Guides' },
  { to: '/support', label: 'Help center' },
  { to: '/data', label: 'Data & privacy' },
] as const;

function MarketingLinkItems() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <>
      {MARKETING_LINKS.map((item) => (
        <DropdownMenuItem
          key={item.to}
          render={<Link to={item.to as Parameters<typeof Link>[0]['to']} />}
          className='justify-between'>
          {item.label}
          {pathname === item.to ? (
            <IconCheck className='size-4' aria-hidden='true' />
          ) : (
            <IconArrowUpRight className='size-3.5 text-muted-foreground' aria-hidden='true' />
          )}
        </DropdownMenuItem>
      ))}
    </>
  );
}

export function MarketingPagesSubmenuItems() {
  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <IconPalette className='size-4' aria-hidden='true' />
          Explore Chroma
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent align='start' className='min-w-48'>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Pages &amp; resources</DropdownMenuLabel>
            <MarketingLinkItems />
          </DropdownMenuGroup>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </>
  );
}

export function MarketingPagesMenu({ compact = false }: { compact?: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant='ghost'
            size={compact ? 'icon-lg' : 'sm'}
            title='Explore Chroma pages and resources'
            aria-label='Explore Chroma pages and resources'
            className={compact ? 'text-muted-foreground' : 'gap-1.5 px-2.5 text-xs font-semibold'}>
            <IconPalette className='size-4' aria-hidden='true' />
            {!compact && <span>Explore</span>}
          </Button>
        }
      />
      <DropdownMenuContent align='end' className='w-52'>
        <DropdownMenuGroup>
          <DropdownMenuLabel>Pages &amp; resources</DropdownMenuLabel>
          <MarketingLinkItems />
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link to='/' />}>
          <IconArrowUpRight className='size-4' aria-hidden='true' />
          Open studio
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
