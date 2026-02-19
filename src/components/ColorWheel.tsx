import React, { useRef, useEffect, useCallback } from "react";
import type { HSL } from "@/types";
import { hslToRgb, clamp } from "@/lib/utils/colorMath";

interface ColorWheelProps {
  hsl: HSL;
  size?: number;
  onChange: (hsl: Partial<HSL>) => void;
}

export default function ColorWheel({
  hsl,
  size = 260,
  onChange,
}: ColorWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draggingRef = useRef(false);
  const rectRef = useRef<DOMRect | null>(null);
  const lastLRef = useRef<number>(-1);

  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const sz = canvas.width;
    const cx = sz / 2,
      cy = sz / 2,
      radius = sz / 2 - 2;
    const img = ctx.createImageData(sz, sz);
    const d = img.data;
    for (let y = 0; y < sz; y++) {
      for (let x = 0; x < sz; x++) {
        const dx = x - cx,
          dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius) continue;
        const h = ((Math.atan2(dy, dx) * 180) / Math.PI + 90 + 360) % 360;
        const s = (dist / radius) * 100;
        const rgb = hslToRgb({ h, s, l: hsl.l });
        const idx = (y * sz + x) * 4;
        d[idx] = rgb.r;
        d[idx + 1] = rgb.g;
        d[idx + 2] = rgb.b;
        d[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    lastLRef.current = hsl.l;
  }, [hsl.l]);

  // Only redraw when lightness changes
  useEffect(() => {
    if (Math.abs(hsl.l - lastLRef.current) > 0.4) drawWheel();
  }, [hsl.l, drawWheel]);

  // Initial draw
  useEffect(() => {
    drawWheel();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const hitWheel = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = rectRef.current ?? canvas.getBoundingClientRect();
      const radius = canvas.width / 2 - 2;
      const x = clientX - rect.left - canvas.width / 2;
      const y = clientY - rect.top - canvas.height / 2;
      const dist = Math.sqrt(x * x + y * y);
      if (dist > radius) return;
      const h = ((Math.atan2(y, x) * 180) / Math.PI + 90 + 360) % 360;
      const s = clamp((dist / radius) * 100, 0, 100);
      onChange({ h, s });
    },
    [onChange],
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      draggingRef.current = true;
      rectRef.current = canvasRef.current!.getBoundingClientRect();
      hitWheel(e.clientX, e.clientY);
    },
    [hitWheel],
  );

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      draggingRef.current = true;
      rectRef.current = canvasRef.current!.getBoundingClientRect();
      hitWheel(e.touches[0]!.clientX, e.touches[0]!.clientY);
    },
    [hitWheel],
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (draggingRef.current) hitWheel(e.clientX, e.clientY);
    };
    const onTMove = (e: TouchEvent) => {
      if (draggingRef.current) {
        e.preventDefault();
        hitWheel(e.touches[0]!.clientX, e.touches[0]!.clientY);
      }
    };
    const onUp = () => {
      draggingRef.current = false;
      rectRef.current = null;
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("touchmove", onTMove, { passive: false });
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchend", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("touchmove", onTMove);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchend", onUp);
    };
  }, [hitWheel]);

  // Cursor position
  const radius = size / 2 - 2;
  const r = radius * (hsl.s / 100);
  const angle = ((hsl.h - 90) * Math.PI) / 180;
  const cx = size / 2 + r * Math.cos(angle);
  const cy = size / 2 + r * Math.sin(angle);

  return (
    <div className="ch-wheel-wrap" style={{ width: size, height: size }}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="ch-wheel-canvas"
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      />
      <div className="ch-wheel-cursor" style={{ left: cx, top: cy }} />
    </div>
  );
}
