import { Link, Outlet } from '@tanstack/react-router';

import { MainHeader } from '@/components/desktop/header';

import './marketing.css';

export function MarketingShell() {
  return (
    <div className='marketing-site'>
      <MainHeader brandVariant='marketing' />
      <Outlet />
      <footer className='marketing-footer'>
        <div className='marketing-footer-inner'>
          <p>Chroma ELITE / Designer's Image</p>
          <nav aria-label='Footer navigation'>
            <Link to='/support'>Help center</Link>
            <Link to='/documentation'>Documentation</Link>
            <Link to='/privacy'>Privacy Policy</Link>
            <Link to='/terms'>Terms of Use</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
