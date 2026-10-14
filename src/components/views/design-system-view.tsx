import {
  IconCheck as Check,
  IconCopy as Copy,
  IconMoon as Moon,
  IconRefresh as RotateCcw,
  IconSun as Sun,
  IconX,
} from '@tabler/icons-react';
import { useMemo, useState, useCallback } from 'react';

import type { SemanticToken, UtilityColorSet, UtilityRole } from '@/types';

import { ToolEmptyState } from '@/components/global/tool-empty-state';
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
import { ToolButton as Button, ToolSegments, ToolTabs, TYPE } from './view-ui';
import { WorkspacePreview } from './workspace-preview';

export { WorkspacePreview, type PreviewPage } from './workspace-preview';

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
      className={`grid min-w-120 ${TOKEN_ROW_COLUMNS} items-center gap-1.5 border-b border-border py-2 last:border-b-0 ${isOverridden ? 'bg-accent/30' : ''}`}>
      <div className='flex min-w-0 items-center gap-1'>
        {isOverridden && <span className='text-2xs font-bold text-primary'>✎</span>}
        <code className='truncate font-mono text-2xs text-foreground/80' title={token.name}>
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
        className='text-2xs font-bold'
        style={{
          padding: '2px 5px',
          borderRadius: 3,
          textAlign: 'center',
          background: passes ? 'rgba(34,197,94,.15)' : 'rgba(239,68,68,.12)',
          color: passes ? '#16a34a' : '#dc2626',
        }}
        title={`Best contrast: ${bestRatio.toFixed(1)}:1`}>
        {passes ? (
          <>
            <Check className='mr-1 inline size-3' aria-hidden='true' />
            {bestRatio.toFixed(1)}
          </>
        ) : (
          <>
            <IconX className='mr-1 inline size-3' aria-hidden='true' />
            {bestRatio.toFixed(1)}
          </>
        )}
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
  colorRole,
  utility,
  mode,
}: {
  colorRole: UtilityRole;
  utility: ReturnType<typeof deriveThemeTokens>['utility'];
  mode: Mode;
}) {
  const u = utility[colorRole];
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
      aria-label={`${colorRole} utility colors`}
      className='flex min-w-0 flex-col gap-3 rounded-md border border-border bg-card p-3'>
      <div className='flex min-w-0 items-center gap-3'>
        <span
          className='grid size-9 shrink-0 place-items-center rounded-md border border-foreground/10 text-sm font-bold'
          style={{ background: color, color: tc }}>
          {colorRole[0].toUpperCase()}
        </span>
        <div className='flex min-w-0 flex-1 flex-col gap-1'>
          <h3 className={`${TYPE.title} capitalize`}>{colorRole}</h3>
          <span className={TYPE.meta}>{mode === 'light' ? 'Light' : 'Dark'} accent</span>
        </div>
        <div className='flex shrink-0 flex-col items-end gap-1'>
          <span className={TYPE.label}>Base</span>
          <button
            type='button'
            aria-label={`Copy ${colorRole} base ${u.base}`}
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
                  className='rounded-sm px-2 py-1 text-2xs font-semibold capitalize'
                  style={{ background: accent, color: textColor(parseColor(accent).xyz) }}>
                  {colorRole}
                </span>
                <span className='font-display text-base font-semibold'>Aa</span>
              </div>
              <button
                type='button'
                aria-label={`Copy ${colorRole} ${theme} ${accent}`}
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
                aria-label={`Copy ${colorRole} ${theme} subtle ${surface}`}
                title={`Copy ${theme} subtle background`}
                onClick={() => {
                  void copyColor(surface, `${theme}-subtle`);
                }}
                className='flex min-w-0 cursor-pointer items-center justify-between gap-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'>
                <span className='text-2xs text-muted-foreground'>Subtle</span>
                <span className='font-mono text-2xs text-muted-foreground'>
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
                  <span className='truncate text-xs font-semibold' title={label}>
                    {label}
                  </span>
                  <span
                    className='truncate font-mono text-2xs text-muted-foreground'
                    title={`${fgHex.toUpperCase()} on ${bgHex.toUpperCase()}`}>
                    {fgHex.toUpperCase()} / {bgHex.toUpperCase()}
                  </span>
                </div>
              </div>
              <span className='text-right font-mono text-2xs tabular-nums'>
                {ratio.toFixed(2)}:1
              </span>
              <span className='text-right font-mono text-2xs text-muted-foreground tabular-nums'>
                {Math.round(lc)}
              </span>
              <span
                className='justify-self-end rounded-sm px-1.5 py-1 text-2xs leading-none font-semibold'
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
      <pre className='min-h-64 min-w-0 overflow-auto rounded-md border border-border bg-secondary p-4 font-mono text-2xs leading-relaxed whitespace-pre text-muted-foreground @4xl/design:min-h-0 @4xl/design:flex-1'>
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
      <ToolEmptyState
        className='min-h-0 flex-1 overflow-auto tool-panel-space'
        title='Design System Studio'
        message='Generate a palette first to build your design system.'
      />
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
      <div className='flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border tool-panel-space'>
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
        className={`min-h-0 min-w-0 flex-1 ${activePanel === 'tokens' || activePanel === 'export' ? 'flex flex-col overflow-hidden' : activePanel === 'utility' || activePanel === 'accessibility' ? 'flex flex-col overflow-auto @4xl/design:overflow-hidden' : activePanel === 'preview' ? 'flex flex-col overflow-auto tool-panel-space @4xl/design:overflow-hidden' : 'overflow-auto p-4'}`}>
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
            <aside className='flex min-h-0 min-w-0 flex-col tool-panel-stack border-b border-border tool-panel-space @3xl/design:border-r @3xl/design:border-b-0'>
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
                    <span className='text-2xs'>
                      {tokens.semantic.filter((token) => group.ids.includes(token.name)).length}
                    </span>
                  </Button>
                ))}
              </div>
            </aside>
            <section className='flex min-h-0 min-w-0 flex-col tool-panel-stack tool-panel-space'>
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
                <UtilityThemeCard
                  key={role}
                  colorRole={role}
                  utility={tokens.utility}
                  mode={mode}
                />
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
