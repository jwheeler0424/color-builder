/**
 * extract.view.tsx  — Phase 1 merge
 *
 * Combines: image-extract-view + converter-view
 * Sub-tabs:  [From Image] [Convert]
 */

import { Check, Copy, Image as ImageIcon, LoaderCircle, Sprout, Upload } from 'lucide-react';
import { useState, useMemo, useRef, useEffect } from 'react';

import type { HarmonyMode } from '@/types';

import ColorPickerModal from '@/components/modals/color-picker.modal';
import { NativeSelect } from '@/components/ui/select';
import { useChromaStore } from '@/hooks/use-chroma-store';
import { useCmykProfile } from '@/hooks/use-cmyk-profile';
import { HARMONIES, MAX_SLOTS } from '@/lib/constants/chroma';
import {
  extractImageColors,
  formatColor,
  parseColor,
  pickerReadings,
  renderColor,
} from '@/lib/engine/browser';
import { lookupColorName } from '@/lib/tools/color-names';

import { ToolButton as Button, ToolTabs, TYPE, ViewHeader } from './view-ui';

// ─── Tab bar ──────────────────────────────────────────────────────────────────

type Tab = 'image' | 'convert';

function TabBar({ active, setActive }: { active: Tab; setActive: (t: Tab) => void }) {
  return (
    <ToolTabs
      value={active}
      onValueChange={setActive}
      label='Extract and convert'
      items={[
        { id: 'image', label: 'From Image' },
        { id: 'convert', label: 'Convert' },
      ]}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FROM IMAGE TAB
// ═══════════════════════════════════════════════════════════════════════════════

function ImageTab() {
  const {
    extractedColors,
    imgSrc,
    mode,
    count,
    slots,
    generationError,
    generationPending,
    setMode,
    setCount,
    setExtracted,
    generateFromExtractedColor,
  } = useChromaStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [primaryIndex, setPrimaryIndex] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef(0);
  useEffect(
    () => () => {
      requestRef.current += 1;
    },
    [],
  );

  async function handleFile(file: File) {
    const request = ++requestRef.current;
    if (!file.type.startsWith('image/')) {
      setLoading(false);
      setError('Choose an image file.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const colors = await extractImageColors(file, 8);
      if (request !== requestRef.current) return;
      const objectUrl = URL.createObjectURL(file);
      setExtracted(colors, objectUrl);
      setPrimaryIndex(0);
      if (colors[0]) generateFromExtractedColor(colors[0], mode);
      if (imgSrc?.startsWith('blob:')) URL.revokeObjectURL(imgSrc);
    } catch {
      if (request === requestRef.current) setError('Extraction failed. Try another image.');
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }

  const primaryColor = extractedColors[primaryIndex] ?? extractedColors[0];
  const selectedHarmony = HARMONIES.find((harmony) => harmony.id === mode) ?? HARMONIES[0]!;
  const generateHarmonyPalette = () => {
    if (!primaryColor) return;
    generateFromExtractedColor(primaryColor, mode);
  };

  return (
    <div className='@container/extract-view flex min-h-0 flex-1 flex-col overflow-auto'>
      <div
        data-extract-layout-grid
        className='grid min-h-0 flex-1 grid-cols-1 grid-rows-[max-content_max-content] content-start'>
        <section
          data-extract-source
          className='tool-panel-space tool-panel-stack flex min-h-0 min-w-0 flex-col'>
          <div className='flex shrink-0 flex-wrap items-center justify-between gap-2'>
            <span className={TYPE.label}>Source image</span>
            <Button variant='outline' size='xs' onClick={() => fileRef.current?.click()}>
              <Upload className='size-3' />
              {imgSrc ? 'Replace image' : 'Choose image'}
            </Button>
          </div>
          <input
            ref={fileRef}
            type='file'
            accept='image/*'
            aria-label='Upload source image'
            className='hidden'
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
              event.target.value = '';
            }}
          />
          <div
            aria-label='Image drop zone'
            className={`relative flex min-h-32 flex-1 items-center justify-center overflow-hidden rounded-md border bg-secondary transition-colors @min-[40rem]:min-h-40 @3xl:min-h-40 ${dragOver ? 'border-primary ring-2 ring-primary/30' : 'border-border'}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files[0]) void handleFile(e.dataTransfer.files[0]);
            }}>
            {imgSrc ? (
              <img
                src={imgSrc}
                alt='Source image'
                className='relative max-h-32 max-w-full object-contain @min-[40rem]:max-h-full'
              />
            ) : (
              <div className='flex flex-col items-center gap-3 text-muted-foreground'>
                <ImageIcon className='size-10' strokeWidth={1} />
                <span className={TYPE.meta}>No source image</span>
                <Button variant='outline' size='sm' onClick={() => fileRef.current?.click()}>
                  <Upload className='size-3.5' />
                  Choose image
                </Button>
              </div>
            )}
            {loading && (
              <div
                className='absolute inset-0 flex items-center justify-center gap-2 bg-background/70 text-xs'
                role='status'>
                <LoaderCircle className='size-4 animate-spin' />
                Extracting colors...
              </div>
            )}
          </div>
          {error && (
            <p role='alert' className='text-xs text-destructive'>
              {error}
            </p>
          )}
        </section>
        <section className='tool-panel-space tool-panel-stack @container/extracted-colors flex min-h-0 min-w-0 flex-col'>
          <div className='flex shrink-0 items-center justify-between gap-2'>
            <span className={TYPE.label}>Extracted colors</span>
            <span className={TYPE.mono}>{extractedColors.length}</span>
          </div>
          <div
            data-extracted-colors-list
            className='grid min-w-0 grid-cols-2 gap-2 @min-[32rem]/extracted-colors:grid-cols-3 @min-[32rem]/extracted-colors:gap-3'>
            {extractedColors.map((color, i) => {
              const hex = color.hex;
              const value = color.value ?? parseColor(hex);
              const name = lookupColorName(value, hex);
              const isPrimary = primaryIndex === i;
              return (
                <button
                  key={i}
                  type='button'
                  aria-label={`Select ${hex.toUpperCase()} as primary color`}
                  aria-pressed={isPrimary}
                  title={`${name} · ${hex.toUpperCase()}`}
                  onClick={() => setPrimaryIndex(i)}
                  className={`flex min-h-16 min-w-0 cursor-pointer flex-col overflow-hidden rounded-md border bg-card text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring @min-[20rem]/extracted-colors:min-h-20 @min-[32rem]/extracted-colors:min-h-24 @min-[52rem]/extracted-colors:min-h-28 ${isPrimary ? 'border-primary ring-2 ring-primary/60' : 'border-border hover:border-input'}`}>
                  <span
                    className='relative flex min-h-8 w-full flex-1 items-start justify-end p-1 @min-[32rem]/extracted-colors:min-h-10 @min-[52rem]/extracted-colors:min-h-12'
                    style={{ background: color.css ?? hex }}>
                    {isPrimary && (
                      <span className='grid size-4 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground'>
                        <Check className='size-3' />
                      </span>
                    )}
                  </span>
                  <span className='flex min-w-0 flex-col gap-0.5 border-t border-border bg-card px-1.5 py-1.5 @min-[32rem]/extracted-colors:px-2 @min-[32rem]/extracted-colors:py-2'>
                    <span className='truncate font-mono text-[9px] leading-none text-muted-foreground @min-[32rem]/extracted-colors:text-[10px]'>
                      {hex.toUpperCase()}
                    </span>
                    <span className='truncate text-[10px] leading-snug font-semibold text-card-foreground @min-[32rem]/extracted-colors:text-xs'>
                      {name}
                    </span>
                  </span>
                </button>
              );
            })}
            {!extractedColors.length && (
              <div
                className={`col-span-full flex min-h-32 items-center justify-center ${TYPE.meta}`}>
                No extracted colors
              </div>
            )}
          </div>
          <section
            data-palette-generation
            className='flex shrink-0 flex-col gap-3 border-t border-border pt-3'>
            <div className='flex items-center justify-between gap-2'>
              <span className={TYPE.label}>Generate from image</span>
              <span className={TYPE.mono}>{count} colors</span>
            </div>
            <div className='flex flex-col gap-1'>
              <label
                htmlFor='extract-palette-size'
                className='flex items-center justify-between gap-2 text-xs font-medium'>
                <span>Palette size</span>
                <span className='font-mono text-muted-foreground'>{count}</span>
              </label>
              <input
                id='extract-palette-size'
                aria-label='Palette size'
                type='range'
                min={4}
                max={MAX_SLOTS}
                value={count}
                onChange={(event) => setCount(Number(event.target.value))}
                className='w-full accent-primary'
              />
            </div>
            <div className='grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2'>
              <NativeSelect
                aria-label='Palette harmony'
                value={mode}
                onChange={(event) => setMode(event.target.value as HarmonyMode)}
                title='Harmony'
                className='h-8 pr-10 pl-2 text-xs @min-[32rem]/extracted-colors:h-9'>
                {HARMONIES.map((harmony) => (
                  <option key={harmony.id} value={harmony.id}>
                    {harmony.label}
                  </option>
                ))}
              </NativeSelect>
              <Button
                size='sm'
                disabled={loading || generationPending || !!error || !primaryColor}
                onClick={generateHarmonyPalette}>
                {generationPending ? (
                  <LoaderCircle className='size-3.5 animate-spin' />
                ) : (
                  <Sprout className='size-3.5' />
                )}
                {generationPending ? 'Generating...' : 'Generate palette'}
              </Button>
            </div>
            <p className='text-[11px] leading-snug text-muted-foreground'>{selectedHarmony.desc}</p>
            {extractedColors.length > 0 && (
              <div className='flex flex-col gap-2' aria-live='polite'>
                <div className='flex items-center justify-between gap-2'>
                  <span className={TYPE.label}>Generated palette</span>
                  {generationPending && (
                    <span
                      className='flex items-center gap-1.5 text-[10px] text-muted-foreground'
                      role='status'>
                      <LoaderCircle className='size-3 animate-spin' />
                      Updating
                    </span>
                  )}
                </div>
                <div
                  role='list'
                  aria-label='Generated palette swatches'
                  className='grid grid-cols-4 gap-1.5'>
                  {slots.slice(0, count).map((slot, index) => (
                    <div
                      key={slot.id}
                      role='listitem'
                      aria-label={`Color ${index + 1}: ${slot.color.hex.toUpperCase()}`}
                      title={`${index + 1}. ${slot.color.hex.toUpperCase()}`}
                      className='min-w-0 overflow-hidden rounded border border-border bg-card'>
                      <span
                        className='block h-7 w-full @min-[32rem]/extracted-colors:h-8'
                        style={{ background: slot.color.css ?? slot.color.hex }}
                      />
                      <span className='block truncate px-1 py-1 font-mono text-[8px] leading-none text-muted-foreground'>
                        {slot.color.hex.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {generationError && (
              <p role='alert' className='text-xs text-destructive'>
                {generationError}
              </p>
            )}
          </section>
        </section>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONVERT TAB
// ═══════════════════════════════════════════════════════════════════════════════

function ConvCard({
  label,
  value,
  sub,
  disabled = false,
}: {
  label: string;
  value: string;
  sub?: string;
  disabled?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className='flex min-w-0 items-center justify-between gap-3 border-b border-border py-3 last:border-b-0'>
      <div className='flex min-w-0 flex-1 flex-col gap-1.5'>
        <div className={TYPE.label}>{label}</div>
        <div className='font-mono text-xs wrap-anywhere'>{disabled ? '-' : value}</div>
        {sub && !disabled && <div className='text-[10px] text-muted-foreground'>{sub}</div>}
      </div>
      <Button
        variant='ghost'
        size='icon-sm'
        disabled={disabled}
        title={`Copy ${label}`}
        aria-label={`Copy ${label}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          } catch {
            setCopied(false);
          }
        }}>
        {copied ? <Check className='size-3.5' /> : <Copy className='size-3.5' />}
      </Button>
    </div>
  );
}

function ConvertTab() {
  const [showPicker, setShowPicker] = useState(false);
  const convInput = useChromaStore((s) => s.convInput);
  const setConvInput = useChromaStore((s) => s.setConvInput);
  const slots = useChromaStore((s) => s.slots);
  const profile = useCmykProfile();
  const parsed = useMemo(() => {
    try {
      return parseColor(convInput);
    } catch {
      return null;
    }
  }, [convInput]);
  const valid = parsed !== null;
  const color = parsed ?? parseColor('#e07a5f');
  const readings = useMemo(
    () => pickerReadings(color, profile.converter ?? undefined),
    [color, profile.converter],
  );
  const { rgb, hsl, hsv, cmyk, oklab, oklch } = readings;
  const hex = renderColor(color).hex;
  const name = lookupColorName(color, hex);

  return (
    <>
      <div className='@container flex min-h-0 flex-1 flex-col overflow-auto'>
        <div className='grid min-h-0 flex-1 grid-cols-1 @3xl:grid-cols-[16rem_minmax(0,1fr)]'>
          <section className='tool-panel-space tool-panel-stack flex min-w-0 flex-col border-b border-border @3xl:border-r @3xl:border-b-0'>
            <label htmlFor='convert-source' className={TYPE.label}>
              Source color
            </label>
            <input
              id='convert-source'
              aria-invalid={!valid}
              aria-describedby={!valid ? 'convert-error' : undefined}
              className='h-10 w-full min-w-0 rounded border border-border bg-muted px-3 font-mono text-xs outline-none focus:border-ring'
              value={convInput}
              onChange={(event) => setConvInput(event.target.value)}
              placeholder='#F4A261'
              spellCheck={false}
              autoComplete='off'
            />
            {!valid && (
              <p id='convert-error' role='alert' className='text-[11px] text-destructive'>
                Enter a valid color value.
              </p>
            )}
            <button
              type='button'
              aria-label='Pick source color'
              className='aspect-square w-full max-w-64 cursor-pointer rounded-md border border-border outline-none focus-visible:ring-2 focus-visible:ring-ring'
              style={{ background: valid ? hex : 'var(--muted)' }}
              title='Click to pick color'
              onClick={() => setShowPicker(true)}
            />
            <div className='flex flex-col gap-1'>
              <span className={TYPE.title}>{valid ? name : 'Invalid color'}</span>
              <span className={TYPE.mono}>{valid ? hex.toUpperCase() : '-'}</span>
            </div>
            <div className='flex flex-wrap gap-1.5'>
              {slots.map((slot) => (
                <button
                  key={slot.id}
                  type='button'
                  aria-label={`Convert ${slot.color.hex.toUpperCase()}`}
                  title={slot.color.hex.toUpperCase()}
                  onClick={() => setConvInput(slot.color.hex)}
                  className='size-7 cursor-pointer rounded-sm border border-border outline-none focus-visible:ring-2 focus-visible:ring-ring'
                  style={{ background: slot.color.hex }}
                />
              ))}
            </div>
          </section>
          <section className='tool-inline-space grid min-w-0 auto-rows-fr @3xl:min-h-0'>
            <ConvCard disabled={!valid} label='HEX' value={hex} />
            <ConvCard
              disabled={!valid}
              label='CSS RGB'
              value={formatColor(color, 'rgb')}
              sub={`R:${rgb.r} G:${rgb.g} B:${rgb.b}`}
            />
            <ConvCard
              disabled={!valid}
              label='CSS HSL'
              value={formatColor(color, 'hsl')}
              sub={`H:${Math.round(hsl.h)}° S:${Math.round(hsl.s)}% L:${Math.round(hsl.l)}%`}
            />
            <ConvCard
              disabled={!valid}
              label='HSV / HSB'
              value={formatColor(color, 'hsv')}
              sub={`H:${Math.round(hsv.h)}° S:${Math.round(hsv.s)}% V:${Math.round(hsv.v)}%`}
            />
            <ConvCard
              disabled={!valid}
              label='CMYK'
              value={
                cmyk
                  ? formatColor(color, 'cmyk', { cmyk: profile.converter ?? undefined })
                  : 'ICC profile required'
              }
              sub={cmyk ? `C:${cmyk.c} M:${cmyk.m} Y:${cmyk.y} K:${cmyk.k}` : 'Unavailable'}
            />
            <ConvCard disabled={!valid} label='OKLab' value={formatColor(color, 'oklab')} />
            <ConvCard
              disabled={!valid}
              label='OKLCH'
              value={formatColor(color, 'oklch')}
              sub={`L:${(oklch.L * 100).toFixed(1)} C:${oklch.C.toFixed(3)} H:${Math.round(oklch.H)}°`}
            />
            <ConvCard disabled={!valid} label='Nearest Name' value={name} />
          </section>
        </div>
      </div>

      {showPicker && (
        <ColorPickerModal
          isOpen={showPicker}
          initialHex={hex}
          title='Color Converter'
          onApply={(h) => {
            setConvInput(h);
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

export default function ExtractView() {
  const [activeTab, setActiveTab] = useState<Tab>('image');
  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
      <ViewHeader
        title='Extract & Convert'
        description='Image palettes and color values across formats.'
      />
      <TabBar active={activeTab} setActive={setActiveTab} />
      {activeTab === 'image' && <ImageTab />}
      {activeTab === 'convert' && <ConvertTab />}
    </div>
  );
}
