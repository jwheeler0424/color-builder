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

import React, { useRef, useState, useCallback, useMemo } from "react";
import { useChromaStore } from "@/hooks/use-chroma-store";
import { textColor, hexToRgb, rgbToHsl, nearestName, cn } from "@/lib/utils";

// ─── Horizontal Slot Card ─────────────────────────────────────────────────────

interface HSlotCardProps {
  slot: {
    id: string;
    color: { hex: string; a?: number };
    locked?: boolean;
    name?: string;
  };
  index: number;
  onEdit: (index: number) => void;
  active: boolean;
  slotWidth: number;
}

function HSlotCard({ slot, index, onEdit, active, slotWidth }: HSlotCardProps) {
  const rgb = useMemo(() => hexToRgb(slot.color.hex), [slot.color.hex]);
  const hsl = useMemo(() => rgbToHsl(rgb), [rgb]);
  const tc = useMemo(() => textColor(rgb), [rgb]);
  const autoName = useMemo(() => nearestName(rgb), [rgb]);

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

  const bg =
    slot.color.a !== undefined && slot.color.a < 100
      ? `rgba(${rgb.r},${rgb.g},${rgb.b},${(slot.color.a / 100).toFixed(2)})`
      : slot.color.hex;

  return (
    <div
      onClick={handleTap}
      className={cn(
        "relative flex flex-col shrink-0 h-full select-none",
        "scroll-snap-align-center transition-all duration-150",
        active && "ring-2 ring-inset ring-white/40",
      )}
      style={{ width: slotWidth, background: bg }}
    >
      {/* Lock badge */}
      {slot.locked && (
        <div
          className="absolute top-2 right-2 text-[10px] opacity-70"
          style={{ color: tc }}
        >
          🔒
        </div>
      )}

      <div className="flex-1" />

      {/* Bottom info */}
      <div className="flex flex-col gap-1 p-2">
        {/* Name */}
        <div
          className="font-mono text-[9px] font-semibold opacity-60 leading-none truncate"
          style={{ color: tc }}
        >
          {slot.name || autoName}
        </div>

        {/* Hex */}
        <button
          className="text-left font-mono text-[11px] font-bold uppercase tracking-wider leading-none hover:opacity-80 transition-opacity"
          style={{ color: tc }}
          onClick={handleCopy}
          title="Copy hex"
        >
          {slot.color.hex.toUpperCase()}
        </button>

        {/* HSL */}
        <div
          className="font-mono text-[9px] opacity-45 leading-none"
          style={{ color: tc }}
        >
          {Math.round(hsl.h)}° {Math.round(hsl.l)}%
        </div>

        {/* Edit button */}
        <button
          className="mt-1 flex items-center justify-center w-6 h-6 rounded bg-black/40 border border-white/10 hover:bg-black/60 transition-colors"
          style={{ color: tc }}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(index);
          }}
          title="Edit color"
        >
          <span style={{ fontSize: 10 }}>✎</span>
        </button>
      </div>

      {/* Copied toast */}
      {copied && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="bg-black/80 text-white text-[10px] font-mono px-2 py-1 rounded-full">
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
    <div
      className={cn("flex flex-col shrink-0 border-b border-border", className)}
    >
      {/* Scrollable strip */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto overflow-y-hidden [scrollbar-width:none] [-webkit-overflow-scrolling:touch]"
        style={{
          height: typeof height === "number" ? `${height}px` : height,
          scrollSnapType: showDots ? "x mandatory" : "x proximity",
        }}
      >
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
          className="flex items-center justify-center gap-1.5 py-2 overflow-x-auto [scrollbar-width:none]"
          role="tablist"
          aria-label="Palette slots"
        >
          {slots.map((slot, i) => (
            <button
              key={slot.id}
              role="tab"
              aria-selected={activeIndex === i}
              aria-label={`Slot ${i + 1}: ${slot.color.hex}`}
              className={cn(
                "rounded-full shrink-0 transition-all cursor-pointer border-0 p-0",
                activeIndex === i ? "w-4 h-2" : "w-2 h-2 opacity-40",
              )}
              style={{ background: slot.color.hex }}
              onClick={() => {
                scrollRef.current?.scrollTo({
                  left: i * slotWidth,
                  behavior: "smooth",
                });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
