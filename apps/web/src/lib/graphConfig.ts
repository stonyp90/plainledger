/**
 * Graph Configuration System
 * 
 * Exposes configurable parameters for all graphs and charts,
 * designed from both Entrepreneur and CPA perspectives.
 * 
 * Configuration hierarchy:
 * 1. Chart-level overrides (most specific)
 * 2. User preferences (personal defaults)
 * 3. Organization settings (tenant defaults)
 * 4. System defaults (fallback)
 */

import { ThresholdConfig } from './anomalyDetection';

// ============================================================================
// PERIOD & DATE RANGE CONFIGURATION
// ============================================================================

export type PeriodPreset = 'mtd' | 'qtd' | 'ytd' | 'last_month' | 'last_quarter' | 'last_year' | 'custom';
export type ComparisonMode = 'none' | 'previousPeriod' | 'previousYear' | 'budget' | 'forecast' | 'benchmark';
export type AggregationLevel = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';

export interface PeriodConfig {
  /** Default period preset */
  defaultPeriod: PeriodPreset;
  /** Custom date range (when preset is 'custom') */
  customStartDate?: string;
  customEndDate?: string;
  /** Fiscal year start month (1-12, default: 1 for calendar year) */
  fiscalYearStartMonth: number;
  /** Comparison mode */
  comparisonMode: ComparisonMode;
  /** Number of periods to compare (e.g., 1 for last month, 12 for last year) */
  comparisonPeriods: number;
  /** Aggregation level for data points */
  aggregationLevel: AggregationLevel;
}

// ============================================================================
// DISPLAY & FORMATTING CONFIGURATION
// ============================================================================

export type CurrencyNotation = 'standard' | 'compact' | 'scientific';
export type NumberFormat = 'thousands' | 'millions' | 'billions' | 'actual';

export interface DisplayConfig {
  /** Currency code (ISO 4217) */
  currency: string;
  /** Currency notation style */
  currencyNotation: CurrencyNotation;
  /** Number format (thousands/millions/billions/actual) */
  numberFormat: NumberFormat;
  /** Decimal places for currency */
  currencyDecimals: number;
  /** Decimal places for percentages */
  percentageDecimals: number;
  /** Decimal places for ratios */
  ratioDecimals: number;
  /** Show currency symbol */
  showCurrencySymbol: boolean;
  /** Show zero values */
  showZeroValues: boolean;
  /** Show negative values in parentheses (accounting style) */
  useAccountingFormat: boolean;
}

// ============================================================================
// CHART VISUALIZATION CONFIGURATION
// ============================================================================

export interface ChartVisualConfig {
  /** Chart height in pixels */
  height: number;
  /** Show grid lines */
  showGrid: boolean;
  /** Show legend */
  showLegend: boolean;
  /** Show data labels on points */
  showDataLabels: boolean;
  /** Show threshold bands */
  showThresholdBands: boolean;
  /** Show moving average line */
  showMovingAverage: boolean;
  /** Moving average period (number of data points) */
  movingAveragePeriod: number;
  /** Show trend line */
  showTrendLine: boolean;
  /** Show baseline/target line */
  showBaseline: boolean;
  /** Baseline value */
  baselineValue?: number;
  /** Show budget line */
  showBudget: boolean;
  /** Show forecast/projection */
  showForecast: boolean;
  /** Forecast months ahead */
  forecastMonths: number;
  /** Chart color scheme */
  colorScheme: 'primary' | 'success' | 'warning' | 'error' | 'custom';
  /** Custom color (hex) */
  customColor?: string;
}

// ============================================================================
// ENTREPRENEUR-FOCUSED CONFIGURATION
// ============================================================================

export interface EntrepreneurConfig {
  /** Show growth indicators (trending up/down arrows) */
  showGrowthIndicators: boolean;
  /** Show goal/target lines */
  showGoals: boolean;
  /** Goal values (metric -> value) */
  goals: Record<string, number>;
  /** Show industry benchmarks */
  showBenchmarks: boolean;
  /** Show KPI cards */
  showKPICards: boolean;
  /** Highlight significant changes */
  highlightSignificantChanges: boolean;
  /** Threshold for "significant" change (%) */
  significantChangeThreshold: number;
  /** Show cash runway projection */
  showCashRunway: boolean;
  /** Show burn rate */
  showBurnRate: boolean;
  /** Show revenue growth rate */
  showGrowthRate: boolean;
  /** Show profit margins */
  showMargins: boolean;
  /** Alert thresholds for key metrics */
  alertThresholds: {
    cashRunwayDays: number; // Alert if cash runway < X days
    burnRateIncrease: number; // Alert if burn rate increases > X%
    revenueDecline: number; // Alert if revenue declines > X%
    marginDecline: number; // Alert if margin declines > X%
  };
}

// ============================================================================
// CPA-FOCUSED CONFIGURATION
// ============================================================================

export interface CPAConfig {
  /** Materiality threshold (%) */
  materialityThreshold: number;
  /** Show audit trail */
  showAuditTrail: boolean;
  /** Show account codes */
  showAccountCodes: boolean;
  /** Show account types */
  showAccountTypes: boolean;
  /** Accounting method */
  accountingMethod: 'cash' | 'accrual';
  /** Show variance analysis */
  showVarianceAnalysis: boolean;
  /** Variance threshold (%) */
  varianceThreshold: number;
  /** Show aging analysis */
  showAgingAnalysis: boolean;
  /** Aging bucket definitions (days) */
  agingBuckets: {
    current: number; // 0-30 days
    warning: number; // 31-X days
    critical: number; // X+ days
  };
  /** Show trial balance */
  showTrialBalance: boolean;
  /** Show account reconciliation */
  showReconciliation: boolean;
  /** Rounding tolerance */
  roundingTolerance: number;
  /** Show comparative periods */
  showComparativePeriods: boolean;
  /** Number of comparative periods */
  comparativePeriods: number;
  /** Show budget vs actual */
  showBudgetVsActual: boolean;
  /** Show prior year comparison */
  showPriorYear: boolean;
  /** Show period-over-period changes */
  showPeriodOverPeriod: boolean;
  /** Thresholds for anomaly detection */
  thresholds: ThresholdConfig;
}

// ============================================================================
// WATERFALL CHART SPECIFIC CONFIGURATION
// ============================================================================

export interface WaterfallConfig {
  /** Show variance threshold (%) */
  varianceThreshold: number;
  /** Highlight significant items */
  highlightSignificantItems: boolean;
  /** Group small items into "Other" */
  groupSmallItems: boolean;
  /** Threshold for grouping (%) */
  groupingThreshold: number;
  /** Show cumulative totals */
  showCumulativeTotals: boolean;
  /** Show percentage of total */
  showPercentageOfTotal: boolean;
}

// ============================================================================
// BUDGET VS ACTUAL CONFIGURATION
// ============================================================================

export interface BudgetVsActualConfig {
  /** Variance threshold (%) */
  varianceThreshold: number;
  /** Show prior year */
  showPriorYear: boolean;
  /** Show variance percentage */
  showVariancePercentage: boolean;
  /** Show variance amount */
  showVarianceAmount: boolean;
  /** Highlight favorable variances */
  highlightFavorable: boolean;
  /** Highlight unfavorable variances */
  highlightUnfavorable: boolean;
  /** Sort by variance */
  sortByVariance: boolean;
  /** Expand all rows by default */
  expandAllRows: boolean;
}

// ============================================================================
// COMPREHENSIVE GRAPH CONFIGURATION
// ============================================================================

export interface GraphConfig {
  /** Chart ID (for per-chart overrides) */
  chartId?: string;
  /** Period configuration */
  period: PeriodConfig;
  /** Display configuration */
  display: DisplayConfig;
  /** Chart visualization */
  visual: ChartVisualConfig;
  /** Entrepreneur-focused settings */
  entrepreneur: EntrepreneurConfig;
  /** CPA-focused settings */
  cpa: CPAConfig;
  /** Waterfall-specific config */
  waterfall?: WaterfallConfig;
  /** Budget vs Actual config */
  budgetVsActual?: BudgetVsActualConfig;
  /** Locale for formatting (e.g., 'en-CA', 'fr-CA') */
  locale?: string;
}

/**
 * Partial graph configuration for overrides.
 * Use this type when passing configuration overrides that only specify some values.
 */
export type PartialGraphConfig = {
  [K in keyof GraphConfig]?: GraphConfig[K] extends object
    ? Partial<GraphConfig[K]>
    : GraphConfig[K];
};

// ============================================================================
// CONFIGURATION VALIDATION
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a graph configuration for correctness.
 * Returns errors for invalid values and warnings for suboptimal values.
 */
export function validateGraphConfig(config: PartialGraphConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Period validation
  if (config.period) {
    if (config.period.fiscalYearStartMonth !== undefined) {
      if (config.period.fiscalYearStartMonth < 1 || config.period.fiscalYearStartMonth > 12) {
        errors.push('Fiscal year start month must be between 1 and 12');
      }
    }
    if (config.period.comparisonPeriods !== undefined && config.period.comparisonPeriods < 0) {
      errors.push('Comparison periods must be non-negative');
    }
  }

  // Display validation
  if (config.display) {
    if (config.display.currencyDecimals !== undefined) {
      if (config.display.currencyDecimals < 0 || config.display.currencyDecimals > 4) {
        errors.push('Currency decimals must be between 0 and 4');
      }
    }
    if (config.display.percentageDecimals !== undefined) {
      if (config.display.percentageDecimals < 0 || config.display.percentageDecimals > 4) {
        errors.push('Percentage decimals must be between 0 and 4');
      }
    }
  }

  // Visual validation
  if (config.visual) {
    if (config.visual.height !== undefined && config.visual.height < 100) {
      warnings.push('Chart height below 100px may cause display issues');
    }
    if (config.visual.movingAveragePeriod !== undefined) {
      if (config.visual.movingAveragePeriod < 2) {
        errors.push('Moving average period must be at least 2');
      }
    }
    if (config.visual.forecastMonths !== undefined && config.visual.forecastMonths < 1) {
      errors.push('Forecast months must be at least 1');
    }
  }

  // Entrepreneur config validation
  if (config.entrepreneur) {
    if (config.entrepreneur.significantChangeThreshold !== undefined) {
      if (config.entrepreneur.significantChangeThreshold < 0 || config.entrepreneur.significantChangeThreshold > 100) {
        errors.push('Significant change threshold must be between 0 and 100');
      }
    }
  }

  // CPA config validation
  if (config.cpa) {
    if (config.cpa.materialityThreshold !== undefined) {
      if (config.cpa.materialityThreshold < 0 || config.cpa.materialityThreshold > 100) {
        errors.push('Materiality threshold must be between 0 and 100');
      }
    }
    if (config.cpa.roundingTolerance !== undefined && config.cpa.roundingTolerance < 0) {
      errors.push('Rounding tolerance must be non-negative');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

export const DEFAULT_PERIOD_CONFIG: PeriodConfig = {
  defaultPeriod: 'ytd',
  fiscalYearStartMonth: 1,
  comparisonMode: 'previousYear',
  comparisonPeriods: 1,
  aggregationLevel: 'monthly',
};

export const DEFAULT_DISPLAY_CONFIG: DisplayConfig = {
  currency: 'CAD',
  currencyNotation: 'standard',
  numberFormat: 'actual',
  currencyDecimals: 0,
  percentageDecimals: 1,
  ratioDecimals: 2,
  showCurrencySymbol: true,
  showZeroValues: false,
  useAccountingFormat: false,
};

export const DEFAULT_CHART_VISUAL_CONFIG: ChartVisualConfig = {
  height: 300,
  showGrid: true,
  showLegend: true,
  showDataLabels: false,
  showThresholdBands: true,
  showMovingAverage: true,
  movingAveragePeriod: 3,
  showTrendLine: false,
  showBaseline: false,
  showBudget: false,
  showForecast: false,
  forecastMonths: 12,
  colorScheme: 'primary',
};

export const DEFAULT_ENTREPRENEUR_CONFIG: EntrepreneurConfig = {
  showGrowthIndicators: true,
  showGoals: true,
  goals: {},
  showBenchmarks: true,
  showKPICards: true,
  highlightSignificantChanges: true,
  significantChangeThreshold: 15,
  showCashRunway: true,
  showBurnRate: true,
  showGrowthRate: true,
  showMargins: true,
  alertThresholds: {
    cashRunwayDays: 90,
    burnRateIncrease: 20,
    revenueDecline: 10,
    marginDecline: 5,
  },
};

export const DEFAULT_CPA_CONFIG: CPAConfig = {
  materialityThreshold: 5,
  showAuditTrail: false,
  showAccountCodes: true,
  showAccountTypes: false,
  accountingMethod: 'accrual',
  showVarianceAnalysis: true,
  varianceThreshold: 10,
  showAgingAnalysis: true,
  agingBuckets: {
    current: 30,
    warning: 60,
    critical: 90,
  },
  showTrialBalance: false,
  showReconciliation: false,
  roundingTolerance: 0.01,
  showComparativePeriods: true,
  comparativePeriods: 1,
  showBudgetVsActual: true,
  showPriorYear: true,
  showPeriodOverPeriod: true,
  thresholds: {
    varianceWarning: 15,
    varianceCritical: 30,
    currentRatioMin: 1.2,
    currentRatioMax: 3.0,
    quickRatioMin: 0.8,
    debtToEquityMax: 2.0,
    trendConsecutivePeriods: 3,
    trendPercentageChange: 10,
    receivablesAgingWarning: 45,
    receivablesAgingCritical: 90,
    payablesAgingWarning: 45,
    negativeBalanceCheck: true,
    unusualHoursCheck: true,
    duplicateThresholdDays: 7,
    largeTransactionAmount: 25000,
    roundNumberThreshold: 1000,
  },
};

export const DEFAULT_WATERFALL_CONFIG: WaterfallConfig = {
  varianceThreshold: 20,
  highlightSignificantItems: true,
  groupSmallItems: false,
  groupingThreshold: 5,
  showCumulativeTotals: true,
  showPercentageOfTotal: false,
};

export const DEFAULT_BUDGET_VS_ACTUAL_CONFIG: BudgetVsActualConfig = {
  varianceThreshold: 10,
  showPriorYear: true,
  showVariancePercentage: true,
  showVarianceAmount: true,
  highlightFavorable: true,
  highlightUnfavorable: true,
  sortByVariance: true,
  expandAllRows: false,
};

export const DEFAULT_GRAPH_CONFIG: GraphConfig = {
  period: DEFAULT_PERIOD_CONFIG,
  display: DEFAULT_DISPLAY_CONFIG,
  visual: DEFAULT_CHART_VISUAL_CONFIG,
  entrepreneur: DEFAULT_ENTREPRENEUR_CONFIG,
  cpa: DEFAULT_CPA_CONFIG,
  waterfall: DEFAULT_WATERFALL_CONFIG,
  budgetVsActual: DEFAULT_BUDGET_VS_ACTUAL_CONFIG,
};

// ============================================================================
// CONFIGURATION MERGE UTILITIES
// ============================================================================

/**
 * Merge configurations with priority: chart > user > org > default
 */
export function mergeGraphConfig(
  chartOverrides?: Partial<GraphConfig>,
  userPreferences?: Partial<GraphConfig>,
  orgSettings?: Partial<GraphConfig>,
): GraphConfig {
  const merged: GraphConfig = {
    ...DEFAULT_GRAPH_CONFIG,
    ...orgSettings,
    ...userPreferences,
    ...chartOverrides,
    period: {
      ...DEFAULT_PERIOD_CONFIG,
      ...orgSettings?.period,
      ...userPreferences?.period,
      ...chartOverrides?.period,
    },
    display: {
      ...DEFAULT_DISPLAY_CONFIG,
      ...orgSettings?.display,
      ...userPreferences?.display,
      ...chartOverrides?.display,
    },
    visual: {
      ...DEFAULT_CHART_VISUAL_CONFIG,
      ...orgSettings?.visual,
      ...userPreferences?.visual,
      ...chartOverrides?.visual,
    },
    entrepreneur: {
      ...DEFAULT_ENTREPRENEUR_CONFIG,
      ...orgSettings?.entrepreneur,
      ...userPreferences?.entrepreneur,
      ...chartOverrides?.entrepreneur,
    },
    cpa: {
      ...DEFAULT_CPA_CONFIG,
      ...orgSettings?.cpa,
      ...userPreferences?.cpa,
      ...chartOverrides?.cpa,
    },
    waterfall: {
      ...DEFAULT_WATERFALL_CONFIG,
      ...orgSettings?.waterfall,
      ...userPreferences?.waterfall,
      ...chartOverrides?.waterfall,
    },
    budgetVsActual: {
      ...DEFAULT_BUDGET_VS_ACTUAL_CONFIG,
      ...orgSettings?.budgetVsActual,
      ...userPreferences?.budgetVsActual,
      ...chartOverrides?.budgetVsActual,
    },
  };
  
  return merged;
}

/**
 * Get configuration for a specific chart
 */
export function getChartConfig(
  chartId: string,
  userPreferences?: Partial<GraphConfig>,
  orgSettings?: Partial<GraphConfig>,
): GraphConfig {
  // In a real implementation, this would fetch chart-specific overrides from storage
  const chartOverrides: Partial<GraphConfig> = {};
  
  return mergeGraphConfig(chartOverrides, userPreferences, orgSettings);
}

/**
 * Get the user's locale from browser or configuration.
 * Falls back to 'en-CA' if not available.
 */
export function getLocale(configLocale?: string): string {
  // Priority: config > browser > default
  if (configLocale) return configLocale;
  
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language;
  }
  
  return 'en-CA';
}

/**
 * Format currency value based on display config and locale
 */
export function formatCurrencyValue(
  value: number,
  config: DisplayConfig,
  locale?: string,
): string {
  const { currency, currencyNotation, numberFormat, currencyDecimals, showCurrencySymbol, useAccountingFormat } = config;
  
  const resolvedLocale = getLocale(locale);
  
  let formattedValue = value;
  let suffix = '';
  
  // Apply number format (thousands/millions/billions)
  switch (numberFormat) {
    case 'thousands':
      formattedValue = value / 1000;
      suffix = 'K';
      break;
    case 'millions':
      formattedValue = value / 1000000;
      suffix = 'M';
      break;
    case 'billions':
      formattedValue = value / 1000000000;
      suffix = 'B';
      break;
    case 'actual':
    default:
      formattedValue = value;
  }
  
  const options: Intl.NumberFormatOptions = {
    style: 'currency',
    currency,
    minimumFractionDigits: currencyDecimals,
    maximumFractionDigits: currencyDecimals,
    notation: currencyNotation === 'compact' ? 'compact' : 'standard',
  };
  
  let formatted = new Intl.NumberFormat(resolvedLocale, options).format(formattedValue);
  
  // Add suffix for scaled values (only if not using compact notation)
  if (suffix && currencyNotation !== 'compact') {
    formatted = formatted + suffix;
  }
  
  // Apply accounting format (negative in parentheses)
  if (useAccountingFormat && value < 0) {
    formatted = `(${formatted.replace('-', '')})`;
  }
  
  // Remove currency symbol if not wanted
  if (!showCurrencySymbol) {
    formatted = formatted.replace(/[^\d.,\-()KB M]/g, '').trim();
  }
  
  return formatted;
}

/**
 * Format percentage value based on display config and locale
 */
export function formatPercentageValue(
  value: number,
  config: DisplayConfig,
  locale?: string,
): string {
  const { percentageDecimals } = config;
  const resolvedLocale = getLocale(locale);
  
  const options: Intl.NumberFormatOptions = {
    style: 'percent',
    minimumFractionDigits: percentageDecimals,
    maximumFractionDigits: percentageDecimals,
  };
  
  // Note: Intl percent expects decimal (0.15 for 15%), but we expect percentage value (15 for 15%)
  return new Intl.NumberFormat(resolvedLocale, options).format(value / 100);
}

/**
 * Format ratio value based on display config and locale
 */
export function formatRatioValue(
  value: number,
  config: DisplayConfig,
  locale?: string,
): string {
  const { ratioDecimals } = config;
  const resolvedLocale = getLocale(locale);
  
  const options: Intl.NumberFormatOptions = {
    minimumFractionDigits: ratioDecimals,
    maximumFractionDigits: ratioDecimals,
  };
  
  return new Intl.NumberFormat(resolvedLocale, options).format(value);
}

/**
 * Format a number value with locale-aware formatting
 */
export function formatNumberValue(
  value: number,
  decimals: number = 0,
  locale?: string,
): string {
  const resolvedLocale = getLocale(locale);
  
  const options: Intl.NumberFormatOptions = {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  };
  
  return new Intl.NumberFormat(resolvedLocale, options).format(value);
}
