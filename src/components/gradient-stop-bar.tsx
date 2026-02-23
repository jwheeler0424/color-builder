import React, { useRef, useCallback } from "react";
import type { GradientStop } from "@/types";
import { cn, clamp } from "@/lib/utils";

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
    return clamp(
      Math.round(((clientX - rect.left) / rect.width) * 100),
      0,
      100,
    );
  }, []);

  const startDrag = useCallback(
    (e: React.MouseEvent | React.TouchEvent, idx: number) => {
      e.stopPropagation();
      e.preventDefault();
      draggingIdx.current = idx;
      onSelectStop(idx);

      const onMove = (ev: MouseEvent | TouchEvent) => {
        if (draggingIdx.current === null) return;
        const clientX = "touches" in ev ? ev.touches[0].clientX : ev.clientX;
        onMoveStop(draggingIdx.current, posFromEvent(clientX));
      };
      const onUp = () => {
        draggingIdx.current = null;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("touchmove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.removeEventListener("touchend", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("touchmove", onMove, { passive: false });
      document.addEventListener("mouseup", onUp);
      document.addEventListener("touchend", onUp);
    },
    [onSelectStop, onMoveStop, posFromEvent],
  );

  const handleTrackClick = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).classList.contains("grad-stop-handle"))
        return;
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
        case "ArrowLeft":
        case "ArrowDown": {
          e.preventDefault();
          const step = e.shiftKey ? 5 : 1;
          onMoveStop(idx, clamp(stop.pos - step, 0, 100));
          break;
        }
        case "ArrowRight":
        case "ArrowUp": {
          e.preventDefault();
          const step = e.shiftKey ? 5 : 1;
          onMoveStop(idx, clamp(stop.pos + step, 0, 100));
          break;
        }
        case "Delete":
        case "Backspace": {
          e.preventDefault();
          if (stops.length > 2) onRemoveStop(idx);
          break;
        }
        case "Tab": {
          // Let Tab naturally move to next/prev stop
          e.preventDefault();
          const next = e.shiftKey
            ? (idx - 1 + stops.length) % stops.length
            : (idx + 1) % stops.length;
          onSelectStop(next);
          // Focus the next handle
          const handles =
            trackRef.current?.querySelectorAll<HTMLElement>(
              ".grad-stop-handle",
            );
          handles?.[next]?.focus();
          break;
        }
      }
    },
    [stops, onMoveStop, onRemoveStop, onSelectStop],
  );

  return (
    <div className="mb-4 max-w-240">
      {/* Gradient preview track */}
      <div
        ref={trackRef}
        className="relative h-10 rounded border border-border cursor-crosshair overflow-visible"
        style={{ background: gradientCss }}
        onClick={handleTrackClick}
        role="group"
        aria-label="Gradient stops"
      >
        {stops.map((stop, i) => (
          <div
            key={i}
            className={cn("grad-stop-handle", i === selectedStop && "selected")}
            style={{ left: `${stop.pos}%`, background: stop.hex }}
            onMouseDown={(e) => startDrag(e, i)}
            onTouchStart={(e) => startDrag(e, i)}
            onFocus={() => onSelectStop(i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            tabIndex={0}
            role="slider"
            aria-label={`Stop ${i + 1}: ${stop.hex}`}
            aria-valuenow={stop.pos}
            aria-valuemin={0}
            aria-valuemax={100}
            title={`Stop ${i + 1}: ${stop.hex} at ${stop.pos}%`}
          >
            {stops.length > 2 && i === selectedStop && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveStop(i);
                }}
                title="Remove stop (or press Delete)"
                className="absolute -top-2.5 -right-2.5 w-4 h-4 bg-destructive rounded-full flex items-center justify-center text-[10px] cursor-pointer border-none text-white p-0 leading-none"
                tabIndex={-1}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground mt-1.5">
        Click track to add · Drag or{" "}
        <kbd className="px-1 border border-border rounded">←</kbd>/
        <kbd className="px-1 border border-border rounded">→</kbd> to move ·{" "}
        <kbd className="px-1 border border-border rounded">Del</kbd> to remove ·{" "}
        <kbd className="px-1 border border-border rounded">Tab</kbd> to cycle
      </p>
    </div>
  );
}
