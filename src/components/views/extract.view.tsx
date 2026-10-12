/**
 * extract.view.tsx  — Phase 1 merge
 *
 * Combines: image-extract-view + converter-view
 * Sub-tabs:  [From Image] [Convert]
 */

import {
  IconArrowRight as ArrowRight,
  IconChevronDown as ChevronDown,
  IconCheck as Check,
  IconCopy as Copy,
  IconPhoto as ImageIcon,
  IconLoader2 as LoaderCircle,
  IconDots as MoreHorizontal,
  IconMinus as Minus,
  IconPalette as Palette,
  IconColorPicker as Pipette,
  IconPlus as Plus,
  IconSparkles as Sparkles,
  IconTrash as Trash2,
  IconUpload as Upload,
} from '@tabler/icons-react';
import { useState, useMemo, useRef, useEffect } from 'react';

import type { PaletteSlot } from '@/lib/engine/color-stop';
import type { HarmonyMode } from '@/types';

import { HarmonyPicker } from '@/components/layout/generate-controls';
import ColorPickerModal from '@/components/modals/color-picker.modal';
import { Button as ActionButton } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Slider } from '@/components/ui/slider';
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
import { colorToStop, stopToColor } from '@/lib/engine/color-stop';
import { lookupColorName } from '@/lib/engine/colors/color-names';
import { computeColorPalette } from '@/lib/engine/runtime/palette-runtime';

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
    paletteSpace,
    displayGamut,
    temperature,
    loadPalette,
    setSeedMode,
    setSeeds,
    setExtracted,
  } = useChromaStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [primaryIndex, setPrimaryIndex] = useState(0);
  const [harmonyOpen, setHarmonyOpen] = useState(false);
  const [draftMode, setDraftMode] = useState<HarmonyMode | null>(null);
  const [draftCount, setDraftCount] = useState<number | null>(null);
  const [palettePreview, setPalettePreview] = useState<PaletteSlot[] | null>(null);
  const [previewPending, setPreviewPending] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [paletteApplied, setPaletteApplied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef(0);
  const previewControllerRef = useRef<AbortController | null>(null);
  const paletteMode = draftMode ?? mode;
  const paletteCount = draftCount ?? count;

  function clearPalettePreview() {
    previewControllerRef.current?.abort();
    previewControllerRef.current = null;
    setPalettePreview(null);
    setPreviewPending(false);
    setPreviewError(null);
    setPaletteApplied(false);
  }

  function updatePaletteCount(nextCount: number) {
    setDraftCount(nextCount);
    clearPalettePreview();
  }

  useEffect(
    () => () => {
      requestRef.current += 1;
      previewControllerRef.current?.abort();
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
    clearPalettePreview();
    setDraftMode(null);
    setDraftCount(null);
    setLoading(true);
    setError(null);
    try {
      const colors = await extractImageColors(file, 8);
      if (request !== requestRef.current) return;
      const objectUrl = URL.createObjectURL(file);
      setExtracted(colors, objectUrl);
      setPrimaryIndex(0);
      if (imgSrc?.startsWith('blob:')) URL.revokeObjectURL(imgSrc);
    } catch {
      if (request === requestRef.current) setError('Extraction failed. Try another image.');
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }

  const primaryColor = extractedColors[primaryIndex] ?? extractedColors[0];
  const hasImagePalette = Boolean(imgSrc && primaryColor);
  const selectedHarmony = HARMONIES.find((harmony) => harmony.id === paletteMode) ?? HARMONIES[0]!;

  async function generatePalettePreview() {
    if (!imgSrc || !primaryColor) return;
    previewControllerRef.current?.abort();
    const controller = new AbortController();
    previewControllerRef.current = controller;
    setPalettePreview(null);
    setPaletteApplied(false);
    setPreviewPending(true);
    setPreviewError(null);
    try {
      const colors = await computeColorPalette(
        {
          harmony: paletteMode,
          count: paletteCount,
          seeds: [stopToColor(primaryColor)],
          seedMode: 'pin',
          temperature,
          space: paletteSpace,
          display: displayGamut,
          locked: [],
        },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setPalettePreview(
        colors.map((color, index) => ({
          id: crypto.randomUUID(),
          color: colorToStop(color),
          locked: index === 0,
        })),
      );
    } catch (cause) {
      if (!controller.signal.aborted) {
        setPreviewError(cause instanceof Error ? cause.message : 'Palette preview failed.');
      }
    } finally {
      if (previewControllerRef.current === controller) {
        previewControllerRef.current = null;
        setPreviewPending(false);
      }
    }
  }

  return (
    <div className='@container/extract-view flex min-h-0 flex-1 flex-col overflow-auto'>
      <div
        data-extract-layout-grid
        className='grid min-h-0 flex-1 grid-cols-1 grid-rows-[max-content_max-content] content-start'>
        <section
          data-extract-source
          className='tool-panel-space tool-panel-stack flex min-h-0 min-w-0 flex-col'>
          <div className='flex shrink-0 flex-wrap items-center justify-between gap-2'>
            <span className='flex items-center gap-2'>
              <span className='font-mono text-[10px] text-primary'>01</span>
              <span className={TYPE.label}>Source image</span>
            </span>
            {imgSrc && (
              <Button variant='outline' size='xs' onClick={() => fileRef.current?.click()}>
                <Upload className='size-3' />
                Replace image
              </Button>
            )}
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
            className={`relative flex min-h-56 flex-1 items-center justify-center overflow-hidden rounded-md border transition-colors @min-[40rem]:min-h-56 ${imgSrc ? 'border-border bg-secondary' : 'border-dashed border-input bg-secondary/30'} ${dragOver ? 'border-primary bg-primary/5 ring-2 ring-primary/30' : ''}`}
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
                alt='Uploaded color source'
                className='relative max-h-32 max-w-full object-contain @min-[40rem]:max-h-72 @min-[56rem]/extract-view:max-h-full'
              />
            ) : (
              <div className='flex max-w-lg flex-col items-center gap-4 px-5 py-6 text-center'>
                <div className='flex items-center gap-2.5' aria-hidden='true'>
                  <span className='grid size-11 place-items-center rounded-md border border-primary/30 bg-primary/10 text-primary'>
                    <ImageIcon className='size-5' stroke={1.5} />
                  </span>
                  <ArrowRight className='size-4 text-muted-foreground' />
                  <span className='grid size-11 place-items-center rounded-md border border-border bg-card text-foreground'>
                    <Pipette className='size-5' stroke={1.5} />
                  </span>
                  <ArrowRight className='size-4 text-muted-foreground' />
                  <span className='grid size-11 place-items-center rounded-md border border-border bg-card text-foreground'>
                    <Palette className='size-5' stroke={1.5} />
                  </span>
                </div>
                <div className='space-y-1.5'>
                  <p className='font-display text-base font-semibold text-foreground'>
                    Make a palette from any image
                  </p>
                  <p className='text-xs leading-relaxed text-muted-foreground'>
                    Upload a photo, illustration, or screenshot. Chroma will find its key colors and
                    expand them into an app-ready palette.
                  </p>
                </div>
                <Button size='sm' onClick={() => fileRef.current?.click()}>
                  <Upload className='size-3.5' />
                  Choose image
                </Button>
                <span className='text-[10px] text-muted-foreground'>
                  PNG, JPG, or WebP · or drag and drop
                </span>
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
            <div className='flex min-w-0 items-center gap-2'>
              <span className='font-mono text-[10px] text-primary'>02</span>
              <span className={TYPE.label}>Extracted colors</span>
            </div>
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
                <div
                  key={i}
                  className={`relative min-w-0 overflow-hidden rounded-md border bg-card transition-colors ${isPrimary ? 'border-primary ring-2 ring-primary/60' : 'border-border hover:border-input'}`}>
                  <button
                    type='button'
                    aria-label={`Select ${hex.toUpperCase()} as primary color`}
                    aria-pressed={isPrimary}
                    title={`${name} · ${hex.toUpperCase()}`}
                    onClick={() => {
                      setPrimaryIndex(i);
                      clearPalettePreview();
                    }}
                    className='flex min-h-16 w-full min-w-0 cursor-pointer flex-col text-left outline-none focus-visible:ring-2 focus-visible:ring-ring @min-[20rem]/extracted-colors:min-h-20 @min-[32rem]/extracted-colors:min-h-24 @min-[52rem]/extracted-colors:min-h-28'>
                    <span
                      className='relative flex min-h-8 w-full flex-1 items-start justify-start p-1 @min-[32rem]/extracted-colors:min-h-10 @min-[52rem]/extracted-colors:min-h-12'
                      style={{ background: color.css ?? hex }}>
                      {isPrimary && (
                        <span className='grid size-5 shrink-0 place-items-center rounded-sm border border-primary bg-primary text-primary-foreground shadow-sm'>
                          <Check className='size-3.5' />
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
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      aria-label={`Actions for ${hex.toUpperCase()}`}
                      title='Color options'
                      className='absolute top-1 right-1 grid size-7 cursor-pointer place-items-center rounded-sm border border-border bg-background/90 text-foreground opacity-60 shadow-sm transition-opacity outline-none hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring data-popup-open:opacity-100'>
                      <MoreHorizontal className='size-4' />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end' className='w-48'>
                      <DropdownMenuItem
                        onClick={() => {
                          setPrimaryIndex(i);
                          clearPalettePreview();
                        }}
                        className='cursor-pointer'>
                        <Check className='size-4' />
                        Use as primary color
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => void navigator.clipboard.writeText(hex.toUpperCase())}
                        className='cursor-pointer'>
                        <Copy className='size-4' />
                        Copy HEX
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant='destructive'
                        onClick={() => {
                          clearPalettePreview();
                          const nextColors = extractedColors.filter((_, index) => index !== i);
                          if (imgSrc) setExtracted(nextColors, imgSrc);
                          setPrimaryIndex((current) => {
                            if (nextColors.length === 0) return 0;
                            const nextIndex = current > i ? current - 1 : current;
                            return Math.min(nextIndex, nextColors.length - 1);
                          });
                        }}
                        className='cursor-pointer'>
                        <Trash2 className='size-4' />
                        Remove color
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
            {!extractedColors.length && (
              <div className='col-span-full flex min-h-32 flex-col items-center justify-center gap-1 text-center'>
                <span className='text-xs font-medium text-foreground'>
                  Color samples will appear here
                </span>
                <span className='text-[11px] text-muted-foreground'>
                  Extracted from your source image
                </span>
              </div>
            )}
          </div>
          <section
            data-palette-generation
            className='flex shrink-0 flex-col gap-6 border-t border-border pt-3'>
            <div className='flex items-start justify-between gap-3'>
              <div className='min-w-0'>
                <span className='flex items-center gap-2'>
                  <span className='font-mono text-[10px] text-primary'>03</span>
                  <span className={TYPE.label}>Build your app palette</span>
                </span>
                <p className='mt-1 text-[11px] text-muted-foreground'>
                  {hasImagePalette
                    ? 'Choose a harmony and palette size.'
                    : 'Upload an image above to unlock generation.'}
                </p>
              </div>
            </div>
            <div className='flex min-w-0 flex-col gap-2'>
              <div className='flex items-center justify-between gap-2'>
                <div>
                  <label htmlFor='extract-palette-size' className='text-xs font-medium'>
                    Palette size
                  </label>
                  <p className='text-[10px] text-muted-foreground'>
                    Choose 4 to {MAX_SLOTS} colors
                  </p>
                </div>
                <div className='flex shrink-0 items-center gap-3'>
                  <ActionButton
                    type='button'
                    variant='outline'
                    size='icon-sm'
                    title='Remove one color'
                    aria-label='Remove one color'
                    disabled={paletteCount <= 4}
                    onClick={() => updatePaletteCount(Math.max(4, paletteCount - 1))}>
                    <Minus className='size-3.5' />
                  </ActionButton>
                  <span className='w-7 text-center font-display text-lg font-bold tabular-nums'>
                    {paletteCount}
                  </span>
                  <ActionButton
                    type='button'
                    variant='outline'
                    size='icon-sm'
                    title='Add one color'
                    aria-label='Add one color'
                    disabled={paletteCount >= MAX_SLOTS}
                    onClick={() => updatePaletteCount(Math.min(MAX_SLOTS, paletteCount + 1))}>
                    <Plus className='size-3.5' />
                  </ActionButton>
                </div>
              </div>
              <Slider
                id='extract-palette-size'
                aria-label='Palette size'
                min={4}
                max={MAX_SLOTS}
                step={1}
                value={[paletteCount]}
                thumbAriaLabel='Palette size'
                onValueChange={(value) =>
                  updatePaletteCount(typeof value === 'number' ? value : (value[0] ?? paletteCount))
                }
              />
            </div>
            {hasImagePalette && primaryColor && (
              <div className='border-b border-border pb-3'>
                <div className='flex items-start justify-between gap-2'>
                  <div className='min-w-0'>
                    <p className={TYPE.label}>Harmony</p>
                    <p className='mt-1 text-[13px] font-semibold text-foreground'>
                      {selectedHarmony.label}
                    </p>
                    <p className='mt-0.5 text-[11px] leading-relaxed text-muted-foreground'>
                      {selectedHarmony.desc}
                    </p>
                  </div>
                  <button
                    type='button'
                    aria-expanded={harmonyOpen}
                    onClick={() => setHarmonyOpen((open) => !open)}
                    className='inline-flex shrink-0 cursor-pointer items-center gap-1 rounded border-0 bg-transparent p-0 text-[11px] font-semibold text-primary'>
                    {harmonyOpen ? 'Done' : 'Change'}
                    <ChevronDown
                      className={`size-3 transition-transform ${harmonyOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                </div>
                {harmonyOpen && (
                  <div className='mt-3'>
                    <HarmonyPicker
                      mode={paletteMode}
                      base={primaryColor}
                      onSelect={(selectedMode) => {
                        setDraftMode(selectedMode);
                        clearPalettePreview();
                      }}
                    />
                  </div>
                )}
              </div>
            )}
            <ActionButton
              size='lg'
              className='w-full justify-between px-4'
              disabled={loading || previewPending || !!error || !hasImagePalette}
              onClick={() => void generatePalettePreview()}>
              <span className='flex items-center gap-2'>
                {previewPending ? (
                  <LoaderCircle className='size-4 animate-spin' />
                ) : (
                  <Sparkles className='size-4' />
                )}
                {previewPending ? 'Generating preview...' : 'Generate palette'}
              </span>
              {!previewPending && <ArrowRight className='size-4' />}
            </ActionButton>
            {palettePreview && (
              <div className='flex flex-col gap-3 border-t border-border pt-4'>
                <div
                  role='list'
                  aria-label='Generated palette colors'
                  className='grid min-w-0 grid-cols-2 gap-2 @min-[32rem]/extracted-colors:grid-cols-3 @min-[32rem]/extracted-colors:gap-3'>
                  {palettePreview.map((slot, index) => {
                    const hex = slot.color.hex;
                    const value = slot.color.value ?? parseColor(hex);
                    const name = lookupColorName(value, hex);
                    return (
                      <div
                        key={slot.id}
                        role='listitem'
                        aria-label={`Generated color ${index + 1}: ${hex.toUpperCase()}, ${name}`}
                        className='flex min-h-16 min-w-0 flex-col overflow-hidden rounded-md border border-border bg-card @min-[20rem]/extracted-colors:min-h-20 @min-[32rem]/extracted-colors:min-h-24 @min-[52rem]/extracted-colors:min-h-28'>
                        <span
                          className='relative flex min-h-8 w-full flex-1 @min-[32rem]/extracted-colors:min-h-10 @min-[52rem]/extracted-colors:min-h-12'
                          style={{ background: slot.color.css ?? hex }}
                        />
                        <span className='flex min-w-0 flex-col gap-0.5 border-t border-border bg-card px-1.5 py-1.5 @min-[32rem]/extracted-colors:px-2 @min-[32rem]/extracted-colors:py-2'>
                          <span className='truncate font-mono text-[9px] leading-none text-muted-foreground @min-[32rem]/extracted-colors:text-[10px]'>
                            {hex.toUpperCase()}
                          </span>
                          <span className='truncate text-[10px] leading-snug font-semibold text-card-foreground @min-[32rem]/extracted-colors:text-xs'>
                            {name}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
                <ActionButton
                  size='lg'
                  className='w-full justify-between px-4'
                  disabled={paletteApplied}
                  onClick={() => {
                    loadPalette(palettePreview, paletteMode, paletteCount);
                    setSeedMode('pin');
                    setSeeds([primaryColor!]);
                    setPaletteApplied(true);
                  }}>
                  <span className='flex items-center gap-2'>
                    {paletteApplied ? <Check className='size-4' /> : <Palette className='size-4' />}
                    {paletteApplied ? 'Palette set' : 'Set palette'}
                  </span>
                  {!paletteApplied && <ArrowRight className='size-4' />}
                </ActionButton>
              </div>
            )}
            {previewError && (
              <p role='alert' className='text-xs text-destructive'>
                {previewError}
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
  const { rgb, hsl, hsv, cmyk, oklch } = readings;
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
        description={
          activeTab === 'image'
            ? 'Turn any image into a complete, app-ready color palette.'
            : 'Convert colors between formats with precise, live readouts.'
        }
      />
      <TabBar active={activeTab} setActive={setActiveTab} />
      {activeTab === 'image' && <ImageTab />}
      {activeTab === 'convert' && <ConvertTab />}
    </div>
  );
}
