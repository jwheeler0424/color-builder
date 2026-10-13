import type { ReactNode } from 'react';

import {
  createMemoryHistory,
  createRoute,
  createRootRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test } from 'bun:test';

import {
  ApiPage as DeveloperApiPage,
  DataPage as ProductDataPage,
  GuidesPage as ProductGuidesPage,
  OverviewPage as MarketingOverviewPage,
  SupportPage as ProductSupportPage,
} from '@/components/marketing/marketing-content';
import { MarketingPagesMenu } from '@/components/marketing/marketing-menu';
import { MarketingPagesSubmenuItems } from '@/components/marketing/marketing-menu';
import {
  createCheckoutIntent,
  FeaturesPage,
  getBillingTotal,
  getPricePerSeat,
  PricingPage,
  type CheckoutIntent,
} from '@/components/marketing/marketing-pages';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function renderMarketingPage(
  path: '/features' | '/pricing' | '/overview' | '/api' | '/guides' | '/data' | '/support',
  page: ReactNode,
) {
  const rootRoute = createRootRoute({ component: Outlet });
  const pageRoute = createRoute({
    getParentRoute: () => rootRoute,
    path,
    component: () => page,
  });
  const studioRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <main>Studio</main>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([pageRoute, studioRoute]),
    history: createMemoryHistory({ initialEntries: [path] }),
  });

  return render(<RouterProvider router={router} />);
}

function renderPricing(onPlanSelected?: (intent: CheckoutIntent) => void) {
  return renderMarketingPage('/pricing', <PricingPage onPlanSelected={onPlanSelected} />);
}

function MobileExploreMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>More actions</DropdownMenuTrigger>
      <DropdownMenuContent>
        <MarketingPagesSubmenuItems />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

describe('marketing pricing', () => {
  test('exposes all marketing destinations from the Explore menu', async () => {
    renderMarketingPage('/pricing', <MarketingPagesMenu />);

    fireEvent.click(
      await screen.findByRole('button', { name: 'Explore Chroma pages and resources' }),
    );

    expect(screen.getByRole('menuitem', { name: /Overview/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Features/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Pricing/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Developer API/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Guides/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Help center/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Data & privacy/ })).toBeInTheDocument();
  });

  test('exposes marketing links through the mobile More actions menu', async () => {
    renderMarketingPage('/pricing', <MobileExploreMenu />);

    fireEvent.click(await screen.findByRole('button', { name: 'More actions' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: /Explore Chroma/ }));

    expect(await screen.findByRole('menuitem', { name: /Overview/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Pricing/ })).toBeInTheDocument();
  });

  test('explains the product workflow on the overview page', async () => {
    renderMarketingPage('/overview', <MarketingOverviewPage />);

    await screen.findByRole('heading', { name: 'Color that holds up, all the way to code.' });
    expect(screen.getByRole('link', { name: /See plans/ })).toHaveAttribute('href', '/pricing');
    expect(screen.getByRole('link', { name: /Open the studio/ })).toHaveAttribute('href', '/');
  });

  test('switches API examples and exposes the draft contract note', async () => {
    renderMarketingPage('/api', <DeveloperApiPage />);

    await screen.findByRole('heading', { name: 'Color intelligence, in your workflow.' });
    expect(screen.getByRole('code')).toHaveTextContent('CHROMA_API_BASE/v1/palettes');

    fireEvent.click(screen.getByRole('button', { name: 'TypeScript' }));
    expect(screen.getByRole('code')).toHaveTextContent('process.env.CHROMA_API_KEY');

    fireEvent.click(screen.getByRole('button', { name: 'Response' }));
    expect(screen.getByRole('code')).toHaveTextContent('"space": "oklch"');
    expect(screen.getByText(/Final API routes, authentication, quotas/)).toBeInTheDocument();
  });

  test('switches the guide and presents the contrast thresholds', async () => {
    renderMarketingPage('/guides', <ProductGuidesPage />);

    await screen.findByRole('heading', { name: 'Find a harmony, then make it yours.' });
    fireEvent.click(screen.getByRole('button', { name: /Check contrast/ }));

    expect(
      screen.getByRole('heading', { name: 'Check the actual foreground and background pair.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('AA normal 4.5:1')).toBeInTheDocument();
    expect(screen.getByText('AA large 3:1')).toBeInTheDocument();
  });

  test('describes the current local-first data behavior', async () => {
    renderMarketingPage('/data', <ProductDataPage />);

    await screen.findByRole('heading', { name: 'Know where your color work lives.' });
    expect(
      screen.getByText(/Saved palettes and studio preferences use browser local storage/),
    ).toBeInTheDocument();
    expect(screen.getByText(/does not upload the image to the Chroma server/)).toBeInTheDocument();
    expect(screen.getByText(/not a substitute for a formal privacy policy/)).toBeInTheDocument();
  });

  test('switches feature explorer content by workflow stage', async () => {
    renderMarketingPage('/features', <FeaturesPage />);

    await screen.findByRole('heading', { name: 'Make color decisions you can ship.' });
    expect(
      screen.getByRole('heading', { name: 'Check contrast before it ships.' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Build' }));

    expect(
      screen.getByRole('heading', { name: 'Take a palette beyond swatches.' }),
    ).toBeInTheDocument();
  });

  test('filters self-service help by search and topic', async () => {
    renderMarketingPage('/support', <ProductSupportPage />);

    await screen.findByRole('heading', { name: 'Find your next step.' });
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search help topics' }), {
      target: { value: 'contrast' },
    });
    expect(
      screen.getByRole('link', { name: /How should I check text contrast/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /Where are my saved palettes/ }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Plans & API' }));
    expect(screen.getByText('No matching help topics')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByRole('link', { name: /How does API access work/ })).toBeInTheDocument();
  });

  test('shows the Free cap and reserves the complete tools and API for paid plans', async () => {
    renderPricing();

    await screen.findByRole('heading', { name: 'Room to explore. Power to ship.' });
    const freeCard = screen.getByRole('heading', { name: 'Free' }).closest('article');
    const proCard = screen.getByRole('heading', { name: 'Pro' }).closest('article');
    const teamCard = screen.getByRole('heading', { name: 'Team' }).closest('article');

    expect(freeCard).toHaveTextContent('Palettes up to 6 colors');
    expect(freeCard).not.toHaveTextContent('API');
    expect(proCard).toHaveTextContent('Everything in the full tool suite');
    expect(proCard).toHaveTextContent('Metered API access included');
    expect(teamCard).toHaveTextContent('Every Pro feature for each seat');
    expect(teamCard).toHaveTextContent('Larger pooled API allowance');
  });

  test('uses the advertised monthly and annual prices', () => {
    expect(getPricePerSeat('pro', 'monthly')).toBe(12);
    expect(getPricePerSeat('pro', 'yearly')).toBe(10);
    expect(getPricePerSeat('team', 'monthly')).toBe(20);
    expect(getPricePerSeat('team', 'yearly')).toBeCloseTo(200 / 12);
    expect(getBillingTotal('pro', 'yearly')).toBe(120);
    expect(getBillingTotal('team', 'yearly', 3)).toBe(600);
    expect(createCheckoutIntent('pro', 'yearly', 5)).toEqual({
      plan: 'pro',
      billingInterval: 'yearly',
      seats: 1,
    });
  });

  test('updates displayed prices and team total when billing changes', async () => {
    renderPricing();

    await screen.findByRole('heading', { name: 'Room to explore. Power to ship.' });
    expect(screen.getByText('$12')).toBeInTheDocument();
    expect(screen.getByText('$20')).toBeInTheDocument();
    expect(screen.getByText('$40 billed per month')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Yearly' }));

    expect(screen.getByText('$10')).toBeInTheDocument();
    expect(screen.getByText('$16.67')).toBeInTheDocument();
    expect(screen.getByText('$400 billed per year')).toBeInTheDocument();
    expect(screen.getByText('$200 per seat, billed yearly')).toBeInTheDocument();
  });

  test('updates Team seat totals and emits a checkout-ready selection', async () => {
    let selectedPlan: CheckoutIntent | undefined;
    renderPricing((intent) => {
      selectedPlan = intent;
    });

    await screen.findByRole('heading', { name: 'Room to explore. Power to ship.' });
    fireEvent.click(screen.getByRole('button', { name: 'Add a seat' }));
    expect(screen.getByText('3', { selector: '.seat-stepper span' })).toBeInTheDocument();
    expect(screen.getByText('$60 billed per month')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Choose Team' }));
    await waitFor(() =>
      expect(selectedPlan).toEqual({
        plan: 'team',
        billingInterval: 'monthly',
        seats: 3,
      }),
    );
    expect(screen.getByRole('status')).toHaveTextContent('Team plan selected');
    expect(screen.getByRole('status')).toHaveTextContent('No purchase has been made.');
  });
});
