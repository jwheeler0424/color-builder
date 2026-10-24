import {
  IconArrowRight,
  IconArrowUpRight,
  IconChartRadar,
  IconCheck,
  IconCopy,
  IconDownload,
  IconPalette,
  IconSearch,
  IconTools,
  IconX,
} from '@tabler/icons-react';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { useState } from 'react';

import { PaletteArtwork } from '@/components/marketing/marketing-pages';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import {
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

const API_EXAMPLES = {
  curl: `curl --request POST "$CHROMA_API_BASE/v1/palettes" \\
  --header "Authorization: Bearer $CHROMA_API_KEY" \\
  --header "Content-Type: application/json" \\
  --data '{
    "seed": "#5267E8",
    "harmony": "analogous",
    "count": 6,
    "space": "oklch"
  }'`,
  typescript: [
    'const response = await fetch(`${CHROMA_API_BASE}/v1/palettes`, {',
    "  method: 'POST',",
    '  headers: {',
    '    Authorization: `Bearer ${process.env.CHROMA_API_KEY}`,',
    "    'Content-Type': 'application/json',",
    '  },',
    '  body: JSON.stringify({',
    "    seed: '#5267E8',",
    "    harmony: 'analogous',",
    '    count: 6,',
    "    space: 'oklch',",
    '  }),',
    '});',
    '',
    'const palette = await response.json();',
  ].join('\n'),
  response: `{
  "colors": [
    { "hex": "#5267E8", "oklch": [0.55, 0.2, 270] },
    { "hex": "#A64DE8", "oklch": [0.58, 0.21, 315] },
    { "hex": "#8D61E8", "oklch": [0.59, 0.18, 300] },
    { "hex": "#E64D89", "oklch": [0.63, 0.2, 5] },
    { "hex": "#E88954", "oklch": [0.7, 0.14, 42] },
    { "hex": "#F0A620", "oklch": [0.77, 0.16, 78] }
  ],
  "space": "oklch"
}`,
} as const;

type ApiExample = keyof typeof API_EXAMPLES;

const EXAMPLE_LABELS: Record<ApiExample, string> = {
  curl: 'cURL',
  typescript: 'TypeScript',
  response: 'Response',
};

function CopyExample({ code }: { code: string }) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');

  async function copyCode() {
    if (!navigator.clipboard?.writeText) {
      setCopyState('error');
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
  }

  return (
    <Button
      type='button'
      variant='outline'
      size='sm'
      className='content-copy-button text-xs'
      onClick={() => void copyCode()}>
      {copyState === 'copied' ? (
        <IconCheck aria-hidden='true' size={15} />
      ) : (
        <IconCopy aria-hidden='true' size={15} />
      )}
      {copyState === 'copied' ? 'Copied' : copyState === 'error' ? 'Copy unavailable' : 'Copy'}
    </Button>
  );
}

function ApiCodeExplorer() {
  const [activeExample, setActiveExample] = useState<ApiExample>('curl');

  return (
    <div className='overflow-hidden rounded-lg border border-border bg-card text-foreground shadow-[0_14px_34px_color-mix(in_srgb,var(--foreground)_12%,transparent)]'>
      <div className='flex min-h-12 flex-wrap items-center justify-between gap-3 border-b border-border px-[13px] py-[6px] max-[560.01px]:p-[9px]'>
        <div
          className='flex flex-wrap gap-[3px] max-[560.01px]:flex-none'
          role='group'
          aria-label='API example language'>
          {(Object.keys(API_EXAMPLES) as ApiExample[]).map((example) => (
            <Button
              key={example}
              type='button'
              variant={activeExample === example ? 'secondary' : 'ghost'}
              size='sm'
              className='text-xs'
              aria-pressed={activeExample === example}
              onClick={() => setActiveExample(example)}>
              {EXAMPLE_LABELS[example]}
            </Button>
          ))}
        </div>
        <CopyExample code={API_EXAMPLES[activeExample]} />
      </div>
      <pre
        className='mt-0 mb-0 max-h-[360px] min-h-[220px] overflow-auto p-[22px] font-mono text-xs leading-[1.75] whitespace-pre [tab-size:2] text-foreground max-[800.01px]:min-h-[190px] max-[800.01px]:p-4 max-[800.01px]:text-2xs'
        aria-live='polite'>
        <code>{API_EXAMPLES[activeExample]}</code>
      </pre>
    </div>
  );
}

export function OverviewPage() {
  return (
    <main className='min-w-0 flex-[1_0_auto] [--page-gutter:clamp(24px,3vw,72px)] max-[960px]:[--page-gutter:clamp(16px,2.7vw,28px)] max-[800px]:[--page-gutter:18px]'>
      <section className='overview-masthead border-b border-border bg-[color-mix(in_srgb,var(--card)_92%,var(--primary-link))]'>
        <MarketingHero className='mx-auto min-h-[400px] w-[calc(100%_-_var(--page-gutter)_*_2)] max-w-none grid-cols-[minmax(0,0.82fr)_minmax(460px,1.18fr)] gap-[clamp(40px,5vw,120px)] max-[960.01px]:min-h-0 max-[960.01px]:grid-cols-1 max-[560.01px]:gap-4 max-[560.01px]:py-5 max-[380.01px]:gap-y-[14px] max-[380.01px]:pt-[14px] max-[380.01px]:pb-[18px] min-[1600px]:min-h-[560px] min-[1600px]:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] min-[1600px]:gap-[clamp(80px,6vw,144px)]'>
          <MarketingHeroCopy>
            <p className='m-0 inline-flex items-center gap-[9px] font-display text-2xs font-semibold tracking-[0] text-muted-foreground uppercase'>
              A workspace for color systems
            </p>
            <MarketingTitle className='mt-[22px] max-w-[13ch] text-[46px] leading-[1.08] max-[560.01px]:max-w-[14ch] max-[560.01px]:text-[34px] min-[1600px]:max-w-[16ch] min-[1600px]:text-[56px]'>
              Color that holds up, <em>all the way to code.</em>
            </MarketingTitle>
            <MarketingLede className='mt-[22px] max-w-[54ch] text-base leading-[1.7] max-[560.01px]:text-[14px] min-[1600px]:max-w-[48ch] min-[1600px]:text-[17px]'>
              Explore a palette, test how it works, and build a system your team can ship. Chroma
              brings perceptual color tools and implementation-ready exports into one focused
              studio.
            </MarketingLede>
            <MarketingHeroActions className='max-[560.01px]:mt-5 max-[380.01px]:mt-3'>
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
                See plans <IconArrowRight aria-hidden='true' size={16} />
              </Link>
            </MarketingHeroActions>
            <p className='mt-[13px] font-mono text-2xs text-muted-foreground max-[380.01px]:hidden'>
              Start free · no account required
            </p>
          </MarketingHeroCopy>
          <MarketingHeroArt className='min-[1600px]:w-[min(100%,1180px)] min-[1600px]:justify-self-end'>
            <PaletteArtwork variant='overview' />
          </MarketingHeroArt>
        </MarketingHero>
      </section>

      <section
        className='workflow-section border-y border-border bg-card'
        aria-label='The Chroma workflow'>
        <div className='mx-auto grid w-full max-w-none grid-cols-4 px-(--page-gutter) max-[800.01px]:grid-cols-2 max-[380.01px]:grid-cols-1'>
          {[
            {
              number: '01',
              title: 'Create',
              description: 'Generate and refine with color harmony and OKLCH controls.',
              section: 'create',
              icon: IconPalette,
              to: '/',
            },
            {
              number: '02',
              title: 'Analyze',
              description: 'Review contrast, color vision, balance, and brand rules.',
              section: 'analyze',
              icon: IconChartRadar,
              to: '/analyze/accessibility',
            },
            {
              number: '03',
              title: 'Build',
              description: 'Shape scales, themes, gradients, and image palettes.',
              section: 'build',
              icon: IconTools,
              to: '/build/mixer',
            },
            {
              number: '04',
              title: 'Export',
              description: 'Hand off tokens and styles in formats your stack uses.',
              section: 'export',
              icon: IconDownload,
              to: '/export/scale',
            },
          ].map((step, index) => (
            <Link
              key={step.number}
              to={step.to}
              className={cn(
                'group relative grid min-h-[220px] min-w-0 grid-cols-[minmax(0,1fr)_20px] grid-rows-[auto_1fr] items-stretch gap-x-3 gap-y-[6px] rounded-none border-0 bg-transparent px-[clamp(18px,2vw,40px)] py-[26px] text-(--foreground) no-underline transition-[background] duration-150 max-[800.01px]:min-h-[190px] max-[800.01px]:p-[22px] max-[560.01px]:min-h-[190px] max-[560.01px]:px-[14px] max-[560.01px]:py-[18px]',
                index > 0 && 'border-l border-border',
                index >= 2 && 'max-[800.01px]:border-t max-[800.01px]:border-border',
                index > 0 && index % 2 === 0 && 'max-[800.01px]:border-l-0',
                index > 0 &&
                  'max-[380.01px]:border-t max-[380.01px]:border-l-0 max-[380.01px]:border-border',
                'data-[section=create]:[--workflow-accent:var(--section-create-accent)] data-[section=create]:[--workflow-ink:var(--section-create-ink)]',
                'data-[section=analyze]:[--workflow-accent:var(--section-analyze-accent)] data-[section=analyze]:[--workflow-ink:var(--section-analyze-ink)]',
                'data-[section=build]:[--workflow-accent:var(--section-build-accent)] data-[section=build]:[--workflow-ink:var(--section-build-ink)]',
                'data-[section=export]:[--workflow-accent:var(--section-export-accent)] data-[section=export]:[--workflow-ink:var(--section-export-ink)]',
                'hover:bg-[color-mix(in_srgb,var(--card)_94%,var(--workflow-accent))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[var(--workflow-accent)]',
              )}
              data-section={step.section}>
              <step.icon
                className='pointer-events-none absolute top-3 right-3 z-0 size-[108px] rotate-[14deg] text-(--workflow-accent) opacity-[0.055]'
                aria-hidden='true'
                stroke={1.25}
              />
              <span
                data-workflow-number={step.number}
                className='relative z-[1] col-span-full font-mono text-[36px] leading-none font-bold text-(--workflow-ink) max-[800.01px]:text-[30px] max-[560.01px]:text-[28px]'>
                {step.number}
              </span>
              <span className='relative z-[1] col-start-1 row-start-2 grid min-w-0 content-start gap-2'>
                <span className='font-display text-[22px] leading-[1.15] font-bold text-(--foreground) max-[800.01px]:text-[19px] max-[560.01px]:text-[18px]'>
                  {step.title}
                </span>
                <span className='max-w-[34ch] text-sm leading-[1.6] text-(--muted-foreground) max-[800.01px]:text-xs'>
                  {step.description}
                </span>
              </span>
              <IconArrowUpRight
                className='relative z-[1] col-start-2 row-start-2 self-end text-(--workflow-ink) transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5'
                aria-hidden='true'
                size={18}
              />
            </Link>
          ))}
        </div>
      </section>

      <section className='mx-auto grid w-[calc(100%_-_var(--page-gutter)_*_2)] max-w-none grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] items-center gap-[clamp(32px,4vw,96px)] max-[960.01px]:grid-cols-1 max-[960.01px]:gap-[30px] max-[560.01px]:gap-[25px] max-[560px]:py-8 [&>*]:min-w-0'>
        <article>
          <p className='m-0 inline-flex items-center gap-[9px] font-display text-2xs font-semibold tracking-[0] text-muted-foreground uppercase'>
            Perceptual color, practical checks
          </p>
          <MarketingSectionTitle>See the system, not just the swatches.</MarketingSectionTitle>
          <p className='mt-[17px] mb-[22px] max-w-[500px] text-[14px] leading-[1.75] text-muted-foreground'>
            Work in OKLCH, inspect gamut, compare harmony, and check accessibility as part of the
            same design decision. Keep exploration connected to the output you will actually use.
          </p>
          <Link
            to='/features'
            className='inline-flex min-h-9 items-center gap-2 text-xs font-bold text-brand-teal-ink hover:underline hover:underline-offset-4'>
            Explore the tools <IconArrowRight aria-hidden='true' size={15} />
          </Link>
        </article>
        <div
          className='overflow-hidden rounded-md border border-border bg-card'
          aria-label='Example design tokens'>
          <div className='grid grid-cols-[minmax(0,1fr)_auto] items-center gap-[14px] bg-muted px-[17px] py-[14px] font-mono text-2xs text-muted-foreground uppercase'>
            <span>semantic / light</span>
            <span>CSS variables</span>
          </div>
          {[
            ['--color-brand', '#5267E8'],
            ['--color-accent', '#E64D89'],
            ['--color-success', '#0FA987'],
            ['--color-caution', '#F0A620'],
          ].map(([name, color]) => (
            <div
              className='grid grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-[14px] border-t border-border px-[17px] py-[14px] max-[560.01px]:grid-cols-[16px_minmax(0,1fr)]'
              key={name}>
              <span className='size-4 rounded-[3px]' style={{ backgroundColor: color }} />
              <code className='overflow-hidden font-mono text-2xs text-ellipsis whitespace-nowrap text-foreground'>
                {name}
              </code>
              <code className='overflow-hidden font-mono text-2xs text-ellipsis whitespace-nowrap text-foreground max-[560.01px]:col-start-2 max-[560.01px]:text-muted-foreground'>
                {color}
              </code>
            </div>
          ))}
          <Link
            to='/guides'
            className='flex items-center justify-between border-t border-border px-[17px] py-3 text-xs font-bold text-brand-teal-ink'>
            Learn the workflow <IconArrowUpRight aria-hidden='true' size={15} />
          </Link>
        </div>
      </section>

      <section className='border-y border-border bg-card py-8 text-foreground max-[560.01px]:py-10'>
        <div className='mx-auto flex w-[calc(100%_-_var(--page-gutter)_*_2)] max-w-none items-center justify-between gap-10 max-[960.01px]:flex-wrap max-[960.01px]:gap-6 max-[800.01px]:flex-col max-[800.01px]:items-start max-[800.01px]:gap-[22px] [&>*]:min-w-0'>
          <div>
            <p className='m-0 inline-flex items-center gap-[9px] font-display text-2xs font-semibold tracking-[0] text-brand-teal-ink text-muted-foreground uppercase'>
              Start with the essentials
            </p>
            <h2 className='mt-[11px] mb-0 max-w-[570px] font-display text-[28px] leading-[1.08] max-[800.01px]:text-2xl'>
              Free gives you a useful first pass.
            </h2>
            <p className='mt-[14px] mb-0 max-w-[580px] text-sm leading-[1.7] text-muted-foreground'>
              Build palettes up to six colors, run a basic contrast check, mix colors, make simple
              gradients, extract from images, and export foundational formats.
            </p>
          </div>
          <div className='flex flex-none flex-wrap gap-[9px] max-[800.01px]:w-full [&>a]:max-[800.01px]:min-h-11 [&>a]:max-[800.01px]:flex-[1_1_150px]'>
            <Link
              to='/pricing'
              data-slot='button'
              className={cn(
                buttonVariants({ variant: 'outline', size: 'lg', className: 'text-sm' }),
                'marketing-secondary-link',
              )}>
              Compare plans <IconArrowRight aria-hidden='true' size={16} />
            </Link>
            <Link
              to='/'
              data-slot='button'
              className={cn(
                buttonVariants({ size: 'lg', className: 'text-sm' }),
                'marketing-primary-link',
              )}>
              Try the studio <IconArrowUpRight aria-hidden='true' size={17} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export function ApiPage() {
  return (
    <main className='min-w-0 flex-[1_0_auto] [--page-gutter:clamp(24px,3vw,72px)] max-[960px]:[--page-gutter:clamp(16px,2.7vw,28px)] max-[800px]:[--page-gutter:18px]'>
      <section
        data-api-masthead
        className='border-b border-border bg-[color-mix(in_srgb,var(--card)_91%,var(--warning))]'>
        <MarketingHero className='mx-auto min-h-0 w-[calc(100%_-_var(--page-gutter)_*_2)] max-w-none grid-cols-[minmax(0,0.95fr)_minmax(440px,1.05fr)] max-[960.01px]:min-h-0 max-[960.01px]:grid-cols-1'>
          <MarketingHeroCopy>
            <p className='m-0 inline-flex items-center gap-[9px] font-display text-2xs font-semibold tracking-[0] text-muted-foreground uppercase'>
              Developer API · Pro and Team
            </p>
            <MarketingTitle>
              Color intelligence, <em>in your workflow.</em>
            </MarketingTitle>
            <MarketingLede>
              Put palette generation and color analysis alongside the tools your product team
              already uses. Design tokens can move from a color decision into your build pipeline.
            </MarketingLede>
            <MarketingHeroActions className='max-[800.01px]:[&>a]:min-h-11 max-[800.01px]:[&>a]:flex-[1_1_200px]'>
              <Link
                to='/pricing'
                data-slot='button'
                className={cn(
                  buttonVariants({ size: 'lg', className: 'text-sm' }),
                  'marketing-primary-link',
                )}>
                Explore paid plans <IconArrowRight aria-hidden='true' size={16} />
              </Link>
              <Link
                to='/guides'
                data-slot='button'
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'lg', className: 'text-sm' }),
                  'marketing-secondary-link',
                )}>
                Read developer guides <IconArrowUpRight aria-hidden='true' size={16} />
              </Link>
            </MarketingHeroActions>
          </MarketingHeroCopy>
          <div className='relative flex min-h-[310px] flex-col justify-center overflow-hidden rounded-md border border-l-4 border-border border-l-primary-link bg-background p-[clamp(28px,3.5vw,52px)] text-foreground max-[960.01px]:min-h-[230px] max-[560.01px]:min-h-[190px]'>
            <strong className='mt-[25px] max-w-[15ch] font-display text-[34px] leading-[1.1] [overflow-wrap:anywhere] max-[560.01px]:text-[25px]'>
              Color rules your product can reuse.
            </strong>
            <div className='mt-[25px] flex flex-wrap items-center gap-[11px] font-mono text-2xs text-muted-foreground uppercase max-[380.01px]:mt-[13px] max-[380.01px]:gap-[7px]'>
              <span>palette</span>
              <i className='h-px w-7 bg-border max-[380.01px]:w-4' aria-hidden='true' />
              <span>analysis</span>
              <i className='h-px w-7 bg-border max-[380.01px]:w-4' aria-hidden='true' />
              <span>tokens</span>
            </div>
            <p className='mt-[15px] mb-0 text-xs leading-[1.6] text-muted-foreground max-[380.01px]:mt-[9px] max-[380.01px]:text-2xs'>
              Designed for repeatable handoff between design and code.
            </p>
          </div>
        </MarketingHero>
      </section>

      <section className='bg-card py-10 max-[800.01px]:py-14'>
        <div className='mx-auto grid w-[calc(100%_-_var(--page-gutter)_*_2)] max-w-none grid-cols-[minmax(320px,0.7fr)_minmax(0,1.3fr)] items-start gap-[clamp(36px,5vw,112px)] max-[960.01px]:grid-cols-1 max-[960.01px]:gap-[34px] max-[800.01px]:gap-[26px] [&>*]:min-w-0'>
          <div>
            <p className='m-0 inline-flex items-center gap-[9px] font-display text-2xs font-semibold tracking-[0] text-muted-foreground uppercase'>
              A readable contract
            </p>
            <MarketingSectionTitle>Make color decisions callable.</MarketingSectionTitle>
            <p className='mt-[15px] mb-[22px] max-w-[430px] text-sm leading-[1.75] text-muted-foreground'>
              Send a seed color and a few constraints. Get back structured palette values ready for
              review, analysis, or a token pipeline.
            </p>
            <ul className='m-0 grid list-none gap-[13px] p-0'>
              <li className='flex items-start gap-[9px] text-xs leading-[1.5] text-foreground'>
                <IconCheck className='flex-none text-brand-teal-ink' aria-hidden='true' size={16} />{' '}
                Consistent color-space aware responses
              </li>
              <li className='flex items-start gap-[9px] text-xs leading-[1.5] text-foreground'>
                <IconCheck className='flex-none text-brand-teal-ink' aria-hidden='true' size={16} />{' '}
                Palette generation and analysis workflows
              </li>
              <li className='flex items-start gap-[9px] text-xs leading-[1.5] text-foreground'>
                <IconCheck className='flex-none text-brand-teal-ink' aria-hidden='true' size={16} />{' '}
                Paid access with metered usage allowances
              </li>
            </ul>
          </div>
          <div>
            <div className='mb-2 font-mono text-2xs font-bold tracking-[0] text-brand-teal-ink uppercase'>
              Illustrative request · proposed contract
            </div>
            <ApiCodeExplorer />
            <p className='mt-[9px] mb-0 text-2xs leading-[1.6] text-muted-foreground'>
              Example endpoint and response are a draft interface. Final API routes, authentication,
              quotas, and error formats will be specified with the API release. Keep API keys in
              server-side code; never expose them in browser JavaScript.
            </p>
          </div>
        </div>
      </section>

      <section className='mx-auto w-[calc(100%_-_var(--page-gutter)_*_2)] max-w-none py-8 pb-10 max-[560.01px]:pt-10 max-[560.01px]:pb-14'>
        <div className='grid grid-cols-2 items-center gap-x-10 gap-y-5 rounded-md border border-border bg-card p-[34px] text-foreground max-[800.01px]:grid-cols-1 max-[800.01px]:gap-5 max-[800.01px]:px-5 max-[800.01px]:py-6 [&>*]:min-w-0'>
          <div>
            <p className='m-0 inline-flex items-center gap-[9px] font-display text-2xs font-semibold tracking-[0] text-brand-teal-ink text-muted-foreground uppercase'>
              Part of the paid toolset
            </p>
            <h2 className='text-2xl max-[560.01px]:text-2xl'>
              Build on the same color engine as the studio.
            </h2>
          </div>
          <p className='m-0 text-sm leading-[1.7] text-muted-foreground'>
            API access is planned for Pro and Team. Pro includes an individual request allowance;
            Team adds a larger pooled allowance. Specific quotas and overage rules will be published
            before API usage is enabled.
          </p>
          <Link
            to='/pricing'
            data-slot='button'
            className={cn(
              buttonVariants({ size: 'lg', className: 'text-sm' }),
              'marketing-primary-link col-start-2 justify-self-start max-[800.01px]:col-start-1',
            )}>
            Compare plans <IconArrowRight aria-hidden='true' size={16} />
          </Link>
        </div>
      </section>
    </main>
  );
}

const GUIDE_TOPICS = [
  {
    id: 'palette',
    label: 'Build a palette',
    title: 'Find a harmony, then make it yours.',
    intro:
      'Start with a hue or seed, choose a harmony, and refine the result instead of treating the first generation as final.',
    steps: [
      'Choose a starting color or generate a palette to explore.',
      'Select a harmony and adjust the number of palette slots.',
      'Lock colors you want to keep, then edit, reorder, or regenerate the rest.',
      'Save a local copy or share a URL when you want another person to review it.',
    ],
  },
  {
    id: 'contrast',
    label: 'Check contrast',
    title: 'Check the actual foreground and background pair.',
    intro:
      'Contrast is a relationship between two colors. Review intended text and surface pairings, then use the result to guide a design decision.',
    steps: [
      'Open Analyze and choose the accessibility or contrast view.',
      'Compare the intended foreground against its actual background.',
      'For WCAG 2.1 AA, target 4.5:1 for normal text and 3:1 for large text.',
      'Recheck after adjusting either color; a palette-wide label cannot replace testing each use.',
    ],
  },
  {
    id: 'tokens',
    label: 'Export tokens',
    title: 'Give colors names your product can keep.',
    intro:
      'Turn raw swatches into roles, then export the same system in the format your codebase expects.',
    steps: [
      'Open Export and choose the design-system or theme tool.',
      'Assign palette colors to semantic roles such as primary, accent, surface, and neutral.',
      'Review light and dark variants against the preview before copying output.',
      'Choose CSS variables, Tailwind, Figma Tokens, or Style Dictionary output.',
    ],
  },
  {
    id: 'gradients',
    label: 'Build gradients',
    title: 'Choose how colors travel between stops.',
    intro:
      'A gradient is more than two colors. Stop placement and interpolation space affect the visual transition.',
    steps: [
      'Open Build and choose the gradient editor.',
      'Add, move, and edit stops to control the transition.',
      'Compare interpolation spaces such as sRGB, OKLab, and OKLCH.',
      'Export the CSS or SVG after checking the gradient in its intended context.',
    ],
  },
] as const;

type GuideTopic = (typeof GUIDE_TOPICS)[number];

function GuideExplorer({
  activeGuide,
  onGuideChange,
}: {
  activeGuide: GuideTopic['id'];
  onGuideChange: (guide: GuideTopic['id']) => void;
}) {
  const guide = GUIDE_TOPICS.find((item) => item.id === activeGuide)!;

  return (
    <div className='grid grid-cols-[290px_minmax(0,1fr)] overflow-hidden rounded-md border border-border bg-card max-[800.01px]:grid-cols-1 [&>*]:min-w-0'>
      <nav
        className='flex flex-col gap-1 border-r border-border p-3 max-[800.01px]:grid max-[800.01px]:grid-cols-2 max-[800.01px]:border-r-0 max-[800.01px]:border-b max-[800.01px]:border-border max-[560.01px]:flex-row max-[560.01px]:overflow-x-auto max-[560.01px]:border-r-0 max-[560.01px]:border-b max-[560.01px]:border-border'
        aria-label='Guides'>
        {GUIDE_TOPICS.map((topic, index) => (
          <Button
            key={topic.id}
            type='button'
            variant={activeGuide === topic.id ? 'secondary' : 'ghost'}
            className='grid min-h-10 min-w-0 grid-cols-[28px_minmax(0,1fr)_16px] items-center gap-2 px-2.5 py-2 text-left text-xs font-medium whitespace-normal max-[560.01px]:flex-none max-[560.01px]:grid-cols-[20px_minmax(0,1fr)] max-[560.01px]:[&_svg]:hidden'
            aria-pressed={activeGuide === topic.id}
            onClick={() => onGuideChange(topic.id)}>
            <span className='font-mono text-2xs text-primary-link'>0{index + 1}</span>
            <span>{topic.label}</span>
            <IconArrowRight aria-hidden='true' size={15} />
          </Button>
        ))}
      </nav>
      <article
        className='min-h-[280px] p-6 max-[800.01px]:min-h-0 max-[560.01px]:min-h-0 max-[560.01px]:px-[19px] max-[560.01px]:py-6'
        aria-live='polite'>
        <p className='m-0 inline-flex items-center gap-[9px] font-display text-2xs font-semibold tracking-[0] text-muted-foreground uppercase'>
          Guide / {guide.label}
        </p>
        <h3 className='mt-[13px] mb-[10px] max-w-[570px] font-display text-[22px] leading-[1.25]'>
          {guide.title}
        </h3>
        <p className='m-0 max-w-[620px] text-sm leading-[1.7] text-muted-foreground'>
          {guide.intro}
        </p>
        <ol className='my-[23px] grid gap-3 pl-[21px] text-xs leading-[1.6] text-foreground [&>li::marker]:font-mono [&>li::marker]:font-bold [&>li::marker]:text-brand-teal-ink'>
          {guide.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        {guide.id === 'contrast' && (
          <div className='my-[18px] flex flex-wrap items-center gap-x-[17px] gap-y-[9px] border-l-[3px] border-brand-teal-ink bg-muted px-[14px] py-3 text-2xs text-foreground'>
            <strong className='w-full font-mono uppercase'>WCAG 2.1 contrast ratio</strong>
            <span className='font-bold'>AA normal 4.5:1</span>
            <span className='font-bold'>AA large 3:1</span>
          </div>
        )}
        <Link
          to={guide.id === 'tokens' ? '/features' : '/'}
          className='inline-flex min-h-9 items-center gap-2 text-xs font-bold text-brand-teal-ink hover:underline hover:underline-offset-4'>
          {guide.id === 'tokens' ? 'Explore export tools' : 'Try it in the studio'}
          <IconArrowUpRight aria-hidden='true' size={15} />
        </Link>
      </article>
    </div>
  );
}

export function GuidesPage() {
  const hash = useRouterState({ select: (state) => state.location.hash });
  const navigate = useNavigate();
  const activeGuide = GUIDE_TOPICS.find((guide) => guide.id === hash)?.id ?? 'palette';

  return (
    <main className='min-w-0 flex-[1_0_auto] [--page-gutter:clamp(24px,3vw,72px)] max-[960px]:[--page-gutter:clamp(16px,2.7vw,28px)] max-[800px]:[--page-gutter:18px]'>
      <section className='mx-auto grid w-[calc(100%_-_var(--page-gutter)_*_2)] max-w-none grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] items-start gap-[clamp(32px,4vw,96px)] py-[clamp(44px,5vw,88px)] max-[960px]:grid-cols-1 max-[960px]:gap-6 max-[960px]:py-9 max-[800px]:gap-y-[18px] max-[800px]:pt-6 max-[800px]:pb-7 max-[380px]:gap-y-[14px] max-[380px]:pt-[18px] max-[380px]:pb-[22px]'>
        <MarketingHeroCopy>
          <p className='m-0 inline-flex items-center gap-[9px] font-display text-2xs font-semibold tracking-[0] text-muted-foreground uppercase'>
            Field notes for better color work
          </p>
          <MarketingTitle>
            Learn the why. <em>Then make it work.</em>
          </MarketingTitle>
          <MarketingLede>
            Short, practical guides for moving from palette exploration to accessible, usable color
            systems.
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
              to='/features'
              data-slot='button'
              className={cn(
                buttonVariants({ variant: 'outline', size: 'lg', className: 'text-sm' }),
                'marketing-secondary-link',
              )}>
              Browse tools <IconArrowRight aria-hidden='true' size={16} />
            </Link>
          </MarketingHeroActions>
        </MarketingHeroCopy>
        <div
          className='grid [grid-auto-rows:minmax(64px,auto)] content-start border-l-[3px] border-primary-link max-[560.01px]:[grid-auto-rows:minmax(48px,auto)]'
          aria-label='Guide topics'>
          <span className='flex items-center border-b border-border px-6 py-4 font-mono text-xs leading-[1.6] text-foreground first:border-t max-[560.01px]:px-[18px] max-[560.01px]:py-3'>
            01 / Palette systems
          </span>
          <span className='flex items-center border-b border-border px-6 py-4 font-mono text-xs leading-[1.6] text-foreground max-[560.01px]:px-[18px] max-[560.01px]:py-3'>
            02 / Accessible contrast
          </span>
          <span className='flex items-center border-b border-border px-6 py-4 font-mono text-xs leading-[1.6] text-foreground max-[560.01px]:px-[18px] max-[560.01px]:py-3'>
            03 / Design tokens
          </span>
          <span className='flex items-center border-b border-border px-6 py-4 font-mono text-xs leading-[1.6] text-foreground max-[560.01px]:px-[18px] max-[560.01px]:py-3'>
            04 / Gradient craft
          </span>
        </div>
      </section>

      <section
        id={activeGuide}
        className='mx-auto w-[calc(100%_-_var(--page-gutter)_*_2)] max-w-none pt-[54px] max-[560.01px]:py-8'>
        <MarketingSectionHeading>
          <div>
            <p className='m-0 inline-flex items-center gap-[9px] font-display text-2xs font-semibold tracking-[0] text-muted-foreground uppercase'>
              Choose a workflow
            </p>
            <MarketingSectionTitle>Keep the next step close.</MarketingSectionTitle>
          </div>
          <MarketingSectionNote>
            Use these guides as a working reference while you build and review a color system.
          </MarketingSectionNote>
        </MarketingSectionHeading>
        <GuideExplorer
          activeGuide={activeGuide}
          onGuideChange={(guide) => void navigate({ to: '/guides', hash: guide, replace: true })}
        />
      </section>

      <section className='bg-card py-[38px] text-foreground'>
        <div className='mx-auto grid w-[calc(100%_-_var(--page-gutter)_*_2)] max-w-none grid-cols-[0.9fr_1fr_auto] items-center gap-7 max-[800.01px]:grid-cols-1 max-[800.01px]:gap-[18px] max-[560.01px]:gap-4 [&>*]:min-w-0'>
          <div>
            <p className='m-0 inline-flex items-center gap-[9px] font-display text-2xs font-semibold tracking-[0] text-brand-teal-ink text-muted-foreground uppercase'>
              More to explore
            </p>
            <h2 className='mt-[11px] mb-0 max-w-[570px] font-display text-[27px] leading-[1.08]'>
              Need the whole workflow?
            </h2>
          </div>
          <p className='m-0 text-xs leading-[1.7] text-muted-foreground'>
            See how palette generation, accessibility analysis, color building, and token exports
            fit together in Chroma.
          </p>
          <Link
            to='/features'
            data-slot='button'
            className={cn(
              buttonVariants({ size: 'lg', className: 'text-sm' }),
              'marketing-primary-link max-[800.01px]:justify-self-start',
            )}>
            Browse features <IconArrowRight aria-hidden='true' size={16} />
          </Link>
        </div>
      </section>
    </main>
  );
}

const DATA_PRACTICES = [
  {
    title: 'Saved palettes and preferences',
    label: 'Stored in your browser',
    detail:
      'Saved palettes and studio preferences use browser local storage. They are not currently synced to an account or another device. Clearing browser site data removes local copies.',
  },
  {
    title: 'Shared palette links',
    label: 'Color values in the URL',
    detail:
      'When you choose to share a palette, Chroma encodes its color values and harmony in the URL. Anyone who receives that link can load those palette values.',
  },
  {
    title: 'Image extraction',
    label: 'Processed in the browser',
    detail:
      'The image palette tool decodes the selected image in your browser using an image element and canvas. The current extraction flow does not upload the image to the Chroma server.',
  },
  {
    title: 'Color-name lookup',
    label: 'A limited server request',
    detail:
      'The current server endpoint accepts color values and returns nearest color-name matches. It is not the planned palette-generation API; avoid sending confidential project data in requests.',
  },
] as const;

export function DocumentationPage() {
  const topics = [
    {
      title: 'Application shell',
      summary: 'Navigation, page structure, responsive behavior, and shared layout patterns.',
    },
    {
      title: 'Design system',
      summary: 'Components, interaction states, accessibility, and interface conventions.',
    },
    {
      title: 'Styles and tokens',
      summary: 'Typography, color, spacing, themes, and the styles that bring the system together.',
    },
  ];

  return (
    <main
      className={cn(
        'min-w-0 flex-[1_0_auto] [--page-gutter:clamp(24px,3vw,72px)] max-[960px]:[--page-gutter:clamp(16px,2.7vw,28px)] max-[800px]:[--page-gutter:18px]',
        'marketing-page-documentation',
      )}>
      <section
        data-documentation-masthead
        className='border-b border-border bg-[color-mix(in_srgb,var(--card)_94%,var(--brand-teal-ink))]'>
        <MarketingHero className='mx-auto min-h-[320px] w-[calc(100%_-_var(--page-gutter)_*_2)] max-w-none grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] max-[960.01px]:grid-cols-1'>
          <MarketingHeroCopy>
            <p className='m-0 inline-flex items-center gap-[9px] font-display text-2xs font-semibold tracking-[0] text-muted-foreground uppercase'>
              Documentation
            </p>
            <MarketingTitle>A field guide to Chroma ELITE.</MarketingTitle>
            <MarketingLede>
              Foundations for the application shell, design system, and visual styles.
            </MarketingLede>
          </MarketingHeroCopy>
          <div
            className='flex min-h-[210px] flex-col justify-between rounded-md border border-l-4 border-brand-teal-ink bg-background p-7 font-mono text-2xs text-muted-foreground uppercase max-[560.01px]:min-h-[155px] max-[560.01px]:p-5'
            aria-label='Three foundation topics'>
            <span>Foundation topics</span>
            <strong className='font-display text-[72px] leading-none font-medium text-foreground max-[560.01px]:text-[56px]'>
              03
            </strong>
            <span>Index / 001</span>
          </div>
        </MarketingHero>
      </section>

      <section className='mx-auto w-[calc(100%_-_var(--page-gutter)_*_2)] max-w-none pb-[clamp(56px,7vw,112px)] max-[560px]:pt-8 max-[560px]:pb-8'>
        <MarketingSectionHeading>
          <div>
            <p className='m-0 inline-flex items-center gap-[9px] font-display text-2xs font-semibold tracking-[0] text-muted-foreground uppercase'>
              Start here
            </p>
            <MarketingSectionTitle>Interface foundations</MarketingSectionTitle>
          </div>
          <MarketingSectionNote>
            The core references for building with Chroma ELITE.
          </MarketingSectionNote>
        </MarketingSectionHeading>
        <div className='grid grid-cols-3 gap-[clamp(12px,1.5vw,24px)] border-t-0 max-[960.01px]:grid-cols-2 max-[800.01px]:grid-cols-1'>
          {topics.map((topic, index) => (
            <article
              key={topic.title}
              className='grid min-h-[245px] grid-cols-[1fr_auto] grid-rows-[auto_1fr_auto] content-start items-start gap-x-[14px] gap-y-[18px] rounded-lg border border-border bg-card p-[clamp(20px,2vw,32px)] shadow-[0_10px_28px_color-mix(in_srgb,var(--foreground)_7%,transparent)] max-[800.01px]:min-h-0 max-[800.01px]:grid-cols-[30px_minmax(0,1fr)] max-[800.01px]:gap-x-4 max-[800.01px]:gap-y-[10px] max-[800.01px]:p-5 [&:nth-child(2)]:border-t-[3px] [&:nth-child(2)]:border-t-warning [&:nth-child(3)]:border-t-[3px] [&:nth-child(3)]:border-t-brand-teal-ink'>
              <span className='col-span-full font-mono text-2xs text-primary-link max-[800.01px]:col-start-1'>
                0{index + 1}
              </span>
              <div className='col-span-full min-w-0 max-[800.01px]:col-start-2'>
                <h3 className='m-0 font-display text-[18px]'>{topic.title}</h3>
                <p className='mt-[7px] mb-0 max-w-[650px] text-xs leading-[1.7] text-muted-foreground'>
                  {topic.summary}
                </p>
              </div>
              <span className='col-span-full mt-1 justify-self-start rounded border border-border px-2 py-[6px] text-center font-mono text-2xs text-muted-foreground uppercase max-[800.01px]:col-start-2 max-[800.01px]:mt-0'>
                Coming next
              </span>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

const SUPPORT_CATEGORIES = [
  'All',
  'Studio',
  'Accessibility',
  'Exports',
  'Plans & API',
  'Data',
] as const;

type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

const SUPPORT_ARTICLES = [
  {
    title: 'Where are my saved palettes?',
    category: 'Data',
    summary: 'Learn how browser-local saves work and what happens when site data is cleared.',
    to: '/data',
  },
  {
    title: 'How do I share a palette?',
    category: 'Studio',
    summary: 'Share a link that carries the palette colors and harmony settings.',
    to: '/guides',
    guideId: 'palette',
  },
  {
    title: 'How should I check text contrast?',
    category: 'Accessibility',
    summary: 'Compare the actual foreground and background pair against WCAG targets.',
    to: '/guides',
    guideId: 'contrast',
  },
  {
    title: 'Which export format should I choose?',
    category: 'Exports',
    summary: 'Pick CSS, Tailwind, Figma Tokens, or Style Dictionary for your handoff.',
    to: '/guides',
    guideId: 'tokens',
  },
  {
    title: 'Which plan includes every tool?',
    category: 'Plans & API',
    summary: 'Compare Free, Pro, and Team tool access and palette limits.',
    to: '/pricing',
  },
  {
    title: 'How does API access work?',
    category: 'Plans & API',
    summary: 'Review the planned request shape, paid access, and allowance model.',
    to: '/api',
  },
  {
    title: 'How do I build a gradient?',
    category: 'Studio',
    summary: 'Choose gradient stops, compare interpolation spaces, and export the result.',
    to: '/guides',
    guideId: 'gradients',
  },
] as const;

export function SupportPage() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<SupportCategory>('All');
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const articles = SUPPORT_ARTICLES.filter((article) => {
    const guide =
      'guideId' in article ? GUIDE_TOPICS.find((topic) => topic.id === article.guideId) : undefined;
    const matchesCategory = activeCategory === 'All' || article.category === activeCategory;
    const matchesQuery =
      !normalizedQuery ||
      `${article.title} ${article.category} ${article.summary} ${guide?.title ?? ''} ${guide?.steps.join(' ') ?? ''}`
        .toLocaleLowerCase()
        .includes(normalizedQuery);
    return matchesCategory && matchesQuery;
  });

  return (
    <main
      className={cn(
        'min-w-0 flex-[1_0_auto] [--page-gutter:clamp(24px,3vw,72px)] max-[960px]:[--page-gutter:clamp(16px,2.7vw,28px)] max-[800px]:[--page-gutter:18px]',
        'marketing-page-support',
      )}>
      <section className='border-b border-border bg-[color-mix(in_srgb,var(--card)_93%,var(--primary-link))]'>
        <div className='mx-auto grid min-h-[280px] w-[calc(100%_-_var(--page-gutter)_*_2)] max-w-none grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] content-center items-center gap-x-[clamp(24px,4vw,88px)] py-[clamp(40px,5vw,72px)] max-[800.01px]:block max-[800.01px]:min-h-0 max-[800.01px]:pt-8 max-[800.01px]:pb-6'>
          <p className='col-start-1 m-0 inline-flex items-center gap-[9px] font-display text-2xs font-semibold tracking-[0] text-muted-foreground uppercase'>
            Help center
          </p>
          <MarketingTitle className='col-start-1 mt-[18px] max-w-[13ch] text-[46px] max-[560.01px]:text-[32px]'>
            Find your next step.
          </MarketingTitle>
          <MarketingLede className='col-start-1 mt-4 max-w-[52ch] text-[15px]'>
            Search practical answers for building, checking, and shipping color systems.
          </MarketingLede>
          <label className='relative col-start-2 row-span-3 row-start-1 mt-0 flex min-h-[58px] w-[min(680px,100%)] items-center gap-3 rounded-[7px] border border-border bg-card px-[18px] text-muted-foreground transition-none focus-within:border-brand-teal-ink focus-within:shadow-[0_0_0_2px_color-mix(in_oklab,var(--primary)_20%,transparent)] max-[800.01px]:col-start-1 max-[800.01px]:row-auto max-[800.01px]:mt-6 max-[560.01px]:mt-5'>
            <IconSearch className='flex-none' aria-hidden='true' size={19} />
            <span className='sr-only'>Search help topics</span>
            <Input
              type='search'
              aria-label='Search help topics'
              placeholder='Search by topic or keyword'
              className='min-h-11 w-full min-w-0 border-0 bg-transparent text-[15px] text-foreground shadow-none outline-hidden placeholder:text-muted-foreground focus-visible:ring-0 md:text-[15px]'
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
            />
            {query && (
              <Button
                type='button'
                variant='ghost'
                size='icon-sm'
                aria-label='Clear search'
                title='Clear search'
                onClick={() => setQuery('')}>
                <IconX aria-hidden='true' size={16} />
              </Button>
            )}
          </label>
        </div>
      </section>

      <section className='mx-auto grid w-[calc(100%_-_var(--page-gutter)_*_2)] max-w-none grid-cols-[clamp(220px,17vw,320px)_minmax(0,1fr)] items-start gap-x-[clamp(32px,4vw,80px)] gap-y-[10px] pt-[clamp(32px,4vw,56px)] pb-[70px] max-[960.01px]:grid-cols-[200px_minmax(0,1fr)] max-[800.01px]:grid-cols-1 max-[800.01px]:gap-3 max-[800.01px]:pt-[22px] max-[560.01px]:pb-12'>
        <div
          data-support-filter-panel
          className='sticky top-6 col-start-1 row-start-1 self-start max-[800.01px]:static max-[800.01px]:col-start-1 max-[800.01px]:row-auto'>
          <p className='m-0 pb-3 font-mono text-2xs text-muted-foreground uppercase'>
            Filter by topic
          </p>
          <div
            className='mt-1 flex flex-col items-stretch gap-1 max-[800.01px]:mt-0 max-[800.01px]:mb-3 max-[800.01px]:grid max-[800.01px]:grid-cols-3 max-[560.01px]:mb-0 max-[560.01px]:flex max-[560.01px]:[scrollbar-width:none] max-[560.01px]:flex-row max-[560.01px]:flex-nowrap max-[560.01px]:overflow-x-auto max-[560.01px]:pb-1 max-[560.01px]:[&::-webkit-scrollbar]:hidden'
            role='group'
            aria-label='Filter help topics'>
            {SUPPORT_CATEGORIES.map((category) => (
              <Button
                key={category}
                type='button'
                variant={activeCategory === category ? 'secondary' : 'ghost'}
                size='sm'
                className='h-auto min-h-9 min-w-0 justify-start px-2 text-left text-xs whitespace-normal max-sm:min-h-11 max-sm:justify-center'
                aria-pressed={activeCategory === category}
                onClick={() => setActiveCategory(category)}>
                {category}
              </Button>
            ))}
          </div>
        </div>
        <div
          className='col-start-2 row-start-1 grid grid-cols-2 content-start gap-3 gap-x-[clamp(20px,3vw,56px)] border-0 max-[960.01px]:grid-cols-1 max-[800.01px]:col-start-1 max-[800.01px]:row-auto max-[800.01px]:block max-[800.01px]:border-t max-[800.01px]:border-border'
          aria-live='polite'>
          <p className='col-span-full m-0 border-t border-border px-1 pt-[14px] pb-[2px] font-mono text-2xs text-muted-foreground uppercase max-[800.01px]:border-t-0 max-[800.01px]:pt-3'>
            {articles.length} {articles.length === 1 ? 'answer' : 'answers'}
          </p>
          {articles.length > 0 ? (
            articles.map((article) => {
              const content = (
                <>
                  <span className='font-mono text-2xs text-brand-teal-ink uppercase max-[560.01px]:col-start-1 max-[560.01px]:row-start-1'>
                    {article.category}
                  </span>
                  <span className='grid gap-[5px] max-[560.01px]:col-start-1 max-[560.01px]:row-start-2'>
                    <strong className='font-display text-[17px] leading-[1.3] [overflow-wrap:anywhere]'>
                      {article.title}
                    </strong>
                    <span className='text-xs leading-[1.6] text-muted-foreground'>
                      {article.summary}
                    </span>
                  </span>
                  <IconArrowUpRight
                    className='max-[560.01px]:col-start-2 max-[560.01px]:row-start-2'
                    aria-hidden='true'
                    size={17}
                  />
                </>
              );
              const resultClassName =
                'grid min-h-[138px] grid-cols-[minmax(78px,0.25fr)_minmax(0,1fr)_20px] items-start gap-3 rounded-md border border-border bg-card p-5 transition-[background,border-color,transform] duration-[140ms] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--brand-teal-ink)_55%,var(--border))] hover:bg-accent hover:shadow-none max-[800.01px]:min-h-0 max-[800.01px]:grid-cols-[100px_minmax(0,1fr)_20px] max-[800.01px]:rounded-none max-[800.01px]:border-0 max-[800.01px]:border-b max-[800.01px]:border-border max-[800.01px]:bg-transparent max-[800.01px]:px-2 max-[800.01px]:py-[18px] max-[800.01px]:hover:translate-y-0 max-[800.01px]:hover:shadow-[inset_0_-1px_0_var(--border)] max-[560.01px]:grid-cols-[minmax(0,1fr)_20px] max-[560.01px]:gap-x-[9px] max-[560.01px]:gap-y-1 max-[560.01px]:px-1 max-[560.01px]:py-4';

              return (
                <Link
                  key={article.title}
                  to={article.to}
                  hash={'guideId' in article ? article.guideId : undefined}
                  className={resultClassName}>
                  {content}
                </Link>
              );
            })
          ) : (
            <div className='p-[38px_10px]'>
              <h2 className='m-0 font-display text-[22px]'>No matching help topics</h2>
              <p className='text-xs text-muted-foreground'>
                Try a broader search or clear the current category filter.
              </p>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='text-xs'
                onClick={() => {
                  setQuery('');
                  setActiveCategory('All');
                }}>
                Clear filters <IconX aria-hidden='true' size={15} />
              </Button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export function DataPage() {
  return (
    <main
      className={cn(
        'min-w-0 flex-[1_0_auto] [--page-gutter:clamp(24px,3vw,72px)] max-[960px]:[--page-gutter:clamp(16px,2.7vw,28px)] max-[800px]:[--page-gutter:18px]',
        'marketing-page-legal',
      )}>
      <section
        id='data'
        aria-labelledby='data-title'
        className='mx-auto w-[calc(100%_-_var(--page-gutter)_*_2)] max-w-none pt-12 max-[560px]:py-8 max-[560.01px]:pt-9'>
        <MarketingSectionHeading>
          <div>
            <p className='m-0 inline-flex items-center gap-[9px] font-display text-2xs font-semibold tracking-[0] text-muted-foreground uppercase'>
              Data &amp; privacy
            </p>
            <MarketingTitle id='data-title'>Know where your color work lives.</MarketingTitle>
          </div>
          <MarketingSectionNote>
            A plain-language snapshot of how the current Chroma studio handles palettes, shared
            links, images, and color-name requests.
          </MarketingSectionNote>
        </MarketingSectionHeading>
        <div className='mb-[26px] grid grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)] items-center gap-6 max-[800.01px]:grid-cols-1 max-[800.01px]:gap-5'>
          <div className='relative flex min-h-0 flex-col justify-center overflow-hidden rounded-md border border-border bg-accent px-5 py-4'>
            <span className='font-mono text-2xs text-brand-teal-ink uppercase'>Current studio</span>
            <strong className='relative z-[1] mt-[7px] font-display text-[22px]'>
              Local-first
            </strong>
            <p className='relative z-[1] mt-[5px] mb-0 max-w-none text-xs leading-[1.65] text-muted-foreground'>
              Your palettes stay in this browser unless you choose to share a link.
            </p>
          </div>
          <p className='m-0 max-w-[460px] text-xs leading-[1.7] text-muted-foreground'>
            These notes describe the current client-first app, not future account, billing, or API
            services.
          </p>
        </div>
        <div className='border-t border-border'>
          {DATA_PRACTICES.map((practice, index) => (
            <article
              key={practice.title}
              className='grid min-w-0 grid-cols-[42px_minmax(0,1fr)_minmax(160px,0.4fr)] items-start gap-[17px] border-b border-border py-[22px] max-[800.01px]:grid-cols-[30px_minmax(0,1fr)] max-[800.01px]:gap-x-4 max-[800.01px]:gap-y-[10px] max-[560.01px]:gap-x-[10px] [&>*]:min-w-0'>
              <span className='pt-1 font-mono text-2xs text-primary-link'>0{index + 1}</span>
              <div>
                <h3 className='m-0 font-display text-lg'>{practice.title}</h3>
                <p className='mt-2 mb-0 max-w-[650px] text-xs leading-[1.7] text-muted-foreground'>
                  {practice.detail}
                </p>
              </div>
              <span className='justify-self-end rounded border border-border px-2 py-[6px] text-center font-mono text-2xs text-muted-foreground max-[800.01px]:col-start-2 max-[800.01px]:justify-self-start'>
                {practice.label}
              </span>
            </article>
          ))}
        </div>
      </section>

      <section
        className={cn(
          'mx-auto mb-[72px] grid w-[calc(100%_-_var(--page-gutter)_*_2)] max-w-none grid-cols-2 gap-[35px] rounded-md border border-border bg-card p-[29px] max-[800.01px]:grid-cols-1 max-[800.01px]:gap-5 max-[560.01px]:mb-14 max-[560.01px]:gap-[18px] max-[560.01px]:px-[19px] max-[560.01px]:py-[23px]',
        )}>
        <div>
          <p className='m-0 inline-flex items-center gap-[9px] font-display text-2xs font-semibold tracking-[0] text-muted-foreground uppercase'>
            Before paid services launch
          </p>
          <h2 className='text-[27px] max-[560.01px]:text-2xl'>
            Account and API data practices will be documented separately.
          </h2>
        </div>
        <p className='m-0 self-center text-xs leading-[1.75] text-muted-foreground'>
          Authentication, billing, cloud sync, and paid API usage are not connected to the current
          studio. Their collection, retention, and deletion rules should be published before those
          services are enabled. Read the <Link to='/privacy'>Privacy Policy</Link> for the full
          current notice and the <Link to='/terms'>Terms of Use</Link> for service conditions.
        </p>
      </section>
    </main>
  );
}
