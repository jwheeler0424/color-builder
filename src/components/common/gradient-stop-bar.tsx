import React, { useRef, useCallback } from 'react';

import type { GradientStop } from '@/types';

import { renderColor } from '@/lib/engine/color';
import { cn, clamp } from '@/lib/utils';

interface GradientStopBarProps {
  stops: GradientStop[];
  selectedStop: number;
  gradientCss: string;
  onSelectStop: (index: number) => void;
  onMoveStop: (index: number, pos: number) => void;
  onAddStop: (pos: number) => void;
  onRemoveStop: (index: number) => void;
}

export default function GradientStopBar({
  stops,
  selectedStop,
  gradientCss,
  onSelectStop,
  onMoveStop,
  onAddStop,
  onRemoveStop,
}: GradientStopBarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingIdx = useRef<number | null>(null);

  const posFromEvent = useCallback((clientX: number): number => {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    return clamp(Math.round(((clientX - rect.left) / rect.width) * 100), 0, 100);
  }, []);

  const startDrag = useCallback(
    (e: React.MouseEvent | React.TouchEvent, idx: number) => {
      e.stopPropagation();
      e.preventDefault();
      draggingIdx.current = idx;
      onSelectStop(idx);

      const onMove = (ev: MouseEvent | TouchEvent) => {
        if (draggingIdx.current === null) return;
        const clientX = 'touches' in ev ? ev.touches[0].clientX : ev.clientX;
        onMoveStop(draggingIdx.current, posFromEvent(clientX));
      };
      const onUp = () => {
        draggingIdx.current = null;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.removeEventListener('touchend', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('mouseup', onUp);
      document.addEventListener('touchend', onUp);
    },
    [onSelectStop, onMoveStop, posFromEvent],
  );

  const handleTrackClick = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).classList.contains('grad-stop-handle')) return;
      onAddStop(posFromEvent(e.clientX));
    },
    [posFromEvent, onAddStop],
  );

  // ── Keyboard handling on stop handle ──────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, idx: number) => {
      const stop = stops[idx];
      if (!stop) return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowDown': {
          e.preventDefault();
          const step = e.shiftKey ? 5 : 1;
          onMoveStop(idx, clamp(stop.pos - step, 0, 100));
          break;
        }
        case 'ArrowRight':
        case 'ArrowUp': {
          e.preventDefault();
          const step = e.shiftKey ? 5 : 1;
          onMoveStop(idx, clamp(stop.pos + step, 0, 100));
          break;
        }
        case 'Delete':
        case 'Backspace': {
          e.preventDefault();
          if (stops.length > 2) onRemoveStop(idx);
          break;
        }
      }
    },
    [stops, onMoveStop, onRemoveStop, onSelectStop],
  );

  return (
    <div className='mb-4 w-full min-w-0'>
      {/* Gradient preview track */}
      <div
        ref={trackRef}
        className='relative h-10 cursor-crosshair overflow-visible rounded'
        onClick={handleTrackClick}
        role='group'
        aria-label='Gradient stops'>
        <div
          aria-hidden='true'
          className='pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]'
          style={{ background: gradientCss }}
        />
        {stops.map((stop, i) => (
          <div
            key={i}
            className={cn('grad-stop-handle', i === selectedStop && 'selected')}
            style={{
              left: `${stop.pos}%`,
              background: stop.value ? renderColor(stop.value).css : stop.hex,
            }}
            onMouseDown={(e) => startDrag(e, i)}
            onTouchStart={(e) => startDrag(e, i)}
            onFocus={() => onSelectStop(i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            tabIndex={0}
            role='slider'
            aria-label={`Stop ${i + 1}: ${stop.hex}`}
            aria-valuenow={stop.pos}
            aria-valuemin={0}
            aria-valuemax={100}
            title={`Stop ${i + 1}: ${stop.hex} at ${stop.pos}%`}>
            {stops.length > 2 && i === selectedStop && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveStop(i);
                }}
                title='Remove stop (or press Delete)'
                className='absolute -top-2.5 -right-2.5 flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border-none bg-destructive p-0 text-[10px] leading-none text-white'
                tabIndex={-1}>
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      <p className='mt-1.5 text-[10px] text-muted-foreground'>
        Click track to add · Drag or <kbd className='rounded border border-border px-1'>←</kbd>/
        <kbd className='rounded border border-border px-1'>→</kbd> to move ·{' '}
        <kbd className='rounded border border-border px-1'>Del</kbd> to remove ·{' '}
        <kbd className='rounded border border-border px-1'>Tab</kbd> to cycle
      </p>
    </div>
  );
}
