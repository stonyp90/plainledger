/**
 * IBCS Notation System
 * 
 * Bar styles and visual notation following IBCS standards:
 * - Solid bars for Actual (AC)
 * - Outline bars for Plan (PL)
 * - Hatched/dashed bars for Forecast (FC)
 * - Light gray for Prior Year (PY)
 */

import { IBCSColors, type IBCSScenario } from './theme';

/**
 * SVG style properties for scenario bars
 */
export interface BarStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  opacity?: number;
}

/**
 * Get bar style for a given scenario
 * 
 * @param scenario - The IBCS scenario type
 * @param isDark - Whether dark mode is active
 * @returns SVG style properties for the bar
 */
export function getBarStyle(scenario: IBCSScenario, isDark = false): BarStyle {
  switch (scenario) {
    case 'actual':
      return {
        fill: isDark ? IBCSColors.dark.actual : IBCSColors.actual,
        stroke: 'none',
        strokeWidth: 0,
      };
    
    case 'plan':
      return {
        fill: 'transparent',
        stroke: isDark ? IBCSColors.dark.planStroke : IBCSColors.planStroke,
        strokeWidth: 2,
      };
    
    case 'forecast':
      return {
        fill: 'transparent',
        stroke: IBCSColors.forecast,
        strokeWidth: 2,
        strokeDasharray: '4,2',
      };
    
    case 'priorYear':
      return {
        fill: IBCSColors.priorYear,
        stroke: 'none',
        strokeWidth: 0,
        opacity: 0.6,
      };
    
    default:
      return {
        fill: IBCSColors.actual,
        stroke: 'none',
        strokeWidth: 0,
      };
  }
}

/**
 * Get SVG props object for a scenario bar
 * 
 * @param scenario - The IBCS scenario type
 * @param isDark - Whether dark mode is active
 * @returns Object with SVG props
 */
export function getBarProps(
  scenario: IBCSScenario,
  isDark = false
): Record<string, string | number> {
  const style = getBarStyle(scenario, isDark);
  const props: Record<string, string | number> = {
    fill: style.fill,
    'data-scenario': scenario,
  };
  
  if (style.stroke !== 'none') {
    props.stroke = style.stroke;
    props.strokeWidth = style.strokeWidth;
  }
  
  if (style.strokeDasharray) {
    props.strokeDasharray = style.strokeDasharray;
  }
  
  if (style.opacity !== undefined) {
    props.opacity = style.opacity;
  }
  
  return props;
}

/**
 * Variance bar notation styles
 */
export interface VarianceBarStyle {
  positive: {
    fill: string;
    stroke: string;
  };
  negative: {
    fill: string;
    stroke: string;
  };
}

/**
 * Get variance bar styles (for waterfall charts)
 */
export function getVarianceBarStyles(): VarianceBarStyle {
  return {
    positive: {
      fill: IBCSColors.variance.favorable,
      stroke: 'none',
    },
    negative: {
      fill: IBCSColors.variance.unfavorable,
      stroke: 'none',
    },
  };
}

/**
 * Legend item configuration
 */
export interface LegendItem {
  label: string;
  labelFr: string;
  scenario: IBCSScenario | 'variance';
  style: BarStyle | 'pin';
}

/**
 * Standard IBCS legend items
 */
export const IBCSLegendItems: LegendItem[] = [
  {
    label: 'Actual',
    labelFr: 'Réel',
    scenario: 'actual',
    style: getBarStyle('actual'),
  },
  {
    label: 'Plan',
    labelFr: 'Plan',
    scenario: 'plan',
    style: getBarStyle('plan'),
  },
  {
    label: 'Forecast',
    labelFr: 'Prévision',
    scenario: 'forecast',
    style: getBarStyle('forecast'),
  },
  {
    label: 'Variance',
    labelFr: 'Écart',
    scenario: 'variance',
    style: 'pin',
  },
];

/**
 * Create SVG pattern definition for hatched fill (forecast)
 * 
 * @param patternId - Unique ID for the pattern
 * @returns SVG pattern element string
 */
export function createHatchPattern(patternId: string): string {
  return `
    <pattern id="${patternId}" patternUnits="userSpaceOnUse" width="4" height="4">
      <path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" 
            stroke="${IBCSColors.forecast}" 
            strokeWidth="1" />
    </pattern>
  `;
}

/**
 * Bar width configurations for different scenarios
 * Used when showing AC and PL side-by-side
 */
export const BarWidthRatios = {
  /** When showing single scenario */
  single: 1.0,
  /** AC bar when showing AC|PL side-by-side */
  actualInPair: 0.45,
  /** PL bar when showing AC|PL side-by-side */
  planInPair: 0.45,
  /** Gap between AC and PL bars */
  pairGap: 0.1,
  /** PY bar (smaller, shown behind) */
  priorYear: 0.3,
} as const;

/**
 * Calculate bar positions for AC|PL side-by-side layout
 * 
 * @param baseX - Base X position
 * @param totalWidth - Total width available
 * @returns Object with x positions and widths for AC and PL bars
 */
export function calculatePairedBarPositions(
  baseX: number,
  totalWidth: number
): {
  actual: { x: number; width: number };
  plan: { x: number; width: number };
  gap: number;
} {
  const actualWidth = totalWidth * BarWidthRatios.actualInPair;
  const planWidth = totalWidth * BarWidthRatios.planInPair;
  const gap = totalWidth * BarWidthRatios.pairGap;
  
  return {
    actual: {
      x: baseX,
      width: actualWidth,
    },
    plan: {
      x: baseX + actualWidth + gap,
      width: planWidth,
    },
    gap,
  };
}

/**
 * IBCS bar corner radius
 */
export const BarCornerRadius = {
  default: 2,
  small: 1,
  none: 0,
} as const;
