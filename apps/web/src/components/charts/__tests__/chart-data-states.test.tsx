import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import TrendChart from '../TrendChart';
import WaterfallChart from '../WaterfallChart';
import BudgetVsActualChart from '../BudgetVsActualChart';
import VarianceChart from '../VarianceChart';
import Sparkline, { MiniBar, PercentageBar } from '../Sparkline';

vi.mock('../../../hooks/useGraphConfig', async importOriginal => {
  const actual = await importOriginal<typeof import('../../../hooks/useGraphConfig')>();
  const { DEFAULT_GRAPH_CONFIG } = await import('../../../lib/graphConfig');
  return { ...actual, useGraphConfig: () => DEFAULT_GRAPH_CONFIG };
});

function expectFiniteGeometry(container: HTMLElement) {
  const attributes = ['d', 'points', 'cx', 'cy', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'width', 'height', 'style'];
  for (const element of container.querySelectorAll('svg *, [style]')) {
    for (const attribute of attributes) {
      expect(element.getAttribute(attribute) ?? '', `${element.tagName}.${attribute}`).not.toMatch(/NaN|Infinity/);
    }
  }
}

describe('Financial charts: meaningful data states', () => {
  it.each([
    ['trend', <TrendChart data={[]} title="Revenue trend" isEn />],
    ['waterfall', <WaterfallChart data={[]} title="Cash movement" isEn />],
    ['budget', <BudgetVsActualChart data={[]} title="Budget" isEn />],
    ['variance', <VarianceChart data={[]} title="Variance" />],
  ])('%s keeps an accessible empty state instead of disappearing', (_, chart) => {
    const { container } = render(chart);
    expect(screen.getByRole('status')).toBeVisible();
    expect(container.querySelector('[data-chart-state="empty"]')).toBeTruthy();
  });

  it.each([NaN, Infinity, -Infinity, '123', null])('rejects corrupt trend value %s instead of plotting zero', value => {
    render(<TrendChart data={[{ period: 'Jan', value: value as number }]} title="Revenue" isEn />);
    expect(screen.getByRole('alert')).toHaveTextContent('Check the source data');
  });

  it('rejects a corrupt row in the entire waterfall without changing the cumulative total', () => {
    render(<WaterfallChart data={[{ label: 'Start', value: 100, type: 'start' }, null as never]} title="Cash" isEn />);
    expect(screen.getByRole('alert')).toBeVisible();
  });

  it('rejects missing and invalid values in budget and variance comparisons', () => {
    const { rerender } = render(<BudgetVsActualChart data={[{ category: 'Costs', actual: NaN, budget: 100 }]} title="Budget" isEn />);
    expect(screen.getByRole('alert')).toBeVisible();
    rerender(<VarianceChart data={[{ label: 'Sales', current: 100, prior: Infinity }]} title="Variance" />);
    expect(screen.getByRole('alert')).toBeVisible();
  });

  it('can move from empty to populated to invalid data without hook-order errors', () => {
    const { container, rerender } = render(<TrendChart data={[]} title="Revenue" isEn />);
    rerender(<TrendChart data={[{ period: 'Jan', value: 0 }]} title="Revenue" isEn />);
    expect(container.querySelector('svg path[d]')).toBeTruthy();
    expectFiniteGeometry(container);
    rerender(<TrendChart data={[{ period: 'Jan', value: Infinity }]} title="Revenue" isEn />);
    expect(screen.getByRole('alert')).toBeVisible();
  });

  it('draws a single sparkline point at the center of its plot', () => {
    const { container } = render(<Sparkline data={[42]} width={80} height={24} />);
    const point = container.querySelector('polyline')!.getAttribute('points')!.split(',').map(Number);
    expect(point[0]).toBe(40);
    expect(point[1]).toBeCloseTo(12);
    expect(container.querySelector('circle')).toHaveAttribute('cx', '40');
    expectFiniteGeometry(container);
  });

  it('does not draw invalid sparklines or progress values', () => {
    const { rerender } = render(<Sparkline data={[10, NaN]} />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Invalid chart data');
    rerender(<PercentageBar value={Infinity} />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Invalid chart data');
  });

  it.each([[0, 0], [-100, -50], [100, 200]])('keeps MiniBar within its available width for %j', (current, prior) => {
    const { container } = render(<MiniBar current={current} prior={prior} width={60} />);
    expectFiniteGeometry(container);
    for (const element of container.querySelectorAll<HTMLElement>('.h-2')) {
      expect(parseFloat(element.style.width)).toBeGreaterThanOrEqual(0);
      expect(parseFloat(element.style.width)).toBeLessThanOrEqual(44);
    }
  });

  it.each([0, -100])('keeps zero and negative budget bars finite (%s)', actual => {
    const { container } = render(<BudgetVsActualChart data={[{ category: 'Refunds', actual, budget: actual }]} title="Budget" isEn />);
    expectFiniteGeometry(container);
    for (const element of container.querySelectorAll<HTMLElement>('[style*="width:"]')) {
      if (element.style.width.endsWith('%')) expect(parseFloat(element.style.width)).toBeLessThanOrEqual(100);
    }
  });

  it('draws a zero-valued waterfall with finite coordinates', () => {
    const { container } = render(<WaterfallChart data={[{ label: 'Start', value: 0, type: 'start' }, { label: 'End', value: 0, type: 'end' }]} title="Cash" isEn />);
    expectFiniteGeometry(container);
    expect(container.querySelector('rect[height]')).toBeTruthy();
  });

  it('includes plan and forecast extents and future periods in the trend plot', () => {
    const { container } = render(<TrendChart data={[{ period: 'Jan', value: -10 }, { period: 'Feb', value: 10 }]} planData={[-1000, 1000]} forecastData={[10, 500, 2000]} ibcsMode title="Revenue" isEn />);
    expectFiniteGeometry(container);
    const paths = container.querySelectorAll('svg[viewBox^="0 0 100 "] path[d]');
    expect(paths.length).toBeGreaterThan(2);
    for (const path of paths) {
      const height = Number(path.closest('svg')!.getAttribute('viewBox')!.split(' ')[3]);
      const numbers = path.getAttribute('d')!.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi)?.map(Number) ?? [];
      for (let i = 0; i < numbers.length; i += 2) {
        expect(numbers[i]).toBeGreaterThanOrEqual(0);
        expect(numbers[i]).toBeLessThanOrEqual(100);
        expect(numbers[i + 1]).toBeGreaterThanOrEqual(0);
        expect(numbers[i + 1]).toBeLessThanOrEqual(height);
      }
    }
  });
});
