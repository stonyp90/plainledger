import type { FinancialDataResponse } from './financialData';
import type { ChartConfig, DataMetric } from './chartFavorites';
import { isFiniteNumber } from './chartDataValidation';

export interface PreviewRow { period: string; values: Record<string, number> }
export interface PreviewResult {
  rows: PreviewRow[];
  issue: 'empty' | 'invalid' | 'unavailable' | 'incomplete' | null;
  message?: string;
}
const seriesMetrics = new Set(['revenue', 'expenses', 'cashFlow', 'profit']);

/** Join observations by their period, never by array position or a fabricated zero. */
export function buildChartPreviewData(trends: FinancialDataResponse['trends'] | undefined, metrics: DataMetric[], config: Partial<ChartConfig> = {}): PreviewResult {
  const failure = (issue: PreviewResult['issue'], message?: string): PreviewResult => ({ rows: [], issue, message });
  if (metrics.length === 0) return failure('empty', 'Select at least one metric.');
  if (new Set(metrics).size !== metrics.length) return failure('invalid', 'Each metric must be selected only once.');
  if (metrics.some(metric => !seriesMetrics.has(metric))) return failure('unavailable', 'A time series is not available for one or more selected metrics.');
  if (!trends) return failure('empty');
  if (config.comparison && config.comparison !== 'none') return failure('unavailable', 'Comparison observations are not available in this preview. Choose no comparison or open the relevant financial report.');
  const maps = new Map<string, Map<string, number>>();
  for (const metric of metrics) {
    const source = trends[metric as keyof typeof trends]?.data;
    if (!Array.isArray(source)) return failure('invalid');
    if (source.length === 0) return failure('empty');
    const values = new Map<string, number>();
    for (const point of source) {
      if (!point || !/^\d{4}-\d{2}(?:-\d{2})?$/.test(point.period) || !isFiniteNumber(point.value)) return failure('invalid');
      const date = new Date(point.period.length === 7 ? `${point.period}-01T00:00:00Z` : `${point.period}T00:00:00Z`);
      if (!Number.isFinite(date.getTime()) || !date.toISOString().startsWith(point.period) || values.has(point.period)) return failure('invalid');
      values.set(point.period, point.value);
    }
    maps.set(metric, values);
  }
  const periods = [...maps.get(metrics[0])!.keys()].sort();
  if ([...maps.values()].some(values => values.size !== periods.length || periods.some(period => !values.has(period)))) return failure('incomplete', 'The selected series cover different periods. Select a single metric or refresh the source data.');
  let rows = periods.map(period => ({ period, values: Object.fromEntries(metrics.map(metric => [metric, maps.get(metric)!.get(period)!])) }));
  if (config.timeRange && config.timeRange !== 'ALL') {
    if (config.timeRange === 'custom') return failure('unavailable', 'Choose a defined time range.');
    const cutoff = new Date(`${periods[periods.length - 1].slice(0, 7)}-01T00:00:00Z`);
    const months: Partial<Record<NonNullable<ChartConfig['timeRange']>, number>> = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12, '2Y': 24 };
    if (config.timeRange === 'YTD') cutoff.setUTCMonth(0);
    else if (config.timeRange === '1W') {
      if (periods.some(period => period.length === 7)) return failure('unavailable', 'Weekly detail is unavailable for monthly source data.');
      cutoff.setTime(Date.parse(`${periods[periods.length - 1]}T00:00:00Z`) - 6 * 86400000);
    } else cutoff.setUTCMonth(cutoff.getUTCMonth() - ((months[config.timeRange] || 1) - 1));
    rows = rows.filter(row => Date.parse(row.period.length === 7 ? `${row.period}-01T00:00:00Z` : `${row.period}T00:00:00Z`) >= cutoff.getTime());
  }
  if ((config.groupBy === 'day' || config.groupBy === 'week') && periods.some(period => period.length === 7)) return failure('unavailable', 'Daily or weekly detail cannot be reconstructed from monthly totals.');
  if (config.groupBy) {
    const groups = new Map<string, PreviewRow>();
    for (const row of rows) {
      let period = row.period;
      if (config.groupBy === 'year') period = row.period.slice(0, 4);
      else if (config.groupBy === 'quarter') period = `${row.period.slice(0, 4)}-Q${Math.ceil(Number(row.period.slice(5, 7)) / 3)}`;
      else if (config.groupBy === 'month') period = row.period.slice(0, 7);
      else if (config.groupBy === 'week') {
        const date = new Date(`${row.period}T00:00:00Z`);
        date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
        period = date.toISOString().slice(0, 10);
      }
      const group = groups.get(period) ?? { period, values: Object.fromEntries(metrics.map(metric => [metric, 0])) };
      for (const metric of metrics) group.values[metric] += row.values[metric];
      groups.set(period, group);
    }
    rows = [...groups.values()];
  }
  if (config.cumulative) {
    const totals: Record<string, number> = Object.fromEntries(metrics.map(metric => [metric, 0]));
    rows = rows.map(row => {
      for (const metric of metrics) totals[metric] += row.values[metric];
      return { period: row.period, values: { ...totals } };
    });
  }
  if (rows.some(row => metrics.some(metric => !isFiniteNumber(row.values[metric])))) return failure('invalid', 'The calculated totals exceed the supported numeric range.');
  return { rows, issue: rows.length ? null : 'empty' };
}
