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
  createCheckoutIntent,
  FeaturesPage,
  getBillingTotal,
  getPricePerSeat,
  PricingPage,
  type CheckoutIntent,
} from '@/components/marketing/marketing-pages';

function renderMarketingPage(path: '/features' | '/pricing', page: ReactNode) {
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

describe('marketing pricing', () => {
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
