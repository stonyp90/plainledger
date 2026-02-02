/**
 * IBCS Variance Calculations
 * 
 * Helper functions for calculating and formatting variances
 * according to IBCS standards.
 */

import { isFavorable, getVarianceStatus, type IBCSMetricType, type VarianceStatus } from './theme';

/**
 * Variance calculation result
 */
export interface VarianceResult {
  /** Absolute variance (actual - plan) */
  absolute: number;
  /** Percentage variance */
  percentage: number;
  /** Whether the variance is favorable */
  favorable: boolean;
  /** Variance status for styling */
  status: VarianceStatus;
}

/**
 * Calculate variance between actual and plan values
 * 
 * @param actual - Actual value
 * @param plan - Planned/budgeted value
 * @param metricType - Type of metric for context-aware favorability
 * @returns Variance calculation result
 */
export function calculateVariance(
  actual: number,
  plan: number,
  metricType: IBCSMetricType = 'revenue'
): VarianceResult {
  const absolute = actual - plan;
  const percentage = plan !== 0 ? (absolute / Math.abs(plan)) * 100 : 0;
  const favorable = isFavorable(absolute, metricType);
  const status = getVarianceStatus(percentage, metricType);

  return {
    absolute,
    percentage,
    favorable,
    status,
  };
}

/**
 * Calculate year-over-year variance
 * 
 * @param current - Current period value
 * @param prior - Prior year value
 * @param metricType - Type of metric for context-aware favorability
 * @returns Variance calculation result
 */
export function calculateYoYVariance(
  current: number,
  prior: number,
  metricType: IBCSMetricType = 'revenue'
): VarianceResult {
  return calculateVariance(current, prior, metricType);
}

/**
 * Calculate period-over-period variance
 * 
 * @param current - Current period value
 * @param previous - Previous period value
 * @param metricType - Type of metric for context-aware favorability
 * @returns Variance calculation result
 */
export function calculatePoPVariance(
  current: number,
  previous: number,
  metricType: IBCSMetricType = 'revenue'
): VarianceResult {
  return calculateVariance(current, previous, metricType);
}

/**
 * Batch calculate variances for multiple items
 * 
 * @param items - Array of items with actual and plan values
 * @param metricType - Type of metric for context-aware favorability
 * @returns Items with variance calculations attached
 */
export function calculateVariances<T extends { actual: number; plan: number }>(
  items: T[],
  metricType: IBCSMetricType = 'revenue'
): (T & { variance: VarianceResult })[] {
  return items.map(item => ({
    ...item,
    variance: calculateVariance(item.actual, item.plan, metricType),
  }));
}

/**
 * Sort items by variance magnitude (for highlighting biggest gaps)
 * 
 * @param items - Items with variance calculations
 * @param direction - Sort direction ('asc' | 'desc')
 * @returns Sorted items
 */
export function sortByVariance<T extends { variance: VarianceResult }>(
  items: T[],
  direction: 'asc' | 'desc' = 'desc'
): T[] {
  return [...items].sort((a, b) => {
    const comparison = Math.abs(b.variance.percentage) - Math.abs(a.variance.percentage);
    return direction === 'desc' ? comparison : -comparison;
  });
}

/**
 * Filter items by variance threshold
 * 
 * @param items - Items with variance calculations
 * @param threshold - Minimum percentage variance to include
 * @returns Filtered items exceeding threshold
 */
export function filterByVarianceThreshold<T extends { variance: VarianceResult }>(
  items: T[],
  threshold: number
): T[] {
  return items.filter(item => Math.abs(item.variance.percentage) >= threshold);
}

/**
 * Get top N variances by absolute value
 * 
 * @param items - Items with variance calculations
 * @param n - Number of items to return
 * @returns Top N items by variance magnitude
 */
export function getTopVariances<T extends { variance: VarianceResult }>(
  items: T[],
  n: number
): T[] {
  return sortByVariance(items, 'desc').slice(0, n);
}

/**
 * Calculate total variance across multiple items
 * 
 * @param items - Items with variance calculations
 * @param metricType - Type of metric for favorability
 * @returns Total variance result
 */
export function calculateTotalVariance(
  items: { actual: number; plan: number }[],
  metricType: IBCSMetricType = 'revenue'
): VarianceResult {
  const totalActual = items.reduce((sum, item) => sum + item.actual, 0);
  const totalPlan = items.reduce((sum, item) => sum + item.plan, 0);
  return calculateVariance(totalActual, totalPlan, metricType);
}

/**
 * Calculate weighted variance (for portfolio-like calculations)
 * 
 * @param items - Items with actual, plan, and weight values
 * @param metricType - Type of metric for favorability
 * @returns Weighted variance result
 */
export function calculateWeightedVariance(
  items: { actual: number; plan: number; weight: number }[],
  metricType: IBCSMetricType = 'revenue'
): VarianceResult {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  
  if (totalWeight === 0) {
    return {
      absolute: 0,
      percentage: 0,
      favorable: true,
      status: 'neutral',
    };
  }
  
  const weightedActual = items.reduce((sum, item) => sum + (item.actual * item.weight), 0) / totalWeight;
  const weightedPlan = items.reduce((sum, item) => sum + (item.plan * item.weight), 0) / totalWeight;
  
  return calculateVariance(weightedActual, weightedPlan, metricType);
}
