/**
 * ResponsiveChartWrapper Component
 * 
 * Responsive wrapper for charts with:
 * - Automatic breakpoint detection
 * - Dynamic data point filtering
 * - Legend/axis label visibility control
 * - Chart height adjustment
 * 
 * Bilingual support (EN/FR)
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useI18n } from '../../lib/i18n';
import { RESPONSIVE_BREAKPOINTS, type ResponsiveBreakpoint } from './types';

// =====================================================
// TYPES
// =====================================================

interface ResponsiveChartWrapperProps {
  children: (config: ResponsiveConfig) => React.ReactNode;
  data?: any[];
  minHeight?: number;
  className?: string;
}

interface ResponsiveConfig {
  breakpoint: ResponsiveBreakpoint;
  width: number;
  height: number;
  showLegend: boolean;
  showAxisLabels: boolean;
  dataPoints: any[];
  isCompact: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

// =====================================================
// DATA SIMPLIFICATION
// =====================================================

/**
 * Simplify data points for smaller screens
 * Uses sampling to reduce data while maintaining trends
 */
function simplifyData<T>(data: T[], maxPoints: number): T[] {
  if (data.length <= maxPoints) return data;

  const result: T[] = [];
  const step = (data.length - 1) / (maxPoints - 1);

  for (let i = 0; i < maxPoints; i++) {
    const index = Math.round(i * step);
    result.push(data[Math.min(index, data.length - 1)]);
  }

  return result;
}

/**
 * Get current breakpoint based on width
 */
function getBreakpoint(width: number): ResponsiveBreakpoint {
  for (let i = RESPONSIVE_BREAKPOINTS.length - 1; i >= 0; i--) {
    const bp = RESPONSIVE_BREAKPOINTS[i];
    if (width >= bp.minWidth) {
      return bp;
    }
  }
  return RESPONSIVE_BREAKPOINTS[0];
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function ResponsiveChartWrapper({
  children,
  data = [],
  minHeight = 200,
  className = '',
}: ResponsiveChartWrapperProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Observe container size
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height: Math.max(height, minHeight) });
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [minHeight]);

  // Calculate responsive config
  const config = useMemo((): ResponsiveConfig => {
    const breakpoint = getBreakpoint(dimensions.width);
    
    // Simplify data if needed
    const dataPoints = breakpoint.simplifyData
      ? simplifyData(data, breakpoint.maxDataPoints)
      : data;

    return {
      breakpoint,
      width: dimensions.width,
      height: Math.max(breakpoint.chartHeight, minHeight),
      showLegend: breakpoint.showLegend,
      showAxisLabels: breakpoint.showAxisLabels,
      dataPoints,
      isCompact: breakpoint.name === 'mobile',
      isMobile: breakpoint.name === 'mobile',
      isTablet: breakpoint.name === 'tablet',
      isDesktop: breakpoint.name === 'desktop' || breakpoint.name === 'wide',
    };
  }, [dimensions.width, data, minHeight]);

  return (
    <div
      ref={containerRef}
      className={`w-full ${className}`}
      style={{ minHeight }}
    >
      {dimensions.width > 0 && children(config)}
    </div>
  );
}

// =====================================================
// UTILITY HOOKS
// =====================================================

/**
 * Hook to get current responsive breakpoint
 */
export function useResponsiveBreakpoint(): ResponsiveBreakpoint {
  const [breakpoint, setBreakpoint] = useState<ResponsiveBreakpoint>(
    RESPONSIVE_BREAKPOINTS[2] // Default to desktop
  );

  useEffect(() => {
    const handleResize = () => {
      setBreakpoint(getBreakpoint(window.innerWidth));
    };

    handleResize(); // Initial
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return breakpoint;
}

/**
 * Hook to check if current viewport is mobile
 */
export function useIsMobile(): boolean {
  const breakpoint = useResponsiveBreakpoint();
  return breakpoint.name === 'mobile';
}

/**
 * Hook to check if current viewport is tablet
 */
export function useIsTablet(): boolean {
  const breakpoint = useResponsiveBreakpoint();
  return breakpoint.name === 'tablet';
}

/**
 * Hook to check if current viewport is desktop or wider
 */
export function useIsDesktop(): boolean {
  const breakpoint = useResponsiveBreakpoint();
  return breakpoint.name === 'desktop' || breakpoint.name === 'wide';
}

// =====================================================
// RESPONSIVE CHART UTILITIES
// =====================================================

/**
 * Calculate optimal font size based on container width
 */
export function getResponsiveFontSize(
  baseSize: number,
  containerWidth: number,
  minSize: number = 10,
  maxSize: number = 16
): number {
  const scaleFactor = containerWidth / 400; // Base scale at 400px
  const scaled = baseSize * Math.min(Math.max(scaleFactor, 0.7), 1.2);
  return Math.min(Math.max(scaled, minSize), maxSize);
}

/**
 * Calculate optimal padding based on container width
 */
export function getResponsivePadding(
  containerWidth: number
): { top: number; right: number; bottom: number; left: number } {
  if (containerWidth < 400) {
    return { top: 10, right: 10, bottom: 25, left: 35 };
  }
  if (containerWidth < 640) {
    return { top: 15, right: 15, bottom: 30, left: 45 };
  }
  if (containerWidth < 1024) {
    return { top: 20, right: 20, bottom: 35, left: 50 };
  }
  return { top: 20, right: 30, bottom: 40, left: 60 };
}

/**
 * Calculate number of axis ticks based on container dimensions
 */
export function getResponsiveAxisTicks(
  containerWidth: number,
  dataLength: number
): number {
  if (containerWidth < 400) return Math.min(4, dataLength);
  if (containerWidth < 640) return Math.min(6, dataLength);
  if (containerWidth < 1024) return Math.min(8, dataLength);
  return Math.min(12, dataLength);
}
