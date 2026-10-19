/** Validate financial chart inputs without turning missing or corrupt values into zero. */
export type ChartDataIssue = 'empty' | 'invalid' | null;

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isChartLabel(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isChartDate(value: unknown): value is string {
  return isChartLabel(value) && Number.isFinite(Date.parse(value));
}

export function getChartDataIssue<T>(
  data: readonly T[] | null | undefined,
  valid: (item: T) => boolean,
): ChartDataIssue {
  if (data == null) return 'empty';
  if (!Array.isArray(data)) return 'invalid';
  if (data.length === 0) return 'empty';
  return data.every(item => item != null && valid(item)) ? null : 'invalid';
}

/** Iteration avoids the argument limit of Math.min/max(...largeDataset). */
export function chartExtent(values: readonly number[], includeZero = false) {
  let min = includeZero ? 0 : Infinity;
  let max = includeZero ? 0 : -Infinity;
  for (const value of values) {
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  return values.length > 0 ? { min, max } : { min: 0, max: 0 };
}
