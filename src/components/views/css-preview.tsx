import {
  Check,
  CheckCircle2,
  Circle,
  CircleAlert,
  Copy,
  Focus,
  Info,
  Moon,
  Search,
  Sun,
  TriangleAlert,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { useChromaStore } from '@/hooks/use-chroma-store';
import { buildThemeCss, deriveThemeTokens, parseColor, textColor } from '@/lib/engine/browser';

import { TOKEN_GROUPS, WorkspacePreview, type PreviewPage } from './design-system-view';
import { ToolButton as Button, ToolSegments, ToolTabs, TYPE } from './view-ui';

type PreviewMode = 'light' | 'dark' | 'split';

// ─── Mini App Preview ─────────────────────────────────────────────────────────

// ─── Token Role Legend ────────────────────────────────────────────────────────

export function TokenLegend({
  tokens,
  mode,
  query = '',
  copiedKey,
  onCopy,
}: {
  tokens: ReturnType<typeof deriveThemeTokens>;
  mode: 'light' | 'dark';
  query?: string;
  copiedKey?: string | null;
  onCopy: (key: string, hex: string) => void;
}) {
  const groups = TOKEN_GROUPS.map((group) => ({
    label: group.label,
    tokens: tokens.semantic.filter(
      (token) =>
        group.ids.includes(token.name) &&
        `${token.name} ${group.label}`.toLowerCase().includes(query.trim().toLowerCase()),
    ),
  })).filter((group) => group.tokens.length);

  return (
    <div className='flex flex-col gap-5'>
      {groups.length === 0 && <p className={TYPE.meta}>No matching tokens.</p>}
      {groups.map(({ label, tokens: groupTokens }) => (
        <div key={label} className='min-w-0'>
          <div className='mb-1.5 text-[9px] font-bold tracking-[.07em] text-muted-foreground uppercase'>
            {label}
          </div>
          <div className='flex flex-col gap-2'>
            {groupTokens.map((token) => {
              const id = token.name;
              const hex = token[mode];
              return (
                <button
                  type='button'
                  data-token-role={id}
                  aria-label={`Copy ${mode} ${id} ${hex}`}
                  onClick={() => onCopy(`${mode}:${id}`, hex)}
                  key={id}
                  title={id}
                  className='grid min-w-0 cursor-pointer grid-cols-[1.25rem_minmax(0,1fr)_auto_0.75rem] items-center gap-2 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring'>
                  <div
                    className='rounded'
                    style={{
                      width: 20,
                      height: 20,
                      background: hex,
                      border: '1px solid rgba(128,128,128,.2)',
                    }}
                  />
                  <span className='truncate font-mono text-[10px] text-foreground/80'>
                    {id.replace('--', '')}
                  </span>
                  <span className='font-mono text-[9px] text-muted-foreground'>
                    {hex.toUpperCase()}
                  </span>
                  {copiedKey === `${mode}:${id}` ? (
                    <Check className='size-3 text-primary' />
                  ) : (
                    <Copy className='size-3 text-muted-foreground' />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Utility Color Panel ──────────────────────────────────────────────────────

function UtilityPanel({
  tokens,
  mode,
  onCopy,
  copiedKey,
}: {
  tokens: ReturnType<typeof deriveThemeTokens>;
  mode: 'light' | 'dark';
  onCopy: (key: string, hex: string) => void;
  copiedKey: string | null;
}) {
  const ICONS = {
    info: Info,
    success: CheckCircle2,
    warning: TriangleAlert,
    error: CircleAlert,
    neutral: Circle,
    focus: Focus,
  };
  const roles = Object.keys(tokens.utility) as (keyof typeof tokens.utility)[];

  return (
    <div className='grid grid-cols-1 gap-4'>
      {[mode].map((m) => (
        <div key={m}>
          <div className='mb-2 text-[9.5px] font-bold tracking-[.07em] text-muted-foreground uppercase'>
            {m === 'light' ? '☀ Light' : '☾ Dark'}
          </div>
          <div className='flex flex-col gap-1.5'>
            {roles.map((role) => {
              const Icon = ICONS[role];
              const color = m === 'light' ? tokens.utility[role].light : tokens.utility[role].dark;
              const subtle =
                m === 'light' ? tokens.utility[role].subtle : tokens.utility[role].subtleDark;
              return (
                <button
                  type='button'
                  aria-label={`Copy ${m} ${role} ${color}`}
                  onClick={() => onCopy(`${m}:utility:${role}`, color)}
                  key={role}
                  className='min-w-0 cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-ring'
                  style={{
                    background: subtle,
                    color: textColor(parseColor(subtle).xyz),
                    border: `1px solid ${color}`,
                    borderRadius: 6,
                    padding: '6px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                  <div
                    className='flex shrink-0 items-center justify-center rounded-full text-[10px]'
                    style={{ width: 20, height: 20, background: color }}>
                    <Icon className='size-3' style={{ color: textColor(parseColor(color).xyz) }} />
                  </div>
                  <span className='flex-1 text-[10px] font-bold capitalize'>{role}</span>
                  <div className='flex items-center gap-1'>
                    <div
                      title='filled'
                      className='h-3.5 w-3.5 rounded'
                      style={{
                        background: color,
                        border: '1px solid rgba(128,128,128,.2)',
                      }}
                    />
                    <div
                      title='subtle'
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 3,
                        background: subtle,
                        border: `1px solid ${color}`,
                      }}
                    />
                    <span className='ml-0.5 font-mono text-[8.5px]'>{color}</span>
                    {copiedKey === `${m}:utility:${role}` && <Check className='size-3' />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function CssPreview() {
  const { slots, utilityColors } = useChromaStore();
  const [previewMode, setPreviewMode] = useState<PreviewMode>('split');
  const [inspector, setInspector] = useState<'tokens' | 'utility' | 'css'>('tokens');
  const [inspectorMode, setInspectorMode] = useState<'light' | 'dark'>('light');
  const [page, setPage] = useState<PreviewPage>('projects');
  const [query, setQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const palette = useMemo(
    () => slots.map((slot) => slot.color.value ?? parseColor(slot.color.hex)),
    [slots],
  );
  const tokens = useMemo(() => deriveThemeTokens(palette, utilityColors), [palette, utilityColors]);
  const css = buildThemeCss(tokens);
  const copyValue = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1400);
    } catch {
      setCopiedKey(null);
    }
  };

  if (!slots.length) {
    return (
      <div className='min-h-0 flex-1 overflow-auto p-6'>
        <div className='mb-5'>
          <h2>Live CSS Preview</h2>
        </div>
        <p className='text-[12px] text-muted-foreground'>
          Generate a palette first to see the preview.
        </p>
      </div>
    );
  }

  const showLight = previewMode === 'light' || previewMode === 'split';
  const showDark = previewMode === 'dark' || previewMode === 'split';
  const inspectedMode = previewMode === 'split' ? inspectorMode : previewMode;

  return (
    <div className='@container/css flex min-h-0 flex-1 flex-col overflow-auto @4xl/tokens:overflow-hidden'>
      <div className='flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border p-4'>
        <div className='flex flex-col gap-1'>
          <span className={TYPE.label}>Live theme comparison</span>
          <span className={TYPE.meta}>
            {tokens.semantic.length} semantic tokens / {slots.length} palette colors
          </span>
        </div>
        <ToolSegments
          value={previewMode}
          onValueChange={setPreviewMode}
          label='CSS preview mode'
          items={[
            { id: 'split', label: 'Split' },
            { id: 'light', label: 'Light only' },
            { id: 'dark', label: 'Dark only' },
          ]}
        />
      </div>
      <div className='flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3'>
        <ToolSegments
          value={page}
          onValueChange={setPage}
          label='CSS sample page'
          items={[
            { id: 'landing', label: 'Landing' },
            { id: 'projects', label: 'Projects' },
            { id: 'activity', label: 'Activity' },
            { id: 'settings', label: 'Settings' },
          ]}
        />
        <span className={TYPE.mono}>
          {previewMode === 'split'
            ? 'Light + dark'
            : previewMode === 'light'
              ? 'Light theme'
              : 'Dark theme'}
        </span>
      </div>
      <div className='grid auto-rows-max grid-cols-1 @4xl/css:min-h-0 @4xl/css:flex-1 @4xl/css:grid-cols-[minmax(0,1fr)_16rem] @4xl/css:grid-rows-[minmax(0,1fr)]'>
        <section className='@container/previews flex min-h-0 min-w-0 flex-col p-4 @4xl/tokens:overflow-auto @4xl/tokens:border-r @4xl/tokens:border-border'>
          <div
            className={`grid min-w-0 grid-cols-1 gap-4 @4xl/tokens:min-h-0 @4xl/tokens:flex-1 ${showLight && showDark ? '@min-[45rem]/previews:grid-cols-2' : ''}`}>
            {(['light', 'dark'] as const)
              .filter((mode) => (mode === 'light' ? showLight : showDark))
              .map((mode) => (
                <div
                  key={mode}
                  data-css-preview={mode}
                  className='flex min-w-0 flex-col gap-3 @4xl/tokens:min-h-0'>
                  <div className='flex shrink-0 items-center justify-between gap-2'>
                    <span className={`inline-flex items-center gap-2 ${TYPE.label}`}>
                      {mode === 'light' ? (
                        <Sun className='size-3.5' />
                      ) : (
                        <Moon className='size-3.5' />
                      )}
                      {mode === 'light' ? 'Light theme' : 'Dark theme'}
                    </span>
                    <span className={TYPE.mono}>
                      {tokens.semantic.find((token) => token.name === '--background')?.[mode]}
                    </span>
                  </div>
                  <div
                    className='min-w-0 @4xl/tokens:min-h-0 @4xl/tokens:flex-1'
                    style={{
                      background: tokens.semantic.find((token) => token.name === '--background')?.[
                        mode
                      ],
                    }}>
                    <WorkspacePreview
                      tokens={tokens.semantic}
                      slots={slots}
                      utility={tokens.utility}
                      mode={mode}
                      page={page}
                      onPageChange={setPage}
                    />
                  </div>
                </div>
              ))}
          </div>
        </section>
        <aside className='flex min-h-0 min-w-0 flex-col gap-4 border-t border-border p-4 @4xl/css:border-t-0'>
          <div className='flex shrink-0 flex-wrap items-center justify-between gap-2'>
            <span className={TYPE.label}>Token inspector</span>
            {previewMode === 'split' && (
              <ToolSegments
                value={inspectorMode}
                onValueChange={setInspectorMode}
                label='Token inspector mode'
                items={[
                  { id: 'light', label: 'Light' },
                  { id: 'dark', label: 'Dark' },
                ]}
              />
            )}
          </div>
          <ToolTabs
            value={inspector}
            onValueChange={setInspector}
            label='CSS token inspector'
            stretch
            items={[
              { id: 'tokens', label: 'Roles' },
              { id: 'utility', label: 'Utility' },
              { id: 'css', label: 'CSS' },
            ]}
          />
          {inspector === 'tokens' && (
            <label className='flex h-8 shrink-0 items-center gap-2 rounded-md border border-border bg-muted px-2'>
              <Search className='size-3.5 shrink-0 text-muted-foreground' />
              <input
                type='search'
                aria-label='Search CSS tokens'
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder='Find a token'
                className='w-full min-w-0 bg-transparent text-[11px] outline-none'
              />
            </label>
          )}
          {inspector === 'css' && (
            <Button
              variant='outline'
              size='sm'
              className='shrink-0'
              onClick={() => {
                void copyValue('css', css);
              }}>
              {copiedKey === 'css' ? <Check className='size-3' /> : <Copy className='size-3' />}
              {copiedKey === 'css' ? 'Copied CSS' : 'Copy theme CSS'}
            </Button>
          )}
          <div
            key={inspector}
            className='max-h-120 min-w-0 overflow-auto @4xl/css:max-h-none @4xl/css:min-h-0 @4xl/css:flex-1'>
            {inspector === 'tokens' ? (
              <TokenLegend
                tokens={tokens}
                mode={inspectedMode}
                query={query}
                copiedKey={copiedKey}
                onCopy={(key, hex) => {
                  void copyValue(key, hex);
                }}
              />
            ) : inspector === 'utility' ? (
              <UtilityPanel
                tokens={tokens}
                mode={inspectedMode}
                copiedKey={copiedKey}
                onCopy={(key, hex) => {
                  void copyValue(key, hex);
                }}
              />
            ) : (
              <pre className='min-h-full rounded-md border border-border bg-secondary p-3 font-mono text-[10px] leading-relaxed whitespace-pre text-muted-foreground'>
                {css}
              </pre>
            )}
          </div>
          <span className={`shrink-0 border-t border-border pt-3 ${TYPE.meta}`}>
            {inspector === 'css'
              ? 'Theme CSS / light + dark'
              : `${inspectedMode === 'light' ? 'Light' : 'Dark'} theme values`}
          </span>
        </aside>
      </div>
    </div>
  );
}
