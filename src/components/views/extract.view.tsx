/**
 * extract.view.tsx  — Phase 1 merge
 *
 * Combines: image-extract-view + converter-view
 * Sub-tabs:  [From Image] [Convert]
 */

import { useNavigate } from '@tanstack/react-router';
import { Check, Copy, Image as ImageIcon, LoaderCircle, Sprout, Upload } from 'lucide-react';
import { useState, useMemo, useRef, useEffect } from 'react';

import ColorPickerModal from '@/components/modals/color-picker.modal';
import { useChromaStore } from '@/hooks/use-chroma-store';
import { useCmykProfile } from '@/hooks/use-cmyk-profile';
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
  const { extractedColors, imgSrc, setExtracted, setSeeds, generate } = useChromaStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
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
      if (imgSrc?.startsWith('blob:')) URL.revokeObjectURL(imgSrc);
    } catch {
      if (request === requestRef.current) setError('Extraction failed. Try another image.');
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }

  const useOne = (index: number) => {
    const color = extractedColors[index];
    if (!color) return;
    setSeeds([color]);
    generate();
    void navigate({ to: '/palette' });
  };

  const useAll = () => {
    setSeeds(extractedColors.slice(0, 5));
    generate();
    void navigate({ to: '/palette' });
  };

  return (
    <div className='@container flex min-h-0 flex-1 flex-col overflow-auto'>
      <div className='grid min-h-0 flex-1 grid-cols-1 @3xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]'>
        <section className='flex min-h-0 min-w-0 flex-col gap-4 border-b border-border p-4 @3xl:border-r @3xl:border-b-0'>
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
            className={`relative flex min-h-64 flex-1 items-center justify-center overflow-hidden rounded-md border bg-secondary transition-colors @3xl:min-h-40 ${dragOver ? 'border-primary ring-2 ring-primary/30' : 'border-border'}`}
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
                className='absolute inset-0 h-full w-full object-contain'
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
        <section className='flex min-h-0 min-w-0 flex-col gap-3 p-4'>
          <div className='flex shrink-0 items-center justify-between gap-2'>
            <span className={TYPE.label}>Extracted colors</span>
            <span className={TYPE.mono}>{extractedColors.length}</span>
          </div>
          <div className='grid flex-1 auto-rows-fr'>
            {extractedColors.map((color, i) => {
              const hex = color.hex;
              return (
                <div
                  key={i}
                  className='flex min-h-12 min-w-0 items-center gap-3 border-b border-border py-1.5 last:border-b-0'>
                  <div
                    className='size-9 shrink-0 rounded-md border border-border'
                    style={{
                      background: color.css ?? hex,
                    }}
                  />
                  <div className='flex min-w-0 flex-1 flex-col gap-1'>
                    <div className={TYPE.mono}>{hex.toUpperCase()}</div>
                    <div
                      className={`truncate ${TYPE.title}`}
                      title={lookupColorName(color.value ?? parseColor(hex), hex)}>
                      {lookupColorName(color.value ?? parseColor(hex), hex)}
                    </div>
                  </div>
                  <Button
                    variant='ghost'
                    size='icon-sm'
                    disabled={loading || !!error}
                    aria-label={`Use ${hex.toUpperCase()} as seed`}
                    title='Use as seed'
                    onClick={() => useOne(i)}>
                    <Sprout className='size-3.5' />
                  </Button>
                </div>
              );
            })}
            {!extractedColors.length && (
              <div className={`flex min-h-32 items-center justify-center ${TYPE.meta}`}>
                No extracted colors
              </div>
            )}
          </div>
          <Button
            size='sm'
            disabled={loading || !!error || !extractedColors.length}
            onClick={useAll}>
            <Sprout className='size-3.5' />
            Use {Math.min(5, extractedColors.length)} seeds
          </Button>
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
          <section className='flex min-w-0 flex-col gap-4 border-b border-border p-4 @3xl:border-r @3xl:border-b-0'>
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
          <section className='grid min-w-0 auto-rows-fr px-4 @3xl:min-h-0'>
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
