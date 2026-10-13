import {
  IconArrowRight,
  IconArrowUpRight,
  IconCheck,
  IconMinus,
  IconPlus,
} from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';

type BillingInterval = 'monthly' | 'yearly';
type PaidPlan = 'pro' | 'team';

export interface CheckoutIntent {
  plan: PaidPlan;
  billingInterval: BillingInterval;
  seats: number;
}

export const PRICING = {
  pro: { monthly: 12, yearly: 120 },
  team: { monthly: 20, yearly: 200 },
} as const;

export function getPricePerSeat(plan: PaidPlan, interval: BillingInterval) {
  return interval === 'yearly' ? PRICING[plan].yearly / 12 : PRICING[plan].monthly;
}

export function getBillingTotal(plan: PaidPlan, interval: BillingInterval, seats = 1) {
  return PRICING[plan][interval] * (plan === 'team' ? seats : 1);
}

export function createCheckoutIntent(
  plan: PaidPlan,
  billingInterval: BillingInterval,
  seats: number,
): CheckoutIntent {
  return { plan, billingInterval, seats: plan === 'team' ? seats : 1 };
}

const PALETTE_SWATCHES = [
  { name: 'Cobalt', hex: '#5267E8' },
  { name: 'Raspberry', hex: '#E64D89' },
  { name: 'Marigold', hex: '#F0A620' },
  { name: 'Jade', hex: '#0FA987' },
  { name: 'Azure', hex: '#3E85E8' },
  { name: 'Iris', hex: '#8D61E8' },
];

function PaletteArtwork() {
  return (
    <figure className='palette-artwork'>
      <div className='palette-artwork-top'>
        <span>Palette / study 024</span>
        <span className='palette-artwork-dots' aria-hidden='true'>
          <i />
          <i />
          <i />
        </span>
      </div>
      <div className='palette-artwork-swatches' aria-label='Six-color generated palette'>
        {PALETTE_SWATCHES.map((color) => (
          <div
            key={color.hex}
            className='palette-artwork-swatch'
            style={{ backgroundColor: color.hex }}>
            {color.hex}
          </div>
        ))}
      </div>
      <figcaption className='palette-artwork-bottom'>
        <span>Analogous · OKLCH</span>
        <strong>6 colors / contrast tools</strong>
      </figcaption>
    </figure>
  );
}

const FEATURE_STAGES = [
  {
    key: 'create',
    name: 'Create',
    title: 'Start with a hue. Find a system.',
    description:
      'Explore 14 harmony algorithms, pin seed colors, and refine each swatch with perceptual OKLCH controls. Palette slots stay editable, reorderable, and ready for iteration.',
    tools: ['14 harmony algorithms', 'OKLCH color picker', 'Seed pinning', 'Temperature bias'],
  },
  {
    key: 'analyze',
    name: 'Analyze',
    title: 'Check contrast before it ships.',
    description:
      'Evaluate WCAG and APCA contrast, inspect color-vision simulations, and compare palette balance with color-science tools built into the same workflow.',
    tools: ['WCAG contrast matrix', 'APCA analysis', '8 CVD simulations', 'Palette scoring'],
  },
  {
    key: 'build',
    name: 'Build',
    title: 'Take a palette beyond swatches.',
    description:
      'Mix colors in OKLab or OKLCH, build gradients with editable stops, and extract a working palette from an image. See each result as you work.',
    tools: ['Color mixer', 'Gradient editor', 'Image extraction', 'Format conversion'],
  },
  {
    key: 'export',
    name: 'Export',
    title: 'Move from color decisions to code.',
    description:
      'Generate scales, semantic tokens, and light or dark themes. Hand off implementation-ready output for CSS, Tailwind, Figma Tokens, and Style Dictionary.',
    tools: ['50–950 scales', 'Theme generator', 'Figma Tokens', 'Tailwind & CSS'],
  },
] as const;

export function FeaturesPage() {
  const [activeStage, setActiveStage] = useState<(typeof FEATURE_STAGES)[number]['key']>('analyze');
  const stage = FEATURE_STAGES.find((item) => item.key === activeStage)!;

  return (
    <main>
      <section className='marketing-wrap marketing-hero'>
        <div className='marketing-hero-copy'>
          <p className='marketing-kicker'>Color design, end to end</p>
          <h1 className='marketing-title'>
            Make color decisions <em>you can ship.</em>
          </h1>
          <p className='marketing-lede'>
            One focused studio for palette exploration, accessibility checks, and design-system
            handoff. Move from the first hue to implementation without losing the thread.
          </p>
          <div className='marketing-hero-actions'>
            <Link to='/' className='marketing-primary-link'>
              Open the studio <IconArrowUpRight aria-hidden='true' size={17} />
            </Link>
            <Link to='/pricing' className='marketing-secondary-link'>
              Explore plans <IconArrowRight aria-hidden='true' size={16} />
            </Link>
          </div>
        </div>
        <div className='marketing-hero-art'>
          <PaletteArtwork />
        </div>
      </section>

      <section className='workflow-section' aria-label='Color workflow'>
        <div className='marketing-wrap workflow-grid'>
          {[
            ['01', 'Create', 'Build a palette with intent.'],
            ['02', 'Analyze', 'Check contrast and harmony.'],
            ['03', 'Build', 'Shape scales, themes, gradients.'],
            ['04', 'Export', 'Take tokens straight to code.'],
          ].map(([number, title, description]) => (
            <article key={number} className='workflow-step'>
              <span className='workflow-number'>{number} / 04</span>
              <h2>{title}</h2>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className='marketing-wrap marketing-section'>
        <div className='marketing-section-heading'>
          <div>
            <p className='marketing-kicker'>Inside the studio</p>
            <h2 className='marketing-section-title'>
              From a good-looking palette to a dependable system.
            </h2>
          </div>
          <p className='marketing-section-note'>
            The tools stay connected to the palette you are working on, so decisions carry through
            analysis, building, and export.
          </p>
        </div>
        <div className='feature-explorer'>
          <div className='feature-explorer-nav' aria-label='Explore product areas'>
            {FEATURE_STAGES.map((item) => (
              <button
                key={item.key}
                type='button'
                className='feature-stage-button'
                aria-pressed={activeStage === item.key}
                onClick={() => setActiveStage(item.key)}>
                <span>{item.name}</span>
                <IconArrowRight aria-hidden='true' size={15} />
              </button>
            ))}
          </div>
          <div className='feature-explorer-content' aria-live='polite'>
            <p className='marketing-kicker'>{stage.name} / Chroma studio</p>
            <h3>{stage.title}</h3>
            <p>{stage.description}</p>
            <div className='feature-tool-list'>
              {stage.tools.map((tool) => (
                <span key={tool}>{tool}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className='marketing-wrap marketing-section' aria-labelledby='free-sample-title'>
        <div className='free-sample-band'>
          <div>
            <p className='marketing-kicker'>Start free</p>
            <h2 id='free-sample-title'>Try every stage before you scale up.</h2>
          </div>
          <p>
            Free includes palettes up to six colors, a basic contrast check, simple mixing and
            gradients, image color extraction, and foundational exports. Upgrade when you need the
            full toolset and API access.
          </p>
        </div>
      </section>
      <div className='marketing-wrap marketing-bottom-cta'>
        <div>
          <h2>Put your next palette to work.</h2>
          <p>Start in the studio. Keep every color decision connected.</p>
        </div>
        <Link to='/' className='marketing-primary-link'>
          Open Chroma <IconArrowUpRight aria-hidden='true' size={17} />
        </Link>
      </div>
    </main>
  );
}

const PLAN_FEATURES = {
  free: [
    'Palettes up to 6 colors',
    'Standard picker and harmony controls',
    '10 locally saved palettes',
    'Basic WCAG contrast check',
    'Image extraction up to 5 colors',
    'Simple mixer and 2-stop gradients',
    'HEX, RGB, and CSS variable export',
  ],
  pro: [
    'Everything in the full tool suite',
    'Palettes up to 12 colors',
    'WCAG, APCA, CVD, brand, and scoring analysis',
    'Advanced mixer, gradients, and extraction',
    'Full themes, scales, and token exports',
    'Expanded projects and palette storage',
    'Metered API access included',
  ],
  team: [
    'Every Pro feature for each seat',
    'Shared team workspaces and libraries',
    'Review and approval workflows',
    'Shared design-token standards',
    'Centralized seat administration',
    'Larger pooled API allowance',
  ],
} as const;

const COMPARISON_ROWS = [
  ['Palette size', 'Up to 6 colors', 'Up to 12 colors', 'Up to 12 colors'],
  ['Saved palettes', '10 local', 'Expanded', 'Shared workspace'],
  ['WCAG contrast', 'Basic check', 'Full matrix', 'Full matrix'],
  ['APCA & color vision', '—', 'Included', 'Included'],
  ['Brand rules & scoring', '—', 'Included', 'Included'],
  ['Image extraction', 'Up to 5 colors', 'Full controls', 'Full controls'],
  ['Themes, scales & tokens', 'Basic export', 'All formats', 'All formats'],
  ['API access', '—', 'Monthly allowance', 'Pooled allowance'],
  ['Shared projects', '—', '—', 'Included'],
] as const;

const FAQS = [
  {
    question: 'What can I do with the Free plan?',
    answer:
      'Free gives you a useful first workflow: create palettes up to six colors, run a basic contrast check, mix colors, build simple gradients, extract colors from images, and export foundational formats. Advanced analysis, tools, and exports are part of Pro.',
  },
  {
    question: 'Do Pro and Team include every tool?',
    answer:
      'Yes. Both paid plans include the full Analyze, Build, and Export toolset. Team adds shared workflows and administration on top of Pro access for each seat.',
  },
  {
    question: 'How does API usage work?',
    answer:
      'API access is included with paid plans and uses a monthly request allowance. Pro receives an individual allowance; Team receives a larger pooled allowance. Exact quotas and overage rules will be shown before API access is enabled.',
  },
  {
    question: 'Can I change plans or cancel?',
    answer:
      'Plan changes, billing, and cancellation will be handled in account settings once checkout is connected. The selected plan and billing interval are captured when you choose a paid plan.',
  },
] as const;

function displayMoney(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

export function PricingPage({
  onPlanSelected,
}: {
  onPlanSelected?: (intent: CheckoutIntent) => void;
}) {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [seats, setSeats] = useState(2);
  const [selection, setSelection] = useState<CheckoutIntent | null>(null);
  const proPrice = getPricePerSeat('pro', billingInterval);
  const teamPrice = getPricePerSeat('team', billingInterval);
  const teamTotal = getBillingTotal('team', billingInterval, seats);

  const choosePlan = (plan: PaidPlan) => {
    const intent = createCheckoutIntent(plan, billingInterval, seats);
    setSelection(intent);
    onPlanSelected?.(intent);
  };
  const selectionPrice = selection
    ? getBillingTotal(selection.plan, selection.billingInterval, selection.seats)
    : 0;
  const selectionPeriod = selection?.billingInterval === 'yearly' ? 'year' : 'month';

  return (
    <main>
      <section className='marketing-wrap pricing-intro'>
        <p className='marketing-kicker'>Simple plans / serious color work</p>
        <h1 className='marketing-title'>
          Room to explore. <em>Power to ship.</em>
        </h1>
        <p className='marketing-lede'>
          Start free with a little of everything. Go Pro for the complete color studio, or bring
          your whole team into the system.
        </p>
        <div className='pricing-controls'>
          <div className='billing-switch' role='group' aria-label='Billing interval'>
            <button
              type='button'
              className='billing-option'
              aria-pressed={billingInterval === 'monthly'}
              onClick={() => setBillingInterval('monthly')}>
              Monthly
            </button>
            <button
              type='button'
              className='billing-option'
              aria-pressed={billingInterval === 'yearly'}
              onClick={() => setBillingInterval('yearly')}>
              Yearly
            </button>
          </div>
          <span className='billing-savings'>Yearly saves 2 months</span>
        </div>
      </section>

      <section className='marketing-wrap plans-grid' aria-label='Choose a Chroma plan'>
        <article className='plan-card'>
          <div className='plan-label-row'>
            <h2 className='plan-name'>Free</h2>
          </div>
          <p className='plan-description'>A generous starting point for individual color work.</p>
          <div className='plan-price-row'>
            <span className='plan-price'>$0</span>
            <span className='plan-price-period'>forever</span>
          </div>
          <p className='plan-billing-note'>No card required</p>
          <Link to='/' className='plan-cta'>
            Start creating <IconArrowUpRight aria-hidden='true' size={16} />
          </Link>
          <hr className='plan-divider' />
          <p className='plan-includes'>A little of every stage</p>
          <ul className='plan-features'>
            {PLAN_FEATURES.free.map((feature) => (
              <PlanFeature key={feature}>{feature}</PlanFeature>
            ))}
          </ul>
        </article>

        <article className='plan-card is-featured'>
          <div className='plan-label-row'>
            <h2 className='plan-name'>Pro</h2>
            <span className='plan-badge'>Full studio</span>
          </div>
          <p className='plan-description'>Every tool for designers who need more than a palette.</p>
          <div className='plan-price-row'>
            <span className='plan-price'>{displayMoney(proPrice)}</span>
            <span className='plan-price-period'>/ month</span>
          </div>
          <p className='plan-billing-note'>
            {billingInterval === 'yearly' ? '$120 billed yearly' : 'Billed monthly'}
          </p>
          <button type='button' className='plan-cta' onClick={() => choosePlan('pro')}>
            Choose Pro <IconArrowRight aria-hidden='true' size={16} />
          </button>
          <hr className='plan-divider' />
          <p className='plan-includes'>Everything in the studio</p>
          <ul className='plan-features'>
            {PLAN_FEATURES.pro.map((feature) => (
              <PlanFeature key={feature}>{feature}</PlanFeature>
            ))}
          </ul>
        </article>

        <article className='plan-card is-team'>
          <div className='plan-label-row'>
            <h2 className='plan-name'>Team</h2>
          </div>
          <p className='plan-description'>Shared color standards for teams that ship together.</p>
          <div className='plan-price-row'>
            <span className='plan-price'>{displayMoney(teamPrice)}</span>
            <span className='plan-price-period'>/ seat / month</span>
          </div>
          <p className='plan-billing-note'>
            {billingInterval === 'yearly' ? '$200 per seat, billed yearly' : 'Billed monthly'}
          </p>
          <div className='plan-seat-control'>
            <span className='plan-seat-label'>Seats · 2 minimum</span>
            <div className='seat-stepper' role='group' aria-label='Team seat count'>
              <button
                type='button'
                aria-label='Remove a seat'
                disabled={seats <= 2}
                onClick={() => setSeats((current) => Math.max(2, current - 1))}>
                <IconMinus aria-hidden='true' size={14} />
              </button>
              <span aria-live='polite'>{seats}</span>
              <button
                type='button'
                aria-label='Add a seat'
                onClick={() => setSeats((current) => current + 1)}>
                <IconPlus aria-hidden='true' size={14} />
              </button>
            </div>
          </div>
          <p className='plan-total'>
            {displayMoney(teamTotal)} billed{' '}
            {billingInterval === 'yearly' ? 'per year' : 'per month'}
          </p>
          <button type='button' className='plan-cta' onClick={() => choosePlan('team')}>
            Choose Team <IconArrowRight aria-hidden='true' size={16} />
          </button>
          <hr className='plan-divider' />
          <p className='plan-includes'>Built for shared work</p>
          <ul className='plan-features'>
            {PLAN_FEATURES.team.map((feature) => (
              <PlanFeature key={feature}>{feature}</PlanFeature>
            ))}
          </ul>
        </article>
      </section>

      {selection && (
        <section className='marketing-wrap' aria-live='polite'>
          <div className='plan-selection' role='status'>
            <div>
              <h2>{selection.plan === 'pro' ? 'Pro' : 'Team'} plan selected</h2>
              <p>
                {selection.seats} {selection.seats === 1 ? 'seat' : 'seats'} ·{' '}
                {selection.billingInterval} billing · {displayMoney(selectionPrice)} per{' '}
                {selectionPeriod}. No purchase has been made.
              </p>
            </div>
            <button
              type='button'
              className='plan-selection-dismiss'
              onClick={() => setSelection(null)}>
              Dismiss
            </button>
          </div>
        </section>
      )}

      <section className='comparison-section'>
        <div className='marketing-wrap'>
          <div className='marketing-section-heading'>
            <div>
              <p className='marketing-kicker'>Compare plans</p>
              <h2 className='marketing-section-title'>The right amount of color control.</h2>
            </div>
            <p className='marketing-section-note'>
              Every paid seat gets access to the full Chroma toolset. Team adds shared workflows.
            </p>
          </div>
          <div className='comparison-table-wrap'>
            <table className='comparison-table'>
              <thead>
                <tr>
                  <th scope='col'>Included</th>
                  <th scope='col'>Free</th>
                  <th scope='col'>Pro</th>
                  <th scope='col'>Team</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map(([feature, free, pro, team]) => (
                  <tr key={feature}>
                    <th scope='row'>{feature}</th>
                    <td className={free === '—' ? 'comparison-no' : 'comparison-limited'}>
                      {free}
                    </td>
                    <td className='comparison-yes'>{pro}</td>
                    <td className='comparison-yes'>{team}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className='marketing-wrap marketing-faq-section'>
        <div className='marketing-section-heading'>
          <div>
            <p className='marketing-kicker'>Good to know</p>
            <h2 className='marketing-section-title'>A few practical details.</h2>
          </div>
        </div>
        <div className='faq-list'>
          {FAQS.map((item) => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
      <div className='marketing-wrap marketing-bottom-cta'>
        <div>
          <h2>Try the color studio for free.</h2>
          <p>Make a palette, then see how far your color system can go.</p>
        </div>
        <Link to='/' className='marketing-primary-link'>
          Start creating <IconArrowUpRight aria-hidden='true' size={17} />
        </Link>
      </div>
    </main>
  );
}

function PlanFeature({ children }: { children: React.ReactNode }) {
  return (
    <li className='plan-feature'>
      <IconCheck aria-hidden='true' size={15} />
      <span>{children}</span>
    </li>
  );
}
