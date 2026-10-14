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

import { SectionNavigation } from '@/components/desktop/section-navigation';
import { BrandLockup } from '@/components/logo-icon';
import {
  ApiPage as DeveloperApiPage,
  DataPage as ProductDataPage,
  OverviewPage as MarketingOverviewPage,
  SupportPage as ProductSupportPage,
} from '@/components/marketing/marketing-content';
import { PrivacyPolicyPage, TermsOfUsePage } from '@/components/marketing/marketing-legal';
import { MarketingResourcesNavigation } from '@/components/marketing/marketing-menu';
import {
  createCheckoutIntent,
  FeaturesPage,
  getBillingTotal,
  getPricePerSeat,
  PricingPage,
  type CheckoutIntent,
} from '@/components/marketing/marketing-pages';
import { MarketingShell } from '@/components/marketing/marketing-shell';
import { contrastRatio, parseColor } from '@/lib/engine/browser';

function renderMarketingPage(
  path:
    | '/'
    | '/features'
    | '/pricing'
    | '/overview'
    | '/api'
    | '/guides'
    | '/data'
    | '/support'
    | '/privacy'
    | '/terms',
  page: ReactNode,
  shell = false,
) {
  const rootRoute = createRootRoute({
    component: shell ? MarketingShell : Outlet,
    beforeLoad: () => ({ theme: 'light' as const }),
  });
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
    routeTree: rootRoute.addChildren(path === '/' ? [pageRoute] : [pageRoute, studioRoute]),
    history: createMemoryHistory({ initialEntries: [path] }),
  });

  return render(<RouterProvider router={router} />);
}

function renderPricing(onPlanSelected?: (intent: CheckoutIntent) => void) {
  return renderMarketingPage('/pricing', <PricingPage onPlanSelected={onPlanSelected} />);
}

describe('marketing pricing', () => {
  test('uses the shared application header on product pages with only the orange brand accent', async () => {
    renderMarketingPage('/features', <FeaturesPage />, true);

    await screen.findByRole('heading', { name: 'Make color decisions you can ship.', level: 1 });
    const header = document.querySelector<HTMLElement>('[data-slot="application-header"]');
    expect(header).toHaveAttribute('data-brand-variant', 'marketing');
    const logo = header?.querySelector<HTMLElement>('a.brand-lockup');
    expect(logo).toHaveAttribute('href', '/');
    expect(logo?.style.getPropertyValue('--brand-accent')).toBe('#ed654f');
    expect(header?.querySelector('[data-section="create"]')).toBeInTheDocument();
    expect(header?.querySelector('[data-section="product"]')).toBeInTheDocument();
    expect(header?.querySelector('[data-section="support"]')).toBeInTheDocument();
    expect(document.querySelector('.marketing-header')).not.toBeInTheDocument();
  });

  test('shares logo markup while preserving studio and marketing variants and links', async () => {
    renderMarketingPage(
      '/overview',
      <>
        <BrandLockup heading />
        <BrandLockup variant='marketing' />
      </>,
    );

    const logos = await screen.findAllByRole('link', { name: /Chroma.*ELITE/ });
    expect(logos).toHaveLength(2);
    expect(logos.map((logo) => logo.getAttribute('data-brand-variant'))).toEqual([
      'studio',
      'marketing',
    ]);
    expect(logos.map((logo) => logo.getAttribute('href'))).toEqual(['/', '/overview']);
    for (const logo of logos) {
      expect(logo).toHaveClass('brand-lockup');
      expect(logo.querySelector('svg')).toHaveClass('brand-icon');
      expect(logo.querySelector('sup')).toHaveClass('brand-elite');
    }
    expect(screen.getByRole('heading', { name: /Chroma/ })).toHaveClass('brand-wordmark');
    const gradientIds = Array.from(
      document.querySelectorAll('linearGradient'),
      (gradient) => gradient.id,
    );
    expect(new Set(gradientIds).size).toBe(gradientIds.length);
  });

  test('uses non-native button semantics for link-rendered studio menu triggers', async () => {
    renderMarketingPage('/', <SectionNavigation />);

    await screen.findByRole('button', { name: 'Palette' });
    for (const [label, href] of [
      ['Palette', '/'],
      ['Analyze', '/analyze/accessibility'],
      ['Build', '/build/mixer'],
      ['Export', '/export/scale'],
    ]) {
      const trigger = screen.getByRole('button', { name: label });
      expect(trigger.tagName).toBe('A');
      expect(trigger).toHaveAttribute('role', 'button');
      expect(trigger).toHaveAttribute('href', href);
    }
    expect(screen.getByRole('button', { name: 'Product' }).tagName).toBe('BUTTON');
    expect(screen.getByRole('button', { name: 'Support' }).tagName).toBe('BUTTON');
  });

  test('uses distinct, consistent accents for the four numbered studio sections', async () => {
    renderMarketingPage('/overview', <SectionNavigation />);

    await screen.findByText('Palette');
    const sections = document.querySelectorAll<HTMLElement>('[data-slot="navigation-menu-item"]');

    expect(
      Array.from(sections, (section) => ({
        id: section.dataset.section,
        accent: section.style.getPropertyValue('--section-accent'),
      })),
    ).toEqual([
      { id: 'create', accent: 'var(--primary)' },
      { id: 'analyze', accent: '#67e8f9' },
      { id: 'build', accent: '#fcd34d' },
      { id: 'export', accent: '#6ee7b7' },
      { id: 'product', accent: 'var(--primary)' },
      { id: 'support', accent: 'var(--primary)' },
    ]);
    for (const section of sections) {
      expect(section.querySelector('[data-slot="navigation-menu-trigger"]')).toBeInTheDocument();
    }
  });

  test('groups product and developer pages in the Product menu', async () => {
    renderMarketingPage('/pricing', <MarketingResourcesNavigation />);

    fireEvent.click(await screen.findByRole('button', { name: 'Product' }));
    const navigation = await screen.findByRole('navigation', { name: 'Chroma product' });
    const panel = navigation.closest('[data-slot="navigation-menu-panel"]');
    expect(panel).toBeInTheDocument();
    expect(panel).toHaveClass('sm:h-80');
    expect(panel?.querySelector('aside svg')?.closest('span')).toHaveClass('size-9');
    expect(panel?.querySelector('aside svg')).toHaveClass('tabler-icon-box');
    expect(screen.queryByText('05')).not.toBeInTheDocument();
    expect(panel?.querySelector('[data-slot="navigation-menu-panel-footer"]')).toHaveTextContent(
      'CHROMA ELITE / PRODUCT',
    );
    expect(screen.getByText('04 pages')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Product' })).toHaveAttribute('href', '/overview');
    expect(navigation.querySelectorAll('a')).toHaveLength(4);
    expect(screen.getByRole('link', { name: /Overview/ })).toHaveAttribute('href', '/overview');
    expect(screen.getByRole('link', { name: /Features/ })).toHaveAttribute('href', '/features');
    expect(screen.getByRole('link', { name: /Pricing/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /Developer API/ })).toHaveAttribute('href', '/api');
    expect(screen.queryByRole('link', { name: /Guides/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Product and developers')).toBeInTheDocument();
    expect(screen.getByText('Compare Free, Pro, and Team plans.')).toBeInTheDocument();
  });

  test('uses the existing studio trigger styling for Product and Support', async () => {
    renderMarketingPage('/', <SectionNavigation />);

    await screen.findByRole('button', { name: 'Product' });
    const reference = document.querySelector<HTMLElement>(
      '[data-section="analyze"] > [data-slot="navigation-menu-trigger"]',
    );
    expect(reference).toBeInTheDocument();
    if (reference === null) throw new Error('Expected the Analyze navigation trigger');
    for (const label of ['Product', 'Support']) {
      const trigger = screen.getByRole('button', { name: label });
      expect(trigger.className).toBe(reference.className);
      expect(trigger).toHaveClass('text-muted-foreground', 'hover:text-foreground');
      expect(trigger.className).not.toContain('data-popup-open:after:bg-primary');
    }
  });

  test('groups learning, help, and data pages in the Support menu', async () => {
    renderMarketingPage('/pricing', <MarketingResourcesNavigation />);

    fireEvent.click(await screen.findByRole('button', { name: 'Support' }));
    const navigation = await screen.findByRole('navigation', { name: 'Chroma support' });
    const panel = navigation.closest('[data-slot="navigation-menu-panel"]');
    expect(panel).toBeInTheDocument();
    expect(panel?.querySelector('[data-slot="navigation-menu-panel-footer"]')).toHaveTextContent(
      'CHROMA ELITE / SUPPORT',
    );
    expect(screen.getByText('04 pages')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Support' })).toHaveAttribute('href', '/support');
    expect(navigation.querySelectorAll('a')).toHaveLength(4);
    expect(screen.queryByRole('link', { name: 'Guides' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Help center/ })).toHaveAttribute('href', '/support');
    expect(screen.getByRole('link', { name: 'Data overview' })).toHaveAttribute('href', '/data');
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute(
      'href',
      '/privacy',
    );
    expect(screen.getByRole('link', { name: 'Terms of Use' })).toHaveAttribute('href', '/terms');
    expect(screen.queryByRole('link', { name: /Pricing/ })).not.toBeInTheDocument();
    expect(screen.queryByText('06')).not.toBeInTheDocument();
  });

  test('omits the redundant Open studio link inside the studio', async () => {
    renderMarketingPage('/', <MarketingResourcesNavigation />);

    fireEvent.click(await screen.findByRole('button', { name: 'Product' }));
    await screen.findByRole('navigation', { name: 'Chroma product' });
    expect(screen.queryByRole('link', { name: 'Open studio' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Overview/ })).toHaveAttribute('href', '/overview');
  });

  test('marks only the current page in the Support menu', async () => {
    renderMarketingPage('/support', <MarketingResourcesNavigation variant='marketing' />);

    fireEvent.click(await screen.findByRole('button', { name: 'Support' }));
    const help = await screen.findByRole('link', { name: 'Help center' });
    expect(help).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Data overview' })).not.toHaveAttribute('aria-current');
    expect(
      screen
        .getByRole('navigation', { name: 'Chroma support' })
        .querySelectorAll('[aria-current="page"]'),
    ).toHaveLength(1);
  });

  test('explains the product workflow on the overview page', async () => {
    renderMarketingPage('/overview', <MarketingOverviewPage />);

    await screen.findByRole('heading', { name: 'Color that holds up, all the way to code.' });
    expect(screen.getByRole('link', { name: /See plans/ })).toHaveAttribute('href', '/pricing');
    expect(screen.getByRole('link', { name: /Open the studio/ })).toHaveAttribute('href', '/');
  });

  test('keeps palette preview labels readable against every swatch', async () => {
    renderMarketingPage('/overview', <MarketingOverviewPage />);

    const preview = await screen.findByLabelText('Six-color generated palette');
    const swatches = preview.querySelectorAll<HTMLElement>('.palette-artwork-swatch');

    expect(swatches).toHaveLength(6);
    for (const swatch of swatches) {
      expect(
        contrastRatio(
          parseColor(swatch.style.backgroundColor).xyz,
          parseColor(swatch.style.color).xyz,
        ),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  test('makes the plan comparison scroll region keyboard accessible', async () => {
    renderPricing();

    const comparison = await screen.findByRole('region', { name: 'Plan comparison' });
    expect(comparison).toHaveAttribute('tabindex', '0');
    expect(comparison.querySelector('table')).toBeInTheDocument();
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
    renderMarketingPage('/support', <ProductSupportPage />);

    await screen.findByRole('heading', { name: 'Find a harmony, then make it yours.' });
    fireEvent.click(screen.getByRole('button', { name: /Check contrast/ }));

    expect(
      screen.getByRole('heading', { name: 'Check the actual foreground and background pair.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('AA normal 4.5:1')).toBeInTheDocument();
    expect(screen.getByText('AA large 3:1')).toBeInTheDocument();
  });

  test('opens the relevant guide from Help Center search without leaving the page', async () => {
    renderMarketingPage('/support', <ProductSupportPage />);

    const search = await screen.findByRole('searchbox', { name: 'Search help topics' });
    fireEvent.change(search, { target: { value: 'contrast' } });
    const result = screen.getByRole('link', { name: /How should I check text contrast/ });
    expect(result).toHaveAttribute('href', '#guides');
    fireEvent.click(result);
    expect(
      screen.getByRole('heading', { name: 'Check the actual foreground and background pair.' }),
    ).toBeInTheDocument();

    fireEvent.change(search, { target: { value: 'gradient' } });
    fireEvent.click(screen.getByRole('link', { name: /How do I build a gradient/ }));
    expect(
      screen.getByRole('heading', { name: 'Choose how colors travel between stops.' }),
    ).toBeInTheDocument();
  });

  test('describes the current local-first data behavior', async () => {
    renderMarketingPage('/data', <ProductDataPage />);

    await screen.findByRole('heading', { name: 'Know where your color work lives.' });
    expect(
      screen.getByText(/Saved palettes and studio preferences use browser local storage/),
    ).toBeInTheDocument();
    expect(screen.getByText(/does not upload the image to the Chroma server/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute(
      'href',
      '/privacy',
    );
  });

  test('discloses actual data handling and operator details in the Privacy Policy', async () => {
    renderMarketingPage('/privacy', <PrivacyPolicyPage />);

    await screen.findByRole('heading', { name: 'Privacy Policy', level: 1 });
    expect(screen.getByText("Designer's Image, California, United States")).toBeInTheDocument();
    expect(screen.getByText(/chroma-theme cookie stores/)).toBeInTheDocument();
    expect(screen.getByText(/email address to a verification-page URL/)).toBeInTheDocument();
    expect(screen.getByText(/does not upload that image/)).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Privacy Policy contents' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'auto@designersimage.io' })[0]).toHaveAttribute(
      'href',
      'mailto:auto@designersimage.io',
    );
    expect(screen.getByRole('link', { name: 'Terms of Use' })).toHaveAttribute('href', '/terms');
  });

  test('explains eligibility, current billing behavior, and output responsibilities in Terms', async () => {
    renderMarketingPage('/terms', <TermsOfUsePage />);

    await screen.findByRole('heading', { name: 'Terms of Use', level: 1 });
    expect(screen.getByText(/You must be at least 13/)).toBeInTheDocument();
    expect(screen.getByText(/parent or legal guardian/)).toBeInTheDocument();
    expect(screen.getByText(/does not process payment/)).toBeInTheDocument();
    expect(screen.getByText(/do not by themselves establish compliance/)).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Terms of Use contents' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute(
      'href',
      '/privacy',
    );
  });

  test('uses shared application controls for feature actions and metadata', async () => {
    renderMarketingPage('/features', <FeaturesPage />);

    await screen.findByRole('heading', { name: 'Make color decisions you can ship.', level: 1 });
    expect(screen.getByRole('link', { name: /Open the studio/ })).toHaveAttribute(
      'data-slot',
      'button',
    );
    expect(screen.getByRole('link', { name: /Explore plans/ })).toHaveAttribute(
      'data-slot',
      'button',
    );
    expect(screen.getByRole('button', { name: 'Build' })).toHaveAttribute('data-slot', 'button');
    expect(screen.getByText('WCAG contrast matrix')).toHaveAttribute('data-slot', 'badge');
  });

  test('opens and closes compact legal contents using the shared accordion', async () => {
    renderMarketingPage('/privacy', <PrivacyPolicyPage />);

    const trigger = await screen.findByRole('button', { name: 'On this page' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const contents = document.querySelector('.legal-mobile-contents');
    const contact = contents?.querySelector('a[href="#privacy-contact"]');
    expect(contact).toBeInTheDocument();
    if (!contact) throw new Error('Expected compact contents contact link');
    fireEvent.click(contact);
    await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'false'));
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

  test('presents Free capabilities and clear next steps at the end of Features', async () => {
    renderMarketingPage('/features', <FeaturesPage />);

    await screen.findByRole('region', { name: 'Try every stage before you scale up.' });
    const capabilities = screen.getByRole('list', { name: 'Included with the Free plan' });

    expect(capabilities.querySelectorAll('li')).toHaveLength(4);
    expect(capabilities).toHaveTextContent('Up to six colors');
    expect(capabilities).toHaveTextContent('basic WCAG contrast tools');
    expect(screen.getByRole('link', { name: /Start creating/ })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /Compare plans/ })).toHaveAttribute('href', '/pricing');
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

  test('expands and collapses the marketing FAQ with independent accordion items', async () => {
    renderPricing();

    const freeQuestion = await screen.findByRole('button', {
      name: 'What can I do with the Free plan?',
    });
    const paidQuestion = screen.getByRole('button', {
      name: 'Do Pro and Team include every tool?',
    });

    expect(freeQuestion).toHaveAttribute('aria-expanded', 'false');
    expect(freeQuestion).toHaveAttribute('data-slot', 'accordion-trigger');

    fireEvent.click(freeQuestion);
    expect(freeQuestion).toHaveAttribute('aria-expanded', 'true');
    expect(await screen.findByText(/Free gives you a useful first workflow/)).toBeVisible();

    fireEvent.click(paidQuestion);
    expect(paidQuestion).toHaveAttribute('aria-expanded', 'true');
    expect(freeQuestion).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(freeQuestion);
    await waitFor(() => {
      expect(freeQuestion).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText(/Free gives you a useful first workflow/)).not.toBeInTheDocument();
    });
    expect(paidQuestion).toHaveAttribute('aria-expanded', 'true');
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

  test('keeps every pricing plan on the same card structure', async () => {
    renderPricing();

    const plans = await screen.findByRole('region', { name: 'Choose a Chroma plan' });
    const cards = plans.querySelectorAll('article');

    expect(cards).toHaveLength(3);
    for (const card of cards) {
      expect(Array.from(card.children, (element) => element.className)).toEqual([
        'plan-label-row',
        'plan-description',
        'plan-price-row',
        'plan-billing-note',
        'plan-divider',
        'plan-includes',
        'plan-features',
        'plan-actions',
      ]);
      expect(card.querySelector('.plan-actions .plan-cta')).toBeInTheDocument();
      expect(card.querySelector('.plan-actions .plan-cta')).toHaveAttribute('data-slot', 'button');
    }
    expect(
      screen.getByRole('group', { name: 'Team seat count' }).closest('.plan-actions'),
    ).toBeInTheDocument();
    const featuredPlan = screen.getByText('Featured plan');
    expect(featuredPlan.closest('article')).toHaveClass('is-featured');
    expect(featuredPlan.closest('article')).toBe(
      screen.getByRole('heading', { name: 'Pro' }).closest('article'),
    );
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
