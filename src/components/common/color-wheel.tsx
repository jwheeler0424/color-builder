import React, { useRef, useEffect, useCallback } from "react";
import type { HSL } from "@/types";
import { hslToRgb, clamp } from "@/lib/utils";

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
    const ctx = canvas.getContext("2d", {
      alpha: true,
      willReadFrequently: true,
    })!;

    // Scale for high DPI displays to prevent blurry/pixelated rendering
    const dpr =
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const actualSize = Math.floor(size * dpr);

    canvas.width = actualSize;
    canvas.height = actualSize;

    const cx = actualSize / 2;
    const cy = actualSize / 2;
    // Keep a small padding scaled by DPR
    const radius = actualSize / 2 - 2 * dpr;

    const img = ctx.createImageData(actualSize, actualSize);
    const d = img.data;

    for (let y = 0; y < actualSize; y++) {
      for (let x = 0; x < actualSize; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Skip pixels fully outside the smooth edge
        if (dist > radius + 1) continue;

        const h = ((Math.atan2(dy, dx) * 180) / Math.PI + 90 + 360) % 360;
        const s = clamp((dist / radius) * 100, 0, 100);
        const rgb = hslToRgb({ h, s, l: hsl.l });

        const idx = (y * actualSize + x) * 4;

        // Anti-aliasing: create a 1-pixel soft gradient at the absolute edge
        const alpha = clamp(radius - dist + 1, 0, 1) * 255;

        d[idx] = rgb.r;
        d[idx + 1] = rgb.g;
        d[idx + 2] = rgb.b;
        d[idx + 3] = alpha;
      }
    }
    ctx.putImageData(img, 0, 0);
    lastLRef.current = hsl.l;
  }, [hsl.l, size]);

  // Only redraw when lightness changes significantly to save performance
  useEffect(() => {
    if (Math.abs(hsl.l - lastLRef.current) > 0.4) drawWheel();
  }, [hsl.l, drawWheel]);

  useEffect(() => {
    drawWheel();
  }, [drawWheel]);

  const hitWheel = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = rectRef.current ?? canvas.getBoundingClientRect();

      // Use CSS pixels for interaction math, not canvas DPI pixels
      const cssSize = rect.width;
      const radius = cssSize / 2 - 2;
      const x = clientX - rect.left - cssSize / 2;
      const y = clientY - rect.top - cssSize / 2;
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
      // Prevent scrolling when trying to interact with the color wheel
      draggingRef.current = true;
      rectRef.current = canvasRef.current!.getBoundingClientRect();
      hitWheel(e.touches[0].clientX, e.touches[0].clientY);
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
        hitWheel(e.touches[0].clientX, e.touches[0].clientY);
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

  // Cursor position math
  const radius = size / 2 - 2;
  const r = radius * (hsl.s / 100);
  const angle = ((hsl.h - 90) * Math.PI) / 180;
  const cx = size / 2 + r * Math.cos(angle);
  const cy = size / 2 + r * Math.sin(angle);

  // Derive cursor color to match exactly where it's sitting
  const cursorColor = `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l * 100)}%)`;

  return (
    <div
      className="relative shrink-0 rounded-full shadow-inner ring-1 ring-black/5"
      style={{ width: size, height: size }}
    >
      <canvas
        ref={canvasRef}
        className="block cursor-crosshair touch-none rounded-full"
        style={{ width: size, height: size }} // Force CSS dimensions
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      />
      {/* Sleek, interactive cursor */}
      <div
        className="pointer-events-none absolute z-10 rounded-full border-[2.5px] border-white shadow-[0_0_0_1px_rgba(0,0,0,0.1),0_4px_8px_rgba(0,0,0,0.3)] transition-transform duration-75 hover:scale-110 active:scale-95"
        style={{
          width: 20,
          height: 20,
          left: cx,
          top: cy,
          transform: "translate(-50%, -50%)",
          backgroundColor: cursorColor,
        }}
      />
    </div>
  );
}
