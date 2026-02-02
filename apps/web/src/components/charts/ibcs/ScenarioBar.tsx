/**
 * ScenarioBar - IBCS-Compliant Bar Component
 * 
 * Renders bars with correct IBCS styling based on scenario type:
 * - Actual (AC): Solid filled dark bar
 * - Plan (PL): Outline only (transparent fill with stroke)
 * - Forecast (FC): Hatched/dashed pattern
 * - Prior Year (PY): Light gray, smaller
 * 
 * Features:
 * - Correct IBCS notation
 * - Hover states
 * - Animation support
 * - Dark mode compatible
 */

import { memo, useMemo } from 'react';
import { useI18n } from '../../../lib/i18n';
import { IBCSColors, getBarProps, IBCSAbbreviations, type IBCSScenario } from '../../../lib/ibcs';

// =====================================================
// TYPES
// =====================================================

export interface ScenarioBarProps {
  /** X position */
  x: number;
  /** Y position (top of bar) */
  y: number;
  /** Bar width */
  width: number;
  /** Bar height */
  height: number;
  /** Scenario type */
  scenario: IBCSScenario;
  /** Whether bar is hovered */
  isHovered?: boolean;
  /** Whether to use dark mode colors */
  isDark?: boolean;
  /** Corner radius */
  radius?: number;
  /** Click handler */
  onClick?: () => void;
  /** Hover handlers */
  onMouseEnter?: (e: React.MouseEvent) => void;
  onMouseLeave?: () => void;
  /** Optional label to show on bar */
  label?: string;
  /** Optional CSS class */
  className?: string;
  /** Data attribute for testing */
  testId?: string;
}

// =====================================================
// COMPONENT
// =====================================================

export const ScenarioBar = memo(function ScenarioBar({
  x,
  y,
  width,
  height,
  scenario,
  isHovered = false,
  isDark = false,
  radius = 2,
  onClick,
  onMouseEnter,
  onMouseLeave,
  label,
  className = '',
  testId,
}: ScenarioBarProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  // Get bar styling props based on scenario
  const barProps = useMemo(() => getBarProps(scenario, isDark), [scenario, isDark]);
  
  // Hover enhancement
  const hoverScale = isHovered ? 1.02 : 1;
  const hoverOpacity = isHovered ? 1 : (scenario === 'priorYear' ? 0.6 : 0.9);

  // Calculate label position
  const labelY = y + height / 2;
  const labelX = x + width / 2;
  
  // Accessibility labels
  const scenarioLabels: Record<IBCSScenario, { en: string; fr: string }> = {
    actual: { en: 'Actual', fr: 'Réel' },
    plan: { en: 'Plan', fr: 'Plan' },
    forecast: { en: 'Forecast', fr: 'Prévision' },
    priorYear: { en: 'Prior Year', fr: 'Année précédente' },
  };
  const scenarioLabel = scenarioLabels[scenario][isEn ? 'en' : 'fr'];
  const ariaLabel = `${scenarioLabel}: ${label || IBCSAbbreviations[scenario]}`;

  return (
    <g
      className={`scenario-bar ${className}`}
      data-testid={testId}
      data-scenario={scenario}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      role="graphics-symbol"
      aria-label={ariaLabel}
      aria-roledescription={isEn ? 'scenario bar' : 'barre de scénario'}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      <title>{scenarioLabel}</title>
      <desc>{isEn ? `${scenarioLabel} value bar` : `Barre de valeur ${scenarioLabel.toLowerCase()}`}</desc>
      {/* Background hover highlight */}
      {isHovered && (
        <rect
          x={x - 2}
          y={y - 2}
          width={width + 4}
          height={height + 4}
          fill={`${IBCSColors.actual}10`}
          rx={radius + 2}
        />
      )}
      
      {/* Main bar */}
      <rect
        x={x}
        y={y}
        width={width}
        height={Math.max(height, 2)} // Minimum height for visibility
        rx={radius}
        {...barProps}
        opacity={hoverOpacity}
        style={{
          transform: `scaleY(${hoverScale})`,
          transformOrigin: `${x + width / 2}px ${y + height}px`,
          transition: 'all 0.15s ease',
        }}
      />
      
      {/* Optional label on bar */}
      {label && height > 20 && (
        <text
          x={labelX}
          y={labelY}
          fontSize="10"
          fontFamily="ui-monospace, monospace"
          fill={scenario === 'actual' ? 'white' : IBCSColors.actual}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ pointerEvents: 'none' }}
        >
          {label}
        </text>
      )}
    </g>
  );
});

// =====================================================
// PAIRED BARS (AC | PL side-by-side)
// =====================================================

export interface PairedScenarioBarsProps {
  /** Base X position */
  x: number;
  /** Y position of actual value */
  actualY: number;
  /** Y position of plan value */
  planY: number;
  /** Total width for both bars */
  totalWidth: number;
  /** Base Y (usually 0 line or bottom) */
  baseY: number;
  /** Hovered bar */
  hoveredBar?: 'actual' | 'plan' | null;
  /** Whether to use dark mode colors */
  isDark?: boolean;
  /** Corner radius */
  radius?: number;
  /** Hover handlers */
  onHover?: (bar: 'actual' | 'plan' | null) => void;
  /** Click handler */
  onClick?: (bar: 'actual' | 'plan') => void;
  /** Optional CSS class */
  className?: string;
}

/**
 * Paired AC|PL bars for IBCS side-by-side comparison
 */
export function PairedScenarioBars({
  x,
  actualY,
  planY,
  totalWidth,
  baseY,
  hoveredBar = null,
  isDark = false,
  radius = 2,
  onHover,
  onClick,
  className = '',
}: PairedScenarioBarsProps) {
  // Calculate bar widths and positions
  const gap = totalWidth * 0.1;
  const barWidth = (totalWidth - gap) / 2;
  
  const actualX = x;
  const planX = x + barWidth + gap;
  
  // Calculate bar heights (from value to base)
  const actualHeight = Math.abs(baseY - actualY);
  const planHeight = Math.abs(baseY - planY);
  
  // Calculate top positions
  const actualTop = Math.min(actualY, baseY);
  const planTop = Math.min(planY, baseY);

  return (
    <g className={`paired-scenario-bars ${className}`}>
      {/* Actual bar */}
      <ScenarioBar
        x={actualX}
        y={actualTop}
        width={barWidth}
        height={actualHeight}
        scenario="actual"
        isHovered={hoveredBar === 'actual'}
        isDark={isDark}
        radius={radius}
        onMouseEnter={() => onHover?.('actual')}
        onMouseLeave={() => onHover?.(null)}
        onClick={() => onClick?.('actual')}
      />
      
      {/* Plan bar */}
      <ScenarioBar
        x={planX}
        y={planTop}
        width={barWidth}
        height={planHeight}
        scenario="plan"
        isHovered={hoveredBar === 'plan'}
        isDark={isDark}
        radius={radius}
        onMouseEnter={() => onHover?.('plan')}
        onMouseLeave={() => onHover?.(null)}
        onClick={() => onClick?.('plan')}
      />
    </g>
  );
}

// =====================================================
// HORIZONTAL SCENARIO BAR (for tables)
// =====================================================

export interface HorizontalScenarioBarProps {
  /** Actual value (0-100 as percentage of max) */
  actualPct: number;
  /** Plan value (0-100 as percentage of max) */
  planPct: number;
  /** Bar height */
  height?: number;
  /** Whether to use dark mode colors */
  isDark?: boolean;
  /** Optional CSS class */
  className?: string;
}

/**
 * Horizontal AC|PL bar for use in tables and cards
 */
export function HorizontalScenarioBar({
  actualPct,
  planPct,
  height = 8,
  isDark = false,
  className = '',
}: HorizontalScenarioBarProps) {
  const actualColor = isDark ? IBCSColors.dark.actual : IBCSColors.actual;
  const planColor = isDark ? IBCSColors.dark.planStroke : IBCSColors.planStroke;

  return (
    <div className={`relative w-full ${className}`} style={{ height }}>
      {/* Plan bar (background) */}
      <div
        className="absolute top-0 left-0 h-full rounded-full"
        style={{
          width: `${Math.min(100, Math.max(0, planPct))}%`,
          backgroundColor: `${planColor}30`,
          border: `1px solid ${planColor}`,
        }}
      />
      
      {/* Actual bar (foreground) */}
      <div
        className="absolute top-0 left-0 h-full rounded-full transition-all duration-300"
        style={{
          width: `${Math.min(100, Math.max(0, actualPct))}%`,
          backgroundColor: actualColor,
        }}
      />
    </div>
  );
}

export default ScenarioBar;
