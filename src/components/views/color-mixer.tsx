import { useNavigate } from '@tanstack/react-router';
import { ArrowLeftRight, Check, Plus, Sprout } from 'lucide-react';
import { useState, useMemo } from 'react';

import type { ColorValue } from '@/lib/engine/color';
import type { MixSpace } from '@/types';

import { useChromaStore } from '@/hooks/use-chroma-store';
import { MAX_SLOTS } from '@/lib/constants/chroma';
import {
  colorToStop,
  mixColor,
  parseColor,
  renderColor,
  stopToColor,
  textColor,
} from '@/lib/engine/browser';
import { lookupColorName } from '@/lib/tools/color-names';

import { ToolButton as Button, ToolSegments, TYPE, ViewHeader } from './view-ui';

const STEPS = 7;

interface MixerInput {
  text: string;
  color: ColorValue;
  valid: boolean;
}

function updateMixerInput(current: MixerInput, text: string): MixerInput {
  try {
    return { text, color: parseColor(text), valid: true };
  } catch {
    return { ...current, text, valid: false };
  }
}

function createMixerInput(color: ColorValue): MixerInput {
  const rendition = renderColor(color);
  return {
    text: color.display === 'srgb' && color.alpha === 1 ? rendition.hex : rendition.css,
    color,
    valid: true,
  };
}
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
  const [colorA, setColorA] = useState(() => createMixerInput(parseColor('#e63946')));
  const [colorB, setColorB] = useState(() => createMixerInput(parseColor('#457b9d')));
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

  const blendRow = useMemo(() => {
    return Array.from({ length: STEPS }, (_, i) => {
      const t = i / (STEPS - 1);
      return {
        ...colorToStop(
          mixColor(colorA.color, colorB.color, t, mixSpace === 'oklch' ? 'oklab' : mixSpace),
        ),
        t,
      };
    });
  }, [colorA.color, colorB.color, mixSpace]);

  // All three spaces side-by-side for comparison
  const allSpaces = useMemo(() => {
    return MIX_SPACES.map((space) => {
      return {
        ...space,
        steps: Array.from({ length: STEPS }, (_, i) => {
          const t = i / (STEPS - 1);
          return colorToStop(
            mixColor(colorA.color, colorB.color, t, space.id === 'oklch' ? 'oklab' : space.id),
          );
        }),
      };
    });
  }, [colorA.color, colorB.color]);

  const useMixAsSeeds = () => {
    setSeeds(blendRow.map((color) => colorToStop(stopToColor(color))));
    generate();
    void navigate({ to: '/palette' });
  };

  const addMidpoint = () => {
    const mid = blendRow[Math.floor(STEPS / 2)];
    addSlot(colorToStop(stopToColor(mid)));
  };

  return (
    <div className='@container flex min-h-0 flex-1 flex-col overflow-hidden'>
      <ViewHeader
        title='Color Mixer'
        description='Two colors, seven blend steps and three interpolation spaces.'
      />
      <div className='flex min-h-0 flex-1 flex-col overflow-auto border-t border-border'>
        <div className='tool-panel-space grid shrink-0 grid-cols-1 items-center gap-4 border-b border-border @xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]'>
          {[
            { label: 'Color A', value: colorA, set: setColorA },
            { label: 'Color B', value: colorB, set: setColorB },
          ].map(({ label, value, set }, index) => (
            <div
              key={label}
              className={`flex min-w-0 flex-col gap-3 ${index === 1 ? '@xl:col-start-3 @xl:row-start-1' : ''}`}>
              <div className={TYPE.label}>{label}</div>
              <div className='flex min-w-0 items-center gap-3'>
                <input
                  type='color'
                  aria-label={`Pick ${label}`}
                  title={`Pick ${label}`}
                  value={renderColor(value.color).hex}
                  onChange={(event) =>
                    set((current) => updateMixerInput(current, event.target.value))
                  }
                  className='size-12 shrink-0 cursor-pointer overflow-hidden rounded-md border border-border bg-transparent p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0'
                />
                <div className='flex min-w-0 flex-1 flex-col gap-1.5'>
                  <input
                    aria-label={`${label} hex`}
                    value={value.text}
                    onChange={(event) =>
                      set((current) => updateMixerInput(current, event.target.value))
                    }
                    aria-invalid={!value.valid}
                    maxLength={200}
                    spellCheck={false}
                    className='h-8 w-full min-w-0 rounded border border-border bg-muted px-2 font-mono text-xs outline-none focus:border-ring'
                  />
                  <span className={`truncate ${TYPE.meta}`}>
                    {lookupColorName(value.color, renderColor(value.color).hex)}
                  </span>
                </div>
              </div>
              <div className='flex min-h-6 flex-wrap gap-1'>
                {slots.map((slot) => (
                  <button
                    key={slot.id}
                    type='button'
                    title={`Use ${slot.color.hex.toUpperCase()} for ${label}`}
                    aria-label={`Use ${slot.color.hex.toUpperCase()} for ${label}`}
                    onClick={() => set(createMixerInput(stopToColor(slot.color)))}
                    className='size-6 shrink-0 cursor-pointer rounded-sm border border-border outline-none focus-visible:ring-2 focus-visible:ring-ring'
                    style={{ background: slot.color.css ?? slot.color.hex }}
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
          <section className='tool-panel-space tool-panel-stack flex min-h-0 min-w-0 flex-col border-b border-border @4xl:border-r @4xl:border-b-0'>
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
              {blendRow.map((color) => {
                const { hex, t } = color;
                const value = color.value ?? parseColor(hex);
                const paint =
                  value.display === 'srgb' && value.alpha === 1 ? hex : (color.css ?? hex);
                return (
                  <button
                    key={t}
                    type='button'
                    aria-label={`Copy blend ${Math.round(t * 100)}% ${hex}`}
                    title={`${lookupColorName(value, hex)} ${hex.toUpperCase()}`}
                    onClick={() => {
                      void copyColor(paint);
                    }}
                    className='flex min-w-0 cursor-pointer flex-col justify-between rounded-md border border-foreground/10 px-1 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring'
                    style={{ background: paint, color: textColor(value.xyz) }}>
                    <span className='font-mono text-[10px]'>{Math.round(t * 100)}%</span>
                    <span className='flex min-h-4 items-center justify-center font-mono text-[9px]'>
                      {copiedHex === paint ? <Check className='size-3' /> : hex.toUpperCase()}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className='flex shrink-0 items-center gap-3 border-t border-border pt-3'>
              <span
                className='size-10 shrink-0 rounded-md border border-border'
                style={{ background: blendRow[3].css ?? blendRow[3].hex }}
              />
              <div className='flex min-w-0 flex-1 flex-col gap-1'>
                <span className={TYPE.label}>Midpoint</span>
                <span className={`truncate ${TYPE.title}`}>
                  {lookupColorName(
                    blendRow[3].value ?? parseColor(blendRow[3].hex),
                    blendRow[3].hex,
                  )}
                </span>
              </div>
              <span className={TYPE.mono}>{blendRow[3].hex.toUpperCase()}</span>
            </div>
          </section>
          <section className='tool-panel-space tool-panel-stack flex min-w-0 flex-col'>
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
                    {space.steps.map(({ hex, css }, index) => (
                      <span
                        key={index}
                        className='min-w-0 flex-1'
                        style={{ background: css ?? hex }}
                      />
                    ))}
                  </span>
                  <span className={TYPE.mono}>{space.steps[3].hex.toUpperCase()}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
        <div className='tool-inline-space flex shrink-0 flex-wrap items-center gap-2 border-t border-border py-3'>
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
