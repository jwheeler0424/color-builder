import '../../../node_modules/@tanstack/charts/dist/mark.js';
import { dot } from '@tanstack/charts/dot';
import { decorative } from '@tanstack/charts/mark/decorative';
import {
  angleGrid,
  focusGroupAngle,
  polar,
  radialArea,
  radialDot,
  radialGrid,
  radialText,
} from '@tanstack/charts/polar';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { scalePoint } from '@tanstack/charts/scales/point';
import { defineChart } from '@tanstack/charts/scene';
import { curveLinearClosed } from 'd3-shape';

export type ScoreDimension = 'balance' | 'accessibility' | 'harmony' | 'uniqueness';
export type RadarScores = Record<ScoreDimension, number>;

const dimensions: readonly ScoreDimension[] = ['balance', 'accessibility', 'harmony', 'uniqueness'];

const chartTheme = {
  foreground: 'var(--foreground)',
  muted: 'var(--muted-foreground)',
  grid: 'var(--border)',
  // Charts sit inside cards; let the card surface show through
  background: 'transparent',
  palette: [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)',
  ],
};

export const MAX_CHROMA = 0.37;

export interface PaletteChartPoint {
  id: string;
  name: string;
  hex: string;
  locked: boolean;
  lightness: number;
  chroma: number;
  hue: number;
}

export function createChromaChart(points: readonly PaletteChartPoint[], activeId?: string | null) {
  return defineChart({
    theme: chartTheme,
    marks: [
      dot(points, {
        id: 'palette-colors',
        x: 'chroma',
        y: 'lightness',
        key: 'id',
        color: 'id',
        r: (point) => (point.id === activeId ? 12 : point.locked ? 10 : 8),
        stroke: 'var(--foreground)',
        strokeOpacity: 0.8,
        strokeWidth: 2,
      }),
    ],
    scales: {
      x: {
        scale: scaleLinear().domain([0, MAX_CHROMA]),
        grid: { stroke: 'var(--foreground)', strokeOpacity: 0.12 },
        axis: {
          label: 'Chroma (C)',
          line: { strokeOpacity: 0.4 },
          tickLabels: { fill: 'var(--foreground)', opacity: 0.75 },
          ticks: { count: 4, format: (value) => Number(value).toFixed(2) },
        },
      },
      y: {
        scale: scaleLinear().domain([0, 1]),
        grid: { stroke: 'var(--foreground)', strokeOpacity: 0.12 },
        axis: {
          label: 'Lightness (L)',
          line: { strokeOpacity: 0.4 },
          tickLabels: { fill: 'var(--foreground)', opacity: 0.75 },
          ticks: { count: 5, format: (value) => Number(value).toFixed(1) },
        },
      },
    },
    color: { domain: points.map((point) => point.id), range: points.map((point) => point.hex) },
  });
}

export function createHueChart(points: readonly PaletteChartPoint[], activeId?: string | null) {
  return defineChart({
    theme: chartTheme,
    margin: 12,
    marks: [
      polar({
        radiusRatio: 0.84,
        scales: {
          angle: { scale: scaleLinear().domain([0, 360]) },
          radius: { scale: scaleLinear().domain([0, MAX_CHROMA]) },
        },
        guides: [
          radialGrid({
            stroke: 'var(--foreground)',
            strokeOpacity: 0.15,
            values: [
              MAX_CHROMA * 0.2,
              MAX_CHROMA * 0.4,
              MAX_CHROMA * 0.6,
              MAX_CHROMA * 0.8,
              MAX_CHROMA,
            ],
          }),
          angleGrid({
            values: [0, 60, 120, 180, 240, 300],
            stroke: 'var(--foreground)',
            strokeOpacity: 0.18,
            labelFill: 'var(--foreground)',
            labelFontSize: 11,
            labelAnchor: 'middle',
            labelOffset: 10,
            format: (value) => `${String(value)}\u00b0`,
          }),
        ],
        marks: [
          radialDot(points, {
            id: 'palette-hues',
            angle: 'hue',
            radius: 'chroma',
            key: 'id',
            color: 'id',
            r: (point) => (point.id === activeId ? 12 : point.locked ? 10 : 8),
            stroke: 'var(--foreground)',
            strokeOpacity: 0.8,
            strokeWidth: 2,
          }),
        ],
      }),
    ],
    scales: { x: null, y: null },
    color: { domain: points.map((point) => point.id), range: points.map((point) => point.hex) },
  });
}

export function scoreLevelColor(value: number): string {
  return value >= 75 ? 'var(--success)' : value >= 50 ? 'var(--warning)' : 'var(--destructive)';
}

// ─── Score radar ───────────────────────────────────────────────────────────────────
// Styled with the app tokens: --border grid, --primary data, stat-chip style labels
// (bold value over a small muted uppercase label). Text inherits the host's font.

type RadarRow = { metric: ScoreDimension; label: string; value: number };

// Side margins hold the left/right axis labels so they never clip on narrow cards
const RADAR_MARGIN = { top: 12, bottom: 12, left: 64, right: 64 };

const RADAR_RATIO = 0.68;
const RADAR_LEVELS = [25, 50, 75, 100];

const radarScales = () => ({
  angle: { scale: scalePoint<string>().domain(dimensions), wrap: true },
  radius: { scale: scaleLinear().domain([0, 100]) },
});

function radarRows(scores: RadarScores): RadarRow[] {
  return dimensions.map((metric) => ({
    metric,
    label: metric.charAt(0).toUpperCase() + metric.slice(1),
    value: scores[metric],
  }));
}

// Axis order is top, right, bottom, left
const LABEL_ANCHOR = ['middle', 'start', 'middle', 'end'] as const;
const VALUE_DY = [-16, -7, 9, -7];
const LABEL_DY = [1, 10, 26, 10];

function radarGuides() {
  return [
    radialGrid({
      shape: 'polygon',
      values: RADAR_LEVELS,
      stroke: 'var(--border)',
      strokeWidth: 1,
    }),
    angleGrid({ labels: false, stroke: 'var(--border)', strokeWidth: 1 }),
  ];
}

function radarLabels(rows: RadarRow[], showValues: boolean) {
  const index = (row: RadarRow) => dimensions.indexOf(row.metric);
  return decorative(
    polar({
      id: 'radar-labels',
      radiusRatio: RADAR_RATIO,
      scales: radarScales(),
      marks: [
        ...(showValues
          ? [
              radialText(rows, {
                id: 'radar-values',
                angle: 'metric',
                radius: 100,
                radiusOffset: 16,
                text: (row) => String(row.value),
                anchor: (row) => LABEL_ANCHOR[index(row)],
                baseline: 'middle',
                dy: (row) => VALUE_DY[index(row)],
                fontSize: 20,
                fontWeight: 800,
                fill: 'var(--foreground)',
              }),
            ]
          : []),
        radialText(rows, {
          id: 'radar-axis-labels',
          angle: 'metric',
          radius: 100,
          radiusOffset: 16,
          text: (row) => row.label.toUpperCase(),
          anchor: (row) => LABEL_ANCHOR[index(row)],
          baseline: 'middle',
          dy: (row) => (showValues ? LABEL_DY[index(row)] : VALUE_DY[index(row)] + 6),
          fontSize: 10,
          fontWeight: 600,
          fill: 'var(--muted-foreground)',
        }),
      ],
    }),
  );
}

export function createScoreChart(scores: RadarScores) {
  const rows = radarRows(scores);

  return defineChart({
    margin: RADAR_MARGIN,
    theme: chartTheme,
    marks: [
      polar({
        radiusRatio: RADAR_RATIO,
        scales: radarScales(),
        guides: radarGuides(),
        marks: [
          radialArea(rows, {
            id: 'score-area',
            angle: 'metric',
            radius: 'value',
            key: 'metric',
            curve: curveLinearClosed,
            fill: 'var(--primary)',
            fillOpacity: 0.16,
            stroke: 'var(--primary)',
            strokeWidth: 2,
          }),
          radialDot(rows, {
            id: 'score-points',
            angle: 'metric',
            radius: 'value',
            key: 'metric',
            fill: 'var(--card)',
            stroke: 'var(--primary)',
            strokeWidth: 2,
            r: 4.5,
          }),
        ],
      }),
      radarLabels(rows, true),
    ],
    scales: { x: null, y: null },
    focus: focusGroupAngle,
  });
}

/** Palette A (dashed, muted) against palette B (primary) on one radar */
export function createCompareChart(
  a: RadarScores,
  b: RadarScores,
  names: { a: string; b: string },
) {
  const rowsA = radarRows(a).map((row) => ({ ...row, series: names.a }));
  const rowsB = radarRows(b).map((row) => ({ ...row, series: names.b }));

  return defineChart({
    margin: RADAR_MARGIN,
    theme: chartTheme,
    marks: [
      polar({
        radiusRatio: RADAR_RATIO,
        scales: radarScales(),
        guides: radarGuides(),
        marks: [
          radialArea(rowsA, {
            id: 'compare-a-area',
            angle: 'metric',
            radius: 'value',
            key: 'metric',
            curve: curveLinearClosed,
            fill: 'var(--muted-foreground)',
            fillOpacity: 0.06,
            stroke: 'var(--muted-foreground)',
            strokeWidth: 2,
            strokeDasharray: '5 4',
          }),
          radialArea(rowsB, {
            id: 'compare-b-area',
            angle: 'metric',
            radius: 'value',
            key: 'metric',
            curve: curveLinearClosed,
            fill: 'var(--primary)',
            fillOpacity: 0.16,
            stroke: 'var(--primary)',
            strokeWidth: 2,
          }),
          radialDot(rowsA, {
            id: 'compare-a-points',
            angle: 'metric',
            radius: 'value',
            key: 'metric',
            fill: 'var(--card)',
            stroke: 'var(--muted-foreground)',
            strokeWidth: 2,
            r: 4,
          }),
          radialDot(rowsB, {
            id: 'compare-b-points',
            angle: 'metric',
            radius: 'value',
            key: 'metric',
            fill: 'var(--card)',
            stroke: 'var(--primary)',
            strokeWidth: 2,
            r: 4.5,
          }),
        ],
      }),
      radarLabels(rowsB, false),
    ],
    scales: { x: null, y: null },
    focus: focusGroupAngle,
  });
}
