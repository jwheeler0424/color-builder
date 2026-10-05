/**
 * generate-controls-accordion.tsx  — Phase 4 layout component
 *
 * Accordion version of GenerateControls for tablet/mobile.
 * Each setting section collapses independently.
 *
 * Default open: Count, Seeds (most used on touch).
 * Default closed: Themes, Seed Behavior, Temperature, Harmony (secondary).
 */

import { useState, useCallback, useRef } from 'react';

import { useChromaStore } from '@/hooks/use-chroma-store';
import { HARMONIES, MAX_SLOTS, THEMES } from '@/lib/constants/chroma';
import { cn, parseHex, hexToStop } from '@/lib/utils';

import { AccordionSection } from './accordion-section';

interface GenerateControlsAccordionProps {
  onEditSeed?: (index: number) => void;
  /** Add a Generate button at the bottom */
  showFooter?: boolean;
}

export function GenerateControlsAccordion({
  onEditSeed,
  showFooter = true,
}: GenerateControlsAccordionProps) {
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
  } = useChromaStore();

  const [seedInp, setSeedInp] = useState('');
  const [seedErr, setSeedErr] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedGenerate = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => generate(), 180);
  }, [generate]);

  const handleAddSeed = useCallback(() => {
    const hex = parseHex(seedInp);
    if (!hex) {
      setSeedErr(true);
      setTimeout(() => setSeedErr(false), 600);
      return;
    }
    addSeed(hexToStop(hex));
    setSeedInp('');
  }, [seedInp, addSeed]);

  return (
    <div className='flex flex-col'>
      {/* ── Count (open by default) ── */}
      <AccordionSection id='count' title='Colors' defaultOpen>
        <div className='flex items-center gap-3 pt-1'>
          <span className='min-w-[1.8rem] text-center text-[20px] font-black text-primary tabular-nums'>
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
            className='h-9 flex-1' // h-9 = 36px for touch
          />
        </div>
      </AccordionSection>

      {/* ── Themes ── */}
      <AccordionSection id='themes' title='Themes'>
        <div className='grid grid-cols-2 gap-1.5 pt-1'>
          {THEMES.map((t, i) => (
            <div
              key={i}
              className='cursor-pointer overflow-hidden rounded border border-border transition-opacity active:opacity-70'
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
      </AccordionSection>

      {/* ── Seeds (open by default) ── */}
      <AccordionSection
        id='seeds'
        title={`Seed Colors${seeds.length ? ` (${seeds.length})` : ''}`}
        defaultOpen>
        <div className='mb-2 flex flex-col gap-1.5 pt-1'>
          {seeds.map((s, i) => (
            <div key={i} className='flex min-h-11 items-center gap-2'>
              <button
                className='h-9 w-9 shrink-0 rounded-md border border-border/50'
                style={{ background: s.hex }}
                onClick={() => onEditSeed?.(i)}
                title={`Edit seed: ${s.hex}`}
              />
              <span
                className='flex-1 cursor-pointer font-mono text-[11px] tracking-[.05em] text-muted-foreground uppercase transition-colors hover:text-foreground'
                onClick={() => onEditSeed?.(i)}>
                {s.hex.toUpperCase()}
              </span>
              <button
                className='flex h-11 w-11 cursor-pointer items-center justify-center text-xl text-muted-foreground transition-colors hover:text-destructive'
                onClick={() => removeSeed(i)}
                title='Remove seed'>
                ×
              </button>
            </div>
          ))}
        </div>
        <div className='flex gap-2'>
          <input
            className={cn(
              'h-11 flex-1 rounded-md border bg-muted px-3 py-2.5 font-mono text-[12px] text-foreground',
              'transition-colors outline-none placeholder:text-muted-foreground focus:border-ring',
              seedErr ? 'border-destructive' : 'border-border',
            )}
            value={seedInp}
            onChange={(e) => setSeedInp(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddSeed()}
            placeholder='#F4A261'
            maxLength={7}
            spellCheck={false}
            autoComplete='off'
          />
          <button
            onClick={handleAddSeed}
            className='h-11 cursor-pointer rounded-md border border-border bg-secondary px-4 text-[12px] font-bold text-secondary-foreground transition-colors hover:border-input active:opacity-70'>
            + Add
          </button>
        </div>
      </AccordionSection>

      {/* ── Seed behavior ── */}
      <AccordionSection id='seedmode' title='Seed Behavior'>
        <div className='flex gap-2 pt-1'>
          {(
            [
              { id: 'influence', label: 'Influence' },
              { id: 'pin', label: 'Pin' },
            ] as const
          ).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setSeedMode(id)}
              className={cn(
                'h-11 flex-1 cursor-pointer rounded-md border text-[12px] font-bold transition-colors',
                seedMode === id
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-secondary text-muted-foreground hover:border-input hover:text-foreground',
              )}>
              {label}
            </button>
          ))}
        </div>
        <p className='mt-2 text-[10px] leading-relaxed text-muted-foreground'>
          {seedMode === 'pin'
            ? 'Seed colors appear as locked slots in the palette.'
            : 'Seed hue guides generation but the exact color may shift.'}
        </p>
      </AccordionSection>

      {/* ── Temperature ── */}
      <AccordionSection
        id='temp'
        title={`Temperature — ${temperature < -0.2 ? '❄ Cool' : temperature > 0.2 ? '🌅 Warm' : '⚪ Neutral'}`}>
        <div className='flex items-center gap-3 pt-1'>
          <span className='text-[11px] text-muted-foreground'>❄</span>
          <input
            type='range'
            min={-100}
            max={100}
            value={Math.round(temperature * 100)}
            onChange={(e) => {
              setTemperature(+e.target.value / 100);
              debouncedGenerate();
            }}
            className='h-9 flex-1'
          />
          <span className='text-[11px] text-muted-foreground'>🌅</span>
        </div>
      </AccordionSection>

      {/* ── Harmony ── */}
      <AccordionSection id='harmony' title='Harmony'>
        <p className='mb-2 min-h-[2em] text-[11px] leading-relaxed text-muted-foreground'>
          {HARMONIES.find((h) => h.id === mode)?.desc ?? ''}
        </p>
        <div className='grid grid-cols-2 gap-1.5'>
          {HARMONIES.map((h) => (
            <button
              key={h.id}
              onClick={() => {
                setMode(h.id);
                generate();
              }}
              className={cn(
                'h-11 cursor-pointer rounded-md border px-2 text-left font-mono text-[11px] transition-colors active:opacity-70',
                mode === h.id
                  ? 'border-primary bg-primary font-bold text-primary-foreground'
                  : 'border-border bg-secondary text-muted-foreground hover:border-input hover:text-foreground',
              )}>
              {h.label}
            </button>
          ))}
        </div>
      </AccordionSection>

      {/* Palette preview */}
      {slots.length > 0 && (
        <div className='border-b border-border px-4 py-3'>
          <p className='mb-2 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase'>
            Preview
          </p>
          <div className='flex h-5 gap-0.5 overflow-hidden rounded'>
            {slots.map((s) => (
              <div key={s.id} className='flex-1' style={{ background: s.color.hex }} />
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      {showFooter && (
        <div className='px-4 py-3'>
          <button
            className='h-12 w-full cursor-pointer rounded-md border-0 bg-primary text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 active:opacity-75'
            onClick={generate}>
            ⟳ Generate
          </button>
        </div>
      )}
    </div>
  );
}
