import '../../../node_modules/@tanstack/charts/dist/mark.js';
import type { ChartValue } from '@tanstack/charts/types';
import type { CSSProperties } from 'react';

import { Chart as TanStackChart, type ChartProps } from '@tanstack/charts/react';

import { cn } from '@/lib/utils/tw';

const chartStyle: CSSProperties & Record<`--ts-chart-${string}`, string> = {
  '--ts-chart-tooltip-background': 'var(--popover)',
  '--ts-chart-tooltip-color': 'var(--popover-foreground)',
  '--ts-chart-tooltip-border': '1px solid var(--border)',
  '--ts-chart-tooltip-font': '500 0.75rem/1.3 var(--font-sans)',
  '--ts-chart-focus-fill': 'var(--background)',
};

export function Chart<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>({ className, initialWidth = 280, ...props }: ChartProps<TDatum, TXValue, TYValue>) {
  const sceneWidth = props.width ?? initialWidth;
  const sceneHeight = props.height ?? 320;
  return (
    <div
      data-slot='chart'
      style={chartStyle}
      className={cn(
        'h-full w-full min-w-0 font-mono text-foreground [&_circle]:drop-shadow-sm [&_svg]:block [&_svg]:max-w-full',
        className,
      )}>
      <TanStackChart
        {...props}
        width={sceneWidth}
        height={sceneHeight}
        initialWidth={initialWidth}
        style={{ ...props.style, width: '100%', height: '100%' }}
      />
    </div>
  );
}
