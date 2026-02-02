/**
 * Chart Configuration System
 * 
 * Unified interfaces for multi-data source charts with IBCS compliance.
 * Supports custom labels, multiple data sources, and FP&A features.
 * 
 * Features:
 * - Multi-data source support (QuickBooks, Xero, Sage, Plan, Forecast)
 * - Custom bilingual labels (EN/FR)
 * - IBCS compliance configuration
 * - Accessibility settings
 * - FP&A metric types
 */

import { useI18n } from './i18n';
import type { IBCSMetricType } from './ibcs';

// =====================================================
// DATA SOURCE INTERFACE
// =====================================================

/**
 * Chart data source configuration
 */
export interface ChartDataSource {
  /** Unique identifier for this data source */
  id: string;
  /** Display name (French) */
  name: string;
  /** Display name (English) */
  nameEn?: string;
  /** Data points array */
  data: number[];
  /** IBCS scenario type */
  scenario?: 'actual' | 'plan' | 'forecast' | 'priorYear';
  /** Custom color override (optional) */
  color?: string;
  /** Whether this data source is visible */
  visible?: boolean;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

// =====================================================
// LABEL CONFIGURATION
// =====================================================

/**
 * Chart label configuration with bilingual support
 */
export interface ChartLabels {
  /** Chart title (French) */
  title: string;
  /** Chart title (English) */
  titleEn?: string;
  /** Chart subtitle (French) */
  subtitle?: string;
  /** Chart subtitle (English) */
  subtitleEn?: string;
  /** X-axis label (French) */
  xAxisLabel?: string;
  /** X-axis label (English) */
  xAxisLabelEn?: string;
  /** Y-axis label (French) */
  yAxisLabel?: string;
  /** Y-axis label (English) */
  yAxisLabelEn?: string;
  /** Custom tooltip formatter */
  tooltipFormat?: (value: number) => string;
  /** Custom value formatter */
  valueFormat?: (value: number) => string;
}

// =====================================================
// IBCS CHART CONFIGURATION
// =====================================================

/**
 * Complete IBCS chart configuration
 */
export interface IBCSChartConfig {
  /** Data sources for the chart */
  dataSources: ChartDataSource[];
  /** Label configuration */
  labels: ChartLabels;
  /** Enable IBCS-compliant display */
  ibcsMode: boolean;
  /** Show variance pins */
  showVariancePins: boolean;
  /** Show IBCS legend */
  showLegend: boolean;
  /** Show benchmark comparison */
  showBenchmark: boolean;
  /** Metric type for variance calculations */
  metricType: IBCSMetricType;
  /** Accessibility configuration */
  accessibility: {
    /** ARIA label (French) */
    ariaLabel: string;
    /** ARIA label (English) */
    ariaLabelEn?: string;
    /** Description (French) */
    description: string;
    /** Description (English) */
    descriptionEn?: string;
  };
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get bilingual label based on current language
 */
export function getBilingualLabel(
  label: string,
  labelEn?: string,
  isEn?: boolean
): string {
  if (isEn === undefined) {
    // Try to detect from context if not provided
    return labelEn || label;
  }
  return isEn && labelEn ? labelEn : label;
}

/**
 * Create default IBCS chart configuration
 */
export function createDefaultIBCSConfig(
  title: string,
  titleEn?: string
): Partial<IBCSChartConfig> {
  return {
    ibcsMode: true,
    showVariancePins: true,
    showLegend: true,
    showBenchmark: false,
    metricType: 'revenue',
    labels: {
      title,
      titleEn,
    },
    accessibility: {
      ariaLabel: title,
      ariaLabelEn: titleEn,
      description: title,
      descriptionEn: titleEn,
    },
  };
}

/**
 * Hook to get bilingual labels from configuration
 */
export function useChartLabels(labels: ChartLabels) {
  const { language } = useI18n();
  const isEn = language === 'en';

  return {
    title: getBilingualLabel(labels.title, labels.titleEn, isEn),
    subtitle: labels.subtitle
      ? getBilingualLabel(labels.subtitle, labels.subtitleEn, isEn)
      : undefined,
    xAxisLabel: labels.xAxisLabel
      ? getBilingualLabel(labels.xAxisLabel, labels.xAxisLabelEn, isEn)
      : undefined,
    yAxisLabel: labels.yAxisLabel
      ? getBilingualLabel(labels.yAxisLabel, labels.yAxisLabelEn, isEn)
      : undefined,
    tooltipFormat: labels.tooltipFormat,
    valueFormat: labels.valueFormat,
  };
}

/**
 * Hook to get bilingual accessibility labels
 */
export function useChartAccessibility(accessibility: IBCSChartConfig['accessibility']) {
  const { language } = useI18n();
  const isEn = language === 'en';

  return {
    ariaLabel: getBilingualLabel(
      accessibility.ariaLabel,
      accessibility.ariaLabelEn,
      isEn
    ),
    description: getBilingualLabel(
      accessibility.description,
      accessibility.descriptionEn,
      isEn
    ),
  };
}
