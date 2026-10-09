import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Layers,
  MoreHorizontal,
  Moon,
  Plus,
  RotateCcw,
  Search,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import { useMemo, useState, useCallback } from 'react';

import type { PaletteSlot, SemanticToken, UtilityColorSet, UtilityRole } from '@/types';

import { useChromaStore } from '@/hooks/use-chroma-store';
import {
  buildFigmaTokens,
  buildStyleDictionary,
  buildTailwindV3,
  buildTailwindV4,
  buildThemeCss,
  BLACK_XYZ,
  deriveThemeTokens,
  contrastRatio,
  apcaContrast,
  parseColor,
  semanticSlotNames,
  textColor,
  wcagLevel,
  WHITE_XYZ,
} from '@/lib/engine/browser';

import HexInput from '../common/hex-input';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ToolButton as Button, ToolSegments, ToolTabs, TYPE } from './view-ui';

type Mode = 'light' | 'dark';
type ExportFormat = 'css' | 'tailwind3' | 'tailwind4' | 'figma' | 'styledictionary';

// ─── Token override store (local to this view, persisted via parent store later) ──

type Overrides = Record<string, { light: string; dark: string }>;

function mergeTokens(tokens: SemanticToken[], overrides: Overrides): SemanticToken[] {
  return tokens.map((t) => {
    const o = overrides[t.name];
    if (!o) return t;
    return { ...t, light: o.light ?? t.light, dark: o.dark ?? t.dark };
  });
}

// ─── Token group definitions ──────────────────────────────────────────────────

export const TOKEN_GROUPS: {
  label: string;
  desc: string;
  ids: string[];
  fourValue?: boolean;
}[] = [
  {
    label: 'Page Surfaces',
    desc: 'Background layers following the 60-30-10 rule. Each tier needs a matching text color.',
    fourValue: true,
    ids: [
      '--background',
      '--foreground',
      '--surface-dim',
      '--surface-dim-foreground',
      '--card',
      '--card-foreground',
      '--card-raised',
      '--card-raised-foreground',
      '--popover',
      '--popover-foreground',
    ],
  },
  {
    label: 'Brand / Primary',
    desc: 'The main brand color — CTA buttons, active states, links.',
    fourValue: true,
    ids: [
      '--primary',
      '--primary-foreground',
      '--primary-container',
      '--primary-container-foreground',
    ],
  },
  {
    label: 'Secondary & Muted',
    desc: 'Supporting actions, secondary buttons, dimmed text, ghost surfaces.',
    ids: [
      '--secondary',
      '--secondary-foreground',
      '--accent',
      '--accent-foreground',
      '--muted',
      '--muted-foreground',
    ],
  },
  {
    label: 'Borders, Inputs & Focus',
    desc: 'Structural colors — separators, form controls, keyboard focus ring.',
    ids: ['--border', '--border-strong', '--input', '--ring'],
  },
  {
    label: 'Destructive / Error',
    desc: 'Error states, destructive actions, deletion confirmations.',
    ids: ['--destructive', '--destructive-foreground', '--destructive-subtle'],
  },
];

// ─── Component preview ────────────────────────────────────────────────────────

type PreviewProject = {
  id: string;
  name: string;
  category: string;
  status: 'Active' | 'Review' | 'Complete' | 'Blocked';
  progress: number;
  owner: string;
  due: string;
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

export type PreviewPage = 'landing' | 'projects' | 'activity' | 'settings';

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
  utility: ReturnType<typeof deriveThemeTokens>['utility'];
  mode: Mode;
  page?: PreviewPage;
  onPageChange?: (page: PreviewPage) => void;
}) {
  const get = (name: string) => tokens.find((token) => token.name === name)?.[mode] ?? '#888';
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
  const [searchFocused, setSearchFocused] = useState(false);
  const [profileName, setProfileName] = useState('Avery James');
  const [profileEmail, setProfileEmail] = useState('avery@orbit.design');
  const [workspaceName, setWorkspaceName] = useState('Design studio');
  const [notifications, setNotifications] = useState({ updates: true, digest: false });
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [resetRequested, setResetRequested] = useState(false);
  const [annualBilling, setAnnualBilling] = useState(false);
  const visible = projects.filter(
    (project) =>
      (filter === 'all' ||
        (filter === 'complete' ? project.status === 'Complete' : project.status !== 'Complete')) &&
      `${project.name} ${project.category}`.toLowerCase().includes(search.toLowerCase()),
  );
  const active = projects.filter((project) => project.status !== 'Complete').length;
  const average = projects.length
    ? Math.round(projects.reduce((total, project) => total + project.progress, 0) / projects.length)
    : 0;
  const blocked = projects.filter((project) => project.status === 'Blocked').length;
  const primary = { background: get('--primary'), color: get('--primary-foreground') };
  const secondary = {
    background: get('--secondary'),
    color: get('--secondary-foreground'),
    borderColor: get('--border'),
  };
  const statusStyle = (status: PreviewProject['status']) => {
    const role =
      status === 'Complete'
        ? 'success'
        : status === 'Review'
          ? 'warning'
          : status === 'Blocked'
            ? 'error'
            : 'info';
    return {
      background: mode === 'light' ? utility[role].subtle : utility[role].subtleDark,
      color: utility[role][mode],
    };
  };
  const removeProjects = (ids: string[]) => {
    setProjects((previous) => previous.filter((project) => !ids.includes(project.id)));
    setSelected((previous) => previous.filter((id) => !ids.includes(id)));
    setMenuId(null);
  };

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
        className='flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3'
        style={{
          background: get('--surface-dim'),
          color: get('--surface-dim-foreground'),
          borderColor: get('--border'),
        }}>
        <div className='flex items-center gap-2'>
          <span className='grid size-7 place-items-center rounded-md' style={primary}>
            <Layers className='size-4' />
          </span>
          <span className='font-display text-base font-bold'>Orbit</span>
          <span
            className='hidden border-l pl-2 text-[11px] @min-[24rem]/workspace:block'
            style={{ color: get('--muted-foreground'), borderColor: get('--border') }}>
            Team workspace
          </span>
        </div>
        <nav className='flex items-center gap-3' aria-label={`${mode} workspace navigation`}>
          {(['landing', 'projects', 'activity', 'settings'] as const).map((item) => (
            <button
              key={item}
              type='button'
              aria-pressed={view === item}
              onClick={() => setView(item)}
              className='cursor-pointer text-[11px] font-medium outline-none focus-visible:underline'
              style={{ color: view === item ? get('--primary') : get('--muted-foreground') }}>
              {item === 'landing'
                ? 'Landing'
                : item === 'projects'
                  ? 'Projects'
                  : item === 'activity'
                    ? 'Activity'
                    : 'Settings'}
            </button>
          ))}
          <span
            className='grid size-7 place-items-center rounded-full text-[9px] font-bold'
            title='Avery James'
            style={{
              background: get('--primary-container'),
              color: get('--primary-container-foreground'),
            }}>
            AJ
          </span>
        </nav>
      </header>
      <main className='tool-panel-space tool-panel-stack flex min-h-0 flex-1 flex-col overflow-auto'>
        {view === 'landing' && (
          <div className='flex shrink-0 flex-col gap-5'>
            <section
              className='relative flex min-h-80 items-end overflow-hidden rounded-md'
              style={{ background: get('--primary-container') }}>
              <img
                src='https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1000&q=80'
                alt='Bright collaborative workspace with desks and meeting areas'
                className='absolute inset-0 h-full w-full object-cover'
              />
              <div
                className='relative w-full p-5'
                style={{
                  background: `${get('--primary-container')}ed`,
                  color: get('--primary-container-foreground'),
                }}>
                <span className='text-[10px] font-semibold'>A shared home for ambitious teams</span>
                <h3 className='mt-2 font-display text-3xl font-bold'>Orbit</h3>
                <p className='mt-2 max-w-sm text-[12px] leading-relaxed'>
                  Bring projects, conversations and progress together. Less busywork. More room for
                  your best work.
                </p>
                <div className='mt-4 flex flex-wrap gap-2'>
                  <button
                    type='button'
                    onClick={() => {
                      setView('projects');
                      setCreating(true);
                    }}
                    className='h-8 cursor-pointer rounded-md px-3 text-[11px] font-semibold'
                    style={primary}>
                    Get started
                    <ArrowUpRight className='ml-1 inline size-3' />
                  </button>
                  <button
                    type='button'
                    onClick={() =>
                      document
                        .getElementById(`preview-pricing-${mode}`)
                        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                    }
                    className='h-8 cursor-pointer rounded-md border px-3 text-[11px] font-semibold'
                    style={secondary}>
                    View pricing
                  </button>
                </div>
              </div>
            </section>
            <div
              className='flex flex-wrap items-center justify-between gap-3 border-b pb-4 text-[10px]'
              style={{ color: get('--muted-foreground'), borderColor: get('--border') }}>
              <span>Trusted by teams that move work forward</span>
              <div className='flex gap-4 font-display text-sm font-bold'>
                <span>Acme</span>
                <span>Capsule</span>
                <span>Northstar</span>
              </div>
            </div>
            <section className='flex flex-col gap-3'>
              <h4 className='font-display text-lg font-bold'>Everything in one place</h4>
              <div className='grid grid-cols-1 gap-3 @min-[28rem]/workspace:grid-cols-3'>
                {[
                  {
                    icon: Layers,
                    name: 'Project clarity',
                    copy: 'Plans, milestones and owners. A clear path from idea to launch.',
                  },
                  {
                    icon: CheckCircle2,
                    name: 'Shared momentum',
                    copy: 'See what is moving, what is done and where your team needs a hand.',
                  },
                  {
                    icon: Clock3,
                    name: 'Fewer check-ins',
                    copy: 'Updates stay attached to the work. Everyone stays in the loop.',
                  },
                ].map(({ icon: Icon, name, copy }) => (
                  <div key={name} className='flex flex-col gap-2'>
                    <Icon className='size-5' style={{ color: get('--primary') }} />
                    <span className='text-[12px] font-semibold'>{name}</span>
                    <p
                      className='text-[10px] leading-relaxed'
                      style={{ color: get('--muted-foreground') }}>
                      {copy}
                    </p>
                  </div>
                ))}
              </div>
            </section>
            <section
              id={`preview-pricing-${mode}`}
              className='flex flex-col gap-3 border-t pt-4'
              style={{ borderColor: get('--border') }}>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <h4 className='font-display text-lg font-bold'>A plan for your team</h4>
                <div
                  role='group'
                  aria-label='Pricing cadence'
                  className='flex gap-1 rounded-md border p-0.5'
                  style={{ borderColor: get('--border') }}>
                  {[false, true].map((annual) => (
                    <button
                      key={String(annual)}
                      type='button'
                      aria-pressed={annualBilling === annual}
                      onClick={() => setAnnualBilling(annual)}
                      className='h-6 cursor-pointer rounded-sm px-2 text-[10px]'
                      style={
                        annualBilling === annual ? primary : { color: get('--muted-foreground') }
                      }>
                      {annual ? 'Yearly' : 'Monthly'}
                    </button>
                  ))}
                </div>
              </div>
              <div className='grid grid-cols-1 gap-3 @min-[24rem]/workspace:grid-cols-2'>
                {[
                  {
                    name: 'Starter',
                    price: 'Free',
                    details: 'For personal projects and small teams',
                    action: 'Start free',
                  },
                  {
                    name: 'Team',
                    price: `$${annualBilling ? 12 : 16}`,
                    details: 'Per member / month',
                    action: 'Start Team plan',
                  },
                ].map((plan) => (
                  <div
                    key={plan.name}
                    className='flex flex-col gap-3 rounded-md border p-4'
                    style={{
                      background: get('--card'),
                      color: get('--card-foreground'),
                      borderColor: plan.name === 'Team' ? get('--primary') : get('--border'),
                    }}>
                    <span className='text-xs font-semibold'>{plan.name}</span>
                    <span className='font-display text-2xl font-bold'>{plan.price}</span>
                    <p className='text-[10px]' style={{ color: get('--muted-foreground') }}>
                      {plan.details}
                    </p>
                    <div className='flex flex-col gap-2 text-[10px]'>
                      {[
                        'Unlimited projects',
                        'Shared activity',
                        plan.name === 'Team'
                          ? 'Advanced team permissions'
                          : 'Up to 3 collaborators',
                      ].map((feature) => (
                        <span key={feature} className='flex items-center gap-1.5'>
                          <Check className='size-3' style={{ color: get('--primary') }} />
                          {feature}
                        </span>
                      ))}
                    </div>
                    <button
                      type='button'
                      onClick={() => {
                        setView('projects');
                        setCreating(true);
                      }}
                      className='mt-auto h-8 cursor-pointer rounded-md border px-3 text-[11px] font-semibold'
                      style={plan.name === 'Team' ? primary : secondary}>
                      {plan.action}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
        {view === 'settings' && (
          <form
            className='flex shrink-0 flex-col gap-4'
            onSubmit={(event) => {
              event.preventDefault();
              setSettingsSaved(true);
            }}>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <h3 className='font-display text-xl font-bold'>Workspace settings</h3>
                <p className='mt-1 text-[10px]' style={{ color: get('--muted-foreground') }}>
                  Profile and team preferences
                </p>
              </div>
              <span
                className='grid size-9 shrink-0 place-items-center rounded-full text-[11px] font-bold'
                style={{
                  background: get('--primary-container'),
                  color: get('--primary-container-foreground'),
                }}>
                AJ
              </span>
            </div>
            <section
              className='flex flex-col gap-3 border-t pt-4'
              style={{ borderColor: get('--border') }}>
              <h4 className='text-[12px] font-semibold'>Profile</h4>
              <div className='grid grid-cols-1 gap-3 @min-[28rem]/workspace:grid-cols-2'>
                {[
                  { label: 'Full name', value: profileName, set: setProfileName, type: 'text' },
                  {
                    label: 'Email address',
                    value: profileEmail,
                    set: setProfileEmail,
                    type: 'email',
                  },
                  {
                    label: 'Workspace name',
                    value: workspaceName,
                    set: setWorkspaceName,
                    type: 'text',
                  },
                ].map((field) => (
                  <label key={field.label} className='flex min-w-0 flex-col gap-1.5 text-[10px]'>
                    {field.label}
                    <input
                      type={field.type}
                      required
                      value={field.value}
                      onChange={(event) => {
                        field.set(event.target.value);
                        setSettingsSaved(false);
                      }}
                      className='h-9 min-w-0 rounded-md border px-2 text-[11px] outline-none focus-visible:ring-2'
                      style={
                        {
                          background: get('--input'),
                          color: get('--foreground'),
                          borderColor: get('--border'),
                          '--tw-ring-color': get('--ring'),
                        } as React.CSSProperties
                      }
                    />
                  </label>
                ))}
              </div>
            </section>
            <section
              className='flex flex-col gap-3 border-t pt-4'
              style={{ borderColor: get('--border') }}>
              <h4 className='text-[12px] font-semibold'>Notifications</h4>
              {(
                [
                  {
                    id: 'updates',
                    label: 'Project updates',
                    detail: 'Changes to projects you follow',
                  },
                  {
                    id: 'digest',
                    label: 'Weekly digest',
                    detail: 'A summary of your team activity',
                  },
                ] as const
              ).map((option) => (
                <label
                  key={option.id}
                  className='flex cursor-pointer items-center justify-between gap-3'>
                  <span className='flex flex-col gap-1'>
                    <span className='text-[11px] font-medium'>{option.label}</span>
                    <span className='text-[10px]' style={{ color: get('--muted-foreground') }}>
                      {option.detail}
                    </span>
                  </span>
                  <input
                    type='checkbox'
                    checked={notifications[option.id]}
                    onChange={(event) => {
                      setNotifications((previous) => ({
                        ...previous,
                        [option.id]: event.target.checked,
                      }));
                      setSettingsSaved(false);
                    }}
                    style={{ accentColor: get('--primary') }}
                  />
                </label>
              ))}
            </section>
            <div
              className='flex items-center justify-between gap-3 border-t pt-3'
              style={{ borderColor: get('--border') }}>
              <span role='status' className='text-[10px]' style={{ color: utility.success[mode] }}>
                {settingsSaved ? 'Preferences saved' : 'Changes apply to this workspace'}
              </span>
              <button
                type='submit'
                className='h-8 shrink-0 cursor-pointer rounded-md px-3 text-[11px] font-semibold'
                style={primary}>
                {settingsSaved ? 'Saved' : 'Save changes'}
              </button>
            </div>
            <section
              className='flex flex-col gap-3 border-t pt-4'
              style={{ borderColor: get('--border') }}>
              <h4 className='text-[12px] font-semibold' style={{ color: get('--destructive') }}>
                Danger zone
              </h4>
              <div
                className='flex flex-wrap items-center justify-between gap-3 rounded-md border p-3'
                style={{
                  background: get('--destructive-subtle'),
                  borderColor: get('--destructive'),
                }}>
                <div className='flex flex-col gap-1'>
                  <span className='text-[11px] font-medium'>Reset workspace</span>
                  <span className='text-[10px]' style={{ color: get('--muted-foreground') }}>
                    Restore the sample projects and defaults.
                  </span>
                </div>
                {resetRequested ? (
                  <div className='flex gap-2'>
                    <button
                      type='button'
                      onClick={() => setResetRequested(false)}
                      className='h-8 cursor-pointer rounded-md border px-2 text-[10px]'
                      style={secondary}>
                      Keep workspace
                    </button>
                    <button
                      type='button'
                      onClick={() => {
                        setProjects(PREVIEW_PROJECTS);
                        setSelected([]);
                        setCreating(false);
                        setProjectName('');
                        setSearch('');
                        setFilter('all');
                        setMenuId(null);
                        setProfileName('Avery James');
                        setProfileEmail('avery@orbit.design');
                        setWorkspaceName('Design studio');
                        setNotifications({ updates: true, digest: false });
                        setSettingsSaved(false);
                        setResetRequested(false);
                      }}
                      className='h-8 cursor-pointer rounded-md px-2 text-[10px] font-semibold'
                      style={{
                        background: get('--destructive'),
                        color: get('--destructive-foreground'),
                      }}>
                      Confirm reset
                    </button>
                  </div>
                ) : (
                  <button
                    type='button'
                    onClick={() => setResetRequested(true)}
                    className='h-8 cursor-pointer rounded-md border px-2 text-[10px] font-semibold'
                    style={{ color: get('--destructive'), borderColor: get('--destructive') }}>
                    Reset workspace
                  </button>
                )}
              </div>
            </section>
          </form>
        )}
        {(view === 'projects' || view === 'activity') && (
          <>
            <div className='flex flex-wrap items-start justify-between gap-3'>
              <div>
                <div
                  className='mb-1 hidden text-[10px] @min-[34rem]/workspace:block'
                  style={{ color: get('--muted-foreground') }}>
                  Workspace / {view === 'projects' ? 'Projects' : 'Activity'}
                </div>
                <h3 className='font-display text-xl font-bold'>
                  {view === 'projects' ? 'Projects' : 'Team activity'}
                </h3>
              </div>
              <button
                type='button'
                onClick={() => {
                  setCreating(true);
                  setView('projects');
                }}
                className='inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-3 text-[11px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-offset-1'
                style={primary}>
                <Plus className='size-3.5' />
                New project
              </button>
            </div>
            <div className='grid grid-cols-3 gap-2'>
              {[
                { label: 'Active projects', value: active },
                { label: 'Completion', value: `${average}%` },
                { label: 'Needs review', value: blocked },
              ].map((metric) => (
                <div
                  key={metric.label}
                  className='flex min-w-0 flex-col gap-2 rounded-md border p-2.5 @min-[28rem]/workspace:flex-row @min-[28rem]/workspace:items-center @min-[28rem]/workspace:justify-between'
                  style={{
                    background: get('--card'),
                    color: get('--card-foreground'),
                    borderColor: get('--border'),
                  }}>
                  <span className='block text-[10px]' style={{ color: get('--muted-foreground') }}>
                    {metric.label}
                  </span>
                  <span className='block font-display text-xl leading-none font-bold tabular-nums'>
                    {metric.value}
                  </span>
                </div>
              ))}
            </div>
            {creating && (
              <form
                className='flex flex-col gap-3 rounded-md border p-3'
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
                    className='h-8 w-full rounded border px-2 text-xs outline-none'
                    style={{
                      background: get('--input'),
                      color: get('--foreground'),
                      borderColor: get('--border'),
                      outline: `2px solid ${get('--ring')}`,
                    }}
                  />
                </label>
                <div className='flex justify-end gap-2'>
                  <button
                    type='button'
                    onClick={() => {
                      setCreating(false);
                      setProjectName('');
                    }}
                    className='h-8 cursor-pointer rounded-md border px-3 text-[11px] font-semibold'
                    style={secondary}>
                    Cancel
                  </button>
                  <button
                    type='submit'
                    disabled={!projectName.trim()}
                    className='h-8 cursor-pointer rounded-md px-3 text-[11px] font-semibold disabled:opacity-50'
                    style={primary}>
                    Create project
                  </button>
                </div>
              </form>
            )}
            {view === 'projects' ? (
              <>
                <div
                  className='flex flex-wrap items-center justify-between gap-3 border-b pb-3'
                  style={{ borderColor: get('--border') }}>
                  <div className='flex gap-3' role='group' aria-label='Project filters'>
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
                        className='cursor-pointer text-[10px] font-semibold'
                        style={{
                          color: filter === item.id ? get('--primary') : get('--muted-foreground'),
                        }}>
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <div
                    className='flex h-8 w-full items-center gap-2 rounded-md border px-2 @min-[28rem]/workspace:w-40'
                    style={{
                      background: get('--input'),
                      borderColor: get('--border'),
                      outline: searchFocused ? `2px solid ${get('--ring')}` : undefined,
                    }}>
                    <Search
                      className='size-3.5 shrink-0'
                      style={{ color: get('--muted-foreground') }}
                    />
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
                    className='flex items-center justify-between gap-3 rounded-md p-2.5 text-[11px]'
                    style={{
                      background: get('--destructive-subtle'),
                      color: get('--destructive'),
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
                <div
                  className='shrink-0 overflow-hidden rounded-md border'
                  style={{
                    background: get('--card'),
                    color: get('--card-foreground'),
                    borderColor: get('--border'),
                  }}>
                  <div
                    className='grid grid-cols-[1.25rem_minmax(0,1fr)_4.5rem_2rem] items-center gap-2 border-b px-3 py-2 text-[9px] font-semibold @min-[30rem]/workspace:grid-cols-[1.25rem_minmax(0,1fr)_4.5rem_4rem_2rem]'
                    style={{
                      background: get('--card-raised'),
                      color: get('--muted-foreground'),
                      borderColor: get('--border'),
                    }}>
                    <input
                      type='checkbox'
                      aria-label='Select all projects'
                      checked={
                        visible.length > 0 &&
                        visible.every((project) => selected.includes(project.id))
                      }
                      onChange={(event) =>
                        setSelected(
                          event.target.checked
                            ? [...new Set([...selected, ...visible.map((project) => project.id)])]
                            : selected.filter(
                                (id) => !visible.some((project) => project.id === id),
                              ),
                        )
                      }
                      style={{ accentColor: get('--primary') }}
                    />
                    <span>Project</span>
                    <span>Status</span>
                    <span className='hidden @min-[30rem]/workspace:block'>Due date</span>
                    <span />
                  </div>
                  {visible.map((project, index) => (
                    <div
                      key={project.id}
                      data-preview-project={project.id}
                      className='grid grid-cols-[1.25rem_minmax(0,1fr)_4.5rem_2rem] items-center gap-2 border-b px-3 py-1.5 last:border-b-0 @min-[30rem]/workspace:grid-cols-[1.25rem_minmax(0,1fr)_4.5rem_4rem_2rem]'
                      style={{
                        borderColor: get('--border'),
                        background: selected.includes(project.id) ? get('--accent') : undefined,
                        color: selected.includes(project.id)
                          ? get('--accent-foreground')
                          : undefined,
                      }}>
                      <input
                        type='checkbox'
                        aria-label={`Select ${project.name}`}
                        checked={selected.includes(project.id)}
                        onChange={(event) =>
                          setSelected(
                            event.target.checked
                              ? [...selected, project.id]
                              : selected.filter((id) => id !== project.id),
                          )
                        }
                        style={{ accentColor: get('--primary') }}
                      />
                      <div className='flex min-w-0 flex-col gap-1'>
                        <div className='flex min-w-0 items-center gap-2'>
                          <span
                            className='truncate text-[11px] leading-tight font-semibold'
                            title={project.name}>
                            {project.name}
                          </span>
                          <span
                            className='ml-auto hidden size-4 shrink-0 items-center justify-center rounded-full text-[8px] font-bold @min-[28rem]/workspace:flex'
                            title={project.owner}
                            style={{
                              background:
                                slots[index % slots.length]?.color.hex ?? get('--primary'),
                              color: textColor(
                                parseColor(
                                  slots[index % slots.length]?.color.hex ?? get('--primary'),
                                ).xyz,
                              ),
                            }}>
                            {project.owner}
                          </span>
                        </div>
                        <div className='flex min-w-0 items-center gap-2'>
                          <span
                            className='min-w-0 flex-1 truncate text-[9px] leading-none'
                            style={{ color: get('--muted-foreground') }}>
                            {project.category}
                          </span>
                          <div
                            className='hidden h-1 w-10 shrink-0 overflow-hidden rounded-full @min-[28rem]/workspace:block'
                            style={{ background: get('--muted') }}>
                            <div
                              className='h-full rounded-full'
                              style={{
                                width: `${project.progress}%`,
                                background: get('--primary'),
                              }}
                            />
                          </div>
                          <span
                            className='text-[8px] tabular-nums'
                            style={{ color: get('--muted-foreground') }}>
                            {project.progress}%
                          </span>
                        </div>
                      </div>
                      <span
                        className='rounded px-1.5 py-1 text-center text-[9px] font-semibold'
                        style={statusStyle(project.status)}>
                        {project.status === 'Complete'
                          ? 'Done'
                          : project.status === 'Review'
                            ? 'In review'
                            : project.status}
                      </span>
                      <span
                        className='hidden text-[10px] @min-[30rem]/workspace:block'
                        style={{ color: get('--muted-foreground') }}>
                        {project.due}
                      </span>
                      <Popover
                        open={menuId === project.id}
                        onOpenChange={(open) => setMenuId(open ? project.id : null)}>
                        <PopoverTrigger
                          aria-label={`Actions for ${project.name}`}
                          title={`Actions for ${project.name}`}
                          className='grid size-7 cursor-pointer place-items-center rounded-sm'
                          style={{ color: get('--muted-foreground') }}>
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
                            onClick={() => {
                              setProjects((previous) =>
                                previous.map((item) =>
                                  item.id === project.id
                                    ? { ...item, status: 'Complete', progress: 100 }
                                    : item,
                                ),
                              );
                              setMenuId(null);
                            }}
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
                  ))}
                  {visible.length === 0 && (
                    <div
                      className='px-4 py-8 text-center text-xs'
                      style={{ color: get('--muted-foreground') }}>
                      No projects found.
                    </div>
                  )}
                </div>
                <div
                  className='flex items-start gap-2 rounded-md border p-3'
                  style={{
                    background: utility.info[mode === 'light' ? 'subtle' : 'subtleDark'],
                    color: utility.info[mode],
                    borderColor: get('--border'),
                  }}>
                  <Clock3 className='mt-0.5 size-3.5 shrink-0' />
                  <div className='flex min-w-0 flex-1 flex-col gap-1'>
                    <span className='text-[11px] font-semibold'>Next team review</span>
                    <span className='text-[10px]'>Today at 2:30 PM · Product & design</span>
                  </div>
                  <ArrowUpRight className='size-3.5 shrink-0' />
                </div>
              </>
            ) : (
              <div
                className='flex flex-col gap-4 rounded-md border p-4'
                style={{
                  background: get('--card-raised'),
                  color: get('--card-raised-foreground'),
                  borderColor: get('--border'),
                }}>
                {projects.map((project) => (
                  <div key={project.id} className='flex items-start gap-3'>
                    <span
                      className='grid size-7 shrink-0 place-items-center rounded-full'
                      style={statusStyle(project.status)}>
                      {project.status === 'Complete' ? (
                        <Check className='size-3.5' />
                      ) : (
                        <Clock3 className='size-3.5' />
                      )}
                    </span>
                    <div className='flex min-w-0 flex-col gap-1'>
                      <span className='text-[11px] font-semibold'>{project.name}</span>
                      <span className='text-[10px]' style={{ color: get('--muted-foreground') }}>
                        {project.status === 'Complete'
                          ? 'Completed and ready to archive'
                          : `${project.owner} updated the project`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
      <footer
        className='flex shrink-0 items-center justify-between gap-3 border-t px-4 py-2.5 text-[9px]'
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

// ─── Token editor row ─────────────────────────────────────────────────────────

const TOKEN_ROW_COLUMNS =
  'grid-cols-[minmax(9rem,1.4fr)_minmax(7rem,1fr)_minmax(7rem,1fr)_3.5rem_1.5rem]';

function TokenRow({
  token,
  overrides,
  mode,
  onOverride,
  onRevert,
}: {
  token: SemanticToken;
  overrides: Overrides;
  mode: Mode;
  onOverride: (name: string, m: Mode, hex: string) => void;
  onRevert: (name: string) => void;
}) {
  const isOverridden = !!overrides[token.name];
  const val = overrides[token.name]?.[mode] ?? token[mode];
  const otherMode: Mode = mode === 'light' ? 'dark' : 'light';
  const otherVal = overrides[token.name]?.[otherMode] ?? token[otherMode];

  const xyz = parseColor(val).xyz;
  const onW = contrastRatio(xyz, WHITE_XYZ);
  const onB = contrastRatio(xyz, BLACK_XYZ);
  const bestRatio = Math.max(onW, onB);
  const passes = bestRatio >= 4.5;

  return (
    <div
      className={`grid min-w-120 ${TOKEN_ROW_COLUMNS} items-center gap-1.5 border-b border-border py-2 ${isOverridden ? 'bg-accent/30' : ''}`}>
      <div className='flex min-w-0 items-center gap-1'>
        {isOverridden && <span className='text-[8px] font-bold text-primary'>✎</span>}
        <code className='truncate font-mono text-[10px] text-foreground/80' title={token.name}>
          {token.name}
        </code>
      </div>

      {/* Active mode editable */}
      <HexInput
        aria-label={`${mode} ${token.name}`}
        value={val}
        onChange={(hex) => onOverride(token.name, mode, hex)}
        showSwatch
        className='min-w-0'
      />

      {/* Other mode editable */}
      <HexInput
        aria-label={`${otherMode} ${token.name}`}
        value={otherVal}
        onChange={(hex) => onOverride(token.name, otherMode, hex)}
        showSwatch
        className='min-w-0'
      />

      {/* Contrast badge */}
      <span
        style={{
          fontSize: 8.5,
          fontWeight: 700,
          padding: '2px 5px',
          borderRadius: 3,
          textAlign: 'center',
          background: passes ? 'rgba(34,197,94,.15)' : 'rgba(239,68,68,.12)',
          color: passes ? '#16a34a' : '#dc2626',
        }}
        title={`Best contrast: ${bestRatio.toFixed(1)}:1`}>
        {passes ? `✓ ${bestRatio.toFixed(1)}` : `✗ ${bestRatio.toFixed(1)}`}
      </span>

      {/* Revert */}
      {isOverridden && (
        <Button
          variant='ghost'
          size='icon-xs'
          aria-label={`Revert ${token.name}`}
          onClick={() => onRevert(token.name)}
          title='Revert to generated'>
          <RotateCcw className='size-3' />
        </Button>
      )}
    </div>
  );
}

// ─── Utility token row ────────────────────────────────────────────────────────

export function UtilityThemeCard({
  role,
  utility,
  mode,
}: {
  role: UtilityRole;
  utility: ReturnType<typeof deriveThemeTokens>['utility'];
  mode: Mode;
}) {
  const u = utility[role];
  const color = mode === 'light' ? u.light : u.dark;
  const tc = textColor(parseColor(color).xyz);
  const [copied, setCopied] = useState<string | null>(null);
  const copyColor = async (hex: string, key: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(key);
      setTimeout(() => setCopied(null), 1400);
    } catch {
      setCopied(null);
    }
  };

  return (
    <article
      aria-label={`${role} utility colors`}
      className='flex min-w-0 flex-col gap-3 rounded-md border border-border bg-card p-3'>
      <div className='flex min-w-0 items-center gap-3'>
        <span
          className='grid size-9 shrink-0 place-items-center rounded-md border border-foreground/10 text-sm font-bold'
          style={{ background: color, color: tc }}>
          {role[0].toUpperCase()}
        </span>
        <div className='flex min-w-0 flex-1 flex-col gap-1'>
          <h3 className={`${TYPE.title} capitalize`}>{role}</h3>
          <span className={TYPE.meta}>{mode === 'light' ? 'Light' : 'Dark'} accent</span>
        </div>
        <div className='flex shrink-0 flex-col items-end gap-1'>
          <span className={TYPE.label}>Base</span>
          <button
            type='button'
            aria-label={`Copy ${role} base ${u.base}`}
            title='Copy base color'
            onClick={() => {
              void copyColor(u.base, 'base');
            }}
            className='flex cursor-pointer items-center gap-2 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'>
            <span
              className='size-4 rounded-sm border border-border'
              style={{ background: u.base }}
            />
            <span className={TYPE.mono}>{u.base.toUpperCase()}</span>
            {copied === 'base' ? (
              <Check className='size-3 text-primary' />
            ) : (
              <Copy className='size-3 text-muted-foreground' />
            )}
          </button>
        </div>
      </div>
      <div className='grid flex-1 grid-cols-2 gap-3 border-t border-border pt-3'>
        {(['light', 'dark'] as const).map((theme) => {
          const accent = u[theme];
          const surface = theme === 'light' ? u.subtle : u.subtleDark;
          return (
            <div key={theme} className='flex min-w-0 flex-col gap-2'>
              <span className={TYPE.label}>{theme === 'light' ? 'Light' : 'Dark'}</span>
              <div
                data-utility-preview={theme}
                className='flex min-h-12 flex-1 items-center justify-between gap-2 rounded-md border border-foreground/10 p-2'
                style={{ background: surface, color: accent }}>
                <span
                  className='rounded-sm px-2 py-1 text-[10px] font-semibold capitalize'
                  style={{ background: accent, color: textColor(parseColor(accent).xyz) }}>
                  {role}
                </span>
                <span className='font-display text-base font-semibold'>Aa</span>
              </div>
              <button
                type='button'
                aria-label={`Copy ${role} ${theme} ${accent}`}
                title={`Copy ${theme} accent`}
                onClick={() => {
                  void copyColor(accent, theme);
                }}
                className='flex min-w-0 cursor-pointer items-center justify-between gap-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'>
                <span className={TYPE.mono}>{accent.toUpperCase()}</span>
                {copied === theme ? (
                  <Check className='size-3 shrink-0 text-primary' />
                ) : (
                  <Copy className='size-3 shrink-0 text-muted-foreground' />
                )}
              </button>
              <button
                type='button'
                aria-label={`Copy ${role} ${theme} subtle ${surface}`}
                title={`Copy ${theme} subtle background`}
                onClick={() => {
                  void copyColor(surface, `${theme}-subtle`);
                }}
                className='flex min-w-0 cursor-pointer items-center justify-between gap-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'>
                <span className='text-[9px] text-muted-foreground'>Subtle</span>
                <span className='font-mono text-[9px] text-muted-foreground'>
                  {copied === `${theme}-subtle` ? 'Copied' : surface.toUpperCase()}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </article>
  );
}

// ─── Accessibility panel ──────────────────────────────────────────────────────

export function AccessibilityPanel({ tokens, mode }: { tokens: SemanticToken[]; mode: Mode }) {
  const pairs = [
    { fg: '--foreground', bg: '--background', label: 'Body text / page' },
    {
      fg: '--muted-foreground',
      bg: '--background',
      label: 'Muted text / page',
    },
    { fg: '--card-foreground', bg: '--card', label: 'Body text / card' },
    {
      fg: '--primary-foreground',
      bg: '--primary',
      label: 'Primary button text',
    },
    {
      fg: '--primary-container-foreground',
      bg: '--primary-container',
      label: 'Container text',
    },
    {
      fg: '--secondary-foreground',
      bg: '--secondary',
      label: 'Secondary button text',
    },
    {
      fg: '--destructive-foreground',
      bg: '--destructive',
      label: 'Destructive text',
    },
  ];

  const get = (name: string) => tokens.find((t) => t.name === name)?.[mode] ?? '#888';

  const results = pairs.map(({ fg, bg, label }) => {
    const fgHex = get(fg),
      bgHex = get(bg);
    const fgXyz = parseColor(fgHex).xyz,
      bgXyz = parseColor(bgHex).xyz;
    const ratio = contrastRatio(fgXyz, bgXyz);
    const level = wcagLevel(ratio);
    const lc = Math.abs(apcaContrast(fgXyz, bgXyz));
    return { label, fgHex, bgHex, ratio, level, lc };
  });

  const summaries = [
    {
      label: 'Text AA',
      name: 'normal text AA',
      count: results.filter((result) => result.ratio >= 4.5).length,
    },
    {
      label: 'Text AAA',
      name: 'normal text AAA',
      count: results.filter((result) => result.ratio >= 7).length,
    },
    {
      label: 'Large / UI',
      name: 'large text AA',
      count: results.filter((result) => result.ratio >= 3).length,
    },
  ];
  const columns = 'grid-cols-[minmax(0,1fr)_3.25rem_2rem_3.75rem]';
  const surface = get('--background');
  const inspectorText = textColor(parseColor(surface).xyz);
  const inspectorBorder = `color-mix(in oklch, ${inspectorText} 16%, transparent)`;
  const ModeIcon = mode === 'light' ? Sun : Moon;

  return (
    <section
      data-accessibility-mode={mode}
      aria-label={`${mode} theme contrast`}
      className='flex min-h-0 min-w-0 flex-col overflow-hidden rounded-md border'
      style={
        {
          background: surface,
          color: inspectorText,
          borderColor: inspectorBorder,
          '--foreground': inspectorText,
          '--muted-foreground': `color-mix(in oklch, ${inspectorText} 65%, transparent)`,
          '--border': inspectorBorder,
        } as React.CSSProperties
      }>
      <div
        className='flex shrink-0 items-center justify-between gap-3 border-b p-4'
        style={{
          background: `color-mix(in oklch, ${inspectorText} 5%, ${surface})`,
          borderColor: inspectorBorder,
        }}>
        <div className='flex items-center gap-3'>
          <span
            className='grid size-9 shrink-0 place-items-center rounded-md border'
            style={{ borderColor: inspectorBorder }}>
            <ModeIcon className='size-4' />
          </span>
          <div className='flex flex-col gap-1'>
            <h3 className='font-display text-base leading-tight font-bold'>
              {mode === 'light' ? 'Light theme' : 'Dark theme'}
            </h3>
            <span className={TYPE.meta}>7 contrast pairs</span>
          </div>
        </div>
        <span className={TYPE.mono}>{surface.toUpperCase()}</span>
      </div>
      <div className='grid shrink-0 grid-cols-3 gap-3 border-b border-border p-4'>
        {summaries.map((summary) => (
          <div
            key={summary.name}
            aria-label={`${mode} ${summary.name}`}
            data-passing-count={summary.count}
            className='flex flex-col gap-2'>
            <span className={TYPE.label}>{summary.label}</span>
            <span className={TYPE.stat}>
              {summary.count}
              <span className={`ml-1 ${TYPE.meta}`}>/ {results.length}</span>
            </span>
          </div>
        ))}
      </div>
      <div
        className={`mx-4 grid shrink-0 ${columns} items-center gap-2 border-b border-border py-3 ${TYPE.label}`}>
        <span>Token pairing</span>
        <span className='text-right'>Ratio</span>
        <span className='text-right' title='Absolute APCA contrast'>
          |Lc|
        </span>
        <span className='text-right'>WCAG</span>
      </div>
      <div className='min-w-0 px-4 @4xl/design:min-h-0 @4xl/design:flex-1 @4xl/design:overflow-auto'>
        {results.map(({ label, fgHex, bgHex, ratio, level, lc }) => {
          const status =
            level === 'AAA'
              ? 'var(--success)'
              : level === 'AA'
                ? 'var(--primary)'
                : level === 'AA Large'
                  ? 'var(--warning)'
                  : 'var(--destructive)';
          return (
            <div
              key={label}
              data-contrast-pair={label}
              className={`grid ${columns} items-center gap-2 border-b border-border py-3 last:border-b-0`}>
              <div className='flex min-w-0 items-center gap-2'>
                <span
                  role='img'
                  aria-label={`${label} ${mode} contrast sample`}
                  className='grid h-8 w-9 shrink-0 place-items-center rounded-sm border border-foreground/10 font-display text-base font-bold'
                  style={{ background: bgHex, color: fgHex }}>
                  Aa
                </span>
                <div className='flex min-w-0 flex-col gap-1'>
                  <span className='truncate text-[11px] font-semibold' title={label}>
                    {label}
                  </span>
                  <span
                    className='truncate font-mono text-[9px] text-muted-foreground'
                    title={`${fgHex.toUpperCase()} on ${bgHex.toUpperCase()}`}>
                    {fgHex.toUpperCase()} / {bgHex.toUpperCase()}
                  </span>
                </div>
              </div>
              <span className='text-right font-mono text-[10px] tabular-nums'>
                {ratio.toFixed(2)}:1
              </span>
              <span className='text-right font-mono text-[10px] text-muted-foreground tabular-nums'>
                {Math.round(lc)}
              </span>
              <span
                className='justify-self-end rounded-sm px-1.5 py-1 text-[9px] leading-none font-semibold'
                style={{
                  color: `color-mix(in oklch, ${status} 55%, ${inspectorText})`,
                  background: `color-mix(in oklch, ${status} 12%, transparent)`,
                }}>
                {level}
              </span>
            </div>
          );
        })}
      </div>
      <p className={`shrink-0 border-t border-border px-4 py-3 ${TYPE.meta}`}>
        AA 4.5:1 / AAA 7:1 / Large 3:1. APCA is experimental.
      </p>
    </section>
  );
}

// ─── Export panel ─────────────────────────────────────────────────────────────

function ExportPanel({
  tokens,
  utilityColors,
}: {
  tokens: ReturnType<typeof deriveThemeTokens>;
  utilityColors: UtilityColorSet;
}) {
  const [fmt, setFmt] = useState<ExportFormat>('css');
  const [copied, setCopied] = useState(false);

  const content = useMemo(() => {
    switch (fmt) {
      case 'css':
        return buildThemeCss(tokens);
      case 'tailwind3':
        return buildTailwindV3(tokens);
      case 'tailwind4':
        return buildTailwindV4(tokens);
      case 'figma':
        return buildFigmaTokens(tokens, utilityColors);
      case 'styledictionary':
        return buildStyleDictionary(tokens, utilityColors);
    }
  }, [fmt, tokens, utilityColors]);

  const TABS: { id: ExportFormat; label: string }[] = [
    { id: 'css', label: 'CSS Vars' },
    { id: 'tailwind3', label: 'Tailwind v3' },
    { id: 'tailwind4', label: 'Tailwind v4' },
    { id: 'figma', label: 'Figma' },
    { id: 'styledictionary', label: 'Style Dict' },
  ];

  const DESCRIPTIONS: Record<ExportFormat, string> = {
    css: 'Paste into your global stylesheet. Includes :root {} and .dark {} blocks.',
    tailwind3: 'Merge into tailwind.config.js. Colors reference CSS vars for automatic dark mode.',
    tailwind4: 'Tailwind v4 CSS-first @theme {} block. Requires Tailwind v4+.',
    figma: 'Import via Tokens Studio plugin. Style Dictionary compatible.',
    styledictionary:
      'Amazon Style Dictionary format. Use with sd transform or any SD-compatible pipeline.',
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4'>
      <div className='flex shrink-0 flex-wrap items-center justify-between gap-3'>
        <ToolSegments
          value={fmt}
          onValueChange={setFmt}
          label='Design token export format'
          items={TABS}
        />
        <Button variant='ghost' size='sm' onClick={copy}>
          {copied ? <Check className='size-3.5' /> : <Copy className='size-3.5' />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <p className={`shrink-0 ${TYPE.meta}`}>{DESCRIPTIONS[fmt]}</p>
      <pre className='min-h-64 min-w-0 overflow-auto rounded-md border border-border bg-secondary p-4 font-mono text-[10px] leading-relaxed whitespace-pre text-muted-foreground @4xl/design:min-h-0 @4xl/design:flex-1'>
        {content}
      </pre>
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export default function DesignSystemView() {
  const { slots, utilityColors } = useChromaStore();
  const [mode, setMode] = useState<Mode>('light');
  const [overrides, setOverrides] = useState<Overrides>({});
  const [expandedGroup, setExpandedGroup] = useState<string | null>('Page Surfaces');
  const [activePanel, setActivePanel] = useState<
    'tokens' | 'utility' | 'preview' | 'accessibility' | 'export'
  >('tokens');

  const palette = useMemo(
    () => slots.map((slot) => slot.color.value ?? parseColor(slot.color.hex)),
    [slots],
  );
  const baseTokens = useMemo(
    () => deriveThemeTokens(palette, utilityColors),
    [palette, utilityColors],
  );

  const slotNames = useMemo(() => semanticSlotNames(palette), [palette]);

  // Tokens with overrides applied
  const tokens = useMemo(
    () => ({
      ...baseTokens,
      semantic: mergeTokens(baseTokens.semantic, overrides),
    }),
    [baseTokens, overrides],
  );

  const handleOverride = useCallback(
    (name: string, m: Mode, hex: string) => {
      setOverrides((prev) => ({
        ...prev,
        [name]: {
          light:
            m === 'light'
              ? hex
              : (prev[name]?.light ??
                baseTokens.semantic.find((t) => t.name === name)?.light ??
                hex),
          dark:
            m === 'dark'
              ? hex
              : (prev[name]?.dark ?? baseTokens.semantic.find((t) => t.name === name)?.dark ?? hex),
        },
      }));
    },
    [baseTokens.semantic],
  );

  const handleRevert = useCallback((name: string) => {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const revertAll = () => setOverrides({});
  const overrideCount = Object.keys(overrides).length;

  if (!slots.length) {
    return (
      <div className='tool-panel-space min-h-0 flex-1 overflow-auto'>
        <div className='mb-5'>
          <h2>Design System Studio</h2>
        </div>
        <p className='text-[12px] text-muted-foreground'>
          Generate a palette first to build your design system.
        </p>
      </div>
    );
  }

  const PANELS: { id: typeof activePanel; label: string }[] = [
    { id: 'preview', label: 'Preview' },
    { id: 'tokens', label: 'Tokens' },
    { id: 'utility', label: 'Utility' },
    { id: 'accessibility', label: 'Accessibility' },
    { id: 'export', label: 'Export' },
  ];
  const tokenGroups = TOKEN_GROUPS.filter((group) =>
    tokens.semantic.some((token) => group.ids.includes(token.name)),
  );
  const activeGroup = tokenGroups.find((group) => group.label === expandedGroup) ?? tokenGroups[0];
  const groupTokens =
    activeGroup?.ids.flatMap((name) => tokens.semantic.filter((token) => token.name === name)) ??
    [];

  return (
    <div className='@container/design flex min-h-0 flex-1 flex-col overflow-hidden'>
      <div className='tool-panel-space flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border'>
        <div className='flex min-w-0 flex-wrap items-center gap-3'>
          <div className='flex flex-col gap-1'>
            <span className={TYPE.label}>Source palette</span>
            <span className={TYPE.meta}>
              {tokens.semantic.length} tokens / {slots.length} colors
            </span>
          </div>
          <div className='flex flex-wrap gap-1.5'>
            {slots.map((slot, index) => (
              <span
                key={slot.id}
                title={`${slotNames[index]}: ${slot.color.hex.toUpperCase()}`}
                className={`size-6 shrink-0 rounded-sm border border-border ${index === 0 ? 'ring-1 ring-primary ring-offset-1 ring-offset-background' : ''}`}
                style={{ background: slot.color.hex }}
              />
            ))}
          </div>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <ToolSegments
            value={mode}
            onValueChange={setMode}
            label='Design system mode'
            items={[
              { id: 'light', label: 'Light' },
              { id: 'dark', label: 'Dark' },
            ]}
          />
          {overrideCount > 0 && (
            <Button
              variant='destructive'
              size='sm'
              onClick={revertAll}
              title='Revert all token overrides'>
              <RotateCcw className='size-3.5' />
              Revert all ({overrideCount})
            </Button>
          )}
        </div>
      </div>
      <ToolTabs
        value={activePanel}
        onValueChange={setActivePanel}
        label='Design system panels'
        items={PANELS}
      />
      <div
        key={activePanel}
        data-design-panel={activePanel}
        className={`min-h-0 min-w-0 flex-1 ${activePanel === 'tokens' || activePanel === 'export' ? 'flex flex-col overflow-hidden' : activePanel === 'utility' || activePanel === 'accessibility' ? 'flex flex-col overflow-auto @4xl/design:overflow-hidden' : activePanel === 'preview' ? 'tool-panel-space flex flex-col overflow-auto @4xl/design:overflow-hidden' : 'overflow-auto p-4'}`}>
        {/* ── Preview panel ── */}
        {activePanel === 'preview' && (
          <div className='grid grid-cols-1 gap-4 @4xl/design:min-h-0 @4xl/design:flex-1 @4xl/design:grid-cols-2'>
            {(['light', 'dark'] as const).map((m) => (
              <div key={m} className='flex min-h-0 min-w-0 flex-col gap-3'>
                <div className='flex shrink-0 items-center justify-between gap-2'>
                  <span className={TYPE.label}>{m === 'light' ? 'Light theme' : 'Dark theme'}</span>
                  <span className={TYPE.mono}>
                    {tokens.semantic.find((token) => token.name === '--background')?.[m]}
                  </span>
                </div>
                <div className='min-h-0 flex-1'>
                  <WorkspacePreview
                    tokens={tokens.semantic}
                    slots={slots}
                    utility={tokens.utility}
                    mode={m}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Token editor panel ── */}
        {activePanel === 'tokens' && (
          <div className='grid min-h-0 flex-1 auto-rows-max grid-cols-1 overflow-auto @3xl/design:grid-cols-[14rem_minmax(0,1fr)] @3xl/design:grid-rows-[minmax(0,1fr)] @3xl/design:overflow-hidden @min-[56rem]/design:grid-cols-[16rem_minmax(0,1fr)] @min-[100rem]/design:grid-cols-[20rem_minmax(0,1fr)]'>
            <aside className='tool-panel-space tool-panel-stack flex min-h-0 min-w-0 flex-col border-b border-border @3xl/design:border-r @3xl/design:border-b-0'>
              <span className={`hidden ${TYPE.label} @3xl/design:block`}>Token groups</span>
              <div
                role='group'
                aria-label='Token groups'
                className='flex min-w-0 gap-1 overflow-x-auto @3xl/design:min-h-0 @3xl/design:flex-col @3xl/design:overflow-auto'>
                {tokenGroups.map((group) => (
                  <Button
                    key={group.label}
                    variant='ghost'
                    size='sm'
                    aria-pressed={activeGroup?.label === group.label}
                    onClick={() => setExpandedGroup(group.label)}
                    className={`min-w-0 justify-between gap-3 @3xl/design:w-full ${activeGroup?.label === group.label ? 'border-border bg-accent/30 text-foreground' : 'text-muted-foreground'}`}>
                    <span className='truncate' title={group.label}>
                      {group.label}
                    </span>
                    <span className='text-[9px]'>
                      {tokens.semantic.filter((token) => group.ids.includes(token.name)).length}
                    </span>
                  </Button>
                ))}
              </div>
            </aside>
            <section className='tool-panel-space tool-panel-stack flex min-h-0 min-w-0 flex-col'>
              <div className='flex shrink-0 flex-wrap items-start justify-between gap-3'>
                <div className='flex min-w-0 flex-col gap-1'>
                  <h3 className={TYPE.title}>{activeGroup?.label}</h3>
                  {activeGroup?.desc && <p className={TYPE.meta}>{activeGroup.desc}</p>}
                </div>
                <span className={TYPE.mono}>{groupTokens.length} tokens</span>
              </div>
              <div className='min-w-0 overflow-auto @3xl/design:min-h-0 @3xl/design:flex-1'>
                <div
                  className={`sticky top-0 z-10 grid min-w-120 ${TOKEN_ROW_COLUMNS} gap-1.5 border-b border-border bg-background py-3 ${TYPE.label}`}>
                  {[
                    'Token',
                    mode === 'light' ? 'Light' : 'Dark',
                    mode === 'light' ? 'Dark' : 'Light',
                    'Contrast',
                    '',
                  ].map((heading, index) => (
                    <span key={index}>{heading}</span>
                  ))}
                </div>
                {groupTokens.map((token) => (
                  <TokenRow
                    key={token.name}
                    token={token}
                    overrides={overrides}
                    mode={mode}
                    onOverride={handleOverride}
                    onRevert={handleRevert}
                  />
                ))}
              </div>
              <div className={`shrink-0 border-t border-border pt-3 ${TYPE.meta}`}>
                {overrideCount
                  ? `${overrideCount} modified token${overrideCount === 1 ? '' : 's'}`
                  : 'Generated palette values'}
              </div>
            </section>
          </div>
        )}

        {/* ── Utility colors panel ── */}
        {activePanel === 'utility' && (
          <>
            <div className='flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border p-4'>
              <div className='flex flex-col gap-1'>
                <span className={TYPE.label}>Semantic utility colors</span>
                <span className={TYPE.meta}>Base, accent and subtle values for both themes</span>
              </div>
              <span className={TYPE.mono}>{Object.keys(tokens.utility).length} roles</span>
            </div>
            <div className='grid min-w-0 grid-cols-1 gap-4 p-4 @xl/design:grid-cols-2 @4xl/design:min-h-0 @4xl/design:flex-1 @4xl/design:auto-rows-[minmax(min-content,1fr)] @4xl/design:grid-cols-3 @4xl/design:overflow-auto'>
              {(Object.keys(tokens.utility) as UtilityRole[]).map((role) => (
                <UtilityThemeCard key={role} role={role} utility={tokens.utility} mode={mode} />
              ))}
            </div>
          </>
        )}

        {/* ── Accessibility panel ── */}
        {activePanel === 'accessibility' && (
          <>
            <div className='flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border p-4'>
              <div className='flex flex-col gap-1'>
                <span className={TYPE.label}>Theme contrast</span>
                <span className={TYPE.meta}>Semantic foreground and background pairs</span>
              </div>
              <span className={TYPE.mono}>WCAG 2.1 / APCA |Lc|</span>
            </div>
            <div className='grid grid-cols-1 gap-6 p-4 @4xl/design:min-h-0 @4xl/design:flex-1 @4xl/design:grid-cols-2'>
              {(['light', 'dark'] as const).map((theme) => (
                <AccessibilityPanel key={theme} tokens={tokens.semantic} mode={theme} />
              ))}
            </div>
          </>
        )}

        {/* ── Export panel ── */}
        {activePanel === 'export' && (
          <div className='flex min-h-0 flex-1 flex-col p-4'>
            <ExportPanel tokens={tokens} utilityColors={utilityColors} />
          </div>
        )}
      </div>
    </div>
  );
}
