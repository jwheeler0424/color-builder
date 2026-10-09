import {
  Check,
  CheckCircle2,
  Circle,
  CircleAlert,
  Copy,
  Focus,
  Info,
  Lock,
  Moon,
  RefreshCw,
  Sun,
  TriangleAlert,
  Unlock,
} from 'lucide-react';
import { useState, useMemo } from 'react';

import type { UtilityRole, UtilityColorSet } from '@/types';

import { useChromaStore } from '@/hooks/use-chroma-store';
import {
  BLACK_XYZ,
  WHITE_XYZ,
  contrastRatio,
  deriveThemeTokens,
  isHex,
  normalizeHex,
  parseColor,
  textColor,
  wcagLevel,
} from '@/lib/engine/browser';

import { ToolButton as Button, ToolSegments, TYPE, ViewHeader } from './view-ui';

const ROLES: UtilityRole[] = ['info', 'success', 'warning', 'error', 'neutral', 'focus'];
const ROLE_SYMBOLS = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  error: CircleAlert,
  neutral: Circle,
  focus: Focus,
};

export function buildUtilityCss(
  colors: UtilityColorSet,
  theme: ReturnType<typeof deriveThemeTokens>['utility'],
  format: 'base' | 'themed',
) {
  if (format === 'base')
    return `:root {\n${ROLES.map((role) => `  --${role}: ${colors[role].hex};`).join('\n')}\n}`;
  const values = (mode: 'light' | 'dark') =>
    ROLES.map(
      (role) =>
        `  --${role}: ${theme[role][mode]};\n  --${role}-subtle: ${mode === 'light' ? theme[role].subtle : theme[role].subtleDark};`,
    ).join('\n');
  return `:root {\n${values('light')}\n}\n\n.dark {\n${values('dark')}\n}`;
}

export default function UtilityColorsView() {
  const {
    utilityColors,
    utilityLocks,
    slots,
    setUtilityColor,
    toggleUtilityLock,
    regenUtilityColors,
  } = useChromaStore();
  const [selectedRole, setSelectedRole] = useState<UtilityRole>('info');
  const [draft, setDraft] = useState<string | null>(null);
  const [format, setFormat] = useState<'base' | 'themed'>('base');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [focusedMode, setFocusedMode] = useState<'light' | 'dark' | null>(null);
  const palette = useMemo(
    () => slots.map((slot) => slot.color.value ?? parseColor(slot.color.hex)),
    [slots],
  );
  const theme = useMemo(() => deriveThemeTokens(palette, utilityColors), [palette, utilityColors]);
  const utility = utilityColors[selectedRole];
  const Icon = ROLE_SYMBOLS[selectedRole];
  const inputHex = draft ?? utility.hex;
  const validHex = isHex(inputHex);
  const lockedCount = ROLES.filter((role) => utilityLocks[role]).length;
  const utilityXyz = parseColor(utility.hex).xyz;
  const onWhite = contrastRatio(utilityXyz, WHITE_XYZ);
  const onBlack = contrastRatio(utilityXyz, BLACK_XYZ);
  const css = buildUtilityCss(utilityColors, theme.utility, format);
  const copyValue = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1400);
    } catch {
      setCopiedKey(null);
    }
  };
  const editColor = (value: string) => {
    setCopiedKey(null);
    const hex = isHex(value) ? normalizeHex(value) : null;
    setDraft(value);
    if (hex) {
      setUtilityColor(selectedRole, parseColor(hex));
      setDraft(null);
    }
  };
  const get = (name: string, mode: 'light' | 'dark') =>
    theme.semantic.find((token) => token.name === name)?.[mode] ?? '#888';

  return (
    <div className='@container/utilities flex min-h-0 flex-1 flex-col overflow-hidden'>
      <ViewHeader
        title='Utility Colors'
        description='Semantic role colors and theme-aware state surfaces.'
      />
      <div className='tool-panel-space flex shrink-0 flex-wrap items-center justify-between gap-3 border-y border-border'>
        <div className='flex flex-col gap-1'>
          <span className={TYPE.label}>Palette-derived roles</span>
          <span className={TYPE.meta}>
            {ROLES.length} roles / {lockedCount} locked / {slots.length} source colors
          </span>
        </div>
        <Button
          size='sm'
          disabled={lockedCount === ROLES.length}
          title={
            lockedCount === ROLES.length
              ? 'Unlock a color to regenerate'
              : 'Regenerate unlocked colors'
          }
          onClick={() => {
            setDraft(null);
            setCopiedKey(null);
            regenUtilityColors();
          }}>
          <RefreshCw className='size-3.5' />
          Regenerate all
        </Button>
      </div>
      <div className='grid min-h-0 flex-1 auto-rows-max grid-cols-1 overflow-auto @4xl/utilities:grid-cols-[10rem_minmax(0,1fr)_17rem] @4xl/utilities:grid-rows-[minmax(0,1fr)] @4xl/utilities:overflow-hidden @7xl/utilities:grid-cols-[11rem_minmax(0,1fr)_22rem]'>
        <aside className='tool-panel-space tool-panel-stack flex min-h-0 min-w-0 flex-col border-b border-border @4xl/utilities:border-r @4xl/utilities:border-b-0'>
          <span className={`hidden ${TYPE.label} @4xl/utilities:block`}>Roles</span>
          <div
            role='group'
            aria-label='Utility role selection'
            className='flex min-w-0 gap-2 overflow-x-auto @4xl/utilities:min-h-0 @4xl/utilities:flex-col @4xl/utilities:overflow-auto'>
            {ROLES.map((role) => {
              const current = utilityColors[role];
              const RoleIcon = ROLE_SYMBOLS[role];
              return (
                <button
                  key={role}
                  type='button'
                  aria-label={`Select ${current.label}`}
                  aria-pressed={selectedRole === role}
                  onClick={() => {
                    setSelectedRole(role);
                    setCopiedKey(null);
                    setDraft(null);
                    setFocusedMode(null);
                  }}
                  className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-md border px-2 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring @4xl/utilities:w-full ${selectedRole === role ? 'border-primary/50 bg-accent/30' : 'border-transparent hover:bg-muted'}`}>
                  <span
                    className='grid size-7 shrink-0 place-items-center rounded-sm border border-foreground/10'
                    style={{
                      background: current.hex,
                      color: textColor(parseColor(current.hex).xyz),
                    }}>
                    <RoleIcon className='size-3.5' />
                  </span>
                  <span className='flex min-w-0 flex-1 flex-col gap-1'>
                    <span className='text-[11px] font-semibold'>{current.label}</span>
                    <span className='hidden font-mono text-[9px] text-muted-foreground @4xl/utilities:block'>
                      {current.hex.toUpperCase()}
                    </span>
                  </span>
                  {utilityLocks[role] && (
                    <Lock className='size-3 shrink-0 text-muted-foreground' aria-label='Locked' />
                  )}
                </button>
              );
            })}
          </div>
          {!slots.length && <p className={TYPE.meta}>Default utility colors</p>}
        </aside>
        <section className='tool-panel-space tool-panel-stack @container/editor flex min-h-0 min-w-0 flex-col @4xl/utilities:overflow-auto @4xl/utilities:border-r @4xl/utilities:border-border'>
          <div className='flex shrink-0 items-start justify-between gap-3'>
            <div className='flex min-w-0 items-center gap-3'>
              <span
                className='grid size-12 shrink-0 place-items-center rounded-md border border-foreground/10'
                style={{
                  background: utility.hex,
                  color: textColor(utilityXyz),
                }}>
                <Icon className='size-5' />
              </span>
              <div className='flex min-w-0 flex-col gap-1'>
                <h3 className='font-display text-lg font-bold'>{utility.label}</h3>
                <p className={TYPE.meta}>{utility.description}</p>
              </div>
            </div>
            <Button
              variant='ghost'
              size='icon-sm'
              aria-label={`${utilityLocks[selectedRole] ? 'Unlock' : 'Lock'} ${utility.label}`}
              aria-pressed={utilityLocks[selectedRole]}
              title={
                utilityLocks[selectedRole] ? 'Unlock color' : 'Protect color during regeneration'
              }
              onClick={() => toggleUtilityLock(selectedRole)}>
              {utilityLocks[selectedRole] ? (
                <Lock className='size-4' />
              ) : (
                <Unlock className='size-4' />
              )}
            </Button>
          </div>
          <div className='grid shrink-0 grid-cols-1 gap-3 border-b border-border pb-4 @sm/editor:grid-cols-[minmax(0,1fr)_auto]'>
            <div className='flex flex-col gap-2'>
              <label htmlFor='utility-base-hex' className={TYPE.label}>
                Base color
              </label>
              <div className='flex items-center gap-2'>
                <input
                  type='color'
                  aria-label={`Pick ${utility.label} color`}
                  value={utility.hex}
                  onChange={(event) => editColor(event.target.value)}
                  className='size-8 shrink-0 cursor-pointer overflow-hidden rounded-sm border border-border bg-transparent p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0'
                />
                <input
                  id='utility-base-hex'
                  aria-label={`${utility.label} base hex`}
                  aria-invalid={!validHex}
                  value={inputHex}
                  onChange={(event) => editColor(event.target.value)}
                  onBlur={() => setDraft(null)}
                  maxLength={7}
                  spellCheck={false}
                  autoComplete='off'
                  className='h-8 min-w-0 flex-1 rounded border border-border bg-muted px-2 font-mono text-xs outline-none focus:border-ring aria-invalid:border-destructive'
                />
                <Button
                  variant='outline'
                  size='icon-sm'
                  aria-label={`Copy ${utility.label} base color`}
                  title='Copy base color'
                  onClick={() => {
                    void copyValue('base', utility.hex);
                  }}>
                  {copiedKey === 'base' ? (
                    <Check className='size-3.5' />
                  ) : (
                    <Copy className='size-3.5' />
                  )}
                </Button>
              </div>
            </div>
            <div className='flex items-end gap-4'>
              {[
                { label: 'On white', ratio: onWhite },
                { label: 'On black', ratio: onBlack },
              ].map(({ label, ratio }) => (
                <div key={label} className='flex flex-col gap-1'>
                  <span className={TYPE.label}>{label}</span>
                  <span className={TYPE.mono}>{ratio.toFixed(2)}:1</span>
                  <span
                    className='text-[9px] font-semibold'
                    style={{
                      color:
                        ratio >= 4.5
                          ? 'var(--success)'
                          : ratio >= 3
                            ? 'var(--warning)'
                            : 'var(--destructive)',
                    }}>
                    {wcagLevel(ratio)}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className='flex shrink-0 items-center justify-between gap-2'>
            <span className={TYPE.label}>Theme usage</span>
            <span className={TYPE.mono}>
              {utilityLocks[selectedRole] ? 'Locked base' : 'Editable base'}
            </span>
          </div>
          <div className='grid auto-rows-[minmax(19rem,1fr)] grid-cols-1 gap-4 @sm/editor:grid-cols-2 @4xl/utilities:min-h-0 @4xl/utilities:flex-1'>
            {(['light', 'dark'] as const).map((mode) => {
              const role = theme.utility[selectedRole];
              const accent = role[mode];
              const subtle = mode === 'light' ? role.subtle : role.subtleDark;
              return (
                <article
                  key={mode}
                  data-utility-theme={mode}
                  className='flex min-w-0 flex-col overflow-hidden rounded-md border'
                  style={{
                    background: get('--background', mode),
                    color: get('--foreground', mode),
                    borderColor: get('--border', mode),
                  }}>
                  <div
                    className='flex shrink-0 items-center gap-2 border-b px-3 py-3'
                    style={{
                      background: get('--surface-dim', mode),
                      borderColor: get('--border', mode),
                    }}>
                    {mode === 'light' ? (
                      <Sun className='size-3.5' />
                    ) : (
                      <Moon className='size-3.5' />
                    )}
                    <h4 className='text-[11px] font-semibold'>
                      {mode === 'light' ? 'Light theme' : 'Dark theme'}
                    </h4>
                  </div>
                  <div className='flex flex-1 flex-col gap-4 p-3'>
                    <div
                      className='flex items-center gap-2 rounded-md border p-3'
                      style={{
                        background: subtle,
                        color: accent,
                        borderColor: `color-mix(in oklch, ${accent} 25%, transparent)`,
                      }}>
                      <Icon className='size-4 shrink-0' />
                      <div className='flex min-w-0 flex-col gap-1'>
                        <span className='text-[11px] font-semibold'>
                          {selectedRole === 'success'
                            ? 'Changes saved'
                            : selectedRole === 'warning'
                              ? 'Review required'
                              : selectedRole === 'error'
                                ? 'Unable to save'
                                : selectedRole === 'focus'
                                  ? 'Keyboard focus'
                                  : selectedRole === 'neutral'
                                    ? 'Pending update'
                                    : 'Project update'}
                        </span>
                        <span className='text-[10px]'>
                          {selectedRole === 'error' ? 'Please try again.' : 'Workspace status'}
                        </span>
                      </div>
                    </div>
                    <div className='flex flex-wrap items-center gap-2'>
                      <span
                        className='inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-[10px] font-semibold'
                        style={{ background: accent, color: textColor(parseColor(accent).xyz) }}>
                        <Icon className='size-3' />
                        {utility.label}
                      </span>
                      <span
                        className='rounded-sm border px-2 py-1 text-[10px] font-semibold'
                        style={{ color: accent, borderColor: accent }}>
                        Aa
                      </span>
                    </div>
                    <label className='flex flex-col gap-1.5 text-[10px]'>
                      Project name
                      <input
                        aria-label={`${mode} utility focus sample`}
                        value='Website refresh'
                        readOnly
                        onFocus={() => setFocusedMode(mode)}
                        onBlur={() => setFocusedMode(null)}
                        className='h-8 w-full min-w-0 rounded-md border px-2 text-[11px] outline-none'
                        style={{
                          background: get('--input', mode),
                          color: get('--foreground', mode),
                          borderColor: get('--border', mode),
                          boxShadow:
                            selectedRole === 'focus' || focusedMode === mode
                              ? `0 0 0 2px ${theme.utility.focus[mode]}`
                              : undefined,
                        }}
                      />
                    </label>
                    <div
                      className='mt-auto flex flex-col gap-2 border-t pt-3'
                      style={{ borderColor: get('--border', mode) }}>
                      {[
                        { label: 'Accent', hex: accent },
                        { label: 'Subtle', hex: subtle },
                      ].map((value) => (
                        <button
                          key={value.label}
                          type='button'
                          aria-label={`Copy ${mode} ${utility.label} ${value.label.toLowerCase()}`}
                          onClick={() => {
                            void copyValue(`${mode}-${value.label}`, value.hex);
                          }}
                          className='flex cursor-pointer items-center justify-between gap-2 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring'>
                          <span
                            className='text-[9px]'
                            style={{ color: get('--muted-foreground', mode) }}>
                            {value.label}
                          </span>
                          <span className='inline-flex items-center gap-1.5 font-mono text-[9px]'>
                            {value.hex.toUpperCase()}
                            {copiedKey === `${mode}-${value.label}` ? (
                              <Check className='size-3' />
                            ) : (
                              <Copy className='size-3' />
                            )}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
        <aside className='flex min-h-0 min-w-0 flex-col gap-4 border-t border-border p-4 @4xl/utilities:border-t-0'>
          <div className='flex shrink-0 items-center justify-between gap-2'>
            <span className={TYPE.label}>Export utilities</span>
            <Button
              variant='outline'
              size='xs'
              onClick={() => {
                void copyValue('css', css);
              }}>
              {copiedKey === 'css' ? <Check className='size-3' /> : <Copy className='size-3' />}
              {copiedKey === 'css' ? 'Copied CSS' : 'Copy CSS Vars'}
            </Button>
          </div>
          <ToolSegments
            value={format}
            onValueChange={setFormat}
            label='Utility export format'
            items={[
              { id: 'base', label: 'Base CSS' },
              { id: 'themed', label: 'Theme CSS' },
            ]}
          />
          <pre className='max-h-96 min-h-40 min-w-0 overflow-auto rounded-md border border-border bg-secondary p-3 font-mono text-[10px] leading-relaxed whitespace-pre text-muted-foreground @4xl/utilities:max-h-none @4xl/utilities:min-h-0 @4xl/utilities:flex-1'>
            {css}
          </pre>
          <div className='flex shrink-0 flex-col gap-3 border-t border-border pt-3'>
            <span className={TYPE.label}>Source palette</span>
            <div className='flex flex-wrap gap-1.5'>
              {slots.map((slot) => (
                <span
                  key={slot.id}
                  className='size-5 rounded-sm border border-border'
                  title={slot.color.hex.toUpperCase()}
                  style={{ background: slot.color.hex }}
                />
              ))}
            </div>
            <span className={TYPE.meta}>
              {format === 'base'
                ? '6 base color variables'
                : 'Light + dark / accent + subtle values'}
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
