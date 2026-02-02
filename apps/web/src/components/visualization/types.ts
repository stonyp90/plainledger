/**
 * Visualization System Types
 * 
 * FP&A-optimized, IBCS-compliant visualization type definitions
 */

import type { ChartType, DataMetric, TimeRange } from '../../lib/chartFavorites';

/**
 * Chart size options for grid layout
 */
export type ChartSize = 'small' | 'medium' | 'large' | 'full';

/**
 * Chart position in grid
 */
export interface ChartPosition {
  x: number;
  y: number;
  w: number;  // width in grid units (1-12)
  h: number;  // height in grid units
}

/**
 * FP&A Chart color preset
 */
export interface ChartColorPreset {
  id: string;
  name: string;
  nameEn: string;
  primary: string;
  secondary: string;
  accent: string;
  positive: string;
  negative: string;
  neutral: string;
  plan: string;
  actual: string;
  forecast: string;
}

/**
 * IBCS-compliant FP&A color presets
 */
export const FPA_COLOR_PRESETS: ChartColorPreset[] = [
  {
    id: 'default',
    name: 'PlainLedger Standard',
    nameEn: 'PlainLedger Standard',
    primary: '#10B981',     // Emerald green (primary brand)
    secondary: '#3B82F6',   // Blue
    accent: '#D4AF37',      // Gold
    positive: '#059669',    // Green - favorable
    negative: '#DC2626',    // Red - unfavorable
    neutral: '#6B7280',     // Gray - neutral
    plan: '#64748B',        // Slate for plan (outline)
    actual: '#1E293B',      // Dark slate for actual
    forecast: '#94A3B8',    // Light slate for forecast
  },
  {
    id: 'corporate',
    name: 'Corporate Finance',
    nameEn: 'Corporate Finance',
    primary: '#1E40AF',     // Navy blue
    secondary: '#4338CA',   // Indigo
    accent: '#B45309',      // Amber
    positive: '#047857',    // Emerald
    negative: '#B91C1C',    // Red
    neutral: '#4B5563',     // Gray
    plan: '#6B7280',
    actual: '#111827',
    forecast: '#9CA3AF',
  },
  {
    id: 'high-contrast',
    name: 'Haut contraste',
    nameEn: 'High Contrast',
    primary: '#000000',     // Black
    secondary: '#4B5563',   // Dark gray
    accent: '#F59E0B',      // Amber
    positive: '#047857',    // Green
    negative: '#DC2626',    // Red
    neutral: '#6B7280',     // Gray
    plan: '#9CA3AF',
    actual: '#000000',
    forecast: '#D1D5DB',
  },
  {
    id: 'presentation',
    name: 'Présentation',
    nameEn: 'Presentation',
    primary: '#0284C7',     // Sky blue
    secondary: '#7C3AED',   // Violet
    accent: '#EA580C',      // Orange
    positive: '#16A34A',    // Green
    negative: '#E11D48',    // Rose
    neutral: '#64748B',     // Slate
    plan: '#94A3B8',
    actual: '#0F172A',
    forecast: '#CBD5E1',
  },
];

/**
 * Responsive breakpoint configuration
 */
export interface ResponsiveBreakpoint {
  name: 'mobile' | 'tablet' | 'desktop' | 'wide';
  minWidth: number;
  maxWidth: number | null;
  columns: number;
  chartHeight: number;
  showLegend: boolean;
  showAxisLabels: boolean;
  simplifyData: boolean;  // Reduce data points on smaller screens
  maxDataPoints: number;
}

/**
 * Default responsive breakpoints for FP&A visualizations
 */
export const RESPONSIVE_BREAKPOINTS: ResponsiveBreakpoint[] = [
  {
    name: 'mobile',
    minWidth: 0,
    maxWidth: 639,
    columns: 1,
    chartHeight: 200,
    showLegend: false,
    showAxisLabels: false,
    simplifyData: true,
    maxDataPoints: 6,
  },
  {
    name: 'tablet',
    minWidth: 640,
    maxWidth: 1023,
    columns: 2,
    chartHeight: 260,
    showLegend: true,
    showAxisLabels: true,
    simplifyData: true,
    maxDataPoints: 12,
  },
  {
    name: 'desktop',
    minWidth: 1024,
    maxWidth: 1535,
    columns: 3,
    chartHeight: 300,
    showLegend: true,
    showAxisLabels: true,
    simplifyData: false,
    maxDataPoints: 24,
  },
  {
    name: 'wide',
    minWidth: 1536,
    maxWidth: null,
    columns: 4,
    chartHeight: 340,
    showLegend: true,
    showAxisLabels: true,
    simplifyData: false,
    maxDataPoints: 36,
  },
];

/**
 * Chart widget configuration
 */
export interface ChartWidgetConfig {
  id: string;
  chartType: ChartType;
  metrics: DataMetric[];
  timeRange: TimeRange;
  name: string;
  nameEn: string;
  description?: string;
  position?: ChartPosition;
  size: ChartSize;
  colorPreset?: string;
  customColors?: Partial<ChartColorPreset>;
  showIBCS?: boolean;
  showComparison?: boolean;
  comparisonMode?: 'previousPeriod' | 'previousYear' | 'budget' | 'forecast';
}

/**
 * Data source connection info
 */
export interface DataSourceInfo {
  id: string;
  name: string;
  provider: 'quickbooks' | 'xero' | 'sage' | 'freshbooks' | 'wave' | 'csv' | 'api';
  status: 'connected' | 'disconnected' | 'pending' | 'error';
  lastSync?: string;
  isSandbox?: boolean;
  companyName?: string;
  realmId?: string;
}

/**
 * Share configuration for reports/charts
 */
export interface ShareConfig {
  type: 'link' | 'email' | 'embed' | 'pdf' | 'image';
  recipients?: string[];
  password?: string;
  expiresAt?: string;
  permissions: {
    canDownload: boolean;
    canEdit: boolean;
    requireAuth: boolean;
  };
  customization?: {
    showBranding: boolean;
    theme: 'light' | 'dark' | 'auto';
    colorPreset?: string;
  };
}

/**
 * Full-screen mode configuration
 */
export interface FullScreenConfig {
  chartId: string;
  showControls: boolean;
  autoRefresh: boolean;
  refreshInterval: number; // seconds
  presentation: boolean;  // Hide UI for presentation mode
  keyboardShortcuts: boolean;
}

/**
 * Keyboard shortcuts for chart interactions
 */
export const CHART_KEYBOARD_SHORTCUTS = {
  fullScreen: 'f',
  escape: 'Escape',
  share: 's',
  download: 'd',
  refresh: 'r',
  nextChart: 'ArrowRight',
  prevChart: 'ArrowLeft',
  toggleLegend: 'l',
  toggleGrid: 'g',
} as const;
