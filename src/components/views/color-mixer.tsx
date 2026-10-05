import { useNavigate } from '@tanstack/react-router';
import { ArrowLeftRight, Check, Plus, Sprout } from 'lucide-react';
import { useState, useMemo } from 'react';

import type { MixSpace } from '@/types';

import { useChromaStore } from '@/hooks/use-chroma-store';
import { MAX_SLOTS } from '@/lib/constants/chroma';
import {
  parseHex,
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  mixOklab,
  mixHsl,
  mixRgb,
  textColor,
  nearestName,
} from '@/lib/utils';

import { ToolButton as Button, ToolSegments, TYPE, ViewHeader } from './view-ui';

const STEPS = 7;
const MIX_SPACES: { id: MixSpace; label: string; desc: string }[] = [
  {
    id: 'oklch',
    label: 'OKLab',
    desc: 'Perceptually uniform OKLab interpolation — no muddy midpoints',
  },
  { id: 'hsl', label: 'HSL', desc: 'Shortest hue path — familiar results' },
  { id: 'rgb', label: 'RGB', desc: 'Raw channel interpolation' },
];

export default function ColorMixer() {
  const { slots, setSeeds, addSlot, generate } = useChromaStore();
  const navigate = useNavigate();
  const [colorA, setColorA] = useState('#e63946');
  const [colorB, setColorB] = useState('#457b9d');
  const [mixSpace, setMixSpace] = useState<MixSpace>('oklch');
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const copyColor = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopiedHex(hex);
      setTimeout(() => setCopiedHex(null), 1200);
    } catch {
      setCopiedHex(null);
    }
  };

  const rgbA = useMemo(
    () => (parseHex(colorA) ? hexToRgb(parseHex(colorA)!) : { r: 230, g: 57, b: 70 }),
    [colorA],
  );
  const rgbB = useMemo(
    () => (parseHex(colorB) ? hexToRgb(parseHex(colorB)!) : { r: 69, g: 123, b: 157 }),
    [colorB],
  );

  const blendRow = useMemo(() => {
    const mixFn = mixSpace === 'oklch' ? mixOklab : mixSpace === 'hsl' ? mixHsl : mixRgb;
    return Array.from({ length: STEPS }, (_, i) => {
      const t = i / (STEPS - 1);
      const rgb = mixFn(rgbA, rgbB, t);
      return { rgb, hex: rgbToHex(rgb), t };
    });
  }, [rgbA, rgbB, mixSpace]);

  // All three spaces side-by-side for comparison
  const allSpaces = useMemo(() => {
    return MIX_SPACES.map((space) => {
      const fn = space.id === 'oklch' ? mixOklab : space.id === 'hsl' ? mixHsl : mixRgb;
      return {
        ...space,
        steps: Array.from({ length: STEPS }, (_, i) => {
          const t = i / (STEPS - 1);
          const rgb = fn(rgbA, rgbB, t);
          return { rgb, hex: rgbToHex(rgb) };
        }),
      };
    });
  }, [rgbA, rgbB]);

  const useMixAsSeeds = () => {
    const seeds = blendRow.map(({ rgb, hex }) => ({
      hex,
      rgb,
      hsl: rgbToHsl(rgb),
    }));
    setSeeds(seeds);
    generate();
    void navigate({ to: '/palette' });
  };

  const addMidpoint = () => {
    const mid = blendRow[Math.floor(STEPS / 2)];
    addSlot({ hex: mid.hex, rgb: mid.rgb, hsl: rgbToHsl(mid.rgb) });
  };

  return (
    <div className='@container flex min-h-0 flex-1 flex-col overflow-hidden'>
      <ViewHeader
        title='Color Mixer'
        description='Two colors, seven blend steps and three interpolation spaces.'
      />
      <div className='flex min-h-0 flex-1 flex-col overflow-auto border-t border-border'>
        <div className='grid shrink-0 grid-cols-1 items-center gap-4 border-b border-border p-4 @xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]'>
          {[
            { label: 'Color A', value: colorA, set: setColorA, rgb: rgbA },
            { label: 'Color B', value: colorB, set: setColorB, rgb: rgbB },
          ].map(({ label, value, set, rgb }, index) => (
            <div
              key={label}
              className={`flex min-w-0 flex-col gap-3 ${index === 1 ? '@xl:col-start-3 @xl:row-start-1' : ''}`}>
              <div className={TYPE.label}>{label}</div>
              <div className='flex min-w-0 items-center gap-3'>
                <input
                  type='color'
                  aria-label={`Pick ${label}`}
                  title={`Pick ${label}`}
                  value={rgbToHex(rgb)}
                  onChange={(event) => set(event.target.value)}
                  className='size-12 shrink-0 cursor-pointer overflow-hidden rounded-md border border-border bg-transparent p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0'
                />
                <div className='flex min-w-0 flex-1 flex-col gap-1.5'>
                  <input
                    aria-label={`${label} hex`}
                    value={value}
                    onChange={(event) => set(event.target.value)}
                    aria-invalid={!parseHex(value)}
                    maxLength={7}
                    spellCheck={false}
                    className='h-8 w-full min-w-0 rounded border border-border bg-muted px-2 font-mono text-xs outline-none focus:border-ring'
                  />
                  <span className={`truncate ${TYPE.meta}`}>{nearestName(rgb)}</span>
                </div>
              </div>
              <div className='flex min-h-6 flex-wrap gap-1'>
                {slots.map((slot) => (
                  <button
                    key={slot.id}
                    type='button'
                    title={`Use ${slot.color.hex.toUpperCase()} for ${label}`}
                    aria-label={`Use ${slot.color.hex.toUpperCase()} for ${label}`}
                    onClick={() => set(slot.color.hex)}
                    className='size-6 shrink-0 cursor-pointer rounded-sm border border-border outline-none focus-visible:ring-2 focus-visible:ring-ring'
                    style={{ background: slot.color.hex }}
                  />
                ))}
              </div>
            </div>
          ))}
          <Button
            variant='ghost'
            size='icon-sm'
            title='Swap colors'
            aria-label='Swap colors'
            className='justify-self-center @xl:col-start-2 @xl:row-start-1'
            onClick={() => {
              setColorA(colorB);
              setColorB(colorA);
            }}>
            <ArrowLeftRight className='size-4' />
          </Button>
        </div>
        <div className='grid grid-cols-1 @4xl:min-h-0 @4xl:flex-1 @4xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]'>
          <section className='flex min-h-0 min-w-0 flex-col gap-4 border-b border-border p-4 @4xl:border-r @4xl:border-b-0'>
            <div className='flex shrink-0 flex-wrap items-center justify-between gap-2'>
              <span className={TYPE.label}>Blend</span>
              <ToolSegments
                value={mixSpace}
                onValueChange={setMixSpace}
                label='Blend color space'
                items={MIX_SPACES.map((space) => ({ ...space, title: space.desc }))}
              />
            </div>
            <div className='grid min-h-40 grid-cols-7 gap-1 @4xl:min-h-24 @4xl:flex-1'>
              {blendRow.map(({ hex, rgb, t }) => (
                <button
                  key={t}
                  type='button'
                  aria-label={`Copy blend ${Math.round(t * 100)}% ${hex}`}
                  title={`${nearestName(rgb)} ${hex.toUpperCase()}`}
                  onClick={() => {
                    void copyColor(hex);
                  }}
                  className='flex min-w-0 cursor-pointer flex-col justify-between rounded-md border border-foreground/10 px-1 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring'
                  style={{ background: hex, color: textColor(rgb) }}>
                  <span className='font-mono text-[10px]'>{Math.round(t * 100)}%</span>
                  <span className='flex min-h-4 items-center justify-center font-mono text-[9px]'>
                    {copiedHex === hex ? <Check className='size-3' /> : hex.toUpperCase()}
                  </span>
                </button>
              ))}
            </div>
            <div className='flex shrink-0 items-center gap-3 border-t border-border pt-3'>
              <span
                className='size-10 shrink-0 rounded-md border border-border'
                style={{ background: blendRow[3].hex }}
              />
              <div className='flex min-w-0 flex-1 flex-col gap-1'>
                <span className={TYPE.label}>Midpoint</span>
                <span className={`truncate ${TYPE.title}`}>{nearestName(blendRow[3].rgb)}</span>
              </div>
              <span className={TYPE.mono}>{blendRow[3].hex.toUpperCase()}</span>
            </div>
          </section>
          <section className='flex min-w-0 flex-col gap-4 p-4'>
            <div className={TYPE.label}>Space comparison</div>
            <div className='grid flex-1 grid-rows-3 gap-4'>
              {allSpaces.map((space) => (
                <button
                  key={space.id}
                  type='button'
                  aria-label={`Select ${space.label} blend`}
                  aria-pressed={mixSpace === space.id}
                  title={space.desc}
                  onClick={() => setMixSpace(space.id)}
                  className='flex min-w-0 cursor-pointer flex-col gap-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring'>
                  <span className={`flex items-center justify-between ${TYPE.title}`}>
                    {space.label}
                    {mixSpace === space.id && <Check className='size-3 text-primary' />}
                  </span>
                  <span className='flex min-h-10 flex-1 overflow-hidden rounded-md border border-border'>
                    {space.steps.map(({ hex }, index) => (
                      <span key={index} className='min-w-0 flex-1' style={{ background: hex }} />
                    ))}
                  </span>
                  <span className={TYPE.mono}>{space.steps[3].hex.toUpperCase()}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
        <div className='flex shrink-0 flex-wrap items-center gap-2 border-t border-border px-4 py-3'>
          <Button size='sm' onClick={useMixAsSeeds}>
            <Sprout className='size-3.5' />
            Use blend as seeds
          </Button>
          <Button
            variant='outline'
            size='sm'
            disabled={slots.length >= MAX_SLOTS}
            title={slots.length >= MAX_SLOTS ? 'Palette is full' : 'Add midpoint to palette'}
            onClick={addMidpoint}>
            <Plus className='size-3.5' />
            Add midpoint
          </Button>
        </div>
      </div>
    </div>
  );
}
