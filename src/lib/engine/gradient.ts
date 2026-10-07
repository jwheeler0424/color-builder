import { colorValue, renderColor, type ColorValue } from './color.ts';
import { mixColor, type MixSpace } from './mix.ts';
import { simulateVision, type VisionType } from './simulate.ts';
import { clamp } from './spaces/types.ts';

export interface ColorGradientStop {
  color: ColorValue;
  pos: number;
}

export interface ColorGradient {
  type: 'linear' | 'radial' | 'conic';
  dir: string;
  stops: readonly ColorGradientStop[];
}

export type GradientInterpolation = 'srgb' | 'oklab' | 'oklch';

export function applyEasing(value: number, mode: string): number {
  if (!Number.isFinite(value)) throw new Error('Easing progress must be finite.');
  const position = clamp(value, 0, 1);
  if (position === 0 || position === 1) return position;
  if (mode === 'front-loaded') return Math.sqrt(position);
  if (mode === 'back-loaded') return Math.pow(position, 2.5);
  const aliases: Record<string, string> = {
    'ease-in': 'quadratic-in',
    'ease-out': 'quadratic-out',
    'ease-in-out': 'quadratic-in-out',
  };
  const match =
    /^(quadratic|cubic|quartic|quintic|sine|exponential|circular)-(in|out|in-out)$/.exec(
      aliases[mode] ?? mode,
    );
  if (!match) return position;
  const curve = (input: number) => {
    if (input === 0 || input === 1) return input;
    switch (match[1]) {
      case 'quadratic':
        return input ** 2;
      case 'cubic':
        return input ** 3;
      case 'quartic':
        return input ** 4;
      case 'quintic':
        return input ** 5;
      case 'sine':
        return 1 - Math.cos((input * Math.PI) / 2);
      case 'exponential':
        return 2 ** (10 * input - 10);
      default:
        return 1 - Math.sqrt(1 - input * input);
    }
  };
  if (match[2] === 'in') return curve(position);
  if (match[2] === 'out') return 1 - curve(1 - position);
  return position < 0.5 ? curve(position * 2) / 2 : 1 - curve((1 - position) * 2) / 2;
}

export function redistributeGradientStops<Stop extends { pos: number }>(
  gradient: { stops: readonly Stop[]; selectedStop: number },
  mode: string,
): { stops: Stop[]; selectedStop: number } {
  const sorted = gradient.stops
    .map((stop, index) => ({ stop, index }))
    .sort((first, second) => first.stop.pos - second.stop.pos);
  const start = sorted[0]?.stop.pos ?? 0;
  const end = sorted.at(-1)?.stop.pos ?? 100;
  return {
    stops: sorted.map(({ stop }, index) => ({
      ...stop,
      pos:
        index === 0 || index === sorted.length - 1
          ? stop.pos
          : Math.round(
              (start + (end - start) * applyEasing(index / (sorted.length - 1), mode)) * 10,
            ) / 10,
    })),
    selectedStop: Math.max(
      0,
      sorted.findIndex(({ index }) => index === gradient.selectedStop),
    ),
  };
}

function sortedStops(gradient: ColorGradient): ColorGradientStop[] {
  for (const stop of gradient.stops) {
    if (!Number.isFinite(stop.pos) || stop.pos < 0 || stop.pos > 100)
      throw new Error('Gradient positions must be between 0 and 100.');
    colorValue(stop.color.xyz, stop.color.alpha, stop.color.display);
  }
  return [...gradient.stops].sort((first, second) => first.pos - second.pos);
}

export function sampleGradient(
  gradient: ColorGradient,
  position: number,
  interpolation: GradientInterpolation = 'srgb',
): ColorValue {
  if (!Number.isFinite(position)) throw new Error('Gradient position must be finite.');
  const sorted = sortedStops(gradient);
  const first = sorted[0];
  if (!first) throw new Error('Cannot sample an empty gradient.');
  if (position < first.pos)
    return colorValue(first.color.xyz, first.color.alpha, first.color.display);
  for (let index = 1; index < sorted.length; index++) {
    const left = sorted[index - 1]!;
    const right = sorted[index]!;
    if (position < right.pos) {
      const space: MixSpace = interpolation === 'srgb' ? 'rgb' : interpolation;
      return mixColor(
        left.color,
        right.color,
        (position - left.pos) / (right.pos - left.pos),
        space,
      );
    }
  }
  const last = sorted.at(-1)!;
  return colorValue(last.color.xyz, last.color.alpha, last.color.display);
}

export function buildGradientCss(
  gradient: ColorGradient,
  interpolation: GradientInterpolation = 'srgb',
  vision: VisionType = 'normal',
): string {
  const sorted = sortedStops(gradient);
  if (sorted.length < 2) throw new Error('A gradient needs at least two stops.');
  const stops = sorted
    .map((stop) => {
      const value = colorValue(
        simulateVision(stop.color.xyz, vision),
        stop.color.alpha,
        vision === 'normal' ? stop.color.display : 'srgb',
      );
      const rendition = renderColor(value);
      const paint = value.display === 'srgb' && value.alpha === 1 ? rendition.hex : rendition.css;
      return `${paint} ${stop.pos}%`;
    })
    .join(', ');
  const space = interpolation === 'srgb' ? '' : ` in ${interpolation}`;
  if (gradient.type === 'radial') return `radial-gradient(circle at center${space}, ${stops})`;
  if (gradient.type === 'conic')
    return `conic-gradient(${gradient.dir.startsWith('from ') ? gradient.dir : 'from 0deg'}${space}, ${stops})`;
  return `linear-gradient(${gradient.dir.startsWith('from ') ? 'to right' : gradient.dir}${space}, ${stops})`;
}
