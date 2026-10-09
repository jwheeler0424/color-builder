/**
 * score.view.tsx  — Phase 1 merge
 *
 * Combines: palette-scoring + palette-comparison-view
 * Sub-tabs:  [Score] [Compare]
 */

import { useNavigate } from '@tanstack/react-router';
import { ArrowDownToLine, ArrowLeftRight } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';

import type { SavedPalette } from '@/types';

import { Chart } from '@/components/ui/chart';
import { NativeSelect } from '@/components/ui/select';
import { useChromaStore } from '@/hooks/use-chroma-store';
import {
  BLACK_XYZ,
  OKLAB,
  WHITE_XYZ,
  contrastRatio,
  hexToStop,
  parseColor,
  paletteContrastPairs,
  paletteVisionPairs,
  scorePalette,
  textColor,
  xyzToLch,
  wcagLevel,
} from '@/lib/engine/browser';
import { createCompareChart, createScoreChart, scoreLevelColor } from '@/lib/tools/palette-charts';
import { loadSaved } from '@/lib/utils';

import { ToolButton as Button, ToolTabs, SECTION_LABEL, TYPE, ViewHeader } from './view-ui';

// ─── Shared helpers ───────────────────────────────────────────────────────────

function TabBar({
  active,
  setActive,
}: {
  active: 'score' | 'compare';
  setActive: (t: 'score' | 'compare') => void;
}) {
  return (
    <ToolTabs
      value={active}
      onValueChange={setActive}
      label='Score and compare'
      items={[
        { id: 'score', label: 'Score' },
        { id: 'compare', label: 'Compare' },
      ]}
    />
  );
}

// ─── Shared visuals ───────────────────────────────────────────────────────────

function verdict(v: number) {
  return v >= 75 ? 'Strong palette' : v >= 50 ? 'Solid, with room to grow' : 'Needs work';
}

function ScoreRing({ value, size = 'lg' }: { value: number; size?: 'lg' | 'md' | 'sm' }) {
  const color = scoreLevelColor(value);
  const outer = { lg: 'h-20 w-20', md: 'h-24 w-24', sm: 'h-14 w-14' }[size];
  const inner = { lg: 'h-17 w-17', md: 'h-19 w-19', sm: 'h-10 w-10' }[size];
  const tabletOuter = size === 'lg' ? '@xl:h-20 @xl:w-20 @5xl:h-28 @5xl:w-28' : '';
  const tabletInner = size === 'lg' ? '@xl:h-17 @xl:w-17 @5xl:h-24 @5xl:w-24' : '';
  return (
    <div
      className={`grid shrink-0 place-items-center rounded-full ${outer} ${tabletOuter}`}
      style={{ background: `conic-gradient(${color} ${value * 3.6}deg, var(--muted) 0deg)` }}
      role='img'
      aria-label={`Overall score ${value} out of 100`}>
      <div className={`grid place-items-center rounded-full bg-card ${inner} ${tabletInner}`}>
        {size === 'lg' ? (
          <div className='text-center'>
            <div
              className='font-display text-[24px] leading-none font-extrabold @xl:text-[24px] @5xl:text-[28px]'
              style={{ color }}>
              {value}
            </div>
          </div>
        ) : (
          <span
            className={`font-display leading-none font-extrabold ${size === 'md' ? 'text-[28px]' : 'text-sm'}`}
            style={{ color }}>
            {value}
          </span>
        )}
      </div>
    </div>
  );
}

function ScoreBar({ value, color, dim = false }: { value: number; color: string; dim?: boolean }) {
  return (
    <div className='h-2 overflow-hidden rounded-full bg-input'>
      <div
        className='h-full rounded-full transition-[width] duration-500 ease-out'
        style={{
          width: `${Math.max(0, Math.min(100, value))}%`,
          background: color,
          opacity: dim ? 0.55 : 1,
        }}
      />
    </div>
  );
}

// ─── Sub-tab: Score ───────────────────────────────────────────────────────────

const SCALE_BANDS = [
  { from: 0, to: 50, label: 'Weak', color: 'var(--destructive)' },
  { from: 50, to: 75, label: 'Fair', color: 'var(--warning)' },
  { from: 75, to: 100, label: 'Strong', color: 'var(--success)' },
];

/** Where a 0–100 score sits on the weak / fair / strong scale */
function ScaleMeter({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className='flex flex-col gap-1.5'>
      <div className='relative flex h-2 gap-0.5'>
        {SCALE_BANDS.map((b) => (
          <div
            key={b.label}
            className='h-full rounded-full'
            style={{
              width: `${b.to - b.from}%`,
              background: b.color,
              opacity: v >= b.from ? 1 : 0.25,
            }}
          />
        ))}
        <div
          className='absolute top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground transition-[left] duration-500 ease-out'
          style={{ left: `${v}%` }}
        />
      </div>
      <div className={`flex ${TYPE.meta}`}>
        {SCALE_BANDS.map((b) => {
          const active = v >= b.from && (v < b.to || b.to === 100);
          return (
            <span
              key={b.label}
              style={{
                width: `${b.to - b.from}%`,
                color: active ? 'var(--foreground)' : 'var(--muted-foreground)',
              }}>
              {b.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
function ScoreTab() {
  const slots = useChromaStore((s) => s.slots);
  const colors = useMemo(
    () => slots.map((slot) => (slot.color.value ?? parseColor(slot.color.hex)).xyz),
    [slots],
  );
  const score = useMemo(() => scorePalette(colors), [colors]);
  const contrastPairs = useMemo(() => paletteContrastPairs(colors), [colors]);
  const visionPairs = useMemo(() => paletteVisionPairs(colors), [colors]);

  if (!slots.length) return <EmptyState />;

  const { balance, accessibility, harmony, uniqueness, overall } = score;
  // Same names and order as the radar axes (top, right, bottom, left) so the two read together
  const feedback = [
    {
      label: 'Balance',
      measures: 'How evenly hues are spread around the color wheel',
      value: balance,
      note:
        balance >= 75
          ? 'Well-distributed hues across the spectrum.'
          : balance >= 50
            ? 'Hues are somewhat clustered. Try a triadic or square harmony.'
            : 'Very clustered hues. Consider widening the hue spread.',
    },
    {
      label: 'Accessibility',
      measures: 'Share of colors that reach AA text contrast on white or black',
      value: accessibility,
      note:
        accessibility >= 75
          ? 'Most colors support readable text on white or black — great for UI use.'
          : accessibility >= 40
            ? 'Some colors support AA text. Consider adding lighter or darker tones.'
            : 'Few colors pass AA text contrast. Add a very light or very dark color.',
    },
    {
      label: 'Harmony',
      measures: 'How consistent vividness (chroma) is across the palette',
      value: harmony,
      note:
        harmony >= 75
          ? 'Chroma is consistent — palette feels cohesive and balanced.'
          : harmony >= 50
            ? 'Moderate chroma variation. Can work well for expressive palettes.'
            : 'High chroma variance. Mix vivid and muted tones more intentionally.',
    },
    {
      label: 'Uniqueness',
      measures: 'How distinct the colors are from one another',
      value: uniqueness,
      note:
        uniqueness >= 75
          ? 'Colors are very distinct from each other — excellent for labeling.'
          : uniqueness >= 40
            ? 'Moderate distinctiveness.'
            : 'Colors are perceptually similar. Increasing lightness or hue spread will help.',
    },
  ];
  const ranked = [...feedback].sort((a, b) => b.value - a.value);
  const levelName = (v: number) => (v >= 75 ? 'Strong' : v >= 50 ? 'Fair' : 'Weak');

  return (
    <div className='@container flex min-h-0 flex-1 scrollbar-gutter-stable flex-col overflow-auto'>
      {/* The palette itself is already previewed in the side panel, so it isn't repeated here. */}
      <div className='contents @7xl:grid @7xl:min-h-min @7xl:flex-1 @7xl:grid-cols-3 @7xl:grid-rows-[minmax(min-content,1fr)_auto_minmax(min-content,1fr)] @7xl:gap-x-6 @7xl:gap-y-[clamp(0.375rem,1vh,0.75rem)] @7xl:pt-[clamp(0.75rem,2vh,1.5rem)] @7xl:pb-[clamp(0.75rem,2vh,1.5rem)]'>
        <div className='grid grid-cols-1 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]! @min-[35rem]:grid-cols-[minmax(0,1fr)_minmax(17rem,1fr)] @min-[48rem]:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] @7xl:contents'>
          <section className='tool-panel-space grid grid-cols-1 gap-x-4 gap-y-8 @min-[48rem]:col-span-2 @min-[48rem]:grid-cols-[minmax(0,4fr)_minmax(0,6fr)] @min-[48rem]:items-stretch @min-[48rem]:gap-x-6 @min-[48rem]:gap-y-4 @min-[48rem]:border-b @min-[48rem]:border-border @5xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] @5xl:items-center @5xl:gap-8 @7xl:col-span-1 @7xl:col-start-1 @7xl:row-start-1 @7xl:grid-cols-1 @7xl:items-start @7xl:gap-y-6 @7xl:border-b-0'>
            <div className='flex min-w-0 items-center gap-4 @5xl:justify-center @5xl:gap-6 @7xl:justify-start'>
              <ScoreRing value={overall} size='lg' />
              <div className='flex min-w-0 flex-col gap-2 @5xl:self-center @7xl:self-start'>
                <div className={TYPE.label}>Overall score</div>
                <div className={`${TYPE.title} xl:text-[16px] @5xl:text-[18px]`}>
                  {verdict(overall)}
                </div>
                <div className={TYPE.meta}>Equal-weight average across 4 dimensions</div>
              </div>
            </div>

            <div className='flex min-w-0 flex-col justify-center gap-4 @xl:grid @xl:grid-cols-1 @xl:content-start @min-[48rem]:self-stretch @5xl:gap-6 @7xl:flex @7xl:flex-col @7xl:justify-start @7xl:gap-6'>
              <div className='flex min-w-0 flex-col gap-4 @7xl:mx-0 @7xl:w-full @7xl:max-w-none @7xl:border-l-0 @7xl:pl-0'>
                <div className='flex items-baseline justify-between gap-3'>
                  <div className={TYPE.label}>Score range</div>
                  <div className={`${TYPE.title} min-w-0 truncate`}>0 – 100</div>
                </div>
                <ScaleMeter value={overall} />
              </div>

              <div className='grid min-w-0 grid-cols-2 gap-4 @5xl:grid-cols-2 @5xl:gap-4 @7xl:mx-0 @7xl:w-full @7xl:max-w-none @7xl:border-l-0 @7xl:pl-0'>
                {[
                  { label: 'Strongest', dimension: ranked[0] },
                  { label: 'Needs attention', dimension: ranked[ranked.length - 1] },
                ].map(({ label, dimension }) => (
                  <div key={label} className='flex min-w-0 flex-col gap-1'>
                    <span className={TYPE.label}>{label}</span>
                    <span className={`${TYPE.title} min-w-0 truncate`}>{dimension.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className='tool-panel-space tool-panel-stack flex min-w-0 flex-col xl:col-start-2 xl:row-start-2 @min-[48rem]:self-start @7xl:col-start-3 @7xl:row-start-1 @7xl:self-stretch @7xl:border-l @7xl:border-border'>
            <div className='flex flex-wrap items-baseline justify-between gap-2'>
              <div className={TYPE.label}>Score profile</div>
              <div className={TYPE.mono}>0 – 100</div>
            </div>
            <div className='flex min-w-0 flex-1 items-center justify-center'>
              <div className='aspect-square w-full max-w-64 lg:max-w-72! xl:max-w-96! @min-[35rem]:max-w-56 @min-[40rem]:max-w-64 @min-[48rem]:max-w-80 @7xl:max-w-[clamp(14rem,26vh,20rem)]!'>
                <Chart
                  initialWidth={320}
                  height={320}
                  className='h-full w-full font-display'
                  definition={createScoreChart({ balance, accessibility, harmony, uniqueness })}
                  ariaLabel={`Palette scores: balance ${balance}, accessibility ${accessibility}, harmony ${harmony}, uniqueness ${uniqueness} out of 100`}
                  style={{ height: '100%' }}
                />
              </div>
            </div>
          </section>

          <section className='tool-panel-space flex min-w-0 flex-col border-t border-border xl:col-span-1 xl:col-start-1 xl:row-start-2 @min-[35rem]:col-span-2 @min-[48rem]:col-span-1 @min-[48rem]:border-t-0 @7xl:col-span-1 @7xl:col-start-2 @7xl:row-start-1 @7xl:border-l @7xl:border-border'>
            <div className='flex flex-wrap items-baseline justify-between gap-2'>
              <div className={TYPE.label}>Dimensions</div>
              <div className={TYPE.meta}>4 dimensions</div>
            </div>
            <div className='grid grid-cols-1 gap-x-6 gap-y-3 @min-[35rem]:grid-cols-2'>
              {feedback.map(({ label, measures, value, note }) => (
                <div
                  key={label}
                  className='flex min-w-0 flex-col gap-2 border-b border-border py-3 last:border-b-0 @min-[35rem]:gap-1 @min-[35rem]:border-0 @min-[35rem]:py-2 @xl:gap-4 @xl:py-5 @min-[48rem]:py-1.5'>
                  <div className='flex min-w-0 flex-col gap-1'>
                    <div className={TYPE.title}>{label}</div>
                    <div className={TYPE.meta}>{measures}</div>
                  </div>
                  <div className='flex min-w-0 items-center justify-between gap-3'>
                    <span
                      className={`shrink-0 ${TYPE.label}`}
                      style={{ color: scoreLevelColor(value) }}>
                      {levelName(value)}
                    </span>
                    <span
                      className={`${TYPE.label} shrink-0 tabular-nums`}
                      style={{ color: scoreLevelColor(value) }}>
                      {value}
                    </span>
                  </div>
                  <ScoreBar value={value} color={scoreLevelColor(value)} />
                  <p className={TYPE.body}>{note}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
        <div
          aria-hidden='true'
          className='hidden border-t border-border @7xl:col-span-3 @7xl:row-start-2 @7xl:block'
        />
        <div className='grid min-w-0 grid-cols-1 gap-y-5 xl:grid-cols-2 xl:items-start xl:gap-x-6 xl:gap-y-6 xl:border-t xl:border-border xl:pt-6 @7xl:contents'>
          <section className='tool-panel-space tool-panel-stack @container/color-detail col-span-full flex min-w-0 flex-col border-t border-border xl:col-span-1 xl:col-start-1 xl:row-start-1 xl:self-start xl:border-t-0 @7xl:col-span-1 @7xl:col-start-1 @7xl:row-start-3 @7xl:self-stretch'>
            <div className='flex flex-wrap items-baseline justify-between gap-2'>
              <div className={TYPE.label}>Color detail</div>
              <div className={TYPE.meta}>OKLCH and text contrast on white / black</div>
            </div>
            <div className='grid grid-cols-1 gap-x-6 gap-y-3 xl:hidden @min-[32rem]/color-detail:hidden'>
              {slots.map((slot, index) => {
                const xyz = colors[index]!;
                const { l, c, h } = xyzToLch(OKLAB, xyz);
                const onWhite = contrastRatio(xyz, WHITE_XYZ);
                const onBlack = contrastRatio(xyz, BLACK_XYZ);
                return (
                  <div
                    key={slot.id}
                    className='grid grid-cols-[4.5rem_minmax(0,1fr)] items-stretch gap-x-6 gap-y-1 border-b border-border py-2'>
                    <div className='flex min-w-0 flex-col items-center justify-between'>
                      <span
                        aria-hidden='true'
                        className='block size-16.5 shrink-0 rounded-sm border border-border'
                        style={{ background: slot.color.hex }}
                      />
                      <span className={`${TYPE.title} font-mono whitespace-nowrap`}>
                        {slot.color.hex.toUpperCase()}
                      </span>
                    </div>
                    <div className='flex min-w-0 flex-col gap-2'>
                      <div className='grid grid-cols-3 gap-2'>
                        {[
                          { label: 'L', value: `${(l * 100).toFixed(1)}%` },
                          { label: 'C', value: c.toFixed(3) },
                          { label: 'H', value: `${Math.round(h)}°` },
                        ].map(({ label, value }) => (
                          <div key={label} className='flex min-w-0 flex-col gap-0.5'>
                            <span className={TYPE.meta}>{label}</span>
                            <span
                              className={`${TYPE.title} font-mono whitespace-nowrap tabular-nums`}>
                              {value}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className='grid grid-cols-2 gap-6 border-t border-muted pt-2'>
                        {[
                          { label: 'On white', ratio: onWhite },
                          { label: 'On black', ratio: onBlack },
                        ].map(({ label, ratio }) => (
                          <div key={label} className='flex min-w-0 flex-col gap-1'>
                            <span className={TYPE.meta}>{label}</span>
                            <div className='flex min-w-0 flex-wrap items-baseline justify-between gap-x-1'>
                              <span className={`${TYPE.title} font-mono whitespace-nowrap`}>
                                {ratio.toFixed(2)}:1
                              </span>
                              <span className={TYPE.meta}>{wcagLevel(ratio)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className='hidden overflow-x-auto xl:block @min-[32rem]/color-detail:block'>
              <table className='w-full min-w-0 table-fixed border-collapse text-left text-[11px]'>
                <thead>
                  <tr className='border-b border-border text-muted-foreground'>
                    <th scope='col' className='w-[24%] py-2 pr-2 font-medium'>
                      Color
                    </th>
                    <th scope='col' className='w-[10%] px-1 py-2 text-right font-medium'>
                      L
                    </th>
                    <th scope='col' className='w-[10%] px-1 py-2 text-right font-medium'>
                      C
                    </th>
                    <th scope='col' className='w-[10%] px-1 py-2 text-right font-medium'>
                      H
                    </th>
                    <th scope='col' className='w-[23%] px-1 py-2 text-right font-medium'>
                      On white
                    </th>
                    <th scope='col' className='w-[23%] py-2 pl-1 text-right font-medium'>
                      On black
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot, index) => {
                    const xyz = colors[index]!;
                    const { l, c, h } = xyzToLch(OKLAB, xyz);
                    const onWhite = contrastRatio(xyz, WHITE_XYZ);
                    const onBlack = contrastRatio(xyz, BLACK_XYZ);
                    return (
                      <tr key={slot.id} className='border-b border-muted last:border-0'>
                        <th
                          scope='row'
                          aria-label={`Color ${index + 1}: ${slot.color.hex.toUpperCase()}`}
                          className='py-2 pr-2 font-normal'>
                          <span className='inline-flex items-center gap-1.5'>
                            <span
                              aria-hidden='true'
                              className='size-4 shrink-0 rounded-sm border border-border'
                              style={{ background: slot.color.hex }}
                            />
                            <span className={`${TYPE.mono} whitespace-nowrap`}>
                              {slot.color.hex.toUpperCase()}
                            </span>
                          </span>
                        </th>
                        <td
                          className={`${TYPE.mono} px-1 py-2 text-right whitespace-nowrap tabular-nums`}>
                          {(l * 100).toFixed(1)}%
                        </td>
                        <td
                          className={`${TYPE.mono} px-1 py-2 text-right whitespace-nowrap tabular-nums`}>
                          {c.toFixed(3)}
                        </td>
                        <td
                          className={`${TYPE.mono} px-1 py-2 text-right whitespace-nowrap tabular-nums`}>
                          {Math.round(h)}°
                        </td>
                        {[
                          { side: 'white', ratio: onWhite, label: wcagLevel(onWhite) },
                          { side: 'black', ratio: onBlack, label: wcagLevel(onBlack) },
                        ].map(({ side, ratio, label }) => (
                          <td key={side} className='px-1 py-2 text-right'>
                            <div className='flex flex-col items-end gap-0.5'>
                              <span className={`${TYPE.mono} whitespace-nowrap`}>
                                {ratio.toFixed(2)}:1
                              </span>
                              <span className={`${TYPE.meta} whitespace-nowrap`}>{label}</span>
                            </div>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className='tool-panel-space tool-panel-stack flex min-w-0 flex-col border-t border-border xl:col-span-2 xl:row-start-2 xl:border-t @7xl:col-span-1 @7xl:col-start-3 @7xl:row-start-3 @7xl:border-t-0 @7xl:border-l @7xl:border-border'>
            <div className='flex flex-wrap items-baseline justify-between gap-2'>
              <div className={TYPE.label}>Pair contrast</div>
              <div className={TYPE.meta}>WCAG text contrast ratios · opaque color pairs</div>
            </div>
            {slots.length < 2 ? (
              <p className={TYPE.body}>Add at least two colors to compare contrast.</p>
            ) : (
              <>
                <div className='@min-[35rem]:hidden'>
                  <ul className='divide-y divide-border'>
                    {contrastPairs.map(({ firstIndex, secondIndex, ratio, level }) => {
                      const first = slots[firstIndex]!;
                      const second = slots[secondIndex]!;
                      return (
                        <li
                          key={`${first.id}-${second.id}`}
                          className='grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-2.5'>
                          <div className='flex min-w-0 items-center gap-1'>
                            <span className='inline-flex min-w-0 items-center gap-1'>
                              <span
                                aria-hidden='true'
                                className='size-3.5 shrink-0 rounded-sm border border-border'
                                style={{ background: first.color.hex }}
                              />
                              <span className={`${TYPE.mono} truncate`}>
                                {first.color.hex.toUpperCase()}
                              </span>
                            </span>
                            <ArrowLeftRight
                              aria-hidden='true'
                              className='mx-0.5 size-3.5 shrink-0 text-muted-foreground'
                            />
                            <span className='sr-only'>and</span>
                            <span className='inline-flex min-w-0 items-center gap-1'>
                              <span
                                aria-hidden='true'
                                className='size-3.5 shrink-0 rounded-sm border border-border'
                                style={{ background: second.color.hex }}
                              />
                              <span className={`${TYPE.mono} truncate`}>
                                {second.color.hex.toUpperCase()}
                              </span>
                            </span>
                          </div>
                          <span className='shrink-0 text-right'>
                            <span className={TYPE.mono}>{ratio.toFixed(2)}:1</span>{' '}
                            <span className={TYPE.meta}>{level}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div className='hidden overflow-x-auto @min-[35rem]:block'>
                  <table className='w-full min-w-0 border-collapse text-center text-[11px]'>
                    <caption className='sr-only'>
                      WCAG contrast ratio for each palette color pair
                    </caption>
                    <thead>
                      <tr>
                        <th scope='col' className='w-12 p-1 text-muted-foreground'>
                          #
                        </th>
                        {slots.map((slot, index) => (
                          <th
                            key={slot.id}
                            scope='col'
                            aria-label={`Color ${index + 1}: ${slot.color.hex.toUpperCase()}`}
                            className='min-w-12 p-1 font-normal'>
                            <span className='flex flex-col items-center gap-1'>
                              <span
                                aria-hidden='true'
                                className='size-5 rounded-sm border border-border'
                                style={{ background: slot.color.hex }}
                              />
                              <span className={TYPE.mono}>{index + 1}</span>
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {slots.map((row, rowIndex) => (
                        <tr key={row.id}>
                          <th
                            scope='row'
                            aria-label={`Color ${rowIndex + 1}: ${row.color.hex.toUpperCase()}`}
                            className='p-1 text-left font-normal'>
                            <span className='inline-flex items-center gap-1.5'>
                              <span
                                aria-hidden='true'
                                className='size-4 rounded-sm border border-border'
                                style={{ background: row.color.hex }}
                              />
                              <span className={TYPE.mono}>{rowIndex + 1}</span>
                            </span>
                          </th>
                          {slots.map((column, columnIndex) => {
                            if (rowIndex === columnIndex)
                              return (
                                <td key={column.id} className='p-1 text-muted-foreground'>
                                  –
                                </td>
                              );
                            const pair = contrastPairs.find(
                              (item) =>
                                item.firstIndex === Math.min(rowIndex, columnIndex) &&
                                item.secondIndex === Math.max(rowIndex, columnIndex),
                            );
                            return (
                              <td
                                key={column.id}
                                aria-label={`${row.color.hex.toUpperCase()} and ${column.color.hex.toUpperCase()}: ${pair?.ratio.toFixed(2)} to 1, ${pair?.level}`}
                                className='p-1'>
                                <span className='block rounded-sm bg-muted px-1.5 py-1'>
                                  <span className={`${TYPE.mono} block`}>
                                    {pair?.ratio.toFixed(2)}:1
                                  </span>
                                  <span className={TYPE.meta}>{pair?.level}</span>
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <p className={TYPE.meta}>
              Normal text needs 4.5:1; large text and meaningful non-text graphics need 3:1. Check
              the actual text size, background, transparency, and UI state before relying on a
              result.
            </p>
          </section>

          <section className='tool-panel-space tool-panel-stack @container/vision flex min-w-0 flex-col border-t border-border xl:col-start-2 xl:row-start-1 xl:self-start xl:border-t-0 @7xl:col-span-1 @7xl:col-start-2 @7xl:row-start-3 @7xl:self-stretch @7xl:border-l @7xl:border-border'>
            <div className='flex flex-wrap items-baseline justify-between gap-2'>
              <div className={TYPE.label}>Color-vision distinction</div>
              <div className={TYPE.meta}>Closest pair · simulated appearance · ΔE00</div>
            </div>
            <div className='@xl/vision:hidden'>
              <ul className='divide-y divide-border'>
                {visionPairs.map((pair) => {
                  const name =
                    pair.vision === 'normal'
                      ? 'Typical vision'
                      : `${pair.vision[0]!.toUpperCase()}${pair.vision.slice(1)}`;
                  const first = pair.firstIndex === null ? null : slots[pair.firstIndex];
                  const second = pair.secondIndex === null ? null : slots[pair.secondIndex];
                  return (
                    <li key={pair.vision} className='py-4'>
                      <div className='flex items-baseline justify-between gap-2'>
                        <span className={TYPE.title}>{name}</span>
                        <span className={TYPE.mono}>
                          {pair.deltaE === null ? '—' : `ΔE00 ${pair.deltaE.toFixed(2)}`}
                        </span>
                      </div>
                      {first && second ? (
                        <div className='mt-3 flex flex-wrap items-center gap-x-2 gap-y-2'>
                          <span className='inline-flex items-center gap-1'>
                            <span
                              aria-hidden='true'
                              className='size-3.5 rounded-sm border border-border'
                              style={{ background: first.color.hex }}
                            />
                            <span className={TYPE.mono}>{first.color.hex.toUpperCase()}</span>
                          </span>
                          <ArrowLeftRight
                            aria-hidden='true'
                            className='mx-0.5 size-3.5 shrink-0 text-muted-foreground'
                          />
                          <span className='sr-only'>and</span>
                          <span className='inline-flex items-center gap-1'>
                            <span
                              aria-hidden='true'
                              className='size-3.5 rounded-sm border border-border'
                              style={{ background: second.color.hex }}
                            />
                            <span className={TYPE.mono}>{second.color.hex.toUpperCase()}</span>
                          </span>
                        </div>
                      ) : (
                        <span className={TYPE.meta}>Add another color</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className='hidden overflow-x-auto @xl/vision:block'>
              <table className='w-full min-w-120 border-collapse text-left text-[11px]'>
                <thead>
                  <tr className='border-b border-border text-muted-foreground'>
                    <th scope='col' className='py-3 pr-3 font-medium'>
                      Vision model
                    </th>
                    <th scope='col' className='px-3 py-3 font-medium'>
                      Closest colors
                    </th>
                    <th scope='col' className='py-3 pl-3 text-right font-medium'>
                      ΔE00
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visionPairs.map((pair) => {
                    const name =
                      pair.vision === 'normal'
                        ? 'Typical vision'
                        : `${pair.vision[0]!.toUpperCase()}${pair.vision.slice(1)}`;
                    const first = pair.firstIndex === null ? null : slots[pair.firstIndex];
                    const second = pair.secondIndex === null ? null : slots[pair.secondIndex];
                    return (
                      <tr key={pair.vision} className='border-b border-muted last:border-0'>
                        <th scope='row' className='py-3 pr-3 font-medium'>
                          {name}
                        </th>
                        <td className='px-3 py-3'>
                          {first && second ? (
                            <span className='inline-flex items-center gap-2'>
                              <span
                                aria-hidden='true'
                                className='size-4 rounded-sm border border-border'
                                style={{ background: first.color.hex }}
                              />
                              <span className={TYPE.mono}>{first.color.hex.toUpperCase()}</span>
                              <ArrowLeftRight
                                aria-hidden='true'
                                className='mx-1 size-3.5 shrink-0 text-muted-foreground'
                              />
                              <span className='sr-only'>and</span>
                              <span
                                aria-hidden='true'
                                className='size-4 rounded-sm border border-border'
                                style={{ background: second.color.hex }}
                              />
                              <span className={TYPE.mono}>{second.color.hex.toUpperCase()}</span>
                            </span>
                          ) : (
                            <span className={TYPE.meta}>Add another color</span>
                          )}
                        </td>
                        <td className={`${TYPE.mono} py-3 pl-3 text-right`}>
                          {pair.deltaE === null ? '—' : pair.deltaE.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className={TYPE.meta}>
              Lower ΔE00 means a smaller modeled difference. Simulations are estimates; there is no
              universal pass threshold, so use this to find pairs that may need a second visual cue.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-tab: Compare ─────────────────────────────────────────────────────────

function hueDist(a: number, b: number) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

function paletteStats(hexes: string[]) {
  const colors = hexes.map((hex) => parseColor(hex).xyz);
  const oklchs = colors.map((xyz) => {
    const { l, c, h } = xyzToLch(OKLAB, xyz);
    return { L: l, C: c, H: h };
  });
  const avgChroma = oklchs.reduce((s, c) => s + c.C, 0) / oklchs.length;
  const avgLight = oklchs.reduce((s, c) => s + c.L, 0) / oklchs.length;
  const hueSpread =
    oklchs.length < 2
      ? 0
      : (() => {
          let max = 0;
          for (let i = 0; i < oklchs.length; i++)
            for (let j = i + 1; j < oklchs.length; j++)
              max = Math.max(max, hueDist(oklchs[i].H, oklchs[j].H));
          return max;
        })();
  const aaAny = colors.filter(
    (xyz) => Math.max(contrastRatio(xyz, WHITE_XYZ), contrastRatio(xyz, BLACK_XYZ)) >= 4.5,
  ).length;
  return { avgChroma, avgLight, hueSpread, aaAny, total: hexes.length };
}

const SERIES = {
  a: { tag: 'A', color: 'var(--muted-foreground)' },
  b: { tag: 'B', color: 'var(--primary)' },
} as const;

function PaletteCard({
  side,
  value,
  options,
  onChange,
  palette,
  overall,
}: {
  side: 'a' | 'b';
  value: string;
  options: SavedPalette[];
  onChange: (id: string) => void;
  palette: SavedPalette;
  overall: number;
}) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const { tag, color } = SERIES[side];
  return (
    <section className='grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3'>
      <div className='flex min-w-0 items-center gap-2'>
        <span
          className='grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold text-background'
          style={{ background: color }}>
          {tag}
        </span>
        <div className='min-w-0'>
          <div className={SECTION_LABEL}>Palette {tag}</div>
          <div className='truncate text-sm font-semibold'>{palette.name}</div>
        </div>
      </div>
      <ScoreRing value={overall} size='sm' />
      <NativeSelect
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`Palette ${tag}`}
        containerClassName='col-span-full'
        className='text-xs'>
        {options.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} ({p.hexes.length} colors · {p.mode})
          </option>
        ))}
      </NativeSelect>
      <div className='col-span-full flex h-11 min-w-0 overflow-hidden rounded-sm border border-border'>
        {palette.hexes.map((hex, i) => (
          <button
            key={i}
            type='button'
            className='grid flex-1 cursor-pointer place-items-center border-0 p-0'
            style={{ background: hex }}
            title={`${hex.toUpperCase()} — click to copy`}
            aria-label={`Copy ${hex.toUpperCase()}`}
            onClick={() => {
              navigator.clipboard.writeText(hex).catch(() => {});
              setCopiedIdx(i);
              setTimeout(() => setCopiedIdx(null), 900);
            }}>
            {copiedIdx === i && (
              <span
                className='text-[10px] font-bold'
                style={{ color: textColor(parseColor(hex).xyz) }}>
                ✓
              </span>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}

interface ComparisonMetric {
  label: string;
  description: string;
  a: number;
  b: number;
  max: number;
  format: (v: number) => string;
  higherIsBetter?: boolean | null;
}

function CompareMetricCards({
  label,
  metrics,
  className,
  showScale = true,
}: {
  label: string;
  metrics: ComparisonMetric[];
  className: string;
  showScale?: boolean;
}) {
  return (
    <div role='list' aria-label={`${label} comparisons`} className={className}>
      {metrics.map((metric) => {
        const diff = metric.b - metric.a;
        const tie = Math.abs(diff) < metric.max * 0.005;
        const winner =
          metric.higherIsBetter === null || tie
            ? null
            : diff > 0 === (metric.higherIsBetter ?? true)
              ? 'b'
              : 'a';
        const result = winner
          ? `${SERIES[winner].tag} leads by ${metric.format(Math.abs(diff))}`
          : tie
            ? 'Even'
            : `Difference ${metric.format(Math.abs(diff))}`;

        return (
          <article
            key={metric.label}
            role='listitem'
            data-compare-metric-card
            className='min-w-0 py-3'>
            <div className='flex min-w-0 flex-wrap items-baseline justify-between gap-x-2 gap-y-1'>
              <h3 className='min-w-0 text-sm leading-snug font-semibold'>{metric.label}</h3>
              <span
                className='shrink-0 text-[10px] font-semibold'
                style={{
                  color: winner ? SERIES[winner].color : undefined,
                }}>
                {result}
              </span>
            </div>
            <p className='mt-1 text-xs leading-snug text-muted-foreground'>{metric.description}</p>
            <div className='mt-3 flex flex-col gap-2'>
              {(['a', 'b'] as const).map((side) => {
                const value = side === 'a' ? metric.a : metric.b;
                const isWinner = winner === side;
                return (
                  <div
                    key={side}
                    className='grid min-w-0 grid-cols-[1rem_minmax(0,1fr)_3.75rem] items-center gap-2'>
                    <span className='text-[11px] font-bold' style={{ color: SERIES[side].color }}>
                      {SERIES[side].tag}
                    </span>
                    <ScoreBar
                      value={(value / metric.max) * 100}
                      color={SERIES[side].color}
                      dim={!!winner && !isWinner}
                    />
                    <span
                      className='text-right font-mono text-sm tabular-nums'
                      style={{ fontWeight: isWinner ? 700 : 500 }}>
                      {metric.format(value)}
                    </span>
                  </div>
                );
              })}
            </div>
            {showScale && (
              <div className='mt-1.5 flex justify-between pr-17 pl-6 text-[9px] text-muted-foreground'>
                <span>0</span>
                <span>{metric.format(metric.max)}</span>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function CompareTab() {
  const slots = useChromaStore((s) => s.slots);
  const mode = useChromaStore((s) => s.mode);
  const loadPalette = useChromaStore((s) => s.loadPalette);
  const openModal = useChromaStore((s) => s.openModal);
  const navigate = useNavigate();
  const [saved, setSaved] = useState<SavedPalette[]>([]);
  const [selA, setSelA] = useState<string | null>(null);
  const [selB, setSelB] = useState<string | null>(null);

  useEffect(() => {
    const all = loadSaved();
    setSaved(all);
    if (all.length > 1) {
      setSelA(all[0].id);
      setSelB(all[1].id);
    } else if (all.length === 1) {
      setSelB(all[0].id);
    }
  }, []);

  const CURRENT: SavedPalette = useMemo(
    () => ({
      id: '__current__',
      name: 'Current Palette',
      hexes: slots.map((s) => s.color.hex),
      mode,
      createdAt: Date.now(),
    }),
    [slots, mode],
  );
  const options = [CURRENT, ...saved];
  const palA = options.find((p) => p.id === (selA ?? '__current__')) ?? CURRENT;
  const palB = options.find((p) => p.id === selB) ?? saved[0];
  const statsA = useMemo(() => (palA ? paletteStats(palA.hexes) : null), [palA]);
  const statsB = useMemo(() => (palB ? paletteStats(palB.hexes) : null), [palB]);
  const scoreA = useMemo(
    () => scorePalette((palA?.hexes ?? []).map((hex) => parseColor(hex).xyz)),
    [palA],
  );
  const scoreB = useMemo(
    () => scorePalette((palB?.hexes ?? []).map((hex) => parseColor(hex).xyz)),
    [palB],
  );

  if (saved.length === 0)
    return (
      <div className='tool-panel-space @container flex min-h-0 flex-1 overflow-auto'>
        <section className='my-auto w-full border-y border-border py-8 @xl:py-10'>
          <div className='max-w-xl'>
            <div className={SECTION_LABEL}>Compare palettes</div>
            <p className='mt-2 text-sm text-muted-foreground'>
              Save a palette to start a comparison.
            </p>
            <Button className='mt-5' onClick={() => openModal('save')}>
              Save current palette
            </Button>
          </div>
        </section>
      </div>
    );

  const load = (pal: SavedPalette) => {
    loadPalette(
      pal.hexes.map((h) => ({ id: crypto.randomUUID(), color: hexToStop(h), locked: false })),
      pal.mode,
      pal.hexes.length,
    );
    void navigate({ to: '/palette' });
  };
  const swap = () => {
    const a = selA ?? '__current__';
    setSelA(selB ?? saved[0]?.id ?? null);
    setSelB(a);
  };
  const pct = (v: number) => `${Math.round(v)}`;
  const scoreMetrics = [
    {
      label: 'Hue balance',
      description: 'Evenness of hue distribution around the wheel.',
      a: scoreA.balance,
      b: scoreB.balance,
      max: 100,
      format: pct,
    },
    {
      label: 'Accessibility',
      description: 'Text-contrast performance across colors.',
      a: scoreA.accessibility,
      b: scoreB.accessibility,
      max: 100,
      format: pct,
    },
    {
      label: 'Chroma harmony',
      description: 'Consistency in color vividness.',
      a: scoreA.harmony,
      b: scoreB.harmony,
      max: 100,
      format: pct,
    },
    {
      label: 'Uniqueness',
      description: 'Distinctness between palette colors.',
      a: scoreA.uniqueness,
      b: scoreB.uniqueness,
      max: 100,
      format: pct,
    },
  ];
  const paletteMetrics = [
    {
      label: 'Avg chroma (vividness)',
      description: 'Vividness; higher is not always better.',
      a: statsA.avgChroma,
      b: statsB.avgChroma,
      max: 0.37,
      format: (v: number) => v.toFixed(3),
      higherIsBetter: null,
    },
    {
      label: 'Avg lightness',
      description: 'Average lightness; there is no ideal target.',
      a: statsA.avgLight,
      b: statsB.avgLight,
      max: 1,
      format: (v: number) => `${Math.round(v * 100)}%`,
      higherIsBetter: null,
    },
    {
      label: 'Hue spread',
      description: 'Largest hue gap; more is not always better.',
      a: statsA.hueSpread,
      b: statsB.hueSpread,
      max: 180,
      format: (v: number) => `${Math.round(v)}°`,
      higherIsBetter: null,
    },
  ];
  return (
    <div className='@container flex min-h-0 flex-1 scrollbar-gutter-stable flex-col overflow-auto'>
      {palA && palB && statsA && statsB && (
        <>
          <div
            data-compare-palette-header
            className='tool-panel-space grid grid-cols-1 items-stretch gap-x-4 gap-y-2 border-b border-border @xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] @xl:gap-6'>
            <PaletteCard
              side='a'
              value={selA ?? '__current__'}
              options={options}
              onChange={setSelA}
              palette={palA}
              overall={scoreA.overall}
            />
            <div className='flex items-center justify-center @xl:px-1'>
              <Button
                variant='ghost'
                size='icon-sm'
                onClick={swap}
                title='Swap palettes'
                aria-label='Swap palettes A and B'>
                <ArrowLeftRight className='size-4' />
              </Button>
            </div>
            <PaletteCard
              side='b'
              value={selB ?? saved[0]?.id}
              options={options}
              onChange={setSelB}
              palette={palB}
              overall={scoreB.overall}
            />
          </div>

          <div className='grid min-w-0 grid-cols-1 @min-[56rem]:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] @min-[56rem]:grid-rows-[auto_auto] @min-[80rem]:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]! @min-[120rem]:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]!'>
            <section
              data-compare-profile-section
              className='tool-panel-space tool-panel-stack flex min-w-0 flex-col @min-[56rem]:col-start-1 @min-[56rem]:row-start-1 @min-[56rem]:border-r @min-[56rem]:border-border'>
              <div className='flex flex-wrap items-baseline justify-between gap-2'>
                <div className={SECTION_LABEL}>Score profile</div>
                <div className='flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground'>
                  {(['a', 'b'] as const).map((side) => (
                    <span key={side} className='flex items-center gap-1.5'>
                      <span
                        className='h-0.5 w-4'
                        style={{
                          background: SERIES[side].color,
                          opacity: side === 'a' ? 0.7 : 1,
                        }}
                      />
                      {SERIES[side].tag} · {(side === 'a' ? palA : palB).name}
                    </span>
                  ))}
                </div>
              </div>
              <div className='flex min-h-0 items-center justify-center @min-[56rem]:flex-1'>
                <div
                  data-compare-profile-chart
                  className='grid aspect-square w-full place-items-center'>
                  <Chart
                    className='h-full w-full font-display'
                    definition={createCompareChart(scoreA, scoreB, { a: palA.name, b: palB.name })}
                    ariaLabel={`Score comparison: ${palA.name} versus ${palB.name}`}
                    initialWidth={380}
                    height={380}
                    style={{ height: '100%' }}
                  />
                </div>
              </div>
            </section>

            <section
              data-compare-practical-section
              className='tool-panel-space @container/practical-checks min-w-0 border-t border-border @min-[56rem]:col-start-1 @min-[56rem]:row-start-2 @min-[56rem]:border-r @min-[56rem]:border-border'>
              <div className='mb-3 flex flex-wrap items-end justify-between gap-2'>
                <div className={SECTION_LABEL}>Practical checks</div>
              </div>
              <div className='grid grid-cols-1 gap-x-8 gap-y-3 @min-[32rem]/practical-checks:grid-cols-2'>
                <div className='py-2'>
                  <div className={TYPE.meta}>Colors passing AA against white or black</div>
                  <div className='mt-1 grid grid-cols-2 text-sm font-semibold tabular-nums'>
                    <span style={{ color: SERIES.a.color }}>
                      A · {statsA.aaAny}/{statsA.total}
                    </span>
                    <span style={{ color: SERIES.b.color }}>
                      B · {statsB.aaAny}/{statsB.total}
                    </span>
                  </div>
                </div>
                <div className='py-2'>
                  <div className={TYPE.meta}>Palette size</div>
                  <div className='mt-1 grid grid-cols-2 text-sm font-semibold tabular-nums'>
                    <span style={{ color: SERIES.a.color }}>A · {statsA.total} colors</span>
                    <span style={{ color: SERIES.b.color }}>B · {statsB.total} colors</span>
                  </div>
                </div>
              </div>
            </section>

            <section
              data-compare-tablet-metrics
              data-compare-metrics-section
              className='tool-panel-space @container/score-metrics min-w-0 border-t border-border @min-[56rem]:col-start-2 @min-[56rem]:row-start-1 @min-[56rem]:border-t-0'>
              <div className='mb-3 flex flex-wrap items-end justify-between gap-2'>
                <div>
                  <div className={SECTION_LABEL}>Score metrics</div>
                  <p className='mt-1 text-[10px] text-muted-foreground'>
                    Scores out of 100 · higher is stronger
                  </p>
                </div>
              </div>
              <CompareMetricCards
                label='Score metrics'
                metrics={scoreMetrics}
                className='grid grid-cols-1 gap-x-8 gap-y-3 @min-[28rem]/score-metrics:grid-cols-2 @min-[64rem]/score-metrics:grid-cols-3 @min-[80rem]/score-metrics:grid-cols-2'
                showScale={false}
              />
            </section>

            <section
              data-compare-properties-section
              className='tool-panel-space @container/palette-properties min-w-0 border-t border-border @min-[56rem]:col-start-2 @min-[56rem]:row-start-2'>
              <div className='mb-3 flex flex-wrap items-end justify-between gap-2'>
                <div>
                  <div className={SECTION_LABEL}>Palette properties</div>
                  <p className='mt-1 text-[10px] text-muted-foreground'>
                    Descriptive traits; there is no single best profile.
                  </p>
                </div>
              </div>
              <CompareMetricCards
                label='Palette properties'
                metrics={paletteMetrics}
                className='grid grid-cols-1 gap-x-8 gap-y-3 @min-[38rem]/palette-properties:grid-cols-2 @min-[50rem]/palette-properties:grid-cols-3'
              />
            </section>
          </div>

          <div
            data-compare-actions
            className='tool-panel-space tool-panel-stack flex flex-wrap border-t border-border'>
            <Button variant='ghost' size='sm' onClick={() => load(palA)}>
              <ArrowDownToLine className='size-3.5' /> Load A into editor
            </Button>
            <Button variant='ghost' size='sm' onClick={() => load(palB)}>
              <ArrowDownToLine className='size-3.5' /> Load B into editor
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className='tool-panel-space min-h-0 flex-1 overflow-auto'>
      <p className='text-[12px] text-muted-foreground'>Generate a palette first.</p>
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

export default function ScoreView() {
  const [activeTab, setActiveTab] = useState<'score' | 'compare'>('score');
  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
      <ViewHeader
        title='Score & Compare'
        description='How well your palette is balanced, accessible, cohesive and distinct — or how it stacks up against a saved one.'
      />
      <TabBar active={activeTab} setActive={setActiveTab} />
      {activeTab === 'score' && <ScoreTab />}
      {activeTab === 'compare' && <CompareTab />}
    </div>
  );
}
