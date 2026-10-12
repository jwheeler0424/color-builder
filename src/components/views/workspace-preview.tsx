import {
  IconArrowUpRight as ArrowUpRight,
  IconCheck as Check,
  IconCircleCheck as CheckCircle2,
  IconCircle as Circle,
  IconClockHour3 as Clock3,
  IconComponents as Component,
  IconHexagon as Hexagon,
  IconStack2 as Layers,
  IconDots as MoreHorizontal,
  IconPlus as Plus,
  IconQuote as Quote,
  IconSearch as Search,
  IconSquare as Square,
  IconStar as Star,
  IconTrash as Trash2,
  IconTriangle as Triangle,
  IconUsers as Users,
  IconX as X,
  IconBolt as Zap,
} from '@tabler/icons-react';
import { useState, type CSSProperties, type ReactNode } from 'react';

import type { PaletteSlot, SemanticToken, UtilityRole } from '@/types';

import { deriveThemeTokens, parseColor, textColor } from '@/lib/engine/browser';

import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

type Mode = 'light' | 'dark';
type Utility = ReturnType<typeof deriveThemeTokens>['utility'];
export type PreviewPage = 'landing' | 'projects' | 'activity' | 'settings';

// ─── Theme helpers ────────────────────────────────────────────────────────────

type Theme = {
  get: (name: string) => string;
  mode: Mode;
  utility: Utility;
  accent: (index: number) => string;
  ink: (hex: string) => string;
  primary: CSSProperties;
  secondary: CSSProperties;
};

const mix = (a: string, b: string, pct: number) => `color-mix(in oklab, ${a} ${pct}%, ${b})`;

const BUTTON =
  'inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 text-xs font-semibold whitespace-nowrap outline-none transition-[filter] hover:brightness-110 focus-visible:ring-2 disabled:opacity-50';

function ringStyle(t: Theme, style: CSSProperties): CSSProperties {
  return { ...style, '--tw-ring-color': t.get('--ring') } as CSSProperties;
}

function pillStyle(t: Theme, role: UtilityRole): CSSProperties {
  const u = t.utility[role];
  return { background: t.mode === 'light' ? u.subtle : u.subtleDark, color: u[t.mode] };
}

function Avatar({
  t,
  index,
  initials,
  className = 'size-6 text-[9px]',
}: {
  t: Theme;
  index: number;
  initials: string;
  className?: string;
}) {
  const bg = t.accent(index);
  return (
    <span
      title={initials}
      className={`grid shrink-0 place-items-center rounded-full font-bold ring-2 ${className}`}
      style={
        {
          background: bg,
          color: t.ink(bg),
          '--tw-ring-color': t.get('--card'),
        } as CSSProperties
      }>
      {initials}
    </span>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const w = 64;
  const h = 22;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - 2 - ((v - min) / (max - min || 1)) * (h - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className='h-5 w-16 shrink-0' fill='none' aria-hidden>
      <polyline
        points={points}
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  );
}

function Card({
  t,
  children,
  className = '',
  raised,
  style,
}: {
  t: Theme;
  children: ReactNode;
  className?: string;
  raised?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`rounded-lg border ${className}`}
      style={{
        background: t.get(raised ? '--card-raised' : '--card'),
        color: t.get(raised ? '--card-raised-foreground' : '--card-foreground'),
        borderColor: t.get('--border'),
        ...style,
      }}>
      {children}
    </div>
  );
}

// ─── Sample data ──────────────────────────────────────────────────────────────

type PreviewProject = {
  id: string;
  name: string;
  category: string;
  status: 'Active' | 'Review' | 'Complete' | 'Blocked';
  progress: number;
  owner: string;
  due: string;
};

const PEOPLE: Record<string, { name: string; index: number }> = {
  AJ: { name: 'Avery James', index: 0 },
  NL: { name: 'Noor Lin', index: 1 },
  EC: { name: 'Eli Chen', index: 2 },
  JK: { name: 'Jordan Kim', index: 3 },
  MR: { name: 'Maya Reyes', index: 4 },
};

const PREVIEW_PROJECTS: PreviewProject[] = [
  {
    id: 'website',
    name: 'Website refresh',
    category: 'Marketing / Web',
    status: 'Active',
    progress: 72,
    owner: 'AJ',
    due: 'Oct 12',
  },
  {
    id: 'mobile',
    name: 'Mobile application',
    category: 'Product / iOS',
    status: 'Review',
    progress: 45,
    owner: 'NL',
    due: 'Oct 18',
  },
  {
    id: 'brand',
    name: 'Brand guidelines',
    category: 'Design / Identity',
    status: 'Complete',
    progress: 100,
    owner: 'EC',
    due: 'Oct 05',
  },
  {
    id: 'portal',
    name: 'Customer portal',
    category: 'Engineering / Web',
    status: 'Blocked',
    progress: 31,
    owner: 'JK',
    due: 'Oct 21',
  },
];

const STATUS_ROLE: Record<PreviewProject['status'], UtilityRole> = {
  Complete: 'success',
  Review: 'warning',
  Blocked: 'error',
  Active: 'info',
};

const STATUS_LABEL: Record<PreviewProject['status'], string> = {
  Complete: 'Done',
  Review: 'In review',
  Blocked: 'Blocked',
  Active: 'Active',
};

type ActivityEvent = {
  id: string;
  projectId: string;
  person: string;
  verb: string;
  when: string;
  group: 'Today' | 'Yesterday';
  note?: string;
};

const ACTIVITY: ActivityEvent[] = [
  {
    id: 'a1',
    projectId: 'mobile',
    person: 'NL',
    verb: 'requested a review on',
    when: '9:42 AM',
    group: 'Today',
    note: 'Onboarding flow is ready. Could you check the empty states before Friday?',
  },
  {
    id: 'a2',
    projectId: 'website',
    person: 'AJ',
    verb: 'moved to 72% on',
    when: '8:15 AM',
    group: 'Today',
  },
  {
    id: 'a3',
    projectId: 'portal',
    person: 'JK',
    verb: 'flagged a blocker on',
    when: '5:30 PM',
    group: 'Yesterday',
    note: 'Waiting on SSO credentials from the customer security team.',
  },
  {
    id: 'a4',
    projectId: 'brand',
    person: 'EC',
    verb: 'completed',
    when: '2:05 PM',
    group: 'Yesterday',
  },
];

const WEEK = [
  { day: 'M', value: 38 },
  { day: 'T', value: 62 },
  { day: 'W', value: 48 },
  { day: 'T', value: 84 },
  { day: 'F', value: 70 },
  { day: 'S', value: 22 },
  { day: 'S', value: 30 },
];

// ─── Shared page pieces ───────────────────────────────────────────────────────

function PageHeader({
  t,
  crumb,
  title,
  subtitle,
  onNew,
}: {
  t: Theme;
  crumb: string;
  title: string;
  subtitle: string;
  onNew: () => void;
}) {
  const { get } = t;
  return (
    <div className='flex flex-wrap items-end justify-between gap-3'>
      <div className='min-w-0'>
        <div
          className='mb-1 hidden text-[10px] @min-[34rem]/workspace:block'
          style={{ color: get('--muted-foreground') }}>
          Workspace / {crumb}
        </div>
        <h3 className='font-display text-xl leading-tight font-bold'>{title}</h3>
        <p className='mt-1 text-[11px]' style={{ color: get('--muted-foreground') }}>
          {subtitle}
        </p>
      </div>
      <button type='button' onClick={onNew} className={BUTTON} style={ringStyle(t, t.primary)}>
        <Plus className='size-3.5' />
        New project
      </button>
    </div>
  );
}

// ─── Landing ──────────────────────────────────────────────────────────────────

const BAR_HEIGHTS = [38, 52, 44, 66, 58, 74, 62, 86, 70, 92, 80, 100];

function ProductMockup({ t }: { t: Theme }) {
  const { get, accent, utility, mode } = t;
  const hair = mix(get('--foreground'), 'transparent', 10);
  const skeleton = mix(get('--foreground'), 'transparent', 12);
  const rows = [
    { label: 'Finalize onboarding flow', pill: 'Done', role: 'success' as const, person: 0 },
    { label: 'Design review', pill: 'In review', role: 'warning' as const, person: 1 },
    { label: 'Ship billing update', pill: 'Planned', role: 'info' as const, person: 2 },
  ];
  return (
    <div
      aria-hidden
      className='mx-auto w-[94%] max-w-xl overflow-hidden rounded-t-xl border border-b-0'
      style={{
        background: get('--background'),
        color: get('--foreground'),
        borderColor: mix(get('--primary-container-foreground'), 'transparent', 22),
        boxShadow: `0 -12px 48px -12px ${mix(get('--primary'), 'transparent', 45)}`,
      }}>
      <div
        className='flex items-center gap-1.5 border-b px-3 py-2'
        style={{ background: get('--surface-dim'), borderColor: get('--border') }}>
        {(['error', 'warning', 'success'] as const).map((role) => (
          <span
            key={role}
            className='size-2 rounded-full'
            style={{ background: utility[role][mode] }}
          />
        ))}
        <span
          className='mx-auto rounded px-6 py-0.5 text-[9px]'
          style={{ background: hair, color: get('--muted-foreground') }}>
          orbit.app/roadmap
        </span>
      </div>
      <div className='flex'>
        <div
          className='hidden w-24 shrink-0 flex-col gap-2 border-r p-3 @min-[34rem]/workspace:flex'
          style={{ borderColor: get('--border'), background: get('--surface-dim') }}>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className='h-2 rounded-full'
              style={{
                width: `${88 - i * 14}%`,
                background: i === 0 ? get('--primary') : skeleton,
              }}
            />
          ))}
        </div>
        <div className='flex min-w-0 flex-1 flex-col gap-3 p-3 text-left'>
          <div className='flex items-center justify-between'>
            <span className='font-display text-[12px] font-bold'>Q4 roadmap</span>
            <span
              className='rounded px-1.5 py-0.5 text-[9px] font-semibold'
              style={pillStyle(t, 'success')}>
              On track
            </span>
          </div>
          <div className='grid grid-cols-3 gap-2'>
            {[
              { label: 'Shipped', value: '128', delta: '+12%' },
              { label: 'Velocity', value: '94%', delta: '+4%' },
              { label: 'Cycle time', value: '3.2d', delta: '-9%' },
            ].map((stat) => (
              <div
                key={stat.label}
                className='rounded-md border p-2'
                style={{ background: get('--card'), borderColor: get('--border') }}>
                <div className='text-[8px]' style={{ color: get('--muted-foreground') }}>
                  {stat.label}
                </div>
                <div className='font-display text-sm leading-tight font-bold'>{stat.value}</div>
                <div className='text-[8px] font-semibold' style={{ color: utility.success[mode] }}>
                  {stat.delta}
                </div>
              </div>
            ))}
          </div>
          <div
            className='flex h-20 items-end gap-1 rounded-md border p-2'
            style={{ background: get('--card'), borderColor: get('--border') }}>
            {BAR_HEIGHTS.map((height, i) => (
              <span
                key={i}
                className='flex-1 rounded-t-sm'
                style={{
                  height: `${height}%`,
                  background: i === BAR_HEIGHTS.length - 1 ? get('--primary') : accent(i % 4),
                  opacity: i === BAR_HEIGHTS.length - 1 ? 1 : 0.55,
                }}
              />
            ))}
          </div>
          <div className='flex flex-col'>
            {rows.map((row) => (
              <div
                key={row.label}
                className='flex items-center gap-2 border-t py-1.5 text-[10px]'
                style={{ borderColor: get('--border') }}>
                <span
                  className='grid size-3.5 place-items-center rounded-full'
                  style={{
                    background: row.role === 'success' ? get('--primary') : 'transparent',
                    color: get('--primary-foreground'),
                    border: `1.5px solid ${row.role === 'success' ? get('--primary') : get('--border-strong')}`,
                  }}>
                  {row.role === 'success' && <Check className='size-2' stroke={4} />}
                </span>
                <span className='min-w-0 flex-1 truncate'>{row.label}</span>
                <span
                  className='rounded px-1.5 py-0.5 text-[8px] font-semibold'
                  style={pillStyle(t, row.role)}>
                  {row.pill}
                </span>
                <Avatar t={t} index={row.person} initials='' className='size-4 text-[7px]' />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LandingPage({ t, onStart }: { t: Theme; onStart: () => void }) {
  const { get, accent, ink, mode } = t;
  const [annual, setAnnual] = useState(false);
  const container = get('--primary-container');
  const onContainer = get('--primary-container-foreground');
  const muted = { color: get('--muted-foreground') };

  const features = [
    {
      icon: Layers,
      name: 'Plans that stay clear',
      copy: 'Roadmaps, milestones and owners in one view, from first idea to launch day.',
    },
    {
      icon: Users,
      name: 'Shared momentum',
      copy: 'See what is moving, what shipped and where a teammate could use a hand.',
    },
    {
      icon: Zap,
      name: 'Fewer check-ins',
      copy: 'Updates live next to the work, so status meetings become optional.',
    },
  ];

  const plans = [
    {
      name: 'Starter',
      price: 'Free',
      unit: '',
      details: 'For personal projects and small teams',
      action: 'Start free',
      features: ['Unlimited projects', 'Up to 3 collaborators', '7-day activity history'],
    },
    {
      name: 'Team',
      price: annual ? '$12' : '$16',
      unit: '/ member / mo',
      details: 'For growing teams that ship together',
      action: 'Start Team plan',
      popular: true,
      features: ['Unlimited projects', 'Advanced permissions', 'Unlimited history'],
    },
    {
      name: 'Business',
      price: annual ? '$24' : '$32',
      unit: '/ member / mo',
      details: 'For organizations with compliance needs',
      action: 'Contact sales',
      features: ['Everything in Team', 'SSO and audit log', 'Priority support'],
    },
  ];

  return (
    <div className='flex shrink-0 flex-col gap-8'>
      <section
        className='relative isolate overflow-hidden rounded-xl'
        style={{ background: container, color: onContainer }}>
        <div aria-hidden className='pointer-events-none absolute inset-0 -z-10'>
          <div
            className='absolute -top-24 -right-16 size-72 rounded-full blur-3xl'
            style={{ background: mix(accent(1), container, 38) }}
          />
          <div
            className='absolute top-1/3 -left-24 size-64 rounded-full blur-3xl'
            style={{ background: mix(accent(2), container, 32) }}
          />
          <div
            className='absolute -right-10 -bottom-24 size-64 rounded-full blur-3xl'
            style={{ background: mix(accent(3), container, 32) }}
          />
          <div
            className='absolute inset-0'
            style={{
              backgroundImage: `radial-gradient(${mix(onContainer, 'transparent', 22)} 1px, transparent 1px)`,
              backgroundSize: '18px 18px',
              maskImage: 'linear-gradient(to bottom, black, transparent 70%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black, transparent 70%)',
            }}
          />
        </div>
        <div className='flex flex-col items-center px-5 pt-8 text-center @min-[36rem]/workspace:px-10 @min-[36rem]/workspace:pt-12'>
          <span
            className='inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold'
            style={{
              borderColor: mix(onContainer, 'transparent', 28),
              background: mix(onContainer, 'transparent', 8),
            }}>
            <span className='size-1.5 rounded-full' style={{ background: get('--primary') }} />
            New: roadmap views
          </span>
          <h3 className='mt-4 max-w-lg font-display text-3xl leading-[1.05] font-extrabold text-balance @min-[36rem]/workspace:text-5xl'>
            Keep every project in orbit
          </h3>
          <p className='mt-3 max-w-md text-[12px] leading-relaxed text-balance @min-[36rem]/workspace:text-sm'>
            Orbit brings plans, conversations and progress together, so your team spends less time
            coordinating and more time doing its best work.
          </p>
          <div className='mt-5 flex flex-wrap justify-center gap-2'>
            <button
              type='button'
              onClick={onStart}
              className={`${BUTTON} h-9 px-4`}
              style={ringStyle(t, t.primary)}>
              Get started
              <ArrowUpRight className='size-3.5' />
            </button>
            <button
              type='button'
              onClick={() =>
                document
                  .getElementById(`preview-pricing-${mode}`)
                  ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
              }
              className={`${BUTTON} h-9 border px-4`}
              style={ringStyle(t, {
                background: mix(onContainer, 'transparent', 8),
                color: onContainer,
                borderColor: mix(onContainer, 'transparent', 30),
              })}>
              View pricing
            </button>
          </div>
          <div className='mt-5 mb-8 flex items-center gap-2 text-[10px]'>
            <span className='flex -space-x-1.5'>
              {['AJ', 'NL', 'EC', 'JK'].map((who, i) => (
                <span
                  key={who}
                  className='grid size-5 place-items-center rounded-full text-[8px] font-bold ring-2'
                  style={
                    {
                      background: accent(i),
                      color: ink(accent(i)),
                      '--tw-ring-color': container,
                    } as CSSProperties
                  }>
                  {who}
                </span>
              ))}
            </span>
            <span className='flex items-center gap-0.5'>
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} className='size-3 fill-current' />
              ))}
            </span>
            <span>Loved by 12,000+ teams</span>
          </div>
        </div>
        <ProductMockup t={t} />
      </section>

      <div className='flex flex-col items-center gap-3 text-center'>
        <span className='text-[10px] tracking-widest uppercase' style={muted}>
          Trusted by teams at
        </span>
        <div
          className='flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-display text-sm font-bold'
          style={{ color: mix(get('--foreground'), get('--background'), 55) }}>
          {[
            { icon: Hexagon, name: 'Acme' },
            { icon: Triangle, name: 'Northstar' },
            { icon: Circle, name: 'Capsule' },
            { icon: Square, name: 'Helix' },
            { icon: Component, name: 'Lumen' },
          ].map(({ icon: Icon, name }) => (
            <span key={name} className='inline-flex items-center gap-1.5'>
              <Icon className='size-4' />
              {name}
            </span>
          ))}
        </div>
      </div>

      <section className='flex flex-col gap-4'>
        <div className='flex flex-col gap-1'>
          <span className='text-[10px] font-semibold tracking-widest uppercase' style={muted}>
            Features
          </span>
          <h4 className='font-display text-xl font-bold'>
            Everything your team needs in one place
          </h4>
        </div>
        <div className='grid grid-cols-1 gap-3 @min-[34rem]/workspace:grid-cols-3'>
          {features.map(({ icon: Icon, name, copy }, i) => (
            <Card t={t} key={name} className='flex flex-col gap-3 p-4'>
              <span
                className='grid size-9 place-items-center rounded-lg'
                style={{ background: accent(i), color: ink(accent(i)) }}>
                <Icon className='size-4.5' />
              </span>
              <span className='text-[13px] font-semibold'>{name}</span>
              <p className='text-[11px] leading-relaxed' style={muted}>
                {copy}
              </p>
              <span
                className='mt-auto inline-flex items-center gap-1 text-[11px] font-semibold'
                style={{ color: get('--primary') }}>
                Learn more
                <ArrowUpRight className='size-3' />
              </span>
            </Card>
          ))}
        </div>
      </section>

      <section
        className='grid grid-cols-3 divide-x rounded-lg border py-4 text-center'
        style={{
          background: get('--card-raised'),
          color: get('--card-raised-foreground'),
          borderColor: get('--border'),
        }}>
        {[
          { value: '4.8x', label: 'faster handoffs' },
          { value: '98%', label: 'on-time delivery' },
          { value: '12k', label: 'teams onboard' },
        ].map((stat) => (
          <div
            key={stat.label}
            className='flex flex-col gap-1'
            style={{ borderColor: get('--border') }}>
            <span
              className='font-display text-2xl font-extrabold tabular-nums'
              style={{ color: get('--primary') }}>
              {stat.value}
            </span>
            <span className='text-[10px]' style={muted}>
              {stat.label}
            </span>
          </div>
        ))}
      </section>

      <Card t={t} className='relative flex flex-col gap-4 p-5'>
        <Quote className='size-6' style={{ color: get('--primary') }} />
        <p className='font-display text-base leading-snug font-semibold text-balance'>
          Orbit replaced three tools and a weekly status meeting. Our designers and engineers
          finally look at the same plan.
        </p>
        <div className='flex items-center gap-3'>
          <Avatar t={t} index={4} initials='MR' className='size-8 text-[10px]' />
          <div className='flex flex-col'>
            <span className='text-[12px] font-semibold'>Maya Reyes</span>
            <span className='text-[10px]' style={muted}>
              Head of Design, Northstar
            </span>
          </div>
        </div>
      </Card>

      <section id={`preview-pricing-${mode}`} className='flex flex-col gap-4'>
        <div className='flex flex-wrap items-end justify-between gap-3'>
          <div className='flex flex-col gap-1'>
            <span className='text-[10px] font-semibold tracking-widest uppercase' style={muted}>
              Pricing
            </span>
            <h4 className='font-display text-xl font-bold'>A plan for every team</h4>
          </div>
          <div className='flex items-center gap-2'>
            <span className='text-[10px] font-semibold' style={{ color: get('--primary') }}>
              Save 25%
            </span>
            <div
              role='group'
              aria-label='Pricing cadence'
              className='flex gap-0.5 rounded-md border p-0.5'
              style={{ borderColor: get('--border'), background: get('--muted') }}>
              {[false, true].map((yearly) => (
                <button
                  key={String(yearly)}
                  type='button'
                  aria-pressed={annual === yearly}
                  onClick={() => setAnnual(yearly)}
                  className='h-6 cursor-pointer rounded-sm px-2.5 text-[10px] font-semibold'
                  style={
                    annual === yearly
                      ? { background: get('--primary'), color: get('--primary-foreground') }
                      : { color: get('--muted-foreground') }
                  }>
                  {yearly ? 'Yearly' : 'Monthly'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className='mx-auto grid w-full max-w-sm grid-cols-1 gap-4 @min-[30rem]/workspace:max-w-4xl @min-[30rem]/workspace:grid-cols-3'>
          {plans.map((plan) => (
            <Card
              t={t}
              key={plan.name}
              className='relative flex flex-col gap-3 p-4'
              style={
                plan.popular
                  ? {
                      borderColor: get('--primary'),
                      boxShadow: `0 0 0 1px ${get('--primary')}, 0 12px 32px -16px ${get('--primary')}`,
                    }
                  : undefined
              }>
              {plan.popular && (
                <span
                  className='absolute -top-2.5 left-4 rounded-full px-2 py-0.5 text-[9px] font-bold'
                  style={t.primary}>
                  Most popular
                </span>
              )}
              <span className='text-xs font-semibold'>{plan.name}</span>
              <div className='flex items-baseline gap-1'>
                <span className='font-display text-3xl leading-none font-extrabold'>
                  {plan.price}
                </span>
                {plan.unit && (
                  <span className='text-[10px]' style={muted}>
                    {plan.unit}
                  </span>
                )}
              </div>
              <p className='text-[10px] leading-relaxed' style={muted}>
                {plan.details}
              </p>
              <div
                className='flex flex-col gap-2 border-t pt-3 text-[11px]'
                style={{ borderColor: get('--border') }}>
                {plan.features.map((feature) => (
                  <span key={feature} className='flex items-center gap-2'>
                    <span
                      className='grid size-4 shrink-0 place-items-center rounded-full'
                      style={{
                        background: get('--primary-container'),
                        color: get('--primary-container-foreground'),
                      }}>
                      <Check className='size-2.5' stroke={3} />
                    </span>
                    {feature}
                  </span>
                ))}
              </div>
              <button
                type='button'
                onClick={onStart}
                className={`${BUTTON} mt-auto w-full border`}
                style={ringStyle(
                  t,
                  plan.popular ? { ...t.primary, borderColor: 'transparent' } : t.secondary,
                )}>
                {plan.action}
              </button>
            </Card>
          ))}
        </div>
      </section>

      <section
        className='relative isolate flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-xl p-5'
        style={t.primary}>
        <div
          aria-hidden
          className='absolute -top-16 -right-10 -z-10 size-48 rounded-full blur-3xl'
          style={{ background: mix(accent(1), get('--primary'), 45) }}
        />
        <div className='flex min-w-0 flex-col gap-1'>
          <h4 className='font-display text-lg font-bold'>Ready to bring your team into orbit?</h4>
          <span className='text-[11px]'>Set up your workspace in minutes. No card required.</span>
        </div>
        <button
          type='button'
          onClick={onStart}
          className={`${BUTTON} h-9`}
          style={ringStyle(t, {
            background: get('--primary-foreground'),
            color: get('--primary'),
          })}>
          Create workspace
          <ArrowUpRight className='size-3.5' />
        </button>
      </section>
    </div>
  );
}

// ─── Projects ─────────────────────────────────────────────────────────────────

function ProjectsPage({
  t,
  projects,
  visible,
  selected,
  setSelected,
  filter,
  setFilter,
  search,
  setSearch,
  menuId,
  setMenuId,
  removeProjects,
  completeProject,
}: {
  t: Theme;
  projects: PreviewProject[];
  visible: PreviewProject[];
  selected: string[];
  setSelected: (ids: string[]) => void;
  filter: 'all' | 'progress' | 'complete';
  setFilter: (filter: 'all' | 'progress' | 'complete') => void;
  search: string;
  setSearch: (value: string) => void;
  menuId: string | null;
  setMenuId: (id: string | null) => void;
  removeProjects: (ids: string[]) => void;
  completeProject: (id: string) => void;
}) {
  const { get, accent, ink, utility, mode } = t;
  const [searchFocused, setSearchFocused] = useState(false);
  const muted = { color: get('--muted-foreground') };
  const active = projects.filter((project) => project.status !== 'Complete').length;
  const average = projects.length
    ? Math.round(projects.reduce((total, project) => total + project.progress, 0) / projects.length)
    : 0;
  const blocked = projects.filter((project) => project.status === 'Blocked').length;
  const columns =
    'grid-cols-[1.25rem_minmax(0,1fr)_5.5rem_2rem] @min-[30rem]/workspace:grid-cols-[1.25rem_minmax(0,1fr)_5.5rem_4rem_2rem]';

  const kpis = [
    { label: 'Active projects', value: active, delta: '+2', spark: [3, 4, 3, 5, 4, 6, 7], i: 0 },
    {
      label: 'Completion',
      value: `${average}%`,
      delta: '+8%',
      spark: [30, 34, 41, 39, 48, 55, 62],
      i: 1,
    },
    { label: 'Needs review', value: blocked, delta: '-1', spark: [5, 4, 4, 3, 3, 2, 1], i: 2 },
  ];

  const owners = Object.keys(PEOPLE)
    .map((key) => ({ key, count: projects.filter((project) => project.owner === key).length }))
    .filter((owner) => owner.count > 0);

  return (
    <>
      <div className='grid grid-cols-3 gap-2'>
        {kpis.map((kpi) => (
          <Card t={t} key={kpi.label} className='flex min-w-0 flex-col gap-2 p-3'>
            <span className='truncate text-[10px]' style={muted}>
              {kpi.label}
            </span>
            <div className='flex items-end justify-between gap-2'>
              <span className='font-display text-2xl leading-none font-extrabold tabular-nums'>
                {kpi.value}
              </span>
              <span className='hidden @min-[28rem]/workspace:block'>
                <Sparkline values={kpi.spark} color={accent(kpi.i)} />
              </span>
            </div>
            <span
              className='w-fit rounded px-1.5 py-0.5 text-[9px] font-semibold'
              style={pillStyle(t, 'success')}>
              {kpi.delta} this week
            </span>
          </Card>
        ))}
      </div>

      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div
          className='flex gap-0.5 rounded-md border p-0.5'
          role='group'
          aria-label='Project filters'
          style={{ borderColor: get('--border'), background: get('--muted') }}>
          {(
            [
              { id: 'all', label: 'All projects' },
              { id: 'progress', label: 'In progress' },
              { id: 'complete', label: 'Completed' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type='button'
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
              className='h-6 cursor-pointer rounded-sm px-2.5 text-[10px] font-semibold'
              style={
                filter === item.id
                  ? {
                      background: get('--card'),
                      color: get('--card-foreground'),
                      boxShadow: `0 0 0 1px ${get('--border')}`,
                    }
                  : muted
              }>
              {item.label}
            </button>
          ))}
        </div>
        <div
          className='flex h-8 w-full items-center gap-2 rounded-md border px-2.5 @min-[28rem]/workspace:w-48'
          style={{
            background: get('--background'),
            borderColor: searchFocused ? get('--ring') : get('--input'),
            boxShadow: searchFocused
              ? `0 0 0 2px ${mix(get('--ring'), 'transparent', 40)}`
              : undefined,
          }}>
          <Search className='size-3.5 shrink-0' style={muted} />
          <input
            type='search'
            aria-label='Search projects'
            placeholder='Search projects'
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className='w-full min-w-0 bg-transparent text-[11px] outline-none'
          />
        </div>
      </div>

      {selected.length > 0 && (
        <div
          className='flex items-center justify-between gap-3 rounded-md border p-2.5 text-[11px]'
          style={{
            background: get('--destructive-subtle'),
            color: get('--destructive'),
            borderColor: mix(get('--destructive'), 'transparent', 40),
          }}>
          <span>{selected.length} selected</span>
          <button
            type='button'
            onClick={() => removeProjects(selected)}
            className='inline-flex cursor-pointer items-center gap-1.5 font-semibold'>
            <Trash2 className='size-3' />
            Delete selected
          </button>
        </div>
      )}

      <Card t={t} className='shrink-0 overflow-hidden'>
        <div
          className={`grid ${columns} items-center gap-2 border-b px-3 py-2 text-[9px] font-semibold tracking-wider uppercase`}
          style={{
            background: get('--card-raised'),
            color: get('--muted-foreground'),
            borderColor: get('--border'),
          }}>
          <input
            type='checkbox'
            aria-label='Select all projects'
            checked={
              visible.length > 0 && visible.every((project) => selected.includes(project.id))
            }
            onChange={(event) =>
              setSelected(
                event.target.checked
                  ? [...new Set([...selected, ...visible.map((project) => project.id)])]
                  : selected.filter((id) => !visible.some((project) => project.id === id)),
              )
            }
            style={{ accentColor: get('--primary') }}
          />
          <span>Project</span>
          <span>Status</span>
          <span className='hidden @min-[30rem]/workspace:block'>Due</span>
          <span />
        </div>
        {visible.map((project, index) => {
          const tile = accent(index);
          const isSelected = selected.includes(project.id);
          const person = PEOPLE[project.owner] ?? PEOPLE.AJ;
          return (
            <div
              key={project.id}
              data-preview-project={project.id}
              className={`grid ${columns} items-center gap-2 border-b px-3 py-2.5 last:border-b-0`}
              style={{
                borderColor: get('--border'),
                background: isSelected ? get('--accent') : undefined,
                color: isSelected ? get('--accent-foreground') : undefined,
              }}>
              <input
                type='checkbox'
                aria-label={`Select ${project.name}`}
                checked={isSelected}
                onChange={(event) =>
                  setSelected(
                    event.target.checked
                      ? [...selected, project.id]
                      : selected.filter((id) => id !== project.id),
                  )
                }
                style={{ accentColor: get('--primary') }}
              />
              <div className='flex min-w-0 items-center gap-2.5'>
                <span
                  className='grid size-8 shrink-0 place-items-center rounded-md font-display text-[12px] font-bold'
                  style={{ background: tile, color: ink(tile) }}>
                  {project.name[0]}
                </span>
                <div className='flex min-w-0 flex-1 flex-col gap-1'>
                  <span
                    className='truncate text-[12px] leading-tight font-semibold'
                    title={project.name}>
                    {project.name}
                  </span>
                  <div className='flex min-w-0 items-center gap-2'>
                    <span className='min-w-0 truncate text-[10px] leading-none' style={muted}>
                      {project.category}
                    </span>
                    <div
                      className='hidden h-1 w-12 shrink-0 overflow-hidden rounded-full @min-[28rem]/workspace:block'
                      style={{ background: get('--muted') }}>
                      <div
                        className='h-full rounded-full'
                        style={{ width: `${project.progress}%`, background: get('--primary') }}
                      />
                    </div>
                    <span className='text-[9px] tabular-nums' style={muted}>
                      {project.progress}%
                    </span>
                  </div>
                </div>
                <span className='hidden @min-[28rem]/workspace:block'>
                  <Avatar
                    t={t}
                    index={person.index}
                    initials={project.owner}
                    className='size-6 text-[8px]'
                  />
                </span>
              </div>
              <span
                className='inline-flex items-center justify-center gap-1 rounded-full px-2 py-1 text-[9px] font-semibold'
                style={pillStyle(t, STATUS_ROLE[project.status])}>
                {STATUS_LABEL[project.status]}
              </span>
              <span className='hidden text-[10px] @min-[30rem]/workspace:block' style={muted}>
                {project.due}
              </span>
              <Popover
                open={menuId === project.id}
                onOpenChange={(open) => setMenuId(open ? project.id : null)}>
                <PopoverTrigger
                  aria-label={`Actions for ${project.name}`}
                  title={`Actions for ${project.name}`}
                  className='grid size-7 cursor-pointer place-items-center rounded-md'
                  style={muted}>
                  <MoreHorizontal className='size-4' />
                </PopoverTrigger>
                <PopoverContent
                  aria-label={`${project.name} actions`}
                  className='w-44 p-1.5'
                  style={{
                    background: get('--popover'),
                    color: get('--popover-foreground'),
                    borderColor: get('--border'),
                  }}>
                  <button
                    type='button'
                    disabled={project.status === 'Complete'}
                    onClick={() => completeProject(project.id)}
                    className='flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-left text-[11px] disabled:opacity-50'>
                    <CheckCircle2 className='size-3.5' />
                    Mark complete
                  </button>
                  <button
                    type='button'
                    onClick={() => removeProjects([project.id])}
                    className='flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-left text-[11px]'
                    style={{ color: get('--destructive') }}>
                    <Trash2 className='size-3.5' />
                    Delete project
                  </button>
                </PopoverContent>
              </Popover>
            </div>
          );
        })}
        {visible.length === 0 && (
          <div className='flex flex-col items-center gap-2 px-4 py-10 text-center'>
            <span
              className='grid size-10 place-items-center rounded-full'
              style={{ background: get('--muted'), color: get('--muted-foreground') }}>
              <Search className='size-4' />
            </span>
            <span className='text-xs font-semibold'>No projects found</span>
            <span className='text-[10px]' style={muted}>
              Try a different search or filter.
            </span>
          </div>
        )}
      </Card>

      <div className='grid grid-cols-1 gap-3 @min-[34rem]/workspace:grid-cols-2'>
        <div
          className='flex items-start gap-3 rounded-lg border p-3'
          style={{
            background: pillStyle(t, 'info').background,
            color: utility.info[mode],
            borderColor: mix(utility.info[mode], 'transparent', 35),
          }}>
          <Clock3 className='mt-0.5 size-4 shrink-0' />
          <div className='flex min-w-0 flex-1 flex-col gap-1'>
            <span className='text-[12px] font-semibold'>Next team review</span>
            <span className='text-[10px]'>Today at 2:30 PM · Product and design</span>
          </div>
          <ArrowUpRight className='size-3.5 shrink-0' />
        </div>
        <Card t={t} className='flex flex-col gap-3 p-3'>
          <div className='flex items-center justify-between'>
            <span className='text-[12px] font-semibold'>Workload by owner</span>
            <span className='text-[10px]' style={muted}>
              {projects.length} projects
            </span>
          </div>
          <div className='flex h-2 gap-0.5 overflow-hidden rounded-full'>
            {owners.map((owner) => (
              <span
                key={owner.key}
                className='h-full rounded-full'
                style={{ flex: owner.count, background: accent(PEOPLE[owner.key].index) }}
              />
            ))}
          </div>
          <div className='flex flex-wrap gap-x-3 gap-y-1 text-[10px]'>
            {owners.map((owner) => (
              <span key={owner.key} className='inline-flex items-center gap-1.5'>
                <span
                  className='size-2 rounded-full'
                  style={{ background: accent(PEOPLE[owner.key].index) }}
                />
                {PEOPLE[owner.key].name.split(' ')[0]}
                <span style={muted}>{owner.count}</span>
              </span>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

// ─── Activity ─────────────────────────────────────────────────────────────────

function ActivityPage({ t, projects }: { t: Theme; projects: PreviewProject[] }) {
  const { get, accent, utility, mode } = t;
  const muted = { color: get('--muted-foreground') };
  const known = new Set(PREVIEW_PROJECTS.map((project) => project.id));
  const created: ActivityEvent[] = projects
    .filter((project) => !known.has(project.id))
    .map((project) => ({
      id: `created-${project.id}`,
      projectId: project.id,
      person: project.owner,
      verb: 'created',
      when: 'Just now',
      group: 'Today',
    }));
  const events = [...created, ...ACTIVITY].filter((event) =>
    projects.some((project) => project.id === event.projectId),
  );
  const peak = Math.max(...WEEK.map((entry) => entry.value));

  return (
    <>
      <Card t={t} className='flex flex-col gap-3 p-3'>
        <div className='flex items-center justify-between'>
          <span className='text-[12px] font-semibold'>This week</span>
          <span className='text-[10px]' style={muted}>
            {WEEK.reduce((sum, entry) => sum + entry.value, 0)} updates
          </span>
        </div>
        <div className='flex h-16 items-end gap-2'>
          {WEEK.map((entry, i) => (
            <div key={i} className='flex flex-1 flex-col items-center gap-1'>
              <span
                className='w-full rounded-t-sm'
                style={{
                  height: `${(entry.value / peak) * 100}%`,
                  background: entry.value === peak ? get('--primary') : accent(i % 4),
                  opacity: entry.value === peak ? 1 : 0.55,
                }}
              />
              <span className='text-[8px]' style={muted}>
                {entry.day}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {(['Today', 'Yesterday'] as const).map((group) => {
        const items = events.filter((event) => event.group === group);
        if (!items.length) return null;
        return (
          <section key={group} className='flex flex-col gap-3'>
            <span className='text-[10px] font-semibold tracking-widest uppercase' style={muted}>
              {group}
            </span>
            <div className='relative flex flex-col gap-4 pl-0.5'>
              <span
                aria-hidden
                className='absolute top-3 bottom-3 left-3.5 w-px'
                style={{ background: get('--border') }}
              />
              {items.map((event) => {
                const project = projects.find((item) => item.id === event.projectId)!;
                const person = PEOPLE[event.person] ?? PEOPLE.AJ;
                const done = project.status === 'Complete' && event.verb === 'completed';
                const blocked = event.verb.includes('blocker');
                return (
                  <div key={event.id} className='relative flex items-start gap-3'>
                    <Avatar
                      t={t}
                      index={person.index}
                      initials={event.person}
                      className='size-7 text-[9px]'
                    />
                    <div className='flex min-w-0 flex-1 flex-col gap-2'>
                      <div className='flex flex-wrap items-baseline justify-between gap-x-3'>
                        <span className='text-[12px] leading-snug'>
                          <b className='font-semibold'>{person.name}</b>{' '}
                          <span style={muted}>{event.verb}</span>{' '}
                          <b className='font-semibold'>{project.name}</b>
                        </span>
                        <span className='text-[10px]' style={muted}>
                          {event.when}
                        </span>
                      </div>
                      {event.note && (
                        <div
                          className='rounded-lg rounded-tl-none border px-3 py-2 text-[11px] leading-relaxed'
                          style={{
                            background: get('--card-raised'),
                            color: get('--card-raised-foreground'),
                            borderColor: get('--border'),
                          }}>
                          {event.note}
                        </div>
                      )}
                      {(done || blocked) && (
                        <span
                          className='inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold'
                          style={{
                            background: pillStyle(t, done ? 'success' : 'error').background,
                            color: utility[done ? 'success' : 'error'][mode],
                          }}>
                          {done ? <Check className='size-3' /> : <X className='size-3' />}
                          {done ? 'Ready to archive' : 'Needs attention'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────

type SettingsState = {
  name: string;
  email: string;
  workspace: string;
  updates: boolean;
  digest: boolean;
};

const DEFAULT_SETTINGS: SettingsState = {
  name: 'Avery James',
  email: 'avery@orbit.design',
  workspace: 'Design studio',
  updates: true,
  digest: false,
};

function SettingsSection({
  t,
  title,
  desc,
  children,
}: {
  t: Theme;
  title: string;
  desc: string;
  children: ReactNode;
}) {
  return (
    <Card t={t} className='flex flex-col gap-4 p-4'>
      <div className='flex flex-col gap-1'>
        <h4 className='text-[13px] font-semibold'>{title}</h4>
        <p className='text-[10px]' style={{ color: t.get('--muted-foreground') }}>
          {desc}
        </p>
      </div>
      {children}
    </Card>
  );
}

function SettingsPage({
  t,
  settings,
  setSettings,
  saved,
  setSaved,
  resetRequested,
  setResetRequested,
  onSave,
  onReset,
}: {
  t: Theme;
  settings: SettingsState;
  setSettings: (next: SettingsState) => void;
  saved: boolean;
  setSaved: (value: boolean) => void;
  resetRequested: boolean;
  setResetRequested: (value: boolean) => void;
  onSave: () => void;
  onReset: () => void;
}) {
  const { get, accent, utility, mode } = t;
  const muted = { color: get('--muted-foreground') };
  const update = (patch: Partial<SettingsState>) => {
    setSettings({ ...settings, ...patch });
    setSaved(false);
  };

  return (
    <form
      className='flex shrink-0 flex-col gap-4'
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}>
      <Card t={t} className='overflow-hidden'>
        <div
          className='h-20'
          style={{
            background: `linear-gradient(120deg, ${accent(0)}, ${accent(1)} 55%, ${accent(2)})`,
          }}
        />
        <div className='flex flex-wrap items-end justify-between gap-3 px-4 pb-4'>
          <div className='-mt-8 flex items-end gap-3'>
            <Avatar t={t} index={0} initials='AJ' className='size-16 text-lg ring-4' />
            <div className='flex flex-col gap-0.5 pb-1'>
              <h3 className='font-display text-xl leading-tight font-bold'>Workspace settings</h3>
              <span className='text-[10px]' style={muted}>
                {settings.workspace} · {settings.email}
              </span>
            </div>
          </div>
          <span
            className='rounded-full px-2.5 py-1 text-[10px] font-semibold'
            style={{
              background: get('--primary-container'),
              color: get('--primary-container-foreground'),
            }}>
            Team plan · 8 of 12 seats
          </span>
        </div>
      </Card>

      <SettingsSection
        t={t}
        title='Profile'
        desc='How you appear to teammates across the workspace.'>
        <div className='grid grid-cols-1 gap-3 @min-[28rem]/workspace:grid-cols-2'>
          {(
            [
              { label: 'Full name', key: 'name', type: 'text' },
              { label: 'Email address', key: 'email', type: 'email' },
              { label: 'Workspace name', key: 'workspace', type: 'text' },
            ] as const
          ).map((field) => (
            <label
              key={field.key}
              className='flex min-w-0 flex-col gap-1.5 text-[11px] font-medium'>
              {field.label}
              <input
                type={field.type}
                required
                value={settings[field.key]}
                onChange={(event) => update({ [field.key]: event.target.value })}
                className='h-9 min-w-0 rounded-md border px-2.5 text-xs font-normal outline-none focus-visible:ring-2'
                style={ringStyle(t, {
                  background: get('--background'),
                  color: get('--foreground'),
                  borderColor: get('--input'),
                })}
              />
            </label>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection t={t} title='Notifications' desc='Choose what lands in your inbox.'>
        <div className='flex flex-col'>
          {(
            [
              { id: 'updates', label: 'Project updates', detail: 'Changes to projects you follow' },
              { id: 'digest', label: 'Weekly digest', detail: 'A summary of your team activity' },
            ] as const
          ).map((option, index) => (
            <label
              key={option.id}
              className={`flex cursor-pointer items-center justify-between gap-3 py-3 ${index ? 'border-t' : ''}`}
              style={{ borderColor: get('--border') }}>
              <span className='flex flex-col gap-1'>
                <span className='text-[12px] font-medium'>{option.label}</span>
                <span className='text-[10px]' style={muted}>
                  {option.detail}
                </span>
              </span>
              <input
                type='checkbox'
                className='peer sr-only'
                checked={settings[option.id]}
                onChange={(event) => update({ [option.id]: event.target.checked })}
              />
              <span
                aria-hidden
                className='relative h-5 w-9 shrink-0 rounded-full transition-colors peer-focus-visible:ring-2'
                style={ringStyle(t, {
                  background: settings[option.id] ? get('--primary') : get('--border-strong'),
                })}>
                <span
                  className='absolute top-0.5 left-0.5 size-4 rounded-full transition-transform'
                  style={{
                    background: settings[option.id]
                      ? get('--primary-foreground')
                      : get('--background'),
                    transform: settings[option.id] ? 'translateX(1rem)' : undefined,
                  }}
                />
              </span>
            </label>
          ))}
        </div>
      </SettingsSection>

      <div
        className='flex items-center justify-between gap-3 rounded-lg border p-3'
        style={{ background: get('--card-raised'), borderColor: get('--border') }}>
        <span
          role='status'
          className='inline-flex items-center gap-1.5 text-[11px]'
          style={{ color: saved ? utility.success[mode] : get('--muted-foreground') }}>
          {saved && <CheckCircle2 className='size-3.5' />}
          {saved ? 'Preferences saved' : 'Changes apply to this workspace'}
        </span>
        <button type='submit' className={`${BUTTON} shrink-0`} style={ringStyle(t, t.primary)}>
          {saved ? 'Saved' : 'Save changes'}
        </button>
      </div>

      <section
        className='flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4'
        style={{
          background: get('--destructive-subtle'),
          borderColor: mix(get('--destructive'), 'transparent', 55),
        }}>
        <div className='flex flex-col gap-1'>
          <h4 className='text-[13px] font-semibold' style={{ color: get('--destructive') }}>
            Danger zone
          </h4>
          <span className='text-[10px]' style={muted}>
            Restore the sample projects and defaults.
          </span>
        </div>
        {resetRequested ? (
          <div className='flex gap-2'>
            <button
              type='button'
              onClick={() => setResetRequested(false)}
              className={`${BUTTON} border`}
              style={ringStyle(t, t.secondary)}>
              Keep workspace
            </button>
            <button
              type='button'
              onClick={onReset}
              className={BUTTON}
              style={ringStyle(t, {
                background: get('--destructive'),
                color: get('--destructive-foreground'),
              })}>
              Confirm reset
            </button>
          </div>
        ) : (
          <button
            type='button'
            onClick={() => setResetRequested(true)}
            className={`${BUTTON} border`}
            style={ringStyle(t, {
              color: get('--destructive'),
              borderColor: get('--destructive'),
              background: 'transparent',
            })}>
            Reset workspace
          </button>
        )}
      </section>
    </form>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export function WorkspacePreview({
  tokens,
  slots,
  utility,
  mode,
  page,
  onPageChange,
}: {
  tokens: SemanticToken[];
  slots: PaletteSlot[];
  utility: Utility;
  mode: Mode;
  page?: PreviewPage;
  onPageChange?: (page: PreviewPage) => void;
}) {
  const get = (name: string) => tokens.find((token) => token.name === name)?.[mode] ?? '#888';
  const t: Theme = {
    get,
    mode,
    utility,
    accent: (index) => slots[index % (slots.length || 1)]?.color.hex ?? get('--primary'),
    ink: (hex) => textColor(parseColor(hex).xyz),
    primary: { background: get('--primary'), color: get('--primary-foreground') },
    secondary: {
      background: get('--secondary'),
      color: get('--secondary-foreground'),
      borderColor: get('--border'),
    },
  };

  const [projects, setProjects] = useState(PREVIEW_PROJECTS);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'progress' | 'complete'>('all');
  const [localView, setLocalView] = useState<PreviewPage>('projects');
  const view = page ?? localView;
  const setView = (next: PreviewPage) => {
    setLocalView(next);
    onPageChange?.(next);
  };
  const [creating, setCreating] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [resetRequested, setResetRequested] = useState(false);

  const visible = projects.filter(
    (project) =>
      (filter === 'all' ||
        (filter === 'complete' ? project.status === 'Complete' : project.status !== 'Complete')) &&
      `${project.name} ${project.category}`.toLowerCase().includes(search.toLowerCase()),
  );

  const removeProjects = (ids: string[]) => {
    setProjects((previous) => previous.filter((project) => !ids.includes(project.id)));
    setSelected((previous) => previous.filter((id) => !ids.includes(id)));
    setMenuId(null);
  };
  const completeProject = (id: string) => {
    setProjects((previous) =>
      previous.map((item) =>
        item.id === id ? { ...item, status: 'Complete', progress: 100 } : item,
      ),
    );
    setMenuId(null);
  };
  const startProject = () => {
    setView('projects');
    setCreating(true);
  };
  const resetWorkspace = () => {
    setProjects(PREVIEW_PROJECTS);
    setSelected([]);
    setCreating(false);
    setProjectName('');
    setSearch('');
    setFilter('all');
    setMenuId(null);
    setSettings(DEFAULT_SETTINGS);
    setSettingsSaved(false);
    setResetRequested(false);
  };

  const NAV: { id: PreviewPage; label: string }[] = [
    { id: 'landing', label: 'Landing' },
    { id: 'projects', label: 'Projects' },
    { id: 'activity', label: 'Activity' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div
      data-component-preview={mode}
      className='@container/workspace flex min-h-144 min-w-0 flex-col overflow-hidden rounded-md border @4xl/design:h-full @4xl/theme:h-full @4xl/tokens:h-full @4xl/design:min-h-0 @4xl/theme:min-h-0 @4xl/tokens:min-h-0'
      style={{
        background: get('--background'),
        color: get('--foreground'),
        borderColor: get('--border'),
      }}>
      <header
        className='flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b px-4 py-2.5'
        style={{
          background: get('--surface-dim'),
          color: get('--surface-dim-foreground'),
          borderColor: get('--border'),
        }}>
        <div className='flex items-center gap-2'>
          <span className='grid size-7 place-items-center rounded-lg' style={t.primary}>
            <Layers className='size-4' />
          </span>
          <span className='font-display text-base font-bold'>Orbit</span>
          <span
            className='ml-1 hidden rounded-full border px-2 py-0.5 text-[10px] @min-[40rem]/workspace:block'
            style={{ color: get('--muted-foreground'), borderColor: get('--border') }}>
            Team workspace
          </span>
        </div>
        <nav className='flex items-center gap-1' aria-label={`${mode} workspace navigation`}>
          {NAV.map((item) => (
            <button
              key={item.id}
              type='button'
              aria-pressed={view === item.id}
              onClick={() => setView(item.id)}
              className='h-7 cursor-pointer rounded-md px-2.5 text-[11px] font-medium outline-none focus-visible:ring-2'
              style={ringStyle(
                t,
                view === item.id
                  ? { background: get('--accent'), color: get('--accent-foreground') }
                  : { color: get('--muted-foreground') },
              )}>
              {item.label}
            </button>
          ))}
          <span className='ml-1.5'>
            <Avatar t={t} index={0} initials='AJ' className='size-7 text-[9px]' />
          </span>
        </nav>
      </header>
      <main className='tool-panel-space tool-panel-stack flex min-h-0 flex-1 flex-col overflow-auto'>
        {view === 'landing' && <LandingPage t={t} onStart={startProject} />}
        {view === 'settings' && (
          <SettingsPage
            t={t}
            settings={settings}
            setSettings={setSettings}
            saved={settingsSaved}
            setSaved={setSettingsSaved}
            resetRequested={resetRequested}
            setResetRequested={setResetRequested}
            onSave={() => setSettingsSaved(true)}
            onReset={resetWorkspace}
          />
        )}
        {(view === 'projects' || view === 'activity') && (
          <>
            <PageHeader
              t={t}
              crumb={view === 'projects' ? 'Projects' : 'Activity'}
              title={view === 'projects' ? 'Projects' : 'Team activity'}
              subtitle={
                view === 'projects'
                  ? 'Track progress across every initiative.'
                  : 'Everything your team did, in one timeline.'
              }
              onNew={startProject}
            />
            {creating && (
              <form
                className='flex flex-col gap-3 rounded-lg border p-3'
                style={{
                  background: get('--popover'),
                  color: get('--popover-foreground'),
                  borderColor: get('--border-strong'),
                }}
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!projectName.trim()) return;
                  setProjects((previous) => [
                    ...previous,
                    {
                      id: crypto.randomUUID(),
                      name: projectName.trim(),
                      category: 'Design / New project',
                      status: 'Active',
                      progress: 0,
                      owner: 'AJ',
                      due: 'Not set',
                    },
                  ]);
                  setProjectName('');
                  setCreating(false);
                  setSearch('');
                  setFilter('all');
                }}>
                <div className='flex items-center justify-between gap-2'>
                  <span className='text-xs font-semibold'>Create project</span>
                  <button
                    type='button'
                    title='Cancel new project'
                    aria-label='Cancel new project'
                    onClick={() => {
                      setCreating(false);
                      setProjectName('');
                    }}
                    className='cursor-pointer rounded-sm p-1'>
                    <X className='size-3.5' />
                  </button>
                </div>
                <label className='flex flex-col gap-1.5 text-[11px]'>
                  Project name
                  <input
                    value={projectName}
                    onChange={(event) => setProjectName(event.target.value)}
                    autoFocus
                    className='h-9 w-full rounded-md border px-2.5 text-xs outline-none focus-visible:ring-2'
                    style={ringStyle(t, {
                      background: get('--background'),
                      color: get('--foreground'),
                      borderColor: get('--input'),
                    })}
                  />
                </label>
                <div className='flex justify-end gap-2'>
                  <button
                    type='button'
                    onClick={() => {
                      setCreating(false);
                      setProjectName('');
                    }}
                    className={`${BUTTON} border`}
                    style={ringStyle(t, t.secondary)}>
                    Cancel
                  </button>
                  <button
                    type='submit'
                    disabled={!projectName.trim()}
                    className={BUTTON}
                    style={ringStyle(t, t.primary)}>
                    Create project
                  </button>
                </div>
              </form>
            )}
            {view === 'projects' ? (
              <ProjectsPage
                t={t}
                projects={projects}
                visible={visible}
                selected={selected}
                setSelected={setSelected}
                filter={filter}
                setFilter={setFilter}
                search={search}
                setSearch={setSearch}
                menuId={menuId}
                setMenuId={setMenuId}
                removeProjects={removeProjects}
                completeProject={completeProject}
              />
            ) : (
              <ActivityPage t={t} projects={projects} />
            )}
          </>
        )}
      </main>
      <footer
        className='flex shrink-0 items-center justify-between gap-3 border-t px-4 py-2.5 text-[10px]'
        style={{
          background: get('--surface-dim'),
          color: get('--muted-foreground'),
          borderColor: get('--border'),
        }}>
        <span>{projects.length} projects · Team plan</span>
        <span className='inline-flex items-center gap-1'>
          <Check className='size-3' />
          All changes saved
        </span>
      </footer>
    </div>
  );
}
