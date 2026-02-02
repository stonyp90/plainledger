/**
 * IBCSLegend - Standard IBCS Chart Legend
 * 
 * Displays the standard IBCS notation legend with:
 * - Scenario indicators (AC, PL, FC, PY)
 * - Variance pin indicator
 * - Bilingual support (EN/FR)
 */

import { useI18n } from '../../../lib/i18n';
import { IBCSColors, IBCSAbbreviations, IBCSLabels } from '../../../lib/ibcs';

// =====================================================
// TYPES
// =====================================================

export interface IBCSLegendProps {
  /** Which scenario indicators to show */
  showScenarios?: ('actual' | 'plan' | 'forecast' | 'priorYear')[];
  /** Whether to show variance indicator */
  showVariance?: boolean;
  /** Whether to show benchmark indicator */
  showBenchmark?: boolean;
  /** Layout direction */
  direction?: 'horizontal' | 'vertical';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Optional CSS class */
  className?: string;
}

// =====================================================
// LEGEND ITEM COMPONENT
// =====================================================

interface LegendItemProps {
  type: 'actual' | 'plan' | 'forecast' | 'priorYear' | 'variance' | 'benchmark';
  label: string;
  abbreviation: string;
  size: 'sm' | 'md' | 'lg';
}

function LegendItem({ type, label, abbreviation, size }: LegendItemProps) {
  const sizeClasses = {
    sm: { box: 'w-3 h-3', text: 'text-[10px]' },
    md: { box: 'w-4 h-4', text: 'text-xs' },
    lg: { box: 'w-5 h-5', text: 'text-sm' },
  };

  const { box, text } = sizeClasses[size];

  // Render different indicator shapes based on type
  const renderIndicator = () => {
    switch (type) {
      case 'actual':
        return (
          <div
            className={`${box} rounded`}
            style={{ backgroundColor: IBCSColors.actual }}
          />
        );
      
      case 'plan':
        return (
          <div
            className={`${box} rounded`}
            style={{
              backgroundColor: 'transparent',
              border: `2px solid ${IBCSColors.planStroke}`,
            }}
          />
        );
      
      case 'forecast':
        return (
          <div
            className={`${box} rounded`}
            style={{
              backgroundColor: 'transparent',
              border: `2px dashed ${IBCSColors.forecast}`,
            }}
          />
        );
      
      case 'priorYear':
        return (
          <div
            className={`${box} rounded opacity-60`}
            style={{ backgroundColor: IBCSColors.priorYear }}
          />
        );
      
      case 'variance':
        return (
          <svg className={box} viewBox="0 0 16 16">
            <line
              x1="8"
              y1="2"
              x2="8"
              y2="14"
              stroke={IBCSColors.variance.favorable}
              strokeWidth="2"
            />
            <circle
              cx="8"
              cy="2"
              r="3"
              fill={IBCSColors.variance.favorable}
            />
          </svg>
        );
      
      case 'benchmark':
        return (
          <div
            className={`${box} flex items-center justify-center`}
          >
            <div
              className="w-full h-0.5"
              style={{
                backgroundColor: IBCSColors.benchmark,
                borderStyle: 'dashed',
              }}
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      {renderIndicator()}
      <span 
        className={`${text} font-medium`}
        style={{ color: 'rgb(var(--color-text-muted))' }}
      >
        <span className="font-mono">{abbreviation}</span>
        <span className="ml-1 opacity-75">({label})</span>
      </span>
    </div>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export function IBCSLegend({
  showScenarios = ['actual', 'plan'],
  showVariance = true,
  showBenchmark = false,
  direction = 'horizontal',
  size = 'sm',
  className = '',
}: IBCSLegendProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const labels = isEn ? IBCSLabels.en : IBCSLabels.fr;

  const containerClass = direction === 'horizontal'
    ? 'flex items-center gap-4 flex-wrap'
    : 'flex flex-col gap-2';

  return (
    <div 
      className={`${containerClass} ${className}`}
      role="group"
      aria-label={isEn ? 'Chart legend' : 'Légende du graphique'}
    >
      {/* Scenario indicators */}
      {showScenarios.includes('actual') && (
        <LegendItem
          type="actual"
          label={labels.actual}
          abbreviation={IBCSAbbreviations.actual}
          size={size}
        />
      )}
      
      {showScenarios.includes('plan') && (
        <LegendItem
          type="plan"
          label={labels.plan}
          abbreviation={IBCSAbbreviations.plan}
          size={size}
        />
      )}
      
      {showScenarios.includes('forecast') && (
        <LegendItem
          type="forecast"
          label={labels.forecast}
          abbreviation={IBCSAbbreviations.forecast}
          size={size}
        />
      )}
      
      {showScenarios.includes('priorYear') && (
        <LegendItem
          type="priorYear"
          label={labels.priorYear}
          abbreviation={IBCSAbbreviations.priorYear}
          size={size}
        />
      )}
      
      {/* Variance indicator */}
      {showVariance && (
        <LegendItem
          type="variance"
          label={labels.variance}
          abbreviation={IBCSAbbreviations.variancePlanPercent}
          size={size}
        />
      )}
      
      {/* Benchmark indicator */}
      {showBenchmark && (
        <LegendItem
          type="benchmark"
          label={isEn ? 'Benchmark' : 'Référence'}
          abbreviation="BM"
          size={size}
        />
      )}
    </div>
  );
}

// =====================================================
// COMPACT LEGEND (inline)
// =====================================================

export interface IBCSLegendCompactProps {
  /** Optional CSS class */
  className?: string;
}

/**
 * Compact inline legend showing just abbreviations
 */
export function IBCSLegendCompact({ className = '' }: IBCSLegendCompactProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  return (
    <div 
      className={`flex items-center gap-2 text-[10px] font-mono ${className}`}
      style={{ color: 'rgb(var(--color-text-muted))' }}
      role="group"
      aria-label={isEn ? 'IBCS legend' : 'Légende IBCS'}
    >
      <span className="flex items-center gap-1">
        <span 
          className="w-2 h-2 rounded"
          style={{ backgroundColor: IBCSColors.actual }}
        />
        AC
      </span>
      <span className="flex items-center gap-1">
        <span 
          className="w-2 h-2 rounded"
          style={{ 
            backgroundColor: 'transparent',
            border: `1px solid ${IBCSColors.planStroke}`,
          }}
        />
        PL
      </span>
      <span className="flex items-center gap-1">
        <span 
          className="w-2 h-1"
          style={{ backgroundColor: IBCSColors.variance.favorable }}
        />
        ΔPL
      </span>
    </div>
  );
}

export default IBCSLegend;
