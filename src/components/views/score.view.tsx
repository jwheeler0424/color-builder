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
  scorePalette,
  textColor,
  xyzToLch,
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
  const outer = { lg: 'h-36 w-36', md: 'h-24 w-24', sm: 'h-14 w-14' }[size];
  const inner = { lg: 'h-28 w-28', md: 'h-19 w-19', sm: 'h-10 w-10' }[size];
  return (
    <div
      className={`grid shrink-0 place-items-center rounded-full ${outer}`}
      style={{ background: `conic-gradient(${color} ${value * 3.6}deg, var(--muted) 0deg)` }}
      role='img'
      aria-label={`Overall score ${value} out of 100`}>
      <div className={`grid place-items-center rounded-full bg-card ${inner}`}>
        {size === 'lg' ? (
          <div className='text-center'>
            <div className='font-display text-[36px] leading-none font-extrabold' style={{ color }}>
              {value}
            </div>
            <div className='mt-1 text-[10px] tracking-widest text-muted-foreground uppercase'>
              Overall
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
            style={{ width: `${b.to - b.from}%`, background: b.color, opacity: 0.25 }}
          />
        ))}
        <div
          className='absolute top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground transition-[left] duration-500 ease-out'
          style={{ left: `${v}%` }}
        />
      </div>
      <div className={`flex ${TYPE.meta}`}>
        {SCALE_BANDS.map((b) => (
          <span key={b.label} style={{ width: `${b.to - b.from}%` }}>
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}
function ScoreTab() {
  const slots = useChromaStore((s) => s.slots);
  const score = useMemo(
    () => scorePalette(slots.map((slot) => (slot.color.value ?? parseColor(slot.color.hex)).xyz)),
    [slots],
  );

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
    <div className='@container flex min-h-0 flex-1 [scrollbar-gutter:stable] flex-col overflow-auto'>
      {/* Wide: overall + profile stacked left, dimensions right. Narrow: one column.
          The palette itself is already previewed in the side panel, so it isn't repeated here. */}
      <div className='grid grid-cols-1 @4xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]'>
        <section className='grid grid-cols-1 items-center gap-6 border-b border-border p-4 @xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @xl:p-6 @4xl:col-span-2'>
          <div className='flex flex-col gap-3'>
            <div className={TYPE.label}>Overall score</div>
            <div className='flex items-baseline gap-2'>
              <span
                className='font-display text-4xl leading-none font-extrabold tabular-nums'
                style={{ color: scoreLevelColor(overall) }}>
                {overall}
              </span>
              <span className={TYPE.meta}>/ 100</span>
            </div>
            <div className={TYPE.title}>{verdict(overall)}</div>
          </div>
          <div className='flex flex-col gap-4'>
            <ScaleMeter value={overall} />
            <div className='grid grid-cols-2 gap-4'>
              <div className='flex flex-col gap-1.5'>
                <span className={TYPE.label}>Strongest</span>
                <span className={TYPE.title}>{ranked[0].label}</span>
              </div>
              <div className='flex flex-col gap-1.5'>
                <span className={TYPE.label}>Needs attention</span>
                <span className={TYPE.title}>{ranked[ranked.length - 1].label}</span>
              </div>
            </div>
          </div>
        </section>

        <section className='flex min-w-0 flex-col gap-4 border-b border-border p-4 @xl:p-6 @4xl:border-r @4xl:border-b-0'>
          <div className='flex flex-wrap items-baseline justify-between gap-2'>
            <div className={TYPE.label}>Score profile</div>
            <div className={TYPE.mono}>0 – 100</div>
          </div>
          <div className='flex flex-1 items-center'>
            <Chart
              className='w-full font-display'
              definition={createScoreChart({ balance, accessibility, harmony, uniqueness })}
              ariaLabel={`Palette scores: balance ${balance}, accessibility ${accessibility}, harmony ${harmony}, uniqueness ${uniqueness} out of 100`}
              height={360}
            />
          </div>
        </section>

        <section className='flex min-w-0 flex-col px-4 pt-4 pb-2 @xl:px-6 @xl:pt-6'>
          <div className='flex flex-wrap items-baseline justify-between gap-2'>
            <div className={TYPE.label}>Dimensions</div>
            <div className={TYPE.meta}>4 dimensions</div>
          </div>
          {feedback.map(({ label, measures, value, note }) => (
            <div
              key={label}
              className='grid grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-3 border-b border-border py-5 last:border-b-0 @xl:gap-4'>
              <span className={TYPE.metric} style={{ color: scoreLevelColor(value) }}>
                {value}
              </span>
              <div className='flex min-w-0 flex-col gap-2'>
                <div className='flex flex-wrap items-baseline justify-between gap-2'>
                  <div className='flex min-w-0 flex-col gap-0.5'>
                    <div className={TYPE.title}>{label}</div>
                    <div className={TYPE.meta}>{measures}</div>
                  </div>
                  <span
                    className={`shrink-0 ${TYPE.label}`}
                    style={{ color: scoreLevelColor(value) }}>
                    {levelName(value)}
                  </span>
                </div>
                <ScoreBar value={value} color={scoreLevelColor(value)} />
                <p className={TYPE.body}>{note}</p>
              </div>
            </div>
          ))}
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
    <div className='@container flex min-h-0 flex-1 [scrollbar-gutter:stable] flex-col overflow-auto'>
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
