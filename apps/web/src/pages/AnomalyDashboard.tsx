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
  Loader2,
  Sparkles,
  Brain,
  Zap,
  Info,
  ExternalLink,
  HelpCircle,
} from 'lucide-react';
import { 
  HealthScoreGauge, 
  VarianceChart, 
  TrendChart,
  CurrentRatioCard,
  QuickRatioCard,
  DebtToEquityCard,
} from '../components/charts';
import { InfoBanner } from '../components/HelpTooltip';
import { InfoTooltip, AnomalyTooltip, MetricTooltip } from '../components/Tooltip';
import Toggle, { ToggleGroup } from '../components/Toggle';
import { useNotifications } from '../contexts/NotificationContext';
import { useI18n } from '../lib/i18n';
import { useFinancialData } from '../hooks/useFinancialData';
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

const categoryLabels: Record<AnomalyCategory, { label: string; labelEn: string; icon: typeof AlertTriangle }> = {
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
const aiTypeLabels: Record<AIAnomalyType, { label: string; labelEn: string; icon: typeof Brain }> = {
  statistical_outlier: { label: 'Valeur aberrante', labelEn: 'Statistical Outlier', icon: Zap },
  trend_break: { label: 'Rupture de tendance', labelEn: 'Trend Break', icon: TrendingDown },
  seasonality_deviation: { label: 'Écart saisonnier', labelEn: 'Seasonal Deviation', icon: Clock },
  forecast_miss: { label: 'Écart prévision', labelEn: 'Forecast Miss', icon: AlertTriangle },
  peer_deviation: { label: 'Écart pair', labelEn: 'Peer Deviation', icon: Scale },
  benford_violation: { label: 'Loi de Benford', labelEn: 'Benford Violation', icon: AlertCircle },
  duplicate_pattern: { label: 'Pattern doublon', labelEn: 'Duplicate Pattern', icon: AlertCircle },
  round_number_cluster: { label: 'Montants ronds', labelEn: 'Round Numbers', icon: PieChart },
  timing_anomaly: { label: 'Anomalie timing', labelEn: 'Timing Anomaly', icon: Clock },
  velocity_change: { label: 'Changement vélocité', labelEn: 'Velocity Change', icon: TrendingUp },
  correlation_break: { label: 'Rupture corrélation', labelEn: 'Correlation Break', icon: Scale },
  ratio_drift: { label: 'Dérive ratio', labelEn: 'Ratio Drift', icon: PieChart },
};

export default function AnomalyDashboard() {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  // Fetch financial data from the data service
  const { data: financialData, isLoading, refresh, error } = useFinancialData();
  
  const [thresholds, setThresholds] = useState<ThresholdConfig>(() => {
    const saved = localStorage.getItem('plainledger-thresholds');
    return saved ? JSON.parse(saved) : DEFAULT_THRESHOLDS;
  });
  const [selectedCategory, setSelectedCategory] = useState<AnomalyCategory | 'all'>('all');
  const [expandedAnomalies, setExpandedAnomalies] = useState<Set<string>>(new Set());
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showTip, setShowTip] = useState(true);
  const [useAIDetection, setUseAIDetection] = useState(true);
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
    if (!financialData) return [];
    return financialData.accounts.map(a => ({
      code: a.code,
      name: a.name,
      current: a.current,
      prior: a.prior,
      type: a.type,
    }));
  }, [financialData]);

  // Get revenue trend data
  const revenueData = useMemo(() => {
    if (!financialData) return [];
    return financialData.trends.revenue.data;
  }, [financialData]);

  // Get expense trend data
  const expenseData = useMemo(() => {
    if (!financialData) return [];
    return financialData.trends.expenses.data;
  }, [financialData]);

  // Standard analysis
  const analysis = useMemo(() => {
    if (!accountsData.length || !revenueData.length) {
      return { anomalies: [], summary: { critical: 0, warning: 0, info: 0, total: 0 }, healthScore: 100 };
    }
    return runFullAnalysis(accountsData, revenueData, thresholds);
  }, [accountsData, revenueData, thresholds]);

  // Run AI analysis when data changes
  useEffect(() => {
    if (!useAIDetection || !accountsData.length || !revenueData.length) return;
    
    const runAI = async () => {
      setIsAIAnalyzing(true);
      try {
        // Prepare trend data by account
        const trendData: Record<string, FinancialDataPoint[]> = {
          'Revenus': revenueData,
          'Dépenses': expenseData,
        };
        
        // Add account-specific trends from financialData
        accountsData.slice(0, 10).forEach(account => {
          // Generate synthetic trend data based on current/prior for demonstration
          const monthlyData: FinancialDataPoint[] = [];
          const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
          const variance = account.current - account.prior;
          const monthlyChange = variance / 12;
          
          months.forEach((month, idx) => {
            monthlyData.push({
              period: month,
              value: account.prior + monthlyChange * (idx + 1) + (Math.random() - 0.5) * Math.abs(monthlyChange) * 2,
              account: account.code,
            });
          });
          
          trendData[account.name] = monthlyData;
        });
        
        // Generate mock transactions for Benford analysis
        const transactions = Array.from({ length: 200 }, () => ({
          amount: Math.floor(Math.random() * 50000) + 100,
          date: new Date().toISOString(),
        }));
        
        // Ratio history for drift detection
        const ratioHistory = financialData ? [
          Array.from({ length: 8 }, (_, i) => ({
            period: `T${i + 1}`,
            value: financialData.metrics.currentRatio * (1 - i * 0.03 + Math.random() * 0.05),
            ratioName: 'Ratio de liquidité',
          })),
        ] : [];
        
        const result = await runAIAnalysis(
          accountsData,
          trendData,
          transactions,
          ratioHistory,
          DEFAULT_AI_CONFIG
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
    return combinedAnalysis.anomalies.filter(a => a.category === selectedCategory);
  }, [combinedAnalysis.anomalies, selectedCategory]);

  // Calculate ratios from financial data
  const ratios = useMemo(() => {
    if (!financialData) {
      return { currentRatio: 0, quickRatio: 0, debtToEquity: 0 };
    }
    return {
      currentRatio: financialData.metrics.currentRatio,
      quickRatio: financialData.metrics.quickRatio,
      debtToEquity: financialData.metrics.debtToEquity,
    };
  }, [financialData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setLastRefresh(new Date());
    setIsRefreshing(false);
    showToast({
      type: 'success',
      title: isEn ? 'Analysis updated' : 'Analyse actualisée',
      message: isEn 
        ? `${analysis.summary.total} anomalies detected in your data.`
        : `${analysis.summary.total} anomalies détectées sur vos données.`,
    });
  };

  // Show loading state
  if (isLoading && !financialData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
          <p className="text-muted">{isEn ? 'Loading...' : 'Chargement...'}</p>
        </div>
      </div>
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
    const headers = ['Sévérité', 'Catégorie', 'Titre', 'Description', 'Valeur', 'Seuil', 'Recommandation'];
    const rows = filteredAnomalies.map(a => [
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
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `anomalies-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    showToast({
      type: 'success',
      title: 'Export réussi',
      message: `${filteredAnomalies.length} anomalies exportées en CSV.`,
    });
  };

  const toggleAnomaly = (id: string) => {
    setExpandedAnomalies(prev => {
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
              <h2 className="text-xl sm:text-2xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Anomaly Detection' : 'Détection d\'anomalies'}
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
                  <span className="hidden xs:inline">{isEn ? 'AI-Powered' : 'IA'}</span>
                </span>
              )}
              <InfoTooltip
                title="Détection d'anomalies"
                titleEn="Anomaly Detection"
                content="Notre système analyse automatiquement vos données financières pour détecter les incohérences, valeurs aberrantes, et patterns inhabituels."
                contentEn="Our system automatically analyzes your financial data to detect inconsistencies, outliers, and unusual patterns."
                example="Variance soudaine de 50% sur un compte, solde négatif sur un actif, ratio de liquidité en baisse continue."
                exampleEn="Sudden 50% variance on an account, negative balance on an asset, continuously declining liquidity ratio."
                impact="La détection précoce permet de corriger les erreurs avant la clôture et d'identifier les risques potentiels."
                impactEn="Early detection helps correct errors before closing and identify potential risks."
              />
            </div>
            <p className="text-xs sm:text-sm mt-1 hidden sm:block" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn 
                ? 'Analyze inconsistencies and anomalies in your financial data'
                : 'Analysez les incohérences et anomalies dans vos données financières'}
            </p>
          </div>
          
          {/* Last Analysis - Desktop */}
          <div className="hidden lg:flex items-center gap-2 text-xs whitespace-nowrap" style={{ color: 'rgb(var(--color-text-muted))' }}>
            <Clock className="w-3.5 h-3.5" />
            {lastRefresh.toLocaleTimeString(isEn ? 'en-CA' : 'fr-CA')}
          </div>
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
                },
              ]}
              value={useAIDetection ? 'ai' : 'standard'}
              onChange={(val) => setUseAIDetection(val === 'ai')}
              size="sm"
            />
            <InfoTooltip
              title="Mode d'analyse"
              titleEn="Analysis Mode"
              content="Standard: Détection basée sur des seuils configurables. IA: Algorithmes avancés incluant saisonnalité, corrélations, loi de Benford, et plus."
              contentEn="Standard: Threshold-based detection. AI: Advanced algorithms including seasonality, correlations, Benford's Law, and more."
              impact="Le mode IA offre une meilleure précision mais utilise plus de ressources."
              impactEn="AI mode offers better accuracy but uses more resources."
              size="sm"
            />
          </div>
          
          {/* Last Analysis - Mobile */}
          <div className="lg:hidden flex items-center gap-1.5 text-[10px] sm:text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
            <Clock className="w-3 h-3" />
            {lastRefresh.toLocaleTimeString(isEn ? 'en-CA' : 'fr-CA', { hour: '2-digit', minute: '2-digit' })}
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2 ml-auto">
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing || isAIAnalyzing}
              className="btn-secondary flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 sm:py-2"
              title={isEn ? 'Rerun analysis to detect new anomalies' : 'Relancer l\'analyse pour détecter les nouvelles anomalies'}
            >
              <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isRefreshing || isAIAnalyzing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {isRefreshing || isAIAnalyzing ? (isEn ? 'Analyzing...' : 'Analyse...') : (isEn ? 'Refresh' : 'Actualiser')}
              </span>
            </button>
            <Link 
              to="/app/settings?tab=anomalies" 
              className="btn-secondary flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 sm:py-2"
              title={isEn ? 'Customize anomaly detection thresholds' : 'Personnaliser les seuils de détection d\'anomalies'}
            >
              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{isEn ? 'Configure' : 'Configurer'}</span>
            </Link>
          </div>
        </div>
      </div>

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
              <Brain className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-xs sm:text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'AI Analysis Complete' : 'Analyse IA terminée'}
              </p>
              <p className="text-[10px] sm:text-xs truncate" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {combinedAnalysis.modelInfo.dataPointsAnalyzed.toLocaleString()} {isEn ? 'data points' : 'points'} • {combinedAnalysis.modelInfo.processingTime}ms
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
            <div className="text-center">
              <p className="text-[10px] sm:text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Confidence' : 'Confiance'}
              </p>
              <p className="text-base sm:text-lg font-bold" style={{ color: 'rgb(var(--color-primary-600))' }}>
                {Math.round(combinedAnalysis.aiConfidence)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] sm:text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Algorithms' : 'Algo.'}
              </p>
              <p className="text-base sm:text-lg font-bold" style={{ color: 'rgb(var(--color-text))' }}>
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

      {/* Helpful tip banner */}
      {showTip && analysis.summary.total > 0 && (
        <InfoBanner
          type="tip"
          title="Comment utiliser cette page"
          description="Les anomalies sont classées par sévérité: Critique (action immédiate requise), Attention (à surveiller), Info (pour information). Cliquez sur une anomalie pour voir les détails et la recommandation."
          dismissible
          onDismiss={() => setShowTip(false)}
        />
      )}

      {/* Health Score & Summary - Improved Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Health Score Card - Main Focus */}
        <div className="lg:col-span-5 xl:col-span-4">
          <HealthScoreGauge
            score={combinedAnalysis.healthScore}
            criticalCount={combinedAnalysis.summary.critical}
            warningCount={combinedAnalysis.summary.warning}
            infoCount={combinedAnalysis.summary.info}
            size="md"
            isEn={isEn}
            onClick={scrollToAnomalyList}
          />
        </div>
        
        {/* Summary Card - Expanded */}
        <div className="lg:col-span-7 xl:col-span-8 card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Summary' : 'Résumé'}
            </h3>
            <InfoTooltip
              title="Résumé des anomalies"
              titleEn="Anomaly Summary"
              content="Vue d'ensemble des anomalies détectées, groupées par niveau de sévérité."
              contentEn="Overview of detected anomalies, grouped by severity level."
              size="sm"
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Left: Total & Progress */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? 'Total anomalies' : 'Total anomalies'}
                </span>
                <span className="font-bold text-2xl tabular-nums" style={{ color: 'rgb(var(--color-text))' }}>
                  {combinedAnalysis.summary.total}
                </span>
              </div>
              <div 
                className="h-3 rounded-full overflow-hidden flex mb-4"
                style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
              >
                {combinedAnalysis.summary.total > 0 && (
                  <>
                    {combinedAnalysis.summary.critical > 0 && (
                      <div 
                        className="h-full transition-all duration-500"
                        style={{ 
                          width: `${(combinedAnalysis.summary.critical / combinedAnalysis.summary.total) * 100}%`,
                          backgroundColor: 'rgb(var(--color-error))'
                        }}
                      />
                    )}
                    {combinedAnalysis.summary.warning > 0 && (
                      <div 
                        className="h-full transition-all duration-500"
                        style={{ 
                          width: `${(combinedAnalysis.summary.warning / combinedAnalysis.summary.total) * 100}%`,
                          backgroundColor: 'rgb(var(--color-warning))'
                        }}
                      />
                    )}
                    {combinedAnalysis.summary.info > 0 && (
                      <div 
                        className="h-full transition-all duration-500"
                        style={{ 
                          width: `${(combinedAnalysis.summary.info / combinedAnalysis.summary.total) * 100}%`,
                          backgroundColor: 'rgb(var(--color-info))'
                        }}
                      />
                    )}
                  </>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div 
                  className="text-center p-3 rounded-xl"
                  style={{ backgroundColor: 'rgb(var(--color-error) / 0.1)' }}
                >
                  <div className="font-bold text-xl" style={{ color: 'rgb(var(--color-error))' }}>
                    {combinedAnalysis.summary.critical}
                  </div>
                  <div className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn ? 'Critical' : 'Critiques'}
                  </div>
                </div>
                <div 
                  className="text-center p-3 rounded-xl"
                  style={{ backgroundColor: 'rgb(var(--color-warning) / 0.1)' }}
                >
                  <div className="font-bold text-xl" style={{ color: 'rgb(var(--color-warning))' }}>
                    {combinedAnalysis.summary.warning}
                  </div>
                  <div className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    Attention
                  </div>
                </div>
                <div 
                  className="text-center p-3 rounded-xl"
                  style={{ backgroundColor: 'rgb(var(--color-info) / 0.1)' }}
                >
                  <div className="font-bold text-xl" style={{ color: 'rgb(var(--color-info))' }}>
                    {combinedAnalysis.summary.info}
                  </div>
                  <div className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>Info</div>
                </div>
              </div>
            </div>
            
            {/* Right: Top Risks */}
            <div 
              className="sm:border-l sm:pl-4"
              style={{ borderColor: 'rgb(var(--color-border))' }}
            >
              <p className="text-sm font-semibold mb-3" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Top Risks' : 'Risques principaux'}
              </p>
              {combinedAnalysis.summary.topRisks && combinedAnalysis.summary.topRisks.length > 0 ? (
                <ul className="space-y-2">
                  {combinedAnalysis.summary.topRisks.slice(0, 4).map((risk, idx) => (
                    <li 
                      key={idx}
                      className="text-sm flex items-start gap-2 p-2 rounded-lg"
                      style={{ 
                        backgroundColor: 'rgb(var(--color-bg-muted))',
                        color: 'rgb(var(--color-text-secondary))' 
                      }}
                    >
                      <span 
                        className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                        style={{ backgroundColor: 'rgb(var(--color-error))' }}
                      />
                      <span className="line-clamp-2">{risk}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div 
                  className="flex items-center justify-center h-32 rounded-xl"
                  style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
                >
                  <div className="text-center">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2" style={{ color: 'rgb(var(--color-success))' }} />
                    <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {isEn ? 'No critical risks' : 'Aucun risque critique'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Consolidated Grid: Ratios + Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Left: Ratios */}
        <div className="xl:col-span-4">
          <h3 className="text-base sm:text-lg font-semibold mb-3" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Financial Ratios' : 'Ratios financiers'}
          </h3>
          <div className="space-y-3">
            <CurrentRatioCard value={ratios.currentRatio} />
            <QuickRatioCard value={ratios.quickRatio} />
            <DebtToEquityCard value={ratios.debtToEquity} />
          </div>
        </div>

        {/* Right: Trend Charts */}
        <div className="xl:col-span-8">
          <h3 className="text-base sm:text-lg font-semibold mb-3" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Trend Analysis' : 'Analyse des tendances'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TrendChart
              data={revenueData}
              title={isEn ? "Revenue Trend" : "Évolution des revenus"}
              titleEn="Revenue Trend"
              subtitle={isEn ? "Automatic outlier detection" : "Détection automatique des valeurs aberrantes"}
              subtitleEn="Automatic outlier detection"
              isEn={isEn}
            />
            <TrendChart
              data={expenseData}
              title={isEn ? "Expense Trend" : "Évolution des dépenses"}
              titleEn="Expense Trend"
              subtitle={isEn ? "Trend and alert thresholds" : "Tendance et seuils d'alerte"}
              subtitleEn="Trend and alert thresholds"
              color="rgb(var(--color-error))"
              isEn={isEn}
            />
          </div>
        </div>
      </div>

      {/* Variance Chart - Full Width */}
      <VarianceChart
        data={accountsData.slice(0, 8).map(a => ({
          label: a.name,
          current: a.current,
          prior: a.prior,
          code: a.code,
        }))}
        title={isEn ? "Account Variance Analysis" : "Analyse des variances par compte"}
        thresholds={thresholds}
      />

      {/* Anomaly List - Responsive */}
      <div ref={anomalyListRef} className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base sm:text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Detected Anomalies' : 'Anomalies détectées'}
            </h3>
            <p className="text-[10px] sm:text-xs hidden sm:block" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Click on an anomaly to see details and recommendation' : 'Cliquez sur une anomalie pour voir les détails'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-2 flex-1 sm:flex-initial">
              <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" style={{ color: 'rgb(var(--color-text-muted))' }} />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as AnomalyCategory | 'all')}
                className="select text-xs sm:text-sm flex-1 sm:flex-initial min-w-0"
                title={isEn ? "Filter anomalies by category" : "Filtrer par catégorie"}
              >
                <option value="all">{isEn ? 'All categories' : 'Toutes'}</option>
                {Object.entries(categoryLabels).map(([key, { label, labelEn }]) => (
                  <option key={key} value={key}>{isEn ? labelEn : label}</option>
                ))}
              </select>
            </div>
            <button 
              onClick={handleExport}
              className="btn-secondary text-xs sm:text-sm flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap"
              title={isEn ? "Export anomaly list to CSV" : "Exporter en CSV"}
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">{isEn ? 'Export' : 'Exporter'}</span>
            </button>
          </div>
        </div>

        {filteredAnomalies.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle 
              className="w-12 h-12 mx-auto mb-4"
              style={{ color: 'rgb(var(--color-success))' }}
            />
            <p className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
              Aucune anomalie détectée
            </p>
            <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
              Vos données financières sont cohérentes
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredAnomalies.map((anomaly) => {
              const style = getSeverityStyle(anomaly.severity);
              const CategoryIcon = categoryLabels[anomaly.category]?.icon || AlertTriangle;
              const isExpanded = expandedAnomalies.has(anomaly.id);
              const isAIAnomaly = 'aiType' in anomaly;
              const aiAnomaly = isAIAnomaly ? anomaly as AIAnomaly : null;

              return (
                <div
                  key={anomaly.id}
                  className="border rounded-lg overflow-hidden transition-all"
                  style={{ borderColor: style.borderColor }}
                >
                  <button
                    onClick={() => toggleAnomaly(anomaly.id)}
                    className="w-full flex items-start sm:items-center gap-2 sm:gap-3 p-3 sm:p-4 text-left transition-colors hover:opacity-90"
                    style={{ backgroundColor: style.bgColor }}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 flex-shrink-0 mt-0.5 sm:mt-0" style={{ color: style.textColor }} />
                    ) : (
                      <ChevronRight className="w-4 h-4 flex-shrink-0 mt-0.5 sm:mt-0" style={{ color: style.textColor }} />
                    )}
                    
                    <div 
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'rgb(var(--color-surface))' }}
                    >
                      <CategoryIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: style.textColor }} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start sm:items-center gap-1.5 sm:gap-2 flex-col sm:flex-row sm:flex-wrap">
                        <span className="font-medium text-sm sm:text-base" style={{ color: 'rgb(var(--color-text))' }}>
                          {anomaly.title}
                        </span>
                        <span 
                          className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: style.bgColor, color: style.textColor }}
                        >
                          {anomaly.severity === 'critical' 
                            ? (isEn ? 'Critical' : 'Critique')
                            : anomaly.severity === 'warning' 
                              ? (isEn ? 'Warning' : 'Attention')
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
                      <p className="text-sm truncate" style={{ color: 'rgb(var(--color-text-muted))' }}>
                        {anomaly.description}
                      </p>
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
                      {isAIAnomaly && aiAnomaly && ANOMALY_TOOLTIPS[aiAnomaly.aiType] && (
                        <AnomalyTooltip
                          type={aiAnomaly.aiType}
                          confidence={aiAnomaly.confidence}
                          explanation={aiAnomaly.explanation}
                          explanationEn={aiAnomaly.explanationEn}
                          technicalDetails={aiAnomaly.technicalDetails}
                          suggestedActions={aiAnomaly.suggestedActions}
                          impactScore={aiAnomaly.impactScore}
                        />
                      )}
                    </div>
                  </button>
                  
                  {isExpanded && (
                    <div 
                      className="px-4 pb-4 pt-2 border-t"
                      style={{ 
                        backgroundColor: 'rgb(var(--color-surface))',
                        borderColor: style.borderColor
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
                            <Brain className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
                            <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                              {isEn ? 'AI Explanation' : 'Explication IA'}
                            </span>
                          </div>
                          <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                            {isEn ? aiAnomaly.explanationEn : aiAnomaly.explanation}
                          </p>
                          
                          {/* Impact bar */}
                          <div className="flex items-center gap-2 mt-3">
                            <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
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
                                  backgroundColor: aiAnomaly.impactScore > 70 
                                    ? 'rgb(var(--color-error))' 
                                    : aiAnomaly.impactScore > 40 
                                      ? 'rgb(var(--color-warning))'
                                      : 'rgb(var(--color-success))',
                                }}
                              />
                            </div>
                            <span className="text-xs font-medium" style={{ color: 'rgb(var(--color-text))' }}>
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
                            <span className="ml-2 font-mono" style={{ color: 'rgb(var(--color-text))' }}>
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
                            <span className="ml-2 font-mono" style={{ color: 'rgb(var(--color-text))' }}>
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
                            <span className="ml-2 font-mono" style={{ color: 'rgb(var(--color-text))' }}>
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
                        <p className="text-sm font-medium mb-1" style={{ color: 'rgb(var(--color-text))' }}>
                          💡 {isEn ? 'Recommendation' : 'Recommandation'}
                        </p>
                        <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                          {anomaly.recommendation}
                        </p>
                      </div>
                      
                      {/* Suggested Actions - AI only */}
                      {isAIAnomaly && aiAnomaly?.suggestedActions && aiAnomaly.suggestedActions.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-medium mb-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
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
                          {isEn ? 'View Report' : 'Voir le rapport'} <ArrowRight className="w-4 h-4" />
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
