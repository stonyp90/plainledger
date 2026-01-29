import { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  AlertTriangle, 
  CheckCircle,
  RefreshCw,
  ChevronRight,
  FileText,
  Link2,
  Loader2,
  Sparkles,
  BarChart2,
  Lock,
  Calendar,
  Building2,
  Home,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Target,
  Calculator,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Tooltip } from '../components/Tooltip';
import { TrendChart, WaterfallChart } from '../components/charts';
import KPICard from '../components/KPICard';
import MetricCard from '../components/MetricCard';
import { 
  AgingWidget, 
  BankReconciliationWidget, 
  BudgetWidget, 
  DeadlinesWidget,
  TrialBalanceSummary 
} from '../components/AccountingWidgets';
import AIQueryAssistant from '../components/AIQueryAssistant';
import DecisionCapture from '../components/DecisionCapture';
import PremiumFeatureGate, { usePremiumFeature } from '../components/PremiumFeatureGate';
import DemoBanner from '../components/DemoBanner';
import DemoSignupWelcome from '../components/DemoSignupWelcome';
import { useTenant } from '../contexts/TenantContext';
import { useToast } from '../contexts/ToastContext';
import { useDemoMode } from '../contexts/DemoModeContext';
import { useAuth } from '../lib/keycloak';
import { useI18n } from '../lib/i18n';
import { useFinancialData } from '../hooks/useFinancialData';
import { 
  runFullAnalysis, 
  DEFAULT_THRESHOLDS,
  type AccountBalance,
} from '../lib/anomalyDetection';
import { INDUSTRY_KPIS } from '../components/IndustryKPISection';
import type { DataMetric, DecisionEvent } from '../lib/decisionContext';

// =====================================================
// DASHBOARD COMPONENT
// =====================================================

// Calendly URL for upgrade calls
const CALENDLY_URL = 'https://calendly.com/anthonypaquet1508';

export default function Dashboard() {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const toast = useToast();
  const { isDemoMode, enableDemoMode } = useDemoMode();
  const { t, language } = useI18n();
  const isEn = language === 'en';
  const [selectedPeriod, setSelectedPeriod] = useState<'mtd' | 'qtd' | 'ytd'>('mtd');
  const { hasAccess: hasAIAccess } = usePremiumFeature('aiInsights');
  
  // Decision capture feature - must be manually enabled per organization
  // Requires both AI access (premium) AND the decisionCapture feature flag to be enabled
  const hasDecisionCapture = hasAIAccess && (currentTenant?.settings?.features?.decisionCapture ?? false);
  
  // Auto-enable demo mode for demo-signup users
  const isDemoSignupUser = user?.organization === 'demo-signup';
  useEffect(() => {
    if (isDemoSignupUser && !isDemoMode) {
      enableDemoMode();
    }
  }, [isDemoSignupUser, isDemoMode, enableDemoMode]);
  
  // Fetch financial data from the data service
  const { data: financialData, isLoading, refresh, error } = useFinancialData();

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

  // Helper to filter data by period - show enough data points for meaningful visualization
  const filterDataByPeriod = <T,>(data: T[], period: 'mtd' | 'qtd' | 'ytd'): T[] => {
    if (!data.length) return [];
    switch (period) {
      case 'mtd':
        // Show current month only (last data point) - need at least 2 for a line
        // Show last 2 months to have a comparison point
        return data.slice(-2);
      case 'qtd':
        // Show last 3 months for quarterly view
        return data.slice(-3);
      case 'ytd':
      default:
        return data; // All 12 months
    }
  };

  // Get revenue trend data filtered by period
  const revenueData = useMemo(() => {
    if (!financialData) return [];
    return filterDataByPeriod(financialData.trends.revenue.data, selectedPeriod);
  }, [financialData, selectedPeriod]);

  // Get cash flow trend data filtered by period
  const cashFlowData = useMemo(() => {
    if (!financialData) return [];
    return filterDataByPeriod(financialData.trends.cashFlow.data, selectedPeriod);
  }, [financialData, selectedPeriod]);

  // Get budget data filtered by period
  const revenueBudget = useMemo(() => {
    if (!financialData) return [];
    const budget = financialData.trends.revenue.budget || [];
    return filterDataByPeriod(budget, selectedPeriod);
  }, [financialData, selectedPeriod]);

  // Calculate period totals for summary display
  const periodSummary = useMemo(() => {
    const totalRevenue = revenueData.reduce((sum, d) => sum + d.value, 0);
    const totalCashFlow = cashFlowData.reduce((sum, d) => sum + d.value, 0);
    const totalBudget = revenueBudget.reduce((sum, b) => sum + b, 0);
    const budgetVariance = totalBudget > 0 ? ((totalRevenue - totalBudget) / totalBudget) * 100 : 0;
    
    return {
      totalRevenue,
      totalCashFlow,
      totalBudget,
      budgetVariance,
      dataPoints: revenueData.length,
    };
  }, [revenueData, cashFlowData, revenueBudget]);

  // Get waterfall data
  const cashFlowWaterfallData = useMemo(() => {
    if (!financialData) return [];
    return financialData.cashFlowWaterfall;
  }, [financialData]);

  const analysis = useMemo(() => {
    if (!accountsData.length || !revenueData.length) {
      return { anomalies: [], summary: { critical: 0, warning: 0, info: 0, total: 0 }, healthScore: 100 };
    }
    return runFullAnalysis(accountsData, revenueData, DEFAULT_THRESHOLDS);
  }, [accountsData, revenueData]);


  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  
  // Decision capture state
  const [showDecisionCapture, setShowDecisionCapture] = useState(false);
  const [decisionTrigger, setDecisionTrigger] = useState<{
    metricType: DataMetric;
    metricLabel: string;
    chartId: string;
    currentValue: number;
    benchmarkValue?: number;
    period?: string;
  } | null>(null);
  const [recentDecisions, setRecentDecisions] = useState<DecisionEvent[]>([]);

  // Handle opening decision capture from a chart
  const handleRecordDecision = useCallback((trigger: {
    metricType: DataMetric;
    metricLabel: string;
    chartId: string;
    currentValue: number;
    benchmarkValue?: number;
    period?: string;
  }) => {
    setDecisionTrigger(trigger);
    setShowDecisionCapture(true);
  }, []);

  // Handle decision submission
  const handleDecisionSubmit = useCallback(async (decision: DecisionEvent) => {
    try {
      // In production, this would POST to the API
      // For now, store in local state and show toast
      setRecentDecisions(prev => [decision, ...prev].slice(0, 10));
      toast.success(
        language === 'en' ? 'Decision recorded!' : 'Décision enregistrée!',
        language === 'en' 
          ? 'Your decision has been logged and will be tracked for outcome measurement.'
          : 'Votre décision a été enregistrée et sera suivie pour mesurer les résultats.'
      );
      setShowDecisionCapture(false);
      setDecisionTrigger(null);
    } catch {
      toast.error(
        language === 'en' ? 'Error' : 'Erreur',
        language === 'en' ? 'Failed to save decision' : 'Échec de l\'enregistrement de la décision'
      );
    }
  }, [toast, language]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
    toast.success(t('dashboard.dataUpdated'), t('dashboard.allDataUpToDate'));
  };

  // Show cutting-edge skeleton loading state
  if (isLoading && !financialData) {
    return (
      <div className="space-y-4 sm:space-y-6 animate-pulse">
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="h-6 sm:h-8 w-36 sm:w-48 rounded-lg bg-gradient-to-r from-[rgb(var(--color-bg-muted))] via-[rgb(var(--color-border))] to-[rgb(var(--color-bg-muted))] animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
            <div className="h-3 sm:h-4 w-24 sm:w-32 mt-2 rounded bg-[rgb(var(--color-bg-muted))]" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 sm:h-9 w-24 sm:w-32 rounded-lg bg-[rgb(var(--color-bg-muted))]" />
            <div className="h-8 sm:h-9 w-20 sm:w-24 rounded-lg bg-[rgb(var(--color-bg-muted))]" />
          </div>
        </div>
        
        {/* KPI cards skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <div 
              key={i}
              className="rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5 relative overflow-hidden"
              style={{ backgroundColor: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-border))' }}
            >
              <div className="h-2.5 sm:h-3 w-16 sm:w-20 rounded bg-[rgb(var(--color-bg-muted))] mb-3 sm:mb-4" />
              <div className="h-6 sm:h-8 w-20 sm:w-28 rounded bg-[rgb(var(--color-bg-muted))] mb-2 sm:mb-3" />
              <div className="h-3 sm:h-4 w-12 sm:w-16 rounded bg-[rgb(var(--color-bg-muted))]" />
              {/* Shimmer effect */}
              <div 
                className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgb(var(--color-bg-muted) / 0.4), transparent)',
                }}
              />
            </div>
          ))}
        </div>
        
        {/* Ratios skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <div 
              key={i}
              className="rounded-lg sm:rounded-xl p-3 sm:p-4"
              style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
            >
              <div className="h-2.5 sm:h-3 w-20 sm:w-24 rounded bg-[rgb(var(--color-border))] mb-2 sm:mb-3" />
              <div className="h-5 sm:h-7 w-12 sm:w-16 rounded bg-[rgb(var(--color-border))]" />
            </div>
          ))}
        </div>
        
        {/* Charts skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {[...Array(2)].map((_, i) => (
            <div 
              key={i}
              className="rounded-lg sm:rounded-xl p-4 sm:p-6 h-48 sm:h-56 lg:h-64"
              style={{ backgroundColor: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-border))' }}
            >
              <div className="h-4 sm:h-5 w-24 sm:w-32 rounded bg-[rgb(var(--color-bg-muted))] mb-2" />
              <div className="h-2.5 sm:h-3 w-32 sm:w-48 rounded bg-[rgb(var(--color-bg-muted))] mb-4 sm:mb-6" />
              <div className="h-28 sm:h-32 lg:h-40 rounded bg-[rgb(var(--color-bg-muted))]" />
            </div>
          ))}
        </div>
        
        {/* Loading indicator */}
        <div className="flex items-center justify-center py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative">
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" style={{ color: 'rgb(var(--color-primary-500))' }} />
            </div>
            <span className="text-xs sm:text-sm font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {t('common.loading')}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="card p-8 text-center">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-error" />
        <h3 className="font-semibold text-lg mb-2">{t('common.error')}</h3>
        <p className="text-muted mb-4">{error.message}</p>
        <button onClick={handleRefresh} className="btn-primary">
          {t('common.retry')}
        </button>
      </div>
    );
  }

  const periods = [
    { id: 'mtd', label: t('dashboard.period.month') },
    { id: 'qtd', label: t('dashboard.period.quarter') },
    { id: 'ytd', label: t('dashboard.period.year') },
  ];

  return (
    <div className="space-y-4 sm:space-y-6" style={{ backgroundColor: 'rgb(var(--color-bg))' }}>
      {/* Demo Signup Welcome Banner - Shows for new signups */}
      <DemoSignupWelcome />
      
      {/* Demo Banner */}
      <DemoBanner />
      
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-primary truncate">
              {currentTenant ? currentTenant.name : t('dashboard.title')}
            </h1>
            <p className="text-xs sm:text-sm mt-0.5 sm:mt-1 text-muted">
              {t('dashboard.subtitle')}
            </p>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 flex-wrap">
            <div 
              className="flex rounded-lg sm:rounded-xl p-0.5"
              style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
            >
              {periods.map(period => (
                <button
                  key={period.id}
                  onClick={() => setSelectedPeriod(period.id as 'mtd' | 'qtd' | 'ytd')}
                  className="px-2 sm:px-3 lg:px-4 py-1 sm:py-1.5 rounded-md text-xs font-medium transition-all"
                  style={{
                    backgroundColor: selectedPeriod === period.id 
                      ? 'rgb(var(--color-primary-500))' 
                      : 'transparent',
                    color: selectedPeriod === period.id 
                      ? 'white' 
                      : 'rgb(var(--color-text-muted))',
                    boxShadow: selectedPeriod === period.id 
                      ? '0 1px 3px rgb(var(--color-primary-500) / 0.3)' 
                      : 'none',
                  }}
                >
                  {period.label}
                </button>
              ))}
            </div>
            
            <button
              onClick={handleRefresh}
              className="btn-secondary btn-sm flex items-center gap-1 sm:gap-1.5 !px-2 sm:!px-3 flex-shrink-0"
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isRefreshing ? t('common.refreshing') : t('common.refresh')}</span>
            </button>

            <button
              onClick={() => {
                if (hasAIAccess) {
                  setShowAIAssistant(true);
                } else {
                  window.open(CALENDLY_URL, '_blank');
                }
              }}
              className={`btn-sm flex items-center gap-1 sm:gap-1.5 !px-2 sm:!px-3 flex-shrink-0 ${
                hasAIAccess ? 'btn-primary' : ''
              }`}
              style={!hasAIAccess ? {
                background: 'linear-gradient(135deg, rgb(var(--color-warning) / 0.15) 0%, rgb(var(--color-warning) / 0.1) 100%)',
                color: 'rgb(var(--color-warning))',
                border: '1px solid rgb(var(--color-warning) / 0.3)',
              } : undefined}
              title={hasAIAccess 
                ? (language === 'en' ? 'Ask James' : 'Demander à James')
                : (language === 'en' ? 'Upgrade to unlock AI' : 'Passez au niveau supérieur pour l\'IA')
              }
            >
              {hasAIAccess ? (
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              ) : (
                <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              )}
              <span className="hidden sm:inline">
                {hasAIAccess 
                  ? (language === 'en' ? 'Ask James' : 'Demander')
                  : (language === 'en' ? 'Upgrade' : 'Mise à niveau')
                }
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Period Summary - Shows totals for selected period */}
      <div 
        className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 p-3 sm:p-4 rounded-xl"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          border: '1px solid rgb(var(--color-border))',
        }}
      >
        <div className="text-center p-2 sm:p-3 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
          <p className="text-[10px] sm:text-xs font-medium mb-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {language === 'en' ? 'Period Revenue' : 'Revenus période'}
          </p>
          <p className="text-sm sm:text-base lg:text-lg font-bold" style={{ color: 'rgb(var(--color-text))' }}>
            ${(periodSummary.totalRevenue / 1000).toFixed(0)}K
          </p>
        </div>
        <div className="text-center p-2 sm:p-3 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
          <p className="text-[10px] sm:text-xs font-medium mb-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {language === 'en' ? 'Cash Flow' : 'Flux trésorerie'}
          </p>
          <p 
            className="text-sm sm:text-base lg:text-lg font-bold" 
            style={{ 
              color: periodSummary.totalCashFlow >= 0 
                ? 'rgb(var(--color-success))' 
                : 'rgb(var(--color-error))' 
            }}
          >
            {periodSummary.totalCashFlow >= 0 ? '+' : ''}${(periodSummary.totalCashFlow / 1000).toFixed(0)}K
          </p>
        </div>
        <div className="text-center p-2 sm:p-3 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
          <p className="text-[10px] sm:text-xs font-medium mb-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {language === 'en' ? 'vs Budget' : 'vs Budget'}
          </p>
          <p 
            className="text-sm sm:text-base lg:text-lg font-bold" 
            style={{ 
              color: periodSummary.budgetVariance >= 0 
                ? 'rgb(var(--color-success))' 
                : 'rgb(var(--color-error))' 
            }}
          >
            {periodSummary.budgetVariance >= 0 ? '+' : ''}{periodSummary.budgetVariance.toFixed(1)}%
          </p>
        </div>
        <div className="text-center p-2 sm:p-3 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
          <p className="text-[10px] sm:text-xs font-medium mb-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {language === 'en' ? 'Data Points' : 'Points données'}
          </p>
          <p className="text-sm sm:text-base lg:text-lg font-bold" style={{ color: 'rgb(var(--color-text))' }}>
            {periodSummary.dataPoints} {language === 'en' ? 'months' : 'mois'}
          </p>
        </div>
      </div>

      {/* Anomalies List - With severity breakdown and notification CTA */}
      {analysis.summary.total > 0 && (
        <div 
          className="rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-5"
          style={{ 
            backgroundColor: 'rgb(var(--color-surface))',
            border: analysis.summary.critical > 0 
              ? '1px solid rgb(var(--color-error) / 0.3)' 
              : '1px solid rgb(var(--color-border))',
          }}
        >
          <Link 
            to="/app/anomalies"
            className="block hover:opacity-90 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2 sm:gap-3 mb-3">
              <div 
                className="w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ 
                  backgroundColor: analysis.summary.critical > 0 
                    ? 'rgb(var(--color-error) / 0.1)' 
                    : 'rgb(var(--color-warning) / 0.1)',
                }}
              >
                <AlertTriangle 
                  className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" 
                  style={{ 
                    color: analysis.summary.critical > 0 
                      ? 'rgb(var(--color-error))' 
                      : 'rgb(var(--color-warning))',
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base lg:text-lg font-semibold truncate" style={{ color: 'rgb(var(--color-text))' }}>
                  {analysis.summary.total} {language === 'en' ? 'anomalies detected' : 'anomalies détectées'}
                </h3>
                <p className="text-xs sm:text-sm mt-0.5 sm:mt-1 truncate" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {language === 'en' ? 'Action required - Click to review' : 'Action requise - Cliquez pour examiner'}
                </p>
              </div>
              <ChevronRight 
                className="w-4 h-4 sm:w-5 sm:h-5 opacity-50 group-hover:opacity-100 transition-opacity flex-shrink-0" 
                style={{ color: 'rgb(var(--color-text-muted))' }}
              />
            </div>
            
            {/* Severity breakdown badges */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap ml-0 sm:ml-[52px]">
              {analysis.summary.critical > 0 && (
                <span 
                  className="inline-flex items-center gap-1 px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-error) / 0.1)',
                    color: 'rgb(var(--color-error))',
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'rgb(var(--color-error))' }} />
                  {analysis.summary.critical} {language === 'en' ? 'critical' : 'critique'}{analysis.summary.critical > 1 ? 's' : ''}
                </span>
              )}
              {analysis.summary.warning > 0 && (
                <span 
                  className="inline-flex items-center gap-1 px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-warning) / 0.1)',
                    color: 'rgb(var(--color-warning))',
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'rgb(var(--color-warning))' }} />
                  {analysis.summary.warning} {language === 'en' ? 'warning' : 'avertissement'}{analysis.summary.warning > 1 ? 's' : ''}
                </span>
              )}
              {analysis.summary.info > 0 && (
                <span 
                  className="inline-flex items-center gap-1 px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-info) / 0.1)',
                    color: 'rgb(var(--color-info))',
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'rgb(var(--color-info))' }} />
                  {analysis.summary.info} info
                </span>
              )}
            </div>
          </Link>
          
          {/* Notification setup CTA */}
          <div 
            className="mt-3 pt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3"
            style={{ borderTop: '1px solid rgb(var(--color-border))' }}
          >
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="text-[10px] sm:text-xs whitespace-nowrap" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {language === 'en' ? 'Get notified via:' : 'Recevoir les alertes via:'}
              </span>
              <div className="flex items-center gap-0.5 sm:gap-1 flex-wrap">
                {/* Slack - Brand colors */}
                <div 
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center cursor-pointer hover:scale-110 transition-transform flex-shrink-0"
                  style={{ backgroundColor: '#4A154B15' }}
                  title="Slack"
                >
                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" viewBox="0 0 24 24" fill="none">
                    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52z" fill="#E01E5A"/>
                    <path d="M6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A"/>
                    <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834z" fill="#36C5F0"/>
                    <path d="M8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0"/>
                    <path d="M18.958 8.834a2.528 2.528 0 0 1 2.52-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.52V8.834z" fill="#2EB67D"/>
                    <path d="M17.687 8.834a2.528 2.528 0 0 1-2.521 2.521 2.528 2.528 0 0 1-2.521-2.521V2.522A2.528 2.528 0 0 1 15.166 0a2.528 2.528 0 0 1 2.521 2.522v6.312z" fill="#2EB67D"/>
                    <path d="M15.166 18.958a2.528 2.528 0 0 1 2.521 2.52A2.528 2.528 0 0 1 15.166 24a2.528 2.528 0 0 1-2.521-2.522v-2.52h2.521z" fill="#ECB22E"/>
                    <path d="M15.166 17.687a2.528 2.528 0 0 1-2.521-2.521 2.528 2.528 0 0 1 2.521-2.521h6.312A2.528 2.528 0 0 1 24 15.166a2.528 2.528 0 0 1-2.522 2.521h-6.312z" fill="#ECB22E"/>
                  </svg>
                </div>
                {/* Microsoft Teams - Clean brand logo */}
                <div 
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center cursor-pointer hover:scale-110 transition-transform flex-shrink-0"
                  style={{ backgroundColor: '#5059C915' }}
                  title="Microsoft Teams"
                >
                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" viewBox="0 0 24 24" fill="none">
                    {/* Background person (smaller, behind) */}
                    <circle cx="19" cy="5.5" r="2" fill="#5059C9"/>
                    <path d="M22 9h-6c-.6 0-1 .4-1 1v5c0 2.2 1.8 4 4 4s4-1.8 4-4v-5c0-.6-.4-1-1-1z" fill="#5059C9"/>
                    {/* Foreground person (larger, in front) */}
                    <circle cx="13" cy="4" r="3" fill="#7B83EB"/>
                    <path d="M17 8H4c-.6 0-1 .4-1 1v7c0 3.3 2.7 6 6 6h2c3.3 0 6-2.7 6-6V9c0-.6-.4-1-1-1z" fill="#7B83EB"/>
                    {/* T letter */}
                    <path d="M6.5 11h7v1.5h-2.5v5h-2v-5H6.5V11z" fill="#fff"/>
                  </svg>
                </div>
                {/* Google Chat - Brand color */}
                <div 
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center cursor-pointer hover:scale-110 transition-transform flex-shrink-0"
                  style={{ backgroundColor: '#00AC4715' }}
                  title="Google Chat"
                >
                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" viewBox="0 0 24 24" fill="none">
                    <path d="M6 4h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-4l-4 4v-4H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="#00AC47"/>
                    <circle cx="8" cy="10" r="1" fill="#fff"/>
                    <circle cx="12" cy="10" r="1" fill="#fff"/>
                    <circle cx="16" cy="10" r="1" fill="#fff"/>
                  </svg>
                </div>
                {/* Discord - Brand color */}
                <div 
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center cursor-pointer hover:scale-110 transition-transform flex-shrink-0"
                  style={{ backgroundColor: '#5865F215' }}
                  title="Discord"
                >
                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" viewBox="0 0 24 24" fill="#5865F2">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                </div>
                {/* Email - Theme primary color */}
                <div 
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center cursor-pointer hover:scale-110 transition-transform flex-shrink-0"
                  style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
                  title="Email"
                >
                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'rgb(var(--color-primary-500))' }}>
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </div>
                {/* SMS - Success green color */}
                <div 
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center cursor-pointer hover:scale-110 transition-transform flex-shrink-0"
                  style={{ backgroundColor: 'rgb(var(--color-success) / 0.1)' }}
                  title="SMS"
                >
                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'rgb(var(--color-success))' }}>
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </div>
                {/* Webhook - Accent color */}
                <div 
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center cursor-pointer hover:scale-110 transition-transform flex-shrink-0"
                  style={{ backgroundColor: 'rgb(var(--color-accent-500) / 0.1)' }}
                  title="Webhook"
                >
                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'rgb(var(--color-accent-600))' }}>
                    <path d="M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2" />
                    <path d="m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06" />
                    <path d="m12 6 3.13 5.73c.53.97 1.74 1.43 2.88 1.1A4 4 0 1 1 19.5 21" />
                  </svg>
                </div>
              </div>
            </div>
            <Link
              to="/app/settings?tab=notifications"
              className="text-[10px] sm:text-xs font-medium px-2 sm:px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap flex-shrink-0"
              style={{ 
                backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
                color: 'rgb(var(--color-primary-500))',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {language === 'en' ? 'Set up alerts' : 'Configurer les alertes'}
            </Link>
          </div>
        </div>
      )}

      {/* Industry-Specific KPIs Section - HERO SECTION */}
      <IndustryKPISectionDashboard 
        industry={currentTenant?.industry || 'real_estate'} 
        isEn={language === 'en'} 
      />

      {/* Portfolio Summary Section */}
      <PortfolioSummarySection 
        industry={currentTenant?.industry || 'real_estate'} 
        isEn={language === 'en'} 
      />

      {/* Charts - Industry-Specific Revenue & Cash Flow Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
        <TrendChart
          data={revenueData}
          title={getIndustryChartTitle(currentTenant?.industry || 'real_estate', 'revenue', isEn)}
          titleEn={getIndustryChartTitle(currentTenant?.industry || 'real_estate', 'revenue', true)}
          subtitle={
            selectedPeriod === 'mtd' 
              ? (language === 'en' ? `Current month (${revenueData.length} points)` : `Mois courant (${revenueData.length} points)`)
              : selectedPeriod === 'qtd'
                ? (language === 'en' ? `Last quarter (${revenueData.length} months)` : `Dernier trimestre (${revenueData.length} mois)`)
                : (language === 'en' ? `Full year (${revenueData.length} months)` : `Année complète (${revenueData.length} mois)`)
          }
          subtitleEn={
            selectedPeriod === 'mtd' 
              ? `Current month (${revenueData.length} points)`
              : selectedPeriod === 'qtd'
                ? `Last quarter (${revenueData.length} months)`
                : `Full year (${revenueData.length} months)`
          }
          budget={revenueBudget}
          color="rgb(var(--color-primary-500))"
          height={200}
          isEn={language === 'en'}
          enableDecisions={hasDecisionCapture}
          onRecordDecision={handleRecordDecision}
          recentDecisions={recentDecisions.filter(d => d.context.metricType === 'revenue')}
          metricType="revenue"
          benchmarkValue={revenueBudget.length > 0 ? revenueBudget[revenueBudget.length - 1] : undefined}
        />
        <TrendChart
          data={cashFlowData}
          title={getIndustryChartTitle(currentTenant?.industry || 'real_estate', 'cashFlow', isEn)}
          titleEn={getIndustryChartTitle(currentTenant?.industry || 'real_estate', 'cashFlow', true)}
          subtitle={
            selectedPeriod === 'mtd' 
              ? (language === 'en' ? `Current month (${cashFlowData.length} points)` : `Mois courant (${cashFlowData.length} points)`)
              : selectedPeriod === 'qtd'
                ? (language === 'en' ? `Last quarter (${cashFlowData.length} months)` : `Dernier trimestre (${cashFlowData.length} mois)`)
                : (language === 'en' ? `Full year (${cashFlowData.length} months)` : `Année complète (${cashFlowData.length} mois)`)
          }
          subtitleEn={
            selectedPeriod === 'mtd' 
              ? `Current month (${cashFlowData.length} points)`
              : selectedPeriod === 'qtd'
                ? `Last quarter (${cashFlowData.length} months)`
                : `Full year (${cashFlowData.length} months)`
          }
          color="rgb(var(--color-primary-500))"
          height={200}
          isEn={language === 'en'}
          enableDecisions={hasDecisionCapture}
          onRecordDecision={handleRecordDecision}
          recentDecisions={recentDecisions.filter(d => d.context.metricType === 'cash_flow')}
          metricType="cash_flow"
        />
      </div>

      {/* Cash Flow Waterfall - Industry-focused cash movements */}
      <WaterfallChart
        data={cashFlowWaterfallData}
        title={getIndustryChartTitle(currentTenant?.industry || 'real_estate', 'waterfall', isEn)}
        titleEn={getIndustryChartTitle(currentTenant?.industry || 'real_estate', 'waterfall', true)}
        subtitle={getIndustryChartSubtitle(currentTenant?.industry || 'real_estate', isEn)}
        subtitleEn={getIndustryChartSubtitle(currentTenant?.industry || 'real_estate', true)}
        isEn={language === 'en'}
        height={260}
        enableDecisions={hasDecisionCapture}
        onRecordDecision={handleRecordDecision}
        metricType="cash_flow"
      />

      {/* Accounting Details Section - Collapsible */}
      <CollapsibleAccountingSection 
        financialData={financialData}
        analysis={analysis}
        language={language}
        isEn={language === 'en'}
        t={t}
      />

      {/* No Anomalies State */}
      {analysis.summary.total === 0 && (
        <div className="alert alert-success">
          <div className="alert-icon">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="alert-title">
              {t('dashboard.alerts.noAnomaliesDetected')}
            </p>
            <p className="alert-message">
              {t('dashboard.alerts.dataConsistent')}
            </p>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <QuickAction
          to="/app/anomalies"
          icon={<AlertTriangle className="w-5 h-5" />}
          title={t('dashboard.quickActions.anomalies')}
          subtitle={analysis.summary.total > 0 
            ? `${analysis.summary.total} ${t('dashboard.quickActions.toReview')}` 
            : t('anomalies.noAnomalies')}
          hasAttention={analysis.summary.critical > 0}
        />
        <QuickAction
          to="/app/reports/balance-sheet"
          icon={<FileText className="w-5 h-5" />}
          title={t('dashboard.quickActions.balanceSheet')}
          subtitle={t('dashboard.quickActions.financialStatement')}
        />
        <QuickAction
          to="/app/reports"
          icon={<BarChart2 className="w-5 h-5" />}
          title={t('dashboard.quickActions.reports')}
          subtitle={t('dashboard.quickActions.allReports')}
        />
        <QuickAction
          to="/app/connections"
          icon={<Link2 className="w-5 h-5" />}
          title={t('dashboard.quickActions.connections')}
          subtitle={t('dashboard.quickActions.dataSources')}
        />
      </div>

      {/* Upgrade CTA Section - Show for non-premium users */}
      {!hasAIAccess && (
        <div 
          className="relative overflow-hidden rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6"
          style={{ 
            backgroundColor: 'rgb(var(--color-surface))',
            border: '1px solid rgb(var(--color-border))',
            boxShadow: '0 4px 12px -4px rgb(var(--color-border) / 0.2)',
          }}
        >
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
              <div 
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
              >
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: 'rgb(var(--color-primary-500))' }} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg lg:text-xl font-bold mb-1 sm:mb-2" style={{ color: 'rgb(var(--color-text))' }}>
                  {language === 'en' ? 'Unlock Premium Features' : 'Débloquez les fonctionnalités Premium'}
                </h3>
                <p className="text-xs sm:text-sm max-w-xl leading-relaxed" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {language === 'en' 
                    ? 'Get AI-powered insights, strategic planning tools, board meeting presentations, and more.'
                    : 'Obtenez des analyses propulsées par l\'IA, des outils de planification stratégique, des présentations de CA, et plus encore.'
                  }
                </p>
                <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                  {[
                    language === 'en' ? 'AI Assistant' : 'Assistant IA',
                    language === 'en' ? 'Strategic Planning' : 'Planification stratégique',
                    language === 'en' ? 'Board Presentations' : 'Présentations CA',
                    language === 'en' ? 'Custom Analytics' : 'Analytique personnalisée',
                  ].map((feature, idx) => (
                    <span 
                      key={idx}
                      className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap"
                      style={{ 
                        backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
                        color: 'rgb(var(--color-primary-500))',
                      }}
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            <button
              onClick={() => window.open(CALENDLY_URL, '_blank')}
              className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold transition-all hover:scale-105 active:scale-95 flex-shrink-0 w-full sm:w-auto justify-center"
              style={{ 
                backgroundColor: 'rgb(var(--color-primary-500))',
                color: 'white',
              }}
            >
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>{language === 'en' ? 'Schedule Demo' : 'Planifier une démo'}</span>
            </button>
          </div>
        </div>
      )}

      {/* AI Query Assistant Modal */}
      {showAIAssistant && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAIAssistant(false)}
          />
          <div 
            className="relative w-full sm:max-w-2xl h-[85vh] sm:h-[600px] rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl"
            style={{ backgroundColor: 'rgb(var(--color-surface))' }}
          >
            {hasAIAccess ? (
              <AIQueryAssistant 
                isModal={true} 
                onClose={() => setShowAIAssistant(false)}
                recentDecisions={recentDecisions}
                industry={currentTenant?.industry || 'general'}
              />
            ) : (
              <PremiumFeatureGate feature="aiInsights" showPreview={false}>
                <div />
              </PremiumFeatureGate>
            )}
          </div>
        </div>
      )}

      {/* Decision Capture Modal */}
      {showDecisionCapture && decisionTrigger && (
        <DecisionCapture
          isOpen={showDecisionCapture}
          onClose={() => {
            setShowDecisionCapture(false);
            setDecisionTrigger(null);
          }}
          onSubmit={handleDecisionSubmit}
          metricType={decisionTrigger.metricType}
          metricLabel={decisionTrigger.metricLabel}
          currentValue={decisionTrigger.currentValue}
          benchmarkValue={decisionTrigger.benchmarkValue}
          period={decisionTrigger.period}
          industry={currentTenant?.industry || 'real_estate'}
          isEn={isEn}
        />
      )}
    </div>
  );
}

// =====================================================
// COLLAPSIBLE ACCOUNTING SECTION
// =====================================================

interface CollapsibleAccountingSectionProps {
  financialData: any;
  analysis: any;
  language: string;
  isEn: boolean;
  t: (key: string) => string;
}

function CollapsibleAccountingSection({ financialData, analysis, language, isEn, t }: CollapsibleAccountingSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasAccountingData = !!(
    financialData?.summary.trialBalance ||
    financialData?.summary.receivables ||
    financialData?.summary.payables ||
    financialData?.summary.budgetComparisons ||
    financialData?.summary.upcomingDeadlines ||
    financialData?.summary.bankAccounts
  );

  if (!hasAccountingData) return null;

  return (
    <div 
      className="rounded-xl sm:rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-md group"
      style={{ 
        backgroundColor: 'rgb(var(--color-surface))',
        border: '1px solid rgb(var(--color-border))',
      }}
    >
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 sm:p-4 lg:p-5 flex items-center justify-between transition-colors active:opacity-70 group-hover:bg-[rgb(var(--color-bg-muted))]"
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div 
            className="w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
          >
            <FileText className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" style={{ color: 'rgb(var(--color-text-muted))' }} />
          </div>
          <div className="text-left min-w-0 flex-1">
            <h3 className="text-sm sm:text-base lg:text-lg font-semibold truncate" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Accounting Details' : 'Détails comptables'}
            </h3>
            <p className="text-[10px] sm:text-xs mt-0.5 sm:mt-1 line-clamp-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'AR/AP aging, trial balance, bank reconciliation' : 'Échéances AR/AP, balance de vérification, rapprochement bancaire'}
            </p>
          </div>
        </div>
        <div className="flex-shrink-0 ml-2">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
          ) : (
            <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
          )}
        </div>
      </button>

      {/* Content - Collapsible */}
      {isExpanded && (
        <div className="px-3 sm:px-4 lg:px-5 pb-3 sm:pb-4 lg:pb-5 space-y-3 sm:space-y-4" style={{ borderTop: '1px solid rgb(var(--color-border))' }}>
          {/* Trial Balance Status */}
          {financialData?.summary.trialBalance && (
            <TrialBalanceSummary
              totalDebits={financialData.summary.trialBalance.totalDebits}
              totalCredits={financialData.summary.trialBalance.totalCredits}
              isBalanced={financialData.summary.trialBalance.isBalanced}
              isEn={isEn}
            />
          )}

          {/* Accounting-Specific Widgets */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {/* AR Aging */}
            {financialData?.summary.receivables && (
              <AgingWidget
                title="Comptes clients"
                titleEn="Accounts Receivable"
                data={financialData.summary.receivables.aging}
                totalOverdue={financialData.summary.receivables.totalOverdue}
                averageDays={financialData.summary.receivables.averageDaysOutstanding}
                type="receivable"
                isEn={isEn}
                hasData={financialData.summary.receivables.hasData}
              />
            )}

            {/* AP Aging - Shows empty state if no bills tracked */}
            {financialData?.summary.payables && (
              <AgingWidget
                title="Comptes fournisseurs"
                titleEn="Accounts Payable"
                data={financialData.summary.payables.aging}
                totalOverdue={financialData.summary.payables.totalOverdue}
                averageDays={financialData.summary.payables.averageDaysPayable}
                type="payable"
                isEn={isEn}
                hasData={financialData.summary.payables.hasData}
              />
            )}
          </div>

          {/* Budget vs Actual + Deadlines */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {/* Budget Comparison */}
            {financialData?.summary.budgetComparisons && (
              <BudgetWidget
                data={financialData.summary.budgetComparisons}
                isEn={isEn}
              />
            )}

            {/* Upcoming Deadlines */}
            {financialData?.summary.upcomingDeadlines && (
              <DeadlinesWidget
                deadlines={financialData.summary.upcomingDeadlines}
                isEn={isEn}
              />
            )}
          </div>

          {/* Bank Reconciliation */}
          {financialData?.summary.bankAccounts && (
            <BankReconciliationWidget
              accounts={financialData.summary.bankAccounts}
              isEn={isEn}
            />
          )}

          {/* No Anomalies State */}
          {analysis.summary.total === 0 && (
            <div className="alert alert-success">
              <div className="alert-icon">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="alert-title">
                  {t('dashboard.alerts.noAnomaliesDetected')}
                </p>
                <p className="alert-message">
                  {t('dashboard.alerts.dataConsistent')}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =====================================================
// SUB-COMPONENTS
// =====================================================


interface QuickActionProps {
  to: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  hasAttention?: boolean;
}

function QuickAction({ to, icon, title, subtitle, hasAttention }: QuickActionProps) {
  return (
    <Link
      to={to}
      className="relative overflow-hidden rounded-lg sm:rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] group"
      style={{ 
        backgroundColor: 'rgb(var(--color-surface))',
        border: `1px solid ${hasAttention ? 'rgb(var(--color-error) / 0.4)' : 'rgb(var(--color-border))'}`,
      }}
    >
      {/* Hover background overlay */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
      />
      <div className="relative flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 lg:p-4">
        <div 
          className="relative w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ 
            backgroundColor: hasAttention 
              ? 'rgb(var(--color-error) / 0.1)' 
              : 'rgb(var(--color-primary-500) / 0.1)',
            color: hasAttention 
              ? 'rgb(var(--color-error))' 
              : 'rgb(var(--color-primary-500))'
          }}
        >
          <span className="[&>svg]:w-3.5 [&>svg]:h-3.5 sm:[&>svg]:w-4 sm:[&>svg]:h-4 lg:[&>svg]:w-5 lg:[&>svg]:h-5">{icon}</span>
          {/* Pulse effect for attention items */}
          {hasAttention && (
            <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 flex h-2 w-2 sm:h-2.5 sm:w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-error" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p 
            className="font-semibold text-[11px] sm:text-xs lg:text-sm leading-snug"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {title}
          </p>
          <p 
            className="text-[9px] sm:text-[10px] lg:text-xs mt-0.5 sm:mt-1 leading-snug"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {subtitle}
          </p>
        </div>
      </div>
    </Link>
  );
}

// =====================================================
// HELPER FUNCTIONS FOR INDUSTRY-AWARE LABELS
// =====================================================

function getIndustryChartTitle(industry: string, type: 'revenue' | 'cashFlow' | 'waterfall', isEn: boolean): string {
  const titles: Record<string, Record<string, { en: string; fr: string }>> = {
    real_estate: {
      revenue: { en: 'Rental Income', fr: 'Revenus locatifs' },
      cashFlow: { en: 'Net Operating Cash', fr: 'Trésorerie nette d\'exploitation' },
      waterfall: { en: 'Property Cash Flow Analysis', fr: 'Analyse du flux de trésorerie immobilier' },
    },
    restaurant: {
      revenue: { en: 'Restaurant Revenue', fr: 'Revenus restaurant' },
      cashFlow: { en: 'Operating Cash Flow', fr: 'Flux de trésorerie d\'exploitation' },
      waterfall: { en: 'Restaurant Cash Flow Analysis', fr: 'Analyse du flux de trésorerie restaurant' },
    },
    hospitality: {
      revenue: { en: 'Room Revenue', fr: 'Revenus chambres' },
      cashFlow: { en: 'Operating Cash Flow', fr: 'Flux de trésorerie d\'exploitation' },
      waterfall: { en: 'Hotel Cash Flow Analysis', fr: 'Analyse du flux de trésorerie hôtel' },
    },
    retail: {
      revenue: { en: 'Sales Revenue', fr: 'Revenus ventes' },
      cashFlow: { en: 'Operating Cash Flow', fr: 'Flux de trésorerie d\'exploitation' },
      waterfall: { en: 'Retail Cash Flow Analysis', fr: 'Analyse du flux de trésorerie commerce' },
    },
    construction: {
      revenue: { en: 'Project Revenue', fr: 'Revenus projets' },
      cashFlow: { en: 'Operating Cash Flow', fr: 'Flux de trésorerie d\'exploitation' },
      waterfall: { en: 'Construction Cash Flow Analysis', fr: 'Analyse du flux de trésorerie construction' },
    },
    professional_services: {
      revenue: { en: 'Billable Revenue', fr: 'Revenus facturables' },
      cashFlow: { en: 'Operating Cash Flow', fr: 'Flux de trésorerie d\'exploitation' },
      waterfall: { en: 'Services Cash Flow Analysis', fr: 'Analyse du flux de trésorerie services' },
    },
    manufacturing: {
      revenue: { en: 'Production Revenue', fr: 'Revenus production' },
      cashFlow: { en: 'Operating Cash Flow', fr: 'Flux de trésorerie d\'exploitation' },
      waterfall: { en: 'Manufacturing Cash Flow Analysis', fr: 'Analyse du flux de trésorerie fabrication' },
    },
    agriculture: {
      revenue: { en: 'Crop Revenue', fr: 'Revenus récolte' },
      cashFlow: { en: 'Operating Cash Flow', fr: 'Flux de trésorerie d\'exploitation' },
      waterfall: { en: 'Agriculture Cash Flow Analysis', fr: 'Analyse du flux de trésorerie agriculture' },
    },
    transport: {
      revenue: { en: 'Transport Revenue', fr: 'Revenus transport' },
      cashFlow: { en: 'Operating Cash Flow', fr: 'Flux de trésorerie d\'exploitation' },
      waterfall: { en: 'Transport Cash Flow Analysis', fr: 'Analyse du flux de trésorerie transport' },
    },
    healthcare: {
      revenue: { en: 'Healthcare Revenue', fr: 'Revenus santé' },
      cashFlow: { en: 'Operating Cash Flow', fr: 'Flux de trésorerie d\'exploitation' },
      waterfall: { en: 'Healthcare Cash Flow Analysis', fr: 'Analyse du flux de trésorerie santé' },
    },
    education: {
      revenue: { en: 'Tuition Revenue', fr: 'Revenus scolarité' },
      cashFlow: { en: 'Operating Cash Flow', fr: 'Flux de trésorerie d\'exploitation' },
      waterfall: { en: 'Education Cash Flow Analysis', fr: 'Analyse du flux de trésorerie éducation' },
    },
    wholesale: {
      revenue: { en: 'Wholesale Sales', fr: 'Ventes gros' },
      cashFlow: { en: 'Operating Cash Flow', fr: 'Flux de trésorerie d\'exploitation' },
      waterfall: { en: 'Wholesale Cash Flow Analysis', fr: 'Analyse du flux de trésorerie gros' },
    },
    automotive: {
      revenue: { en: 'Dealership Revenue', fr: 'Revenus concession' },
      cashFlow: { en: 'Operating Cash Flow', fr: 'Flux de trésorerie d\'exploitation' },
      waterfall: { en: 'Automotive Cash Flow Analysis', fr: 'Analyse du flux de trésorerie automobile' },
    },
    beauty_wellness: {
      revenue: { en: 'Service Revenue', fr: 'Revenus services' },
      cashFlow: { en: 'Operating Cash Flow', fr: 'Flux de trésorerie d\'exploitation' },
      waterfall: { en: 'Beauty & Wellness Cash Flow Analysis', fr: 'Analyse du flux de trésorerie beauté' },
    },
  };
  
  return titles[industry]?.[type]?.[isEn ? 'en' : 'fr'] || titles.real_estate[type][isEn ? 'en' : 'fr'];
}

function getIndustryChartSubtitle(industry: string, isEn: boolean): string {
  const subtitles: Record<string, { en: string; fr: string }> = {
    real_estate: { 
      en: 'Understanding cash movements by property category', 
      fr: 'Décomposition des mouvements de trésorerie par catégorie' 
    },
    restaurant: { 
      en: 'Understanding cash movements by restaurant category', 
      fr: 'Décomposition des mouvements de trésorerie par catégorie restaurant' 
    },
    hospitality: { 
      en: 'Understanding cash movements by hotel operations', 
      fr: 'Décomposition des mouvements de trésorerie par opérations hôtel' 
    },
    retail: { 
      en: 'Understanding cash movements by retail category', 
      fr: 'Décomposition des mouvements de trésorerie par catégorie commerce' 
    },
    construction: { 
      en: 'Understanding cash movements by project category', 
      fr: 'Décomposition des mouvements de trésorerie par catégorie projet' 
    },
    professional_services: { 
      en: 'Understanding cash movements by service category', 
      fr: 'Décomposition des mouvements de trésorerie par catégorie service' 
    },
    manufacturing: { 
      en: 'Understanding cash movements by production category', 
      fr: 'Décomposition des mouvements de trésorerie par catégorie production' 
    },
    agriculture: { 
      en: 'Understanding cash movements by crop category', 
      fr: 'Décomposition des mouvements de trésorerie par catégorie récolte' 
    },
    transport: { 
      en: 'Understanding cash movements by transport category', 
      fr: 'Décomposition des mouvements de trésorerie par catégorie transport' 
    },
    healthcare: { 
      en: 'Understanding cash movements by healthcare category', 
      fr: 'Décomposition des mouvements de trésorerie par catégorie santé' 
    },
    education: { 
      en: 'Understanding cash movements by education category', 
      fr: 'Décomposition des mouvements de trésorerie par catégorie éducation' 
    },
    wholesale: { 
      en: 'Understanding cash movements by wholesale category', 
      fr: 'Décomposition des mouvements de trésorerie par catégorie gros' 
    },
    automotive: { 
      en: 'Understanding cash movements by dealership category', 
      fr: 'Décomposition des mouvements de trésorerie par catégorie concession' 
    },
    beauty_wellness: { 
      en: 'Understanding cash movements by service category', 
      fr: 'Décomposition des mouvements de trésorerie par catégorie service' 
    },
  };
  
  return subtitles[industry]?.[isEn ? 'en' : 'fr'] || subtitles.real_estate[isEn ? 'en' : 'fr'];
}

// =====================================================
// INDUSTRY KPI SECTION (GENERIC)
// =====================================================

interface IndustryKPISectionDashboardProps {
  industry: string;
  isEn: boolean;
}

function IndustryKPISectionDashboard({ industry, isEn }: IndustryKPISectionDashboardProps) {
  // Find industry data or default to real_estate
  const industryData = INDUSTRY_KPIS.find(ind => ind.id === industry) || INDUSTRY_KPIS[0];
  const Icon = industryData.icon;
  
  // Get top 4-5 KPIs for dashboard (prioritize ROI/profitability metrics)
  const topKPIs = industryData.kpis.slice(0, 5);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatValue = (value: number, name: string): string => {
    // Currency values
    if (name.includes('Revenue') || name.includes('NOI') || name.includes('Revenus') || name.includes('GOP') || 
        name.includes('Revenue per') || name.includes('Revenus par')) {
      return formatCurrency(value);
    }
    // Percentage values
    if (name.includes('Rate') || name.includes('Taux') || name.includes('%') || name.includes('Margin') || 
        name.includes('Marge') || name.includes('Occupancy') || name.includes('Occupation') || 
        name.includes('Utilization') || name.includes('Utilisation') || name.includes('Retention') || 
        name.includes('Rétention') || name.includes('Efficiency') || name.includes('Efficacité') ||
        name.includes('Fill Rate') || name.includes('Taux remplissage') || name.includes('Delivery') ||
        name.includes('Livraison') || name.includes('Cost %') || name.includes('Coût %')) {
      return `${value}%`;
    }
    // Dollar amounts (not currency formatted, just $ prefix)
    if (name.includes('ADR') || name.includes('TJM') || name.includes('Effective Rate') || 
        name.includes('Taux effectif') || name.includes('Revenue per Mile') || name.includes('Revenus par mile') ||
        name.includes('Revenue per Patient') || name.includes('Revenus par patient') ||
        name.includes('Revenue per Student') || name.includes('Revenus par étudiant') ||
        name.includes('Revenue per Client') || name.includes('Revenus par client')) {
      return `$${value.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    // Multipliers (turnover, DSCR)
    if (name.includes('Turnover') || name.includes('Rotation') || name.includes('DSCR') || 
        name.includes('Ratio de couverture')) {
      return `${value.toFixed(1)}x`;
    }
    // Days/Months
    if (name.includes('Days') || name.includes('Jours') || name.includes('AR Days') || name.includes('Jours CC') ||
        name.includes('Days Sales Outstanding') || name.includes('Jours ventes en attente')) {
      return `${Math.round(value)}d`;
    }
    if (name.includes('Months') || name.includes('mois') || name.includes('Backlog Months') || 
        name.includes('Carnet')) {
      return `${Math.round(value)}mo`;
    }
    // Yield, Cost per Unit, etc. - format with appropriate decimals
    if (name.includes('Yield') || name.includes('Rendement') || name.includes('Cost per Unit') || 
        name.includes('Coût par unité') || name.includes('Revenue per Mile') || name.includes('Fuel Efficiency') ||
        name.includes('Efficacité carburant')) {
      return `${value.toFixed(1)}`;
    }
    // Large numbers (Revenue per Student, etc.)
    if (value >= 1000 && (name.includes('Revenue per') || name.includes('Revenus par'))) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    // Default: return as-is with appropriate formatting
    return value % 1 === 0 ? `${value}` : `${value.toFixed(1)}`;
  };

  const getIconForKPI = (name: string) => {
    // Occupancy/Utilization metrics
    if (name.includes('Occupancy') || name.includes('Occupation') || name.includes('Utilization') || 
        name.includes('Utilisation') || name.includes('Fill Rate') || name.includes('Taux remplissage') ||
        name.includes('Class Utilization') || name.includes('Utilisation classes') ||
        name.includes('Service Utilization') || name.includes('Utilisation services') ||
        name.includes('Appointment Utilization') || name.includes('Utilisation rendez-vous')) return Home;
    
    // Revenue/Income metrics
    if (name.includes('Revenue') || name.includes('Revenus') || name.includes('NOI') || 
        name.includes('GOP') || name.includes('Revenue per') || name.includes('Revenus par')) return DollarSign;
    
    // Percentage/Rate/Margin metrics
    if (name.includes('Rate') || name.includes('Taux') || name.includes('%') || name.includes('Margin') || 
        name.includes('Marge') || name.includes('Retention') || name.includes('Rétention') ||
        name.includes('Cap Rate') || name.includes('Taux de capitalisation')) return Percent;
    
    // Cash/Return/ROI metrics
    if (name.includes('Cash') || name.includes('Return') || name.includes('Rendement') || 
        name.includes('ROI') || name.includes('Cash-on-Cash')) return TrendingUp;
    
    // Cost metrics
    if (name.includes('Cost') || name.includes('Coût') || name.includes('Prime Cost')) return Calculator;
    
    // Turnover/Efficiency metrics
    if (name.includes('Turnover') || name.includes('Rotation') || name.includes('Efficiency') || 
        name.includes('Efficacité') || name.includes('Production Efficiency') || 
        name.includes('Efficacité production') || name.includes('Crop Rotation Efficiency') ||
        name.includes('Efficacité rotation') || name.includes('Fuel Efficiency') ||
        name.includes('Efficacité carburant')) return Target;
    
    // Time-based metrics (Days/Months)
    if (name.includes('Days') || name.includes('Jours') || name.includes('Months') || 
        name.includes('mois') || name.includes('AR Days') || name.includes('Jours CC') ||
        name.includes('Days Sales Outstanding') || name.includes('Jours ventes en attente') ||
        name.includes('Backlog Months') || name.includes('Carnet')) return Calendar;
    
    // Debt/Backlog metrics
    if (name.includes('DSCR') || name.includes('Backlog') || name.includes('Carnet') ||
        name.includes('Bid-to-Win Ratio') || name.includes('Ratio soumissions')) return Target;
    
    // Delivery/On-Time metrics
    if (name.includes('Delivery') || name.includes('Livraison') || name.includes('On-Time')) return CheckCircle;
    
    // Default fallback
    return TrendingUp;
  };

  const kpiCards = topKPIs.map((kpi) => {
    const IconComponent = getIconForKPI(kpi.name);
    const isGoodWhenDown = kpi.name.includes('Cost') || kpi.name.includes('Coût') || kpi.name.includes('Shrinkage') || kpi.name.includes('Variance');
    
    return {
      id: kpi.name.toLowerCase().replace(/\s+/g, '_'),
      icon: IconComponent,
      label: isEn ? kpi.name : (kpi.nameFr || kpi.name),
      value: formatValue(kpi.currentValue, kpi.name),
      target: `${isEn ? 'Target' : 'Cible'}: ${kpi.target}`,
      change: kpi.trendValue,
      trend: kpi.trend,
      color: 'rgb(var(--color-primary-500))',
      bgColor: 'rgb(var(--color-primary-500) / 0.1)',
      isGoodWhenDown,
    };
  });

  return (
    <div 
      className="rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6"
      style={{ 
        backgroundColor: 'rgb(var(--color-surface))',
        border: '1px solid rgb(var(--color-border))',
      }}
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-5">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div 
            className="w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
          >
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" style={{ color: 'rgb(var(--color-primary-500))' }} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg lg:text-xl font-semibold truncate" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? `${industryData.name.en} KPIs` : `KPIs ${industryData.name.fr}`}
            </h3>
            <p className="text-xs sm:text-sm mt-0.5 sm:mt-1 truncate" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Key performance metrics & ROI' : 'Métriques clés de performance & ROI'}
            </p>
          </div>
        </div>
        <div 
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs font-medium flex-shrink-0"
          style={{ 
            backgroundColor: 'rgb(var(--color-success) / 0.1)',
            color: 'rgb(var(--color-success))',
          }}
        >
          <Target className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span className="hidden sm:inline">{isEn ? 'On Track' : 'Dans la cible'}</span>
          <span className="sm:hidden">{isEn ? 'On Track' : 'OK'}</span>
        </div>
      </div>

      {/* ROI Highlight */}
      {industryData.roiHighlight && (
        <div 
          className="mb-4 sm:mb-5 p-3 sm:p-4 rounded-lg sm:rounded-xl"
          style={{ 
            backgroundColor: 'rgb(var(--color-primary-500) / 0.05)',
            border: '1px solid rgb(var(--color-primary-500) / 0.2)',
          }}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 flex-shrink-0">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" style={{ color: 'rgb(var(--color-success))' }} />
              <span className="text-xs sm:text-sm font-semibold whitespace-nowrap" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? industryData.roiHighlight.en : industryData.roiHighlight.fr}:
              </span>
            </div>
            <span className="text-sm sm:text-base lg:text-lg font-bold" style={{ color: 'rgb(var(--color-success))' }}>
              {industryData.roiValue}
            </span>
          </div>
        </div>
      )}

      {/* KPI Cards Grid - Responsive with optimal spacing */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
        {kpiCards.map((kpi) => (
          <KPICard
            key={kpi.id}
            id={kpi.id}
            label={kpi.label}
            value={kpi.value}
            target={kpi.target}
            change={kpi.change}
            trend={kpi.trend}
            icon={kpi.icon}
            iconColor={kpi.color}
            iconBgColor={kpi.bgColor}
            isGoodWhenDown={kpi.isGoodWhenDown}
            compact={true}
            isEn={isEn}
          />
        ))}
      </div>
    </div>
  );
}

// =====================================================
// PORTFOLIO SUMMARY SECTION
// =====================================================

interface PortfolioSummarySectionProps {
  industry: string;
  isEn: boolean;
}

function PortfolioSummarySection({ industry, isEn }: PortfolioSummarySectionProps) {
  // Industry-specific portfolio data
  const portfolioDataByIndustry: Record<string, any> = {
    real_estate: {
      metrics: [
        { label: isEn ? 'Portfolio Value' : 'Valeur portefeuille', value: '$2.4M', icon: DollarSign, color: 'primary' },
        { label: isEn ? 'Properties' : 'Propriétés', value: '3', subtitle: isEn ? 'Multi-family buildings' : 'Immeubles multi-logements', icon: Building2, color: 'success' },
        { label: isEn ? 'Rental Units' : 'Unités locatives', value: '24', subtitle: isEn ? 'Total units' : 'Total unités', icon: Home, color: 'info' },
        { label: isEn ? 'Monthly Income' : 'Revenus mensuels', value: '$42K', subtitle: isEn ? 'Rental income' : 'Revenus locatifs', icon: TrendingUp, color: 'accent' },
      ],
    },
    restaurant: {
      metrics: [
        { label: isEn ? 'Annual Revenue' : 'Revenus annuels', value: '$847K', icon: DollarSign, color: 'primary' },
        { label: isEn ? 'Locations' : 'Emplacements', value: '2', subtitle: isEn ? 'Restaurant locations' : 'Emplacements restaurant', icon: Building2, color: 'success' },
        { label: isEn ? 'Avg Daily Covers' : 'Couverts quotidiens', value: '185', subtitle: isEn ? 'Customers per day' : 'Clients par jour', icon: Home, color: 'info' },
        { label: isEn ? 'Monthly Revenue' : 'Revenus mensuels', value: '$70K', subtitle: isEn ? 'Restaurant sales' : 'Ventes restaurant', icon: TrendingUp, color: 'accent' },
      ],
    },
    hospitality: {
      metrics: [
        { label: isEn ? 'Property Value' : 'Valeur propriété', value: '$3.2M', icon: DollarSign, color: 'primary' },
        { label: isEn ? 'Rooms' : 'Chambres', value: '45', subtitle: isEn ? 'Total rooms' : 'Total chambres', icon: Building2, color: 'success' },
        { label: isEn ? 'Occupancy Rate' : 'Taux occupation', value: '72%', subtitle: isEn ? 'Current occupancy' : 'Occupation actuelle', icon: Home, color: 'info' },
        { label: isEn ? 'Monthly Revenue' : 'Revenus mensuels', value: '$185K', subtitle: isEn ? 'Room revenue' : 'Revenus chambres', icon: TrendingUp, color: 'accent' },
      ],
    },
    retail: {
      metrics: [
        { label: isEn ? 'Store Value' : 'Valeur magasin', value: '$1.8M', icon: DollarSign, color: 'primary' },
        { label: isEn ? 'Store Locations' : 'Emplacements', value: '4', subtitle: isEn ? 'Retail stores' : 'Magasins', icon: Building2, color: 'success' },
        { label: isEn ? 'SKUs' : 'Références', value: '2,450', subtitle: isEn ? 'Product lines' : 'Lignes produits', icon: Home, color: 'success' },
        { label: isEn ? 'Monthly Sales' : 'Ventes mensuelles', value: '$125K', subtitle: isEn ? 'Retail revenue' : 'Revenus commerce', icon: TrendingUp, color: 'accent' },
      ],
    },
    construction: {
      metrics: [
        { label: isEn ? 'Company Value' : 'Valeur entreprise', value: '$2.1M', icon: DollarSign, color: 'primary' },
        { label: isEn ? 'Active Projects' : 'Projets actifs', value: '8', subtitle: isEn ? 'Current projects' : 'Projets actuels', icon: Building2, color: 'success' },
        { label: isEn ? 'Backlog' : 'Carnet', value: '8mo', subtitle: isEn ? 'Months of work' : 'Mois de travail', icon: Home, color: 'info' },
        { label: isEn ? 'Monthly Revenue' : 'Revenus mensuels', value: '$285K', subtitle: isEn ? 'Project revenue' : 'Revenus projets', icon: TrendingUp, color: 'accent' },
      ],
    },
    professional_services: {
      metrics: [
        { label: isEn ? 'Firm Value' : 'Valeur cabinet', value: '$1.5M', icon: DollarSign, color: 'primary' },
        { label: isEn ? 'Team Members' : 'Membres équipe', value: '12', subtitle: isEn ? 'Billable staff' : 'Personnel facturable', icon: Building2, color: 'success' },
        { label: isEn ? 'Utilization' : 'Utilisation', value: '78%', subtitle: isEn ? 'Billable rate' : 'Taux facturable', icon: Home, color: 'info' },
        { label: isEn ? 'Monthly Revenue' : 'Revenus mensuels', value: '$95K', subtitle: isEn ? 'Billable revenue' : 'Revenus facturables', icon: TrendingUp, color: 'accent' },
      ],
    },
    manufacturing: {
      metrics: [
        { label: isEn ? 'Company Value' : 'Valeur entreprise', value: '$3.2M', icon: DollarSign, color: 'primary' },
        { label: isEn ? 'Production Lines' : 'Lignes production', value: '5', subtitle: isEn ? 'Active lines' : 'Lignes actives', icon: Building2, color: 'success' },
        { label: isEn ? 'Efficiency' : 'Efficacité', value: '94%', subtitle: isEn ? 'Production rate' : 'Taux production', icon: Home, color: 'info' },
        { label: isEn ? 'Monthly Revenue' : 'Revenus mensuels', value: '$425K', subtitle: isEn ? 'Manufacturing revenue' : 'Revenus fabrication', icon: TrendingUp, color: 'accent' },
      ],
    },
    agriculture: {
      metrics: [
        { label: isEn ? 'Farm Value' : 'Valeur ferme', value: '$2.8M', icon: DollarSign, color: 'primary' },
        { label: isEn ? 'Hectares' : 'Hectares', value: '450', subtitle: isEn ? 'Total hectares' : 'Total hectares', icon: Building2, color: 'success' },
        { label: isEn ? 'Yield Rate' : 'Taux rendement', value: '8.5t/ha', subtitle: isEn ? 'Per hectare' : 'Par hectare', icon: Home, color: 'info' },
        { label: isEn ? 'Monthly Revenue' : 'Revenus mensuels', value: '$185K', subtitle: isEn ? 'Crop revenue' : 'Revenus récolte', icon: TrendingUp, color: 'accent' },
      ],
    },
    transport: {
      metrics: [
        { label: isEn ? 'Fleet Value' : 'Valeur flotte', value: '$1.2M', icon: DollarSign, color: 'primary' },
        { label: isEn ? 'Vehicles' : 'Véhicules', value: '8', subtitle: isEn ? 'Fleet size' : 'Taille flotte', icon: Building2, color: 'success' },
        { label: isEn ? 'Utilization' : 'Utilisation', value: '82%', subtitle: isEn ? 'Loaded miles' : 'Miles chargés', icon: Home, color: 'info' },
        { label: isEn ? 'Monthly Revenue' : 'Revenus mensuels', value: '$125K', subtitle: isEn ? 'Transport revenue' : 'Revenus transport', icon: TrendingUp, color: 'accent' },
      ],
    },
    healthcare: {
      metrics: [
        { label: isEn ? 'Practice Value' : 'Valeur pratique', value: '$1.8M', icon: DollarSign, color: 'primary' },
        { label: isEn ? 'Patients' : 'Patients', value: '2,450', subtitle: isEn ? 'Active patients' : 'Patients actifs', icon: Building2, color: 'success' },
        { label: isEn ? 'Retention' : 'Rétention', value: '76%', subtitle: isEn ? 'Patient retention' : 'Rétention patients', icon: Home, color: 'info' },
        { label: isEn ? 'Monthly Revenue' : 'Revenus mensuels', value: '$195K', subtitle: isEn ? 'Healthcare revenue' : 'Revenus santé', icon: TrendingUp, color: 'accent' },
      ],
    },
    education: {
      metrics: [
        { label: isEn ? 'Institution Value' : 'Valeur institution', value: '$2.5M', icon: DollarSign, color: 'primary' },
        { label: isEn ? 'Students' : 'Étudiants', value: '485', subtitle: isEn ? 'Enrolled students' : 'Étudiants inscrits', icon: Building2, color: 'success' },
        { label: isEn ? 'Retention' : 'Rétention', value: '89%', subtitle: isEn ? 'Student retention' : 'Rétention étudiants', icon: Home, color: 'info' },
        { label: isEn ? 'Monthly Revenue' : 'Revenus mensuels', value: '$52K', subtitle: isEn ? 'Tuition revenue' : 'Revenus scolarité', icon: TrendingUp, color: 'accent' },
      ],
    },
    wholesale: {
      metrics: [
        { label: isEn ? 'Business Value' : 'Valeur entreprise', value: '$2.2M', icon: DollarSign, color: 'primary' },
        { label: isEn ? 'Warehouses' : 'Entrepôts', value: '3', subtitle: isEn ? 'Distribution centers' : 'Centres distribution', icon: Building2, color: 'success' },
        { label: isEn ? 'SKUs' : 'Références', value: '8,500', subtitle: isEn ? 'Product lines' : 'Lignes produits', icon: Home, color: 'info' },
        { label: isEn ? 'Monthly Revenue' : 'Revenus mensuels', value: '$285K', subtitle: isEn ? 'Wholesale sales' : 'Ventes gros', icon: TrendingUp, color: 'accent' },
      ],
    },
    automotive: {
      metrics: [
        { label: isEn ? 'Dealership Value' : 'Valeur concession', value: '$4.5M', icon: DollarSign, color: 'primary' },
        { label: isEn ? 'Service Bays' : 'Baies service', value: '12', subtitle: isEn ? 'Service capacity' : 'Capacité service', icon: Building2, color: 'success' },
        { label: isEn ? 'Service Revenue' : 'Revenus service', value: '45%', subtitle: isEn ? 'Of total revenue' : 'Du revenu total', icon: Home, color: 'info' },
        { label: isEn ? 'Monthly Revenue' : 'Revenus mensuels', value: '$425K', subtitle: isEn ? 'Dealership revenue' : 'Revenus concession', icon: TrendingUp, color: 'accent' },
      ],
    },
    beauty_wellness: {
      metrics: [
        { label: isEn ? 'Business Value' : 'Valeur entreprise', value: '$850K', icon: DollarSign, color: 'primary' },
        { label: isEn ? 'Locations' : 'Emplacements', value: '2', subtitle: isEn ? 'Salon locations' : 'Emplacements salon', icon: Building2, color: 'success' },
        { label: isEn ? 'Clients' : 'Clients', value: '1,250', subtitle: isEn ? 'Active clients' : 'Clients actifs', icon: Home, color: 'info' },
        { label: isEn ? 'Monthly Revenue' : 'Revenus mensuels', value: '$68K', subtitle: isEn ? 'Service revenue' : 'Revenus services', icon: TrendingUp, color: 'accent' },
      ],
    },
  };

  const portfolioData = portfolioDataByIndustry[industry] || portfolioDataByIndustry.real_estate;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div 
      className="rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6"
      style={{ 
        backgroundColor: 'rgb(var(--color-surface))',
        border: '1px solid rgb(var(--color-border))',
      }}
    >
      {/* Section Header */}
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
        <div 
          className="w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
        >
          <Building2 className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" style={{ color: 'rgb(var(--color-primary-500))' }} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base sm:text-lg lg:text-xl font-semibold truncate" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Portfolio Overview' : 'Aperçu du portefeuille'}
          </h3>
          <p className="text-xs sm:text-sm mt-0.5 sm:mt-1 truncate" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn 
              ? `Total ${industry === 'real_estate' ? 'property' : industry === 'restaurant' ? 'restaurant' : industry === 'hospitality' ? 'hotel' : industry === 'retail' ? 'retail' : industry === 'construction' ? 'construction' : industry === 'professional_services' ? 'professional services' : industry === 'manufacturing' ? 'manufacturing' : industry === 'agriculture' ? 'farm' : industry === 'transport' ? 'fleet' : industry === 'healthcare' ? 'practice' : industry === 'education' ? 'institution' : industry === 'wholesale' ? 'wholesale' : industry === 'automotive' ? 'dealership' : industry === 'beauty_wellness' ? 'business' : 'business'} portfolio summary`
              : `Résumé du portefeuille ${industry === 'real_estate' ? 'immobilier' : industry === 'restaurant' ? 'restaurant' : industry === 'hospitality' ? 'hôtelier' : industry === 'retail' ? 'commerce' : industry === 'construction' ? 'construction' : industry === 'professional_services' ? 'services professionnels' : industry === 'manufacturing' ? 'fabrication' : industry === 'agriculture' ? 'agricole' : industry === 'transport' ? 'transport' : industry === 'healthcare' ? 'santé' : industry === 'education' ? 'éducation' : industry === 'wholesale' ? 'gros' : industry === 'automotive' ? 'automobile' : industry === 'beauty_wellness' ? 'beauté' : 'entreprise'}`
            }
          </p>
        </div>
      </div>

      {/* Portfolio Metrics Grid - Responsive with optimal spacing */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {portfolioData.metrics.map((metric: any, index: number) => (
          <MetricCard
            key={index}
            label={metric.label}
            value={metric.value}
            subtitle={metric.subtitle}
            icon={metric.icon}
            color={metric.color}
            compact={true}
            isEn={isEn}
          />
        ))}
      </div>
    </div>
  );
}
