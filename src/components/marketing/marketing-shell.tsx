import { Link, Outlet } from '@tanstack/react-router';

import { MainHeader } from '@/components/desktop/header';

export function MarketingShell() {
  return (
    <div className='flex h-full min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain marketing-site bg-background font-sans text-foreground [&_a>svg]:flex-none [&_button>svg]:flex-none'>
      <MainHeader brandVariant='marketing' className='shrink-0' />
      <Outlet />
      <footer className='shrink-0 border-t border-border bg-card'>
        <div className='mx-auto flex min-h-14 w-[min(1120px,_calc(100%_-_48px))] items-center justify-between gap-4'>
          <p className='m-0 text-[11px] text-muted-foreground'>Chroma ELITE / Designer's Image</p>
          <nav
            aria-label='Footer navigation'
            className='flex flex-wrap justify-end gap-x-[18px] gap-y-3 text-[11px] font-semibold text-muted-foreground'>
            <Link to='/support' className='hover:text-foreground'>
              Help center
            </Link>
            <Link to='/documentation' className='hover:text-foreground'>
              Documentation
            </Link>
            <Link to='/privacy' className='hover:text-foreground'>
              Privacy Policy
            </Link>
            <Link to='/terms' className='hover:text-foreground'>
              Terms of Use
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
