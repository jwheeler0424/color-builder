import { IconArrowUpRight } from '@tabler/icons-react';
import { Link, Outlet, useRouterState } from '@tanstack/react-router';

import { BrandLockup } from '@/components/logo-icon';

import './marketing.css';

const NAV_ITEMS = [
  { to: '/features', label: 'Features' },
  { to: '/pricing', label: 'Pricing' },
] as const;

export function MarketingShell() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <div className='marketing-site'>
      <header className='marketing-header'>
        <div className='marketing-header-inner'>
          <BrandLockup compact className='marketing-brand' />
          <nav className='marketing-nav' aria-label='Marketing navigation'>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                aria-current={pathname === item.to ? 'page' : undefined}
                className={`marketing-nav-link${pathname === item.to ? ' is-current' : ''}`}>
                {item.label}
              </Link>
            ))}
          </nav>
          <Link to='/' className='marketing-studio-link'>
            <span>Open studio</span>
            <IconArrowUpRight aria-hidden='true' size={17} />
          </Link>
        </div>
      </header>
      <Outlet />
      <footer className='marketing-footer'>
        <div className='marketing-footer-inner'>
          <BrandLockup compact className='marketing-brand' />
          <p>Color decisions, made with intent.</p>
          <nav aria-label='Footer navigation'>
            <Link to='/features'>Features</Link>
            <Link to='/pricing'>Pricing</Link>
            <Link to='/'>Open the studio</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
