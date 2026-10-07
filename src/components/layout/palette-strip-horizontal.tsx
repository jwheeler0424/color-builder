/**
 * palette-strip-horizontal.tsx  — Phase 4/5 layout component
 *
 * Horizontal scrollable palette strip for tablet/mobile.
 * Each slot is a fixed-width card (~100px wide on tablet, 80px on mobile)
 * with the full strip height configurable via `height` prop.
 *
 * Features:
 *   - Horizontal scroll with snap-to-slot (CSS scroll-snap)
 *   - Active dot indicators below the strip (mobile)
 *   - Tap to focus slot, double-tap to edit
 *   - Drag handle positioned at top of each card
 *
 * Tablet: height ≈ 140px, no dots, slot width ≈ 100px
 * Mobile: height ≈ 44vh, with dot indicators, slot width ≈ 80px + snap
 *
 * Note: DnD reorder is disabled on touch (swipe conflicts with scroll).
 * Instead, long-press could trigger reorder in a future enhancement.
 * For now, the reorder affordance is visually hidden on touch.
 */

import React, { useRef, useState, useCallback, useMemo } from 'react';

import type { ColorStop } from '@/types';

import { useChromaStore } from '@/hooks/use-chroma-store';
import { parseColor, renderColor, rgbToHsl, textColor } from '@/lib/engine/browser';
import { lookupColorName } from '@/lib/tools/color-names';
import { cn } from '@/lib/utils';

// ─── Horizontal Slot Card ─────────────────────────────────────────────────────

interface HSlotCardProps {
  slot: {
    id: string;
    color: ColorStop;
    locked?: boolean;
    name?: string;
  };
  index: number;
  onEdit: (index: number) => void;
  active: boolean;
  slotWidth: number;
}

function HSlotCard({ slot, index, onEdit, active, slotWidth }: HSlotCardProps) {
  const color = useMemo(
    () => slot.color.value ?? parseColor(slot.color.hex),
    [slot.color.value, slot.color.hex],
  );
  const rendition = useMemo(() => renderColor(color), [color]);
  const hsl = useMemo(() => rgbToHsl(rendition.srgb), [rendition.srgb]);
  const tc = useMemo(() => textColor(color.xyz), [color.xyz]);
  const autoName = lookupColorName(color, rendition.hex);

  const [lastTap, setLastTap] = useState(0);
  const [copied, setCopied] = useState(false);

  // Double-tap to edit
  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap < 300) {
      onEdit(index);
    }
    setLastTap(now);
  }, [lastTap, index, onEdit]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(slot.color.hex).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const bg = rendition.css;

  return (
    <div
      onClick={handleTap}
      className={cn(
        'relative flex h-full shrink-0 flex-col select-none',
        'scroll-snap-align-center transition-all duration-150',
        active && 'ring-2 ring-white/40 ring-inset',
      )}
      style={{ width: slotWidth, background: bg }}>
      {/* Lock badge */}
      {slot.locked && (
        <div className='absolute top-2 right-2 text-[10px] opacity-70' style={{ color: tc }}>
          🔒
        </div>
      )}

      <div className='flex-1' />

      {/* Bottom info */}
      <div className='flex flex-col gap-1 p-2'>
        {/* Name */}
        <div
          className='truncate font-mono text-[9px] leading-none font-semibold opacity-60'
          style={{ color: tc }}>
          {slot.name || autoName}
        </div>

        {/* Hex */}
        <button
          className='text-left font-mono text-[11px] leading-none font-bold tracking-wider uppercase transition-opacity hover:opacity-80'
          style={{ color: tc }}
          onClick={handleCopy}
          title='Copy hex'>
          {slot.color.hex.toUpperCase()}
        </button>

        {/* HSL */}
        <div className='font-mono text-[9px] leading-none opacity-45' style={{ color: tc }}>
          {Math.round(hsl.h)}° {Math.round(hsl.l * 100)}%
        </div>

        {/* Edit button */}
        <button
          className='mt-1 flex h-6 w-6 items-center justify-center rounded border border-white/10 bg-black/40 transition-colors hover:bg-black/60'
          style={{ color: tc }}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(index);
          }}
          title='Edit color'>
          <span style={{ fontSize: 10 }}>✎</span>
        </button>
      </div>

      {/* Copied toast */}
      {copied && (
        <div className='pointer-events-none absolute inset-0 flex items-center justify-center'>
          <span className='rounded-full bg-black/80 px-2 py-1 font-mono text-[10px] text-white'>
            Copied!
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Palette Strip Horizontal ─────────────────────────────────────────────────

interface PaletteStripHorizontalProps {
  onEditSlot: (index: number) => void;
  /** Height in px or CSS string (default '140px' for tablet) */
  height?: number | string;
  /** Slot card width in px (default 100 for tablet, 80 for mobile) */
  slotWidth?: number;
  /** Show dot indicators below the strip (mobile) */
  showDots?: boolean;
  className?: string;
}

export function PaletteStripHorizontal({
  onEditSlot,
  height = 140,
  slotWidth = 100,
  showDots = false,
  className,
}: PaletteStripHorizontalProps) {
  const slots = useChromaStore((s) => s.slots);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Track scroll position for dot indicator
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, clientWidth } = scrollRef.current;
    const index = Math.round(scrollLeft / slotWidth);
    setActiveIndex(Math.min(index, slots.length - 1));
  }, [slotWidth, slots.length]);

  return (
    <div className={cn('flex shrink-0 flex-col border-b border-border', className)}>
      {/* Scrollable strip */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className='flex [scrollbar-width:none] overflow-x-auto overflow-y-hidden [-webkit-overflow-scrolling:touch]'
        style={{
          height: typeof height === 'number' ? `${height}px` : height,
          scrollSnapType: showDots ? 'x mandatory' : 'x proximity',
        }}>
        {slots.map((slot, i) => (
          <HSlotCard
            key={slot.id}
            slot={slot}
            index={i}
            onEdit={onEditSlot}
            active={showDots && activeIndex === i}
            slotWidth={slotWidth}
          />
        ))}
      </div>

      {/* Dot indicators (mobile) */}
      {showDots && slots.length > 0 && (
        <div
          className='flex [scrollbar-width:none] items-center justify-center gap-1.5 overflow-x-auto py-2'
          role='tablist'
          aria-label='Palette slots'>
          {slots.map((slot, i) => (
            <button
              key={slot.id}
              role='tab'
              aria-selected={activeIndex === i}
              aria-label={`Slot ${i + 1}: ${slot.color.hex}`}
              className={cn(
                'shrink-0 cursor-pointer rounded-full border-0 p-0 transition-all',
                activeIndex === i ? 'h-2 w-4' : 'h-2 w-2 opacity-40',
              )}
              style={{ background: slot.color.hex }}
              onClick={() => {
                scrollRef.current?.scrollTo({
                  left: i * slotWidth,
                  behavior: 'smooth',
                });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
