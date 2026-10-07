'use client';

import { useState, useCallback, useMemo } from 'react';

import type { RGB, HSL, HSV, OKLCH, PickerMode } from '@/types';

import ColorWheel from '@/components/common/color-wheel';
import { Button } from '@/components/ui/button';
import useChromaStore from '@/hooks/use-chroma-store';
import { useCmykProfile } from '@/hooks/use-cmyk-profile';
import {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  rgbToHsv,
  rgbToOklch,
  oklchToRgb,
  rgbToOklab,
  oklabToRgb,
  nearestName,
  parseHex,
  rgbToCmyk,
  toHexAlpha,
  hsvToRgb,
  cssString,
  parseHexAlpha,
  cmykToRgb,
} from '@/lib/utils';

import HexInput from '../common/hex-input';
import { CmykSliders } from '../common/sliders/cmyk-sliders';
import { HslSliders } from '../common/sliders/hsl-sliders';
import { HsvSliders } from '../common/sliders/hsv-sliders';
import { OklabSliders } from '../common/sliders/oklab-sliders';
import { OklchSliders } from '../common/sliders/oklch-sliders';
import { RgbSliders } from '../common/sliders/rgb-sliders';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';

// ─── Main Component ───────────────────────────────────────────────────────────

interface ColorPickerModalProps {
  isOpen: boolean;
  initialHex: string;
  title?: string;
  onApply: (hex: string) => void;
  onClose: () => void;
}

export default function ColorPickerModal({
  isOpen,
  initialHex,
  title,
  onApply,
  onClose,
}: ColorPickerModalProps) {
  const [hex, setHex] = useState(initialHex);
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

  // All derived values from canonical hex
  const rgb = useMemo(() => hexToRgb(pickerHex), [pickerHex]);
  const hsl = useMemo(() => rgbToHsl(rgb), [rgb]);
  const hsv = useMemo(() => rgbToHsv(rgb), [rgb]);
  const oklch = useMemo(() => rgbToOklch(rgb), [rgb]);
  const oklab = useMemo(() => rgbToOklab(rgb), [rgb]);
  const profile = useCmykProfile();
  const cmyk = useMemo(() => rgbToCmyk(rgb), [rgb, profile.converter]);
  const name = useMemo(() => nearestName(rgb), [rgb]);

  const displayHex = toHexAlpha(pickerHex, pickerAlpha);
  const cssOut = cssString(pickerMode, rgb, hsl, hsv, oklch, oklab, cmyk, pickerAlpha);
  const previewStyle =
    pickerAlpha < 100
      ? {
          background: `rgba(${rgb.r},${rgb.g},${rgb.b},${(pickerAlpha / 100).toFixed(2)})`,
        }
      : { background: pickerHex };

  // Setters — each converts its space back to hex as canonical
  const setRgb = useCallback((r: RGB) => setPickerHex(rgbToHex(r)), [setPickerHex]);
  const setHsl = useCallback((h: HSL) => setPickerHex(rgbToHex(hslToRgb(h))), [setPickerHex]);
  const setHsv = useCallback((h: HSV) => setPickerHex(rgbToHex(hsvToRgb(h))), [setPickerHex]);
  const setOklch = useCallback((o: OKLCH) => setPickerHex(rgbToHex(oklchToRgb(o))), [setPickerHex]);
  const setOklab = useCallback(
    (o: { L: number; a: number; b: number }) => setPickerHex(rgbToHex(oklabToRgb(o))),
    [setPickerHex],
  );
  const setCmyk = useCallback(
    (c: { c: number; m: number; y: number; k: number }) => setPickerHex(rgbToHex(cmykToRgb(c))),
    [setPickerHex],
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
      const base = parseHex(v); // handles 3, 6, and 8-char (strips alpha bytes)
      if (!base) return;
      setPickerHex(base);
      const alpha = parseHexAlpha(v); // null if not 8-char
      if (alpha !== null) setPickerAlpha(alpha);
    },
    [setPickerHex, setPickerAlpha],
  );

  // const useSeed = useCallback(() => {
  //   setSeeds([
  //     hexToStop(pickerHex, pickerAlpha < 100 ? pickerAlpha : undefined),
  //   ]);
  //   addRecent(displayHex);
  //   generate();
  //   navigate({ to: "/palette" });
  // }, [pickerHex, setSeeds, addRecent, generate, navigate]);

  // const addToPalette = useCallback(() => {
  //   addSlot(hexToStop(pickerHex, pickerAlpha < 100 ? pickerAlpha : undefined));
  //   addRecent(displayHex);
  // }, [pickerHex, addSlot, addRecent]);

  const updateColor = useCallback((newHex: string) => {
    setHex(newHex);
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
        const h = parseHex(sRGBHex);
        if (h) updateColor(h);
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='overflow-hidden border-border bg-background p-0 shadow-2xl outline-none sm:max-w-105'>
        <DialogHeader className='flex flex-row items-center gap-4 space-y-0 p-6 pb-0'>
          <div className="flex h-12 w-24 shrink-0 overflow-hidden rounded-xl border border-border bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAAXNSR0IArs4c6QAAACtJREFUGFdjZEADJmDMBmS9Z8AEEBMBmCCMBmEiMAnAGAzARCASjCHMAAByfQgLDX8mZwAAAABJRU5ErkJggg==')] shadow-inner">
            <div className='flex-1' title='Original' style={{ background: initialHex }} />
            <div className='flex-1' title='New' style={{ background: hex }} />
          </div>
          <div className='flex min-w-0 flex-col'>
            <DialogTitle className='truncate text-sm font-bold tracking-tight uppercase'>
              {title ?? 'Edit Color Swatch'}
            </DialogTitle>
            <span className='truncate font-mono text-[10px] tracking-widest text-muted-foreground uppercase'>
              {name}
            </span>
          </div>
        </DialogHeader>

        <div className='flex flex-col gap-6 px-6 py-6'>
          <div className='flex justify-center rounded-3xl border border-border/40 bg-secondary/10 py-4'>
            <ColorWheel hsl={hsl} size={210} onChange={handleWheelChange} />
          </div>

          <div className='flex gap-1 rounded-xl border border-border/50 bg-secondary/40 p-1'>
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setPickerMode(m.id as PickerMode)}
                className={`flex-1 rounded-lg py-1.5 text-[9px] font-extrabold tracking-widest uppercase transition-all ${
                  pickerMode === m.id
                    ? 'bg-background text-foreground shadow-sm ring-1 ring-black/5'
                    : 'text-muted-foreground hover:text-foreground'
                }`}>
                {m.label}
              </button>
            ))}
          </div>

          <div className='min-h-36.25 px-0.5'>
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
          </div>

          {/* Preview + hex input */}
          <div className='mt-3 flex w-full max-w-100 flex-col gap-4'>
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
              {/* <Button variant="default" size="sm" onClick={useSeed}>
              → Seed Palette
            </Button>
            <Button variant="ghost" size="sm" onClick={addToPalette}>
              + Add
            </Button> */}
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

          <div>
            <div className='mb-3 px-1 text-[9px] font-bold tracking-widest text-muted-foreground uppercase'>
              Hue Suggestions
            </div>
            <div className='flex justify-between px-0.5'>
              {Array.from({ length: 10 }, (_, i) => {
                const h = (i / 10) * 360;
                const sugHex = rgbToHex(hslToRgb({ h, s: hsl.s, l: hsl.l }));
                return (
                  <button
                    key={i}
                    onClick={() => updateColor(sugHex)}
                    className='size-7 rounded-lg border border-black/10 shadow-sm transition-transform hover:z-10 hover:scale-125'
                    style={{ background: sugHex }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className='gap-3 p-6 pt-0'>
          <Button
            variant='ghost'
            size='sm'
            onClick={onClose}
            className='h-9 text-[11px] font-bold tracking-wider uppercase'>
            Cancel
          </Button>
          <Button
            variant='default'
            size='sm'
            onClick={() => onApply(hex)}
            className='h-9 px-8 text-[11px] font-bold tracking-wider uppercase shadow-lg shadow-primary/20'>
            Apply Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
