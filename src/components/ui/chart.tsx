import "../../../node_modules/@tanstack/charts/dist/mark.js";
import type { ChartValue } from "@tanstack/charts/types";

import { Chart as TanStackChart, type ChartProps } from "@tanstack/charts/react";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import { cn } from "@/lib/utils/tw";

const chartStyle: CSSProperties & Record<`--ts-chart-${string}`, string> = {
  "--ts-chart-tooltip-background": "var(--popover)",
  "--ts-chart-tooltip-color": "var(--popover-foreground)",
  "--ts-chart-tooltip-border": "1px solid var(--border)",
  "--ts-chart-tooltip-font": "500 0.75rem/1.3 var(--font-sans)",
  "--ts-chart-focus-fill": "var(--background)",
};

export function Chart<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>({ className, width, initialWidth = 280, ...props }: ChartProps<TDatum, TXValue, TYValue>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [measuredWidth, setMeasuredWidth] = useState(initialWidth);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || width !== undefined) return;
    let frame = 0;
    const observer = new ResizeObserver((entries) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const nextWidth = Math.floor(entries[0]?.contentRect.width ?? 0);
        if (nextWidth > 0) setMeasuredWidth(nextWidth);
      });
    });
    observer.observe(container);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [width]);

  return (
    <div
      ref={containerRef}
      data-slot="chart"
      style={chartStyle}
      className={cn(
        "w-full min-w-0 font-mono text-foreground [&_circle]:drop-shadow-sm [&_svg]:block [&_svg]:max-w-full",
        className,
      )}
    >
      <TanStackChart {...props} width={width ?? measuredWidth} initialWidth={initialWidth} />
    </div>
  );
}
