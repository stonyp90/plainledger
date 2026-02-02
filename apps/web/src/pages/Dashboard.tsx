import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
  Unlock,
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
  Check,
  X,
  RotateCcw,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Tooltip } from '../components/Tooltip';
import { TrendChart, WaterfallChart } from '../components/charts';
import { VariancePinCompact } from '../components/charts/ibcs/VariancePin';
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
import { useHasRealData } from '../hooks/useHasRealData';
import { 
  runFullAnalysis, 
  DEFAULT_THRESHOLDS,
  type AccountBalance,
} from '../lib/anomalyDetection';
import { INDUSTRY_KPIS } from '../lib/industryBenchmarkDisplay';
import type { DataMetric, DecisionEvent } from '../lib/decisionContext';
import { calculateVariance, type IBCSMetricType } from '../lib/ibcs';
import EmptyDataState from '../components/EmptyDataState';
import ConnectionWizard from '../components/ConnectionWizard';
import DynamicDashboardLayout, { type DashboardSection } from '../components/DynamicDashboardLayout';
import AddWidgetCard from '../components/AddWidgetCard';
import DashboardWidgetWrapper from '../components/DashboardWidgetWrapper';
import { ChartGallery } from '../components/DataVisualization';
import { useDashboardConfig } from '../hooks/useDashboardConfig';
import type { ChartConfig } from '../lib/chartFavorites';
import type { DashboardWidgetConfig } from '../lib/dashboardConfig';

// =====================================================
// DASHBOARD COMPONENT
// =====================================================

// Calendly URL for upgrade calls
const CALENDLY_URL = 'https://calendly.com/anthonypaquet1508';

export default function Dashboard() {
  const { currentTenant, hasPermission } = useTenant();
  const { user } = useAuth();
  const toast = useToast();
  const { isDemoMode, enableDemoMode } = useDemoMode();
  const { t, language } = useI18n();
  const isEn = language === 'en';
  const [selectedPeriod, setSelectedPeriod] = useState<'mtd' | 'qtd' | 'ytd'>('mtd');
  // IBCS mode is always enabled - industry standard for financial reporting
  // Settings can be customized per-chart in the chart settings panel
  const ibcsMode = true;
  const { hasAccess: hasAIAccess } = usePremiumFeature('aiInsights');
  
  // Decision capture feature - must be manually enabled per organization
  // Requires both AI access (premium) AND the decisionCapture feature flag to be enabled
  const hasDecisionCapture = hasAIAccess && (currentTenant?.settings?.features?.decisionCapture ?? false);
  
  // Dashboard customization
  const hasCustomizePermission = hasPermission('customize:dashboard');
  const {
    widgets: widgetConfigs,
    isDashboardLocked,
    addWidget,
    removeWidget,
    reorderWidgets,
    toggleDashboardLock,
    resetToDefaults,
    isWidgetVisible,
  } = useDashboardConfig();
  
  // Can customize only if user has permission AND dashboard is not locked
  const canCustomize = hasCustomizePermission && !isDashboardLocked;
  
  // Chart Gallery modal state
  const [showChartGallery, setShowChartGallery] = useState(false);
  
  // Drag and drop state
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
  const [dragOverWidgetId, setDragOverWidgetId] = useState<string | null>(null);
  
  // Auto-enable demo mode for demo-signup users
  const isDemoSignupUser = user?.organization === 'demo-signup';
  useEffect(() => {
    if (isDemoSignupUser && !isDemoMode) {
      enableDemoMode();
    }
  }, [isDemoSignupUser, isDemoMode, enableDemoMode]);
  
  // Fetch financial data from the data service
  const { data: financialData, isLoading, refresh, error } = useFinancialData();
  
  // Check data availability
  const {
    hasRealData,
    hasQuickBooksConnection,
    hasSandboxData,
    shouldShowSandboxData,
    hasTrends,
    hasRevenueTrends,
    hasCashFlowTrends,
    hasAccounts,
    hasReceivables,
    hasPayables,
    hasSummaryMetrics,
  } = useHasRealData();
  
  // Determine if we should show data (real data OR sandbox data for free users only)
  const shouldShowData = hasRealData || shouldShowSandboxData;

  // Transform financial data to account balances for anomaly detection
  const accountsData: AccountBalance[] = useMemo(() => {
    if (!financialData) return [];
    return (financialData.accounts ?? []).map(a => ({
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
    return filterDataByPeriod(financialData.trends?.revenue?.data ?? [], selectedPeriod);
  }, [financialData, selectedPeriod]);

  // Get cash flow trend data filtered by period
  const cashFlowData = useMemo(() => {
    if (!financialData) return [];
    return filterDataByPeriod(financialData.trends?.cashFlow?.data ?? [], selectedPeriod);
  }, [financialData, selectedPeriod]);

  // Get budget data filtered by period
  const revenueBudget = useMemo(() => {
    if (!financialData) return [];
    const budget = financialData.trends?.revenue?.budget ?? [];
    return filterDataByPeriod(budget, selectedPeriod);
  }, [financialData, selectedPeriod]);

  // Convert budget to planData format for IBCS compliance (array of numbers matching data points)
  const revenuePlanData = useMemo(() => {
    if (!revenueBudget.length || !revenueData.length) return undefined;
    // Ensure planData matches revenueData length
    const planArray: number[] = [];
    for (let i = 0; i < revenueData.length; i++) {
      planArray.push(revenueBudget[i] ?? revenueBudget[revenueBudget.length - 1] ?? 0);
    }
    return planArray.length > 0 ? planArray : undefined;
  }, [revenueBudget, revenueData]);

  // Calculate period totals for summary display
  const periodSummary = useMemo(() => {
    const totalRevenue = revenueData.reduce((sum, d) => sum + (d?.value ?? 0), 0);
    const totalCashFlow = cashFlowData.reduce((sum, d) => sum + (d?.value ?? 0), 0);
    const totalBudget = revenueBudget.reduce((sum, b) => sum + (b ?? 0), 0);
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
    return financialData.cashFlowWaterfall ?? [];
  }, [financialData]);

  const analysis = useMemo(() => {
    if (!accountsData.length || !revenueData.length) {
      return { anomalies: [], summary: { critical: 0, warning: 0, info: 0, total: 0 }, healthScore: 100 };
    }
    return runFullAnalysis(accountsData, revenueData, DEFAULT_THRESHOLDS);
  }, [accountsData, revenueData]);

  // Decision capture state (moved before dashboardSections useMemo to avoid TDZ error)
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

  // Drag and drop handlers
  const handleDragStart = useCallback((widgetId: string) => (e: React.DragEvent) => {
    setDraggedWidgetId(widgetId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedWidgetId(null);
    setDragOverWidgetId(null);
  }, []);

  const handleDragOver = useCallback((widgetId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    if (widgetId !== draggedWidgetId) {
      setDragOverWidgetId(widgetId);
    }
  }, [draggedWidgetId]);

  const handleDrop = useCallback((targetWidgetId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedWidgetId || draggedWidgetId === targetWidgetId) {
      setDraggedWidgetId(null);
      setDragOverWidgetId(null);
      return;
    }

    // Get current order
    const currentOrder = widgetConfigs.map(w => w.id);
    const draggedIndex = currentOrder.indexOf(draggedWidgetId);
    const targetIndex = currentOrder.indexOf(targetWidgetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Reorder array
    const newOrder = [...currentOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedWidgetId);

    reorderWidgets(newOrder);
    setDraggedWidgetId(null);
    setDragOverWidgetId(null);
  }, [draggedWidgetId, widgetConfigs, reorderWidgets]);

  // Handle adding widget from chart gallery
  const handleAddWidget = useCallback((chartConfig: ChartConfig) => {
    const widgetConfig: DashboardWidgetConfig = {
      id: `custom-${Date.now()}`,
      type: 'custom-chart',
      visible: true,
      position: widgetConfigs.length + 1,
      size: 'half',
      chartConfig: {
        chartType: chartConfig.chartType,
        metrics: chartConfig.metrics,
        timeRange: chartConfig.timeRange,
        name: chartConfig.name,
        nameEn: chartConfig.nameEn || chartConfig.name,
      },
    };
    addWidget(widgetConfig);
    setShowChartGallery(false);
    toast.show(isEn ? 'Widget added to dashboard' : 'Widget ajouté au tableau de bord', 'success');
  }, [addWidget, widgetConfigs.length, isEn, toast]);

  // Collect all available dashboard sections dynamically
  const dashboardSections = useMemo((): DashboardSection[] => {
    const sections: DashboardSection[] = [];
    
    // Helper to wrap section component with DashboardWidgetWrapper
    const wrapSection = (id: string, component: React.ReactNode): React.ReactNode => {
      if (!canCustomize) {
        return component;
      }
      return (
        <DashboardWidgetWrapper
          id={id}
          onRemove={() => removeWidget(id)}
          onDragStart={handleDragStart(id)}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver(id)}
          onDrop={handleDrop(id)}
          canCustomize={canCustomize}
          isDragging={draggedWidgetId === id}
          isDragOver={dragOverWidgetId === id}
        >
          {component}
        </DashboardWidgetWrapper>
      );
    };

    // Period Summary (if has trends) - IBCS-compliant KPI row
    if (hasTrends && periodSummary.dataPoints > 0 && isWidgetVisible('period-summary')) {
      sections.push({
        id: 'period-summary',
        component: wrapSection('period-summary', (
          <div 
            className="grid grid-cols-4 gap-1 sm:gap-2 p-2 sm:p-3 rounded-xl"
            style={{ 
              backgroundColor: 'rgb(var(--color-surface))',
              border: '1px solid rgb(var(--color-border))',
            }}
          >
            {/* Revenue - Primary metric */}
            <div className="text-center py-2 sm:py-3 px-1 sm:px-3">
              <p className="text-[9px] sm:text-[10px] uppercase tracking-wider font-medium mb-0.5 sm:mb-1 truncate" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {language === 'en' ? 'Revenue' : 'Revenus'}
              </p>
              <p className="text-base sm:text-lg lg:text-xl font-bold tabular-nums" style={{ color: 'rgb(var(--color-text))' }}>
                ${(periodSummary.totalRevenue / 1000).toFixed(0)}K
              </p>
            </div>
            
            {/* Cash Flow - with semantic color */}
            <div className="text-center py-2 sm:py-3 px-1 sm:px-3">
              <p className="text-[9px] sm:text-[10px] uppercase tracking-wider font-medium mb-0.5 sm:mb-1 truncate" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {language === 'en' ? 'Cash Flow' : 'Trésorerie'}
              </p>
              <p 
                className="text-base sm:text-lg lg:text-xl font-bold tabular-nums" 
                style={{ 
                  color: periodSummary.totalCashFlow >= 0 
                    ? 'rgb(var(--color-success))' 
                    : 'rgb(var(--color-error))' 
                }}
              >
                {periodSummary.totalCashFlow >= 0 ? '+' : ''}{(periodSummary.totalCashFlow / 1000).toFixed(0)}K
              </p>
            </div>
            
            {/* Budget Variance - IBCS variance pin */}
            <div className="text-center py-2 sm:py-3 px-1 sm:px-3">
              <p className="text-[9px] sm:text-[10px] uppercase tracking-wider font-medium mb-0.5 sm:mb-1 truncate" style={{ color: 'rgb(var(--color-text-muted))' }}>
                ΔPL
              </p>
              <div className="flex items-center justify-center">
                <VariancePinCompact
                  variancePct={periodSummary.budgetVariance}
                  favorable={periodSummary.budgetVariance >= 0}
                  height={22}
                />
              </div>
            </div>
            
            {/* Period indicator */}
            <div className="text-center py-2 sm:py-3 px-1 sm:px-3">
              <p className="text-[9px] sm:text-[10px] uppercase tracking-wider font-medium mb-0.5 sm:mb-1 truncate" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {language === 'en' ? 'Period' : 'Période'}
              </p>
              <p className="text-base sm:text-lg lg:text-xl font-bold tabular-nums" style={{ color: 'rgb(var(--color-text))' }}>
                {periodSummary.dataPoints}<span className="text-xs sm:text-sm font-normal ml-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>mo</span>
              </p>
            </div>
          </div>
        )),
        priority: 1,
        gridSpan: 'full',
      });
    }

    // Anomalies Section (if has anomalies) - IBCS-inspired compact design
    if (shouldShowData && analysis.summary.total > 0 && isWidgetVisible('anomalies')) {
      sections.push({
        id: 'anomalies',
        component: wrapSection('anomalies', (
          <Link 
            to="/app/anomalies"
            className="block rounded-lg sm:rounded-xl p-2.5 sm:p-3 lg:p-4 transition-all group hover:shadow-md"
            style={{ 
              backgroundColor: 'rgb(var(--color-surface))',
              border: '1px solid rgb(var(--color-border))',
            }}
          >
            {/* Compact header row */}
            <div className="flex items-center justify-between gap-3">
              {/* Left: Icon + Count + Badges */}
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                {/* Minimal icon - IBCS: reduce chart junk */}
                <div 
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ 
                    backgroundColor: analysis.summary.critical > 0 
                      ? 'rgb(var(--color-error) / 0.08)' 
                      : 'rgb(var(--color-text) / 0.05)',
                  }}
                >
                  <AlertTriangle 
                    className="w-4 h-4 sm:w-4.5 sm:h-4.5" 
                    style={{ 
                      color: analysis.summary.critical > 0 
                        ? 'rgb(var(--color-error))' 
                        : 'rgb(var(--color-text-muted))',
                    }}
                  />
                </div>
                
                {/* Count and subtitle */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm sm:text-base font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                      {analysis.summary.total} {language === 'en' ? 'anomalies' : 'anomalies'}
                    </span>
                    {/* Inline severity badges - compact */}
                    <div className="flex items-center gap-1">
                      {analysis.summary.critical > 0 && (
                        <span 
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-medium"
                          style={{ 
                            backgroundColor: 'rgb(var(--color-error) / 0.1)',
                            color: 'rgb(var(--color-error))',
                          }}
                        >
                          <span className="w-1 h-1 rounded-full" style={{ backgroundColor: 'rgb(var(--color-error))' }} />
                          {analysis.summary.critical}
                        </span>
                      )}
                      {analysis.summary.warning > 0 && (
                        <span 
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-medium"
                          style={{ 
                            backgroundColor: 'rgb(var(--color-warning) / 0.1)',
                            color: 'rgb(var(--color-warning))',
                          }}
                        >
                          <span className="w-1 h-1 rounded-full" style={{ backgroundColor: 'rgb(var(--color-warning))' }} />
                          {analysis.summary.warning}
                        </span>
                      )}
                      {analysis.summary.info > 0 && (
                        <span 
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-medium"
                          style={{ 
                            backgroundColor: 'rgb(var(--color-info) / 0.08)',
                            color: 'rgb(var(--color-info))',
                          }}
                        >
                          <span className="w-1 h-1 rounded-full" style={{ backgroundColor: 'rgb(var(--color-info))' }} />
                          {analysis.summary.info}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] sm:text-xs mt-0.5 truncate" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {language === 'en' ? 'Review required' : 'Examen requis'}
                  </p>
                </div>
              </div>
              
              {/* Right: Action area */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Notification CTA - compact pill */}
                <Link
                  to="/app/settings?tab=notifications"
                  className="hidden sm:flex items-center gap-1 text-[10px] px-2 py-1 rounded-full transition-colors"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-bg-muted))',
                    color: 'rgb(var(--color-text-muted))',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span>Slack • Teams</span>
                </Link>
                <ChevronRight 
                  className="w-4 h-4 sm:w-5 sm:h-5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" 
                  style={{ color: 'rgb(var(--color-text-muted))' }}
                />
              </div>
            </div>
          </Link>
        )),
        priority: 2,
        gridSpan: 'full',
      });
    }

    // Industry Benchmarks (if has real data)
    if (hasRealData && hasSummaryMetrics && isWidgetVisible('industry-benchmarks')) {
      sections.push({
        id: 'industry-benchmarks',
        component: wrapSection('industry-benchmarks', (
          <IndustryBenchmarksSection 
            industry={currentTenant?.industry || 'real_estate'} 
            isEn={language === 'en'}
            ibcsMode={ibcsMode}
            financialData={financialData}
          />
        )),
        priority: 3,
        gridSpan: 'full',
      });
    }

    // Revenue Chart (if has revenue data)
    if (hasRevenueTrends && revenueData.length > 0 && isWidgetVisible('revenue-chart')) {
      sections.push({
        id: 'revenue-chart',
        component: wrapSection('revenue-chart', (
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
            planData={revenuePlanData}
            color="rgb(var(--color-primary-500))"
            height={200}
            isEn={language === 'en'}
            ibcsMode={ibcsMode}
            showVarianceShading={ibcsMode}
            showIBCSLegend={ibcsMode}
            chartId="dashboard-revenue-trend"
            enableDecisions={hasDecisionCapture}
            onRecordDecision={handleRecordDecision}
            recentDecisions={recentDecisions.filter(d => d.context.metricType === 'revenue')}
            metricType="revenue"
            benchmarkValue={revenueBudget.length > 0 ? revenueBudget[revenueBudget.length - 1] : undefined}
          />
        )),
        priority: 4,
        gridSpan: 'half',
      });
    }

    // Cash Flow Chart (if has cash flow data)
    if (hasCashFlowTrends && cashFlowData.length > 0 && isWidgetVisible('cashflow-chart')) {
      sections.push({
        id: 'cashflow-chart',
        component: wrapSection('cashflow-chart', (
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
            ibcsMode={ibcsMode}
            showVarianceShading={ibcsMode}
            showIBCSLegend={ibcsMode}
            chartId="dashboard-cashflow-trend"
            enableDecisions={hasDecisionCapture}
            onRecordDecision={handleRecordDecision}
            recentDecisions={recentDecisions.filter(d => d.context.metricType === 'cash_flow')}
            metricType="cash_flow"
          />
        )),
        priority: 5,
        gridSpan: 'half',
      });
    }

    // Add Widget Card (after charts, only if user can customize)
    if (canCustomize) {
      sections.push({
        id: 'add-widget',
        component: (
          <DashboardWidgetWrapper
            id="add-widget"
            canCustomize={canCustomize}
            isDragging={draggedWidgetId === 'add-widget'}
            isDragOver={dragOverWidgetId === 'add-widget'}
            onDragStart={handleDragStart('add-widget')}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver('add-widget')}
            onDrop={handleDrop('add-widget')}
            // Don't allow removing the Add Widget card
          >
            <AddWidgetCard onClick={() => setShowChartGallery(true)} />
          </DashboardWidgetWrapper>
        ),
        priority: 5.5,
        gridSpan: 'half',
      });
    }

    // Cash Flow Waterfall (if has waterfall data)
    if (cashFlowWaterfallData && cashFlowWaterfallData.length > 0 && isWidgetVisible('cashflow-waterfall')) {
      sections.push({
        id: 'cashflow-waterfall',
        component: wrapSection('cashflow-waterfall', (
          <WaterfallChart
            data={cashFlowWaterfallData}
            title={getIndustryChartTitle(currentTenant?.industry || 'real_estate', 'waterfall', isEn)}
            titleEn={getIndustryChartTitle(currentTenant?.industry || 'real_estate', 'waterfall', true)}
            subtitle={getIndustryChartSubtitle(currentTenant?.industry || 'real_estate', isEn)}
            subtitleEn={getIndustryChartSubtitle(currentTenant?.industry || 'real_estate', true)}
            isEn={language === 'en'}
            height={260}
            ibcsMode={ibcsMode}
            showIBCSLegend={ibcsMode}
            chartId="dashboard-cashflow-waterfall"
            enableDecisions={hasDecisionCapture}
            onRecordDecision={handleRecordDecision}
            metricType="cash_flow"
          />
        )),
        priority: 6,
        gridSpan: 'full',
      });
    }

    // Accounting Details Section (if has accounting data)
    if (shouldShowData && (hasAccounts || hasReceivables || hasPayables || hasSummaryMetrics) && isWidgetVisible('accounting-details')) {
      sections.push({
        id: 'accounting-details',
        component: wrapSection('accounting-details', (
          <CollapsibleAccountingSection 
            financialData={financialData}
            analysis={analysis}
            language={language}
            isEn={language === 'en'}
            t={t}
          />
        )),
        priority: 7,
        gridSpan: 'full',
      });
    }

    // No Anomalies State (if has data but no anomalies)
    if (shouldShowData && analysis.summary.total === 0 && isWidgetVisible('no-anomalies')) {
      sections.push({
        id: 'no-anomalies',
        component: wrapSection('no-anomalies', (
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
        )),
        priority: 8,
        gridSpan: 'full',
      });
    }

    // Filter sections by visibility and sort by custom order
    const visibleSections = sections.filter(section => {
      // Add Widget card is always visible if user can customize
      if (section.id === 'add-widget') return true;
      return isWidgetVisible(section.id);
    });

    // Sort by custom order if available
    const customOrder = widgetConfigs.map(w => w.id);
    if (customOrder.length > 0) {
      visibleSections.sort((a, b) => {
        const aIndex = customOrder.indexOf(a.id);
        const bIndex = customOrder.indexOf(b.id);
        // If not in custom order, use priority
        if (aIndex === -1 && bIndex === -1) return a.priority - b.priority;
        if (aIndex === -1) return 999; // Put unknown widgets at end
        if (bIndex === -1) return -999;
        return aIndex - bIndex;
      });
    }

    return visibleSections;
  }, [
    hasTrends,
    periodSummary,
    shouldShowData,
    analysis,
    hasRealData,
    hasSummaryMetrics,
    hasRevenueTrends,
    revenueData,
    hasCashFlowTrends,
    cashFlowData,
    cashFlowWaterfallData,
    hasAccounts,
    hasReceivables,
    hasPayables,
    currentTenant?.industry,
    language,
    isEn,
    selectedPeriod,
    revenueBudget,
    revenuePlanData,
    ibcsMode,
    hasDecisionCapture,
    handleRecordDecision,
    recentDecisions,
    financialData,
    t,
    canCustomize,
    isWidgetVisible,
    widgetConfigs,
    removeWidget,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDrop,
    draggedWidgetId,
    dragOverWidgetId,
  ]);


  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);

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
      <div className="space-y-2 sm:space-y-4 lg:space-y-6 animate-pulse">
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {[...Array(4)].map((_, i) => (
            <div 
              key={i}
              className="rounded-lg sm:rounded-xl p-2.5 sm:p-3 lg:p-4 relative overflow-hidden"
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {[...Array(4)].map((_, i) => (
            <div 
              key={i}
              className="rounded-lg sm:rounded-xl p-2.5 sm:p-3"
              style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
            >
              <div className="h-2.5 sm:h-3 w-20 sm:w-24 rounded bg-[rgb(var(--color-border))] mb-2 sm:mb-3" />
              <div className="h-5 sm:h-7 w-12 sm:w-16 rounded bg-[rgb(var(--color-border))]" />
            </div>
          ))}
        </div>
        
        {/* Charts skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3 lg:gap-4">
          {[...Array(2)].map((_, i) => (
            <div 
              key={i}
              className="rounded-lg sm:rounded-xl p-3 sm:p-4 h-44 sm:h-52 lg:h-60"
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
    <div className="space-y-2 sm:space-y-4 lg:space-y-6" style={{ backgroundColor: 'rgb(var(--color-bg))' }}>
      {/* Demo Signup Welcome Banner - Shows for new signups */}
      <DemoSignupWelcome />
      
      {/* Demo Banner */}
      <DemoBanner />
      
      {/* Connection Wizard - Show when no data available at all */}
      {/* In mock auth mode (local dev), mock data will be available, so dashboard shows */}
      {!hasRealData && !hasQuickBooksConnection && !shouldShowSandboxData && !financialData && !isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] py-6">
          <div className="w-full max-w-lg">
            <ConnectionWizard />
          </div>
        </div>
      ) : (
        <>
          {/* Header - Clean mobile-first design */}
          <div className="flex flex-col gap-2">
            {/* Title row with inline controls */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-primary truncate">
                  {currentTenant ? currentTenant.name : t('dashboard.title')}
                </h1>
                {/* Sample data indicator - very subtle */}
                {shouldShowSandboxData && (
                  <span 
                    className="text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-text-muted) / 0.08)',
                      color: 'rgb(var(--color-text-muted) / 0.6)',
                    }}
                  >
                    {isEn ? 'Demo' : 'Démo'}
                  </span>
                )}
              </div>
              
              {/* Right side controls */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Period filter - themed dropdown */}
                <PeriodFilter
                  periods={periods}
                  selectedPeriod={selectedPeriod}
                  onSelectPeriod={(id) => setSelectedPeriod(id as 'mtd' | 'qtd' | 'ytd')}
                  isEn={isEn}
                />
                
                {/* Lock/Unlock Dashboard - Only show if user has permission */}
                {hasCustomizePermission && (
                  <button
                    onClick={() => {
                      const newLocked = toggleDashboardLock();
                      toast.show(
                        newLocked 
                          ? (isEn ? 'Dashboard locked' : 'Tableau de bord verrouillé')
                          : (isEn ? 'Dashboard unlocked' : 'Tableau de bord déverrouillé'),
                        'success'
                      );
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 active:scale-95 border"
                    style={{
                      backgroundColor: isDashboardLocked 
                        ? 'rgb(var(--color-warning) / 0.1)' 
                        : 'rgb(var(--color-surface))',
                      borderColor: isDashboardLocked 
                        ? 'rgb(var(--color-warning) / 0.3)' 
                        : 'rgb(var(--color-border))',
                      color: isDashboardLocked 
                        ? 'rgb(var(--color-warning))' 
                        : 'rgb(var(--color-text-muted))',
                    }}
                    title={isDashboardLocked 
                      ? (isEn ? 'Unlock to enable customization' : 'Déverrouiller pour personnaliser')
                      : (isEn ? 'Lock to prevent changes' : 'Verrouiller pour empêcher les modifications')
                    }
                  >
                    {isDashboardLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">
                      {isDashboardLocked 
                        ? (isEn ? 'Locked' : 'Verrouillé') 
                        : (isEn ? 'Lock' : 'Verrouiller')
                      }
                    </span>
                  </button>
                )}
                
                {/* Reset to Defaults - Only show if user can customize */}
                {canCustomize && (
                  <button
                    onClick={() => {
                      resetToDefaults();
                      toast.show(
                        isEn ? 'Dashboard reset to defaults' : 'Tableau de bord réinitialisé',
                        'success'
                      );
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 active:scale-95 border hover:bg-[rgb(var(--color-bg-muted))] hover:text-[rgb(var(--color-text))] hover:border-[rgb(var(--color-text-muted)/0.3)]"
                    style={{
                      backgroundColor: 'rgb(var(--color-surface))',
                      borderColor: 'rgb(var(--color-border))',
                      color: 'rgb(var(--color-text-muted))',
                    }}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{isEn ? 'Reset' : 'Réinit.'}</span>
                  </button>
                )}
                
                {/* Refresh */}
                <button
                  onClick={handleRefresh}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 active:scale-95 border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[rgb(var(--color-bg-muted))] hover:text-[rgb(var(--color-text))] hover:border-[rgb(var(--color-text-muted)/0.3)]"
                  style={{
                    backgroundColor: 'rgb(var(--color-surface))',
                    borderColor: 'rgb(var(--color-border))',
                    color: 'rgb(var(--color-text-muted))',
                  }}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{isEn ? 'Refresh' : 'Actualiser'}</span>
                </button>
              </div>
            </div>
            
            {/* Subtitle with live indicator */}
            <div className="flex items-center gap-2 -mt-0.5">
              <p className="text-xs md:text-sm text-muted">
                {t('dashboard.subtitle')}
              </p>
              {hasRealData && financialData?.lastUpdated && (
                <span 
                  className="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-bg-muted))',
                    color: 'rgb(var(--color-text-muted))'
                  }}
                  title={financialData.lastUpdated ? new Date(financialData.lastUpdated).toLocaleString() : ''}
                >
                  <CheckCircle className="w-2.5 h-2.5" style={{ color: 'rgb(var(--color-success))' }} />
                  {isEn ? 'Live' : 'Direct'}
                </span>
              )}
            </div>
          </div>

      {/* Dynamic Dashboard Layout - Only renders sections with real data */}
      <DynamicDashboardLayout 
        sections={dashboardSections}
        customOrder={widgetConfigs.map(w => w.id)}
      />

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
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
          className="relative overflow-hidden rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-5"
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

          {/* Chart Gallery Modal */}
          {showChartGallery && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
              onClick={() => setShowChartGallery(false)}
            >
              <div
                className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl"
                style={{ backgroundColor: 'rgb(var(--color-surface))' }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div
                  className="flex items-center justify-between p-4 sm:p-6 border-b"
                  style={{ borderColor: 'rgb(var(--color-border))' }}
                >
                  <h2 className="text-lg sm:text-xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                    {isEn ? 'Add Widget' : 'Ajouter un widget'}
                  </h2>
                  <button
                    onClick={() => setShowChartGallery(false)}
                    className="p-2 rounded-lg transition-colors"
                    style={{
                      backgroundColor: 'rgb(var(--color-bg-muted))',
                      color: 'rgb(var(--color-text-muted))',
                    }}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="p-4 sm:p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
                  <ChartGallery onSelectChart={handleAddWidget} />
                </div>
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
        </>
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
    financialData?.summary?.trialBalance ||
    financialData?.summary?.receivables ||
    financialData?.summary?.payables ||
    financialData?.summary?.budgetComparisons ||
    financialData?.summary?.upcomingDeadlines ||
    financialData?.summary?.bankAccounts
  );

  if (!hasAccountingData) {
    // Return empty state instead of null for better UX
    return null;
  }

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
        className="w-full p-2.5 sm:p-3 lg:p-4 flex items-center justify-between transition-colors active:opacity-70 group-hover:bg-[rgb(var(--color-bg-muted))]"
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
          {financialData?.summary?.trialBalance && (
            <TrialBalanceSummary
              totalDebits={financialData.summary.trialBalance?.totalDebits ?? 0}
              totalCredits={financialData.summary.trialBalance?.totalCredits ?? 0}
              isBalanced={financialData.summary.trialBalance?.isBalanced ?? true}
              isEn={isEn}
            />
          )}

          {/* Accounting-Specific Widgets */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3 lg:gap-4">
            {/* AR Aging */}
            {financialData?.summary?.receivables && (
              <AgingWidget
                title="Comptes clients"
                titleEn="Accounts Receivable"
                data={financialData.summary?.receivables?.aging ?? []}
                totalOverdue={financialData.summary?.receivables?.totalOverdue ?? 0}
                averageDays={financialData.summary?.receivables?.averageDaysOutstanding ?? 0}
                type="receivable"
                isEn={isEn}
                hasData={financialData.summary?.receivables?.hasData ?? false}
              />
            )}

            {/* AP Aging - Shows empty state if no bills tracked */}
            {financialData?.summary?.payables && (
              <AgingWidget
                title="Comptes fournisseurs"
                titleEn="Accounts Payable"
                data={financialData.summary?.payables?.aging ?? []}
                totalOverdue={financialData.summary?.payables?.totalOverdue ?? 0}
                averageDays={financialData.summary?.payables?.averageDaysPayable ?? 0}
                type="payable"
                isEn={isEn}
                hasData={financialData.summary?.payables?.hasData ?? false}
              />
            )}
          </div>

          {/* Budget vs Actual + Deadlines */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3 lg:gap-4">
            {/* Budget Comparison */}
            {financialData?.summary?.budgetComparisons && (
              <BudgetWidget
                data={financialData.summary?.budgetComparisons ?? []}
                isEn={isEn}
              />
            )}

            {/* Upcoming Deadlines */}
            {financialData?.summary?.upcomingDeadlines && (
              <DeadlinesWidget
                deadlines={financialData.summary.upcomingDeadlines ?? []}
                isEn={isEn}
              />
            )}
          </div>

          {/* Bank Reconciliation */}
          {financialData?.summary?.bankAccounts && (
            <BankReconciliationWidget
              accounts={financialData.summary?.bankAccounts ?? []}
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
// PERIOD FILTER COMPONENT - Themed dropdown
// =====================================================

interface PeriodFilterProps {
  periods: { id: string; label: string }[];
  selectedPeriod: string;
  onSelectPeriod: (id: string) => void;
  isEn: boolean;
}

function PeriodFilter({ periods, selectedPeriod, onSelectPeriod, isEn }: PeriodFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const selectedLabel = periods.find(p => p.id === selectedPeriod)?.label || '';

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Filter button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 rounded-lg text-xs font-medium transition-all"
        style={{
          backgroundColor: isOpen ? 'rgb(var(--color-primary-500) / 0.1)' : 'rgb(var(--color-surface))',
          color: isOpen ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-text))',
          border: `1px solid ${isOpen ? 'rgb(var(--color-primary-500) / 0.3)' : 'rgb(var(--color-border))'}`,
        }}
      >
        <Calendar className="w-3.5 h-3.5" style={{ color: 'rgb(var(--color-primary-500))' }} />
        <span>{selectedLabel}</span>
        <ChevronDown 
          className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: 'rgb(var(--color-text-muted))' }}
        />
      </button>
      
      {/* Dropdown menu */}
      {isOpen && (
        <div 
          className="absolute right-0 top-full mt-1 py-1 rounded-lg shadow-lg z-50 min-w-[120px] animate-in fade-in slide-in-from-top-1 duration-150"
          style={{
            backgroundColor: 'rgb(var(--color-surface))',
            border: '1px solid rgb(var(--color-border))',
            boxShadow: '0 4px 12px rgb(0 0 0 / 0.1)',
          }}
        >
          {periods.map(period => {
            const isSelected = period.id === selectedPeriod;
            return (
              <button
                key={period.id}
                onClick={() => {
                  onSelectPeriod(period.id);
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-medium transition-colors text-left"
                style={{
                  backgroundColor: isSelected ? 'rgb(var(--color-primary-500) / 0.08)' : 'transparent',
                  color: isSelected ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-text))',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'rgb(var(--color-bg-muted))';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isSelected ? 'rgb(var(--color-primary-500) / 0.08)' : 'transparent';
                }}
              >
                <span>{period.label}</span>
                {isSelected && (
                  <Check className="w-3.5 h-3.5" style={{ color: 'rgb(var(--color-primary-500))' }} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
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
// INDUSTRY BENCHMARKS SECTION (COLLAPSIBLE)
// =====================================================

interface IndustryBenchmarksSectionProps {
  industry: string;
  isEn: boolean;
  ibcsMode?: boolean;
  financialData?: any;
}

function IndustryBenchmarksSection({ industry, isEn, ibcsMode = false, financialData }: IndustryBenchmarksSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  // Find industry data or default to real_estate
  const industryData = INDUSTRY_KPIS.find(ind => ind.id === industry) || INDUSTRY_KPIS[0];
  
  // Safety check - if no industry data found, don't render
  if (!industryData) {
    return null;
  }
  
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

  // Determine metric type for IBCS variance calculation
  const getMetricType = (kpiName: string): IBCSMetricType => {
    if (kpiName.includes('Cost') || kpiName.includes('Coût') || kpiName.includes('Expense') || kpiName.includes('Dépense')) {
      return 'expense';
    }
    if (kpiName.includes('Revenue') || kpiName.includes('Revenus') || kpiName.includes('Sales') || kpiName.includes('Ventes') || kpiName.includes('NOI') || kpiName.includes('GOP')) {
      return 'revenue';
    }
    if (kpiName.includes('Profit') || kpiName.includes('Bénéfice') || kpiName.includes('Margin') || kpiName.includes('Marge')) {
      return 'profit';
    }
    if (kpiName.includes('Rate') || kpiName.includes('Taux') || kpiName.includes('%') || kpiName.includes('Ratio') || kpiName.includes('Turnover') || kpiName.includes('Rotation')) {
      return 'ratio';
    }
    return 'count';
  };

  // Extract target value from target string (e.g., "85-95%" -> 90, "4-8%" -> 6)
  const extractTargetValue = (targetStr: string, currentValue: number): number => {
    // Try to extract numeric range (e.g., "85-95%" -> average = 90)
    const rangeMatch = targetStr.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
    if (rangeMatch) {
      const min = parseFloat(rangeMatch[1]);
      const max = parseFloat(rangeMatch[2]);
      return (min + max) / 2;
    }
    // Try single number
    const singleMatch = targetStr.match(/(\d+(?:\.\d+)?)/);
    if (singleMatch) {
      return parseFloat(singleMatch[1]);
    }
    // Fallback: use current value as target (no variance)
    return currentValue;
  };

  const kpiCards = topKPIs.map((kpi) => {
    const IconComponent = getIconForKPI(kpi.name);
    const isGoodWhenDown = kpi.name.includes('Cost') || kpi.name.includes('Coût') || kpi.name.includes('Shrinkage') || kpi.name.includes('Variance');
    
    // Calculate variance for IBCS display
    const targetValue = extractTargetValue(kpi.target, kpi.currentValue);
    const metricType = getMetricType(kpi.name);
    const variance = calculateVariance(kpi.currentValue, targetValue, metricType);
    
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
      // IBCS variance props
      ibcsMode,
      planValue: targetValue,
      actualValue: kpi.currentValue,
      variancePct: variance.percentage,
      isFavorable: variance.favorable,
    };
  });

  return (
    <div 
      className="rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-5"
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
            <h3 className="text-sm sm:text-base lg:text-lg font-semibold truncate" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? `${industryData.name.en} Benchmarks` : `Références ${industryData.name.fr}`}
            </h3>
            <p className="text-xs sm:text-sm mt-0.5 sm:mt-1 truncate" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Industry reference metrics for comparison' : 'Métriques de référence de l\'industrie pour comparaison'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs font-medium flex-shrink-0 transition-colors"
          style={{ 
            backgroundColor: 'rgb(var(--color-bg-muted))',
            color: 'rgb(var(--color-text-muted))',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgb(var(--color-border))';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgb(var(--color-bg-muted))';
          }}
        >
          <span className="hidden sm:inline">{isEn ? 'Industry Benchmarks' : 'Références'}</span>
          <span className="sm:hidden">{isEn ? 'Benchmarks' : 'Ref'}</span>
          {isExpanded ? (
            <ChevronUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          ) : (
            <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          )}
        </button>
      </div>
      
      {/* Benchmark Badge */}
      <div className="mb-3 sm:mb-4">
        <span 
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
          style={{ 
            backgroundColor: 'rgb(var(--color-info) / 0.1)',
            color: 'rgb(var(--color-info))',
          }}
        >
          <Target className="w-3 h-3" />
          {isEn ? 'Reference values only - not your actual data' : 'Valeurs de référence uniquement - pas vos données réelles'}
        </span>
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <>
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

          {/* Benchmark Cards Grid - Responsive with optimal spacing */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-2.5 lg:gap-3">
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
                ibcsMode={kpi.ibcsMode}
                planValue={kpi.planValue}
                actualValue={kpi.actualValue}
                variancePct={kpi.variancePct}
                isFavorable={kpi.isFavorable}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

