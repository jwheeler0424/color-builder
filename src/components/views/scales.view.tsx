/**
 * scales.view.tsx  — Phase 1 merge
 *
 * Combines: tint-scale-view + multi-scale-view
 * Sub-tabs:  [Single Color] [Full Palette]
 */

import { useNavigate } from '@tanstack/react-router';
import { Check, Copy, RefreshCw, Sprout } from 'lucide-react';
import React, { useState, useMemo } from 'react';

import ColorPickerModal from '@/components/modals/color-picker.modal';
import { useChromaStore } from '@/hooks/use-chroma-store';
import {
  BLACK_XYZ,
  SCALE_STEPS,
  contrastRatio,
  generateScale,
  hexToStop,
  isHex,
  normalizeHex,
  parseColor,
  semanticSlotNames,
  textColor,
  WHITE_XYZ,
} from '@/lib/engine/browser';
import { lookupColorName } from '@/lib/tools/color-names';

import { ToolButton as Button, ToolSegments, ToolTabs, TYPE, ViewHeader } from './view-ui';

// ─── Tab bar ──────────────────────────────────────────────────────────────────

type Tab = 'single' | 'palette';

function TabBar({ active, setActive }: { active: Tab; setActive: (t: Tab) => void }) {
  return (
    <ToolTabs
      value={active}
      onValueChange={setActive}
      label='Scales'
      items={[
        { id: 'single', label: 'Single Color' },
        { id: 'palette', label: 'Full Palette' },
      ]}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLE COLOR TAB (was TintScaleView)
// ═══════════════════════════════════════════════════════════════════════════════

const TOKEN_TABS = ['css', 'js', 'tailwind', 'json'] as const;

function buildSingleTokens(
  scale: ReturnType<typeof generateScale>,
  name: string,
  tab: string,
): string {
  switch (tab) {
    case 'css':
      return `:root {\n${scale.map(({ step, color }) => `  --${name}-${step}: ${color.hex};`).join('\n')}\n}`;
    case 'js':
      return `export const ${name} = {\n${scale.map(({ step, color }) => `  '${step}': '${color.hex}',`).join('\n')}\n};`;
    case 'tailwind':
      return `// tailwind.config.js\ncolors: {\n  ${name}: {\n${scale.map(({ step, color }) => `    '${step}': '${color.hex}',`).join('\n')}\n  }\n}`;
    case 'json':
      return JSON.stringify(
        {
          [name]: Object.fromEntries(scale.map(({ step, color }) => [step, color.hex])),
        },
        null,
        2,
      );
    default:
      return '';
  }
}

function SingleColorTab() {
  const {
    scaleHex,
    scaleName,
    scaleTokenTab,
    slots,
    generate,
    setSeeds,
    setScaleHex,
    setScaleName,
    setScaleTokenTab,
  } = useChromaStore();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [inputVal, setInputVal] = useState(scaleHex);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedStep, setSelectedStep] = useState(500);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  React.useEffect(() => {
    setInputVal(scaleHex);
  }, [scaleHex]);

  const scale = useMemo(() => generateScale({ baseColor: scaleHex }), [scaleHex]);
  const tokens = useMemo(
    () => buildSingleTokens(scale, scaleName, scaleTokenTab),
    [scale, scaleName, scaleTokenTab],
  );
  const selectedShade = scale.find((shade) => shade.step === selectedStep) ?? scale[0];
  const copyShade = async (hex: string, step: number) => {
    setSelectedStep(step);
    try {
      await navigator.clipboard.writeText(hex);
      setCopiedHex(hex);
      setTimeout(() => setCopiedHex(null), 1400);
    } catch {
      setCopiedHex(null);
    }
  };

  const handleInput = (v: string) => {
    setInputVal(v);
    if (isHex(v)) setScaleHex(normalizeHex(v));
  };

  const handleGenerate = () => {
    const h = isHex(inputVal) ? normalizeHex(inputVal) : null;
    if (h) setScaleHex(h);
    else if (slots.length) {
      const h2 = slots[0].color.hex;
      setInputVal(h2);
      setScaleHex(h2);
    }
  };

  const useAsSeeds = () => {
    const picks = [1, 3, 5, 7, 9].map((i) => scale[i]).filter(Boolean);
    setSeeds(picks.map(({ color }) => hexToStop(color.hex)));
    generate();
    void navigate({ to: '/palette' });
  };

  return (
    <>
      <div className='@container flex min-h-0 flex-1 flex-col overflow-auto @4xl:overflow-hidden'>
        <div className='grid min-w-0 grid-cols-1 @4xl:min-h-0 @4xl:flex-1 @4xl:grid-cols-[minmax(0,1fr)_18rem]'>
          <section className='@container/shades flex min-h-0 min-w-0 flex-col gap-4 p-4 @4xl:border-r @4xl:border-border'>
            <div className='flex shrink-0 flex-wrap items-center justify-between gap-3'>
              <div className='flex min-w-0 items-center gap-3'>
                <button
                  type='button'
                  aria-label='Pick scale color'
                  title='Pick scale color'
                  onClick={() => setShowPicker(true)}
                  className='size-10 shrink-0 cursor-pointer rounded-md border border-border outline-none focus-visible:ring-2 focus-visible:ring-ring'
                  style={{ background: scaleHex }}
                />
                <div className='flex min-w-0 flex-col gap-1'>
                  <span className={TYPE.label}>Base color</span>
                  <span className={`truncate ${TYPE.title}`}>
                    {lookupColorName(parseColor(scaleHex), scaleHex)}
                  </span>
                </div>
              </div>
              <div className='flex items-center gap-2'>
                <input
                  aria-label='Scale base hex'
                  aria-invalid={!isHex(inputVal)}
                  className='h-8 w-28 min-w-0 rounded border border-border bg-muted px-2 font-mono text-xs outline-none focus:border-ring aria-invalid:border-destructive'
                  value={inputVal}
                  onChange={(event) => handleInput(event.target.value)}
                  placeholder='#3B82F6'
                  maxLength={7}
                  spellCheck={false}
                  autoComplete='off'
                />
                <Button size='sm' onClick={handleGenerate}>
                  <RefreshCw className='size-3.5' />
                  Generate
                </Button>
              </div>
            </div>
            <div className='flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border pb-3'>
              <div className='flex flex-wrap gap-1.5' aria-label='Palette base colors'>
                {slots.map((slot) => (
                  <button
                    key={slot.id}
                    type='button'
                    aria-label={`Use ${slot.color.hex.toUpperCase()} as base`}
                    title={slot.name || slot.color.hex.toUpperCase()}
                    onClick={() => {
                      setScaleHex(slot.color.hex);
                      setInputVal(slot.color.hex);
                    }}
                    className='size-5 shrink-0 cursor-pointer rounded-sm border border-border outline-none focus-visible:ring-2 focus-visible:ring-ring'
                    style={{ background: slot.color.hex }}
                  />
                ))}
              </div>
              <span className={TYPE.mono}>11 shades / 50-950</span>
            </div>
            <div className='grid grid-cols-3 gap-3 @sm/shades:grid-cols-4 @xl/shades:grid-cols-6 @2xl/shades:grid-cols-11 @4xl/scales:min-h-0 @4xl/scales:flex-1'>
              {scale.map(({ step, color }) => (
                <button
                  key={step}
                  type='button'
                  aria-label={`Copy scale ${step}: ${color.hex}`}
                  data-scale-step={step}
                  title={`${scaleName}-${step}: ${color.hex.toUpperCase()}`}
                  onFocus={() => setSelectedStep(step)}
                  onClick={() => {
                    void copyShade(color.hex, step);
                  }}
                  className='group flex min-w-0 cursor-pointer flex-col gap-2 text-left outline-none'>
                  <span
                    className={`flex min-h-24 w-full flex-1 items-start justify-between rounded-md border border-foreground/10 p-2 transition-shadow group-focus-visible:ring-2 group-focus-visible:ring-ring ${selectedStep === step ? 'ring-1 ring-foreground/30' : ''}`}
                    style={{ background: color.hex, color: textColor(color.xyz) }}>
                    <span className='font-mono text-[11px] font-bold'>{step}</span>
                    {copiedHex === color.hex && <Check className='size-3 shrink-0' />}
                  </span>
                  <span className='font-mono text-[10px] leading-none text-muted-foreground'>
                    {color.hex.toUpperCase()}
                  </span>
                </button>
              ))}
            </div>
            <div className='grid shrink-0 grid-cols-2 items-center gap-4 border-t border-border pt-4 @xl/shades:grid-cols-[minmax(0,1fr)_auto_auto]'>
              <div className='col-span-2 flex items-center gap-3 @xl/shades:col-span-1'>
                <span
                  className='size-9 shrink-0 rounded-md border border-border'
                  style={{ background: selectedShade.color.hex }}
                />
                <div className='flex min-w-0 flex-col gap-1'>
                  <span className={TYPE.label}>
                    {scaleName}-{selectedShade.step}
                  </span>
                  <span className={TYPE.mono}>{selectedShade.color.hex.toUpperCase()}</span>
                </div>
              </div>
              <div className='flex flex-col gap-1'>
                <span className={TYPE.label}>On white</span>
                <span className={TYPE.mono}>
                  {contrastRatio(selectedShade.color.xyz, WHITE_XYZ).toFixed(2)}:1
                </span>
              </div>
              <div className='flex flex-col gap-1'>
                <span className={TYPE.label}>On black</span>
                <span className={TYPE.mono}>
                  {contrastRatio(selectedShade.color.xyz, BLACK_XYZ).toFixed(2)}:1
                </span>
              </div>
            </div>
          </section>
          <aside className='flex min-h-0 min-w-0 flex-col gap-4 border-t border-border p-4 @4xl:border-t-0'>
            <div className='flex shrink-0 items-center justify-between gap-2'>
              <span className={TYPE.label}>Export scale</span>
              <Button
                variant='outline'
                size='xs'
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(tokens);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1400);
                  } catch {
                    setCopied(false);
                  }
                }}>
                {copied ? <Check className='size-3' /> : <Copy className='size-3' />}
                {copied ? 'Copied' : 'Copy tokens'}
              </Button>
            </div>
            <div className='flex shrink-0 flex-col gap-2'>
              <label htmlFor='scale-token-name' className={TYPE.label}>
                Token name
              </label>
              <input
                id='scale-token-name'
                aria-label='Scale token name'
                className='h-8 w-full rounded border border-border bg-muted px-2 font-mono text-xs outline-none focus:border-ring'
                value={scaleName}
                onChange={(event) => setScaleName(event.target.value.trim() || 'primary')}
                placeholder='primary'
                maxLength={24}
                autoComplete='off'
              />
            </div>
            <ToolSegments
              value={scaleTokenTab}
              onValueChange={setScaleTokenTab}
              label='Scale export format'
              items={TOKEN_TABS.map((tab) => ({ id: tab, label: tab.toUpperCase() }))}
            />
            <pre className='max-h-80 min-h-40 min-w-0 overflow-auto rounded-md border border-border bg-secondary p-3 font-mono text-[10px] leading-relaxed whitespace-pre text-muted-foreground @4xl:max-h-none @4xl:min-h-0 @4xl:flex-1'>
              {tokens}
            </pre>
            <Button variant='outline' size='sm' className='w-full shrink-0' onClick={useAsSeeds}>
              <Sprout className='size-3.5' />
              Use scale as seeds
            </Button>
          </aside>
        </div>
      </div>

      <ColorPickerModal
        isOpen={showPicker}
        initialHex={scaleHex}
        title='Base color — Tint Scale'
        onApply={(hex) => {
          setScaleHex(hex);
          setInputVal(hex);
          setShowPicker(false);
        }}
        onClose={() => setShowPicker(false)}
      />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FULL PALETTE TAB (was MultiScaleView)
// ═══════════════════════════════════════════════════════════════════════════════

const STEPS = SCALE_STEPS;
type ExportFmt = 'css' | 'tailwind' | 'json';

function buildMultiScaleTokens(
  scales: { name: string; steps: ReturnType<typeof generateScale> }[],
  fmt: ExportFmt,
): string {
  switch (fmt) {
    case 'css':
      return `:root {\n${scales.flatMap(({ name, steps }) => steps.map(({ step, color }) => `  --${name}-${step}: ${color.hex};`)).join('\n')}\n}`;
    case 'tailwind':
      return `// tailwind.config.js\ncolors: {\n${scales.map(({ name, steps }) => `  ${name}: {\n${steps.map(({ step, color }) => `    '${step}': '${color.hex}',`).join('\n')}\n  },`).join('\n')}\n}`;
    case 'json':
      return JSON.stringify(
        Object.fromEntries(
          scales.map(({ name, steps }) => [
            name,
            Object.fromEntries(steps.map(({ step, color }) => [step, color.hex])),
          ]),
        ),
        null,
        2,
      );
  }
}

function FullPaletteTab() {
  const { slots } = useChromaStore();
  const [fmt, setFmt] = useState<ExportFmt>('css');
  const [copied, setCopied] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{
    slot: number;
    step: number;
  }>({ slot: 0, step: 500 });
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  const palette = useMemo(
    () => slots.map((slot) => slot.color.value ?? parseColor(slot.color.hex)),
    [slots],
  );
  const slotNames = useMemo(() => semanticSlotNames(palette), [palette]);
  const scales = useMemo(
    () =>
      slots.map((slot, i) => ({
        name: slotNames[i] ?? `color-${i + 1}`,
        hex: slot.color.hex,
        steps: generateScale({ baseColor: slot.color.value ?? parseColor(slot.color.hex) }),
      })),
    [slots, slotNames],
  );

  const tokens = useMemo(
    () =>
      buildMultiScaleTokens(
        scales.map((s) => ({ name: s.name, steps: s.steps })),
        fmt,
      ),
    [scales, fmt],
  );
  const selectedScale = scales[selectedCell.slot] ?? scales[0];
  const selectedShade =
    selectedScale?.steps.find((shade) => shade.step === selectedCell.step) ??
    selectedScale?.steps[0];
  const copyShade = async (hex: string, slot: number, step: number) => {
    setSelectedCell({ slot, step });
    try {
      await navigator.clipboard.writeText(hex);
      setCopiedHex(hex);
      setTimeout(() => setCopiedHex(null), 1400);
    } catch {
      setCopiedHex(null);
    }
  };

  if (!slots.length) {
    return (
      <div className='flex-1 p-6'>
        <p className='text-[12px] text-muted-foreground'>Generate a palette first.</p>
      </div>
    );
  }

  return (
    <div className='@container flex min-h-0 flex-1 flex-col overflow-auto @4xl:overflow-hidden'>
      <div className='grid grid-cols-1 @4xl:min-h-0 @4xl:flex-1 @4xl:grid-cols-[minmax(0,1fr)_18rem]'>
        <section className='flex min-h-0 min-w-0 flex-col gap-4 p-4 @4xl:border-r @4xl:border-border'>
          <div className='flex shrink-0 items-center justify-between gap-3'>
            <span className={TYPE.label}>Palette scales</span>
            <span className={TYPE.mono}>
              {scales.length} colors / {scales.length * STEPS.length} tokens
            </span>
          </div>
          <div
            className='min-w-0 overflow-auto rounded-md border border-border @4xl:min-h-0 @4xl:flex-1'
            data-scale-matrix>
            <table className='h-full w-full min-w-160 table-fixed border-separate border-spacing-0'>
              <thead className='sticky top-0 z-20 bg-background'>
                <tr>
                  <th
                    scope='col'
                    className={`sticky left-0 z-30 w-28 border-b border-border bg-background px-3 py-3 text-left ${TYPE.label}`}>
                    Color
                  </th>
                  {STEPS.map((step) => (
                    <th
                      key={step}
                      scope='col'
                      className='border-b border-border px-1 py-3 text-center font-mono text-[10px] font-semibold text-muted-foreground'>
                      {step}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scales.map((scale, slotIndex) => (
                  <tr key={slots[slotIndex].id}>
                    <th
                      scope='row'
                      aria-label={`${scale.name} ${scale.hex.toUpperCase()}`}
                      className='sticky left-0 z-10 border-b border-border bg-background px-3 py-2 text-left last:border-b-0'>
                      <div className='flex min-w-0 items-center gap-2'>
                        <span
                          className='size-5 shrink-0 rounded-sm border border-border'
                          style={{ background: scale.hex }}
                        />
                        <div className='flex min-w-0 flex-col gap-1'>
                          <span
                            className='truncate text-[11px] leading-tight font-semibold'
                            title={scale.name}>
                            {scale.name}
                          </span>
                          <span className='font-mono text-[9px] leading-none text-muted-foreground'>
                            {scale.hex.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </th>
                    {scale.steps.map(({ step, color }) => (
                      <td key={step} className='h-10 p-1'>
                        <button
                          type='button'
                          data-scale-cell={`${slotIndex}-${step}`}
                          aria-label={`Copy ${scale.name}-${step}: ${color.hex}`}
                          title={`${scale.name}-${step}: ${color.hex.toUpperCase()}`}
                          onFocus={() => setSelectedCell({ slot: slotIndex, step })}
                          onClick={() => {
                            void copyShade(color.hex, slotIndex, step);
                          }}
                          className={`flex h-full min-h-8 w-full cursor-pointer items-center justify-center rounded-sm border border-foreground/10 transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-ring ${selectedCell.slot === slotIndex && selectedCell.step === step ? 'ring-1 ring-foreground/50' : ''}`}
                          style={{ background: color.hex, color: textColor(color.xyz) }}>
                          {copiedHex === color.hex && <Check className='size-3' />}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {selectedShade && (
            <div className='grid shrink-0 grid-cols-2 items-center gap-4 border-t border-border pt-4 @3xl:grid-cols-[minmax(0,1fr)_auto_auto]'>
              <div className='col-span-2 flex min-w-0 items-center gap-3 @3xl:col-span-1'>
                <span
                  className='size-9 shrink-0 rounded-md border border-border'
                  style={{ background: selectedShade.color.hex }}
                />
                <div className='flex min-w-0 flex-col gap-1'>
                  <span className={TYPE.label}>
                    {selectedScale.name}-{selectedShade.step}
                  </span>
                  <span className={TYPE.mono}>{selectedShade.color.hex.toUpperCase()}</span>
                </div>
              </div>
              <div className='flex flex-col gap-1'>
                <span className={TYPE.label}>On white</span>
                <span className={TYPE.mono}>
                  {contrastRatio(selectedShade.color.xyz, WHITE_XYZ).toFixed(2)}:1
                </span>
              </div>
              <div className='flex flex-col gap-1'>
                <span className={TYPE.label}>On black</span>
                <span className={TYPE.mono}>
                  {contrastRatio(selectedShade.color.xyz, BLACK_XYZ).toFixed(2)}:1
                </span>
              </div>
            </div>
          )}
        </section>
        <aside className='flex min-h-0 min-w-0 flex-col gap-4 border-t border-border p-4 @4xl:border-t-0'>
          <div className='flex shrink-0 flex-wrap items-center justify-between gap-2'>
            <span className={TYPE.label}>Export all scales</span>
            <Button
              variant='outline'
              size='xs'
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(tokens);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1400);
                } catch {
                  setCopied(false);
                }
              }}>
              {copied ? <Check className='size-3' /> : <Copy className='size-3' />}
              {copied ? 'Copied' : 'Copy tokens'}
            </Button>
          </div>
          <ToolSegments
            value={fmt}
            onValueChange={setFmt}
            label='Palette scale export format'
            items={[
              { id: 'css', label: 'CSS Vars' },
              { id: 'tailwind', label: 'Tailwind' },
              { id: 'json', label: 'JSON' },
            ]}
          />
          <pre className='max-h-80 min-h-40 min-w-0 overflow-auto rounded-md border border-border bg-secondary p-3 font-mono text-[10px] leading-relaxed whitespace-pre text-muted-foreground @4xl:max-h-none @4xl:min-h-0 @4xl:flex-1'>
            {tokens}
          </pre>
          <div className={`shrink-0 border-t border-border pt-3 ${TYPE.mono}`}>
            {scales.length} scales / 11 shades each
          </div>
        </aside>
      </div>
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

export default function ScalesView() {
  const [activeTab, setActiveTab] = useState<Tab>('single');
  return (
    <div className='@container/scales flex min-h-0 flex-1 flex-col overflow-hidden'>
      <ViewHeader
        title='Scales'
        description='Perceptual shades and ready-to-export color tokens.'
      />
      <TabBar active={activeTab} setActive={setActiveTab} />
      {activeTab === 'single' && <SingleColorTab />}
      {activeTab === 'palette' && <FullPaletteTab />}
    </div>
  );
}
