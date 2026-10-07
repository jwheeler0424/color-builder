import '../../../node_modules/@tanstack/charts/dist/mark.js';
import { lineY } from '@tanstack/charts/line';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { defineChart } from '@tanstack/charts/scene';
import {
  ArrowDown,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  Check,
  Copy,
  Plus,
  Trash2,
} from 'lucide-react';
import { useState, useMemo, useCallback } from 'react';

import type { GradientStop, GradientState, GradientType } from '@/types';

import { Chart } from '@/components/ui/chart';
import { useChromaStore } from '@/hooks/use-chroma-store';
import { GRAD_PRESETS, CB_TYPES } from '@/lib/constants/chroma';
import {
  applyEasing,
  redistributeGradientStops,
  buildGradientCss,
  sampleGradient,
  parseColor,
  VISION_TYPES,
  type ColorGradient,
  type VisionType,
} from '@/lib/engine/browser';
import { renderColor } from '@/lib/engine/color';
import { clamp } from '@/lib/utils';
import { colorToStop, stopToColor } from '@/lib/utils/color-stop.utils';
export { applyEasing, redistributeGradientStops } from '@/lib/engine/gradient';

import GradientStopBar from '../common/gradient-stop-bar';
import { ToolButton as Button, ToolSegments, ToolTabs, TYPE, ViewHeader } from './view-ui';

export const EASING_OPTIONS = [
  { id: 'linear', label: 'Even spacing', group: 'Uniform' },
  { id: 'ease-in', label: 'Quadratic in', group: 'Quadratic' },
  { id: 'ease-out', label: 'Quadratic out', group: 'Quadratic' },
  { id: 'ease-in-out', label: 'Quadratic in-out', group: 'Quadratic' },
  { id: 'cubic-in', label: 'Cubic in', group: 'Cubic' },
  { id: 'cubic-out', label: 'Cubic out', group: 'Cubic' },
  { id: 'cubic-in-out', label: 'Cubic in-out', group: 'Cubic' },
  { id: 'quartic-in', label: 'Quartic in', group: 'Quartic' },
  { id: 'quartic-out', label: 'Quartic out', group: 'Quartic' },
  { id: 'quartic-in-out', label: 'Quartic in-out', group: 'Quartic' },
  { id: 'quintic-in', label: 'Quintic in', group: 'Quintic' },
  { id: 'quintic-out', label: 'Quintic out', group: 'Quintic' },
  { id: 'quintic-in-out', label: 'Quintic in-out', group: 'Quintic' },
  { id: 'sine-in', label: 'Sine in', group: 'Sine' },
  { id: 'sine-out', label: 'Sine out', group: 'Sine' },
  { id: 'sine-in-out', label: 'Sine in-out', group: 'Sine' },
  { id: 'exponential-in', label: 'Exponential in', group: 'Exponential' },
  { id: 'exponential-out', label: 'Exponential out', group: 'Exponential' },
  { id: 'exponential-in-out', label: 'Exponential in-out', group: 'Exponential' },
  { id: 'circular-in', label: 'Circular in', group: 'Circular' },
  { id: 'circular-out', label: 'Circular out', group: 'Circular' },
  { id: 'circular-in-out', label: 'Circular in-out', group: 'Circular' },
  { id: 'front-loaded', label: 'Front loaded', group: 'Weighted' },
  { id: 'back-loaded', label: 'Back loaded', group: 'Weighted' },
] as const;

type EasingMode = (typeof EASING_OPTIONS)[number]['id'];

const DIRECTIONS = [
  { label: 'Right', val: 'to right', icon: ArrowRight },
  { label: 'Left', val: 'to left', icon: ArrowLeft },
  { label: 'Down', val: 'to bottom', icon: ArrowDown },
  { label: 'Up', val: 'to top', icon: ArrowUp },
  { label: 'Bottom right', val: 'to bottom right', icon: ArrowDownRight },
  { label: 'Bottom left', val: 'to bottom left', icon: ArrowDownLeft },
  { label: 'Top left', val: 'to top left', icon: ArrowUpLeft },
  { label: 'Top right', val: 'to top right', icon: ArrowUpRight },
];

function engineGradient(gradient: GradientState): ColorGradient {
  return {
    type: gradient.type,
    dir: gradient.dir,
    stops: gradient.stops.map((stop) => ({
      color: stop.value ?? parseColor(stop.hex),
      pos: stop.pos,
    })),
  };
}

export function buildCss(grad: GradientState, interp: 'srgb' | 'oklab' | 'oklch' = 'srgb'): string {
  return buildGradientCss(engineGradient(grad), interp);
}

export function buildPreviewCss(
  gradient: GradientState,
  interpolation: 'srgb' | 'oklab' | 'oklch',
  vision = 'normal',
): string {
  const type: VisionType = VISION_TYPES.find((option) => option.id === vision)?.id ?? 'normal';
  return buildGradientCss(engineGradient(gradient), interpolation, type);
}

export function createEasingChart(mode: EasingMode) {
  const points = Array.from({ length: 65 }, (_, index) => ({
    position: index / 64,
    value: applyEasing(index / 64, mode),
  }));
  return defineChart({
    margin: 3,
    theme: { background: 'transparent', foreground: 'currentColor', palette: ['currentColor'] },
    marks: [
      lineY(points, {
        id: 'easing-curve',
        x: 'position',
        y: 'value',
        key: 'position',
        stroke: 'currentColor',
        strokeWidth: 1.75,
        lineCap: 'round',
        lineJoin: 'round',
        points: false,
      }),
    ],
    scales: {
      x: { scale: scaleLinear().domain([0, 1]), axis: false, grid: false },
      y: { scale: scaleLinear().domain([0, 1]), axis: false, grid: false },
    },
  });
}

function EasingCurve({ mode }: { mode: EasingMode }) {
  return (
    <span aria-hidden='true' inert className='pointer-events-none block h-6 w-full max-w-16'>
      <Chart
        definition={createEasingChart(mode)}
        initialWidth={48}
        height={24}
        ariaLabel={`${mode} easing curve`}
        className='text-current [&_svg]:h-6! [&_svg]:w-full!'
      />
    </span>
  );
}

function EasingChoice({
  option,
  caption,
  selected,
  disabled,
  onSelect,
}: {
  option: (typeof EASING_OPTIONS)[number];
  caption?: string;
  selected: boolean;
  disabled: boolean;
  onSelect: (mode: EasingMode) => void;
}) {
  return (
    <Button
      type='button'
      variant='ghost'
      size='xs'
      aria-label={option.label}
      aria-pressed={selected}
      disabled={disabled}
      title={disabled ? 'Distribution requires at least three stops' : option.label}
      onClick={() => onSelect(option.id)}
      className={`relative min-w-0 flex-col rounded-md border p-1.5 ${caption ? 'h-14 gap-1' : 'h-10'} ${selected ? 'border-primary bg-accent/30 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
      <EasingCurve mode={option.id} />
      {caption && <span className='text-[9px] leading-none'>{caption}</span>}
      {selected && <Check className='absolute top-1 right-1 size-2.5' />}
    </Button>
  );
}

export default function GradientView() {
  const { gradient, slots, setGradient } = useChromaStore();
  const [copied, setCopied] = useState(false);
  const [interpSpace, setInterpSpace] = useState<'srgb' | 'oklab' | 'oklch'>('srgb');
  const [showCvd, setShowCvd] = useState(true);
  const [panel, setPanel] = useState<'gradient' | 'stops' | 'presets'>('gradient');
  const [easing, setEasing] = useState<EasingMode | 'custom'>('custom');
  const g = gradient;
  const css = useMemo(() => buildCss(g, interpSpace), [g, interpSpace]);
  const selectedStop = g.stops[g.selectedStop] ?? g.stops[0];

  const setGrad = useCallback(
    (partial: Partial<GradientState>) => setGradient(partial),
    [setGradient],
  );

  const handleMoveStop = useCallback(
    (index: number, pos: number) => {
      setEasing('custom');
      const stops = g.stops.map((s, i) => (i === index ? { ...s, pos } : s));
      setGrad({ stops });
    },
    [g.stops, setGrad],
  );

  const handleAddStop = useCallback(
    (pos: number) => {
      setEasing('custom');
      const color = colorToStop(sampleGradient(engineGradient(g), pos, interpSpace));
      const stops = [...g.stops, { hex: color.hex, value: color.value, pos }];
      setGrad({ stops, selectedStop: stops.length - 1 });
      setPanel('stops');
    },
    [g, interpSpace, setGrad],
  );

  const handleRemoveStop = useCallback(
    (index: number) => {
      if (g.stops.length <= 2) return;
      setEasing('custom');
      const stops = g.stops.filter((_, i) => i !== index);
      setGrad({
        stops,
        selectedStop:
          g.selectedStop > index ? g.selectedStop - 1 : clamp(g.selectedStop, 0, stops.length - 1),
      });
    },
    [g.stops, g.selectedStop, setGrad],
  );

  const handleStopColor = (v: string) => {
    try {
      const color = colorToStop(parseColor(v));
      const stops = g.stops.map((stop, index) =>
        index === g.selectedStop ? { ...stop, hex: color.hex, value: color.value } : stop,
      );
      setGrad({ stops });
    } catch {
      return;
    }
  };

  const copyCss = async () => {
    try {
      await navigator.clipboard.writeText(`background: ${css};`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  const loadFromPalette = () => {
    if (!slots.length) return;
    const n = slots.length;
    const stops: GradientStop[] = slots.map((slot, i) => ({
      hex: slot.color.hex,
      value: stopToColor(slot.color),
      pos: Math.round((i / (n - 1 || 1)) * 100),
    }));
    setGrad({ stops, selectedStop: 0 });
    setEasing('linear');
    setPanel('stops');
  };

  return (
    <div className='@container flex min-h-0 flex-1 flex-col overflow-hidden'>
      <ViewHeader
        title='Gradient Generator'
        description='Color stops, interpolation and CSS gradients.'
      />
      <div className='grid min-h-0 flex-1 auto-rows-max grid-cols-1 overflow-auto border-t border-border @4xl:auto-rows-auto @4xl:grid-cols-[minmax(0,1fr)_17rem] @4xl:grid-rows-[minmax(0,1fr)] @4xl:overflow-hidden'>
        <div className='flex min-h-0 min-w-0 flex-col gap-4 p-4 @4xl:overflow-auto'>
          <div className='flex shrink-0 flex-wrap items-center justify-between gap-2'>
            <span className={TYPE.label}>Preview</span>
            <label className='flex cursor-pointer items-center gap-2 text-[11px] text-muted-foreground'>
              <input
                type='checkbox'
                checked={showCvd}
                onChange={(event) => setShowCvd(event.target.checked)}
                className='size-3.5 accent-primary'
              />
              Color vision
            </label>
          </div>

          <div
            className={`grid shrink-0 auto-rows-[minmax(6rem,1fr)] gap-x-6 gap-y-6 ${showCvd ? 'grid-cols-1 @sm:grid-cols-2 @3xl:grid-cols-3 @4xl:flex-1' : 'min-h-40 flex-1 grid-cols-1'}`}>
            {CB_TYPES.filter((type) => showCvd || type.id === 'normal').map((type) => (
              <div key={type.id} className='flex min-h-20 min-w-0 flex-col gap-2'>
                {showCvd && (
                  <span className={TYPE.meta}>{type.id === 'normal' ? 'Original' : type.name}</span>
                )}
                <div
                  role='img'
                  aria-label={
                    type.id === 'normal' ? 'Gradient preview' : `${type.name} gradient preview`
                  }
                  className='min-h-12 flex-1 overflow-hidden rounded-md'
                  style={{ background: buildPreviewCss(g, interpSpace, type.id) }}
                />
              </div>
            ))}
          </div>

          {/* Draggable stop bar — Phase 1.1 */}
          <div className='shrink-0 pt-4'>
            <GradientStopBar
              stops={g.stops}
              selectedStop={g.selectedStop}
              gradientCss={css}
              onSelectStop={(index) => {
                setGrad({ selectedStop: index });
                setPanel('stops');
              }}
              onMoveStop={handleMoveStop}
              onAddStop={handleAddStop}
              onRemoveStop={handleRemoveStop}
            />
          </div>

          {/* CSS output */}
          <div className='flex shrink-0 flex-wrap items-center justify-between gap-2'>
            <span className={TYPE.label}>CSS output</span>
            <Button
              variant='outline'
              size='xs'
              onClick={() => {
                void copyCss();
              }}>
              {copied ? <Check className='size-3' /> : <Copy className='size-3' />}
              {copied ? 'Copied' : 'Copy CSS'}
            </Button>
          </div>
          <pre
            className={`shrink-0 rounded-md border border-border bg-secondary p-3 wrap-break-word whitespace-pre-wrap ${TYPE.mono}`}>{`background: ${css};`}</pre>
        </div>

        {/* Side panel */}
        <div className='flex min-h-0 min-w-0 flex-col gap-4 border-t border-border p-4 @4xl:overflow-auto @4xl:border-t-0 @4xl:border-l'>
          <ToolTabs
            value={panel}
            onValueChange={setPanel}
            label='Gradient controls'
            stretch
            items={[
              { id: 'gradient', label: 'Gradient' },
              { id: 'stops', label: 'Stops' },
              { id: 'presets', label: 'Presets' },
            ]}
          />
          {panel === 'stops' && (
            <Button variant='outline' size='sm' disabled={!slots.length} onClick={loadFromPalette}>
              <Plus className='size-3.5' />
              Use palette stops
            </Button>
          )}
          {panel === 'gradient' && (
            <>
              {/* Type */}
              <div>
                <div className='mb-2.5 font-display text-[10px] font-semibold tracking-widest text-muted-foreground uppercase'>
                  Type
                </div>
                <ToolSegments
                  value={g.type}
                  label='Gradient type'
                  items={[
                    { id: 'linear', label: 'Linear' },
                    { id: 'radial', label: 'Radial' },
                    { id: 'conic', label: 'Conic' },
                  ]}
                  onValueChange={(type: GradientType) =>
                    setGrad({
                      type,
                      dir: type === 'conic' ? 'from 0deg' : type === 'linear' ? 'to right' : g.dir,
                    })
                  }
                />
              </div>

              {/* Direction (linear only) */}
              {g.type === 'linear' && (
                <div>
                  <div className='mb-2.5 font-display text-[10px] font-semibold tracking-widest text-muted-foreground uppercase'>
                    Direction
                  </div>
                  <div className='flex flex-wrap gap-1'>
                    {DIRECTIONS.map(({ label, val, icon: Icon }) => (
                      <Button
                        key={val}
                        variant={g.dir === val ? 'default' : 'ghost'}
                        size='icon-sm'
                        title={label}
                        aria-label={label}
                        aria-pressed={g.dir === val}
                        onClick={() => setGrad({ dir: val })}>
                        <Icon className='size-4' />
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Conic from angle */}
              {g.type === 'conic' && (
                <div>
                  <div className='mb-2.5 font-display text-[10px] font-semibold tracking-widest text-muted-foreground uppercase'>
                    Starting Angle
                  </div>
                  <input
                    type='number'
                    aria-label='Starting angle'
                    min={0}
                    max={360}
                    value={parseFloat(g.dir.replace('from ', '')) || 0}
                    onChange={(event) =>
                      setGrad({ dir: `from ${clamp(Number(event.target.value), 0, 360)}deg` })
                    }
                    className='h-8 w-full rounded border border-border bg-muted px-2 font-mono text-xs outline-none focus:border-ring'
                  />
                </div>
              )}
            </>
          )}

          {/* Selected stop editor */}
          {panel === 'stops' && (
            <div className='flex flex-col gap-3'>
              <div className='flex flex-wrap gap-2' aria-label='Select gradient stop'>
                {g.stops.map((stop, index) => (
                  <button
                    key={index}
                    type='button'
                    aria-label={`Select stop ${index + 1}`}
                    aria-pressed={g.selectedStop === index}
                    title={`Stop ${index + 1}: ${stop.hex} at ${stop.pos}%`}
                    onClick={() => setGrad({ selectedStop: index })}
                    className={`size-8 shrink-0 cursor-pointer rounded-sm border border-border outline-none focus-visible:ring-2 focus-visible:ring-ring ${g.selectedStop === index ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
                    style={{ background: stop.value ? renderColor(stop.value).css : stop.hex }}
                  />
                ))}
              </div>
              <div className='mb-2.5 font-display text-[10px] font-semibold tracking-widest text-muted-foreground uppercase'>
                Selected Stop ({g.selectedStop + 1} of {g.stops.length})
              </div>
              <div className='mb-2.5 flex items-center gap-2'>
                <input
                  type='color'
                  aria-label='Selected stop color picker'
                  value={selectedStop?.hex ?? '#ffffff'}
                  onChange={(event) => handleStopColor(event.target.value)}
                  className='size-9 shrink-0 cursor-pointer rounded-sm border border-border bg-transparent p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0'
                />
                <input
                  key={`${g.selectedStop}-${JSON.stringify(selectedStop?.value ?? selectedStop?.hex)}`}
                  aria-label='Selected stop hex'
                  className='w-full rounded border border-border bg-muted px-2 py-1.5 font-mono text-[12px] tracking-[.06em] text-foreground transition-colors outline-none placeholder:text-muted-foreground focus:border-ring'
                  defaultValue={
                    selectedStop?.value &&
                    (selectedStop.value.display !== 'srgb' || selectedStop.value.alpha < 1)
                      ? renderColor(selectedStop.value).css
                      : (selectedStop?.hex ?? '')
                  }
                  onBlur={(event) => {
                    handleStopColor(event.target.value);
                    try {
                      const color = colorToStop(parseColor(event.target.value));
                      event.target.value =
                        color.value?.display === 'srgb' && color.value.alpha === 1
                          ? color.hex
                          : (color.css ?? color.hex);
                    } catch {
                      event.target.value = selectedStop?.hex ?? '';
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') event.currentTarget.blur();
                  }}
                  maxLength={200}
                  spellCheck={false}
                  autoComplete='off'
                />
              </div>
              <div className='flex items-center justify-between gap-3 text-[11px] text-muted-foreground'>
                <label htmlFor='gradient-stop-position'>Position (%)</label>
                <input
                  id='gradient-stop-position'
                  type='number'
                  min={0}
                  max={100}
                  step={0.1}
                  value={selectedStop?.pos ?? 0}
                  onChange={(event) => {
                    if (event.target.value !== '')
                      handleMoveStop(g.selectedStop, clamp(Number(event.target.value), 0, 100));
                  }}
                  className='h-8 w-20 rounded border border-border bg-muted px-2 font-mono text-xs text-foreground outline-none focus:border-ring'
                />
              </div>
              <input
                type='range'
                aria-label='Selected stop position'
                className='w-full'
                min={0}
                max={100}
                step={0.1}
                value={selectedStop?.pos ?? 0}
                onChange={(e) => handleMoveStop(g.selectedStop, +e.target.value)}
              />
              <div className='mt-2 flex items-center justify-between gap-2'>
                <Button
                  variant='ghost'
                  size='xs'
                  onClick={() => handleAddStop(clamp((selectedStop?.pos ?? 40) + 10, 0, 100))}>
                  <Plus className='size-3' />
                  Add stop
                </Button>
                <Button
                  variant='ghost'
                  size='icon-xs'
                  disabled={g.stops.length <= 2}
                  title='Remove selected stop'
                  aria-label='Remove selected stop'
                  onClick={() => handleRemoveStop(g.selectedStop)}>
                  <Trash2 className='size-3' />
                </Button>
              </div>
            </div>
          )}

          {/* Interpolation space */}
          {panel === 'gradient' && (
            <div>
              <div className='mb-2.5 font-display text-[10px] font-semibold tracking-widest text-muted-foreground uppercase'>
                Interpolation Space
              </div>
              <ToolSegments
                value={interpSpace}
                onValueChange={setInterpSpace}
                label='Interpolation space'
                items={[
                  { id: 'srgb', label: 'sRGB', title: 'Standard RGB interpolation' },
                  { id: 'oklab', label: 'OKLab', title: 'Perceptually uniform interpolation' },
                  { id: 'oklch', label: 'OKLCH', title: 'Hue-aware interpolation' },
                ]}
              />
            </div>
          )}

          {/* Easing */}
          {panel === 'stops' && (
            <div className='flex flex-col gap-3 border-t border-border pt-4'>
              <div className='flex flex-col gap-1.5'>
                <div className={TYPE.label}>Stop distribution</div>
                <span className={TYPE.meta}>
                  {EASING_OPTIONS.find((option) => option.id === easing)?.label ??
                    'Custom positions'}
                </span>
              </div>
              <div
                role='group'
                aria-label='Stop distribution easing'
                className='flex flex-col gap-4'>
                <div className='grid grid-cols-3 gap-2'>
                  {EASING_OPTIONS.filter(
                    (option) => option.group === 'Uniform' || option.group === 'Weighted',
                  ).map((option) => (
                    <EasingChoice
                      key={option.id}
                      option={option}
                      caption={
                        option.id === 'linear'
                          ? 'Even'
                          : option.id === 'front-loaded'
                            ? 'Front'
                            : 'Back'
                      }
                      selected={easing === option.id}
                      disabled={g.stops.length < 3}
                      onSelect={(mode) => {
                        setEasing(mode);
                        setGrad(redistributeGradientStops(g, mode));
                      }}
                    />
                  ))}
                </div>
                <div className='flex flex-col gap-2'>
                  <div className='grid grid-cols-[4rem_minmax(0,1fr)] gap-2'>
                    <span />
                    <div className='grid grid-cols-3 gap-1.5 text-center text-[9px] font-semibold text-muted-foreground'>
                      <span>In</span>
                      <span>Out</span>
                      <span>In-Out</span>
                    </div>
                  </div>
                  {[
                    ...new Set(
                      EASING_OPTIONS.filter(
                        (option) => option.group !== 'Uniform' && option.group !== 'Weighted',
                      ).map((option) => option.group),
                    ),
                  ].map((group) => {
                    const options = EASING_OPTIONS.filter((option) => option.group === group);
                    return (
                      <div
                        key={group}
                        className='grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-2'>
                        <span className='text-[10px] text-muted-foreground'>{group}</span>
                        <div
                          role='group'
                          aria-label={`${group} easing`}
                          className='grid grid-cols-3 gap-1.5'>
                          {options.map((option) => (
                            <EasingChoice
                              key={option.id}
                              option={option}
                              selected={easing === option.id}
                              disabled={g.stops.length < 3}
                              onSelect={(mode) => {
                                setEasing(mode);
                                setGrad(redistributeGradientStops(g, mode));
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Presets */}
          {panel === 'presets' && (
            <div>
              <div className='mb-2.5 font-display text-[10px] font-semibold tracking-widest text-muted-foreground uppercase'>
                Presets
              </div>
              <div className='grid grid-cols-2 gap-2'>
                {GRAD_PRESETS.map((p, i) => (
                  <button
                    key={i}
                    className='flex min-w-0 cursor-pointer flex-col gap-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring'
                    onClick={() => {
                      setEasing('custom');
                      setGrad({
                        ...p,
                        stops: p.stops.map((s) => ({ ...s })),
                        selectedStop: 0,
                      });
                    }}>
                    <span
                      className='h-8 w-full shrink-0 rounded-md border border-border'
                      style={{
                        background: buildCss({
                          ...p,
                          stops: p.stops,
                          selectedStop: 0,
                        }),
                      }}
                    />
                    <span className={`truncate ${TYPE.meta}`}>{p.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
