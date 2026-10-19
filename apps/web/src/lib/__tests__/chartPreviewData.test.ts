import { describe, expect, it } from 'vitest';
import { buildChartPreviewData } from '../chartPreviewData';
import type { FinancialDataResponse, TrendDataset } from '../financialData';

const series = (values: [string, number][]): TrendDataset => ({ label: 'Actual', labelEn: 'Actual', data: values.map(([period, value]) => ({ period, value })) });
const trends = (revenue: [string, number][], expenses = revenue): FinancialDataResponse['trends'] => ({
  revenue: series(revenue), expenses: series(expenses), profit: series(revenue), cashFlow: series(revenue),
});

describe('Chart preview recorded-data adapter', () => {
  it('aligns reordered observations by period and preserves zero and negative values', () => {
    const result = buildChartPreviewData(trends([['2026-02', 20], ['2026-01', 0]], [['2026-01', -3], ['2026-02', 7]]), ['revenue', 'expenses']);
    expect(result.issue).toBeNull();
    expect(result.rows).toEqual([{ period: '2026-01', values: { revenue: 0, expenses: -3 } }, { period: '2026-02', values: { revenue: 20, expenses: 7 } }]);
  });
  it('does not fill unavailable metrics with zero', () => {
    expect(buildChartPreviewData(trends([['2026-01', 10]]), ['assets']).issue).toBe('unavailable');
  });
  it('exposes incomplete periods instead of pairing unrelated indices', () => {
    expect(buildChartPreviewData(trends([['2026-01', 10]], [['2026-02', 20]]), ['revenue', 'expenses']).issue).toBe('incomplete');
  });
  it.each([NaN, Infinity, '10' as unknown as number, null as unknown as number])('rejects corrupt value %s', value => {
    expect(buildChartPreviewData(trends([['2026-01', value]]), ['revenue']).issue).toBe('invalid');
  });
  it('rejects duplicate or invalid periods', () => {
    expect(buildChartPreviewData(trends([['2026-01', 1], ['2026-01', 2]]), ['revenue']).issue).toBe('invalid');
    expect(buildChartPreviewData(trends([['2026-02-30', 1]]), ['revenue']).issue).toBe('invalid');
  });
  it('uses the selected latest-available period range and actually groups and accumulates values', () => {
    const data = trends([['2025-12', 100], ['2026-01', 1], ['2026-02', 2], ['2026-03', 3], ['2026-04', 4]]);
    expect(buildChartPreviewData(data, ['revenue'], { timeRange: '3M' }).rows.map(row => row.period)).toEqual(['2026-02', '2026-03', '2026-04']);
    expect(buildChartPreviewData(data, ['revenue'], { timeRange: 'YTD', groupBy: 'quarter', cumulative: true }).rows).toEqual([
      { period: '2026-Q1', values: { revenue: 6 } }, { period: '2026-Q2', values: { revenue: 10 } },
    ]);
  });
  it('never invents missing comparison or finer-grained observations', () => {
    const data = trends([['2026-01', 1]]);
    expect(buildChartPreviewData(data, ['revenue'], { comparison: 'budget' }).issue).toBe('unavailable');
    expect(buildChartPreviewData(data, ['revenue'], { groupBy: 'day' }).issue).toBe('unavailable');
    expect(buildChartPreviewData(data, ['revenue'], { timeRange: '1W' }).issue).toBe('unavailable');
  });
  it('rejects overflow in calculated totals', () => {
    expect(buildChartPreviewData(trends([['2026-01', Number.MAX_VALUE], ['2026-02', Number.MAX_VALUE]]), ['revenue'], { cumulative: true }).issue).toBe('invalid');
  });
  it('keeps missing data and an empty field selection empty', () => {
    expect(buildChartPreviewData(undefined, ['revenue']).issue).toBe('empty');
    expect(buildChartPreviewData(trends([]), ['revenue']).issue).toBe('empty');
    expect(buildChartPreviewData(trends([['2026-01', 1]]), []).issue).toBe('empty');
  });
});
