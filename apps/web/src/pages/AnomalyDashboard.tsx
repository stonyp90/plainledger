import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Settings,
  Filter,
  Download,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Clock,
  TrendingUp,
  TrendingDown,
  Scale,
  PieChart,
  AlertCircle,
  Sparkles,
  Brain,
  Zap,
} from 'lucide-react';
import { HealthScoreGauge, INDUSTRY_LABELS } from '../components/charts';
import type { IndustryType } from '../components/charts';
import { AnomalyTooltip, Tooltip, InfoTooltip } from '../components/Tooltip';
import Toggle, { ToggleGroup } from '../components/Toggle';
import { usePremiumFeature } from '../components/PremiumFeatureGate';
import { useNotifications } from '../contexts/NotificationContext';
import { useTenant } from '../contexts/TenantContext';
import { useI18n } from '../lib/i18n';
import { useFinancialData } from '../hooks/useFinancialData';
import { useHasRealData } from '../hooks/useHasRealData';
import { useAccountDataAccess } from '../hooks/useAccountDataAccess';
import PaidNoConnectionGate from '../components/PaidNoConnectionGate';
import DataReadinessChecklist from '../components/DataReadinessChecklist';
import AccountantGuidanceCard from '../components/AccountantGuidanceCard';
import { ChartEmptyState } from '../components/EmptyDataState';
import { ContentLoader } from '../components/PageLoader';
import {
  runFullAnalysis,
  DEFAULT_THRESHOLDS,
  getSeverityStyle,
  formatCurrency,
  formatPercentage,
  type Anomaly,
  type ThresholdConfig,
  type AccountBalance,
  type FinancialDataPoint,
  type AnomalyCategory,
} from '../lib/anomalyDetection';
import {
  runAIAnalysis,
  ANOMALY_TOOLTIPS,
  DEFAULT_AI_CONFIG,
  type AIAnomaly,
  type AIAnalysisResult,
  type AIAnomalyType,
} from '../lib/aiAnomalyDetection';

// Category labels for anomaly types

const categoryLabels: Record<
  AnomalyCategory,
  { label: string; labelEn: string; icon: typeof AlertTriangle }
> = {
  variance: { label: 'Variance', labelEn: 'Variance', icon: TrendingUp },
  trend: { label: 'Tendance', labelEn: 'Trend', icon: TrendingDown },
  balance: { label: 'Équilibre', labelEn: 'Balance', icon: Scale },
  ratio: { label: 'Ratio', labelEn: 'Ratio', icon: PieChart },
  duplicate: { label: 'Doublon', labelEn: 'Duplicate', icon: AlertCircle },
  missing: { label: 'Manquant', labelEn: 'Missing', icon: AlertCircle },
  timing: { label: 'Timing', labelEn: 'Timing', icon: Clock },
  threshold: { label: 'Seuil', labelEn: 'Threshold', icon: AlertTriangle },
};

// AI anomaly type labels
const aiTypeLabels: Record<AIAnomalyType, { label: string; labelEn: string; icon: typeof Brain }> =
  {
    statistical_outlier: { label: 'Valeur aberrante', labelEn: 'Statistical Outlier', icon: Zap },
    trend_break: { label: 'Rupture de tendance', labelEn: 'Trend Break', icon: TrendingDown },
    seasonality_deviation: {
      label: 'Écart saisonnier',
      labelEn: 'Seasonal Deviation',
      icon: Clock,
    },
    forecast_miss: { label: 'Écart prévision', labelEn: 'Forecast Miss', icon: AlertTriangle },
    peer_deviation: { label: 'Écart pair', labelEn: 'Peer Deviation', icon: Scale },
    benford_violation: { label: 'Loi de Benford', labelEn: 'Benford Violation', icon: AlertCircle },
    duplicate_pattern: {
      label: 'Pattern doublon',
      labelEn: 'Duplicate Pattern',
      icon: AlertCircle,
    },
    round_number_cluster: { label: 'Montants ronds', labelEn: 'Round Numbers', icon: PieChart },
    timing_anomaly: { label: 'Anomalie timing', labelEn: 'Timing Anomaly', icon: Clock },
    velocity_change: { label: 'Changement vélocité', labelEn: 'Velocity Change', icon: TrendingUp },
    correlation_break: { label: 'Rupture corrélation', labelEn: 'Correlation Break', icon: Scale },
    ratio_drift: { label: 'Dérive ratio', labelEn: 'Ratio Drift', icon: PieChart },
  };

export default function AnomalyDashboard() {
  // All hooks MUST be called before any early returns (Rules of Hooks)
  const { language } = useI18n();
  const isEn = language === 'en';
  const { currentTenant } = useTenant();

  // Account data access rules - check if paid user needs to connect
  const { shouldBlockUI, isLoading: accessLoading } = useAccountDataAccess();

  // Get industry from tenant, default to real_estate
  const selectedIndustry = (currentTenant?.industry || 'real_estate') as IndustryType;

  // Fetch financial data from the data service
  const { data: financialData, isLoading, refresh, error } = useFinancialData();

  // Check data availability
  const {
    hasRealData,
    hasQuickBooksConnection,
    hasSandboxData,
    shouldShowSandboxData,
    isFreeUser,
  } = useHasRealData();

  const [thresholds, setThresholds] = useState<ThresholdConfig>(() => {
    const saved = localStorage.getItem('plainledger-thresholds');
    return saved ? JSON.parse(saved) : DEFAULT_THRESHOLDS;
  });
  const [selectedCategory, setSelectedCategory] = useState<AnomalyCategory | 'all'>('all');
  const [expandedAnomalies, setExpandedAnomalies] = useState<Set<string>>(new Set());
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [useAIDetection, setUseAIDetection] = useState(false);
  const { hasAccess: hasAIAccess } = usePremiumFeature('advancedAnalytics');
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [isAIAnalyzing, setIsAIAnalyzing] = useState(false);
  const { showToast } = useNotifications();

  // Ref for scrolling to anomaly list
  const anomalyListRef = useRef<HTMLDivElement>(null);

  const scrollToAnomalyList = () => {
    anomalyListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Transform financial data to account balances for anomaly detection
  const accountsData: AccountBalance[] = useMemo(() => {
    if (!financialData?.accounts) return [];
    return (financialData.accounts ?? []).filter(a => typeof a.current === 'number' && Number.isFinite(a.current)).map((a) => ({
      code: a?.code ?? '',
      name: a?.name ?? '',
      current: a.current as number,
      prior: a?.prior ?? 0,
      type: a?.type ?? 'asset',
    }));
  }, [financialData]);

  // Get revenue trend data
  const revenueData = useMemo(() => {
    return financialData?.trends?.revenue?.data ?? [];
  }, [financialData]);

  // Get expense trend data
  const expenseData = useMemo(() => {
    return financialData?.trends?.expenses?.data ?? [];
  }, [financialData]);

  // Get industry-specific demo anomalies - ONLY show when in sandbox mode (no real connection)
  const demoAnomalies = useMemo<Anomaly[]>(() => {
    // Only include demo anomalies for free users showing sandbox data (not real data)
    if (hasRealData || !shouldShowSandboxData || !isFreeUser) return [];
    if (!financialData?.demoAnomalies) return [];
    // Convert demo anomalies to the Anomaly format with proper language support
    return financialData.demoAnomalies.map((da) => ({
      id: da.id,
      category:
        da.type === 'duplicate'
          ? ('duplicate' as const)
          : da.type === 'fraud'
            ? ('duplicate' as const)
            : da.type === 'spike'
              ? ('variance' as const)
              : ('timing' as const),
      severity: da.severity,
      title: isEn ? da.title : da.titleFr || da.title,
      description: isEn ? da.description : da.descriptionFr || da.description,
      value: da.amount,
      affectedAccount: da.accountId,
      affectedPeriod: da.date,
      recommendation: isEn
        ? `Review this ${da.type} anomaly and take appropriate action.`
        : `Examinez cette anomalie de type ${da.type} et prenez les mesures appropriées.`,
      detectedAt: new Date(da.date),
      confidence: da.confidence,
    }));
  }, [financialData?.demoAnomalies, isEn, hasRealData, shouldShowSandboxData, isFreeUser]);

  // Standard analysis - combines dynamic detection with demo anomalies
  const analysis = useMemo(() => {
    if (!accountsData.length || !revenueData.length) {
      // Use demo anomalies if no real data
      if (demoAnomalies.length > 0) {
        const summary = {
          critical: demoAnomalies.filter((a) => a.severity === 'critical').length,
          warning: demoAnomalies.filter((a) => a.severity === 'warning').length,
          info: demoAnomalies.filter((a) => a.severity === 'info').length,
          total: demoAnomalies.length,
        };
        const healthScore = Math.max(
          0,
          100 - (summary.critical * 20 + summary.warning * 10 + summary.info * 2),
        );
        return { anomalies: demoAnomalies, summary, healthScore };
      }
      return {
        anomalies: [],
        summary: { critical: 0, warning: 0, info: 0, total: 0 },
        healthScore: 100,
      };
    }

    const dynamicAnalysis = runFullAnalysis(accountsData, revenueData, thresholds);

    // Localize dynamic anomaly titles/descriptions based on language
    const localizedDynamic = dynamicAnalysis.anomalies.map((a) => ({
      ...a,
      title: isEn ? a.titleEn || a.title : a.title,
      description: isEn ? a.descriptionEn || a.description : a.description,
      recommendation: isEn ? a.recommendationEn || a.recommendation : a.recommendation,
    }));

    // Merge demo anomalies with dynamic analysis (prioritize demo anomalies for demo mode)
    const allAnomalies = [...demoAnomalies, ...localizedDynamic];

    // Recalculate summary with merged anomalies
    const summary = {
      critical: allAnomalies.filter((a) => a.severity === 'critical').length,
      warning: allAnomalies.filter((a) => a.severity === 'warning').length,
      info: allAnomalies.filter((a) => a.severity === 'info').length,
      total: allAnomalies.length,
    };

    // Recalculate health score
    const healthScore = Math.max(
      0,
      100 - (summary.critical * 20 + summary.warning * 10 + summary.info * 2),
    );

    return { anomalies: allAnomalies, summary, healthScore };
  }, [accountsData, revenueData, thresholds, demoAnomalies, isEn]);

  // Run AI analysis when data changes
  useEffect(() => {
    if (!useAIDetection || !accountsData.length || !revenueData.length) return;

    const runAI = async () => {
      setIsAIAnalyzing(true);
      try {
        // Prepare trend data by account
        const trendData: Record<string, FinancialDataPoint[]> = {
          [isEn ? 'Revenue' : 'Revenus']: revenueData,
          [isEn ? 'Expenses' : 'Dépenses']: expenseData,
        };

        // Per-account monthly history, raw transactions and historical ratios
        // are not returned by this query. Do not invent inputs for detectors.
        const transactions: { amount: number; date: string }[] = [];
        const ratioHistory: { period: string; value: number; ratioName: string }[][] = [];

        const result = await runAIAnalysis(
          accountsData,
          trendData,
          transactions,
          ratioHistory,
          DEFAULT_AI_CONFIG,
        );

        setAiAnalysis(result);
      } catch (error) {
        console.error('AI Analysis failed:', error);
      } finally {
        setIsAIAnalyzing(false);
      }
    };

    runAI();
  }, [useAIDetection, accountsData, revenueData, expenseData, financialData]);

  // Combined analysis results
  const combinedAnalysis = useMemo(() => {
    if (useAIDetection && aiAnalysis) {
      return {
        anomalies: aiAnalysis.anomalies as (Anomaly | AIAnomaly)[],
        summary: aiAnalysis.summary,
        healthScore: aiAnalysis.healthScore,
        aiConfidence: aiAnalysis.aiConfidence,
        modelInfo: aiAnalysis.modelInfo,
      };
    }
    return {
      ...analysis,
      aiConfidence: 0,
      modelInfo: null,
    };
  }, [useAIDetection, aiAnalysis, analysis]);

  const filteredAnomalies = useMemo(() => {
    if (selectedCategory === 'all') return combinedAnalysis.anomalies;
    return combinedAnalysis.anomalies.filter((a) => a.category === selectedCategory);
  }, [combinedAnalysis.anomalies, selectedCategory]);

  // CRITICAL: Block paid users without connection - show connection gate (after all hooks)
  if (shouldBlockUI && !accessLoading) {
    return <PaidNoConnectionGate context="analysis" />;
  }

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setLastRefresh(new Date());
    setIsRefreshing(false);
    showToast('success', isEn ? 'Analysis updated' : 'Analyse actualisée', isEn
        ? `${analysis.summary.total} anomalies detected in your data.`
        : `${analysis.summary.total} anomalies détectées sur vos données.`);
  };

  // Show loading state
  if (isLoading && !financialData) {
    return (
      <ContentLoader message="Analyse des données en cours..." messageEn="Analyzing your data..." />
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="card p-8 text-center">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-error" />
        <h3 className="font-semibold text-lg mb-2">{isEn ? 'Error' : 'Erreur'}</h3>
        <p className="text-muted mb-4">{error.message}</p>
        <button onClick={handleRefresh} className="btn-primary">
          {isEn ? 'Retry' : 'Réessayer'}
        </button>
      </div>
    );
  }

  const handleExport = () => {
    // Generate CSV data
    const headers = isEn
      ? ['Severity', 'Category', 'Title', 'Description', 'Value', 'Threshold', 'Recommendation']
      : ['Sévérité', 'Catégorie', 'Titre', 'Description', 'Valeur', 'Seuil', 'Recommandation'];
    const rows = filteredAnomalies.map((a) => [
      a.severity,
      a.category,
      a.title,
      a.description,
      a.value?.toString() || '',
      a.threshold?.toString() || '',
      a.recommendation,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `anomalies-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    showToast('success', isEn ? 'Export successful' : 'Export réussi', isEn
        ? `${filteredAnomalies.length} anomalies exported to CSV.`
        : `${filteredAnomalies.length} anomalies exportées en CSV.`);
  };

  const toggleAnomaly = (id: string) => {
    setExpandedAnomalies((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header - Responsive */}
      <div className="space-y-4">
        {/* Title Row */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h2
                className="text-xl sm:text-2xl font-semibold"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {isEn ? 'Anomaly Detection' : "Détection d'anomalies"}
              </h2>
              {useAIDetection && (
                <span
                  className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap"
                  style={{
                    backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
                    color: 'rgb(var(--color-primary-600))',
                  }}
                >
                  <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden xs:inline">{isEn ? 'Our AI' : 'Notre IA'}</span>
                </span>
              )}
              <InfoTooltip
                title="Détection d'anomalies"
                titleEn="Anomaly Detection"
                content="Détecte automatiquement les incohérences, valeurs aberrantes et patterns inhabituels dans vos données financières."
                contentEn="Automatically detects inconsistencies, outliers, and unusual patterns in your financial data."
                example="Variance de 50%, solde négatif sur actif, ratio de liquidité en baisse."
                exampleEn="50% variance, negative asset balance, declining liquidity ratio."
                impact="Permet de corriger les erreurs avant la clôture et d'identifier les risques."
                impactEn="Helps correct errors before closing and identify potential risks."
              />
            </div>
            <p
              className="text-xs sm:text-sm mt-1 hidden sm:block"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {isEn
                ? 'Detect and analyze financial data anomalies'
                : 'Détectez et analysez les anomalies dans vos données financières'}
            </p>
          </div>

          {/* Last Analysis - Desktop */}
          <Tooltip
            content={
              isEn
                ? 'Time when the analysis was last run. Click "Refresh" to update.'
                : 'Heure de la dernière analyse. Cliquez sur « Actualiser » pour mettre à jour.'
            }
            position="bottom"
          >
            <div
              className="hidden lg:flex items-center gap-2 text-xs whitespace-nowrap cursor-help"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              <Clock className="w-3.5 h-3.5" />
              {lastRefresh.toLocaleTimeString(isEn ? 'en-CA' : 'fr-CA')}
            </div>
          </Tooltip>
        </div>

        {/* Controls Row */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Analysis Mode Selector - Clear UX */}
          <div className="flex items-center gap-2">
            <ToggleGroup
              options={[
                {
                  value: 'standard',
                  label: isEn ? 'Standard' : 'Standard',
                  icon: <Zap className="w-3.5 h-3.5" />,
                },
                {
                  value: 'ai',
                  label: isEn ? 'AI Analysis' : 'Analyse IA',
                  icon: <Sparkles className="w-3.5 h-3.5" />,
                  badge: !hasAIAccess ? 'PRO' : undefined,
                  disabled: !hasAIAccess,
                },
              ]}
              value={useAIDetection ? 'ai' : 'standard'}
              onChange={(val) => {
                if (val === 'ai' && !hasAIAccess) return;
                setUseAIDetection(val === 'ai');
              }}
              size="sm"
            />
            <InfoTooltip
              title="Mode d'analyse"
              titleEn="Analysis Mode"
              content={
                hasAIAccess
                  ? 'Standard: Détection basée sur des seuils configurables. IA: Algorithmes avancés incluant saisonnalité, corrélations, loi de Benford, et plus.'
                  : 'Standard: Détection basée sur des seuils configurables. IA: Disponible avec le plan Professional ou Enterprise.'
              }
              contentEn={
                hasAIAccess
                  ? "Standard: Threshold-based detection. AI: Advanced algorithms including seasonality, correlations, Benford's Law, and more."
                  : 'Standard: Threshold-based detection. AI: Available with Professional or Enterprise plan.'
              }
              impact={
                hasAIAccess
                  ? 'Le mode IA offre une meilleure précision mais utilise plus de ressources.'
                  : "Passez au plan Professional pour débloquer l'analyse IA avancée."
              }
              impactEn={
                hasAIAccess
                  ? 'AI mode offers better accuracy but uses more resources.'
                  : 'Upgrade to Professional to unlock advanced AI analysis.'
              }
              size="sm"
            />
          </div>

          {/* Last Analysis - Mobile */}
          <Tooltip
            content={isEn ? 'Last analysis time' : 'Heure de la dernière analyse'}
            position="bottom"
          >
            <div
              className="lg:hidden flex items-center gap-1.5 text-[10px] sm:text-xs cursor-help"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              <Clock className="w-3 h-3" />
              {lastRefresh.toLocaleTimeString(isEn ? 'en-CA' : 'fr-CA', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </Tooltip>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || isAIAnalyzing}
              className="btn-secondary flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 sm:py-2"
              title={isEn ? 'Refresh analysis' : "Actualiser l'analyse"}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isRefreshing || isAIAnalyzing ? 'animate-spin' : ''}`}
              />
              <span className="hidden sm:inline">
                {isRefreshing || isAIAnalyzing
                  ? isEn
                    ? 'Analyzing...'
                    : 'Analyse...'
                  : isEn
                    ? 'Refresh'
                    : 'Actualiser'}
              </span>
            </button>
            <Link
              to="/app/settings?tab=anomalies"
              className="btn-secondary flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 sm:py-2"
              title={isEn ? 'Configure thresholds' : 'Configurer les seuils'}
            >
              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{isEn ? 'Configure' : 'Configurer'}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Data Readiness Checklist */}
      {financialData && (
        <DataReadinessChecklist
          context="anomalies"
          compact={combinedAnalysis.anomalies.length > 0}
        />
      )}

      {/* Accountant Guidance - Show when data quality is insufficient */}
      {financialData &&
        (!financialData.accounts?.length || !financialData.trends?.revenue?.data?.length) && (
          <AccountantGuidanceCard
            type={!financialData.accounts?.length ? 'connect-software' : 'reconcile-accounts'}
          />
        )}

      {/* AI Mode Requirements Guidance */}
      {useAIDetection &&
        hasAIAccess &&
        financialData &&
        financialData.trends?.revenue?.data?.length < 6 && (
          <AccountantGuidanceCard type="historical-data" compact={true} />
        )}

      {/* AI Model Info Banner - Compact & Responsive */}
      {useAIDetection && combinedAnalysis.modelInfo && (
        <div
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-xl border"
          style={{
            backgroundColor: 'rgb(var(--color-primary-500) / 0.05)',
            borderColor: 'rgb(var(--color-primary-500) / 0.2)',
          }}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className="p-1.5 sm:p-2 rounded-lg flex-shrink-0"
              style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
            >
              <Brain
                className="w-4 h-4 sm:w-5 sm:h-5"
                style={{ color: 'rgb(var(--color-primary-500))' }}
              />
            </div>
            <div className="min-w-0">
              <p
                className="font-medium text-xs sm:text-sm"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {isEn ? 'AI Analysis Complete' : 'Analyse IA terminée'}
              </p>
              <p
                className="text-[10px] sm:text-xs truncate"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                {combinedAnalysis.modelInfo.dataPointsAnalyzed.toLocaleString()}{' '}
                {isEn ? 'data points' : 'points'} • {combinedAnalysis.modelInfo.processingTime}ms
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
            <div className="text-center">
              <p
                className="text-[10px] sm:text-xs"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                {isEn ? 'Confidence' : 'Confiance'}
              </p>
              <p
                className="text-base sm:text-lg font-bold"
                style={{ color: 'rgb(var(--color-primary-600))' }}
              >
                {Math.round(combinedAnalysis.aiConfidence)}%
              </p>
            </div>
            <div className="text-center">
              <p
                className="text-[10px] sm:text-xs"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                {isEn ? 'Algorithms' : 'Algo.'}
              </p>
              <p
                className="text-base sm:text-lg font-bold"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {combinedAnalysis.modelInfo.algorithmsUsed.length}
              </p>
            </div>
            <InfoTooltip
              title="Algorithmes utilisés"
              titleEn="Algorithms Used"
              content={combinedAnalysis.modelInfo.algorithmsUsed.join(', ')}
              contentEn={combinedAnalysis.modelInfo.algorithmsUsed.join(', ')}
              size="sm"
            />
          </div>
        </div>
      )}

      {/* Health Score & Top Risks - Merged responsive card */}
      <HealthScoreGauge
        score={combinedAnalysis.healthScore}
        criticalCount={combinedAnalysis.summary.critical}
        warningCount={combinedAnalysis.summary.warning}
        infoCount={combinedAnalysis.summary.info}
        size="md"
        isEn={isEn}
        onClick={scrollToAnomalyList}
        topRisks={'topRisks' in combinedAnalysis.summary ? combinedAnalysis.summary.topRisks : undefined}
        anomalies={combinedAnalysis.anomalies.map((a) => ({
          id: a.id,
          title: a.title,
          severity: a.severity,
          description: a.description,
        }))}
        industry={{
          id: selectedIndustry,
          name: INDUSTRY_LABELS[selectedIndustry].fr,
          nameEn: INDUSTRY_LABELS[selectedIndustry].en,
        }}
        showIndustryMetrics={false}
      />

      {/* Anomaly List - Responsive */}
      <div ref={anomalyListRef} className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3
              className="text-base sm:text-lg font-semibold"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {isEn ? 'Detected Anomalies' : 'Anomalies détectées'}
            </h3>
            <p
              className="text-[10px] sm:text-xs hidden sm:block"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {isEn ? 'Click an anomaly for details' : 'Cliquez sur une anomalie pour les détails'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-2 flex-1 sm:flex-initial">
              <Filter
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as AnomalyCategory | 'all')}
                className="select text-xs sm:text-sm flex-1 sm:flex-initial min-w-0"
                title={isEn ? 'Filter anomalies by category' : 'Filtrer par catégorie'}
              >
                <option value="all">{isEn ? 'All categories' : 'Toutes'}</option>
                {Object.entries(categoryLabels).map(([key, { label, labelEn }]) => (
                  <option key={key} value={key}>
                    {isEn ? labelEn : label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleExport}
              className="btn-secondary text-xs sm:text-sm flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap"
              title={isEn ? 'Export anomaly list to CSV' : 'Exporter en CSV'}
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">{isEn ? 'Export' : 'Exporter'}</span>
            </button>
          </div>
        </div>

        {!hasQuickBooksConnection && !hasSandboxData ? (
          <div className="text-center py-12">
            <ChartEmptyState
              message={
                isEn
                  ? 'Connect your accounting software to detect anomalies'
                  : 'Connectez votre logiciel comptable pour détecter les anomalies'
              }
              showConnectLink={true}
            />
          </div>
        ) : filteredAnomalies.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle
              className="w-12 h-12 mx-auto mb-4"
              style={{ color: 'rgb(var(--color-success))' }}
            />
            <p className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'No anomalies detected' : 'Aucune anomalie détectée'}
            </p>
            <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn
                ? 'Your financial data is consistent'
                : 'Vos données financières sont cohérentes'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredAnomalies.map((anomaly) => {
              const style = getSeverityStyle(anomaly.severity);
              const CategoryIcon = categoryLabels[anomaly.category]?.icon || AlertTriangle;
              const isExpanded = expandedAnomalies.has(anomaly.id);
              const isAIAnomaly = 'aiType' in anomaly;
              const aiAnomaly = isAIAnomaly ? (anomaly as AIAnomaly) : null;

              return (
                <div
                  key={anomaly.id}
                  className="border rounded-lg overflow-hidden transition-all relative"
                  style={{ borderColor: style.borderColor }}
                >
                  <button
                    onClick={() => toggleAnomaly(anomaly.id)}
                    className="w-full flex items-start sm:items-center gap-2 sm:gap-3 p-3 sm:p-4 text-left"
                    style={{ backgroundColor: style.bgColor }}
                  >
                    {isExpanded ? (
                      <ChevronDown
                        className="w-4 h-4 flex-shrink-0 mt-0.5 sm:mt-0"
                        style={{ color: style.textColor }}
                      />
                    ) : (
                      <ChevronRight
                        className="w-4 h-4 flex-shrink-0 mt-0.5 sm:mt-0"
                        style={{ color: style.textColor }}
                      />
                    )}

                    <div
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'rgb(var(--color-surface))' }}
                    >
                      <CategoryIcon
                        className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                        style={{ color: style.textColor }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start sm:items-center gap-1.5 sm:gap-2 flex-col sm:flex-row sm:flex-wrap">
                        <span
                          className="font-medium text-sm sm:text-base"
                          style={{ color: 'rgb(var(--color-text))' }}
                        >
                          {anomaly.title}
                        </span>
                        <span
                          className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: style.bgColor, color: style.textColor }}
                        >
                          {anomaly.severity === 'critical'
                            ? isEn
                              ? 'Critical'
                              : 'Critique'
                            : anomaly.severity === 'warning'
                              ? isEn
                                ? 'Warning'
                                : 'Attention'
                              : 'Info'}
                        </span>
                        {isAIAnomaly && aiAnomaly && (
                          <>
                            <span
                              className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                              style={{
                                backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
                                color: 'rgb(var(--color-primary-600))',
                              }}
                            >
                              <Sparkles className="w-3 h-3" />
                              AI
                            </span>
                            <span
                              className="text-xs"
                              style={{ color: 'rgb(var(--color-text-muted))' }}
                            >
                              {aiAnomaly.confidence}% {isEn ? 'confidence' : 'confiance'}
                            </span>
                          </>
                        )}
                      </div>
                      <Tooltip content={anomaly.description} position="bottom" delay={300}>
                        <p
                          className="text-sm truncate cursor-help"
                          style={{ color: 'rgb(var(--color-text-muted))' }}
                        >
                          {anomaly.description}
                        </p>
                      </Tooltip>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {anomaly.percentageDeviation !== undefined && (
                        <div className="text-right">
                          <span
                            className="text-lg font-bold tabular-nums"
                            style={{ color: style.textColor }}
                          >
                            {formatPercentage(anomaly.percentageDeviation)}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>

                  {/* AI Tooltip - placed outside button to avoid nesting violation */}
                  {isAIAnomaly && aiAnomaly && ANOMALY_TOOLTIPS[aiAnomaly.aiType] && (
                    <div className="absolute top-3 right-3 z-10">
                      <AnomalyTooltip
                        type={aiAnomaly.aiType}
                        confidence={aiAnomaly.confidence}
                        explanation={aiAnomaly.explanation}
                        explanationEn={aiAnomaly.explanationEn}
                        technicalDetails={aiAnomaly.technicalDetails}
                        suggestedActions={aiAnomaly.suggestedActions}
                        impactScore={aiAnomaly.impactScore}
                      />
                    </div>
                  )}

                  {isExpanded && (
                    <div
                      className="px-4 pb-4 pt-2 border-t"
                      style={{
                        backgroundColor: 'rgb(var(--color-surface))',
                        borderColor: style.borderColor,
                      }}
                    >
                      {/* AI-specific info */}
                      {isAIAnomaly && aiAnomaly && (
                        <div
                          className="mb-4 p-3 rounded-lg border"
                          style={{
                            backgroundColor: 'rgb(var(--color-primary-500) / 0.03)',
                            borderColor: 'rgb(var(--color-primary-500) / 0.1)',
                          }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Brain
                              className="w-4 h-4"
                              style={{ color: 'rgb(var(--color-primary-500))' }}
                            />
                            <span
                              className="text-sm font-medium"
                              style={{ color: 'rgb(var(--color-text))' }}
                            >
                              {isEn ? 'AI Explanation' : 'Explication IA'}
                            </span>
                          </div>
                          <p
                            className="text-sm"
                            style={{ color: 'rgb(var(--color-text-secondary))' }}
                          >
                            {isEn ? aiAnomaly.explanationEn : aiAnomaly.explanation}
                          </p>

                          {/* Impact bar */}
                          <div className="flex items-center gap-2 mt-3">
                            <span
                              className="text-xs"
                              style={{ color: 'rgb(var(--color-text-muted))' }}
                            >
                              {isEn ? 'Impact:' : 'Impact :'}
                            </span>
                            <div
                              className="flex-1 h-1.5 rounded-full overflow-hidden"
                              style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
                            >
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.min(100, aiAnomaly.impactScore)}%`,
                                  backgroundColor:
                                    aiAnomaly.impactScore > 70
                                      ? 'rgb(var(--color-error))'
                                      : aiAnomaly.impactScore > 40
                                        ? 'rgb(var(--color-warning))'
                                        : 'rgb(var(--color-success))',
                                }}
                              />
                            </div>
                            <span
                              className="text-xs font-medium"
                              style={{ color: 'rgb(var(--color-text))' }}
                            >
                              {aiAnomaly.impactScore}%
                            </span>
                          </div>

                          {/* Technical details */}
                          {aiAnomaly.technicalDetails && (
                            <p
                              className="text-xs font-mono mt-2 p-2 rounded"
                              style={{
                                backgroundColor: 'rgb(var(--color-bg-muted))',
                                color: 'rgb(var(--color-text-muted))',
                              }}
                            >
                              {aiAnomaly.technicalDetails}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-4">
                        {anomaly.affectedAccount && (
                          <div>
                            <span style={{ color: 'rgb(var(--color-text-muted))' }}>
                              {isEn ? 'Account:' : 'Compte :'}
                            </span>
                            <span
                              className="ml-2 font-mono"
                              style={{ color: 'rgb(var(--color-text))' }}
                            >
                              {anomaly.affectedAccount}
                            </span>
                          </div>
                        )}
                        {anomaly.affectedPeriod && (
                          <div>
                            <span style={{ color: 'rgb(var(--color-text-muted))' }}>
                              {isEn ? 'Period:' : 'Période :'}
                            </span>
                            <span className="ml-2" style={{ color: 'rgb(var(--color-text))' }}>
                              {anomaly.affectedPeriod}
                            </span>
                          </div>
                        )}
                        {anomaly.value !== undefined && (
                          <div>
                            <span style={{ color: 'rgb(var(--color-text-muted))' }}>
                              {isEn ? 'Value:' : 'Valeur :'}
                            </span>
                            <span
                              className="ml-2 font-mono"
                              style={{ color: 'rgb(var(--color-text))' }}
                            >
                              {formatCurrency(anomaly.value)}
                            </span>
                          </div>
                        )}
                        {anomaly.threshold !== undefined && (
                          <div>
                            <span style={{ color: 'rgb(var(--color-text-muted))' }}>
                              {isEn ? 'Threshold:' : 'Seuil :'}
                            </span>
                            <span className="ml-2" style={{ color: 'rgb(var(--color-text))' }}>
                              {typeof anomaly.threshold === 'number' && anomaly.threshold < 100
                                ? `${anomaly.threshold}%`
                                : formatCurrency(anomaly.threshold)}
                            </span>
                          </div>
                        )}
                        {isAIAnomaly && aiAnomaly?.expectedValue !== undefined && (
                          <div>
                            <span style={{ color: 'rgb(var(--color-text-muted))' }}>
                              {isEn ? 'Expected:' : 'Attendu :'}
                            </span>
                            <span
                              className="ml-2 font-mono"
                              style={{ color: 'rgb(var(--color-text))' }}
                            >
                              {formatCurrency(aiAnomaly.expectedValue)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Recommendation */}
                      <div
                        className="p-3 rounded-lg"
                        style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
                      >
                        <p
                          className="text-sm font-medium mb-1"
                          style={{ color: 'rgb(var(--color-text))' }}
                        >
                          💡 {isEn ? 'Recommendation' : 'Recommandation'}
                        </p>
                        <p
                          className="text-sm"
                          style={{ color: 'rgb(var(--color-text-secondary))' }}
                        >
                          {anomaly.recommendation}
                        </p>
                      </div>

                      {/* Suggested Actions - AI only */}
                      {isAIAnomaly &&
                        aiAnomaly?.suggestedActions &&
                        aiAnomaly.suggestedActions.length > 0 && (
                          <div className="mt-3">
                            <p
                              className="text-xs font-medium mb-2"
                              style={{ color: 'rgb(var(--color-text-muted))' }}
                            >
                              {isEn ? 'Suggested Actions:' : 'Actions suggérées :'}
                            </p>
                            <ul className="space-y-1">
                              {aiAnomaly.suggestedActions.map((action, idx) => (
                                <li
                                  key={idx}
                                  className="text-sm flex items-start gap-2"
                                  style={{ color: 'rgb(var(--color-text-secondary))' }}
                                >
                                  <ChevronRight
                                    className="w-4 h-4 mt-0.5 flex-shrink-0"
                                    style={{ color: 'rgb(var(--color-primary-500))' }}
                                  />
                                  {action}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                      <div className="flex justify-end mt-3">
                        <Link
                          to="/app/reports/balance-sheet"
                          className="text-sm flex items-center gap-1 transition-colors"
                          style={{ color: 'rgb(var(--color-primary-600))' }}
                        >
                          {isEn ? 'View Report' : 'Voir le rapport'}{' '}
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
