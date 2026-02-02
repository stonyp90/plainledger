/**
 * IBCSHeader - Standard IBCS Chart Header
 * 
 * Displays the standard IBCS header with scenario columns:
 * - Chart title
 * - Scenario column headers (AC, PL, ΔPL, ΔPL%)
 * - Bilingual support (EN/FR)
 */

import { useI18n } from '../../../lib/i18n';
import { IBCSAbbreviations } from '../../../lib/ibcs';

// =====================================================
// TYPES
// =====================================================

export interface IBCSHeaderColumn {
  /** Column key */
  key: string;
  /** English label */
  labelEn: string;
  /** French label */
  labelFr: string;
  /** IBCS abbreviation (e.g., 'AC', 'PL', 'ΔPL') */
  abbreviation?: string;
  /** Column width */
  width?: string;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
}

export interface IBCSHeaderProps {
  /** Chart title */
  title: string;
  /** Chart title in English (if different) */
  titleEn?: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Subtitle in English */
  subtitleEn?: string;
  /** Columns to display */
  columns?: IBCSHeaderColumn[];
  /** Whether to show standard IBCS columns (AC, PL, ΔPL, ΔPL%) */
  showStandardColumns?: boolean;
  /** Whether to show prior year columns */
  showPriorYear?: boolean;
  /** Optional CSS class */
  className?: string;
}

// =====================================================
// DEFAULT COLUMNS
// =====================================================

const STANDARD_COLUMNS: IBCSHeaderColumn[] = [
  {
    key: 'actual',
    labelEn: 'Actual',
    labelFr: 'Réel',
    abbreviation: IBCSAbbreviations.actual,
    width: '80px',
    align: 'right',
  },
  {
    key: 'plan',
    labelEn: 'Plan',
    labelFr: 'Plan',
    abbreviation: IBCSAbbreviations.plan,
    width: '80px',
    align: 'right',
  },
  {
    key: 'variance',
    labelEn: 'Variance',
    labelFr: 'Écart',
    abbreviation: IBCSAbbreviations.variancePlan,
    width: '80px',
    align: 'right',
  },
  {
    key: 'variancePct',
    labelEn: 'Var %',
    labelFr: 'Écart %',
    abbreviation: IBCSAbbreviations.variancePlanPercent,
    width: '60px',
    align: 'right',
  },
];

const PRIOR_YEAR_COLUMNS: IBCSHeaderColumn[] = [
  {
    key: 'priorYear',
    labelEn: 'Prior Year',
    labelFr: 'An préc.',
    abbreviation: IBCSAbbreviations.priorYear,
    width: '80px',
    align: 'right',
  },
  {
    key: 'variancePy',
    labelEn: 'YoY',
    labelFr: 'A/A',
    abbreviation: IBCSAbbreviations.variancePriorYearPercent,
    width: '60px',
    align: 'right',
  },
];

// =====================================================
// COMPONENT
// =====================================================

export function IBCSHeader({
  title,
  titleEn,
  subtitle,
  subtitleEn,
  columns,
  showStandardColumns = true,
  showPriorYear = false,
  className = '',
}: IBCSHeaderProps) {
  const { language } = useI18n();
  const isEn = language === 'en';

  // Build column list
  const displayColumns: IBCSHeaderColumn[] = columns || [
    ...(showStandardColumns ? STANDARD_COLUMNS : []),
    ...(showPriorYear ? PRIOR_YEAR_COLUMNS : []),
  ];

  return (
    <div 
      className={`ibcs-header ${className}`}
      data-testid="ibcs-header"
      role="banner"
      aria-label={isEn ? 'Chart header' : 'En-tête du graphique'}
    >
      {/* Title row */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex-1 min-w-0">
          <h3 
            className="font-semibold text-base truncate"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {isEn && titleEn ? titleEn : title}
          </h3>
          {(subtitle || subtitleEn) && (
            <p 
              className="text-sm truncate"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {isEn && subtitleEn ? subtitleEn : subtitle}
            </p>
          )}
        </div>
        
        {/* Column headers */}
        {displayColumns.length > 0 && (
          <div className="flex items-center gap-1">
            {displayColumns.map((col) => (
              <div
                key={col.key}
                className="text-xs font-mono font-medium px-1"
                style={{
                  width: col.width,
                  textAlign: col.align || 'right',
                  color: 'rgb(var(--color-text-muted))',
                }}
                title={isEn ? col.labelEn : col.labelFr}
              >
                {col.abbreviation || (isEn ? col.labelEn : col.labelFr)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================
// SIMPLE HEADER (title only)
// =====================================================

export interface IBCSSimpleHeaderProps {
  /** Chart title */
  title: string;
  /** Chart title in English */
  titleEn?: string;
  /** Optional right-side content */
  rightContent?: React.ReactNode;
  /** Optional CSS class */
  className?: string;
}

/**
 * Simple IBCS header with just title and optional right content
 */
export function IBCSSimpleHeader({
  title,
  titleEn,
  rightContent,
  className = '',
}: IBCSSimpleHeaderProps) {
  const { language } = useI18n();
  const isEn = language === 'en';

  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      <h3 
        className="font-semibold text-base"
        style={{ color: 'rgb(var(--color-text))' }}
      >
        {isEn && titleEn ? titleEn : title}
      </h3>
      {rightContent}
    </div>
  );
}

// =====================================================
// COLUMN HEADER ROW (for tables)
// =====================================================

export interface IBCSColumnHeaderRowProps {
  /** Columns to display */
  columns: IBCSHeaderColumn[];
  /** First column label */
  rowLabel?: string;
  /** First column label in English */
  rowLabelEn?: string;
  /** Optional CSS class */
  className?: string;
}

/**
 * Standalone column header row for IBCS tables
 */
export function IBCSColumnHeaderRow({
  columns,
  rowLabel = 'Category',
  rowLabelEn,
  className = '',
}: IBCSColumnHeaderRowProps) {
  const { language } = useI18n();
  const isEn = language === 'en';

  return (
    <div 
      className={`flex items-center gap-2 py-2 border-b ${className}`}
      style={{ 
        borderColor: 'rgb(var(--color-border))',
        backgroundColor: 'rgb(var(--color-bg-muted))',
      }}
    >
      {/* Row label column */}
      <div 
        className="flex-1 text-xs font-medium px-3"
        style={{ color: 'rgb(var(--color-text-muted))' }}
      >
        {isEn && rowLabelEn ? rowLabelEn : rowLabel}
      </div>
      
      {/* Data columns */}
      {columns.map((col) => (
        <div
          key={col.key}
          className="text-xs font-mono font-medium px-2"
          style={{
            width: col.width || '80px',
            textAlign: col.align || 'right',
            color: 'rgb(var(--color-text-muted))',
          }}
        >
          {col.abbreviation || (isEn ? col.labelEn : col.labelFr)}
        </div>
      ))}
    </div>
  );
}

export default IBCSHeader;
