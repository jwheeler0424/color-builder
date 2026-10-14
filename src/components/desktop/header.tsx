/**
 * header.tsx
 *
 * Main Desktop Header
 */

import {
  IconAdjustmentsHorizontal,
  IconDownload,
  IconDots,
  IconHeart,
  IconKeyboard,
  IconSearch,
  IconShare,
} from '@tabler/icons-react';
import { useNavigate } from '@tanstack/react-router';

import { MarketingResourcesNavigation } from '@/components/marketing/marketing-menu';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useChromaStore } from '@/hooks/use-chroma-store';
import { cn } from '@/lib/utils';

import { ThemeToggle } from '../common/theme-toggle';
import { SearchButton } from '../layout/nav-desktop';
import { BrandLockup } from '../logo-icon';
import { ExportModal, SaveModal, ShareModal, ShortcutsModal } from '../modals';
import { Separator } from '../ui/separator';
import { useCommandPalette } from '../views/command-palette';
// ─── MainHeader ───────────────────────────────────────────────────────────────
import { SectionNavigation } from './section-navigation';

interface MainHeaderProps {
  className?: string;
  brandVariant?: 'studio' | 'marketing';
}

function HeaderOptions({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  const { setOpen: openCommandPalette } = useCommandPalette();
  const openModal = useChromaStore((state) => state.openModal);
  const setSaveName = useChromaStore((state) => state.setSaveName);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant='ghost'
            size='icon-lg'
            title={compact ? 'More actions' : 'Options'}
            aria-label={compact ? 'More actions' : 'Options'}
            className={
              compact ? 'size-11 shrink-0 text-muted-foreground' : 'text-muted-foreground'
            }>
            {compact ? (
              <IconDots className='size-5' />
            ) : (
              <IconAdjustmentsHorizontal className='size-5' />
            )}
          </Button>
        }
      />
      <DropdownMenuContent align='end' className='w-48'>
        {compact && (
          <DropdownMenuItem onClick={() => openCommandPalette(true)}>
            <IconSearch />
            Search tools
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => openModal('share')}>
          <IconShare />
          Share palette
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            setSaveName('');
            openModal('save');
          }}>
          <IconHeart />
          Save palette
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openModal('export')}>
          <IconDownload />
          Export palette
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openModal('shortcuts')}>
          <IconKeyboard />
          Keyboard shortcuts
        </DropdownMenuItem>
        {compact && (
          <>
            <DropdownMenuSeparator />
            <ThemeToggle menuItem />
            <DropdownMenuItem onClick={() => void navigate({ to: '/sign-in' })}>
              Sign In
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void navigate({ to: '/sign-up' })}>
              Sign Up
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MainHeader({ className, brandVariant = 'studio' }: MainHeaderProps) {
  const navigate = useNavigate();
  const { setOpen: openCommandPalette } = useCommandPalette();
  return (
    <header
      data-slot='application-header'
      data-brand-variant={brandVariant}
      className={cn(
        'relative z-30 col-span-2 col-start-1 flex h-fit flex-col bg-background',
        className,
      )}>
      <div className='relative'>
        <div className='hidden h-16 items-center gap-3 border-b border-border/40 px-4 lg:flex'>
          <BrandLockup heading={brandVariant === 'studio'} variant={brandVariant} to='/' />
          <SectionNavigation className='min-w-0 flex-1 justify-center self-stretch' />
          <nav className='flex shrink-0 items-center gap-1'>
            <div className='hidden wide:block'>
              <SearchButton onClick={() => openCommandPalette(true)} />
            </div>
            <Button
              variant='ghost'
              size='icon-lg'
              title='Search tools'
              aria-label='Search tools'
              className='text-muted-foreground wide:hidden'
              onClick={() => openCommandPalette(true)}>
              <IconSearch className='size-4' aria-hidden='true' />
            </Button>
            <ThemeToggle />
            <HeaderOptions />
          </nav>
          <Separator
            orientation='vertical'
            className='h-8 bg-muted-foreground/60'
            style={{ alignSelf: 'center' }}
          />
          <nav className='flex shrink-0 items-center gap-1'>
            <section className='flex items-center gap-1'>
              <Button
                variant='ghost'
                size='sm'
                className='h-8 px-3 text-xs font-semibold'
                onClick={() => void navigate({ to: '/sign-in' })}>
                Sign In
              </Button>
              <Button
                variant='default'
                size='sm'
                className='h-8 px-3 text-xs font-semibold'
                onClick={() => void navigate({ to: '/sign-up' })}>
                Sign Up
              </Button>
            </section>
          </nav>
        </div>
        <div className='flex h-13 items-center gap-1 border-b border-border bg-background px-2 lg:hidden'>
          <BrandLockup compact variant={brandVariant} to='/' />
          <div className='flex-1' />
          <MarketingResourcesNavigation compact />
          <HeaderOptions compact />
        </div>
      </div>
      {brandVariant === 'marketing' && (
        <div className='hidden' aria-hidden='true'>
          <ShareModal />
          <SaveModal />
          <ExportModal />
          <ShortcutsModal />
        </div>
      )}
    </header>
  );
}
