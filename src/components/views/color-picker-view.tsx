import { useNavigate } from '@tanstack/react-router';
import React, { useCallback, useMemo, useState } from 'react';

import type { RGB, HSL, HSV, OKLCH } from '@/types';

import { Button } from '@/components/ui/button';
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
import { lookupColorName } from '@/lib/tools/color-names';

import ColorWheel from '../common/color-wheel';
import HexInput from '../common/hex-input';
import { CmykSliders } from '../common/sliders/cmyk-sliders';
import { HslSliders } from '../common/sliders/hsl-sliders';
import { HsvSliders } from '../common/sliders/hsv-sliders';
import { OklabSliders } from '../common/sliders/oklab-sliders';
import { OklchSliders } from '../common/sliders/oklch-sliders';
import { RgbSliders } from '../common/sliders/rgb-sliders';
import { PanelGroup as PanelSection, PanelGroupLabel as PanelSectionLabel } from '../panel';

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

type PickerMode = 'rgb' | 'hsl' | 'hsv' | 'oklch' | 'oklab';

const MODES: { id: PickerMode; label: string; desc: string }[] = [
  { id: 'rgb', label: 'RGB', desc: 'Red, Green, Blue — 0 to 255 per channel' },
  { id: 'hsl', label: 'HSL', desc: 'Hue, Saturation, Lightness — CSS native' },
  {
    id: 'hsv',
    label: 'HSV',
    desc: 'Hue, Saturation, Value — common in design tools',
  },
  {
    id: 'oklch',
    label: 'OKLCH',
    desc: 'Perceptually uniform — same space as palette generation',
  },
  {
    id: 'oklab',
    label: 'OKLab',
    desc: 'Perceptual Lab — a/b axes match Photoshop Lab mode',
  },
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
  const previewStyle = { background: renderColor(pickerColor).css };

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
    navigate({ to: '/palette' });
  }, [pickerHex, setSeeds, addRecent, generate, navigate]);

  const addToPalette = useCallback(() => {
    addSlot(hexToStop(pickerHex, pickerAlpha < 100 ? pickerAlpha : undefined));
    addRecent(displayHex);
  }, [pickerHex, addSlot, addRecent]);

  const updateColor = useCallback((newHex: string) => {
    setPickerHex(newHex);
    handleHexInput(newHex);
  }, []);

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
      } catch (e) {
        /* cancelled */
      }
    }
  };

  const MODES = [
    { id: 'hsl', label: 'HSL' },
    { id: 'rgb', label: 'RGB' },
    { id: 'hsv', label: 'HSV' },
    { id: 'oklch', label: 'OKLCH' },
    { id: 'oklab', label: 'OKLab' },
    { id: 'cmyk', label: 'CMYK' },
  ];

  return (
    <div className='tool-panel-space tool-panel-stack flex min-h-0 flex-1 flex-col overflow-y-auto'>
      <PanelSection>
        <PanelSectionLabel>COLOR PICKER</PanelSectionLabel>
        {/* Color wheel — always visible, speaks HSL */}
        <div className='my-6 flex flex-col items-center justify-center gap-1'>
          <ColorWheel hsl={hsl} size={240} onChange={handleWheelChange} />
        </div>

        {/* Mode tabs */}
        <div className='mt-2.5 mb-1.5 flex gap-1'>
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setPickerMode(m.id as PickerMode)}
              title={m.label}
              style={{
                flex: 1,
                padding: '4px 0',
                borderRadius: 4,
                fontSize: 10.5,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: pickerMode === m.id ? 'var(--color-primary)' : 'var(--color-secondary)',
                color: pickerMode === m.id ? '#fff' : 'var(--color-secondary-foreground)',
                transition: 'background .12s',
              }}>
              {m.label}
            </button>
          ))}
        </div>

        {/* Sliders for active mode */}
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

        <div className='mt-3 flex w-full max-w-100 flex-col gap-4 pb-2'>
          <div className='flex w-full gap-4'>
            {/* Checkerboard shows through for alpha */}
            <div className='relative size-16 shrink-0'>
              <div
                className='absolute inset-0 rounded'
                style={{
                  background: 'repeating-conic-gradient(#444 0% 25%,#222 0% 50%) 0 0/10px 10px',
                }}
              />
              <div
                className='relative size-full shrink-0 rounded border-2 border-input'
                style={{ ...previewStyle }}
              />
            </div>
            <div className='flex flex-1 flex-col gap-1.5'>
              <div className='flex items-center gap-1.5'>
                {/* <label>HEX CODE</label> */}
                <HexInput value={displayHex} onChange={handleHexInput} label='HEX CODE' />
              </div>
              {/* CSS output string for current mode */}
              <div className='mt-1 flex items-center gap-1 rounded bg-muted px-1.5 py-1'>
                <span className='flex-1 overflow-hidden font-mono text-[9px] overflow-ellipsis whitespace-nowrap text-muted-foreground'>
                  {cssOut}
                </span>
                <button
                  onClick={copyCss}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 9,
                    color: copied ? '#4ade80' : 'var(--color-muted-foreground)',
                    padding: '0 2px',
                    flexShrink: 0,
                  }}>
                  {copied ? '✓' : 'copy'}
                </button>
              </div>
            </div>
          </div>
          <div className='flex items-center justify-end gap-1.5'>
            <Button variant='default' size='sm' onClick={useSeed}>
              → Seed Palette
            </Button>
            <Button variant='ghost' size='sm' onClick={addToPalette}>
              + Add
            </Button>
            {typeof window !== 'undefined' && 'EyeDropper' in window && (
              <Button
                variant='ghost'
                size='sm'
                title='Sample color from screen (EyeDropper API)'
                onClick={handleEyeDropper}>
                ⊕ Pick
              </Button>
            )}
          </div>
        </div>
      </PanelSection>

      {/* Recent colors */}
      {recentColors.length > 0 && (
        <PanelSection>
          <PanelSectionLabel>RECENT COLORS</PanelSectionLabel>
          <div className='flex flex-wrap gap-1.5 pb-2'>
            {recentColors.map((rh, i) => (
              <div
                key={i}
                className='h-5.5 w-5.5 cursor-pointer rounded border border-white/10 transition-transform hover:scale-110'
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
        </PanelSection>
      )}

      {/* Color info — all formats */}
      <PanelSection>
        <PanelSectionLabel>COLOR VALUES</PanelSectionLabel>
        <div className='pb-2 text-[11px] leading-[2.1] text-muted-foreground'>
          <InfoRow label='Name' value={name} />
          <InfoRow label='HEX' value={displayHex.toUpperCase()} mono />
          <InfoRow label='RGB' value={formatPickerColor(pickerColor, 'rgb')} mono />
          <InfoRow label='HSL' value={formatPickerColor(pickerColor, 'hsl')} mono />
          <InfoRow label='HSV' value={formatPickerColor(pickerColor, 'hsv')} mono />
          <InfoRow label='OKLCH' value={formatPickerColor(pickerColor, 'oklch')} mono />
          <InfoRow label='OKLab' value={formatPickerColor(pickerColor, 'oklab')} mono />
          <InfoRow
            label='CMYK'
            value={cmyk ? `${cmyk.c}% ${cmyk.m}% ${cmyk.y}% ${cmyk.k}%` : 'ICC profile required'}
          />
          <InfoRow label='Lum.' value={`${(luminance(pickerColor.xyz) * 100).toFixed(1)}%`} />
        </div>
      </PanelSection>

      {/* Palette quick-pick */}
      {showPalette && (
        <PanelSection>
          <PanelSectionLabel>PALETTE</PanelSectionLabel>
          <div className='flex flex-wrap gap-1.5 pb-2'>
            {slots.map((slot, i) => (
              <div
                key={i}
                className='h-5.5 w-5.5 cursor-pointer rounded border border-white/10 transition-transform hover:scale-110'
                style={{ background: slot.color.hex }}
                title={slot.color.hex}
                onClick={() => setPickerHex(slot.color.hex)}
              />
            ))}
          </div>
        </PanelSection>
      )}
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };
  return (
    <div className='flex items-center justify-between gap-1.5'>
      <span className='min-w-9.5 shrink-0 text-muted-foreground'>{label}</span>
      <span
        style={{
          fontFamily: mono ? 'var(--font-mono)' : undefined,
          fontSize: mono ? 9.5 : undefined,
          color: 'var(--color-foreground)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
          textAlign: 'right',
          cursor: 'pointer',
        }}
        title={`Click to copy: ${value}`}
        onClick={copy}>
        {copied ? '✓ copied' : value}
      </span>
    </div>
  );
}
