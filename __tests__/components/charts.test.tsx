import { createChartScene } from '@tanstack/charts/scene';
import { render } from '@testing-library/react';
import { describe, expect, spyOn, test } from 'bun:test';
import { StrictMode } from 'react';

import { Chart } from '@/components/ui/chart';
import { createEasingChart, EASING_OPTIONS } from '@/components/views/gradient-view';
import {
  createChromaChart,
  createHueChart,
  createScoreChart,
  MAX_CHROMA,
  type PaletteChartPoint,
} from '@/lib/tools/palette-charts';

test('easing thumbnails render continuous rounded paths without axes', () => {
  for (const { id } of EASING_OPTIONS) {
    const view = render(
      <Chart definition={createEasingChart(id)} ariaLabel={`${id} curve`} width={44} height={24} />,
    );
    const path = view.container.querySelector('path[stroke="currentColor"]');
    expect(path).not.toBeNull();
    expect(path?.getAttribute('d')).not.toContain('NaN');
    expect(path?.getAttribute('stroke-width')).toBe('1.75');
    expect(path?.getAttribute('stroke-linecap')).toBe('round');
    expect(view.container.querySelectorAll('text')).toHaveLength(0);
    view.unmount();
  }
});

describe('palette radar', () => {
  test('preserves dimension order, values and finite positions', () => {
    const scores = { balance: 0, accessibility: 100, harmony: 50, uniqueness: 25 };
    const scene = createChartScene(createScoreChart(scores), { width: 280, height: 260 });
    const points = scene.points.filter((point) => point.markId.includes('score-points'));
    expect(points.map((point) => point.datum.metric)).toEqual([
      'balance',
      'accessibility',
      'harmony',
      'uniqueness',
    ]);
    expect(points.map((point) => point.datum.value)).toEqual(Object.values(scores));
    for (const point of scene.points) {
      expect(Number.isFinite(point.x)).toBe(true);
      expect(Number.isFinite(point.y)).toBe(true);
    }
  });

  test('keeps score values in the chart scene without hover tooltips', () => {
    const definition = createScoreChart({
      balance: 0,
      accessibility: 0,
      harmony: 0,
      uniqueness: 0,
    });
    const scene = createChartScene(definition, { width: 320, height: 320 });
    const values = scene.points.filter((point) => point.markId.includes('score-points'));
    expect(values.map((point) => point.datum.value)).toEqual([0, 0, 0, 0]);
    expect('tooltip' in definition).toBe(false);
  });

  test('renders an accessible SVG and updates scores', () => {
    const view = render(
      <Chart
        definition={createScoreChart({
          balance: 20,
          accessibility: 40,
          harmony: 60,
          uniqueness: 80,
        })}
        ariaLabel='Palette radar'
        width={280}
        height={260}
      />,
    );
    expect(view.getByLabelText('Palette radar')).toBeInTheDocument();
    expect(view.container.querySelector('svg')).toBeInTheDocument();
    view.rerender(
      <Chart
        definition={createScoreChart({
          balance: 80,
          accessibility: 60,
          harmony: 40,
          uniqueness: 20,
        })}
        ariaLabel='Palette radar'
        width={280}
        height={260}
      />,
    );
    expect(view.container.innerHTML).not.toContain('NaN');
  });

  test('does not install responsive observers under StrictMode', () => {
    const observe = spyOn(ResizeObserver.prototype, 'observe');
    try {
      const view = render(
        <StrictMode>
          <Chart
            definition={createScoreChart({
              balance: 0,
              accessibility: 0,
              harmony: 0,
              uniqueness: 0,
            })}
            ariaLabel='Responsive palette radar'
            height={260}
          />
        </StrictMode>,
      );
      expect(view.getByLabelText('Responsive palette radar')).toBeInTheDocument();
      view.unmount();
      expect(observe).not.toHaveBeenCalled();
    } finally {
      observe.mockRestore();
    }
  });
});

const colors: PaletteChartPoint[] = [
  { id: 'red', name: 'Red', hex: '#ff0000', locked: false, lightness: 0, chroma: 0, hue: 0 },
  {
    id: 'green',
    name: 'Green',
    hex: '#00ff00',
    locked: true,
    lightness: 1,
    chroma: MAX_CHROMA,
    hue: 90,
  },
  {
    id: 'blue',
    name: 'Blue',
    hex: '#0000ff',
    locked: false,
    lightness: 0.5,
    chroma: MAX_CHROMA,
    hue: 180,
  },
  {
    id: 'yellow',
    name: 'Yellow',
    hex: '#ffff00',
    locked: false,
    lightness: 0.5,
    chroma: MAX_CHROMA,
    hue: 270,
  },
];

describe('OKLCH charts', () => {
  test('highlights a reading in both charts without moving palette points', () => {
    for (const createChart of [createChromaChart, createHueChart]) {
      const original = createChartScene(createChart(colors), { width: 352, height: 240 });
      const highlighted = createChartScene(createChart(colors, 'green'), {
        width: 352,
        height: 240,
      });
      expect(highlighted.points.map((point) => [point.x, point.y, point.datum.id])).toEqual(
        original.points.map((point) => [point.x, point.y, point.datum.id]),
      );
      const view = render(
        <Chart
          definition={createChart(colors, 'green')}
          ariaLabel='Highlighted palette'
          width={352}
          height={240}
        />,
      );
      expect(view.container.querySelector('circle[fill="#00ff00"]')?.getAttribute('r')).toBe('12');
      expect(view.container.querySelector('circle[fill="#ff0000"]')?.getAttribute('r')).toBe('8');
      view.unmount();
    }
  });

  test('locked colors retain larger SVG markers', () => {
    const view = render(
      <Chart
        definition={createChromaChart(colors)}
        ariaLabel='Lock marker sizes'
        width={280}
        height={300}
      />,
    );
    expect(view.container.querySelector('circle[fill="#00ff00"]')?.getAttribute('r')).toBe('10');
    expect(view.container.querySelector('circle[fill="#ff0000"]')?.getAttribute('r')).toBe('8');
  });

  test('scatter preserves values, domains, IDs and palette fills', () => {
    const scene = createChartScene(createChromaChart(colors), { width: 280, height: 300 });
    expect(scene.scales.x.domain).toEqual([0, MAX_CHROMA]);
    expect(scene.scales.y.domain).toEqual([0, 1]);
    expect(scene.points.map((point) => point.datum.id)).toEqual(colors.map((point) => point.id));
    expect(scene.points.map((point) => point.color)).toEqual(colors.map((point) => point.hex));
    expect(scene.points[0].y).toBeGreaterThan(scene.points[1].y);
    expect(scene.points[0].x).toBeLessThan(scene.points[1].x);
  });

  test('polar hue starts at the top and runs clockwise', () => {
    const rows = colors.map((point) => ({ ...point, chroma: MAX_CHROMA }));
    const scene = createChartScene(createHueChart(rows), { width: 280, height: 280 });
    const [top, right, bottom, left] = scene.points;
    expect(top.x).toBeCloseTo(bottom.x);
    expect(right.y).toBeCloseTo(left.y);
    expect(top.y).toBeLessThan(bottom.y);
    expect(left.x).toBeLessThan(right.x);
    const wrapped = createChartScene(createHueChart([{ ...rows[0], hue: 360 }]), {
      width: 280,
      height: 280,
    });
    expect(wrapped.points[0].x).toBeCloseTo(top.x);
    expect(wrapped.points[0].y).toBeCloseTo(top.y);
  });

  test('coincident colors retain distinct keys and lock status without tooltips', () => {
    const definition = createChromaChart([colors[1], { ...colors[1], id: 'duplicate' }]);
    const scene = createChartScene(definition, { width: 280, height: 300 });
    expect(new Set(scene.points.map((point) => point.key)).size).toBe(2);
    expect(scene.points.map((point) => point.datum.id)).toEqual(['green', 'duplicate']);
    expect(scene.points.every((point) => point.datum.locked)).toBe(true);
    const zero = createChromaChart([colors[0]]);
    const zeroScene = createChartScene(zero, { width: 280, height: 300 });
    expect(zeroScene.points[0].datum).toMatchObject({ lightness: 0, chroma: 0, hue: 0 });
  });

  test('empty palettes and plot boundaries produce finite scenes', () => {
    for (const definition of [createChromaChart([]), createHueChart([])]) {
      expect(createChartScene(definition, { width: 240, height: 280 }).points).toHaveLength(0);
    }
    for (const definition of [createChromaChart(colors), createHueChart(colors)]) {
      for (const point of createChartScene(definition, { width: 240, height: 280 }).points) {
        expect(Number.isFinite(point.x)).toBe(true);
        expect(Number.isFinite(point.y)).toBe(true);
      }
    }
  });
});
