import { IconArrowUpRight } from '@tabler/icons-react';
import { Link, Outlet, useRouterState } from '@tanstack/react-router';

import { LogoIcon } from '@/components/logo-icon';

import './marketing.css';

const NAV_ITEMS = [
  { to: '/overview', label: 'Overview' },
  { to: '/features', label: 'Features' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/api', label: 'API' },
  { to: '/guides', label: 'Guides' },
] as const;

export function MarketingShell() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <div className='marketing-site'>
      <header className='marketing-header'>
        <div className='marketing-header-inner'>
          <Link to='/overview' className='marketing-brand marketing-wordmark'>
            <LogoIcon className='size-6' />
            <span>
              Chroma<sup>ELITE</sup>
            </span>
          </Link>
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
          <Link to='/overview' className='marketing-brand marketing-wordmark'>
            <LogoIcon className='size-6' />
            <span>
              Chroma<sup>ELITE</sup>
            </span>
          </Link>
          <p>Color decisions, made with intent.</p>
          <nav aria-label='Footer navigation'>
            <Link to='/overview'>Overview</Link>
            <Link to='/features'>Features</Link>
            <Link to='/pricing'>Pricing</Link>
            <Link to='/api'>API</Link>
            <Link to='/guides'>Guides</Link>
            <Link to='/data'>Data &amp; privacy</Link>
            <Link to='/'>Open the studio</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
