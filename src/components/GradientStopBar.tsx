import React, { useRef, useCallback } from "react";
import type { GradientStop } from "@/types";
import { clamp } from "@/lib/utils/colorMath";

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
        const clientX = "touches" in ev ? ev.touches[0]!.clientX : ev.clientX;
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
      // Don't create stop when clicking on a handle
      if ((e.target as HTMLElement).classList.contains("ch-grad-stop-handle"))
        return;
      const pos = posFromEvent(e.clientX);
      onAddStop(pos);
    },
    [posFromEvent, onAddStop],
  );

  return (
    <div className="ch-grad-bar-wrap">
      {/* Gradient preview track */}
      <div
        ref={trackRef}
        className="ch-grad-bar-track"
        style={{ background: gradientCss }}
        onClick={handleTrackClick}
      >
        {/* Stop handles */}
        {stops.map((stop, i) => (
          <div
            key={i}
            className={`ch-grad-stop-handle${i === selectedStop ? " selected" : ""}`}
            style={{ left: `${stop.pos}%`, background: stop.hex }}
            onMouseDown={(e) => startDrag(e, i)}
            onTouchStart={(e) => startDrag(e, i)}
            title={`Stop ${i + 1}: ${stop.hex} at ${stop.pos}%`}
          >
            {stops.length > 2 && i === selectedStop && (
              <button
                className="ch-grad-stop-rm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveStop(i);
                }}
                title="Remove stop"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="ch-grad-bar-hint">
        Click track to add stop · Drag handles to reposition
      </div>
    </div>
  );
}
