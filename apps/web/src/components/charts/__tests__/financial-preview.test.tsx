import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FinancialChartPreview } from '../FinancialChartPreview';
import type { ChartType, DataMetric } from '../../../lib/chartFavorites';
import type { PreviewRow } from '../../../lib/chartPreviewData';

const types: ChartType[] = ['line', 'area', 'bar', 'pie', 'donut', 'scatter', 'radar', 'treemap', 'heatmap', 'waterfall', 'gauge', 'sparkline', 'table'];
const row: PreviewRow = { period: '2026-01', values: { revenue: 10, expenses: 3, profit: 7, grossMargin: 70 } };
const metrics = (type: ChartType): DataMetric[] => type === 'gauge' ? ['grossMargin'] : type === 'waterfall' ? ['revenue'] : type === 'scatter' ? ['revenue', 'expenses'] : ['revenue', 'expenses', 'profit'];
const props = (type: ChartType) => ({ fields: metrics(type).map(id => ({ id })), config: { chartType: type } });
function finite(container: HTMLElement) {
  for (const svg of container.querySelectorAll('svg')) expect(svg.innerHTML).not.toMatch(/NaN|Infinity/);
  for (const item of container.querySelectorAll('rect')) {
    expect(Number(item.getAttribute('width'))).toBeGreaterThanOrEqual(0);
    expect(Number(item.getAttribute('height'))).toBeGreaterThanOrEqual(0);
  }
}

describe('Financial preview chart families', () => {
  it.each(types)('%s renders a single real observation without nonfinite geometry', type => {
    const { container } = render(<FinancialChartPreview rows={[row]} {...props(type)} />);
    expect(container.querySelector(`[data-chart-type="${type}"]`)).not.toBeNull();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    finite(container);
  });
  it.each(types)('%s exposes empty data', type => {
    const { container } = render(<FinancialChartPreview rows={[]} {...props(type)} />);
    expect(container.querySelector('[data-chart-state="empty"]')).not.toBeNull();
  });
  it.each(types)('%s rejects malformed values', type => {
    const values = Object.fromEntries(metrics(type).map(metric => [metric, NaN]));
    render(<FinancialChartPreview rows={[{ period: '2026-01', values }]} {...props(type)} />);
    expect(screen.getByRole('alert')).toBeVisible();
  });
  it.each<ChartType>(['line', 'area', 'bar', 'scatter', 'waterfall', 'heatmap', 'table', 'sparkline'])('%s keeps signed and zero observations', type => {
    const { container } = render(<FinancialChartPreview rows={[{ ...row, period: '2025-12', values: { revenue: -10, expenses: 0, profit: -10 } }, row]} {...props(type)} />);
    expect(container.querySelector(`[data-chart-type="${type}"]`)).not.toBeNull();
    finite(container);
  });
  it.each<ChartType>(['pie', 'donut', 'treemap'])('%s identifies a zero total as unavailable', type => {
    const { container } = render(<FinancialChartPreview rows={[{ ...row, values: { revenue: 0, expenses: 0, profit: 0 } }]} {...props(type)} />);
    expect(container.querySelector('[data-chart-state="unavailable"]')).not.toBeNull();
  });
  it('rejects duplicate periods without ambiguous points or table keys', () => {
    render(<FinancialChartPreview rows={[row, row]} {...props('line')} />);
    expect(screen.getByRole('alert')).toBeVisible();
  });
  it('shows invalid configuration for an unknown metric or currency', () => {
    const { rerender } = render(<FinancialChartPreview rows={[row]} fields={[{ id: 'unknown' as DataMetric }]} />);
    expect(screen.getByRole('alert')).toBeVisible();
    rerender(<FinancialChartPreview rows={[row]} {...props('line')} currency="invalid" />);
    expect(screen.getByRole('alert')).toBeVisible();
  });
  it('renders a full pie for one nonzero category', () => {
    const { container } = render(<FinancialChartPreview rows={[row]} fields={[{ id: 'revenue' }]} config={{ chartType: 'pie' }} />);
    expect(container.querySelector('circle[r="85"]')).not.toBeNull();
  });
  it('keeps10000 line observations but bounds labels and point markers', () => {
    const rows = Array.from({ length: 10000 }, (_, index) => ({ period: `Period ${index}`, values: { revenue: index % 50 - 25 } }));
    const { container } = render(<FinancialChartPreview rows={rows} fields={[{ id: 'revenue' }]} config={{ chartType: 'line' }} />);
    expect(container.querySelector('[data-series="revenue"]')!.getAttribute('d')!.split(' L')).toHaveLength(10000);
    expect(container.querySelectorAll('circle').length).toBeLessThanOrEqual(152);
    expect(container.querySelectorAll('text').length).toBeLessThanOrEqual(12);
    finite(container);
  });
  it('paginates every table observation without truncating the dataset', () => {
    const rows = Array.from({ length: 121 }, (_, index) => ({ period: `Period ${index + 1}`, values: { revenue: index } }));
    render(<FinancialChartPreview rows={rows} fields={[{ id: 'revenue' }]} config={{ chartType: 'table' }} />);
    expect(screen.getByRole('rowheader', { name: 'Period 60' })).toBeVisible();
    expect(screen.queryByRole('rowheader', { name: 'Period 61' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('rowheader', { name: 'Period 61' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('rowheader', { name: 'Period 121' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });
  it('heatmap output is deterministic and displays recorded amounts', () => {
    const { container, rerender } = render(<FinancialChartPreview rows={[row]} {...props('heatmap')} />);
    const initial = container.innerHTML;
    rerender(<FinancialChartPreview rows={[row]} {...props('heatmap')} />);
    expect(container.innerHTML).toBe(initial);
    expect(screen.getByText('$10')).toBeVisible();
  });
  it('waterfall uses actual changes, including a decline to zero', () => {
    const { container } = render(<FinancialChartPreview rows={[{ ...row, values: { revenue: 10 } }, { period: '2026-02', values: { revenue: 0 } }]} {...props('waterfall')} />);
    expect(container.querySelector('svg')!.textContent).toContain('change -$10');
    expect(container.querySelector('svg')!.textContent).toContain('value $0');
    finite(container);
  });
  it('does not silently substitute a line for specialized planning charts', () => {
    const { container } = render(<FinancialChartPreview rows={[row]} {...props('scenario')} />);
    expect(container.querySelector('[data-chart-state="unavailable"]')).not.toBeNull();
    expect(container.querySelector('path')).toBeNull();
  });
});
