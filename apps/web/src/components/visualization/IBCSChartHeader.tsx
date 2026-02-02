/**
 * IBCSChartHeader Component
 * 
 * IBCS-compliant chart header with:
 * - Message (what the chart shows)
 * - Units and reference (context)
 * - Scenario indicators (AC, PL, FC, PY)
 * - Variance indicators (ΔPL, ΔPY)
 * 
 * Follows IBCS SUCCESS rules for headers:
 * - Say: Message/story
 * - Unify: Consistent notation
 * - Condense: Remove clutter
 * - Check: Ensure integrity
 * 
 * Bilingual support (EN/FR)
 */

import { useI18n } from '../../lib/i18n';
import {
  IBCSAbbreviations,
  IBCSLabels,
  IBCSColors,
} from '../../lib/ibcs/theme';

// =====================================================
// TYPES
// =====================================================

interface IBCSChartHeaderProps {
  title: string;
  titleEn: string;
  subtitle?: string;
  subtitleEn?: string;
  unit?: string;
  unitEn?: string;
  scenarios?: Array<'actual' | 'plan' | 'forecast' | 'priorYear'>;
  showVariance?: 'plan' | 'priorYear' | 'both' | 'none';
  period?: string;
  periodEn?: string;
  compact?: boolean;
}

type IBCSScenario = 'actual' | 'plan' | 'forecast' | 'priorYear';

// =====================================================
// SCENARIO INDICATOR
// =====================================================

function ScenarioIndicator({
  scenario,
  isEn,
  compact = false,
}: {
  scenario: IBCSScenario;
  isEn: boolean;
  compact?: boolean;
}) {
  const config: Record<
    IBCSScenario,
    { abbr: string; color: string; fill: string; border: boolean; pattern?: string }
  > = {
    actual: {
      abbr: IBCSAbbreviations.actual,
      color: IBCSColors.actual,
      fill: IBCSColors.actual,
      border: false,
    },
    plan: {
      abbr: IBCSAbbreviations.plan,
      color: IBCSColors.planStroke,
      fill: 'transparent',
      border: true,
    },
    forecast: {
      abbr: IBCSAbbreviations.forecast,
      color: IBCSColors.forecast,
      fill: IBCSColors.forecast,
      border: false,
      pattern: 'diagonal',
    },
    priorYear: {
      abbr: IBCSAbbreviations.priorYear,
      color: IBCSColors.priorYear,
      fill: IBCSColors.priorYear,
      border: false,
    },
  };

  const { abbr, color, fill, border, pattern } = config[scenario];
  const labels = isEn ? IBCSLabels.en : IBCSLabels.fr;
  const label = labels[scenario as keyof typeof labels];

  return (
    <div className="flex items-center gap-1.5">
      {/* Scenario symbol */}
      <div
        className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} rounded-sm relative`}
        style={{
          backgroundColor: fill,
          border: border ? `2px solid ${color}` : 'none',
        }}
      >
        {pattern === 'diagonal' && (
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 16 16"
          >
            <pattern
              id="ibcs-diagonal"
              patternUnits="userSpaceOnUse"
              width="4"
              height="4"
              patternTransform="rotate(45)"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="4"
                stroke="white"
                strokeWidth="1.5"
              />
            </pattern>
            <rect
              width="16"
              height="16"
              fill="url(#ibcs-diagonal)"
            />
          </svg>
        )}
      </div>

      {/* Abbreviation */}
      <span
        className={`font-mono font-medium ${compact ? 'text-[10px]' : 'text-xs'}`}
        style={{ color }}
      >
        {abbr}
      </span>

      {/* Full label (optional) */}
      {!compact && (
        <span
          className="text-xs"
          style={{ color: 'rgb(var(--color-text-muted))' }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

// =====================================================
// VARIANCE INDICATOR
// =====================================================

function VarianceIndicator({
  type,
  isEn,
  compact = false,
}: {
  type: 'plan' | 'priorYear';
  isEn: boolean;
  compact?: boolean;
}) {
  const abbr =
    type === 'plan'
      ? IBCSAbbreviations.variancePlan
      : IBCSAbbreviations.variancePriorYear;

  return (
    <div className="flex items-center gap-1.5">
      {/* Triangle variance symbol */}
      <div
        className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} flex items-center justify-center`}
      >
        <svg
          viewBox="0 0 16 16"
          className="w-full h-full"
          fill="currentColor"
          style={{ color: IBCSColors.variance.favorable }}
        >
          <polygon points="8,2 14,14 2,14" />
        </svg>
      </div>

      {/* Abbreviation */}
      <span
        className={`font-mono font-medium ${compact ? 'text-[10px]' : 'text-xs'}`}
        style={{ color: 'rgb(var(--color-text-muted))' }}
      >
        {abbr}
      </span>
    </div>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export function IBCSChartHeader({
  title,
  titleEn,
  subtitle,
  subtitleEn,
  unit,
  unitEn,
  scenarios = [],
  showVariance = 'none',
  period,
  periodEn,
  compact = false,
}: IBCSChartHeaderProps) {
  const { language } = useI18n();
  const isEn = language === 'en';

  const displayTitle = isEn ? titleEn : title;
  const displaySubtitle = isEn ? subtitleEn : subtitle;
  const displayUnit = isEn ? unitEn : unit;
  const displayPeriod = isEn ? periodEn : period;

  return (
    <div className={`${compact ? 'mb-2' : 'mb-4'}`}>
      {/* Title row */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {/* Main title - the "message" */}
          <h3
            className={`font-semibold leading-tight ${compact ? 'text-sm' : 'text-base'}`}
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {displayTitle}
          </h3>

          {/* Subtitle/context */}
          {displaySubtitle && (
            <p
              className={`mt-0.5 ${compact ? 'text-[10px]' : 'text-xs'}`}
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {displaySubtitle}
            </p>
          )}
        </div>

        {/* Unit indicator */}
        {displayUnit && (
          <div className="flex-shrink-0 text-right">
            <span
              className={`font-mono ${compact ? 'text-[10px]' : 'text-xs'}`}
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {displayUnit}
            </span>
            {displayPeriod && (
              <span
                className={`block ${compact ? 'text-[9px]' : 'text-[10px]'}`}
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                {displayPeriod}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Legend row - IBCS scenario indicators */}
      {(scenarios.length > 0 || showVariance !== 'none') && (
        <div
          className={`flex items-center flex-wrap gap-3 mt-2 pt-2 border-t`}
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          {/* Scenario indicators */}
          {scenarios.map((scenario) => (
            <ScenarioIndicator
              key={scenario}
              scenario={scenario}
              isEn={isEn}
              compact={compact}
            />
          ))}

          {/* Separator if both scenarios and variance */}
          {scenarios.length > 0 && showVariance !== 'none' && (
            <div
              className="w-px h-4"
              style={{ backgroundColor: 'rgb(var(--color-border))' }}
            />
          )}

          {/* Variance indicators */}
          {(showVariance === 'plan' || showVariance === 'both') && (
            <VarianceIndicator type="plan" isEn={isEn} compact={compact} />
          )}
          {(showVariance === 'priorYear' || showVariance === 'both') && (
            <VarianceIndicator type="priorYear" isEn={isEn} compact={compact} />
          )}
        </div>
      )}
    </div>
  );
}

// =====================================================
// IBCS NOTATION HELPERS
// =====================================================

/**
 * Get IBCS notation for a scenario
 */
export function getIBCSNotation(
  scenario: IBCSScenario,
  isEn: boolean
): { abbr: string; label: string } {
  const labels = isEn ? IBCSLabels.en : IBCSLabels.fr;
  const abbr = IBCSAbbreviations[scenario];
  const label = labels[scenario as keyof typeof labels];
  return { abbr, label };
}

/**
 * Format variance according to IBCS
 */
export function formatIBCSVariance(
  value: number,
  isPercentage: boolean = false
): string {
  const sign = value >= 0 ? '+' : '';
  if (isPercentage) {
    return `${sign}${value.toFixed(1)}%`;
  }
  return `${sign}${value.toLocaleString()}`;
}

/**
 * Get IBCS-compliant axis label
 */
export function getIBCSAxisLabel(
  unit: string,
  scale?: 'K' | 'M' | 'B',
  isEn: boolean = true
): string {
  const scaleLabel = scale ? ` (${scale})` : '';
  return `${unit}${scaleLabel}`;
}

export default IBCSChartHeader;
