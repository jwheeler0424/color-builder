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
import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import { PaletteArtwork } from '@/components/marketing/marketing-pages';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import './marketing-content.css';

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
    <div className='api-code-explorer'>
      <div className='api-code-topbar'>
        <div className='api-example-tabs' role='group' aria-label='API example language'>
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
      <pre className='api-code-block' aria-live='polite'>
        <code>{API_EXAMPLES[activeExample]}</code>
      </pre>
    </div>
  );
}

export function OverviewPage() {
  return (
    <main className='marketing-page-wide marketing-page-overview'>
      <section className='marketing-page-masthead overview-masthead'>
        <div className='marketing-wrap marketing-hero overview-hero'>
          <div className='marketing-hero-copy'>
            <p className='marketing-kicker'>A workspace for color systems</p>
            <h1 className='marketing-title'>
              Color that holds up, <em>all the way to code.</em>
            </h1>
            <p className='marketing-lede'>
              Explore a palette, test how it works, and build a system your team can ship. Chroma
              brings perceptual color tools and implementation-ready exports into one focused
              studio.
            </p>
            <div className='marketing-hero-actions'>
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
            </div>
            <p className='overview-free-note'>Start free · no account required</p>
          </div>
          <div className='marketing-hero-art'>
            <PaletteArtwork />
          </div>
        </div>
      </section>

      <section className='workflow-section' aria-label='The Chroma workflow'>
        <div className='marketing-wrap workflow-grid'>
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
          ].map((step) => (
            <Link
              key={step.number}
              to={step.to}
              className='workflow-step'
              data-section={step.section}>
              <step.icon className='workflow-step-watermark' aria-hidden='true' stroke={1.25} />
              <span className='workflow-number'>{step.number}</span>
              <span className='workflow-step-content'>
                <span className='workflow-step-title'>{step.title}</span>
                <span className='workflow-step-description'>{step.description}</span>
              </span>
              <IconArrowUpRight className='workflow-step-arrow' aria-hidden='true' size={18} />
            </Link>
          ))}
        </div>
      </section>

      <section className='marketing-wrap marketing-section overview-detail-grid'>
        <article>
          <p className='marketing-kicker'>Perceptual color, practical checks</p>
          <h2 className='marketing-section-title'>See the system, not just the swatches.</h2>
          <p>
            Work in OKLCH, inspect gamut, compare harmony, and check accessibility as part of the
            same design decision. Keep exploration connected to the output you will actually use.
          </p>
          <Link to='/features' className='marketing-text-link'>
            Explore the tools <IconArrowRight aria-hidden='true' size={15} />
          </Link>
        </article>
        <div className='overview-token-preview' aria-label='Example design tokens'>
          <div className='overview-token-heading'>
            <span>semantic / light</span>
            <span>CSS variables</span>
          </div>
          {[
            ['--color-brand', '#5267E8'],
            ['--color-accent', '#E64D89'],
            ['--color-success', '#0FA987'],
            ['--color-caution', '#F0A620'],
          ].map(([name, color]) => (
            <div className='overview-token-row' key={name}>
              <span className='overview-token-swatch' style={{ backgroundColor: color }} />
              <code>{name}</code>
              <code>{color}</code>
            </div>
          ))}
          <Link to='/guides' className='overview-token-link'>
            Learn the workflow <IconArrowUpRight aria-hidden='true' size={15} />
          </Link>
        </div>
      </section>

      <section className='overview-plan-band'>
        <div className='marketing-wrap overview-plan-inner'>
          <div>
            <p className='marketing-kicker'>Start with the essentials</p>
            <h2>Free gives you a useful first pass.</h2>
            <p>
              Build palettes up to six colors, run a basic contrast check, mix colors, make simple
              gradients, extract from images, and export foundational formats.
            </p>
          </div>
          <div className='overview-plan-links'>
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
    <main className='marketing-page-wide marketing-page-api'>
      <section className='marketing-page-masthead api-masthead'>
        <div className='marketing-wrap marketing-hero api-hero'>
          <div className='marketing-hero-copy'>
            <p className='marketing-kicker'>Developer API · Pro and Team</p>
            <h1 className='marketing-title'>
              Color intelligence, <em>in your workflow.</em>
            </h1>
            <p className='marketing-lede'>
              Put palette generation and color analysis alongside the tools your product team
              already uses. Design tokens can move from a color decision into your build pipeline.
            </p>
            <div className='marketing-hero-actions'>
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
            </div>
          </div>
          <div className='api-hero-detail'>
            <strong>Color rules your product can reuse.</strong>
            <div className='api-detail-flow'>
              <span>palette</span>
              <i aria-hidden='true' />
              <span>analysis</span>
              <i aria-hidden='true' />
              <span>tokens</span>
            </div>
            <p>Designed for repeatable handoff between design and code.</p>
          </div>
        </div>
      </section>

      <section className='api-preview-section'>
        <div className='marketing-wrap api-preview-grid'>
          <div>
            <p className='marketing-kicker'>A readable contract</p>
            <h2 className='marketing-section-title'>Make color decisions callable.</h2>
            <p className='api-copy'>
              Send a seed color and a few constraints. Get back structured palette values ready for
              review, analysis, or a token pipeline.
            </p>
            <ul className='api-capability-list'>
              <li>
                <IconCheck aria-hidden='true' size={16} /> Consistent color-space aware responses
              </li>
              <li>
                <IconCheck aria-hidden='true' size={16} /> Palette generation and analysis workflows
              </li>
              <li>
                <IconCheck aria-hidden='true' size={16} /> Paid access with metered usage allowances
              </li>
            </ul>
          </div>
          <div>
            <div className='api-draft-label'>Illustrative request · proposed contract</div>
            <ApiCodeExplorer />
            <p className='api-contract-note'>
              Example endpoint and response are a draft interface. Final API routes, authentication,
              quotas, and error formats will be specified with the API release. Keep API keys in
              server-side code; never expose them in browser JavaScript.
            </p>
          </div>
        </div>
      </section>

      <section className='marketing-wrap marketing-section api-plan-section'>
        <div className='api-plan-callout'>
          <div>
            <p className='marketing-kicker'>Part of the paid toolset</p>
            <h2>Build on the same color engine as the studio.</h2>
          </div>
          <p>
            API access is planned for Pro and Team. Pro includes an individual request allowance;
            Team adds a larger pooled allowance. Specific quotas and overage rules will be published
            before API usage is enabled.
          </p>
          <Link
            to='/pricing'
            data-slot='button'
            className={cn(
              buttonVariants({ size: 'lg', className: 'text-sm' }),
              'marketing-primary-link',
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
    <div className='guide-explorer'>
      <nav className='guide-topic-list' aria-label='Guides'>
        {GUIDE_TOPICS.map((topic, index) => (
          <Button
            key={topic.id}
            type='button'
            variant={activeGuide === topic.id ? 'secondary' : 'ghost'}
            className='min-h-10 min-w-0 px-2.5 py-2 text-left text-xs font-medium whitespace-normal'
            aria-pressed={activeGuide === topic.id}
            onClick={() => onGuideChange(topic.id)}>
            <span className='guide-topic-number'>0{index + 1}</span>
            <span>{topic.label}</span>
            <IconArrowRight aria-hidden='true' size={15} />
          </Button>
        ))}
      </nav>
      <article className='guide-article' aria-live='polite'>
        <p className='marketing-kicker'>Guide / {guide.label}</p>
        <h3>{guide.title}</h3>
        <p className='guide-intro'>{guide.intro}</p>
        <ol>
          {guide.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        {guide.id === 'contrast' && (
          <div className='guide-standard-note'>
            <strong>WCAG 2.1 contrast ratio</strong>
            <span>AA normal 4.5:1</span>
            <span>AA large 3:1</span>
          </div>
        )}
        <Link to={guide.id === 'tokens' ? '/features' : '/'} className='marketing-text-link'>
          {guide.id === 'tokens' ? 'Explore export tools' : 'Try it in the studio'}
          <IconArrowUpRight aria-hidden='true' size={15} />
        </Link>
      </article>
    </div>
  );
}

export function GuidesPage() {
  const [activeGuide, setActiveGuide] = useState<GuideTopic['id']>('palette');

  return (
    <main>
      <section className='marketing-wrap marketing-hero guides-hero'>
        <div className='marketing-hero-copy'>
          <p className='marketing-kicker'>Field notes for better color work</p>
          <h1 className='marketing-title'>
            Learn the why. <em>Then make it work.</em>
          </h1>
          <p className='marketing-lede'>
            Short, practical guides for moving from palette exploration to accessible, usable color
            systems.
          </p>
          <div className='marketing-hero-actions'>
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
          </div>
        </div>
        <div className='guides-index-art' aria-label='Guide topics'>
          <span>01 / Palette systems</span>
          <span>02 / Accessible contrast</span>
          <span>03 / Design tokens</span>
          <span>04 / Gradient craft</span>
        </div>
      </section>

      <section className='marketing-wrap marketing-section guide-section'>
        <div className='marketing-section-heading'>
          <div>
            <p className='marketing-kicker'>Choose a workflow</p>
            <h2 className='marketing-section-title'>Keep the next step close.</h2>
          </div>
          <p className='marketing-section-note'>
            Use these guides as a working reference while you build and review a color system.
          </p>
        </div>
        <GuideExplorer activeGuide={activeGuide} onGuideChange={setActiveGuide} />
      </section>

      <section className='guide-resource-band'>
        <div className='marketing-wrap guide-resource-inner'>
          <div>
            <p className='marketing-kicker'>More to explore</p>
            <h2>Need the whole workflow?</h2>
          </div>
          <p>
            See how palette generation, accessibility analysis, color building, and token exports
            fit together in Chroma.
          </p>
          <Link
            to='/features'
            data-slot='button'
            className={cn(
              buttonVariants({ size: 'lg', className: 'text-sm' }),
              'marketing-primary-link',
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
    <main className='marketing-page-wide marketing-page-documentation'>
      <section className='marketing-page-masthead documentation-masthead'>
        <div className='marketing-wrap marketing-hero documentation-hero'>
          <div className='marketing-hero-copy'>
            <p className='marketing-kicker'>Documentation</p>
            <h1 className='marketing-title'>A field guide to Chroma ELITE.</h1>
            <p className='marketing-lede'>
              Foundations for the application shell, design system, and visual styles.
            </p>
          </div>
          <div className='documentation-index-mark' aria-label='Three foundation topics'>
            <span>Foundation topics</span>
            <strong>03</strong>
            <span>Index / 001</span>
          </div>
        </div>
      </section>

      <section className='marketing-wrap marketing-section documentation-index'>
        <div className='marketing-section-heading'>
          <div>
            <p className='marketing-kicker'>Start here</p>
            <h2 className='marketing-section-title'>Interface foundations</h2>
          </div>
          <p className='marketing-section-note'>
            The core references for building with Chroma ELITE.
          </p>
        </div>
        <div className='documentation-topic-list'>
          {topics.map((topic, index) => (
            <article key={topic.title} className='documentation-topic'>
              <span className='documentation-topic-index'>0{index + 1}</span>
              <div>
                <h3>{topic.title}</h3>
                <p>{topic.summary}</p>
              </div>
              <span className='documentation-topic-status'>Coming next</span>
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
    to: '/support',
    hash: 'data',
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
    to: '/support',
    guideId: 'gradients',
  },
] as const;

export function SupportPage() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<SupportCategory>('All');
  const [activeGuide, setActiveGuide] = useState<GuideTopic['id']>('palette');
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
    <main className='marketing-page-wide marketing-page-support'>
      <section className='marketing-page-masthead support-masthead'>
        <div className='marketing-wrap support-intro'>
          <p className='marketing-kicker'>Help center</p>
          <h1 className='marketing-title'>Find your next step.</h1>
          <p className='marketing-lede'>
            Search practical answers for building, checking, and shipping color systems.
          </p>
          <label className='support-search'>
            <IconSearch aria-hidden='true' size={19} />
            <span className='sr-only'>Search help topics</span>
            <Input
              type='search'
              aria-label='Search help topics'
              placeholder='Search by topic or keyword'
              className='min-h-11 border-0 shadow-none focus-visible:ring-0'
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

      <section className='marketing-wrap support-content'>
        <div className='support-filter-panel'>
          <p className='support-filter-label'>Filter by topic</p>
          <div className='support-category-list' role='group' aria-label='Filter help topics'>
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
        <div className='support-results' aria-live='polite'>
          <p className='support-result-count'>
            {articles.length} {articles.length === 1 ? 'answer' : 'answers'}
          </p>
          {articles.length > 0 ? (
            articles.map((article) => {
              const guideId = 'guideId' in article ? article.guideId : null;
              const content = (
                <>
                  <span className='support-result-category'>{article.category}</span>
                  <span className='support-result-copy'>
                    <strong>{article.title}</strong>
                    <span>{article.summary}</span>
                  </span>
                  <IconArrowUpRight aria-hidden='true' size={17} />
                </>
              );

              return guideId ? (
                <a
                  key={article.title}
                  href='#guides'
                  className='support-result'
                  onClick={() => setActiveGuide(guideId)}>
                  {content}
                </a>
              ) : (
                <Link
                  key={article.title}
                  to={article.to}
                  hash={'hash' in article ? article.hash : undefined}
                  className='support-result'>
                  {content}
                </Link>
              );
            })
          ) : (
            <div className='support-empty'>
              <h2>No matching help topics</h2>
              <p>Try a broader search or clear the current category filter.</p>
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
      <section
        id='guides'
        aria-labelledby='support-guides-title'
        className='marketing-wrap marketing-section guide-section support-guide-section'>
        <div className='marketing-section-heading'>
          <div>
            <p className='marketing-kicker'>Step-by-step references</p>
            <h2 id='support-guides-title' className='marketing-section-title'>
              Color guides
            </h2>
          </div>
          <p className='marketing-section-note'>
            Build a palette, check contrast, prepare tokens, or refine a gradient.
          </p>
        </div>
        <GuideExplorer activeGuide={activeGuide} onGuideChange={setActiveGuide} />
      </section>

      <section
        id='data'
        aria-labelledby='support-data-title'
        className='marketing-wrap marketing-section data-practices-section'>
        <div className='marketing-section-heading'>
          <div>
            <p className='marketing-kicker'>Data &amp; privacy</p>
            <h2 id='support-data-title' className='marketing-section-title'>
              Know where your color work lives.
            </h2>
          </div>
          <p className='marketing-section-note'>
            A plain-language snapshot of how the current Chroma studio handles palettes, shared
            links, images, and color-name requests.
          </p>
        </div>
        <div className='data-overview-summary'>
          <div className='data-summary-mark'>
            <span>Current studio</span>
            <strong>Local-first</strong>
            <i aria-hidden='true' />
            <p>Your palettes stay in this browser unless you choose to share a link.</p>
          </div>
          <p className='data-overview-note'>
            These notes describe the current client-first app, not future account, billing, or API
            services.
          </p>
        </div>
        <div className='data-practices-list'>
          {DATA_PRACTICES.map((practice, index) => (
            <article key={practice.title} className='data-practice'>
              <span className='data-practice-index'>0{index + 1}</span>
              <div>
                <h3>{practice.title}</h3>
                <p>{practice.detail}</p>
              </div>
              <span className='data-practice-label'>{practice.label}</span>
            </article>
          ))}
        </div>
      </section>

      <section className='marketing-wrap data-policy-note'>
        <div>
          <p className='marketing-kicker'>Before paid services launch</p>
          <h2>Account and API data practices will be documented separately.</h2>
        </div>
        <p>
          Authentication, billing, cloud sync, and paid API usage are not connected to the current
          studio. Their collection, retention, and deletion rules should be published before those
          services are enabled. Read the <Link to='/privacy'>Privacy Policy</Link> for the full
          current notice and the <Link to='/terms'>Terms of Use</Link> for service conditions.
        </p>
      </section>
    </main>
  );
}
