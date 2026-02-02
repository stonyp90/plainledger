/**
 * IBCS (International Business Communication Standards) Library
 * 
 * This module provides a complete IBCS implementation for financial visualizations:
 * - Theme system with semantic colors
 * - Bar notation (solid/outline/hatched for AC/PL/FC)
 * - Variance calculations and helpers
 * - Number formatters following IBCS standards
 * 
 * @see https://www.ibcs.com/standards/
 * 
 * Usage:
 * ```tsx
 * import { 
 *   IBCSColors, 
 *   getVarianceColor, 
 *   formatCurrency, 
 *   calculateVariance,
 *   getBarStyle 
 * } from '@/lib/ibcs';
 * ```
 */

// Theme - Colors and semantic rules
export {
  IBCSColors,
  IBCSThresholds,
  IBCSAbbreviations,
  IBCSLabels,
  isFavorable,
  getVarianceStatus,
  getVarianceColor,
  getVarianceBackgroundColor,
  getVarianceClasses,
  type IBCSScenario,
  type IBCSMetricType,
  type VarianceStatus,
} from './theme';

// Notation - Bar styles and visual patterns
export {
  getBarStyle,
  getBarProps,
  getVarianceBarStyles,
  IBCSLegendItems,
  createHatchPattern,
  BarWidthRatios,
  calculatePairedBarPositions,
  BarCornerRadius,
  type BarStyle,
  type VarianceBarStyle,
  type LegendItem,
} from './notation';

// Variance - Calculation helpers
export {
  calculateVariance,
  calculateYoYVariance,
  calculatePoPVariance,
  calculateVariances,
  sortByVariance,
  filterByVarianceThreshold,
  getTopVariances,
  calculateTotalVariance,
  calculateWeightedVariance,
  type VarianceResult,
} from './variance';

// Formatters - Number formatting
export {
  formatNumber,
  formatCurrency,
  formatPercentage,
  formatVariance,
  formatVariancePercent,
  formatDelta,
  formatRatio,
  formatWithUnit,
  formatHeaderValue,
  getBilingualFormat,
  BilingualFormats,
  type IBCSFormatOptions,
} from './formatters';
