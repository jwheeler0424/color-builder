/**
 * header.tsx
 *
 * Main Desktop Header
 */

import { Link } from '@tanstack/react-router';
import { PanelRightIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { ThemeToggle } from '../common/theme-toggle';
import { SearchButton, SectionTabs, SectionToolTabs } from '../layout/nav-desktop';
import { LogoIcon } from '../logo-icon';
import { ExportModal, SaveModal, ShareModal, ShortcutsModal } from '../modals';
import { usePanel } from '../panel';
import { Separator } from '../ui/separator';
import { useCommandPalette } from '../views/command-palette';

// ─── MainHeader ───────────────────────────────────────────────────────────────

interface MainHeaderProps {
  className?: string;
}

export function MainHeader({ className }: MainHeaderProps) {
  const togglePanel = usePanel((state) => state.togglePanel);
  const panelOpen = usePanel((state) => state.panels['panel-main-right']?.open ?? false);
  const { setOpen: openCommandPalette } = useCommandPalette();
  return (
    <header
      className={cn(
        'relative z-30 col-span-2 col-start-1 flex h-fit flex-col bg-background',
        className,
      )}>
      <div className='relative'>
        <main className='flex h-16 items-center justify-between gap-8 border-b border-border/40 px-4'>
          <Link to='/' className='flex items-center gap-2'>
            <LogoIcon className='size-8' />

            <h1 className='flex items-center gap-0.5 pt-1 font-display text-3xl leading-10 font-black'>
              Chroma
              <sup className='font-sans text-xl font-normal text-primary'>ELITE</sup>
            </h1>
          </Link>
          <SectionTabs className='self-stretch' />
          <nav className='flex items-center gap-4'>
            <Separator orientation='vertical' className='bg-muted-foreground' />
            <section className='flex items-center gap-2'>
              <Button variant='ghost' size='lg' className={'font-semibold tracking-wide'}>
                Sign In
              </Button>
              <Button variant='default' size='lg' className={'font-semibold tracking-wide'}>
                Sign Up
              </Button>
            </section>
          </nav>
        </main>
      </div>
      <section className='flex h-14 items-stretch justify-between gap-4 border-b border-border/30 px-4'>
        <SectionToolTabs className='-ml-2' />
        <nav className='flex shrink-0 items-center justify-end gap-4'>
          <main className='flex h-full items-center gap-4'>
            <SearchButton onClick={() => openCommandPalette(true)} />
            {/* Action buttons */}
            <ThemeToggle />
            <ShareModal />
            <SaveModal />
            <ExportModal />
            <ShortcutsModal />
          </main>
          <aside className='flex h-full items-center gap-4'>
            <Button
              variant='ghost'
              size={'icon-lg'}
              onClick={() => togglePanel('main-right')}
              className='text-muted-foreground'
              aria-label={panelOpen ? 'Hide palette panel' : 'Show palette panel'}
              aria-expanded={panelOpen}
              title={panelOpen ? 'Hide palette panel' : 'Show palette panel'}>
              <PanelRightIcon className='size-5' />
            </Button>
          </aside>
        </nav>
      </section>
    </header>
  );
}
