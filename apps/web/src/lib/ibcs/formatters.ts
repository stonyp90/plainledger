/**
 * IBCS Formatters
 * 
 * Number formatting functions following IBCS standards:
 * - Consistent sign display (+/-)
 * - Abbreviated large numbers (K, M, B)
 * - Percentage formatting
 */

/**
 * Format options for IBCS numbers
 */
export interface IBCSFormatOptions {
  /** Number of decimal places */
  decimals?: number;
  /** Show + sign for positive numbers */
  showPositiveSign?: boolean;
  /** Abbreviate large numbers (K, M, B) */
  abbreviate?: boolean;
  /** Currency symbol (e.g., '$', '€') */
  currency?: string;
  /** Locale for number formatting */
  locale?: string;
}

const defaultOptions: IBCSFormatOptions = {
  decimals: 0,
  showPositiveSign: false,
  abbreviate: true,
  currency: '$',
  locale: 'en-US',
};

/**
 * Abbreviation thresholds
 */
const ABBREVIATIONS = [
  { threshold: 1e9, suffix: 'B' },
  { threshold: 1e6, suffix: 'M' },
  { threshold: 1e3, suffix: 'K' },
] as const;

/**
 * Format a number according to IBCS standards
 * 
 * @param value - Number to format
 * @param options - Formatting options
 * @returns Formatted string
 */
export function formatNumber(
  value: number,
  options: IBCSFormatOptions = {}
): string {
  const opts = { ...defaultOptions, ...options };
  
  if (!Number.isFinite(value)) {
    return '—';
  }
  
  const isNegative = value < 0;
  const absValue = Math.abs(value);
  
  let formattedValue: string;
  let suffix = '';
  
  // Abbreviate if enabled and value is large enough
  if (opts.abbreviate) {
    for (const abbr of ABBREVIATIONS) {
      if (absValue >= abbr.threshold) {
        formattedValue = (absValue / abbr.threshold).toFixed(opts.decimals);
        suffix = abbr.suffix;
        break;
      }
    }
  }
  
  // Format without abbreviation if not abbreviated
  if (!suffix) {
    formattedValue = absValue.toLocaleString(opts.locale, {
      minimumFractionDigits: opts.decimals,
      maximumFractionDigits: opts.decimals,
    });
  }
  
  // Build final string
  let result = '';
  
  // Add sign
  if (isNegative) {
    result = '-';
  } else if (opts.showPositiveSign && value > 0) {
    result = '+';
  }
  
  // Add currency if present
  if (opts.currency) {
    result += opts.currency;
  }
  
  result += formattedValue + suffix;
  
  return result;
}

/**
 * Format currency value with IBCS standards
 * 
 * @param value - Currency value
 * @param options - Formatting options
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number,
  options: Partial<IBCSFormatOptions> = {}
): string {
  return formatNumber(value, {
    currency: '$',
    decimals: 0,
    abbreviate: true,
    ...options,
  });
}

/**
 * Format percentage value with IBCS standards
 * 
 * @param value - Percentage value (e.g., 15.5 for 15.5%)
 * @param options - Formatting options
 * @returns Formatted percentage string
 */
export function formatPercentage(
  value: number,
  options: Partial<IBCSFormatOptions> = {}
): string {
  const opts = { decimals: 1, showPositiveSign: true, ...options };
  
  if (!Number.isFinite(value)) {
    return '—';
  }
  
  const sign = value > 0 && opts.showPositiveSign ? '+' : '';
  const formatted = value.toFixed(opts.decimals);
  
  return `${sign}${formatted}%`;
}

/**
 * Format variance value (absolute)
 * 
 * @param value - Variance value
 * @param options - Formatting options
 * @returns Formatted variance string with sign
 */
export function formatVariance(
  value: number,
  options: Partial<IBCSFormatOptions> = {}
): string {
  return formatNumber(value, {
    showPositiveSign: true,
    ...options,
  });
}

/**
 * Format variance percentage
 * 
 * @param value - Variance percentage
 * @param options - Formatting options
 * @returns Formatted variance percentage string
 */
export function formatVariancePercent(
  value: number,
  options: Partial<IBCSFormatOptions> = {}
): string {
  return formatPercentage(value, {
    showPositiveSign: true,
    ...options,
  });
}

/**
 * Format delta (change) value for IBCS notation
 * Uses Δ symbol prefix
 * 
 * @param value - Delta value
 * @param options - Formatting options
 * @returns Formatted delta string
 */
export function formatDelta(
  value: number,
  options: Partial<IBCSFormatOptions> = {}
): string {
  const formatted = formatVariance(value, options);
  return `Δ${formatted}`;
}

/**
 * Format ratio value (e.g., for financial ratios)
 * 
 * @param value - Ratio value
 * @param decimals - Number of decimal places
 * @returns Formatted ratio string
 */
export function formatRatio(
  value: number,
  decimals: number = 2
): string {
  if (!Number.isFinite(value)) {
    return '—';
  }
  return value.toFixed(decimals);
}

/**
 * Format value with unit suffix
 * 
 * @param value - Value to format
 * @param unit - Unit suffix (e.g., 'days', 'units')
 * @param options - Formatting options
 * @returns Formatted string with unit
 */
export function formatWithUnit(
  value: number,
  unit: string,
  options: Partial<IBCSFormatOptions> = {}
): string {
  const formatted = formatNumber(value, { currency: '', ...options });
  return `${formatted} ${unit}`;
}

/**
 * Bilingual format helpers (EN/FR)
 */
export const BilingualFormats = {
  currency: {
    en: { currency: '$', locale: 'en-US' },
    fr: { currency: '$', locale: 'fr-CA' },
  },
  percentage: {
    en: { locale: 'en-US' },
    fr: { locale: 'fr-CA' },
  },
} as const;

/**
 * Get bilingual format options
 * 
 * @param isEn - Whether English is selected
 * @param type - Format type
 * @returns Format options for the selected language
 */
export function getBilingualFormat(
  isEn: boolean,
  type: keyof typeof BilingualFormats
): Partial<IBCSFormatOptions> {
  return BilingualFormats[type][isEn ? 'en' : 'fr'];
}

/**
 * Format value for IBCS header cell
 * Compact format suitable for table headers
 * 
 * @param value - Value to format
 * @param isPercentage - Whether value is a percentage
 * @returns Compact formatted string
 */
export function formatHeaderValue(
  value: number,
  isPercentage: boolean = false
): string {
  if (isPercentage) {
    return formatPercentage(value, { decimals: 0, showPositiveSign: false });
  }
  return formatCurrency(value, { decimals: 0 });
}
