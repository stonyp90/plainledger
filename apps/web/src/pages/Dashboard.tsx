import { useState, useMemo } from 'react';
import { 
  ArrowRight, 
  AlertTriangle, 
  CheckCircle,
  RefreshCw,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Link2,
  Loader2,
  Sparkles,
  BarChart2,
  Eye,
  Lock,
  Calendar,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Tooltip } from '../components/Tooltip';
import { HealthScoreGauge, TrendChart, WaterfallChart } from '../components/charts';
import { 
  AgingWidget, 
  BankReconciliationWidget, 
  BudgetWidget, 
  DeadlinesWidget,
  TrialBalanceSummary 
} from '../components/AccountingWidgets';
import AIQueryAssistant from '../components/AIQueryAssistant';
import PremiumFeatureGate, { usePremiumFeature } from '../components/PremiumFeatureGate';
import { useTenant } from '../contexts/TenantContext';
import { useToast } from '../contexts/ToastContext';
import { useI18n } from '../lib/i18n';
import { useFinancialData } from '../hooks/useFinancialData';
import { 
  runFullAnalysis, 
  DEFAULT_THRESHOLDS,
  type AccountBalance,
} from '../lib/anomalyDetection';
import { calculateVariance } from '../lib/financialData';

// =====================================================
// DASHBOARD COMPONENT
// =====================================================

// Calendly URL for upgrade calls
const CALENDLY_URL = 'https://calendly.com/anthonypaquet1508';

export default function Dashboard() {
  const navigate = useNavigate();
  const { currentTenant } = useTenant();
  const toast = useToast();
  const { t, formatCurrency, language } = useI18n();
  const [selectedPeriod, setSelectedPeriod] = useState<'mtd' | 'qtd' | 'ytd'>('mtd');
  const { hasAccess: hasAIAccess } = usePremiumFeature('aiInsights');
  
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

  // Get revenue trend data
  const revenueData = useMemo(() => {
    if (!financialData) return [];
    return financialData.trends.revenue.data;
  }, [financialData]);

  // Get cash flow trend data
  const cashFlowData = useMemo(() => {
    if (!financialData) return [];
    return financialData.trends.cashFlow.data;
  }, [financialData]);

  // Get budget data
  const revenueBudget = useMemo(() => {
    if (!financialData) return [];
    return financialData.trends.revenue.budget || [];
  }, [financialData]);

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

  // Calculate health metrics for the gauge
  const healthMetrics = useMemo(() => {
    if (!financialData) return undefined;

    const { metrics, summary } = financialData;
    
    // Liquidity score based on current ratio (target 2.0)
    const liquidityScore = Math.min(100, Math.round((metrics.currentRatio / 2.0) * 100));
    const liquidityStatus = liquidityScore >= 75 ? 'good' : liquidityScore >= 50 ? 'warning' : 'critical';
    
    // Profitability score based on gross margin (target 40%)
    const profitScore = Math.min(100, Math.round((metrics.grossMargin / 40) * 100));
    const profitStatus = profitScore >= 75 ? 'good' : profitScore >= 50 ? 'warning' : 'critical';
    
    // Cash flow score based on whether net cash flow is positive
    const cashFlowPositive = summary.cashFlow.net > 0;
    const cashFlowScore = cashFlowPositive ? 80 : 30;
    const cashFlowStatus = cashFlowScore >= 60 ? 'good' : cashFlowScore >= 40 ? 'warning' : 'critical';
    
    // Receivables score based on DSO (target 45 days)
    const dsoScore = Math.min(100, Math.max(0, Math.round(100 - ((metrics.daysReceivable - 45) / 45) * 50)));
    const dsoStatus = metrics.daysReceivable <= 45 ? 'good' : metrics.daysReceivable <= 60 ? 'warning' : 'critical';
    
    // Runway score based on months of runway
    const runwayScore = Math.min(100, Math.round((summary.cash.runway / 6) * 100));
    const runwayStatus = summary.cash.runway >= 6 ? 'good' : summary.cash.runway >= 3 ? 'warning' : 'critical';

    return [
      {
        id: 'liquidity',
        name: 'Liquidité',
        nameEn: 'Liquidity',
        value: liquidityScore,
        status: liquidityStatus as 'good' | 'warning' | 'critical',
        description: `Ratio de liquidité à ${metrics.currentRatio.toFixed(2)}x`,
        descriptionEn: `Current ratio at ${metrics.currentRatio.toFixed(2)}x`,
      },
      {
        id: 'profitability',
        name: 'Rentabilité',
        nameEn: 'Profitability',
        value: profitScore,
        status: profitStatus as 'good' | 'warning' | 'critical',
        description: `Marge brute de ${metrics.grossMargin.toFixed(1)}%`,
        descriptionEn: `Gross margin of ${metrics.grossMargin.toFixed(1)}%`,
      },
      {
        id: 'cashflow',
        name: 'Flux de trésorerie',
        nameEn: 'Cash Flow',
        value: cashFlowScore,
        status: cashFlowStatus as 'good' | 'warning' | 'critical',
        description: cashFlowPositive ? 'Flux net positif' : 'Flux net négatif',
        descriptionEn: cashFlowPositive ? 'Positive net flow' : 'Negative net flow',
      },
      {
        id: 'receivables',
        name: 'Créances (DSO)',
        nameEn: 'Receivables (DSO)',
        value: dsoScore,
        status: dsoStatus as 'good' | 'warning' | 'critical',
        description: `DSO de ${Math.round(metrics.daysReceivable)} jours`,
        descriptionEn: `DSO of ${Math.round(metrics.daysReceivable)} days`,
      },
      {
        id: 'runway',
        name: 'Autonomie',
        nameEn: 'Cash Runway',
        value: runwayScore,
        status: runwayStatus as 'good' | 'warning' | 'critical',
        description: `${summary.cash.runway} mois de runway`,
        descriptionEn: `${summary.cash.runway} months runway`,
      },
    ];
  }, [financialData]);

  const kpis = useMemo(() => {
    if (!financialData) {
      return {
        revenue: { current: 0, prior: 0, change: 0 },
        cash: { current: 0, prior: 0, change: 0 },
        cashFlow: { current: 0 },
        workingCapital: { current: 0, ar: 0, inventory: 0 },
        ratios: { current: 0, quick: 0 },
        runway: 0,
      };
    }

    const { summary, metrics } = financialData;
    
    return {
      revenue: {
        current: summary.revenue.current,
        prior: summary.revenue.prior,
        change: calculateVariance(summary.revenue.current, summary.revenue.prior),
      },
      cash: {
        current: summary.cash.current,
        prior: summary.cash.prior,
        change: calculateVariance(summary.cash.current, summary.cash.prior),
      },
      cashFlow: {
        current: summary.cashFlow.net,
      },
      workingCapital: {
        current: metrics.workingCapital,
        ar: summary.receivables.current,
        inventory: financialData.balanceSheet.assets.currentAssets.find(a => a.code === '1200')?.current || 0,
      },
      ratios: {
        current: metrics.currentRatio,
        quick: metrics.quickRatio,
      },
      runway: summary.cash.runway,
      // Additional metrics for accountants
      grossMargin: metrics.grossMargin,
      dso: metrics.daysReceivable,
    };
  }, [financialData]);

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

      {/* Alerts Banner - Only show if there are critical issues */}
      {analysis.summary.critical > 0 && (
        <Link
          to="/app/anomalies"
          className="alert alert-error hover:opacity-90 transition-all"
        >
          <div className="alert-icon">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="alert-title">
              {analysis.summary.critical} {analysis.summary.critical > 1 
                ? t('dashboard.alerts.criticalAnomalies') 
                : t('dashboard.alerts.criticalAnomaly')}
            </p>
            <p className="alert-message">
              {t('dashboard.alerts.actionRequired')}
            </p>
          </div>
          <ArrowRight className="w-5 h-5" style={{ color: 'rgb(var(--color-error))' }} />
        </Link>
      )}

      {/* Health Score + Key Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Health Score - Compact */}
        <div className="lg:col-span-1 order-2 lg:order-1">
          <HealthScoreGauge
            score={analysis.healthScore}
            criticalCount={analysis.summary.critical}
            warningCount={analysis.summary.warning}
            infoCount={analysis.summary.info}
            size="sm"
            isEn={language === 'en'}
            onClick={() => navigate('/app/anomalies')}
            metrics={healthMetrics}
          />
        </div>

        {/* KPI Cards */}
        <div className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 order-1 lg:order-2">
          <KPICard
            title={t('dashboard.kpi.revenue')}
            value={formatCurrency(kpis.revenue.current)}
            change={kpis.revenue.change}
            trend={kpis.revenue.change >= 0 ? 'up' : 'down'}
            vsPriorLabel={t('dashboard.kpi.vsPrior')}
          />
          <KPICard
            title={t('dashboard.kpi.cash')}
            value={formatCurrency(kpis.cash.current)}
            change={kpis.cash.change}
            trend={kpis.cash.change >= 0 ? 'up' : 'down'}
            badge={`${kpis.runway} ${t('dashboard.kpi.runway')}`}
            vsPriorLabel={t('dashboard.kpi.vsPrior')}
          />
          <KPICard
            title={t('dashboard.kpi.netCashFlow')}
            value={formatCurrency(kpis.cashFlow.current)}
            subtitle={t('dashboard.kpi.thisMonth')}
            trend="up"
          />
          <KPICard
            title={t('dashboard.kpi.workingCapital')}
            value={formatCurrency(kpis.workingCapital.current)}
            subtitle={t('dashboard.kpi.assetsMinusLiabilities')}
            trend="up"
          />
        </div>
      </div>

      {/* Ratios Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <RatioCard
          label={t('dashboard.ratios.currentRatio')}
          value={kpis.ratios.current}
          benchmark={2.0}
          format="ratio"
          vsLabel={t('dashboard.ratios.vs')}
        />
        <RatioCard
          label={t('dashboard.ratios.quickRatio')}
          value={kpis.ratios.quick}
          benchmark={1.5}
          format="ratio"
          vsLabel={t('dashboard.ratios.vs')}
        />
        <RatioCard
          label={t('dashboard.ratios.grossMargin')}
          value={42.5}
          benchmark={35}
          format="percent"
          vsLabel={t('dashboard.ratios.vs')}
        />
        <RatioCard
          label={t('dashboard.ratios.dso')}
          value={38}
          benchmark={45}
          format="days"
          lowerIsBetter
          vsLabel={t('dashboard.ratios.vs')}
        />
      </div>

      {/* Charts - Revenue & Cash Flow Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TrendChart
          data={revenueData}
          title={t('dashboard.charts.revenue')}
          titleEn="Revenue"
          subtitle={t('dashboard.charts.last12Months')}
          subtitleEn="Last 12 months - vs budget"
          budget={revenueBudget}
          color="#3B82F6"
          height={200}
          isEn={language === 'en'}
        />
        <TrendChart
          data={cashFlowData}
          title={t('dashboard.charts.cashFlow')}
          titleEn="Net Cash Flow"
          subtitle={t('dashboard.charts.operational')}
          subtitleEn="Operational - monthly"
          color="#8B5CF6"
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
          />
        )}

        {/* AP Aging */}
        {financialData?.summary.payables && (
          <AgingWidget
            title="Comptes fournisseurs"
            titleEn="Accounts Payable"
            data={financialData.summary.payables.aging}
            totalOverdue={financialData.summary.payables.totalOverdue}
            averageDays={financialData.summary.payables.averageDaysPayable}
            type="payable"
            isEn={language === 'en'}
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

      {/* Anomalies List */}
      {analysis.summary.total > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-primary">
              {t('dashboard.alerts.attentionPoints')}
            </h3>
            <Link 
              to="/app/anomalies"
              className="text-sm flex items-center gap-1 text-muted hover:text-secondary"
            >
              {t('common.viewAll')} <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="space-y-2">
            {analysis.anomalies.slice(0, 4).map((anomaly, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  anomaly.severity === 'critical' ? 'bg-[rgb(var(--color-error)/0.08)]' : 'bg-muted'
                }`}
              >
                <AlertTriangle 
                  className={`w-4 h-4 flex-shrink-0 ${
                    anomaly.severity === 'critical' ? 'text-error' : 'text-muted'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary">
                    {anomaly.title}
                  </p>
                  <Tooltip content={anomaly.description} position="bottom" delay={300}>
                    <p className="text-xs truncate text-muted cursor-help">
                      {anomaly.description}
                    </p>
                  </Tooltip>
                </div>
                <Link
                  to="/app/anomalies"
                  className="icon-btn"
                >
                  <Eye className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
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

interface KPICardProps {
  title: string;
  value: string;
  change?: number;
  subtitle?: string;
  trend: 'up' | 'down' | 'neutral';
  badge?: string;
  vsPriorLabel?: string;
  sparkline?: number[];
}

function KPICard({ title, value, change, subtitle, trend, badge, vsPriorLabel = 'vs prior', sparkline }: KPICardProps) {
  // Generate random sparkline data if not provided
  const sparkData = sparkline || Array.from({ length: 12 }, () => Math.random() * 100);
  const maxVal = Math.max(...sparkData);
  const minVal = Math.min(...sparkData);
  const range = maxVal - minVal || 1;
  
  return (
    <div 
      className="group relative overflow-hidden rounded-lg sm:rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
      style={{ 
        backgroundColor: 'rgb(var(--color-surface))',
        border: '1px solid rgb(var(--color-border))',
      }}
    >
      {/* Animated gradient border on hover */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: trend === 'up' 
            ? 'linear-gradient(135deg, rgb(var(--color-success) / 0.1) 0%, transparent 50%)'
            : trend === 'down'
            ? 'linear-gradient(135deg, rgb(var(--color-error) / 0.1) 0%, transparent 50%)'
            : 'linear-gradient(135deg, rgb(var(--color-primary-500) / 0.1) 0%, transparent 50%)',
        }}
      />
      
      {/* Live indicator pulse */}
      <div className="absolute top-2 sm:top-3 right-2 sm:right-3">
        <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
          <span 
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ backgroundColor: 'rgb(var(--color-success))' }}
          />
          <span 
            className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2"
            style={{ backgroundColor: 'rgb(var(--color-success))' }}
          />
        </span>
      </div>
      
      <div className="relative p-3 sm:p-4 lg:p-5">
        <div className="flex items-start justify-between gap-1 sm:gap-2 mb-2 sm:mb-3">
          <span className="text-[9px] sm:text-[10px] lg:text-xs font-semibold uppercase tracking-wider text-muted leading-tight line-clamp-1">
            {title}
          </span>
          {badge && (
            <span 
              className="px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] lg:text-[10px] font-medium whitespace-nowrap flex-shrink-0"
              style={{ 
                backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
                color: 'rgb(var(--color-primary-600))',
              }}
            >
              {badge}
            </span>
          )}
        </div>
        
        {/* Value with animated counter effect */}
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p 
              className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold tabular-nums tracking-tight"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {value}
            </p>
            
            {change !== undefined ? (
              <div className="flex items-center gap-1 sm:gap-1.5 mt-1 sm:mt-2">
                <div 
                  className={`flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] lg:text-xs font-semibold ${
                    trend === 'up' ? 'text-success' : trend === 'down' ? 'text-error' : 'text-muted'
                  }`}
                  style={{
                    backgroundColor: trend === 'up' 
                      ? 'rgb(var(--color-success) / 0.1)'
                      : trend === 'down'
                      ? 'rgb(var(--color-error) / 0.1)'
                      : 'rgb(var(--color-bg-muted))',
                  }}
                >
                  {trend === 'up' ? (
                    <ArrowUpRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  ) : trend === 'down' ? (
                    <ArrowDownRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  ) : null}
                  {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                </div>
                <span className="text-[9px] sm:text-[10px] lg:text-xs text-muted hidden md:inline">
                  {vsPriorLabel}
                </span>
              </div>
            ) : subtitle ? (
              <p className="text-[9px] sm:text-[10px] lg:text-xs mt-1 sm:mt-2 text-muted line-clamp-1">
                {subtitle}
              </p>
            ) : null}
          </div>
          
          {/* Mini sparkline chart - hidden on very small screens */}
          <div className="hidden xs:block w-12 sm:w-16 lg:w-20 h-8 sm:h-10 opacity-60 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <svg viewBox="0 0 80 40" className="w-full h-full overflow-visible">
              {/* Area fill */}
              <path
                d={`M 0 40 ${sparkData.map((v, i) => `L ${(i / (sparkData.length - 1)) * 80} ${40 - ((v - minVal) / range) * 35}`).join(' ')} L 80 40 Z`}
                fill={trend === 'up' ? 'rgb(var(--color-success) / 0.2)' : trend === 'down' ? 'rgb(var(--color-error) / 0.2)' : 'rgb(var(--color-primary-500) / 0.2)'}
              />
              {/* Line */}
              <path
                d={`M ${sparkData.map((v, i) => `${(i / (sparkData.length - 1)) * 80} ${40 - ((v - minVal) / range) * 35}`).join(' L ')}`}
                fill="none"
                stroke={trend === 'up' ? 'rgb(var(--color-success))' : trend === 'down' ? 'rgb(var(--color-error))' : 'rgb(var(--color-primary-500))'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* End dot */}
              <circle
                cx={80}
                cy={40 - ((sparkData[sparkData.length - 1] - minVal) / range) * 35}
                r="3"
                fill={trend === 'up' ? 'rgb(var(--color-success))' : trend === 'down' ? 'rgb(var(--color-error))' : 'rgb(var(--color-primary-500))'}
                className="animate-pulse"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

interface RatioCardProps {
  label: string;
  value: number;
  benchmark: number;
  format: 'ratio' | 'percent' | 'days';
  lowerIsBetter?: boolean;
  vsLabel?: string;
}

function RatioCard({ label, value, benchmark, format, lowerIsBetter, vsLabel = 'vs' }: RatioCardProps) {
  const isGood = lowerIsBetter ? value <= benchmark : value >= benchmark;
  const progress = lowerIsBetter 
    ? Math.min(100, (benchmark / value) * 100)
    : Math.min(100, (value / benchmark) * 100);
  
  const formatValue = () => {
    switch (format) {
      case 'ratio': return `${value.toFixed(2)}x`;
      case 'percent': return `${value.toFixed(1)}%`;
      case 'days': return `${Math.round(value)}d`;
    }
  };

  const formatBenchmark = () => {
    switch (format) {
      case 'ratio': return `${benchmark}x`;
      case 'percent': return `${benchmark}%`;
      case 'days': return `${benchmark}d`;
    }
  };

  return (
    <div 
      className="group relative p-3 sm:p-4 lg:p-5 rounded-lg sm:rounded-xl overflow-hidden transition-all duration-300 hover:shadow-md cursor-default"
      style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
    >
      {/* Background progress indicator */}
      <div 
        className="absolute inset-0 transition-all duration-700 ease-out"
        style={{ 
          background: `linear-gradient(90deg, ${isGood ? 'rgb(var(--color-success) / 0.08)' : 'rgb(var(--color-warning) / 0.08)'} ${Math.min(progress, 100)}%, transparent ${Math.min(progress, 100)}%)`,
        }}
      />
      
      <div className="relative">
        <div className="flex items-start justify-between mb-1.5 sm:mb-2 gap-1">
          <p className="text-[9px] sm:text-[10px] lg:text-xs font-semibold uppercase tracking-wider text-muted leading-tight line-clamp-1">
            {label}
          </p>
          {/* Status icon */}
          <div 
            className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
              isGood ? 'bg-success/20' : 'bg-warning/20'
            }`}
          >
            {isGood ? (
              <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-success" />
            ) : (
              <AlertTriangle className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-warning" />
            )}
          </div>
        </div>
        
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <span 
              className="text-lg sm:text-xl lg:text-2xl font-bold tabular-nums"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {formatValue()}
            </span>
            <div className="flex items-center gap-1 sm:gap-1.5 mt-0.5 sm:mt-1">
              <span className={`text-[9px] sm:text-[10px] lg:text-xs font-medium ${isGood ? 'text-success' : 'text-warning'}`}>
                {isGood ? '✓' : '!'} {vsLabel} {formatBenchmark()}
              </span>
            </div>
          </div>
          
          {/* Circular progress indicator - smaller on mobile */}
          <div className="relative w-8 h-8 sm:w-10 sm:h-10 opacity-70 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="rgb(var(--color-border))"
                strokeWidth="3"
              />
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke={isGood ? 'rgb(var(--color-success))' : 'rgb(var(--color-warning))'}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${progress * 0.88} 88`}
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <span 
              className="absolute inset-0 flex items-center justify-center text-[7px] sm:text-[8px] font-bold"
              style={{ color: isGood ? 'rgb(var(--color-success))' : 'rgb(var(--color-warning))' }}
            >
              {Math.round(progress)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

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
      className="group relative overflow-hidden rounded-lg sm:rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
      style={{ 
        backgroundColor: 'rgb(var(--color-surface))',
        border: `1px solid ${hasAttention ? 'rgb(var(--color-error) / 0.4)' : 'rgb(var(--color-border))'}`,
      }}
    >
      {/* Hover gradient effect */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: hasAttention
            ? 'linear-gradient(135deg, rgb(var(--color-error) / 0.05) 0%, transparent 60%)'
            : 'linear-gradient(135deg, rgb(var(--color-primary-500) / 0.05) 0%, transparent 60%)',
        }}
      />
      
      {/* Animated arrow on hover - hidden on mobile */}
      <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300 hidden sm:block">
        <ChevronRight 
          className="w-4 h-4 sm:w-5 sm:h-5" 
          style={{ color: hasAttention ? 'rgb(var(--color-error))' : 'rgb(var(--color-primary-500))' }}
        />
      </div>
      
      <div className="relative flex items-center gap-2 sm:gap-3 p-3 sm:p-4">
        <div 
          className={`relative w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110 ${
            hasAttention 
              ? 'bg-error/10 text-error' 
              : 'bg-muted'
          }`}
          style={{ color: hasAttention ? undefined : 'rgb(var(--color-text-muted))' }}
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
              className="font-semibold text-xs sm:text-sm group-hover:text-primary-600 transition-colors truncate cursor-help"
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
