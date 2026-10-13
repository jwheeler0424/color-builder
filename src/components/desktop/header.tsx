/**
 * header.tsx
 *
 * Main Desktop Header
 */

import {
  IconAdjustmentsHorizontal,
  IconDownload,
  IconHeart,
  IconKeyboard,
  IconShare,
} from '@tabler/icons-react';
import { useNavigate } from '@tanstack/react-router';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
}

export function MainHeader({ className }: MainHeaderProps) {
  const navigate = useNavigate();
  const { setOpen: openCommandPalette } = useCommandPalette();
  const openModal = useChromaStore((state) => state.openModal);
  const setSaveName = useChromaStore((state) => state.setSaveName);
  return (
    <header
      className={cn(
        'relative z-30 col-span-2 col-start-1 flex h-fit flex-col bg-background',
        className,
      )}>
      <div className='relative'>
        <main className='flex h-16 items-center gap-3 border-b border-border/40 px-4'>
          <BrandLockup heading />
          <SectionNavigation className='min-w-0 flex-1 justify-center self-stretch' />
          <nav className='flex shrink-0 items-center gap-1'>
            <SearchButton onClick={() => openCommandPalette(true)} />
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant='ghost'
                    size='icon-lg'
                    title='Options'
                    aria-label='Options'
                    className='text-muted-foreground'>
                    <IconAdjustmentsHorizontal className='size-5' />
                  </Button>
                }
              />
              <DropdownMenuContent align='end' className='w-48'>
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
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
          <Separator
            orientation='vertical'
            className='h-8 bg-muted-foreground/60'
            style={{ alignSelf: 'center' }}
          />
          <nav className='flex shrink-0 items-center gap-2'>
            <section className='flex items-center gap-2'>
              <Button
                variant='ghost'
                size='lg'
                className='font-semibold tracking-wide'
                onClick={() => void navigate({ to: '/sign-in' })}>
                Sign In
              </Button>
              <Button
                variant='default'
                size='lg'
                className='font-semibold tracking-wide'
                onClick={() => void navigate({ to: '/sign-up' })}>
                Sign Up
              </Button>
            </section>
          </nav>
        </main>
      </div>
      <div className='hidden' aria-hidden='true'>
        <ShareModal />
        <SaveModal />
        <ExportModal />
        <ShortcutsModal />
      </div>
    </header>
  );
}
