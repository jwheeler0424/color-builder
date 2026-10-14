import {
  IconArrowRight,
  IconCheck,
  IconColorPicker,
  IconCopy,
  IconPlus,
} from '@tabler/icons-react';
import { useNavigate } from '@tanstack/react-router';
import { useCallback, useMemo, useState } from 'react';

import type { RGB, HSL, HSV, OKLCH } from '@/types';

import { CopyValueRow } from '@/components/global/copy-value-row';
import { SectionLabel } from '@/components/global/section-label';
import { ToolSection as Section } from '@/components/global/tool-section';
import { useChromaStore } from '@/hooks/use-chroma-store';
import { useCmykProfile } from '@/hooks/use-cmyk-profile';
import {
  OKLAB,
  cmykToColor,
  colorValue,
  fitHex,
  formatColor,
  formatPickerColor,
  hexToStop,
  hslPercentToRgb8,
  hsvPercentToRgb8,
  labToLch,
  luminance,
  parseColor,
  parseHexInput,
  pickerReadings,
  renderColor,
  rgb8ToHex,
} from '@/lib/engine/browser';
import { lookupColorName } from '@/lib/engine/colors/color-names';

import ColorWheel from '../common/color-wheel';
import HexInput from '../common/hex-input';
import { CmykSliders } from '../common/sliders/cmyk-sliders';
import { HslSliders } from '../common/sliders/hsl-sliders';
import { HsvSliders } from '../common/sliders/hsv-sliders';
import { OklabSliders } from '../common/sliders/oklab-sliders';
import { OklchSliders } from '../common/sliders/oklch-sliders';
import { RgbSliders } from '../common/sliders/rgb-sliders';
import { ToolButton as Button, ToolSegments } from './view-ui';

// EyeDropper is a browser API not yet in lib.dom.d.ts
interface EyeDropper {
  open(): Promise<{ sRGBHex: string }>;
}
declare global {
  interface Window {
    EyeDropper?: new () => EyeDropper;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type PickerMode = 'rgb' | 'hsl' | 'hsv' | 'oklch' | 'oklab' | 'cmyk';

const MODES: { id: PickerMode; label: string }[] = [
  { id: 'hsl', label: 'HSL' },
  { id: 'rgb', label: 'RGB' },
  { id: 'hsv', label: 'HSV' },
  { id: 'oklch', label: 'OKLCH' },
  { id: 'oklab', label: 'OKLab' },
  { id: 'cmyk', label: 'CMYK' },
];

// ─── Main View ────────────────────────────────────────────────────────────────

export default function ColorPickerView({ showPalette = true }: { showPalette?: boolean }) {
  const {
    pickerHex,
    pickerAlpha,
    pickerMode,
    setPickerHex,
    setPickerAlpha,
    setPickerMode,
    recentColors,
    slots,
    setSeeds,
    addRecent,
    addSlot,
    generate,
  } = useChromaStore();
  const navigate = useNavigate();

  const profile = useCmykProfile();
  const pickerColor = useMemo(() => {
    const parsed = parseColor(pickerHex);
    return colorValue(parsed.xyz, pickerAlpha / 100, parsed.display);
  }, [pickerHex, pickerAlpha]);
  const { rgb, hsl, hsv, oklch, oklab, cmyk } = useMemo(
    () => pickerReadings(pickerColor, profile.converter ?? undefined),
    [pickerColor, profile.converter],
  );
  const name = lookupColorName(pickerColor, renderColor(pickerColor).hex);

  const displayHex = formatColor(pickerColor, 'hex');
  const cssOut = formatPickerColor(pickerColor, pickerMode, profile.converter ?? undefined);
  const previewCss = renderColor(pickerColor).css;
  const previewSwatchStyle = {
    background: `linear-gradient(${previewCss}, ${previewCss}), repeating-conic-gradient(#444 0% 25%, #222 0% 50%) 0 0/8px 8px`,
  };

  // Setters — each converts its space back to hex as canonical
  const setRgb = useCallback((r: RGB) => setPickerHex(rgb8ToHex(r)), [setPickerHex]);
  const setHsl = useCallback(
    (h: HSL) => setPickerHex(rgb8ToHex(hslPercentToRgb8(h))),
    [setPickerHex],
  );
  const setHsv = useCallback(
    (h: HSV) => setPickerHex(rgb8ToHex(hsvPercentToRgb8(h))),
    [setPickerHex],
  );
  const setOklch = useCallback(
    (o: OKLCH) => setPickerHex(fitHex(OKLAB, { l: o.L, c: o.C, h: o.H })),
    [setPickerHex],
  );
  const setOklab = useCallback(
    (o: { L: number; a: number; b: number }) => setPickerHex(fitHex(OKLAB, labToLch(OKLAB, o))),
    [setPickerHex],
  );
  const setCmyk = useCallback(
    (c: { c: number; m: number; y: number; k: number }) => {
      if (!profile.converter) return;
      setPickerHex(renderColor(cmykToColor([c.c, c.m, c.y, c.k], profile.converter)).hex);
    },
    [setPickerHex, profile.converter],
  );

  // ColorWheel speaks HSL
  const handleWheelChange = useCallback(
    (partial: Partial<HSL>) => {
      setHsl({ ...hsl, ...partial });
    },
    [hsl, setHsl],
  );

  const handleHexInput = useCallback(
    (v: string) => {
      const parsed = parseHexInput(v);
      if (!parsed) return;
      setPickerHex(parsed.hex);
      if (parsed.hasAlpha) setPickerAlpha(parsed.alphaPercent);
    },
    [setPickerHex, setPickerAlpha],
  );

  const useSeed = useCallback(() => {
    setSeeds([hexToStop(pickerHex, pickerAlpha < 100 ? pickerAlpha : undefined)]);
    addRecent(displayHex);
    generate();
    void navigate({ to: '/' });
  }, [pickerHex, pickerAlpha, displayHex, setSeeds, addRecent, generate, navigate]);

  const addToPalette = useCallback(() => {
    addSlot(hexToStop(pickerHex, pickerAlpha < 100 ? pickerAlpha : undefined));
    addRecent(displayHex);
  }, [pickerHex, pickerAlpha, displayHex, addSlot, addRecent]);

  const updateColor = useCallback(
    (newHex: string) => {
      setPickerHex(newHex);
      handleHexInput(newHex);
    },
    [setPickerHex, handleHexInput],
  );

  const [copied, setCopied] = useState(false);
  const copyCss = () => {
    navigator.clipboard.writeText(cssOut).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const handleEyeDropper = async () => {
    if (typeof window !== 'undefined' && 'EyeDropper' in window) {
      try {
        const dropper = new (window as any).EyeDropper();
        const { sRGBHex } = await dropper.open();
        const parsed = parseHexInput(sRGBHex);
        if (parsed) updateColor(parsed.hex);
      } catch {
        /* cancelled */
      }
    }
  };

  return (
    <div
      className={
        showPalette
          ? 'flex min-h-0 flex-1 flex-col tool-panel-stack overflow-y-auto tool-panel-space'
          : 'flex flex-col'
      }>
      <Section>
        <SectionLabel>Color Picker</SectionLabel>
        {/* Color wheel — always visible, speaks HSL */}
        <div className='flex flex-col items-center justify-center gap-1 py-2'>
          <ColorWheel hsl={hsl} size={240} onChange={handleWheelChange} />
        </div>

        {/* Mode tabs */}
        <div className='mb-1.5'>
          <ToolSegments
            value={pickerMode}
            onValueChange={setPickerMode}
            items={MODES}
            label='Color format'
          />
        </div>

        <div className='px-2'>
          {pickerMode === 'rgb' && (
            <RgbSliders
              rgb={rgb}
              alpha={pickerAlpha}
              hex={pickerHex}
              onRgb={setRgb}
              onAlpha={setPickerAlpha}
            />
          )}
          {pickerMode === 'hsl' && (
            <HslSliders
              hsl={hsl}
              alpha={pickerAlpha}
              hex={pickerHex}
              onHsl={setHsl}
              onAlpha={setPickerAlpha}
            />
          )}
          {pickerMode === 'hsv' && (
            <HsvSliders
              hsv={hsv}
              alpha={pickerAlpha}
              hex={pickerHex}
              onHsv={setHsv}
              onAlpha={setPickerAlpha}
            />
          )}
          {pickerMode === 'oklch' && (
            <OklchSliders
              oklch={oklch}
              alpha={pickerAlpha}
              hex={pickerHex}
              onOklch={setOklch}
              onAlpha={setPickerAlpha}
            />
          )}
          {pickerMode === 'oklab' && (
            <OklabSliders
              oklab={oklab}
              alpha={pickerAlpha}
              hex={pickerHex}
              onOklab={setOklab}
              onAlpha={setPickerAlpha}
            />
          )}
          {pickerMode === 'cmyk' && (
            <CmykSliders
              cmyk={cmyk}
              alpha={pickerAlpha}
              hex={pickerHex}
              onCmyk={setCmyk}
              onAlpha={setPickerAlpha}
            />
          )}
        </div>

        <div className='mt-3 flex w-full max-w-100 flex-col gap-4 pb-2'>
          <div className='grid w-full min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] gap-x-3'>
            <div className='col-start-2 mb-0.5 text-2xs font-bold tracking-[.07em] text-muted-foreground uppercase'>
              HEX CODE
            </div>
            <div
              className='relative col-start-1 row-start-2 size-18 rounded border-2 border-input'
              style={previewSwatchStyle}
            />
            <div className='col-start-2 row-start-2 flex min-w-0 flex-col gap-2'>
              <HexInput
                className='w-full'
                value={displayHex}
                onChange={handleHexInput}
                aria-label='HEX CODE'
                showSwatch={false}
              />
              {/* CSS output string for current mode */}
              <div className='flex h-8 min-w-0 items-center gap-1 rounded bg-muted px-1.5'>
                <span className='min-w-0 flex-1 overflow-hidden font-mono text-2xs text-ellipsis whitespace-nowrap text-muted-foreground'>
                  {cssOut}
                </span>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon-xs'
                  title='Copy color value'
                  aria-label={copied ? 'Color value copied' : 'Copy color value'}
                  className={copied ? 'text-primary' : 'text-muted-foreground'}
                  onClick={copyCss}>
                  {copied ? <IconCheck aria-hidden='true' /> : <IconCopy aria-hidden='true' />}
                </Button>
              </div>
            </div>
          </div>
          <div className='flex items-center justify-end gap-1.5'>
            <Button variant='default' size='xs' onClick={useSeed}>
              <IconArrowRight className='size-3' aria-hidden='true' />
              Seed Palette
            </Button>
            <Button variant='secondary' size='xs' onClick={addToPalette}>
              <IconPlus className='size-3' aria-hidden='true' />
              Add
            </Button>
            {typeof window !== 'undefined' && 'EyeDropper' in window && (
              <Button
                variant='secondary'
                size='xs'
                title='Sample color from screen (EyeDropper API)'
                onClick={handleEyeDropper}>
                <IconColorPicker className='size-3' aria-hidden='true' />
                Pick
              </Button>
            )}
          </div>
        </div>
      </Section>

      {/* Recent colors */}
      {recentColors.length > 0 && (
        <Section>
          <SectionLabel>Recent Colors</SectionLabel>
          <div className='flex flex-wrap gap-1.5 pb-2'>
            {recentColors.map((rh, i) => (
              <button
                key={i}
                type='button'
                aria-label={`Use recent color ${rh.toUpperCase()}`}
                className='h-5.5 w-5.5 cursor-pointer rounded border border-white/10 p-0 transition-transform hover:scale-110'
                style={{ background: rh }}
                title={rh}
                onClick={() => {
                  const parsed = parseHexInput(rh);
                  if (!parsed) return;
                  setPickerHex(parsed.hex);
                  if (parsed.hasAlpha) setPickerAlpha(parsed.alphaPercent);
                }}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Color info — all formats */}
      <Section>
        <SectionLabel>Color Values</SectionLabel>
        <div className='pb-2 text-xs leading-[2.1] text-muted-foreground'>
          <CopyValueRow label='Name' value={name} />
          <CopyValueRow label='HEX' value={displayHex.toUpperCase()} mono />
          <CopyValueRow label='RGB' value={formatPickerColor(pickerColor, 'rgb')} mono />
          <CopyValueRow label='HSL' value={formatPickerColor(pickerColor, 'hsl')} mono />
          <CopyValueRow label='HSV' value={formatPickerColor(pickerColor, 'hsv')} mono />
          <CopyValueRow label='OKLCH' value={formatPickerColor(pickerColor, 'oklch')} mono />
          <CopyValueRow label='OKLab' value={formatPickerColor(pickerColor, 'oklab')} mono />
          <CopyValueRow
            label='CMYK'
            value={cmyk ? `${cmyk.c}% ${cmyk.m}% ${cmyk.y}% ${cmyk.k}%` : 'ICC profile required'}
          />
          <CopyValueRow label='Lum.' value={`${(luminance(pickerColor.xyz) * 100).toFixed(1)}%`} />
        </div>
      </Section>

      {/* Palette quick-pick */}
      {showPalette && (
        <Section>
          <SectionLabel>Palette</SectionLabel>
          <div className='flex flex-wrap gap-1.5 pb-2'>
            {slots.map((slot, i) => (
              <button
                key={i}
                type='button'
                aria-label={`Use palette color ${i + 1} ${slot.color.hex.toUpperCase()}`}
                className='h-5.5 w-5.5 cursor-pointer rounded border border-white/10 p-0 transition-transform hover:scale-110'
                style={{ background: slot.color.hex }}
                title={slot.color.hex}
                onClick={() => setPickerHex(slot.color.hex)}
              />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
