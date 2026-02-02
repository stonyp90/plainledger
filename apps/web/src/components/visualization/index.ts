/**
 * Visualization System Components
 * 
 * FP&A-optimized, IBCS-compliant visualization components for PlainLedger
 */

// Main components
export { default as ResizableChartGrid } from './ResizableChartGrid';
export { default as ChartColorPicker } from './ChartColorPicker';
export { default as FullScreenChart } from './FullScreenChart';
export { default as DataSourceSelector } from './DataSourceSelector';
export { default as ResponsiveChartWrapper } from './ResponsiveChartWrapper';
export { default as IBCSChartHeader, getIBCSNotation, formatIBCSVariance, getIBCSAxisLabel } from './IBCSChartHeader';
export { default as ShareReportModal } from './ShareReportModal';

// Hooks
export {
  useResponsiveBreakpoint,
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  getResponsiveFontSize,
  getResponsivePadding,
  getResponsiveAxisTicks,
} from './ResponsiveChartWrapper';

// Types
export type {
  ChartSize,
  ChartPosition,
  ChartColorPreset,
  ResponsiveBreakpoint,
  ChartWidgetConfig,
  DataSourceInfo,
  ShareConfig,
  FullScreenConfig,
} from './types';

// Constants
export {
  FPA_COLOR_PRESETS,
  RESPONSIVE_BREAKPOINTS,
  CHART_KEYBOARD_SHORTCUTS,
} from './types';
