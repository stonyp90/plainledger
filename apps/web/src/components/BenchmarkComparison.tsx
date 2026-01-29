/**
 * Benchmark Comparison Component
 *
 * Shows a comprehensive comparison of user metrics against industry benchmarks
 * with visual indicators and recommendations.
 * 
 * Uses theme CSS variables for consistent styling across light/dark modes.
 */

import {
  Minus,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Award,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';

interface QuartileData {
  q1: number;
  median: number;
  q3: number;
}

interface UserMetrics {
  grossMargin: number;
  netMargin: number;
  currentRatio: number;
  debtToEquity: number;
  operatingExpenseRatio: number;
}

interface BenchmarkData {
  grossMargin: QuartileData;
  netMargin: QuartileData;
  currentRatio: number;
  debtToEquity: number;
  operatingExpenseRatio: number;
  wagesToRevenueRatio: number;
  revenueYoY: number;
  sampleSize: number;
}

interface BenchmarkComparisonProps {
  userMetrics: UserMetrics;
  benchmark: BenchmarkData;
  industryName: string;
}

interface MetricComparison {
  id: string;
  name: string;
  nameFr: string;
  userValue: number;
  industryMedian: number;
  percentileRank: number;
  status: 'above' | 'average' | 'below';
  higherIsBetter: boolean;
}

export default function BenchmarkComparison({
  userMetrics,
  benchmark,
  industryName,
}: BenchmarkComparisonProps) {
  const { language } = useI18n();

  // Calculate percentile rank for a metric
  const calculatePercentile = (
    value: number,
    quartile: QuartileData,
    higherIsBetter: boolean
  ): number => {
    let percentile: number;
    const { q1, median, q3 } = quartile;

    if (value <= q1) {
      percentile = (value / q1) * 25;
    } else if (value <= median) {
      percentile = 25 + ((value - q1) / (median - q1)) * 25;
    } else if (value <= q3) {
      percentile = 50 + ((value - median) / (q3 - median)) * 25;
    } else {
      const estimatedMax = q3 + (q3 - median);
      percentile = 75 + Math.min(((value - q3) / (estimatedMax - q3)) * 25, 25);
    }

    percentile = Math.max(0, Math.min(100, percentile));
    return higherIsBetter ? percentile : 100 - percentile;
  };

  // Calculate status from percentile
  const getStatus = (percentile: number): 'above' | 'average' | 'below' => {
    if (percentile >= 60) return 'above';
    if (percentile >= 40) return 'average';
    return 'below';
  };

  // Build metric comparisons
  const comparisons: MetricComparison[] = [
    {
      id: 'gross_margin',
      name: 'Gross Margin',
      nameFr: 'Marge brute',
      userValue: userMetrics.grossMargin,
      industryMedian: benchmark.grossMargin.median,
      percentileRank: calculatePercentile(userMetrics.grossMargin, benchmark.grossMargin, true),
      status: getStatus(calculatePercentile(userMetrics.grossMargin, benchmark.grossMargin, true)),
      higherIsBetter: true,
    },
    {
      id: 'net_margin',
      name: 'Net Margin',
      nameFr: 'Marge nette',
      userValue: userMetrics.netMargin,
      industryMedian: benchmark.netMargin.median,
      percentileRank: calculatePercentile(userMetrics.netMargin, benchmark.netMargin, true),
      status: getStatus(calculatePercentile(userMetrics.netMargin, benchmark.netMargin, true)),
      higherIsBetter: true,
    },
    {
      id: 'current_ratio',
      name: 'Current Ratio',
      nameFr: 'Ratio de liquidité',
      userValue: userMetrics.currentRatio,
      industryMedian: benchmark.currentRatio,
      percentileRank: calculatePercentile(
        userMetrics.currentRatio, 
        { q1: benchmark.currentRatio * 0.7, median: benchmark.currentRatio, q3: benchmark.currentRatio * 1.4 },
        true
      ),
      status: getStatus(calculatePercentile(
        userMetrics.currentRatio,
        { q1: benchmark.currentRatio * 0.7, median: benchmark.currentRatio, q3: benchmark.currentRatio * 1.4 },
        true
      )),
      higherIsBetter: true,
    },
    {
      id: 'debt_to_equity',
      name: 'Debt-to-Equity',
      nameFr: 'Dette/Capitaux propres',
      userValue: userMetrics.debtToEquity,
      industryMedian: benchmark.debtToEquity,
      percentileRank: calculatePercentile(
        userMetrics.debtToEquity,
        { q1: benchmark.debtToEquity * 0.6, median: benchmark.debtToEquity, q3: benchmark.debtToEquity * 1.5 },
        false
      ),
      status: getStatus(calculatePercentile(
        userMetrics.debtToEquity,
        { q1: benchmark.debtToEquity * 0.6, median: benchmark.debtToEquity, q3: benchmark.debtToEquity * 1.5 },
        false
      )),
      higherIsBetter: false,
    },
    {
      id: 'opex_ratio',
      name: 'Operating Expense Ratio',
      nameFr: 'Ratio dépenses d\'exploitation',
      userValue: userMetrics.operatingExpenseRatio,
      industryMedian: benchmark.operatingExpenseRatio,
      percentileRank: calculatePercentile(
        userMetrics.operatingExpenseRatio,
        { q1: benchmark.operatingExpenseRatio * 0.8, median: benchmark.operatingExpenseRatio, q3: benchmark.operatingExpenseRatio * 1.2 },
        false
      ),
      status: getStatus(calculatePercentile(
        userMetrics.operatingExpenseRatio,
        { q1: benchmark.operatingExpenseRatio * 0.8, median: benchmark.operatingExpenseRatio, q3: benchmark.operatingExpenseRatio * 1.2 },
        false
      )),
      higherIsBetter: false,
    },
  ];

  // Calculate overall score
  const overallScore = Math.round(
    comparisons.reduce((sum, c) => sum + c.percentileRank, 0) / comparisons.length
  );

  // Count metrics by status
  const aboveCount = comparisons.filter(c => c.status === 'above').length;
  const belowCount = comparisons.filter(c => c.status === 'below').length;

  // Format percentage
  const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;
  const formatRatio = (value: number): string => value.toFixed(2);

  // Get status icon and styling using theme colors
  const getStatusDisplay = (status: 'above' | 'average' | 'below') => {
    switch (status) {
      case 'above':
        return { 
          icon: CheckCircle, 
          colorStyle: { color: 'rgb(var(--color-success))' },
          bgStyle: { backgroundColor: 'rgb(var(--color-success) / 0.1)' }
        };
      case 'below':
        return { 
          icon: XCircle, 
          colorStyle: { color: 'rgb(var(--color-error))' },
          bgStyle: { backgroundColor: 'rgb(var(--color-error) / 0.1)' }
        };
      default:
        return { 
          icon: Minus, 
          colorStyle: { color: 'rgb(var(--color-warning))' },
          bgStyle: { backgroundColor: 'rgb(var(--color-warning) / 0.1)' }
        };
    }
  };

  // Get score color based on value
  const getScoreColor = (score: number) => {
    if (score >= 60) return 'rgb(var(--color-success))';
    if (score >= 40) return 'rgb(var(--color-warning))';
    return 'rgb(var(--color-error))';
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Overall Score */}
      <div 
        className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 p-4 sm:p-6 rounded-xl"
        style={{ 
          background: 'linear-gradient(to right, rgb(var(--color-primary-50)), rgb(var(--color-primary-100)))',
        }}
      >
        <div className="relative flex-shrink-0">
          <svg className="w-20 h-20 sm:w-24 sm:h-24 transform -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="35%"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              style={{ color: 'rgb(var(--color-border))' }}
            />
            <circle
              cx="50%"
              cy="50%"
              r="35%"
              fill="none"
              strokeWidth="8"
              strokeDasharray={`${(overallScore / 100) * 251.2} 251.2`}
              style={{ stroke: getScoreColor(overallScore) }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl sm:text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>{overallScore}</span>
          </div>
        </div>

        <div className="text-center sm:text-left min-w-0 flex-1">
          <h3 className="text-base sm:text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
            {language === 'fr' ? 'Score global' : 'Overall Score'}
          </h3>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {language === 'fr' 
              ? `Votre entreprise se classe au ${overallScore}e percentile par rapport aux autres entreprises de ${industryName}`
              : `Your business ranks in the ${overallScore}th percentile compared to other ${industryName} businesses`}
          </p>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4 mt-2 text-xs sm:text-sm">
            <span className="flex items-center gap-1" style={{ color: 'rgb(var(--color-success))' }}>
              <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {aboveCount} {language === 'fr' ? 'au-dessus' : 'above avg'}
            </span>
            <span className="flex items-center gap-1" style={{ color: 'rgb(var(--color-error))' }}>
              <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {belowCount} {language === 'fr' ? 'en-dessous' : 'below avg'}
            </span>
          </div>
        </div>
      </div>

      {/* Metric Comparison - Responsive Cards on Mobile, Table on Desktop */}
      <div className="hidden md:block overflow-x-auto -mx-4 sm:mx-0">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr style={{ borderBottom: '1px solid rgb(var(--color-border))' }}>
              <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wider" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {language === 'fr' ? 'Métrique' : 'Metric'}
              </th>
              <th className="text-right py-3 px-4 text-xs font-medium uppercase tracking-wider" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {language === 'fr' ? 'Votre valeur' : 'Your Value'}
              </th>
              <th className="text-right py-3 px-4 text-xs font-medium uppercase tracking-wider" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {language === 'fr' ? 'Médiane' : 'Median'}
              </th>
              <th className="text-center py-3 px-4 text-xs font-medium uppercase tracking-wider" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {language === 'fr' ? 'Percentile' : 'Percentile'}
              </th>
              <th className="text-center py-3 px-4 text-xs font-medium uppercase tracking-wider" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {language === 'fr' ? 'Statut' : 'Status'}
              </th>
            </tr>
          </thead>
          <tbody>
            {comparisons.map((metric, index) => {
              const { icon: StatusIcon, colorStyle, bgStyle } = getStatusDisplay(metric.status);
              const isRatio = metric.id === 'current_ratio' || metric.id === 'debt_to_equity';
              const format = isRatio ? formatRatio : formatPercent;
              const progressColor = metric.status === 'above' 
                ? 'rgb(var(--color-success))' 
                : metric.status === 'below' 
                  ? 'rgb(var(--color-error))' 
                  : 'rgb(var(--color-warning))';

              return (
                <tr 
                  key={metric.id} 
                  className="transition-colors"
                  style={{ 
                    borderBottom: index < comparisons.length - 1 ? '1px solid rgb(var(--color-border-subtle))' : undefined,
                  }}
                >
                  <td className="py-3 px-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                      <span className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                        {language === 'fr' ? metric.nameFr : metric.name}
                      </span>
                      {!metric.higherIsBetter && (
                        <span className="text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>
                          ({language === 'fr' ? 'bas = mieux' : 'lower is better'})
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-mono text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                      {format(metric.userValue)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-mono text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {format(metric.industryMedian)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
                        <div 
                          className="h-full rounded-full transition-all"
                          style={{ width: `${metric.percentileRank}%`, backgroundColor: progressColor }}
                        />
                      </div>
                      <span className="text-xs w-8" style={{ color: 'rgb(var(--color-text-muted))' }}>
                        {Math.round(metric.percentileRank)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span 
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                      style={{ ...bgStyle, ...colorStyle }}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {metric.status === 'above' 
                        ? (language === 'fr' ? 'Supérieur' : 'Above')
                        : metric.status === 'below'
                        ? (language === 'fr' ? 'Inférieur' : 'Below')
                        : (language === 'fr' ? 'Moyen' : 'Average')}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards View */}
      <div className="md:hidden space-y-3">
        {comparisons.map((metric) => {
          const { icon: StatusIcon, colorStyle, bgStyle } = getStatusDisplay(metric.status);
          const isRatio = metric.id === 'current_ratio' || metric.id === 'debt_to_equity';
          const format = isRatio ? formatRatio : formatPercent;
          const progressColor = metric.status === 'above' 
            ? 'rgb(var(--color-success))' 
            : metric.status === 'below' 
              ? 'rgb(var(--color-error))' 
              : 'rgb(var(--color-warning))';

          return (
            <div 
              key={metric.id}
              className="p-3 rounded-lg border"
              style={{ 
                backgroundColor: 'rgb(var(--color-surface))',
                borderColor: 'rgb(var(--color-border))'
              }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                    {language === 'fr' ? metric.nameFr : metric.name}
                  </span>
                  {!metric.higherIsBetter && (
                    <span className="block text-[10px] mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      ({language === 'fr' ? 'bas = mieux' : 'lower is better'})
                    </span>
                  )}
                </div>
                <span 
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0"
                  style={{ ...bgStyle, ...colorStyle }}
                >
                  <StatusIcon className="w-2.5 h-2.5" />
                  {metric.status === 'above' 
                    ? (language === 'fr' ? 'Supérieur' : 'Above')
                    : metric.status === 'below'
                    ? (language === 'fr' ? 'Inférieur' : 'Below')
                    : (language === 'fr' ? 'Moyen' : 'Average')}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-xs mb-2">
                <span style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {language === 'fr' ? 'Vous' : 'You'}: <strong className="font-mono" style={{ color: 'rgb(var(--color-text))' }}>{format(metric.userValue)}</strong>
                </span>
                <span style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {language === 'fr' ? 'Médiane' : 'Median'}: <span className="font-mono">{format(metric.industryMedian)}</span>
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
                  <div 
                    className="h-full rounded-full transition-all"
                    style={{ width: `${metric.percentileRank}%`, backgroundColor: progressColor }}
                  />
                </div>
                <span className="text-[10px] w-7 text-right" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {Math.round(metric.percentileRank)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recommendations */}
      {belowCount > 0 && (
        <div 
          className="p-3 sm:p-4 rounded-xl border"
          style={{
            backgroundColor: 'rgb(var(--color-warning) / 0.05)',
            borderColor: 'rgb(var(--color-warning) / 0.2)'
          }}
        >
          <div className="flex items-start gap-2 sm:gap-3">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 flex-shrink-0" style={{ color: 'rgb(var(--color-warning))' }} />
            <div className="min-w-0 flex-1">
              <h4 className="font-medium text-sm sm:text-base" style={{ color: 'rgb(var(--color-text))' }}>
                {language === 'fr' ? 'Opportunités d\'amélioration' : 'Improvement Opportunities'}
              </h4>
              <ul className="mt-2 space-y-1.5 text-xs sm:text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {comparisons
                  .filter(c => c.status === 'below')
                  .map(metric => (
                    <li key={metric.id} className="flex items-start gap-1">
                      <span className="flex-shrink-0">•</span>
                      <span>
                        <strong style={{ color: 'rgb(var(--color-text))' }}>{language === 'fr' ? metric.nameFr : metric.name}</strong>:{' '}
                        {language === 'fr' 
                          ? `Votre valeur de ${metric.higherIsBetter ? formatPercent(metric.userValue) : formatRatio(metric.userValue)} est inférieure à la médiane`
                          : `Your value of ${metric.higherIsBetter ? formatPercent(metric.userValue) : formatRatio(metric.userValue)} is below median`}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Celebration for high performers */}
      {overallScore >= 75 && (
        <div 
          className="p-3 sm:p-4 rounded-xl border"
          style={{
            backgroundColor: 'rgb(var(--color-success) / 0.05)',
            borderColor: 'rgb(var(--color-success) / 0.2)'
          }}
        >
          <div className="flex items-start gap-2 sm:gap-3">
            <Award className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 flex-shrink-0" style={{ color: 'rgb(var(--color-success))' }} />
            <div className="min-w-0 flex-1">
              <h4 className="font-medium text-sm sm:text-base" style={{ color: 'rgb(var(--color-text))' }}>
                {language === 'fr' ? 'Excellente performance!' : 'Excellent Performance!'}
              </h4>
              <p className="mt-1 text-xs sm:text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {language === 'fr'
                  ? `Votre entreprise performe dans le top quartile de l'industrie ${industryName}. Continuez comme ça!`
                  : `Your business is performing in the top quartile of the ${industryName} industry. Keep up the great work!`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
