/**
 * Market Insights Panel
 * 
 * Displays AI-branded insights based on benchmark comparisons.
 * Uses marketing language to present existing data analysis as AI-powered.
 * 
 * Note: This component uses pre-computed comparisons and static suggestions,
 * presented with AI marketing language for positioning purposes.
 */

import { useMemo } from 'react';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Brain,
  Zap,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';

interface MetricInsight {
  metric: string;
  metricFr: string;
  status: 'excellent' | 'good' | 'average' | 'below' | 'attention';
  percentile?: number;
  userValue: number;
  benchmarkMedian: number;
  suggestion: string;
  suggestionFr: string;
  impact: 'high' | 'medium' | 'low';
}

interface MarketInsightsPanelProps {
  insights: MetricInsight[];
  overallScore?: number;
  industry: string;
  industryFr: string;
  sampleSize: number;
  className?: string;
}

// Status colors and icons using theme CSS variables
const STATUS_CONFIG = {
  excellent: {
    colorVar: '--color-success',
    icon: CheckCircle,
    labelEn: 'Excellent',
    labelFr: 'Excellent',
  },
  good: {
    colorVar: '--color-success',
    icon: CheckCircle,
    labelEn: 'Good',
    labelFr: 'Bon',
  },
  average: {
    colorVar: '--color-info',
    icon: Target,
    labelEn: 'Average',
    labelFr: 'Moyen',
  },
  below: {
    colorVar: '--color-warning',
    icon: TrendingDown,
    labelEn: 'Below Average',
    labelFr: 'Sous la moyenne',
  },
  attention: {
    colorVar: '--color-error',
    icon: AlertTriangle,
    labelEn: 'Needs Attention',
    labelFr: 'À surveiller',
  },
};

// Helper to get styles for a status
const getStatusStyles = (status: keyof typeof STATUS_CONFIG) => {
  const config = STATUS_CONFIG[status];
  return {
    color: `rgb(var(${config.colorVar}))`,
    bg: `rgb(var(${config.colorVar}) / 0.08)`,
    border: `rgb(var(${config.colorVar}) / 0.2)`,
  };
};

export default function MarketInsightsPanel({
  insights,
  overallScore,
  industry,
  industryFr,
  sampleSize,
  className = '',
}: MarketInsightsPanelProps) {
  const { language } = useI18n();
  const isEn = language === 'en';

  // Sort insights by impact (high first) then by status (attention first)
  const sortedInsights = useMemo(() => {
    const statusOrder = { attention: 0, below: 1, average: 2, good: 3, excellent: 4 };
    const impactOrder = { high: 0, medium: 1, low: 2 };
    
    return [...insights].sort((a, b) => {
      // First sort by impact
      const impactDiff = impactOrder[a.impact] - impactOrder[b.impact];
      if (impactDiff !== 0) return impactDiff;
      // Then by status
      return statusOrder[a.status] - statusOrder[b.status];
    });
  }, [insights]);

  // Get top opportunities (metrics below average)
  const opportunities = useMemo(() => {
    return sortedInsights.filter(i => i.status === 'below' || i.status === 'attention');
  }, [sortedInsights]);

  // Get strengths (metrics above average)
  const strengths = useMemo(() => {
    return sortedInsights.filter(i => i.status === 'excellent' || i.status === 'good');
  }, [sortedInsights]);

  return (
    <div className={`space-y-4 sm:space-y-6 ${className}`}>
      {/* AI Badge Header */}
      <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div 
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ 
              background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)',
            }}
          >
            <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
              <span className="whitespace-nowrap">{isEn ? 'AI-Powered Insights' : 'Analyses propulsées par l\'IA'}</span>
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-amber-500 flex-shrink-0" />
            </h3>
            <p className="text-xs sm:text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn 
                ? `Compared against ${sampleSize.toLocaleString()}+ ${industry} businesses`
                : `Comparé à ${sampleSize.toLocaleString()}+ entreprises en ${industryFr}`}
            </p>
          </div>
        </div>
        
        {overallScore !== undefined && (
          <div className="text-left xs:text-right flex-shrink-0">
            <div className="text-xl sm:text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
              {overallScore}
              <span className="text-xs sm:text-sm font-normal" style={{ color: 'rgb(var(--color-text-muted))' }}>/100</span>
            </div>
            <p className="text-[10px] sm:text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Performance Score' : 'Score de performance'}
            </p>
          </div>
        )}
      </div>

      {/* Data Source Attribution */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] sm:text-xs" style={{ 
        backgroundColor: 'rgb(var(--color-bg-muted))',
        color: 'rgb(var(--color-text-muted))'
      }}>
        <Zap className="w-3 h-3 flex-shrink-0" />
        <span className="truncate">
          {isEn 
            ? 'Aggregated from public and private data sources • Updated monthly'
            : 'Agrégé à partir de sources de données publiques et privées • Mis à jour mensuellement'}
        </span>
      </div>

      {/* Opportunities Section */}
      {opportunities.length > 0 && (
        <div className="space-y-2 sm:space-y-3">
          <h4 className="text-xs sm:text-sm font-medium flex items-center gap-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" style={{ color: 'rgb(var(--color-warning))' }} />
            <span className="whitespace-nowrap">{isEn ? 'Growth Opportunities' : 'Opportunités de croissance'}</span>
            <span className="text-[10px] sm:text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>({opportunities.length})</span>
          </h4>
          
          <div className="space-y-2 sm:space-y-3">
            {opportunities.slice(0, 3).map((insight, idx) => {
              const config = STATUS_CONFIG[insight.status];
              const Icon = config.icon;
              const styles = getStatusStyles(insight.status);
              
              return (
                <div 
                  key={idx}
                  className="p-3 sm:p-4 rounded-xl border"
                  style={{
                    backgroundColor: styles.bg,
                    borderColor: styles.border
                  }}
                >
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-2 sm:gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" style={{ color: styles.color }} />
                        <span className="font-medium text-xs sm:text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                          {isEn ? insight.metric : insight.metricFr}
                        </span>
                        <span 
                          className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap font-medium"
                          style={{
                            backgroundColor: styles.bg,
                            color: styles.color
                          }}
                        >
                          {isEn ? config.labelEn : config.labelFr}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm mb-2 leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                        {isEn ? insight.suggestion : insight.suggestionFr}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] sm:text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                        <span>
                          {isEn ? 'Your value' : 'Votre valeur'}: <strong style={{ color: 'rgb(var(--color-text))' }}>{(insight.userValue * 100).toFixed(1)}%</strong>
                        </span>
                        <span>
                          {isEn ? 'Industry median' : 'Médiane du secteur'}: <strong style={{ color: 'rgb(var(--color-text))' }}>{(insight.benchmarkMedian * 100).toFixed(1)}%</strong>
                        </span>
                      </div>
                    </div>
                    {insight.impact === 'high' && (
                      <span 
                        className="px-2 py-1 text-[10px] sm:text-xs font-medium rounded-full whitespace-nowrap flex-shrink-0"
                        style={{
                          backgroundColor: 'rgb(var(--color-error) / 0.1)',
                          color: 'rgb(var(--color-error))'
                        }}
                      >
                        {isEn ? 'High Impact' : 'Impact élevé'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Strengths Section */}
      {strengths.length > 0 && (
        <div className="space-y-2 sm:space-y-3">
          <h4 className="text-xs sm:text-sm font-medium flex items-center gap-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" style={{ color: 'rgb(var(--color-success))' }} />
            <span className="whitespace-nowrap">{isEn ? 'Competitive Strengths' : 'Forces concurrentielles'}</span>
            <span className="text-[10px] sm:text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>({strengths.length})</span>
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {strengths.slice(0, 4).map((insight, idx) => {
              const config = STATUS_CONFIG[insight.status];
              const Icon = config.icon;
              const styles = getStatusStyles(insight.status);
              
              return (
                <div 
                  key={idx}
                  className="p-2.5 sm:p-3 rounded-lg border"
                  style={{
                    backgroundColor: styles.bg,
                    borderColor: styles.border
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" style={{ color: styles.color }} />
                    <span className="font-medium text-xs sm:text-sm truncate" style={{ color: 'rgb(var(--color-text))' }}>
                      {isEn ? insight.metric : insight.metricFr}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] sm:text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    <span>{(insight.userValue * 100).toFixed(1)}%</span>
                    {insight.percentile && (
                      <span className="font-medium" style={{ color: styles.color }}>
                        {isEn ? `Top ${100 - insight.percentile}%` : `Top ${100 - insight.percentile}%`}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Analysis Note */}
      <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl border" style={{
        background: 'linear-gradient(to right, rgb(var(--color-primary-50)), rgb(var(--color-primary-100) / 0.5))',
        borderColor: 'rgb(var(--color-primary-200))'
      }}>
        <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" style={{ color: 'rgb(var(--color-primary-600))' }} />
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium mb-1" style={{ color: 'rgb(var(--color-primary-900))' }}>
            {isEn ? 'AI Analysis Summary' : 'Résumé de l\'analyse IA'}
          </p>
          <p className="text-xs sm:text-sm" style={{ color: 'rgb(var(--color-primary-700))' }}>
            {opportunities.length > 0 ? (
              isEn 
                ? `Our AI identified ${opportunities.length} area${opportunities.length > 1 ? 's' : ''} where improvement could significantly impact your bottom line. Focus on ${opportunities[0]?.metric || 'key metrics'} for the highest ROI.`
                : `Notre IA a identifié ${opportunities.length} domaine${opportunities.length > 1 ? 's' : ''} où une amélioration pourrait avoir un impact significatif. Concentrez-vous sur ${opportunities[0]?.metricFr || 'les métriques clés'} pour le meilleur retour sur investissement.`
            ) : (
              isEn
                ? 'Your business is performing above industry standards across all key metrics. Keep up the excellent work!'
                : 'Votre entreprise performe au-dessus des standards de l\'industrie sur toutes les métriques clés. Continuez votre excellent travail!'
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Helper function to generate insights from benchmark comparison
 */
export function generateInsightsFromComparison(
  userMetrics: {
    grossMargin?: number;
    netMargin?: number;
    currentRatio?: number;
    debtToEquity?: number;
    operatingExpenseRatio?: number;
  },
  benchmark: {
    grossMargin: { q1: number; median: number; q3: number };
    netMargin: { q1: number; median: number; q3: number };
    currentRatio: { q1: number; median: number; q3: number };
    debtToEquity: { q1: number; median: number; q3: number };
    operatingExpenseRatio: number;
  }
): MetricInsight[] {
  const insights: MetricInsight[] = [];

  const getStatus = (
    value: number, 
    q1: number, 
    median: number, 
    q3: number, 
    higherIsBetter: boolean
  ): 'excellent' | 'good' | 'average' | 'below' | 'attention' => {
    if (higherIsBetter) {
      if (value >= q3) return 'excellent';
      if (value >= median) return 'good';
      if (value >= q1) return 'average';
      if (value >= q1 * 0.7) return 'below';
      return 'attention';
    } else {
      if (value <= q1) return 'excellent';
      if (value <= median) return 'good';
      if (value <= q3) return 'average';
      if (value <= q3 * 1.3) return 'below';
      return 'attention';
    }
  };

  // Gross Margin
  if (userMetrics.grossMargin !== undefined) {
    const status = getStatus(
      userMetrics.grossMargin,
      benchmark.grossMargin.q1,
      benchmark.grossMargin.median,
      benchmark.grossMargin.q3,
      true
    );
    insights.push({
      metric: 'Gross Margin',
      metricFr: 'Marge brute',
      status,
      userValue: userMetrics.grossMargin,
      benchmarkMedian: benchmark.grossMargin.median,
      impact: 'high',
      suggestion: status === 'below' || status === 'attention'
        ? 'Consider reviewing pricing strategy and supplier negotiations to improve gross margin.'
        : 'Your gross margin is healthy. Continue optimizing your cost structure.',
      suggestionFr: status === 'below' || status === 'attention'
        ? 'Envisagez de revoir votre stratégie de prix et vos négociations fournisseurs.'
        : 'Votre marge brute est saine. Continuez à optimiser votre structure de coûts.',
    });
  }

  // Net Margin
  if (userMetrics.netMargin !== undefined) {
    const status = getStatus(
      userMetrics.netMargin,
      benchmark.netMargin.q1,
      benchmark.netMargin.median,
      benchmark.netMargin.q3,
      true
    );
    insights.push({
      metric: 'Net Margin',
      metricFr: 'Marge nette',
      status,
      userValue: userMetrics.netMargin,
      benchmarkMedian: benchmark.netMargin.median,
      impact: 'high',
      suggestion: status === 'below' || status === 'attention'
        ? 'Focus on reducing operating expenses and overhead costs to improve profitability.'
        : 'Strong net margin indicates efficient operations. Maintain current practices.',
      suggestionFr: status === 'below' || status === 'attention'
        ? 'Concentrez-vous sur la réduction des charges d\'exploitation pour améliorer la rentabilité.'
        : 'Une marge nette solide indique des opérations efficaces. Maintenez vos pratiques.',
    });
  }

  // Current Ratio
  if (userMetrics.currentRatio !== undefined) {
    const status = getStatus(
      userMetrics.currentRatio,
      benchmark.currentRatio.q1,
      benchmark.currentRatio.median,
      benchmark.currentRatio.q3,
      true
    );
    insights.push({
      metric: 'Current Ratio',
      metricFr: 'Ratio de liquidité',
      status,
      userValue: userMetrics.currentRatio,
      benchmarkMedian: benchmark.currentRatio.median,
      impact: 'medium',
      suggestion: status === 'below' || status === 'attention'
        ? 'Consider improving cash management or renegotiating payment terms with suppliers.'
        : 'Good liquidity position. You have flexibility for short-term obligations.',
      suggestionFr: status === 'below' || status === 'attention'
        ? 'Envisagez d\'améliorer la gestion de trésorerie ou de renégocier les conditions de paiement.'
        : 'Bonne position de liquidité. Vous avez de la flexibilité pour vos obligations.',
    });
  }

  // Debt to Equity
  if (userMetrics.debtToEquity !== undefined) {
    const status = getStatus(
      userMetrics.debtToEquity,
      benchmark.debtToEquity.q1,
      benchmark.debtToEquity.median,
      benchmark.debtToEquity.q3,
      false // Lower is better
    );
    insights.push({
      metric: 'Debt-to-Equity',
      metricFr: 'Dette/Capitaux propres',
      status,
      userValue: userMetrics.debtToEquity,
      benchmarkMedian: benchmark.debtToEquity.median,
      impact: 'medium',
      suggestion: status === 'below' || status === 'attention'
        ? 'High leverage increases risk. Consider debt reduction strategies.'
        : 'Balanced capital structure provides financial stability.',
      suggestionFr: status === 'below' || status === 'attention'
        ? 'Un levier élevé augmente le risque. Envisagez des stratégies de réduction de la dette.'
        : 'Une structure de capital équilibrée assure la stabilité financière.',
    });
  }

  // Operating Expense Ratio
  if (userMetrics.operatingExpenseRatio !== undefined) {
    const opexMedian = benchmark.operatingExpenseRatio;
    const status = getStatus(
      userMetrics.operatingExpenseRatio,
      opexMedian * 0.8,
      opexMedian,
      opexMedian * 1.2,
      false // Lower is better
    );
    insights.push({
      metric: 'Operating Expense Ratio',
      metricFr: 'Ratio charges d\'exploitation',
      status,
      userValue: userMetrics.operatingExpenseRatio,
      benchmarkMedian: opexMedian,
      impact: 'medium',
      suggestion: status === 'below' || status === 'attention'
        ? 'Review overhead costs and operational efficiency to reduce expenses.'
        : 'Operating costs are well-managed compared to industry peers.',
      suggestionFr: status === 'below' || status === 'attention'
        ? 'Examinez les frais généraux et l\'efficacité opérationnelle pour réduire les dépenses.'
        : 'Les coûts d\'exploitation sont bien gérés par rapport aux pairs du secteur.',
    });
  }

  return insights;
}
