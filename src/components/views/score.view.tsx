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
      <div className='grid grid-cols-1 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]! @min-[35rem]:grid-cols-[minmax(0,1fr)_minmax(17rem,1fr)] @min-[48rem]:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] @7xl:grid-cols-3! @7xl:gap-x-6'>
        <section className='grid grid-cols-1 gap-x-4 gap-y-8 p-6 @min-[35rem]:p-4 @min-[48rem]:col-span-2 @min-[48rem]:grid-cols-[minmax(0,4fr)_minmax(0,6fr)] @min-[48rem]:items-stretch @min-[48rem]:gap-x-6 @min-[48rem]:gap-y-4 @min-[48rem]:border-b @min-[48rem]:border-border @min-[48rem]:p-8 @5xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] @5xl:items-center @5xl:gap-8 @7xl:col-span-1 @7xl:grid-cols-1 @7xl:items-start @7xl:gap-y-6 @7xl:border-b-0 @7xl:pt-6'>
          <div className='flex min-w-0 items-center gap-4 @5xl:justify-center @5xl:gap-6'>
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

        <section className='flex min-w-0 flex-col gap-3 p-4 xl:col-start-2 xl:row-start-2 @xl:p-6 @min-[48rem]:self-start @7xl:col-start-3 @7xl:row-start-1 @7xl:border-l @7xl:border-border @7xl:pl-6'>
          <div className='flex flex-wrap items-baseline justify-between gap-2'>
            <div className={TYPE.label}>Score profile</div>
            <div className={TYPE.mono}>0 – 100</div>
          </div>
          <div className='flex min-w-0 flex-1 items-center justify-center'>
            <div className='aspect-square w-full max-w-64 lg:max-w-72! xl:max-w-96! @min-[35rem]:max-w-56 @min-[40rem]:max-w-64 @min-[48rem]:max-w-80'>
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

        <section className='flex min-w-0 flex-col border-t border-border p-4 xl:col-span-1 xl:col-start-1 xl:row-start-2 @min-[35rem]:col-span-2 @xl:p-6 @min-[48rem]:col-span-1 @min-[48rem]:border-t-0 @7xl:col-span-1 @7xl:col-start-2 @7xl:row-start-1 @7xl:border-l @7xl:border-border @7xl:pl-6'>
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
      <div className='grid min-w-0 grid-cols-1 gap-y-5 xl:grid-cols-2 xl:items-start xl:gap-x-6 xl:gap-y-6 xl:border-t xl:border-border xl:pt-6 @7xl:mt-6 @7xl:grid-cols-3 @7xl:items-stretch'>
        <section className='@container/color-detail col-span-full flex min-w-0 flex-col gap-5 border-t border-border p-4 xl:col-span-1 xl:col-start-1 xl:row-start-1 xl:self-start xl:border-t-0 @xl:gap-6 @xl:p-6 @7xl:self-stretch'>
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

        <section className='flex min-w-0 flex-col gap-5 border-t border-border p-4 xl:col-span-2 xl:row-start-2 xl:border-t-0 @xl:gap-6 @xl:p-6 @7xl:col-span-1 @7xl:col-start-3 @7xl:row-start-1 @7xl:border-l @7xl:border-border @7xl:pl-6'>
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
            Normal text needs 4.5:1; large text and meaningful non-text graphics need 3:1. Check the
            actual text size, background, transparency, and UI state before relying on a result.
          </p>
        </section>

        <section className='@container/vision flex min-w-0 flex-col gap-5 border-t border-border p-4 xl:col-start-2 xl:row-start-1 xl:self-start xl:border-t-0 @xl:gap-6 @xl:p-6 @7xl:col-span-1 @7xl:col-start-2 @7xl:row-start-1 @7xl:self-stretch @7xl:border-l @7xl:border-border @7xl:pl-6'>
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
    <section className='flex min-w-0 flex-col gap-3'>
      <div className='flex items-center justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <span
            className='grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold text-background'
            style={{ background: color }}>
            {tag}
          </span>
          <span className={SECTION_LABEL}>Palette {tag}</span>
        </div>
        <ScoreRing value={overall} size='sm' />
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`Palette ${tag}`}
        className='w-full rounded border border-border bg-muted px-2 py-1.5 font-mono text-[12px] text-foreground transition-colors outline-none focus:border-ring'>
        {options.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} ({p.hexes.length} colors · {p.mode})
          </option>
        ))}
      </select>
      <div className='flex h-14 overflow-hidden rounded'>
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

function CompareBar({
  label,
  a,
  b,
  max,
  format,
  higherIsBetter = true,
}: {
  label: string;
  a: number;
  b: number;
  max: number;
  format: (v: number) => string;
  /** null = neither direction is better (shown without a winner) */
  higherIsBetter?: boolean | null;
}) {
  const diff = b - a;
  const tie = Math.abs(diff) < max * 0.005;
  const winner = higherIsBetter === null || tie ? null : diff > 0 === higherIsBetter ? 'b' : 'a';
  return (
    <div className='flex flex-col gap-1.5 border-b border-muted py-2.5 last:border-b-0'>
      <div className='flex items-baseline justify-between gap-2'>
        <span className='text-[11px] font-bold'>{label}</span>
        <span className='text-[10px] text-muted-foreground'>
          {winner ? `${SERIES[winner].tag} leads` : tie ? 'Even' : ''}
        </span>
      </div>
      {(['a', 'b'] as const).map((side) => {
        const v = side === 'a' ? a : b;
        const lead = winner === side;
        return (
          <div key={side} className='grid grid-cols-[1rem_minmax(0,1fr)_3.5rem] items-center gap-2'>
            <span className='text-[10px] font-bold' style={{ color: SERIES[side].color }}>
              {SERIES[side].tag}
            </span>
            <ScoreBar value={(v / max) * 100} color={SERIES[side].color} dim={!!winner && !lead} />
            <span
              className='text-right font-mono text-[10px]'
              style={{ fontWeight: lead ? 700 : 400 }}>
              {format(v)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function CompareTab() {
  const slots = useChromaStore((s) => s.slots);
  const mode = useChromaStore((s) => s.mode);
  const loadPalette = useChromaStore((s) => s.loadPalette);
  const navigate = useNavigate();
  const [saved, setSaved] = useState<SavedPalette[]>([]);
  const [selA, setSelA] = useState<string | null>(null);
  const [selB, setSelB] = useState<string | null>(null);

  useEffect(() => {
    const all = loadSaved();
    setSaved(all);
    if (all.length > 0) setSelB(all[0].id);
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
      <div className='min-h-0 flex-1 overflow-auto p-6'>
        <p className='text-[12px] text-muted-foreground'>
          Save some palettes first using ♡ in the header, then compare them here.
        </p>
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

  return (
    <div className='@container flex min-h-0 flex-1 scrollbar-gutter-stable flex-col overflow-auto'>
      {palA && palB && statsA && statsB && (
        <>
          <div className='grid grid-cols-1 items-stretch gap-4 border-b border-border p-4 @xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] @xl:p-6'>
            <PaletteCard
              side='a'
              value={selA ?? '__current__'}
              options={options}
              onChange={setSelA}
              palette={palA}
              overall={scoreA.overall}
            />
            <div className='flex items-center justify-center'>
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

          <div className='grid grid-cols-1 @4xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]'>
            <section className='flex min-w-0 flex-col gap-4 border-b border-border p-4 @xl:p-6 @4xl:border-r @4xl:border-b-0'>
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
              <div className='flex min-h-0 flex-1 items-center justify-center'>
                <Chart
                  className='w-full font-display'
                  definition={createCompareChart(scoreA, scoreB, { a: palA.name, b: palB.name })}
                  ariaLabel={`Score comparison: ${palA.name} versus ${palB.name}`}
                  initialWidth={380}
                  height={380}
                />
              </div>
            </section>

            <section className='flex min-w-0 flex-col p-4 @xl:p-6'>
              <div className={`mb-1 ${SECTION_LABEL}`}>Head to head</div>
              <CompareBar
                label='Overall score'
                a={scoreA.overall}
                b={scoreB.overall}
                max={100}
                format={pct}
              />
              <CompareBar
                label='Hue balance'
                a={scoreA.balance}
                b={scoreB.balance}
                max={100}
                format={pct}
              />
              <CompareBar
                label='Accessibility'
                a={scoreA.accessibility}
                b={scoreB.accessibility}
                max={100}
                format={pct}
              />
              <CompareBar
                label='Chroma harmony'
                a={scoreA.harmony}
                b={scoreB.harmony}
                max={100}
                format={pct}
              />
              <CompareBar
                label='Uniqueness'
                a={scoreA.uniqueness}
                b={scoreB.uniqueness}
                max={100}
                format={pct}
              />
              <CompareBar
                label='Avg chroma (vividness)'
                a={statsA.avgChroma}
                b={statsB.avgChroma}
                max={0.37}
                format={(v) => v.toFixed(3)}
              />
              <CompareBar
                label='Avg lightness'
                a={statsA.avgLight}
                b={statsB.avgLight}
                max={1}
                format={(v) => `${Math.round(v * 100)}%`}
                higherIsBetter={null}
              />
              <CompareBar
                label='Hue spread'
                a={statsA.hueSpread}
                b={statsB.hueSpread}
                max={180}
                format={(v) => `${Math.round(v)}°`}
              />
              <CompareBar
                label='Colors with AA text'
                a={statsA.aaAny / statsA.total}
                b={statsB.aaAny / statsB.total}
                max={1}
                format={(v) => `${Math.round(v * 100)}%`}
              />
              <CompareBar
                label='Color count'
                a={statsA.total}
                b={statsB.total}
                max={Math.max(statsA.total, statsB.total, 1)}
                format={(v) => String(v)}
                higherIsBetter={null}
              />
            </section>
          </div>

          <div className='flex flex-wrap gap-2 border-t border-border px-4 py-3 @xl:px-6'>
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
    <div className='min-h-0 flex-1 overflow-auto p-6'>
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
