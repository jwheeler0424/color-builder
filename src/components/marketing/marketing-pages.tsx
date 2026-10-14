import {
  IconArrowRight,
  IconArrowUpRight,
  IconCheck,
  IconMinus,
  IconPlus,
} from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import { useState, type ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { parseColor, textColor } from '@/lib/engine/browser';
import { cn } from '@/lib/utils';

import {
  MarketingFaq,
  MarketingFaqContent,
  MarketingFaqItem,
  MarketingFaqTrigger,
  MarketingHero,
  MarketingHeroActions,
  MarketingHeroArt,
  MarketingHeroCopy,
  MarketingLede,
  MarketingSectionHeading,
  MarketingSectionNote,
  MarketingSectionTitle,
  MarketingTitle,
} from './marketing-primitives';

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

export function PaletteArtwork({ variant = 'feature' }: { variant?: 'feature' | 'overview' }) {
  return (
    <figure className='palette-artwork overflow-hidden rounded-[7px] border border-border bg-card text-foreground shadow-none'>
      <div className='palette-artwork-top flex items-center justify-between border-b border-border px-[17px] py-[14px] font-mono text-2xs text-muted-foreground uppercase'>
        <span>Sample palette</span>
      </div>
      <div
        className={cn(
          'grid grid-cols-6 gap-[3px] p-[3px]',
          variant === 'overview'
            ? 'h-[230px] max-[960px]:h-[200px] max-[800px]:h-[160px] max-[560px]:h-[112px] max-[380px]:h-[70px] min-[1600px]:h-[280px]'
            : 'h-36 max-[800px]:h-[160px] max-[560px]:h-[120px] max-[380px]:h-[70px]',
        )}
        aria-label='Six-color generated palette'>
        {PALETTE_SWATCHES.map((color) => (
          <div
            key={color.hex}
            className='palette-artwork-swatch flex min-w-0 rotate-180 items-end justify-center rounded-[2px] px-[2px] py-[9px] font-mono text-2xs text-white [writing-mode:vertical-rl]'
            style={{ backgroundColor: color.hex, color: textColor(parseColor(color.hex).xyz) }}>
            {color.hex}
          </div>
        ))}
      </div>
      <figcaption className='palette-artwork-bottom flex items-center justify-between border-t border-border px-[17px] py-[14px] font-mono text-2xs text-muted-foreground uppercase'>
        <span>HEX values</span>
        <strong className='font-normal text-[var(--brand-teal-ink)]'>6 colors</strong>
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

const FREE_CAPABILITIES = [
  {
    title: 'Palette foundations',
    description: 'Up to six colors, harmony generation, and a perceptual color picker.',
  },
  {
    title: 'Everyday color tools',
    description: 'Mix colors, build two-stop gradients, and extract up to five colors from images.',
  },
  {
    title: 'Accessibility basics',
    description: 'Check foreground and background pairs with basic WCAG contrast tools.',
  },
  {
    title: 'Ready-to-use exports',
    description: 'Take HEX, RGB, and CSS variables straight into your project.',
  },
] as const;

export function FeaturesPage() {
  const [activeStage, setActiveStage] = useState<(typeof FEATURE_STAGES)[number]['key']>('analyze');
  const stage = FEATURE_STAGES.find((item) => item.key === activeStage)!;

  return (
    <main
      className={cn(
        'min-w-0 flex-[1_0_auto] [--page-gutter:clamp(24px,3vw,72px)] max-[960px]:[--page-gutter:clamp(16px,2.7vw,28px)] max-[800px]:[--page-gutter:18px]',
        'marketing-page-features',
      )}>
      <section
        data-features-masthead
        className='border-b border-border bg-[color-mix(in_srgb,var(--card)_94%,var(--brand-teal-ink))]'>
        <MarketingHero className='mx-auto w-[calc(100%_-_var(--page-gutter)_*_2)] max-w-none'>
          <MarketingHeroCopy>
            <p className='m-0 inline-flex items-center gap-[9px] font-display text-2xs font-semibold tracking-[0] text-muted-foreground uppercase'>
              Color design, end to end
            </p>
            <MarketingTitle>
              Make color decisions <em>you can ship.</em>
            </MarketingTitle>
            <MarketingLede>
              One focused studio for palette exploration, accessibility checks, and design-system
              handoff. Move from the first hue to implementation without losing the thread.
            </MarketingLede>
            <MarketingHeroActions>
              <Link
                to='/'
                data-slot='button'
                className={cn(
                  buttonVariants({ size: 'lg', className: 'text-sm' }),
                  'marketing-primary-link',
                )}>
                Open the studio <IconArrowUpRight aria-hidden='true' size={17} />
              </Link>
              <Link
                to='/pricing'
                data-slot='button'
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'lg', className: 'text-sm' }),
                  'marketing-secondary-link',
                )}>
                Explore plans <IconArrowRight aria-hidden='true' size={16} />
              </Link>
            </MarketingHeroActions>
          </MarketingHeroCopy>
          <MarketingHeroArt>
            <PaletteArtwork />
          </MarketingHeroArt>
        </MarketingHero>
      </section>

      <section
        className='workflow-section border-y border-border bg-card'
        aria-label='Color workflow'>
        <div
          className={cn(
            'mx-auto w-[calc(100%_-_var(--page-gutter)_*_2)] max-w-none',
            ' workflow-grid grid grid-cols-4 max-[800px]:grid-cols-2 max-[560px]:grid-cols-1',
          )}>
          {[
            ['01', 'Create', 'Build a palette with intent.'],
            ['02', 'Analyze', 'Check contrast and harmony.'],
            ['03', 'Build', 'Shape scales, themes, gradients.'],
            ['04', 'Export', 'Take tokens straight to code.'],
          ].map(([number, title, description]) => (
            <article
              key={number}
              className='workflow-step min-h-28 border-l border-border p-5 first:border-l-0 max-[800px]:min-h-[180px] max-[800px]:p-[18px] max-[560px]:min-h-[145px] max-[560px]:p-4'>
              <span className='workflow-number font-mono text-2xs text-[var(--primary-link)] max-[800px]:text-[32px] max-[560px]:text-[30px]'>
                {number} / 04
              </span>
              <h2 className='mt-5 mb-[5px] font-display text-[21px] max-[800px]:text-[19px] max-[560px]:text-[18px]'>
                {title}
              </h2>
              <p className='m-0 text-xs leading-[1.5] text-[var(--muted-foreground)]'>
                {description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className='mx-auto w-[calc(100%_-_var(--page-gutter)_*_2)] max-w-none pb-14 max-[560px]:py-8 max-[560.01px]:pb-10'>
        <MarketingSectionHeading>
          <div>
            <p className='m-0 inline-flex items-center gap-[9px] font-display text-2xs font-semibold tracking-[0] text-muted-foreground uppercase'>
              Inside the studio
            </p>
            <MarketingSectionTitle>
              From a good-looking palette to a dependable system.
            </MarketingSectionTitle>
          </div>
          <MarketingSectionNote>
            The tools stay connected to the palette you are working on, so decisions carry through
            analysis, building, and export.
          </MarketingSectionNote>
        </MarketingSectionHeading>
        <div className='grid grid-cols-[minmax(240px,0.28fr)_minmax(0,0.72fr)] rounded-lg max-[800.01px]:grid-cols-1'>
          <div
            className='flex flex-col gap-1 border-r border-border p-[18px] max-[800.01px]:flex-row max-[800.01px]:flex-wrap max-[800.01px]:border-r-0 max-[800.01px]:border-b max-[800.01px]:border-border max-[560.01px]:grid max-[560.01px]:grid-cols-2'
            aria-label='Explore product areas'>
            {FEATURE_STAGES.map((item) => (
              <Button
                key={item.key}
                type='button'
                variant={activeStage === item.key ? 'secondary' : 'ghost'}
                className='min-h-10 justify-between text-xs font-semibold max-[800.01px]:flex-auto max-[800.01px]:gap-3 max-[560.01px]:flex-none max-sm:min-h-11'
                aria-pressed={activeStage === item.key}
                onClick={() => setActiveStage(item.key)}>
                <span>{item.name}</span>
                <IconArrowRight aria-hidden='true' size={15} />
              </Button>
            ))}
          </div>
          <div
            className='grid min-h-[300px] min-w-0 animate-in grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] content-center gap-x-[clamp(32px,4vw,80px)] p-[clamp(28px,3vw,48px)] duration-[280ms] fade-in-0 [animation-fill-mode:both] slide-in-from-bottom-3 max-[960.01px]:min-h-[270px] max-[800.01px]:block max-[560.01px]:min-h-[255px] max-[560.01px]:px-[19px] max-[560.01px]:py-6'
            aria-live='polite'>
            <p className='col-span-full m-0 inline-flex items-center gap-[9px] font-display text-2xs font-semibold tracking-[0] text-muted-foreground uppercase'>
              {stage.name} / Chroma studio
            </p>
            <h3 className='col-start-1 mt-[15px] mb-[10px] font-display text-[28px] leading-[1.25] max-[560.01px]:text-[22px]'>
              {stage.title}
            </h3>
            <p className='col-start-1 m-0 max-w-[610px] text-sm leading-[1.75] text-(--muted-foreground)'>
              {stage.description}
            </p>
            <div className='grid-row-[2_/_span_2] col-start-2 row-start-2 mt-0 flex flex-wrap content-center gap-2 max-[800.01px]:mt-6'>
              {stage.tools.map((tool) => (
                <Badge key={tool} variant='secondary'>
                  {tool}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        className='border-t border-border bg-card pt-12 pb-14 max-[560.01px]:pt-8 max-[560.01px]:pb-10'
        aria-labelledby='free-sample-title'>
        <div className='mx-auto grid w-[calc(100%_-_var(--page-gutter)_*_2)] max-w-none grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] items-start gap-[clamp(40px,5vw,104px)] max-[800.01px]:grid-cols-1 max-[800.01px]:gap-8 [&>*]:min-w-0'>
          <div>
            <p className='m-0 inline-flex items-center gap-[9px] font-display text-2xs font-semibold tracking-[0] text-muted-foreground uppercase'>
              Start free
            </p>
            <h2
              id='free-sample-title'
              className='mt-[14px] mb-0 max-w-[560px] font-display text-[28px] leading-[1.1] font-bold max-[560.01px]:text-2xl'>
              Try every stage before you scale up.
            </h2>
            <p className='mt-[18px] mb-6 max-w-[560px] text-[14px] leading-[1.75] text-(--muted-foreground)'>
              Build your first palette, check it, and take it into your project. The essentials are
              ready without an account or a paid plan.
            </p>
            <Link
              to='/'
              data-slot='button'
              className={cn(
                buttonVariants({ size: 'lg', className: 'text-sm' }),
                'marketing-primary-link',
              )}>
              Start creating <IconArrowUpRight aria-hidden='true' size={17} />
            </Link>
          </div>
          <ul
            className='m-0 grid list-none grid-cols-2 gap-x-7 gap-y-3 p-0 max-[560.01px]:grid-cols-1 max-[560.01px]:gap-0'
            aria-label='Included with the Free plan'>
            {FREE_CAPABILITIES.map((capability) => (
              <li key={capability.title} className='min-w-0 border-t border-border py-[18px]'>
                <h3 className='m-0 font-display text-[17px] leading-[1.3] font-bold'>
                  {capability.title}
                </h3>
                <p className='mt-[9px] mb-0 max-w-[42ch] text-xs leading-[1.7] text-(--muted-foreground)'>
                  {capability.description}
                </p>
              </li>
            ))}
          </ul>
        </div>
        <div className='mx-auto mt-10 flex w-[calc(100%_-_var(--page-gutter)_*_2)] max-w-none items-center justify-between gap-7 border-t border-border pt-7 max-[560.01px]:mt-6 max-[560.01px]:flex-col max-[560.01px]:items-start max-[560.01px]:gap-5 max-[560.01px]:pt-6'>
          <div className='min-w-0'>
            <p className='m-0 inline-flex items-center gap-[9px] font-display text-2xs font-semibold tracking-[0] text-muted-foreground uppercase'>
              When you need more
            </p>
            <h3 className='mt-3 mb-0 font-display text-2xl leading-[1.2] font-bold'>
              The full studio, ready when you are.
            </h3>
            <p className='mt-[9px] mb-0 text-sm leading-[1.7] text-(--muted-foreground)'>
              Advanced analysis, larger palettes, and a complete design-system toolset.
            </p>
          </div>
          <Link
            to='/pricing'
            data-slot='button'
            className={cn(
              buttonVariants({ variant: 'outline', size: 'lg', className: 'text-sm' }),
              'marketing-secondary-link flex-none',
            )}>
            Compare plans <IconArrowRight aria-hidden='true' size={17} />
          </Link>
        </div>
      </section>
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

function PlanComparisonTable() {
  const cellClass = 'border-b border-border px-[15px] py-[13px] max-[800.01px]:p-3';
  const stickyHeadingClass =
    'max-[800.01px]:sticky max-[800.01px]:left-0 max-[800.01px]:z-[1] max-[800.01px]:w-40';

  return (
    <div
      className='mx-auto max-w-[1960px] overflow-x-auto rounded-[5px] border border-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
      role='region'
      aria-label='Plan comparison'
      tabIndex={0}>
      <table className='w-full min-w-[690px] border-collapse text-left text-xs max-[800.01px]:min-w-[540px] max-[800.01px]:table-fixed max-[800.01px]:border-separate max-[800.01px]:border-spacing-0'>
        <thead>
          <tr>
            <th
              scope='col'
              className={cn(
                cellClass,
                'bg-muted font-mono text-2xs uppercase',
                stickyHeadingClass,
              )}>
              Included
            </th>
            {['Free', 'Pro', 'Team'].map((plan) => (
              <th
                key={plan}
                scope='col'
                className='border-b border-border bg-muted px-[15px] py-[13px] font-mono text-2xs uppercase max-[800.01px]:p-3'>
                {plan}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMPARISON_ROWS.map(([feature, free, pro, team], index) => {
            const lastRow = index === COMPARISON_ROWS.length - 1;
            const endClass = lastRow ? 'border-b-0' : undefined;
            return (
              <tr key={feature}>
                <th
                  scope='row'
                  className={cn(
                    cellClass,
                    'w-[32%] font-semibold',
                    stickyHeadingClass,
                    endClass,
                    'max-[800.01px]:bg-card',
                  )}>
                  {feature}
                </th>
                {[free, pro, team].map((value, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={cn(
                      cellClass,
                      cellIndex === 0
                        ? value === '—'
                          ? 'text-muted-foreground'
                          : 'text-xs text-(--brand-teal-ink)'
                        : 'font-bold text-(--brand-teal-ink)',
                      endClass,
                    )}>
                    {value}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function displayMoney(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

function PricingPlanCard({
  name,
  description,
  price,
  period,
  billingNote,
  includes,
  features,
  badge,
  featured = false,
  team = false,
  children,
}: {
  name: string;
  description: string;
  price: string;
  period: string;
  billingNote: string;
  includes: string;
  features: readonly string[];
  badge?: ReactNode;
  featured?: boolean;
  team?: boolean;
  children: ReactNode;
}) {
  return (
    <article
      data-plan={team ? 'team' : featured ? 'pro' : 'free'}
      data-featured={featured || undefined}
      className={cn(
        'row-span-8 grid min-w-0 grid-rows-subgrid rounded-[6px] border border-t-[3px] border-border bg-card p-[clamp(20px,2vw,32px)]',
        'max-[960.01px]:row-auto max-[960.01px]:flex max-[960.01px]:flex-col',
        featured &&
          'is-featured border-primary border-t-[var(--primary-link)] bg-[color-mix(in_srgb,var(--card)_95%,var(--primary-link))] shadow-[inset_0_4px_0_var(--primary)]',
        team && 'border-t-warning',
      )}>
      <div
        data-plan-row='label'
        className='row-start-1 flex min-h-[22px] flex-wrap items-center justify-between gap-2'>
        <h2 className='m-0 font-display text-[20px] leading-[1.2]'>{name}</h2>
        {badge}
      </div>
      <p
        data-plan-row='description'
        className='row-start-2 mt-[10px] mb-[22px] min-h-10 text-xs leading-[1.6] text-(--muted-foreground)'>
        {description}
      </p>
      <div
        data-plan-row='price'
        className='row-start-3 flex min-h-12 flex-wrap items-baseline gap-[5px] border-b border-border pb-[13px]'>
        <span className='font-display text-[42px] leading-none font-bold'>{price}</span>
        <span className='text-xs text-(--muted-foreground)'>{period}</span>
      </div>
      <p
        data-plan-row='billing-note'
        className='row-start-4 mt-1 min-h-[17px] text-2xs text-(--muted-foreground)'>
        {billingNote}
      </p>
      <hr
        data-plan-row='divider'
        className='row-start-5 mt-[21px] mb-4 h-px w-full border-0 bg-border'
      />
      <p
        data-plan-row='includes'
        className='row-start-6 m-0 mb-3 font-mono text-2xs font-bold uppercase'>
        {includes}
      </p>
      <ul
        data-plan-row='features'
        className='row-start-7 m-0 grid list-none content-start gap-[11px] p-0'>
        {features.map((feature) => (
          <li
            key={feature}
            className='flex items-start gap-2 text-xs leading-[1.5] text-(--foreground)'>
            <IconCheck
              aria-hidden='true'
              size={15}
              className='mt-px shrink-0 text-(--brand-teal-ink)'
            />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <div data-plan-row='actions' className='row-start-8 mt-6 flex flex-col justify-end'>
        {children}
      </div>
    </article>
  );
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
    <main className='min-w-0 flex-[1_0_auto] [--page-gutter:clamp(24px,3vw,72px)] max-[960px]:[--page-gutter:clamp(16px,2.7vw,28px)] max-[800px]:[--page-gutter:18px]'>
      <section
        data-pricing-masthead
        className='border-b border-border bg-[color-mix(in_srgb,var(--card)_94%,var(--warning))]'>
        <div className='mx-auto grid w-[calc(100%_-_var(--page-gutter)_*_2)] max-w-none grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] grid-rows-[auto_auto_1fr] items-center gap-x-[clamp(48px,7vw,144px)] py-[clamp(48px,6vw,88px)] text-left max-[960.01px]:grid-cols-1 max-[960.01px]:grid-rows-none max-[960.01px]:gap-4 max-[960.01px]:py-10 max-[560.01px]:py-8'>
          <p className='col-start-1 m-0 inline-flex items-center gap-[9px] font-display text-2xs font-semibold tracking-[0] text-muted-foreground uppercase'>
            Simple plans / serious color work
          </p>
          <MarketingTitle className='col-start-1 max-w-[14ch] text-[46px]'>
            Room to explore. <em>Power to ship.</em>
          </MarketingTitle>
          <MarketingLede className='col-start-1 max-w-[58ch]'>
            Start free with a little of everything. Go Pro for the complete color studio, or bring
            your whole team into the system.
          </MarketingLede>
          <div className='col-start-2 row-span-3 row-start-1 mt-0 flex flex-col items-start gap-[13px] rounded-md border border-border bg-card p-[clamp(22px,2.5vw,36px)] max-[960.01px]:col-start-1 max-[960.01px]:row-auto max-[960.01px]:mt-2 max-[560.01px]:p-[18px]'>
            <span className='font-mono text-2xs text-muted-foreground uppercase'>
              Choose a billing interval
            </span>
            <div
              className='inline-flex gap-[3px] rounded-[5px] border border-border bg-card p-1'
              role='group'
              aria-label='Billing interval'>
              <Button
                type='button'
                variant={billingInterval === 'monthly' ? 'default' : 'ghost'}
                size='sm'
                className='billing-option text-xs'
                aria-pressed={billingInterval === 'monthly'}
                onClick={() => setBillingInterval('monthly')}>
                Monthly
              </Button>
              <Button
                type='button'
                variant={billingInterval === 'yearly' ? 'default' : 'ghost'}
                size='sm'
                className='billing-option text-xs'
                aria-pressed={billingInterval === 'yearly'}
                onClick={() => setBillingInterval('yearly')}>
                Yearly
              </Button>
            </div>
            <span className='text-xs font-bold text-(--brand-teal-ink)'>Yearly saves 2 months</span>
          </div>
        </div>
      </section>

      <section
        className='mx-auto grid w-[calc(100%-var(--page-gutter)*2)] max-w-[1960px] grid-cols-3 [grid-template-rows:repeat(8,auto)] items-stretch gap-x-4 gap-y-4 pb-9 max-[960.01px]:grid-cols-1 max-[960.01px]:[grid-template-rows:none] max-[960.01px]:gap-3'
        aria-label='Choose a Chroma plan'>
        <PricingPlanCard
          name='Free'
          description='A generous starting point for individual color work.'
          price='$0'
          period='forever'
          billingNote='No card required'
          includes='A little of every stage'
          features={PLAN_FEATURES.free}>
          <Link
            to='/'
            data-slot='button'
            className={cn(buttonVariants({ size: 'lg', className: 'w-full text-sm' }))}>
            Start creating <IconArrowUpRight aria-hidden='true' size={16} />
          </Link>
        </PricingPlanCard>

        <PricingPlanCard
          name='Pro'
          description='Every tool for designers who need more than a palette.'
          price={displayMoney(proPrice)}
          period='/ month'
          billingNote={billingInterval === 'yearly' ? '$120 billed yearly' : 'Billed monthly'}
          includes='Everything in the studio'
          features={PLAN_FEATURES.pro}
          featured
          badge={<Badge variant='outline'>Featured plan</Badge>}>
          <Button
            type='button'
            size='lg'
            className='mt-0 w-full cursor-pointer text-sm'
            onClick={() => choosePlan('pro')}>
            Choose Pro <IconArrowRight aria-hidden='true' size={16} />
          </Button>
        </PricingPlanCard>

        <PricingPlanCard
          name='Team'
          description='Shared color standards for teams that ship together.'
          price={displayMoney(teamPrice)}
          period='/ seat / month'
          billingNote={
            billingInterval === 'yearly' ? '$200 per seat, billed yearly' : 'Billed monthly'
          }
          includes='Built for shared work'
          features={PLAN_FEATURES.team}
          team>
          <div className='flex flex-wrap items-center justify-between gap-[10px] pb-2'>
            <span className='text-xs text-(--muted-foreground)'>Seats · 2 minimum</span>
            <div
              className='inline-flex items-center gap-[11px] text-xs font-bold [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-45'
              role='group'
              aria-label='Team seat count'>
              <Button
                type='button'
                variant='outline'
                size='icon-sm'
                aria-label='Remove a seat'
                disabled={seats <= 2}
                onClick={() => setSeats((current) => Math.max(2, current - 1))}>
                <IconMinus aria-hidden='true' size={14} />
              </Button>
              <span aria-live='polite'>{seats}</span>
              <Button
                type='button'
                variant='outline'
                size='icon-sm'
                aria-label='Add a seat'
                onClick={() => setSeats((current) => current + 1)}>
                <IconPlus aria-hidden='true' size={14} />
              </Button>
            </div>
          </div>
          <p className='mb-3 min-h-[18px] text-2xs text-(--muted-foreground)'>
            {displayMoney(teamTotal)} billed{' '}
            {billingInterval === 'yearly' ? 'per year' : 'per month'}
          </p>
          <Button
            type='button'
            size='lg'
            className='mt-0 w-full cursor-pointer text-sm'
            onClick={() => choosePlan('team')}>
            Choose Team <IconArrowRight aria-hidden='true' size={16} />
          </Button>
        </PricingPlanCard>
      </section>

      {selection && (
        <section
          className={cn('mx-auto w-[calc(100%_-_var(--page-gutter)_*_2)] max-w-none', '')}
          aria-live='polite'>
          <div
            className='flex items-center justify-between gap-5 rounded border border-l-4 border-border bg-accent px-5 py-[17px]'
            style={{ borderLeftColor: 'var(--brand-teal-ink)' }}
            role='status'>
            <div>
              <h2 className='m-0 font-display text-[17px]'>
                {selection.plan === 'pro' ? 'Pro' : 'Team'} plan selected
              </h2>
              <p className='mt-1 mb-0 text-xs leading-[1.5] text-(--muted-foreground)'>
                {selection.seats} {selection.seats === 1 ? 'seat' : 'seats'} ·{' '}
                {selection.billingInterval} billing · {displayMoney(selectionPrice)} per{' '}
                {selectionPeriod}. No purchase has been made.
              </p>
            </div>
            <button
              type='button'
              className='flex-none cursor-pointer border-0 bg-transparent text-xs font-bold text-(--brand-teal-ink) underline underline-offset-[3px]'
              onClick={() => setSelection(null)}>
              Dismiss
            </button>
          </div>
        </section>
      )}

      <section className='bg-card pt-8 pb-10'>
        <div className='mx-auto w-[calc(100%_-_var(--page-gutter)_*_2)] max-w-none'>
          <MarketingSectionHeading>
            <div>
              <p className='m-0 inline-flex items-center gap-[9px] font-display text-2xs font-semibold tracking-[0] text-muted-foreground uppercase'>
                Compare plans
              </p>
              <MarketingSectionTitle>The right amount of color control.</MarketingSectionTitle>
            </div>
            <MarketingSectionNote>
              Every paid seat gets access to the full Chroma toolset. Team adds shared workflows.
            </MarketingSectionNote>
          </MarketingSectionHeading>
          <PlanComparisonTable />
        </div>
      </section>

      <section className='mx-auto w-[calc(100%_-_var(--page-gutter)_*_2)] max-w-none pt-[10px] pb-[70px]'>
        <MarketingSectionHeading>
          <div>
            <p className='m-0 inline-flex items-center gap-[9px] font-display text-2xs font-semibold tracking-[0] text-muted-foreground uppercase'>
              Good to know
            </p>
            <MarketingSectionTitle>A few practical details.</MarketingSectionTitle>
          </div>
        </MarketingSectionHeading>
        <MarketingFaq
          className='max-w-[840px] max-[800.01px]:grid-cols-1 min-[1201px]:max-w-none min-[1201px]:grid-cols-2 min-[1201px]:gap-x-[clamp(36px,4vw,88px)]'
          multiple>
          {FAQS.map((item) => (
            <MarketingFaqItem key={item.question} value={item.question}>
              <MarketingFaqTrigger>{item.question}</MarketingFaqTrigger>
              <MarketingFaqContent>
                <p>{item.answer}</p>
              </MarketingFaqContent>
            </MarketingFaqItem>
          ))}
        </MarketingFaq>
      </section>
      <div className='mx-auto mt-0 mb-[76px] flex w-[calc(100%_-_var(--page-gutter)_*_2)] max-w-none items-center justify-between gap-6 rounded-md bg-accent px-[34px] py-[30px] max-[560px]:mb-14 max-[560px]:flex-col max-[560px]:items-start max-[560px]:px-5 max-[560px]:py-[25px] [&>a]:flex-none [&>a]:whitespace-nowrap [&>div]:min-w-0'>
        <div>
          <h2 className='m-0 font-display text-[28px] leading-[1.15]'>
            Try the color studio for free.
          </h2>
          <p className='mt-[5px] mb-0 text-xs leading-[1.6] text-muted-foreground'>
            Make a palette, then see how far your color system can go.
          </p>
        </div>
        <Link
          to='/'
          data-slot='button'
          className={cn(
            buttonVariants({ size: 'lg', className: 'text-sm' }),
            'marketing-primary-link',
          )}>
          Start creating <IconArrowUpRight aria-hidden='true' size={17} />
        </Link>
      </div>
    </main>
  );
}
