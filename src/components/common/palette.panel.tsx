import { GripVertical } from 'lucide-react';
import React, { useState, useCallback, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { useChromaStore } from '@/hooks/use-chroma-store';
import { HARMONIES, THEMES } from '@/lib/constants/chroma';
import { hexToStop, parseHexInput } from '@/lib/engine/browser';
import { cn } from '@/lib/utils';
import { useRegisterHotkey } from '@/providers/hotkey.provider';

// ─── Section helpers ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className='mb-2.5 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase'>
      {children}
    </p>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return <div className='border-b border-border px-4 py-3.5'>{children}</div>;
}

export function PalettePanel() {
  const {
    slots,
    seeds,
    count,
    mode,
    seedMode,
    temperature,
    generate,
    undo,
    setMode,
    setCount,
    addSeed,
    removeSeed,
    setSeeds,
    setSeedMode,
    setTemperature,
    openModal,
  } = useChromaStore();

  const [seedInp, setSeedInp] = useState('');
  const [seedErr, setSeedErr] = useState(false);
  const [editingSeed, setEditingSeed] = useState<number | null>(null);

  // ── Debounced generate ─────────────────────────────────────────────────────
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedGenerate = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => generate(), 180);
  }, [generate]);

  // ── Hotkeys ────────────────────────────────────────────────────────────────
  useRegisterHotkey({
    key: 'space',
    label: 'Generate palette',
    group: 'Palette',
    handler: generate,
  });
  useRegisterHotkey({
    key: 'z',
    ctrl: true,
    label: 'Undo generate',
    group: 'Palette',
    handler: undo,
  });
  useRegisterHotkey({
    key: '?',
    label: 'Keyboard shortcuts',
    group: 'App',
    handler: () => openModal('shortcuts'),
  });
  useRegisterHotkey({
    key: 'e',
    ctrl: true,
    label: 'Export palette',
    group: 'App',
    handler: () => openModal('export'),
  });
  useRegisterHotkey({
    key: 's',
    ctrl: true,
    shift: true,
    label: 'Save palette',
    group: 'Palette',
    handler: () => openModal('save'),
  });

  // ── Seed input ─────────────────────────────────────────────────────────────
  const handleAddSeed = useCallback(() => {
    const parsed = parseHexInput(seedInp);
    if (!parsed) {
      setSeedErr(true);
      setTimeout(() => setSeedErr(false), 600);
      return;
    }
    addSeed(hexToStop(parsed.hex));
    setSeedInp('');
  }, [seedInp, addSeed]);

  return (
    <aside className='flex h-full w-[320px] shrink-0 flex-col border-l border-border bg-card'>
      <div className='h-full flex-1 [scrollbar-width:thin] overflow-y-auto'>
        <Section>
          <SectionLabel>Colors</SectionLabel>
          <div className='flex items-center gap-2.5'>
            <span className='min-w-6 text-center text-[22px] font-black text-primary tabular-nums'>
              {count}
            </span>
            <input
              type='range'
              min={4}
              max={12}
              value={count}
              onChange={(e) => {
                setCount(+e.target.value);
                debouncedGenerate();
              }}
              className='flex-1'
            />
            <span className='text-[10px] text-muted-foreground'>12</span>
          </div>
        </Section>

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

        <Section>
          <SectionLabel>Seed Colors</SectionLabel>
          <div className='mb-2 flex flex-col gap-1'>
            {seeds.map((s, i) => (
              <div key={i} className='flex items-center gap-1.5'>
                <button
                  className='h-4 w-4 shrink-0 rounded-sm border border-white/10'
                  style={{ background: s.hex }}
                  onClick={() => setEditingSeed(i)}
                />
                <span
                  className='flex-1 cursor-pointer font-mono text-[10px] tracking-[.05em] text-muted-foreground uppercase transition-colors hover:text-foreground'
                  onClick={() => setEditingSeed(i)}>
                  {s.hex.toUpperCase()}
                </span>
                <button
                  className='cursor-pointer border-none bg-transparent text-sm leading-none text-muted-foreground transition-colors hover:text-destructive'
                  onClick={() => removeSeed(i)}>
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
              maxLength={7}
              spellCheck={false}
              autoComplete='off'
            />
            <Button variant='ghost' size='sm' onClick={handleAddSeed}>
              + Add
            </Button>
          </div>
        </Section>

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
              <Button
                key={id}
                variant={seedMode === id ? 'default' : 'ghost'}
                size='sm'
                title={title}
                onClick={() => setSeedMode(id)}>
                {label}
              </Button>
            ))}
          </div>
          <p className='text-[9.5px] leading-relaxed text-muted-foreground'>
            {seedMode === 'pin'
              ? 'Seed colors appear exactly in the palette as locked slots.'
              : 'Seed hue guides generation but the exact color may shift.'}
          </p>
        </Section>

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

        <Section>
          <SectionLabel>Harmony</SectionLabel>
          <p className='mb-2 min-h-[2.4em] text-[11px] leading-relaxed text-muted-foreground'>
            {HARMONIES.find((h) => h.id === mode)?.desc ?? ''}
          </p>
          <div className='grid grid-cols-2 gap-1'>
            {HARMONIES.map((h) => (
              <button
                key={h.id}
                onClick={() => {
                  setMode(h.id);
                  generate();
                }}
                className={cn(
                  'cursor-pointer rounded border px-2 py-1.5 text-left font-mono text-[11px] transition-all',
                  mode === h.id
                    ? 'border-primary bg-primary font-bold text-primary-foreground'
                    : 'border-border bg-secondary text-muted-foreground hover:border-input hover:text-foreground',
                )}>
                {h.label}
              </button>
            ))}
          </div>
        </Section>

        <Section>
          <SectionLabel>Token Names</SectionLabel>
          <p className='text-[9.5px] leading-relaxed text-muted-foreground'>
            Click any color name to rename it as a design token. Use the{' '}
            <GripVertical size={10} className='inline' /> handle to drag and reorder. Arrow keys
            work when a slot is focused.
          </p>
        </Section>

        {slots.length > 0 && (
          <Section>
            <SectionLabel>Preview</SectionLabel>
            <div className='mt-2 flex h-5.5 gap-0.5 overflow-hidden rounded'>
              {slots.map((s) => (
                <div key={s.id} className='flex-1' style={{ background: s.color.hex }} />
              ))}
            </div>
          </Section>
        )}
      </div>

      <div className='shrink-0 border-t border-border bg-card px-4 py-3'>
        <Button className='w-full py-2.5 text-[12px]' onClick={generate}>
          ⟳ Generate
        </Button>
        <p className='mt-1.5 text-center text-[10px] text-muted-foreground'>
          <kbd>Space</kbd> generate · <kbd>Ctrl+Z</kbd> undo · <kbd>?</kbd> shortcuts
        </p>
      </div>
    </aside>
  );
}
