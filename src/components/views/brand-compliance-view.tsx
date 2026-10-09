/**
 * brand-compliance-view.tsx
 *
 * Checks the current palette against user-defined brand anchor colors.
 * Reports: WCAG contrast vs brand colors, OKLCH distance (perceptual harmony),
 * harmonic compatibility score, and practical pairing recommendations.
 */

import { Pencil, Plus, SwatchBook, Trash2 } from 'lucide-react';
import { useState, useMemo } from 'react';

import { useChromaStore } from '@/hooks/use-chroma-store';
import {
  apcaContrast,
  contrastRatio,
  isHex,
  normalizeHex,
  OKLAB,
  parseColor,
  xyzToLch,
} from '@/lib/engine/browser';
import { lookupColorName } from '@/lib/tools/color-names';
import { cn } from '@/lib/utils';
import { useRegisterHotkey } from '@/providers/hotkey.provider';

import { ToolButton as Button, TYPE, ViewHeader } from './view-ui';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function contrastBadge(ratio: number) {
  if (ratio >= 7) return { label: 'AAA', color: 'var(--success)' };
  if (ratio >= 4.5) return { label: 'AA', color: 'var(--success)' };
  if (ratio >= 3) return { label: 'AA Large', color: 'var(--warning)' };
  return { label: 'Fail', color: 'var(--destructive)' };
}

function oklchDist(hexA: string, hexB: string): number {
  const a = xyzToLch(OKLAB, parseColor(hexA).xyz);
  const b = xyzToLch(OKLAB, parseColor(hexB).xyz);
  // Weighted OKLCH distance: L difference counts less than chroma/hue
  const dL = (a.l - b.l) * 50;
  const dC = (a.c - b.c) * 100;
  const dH = (Math.min(Math.abs(a.h - b.h), 360 - Math.abs(a.h - b.h)) / 360) * 100;
  return Math.sqrt(dL * dL + dC * dC + dH * dH);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BrandComplianceView() {
  const slots = useChromaStore((s) => s.slots);
  const brandColors = useChromaStore((s) => s.brandColors);
  const addBrand = useChromaStore((s) => s.addBrandColor);
  const removeBrand = useChromaStore((s) => s.removeBrandColor);
  const updateBrand = useChromaStore((s) => s.updateBrandColor);

  const [hexInput, setHexInput] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [inputErr, setInputErr] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useRegisterHotkey({
    key: 'b',
    label: 'Add brand color',
    group: 'Brand',
    handler: () => {
      document.getElementById('brand-hex-input')?.focus();
    },
  });

  const handleAdd = () => {
    const hex = isHex(hexInput) ? normalizeHex(hexInput) : null;
    if (!hex) {
      setInputErr(true);
      return;
    }
    addBrand(hex, labelInput.trim() || lookupColorName(parseColor(hex), hex));
    setSelectedId(useChromaStore.getState().brandColors.at(-1)?.id ?? null);
    setHexInput('');
    setLabelInput('');
    setInputErr(false);
  };

  // For each brand color × palette slot: compute all compliance metrics
  const matrix = useMemo(() => {
    return brandColors.map((brand) => ({
      brand,
      pairs: slots.map((slot) => {
        const brandXyz = parseColor(brand.hex).xyz;
        const slotXyz = (slot.color.value ?? parseColor(slot.color.hex)).xyz;
        const ratio = contrastRatio(brandXyz, slotXyz);
        const apcaVal = Math.abs(apcaContrast(brandXyz, slotXyz));
        const dist = oklchDist(brand.hex, slot.color.hex);
        const badge = contrastBadge(ratio);
        const harmonious = dist < 25; // within perceptual harmony zone
        const complementary = dist > 60 && dist < 90;
        return { slot, ratio, apcaVal, dist, badge, harmonious, complementary };
      }),
    }));
  }, [brandColors, slots]);

  const selected = matrix.find(({ brand }) => brand.id === selectedId) ?? matrix[0];
  const pairs = selected?.pairs ?? [];
  const bestPair = [...pairs].sort((first, second) => second.ratio - first.ratio)[0];
  const pairColumns =
    'grid-cols-[minmax(0,1fr)_3.75rem_3rem_3rem] @2xl/results:grid-cols-[minmax(0,1fr)_4rem_3.5rem_3.5rem_6rem]';

  return (
    <div className='@container flex min-h-0 flex-1 flex-col overflow-hidden'>
      <ViewHeader
        title='Brand Compliance'
        description='Palette contrast and perceptual pairing against your brand colors.'
      />
      <div
        data-brand-layout
        className='grid min-h-0 flex-1 grid-cols-1 grid-rows-[max-content_max-content] content-start overflow-auto border-t border-border @3xl:grid-cols-[15rem_minmax(0,1fr)] @3xl:grid-rows-[minmax(0,1fr)] @3xl:content-stretch @3xl:overflow-hidden'>
        <aside className='flex min-h-0 min-w-0 flex-col border-b border-border @3xl:border-r @3xl:border-b-0'>
          <form
            data-brand-form
            className='tool-panel-space flex shrink-0 flex-col gap-2 border-b border-border @min-[56rem]:gap-3'
            onSubmit={(event) => {
              event.preventDefault();
              handleAdd();
            }}>
            <div className={TYPE.label}>Add brand color</div>
            <label htmlFor='brand-hex-input' className={TYPE.meta}>
              Hex color
            </label>
            <div className='flex items-center gap-2'>
              <input
                type='color'
                aria-label='Brand color swatch'
                title='Choose brand color'
                value={isHex(hexInput) ? normalizeHex(hexInput) : '#0057b8'}
                onChange={(event) => {
                  setHexInput(event.target.value);
                  setInputErr(false);
                }}
                className='size-9 shrink-0 cursor-pointer overflow-hidden rounded-sm border border-border bg-transparent p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0'
              />
              <input
                id='brand-hex-input'
                value={hexInput}
                onChange={(event) => {
                  setHexInput(event.target.value);
                  setInputErr(false);
                }}
                placeholder='#0057B8'
                maxLength={7}
                spellCheck={false}
                aria-invalid={inputErr}
                aria-describedby={inputErr ? 'brand-hex-error' : undefined}
                className={cn(
                  'h-9 min-w-0 flex-1 rounded border bg-muted px-2 font-mono text-xs outline-none focus:border-ring',
                  inputErr ? 'border-destructive' : 'border-border',
                )}
              />
            </div>
            {inputErr && (
              <p id='brand-hex-error' role='alert' className='text-[11px] text-destructive'>
                Enter a valid hex color.
              </p>
            )}
            <label htmlFor='brand-label-input' className={TYPE.meta}>
              Name <span className='text-muted-foreground/70'>(optional)</span>
            </label>
            <input
              id='brand-label-input'
              value={labelInput}
              onChange={(event) => setLabelInput(event.target.value)}
              placeholder='Brand Blue'
              className='h-9 min-w-0 rounded border border-border bg-muted px-2 text-xs outline-none focus:border-ring'
            />
            <Button type='submit' size='sm'>
              <Plus className='size-3.5' />
              Add color
            </Button>
          </form>
          <div
            data-brand-colors-heading
            className='tool-inline-space flex shrink-0 items-center justify-between pt-3 pb-2 @min-[56rem]:pt-4'>
            <span className={TYPE.label}>Brand colors</span>
            <span className={TYPE.mono}>{brandColors.length}</span>
          </div>
          <div
            data-brand-color-list
            className='px-2 pb-2 @3xl:min-h-0 @3xl:flex-1 @3xl:overflow-auto'>
            {brandColors.length === 0 && (
              <p className={`px-2 py-3 ${TYPE.meta}`}>No brand colors yet.</p>
            )}
            {brandColors.map((brand) => (
              <div
                key={brand.id}
                data-brand-color-item
                className={`flex min-w-0 items-center gap-2 rounded-sm px-2 py-3 ${selected?.brand.id === brand.id ? 'bg-accent/50' : ''}`}>
                <span
                  className='size-7 shrink-0 rounded-sm border border-border'
                  style={{ background: brand.hex }}
                />
                {editingId === brand.id ? (
                  <input
                    aria-label='Rename brand color'
                    defaultValue={brand.label}
                    autoFocus
                    className='min-w-0 flex-1 rounded border border-border bg-muted px-1 py-1 text-xs outline-none focus:border-ring'
                    onBlur={(event) => {
                      updateBrand(brand.id, { label: event.target.value.trim() || brand.label });
                      setEditingId(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') event.currentTarget.blur();
                      if (event.key === 'Escape') setEditingId(null);
                    }}
                  />
                ) : (
                  <button
                    type='button'
                    aria-pressed={selected?.brand.id === brand.id}
                    onClick={() => setSelectedId(brand.id)}
                    className='flex min-w-0 flex-1 cursor-pointer flex-col gap-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring'>
                    <span className={`max-w-full truncate ${TYPE.title}`} title={brand.label}>
                      {brand.label}
                    </span>
                    <span className={TYPE.mono}>{brand.hex.toUpperCase()}</span>
                  </button>
                )}
                <div className='flex shrink-0 flex-col'>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon-xs'
                    title={`Rename ${brand.label}`}
                    aria-label={`Rename ${brand.label}`}
                    onClick={() => setEditingId(brand.id)}>
                    <Pencil className='size-3' />
                  </Button>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon-xs'
                    title={`Remove ${brand.label}`}
                    aria-label={`Remove ${brand.label}`}
                    onClick={() => removeBrand(brand.id)}>
                    <Trash2 className='size-3 text-muted-foreground' />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </aside>
        <section className='@container/results flex min-h-0 min-w-0 flex-col'>
          {!selected ? (
            <div className='tool-panel-space flex min-h-64 flex-1 flex-col items-center justify-center gap-3 text-muted-foreground'>
              <SwatchBook className='size-8' strokeWidth={1.25} />
              <p className={TYPE.title}>No brand colors</p>
            </div>
          ) : (
            <>
              <div
                data-brand-details-header
                className='tool-panel-space flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border'>
                <div className='flex min-w-0 items-center gap-3'>
                  <span
                    className='size-10 shrink-0 rounded-md border border-border'
                    style={{ background: selected.brand.hex }}
                  />
                  <div className='flex min-w-0 flex-col gap-1'>
                    <h3 className={`${TYPE.title} wrap-break-word`}>{selected.brand.label}</h3>
                    <span className={TYPE.mono}>{selected.brand.hex.toUpperCase()}</span>
                  </div>
                </div>
                <span className={TYPE.meta}>{pairs.length} palette colors</span>
              </div>
              {pairs.length === 0 ? (
                <div className={`flex flex-1 items-center justify-center p-6 ${TYPE.meta}`}>
                  No palette colors to compare.
                </div>
              ) : (
                <>
                  <div
                    data-brand-score-summary
                    className='tool-panel-space grid shrink-0 grid-cols-2 gap-x-6 gap-y-4 border-b border-border @2xl/results:grid-cols-4'>
                    {[
                      {
                        label: 'WCAG AA',
                        value: `${pairs.filter((pair) => pair.ratio >= 4.5).length}/${pairs.length}`,
                      },
                      {
                        label: 'WCAG AAA',
                        value: `${pairs.filter((pair) => pair.ratio >= 7).length}/${pairs.length}`,
                      },
                      {
                        label: 'Harmonious',
                        value: String(pairs.filter((pair) => pair.harmonious).length),
                      },
                    ].map(({ label, value }) => (
                      <div key={label} className='flex flex-col gap-2'>
                        <span className={TYPE.label}>{label}</span>
                        <span className={TYPE.metric}>{value}</span>
                      </div>
                    ))}
                    <div className='flex min-w-0 flex-col gap-2'>
                      <span className={TYPE.label}>Best contrast</span>
                      <span className={TYPE.title}>
                        {bestPair?.slot.name ||
                          lookupColorName(
                            bestPair!.slot.color.value ?? parseColor(bestPair!.slot.color.hex),
                            bestPair!.slot.color.hex,
                          )}
                      </span>
                      <span className={TYPE.mono}>{bestPair?.ratio.toFixed(2)}:1</span>
                    </div>
                  </div>
                  <div
                    data-brand-results-panel
                    className='tool-panel-space flex min-h-0 flex-1 flex-col'>
                    <div
                      data-brand-result-header
                      className={`grid shrink-0 ${pairColumns} items-center gap-2 border-b border-border pb-3 ${TYPE.label}`}>
                      <span>Palette color</span>
                      <span className='text-right'>Contrast</span>
                      <span className='text-right' title='Absolute APCA contrast'>
                        |Lc|
                      </span>
                      <span className='text-right' title='Weighted OKLCH distance'>
                        Dist.
                      </span>
                      <span className='hidden text-right @2xl/results:block'>Pairing</span>
                    </div>
                    <div
                      data-brand-result-list
                      className='grid auto-rows-[minmax(2.5rem,1fr)] @3xl:min-h-0 @3xl:flex-1 @3xl:auto-rows-fr'>
                      {pairs.map(
                        ({ slot, ratio, apcaVal, dist, badge, harmonious, complementary }) => {
                          const name =
                            slot.name ||
                            lookupColorName(
                              slot.color.value ?? parseColor(slot.color.hex),
                              slot.color.hex,
                            );
                          return (
                            <div
                              key={slot.id}
                              data-brand-result-row
                              className={`grid ${pairColumns} min-w-0 items-center gap-2 border-b border-border last:border-b-0`}>
                              <div className='flex min-w-0 items-center gap-2'>
                                <div className='flex h-7 w-14 shrink-0 gap-1' aria-hidden='true'>
                                  <span
                                    className='flex flex-1 items-center justify-center rounded-sm border border-foreground/10 text-[10px] font-bold'
                                    style={{
                                      background: selected.brand.hex,
                                      color: slot.color.hex,
                                    }}>
                                    Aa
                                  </span>
                                  <span
                                    className='flex flex-1 items-center justify-center rounded-sm border border-foreground/10 text-[10px] font-bold'
                                    style={{
                                      background: slot.color.hex,
                                      color: selected.brand.hex,
                                    }}>
                                    Aa
                                  </span>
                                </div>
                                <div className='flex min-w-0 flex-col gap-0.5'>
                                  <span
                                    className='truncate text-[11px] leading-tight font-semibold'
                                    title={name}>
                                    {name}
                                  </span>
                                  <span className='font-mono text-[10px] leading-none text-muted-foreground'>
                                    {slot.color.hex.toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div className='flex flex-col items-end gap-0.5'>
                                <span className='font-mono text-[11px] leading-none tabular-nums'>
                                  {ratio.toFixed(2)}:1
                                </span>
                                <span
                                  className='text-[9px] leading-none font-semibold'
                                  style={{ color: badge.color }}>
                                  {badge.label}
                                </span>
                              </div>
                              <span className='text-right font-mono text-[11px] tabular-nums'>
                                {apcaVal.toFixed(0)}
                              </span>
                              <span className='text-right font-mono text-[11px] tabular-nums'>
                                {dist.toFixed(1)}
                              </span>
                              <span
                                className={`hidden text-right text-[10px] @2xl/results:block ${harmonious ? 'text-success' : complementary ? 'text-warning' : 'text-muted-foreground'}`}>
                                {harmonious
                                  ? 'Harmonious'
                                  : complementary
                                    ? 'Complementary'
                                    : 'Neutral'}
                              </span>
                            </div>
                          );
                        },
                      )}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
