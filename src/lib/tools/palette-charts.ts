import "../../../node_modules/@tanstack/charts/dist/mark.js";
import { dot } from "@tanstack/charts/dot";
import {
  angleGrid,
  focusGroupAngle,
  polar,
  radialArea,
  radialDot,
  radialGrid,
} from "@tanstack/charts/polar";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { scalePoint } from "@tanstack/charts/scales/point";
import { defineChart } from "@tanstack/charts/scene";
import { tooltip } from "@tanstack/charts/tooltip";
import { curveLinearClosed } from "d3-shape";

export type ScoreDimension = "balance" | "accessibility" | "harmony" | "uniqueness";
export type RadarScores = Record<ScoreDimension, number>;

const dimensions: readonly ScoreDimension[] = ["balance", "accessibility", "harmony", "uniqueness"];

const chartTheme = {
  foreground: "var(--foreground)",
  muted: "var(--foreground)",
  grid: "var(--border)",
  background: "var(--background)",
  palette: [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
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

function palettePointLabel(point: PaletteChartPoint): string {
  return `${point.name} ${point.hex.toUpperCase()} | L ${point.lightness.toFixed(2)} | C ${point.chroma.toFixed(3)} | H ${point.hue.toFixed(0)} degrees${point.locked ? " | Locked" : ""}`;
}

export function createChromaChart(points: readonly PaletteChartPoint[]) {
  return defineChart({
    theme: chartTheme,
    marks: [
      dot(points, {
        id: "palette-colors",
        x: "chroma",
        y: "lightness",
        key: "id",
        color: "id",
        r: (point) => (point.locked ? 10 : 8),
        stroke: "var(--foreground)",
        strokeOpacity: 0.8,
        strokeWidth: 2,
      }),
    ],
    scales: {
      x: {
        scale: scaleLinear().domain([0, MAX_CHROMA]),
        grid: { stroke: "var(--foreground)", strokeOpacity: 0.12 },
        axis: {
          label: "Chroma (C)",
          line: { strokeOpacity: 0.4 },
          tickLabels: { fill: "var(--foreground)", opacity: 0.75 },
          ticks: { count: 4, format: (value) => Number(value).toFixed(2) },
        },
      },
      y: {
        scale: scaleLinear().domain([0, 1]),
        grid: { stroke: "var(--foreground)", strokeOpacity: 0.12 },
        axis: {
          label: "Lightness (L)",
          line: { strokeOpacity: 0.4 },
          tickLabels: { fill: "var(--foreground)", opacity: 0.75 },
          ticks: { count: 5, format: (value) => Number(value).toFixed(1) },
        },
      },
    },
    color: { domain: points.map((point) => point.id), range: points.map((point) => point.hex) },
    tooltip: { use: tooltip, format: (point) => palettePointLabel(point.datum) },
  });
}

export function createHueChart(points: readonly PaletteChartPoint[]) {
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
            stroke: "var(--foreground)",
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
            stroke: "var(--foreground)",
            strokeOpacity: 0.18,
            labelFill: "var(--foreground)",
            labelFontSize: 11,
            labelAnchor: "middle",
            labelOffset: 10,
            format: (value) => `${String(value)}\u00b0`,
          }),
        ],
        marks: [
          radialDot(points, {
            id: "palette-hues",
            angle: "hue",
            radius: "chroma",
            key: "id",
            color: "id",
            r: (point) => (point.locked ? 10 : 8),
            stroke: "var(--foreground)",
            strokeOpacity: 0.8,
            strokeWidth: 2,
          }),
        ],
      }),
    ],
    scales: { x: null, y: null },
    color: { domain: points.map((point) => point.id), range: points.map((point) => point.hex) },
    tooltip: { use: tooltip, format: (point) => palettePointLabel(point.datum) },
  });
}

export function createScoreChart(scores: RadarScores) {
  const rows = dimensions.map((metric) => ({
    metric,
    label: metric.charAt(0).toUpperCase() + metric.slice(1),
    value: scores[metric],
  }));

  return defineChart({
    margin: 12,
    theme: chartTheme,
    marks: [
      polar({
        radiusRatio: 0.65,
        scales: {
          angle: { scale: scalePoint<string>().domain(dimensions), wrap: true },
          radius: { scale: scaleLinear().domain([0, 100]) },
        },
        guides: [
          radialGrid({
            values: [20, 40, 60, 80, 100],
            stroke: "var(--foreground)",
            strokeOpacity: 0.15,
          }),
          angleGrid({
            labels: true,
            stroke: "var(--foreground)",
            strokeOpacity: 0.18,
            labelFill: "var(--foreground)",
            labelAnchor: "middle",
            labelFontSize: 10,
            labelOffset: 10,
            format: (value) => String(value).charAt(0).toUpperCase() + String(value).slice(1),
          }),
        ],
        marks: [
          radialArea(rows, {
            id: "score-area",
            angle: "metric",
            radius: "value",
            key: "metric",
            curve: curveLinearClosed,
            fill: "var(--primary)",
            fillOpacity: 0.22,
            stroke: "var(--primary)",
            strokeWidth: 2,
          }),
          radialDot(rows, {
            id: "score-points",
            angle: "metric",
            radius: "value",
            key: "metric",
            fill: "var(--primary)",
            stroke: "var(--background)",
            strokeWidth: 1.5,
            r: 4.5,
          }),
        ],
      }),
    ],
    scales: { x: null, y: null },
    focus: focusGroupAngle,
    tooltip: { use: tooltip, format: (point) => `${point.datum.label}: ${point.datum.value}/100` },
  });
}
