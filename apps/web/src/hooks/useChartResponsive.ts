/**
 * Chart Responsive Hook
 * 
 * Provides responsive sizing based on the ACTUAL chart container size,
 * not the viewport. This ensures icons, text, and controls scale
 * appropriately when charts are rendered at different sizes.
 * 
 * Usage:
 * ```tsx
 * const { ref, size, classes, values } = useChartResponsive();
 * 
 * return (
 *   <div ref={ref}>
 *     <Icon className={classes.icon} />
 *     <span className={classes.text}>{title}</span>
 *     <button className={classes.button}>...</button>
 *   </div>
 * );
 * ```
 */

import { useState, useEffect, useRef, useMemo, useCallback, RefObject } from 'react';

// Size breakpoints based on chart container width (not viewport)
export type ChartSizeCategory = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface ChartSizeBreakpoints {
  xs: number;  // Extra small: < 200px
  sm: number;  // Small: 200-350px
  md: number;  // Medium: 350-500px
  lg: number;  // Large: 500-700px
  xl: number;  // Extra large: > 700px
}

const DEFAULT_BREAKPOINTS: ChartSizeBreakpoints = {
  xs: 0,
  sm: 200,
  md: 350,
  lg: 500,
  xl: 700,
};

interface ChartResponsiveClasses {
  // Icon sizes
  icon: string;
  iconSm: string;
  iconLg: string;
  
  // Text sizes
  text: string;
  textSm: string;
  textLg: string;
  title: string;
  subtitle: string;
  
  // Button/control sizes
  button: string;
  buttonSm: string;
  
  // Padding/spacing
  padding: string;
  gap: string;
  
  // Logo sizes
  logo: string;
}

interface ChartResponsiveValues {
  // Numeric values for SVG/canvas rendering
  iconSize: number;
  iconSizeSm: number;
  iconSizeLg: number;
  
  strokeWidth: number;
  pointRadius: number;
  
  fontSize: number;
  fontSizeSm: number;
  fontSizeLg: number;
  
  padding: number;
  gap: number;
  
  // Logo dimensions
  logoWidth: number;
  logoHeight: number;
}

interface ChartResponsiveResult {
  ref: RefObject<HTMLDivElement>;
  size: ChartSizeCategory;
  width: number;
  height: number;
  classes: ChartResponsiveClasses;
  values: ChartResponsiveValues;
  isCompact: boolean;
  isExpanded: boolean;
}

// Size-based class mappings
const SIZE_CLASSES: Record<ChartSizeCategory, ChartResponsiveClasses> = {
  xs: {
    icon: 'w-2.5 h-2.5',
    iconSm: 'w-2 h-2',
    iconLg: 'w-3 h-3',
    text: 'text-[10px]',
    textSm: 'text-[9px]',
    textLg: 'text-xs',
    title: 'text-xs font-medium',
    subtitle: 'text-[9px]',
    button: 'p-0.5 rounded',
    buttonSm: 'p-0.5 rounded',
    padding: 'p-1.5',
    gap: 'gap-0.5',
    logo: 'w-4 h-4',
  },
  sm: {
    icon: 'w-3 h-3',
    iconSm: 'w-2.5 h-2.5',
    iconLg: 'w-3.5 h-3.5',
    text: 'text-[11px]',
    textSm: 'text-[10px]',
    textLg: 'text-xs',
    title: 'text-sm font-medium',
    subtitle: 'text-[10px]',
    button: 'p-1 rounded',
    buttonSm: 'p-0.5 rounded',
    padding: 'p-2',
    gap: 'gap-0.5',
    logo: 'w-5 h-5',
  },
  md: {
    icon: 'w-3.5 h-3.5',
    iconSm: 'w-3 h-3',
    iconLg: 'w-4 h-4',
    text: 'text-xs',
    textSm: 'text-[11px]',
    textLg: 'text-sm',
    title: 'text-sm font-semibold',
    subtitle: 'text-xs',
    button: 'p-1.5 rounded-md',
    buttonSm: 'p-1 rounded',
    padding: 'p-3',
    gap: 'gap-1',
    logo: 'w-6 h-6',
  },
  lg: {
    icon: 'w-4 h-4',
    iconSm: 'w-3.5 h-3.5',
    iconLg: 'w-5 h-5',
    text: 'text-sm',
    textSm: 'text-xs',
    textLg: 'text-base',
    title: 'text-base font-semibold',
    subtitle: 'text-sm',
    button: 'p-2 rounded-lg',
    buttonSm: 'p-1.5 rounded-md',
    padding: 'p-4',
    gap: 'gap-1.5',
    logo: 'w-8 h-8',
  },
  xl: {
    icon: 'w-5 h-5',
    iconSm: 'w-4 h-4',
    iconLg: 'w-6 h-6',
    text: 'text-base',
    textSm: 'text-sm',
    textLg: 'text-lg',
    title: 'text-lg font-semibold',
    subtitle: 'text-base',
    button: 'p-2.5 rounded-lg',
    buttonSm: 'p-2 rounded-md',
    padding: 'p-5',
    gap: 'gap-2',
    logo: 'w-10 h-10',
  },
};

// Size-based numeric values for SVG/canvas
const SIZE_VALUES: Record<ChartSizeCategory, ChartResponsiveValues> = {
  xs: {
    iconSize: 10,
    iconSizeSm: 8,
    iconSizeLg: 12,
    strokeWidth: 1,
    pointRadius: 2,
    fontSize: 9,
    fontSizeSm: 8,
    fontSizeLg: 10,
    padding: 6,
    gap: 2,
    logoWidth: 16,
    logoHeight: 16,
  },
  sm: {
    iconSize: 12,
    iconSizeSm: 10,
    iconSizeLg: 14,
    strokeWidth: 1.5,
    pointRadius: 3,
    fontSize: 10,
    fontSizeSm: 9,
    fontSizeLg: 11,
    padding: 8,
    gap: 2,
    logoWidth: 20,
    logoHeight: 20,
  },
  md: {
    iconSize: 14,
    iconSizeSm: 12,
    iconSizeLg: 16,
    strokeWidth: 2,
    pointRadius: 4,
    fontSize: 12,
    fontSizeSm: 10,
    fontSizeLg: 14,
    padding: 12,
    gap: 4,
    logoWidth: 24,
    logoHeight: 24,
  },
  lg: {
    iconSize: 16,
    iconSizeSm: 14,
    iconSizeLg: 20,
    strokeWidth: 2,
    pointRadius: 5,
    fontSize: 14,
    fontSizeSm: 12,
    fontSizeLg: 16,
    padding: 16,
    gap: 6,
    logoWidth: 32,
    logoHeight: 32,
  },
  xl: {
    iconSize: 20,
    iconSizeSm: 16,
    iconSizeLg: 24,
    strokeWidth: 2.5,
    pointRadius: 6,
    fontSize: 16,
    fontSizeSm: 14,
    fontSizeLg: 18,
    padding: 20,
    gap: 8,
    logoWidth: 40,
    logoHeight: 40,
  },
};

/**
 * Determine size category based on width
 */
function getSizeCategory(width: number, breakpoints: ChartSizeBreakpoints): ChartSizeCategory {
  if (width >= breakpoints.xl) return 'xl';
  if (width >= breakpoints.lg) return 'lg';
  if (width >= breakpoints.md) return 'md';
  if (width >= breakpoints.sm) return 'sm';
  return 'xs';
}

/**
 * Hook to get responsive sizing based on chart container dimensions
 */
export function useChartResponsive(
  breakpoints: Partial<ChartSizeBreakpoints> = {}
): ChartResponsiveResult {
  const ref = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 300 });
  
  const mergedBreakpoints = useMemo(() => ({
    ...DEFAULT_BREAKPOINTS,
    ...breakpoints,
  }), [breakpoints]);
  
  // Observe container size changes
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });
    
    observer.observe(element);
    
    // Initial measurement
    const { width, height } = element.getBoundingClientRect();
    setDimensions({ width, height });
    
    return () => observer.disconnect();
  }, []);
  
  const size = useMemo(
    () => getSizeCategory(dimensions.width, mergedBreakpoints),
    [dimensions.width, mergedBreakpoints]
  );
  
  return {
    ref,
    size,
    width: dimensions.width,
    height: dimensions.height,
    classes: SIZE_CLASSES[size],
    values: SIZE_VALUES[size],
    isCompact: size === 'xs' || size === 'sm',
    isExpanded: size === 'lg' || size === 'xl',
  };
}

/**
 * Get responsive classes directly without a ref (for when container size is known)
 */
export function getChartResponsiveClasses(width: number): ChartResponsiveClasses {
  const size = getSizeCategory(width, DEFAULT_BREAKPOINTS);
  return SIZE_CLASSES[size];
}

/**
 * Get responsive values directly without a ref
 */
export function getChartResponsiveValues(width: number): ChartResponsiveValues {
  const size = getSizeCategory(width, DEFAULT_BREAKPOINTS);
  return SIZE_VALUES[size];
}

/**
 * Get size category from width
 */
export function getChartSizeCategory(width: number): ChartSizeCategory {
  return getSizeCategory(width, DEFAULT_BREAKPOINTS);
}

export { SIZE_CLASSES, SIZE_VALUES, DEFAULT_BREAKPOINTS };
