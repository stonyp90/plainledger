/**
 * VariancePin - IBCS Lollipop Variance Indicator
 * 
 * The signature IBCS element for showing percentage variances.
 * A vertical line connecting actual to plan with a circle (pin) at the end.
 * 
 * Features:
 * - Context-aware coloring (green=favorable, red=unfavorable)
 * - Percentage label
 * - Responsive sizing
 * - Bilingual support (EN/FR)
 */

import { useI18n } from '../../../lib/i18n';
import { IBCSColors, type VarianceStatus } from '../../../lib/ibcs';

// =====================================================
// TYPES
// =====================================================

export interface VariancePinProps {
  /** X position for the pin center */
  x: number;
  /** Y position of actual value */
  actualY: number;
  /** Y position of plan value */
  planY: number;
  /** Variance percentage (e.g., 12.5 for +12.5%) */
  variancePct: number;
  /** Whether the variance is favorable */
  favorable: boolean;
  /** Variance status for styling */
  status?: VarianceStatus;
  /** Whether to show the percentage label */
  showLabel?: boolean;
  /** Pin radius */
  pinRadius?: number;
  /** Line stroke width */
  strokeWidth?: number;
  /** Label font size */
  fontSize?: number;
  /** Optional CSS class */
  className?: string;
  /** Data attribute for testing */
  testId?: string;
}

// =====================================================
// COMPONENT
// =====================================================

export function VariancePin({
  x,
  actualY,
  planY,
  variancePct,
  favorable,
  status,
  showLabel = true,
  pinRadius = 4,
  strokeWidth = 2,
  fontSize = 9,
  className = '',
  testId,
}: VariancePinProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  // Get color based on favorability and status
  const getColor = (): string => {
    if (status === 'neutral') {
      return IBCSColors.variance.neutral;
    }
    if (status === 'critical' && !favorable) {
      return IBCSColors.variance.unfavorable;
    }
    return favorable 
      ? IBCSColors.variance.favorable 
      : IBCSColors.variance.unfavorable;
  };

  const color = getColor();
  
  // Pin goes at the "better" end (top for positive variance)
  const pinY = variancePct >= 0 ? Math.min(actualY, planY) : Math.max(actualY, planY);
  
  // Label position (offset from the line)
  const labelX = x + pinRadius + 4;
  const labelY = (actualY + planY) / 2;
  
  // Format percentage with sign
  const formattedPct = `${variancePct >= 0 ? '+' : ''}${variancePct.toFixed(0)}%`;
  
  // Accessibility labels
  const varianceLabel = favorable 
    ? (isEn ? 'Favorable variance' : 'Écart favorable')
    : (isEn ? 'Unfavorable variance' : 'Écart défavorable');
  const ariaLabel = `${varianceLabel}: ${formattedPct}`;
  const description = isEn 
    ? `Variance of ${formattedPct} from plan`
    : `Écart de ${formattedPct} par rapport au plan`;

  // Skip rendering if there's no meaningful variance
  if (Math.abs(actualY - planY) < 1) {
    return null;
  }

  return (
    <g 
      className={`variance-pin ${className}`}
      data-testid={testId}
      data-favorable={favorable}
      data-variance-pct={variancePct}
      role="graphics-symbol"
      aria-label={ariaLabel}
      aria-roledescription={isEn ? 'variance indicator' : 'indicateur d\'écart'}
      tabIndex={0}
    >
      <title>{varianceLabel}</title>
      <desc>{description}</desc>
      {/* Vertical line connecting actual to plan */}
      <line
        x1={x}
        y1={actualY}
        x2={x}
        y2={planY}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      
      {/* Circle (pin) at the better end */}
      <circle
        cx={x}
        cy={pinY}
        r={pinRadius}
        fill={color}
      />
      
      {/* Percentage label */}
      {showLabel && (
        <text
          x={labelX}
          y={labelY}
          fontSize={fontSize}
          fill={color}
          fontFamily="ui-monospace, monospace"
          fontWeight="600"
          dominantBaseline="middle"
        >
          {formattedPct}
        </text>
      )}
    </g>
  );
}

// =====================================================
// COMPACT VARIANT
// =====================================================

export interface VariancePinCompactProps {
  /** Variance percentage */
  variancePct: number;
  /** Whether the variance is favorable */
  favorable: boolean;
  /** Height of the pin */
  height?: number;
  /** Optional CSS class */
  className?: string;
}

/**
 * Compact inline variance pin for use in KPI cards and tables
 */
export function VariancePinCompact({
  variancePct,
  favorable,
  height = 16,
  className = '',
}: VariancePinCompactProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const color = favorable 
    ? IBCSColors.variance.favorable 
    : IBCSColors.variance.unfavorable;
  
  const formattedPct = `${variancePct >= 0 ? '+' : ''}${variancePct.toFixed(0)}%`;
  const pinRadius = 3;
  const strokeWidth = 1.5;
  
  const varianceLabel = favorable 
    ? (isEn ? 'Favorable variance' : 'Écart favorable')
    : (isEn ? 'Unfavorable variance' : 'Écart défavorable');
  const ariaLabel = `${varianceLabel}: ${formattedPct}`;

  return (
    <span 
      className={`inline-flex items-center gap-1 ${className}`}
      data-favorable={favorable}
      role="img"
      aria-label={ariaLabel}
    >
      <svg 
        width={pinRadius * 2 + 4} 
        height={height} 
        viewBox={`0 0 ${pinRadius * 2 + 4} ${height}`}
        role="graphics-symbol"
        aria-hidden="true"
      >
        <title>{varianceLabel}</title>
        {/* Vertical line */}
        <line
          x1={pinRadius + 2}
          y1={2}
          x2={pinRadius + 2}
          y2={height - 2}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Pin at top */}
        <circle
          cx={pinRadius + 2}
          cy={variancePct >= 0 ? pinRadius + 2 : height - pinRadius - 2}
          r={pinRadius}
          fill={color}
        />
      </svg>
      <span 
        className="text-xs font-mono font-semibold"
        style={{ color }}
      >
        {formattedPct}
      </span>
    </span>
  );
}

export default VariancePin;
