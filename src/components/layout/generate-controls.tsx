/**
 * generate-controls.tsx  — Phase 2 layout component
 *
 * All palette generation controls extracted from palette-view.tsx:
 *   - Color count slider
 *   - Theme presets grid
 *   - Seed colors (list + add input)
 *   - Seed behavior (influence / pin)
 *   - Temperature slider
 *   - Harmony selector
 *   - Token names hint
 *   - Palette preview strip
 *   - Generate button (footer)
 *
 * Used by:
 *   - Phase 2: PaletteView sidebar (width 320px)
 *   - Phase 3: Desktop Studio left rail (width 240px, collapsible)
 *   - Phase 4: Tablet accordion drawer
 *
 * Props:
 *   onEdit(i) — called when a seed color swatch is clicked for editing
 */

import { RefreshCw } from 'lucide-react';
import React, { useState, useCallback, useEffect, useRef } from 'react';

import type { SpaceId, DisplayGamutId } from '@/lib/engine/browser';
import type { HarmonyMode, ColorStop } from '@/types';

import { useChromaStore } from '@/hooks/use-chroma-store';
import { HARMONIES, MAX_SLOTS, THEMES } from '@/lib/constants/chroma';
import { hexToStop, renderColor, stopToColor } from '@/lib/engine/browser';
import { computeColorPalette } from '@/lib/engine/runtime/palette-runtime';
import { cn } from '@/lib/utils';

// ─── Section helpers ────────────────────────────────────────────────────────────────

// The last section drops its border: the footer below already draws one.
function Section({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('border-b border-border px-4 py-3.5 last:border-b-0', className)}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className='mb-2.5 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase'>
      {children}
    </p>
  );
}

// ─── Grip icon for hint ───────────────────────────────────────────────────────

function GripInline() {
  return (
    <svg width='10' height='10' viewBox='0 0 24 24' fill='currentColor' className='inline'>
      <circle cx='9' cy='5' r='1.5' />
      <circle cx='9' cy='12' r='1.5' />
      <circle cx='9' cy='19' r='1.5' />
      <circle cx='15' cy='5' r='1.5' />
      <circle cx='15' cy='12' r='1.5' />
      <circle cx='15' cy='19' r='1.5' />
    </svg>
  );
}

// ─── Harmony picker ─────────────────────────────────────────────────────────────

const HARMONY_GROUPS: { label: string; ids: HarmonyMode[] }[] = [
  {
    label: 'Classic',
    ids: ['analogous', 'complementary', 'split-comp', 'triadic', 'tetradic', 'square'],
  },
  { label: 'Tonal', ids: ['monochromatic', 'shades', 'natural'] },
  { label: 'Complex', ids: ['double-split', 'compound', 'random'] },
  { label: 'Matsuda templates', ids: ['matsuda_L', 'matsuda_Y', 'matsuda_X', 'matsuda_T'] },
];

// Same card pattern as Themes: a live 5-color sample of each harmony, built from the current base color
function HarmonyPicker({
  mode,
  base,
  onSelect,
}: {
  mode: HarmonyMode;
  base: ColorStop | undefined;
  onSelect: (mode: HarmonyMode) => void;
}) {
  const { paletteSpace, displayGamut } = useChromaStore();
  const [previews, setPreviews] = useState<Record<string, string[]>>({});
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      const result: Record<string, string[]> = {};
      for (const harmony of HARMONIES) {
        const colors = await computeColorPalette(
          {
            harmony: harmony.id,
            count: 5,
            seeds: base ? [stopToColor(base)] : [],
            space: paletteSpace,
            display: displayGamut,
            seed: 1,
          },
          controller.signal,
        );
        result[harmony.id] = colors.map((color) => renderColor(color).css);
      }
      if (!controller.signal.aborted) setPreviews(result);
    })().catch(() => undefined);
    return () => controller.abort();
  }, [base, paletteSpace, displayGamut]);
  const grouped = new Set(HARMONY_GROUPS.flatMap((g) => g.ids));
  const groups = [
    ...HARMONY_GROUPS,
    { label: 'More', ids: HARMONIES.map((h) => h.id).filter((id) => !grouped.has(id)) },
  ].filter((g) => g.ids.length > 0);

  return (
    <div role='radiogroup' aria-label='Harmony' className='flex flex-col gap-6'>
      {groups.map((group) => (
        <div key={group.label}>
          <p className='mb-1.5 text-[9.5px] font-semibold tracking-widest text-muted-foreground uppercase'>
            {group.label}
          </p>
          <div className='grid grid-cols-2 gap-1.5'>
            {group.ids.map((id) => {
              const h = HARMONIES.find((x) => x.id === id);
              if (!h) return null;
              const selected = mode === id;
              return (
                <button
                  key={id}
                  type='button'
                  role='radio'
                  aria-checked={selected}
                  title={h.desc}
                  onClick={() => onSelect(id)}
                  className={cn(
                    'cursor-pointer overflow-hidden rounded border p-0 text-left transition-colors',
                    selected ? 'border-primary' : 'border-border hover:border-input',
                  )}>
                  <span className='flex h-8'>
                    {(previews[id] ?? Array<string>(5).fill('var(--muted)')).map((hex, j) => (
                      <span key={j} className='flex-1' style={{ background: hex }} />
                    ))}
                  </span>
                  <span
                    className={cn(
                      'block px-2 py-1.5 text-[11px] font-semibold',
                      selected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground',
                    )}>
                    {h.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export type GenerateSection = 'colors' | 'harmony' | 'themes' | 'preview';

interface GenerateControlsProps {
  /** Called when a seed swatch is clicked to open the picker */
  onEditSeed?: (index: number) => void;
  /** Render only one group of controls; omit for all of them */
  section?: GenerateSection;
  /** Makes preview swatches clickable */
  onPreviewSelect?: (index: number) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GenerateControls({ onEditSeed, section, onPreviewSelect }: GenerateControlsProps) {
  const show = (s: GenerateSection) => !section || section === s;
  const {
    slots,
    seeds,
    count,
    mode,
    seedMode,
    temperature,
    generate,
    setMode,
    setCount,
    addSeed,
    removeSeed,
    setSeeds,
    setSeedMode,
    setTemperature,
    paletteSpace,
    displayGamut,
    setPaletteSpace,
    setDisplayGamut,
  } = useChromaStore();

  const [seedInp, setSeedInp] = useState('');
  const [seedErr, setSeedErr] = useState(false);

  // Debounce generate for sliders
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedGenerate = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => generate(), 180);
  }, [generate]);

  const handleAddSeed = useCallback(() => {
    try {
      addSeed(hexToStop(seedInp));
    } catch {
      setSeedErr(true);
      setTimeout(() => setSeedErr(false), 600);
      return;
    }
    setSeedInp('');
  }, [seedInp, addSeed]);

  return (
    <>
      {show('colors') && (
        <Section>
          <SectionLabel>Color Space</SectionLabel>
          <select
            aria-label='Generation color space'
            className='w-full rounded border border-border bg-secondary px-2 py-1.5 text-xs'
            value={paletteSpace}
            onChange={(event) => {
              setPaletteSpace(event.target.value as SpaceId);
              debouncedGenerate();
            }}>
            <option value='cam16'>CAM16-UCS</option>
            <option value='oklch'>OKLCH</option>
            <option value='cielab'>CIELAB</option>
            <option value='hsl'>HSL</option>
            <option value='hsv'>HSV</option>
          </select>
          <label
            className='mt-3 block text-[10px] font-semibold text-muted-foreground'
            htmlFor={`display-gamut-${section ?? 'all'}`}>
            Display Gamut
          </label>
          <select
            aria-label='Display gamut'
            className='mt-1 w-full rounded border border-border bg-secondary px-2 py-1.5 text-xs'
            value={displayGamut}
            onChange={(event) => {
              setDisplayGamut(event.target.value as DisplayGamutId);
              debouncedGenerate();
            }}>
            <option value='srgb'>sRGB</option>
            <option value='p3'>Display P3</option>
            <option value='rec2020'>Rec.2020</option>
          </select>
        </Section>
      )}
      {/* ── Colors count ── */}
      {show('colors') && (
        <Section>
          <SectionLabel>Colors</SectionLabel>
          <div className='flex items-center gap-2.5'>
            <span className='min-w-6 text-center text-[22px] font-black text-primary tabular-nums'>
              {count}
            </span>
            <input
              type='range'
              min={4}
              max={MAX_SLOTS}
              value={count}
              onChange={(e) => {
                setCount(+e.target.value);
                debouncedGenerate();
              }}
              className='flex-1'
            />
            <span className='text-[10px] text-muted-foreground'>{MAX_SLOTS}</span>
          </div>
        </Section>
      )}

      {/* ── Temperature ── */}
      {show('colors') && (
        <Section>
          <SectionLabel>
            Temperature{' '}
            <span className='font-normal text-muted-foreground'>
              {temperature < -0.2 ? '❄ Cool' : temperature > 0.2 ? '🌅 Warm' : '⚪ Neutral'}
            </span>
          </SectionLabel>
          <div className='flex items-center gap-2'>
            <span className='text-[9px] text-muted-foreground'>❄</span>
            <input
              type='range'
              min={-100}
              max={100}
              value={Math.round(temperature * 100)}
              onChange={(e) => {
                setTemperature(+e.target.value / 100);
                debouncedGenerate();
              }}
              className='flex-1'
            />
            <span className='text-[9px] text-muted-foreground'>🌅</span>
          </div>
        </Section>
      )}

      {/* ── Theme presets ── */}
      {show('themes') && (
        <Section>
          <SectionLabel>Themes</SectionLabel>
          <div className='grid grid-cols-2 gap-1.5'>
            {THEMES.map((t, i) => (
              <div
                key={i}
                className='cursor-pointer overflow-hidden rounded border border-border transition-colors hover:border-input'
                title={t.name}
                onClick={() => {
                  setMode(t.mode);
                  setSeeds(t.seeds.map((h) => hexToStop(h.toLowerCase())));
                  generate();
                }}>
                <div className='flex h-8'>
                  {t.seeds.slice(0, 5).map((h, j) => (
                    <div key={j} className='flex-1' style={{ background: h }} />
                  ))}
                </div>
                <div className='bg-secondary px-2 py-1.5 text-[11px] font-semibold text-secondary-foreground'>
                  {t.name}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Seed colors ── */}
      {show('colors') && (
        <Section>
          <SectionLabel>Seed Colors</SectionLabel>
          <div className='mb-2 flex flex-col gap-1'>
            {seeds.map((s, i) => (
              <div key={i} className='flex items-center gap-1.5'>
                <button
                  className='h-4 w-4 shrink-0 rounded-sm border border-white/10'
                  style={{ background: s.css ?? s.hex }}
                  onClick={() => onEditSeed?.(i)}
                  title={`Edit seed: ${s.hex}`}
                />
                <span
                  className='flex-1 cursor-pointer font-mono text-[10px] tracking-[.05em] text-muted-foreground uppercase transition-colors hover:text-foreground'
                  onClick={() => onEditSeed?.(i)}>
                  {s.hex.toUpperCase()}
                </span>
                <button
                  className='cursor-pointer border-none bg-transparent text-sm leading-none text-muted-foreground transition-colors hover:text-destructive'
                  onClick={() => removeSeed(i)}
                  title='Remove seed'>
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className='flex gap-1.5'>
            <input
              className={cn(
                'flex-1 rounded border bg-muted px-2 py-1.5 font-mono text-[11px] text-foreground',
                'transition-colors outline-none placeholder:text-muted-foreground focus:border-ring',
                seedErr ? 'border-destructive' : 'border-border',
              )}
              value={seedInp}
              onChange={(e) => setSeedInp(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSeed()}
              placeholder='#F4A261'
              maxLength={200}
              spellCheck={false}
              autoComplete='off'
            />
            <button
              className='inline-flex cursor-pointer items-center justify-center rounded border border-border bg-secondary px-3 py-1.5 font-mono text-[11px] font-bold text-secondary-foreground transition-colors hover:border-input hover:text-foreground'
              onClick={handleAddSeed}>
              + Add
            </button>
          </div>
        </Section>
      )}

      {/* ── Seed behavior ── */}
      {show('colors') && (
        <Section>
          <SectionLabel>Seed Behavior</SectionLabel>
          <div className='mb-2 flex gap-1'>
            {(
              [
                {
                  id: 'influence',
                  label: 'Influence',
                  title: 'Seed hue guides generation',
                },
                {
                  id: 'pin',
                  label: 'Pin',
                  title: 'Seed appears as a locked slot',
                },
              ] as const
            ).map(({ id, label, title }) => (
              <button
                key={id}
                title={title}
                onClick={() => setSeedMode(id)}
                className={cn(
                  'inline-flex cursor-pointer items-center justify-center rounded border px-3 py-1.5 font-mono text-[11px] font-bold transition-colors',
                  seedMode === id
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-secondary text-muted-foreground hover:border-input hover:text-foreground',
                )}>
                {label}
              </button>
            ))}
          </div>
          <p className='text-[9.5px] leading-relaxed text-muted-foreground'>
            {seedMode === 'pin'
              ? 'Seed colors appear exactly in the palette as locked slots.'
              : 'Seed hue guides generation but the exact color may shift.'}
          </p>
        </Section>
      )}

      {/* ── Harmony ── */}
      {show('harmony') && (
        <Section>
          <SectionLabel>Harmony</SectionLabel>
          <p className='mb-3 min-h-[2.4em] text-[11px] leading-relaxed text-muted-foreground'>
            {HARMONIES.find((h) => h.id === mode)?.desc ?? ''}
          </p>
          <HarmonyPicker
            mode={mode}
            base={seeds[0] ?? slots[0]?.color}
            onSelect={(m) => {
              setMode(m);
              generate();
            }}
          />
        </Section>
      )}

      {/* ── Token names hint ── */}
      {show('colors') && (
        <Section>
          <SectionLabel>Token Names</SectionLabel>
          <p className='text-[9.5px] leading-relaxed text-muted-foreground'>
            Click any color name to rename it as a design token. Use the <GripInline /> handle to
            drag and reorder. Arrow keys work when a slot is focused.
          </p>
        </Section>
      )}

      {/* ── Palette preview ── */}
      {show('preview') && slots.length > 0 && (
        <Section className={section === 'preview' ? 'border-b-0' : undefined}>
          <SectionLabel>Preview</SectionLabel>
          <div className='mt-2 flex h-5.5 gap-0.5 overflow-hidden rounded'>
            {slots.map((s, i) =>
              onPreviewSelect ? (
                <button
                  key={s.id}
                  type='button'
                  onClick={() => onPreviewSelect(i)}
                  className='flex-1 cursor-pointer border-0 p-0'
                  style={{ background: s.color.css ?? s.color.hex }}
                  title={s.color.hex.toUpperCase()}
                  aria-label={`Color ${i + 1}, ${s.color.hex.toUpperCase()}`}
                />
              ) : (
                <div
                  key={s.id}
                  className='flex-1'
                  style={{ background: s.color.css ?? s.color.hex }}
                />
              ),
            )}
          </div>
        </Section>
      )}
    </>
  );
}

// ─── GenerateFooter ───────────────────────────────────────────────────────────
// The sticky "Generate" button at the bottom of the controls panel.

export function GenerateFooter() {
  const generate = useChromaStore((s) => s.generate);
  const pending = useChromaStore((state) => state.generationPending);
  const error = useChromaStore((state) => state.generationError);
  return (
    <div className='shrink-0 border-t border-r border-border bg-card px-4 py-3'>
      <button
        className='w-full cursor-pointer rounded border-0 bg-primary py-2.5 text-[12px] font-bold text-primary-foreground transition-opacity hover:opacity-90'
        aria-busy={pending}
        onClick={generate}>
        <RefreshCw className='mr-2 inline size-3.5' aria-hidden='true' />
        {pending ? 'Generating...' : 'Generate'}
      </button>
      {error && (
        <p role='alert' className='mt-2 text-xs text-destructive'>
          {error}
        </p>
      )}
      <p className='mt-1.5 text-center text-[10px] text-muted-foreground'>
        <kbd>Space</kbd> generate · <kbd>Ctrl+Z</kbd> undo · <kbd>?</kbd> shortcuts
      </p>
    </div>
  );
}
