import { Link, Outlet } from '@tanstack/react-router';

import { MainHeader } from '@/components/desktop/header';

export function MarketingShell() {
  return (
    <div className='flex h-full min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain bg-background font-sans text-foreground [&_a>svg]:flex-none [&_button>svg]:flex-none [&>main_a:not([data-slot=button]):focus-visible]:outline-2 [&>main_a:not([data-slot=button]):focus-visible]:outline-offset-2 [&>main_a:not([data-slot=button]):focus-visible]:outline-ring [&>main_a:not([data-slot=button]):focus-visible]:outline-solid [&>main_button:not([data-slot=button]):focus-visible]:outline-2 [&>main_button:not([data-slot=button]):focus-visible]:outline-offset-2 [&>main_button:not([data-slot=button]):focus-visible]:outline-ring [&>main_button:not([data-slot=button]):focus-visible]:outline-solid [&>main_h2]:font-semibold [&>main_h3]:font-semibold [@media(prefers-reduced-motion:reduce)]:[&_*]:[scroll-behavior:auto!important] [@media(prefers-reduced-motion:reduce)]:[&_*]:[transition-duration:0.01ms!important] [@media(prefers-reduced-motion:reduce)]:[&_*]:[animation-duration:0.01ms!important] [@media(prefers-reduced-motion:reduce)]:[&_*]:[animation-iteration-count:1!important] [@media(prefers-reduced-motion:reduce)]:[&_*::after]:[transition-duration:0.01ms!important] [@media(prefers-reduced-motion:reduce)]:[&_*::after]:[animation-duration:0.01ms!important] [@media(prefers-reduced-motion:reduce)]:[&_*::after]:[animation-iteration-count:1!important] [@media(prefers-reduced-motion:reduce)]:[&_*::before]:[transition-duration:0.01ms!important] [@media(prefers-reduced-motion:reduce)]:[&_*::before]:[animation-duration:0.01ms!important] [@media(prefers-reduced-motion:reduce)]:[&_*::before]:[animation-iteration-count:1!important]'>
      <MainHeader brandVariant='marketing' className='shrink-0' />
      <Outlet />
      <footer className='shrink-0 border-t border-border bg-card'>
        <div className='mx-auto flex min-h-14 w-[min(1120px,_calc(100%_-_48px))] items-center justify-between gap-4 max-sm:flex-col max-sm:items-start max-sm:gap-3 max-sm:py-4'>
          <p className='m-0 text-xs text-muted-foreground'>Chroma ELITE / Designer's Image</p>
          <nav
            aria-label='Footer navigation'
            className='flex flex-wrap justify-end gap-x-[18px] gap-y-3 text-xs font-semibold text-muted-foreground max-sm:grid max-sm:w-full max-sm:grid-cols-2 max-sm:gap-x-4'>
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
