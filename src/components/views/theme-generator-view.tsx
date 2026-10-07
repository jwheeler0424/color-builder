import { Check, Copy, Moon, RotateCcw, Search, Sun } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useChromaStore } from '@/hooks/use-chroma-store';
import {
  buildFigmaTokens,
  buildStyleDictionary,
  buildTailwindV3,
  buildTailwindV4,
  buildThemeCss,
  deriveThemeTokens,
  parseColor,
  semanticSlotNames,
} from '@/lib/engine/browser';

import HexInput from '../common/hex-input';
import {
  AccessibilityPanel,
  TOKEN_GROUPS,
  UtilityThemeCard,
  WorkspacePreview,
  type PreviewPage,
} from './design-system-view';
import { ToolButton as Button, ToolSegments, ToolTabs, TYPE, ViewHeader } from './view-ui';

type ThemeTab = 'css' | 'figma' | 'tailwind' | 'tailwind4' | 'styledictionary';
type PreviewMode = 'light' | 'dark';

const TAB_LABELS: Record<ThemeTab, string> = {
  css: 'CSS Variables',
  figma: 'Figma / SD',
  tailwind: 'Tailwind v3',
  tailwind4: 'Tailwind v4',
  styledictionary: 'Style Dictionary',
};

// ─── Main View ────────────────────────────────────────────────────────────────

export default function ThemeGeneratorView() {
  const { slots, utilityColors } = useChromaStore();
  const [activeTab, setActiveTab] = useState<ThemeTab>('css');
  const [previewMode, setPreviewMode] = useState<PreviewMode | 'split'>('light');
  const [copied, setCopied] = useState(false);
  const [inspector, setInspector] = useState<'export' | 'tokens' | 'utility' | 'contrast'>(
    'export',
  );
  const [page, setPage] = useState<PreviewPage>('landing');
  const [query, setQuery] = useState('');
  const [inspectorMode, setInspectorMode] = useState<PreviewMode>('light');

  const palette = useMemo(
    () => slots.map((slot) => slot.color.value ?? parseColor(slot.color.hex)),
    [slots],
  );
  const tokens = useMemo(() => deriveThemeTokens(palette, utilityColors), [palette, utilityColors]);
  const slotNames = useMemo(() => semanticSlotNames(palette), [palette]);
  const [tokenOverrides, setTokenOverrides] = useState<
    Record<string, { light: string; dark: string }>
  >({});

  const mergedTokens = useMemo(
    () => ({
      ...tokens,
      semantic: tokens.semantic.map((t) => {
        const o = tokenOverrides[t.name];
        return o ? { ...t, light: o.light ?? t.light, dark: o.dark ?? t.dark } : t;
      }),
    }),
    [tokens, tokenOverrides],
  );

  const overrideToken = (name: string, mode: 'light' | 'dark', hex: string) => {
    setTokenOverrides((prev) => ({
      ...prev,
      [name]: {
        light:
          mode === 'light'
            ? hex
            : (prev[name]?.light ?? tokens.semantic.find((t) => t.name === name)?.light ?? hex),
        dark:
          mode === 'dark'
            ? hex
            : (prev[name]?.dark ?? tokens.semantic.find((t) => t.name === name)?.dark ?? hex),
      },
    }));
  };
  const revertToken = (name: string) => {
    setTokenOverrides((prev) => {
      const n = { ...prev };
      delete n[name];
      return n;
    });
  };
  const overrideCount = Object.keys(tokenOverrides).length;

  const content = useMemo((): string => {
    if (!slots.length) return '';
    switch (activeTab) {
      case 'css':
        return buildThemeCss(mergedTokens);
      case 'figma':
        return buildFigmaTokens(mergedTokens, utilityColors);
      case 'tailwind':
        return buildTailwindV3(mergedTokens);
      case 'tailwind4':
        return buildTailwindV4(mergedTokens);
      case 'styledictionary':
        return buildStyleDictionary(mergedTokens, utilityColors);
      default:
        return '';
    }
  }, [mergedTokens, utilityColors, activeTab, slots.length]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  if (!slots.length) {
    return (
      <div className='min-h-0 flex-1 overflow-auto p-6'>
        <div className='mb-5'>
          <h2>Theme Generator</h2>
        </div>
        <p className='text-[12px] text-muted-foreground'>
          Generate a palette first to see your theme.
        </p>
      </div>
    );
  }
  const visibleModes: PreviewMode[] = previewMode === 'split' ? ['light', 'dark'] : [previewMode];
  const editedMode = previewMode === 'split' ? inspectorMode : previewMode;
  const tokenGroups = TOKEN_GROUPS.map((group) => ({
    ...group,
    tokens: mergedTokens.semantic.filter(
      (token) =>
        group.ids.includes(token.name) &&
        `${token.name} ${group.label}`.toLowerCase().includes(query.trim().toLowerCase()),
    ),
  })).filter((group) => group.tokens.length);

  return (
    <div className='@container/theme flex min-h-0 flex-1 flex-col overflow-hidden'>
      <ViewHeader
        title='Theme Generator'
        description='Palette-derived surfaces, semantic colors and light/dark theme exports.'
      />
      <div className='flex shrink-0 flex-wrap items-center justify-between gap-3 border-y border-border p-4'>
        <div className='flex min-w-0 flex-wrap items-center gap-3'>
          <div className='flex flex-col gap-1'>
            <span className={TYPE.label}>Source palette</span>
            <span className={TYPE.meta}>
              {slots.length} colors / {mergedTokens.semantic.length} tokens
            </span>
          </div>
          <div className='flex flex-wrap gap-1.5'>
            {slots.map((slot, index) => (
              <span
                key={slot.id}
                className='size-6 rounded-sm border border-border'
                title={`${slotNames[index]}: ${slot.color.hex.toUpperCase()}`}
                style={{ background: slot.color.hex }}
              />
            ))}
          </div>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <ToolSegments
            value={previewMode}
            onValueChange={setPreviewMode}
            label='Theme preview mode'
            items={[
              { id: 'light', label: 'Light' },
              { id: 'dark', label: 'Dark' },
              { id: 'split', label: 'Split' },
            ]}
          />
          {overrideCount > 0 && (
            <Button
              variant='outline'
              size='xs'
              onClick={() => setTokenOverrides({})}
              title='Revert all token overrides'>
              <RotateCcw className='size-3' />
              Revert all ({overrideCount})
            </Button>
          )}
        </div>
      </div>
      <div className='grid min-h-0 flex-1 auto-rows-max grid-cols-1 overflow-auto @4xl/theme:grid-cols-[minmax(0,1fr)_22rem] @4xl/theme:grid-rows-[minmax(0,1fr)] @4xl/theme:overflow-hidden @7xl/theme:grid-cols-[minmax(0,1fr)_32rem]'>
        <section className='@container/stage flex min-h-0 min-w-0 flex-col gap-4 p-4 @4xl/theme:overflow-auto @4xl/theme:border-r @4xl/theme:border-border'>
          <div className='flex shrink-0 flex-wrap items-center justify-between gap-3'>
            <span className={TYPE.label}>Live preview</span>
            <ToolSegments
              value={page}
              onValueChange={setPage}
              label='Theme sample page'
              items={[
                { id: 'landing', label: 'Landing' },
                { id: 'projects', label: 'Projects' },
                { id: 'activity', label: 'Activity' },
                { id: 'settings', label: 'Settings' },
              ]}
            />
          </div>
          <div
            className={`grid grid-cols-1 gap-4 @4xl/theme:min-h-0 @4xl/theme:flex-1 ${previewMode === 'split' ? '@min-[45rem]/stage:grid-cols-2 @4xl/theme:auto-rows-[minmax(24rem,1fr)]' : ''}`}>
            {visibleModes.map((mode) => (
              <div
                key={mode}
                data-theme-mode={mode}
                className='flex min-w-0 flex-col gap-3 @4xl/theme:min-h-0'>
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
                    {mergedTokens.semantic.find((token) => token.name === '--background')?.[mode]}
                  </span>
                </div>
                <div className='min-w-0 @4xl/theme:min-h-0 @4xl/theme:flex-1'>
                  <WorkspacePreview
                    tokens={mergedTokens.semantic}
                    slots={slots}
                    utility={mergedTokens.utility}
                    mode={mode}
                    page={page}
                    onPageChange={setPage}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
        <aside className='flex min-h-0 min-w-0 flex-col gap-4 border-t border-border p-4 @4xl/theme:border-t-0'>
          <div className='flex shrink-0 items-center justify-between gap-2'>
            <span className={TYPE.label}>Theme inspector</span>
            <span className={TYPE.mono}>
              {overrideCount ? `${overrideCount} modified` : 'Generated'}
            </span>
          </div>
          <ToolTabs
            value={inspector}
            onValueChange={setInspector}
            label='Theme inspector'
            stretch
            items={[
              { id: 'export', label: 'Export' },
              { id: 'tokens', label: 'Tokens' },
              { id: 'utility', label: 'Utility' },
              { id: 'contrast', label: 'Contrast' },
            ]}
          />
          {previewMode === 'split' && inspector !== 'export' && (
            <ToolSegments
              value={inspectorMode}
              onValueChange={setInspectorMode}
              label='Theme inspector mode'
              items={[
                { id: 'light', label: 'Light' },
                { id: 'dark', label: 'Dark' },
              ]}
            />
          )}
          {inspector === 'export' && (
            <>
              <ToolSegments
                value={activeTab}
                onValueChange={setActiveTab}
                label='Theme export format'
                items={(Object.keys(TAB_LABELS) as ThemeTab[]).map((tab) => ({
                  id: tab,
                  label: TAB_LABELS[tab],
                }))}
              />
              <Button variant='outline' size='sm' onClick={copy}>
                {copied ? <Check className='size-3.5' /> : <Copy className='size-3.5' />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </>
          )}
          {inspector === 'tokens' && (
            <label className='flex h-8 shrink-0 items-center gap-2 rounded-md border border-border bg-muted px-2'>
              <Search className='size-3.5 shrink-0 text-muted-foreground' />
              <input
                type='search'
                aria-label='Search theme tokens'
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder='Find a token'
                className='w-full min-w-0 bg-transparent text-[11px] outline-none'
              />
            </label>
          )}
          <div
            key={inspector}
            className='max-h-120 min-w-0 overflow-auto @4xl/theme:max-h-none @4xl/theme:min-h-0 @4xl/theme:flex-1'>
            {inspector === 'export' && (
              <pre className='min-h-full rounded-md border border-border bg-secondary p-3 font-mono text-[10px] leading-relaxed whitespace-pre text-muted-foreground'>
                {content}
              </pre>
            )}
            {inspector === 'tokens' && (
              <div className='flex flex-col gap-5'>
                {tokenGroups.length === 0 && <p className={TYPE.meta}>No matching tokens.</p>}
                {tokenGroups.map((group) => (
                  <section key={group.label} className='flex flex-col gap-3'>
                    <h3 className={TYPE.label}>{group.label}</h3>
                    {group.tokens.map((token) => (
                      <div
                        key={token.name}
                        className={`flex flex-col gap-2 border-b border-border pb-3 ${tokenOverrides[token.name] ? 'bg-accent/30' : ''}`}>
                        <div className='flex min-w-0 items-center justify-between gap-2'>
                          <code className='truncate font-mono text-[10px]' title={token.name}>
                            {token.name}
                          </code>
                          {tokenOverrides[token.name] && (
                            <Button
                              variant='ghost'
                              size='icon-xs'
                              aria-label={`Revert ${token.name}`}
                              title='Revert token'
                              onClick={() => revertToken(token.name)}>
                              <RotateCcw className='size-3' />
                            </Button>
                          )}
                        </div>
                        <div className='grid grid-cols-2 gap-3'>
                          {(['light', 'dark'] as const).map((mode) => (
                            <div key={mode} className='flex min-w-0 flex-col gap-1'>
                              <span className='text-[9px] text-muted-foreground'>
                                {mode === 'light' ? 'Light' : 'Dark'}
                              </span>
                              <HexInput
                                aria-label={`Theme ${mode} ${token.name}`}
                                value={token[mode]}
                                onChange={(hex) => overrideToken(token.name, mode, hex)}
                                showSwatch
                                className='min-w-0'
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </section>
                ))}
              </div>
            )}
            {inspector === 'utility' && (
              <div className='flex flex-col gap-4'>
                {(Object.keys(mergedTokens.utility) as (keyof typeof mergedTokens.utility)[]).map(
                  (role) => (
                    <UtilityThemeCard
                      key={role}
                      role={role}
                      utility={mergedTokens.utility}
                      mode={editedMode}
                    />
                  ),
                )}
              </div>
            )}
            {inspector === 'contrast' && (
              <AccessibilityPanel tokens={mergedTokens.semantic} mode={editedMode} />
            )}
          </div>
          <span className={`shrink-0 border-t border-border pt-3 ${TYPE.meta}`}>
            {inspector === 'export'
              ? 'Includes light + dark theme values'
              : `${editedMode === 'light' ? 'Light' : 'Dark'} theme inspection`}
          </span>
        </aside>
      </div>
    </div>
  );
}
