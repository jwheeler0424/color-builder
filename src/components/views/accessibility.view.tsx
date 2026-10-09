/**
 * accessibility.view.tsx  — Phase 1 merge
 *
 * Combines: accessibility-view + contrast-checker + color-blind-view
 * Sub-tabs:  [WCAG Slots] [Contrast Checker] [Color Blind]
 */

import { ArrowLeftRight } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';

import type { ColorValue } from '@/lib/engine/color';

import ColorPickerModal from '@/components/modals/color-picker.modal';
import { useChromaStore } from '@/hooks/use-chroma-store';
import {
  BLACK_XYZ,
  OKLAB,
  VISION_TYPES,
  WHITE_XYZ,
  apcaContrast,
  apcaLevel,
  colorValue,
  contrastRatio,
  contrastFix,
  formatColor,
  isHex,
  parseColor,
  renderColor,
  simulateVision,
  textColor,
  wcagLevel,
  type WcagLevel,
  type ApcaLevel,
} from '@/lib/engine/browser';
import { lookupColorName } from '@/lib/tools/color-names';
import { cn } from '@/lib/utils';

import { ToolButton as Button, ToolSegments, ToolTabs } from './view-ui';

// ─── Shared badge helpers ─────────────────────────────────────────────────────

const WCAG_BADGE: Record<WcagLevel, { bg: string; fg: string }> = {
  AAA: { bg: 'rgba(34,197,94,.18)', fg: '#16a34a' },
  AA: { bg: 'rgba(59,130,246,.15)', fg: '#2563eb' },
  'AA Large': { bg: 'rgba(234,179,8,.15)', fg: '#a16207' },
  Fail: { bg: 'rgba(239,68,68,.13)', fg: '#dc2626' },
};
const APCA_BADGE: Record<ApcaLevel, { bg: string; fg: string }> = {
  Preferred: { bg: 'rgba(34,197,94,.18)', fg: '#16a34a' },
  Body: { bg: 'rgba(59,130,246,.15)', fg: '#2563eb' },
  Large: { bg: 'rgba(234,179,8,.15)', fg: '#a16207' },
  UI: { bg: 'rgba(168,85,247,.15)', fg: '#7c3aed' },
  Fail: { bg: 'rgba(239,68,68,.13)', fg: '#dc2626' },
};

type BadgeSize = 'xs' | 'sm' | 'lg';
const BADGE_PAD: Record<BadgeSize, string> = { xs: '1px 4px', sm: '2px 6px', lg: '4px 12px' };
const BADGE_FONT: Record<BadgeSize, number> = { xs: 8.5, sm: 10, lg: 14 };

function WcagBadge({ level, size = 'sm' }: { level: WcagLevel; size?: BadgeSize }) {
  const s = WCAG_BADGE[level];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: BADGE_PAD[size],
        borderRadius: 3,
        fontWeight: 700,
        fontSize: BADGE_FONT[size],
        letterSpacing: '.03em',
        background: s.bg,
        color: s.fg,
      }}>
      {level}
    </span>
  );
}

function ApcaBadge({
  level,
  lc,
  size = 'sm',
  hideLc = false,
}: {
  level: ApcaLevel;
  lc: number;
  size?: BadgeSize;
  hideLc?: boolean;
}) {
  const s = APCA_BADGE[level];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: BADGE_PAD[size],
        borderRadius: 3,
        fontWeight: 700,
        fontSize: BADGE_FONT[size],
        letterSpacing: '.03em',
        background: s.bg,
        color: s.fg,
      }}
      title={`Lc ${Math.abs(lc)}`}>
      {level}
      {!hideLc && ` (Lc${Math.abs(lc)})`}
    </span>
  );
}

const SECTION_LABEL =
  'font-display text-[10px] font-semibold tracking-widest text-muted-foreground uppercase';

function ModeToggle({
  useApca,
  setUseApca,
}: {
  useApca: boolean;
  setUseApca: (v: boolean) => void;
}) {
  return (
    <ToolSegments
      value={useApca ? 'apca' : 'wcag'}
      onValueChange={(mode) => setUseApca(mode === 'apca')}
      label='Contrast standard'
      items={[
        { id: 'wcag', label: 'WCAG 2.1' },
        { id: 'apca', label: 'APCA' },
      ]}
    />
  );
}

function ApcaNote() {
  return (
    <div className='rounded-md border border-muted bg-card px-3 py-2 text-[10.5px] leading-relaxed text-muted-foreground'>
      <strong>APCA (WCAG 3 draft)</strong> — more perceptually accurate. Lc ≥ 75 preferred · Lc ≥ 60
      body text · Lc ≥ 45 large text / UI · Lc ≥ 30 non-text.
    </div>
  );
}

// ─── Sub-tab: WCAG Slots ──────────────────────────────────────────────────────

function BackgroundResult({
  hex,
  against,
  useApca,
}: {
  hex: string;
  against: 'white' | 'black';
  useApca: boolean;
}) {
  const xyz = parseColor(hex).xyz;
  const bgXyz = against === 'white' ? WHITE_XYZ : BLACK_XYZ;
  const bgHex = against === 'white' ? '#ffffff' : '#000000';
  const ratio = contrastRatio(xyz, bgXyz);
  const lc = apcaContrast(xyz, bgXyz);
  const fix = !useApca && ratio < 4.5 ? contrastFix(xyz, bgXyz) : null;

  return (
    <div className='flex min-w-0 items-center gap-3'>
      {/* Color as text on the background, and the background as text on the color */}
      <div
        className='flex h-12 w-24 shrink-0 overflow-hidden rounded border border-border'
        aria-hidden>
        <div
          className='flex flex-1 items-center justify-center text-base font-extrabold'
          style={{ background: bgHex, color: hex }}>
          Aa
        </div>
        <div
          className='flex flex-1 items-center justify-center text-base font-extrabold'
          style={{ background: hex, color: bgHex }}>
          Aa
        </div>
      </div>
      <div className='min-w-0 flex-1'>
        <div className='flex flex-wrap items-center gap-2'>
          <span className='font-display text-lg leading-tight font-black whitespace-nowrap'>
            {useApca ? `Lc ${Math.abs(lc)}` : `${ratio.toFixed(2)}:1`}
          </span>
          {useApca ? (
            <ApcaBadge level={apcaLevel(lc)} lc={lc} hideLc />
          ) : (
            <WcagBadge level={wcagLevel(ratio)} />
          )}
        </div>
        {fix && (
          <div className='mt-0.5 text-[10px] leading-snug text-muted-foreground'>
            💡 {fix.direction === 'darken' ? 'Darken' : 'Lighten'} to{' '}
            <span className='font-mono font-bold' style={{ color: fix.hex }}>
              {fix.hex}
            </span>{' '}
            for AA
          </div>
        )}
      </div>
    </div>
  );
}

const ROW_GRID = '@2xl/accessibility:grid-cols-[minmax(12rem,0.8fr)_minmax(0,1fr)_minmax(0,1fr)]';

function ColorRow({ hex, index, useApca }: { hex: string; index: number; useApca: boolean }) {
  const name = lookupColorName(parseColor(hex), hex);
  return (
    <div
      className={cn(
        'grid flex-1 grid-cols-1 items-center gap-3 rounded-md border border-muted bg-card px-3 py-2.5',
        ROW_GRID,
      )}>
      <div className='flex min-w-0 items-center gap-3'>
        <div
          className='h-12 w-12 shrink-0 rounded border border-border'
          style={{ background: hex }}
        />
        <div className='min-w-0'>
          <div className='font-mono text-[12px] font-bold text-foreground'>{hex.toUpperCase()}</div>
          <div className='truncate text-[11px] text-muted-foreground'>{name}</div>
          <div className='text-[10px] text-muted-foreground'>Color {index + 1}</div>
        </div>
      </div>
      <BackgroundResult hex={hex} against='white' useApca={useApca} />
      <BackgroundResult hex={hex} against='black' useApca={useApca} />
    </div>
  );
}

function PairMatrix({ hexes, useApca }: { hexes: string[]; useApca: boolean }) {
  const passes = (fg: string, bg: string) =>
    useApca
      ? Math.abs(apcaContrast(parseColor(fg).xyz, parseColor(bg).xyz)) >= 45
      : contrastRatio(parseColor(fg).xyz, parseColor(bg).xyz) >= 4.5;
  let total = 0;
  let passing = 0;
  for (let i = 0; i < hexes.length; i++)
    for (let j = 0; j < hexes.length; j++)
      if (i !== j) {
        total++;
        if (passes(hexes[i], hexes[j])) passing++;
      }

  return (
    <section className='flex shrink-0 flex-col gap-3'>
      <div className='flex flex-wrap items-baseline justify-between gap-2'>
        <div className={SECTION_LABEL}>Palette color pairs</div>
        <div className='text-[10.5px] text-muted-foreground'>
          {passing} of {total} combinations pass{' '}
          {useApca ? 'APCA Large (Lc ≥ 45)' : 'WCAG AA (4.5:1)'} · rows are text, columns are
          backgrounds · faded cells fail
        </div>
      </div>
      <div className='overflow-x-auto rounded-md border border-muted bg-card p-2'>
        <table className='w-full min-w-max table-fixed border-separate border-spacing-1'>
          <thead>
            <tr>
              <th className='w-10'>
                <span className='sr-only'>Text color \ background</span>
              </th>
              {hexes.map((bg, j) => (
                <th key={j} scope='col' className='font-normal'>
                  <div
                    className='mx-auto h-5 w-5 rounded border border-border'
                    style={{ background: bg }}
                    title={`Background ${bg.toUpperCase()}`}
                  />
                  <span className='sr-only'>Background {bg.toUpperCase()}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hexes.map((fg, i) => (
              <tr key={i}>
                <th scope='row' className='font-normal'>
                  <div
                    className='mx-auto h-5 w-5 rounded border border-border'
                    style={{ background: fg }}
                    title={`Text ${fg.toUpperCase()}`}
                  />
                  <span className='sr-only'>Text {fg.toUpperCase()}</span>
                </th>
                {hexes.map((bg, j) => {
                  if (i === j)
                    return (
                      <td key={j} className='text-center text-[10px] text-muted-foreground'>
                        —
                      </td>
                    );
                  const xyzFg = parseColor(fg).xyz;
                  const xyzBg = parseColor(bg).xyz;
                  const label = useApca
                    ? `Lc${Math.abs(apcaContrast(xyzFg, xyzBg))}`
                    : `${contrastRatio(xyzFg, xyzBg).toFixed(1)}:1`;
                  const ok = passes(fg, bg);
                  return (
                    <td
                      key={j}
                      aria-label={`${fg.toUpperCase()} on ${bg.toUpperCase()}: ${label}, ${ok ? 'pass' : 'fail'}`}>
                      <div
                        className={cn(
                          'flex min-w-16 flex-col items-center gap-0.5 rounded px-1.5 py-1.5',
                          !ok && 'opacity-45',
                        )}
                        style={{ background: bg }}
                        title={`${fg.toUpperCase()} on ${bg.toUpperCase()} · ${label} · ${ok ? 'pass' : 'fail'}`}>
                        <span className='text-sm leading-none font-extrabold' style={{ color: fg }}>
                          Aa
                        </span>
                        <span className='rounded bg-card px-1 font-mono text-[9px] text-foreground'>
                          {label}
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function WcagSlotsTab() {
  const slots = useChromaStore((s) => s.slots);
  const [useApca, setUseApca] = useState(false);
  const hexes = useMemo(() => slots.map((s) => s.color.hex), [slots]);
  const stats = useMemo(() => {
    const colors = hexes.map((hex) => parseColor(hex).xyz);
    const aaOnWhite = colors.filter((xyz) => contrastRatio(xyz, WHITE_XYZ) >= 4.5).length;
    const aaOnBlack = colors.filter((xyz) => contrastRatio(xyz, BLACK_XYZ) >= 4.5).length;
    const aaaAny = colors.filter(
      (xyz) => Math.max(contrastRatio(xyz, WHITE_XYZ), contrastRatio(xyz, BLACK_XYZ)) >= 7,
    ).length;
    const aaAny = colors.filter(
      (xyz) => Math.max(contrastRatio(xyz, WHITE_XYZ), contrastRatio(xyz, BLACK_XYZ)) >= 4.5,
    ).length;
    const pairsTotal = (hexes.length * (hexes.length - 1)) / 2;
    let pairsAA = 0;
    for (let i = 0; i < hexes.length; i++)
      for (let j = i + 1; j < hexes.length; j++)
        if (contrastRatio(colors[i]!, colors[j]!) >= 4.5) pairsAA++;
    return { aaOnWhite, aaOnBlack, aaAny, aaaAny, pairsAA, pairsTotal };
  }, [hexes]);

  if (!slots.length) return <EmptyState title='Accessibility' />;

  return (
    <div className='tool-panel-space tool-panel-stack flex min-h-0 flex-1 flex-col overflow-hidden'>
      <div className='flex flex-wrap items-center justify-between gap-2.5'>
        <p className='max-w-3xl text-[11px] text-muted-foreground'>
          How each palette color performs as text or UI against white and black backgrounds.
        </p>
        <ModeToggle useApca={useApca} setUseApca={setUseApca} />
      </div>
      {useApca && <ApcaNote />}

      <div className='grid grid-cols-2 gap-2 @xl/accessibility:grid-cols-3 @4xl/accessibility:grid-cols-5'>
        {[
          {
            label: 'AA on white',
            val: `${stats.aaOnWhite}/${slots.length}`,
            pass: stats.aaOnWhite === slots.length,
          },
          {
            label: 'AA on black',
            val: `${stats.aaOnBlack}/${slots.length}`,
            pass: stats.aaOnBlack === slots.length,
          },
          {
            label: 'AA any bg',
            val: `${stats.aaAny}/${slots.length}`,
            pass: stats.aaAny === slots.length,
          },
          {
            label: 'AAA any bg',
            val: `${stats.aaaAny}/${slots.length}`,
            pass: stats.aaaAny === slots.length,
          },
          {
            label: 'Passing pairs',
            val: `${stats.pairsAA}/${stats.pairsTotal}`,
            pass: stats.pairsAA === stats.pairsTotal,
          },
        ].map(({ label, val, pass }) => (
          <div key={label} className='rounded-md border border-muted bg-card px-3 py-2'>
            <div
              style={{
                fontSize: 17,
                fontWeight: 800,
                color: pass ? '#16a34a' : 'var(--color-foreground)',
              }}>
              {val}
            </div>
            <div className='mt-0.5 text-[9px] tracking-[.05em] text-muted-foreground uppercase'>
              {label}
            </div>
          </div>
        ))}
      </div>

      <div className='tool-panel-space tool-panel-stack flex min-h-0 flex-1 flex-col overflow-auto'>
        <section className='flex flex-1 flex-col gap-2'>
          <div className={cn('hidden shrink-0 gap-3 px-3 md:grid', ROW_GRID)}>
            <div className={SECTION_LABEL}>Color</div>
            <div className={SECTION_LABEL}>Against white</div>
            <div className={SECTION_LABEL}>Against black</div>
          </div>
          {slots.map((s, i) => (
            <ColorRow key={s.id} hex={s.color.hex} index={i} useApca={useApca} />
          ))}
        </section>

        {hexes.length > 1 && <PairMatrix hexes={hexes} useApca={useApca} />}
      </div>
    </div>
  );
}

// ─── Sub-tab: Contrast Checker ────────────────────────────────────────────────

function ColorField({
  label,
  value,
  color,
  onChange,
  onOpenPicker,
  palette,
}: {
  label: string;
  value: string;
  color: ColorValue;
  onChange: (hex: string) => void;
  onOpenPicker: () => void;
  palette: string[];
}) {
  const current = formatColor(color, 'hex').toLowerCase();
  const rendition = renderColor(color);
  return (
    <div className='flex min-w-0 flex-col gap-3 rounded-md border border-muted bg-card p-4'>
      <div className={SECTION_LABEL}>{label}</div>
      <div className='flex items-center gap-2'>
        <button
          type='button'
          className='h-10 w-10 shrink-0 cursor-pointer rounded border-2 border-input'
          style={{ background: rendition.css }}
          onClick={onOpenPicker}
          title={`Pick ${label.toLowerCase()} color`}
          aria-label={`Pick ${label.toLowerCase()} color`}
        />
        <input
          className='w-full min-w-0 rounded border border-border bg-muted px-2 py-1.5 font-mono text-[12px] tracking-[.06em] text-foreground transition-colors outline-none focus:border-ring'
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={7}
          spellCheck={false}
          autoComplete='off'
          aria-label={`${label} hex`}
        />
      </div>
      <div className='text-[10px] text-muted-foreground'>
        {lookupColorName(color, rendition.hex)}
      </div>
      {palette.length > 0 && (
        <div className='flex flex-wrap gap-1' aria-label={`Use a palette color as ${label}`}>
          {palette.map((hex, i) => (
            <button
              key={i}
              type='button'
              className={cn(
                'h-6 w-6 cursor-pointer rounded border border-border transition-transform hover:scale-110',
                hex.toLowerCase() === current &&
                  'ring-2 ring-primary ring-offset-1 ring-offset-card',
              )}
              style={{ background: hex }}
              onClick={() => onChange(hex)}
              title={`Use ${hex.toUpperCase()}`}
              aria-label={`Use ${hex.toUpperCase()}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PassPill({ pass }: { pass: boolean }) {
  const s = WCAG_BADGE[pass ? 'AAA' : 'Fail'];
  return (
    <span
      className='shrink-0 rounded-[3px] px-1.5 py-0.5 text-[10px] font-bold tracking-[.03em]'
      style={{ background: s.bg, color: s.fg }}>
      {pass ? 'Pass' : 'Fail'}
    </span>
  );
}

function CheckRow({ label, detail, pass }: { label: string; detail: string; pass: boolean }) {
  return (
    <div className='flex items-center justify-between gap-3 border-b border-muted py-1.5 last:border-b-0'>
      <div className='min-w-0'>
        <div className='text-sm text-secondary-foreground'>{label}</div>
        <div className='text-[10px] text-muted-foreground'>{detail}</div>
      </div>
      <PassPill pass={pass} />
    </div>
  );
}

function ContrastCheckerTab() {
  const slots = useChromaStore((s) => s.slots);
  const [fg, setFg] = useState('#ffffff');
  const [bg, setBg] = useState('#1a1a2e');
  const [useApca, setUseApca] = useState(false);
  const [editingColor, setEditingColor] = useState<'fg' | 'bg' | null>(null);

  const fgColor = useMemo(() => (isHex(fg) ? parseColor(fg) : parseColor('#ffffff')), [fg]);
  const bgColor = useMemo(() => (isHex(bg) ? parseColor(bg) : parseColor('#1a1a2e')), [bg]);
  const fgHex = formatColor(fgColor, 'hex');
  const bgHex = formatColor(bgColor, 'hex');
  const ratio = contrastRatio(fgColor.xyz, bgColor.xyz);
  const level = wcagLevel(ratio);
  const lc = Math.abs(apcaContrast(fgColor.xyz, bgColor.xyz));
  const palette = slots.map((s) => s.color.hex);
  const fixFg = !useApca && ratio < 4.5 ? contrastFix(fgColor.xyz, bgColor.xyz) : null;
  const fixBg = !useApca && ratio < 4.5 ? contrastFix(bgColor.xyz, fgColor.xyz) : null;

  const swap = () => {
    const t = fg;
    setFg(bg);
    setBg(t);
  };

  const checks = useApca
    ? [
        { label: 'Preferred body text', detail: 'Lc 75', pass: lc >= 75 },
        { label: 'Body text', detail: 'Lc 60', pass: lc >= 60 },
        { label: 'Large text & UI components', detail: 'Lc 45', pass: lc >= 45 },
        { label: 'Non-text & decorative', detail: 'Lc 30', pass: lc >= 30 },
      ]
    : [
        { label: 'Normal text — AA', detail: '4.5:1 · SC 1.4.3', pass: ratio >= 4.5 },
        { label: 'Large text — AA', detail: '3:1 · SC 1.4.3', pass: ratio >= 3 },
        { label: 'Normal text — AAA', detail: '7:1 · SC 1.4.6', pass: ratio >= 7 },
        { label: 'Large text — AAA', detail: '4.5:1 · SC 1.4.6', pass: ratio >= 4.5 },
        { label: 'UI components & graphics', detail: '3:1 · SC 1.4.11', pass: ratio >= 3 },
      ];

  const previewRows = [
    { id: 'large', label: 'Large text', detail: '24 px' },
    { id: 'body', label: 'Body text', detail: '13 px' },
    { id: 'muted', label: 'Muted text', detail: '70% opacity' },
    { id: 'controls', label: 'UI controls', detail: 'Non-text contrast' },
  ] as const;

  return (
    <>
      <div className='tool-panel-space tool-panel-stack flex min-h-0 flex-1 flex-col items-center overflow-auto'>
        {/* Colors: identical cards either side of the swap control, so they line up */}
        <div className='grid w-full max-w-360 grid-cols-1 items-stretch gap-3 @2xl/accessibility:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]'>
          <ColorField
            label='Foreground'
            value={fg}
            color={fgColor}
            onChange={setFg}
            onOpenPicker={() => setEditingColor('fg')}
            palette={palette}
          />
          <div className='flex items-center justify-center'>
            <Button
              variant='ghost'
              size='icon-sm'
              onClick={swap}
              title='Swap colors'
              aria-label='Swap foreground and background'>
              <ArrowLeftRight className='size-4' />
            </Button>
          </div>
          <ColorField
            label='Background'
            value={bg}
            color={bgColor}
            onChange={setBg}
            onOpenPicker={() => setEditingColor('bg')}
            palette={palette}
          />
        </div>

        <div className='grid max-h-168 min-h-0 w-full flex-none grid-cols-1 gap-4 @4xl/accessibility:flex-1 @4xl/accessibility:grid-cols-[minmax(0,1.5fr)_minmax(20rem,1fr)] @7xl/accessibility:max-h-192'>
          <section
            role='table'
            aria-label='Contrast preview examples'
            className='flex min-h-80 min-w-0 flex-col overflow-hidden rounded-md border border-muted'>
            <div
              role='row'
              className='grid shrink-0 grid-cols-[5.5rem_minmax(0,1fr)_minmax(0,1fr)] bg-card px-3 py-2'>
              <div role='columnheader' className={SECTION_LABEL}>
                Sample
              </div>
              <div role='columnheader' className={SECTION_LABEL}>
                Foreground on background
              </div>
              <div role='columnheader' className={SECTION_LABEL}>
                Background on foreground
              </div>
            </div>
            <div role='rowgroup' className='flex min-h-0 flex-1 flex-col'>
              {previewRows.map(({ id, label, detail }) => (
                <div
                  key={id}
                  role='row'
                  className='grid min-h-0 flex-1 grid-cols-[5.5rem_minmax(0,1fr)_minmax(0,1fr)] border-t border-muted'>
                  <div role='rowheader' className='flex min-w-0 flex-col justify-center gap-1 px-3'>
                    <span className='text-[11px] font-semibold text-foreground'>{label}</span>
                    <span className='text-[10px] text-muted-foreground'>{detail}</span>
                  </div>
                  {(['forward', 'reverse'] as const).map((direction) => {
                    const reversed = direction === 'reverse';
                    const sampleBackground = reversed ? fgHex : bgHex;
                    const sampleColor = reversed ? bgHex : fgHex;
                    const controlBackground = reversed ? bgHex : fgHex;
                    const controlColor = reversed ? fgHex : bgHex;
                    return (
                      <div
                        key={direction}
                        role='cell'
                        className='flex min-w-0 items-center overflow-hidden border-l border-border/30 px-3 py-2'
                        style={{ background: sampleBackground, color: sampleColor }}>
                        {id === 'large' && (
                          <span className='font-display text-2xl leading-tight font-black'>
                            Aa Large sample
                          </span>
                        )}
                        {id === 'body' && (
                          <span className='text-[13px] leading-relaxed'>
                            The quick brown fox jumps over the lazy dog
                          </span>
                        )}
                        {id === 'muted' && (
                          <span className='text-[13px] leading-relaxed opacity-70'>
                            Secondary copy at 70% opacity
                          </span>
                        )}
                        {id === 'controls' && (
                          <div className='flex flex-wrap items-center gap-2'>
                            <span
                              className='rounded px-2.5 py-1.5 text-[10px] font-bold'
                              style={{ background: controlBackground, color: controlColor }}>
                              Solid
                            </span>
                            <span
                              className='rounded border px-2.5 py-1.5 text-[10px] font-bold'
                              style={{ borderColor: controlColor }}>
                              Outline
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </section>

          {/* Result */}
          <div className='flex max-h-136 min-w-0 flex-col gap-3 rounded-md border border-muted bg-card p-4 @7xl/accessibility:max-h-168'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <div className={SECTION_LABEL}>Result</div>
              <ModeToggle useApca={useApca} setUseApca={setUseApca} />
            </div>
            <div className='flex flex-wrap items-center gap-4'>
              <div className='font-display text-[36px] leading-none font-black'>
                {useApca ? `Lc${lc.toFixed(0)}` : `${ratio.toFixed(2)}:1`}
              </div>
              {useApca ? (
                <ApcaBadge level={apcaLevel(lc)} lc={lc} size='lg' hideLc />
              ) : (
                <WcagBadge level={level} size='lg' />
              )}
            </div>
            {useApca && <ApcaNote />}
            <div className='flex max-h-96 min-h-0 flex-1 flex-col justify-between @7xl/accessibility:max-h-128'>
              {checks.map((c) => (
                <CheckRow key={c.label} {...c} />
              ))}
            </div>
            {(fixFg || fixBg) && (
              <div className='flex flex-col gap-2 rounded border border-muted px-3 py-2.5'>
                <div className='text-[10.5px] text-muted-foreground'>
                  💡 Closest colors that reach AA
                </div>
                {(
                  [
                    ['Foreground', fixFg, setFg],
                    ['Background', fixBg, setBg],
                  ] as const
                ).map(([role, fix, apply]) =>
                  fix ? (
                    <div key={role} className='flex items-center gap-2 text-[10.5px]'>
                      <span
                        className='h-4 w-4 shrink-0 rounded border border-border'
                        style={{ background: fix.hex }}
                      />
                      <span className='flex-1 text-muted-foreground'>
                        {fix.direction === 'darken' ? 'Darken' : 'Lighten'} {role.toLowerCase()} to{' '}
                        <span className='font-mono font-bold text-foreground'>{fix.hex}</span>
                      </span>
                      <Button variant='outline' size='xs' onClick={() => apply(fix.hex)}>
                        Apply
                      </Button>
                    </div>
                  ) : null,
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <ColorPickerModal
        isOpen={!!editingColor}
        initialHex={editingColor === 'fg' ? fg : bg}
        title={editingColor === 'fg' ? 'Foreground color' : 'Background color'}
        onApply={(hex) => {
          if (editingColor === 'fg') setFg(hex);
          else setBg(hex);
          setEditingColor(null);
        }}
        onClose={() => setEditingColor(null)}
      />
    </>
  );
}

// ─── Sub-tab: Color Blind ─────────────────────────────────────────────────────

const CB_GROUP: Record<string, string> = {
  normal: 'Reference',
  protanopia: 'Red · protan',
  protanomaly: 'Red · protan',
  deuteranopia: 'Green · deutan',
  deuteranomaly: 'Green · deutan',
  tritanopia: 'Blue · tritan',
  tritanomaly: 'Blue · tritan',
  achromatopsia: 'Monochromacy',
  achromatomaly: 'Monochromacy',
};
const CB_ORDER = Object.keys(CB_GROUP);

// OKLab distance below which two colors are hard to tell apart at a glance
const CONFUSION_THRESHOLD = 0.04;

function oklabDistance(a: string, b: string) {
  return OKLAB.distance(OKLAB.xyzToLab(parseColor(a).xyz), OKLAB.xyzToLab(parseColor(b).xyz));
}

function ColorBlindTab() {
  const slots = useChromaStore((s) => s.slots);
  const [showHex, setShowHex] = useState(true);

  const rows = useMemo(() => {
    const original = slots.map((slot) => slot.color.value ?? parseColor(slot.color.hex));
    const originalHex = original.map((color) => renderColor(color).hex);
    const types = [...VISION_TYPES].sort(
      (a, b) => (CB_ORDER.indexOf(a.id) + 1 || 99) - (CB_ORDER.indexOf(b.id) + 1 || 99),
    );
    return types.map((cbType) => {
      const sim = original.map(
        (color) => renderColor(colorValue(simulateVision(color.xyz, cbType.id), color.alpha)).hex,
      );
      // Only flag pairs that were distinct to begin with
      const confused: [number, number][] = [];
      for (let i = 0; i < sim.length; i++)
        for (let j = i + 1; j < sim.length; j++)
          if (
            oklabDistance(sim[i], sim[j]) < CONFUSION_THRESHOLD &&
            (cbType.id === 'normal' ||
              oklabDistance(originalHex[i]!, originalHex[j]!) >= CONFUSION_THRESHOLD)
          )
            confused.push([i, j]);
      return { cbType, sim, confused };
    });
  }, [slots]);

  if (!slots.length) return <EmptyState title='Color Blindness Simulator' />;

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4'>
      <div className='flex shrink-0 flex-wrap items-center justify-between gap-2.5'>
        <p className='max-w-3xl text-[11px] text-muted-foreground'>
          How your palette appears under each type of color vision deficiency. Colors stay in the
          same columns so you can compare each one down the page; flagged pairs become hard to tell
          apart.
        </p>
        <Button
          size='xs'
          variant='ghost'
          aria-pressed={showHex}
          className={
            showHex ? 'border-border bg-accent/30 text-foreground' : 'text-muted-foreground'
          }
          onClick={() => setShowHex((v) => !v)}>
          Hex labels
        </Button>
      </div>

      <div className='flex min-h-0 flex-1 flex-col overflow-auto rounded-md border border-muted bg-card p-2'>
        <table className='h-full w-full min-w-max table-fixed border-separate border-spacing-0.75'>
          <thead>
            <tr>
              <th className='w-40 px-2 text-left font-normal @4xl/accessibility:w-64'>
                <span className={SECTION_LABEL}>Vision type</span>
              </th>
              {slots.map((s, i) => (
                <th
                  key={s.id}
                  scope='col'
                  className='font-normal'
                  aria-label={`Color ${i + 1}, ${s.color.hex.toUpperCase()}`}>
                  <div className='flex flex-col items-center gap-1'>
                    <div
                      className='h-5 w-5 rounded border border-border'
                      style={{ background: s.color.hex }}
                      title={s.color.hex.toUpperCase()}
                    />
                    <span className='text-[10px] text-muted-foreground'>{i + 1}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ cbType, sim, confused }, r) => {
              const ok = confused.length === 0;
              const badge = WCAG_BADGE[ok ? 'AAA' : 'AA Large'];
              const group = CB_GROUP[cbType.id] ?? 'Other';
              const newGroup = r === 0 || (CB_GROUP[rows[r - 1].cbType.id] ?? 'Other') !== group;
              return (
                <Fragment key={cbType.id}>
                  {newGroup && (
                    <tr>
                      <th
                        colSpan={sim.length + 1}
                        scope='colgroup'
                        className={cn(
                          'h-6 px-2 text-left text-[9.5px] font-semibold tracking-widest text-muted-foreground uppercase',
                          r > 0 && 'pt-1',
                        )}>
                        {group}
                      </th>
                    </tr>
                  )}
                  <tr>
                    <th scope='row' className='px-2 py-0.5 text-left align-middle font-normal'>
                      <div className='font-display text-sm font-bold'>{cbType.name}</div>
                      <div className='text-[10px] text-muted-foreground'>{cbType.desc}</div>
                      <span
                        className='mt-1 inline-block rounded-[3px] px-1.5 py-0.5 text-[10px] font-bold tracking-[.03em] whitespace-nowrap'
                        style={{ background: badge.bg, color: badge.fg }}
                        title={
                          ok
                            ? undefined
                            : confused.map(([i, j]) => `Color ${i + 1} & ${j + 1}`).join(' · ')
                        }>
                        {ok
                          ? 'All distinguishable'
                          : `${confused.length} pair${confused.length > 1 ? 's' : ''} may be confused`}
                      </span>
                    </th>
                    {sim.map((hex, i) => {
                      const isConfused = confused.some(([a, b]) => a === i || b === i);
                      const tc = textColor(parseColor(hex).xyz);
                      return (
                        <td
                          key={i}
                          aria-label={`Color ${i + 1} appears as ${hex.toUpperCase()}${isConfused ? ', may be confused' : ''}`}>
                          <div
                            className='flex h-full min-h-12 min-w-16 items-center justify-center gap-1 rounded'
                            style={{ background: hex }}
                            title={`Color ${i + 1}: ${slots[i].color.hex.toUpperCase()} → ${hex.toUpperCase()}`}>
                            {isConfused && (
                              <span
                                className='font-sans text-sm leading-none font-bold'
                                style={{ color: tc }}
                                aria-hidden>
                                ≈
                              </span>
                            )}
                            {showHex && (
                              <span
                                className='font-sans text-[13px] leading-none font-bold'
                                style={{ color: tc }}>
                                {hex.toUpperCase()}
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Shared: empty state ──────────────────────────────────────────────────────

function EmptyState({ title }: { title: string }) {
  return (
    <div className='min-h-0 flex-1 overflow-auto p-6'>
      <p className='text-[12px] text-muted-foreground'>Generate a palette first to use {title}.</p>
    </div>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

type Tab = 'wcag' | 'contrast' | 'colorblind';
const TABS: { id: Tab; label: string }[] = [
  { id: 'wcag', label: 'WCAG Slots' },
  { id: 'contrast', label: 'Contrast Checker' },
  { id: 'colorblind', label: 'Color Blind' },
];

function TabBar({ active, setActive }: { active: Tab; setActive: (t: Tab) => void }) {
  return <ToolTabs value={active} onValueChange={setActive} label='Accessibility' items={TABS} />;
}

// ─── Root export ──────────────────────────────────────────────────────────────

export default function AccessibilityView() {
  const [activeTab, setActiveTab] = useState<Tab>('wcag');
  return (
    <div className='@container/accessibility flex min-h-0 flex-1 flex-col overflow-hidden'>
      <div className='shrink-0 px-4 pt-5 pb-0'>
        <h2 className='mb-1'>Accessibility</h2>
      </div>
      <TabBar active={activeTab} setActive={setActiveTab} />
      {activeTab === 'wcag' && <WcagSlotsTab />}
      {activeTab === 'contrast' && <ContrastCheckerTab />}
      {activeTab === 'colorblind' && <ColorBlindTab />}
    </div>
  );
}
