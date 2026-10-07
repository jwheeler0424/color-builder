/**
 * visualize.view.tsx  — Phase 1 merge
 *
 * Combines: oklch-scatter-view + p3-gamut-view
 * Sub-tabs:  [OKLCH Space] [P3 Gamut]
 */

import { Check, Copy, Lock, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';

import { Chart } from '@/components/ui/chart';
import { useChromaStore } from '@/hooks/use-chroma-store';
import {
  createChromaChart,
  createHueChart,
  MAX_CHROMA,
  type PaletteChartPoint,
} from '@/lib/tools/palette-charts';
import { hexToRgb, rgbToOklch, textColor, clamp, nearestName } from '@/lib/utils';
import { useRegisterHotkey } from '@/providers/hotkey.provider';

import { ToolButton as Button, ToolSegments, ToolTabs, TYPE, ViewHeader } from './view-ui';

// ─── Tab bar ──────────────────────────────────────────────────────────────────

type Tab = 'oklch' | 'p3';

function TabBar({ active, setActive }: { active: Tab; setActive: (t: Tab) => void }) {
  return (
    <ToolTabs
      value={active}
      onValueChange={setActive}
      label='Visualize'
      items={[
        { id: 'oklch', label: 'OKLCH Space' },
        { id: 'p3', label: 'P3 Gamut' },
      ]}
    />
  );
}

function EmptyState({ title }: { title: string }) {
  return (
    <div className='flex-1 p-6'>
      <p className='text-[12px] text-muted-foreground'>Generate a palette first to use {title}.</p>
    </div>
  );
}

function FittedChart(props: ComponentProps<typeof Chart<PaletteChartPoint, number, number>>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(240);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => {
      const nextHeight = Math.floor(entry.contentRect.height);
      if (nextHeight > 0) setHeight(nextHeight);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className='h-60 min-h-0 w-full max-w-88 self-center lg:h-auto lg:max-h-60 lg:flex-1'>
      <Chart {...props} height={height} />
    </div>
  );
}

function ColorProfile({
  points,
  dimension,
  activeId,
}: {
  points: readonly PaletteChartPoint[];
  dimension: 'lightness' | 'chroma';
  activeId: string | null;
}) {
  return (
    <section className='flex min-h-0 flex-col gap-3 border-t border-border pt-3'>
      <div className={TYPE.label}>
        {dimension === 'lightness' ? 'Lightness profile' : 'Chroma profile'}
      </div>
      <div className='grid min-h-0 flex-1 auto-rows-fr gap-1'>
        {points.map((point) => (
          <div
            key={point.id}
            title={`${point.name} ${point.hex.toUpperCase()}`}
            className={`grid min-h-0 grid-cols-[0.75rem_minmax(0,1fr)_3rem] items-center gap-2 ${activeId === point.id ? 'text-foreground' : 'text-muted-foreground'}`}>
            <span
              className='size-3 rounded-sm border border-foreground/10'
              style={{ background: point.hex }}
            />
            <div className='h-1.5 overflow-hidden rounded-sm bg-muted' aria-hidden='true'>
              <div
                className='h-full rounded-sm transition-opacity'
                style={{
                  width: `${clamp(point[dimension] / (dimension === 'lightness' ? 1 : MAX_CHROMA), 0, 1) * 100}%`,
                  background: point.hex,
                  opacity: activeId && activeId !== point.id ? 0.4 : 1,
                }}
              />
            </div>
            <span className='text-right font-mono text-[10px] leading-none tabular-nums'>
              {point[dimension].toFixed(dimension === 'lightness' ? 2 : 3)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OKLCH SCATTER TAB
// ═══════════════════════════════════════════════════════════════════════════════

function OklchTab() {
  const slots = useChromaStore((s) => s.slots);
  const [revision, setRevision] = useState(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const activeId = hoveredId ?? focusedId;

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener('chroma:refresh-plots', refresh);
    return () => window.removeEventListener('chroma:refresh-plots', refresh);
  }, []);

  const points = useMemo(
    () =>
      slots.map((slot) => {
        const rgb = hexToRgb(slot.color.hex);
        const lch = rgbToOklch(rgb);
        const name = slot.name || nearestName(slot.color);
        return {
          slot,
          lch,
          name,
          hex: slot.color.hex,
          id: slot.id,
          locked: slot.locked,
          lightness: lch.L,
          chroma: lch.C,
          hue: lch.H,
        };
      }),
    [slots],
  );

  useRegisterHotkey({
    key: 'r',
    label: 'Refresh OKLCH plot',
    group: 'OKLCH',
    handler: () => window.dispatchEvent(new Event('chroma:refresh-plots')),
  });

  const stats = useMemo(() => {
    if (!points.length) return null;
    const Ls = points.map((p) => p.lch.L);
    const Cs = points.map((p) => p.lch.C);
    const Hs = points.map((p) => p.lch.H);
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const spread = (arr: number[]) => Math.max(...arr) - Math.min(...arr);
    return {
      avgL: avg(Ls).toFixed(2),
      spreadL: spread(Ls).toFixed(2),
      avgC: avg(Cs).toFixed(3),
      spreadC: spread(Cs).toFixed(3),
      hueRange: spread(Hs).toFixed(0),
    };
  }, [points]);

  if (!slots.length) return <EmptyState title='OKLCH visualizer' />;

  const statItems = stats
    ? [
        ['Avg lightness', stats.avgL],
        ['Lightness spread', stats.spreadL],
        ['Avg chroma', stats.avgC],
        ['Chroma spread', stats.spreadC],
        ['Hue range', `${stats.hueRange}°`],
      ]
    : [];
  return (
    <div className='@container flex min-h-0 flex-1 flex-col overflow-auto lg:overflow-hidden'>
      <div className='grid shrink-0 grid-cols-2 gap-x-4 gap-y-3 border-b border-border px-4 py-3 sm:grid-cols-3 lg:grid-cols-5'>
        {statItems.map(([label, value]) => (
          <div key={label} className='flex flex-col gap-1.5'>
            <span className={TYPE.label}>{label}</span>
            <span className={TYPE.metric}>{value}</span>
          </div>
        ))}
      </div>
      <div className='grid grid-cols-1 lg:min-h-0 lg:flex-1 lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)_auto] @4xl:grid-cols-3 @4xl:grid-rows-[minmax(0,1fr)]'>
        <section className='grid min-h-0 min-w-0 grid-rows-[auto_15rem_auto] gap-3 p-4 lg:grid-rows-[auto_minmax(0,3fr)_minmax(0,2fr)] @4xl:border-r @4xl:border-border'>
          <div className='flex h-6 items-center justify-between gap-2'>
            <div className={TYPE.label}>Lightness vs chroma</div>
            <div className={TYPE.mono}>L / C</div>
          </div>
          <div className='flex min-h-0 flex-col justify-center'>
            <FittedChart
              key={`scatter-${revision}`}
              definition={createChromaChart(points, activeId)}
              ariaLabel='Palette chroma versus lightness'
              className='w-full'
            />
          </div>
          <ColorProfile points={points} dimension='lightness' activeId={activeId} />
        </section>

        <section className='grid min-h-0 min-w-0 grid-rows-[auto_15rem_auto] gap-3 p-4 lg:grid-rows-[auto_minmax(0,3fr)_minmax(0,2fr)]'>
          <div className='flex h-6 items-center justify-between gap-2'>
            <div className={TYPE.label}>Hue distribution</div>
            <div className={TYPE.mono}>H / C</div>
          </div>
          <div className='flex min-h-0 flex-col justify-center'>
            <FittedChart
              key={`hue-${revision}`}
              definition={createHueChart(points, activeId)}
              ariaLabel='Palette hue and chroma distribution'
              className='w-full'
            />
          </div>
          <ColorProfile points={points} dimension='chroma' activeId={activeId} />
        </section>
        <section className='flex min-h-0 min-w-0 flex-col gap-3 border-t border-border p-4 lg:col-span-2 @4xl:col-span-1 @4xl:border-t-0 @4xl:border-l'>
          <div className='flex h-6 shrink-0 items-center justify-between gap-2'>
            <div className={TYPE.label}>Color values</div>
            <Button
              variant='ghost'
              size='icon-xs'
              onClick={() => setRevision((value) => value + 1)}
              aria-label='Refresh plots'
              title='Refresh plots'>
              <RotateCcw className='size-3.5' />
            </Button>
          </div>

          <div
            className={`grid min-h-0 auto-rows-fr gap-x-4 gap-y-2 @4xl:flex-1 ${points.length > 9 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {points.map((pt) => (
              <article
                key={pt.slot.id}
                data-color-id={pt.id}
                aria-label={`${pt.name}, ${pt.hex}, lightness ${pt.lch.L.toFixed(2)}, chroma ${pt.lch.C.toFixed(3)}, hue ${Math.round(pt.lch.H)} degrees${pt.locked ? ', locked' : ''}`}
                onPointerEnter={() => setHoveredId(pt.id)}
                onPointerLeave={() => setHoveredId(null)}
                onFocus={() => setFocusedId(pt.id)}
                onBlur={() => setFocusedId(null)}
                className={`@container/reading grid min-h-0 min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] content-center gap-x-3 gap-y-2 border-b border-border pb-1 transition-colors focus-within:ring-2 focus-within:ring-ring ${activeId === pt.id ? 'bg-accent/30' : ''}`}>
                <span
                  className='aspect-square size-10 self-center rounded-sm border border-foreground/10 @min-[17rem]/reading:row-span-2'
                  style={{ background: pt.hex }}
                />
                <button
                  type='button'
                  aria-label={`Highlight ${pt.name} in charts`}
                  aria-pressed={activeId === pt.id}
                  onClick={() => setFocusedId(pt.id)}
                  className='flex min-w-0 cursor-pointer items-center gap-2 text-left outline-none'>
                  <div className='flex min-w-0 flex-1 flex-col gap-1 @min-[17rem]/reading:flex-row @min-[17rem]/reading:items-baseline @min-[17rem]/reading:justify-between @min-[17rem]/reading:gap-3'>
                    <span
                      className='truncate text-[12px] leading-none font-semibold text-foreground'
                      title={pt.name}>
                      {pt.name}
                    </span>
                    <span className='shrink-0 font-mono text-[10px] leading-none text-muted-foreground'>
                      {pt.hex.toUpperCase()}
                    </span>
                  </div>
                  {pt.locked && (
                    <Lock className='size-3 shrink-0 text-muted-foreground' aria-label='Locked' />
                  )}
                </button>
                <dl className='col-span-2 grid grid-cols-3 gap-3 @min-[17rem]/reading:col-span-1'>
                  {[
                    {
                      label: 'L',
                      title: 'Lightness',
                      value: pt.lch.L.toFixed(2),
                      amount: pt.lch.L,
                    },
                    {
                      label: 'C',
                      title: 'Chroma',
                      value: pt.lch.C.toFixed(3),
                      amount: pt.lch.C / MAX_CHROMA,
                    },
                    { label: 'H', title: 'Hue', value: `${Math.round(pt.lch.H)}°`, amount: null },
                  ].map(({ label, title, value, amount }) => (
                    <div key={title} className='flex min-w-0 flex-col gap-1'>
                      <div className='flex items-baseline justify-between gap-0.5'>
                        <dt
                          className='text-[9px] leading-none font-semibold text-muted-foreground'
                          title={title}>
                          {label}
                          <span className='sr-only'> {title}</span>
                        </dt>
                        <dd className='font-mono text-[10px] leading-none text-foreground/80 tabular-nums'>
                          {value}
                        </dd>
                      </div>
                      {amount !== null && (
                        <div className='h-1 overflow-hidden rounded-sm bg-muted' aria-hidden='true'>
                          <div
                            className='h-full rounded-sm'
                            style={{ width: `${clamp(amount, 0, 1) * 100}%`, background: pt.hex }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// P3 GAMUT TAB
// ═══════════════════════════════════════════════════════════════════════════════

const SRGB_TO_P3 = [0.8225, 0.1774, 0.0, 0.0332, 0.9669, 0.0, 0.0171, 0.0724, 0.9108];

function srgbLinear(c: number) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function p3Gamma(c: number) {
  return c <= 0.0030186 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}
function srgbToP3(r: number, g: number, b: number): [number, number, number] {
  const rL = srgbLinear(r / 255),
    gL = srgbLinear(g / 255),
    bL = srgbLinear(b / 255);
  const M = SRGB_TO_P3;
  return [
    p3Gamma(clamp(M[0] * rL + M[1] * gL + M[2] * bL, 0, 1)),
    p3Gamma(clamp(M[3] * rL + M[4] * gL + M[5] * bL, 0, 1)),
    p3Gamma(clamp(M[6] * rL + M[7] * gL + M[8] * bL, 0, 1)),
  ];
}

function isWideGamut(hex: string): boolean {
  return rgbToOklch(hexToRgb(hex)).C > 0.25;
}
function p3CssColor(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const [rP3, gP3, bP3] = srgbToP3(r, g, b);
  return `color(display-p3 ${rP3.toFixed(4)} ${gP3.toFixed(4)} ${bP3.toFixed(4)})`;
}

function P3SwatchCard({ hex, showP3 }: { hex: string; showP3: boolean }) {
  const rgb = hexToRgb(hex);
  const lch = rgbToOklch(rgb);
  const wide = isWideGamut(hex);
  const p3Css = p3CssColor(hex);
  const name = nearestName(rgb);
  const tc = textColor(rgb);

  return (
    <div className='flex min-h-0 min-w-0 flex-col gap-2'>
      <div className='relative flex h-24 shrink-0 gap-1 lg:h-auto lg:min-h-8 lg:flex-1'>
        <div
          className='flex min-w-0 flex-1 items-end rounded-md border border-border p-3'
          style={{ background: hex }}>
          <span className={TYPE.label} style={{ color: tc, opacity: 0.8 }}>
            sRGB
          </span>
        </div>
        {showP3 && (
          <div
            className='flex min-w-0 flex-1 items-end rounded-md border border-border p-3'
            style={{ background: p3Css }}>
            <span className={TYPE.label} style={{ color: tc, opacity: 0.8 }}>
              P3
            </span>
          </div>
        )}
      </div>
      <div className='flex shrink-0 flex-wrap items-baseline justify-between gap-x-2 gap-y-1'>
        <div className={`truncate ${TYPE.title}`}>{name}</div>
        <div className={TYPE.mono}>{hex.toUpperCase()}</div>
        <div className={`${TYPE.mono} hidden @4xl:block`}>
          C {lch.C.toFixed(3)} · H {Math.round(lch.H)}°
        </div>
        <div className={`hidden ${TYPE.meta} @5xl:block`}>
          {wide ? (
            <span className='font-semibold text-primary'>High chroma</span>
          ) : (
            'Standard chroma'
          )}
        </div>
      </div>
    </div>
  );
}

function P3Tab() {
  const slots = useChromaStore((s) => s.slots);
  const [showP3, setShowP3] = useState(true);
  const [copiedCss, setCopiedCss] = useState(false);
  const [cssFormat, setCssFormat] = useState<'srgb' | 'p3'>('p3');
  const wideCount = useMemo(() => slots.filter((s) => isWideGamut(s.color.hex)).length, [slots]);
  const p3Css = useMemo(() => {
    if (!slots.length) return '';
    return `:root {\n${slots.map((s, i) => `  --palette-${i + 1}: ${s.color.hex};\n  --palette-${i + 1}-srgb: ${s.color.hex};\n  --palette-${i + 1}-p3: ${p3CssColor(s.color.hex)};`).join('\n')}\n}\n\n/* P3 variant for supporting displays */\n@supports (color: color(display-p3 0 0 0)) {\n  :root {\n${slots.map((s, i) => `    --palette-${i + 1}: ${p3CssColor(s.color.hex)};`).join('\n')}\n  }\n}`;
  }, [slots]);
  const cssPreview =
    cssFormat === 'srgb'
      ? `:root {\n${slots.map((slot, index) => `  --palette-${index + 1}: ${slot.color.hex};`).join('\n')}\n}`
      : `@supports (color: color(display-p3 0 0 0)) {\n  :root {\n${slots.map((slot, index) => `    --palette-${index + 1}: ${p3CssColor(slot.color.hex)};`).join('\n')}\n  }\n}`;

  if (!slots.length) return <EmptyState title='P3 Gamut viewer' />;

  return (
    <div className='@container flex min-h-0 flex-1 flex-col overflow-auto lg:overflow-hidden'>
      <div className='grid grid-cols-1 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:grid-rows-[auto_minmax(0,1fr)]'>
        <section className='grid grid-cols-1 items-center gap-4 border-b border-border p-4 lg:col-span-2 @3xl:grid-cols-[auto_minmax(0,1fr)]'>
          <div className='flex gap-10'>
            <div className='flex flex-col gap-1.5'>
              <span
                className={TYPE.metric}
                style={{ color: wideCount ? 'var(--primary)' : undefined }}>
                {wideCount}
                <span className={`ml-1 ${TYPE.meta}`}>/ {slots.length}</span>
              </span>
              <span className={TYPE.label}>High chroma</span>
            </div>
            <div className='flex flex-col gap-1.5'>
              <span className={TYPE.metric}>
                {slots.length - wideCount}
                <span className={`ml-1 ${TYPE.meta}`}>/ {slots.length}</span>
              </span>
              <span className={TYPE.label}>Standard chroma</span>
            </div>
          </div>
          <div className='flex flex-col gap-2'>
            <div className={TYPE.title}>sRGB palette · Display P3 equivalents</div>
            <p className={TYPE.meta}>
              All palette colors are within sRGB. Display P3 values preserve their appearance; high
              chroma indicates C &gt; 0.25, not an out-of-gamut color.
            </p>
          </div>
        </section>

        <section className='flex min-h-0 min-w-0 flex-col gap-3 border-b border-border p-4 lg:border-r lg:border-b-0'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <div className={TYPE.label}>Colors</div>
            <ToolSegments
              value={showP3 ? 'both' : 'srgb'}
              onValueChange={(mode) => setShowP3(mode === 'both')}
              label='Gamut comparison'
              items={[
                { id: 'srgb', label: 'sRGB only' },
                { id: 'both', label: 'sRGB + P3' },
              ]}
            />
          </div>
          <div className='grid grid-cols-2 gap-8 lg:min-h-0 lg:flex-1 lg:auto-rows-fr'>
            {slots.map((slot) => (
              <P3SwatchCard key={slot.id} hex={slot.color.hex} showP3={showP3} />
            ))}
          </div>
        </section>

        <section className='flex min-h-0 min-w-0 flex-col gap-3 p-4'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <div className={TYPE.label}>CSS with P3 fallback</div>
            <Button
              variant='outline'
              size='xs'
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(p3Css);
                  setCopiedCss(true);
                  setTimeout(() => setCopiedCss(false), 1400);
                } catch {
                  setCopiedCss(false);
                }
              }}>
              {copiedCss ? <Check className='size-3' /> : <Copy className='size-3' />}
              {copiedCss ? 'Copied' : 'Copy CSS'}
            </Button>
          </div>
          <ToolSegments
            value={cssFormat}
            onValueChange={setCssFormat}
            label='CSS preview format'
            items={[
              { id: 'srgb', label: 'sRGB fallback' },
              { id: 'p3', label: 'Display P3' },
            ]}
          />
          <pre
            className={`min-h-0 rounded-md border border-border bg-secondary p-3 break-all whitespace-pre-wrap lg:flex-1 ${TYPE.mono}`}>
            {cssPreview}
          </pre>
        </section>
      </div>
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

export default function VisualizeView() {
  const [activeTab, setActiveTab] = useState<Tab>('oklch');
  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
      <ViewHeader
        title='Visualize'
        description='Palette distribution in OKLCH and color-preserving Display P3 values.'
      />
      <TabBar active={activeTab} setActive={setActiveTab} />
      {activeTab === 'oklch' && <OklchTab />}
      {activeTab === 'p3' && <P3Tab />}
    </div>
  );
}
