import { useState, useMemo, useEffect } from 'react';
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
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Tooltip } from '../components/Tooltip';
import { TrendChart, WaterfallChart } from '../components/charts';
import { 
  AgingWidget, 
  BankReconciliationWidget, 
  BudgetWidget, 
  DeadlinesWidget,
  TrialBalanceSummary 
} from '../components/AccountingWidgets';
import AIQueryAssistant from '../components/AIQueryAssistant';
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
  const [selectedPeriod, setSelectedPeriod] = useState<'mtd' | 'qtd' | 'ytd'>('mtd');
  const { hasAccess: hasAIAccess } = usePremiumFeature('aiInsights');
  
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
        // Show last 4 months for context even in "month" view
        // This provides enough data points for trend analysis while focusing on recent period
        return data.slice(-4);
      case 'qtd':
        // Show last 6 months for quarterly context
        return data.slice(-6);
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
    <div className="space-y-4 sm:space-y-6">
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
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <div 
              className="flex rounded-lg p-0.5"
              style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
            >
              {periods.map(period => (
                <button
                  key={period.id}
                  onClick={() => setSelectedPeriod(period.id as 'mtd' | 'qtd' | 'ytd')}
                  className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-all"
                  style={{
                    backgroundColor: selectedPeriod === period.id ? 'rgb(var(--color-surface))' : 'transparent',
                    color: selectedPeriod === period.id ? 'rgb(var(--color-text))' : 'rgb(var(--color-text-muted))',
                  }}
                >
                  {period.label}
                </button>
              ))}
            </div>
            
            <button
              onClick={handleRefresh}
              className="btn-secondary btn-sm flex items-center gap-1.5 sm:gap-2 !px-2 sm:!px-3"
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">{isRefreshing ? t('common.refreshing') : t('common.refresh')}</span>
            </button>

            <button
                      onClick={() => {
                        if (hasAIAccess) {
                          setShowAIAssistant(true);
                        } else {
                          window.open(CALENDLY_URL, '_blank');
                        }
                      }}
                      className={`btn-sm flex items-center gap-1.5 sm:gap-2 !px-2 sm:!px-3 ${
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
                      <span className="hidden md:inline">
                        {hasAIAccess 
                          ? (language === 'en' ? 'Ask James' : 'Demander')
                          : (language === 'en' ? 'Upgrade' : 'Mise à niveau')
                        }
                      </span>
                    </button>
          </div>
        </div>
      </div>

      {/* Anomalies List - With severity breakdown and notification CTA */}
      {analysis.summary.total > 0 && (
        <div 
          className="rounded-xl p-4 sm:p-5"
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
            <div className="flex items-center gap-3 mb-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ 
                  backgroundColor: analysis.summary.critical > 0 
                    ? 'rgb(var(--color-error) / 0.1)' 
                    : 'rgb(var(--color-warning) / 0.1)',
                }}
              >
                <AlertTriangle 
                  className="w-5 h-5" 
                  style={{ 
                    color: analysis.summary.critical > 0 
                      ? 'rgb(var(--color-error))' 
                      : 'rgb(var(--color-warning))',
                  }}
                />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                  {analysis.summary.total} {language === 'en' ? 'anomalies detected' : 'anomalies détectées'}
                </h3>
                <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {language === 'en' ? 'Action required - Click to review' : 'Action requise - Cliquez pour examiner'}
                </p>
              </div>
              <ChevronRight 
                className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity" 
                style={{ color: 'rgb(var(--color-text-muted))' }}
              />
            </div>
            
            {/* Severity breakdown badges */}
            <div className="flex items-center gap-2 flex-wrap ml-[52px]">
              {analysis.summary.critical > 0 && (
                <span 
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-error) / 0.1)',
                    color: 'rgb(var(--color-error))',
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'rgb(var(--color-error))' }} />
                  {analysis.summary.critical} {language === 'en' ? 'critical' : 'critique'}{analysis.summary.critical > 1 ? 's' : ''}
                </span>
              )}
              {analysis.summary.warning > 0 && (
                <span 
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-warning) / 0.1)',
                    color: 'rgb(var(--color-warning))',
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'rgb(var(--color-warning))' }} />
                  {analysis.summary.warning} {language === 'en' ? 'warning' : 'avertissement'}{analysis.summary.warning > 1 ? 's' : ''}
                </span>
              )}
              {analysis.summary.info > 0 && (
                <span 
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-info) / 0.1)',
                    color: 'rgb(var(--color-info))',
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'rgb(var(--color-info))' }} />
                  {analysis.summary.info} info
                </span>
              )}
            </div>
          </Link>
          
          {/* Notification setup CTA */}
          <div 
            className="mt-3 pt-3 flex items-center justify-between gap-3 flex-wrap"
            style={{ borderTop: '1px solid rgb(var(--color-border))' }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {language === 'en' ? 'Get notified via:' : 'Recevoir les alertes via:'}
              </span>
              <div className="flex items-center gap-1">
                {/* Slack - Brand colors */}
                <div 
                  className="w-6 h-6 rounded flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                  style={{ backgroundColor: '#4A154B15' }}
                  title="Slack"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
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
                  className="w-6 h-6 rounded flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                  style={{ backgroundColor: '#5059C915' }}
                  title="Microsoft Teams"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
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
                  className="w-6 h-6 rounded flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                  style={{ backgroundColor: '#00AC4715' }}
                  title="Google Chat"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                    <path d="M6 4h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-4l-4 4v-4H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="#00AC47"/>
                    <circle cx="8" cy="10" r="1" fill="#fff"/>
                    <circle cx="12" cy="10" r="1" fill="#fff"/>
                    <circle cx="16" cy="10" r="1" fill="#fff"/>
                  </svg>
                </div>
                {/* Discord - Brand color */}
                <div 
                  className="w-6 h-6 rounded flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                  style={{ backgroundColor: '#5865F215' }}
                  title="Discord"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="#5865F2">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                </div>
                {/* Email - Theme primary color */}
                <div 
                  className="w-6 h-6 rounded flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                  style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
                  title="Email"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'rgb(var(--color-primary-500))' }}>
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </div>
                {/* SMS - Success green color */}
                <div 
                  className="w-6 h-6 rounded flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                  style={{ backgroundColor: 'rgb(var(--color-success) / 0.1)' }}
                  title="SMS"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'rgb(var(--color-success))' }}>
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </div>
                {/* Webhook - Accent color */}
                <div 
                  className="w-6 h-6 rounded flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                  style={{ backgroundColor: 'rgb(var(--color-accent-500) / 0.1)' }}
                  title="Webhook"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'rgb(var(--color-accent-600))' }}>
                    <path d="M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2" />
                    <path d="m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06" />
                    <path d="m12 6 3.13 5.73c.53.97 1.74 1.43 2.88 1.1A4 4 0 1 1 19.5 21" />
                  </svg>
                </div>
              </div>
            </div>
            <Link
              to="/app/settings?tab=notifications"
              className="text-xs font-medium px-2.5 py-1 rounded-lg transition-colors"
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

      {/* Charts - Revenue & Cash Flow Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TrendChart
          data={revenueData}
          title={t('dashboard.charts.revenue')}
          titleEn="Revenue"
          subtitle={
            selectedPeriod === 'mtd' 
              ? (language === 'en' ? 'Last 4 months - vs budget' : '4 derniers mois - vs budget')
              : selectedPeriod === 'qtd'
                ? (language === 'en' ? 'Last 6 months - vs budget' : '6 derniers mois - vs budget')
                : t('dashboard.charts.last12Months')
          }
          subtitleEn={
            selectedPeriod === 'mtd' 
              ? 'Last 4 months - vs budget'
              : selectedPeriod === 'qtd'
                ? 'Last 6 months - vs budget'
                : 'Last 12 months - vs budget'
          }
          budget={revenueBudget}
          color="rgb(var(--color-primary-500))"
          height={200}
          isEn={language === 'en'}
        />
        <TrendChart
          data={cashFlowData}
          title={t('dashboard.charts.cashFlow')}
          titleEn="Net Cash Flow"
          subtitle={
            selectedPeriod === 'mtd' 
              ? (language === 'en' ? 'Last 4 months' : '4 derniers mois')
              : selectedPeriod === 'qtd'
                ? (language === 'en' ? 'Last 6 months' : '6 derniers mois')
                : t('dashboard.charts.operational')
          }
          subtitleEn={
            selectedPeriod === 'mtd' 
              ? 'Last 4 months'
              : selectedPeriod === 'qtd'
                ? 'Last 6 months'
                : 'Operational - monthly'
          }
          color="rgb(var(--color-primary-500))"
          height={200}
          isEn={language === 'en'}
        />
      </div>

      {/* Cash Flow Waterfall - Critical for understanding cash movements */}
      <WaterfallChart
        data={cashFlowWaterfallData}
        title="Analyse du flux de trésorerie"
        titleEn="Cash Flow Analysis"
        subtitle="Décomposition des mouvements de trésorerie"
        subtitleEn="Understanding cash movements by category"
        isEn={language === 'en'}
        height={260}
      />

      {/* Real Estate Industry KPIs Section - Temporarily disabled */}
      {/* <RealEstateKPISection isEn={language === 'en'} /> */}

      {/* Trial Balance Status */}
      {financialData?.summary.trialBalance && (
        <TrialBalanceSummary
          totalDebits={financialData.summary.trialBalance.totalDebits}
          totalCredits={financialData.summary.trialBalance.totalCredits}
          isBalanced={financialData.summary.trialBalance.isBalanced}
          isEn={language === 'en'}
        />
      )}

      {/* Accounting-Specific Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* AR Aging */}
        {financialData?.summary.receivables && (
          <AgingWidget
            title="Comptes clients"
            titleEn="Accounts Receivable"
            data={financialData.summary.receivables.aging}
            totalOverdue={financialData.summary.receivables.totalOverdue}
            averageDays={financialData.summary.receivables.averageDaysOutstanding}
            type="receivable"
            isEn={language === 'en'}
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
            isEn={language === 'en'}
            hasData={financialData.summary.payables.hasData}
          />
        )}
      </div>

      {/* Budget vs Actual + Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Budget Comparison */}
        {financialData?.summary.budgetComparisons && (
          <BudgetWidget
            data={financialData.summary.budgetComparisons}
            isEn={language === 'en'}
          />
        )}

        {/* Upcoming Deadlines */}
        {financialData?.summary.upcomingDeadlines && (
          <DeadlinesWidget
            deadlines={financialData.summary.upcomingDeadlines}
            isEn={language === 'en'}
          />
        )}
      </div>

      {/* Bank Reconciliation */}
      {financialData?.summary.bankAccounts && (
        <BankReconciliationWidget
          accounts={financialData.summary.bankAccounts}
          isEn={language === 'en'}
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
          className="relative overflow-hidden rounded-xl sm:rounded-2xl p-4 sm:p-6"
          style={{ 
            background: 'linear-gradient(135deg, rgb(var(--color-primary-600)) 0%, rgb(var(--color-primary-800)) 100%)',
            boxShadow: '0 10px 40px -10px rgb(var(--color-primary-500) / 0.3)',
          }}
        >
          {/* Background Pattern */}
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 50%, rgba(255,255,255,0.8) 1px, transparent 1px)`,
              backgroundSize: '24px 24px',
            }}
          />
          
          <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
              >
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">
                  {language === 'en' ? 'Unlock Premium Features' : 'Débloquez les fonctionnalités Premium'}
                </h3>
                <p className="text-sm text-white/80 max-w-xl">
                  {language === 'en' 
                    ? 'Get AI-powered insights, strategic planning tools, board meeting presentations, and more.'
                    : 'Obtenez des analyses propulsées par l\'IA, des outils de planification stratégique, des présentations de CA, et plus encore.'
                  }
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {[
                    language === 'en' ? 'AI Assistant' : 'Assistant IA',
                    language === 'en' ? 'Strategic Planning' : 'Planification stratégique',
                    language === 'en' ? 'Board Presentations' : 'Présentations CA',
                    language === 'en' ? 'Custom Analytics' : 'Analytique personnalisée',
                  ].map((feature, idx) => (
                    <span 
                      key={idx}
                      className="px-2 py-1 rounded-full text-xs font-medium"
                      style={{ 
                        backgroundColor: 'rgba(255,255,255,0.15)',
                        color: 'white',
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
              className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-white transition-all hover:scale-105 flex-shrink-0"
              style={{ 
                backgroundColor: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(4px)',
              }}
            >
              <Calendar className="w-5 h-5" />
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
              />
            ) : (
              <PremiumFeatureGate feature="aiInsights" showPreview={false}>
                <div />
              </PremiumFeatureGate>
            )}
          </div>
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
      className="relative overflow-hidden rounded-lg sm:rounded-xl"
      style={{ 
        backgroundColor: 'rgb(var(--color-surface))',
        border: `1px solid ${hasAttention ? 'rgb(var(--color-error) / 0.4)' : 'rgb(var(--color-border))'}`,
      }}
    >
      <div className="relative flex items-center gap-2 sm:gap-3 p-3 sm:p-4">
        <div 
          className="relative w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ 
            backgroundColor: hasAttention 
              ? 'rgb(var(--color-error) / 0.1)' 
              : 'rgb(var(--color-primary-500) / 0.1)',
            color: hasAttention 
              ? 'rgb(var(--color-error))' 
              : 'rgb(var(--color-primary-500))'
          }}
        >
          <span className="[&>svg]:w-4 [&>svg]:h-4 sm:[&>svg]:w-5 sm:[&>svg]:h-5">{icon}</span>
          {/* Pulse effect for attention items */}
          {hasAttention && (
            <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 flex h-2 w-2 sm:h-3 sm:w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 sm:h-3 sm:w-3 bg-error" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <Tooltip content={title} position="top" delay={400}>
            <p 
              className="font-semibold text-xs sm:text-sm truncate cursor-help"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {title}
            </p>
          </Tooltip>
          <Tooltip content={subtitle} position="bottom" delay={400}>
            <p className="text-[10px] sm:text-xs text-muted truncate mt-0.5 cursor-help">
              {subtitle}
            </p>
          </Tooltip>
        </div>
      </div>
    </Link>
  );
}

// =====================================================
// REAL ESTATE KPI SECTION
// =====================================================

interface RealEstateKPISectionProps {
  isEn: boolean;
}

function RealEstateKPISection({ isEn }: RealEstateKPISectionProps) {
  // Mock real estate specific data - in production this would come from financialData
  const realEstateKPIs = {
    occupancyRate: { current: 94.2, target: 92, trend: 'up' as const, change: 2.1 },
    noi: { current: 185000, target: 170000, trend: 'up' as const, change: 8.8 },
    capRate: { current: 6.2, target: 6.0, trend: 'stable' as const, change: 0.1 },
    cashOnCash: { current: 10.5, target: 10.0, trend: 'up' as const, change: 0.5 },
    rentPerSqft: { current: 18.50, target: 17.00, trend: 'up' as const, change: 8.8 },
    vacancyLoss: { current: 12500, prior: 18200, trend: 'down' as const, change: -31.3 },
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStatusColor = (trend: 'up' | 'down' | 'stable', isGoodWhenDown = false) => {
    if (trend === 'stable') return 'rgb(var(--color-warning))';
    if (isGoodWhenDown) {
      return trend === 'down' ? 'rgb(var(--color-success))' : 'rgb(var(--color-error))';
    }
    return trend === 'up' ? 'rgb(var(--color-success))' : 'rgb(var(--color-error))';
  };

  const kpiCards = [
    {
      id: 'occupancy',
      icon: Home,
      label: isEn ? 'Occupancy Rate' : 'Taux d\'occupation',
      value: `${realEstateKPIs.occupancyRate.current}%`,
      target: `${isEn ? 'Target' : 'Cible'}: ${realEstateKPIs.occupancyRate.target}%`,
      change: `+${realEstateKPIs.occupancyRate.change}%`,
      trend: realEstateKPIs.occupancyRate.trend,
      color: 'rgb(var(--color-primary-500))',
      bgColor: 'rgb(var(--color-primary-500) / 0.1)',
    },
    {
      id: 'noi',
      icon: DollarSign,
      label: isEn ? 'Net Operating Income' : 'Résultat net d\'exploitation',
      value: formatCurrency(realEstateKPIs.noi.current),
      target: `${isEn ? 'Target' : 'Cible'}: ${formatCurrency(realEstateKPIs.noi.target)}`,
      change: `+${realEstateKPIs.noi.change}%`,
      trend: realEstateKPIs.noi.trend,
      color: 'rgb(var(--color-success))',
      bgColor: 'rgb(var(--color-success) / 0.1)',
    },
    {
      id: 'caprate',
      icon: Percent,
      label: isEn ? 'Cap Rate' : 'Taux de capitalisation',
      value: `${realEstateKPIs.capRate.current}%`,
      target: `${isEn ? 'Benchmark' : 'Référence'}: 4-8%`,
      change: `${realEstateKPIs.capRate.change > 0 ? '+' : ''}${realEstateKPIs.capRate.change}%`,
      trend: realEstateKPIs.capRate.trend,
      color: 'rgb(var(--color-accent-600))',
      bgColor: 'rgb(var(--color-accent-500) / 0.1)',
    },
    {
      id: 'cashoncash',
      icon: TrendingUp,
      label: isEn ? 'Cash-on-Cash Return' : 'Rendement cash-on-cash',
      value: `${realEstateKPIs.cashOnCash.current}%`,
      target: `${isEn ? 'Target' : 'Cible'}: ${realEstateKPIs.cashOnCash.target}%`,
      change: `+${realEstateKPIs.cashOnCash.change}%`,
      trend: realEstateKPIs.cashOnCash.trend,
      color: 'rgb(var(--color-info))',
      bgColor: 'rgb(var(--color-info) / 0.1)',
    },
  ];

  return (
    <div 
      className="rounded-xl p-4 sm:p-5"
      style={{ 
        backgroundColor: 'rgb(var(--color-surface))',
        border: '1px solid rgb(var(--color-border))',
      }}
    >
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
          >
            <Building2 className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
          </div>
          <div>
            <h3 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Real Estate KPIs' : 'KPIs Immobilier'}
            </h3>
            <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Property performance metrics' : 'Métriques de performance immobilière'}
            </p>
          </div>
        </div>
        <div 
          className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium"
          style={{ 
            backgroundColor: 'rgb(var(--color-success) / 0.1)',
            color: 'rgb(var(--color-success))',
          }}
        >
          <Target className="w-3 h-3" />
          {isEn ? 'On Track' : 'Dans la cible'}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiCards.map((kpi) => {
          const IconComponent = kpi.icon;
          return (
            <div 
              key={kpi.id}
              className="p-3 rounded-lg transition-all hover:scale-[1.02]"
              style={{ 
                backgroundColor: 'rgb(var(--color-bg-muted))',
                border: '1px solid rgb(var(--color-border) / 0.5)',
              }}
            >
              {/* Icon and Label */}
              <div className="flex items-center gap-2 mb-2">
                <div 
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: kpi.bgColor }}
                >
                  <IconComponent className="w-3.5 h-3.5" style={{ color: kpi.color }} />
                </div>
                <span className="text-[10px] font-medium truncate" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {kpi.label}
                </span>
              </div>

              {/* Value */}
              <p className="text-lg sm:text-xl font-bold mb-1" style={{ color: 'rgb(var(--color-text))' }}>
                {kpi.value}
              </p>

              {/* Target and Change */}
              <div className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {kpi.target}
                </span>
                <span 
                  className="flex items-center gap-0.5 text-[10px] font-medium"
                  style={{ color: getStatusColor(kpi.trend) }}
                >
                  {kpi.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : 
                   kpi.trend === 'down' ? <TrendingDown className="w-3 h-3" /> : null}
                  {kpi.change}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Additional Metrics Row */}
      <div 
        className="mt-4 pt-4 flex flex-wrap gap-4 items-center justify-between"
        style={{ borderTop: '1px solid rgb(var(--color-border))' }}
      >
        <div className="flex items-center gap-6 flex-wrap">
          {/* Rent per sqft */}
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Rent/sqft:' : 'Loyer/pi²:'}
            </span>
            <span className="text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
              ${realEstateKPIs.rentPerSqft.current.toFixed(2)}
            </span>
            <span 
              className="text-[10px] font-medium"
              style={{ color: 'rgb(var(--color-success))' }}
            >
              +{realEstateKPIs.rentPerSqft.change}%
            </span>
          </div>

          {/* Vacancy Loss */}
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Vacancy Loss:' : 'Perte vacance:'}
            </span>
            <span className="text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
              {formatCurrency(realEstateKPIs.vacancyLoss.current)}
            </span>
            <span 
              className="text-[10px] font-medium"
              style={{ color: 'rgb(var(--color-success))' }}
            >
              {realEstateKPIs.vacancyLoss.change}%
            </span>
          </div>
        </div>

        {/* Property Type Badge */}
        <div 
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
          style={{ 
            backgroundColor: 'rgb(var(--color-bg-muted))',
            border: '1px solid rgb(var(--color-border))',
          }}
        >
          <Building2 className="w-3.5 h-3.5" style={{ color: 'rgb(var(--color-primary-500))' }} />
          <span style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {isEn ? 'Multi-Family Residential' : 'Multi-logements résidentiel'}
          </span>
        </div>
      </div>
    </div>
  );
}
