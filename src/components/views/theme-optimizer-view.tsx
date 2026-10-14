import { useMemo, useState } from 'react';

import type { ColorValue } from '@/lib/engine/color';
import type { PaletteSlot, ThemePaletteVariant } from '@/types';

import { useChromaStore } from '@/hooks/use-chroma-store';
import {
  apcaContrast,
  colorToStop,
  compositeColor,
  contrastRatio,
  deriveThemeTokens,
  parseColor,
  recommendThemeColor,
  renderColor,
  stopToColor,
  themeColorFingerprint,
  type ThemeContrastTarget,
} from '@/lib/engine/browser';
import { cn } from '@/lib/utils';

import { ToolButton as Button, ToolSegments, TYPE, ViewHeader } from './view-ui';

type ThemeMode = 'light' | 'dark';
type ContrastStandard = 'wcag' | 'apca';

const WHITE_BACKGROUND = parseColor('#ffffff');
const BLACK_BACKGROUND = parseColor('#000000');
const APCA_TARGETS = [45, 60, 75] as const;

function targetLimit(target: ThemeContrastTarget) {
  return target.standard === 'wcag' ? 4.5 : target.target;
}

function scoreColor(color: ColorValue, background: ColorValue, target: ThemeContrastTarget) {
  const visible = compositeColor(color, background);
  return target.standard === 'wcag'
    ? contrastRatio(visible.xyz, background.xyz)
    : Math.abs(apcaContrast(visible.xyz, background.xyz));
}

function formatScore(score: number, standard: ContrastStandard) {
  return standard === 'wcag' ? `${score.toFixed(2)}:1` : `Lc ${score.toFixed(0)}`;
}

function sameColor(first: ColorValue, second: ColorValue) {
  return (
    first.display === second.display &&
    first.alpha === second.alpha &&
    first.xyz.every((value, index) => Math.abs(value - second.xyz[index]!) < 1e-9)
  );
}

function PaletteRecommendation({
  slot,
  index,
  name,
  mode,
  background,
  target,
  recommendation,
  variants,
  setThemeVariant,
}: {
  slot: PaletteSlot;
  index: number;
  name: string;
  mode: ThemeMode;
  background: ColorValue;
  target: ThemeContrastTarget;
  recommendation: ReturnType<typeof recommendThemeColor>;
  variants: Readonly<Record<string, ThemePaletteVariant>>;
  setThemeVariant: (
    slotId: string,
    sourceFingerprint: string,
    mode: ThemeMode,
    color?: ReturnType<typeof colorToStop>,
  ) => void;
}) {
  const source = stopToColor(slot.color);
  const sourceFingerprint = themeColorFingerprint(source);
  const variant = variants[slot.id];
  const appliedStop = variant?.sourceFingerprint === sourceFingerprint ? variant[mode] : undefined;
  const applied = appliedStop ? stopToColor(appliedStop) : undefined;
  const displayedColor = applied ?? recommendation.color;
  const score = scoreColor(displayedColor, background, target);
  const passes = score >= targetLimit(target);
  const sourceRendition = renderColor(source);
  const candidateRendition = renderColor(displayedColor);
  const surfaceRendition = renderColor(background);
  const sourceScore = scoreColor(source, background, target);
  const label = name || `Color ${index + 1}`;
  const displayedLabel =
    displayedColor.display === 'srgb' && displayedColor.alpha === 1
      ? candidateRendition.hex.toUpperCase()
      : candidateRendition.css;
  const recommendationRendition = renderColor(recommendation.color);
  const recommendationLabel =
    recommendation.color.display === 'srgb' && recommendation.color.alpha === 1
      ? recommendationRendition.hex.toUpperCase()
      : recommendationRendition.css;
  const targetDescription = target.standard === 'wcag' ? 'AA' : `APCA Lc ${target.target}`;
  const whiteScore = scoreColor(displayedColor, WHITE_BACKGROUND, target);
  const blackScore = scoreColor(displayedColor, BLACK_BACKGROUND, target);
  const canReplace =
    recommendation.direction !== 'none' && (!applied || !sameColor(applied, recommendation.color));

  return (
    <article className='grid min-w-0 gap-3 rounded-md border border-muted bg-card p-3'>
      <div className='flex min-w-0 items-center justify-between gap-3'>
        <div className='flex min-w-0 items-center gap-2'>
          <span
            className='size-8 shrink-0 rounded border border-border'
            style={{ background: sourceRendition.css }}
            title={`Source ${slot.color.hex.toUpperCase()}`}
          />
          <div className='min-w-0'>
            <div className={cn(TYPE.title, 'truncate')}>{label}</div>
            <div className='font-mono text-[10px] text-muted-foreground'>
              {slot.color.hex.toUpperCase()}
            </div>
          </div>
        </div>
        <div
          className={cn(
            'flex h-10 min-w-14 shrink-0 items-center justify-center rounded border border-border px-2',
            !passes && 'opacity-45',
          )}
          style={{ background: surfaceRendition.css }}
          title={`Preview on ${mode} theme background · ${formatScore(score, target.standard)}`}>
          <span
            className='text-sm leading-none font-extrabold'
            style={{ color: candidateRendition.css }}>
            Aa
          </span>
        </div>
      </div>

      <div className='flex min-w-0 flex-wrap items-center justify-between gap-2'>
        <div className='flex min-w-0 items-center gap-2'>
          <span
            className='size-5 shrink-0 rounded-sm border border-border'
            style={{ background: candidateRendition.css }}
            title={`Suggested ${displayedLabel}`}
          />
          <span className='truncate font-mono text-[10px] text-foreground' title={displayedLabel}>
            {displayedLabel}
          </span>
          <span className='text-[10px] text-muted-foreground'>
            {applied
              ? 'Applied'
              : recommendation.direction === 'none'
                ? 'Meets target'
                : 'Suggested'}
          </span>
        </div>
        <span
          className={cn(
            'font-mono text-[10px]',
            passes ? 'text-foreground' : 'text-muted-foreground',
          )}>
          {formatScore(score, target.standard)}
        </span>
      </div>
      {recommendation.direction !== 'none' && (
        <div className='mt-0.5 text-[10px] leading-snug text-muted-foreground'>
          💡{' '}
          {recommendation.reachable
            ? `${recommendation.direction === 'darken' ? 'Darken' : 'Lighten'} to `
            : `Best effort: ${recommendation.direction} toward `}
          <span className='font-mono font-bold' style={{ color: recommendationRendition.css }}>
            {recommendationLabel}
          </span>
          {recommendation.reachable ? ` for ${targetDescription}` : '; target unreachable'}
        </div>
      )}

      <div className='flex flex-wrap gap-x-3 gap-y-1 border-t border-border pt-2'>
        <span className={TYPE.meta}>
          Surface {formatScore(sourceScore, target.standard)} →{' '}
          {formatScore(score, target.standard)}
        </span>
        <span className={TYPE.meta}>White {formatScore(whiteScore, target.standard)}</span>
        <span className={TYPE.meta}>Black {formatScore(blackScore, target.standard)}</span>
        {!recommendation.reachable && !applied && (
          <span className='text-[10px] font-semibold text-destructive'>Target unreachable</span>
        )}
      </div>

      <div className='flex flex-wrap items-center gap-2'>
        {canReplace && (
          <Button
            variant='outline'
            size='xs'
            onClick={() =>
              setThemeVariant(slot.id, sourceFingerprint, mode, colorToStop(recommendation.color))
            }>
            {applied
              ? 'Update'
              : recommendation.reachable
                ? 'Apply recommendation'
                : 'Apply best effort'}
          </Button>
        )}
        {applied && (
          <Button
            variant='ghost'
            size='xs'
            onClick={() => setThemeVariant(slot.id, sourceFingerprint, mode)}>
            Revert
          </Button>
        )}
      </div>
    </article>
  );
}

function ThemeModePanel({
  mode,
  backgroundHex,
  slots,
  names,
  target,
  variants,
  setThemeVariant,
}: {
  mode: ThemeMode;
  backgroundHex: string;
  slots: readonly PaletteSlot[];
  names: readonly string[];
  target: ThemeContrastTarget;
  variants: Readonly<Record<string, ThemePaletteVariant>>;
  setThemeVariant: (
    slotId: string,
    sourceFingerprint: string,
    mode: ThemeMode,
    color?: ReturnType<typeof colorToStop>,
  ) => void;
}) {
  const background = useMemo(() => parseColor(backgroundHex), [backgroundHex]);
  const backgroundRendition = renderColor(background);
  const rows = useMemo(
    () =>
      slots.map((slot, index) => ({
        slot,
        index,
        recommendation: recommendThemeColor(stopToColor(slot.color), background, target),
      })),
    [slots, background, target],
  );
  const passes = rows.filter((row) => row.recommendation.meetsTarget).length;

  return (
    <section className='tool-panel-space tool-panel-stack flex min-w-0 flex-col gap-4 px-4 py-4 3xl:gap-5 3xl:px-6 3xl:py-5 min-[160rem]:gap-6 min-[160rem]:px-7 min-[160rem]:py-6'>
      <header className='flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border pb-3'>
        <div className='flex items-center gap-2'>
          <span
            className='size-6 rounded border border-border'
            style={{ background: backgroundRendition.css }}
            title={`${mode} theme background`}
          />
          <div>
            <h3 className='text-[13px] font-semibold text-foreground capitalize'>{mode} theme</h3>
            <p className={TYPE.meta}>
              {slots.length} slots · {passes} recommendations meet target
            </p>
          </div>
        </div>
        <span className='font-mono text-[10px] text-muted-foreground'>
          {backgroundRendition.hex.toUpperCase()} surface
        </span>
      </header>
      <div className='grid shrink-0 grid-cols-1 gap-2 @xl/theme-optimizer:grid-cols-2'>
        {rows.map(({ slot, index, recommendation }) => (
          <PaletteRecommendation
            key={slot.id}
            slot={slot}
            index={index}
            name={slot.name || names[index] || `Color ${index + 1}`}
            mode={mode}
            background={background}
            target={target}
            recommendation={recommendation}
            variants={variants}
            setThemeVariant={setThemeVariant}
          />
        ))}
      </div>
    </section>
  );
}

export default function ThemeOptimizerView() {
  const slots = useChromaStore((state) => state.slots);
  const utilityColors = useChromaStore((state) => state.utilityColors);
  const variants = useChromaStore((state) => state.themeVariants);
  const setThemeVariant = useChromaStore((state) => state.setThemeVariant);
  const [standard, setStandard] = useState<ContrastStandard>('wcag');
  const [apcaTarget, setApcaTarget] = useState<(typeof APCA_TARGETS)[number]>(45);

  const palette = useMemo(() => slots.map((slot) => stopToColor(slot.color)), [slots]);
  const tokens = useMemo(() => deriveThemeTokens(palette, utilityColors), [palette, utilityColors]);
  const names = useMemo(() => tokens.palette.map((entry) => entry.name), [tokens]);
  const target = useMemo<ThemeContrastTarget>(
    () => (standard === 'wcag' ? { standard: 'wcag' } : { standard: 'apca', target: apcaTarget }),
    [standard, apcaTarget],
  );
  const themeBackground = tokens.semantic.find((token) => token.name === '--background');

  return (
    <div className='@container/theme-optimizer flex min-h-0 flex-1 flex-col overflow-hidden'>
      <ViewHeader
        title='Theme Optimizer'
        description='Review and apply light and dark palette variants without changing the source palette.'
      />
      <div className='tool-panel-space flex shrink-0 flex-wrap items-center justify-between gap-3 border-y border-border px-4 py-4 3xl:px-6 3xl:py-5 min-[160rem]:px-7 min-[160rem]:py-6'>
        <ToolSegments
          value={standard}
          onValueChange={setStandard}
          label='Contrast standard'
          items={[
            { id: 'wcag', label: 'WCAG AA · 4.5:1' },
            { id: 'apca', label: 'APCA' },
          ]}
        />
        {standard === 'apca' && (
          <label className='flex items-center gap-2 text-[11px] text-muted-foreground'>
            APCA target
            <select
              aria-label='APCA target'
              value={apcaTarget}
              onChange={(event) =>
                setApcaTarget(Number(event.target.value) as (typeof APCA_TARGETS)[number])
              }
              className='h-8 rounded-md border border-border bg-background px-2 font-mono text-[11px] text-foreground'>
              {APCA_TARGETS.map((value) => (
                <option key={value} value={value}>
                  Lc {value}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {!slots.length ? (
        <div className='tool-panel-space flex-1 px-4 py-4 3xl:px-6 3xl:py-5 min-[160rem]:px-7 min-[160rem]:py-6'>
          <p className={TYPE.body}>Generate a palette to optimize light and dark variants.</p>
        </div>
      ) : (
        <div className='grid min-h-0 flex-1 grid-cols-1 overflow-auto @6xl/theme-optimizer:grid-cols-2'>
          <ThemeModePanel
            mode='light'
            backgroundHex={themeBackground?.light ?? '#ffffff'}
            slots={slots}
            names={names}
            target={target}
            variants={variants}
            setThemeVariant={setThemeVariant}
          />
          <ThemeModePanel
            mode='dark'
            backgroundHex={themeBackground?.dark ?? '#000000'}
            slots={slots}
            names={names}
            target={target}
            variants={variants}
            setThemeVariant={setThemeVariant}
          />
        </div>
      )}
    </div>
  );
}
