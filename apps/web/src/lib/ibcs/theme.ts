/**
 * IBCS Theme System
 * 
 * International Business Communication Standards (IBCS) color palette
 * and semantic rules for financial visualizations.
 * 
 * @see https://www.ibcs.com/standards/
 */

/**
 * IBCS Standard Colors
 * 
 * These colors follow IBCS notation conventions:
 * - Actual (AC): Solid dark - what actually happened
 * - Plan (PL): Outline/gray - what was planned
 * - Forecast (FC): Hatched/dashed - future projections
 * - Prior Year (PY): Light gray - historical reference
 */
export const IBCSColors = {
  // Scenario semantics
  actual: '#1e293b',           // Solid dark (slate-800) - actual values
  actualLight: '#334155',      // Lighter actual for hover states
  plan: 'transparent',         // Outline only - planned values
  planStroke: '#64748b',       // Gray stroke (slate-500) for plan bars
  planFill: '#f1f5f9',         // Very light fill for plan background
  forecast: '#94a3b8',         // Hatched/dashed (slate-400) - projections
  priorYear: '#cbd5e1',        // Light gray (slate-300) - historical
  
  // Variance semantics (context-aware)
  variance: {
    favorable: '#059669',      // Green (emerald-600) - good news
    favorableLight: '#d1fae5', // Light green background
    unfavorable: '#dc2626',    // Red (red-600) - needs attention
    unfavorableLight: '#fee2e2', // Light red background
    neutral: '#6b7280',        // Gray (gray-500) - on target
    neutralLight: '#f3f4f6',   // Light gray background
  },
  
  // Emphasis & highlights
  highlight: '#d4af37',        // Gold - attention items
  highlightLight: '#fef3c7',   // Light gold background
  benchmark: '#3b82f6',        // Blue (blue-500) - industry benchmark
  benchmarkLight: '#dbeafe',   // Light blue background
  
  // Dark mode variants
  dark: {
    actual: '#e2e8f0',         // Light for dark mode
    planStroke: '#94a3b8',     // Lighter stroke for dark mode
    background: '#1e293b',     // Dark background
  },
} as const;

/**
 * IBCS Variance Thresholds
 * 
 * Variances within threshold are considered "neutral" (on target)
 */
export const IBCSThresholds = {
  /** Percentage threshold for considering variance as neutral */
  neutralThreshold: 2,
  /** Warning threshold for moderate variance */
  warningThreshold: 10,
  /** Critical threshold for significant variance */
  criticalThreshold: 20,
} as const;

/**
 * IBCS Scenario Types
 */
export type IBCSScenario = 'actual' | 'plan' | 'forecast' | 'priorYear';

/**
 * IBCS Metric Types for context-aware variance coloring
 */
export type IBCSMetricType = 'revenue' | 'expense' | 'profit' | 'ratio' | 'count';

/**
 * Variance status based on thresholds
 */
export type VarianceStatus = 'favorable' | 'unfavorable' | 'neutral' | 'warning' | 'critical';

/**
 * Determine if a variance is favorable based on metric type
 * 
 * Revenue/Profit: Positive variance = favorable (above target)
 * Expense: Negative variance = favorable (under budget)
 * Ratio: Depends on context (handled by caller)
 * 
 * @param variance - The variance value (actual - plan)
 * @param metricType - The type of metric
 * @returns Whether the variance is favorable
 */
export function isFavorable(variance: number, metricType: IBCSMetricType): boolean {
  if (metricType === 'expense') {
    return variance < 0; // Under budget = good
  }
  return variance > 0; // Above target = good for revenue/profit
}

/**
 * Get variance status based on percentage and metric type
 * 
 * @param variancePct - Variance as percentage
 * @param metricType - Type of metric for context
 * @returns Variance status
 */
export function getVarianceStatus(
  variancePct: number,
  metricType: IBCSMetricType
): VarianceStatus {
  const absVariance = Math.abs(variancePct);
  const favorable = isFavorable(variancePct, metricType);
  
  // Within neutral threshold
  if (absVariance <= IBCSThresholds.neutralThreshold) {
    return 'neutral';
  }
  
  // Critical threshold exceeded
  if (absVariance >= IBCSThresholds.criticalThreshold) {
    return favorable ? 'favorable' : 'critical';
  }
  
  // Warning threshold exceeded
  if (absVariance >= IBCSThresholds.warningThreshold) {
    return favorable ? 'favorable' : 'warning';
  }
  
  // Normal favorable/unfavorable
  return favorable ? 'favorable' : 'unfavorable';
}

/**
 * Get IBCS color for variance based on favorability
 * 
 * @param favorable - Whether the variance is favorable
 * @param status - Optional status for more nuanced coloring
 * @returns The appropriate IBCS color
 */
export function getVarianceColor(
  favorable: boolean,
  status?: VarianceStatus
): string {
  if (status === 'neutral') {
    return IBCSColors.variance.neutral;
  }
  if (status === 'critical' && !favorable) {
    return IBCSColors.variance.unfavorable;
  }
  if (status === 'warning' && !favorable) {
    return IBCSColors.variance.unfavorable;
  }
  return favorable 
    ? IBCSColors.variance.favorable 
    : IBCSColors.variance.unfavorable;
}

/**
 * Get IBCS background color for variance
 * 
 * @param favorable - Whether the variance is favorable
 * @param status - Optional status for more nuanced coloring
 * @returns The appropriate IBCS background color
 */
export function getVarianceBackgroundColor(
  favorable: boolean,
  status?: VarianceStatus
): string {
  if (status === 'neutral') {
    return IBCSColors.variance.neutralLight;
  }
  return favorable 
    ? IBCSColors.variance.favorableLight 
    : IBCSColors.variance.unfavorableLight;
}

/**
 * CSS class helper for variance styling
 * 
 * @param favorable - Whether the variance is favorable
 * @returns Tailwind CSS classes for the variance
 */
export function getVarianceClasses(favorable: boolean): string {
  return favorable
    ? 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950'
    : 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950';
}

/**
 * IBCS Scenario Abbreviations
 * 
 * Standard abbreviations used in IBCS headers
 */
export const IBCSAbbreviations = {
  actual: 'AC',
  plan: 'PL',
  forecast: 'FC',
  priorYear: 'PY',
  variancePlan: 'ΔPL',
  variancePlanPercent: 'ΔPL%',
  variancePriorYear: 'ΔPY',
  variancePriorYearPercent: 'ΔPY%',
} as const;

/**
 * IBCS Labels (bilingual EN/FR)
 */
export const IBCSLabels = {
  en: {
    actual: 'Actual',
    plan: 'Plan',
    forecast: 'Forecast',
    priorYear: 'Prior Year',
    variance: 'Variance',
    favorable: 'Favorable',
    unfavorable: 'Unfavorable',
    onTarget: 'On Target',
  },
  fr: {
    actual: 'Réel',
    plan: 'Plan',
    forecast: 'Prévision',
    priorYear: 'Année préc.',
    variance: 'Écart',
    favorable: 'Favorable',
    unfavorable: 'Défavorable',
    onTarget: 'Dans la cible',
  },
} as const;
