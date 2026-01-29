/**
 * Custom Dashboard Page
 * 
 * User-customizable dashboard with:
 * - Pinned favorite charts
 * - Chart gallery for adding new visualizations
 * - Drag and drop reordering
 * - Multiple size options
 * - Save/Load reports
 */

import { useState, useEffect } from 'react';
import {
  Plus,
  LayoutGrid,
  List,
  Settings2,
  RefreshCw,
  Search,
  X,
  GripVertical,
  Sparkles,
  Save,
  FolderOpen,
  Trash2,
  Download,
  FileText,
  Star,
  StarOff,
  Check,
  Wand2,
  TrendingUp,
  TrendingDown,
  Edit3,
  Copy,
  Eye,
  BarChart3,
  Calendar,
  ArrowRight,
  Target,
  Crown,
  PieChart,
  LineChart,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { useFinancialData } from '../hooks/useFinancialData';
import { InfoTooltip, LabelTooltip } from '../components/Tooltip';
import {
  DataVisualizationCard,
  ChartGallery,
  ChartTypeSelector,
  TimeRangeSelector,
  ChartTypeIcon,
} from '../components/DataVisualization';
import {
  chartFavoritesService,
  ChartConfig,
  PinnedChart,
  PRESET_CHARTS,
  CHART_TYPE_INFO,
  METRIC_INFO,
} from '../lib/chartFavorites';
import {
  ReportManager,
  SaveReportModal,
  TemplateSelector,
  DeleteConfirmModal,
} from '../components/ReportManager';
import {
  reportManagementService,
  SavedReport,
  REPORT_TEMPLATES,
} from '../lib/reportManagement';
import ChartBuilder from '../components/ChartBuilder';
import { ChartTooltip } from '../components/charts/ChartTooltip';
import PremiumFeatureGate, { usePremiumFeature, PremiumUpgradeBanner } from '../components/PremiumFeatureGate';
import { useTenant } from '../contexts/TenantContext';

// Calendly link for upgrade consultations
const CALENDLY_URL = 'https://calendly.com/anthonypaquet1508';

export default function CustomDashboard() {
  const { language } = useI18n();
  const isEn = language === 'en';
  const { data: financialData, refresh } = useFinancialData();
  const { currentTenant } = useTenant();
  const { hasAccess } = usePremiumFeature('advancedAnalytics');
  
  const [pinnedCharts, setPinnedCharts] = useState<PinnedChart[]>([]);
  const [showGallery, setShowGallery] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editMode, setEditMode] = useState(false);
  
  // Drag and drop state for pinned charts
  const [draggedChartId, setDraggedChartId] = useState<string | null>(null);
  const [dragOverChartId, setDragOverChartId] = useState<string | null>(null);
  
  // Drag and drop state for suggested charts
  const [draggedSuggestionId, setDraggedSuggestionId] = useState<string | null>(null);
  const [dragOverSuggestionId, setDragOverSuggestionId] = useState<string | null>(null);
  const [suggestionOrder, setSuggestionOrder] = useState<string[]>([]);
  
  // Report management state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports'>('dashboard');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  const [currentReportName, setCurrentReportName] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  // Chart Builder state
  const [showChartBuilder, setShowChartBuilder] = useState(false);
  const [editingChart, setEditingChart] = useState<ChartConfig | null>(null);
  
  // Hover tooltip state
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [tooltipTimeout, setTooltipTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Load pinned charts and saved reports on mount
  useEffect(() => {
    const pinned = chartFavoritesService.getPinnedCharts();
    setPinnedCharts(pinned);
    setSavedReports(reportManagementService.getAllReports());
  }, []);
  
  // Cleanup tooltip timeout on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
      }
    };
  }, [tooltipTimeout]);
  
  // Delayed hover handlers for suggested charts (prevents blocking clicks)
  const handleSuggestionMouseEnter = (chartId: string, e: React.MouseEvent) => {
    const timeout = setTimeout(() => {
      setHoveredElement(`suggest-${chartId}`);
      setTooltipPosition({ x: e.clientX, y: e.clientY });
    }, 400); // 400ms delay before showing tooltip
    setTooltipTimeout(timeout);
  };
  
  const handleSuggestionMouseLeave = () => {
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
      setTooltipTimeout(null);
    }
    setHoveredElement(null);
  };
  
  const showToast = (message: string) => {
    setToastMessage(message);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };
  
  const handlePinChart = (config: ChartConfig) => {
    const pinned = chartFavoritesService.pinChart(config);
    setPinnedCharts(chartFavoritesService.getPinnedCharts());
    setShowGallery(false);
    setHasUnsavedChanges(true);
  };
  
  // Handle custom chart creation from builder
  const handleCreateCustomChart = (config: ChartConfig) => {
    chartFavoritesService.pinChart(config);
    setPinnedCharts(chartFavoritesService.getPinnedCharts());
    setShowChartBuilder(false);
    setEditingChart(null);
    setHasUnsavedChanges(true);
    showToast(isEn ? 'Chart created successfully!' : 'Graphique créé avec succès !');
  };
  
  // Handle chart edit
  const handleEditChart = (chartId: string) => {
    const pinned = pinnedCharts.find(p => p.chartId === chartId);
    if (pinned) {
      setEditingChart(pinned.config);
      setShowChartBuilder(true);
    }
  };
  
  // Handle chart duplicate
  const handleDuplicateChart = (chartId: string) => {
    const pinned = pinnedCharts.find(p => p.chartId === chartId);
    if (pinned) {
      const newConfig = {
        ...pinned.config,
        id: chartFavoritesService.generateChartId(),
        name: pinned.config.name + ' (copy)',
        nameEn: pinned.config.nameEn + ' (copy)',
      };
      chartFavoritesService.pinChart(newConfig);
      setPinnedCharts(chartFavoritesService.getPinnedCharts());
      setHasUnsavedChanges(true);
      showToast(isEn ? 'Chart duplicated!' : 'Graphique dupliqué !');
    }
  };
  
  const handleUnpinChart = (chartId: string) => {
    chartFavoritesService.unpinChart(chartId);
    setPinnedCharts(chartFavoritesService.getPinnedCharts());
    setHasUnsavedChanges(true);
  };
  
  const handleConfigChange = (chartId: string, config: ChartConfig) => {
    chartFavoritesService.updatePinnedChart(chartId, { config });
    setPinnedCharts(chartFavoritesService.getPinnedCharts());
    setHasUnsavedChanges(true);
  };
  
  const handleSizeChange = (chartId: string, size: PinnedChart['size']) => {
    chartFavoritesService.updatePinnedChart(chartId, { size });
    setPinnedCharts(chartFavoritesService.getPinnedCharts());
    setHasUnsavedChanges(true);
  };
  
  // Save current dashboard as a report
  const handleSaveReport = (name: string, nameEn: string, description?: string) => {
    const charts = pinnedCharts.map((p, index) => ({
      id: p.chartId,
      chartConfig: p.config,
      position: { row: Math.floor(index / 3), col: index % 3 },
      size: { width: p.size === 'full' ? 3 : p.size === 'large' ? 3 : p.size === 'medium' ? 2 : 1, height: 1 },
      showTitle: true,
      showLegend: true,
    }));
    
    if (currentReportId) {
      // Update existing report
      reportManagementService.updateReport(currentReportId, {
        name,
        nameEn,
        description,
        descriptionEn: description,
        charts,
      });
      showToast(isEn ? 'Report updated!' : 'Rapport mis à jour !');
    } else {
      // Create new report
      const newReport = reportManagementService.saveReport({
        name,
        nameEn,
        description,
        descriptionEn: description,
        type: 'custom',
        charts,
        filters: {
          dateRange: { start: '', end: '', preset: '6M' },
        },
        layout: {
          columns: 3,
          pageSize: 'A4',
          orientation: 'landscape',
          margins: { top: 20, right: 20, bottom: 20, left: 20 },
          showHeader: true,
          showFooter: true,
          showPageNumbers: true,
        },
        createdBy: 'current-user',
        isTemplate: false,
        isFavorite: false,
        tags: ['custom'],
      });
      setCurrentReportId(newReport.id);
      showToast(isEn ? 'Report saved!' : 'Rapport enregistré !');
    }
    
    setCurrentReportName(name);
    setHasUnsavedChanges(false);
    setShowSaveModal(false);
    setSavedReports(reportManagementService.getAllReports());
  };
  
  // Load a saved report
  const handleLoadReport = (report: SavedReport) => {
    // Clear current charts
    pinnedCharts.forEach(p => chartFavoritesService.unpinChart(p.chartId));
    
    // Add charts from report
    report.charts.forEach((chart) => {
      chartFavoritesService.pinChart(chart.chartConfig, 
        chart.size.width >= 3 ? 'full' : chart.size.width >= 2 ? 'medium' : 'small'
      );
    });
    
    setPinnedCharts(chartFavoritesService.getPinnedCharts());
    setCurrentReportId(report.id);
    setCurrentReportName(isEn ? report.nameEn : report.name);
    setHasUnsavedChanges(false);
    setShowLoadModal(false);
    showToast(isEn ? `Loaded: ${report.nameEn}` : `Chargé : ${report.name}`);
  };
  
  // Clear all charts (new dashboard)
  const handleNewDashboard = () => {
    pinnedCharts.forEach(p => chartFavoritesService.unpinChart(p.chartId));
    setPinnedCharts([]);
    setCurrentReportId(null);
    setCurrentReportName('');
    setHasUnsavedChanges(false);
  };
  
  // Delete current report
  const handleDeleteReport = () => {
    if (currentReportId) {
      reportManagementService.deleteReport(currentReportId);
      setSavedReports(reportManagementService.getAllReports());
      setCurrentReportId(null);
      setCurrentReportName('');
      showToast(isEn ? 'Report deleted' : 'Rapport supprimé');
    }
  };
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };
  
  // Drag and drop handlers
  const handleDragStart = (chartId: string) => {
    setDraggedChartId(chartId);
  };
  
  const handleDragOver = (e: React.DragEvent, chartId: string) => {
    e.preventDefault();
    if (chartId !== draggedChartId) {
      setDragOverChartId(chartId);
    }
  };
  
  const handleDragLeave = () => {
    setDragOverChartId(null);
  };
  
  const handleDrop = (targetChartId: string) => {
    if (!draggedChartId || draggedChartId === targetChartId) {
      setDraggedChartId(null);
      setDragOverChartId(null);
      return;
    }
    
    // Get current order
    const currentOrder = [...pinnedCharts].sort((a, b) => a.position - b.position);
    const draggedIndex = currentOrder.findIndex(p => p.chartId === draggedChartId);
    const targetIndex = currentOrder.findIndex(p => p.chartId === targetChartId);
    
    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedChartId(null);
      setDragOverChartId(null);
      return;
    }
    
    // Reorder
    const [removed] = currentOrder.splice(draggedIndex, 1);
    currentOrder.splice(targetIndex, 0, removed);
    
    // Update positions
    const newChartIds = currentOrder.map(p => p.chartId);
    chartFavoritesService.reorderPinnedCharts(newChartIds);
    setPinnedCharts(chartFavoritesService.getPinnedCharts());
    setHasUnsavedChanges(true);
    
    setDraggedChartId(null);
    setDragOverChartId(null);
  };
  
  const handleDragEnd = () => {
    setDraggedChartId(null);
    setDragOverChartId(null);
  };
  
  // Suggestion drag handlers
  const handleSuggestionDragStart = (chartId: string) => {
    setDraggedSuggestionId(chartId);
  };
  
  const handleSuggestionDragOver = (e: React.DragEvent, chartId: string) => {
    e.preventDefault();
    if (chartId !== draggedSuggestionId) {
      setDragOverSuggestionId(chartId);
    }
  };
  
  const handleSuggestionDragLeave = () => {
    setDragOverSuggestionId(null);
  };
  
  const handleSuggestionDrop = (targetChartId: string) => {
    if (!draggedSuggestionId || draggedSuggestionId === targetChartId) {
      setDraggedSuggestionId(null);
      setDragOverSuggestionId(null);
      return;
    }
    
    // Get current order (use suggestionOrder or default from orderedSuggestions)
    const currentOrder = suggestionOrder.length > 0 
      ? [...suggestionOrder]
      : orderedSuggestions.map(c => c.id);
    
    const draggedIndex = currentOrder.indexOf(draggedSuggestionId);
    const targetIndex = currentOrder.indexOf(targetChartId);
    
    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedSuggestionId(null);
      setDragOverSuggestionId(null);
      return;
    }
    
    // Reorder
    const [removed] = currentOrder.splice(draggedIndex, 1);
    currentOrder.splice(targetIndex, 0, removed);
    
    setSuggestionOrder(currentOrder);
    setDraggedSuggestionId(null);
    setDragOverSuggestionId(null);
  };
  
  const handleSuggestionDragEnd = () => {
    setDraggedSuggestionId(null);
    setDragOverSuggestionId(null);
  };
  
  // Suggested charts based on what's not pinned
  const unpinnedCharts = PRESET_CHARTS.filter(
    chart => !pinnedCharts.some(p => p.chartId === chart.id)
  );
  
  // Apply custom order if available
  const orderedSuggestions = suggestionOrder.length > 0
    ? suggestionOrder
        .map(id => unpinnedCharts.find(c => c.id === id))
        .filter(Boolean)
        .concat(unpinnedCharts.filter(c => !suggestionOrder.includes(c.id)))
    : unpinnedCharts;
  
  const suggestedCharts = (orderedSuggestions as typeof unpinnedCharts).slice(0, 4);
  
  const getSizeClass = (size: PinnedChart['size']) => {
    switch (size) {
      case 'small': return 'col-span-1';
      case 'medium': return 'col-span-1 lg:col-span-2';
      case 'large': return 'col-span-1 lg:col-span-2 xl:col-span-3';
      case 'full': return 'col-span-full';
      default: return 'col-span-1 lg:col-span-2';
    }
  };
  
  const handleUpgradeClick = () => {
    window.open(CALENDLY_URL, '_blank');
  };

  // Show premium gate if user doesn't have access
  if (!hasAccess) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 
              className="text-xl sm:text-2xl font-bold flex items-center gap-2 flex-wrap" 
              style={{ color: 'rgb(var(--color-text))' }}
            >
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" style={{ color: 'rgb(var(--color-primary-600))' }} />
              <span className="whitespace-nowrap">
                {isEn ? 'Visualizations' : 'Visualisations'}
              </span>
              <span 
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-full uppercase tracking-wide"
                style={{ 
                  background: 'linear-gradient(135deg, rgb(var(--color-accent-500)) 0%, rgb(var(--color-accent-600)) 100%)',
                  color: 'white',
                }}
              >
                <Crown className="w-3 h-3" />
                PRO
              </span>
            </h1>
            <p 
              className="mt-1 text-sm line-clamp-2 sm:line-clamp-none" 
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {isEn 
                ? 'Explore your finances in depth with interactive charts, personalized KPIs and sector comparisons. Understand your performance at a glance.'
                : 'Explorez vos finances en profondeur avec graphiques interactifs, KPIs personnalisés et comparaisons sectorielles. Comprenez votre performance en un coup d\'œil.'}
            </p>
          </div>
        </div>

        {/* Premium Upgrade Banner */}
        <PremiumUpgradeBanner feature="advancedAnalytics" />
        
        {/* Value Proposition Card */}
        <div 
          className="relative rounded-2xl p-6 sm:p-8 overflow-hidden"
          style={{
            backgroundColor: 'rgb(var(--color-surface))',
            border: '1px solid rgb(var(--color-border))',
          }}
        >
          {/* Gold accent stripe at top */}
          <div 
            className="absolute top-0 left-0 right-0 h-1"
            style={{ 
              background: 'linear-gradient(90deg, rgb(var(--color-accent-500)) 0%, rgb(var(--color-accent-400)) 50%, rgb(var(--color-accent-500)) 100%)',
            }}
          />
          
          {/* Background decoration */}
          <div 
            className="absolute -right-12 -top-12 w-64 h-64 opacity-[0.03] pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgb(var(--color-accent-500)) 0%, transparent 70%)',
            }}
          />
          
          <div className="relative flex flex-col lg:flex-row items-start gap-6">
            {/* Left: Value Props */}
            <div className="flex-1">
              <div className="flex items-center gap-2.5 mb-3">
                <div 
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ 
                    background: 'linear-gradient(135deg, rgb(var(--color-accent-500)) 0%, rgb(var(--color-accent-600)) 100%)',
                    boxShadow: '0 2px 8px rgb(var(--color-accent-500) / 0.25)',
                  }}
                >
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                    {isEn 
                      ? 'Unlock Advanced Analytics' 
                      : 'Débloquez l\'analytique avancée'}
                  </h2>
                  <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn ? 'Build custom dashboards tailored to your needs' : 'Créez des tableaux de bord personnalisés adaptés à vos besoins'}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                {[
                  { en: 'Interactive charts', fr: 'Graphiques interactifs' },
                  { en: 'Custom KPIs', fr: 'KPIs personnalisés' },
                  { en: 'Industry benchmarks', fr: 'Benchmarks sectoriels' },
                  { en: 'Drag-and-drop layout', fr: 'Mise en page glisser-déposer' },
                ].map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center gap-1.5 text-xs"
                    style={{ color: 'rgb(var(--color-text-secondary))' }}
                  >
                    <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgb(var(--color-primary-500))' }} />
                    {isEn ? item.en : item.fr}
                  </div>
                ))}
              </div>
              
              <button
                onClick={handleUpgradeClick}
                className="group inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium text-white text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                style={{ 
                  background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)',
                  boxShadow: '0 2px 8px rgb(var(--color-primary-500) / 0.3)',
                }}
              >
                <Calendar className="w-3.5 h-3.5" />
                {isEn ? 'Schedule Demo' : 'Planifier une démo'}
                <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
            
            {/* Right: Chart Preview Grid */}
            <div 
              className="lg:w-64 w-full rounded-xl p-4"
              style={{ 
                backgroundColor: 'rgb(var(--color-surface))',
                border: '1px solid rgb(var(--color-border))',
              }}
            >
              <div className="flex items-center gap-1.5 mb-3">
                <Sparkles className="w-3 h-3" style={{ color: 'rgb(var(--color-primary-500))' }} />
                <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? 'Example Charts' : 'Exemples de graphiques'}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: BarChart3, name: isEn ? 'Revenue' : 'Revenus' },
                  { icon: PieChart, name: isEn ? 'Expenses' : 'Dépenses' },
                  { icon: LineChart, name: isEn ? 'Trends' : 'Tendances' },
                  { icon: TrendingUp, name: isEn ? 'Growth' : 'Croissance' },
                ].map((chart, idx) => (
                  <div 
                    key={idx}
                    className="relative rounded-lg p-3 overflow-hidden"
                    style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div 
                        className="w-8 h-8 rounded flex items-center justify-center opacity-30"
                        style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
                      >
                        <chart.icon className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
                      </div>
                      <div 
                        className="w-full h-2 rounded"
                        style={{ backgroundColor: 'rgb(var(--color-border))' }}
                      />
                      <div 
                        className="w-full h-1 rounded"
                        style={{ backgroundColor: 'rgb(var(--color-border))' }}
                      />
                    </div>
                    <span className="text-[10px] text-center mt-1 block opacity-50" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {chart.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* What You Can Build Section */}
        <div 
          className="rounded-xl p-4 border"
          style={{
            backgroundColor: 'rgb(var(--color-surface))',
            borderColor: 'rgb(var(--color-border))',
          }}
        >
          <div className="flex items-start gap-3">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
            >
              <Sparkles className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-600))' }} />
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-1" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn 
                  ? 'What You Can Build' 
                  : 'Ce que vous pouvez créer'}
              </h3>
              <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn 
                  ? 'Create custom dashboards with revenue trends, expense breakdowns, cash flow analysis, and more. Pin your favorite charts and arrange them exactly how you need.'
                  : 'Créez des tableaux de bord personnalisés avec tendances de revenus, répartition des dépenses, analyse de trésorerie et plus encore. Épinglez vos graphiques préférés et organisez-les comme vous le souhaitez.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Toast - Enhanced */}
      {showSuccessToast && (
        <div 
          className="fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl animate-in slide-in-from-top-2 duration-300"
          style={{ 
            backgroundColor: 'rgb(var(--color-success))',
            color: 'white',
            boxShadow: '0 10px 40px -10px rgb(var(--color-success) / 0.5)',
          }}
        >
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <Check className="w-5 h-5" />
          </div>
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}
      
      {/* Enhanced Header Card - Mobile-first responsive */}
      <div 
        className="relative overflow-hidden rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6"
        style={{ 
          background: 'linear-gradient(135deg, rgb(var(--color-primary-700)) 0%, rgb(var(--color-primary-800)) 100%)',
          boxShadow: '0 10px 40px -10px rgba(30, 64, 175, 0.4)',
        }}
      >
        {/* Background Pattern */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left: Title & Info */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0">
              <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-lg lg:text-xl font-bold text-white truncate">
                {currentReportName || (isEn ? 'Dashboard' : 'Tableau de bord')}
              </h1>
              <p className="text-[10px] sm:text-xs text-white/80 flex items-center gap-1.5 flex-wrap">
                <span>{pinnedCharts.length} {isEn ? (pinnedCharts.length !== 1 ? 'charts' : 'chart') : (pinnedCharts.length !== 1 ? 'graphiques' : 'graphique')}</span>
                {hasUnsavedChanges && (
                  <span className="text-yellow-300 flex items-center gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-300"></span>
                    {isEn ? 'Unsaved' : 'Non enregistré'}
                  </span>
                )}
              </p>
            </div>
          </div>
          
          {/* Right: Actions - Responsive button group */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
            <button
              onClick={handleNewDashboard}
              className="p-2 sm:px-3 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all bg-white/10 hover:bg-white/20 active:scale-95 text-white backdrop-blur flex items-center gap-1.5"
              title={isEn ? 'New dashboard' : 'Nouveau tableau'}
            >
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{isEn ? 'New' : 'Nouveau'}</span>
            </button>
            <button
              onClick={() => setShowLoadModal(true)}
              className="p-2 sm:px-3 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all bg-white/10 hover:bg-white/20 active:scale-95 text-white backdrop-blur flex items-center gap-1.5"
              title={isEn ? 'Open saved report' : 'Ouvrir un rapport'}
            >
              <FolderOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{isEn ? 'Open' : 'Ouvrir'}</span>
            </button>
            <button
              onClick={() => setShowSaveModal(true)}
              className="p-2 sm:px-3 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all bg-white hover:bg-white/90 active:scale-95 flex items-center gap-1.5"
              style={{ color: 'rgb(var(--color-primary-600))' }}
              title={isEn ? 'Save dashboard' : 'Enregistrer'}
            >
              <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{isEn ? 'Save' : 'Enregistrer'}</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Tab Navigation - Mobile-first responsive */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        {/* Tab switcher */}
        <div 
          className="flex items-center gap-0.5 sm:gap-1 p-1 sm:p-1.5 rounded-lg sm:rounded-xl w-full sm:w-fit overflow-x-auto"
          style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
        >
          <button
            onClick={() => setActiveTab('dashboard')}
            className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-md sm:rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap"
            style={{
              backgroundColor: activeTab === 'dashboard' ? 'rgb(var(--color-surface))' : 'transparent',
              color: activeTab === 'dashboard' ? 'rgb(var(--color-text))' : 'rgb(var(--color-text-muted))',
              boxShadow: activeTab === 'dashboard' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {isEn ? 'Dashboard' : 'Tableau de bord'}
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-md sm:rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 whitespace-nowrap"
            style={{
              backgroundColor: activeTab === 'reports' ? 'rgb(var(--color-surface))' : 'transparent',
              color: activeTab === 'reports' ? 'rgb(var(--color-text))' : 'rgb(var(--color-text-muted))',
              boxShadow: activeTab === 'reports' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {isEn ? 'Reports' : 'Rapports'}
            {savedReports.length > 0 && (
              <span 
                className="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold"
                style={{ 
                  backgroundColor: 'rgb(var(--color-primary-500))',
                  color: 'white',
                }}
              >
                {savedReports.length}
              </span>
            )}
          </button>
        </div>
        
        {/* Quick Actions - Two rows on mobile */}
        <div className="flex items-center justify-between sm:justify-end gap-1 sm:gap-1.5 flex-wrap">
          {/* Left group - utilities */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Search - hidden on mobile */}
            <div 
              className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
            >
              <Search className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isEn ? 'Search...' : 'Rechercher...'}
                className="bg-transparent border-none outline-none text-sm w-28"
                style={{ color: 'rgb(var(--color-text))' }}
              />
            </div>
            
            {/* View toggle */}
            <div 
              className="flex rounded-lg overflow-hidden"
              style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
            >
              <button
                onClick={() => setViewMode('grid')}
                className="p-2 transition-colors"
                style={{
                  backgroundColor: viewMode === 'grid' ? 'rgb(var(--color-primary-500))' : 'transparent',
                  color: viewMode === 'grid' ? 'white' : 'rgb(var(--color-text-muted))',
                }}
                title={isEn ? 'Grid view' : 'Vue grille'}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className="p-2 transition-colors"
                style={{
                  backgroundColor: viewMode === 'list' ? 'rgb(var(--color-primary-500))' : 'transparent',
                  color: viewMode === 'list' ? 'white' : 'rgb(var(--color-text-muted))',
                }}
                title={isEn ? 'List view' : 'Vue liste'}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            
            {/* Edit mode */}
            <button
              onClick={() => setEditMode(!editMode)}
              className="p-2 rounded-lg transition-all"
              style={{
                backgroundColor: editMode ? 'rgb(var(--color-warning) / 0.15)' : 'rgb(var(--color-bg-muted))',
                color: editMode ? 'rgb(var(--color-warning))' : 'rgb(var(--color-text-muted))',
              }}
              title={isEn ? 'Edit mode' : 'Mode édition'}
            >
              <Settings2 className="w-4 h-4" />
            </button>
            
            {/* Refresh */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg transition-colors hidden sm:flex"
              style={{
                backgroundColor: 'rgb(var(--color-bg-muted))',
                color: 'rgb(var(--color-text-muted))',
              }}
              title={isEn ? 'Refresh' : 'Actualiser'}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          {/* Right group - primary actions */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Build button */}
            <button
              onClick={() => setShowChartBuilder(true)}
              className="p-2 px-2.5 sm:px-3 rounded-lg flex items-center gap-1.5 text-xs sm:text-sm font-semibold transition-all hover:shadow-md active:scale-95"
              style={{
                backgroundColor: 'rgb(var(--color-success))',
                color: 'white',
                boxShadow: '0 2px 10px -2px rgb(var(--color-success) / 0.4)',
              }}
              title={isEn ? 'Build custom chart' : 'Créer un graphique'}
            >
              <Wand2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{isEn ? 'Create' : 'Créer'}</span>
            </button>
            
            {/* Prebuilt button */}
            <button
              onClick={() => setShowGallery(true)}
              className="p-2 px-2.5 sm:px-3 rounded-lg flex items-center gap-1.5 text-xs sm:text-sm font-semibold transition-all hover:shadow-md active:scale-95"
              style={{
                backgroundColor: 'rgb(var(--color-primary-500))',
                color: 'white',
                boxShadow: '0 2px 10px -2px rgb(var(--color-primary-500) / 0.4)',
              }}
              title={isEn ? 'Add prebuilt chart' : 'Ajouter un graphique prédéfini'}
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{isEn ? 'Prebuilt' : 'Prédéfini'}</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <ReportManager 
          onOpenReport={handleLoadReport}
        />
      )}
      
      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <>
      {/* Enhanced Empty State - Mobile-first */}
      {pinnedCharts.length === 0 && (
        <div 
          className="relative overflow-hidden rounded-xl sm:rounded-2xl p-6 sm:p-8 lg:p-12 text-center"
          style={{ 
            background: 'linear-gradient(135deg, rgb(var(--color-bg-muted)) 0%, rgb(var(--color-surface)) 100%)',
            border: '2px dashed rgb(var(--color-border))',
          }}
        >
          {/* Decorative Elements - Hidden on mobile for cleaner look */}
          <div className="hidden sm:block absolute top-4 left-4 w-20 h-20 rounded-full opacity-20" 
            style={{ background: 'radial-gradient(circle, rgb(var(--color-primary-500)) 0%, transparent 70%)' }} 
          />
          <div className="hidden sm:block absolute bottom-4 right-4 w-32 h-32 rounded-full opacity-10" 
            style={{ background: 'radial-gradient(circle, rgb(var(--color-primary-500)) 0%, transparent 70%)' }} 
          />
          
          <div className="relative">
            {/* Animated Icon */}
            <div 
              className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 mx-auto mb-4 sm:mb-6 rounded-xl sm:rounded-2xl flex items-center justify-center animate-pulse"
              style={{ 
                backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
                boxShadow: '0 10px 40px -10px rgb(var(--color-primary-500) / 0.3)',
              }}
            >
              <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10" style={{ color: 'rgb(var(--color-primary-500))' }} />
            </div>
            
            <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2 sm:mb-3" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Create Your Perfect Dashboard' : 'Créez votre tableau de bord idéal'}
            </h3>
            <p className="text-xs sm:text-sm lg:text-base mb-5 sm:mb-8 max-w-lg mx-auto leading-relaxed px-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn 
                ? 'Pin your favorite charts, customize layouts, and build the exact view you need for financial insights.'
                : 'Épinglez vos graphiques préférés, personnalisez la mise en page et créez la vue exacte dont vous avez besoin.'}
            </p>
            
            {/* Action buttons - Stack on mobile, row on desktop */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <button
                onClick={() => setShowChartBuilder(true)}
                className="w-full sm:w-auto px-5 sm:px-6 lg:px-8 py-3 sm:py-3.5 lg:py-4 rounded-lg sm:rounded-xl flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base font-semibold transition-all hover:scale-[1.02] active:scale-95"
                style={{
                  backgroundColor: 'rgb(var(--color-success))',
                  color: 'white',
                  boxShadow: '0 8px 30px -8px rgb(var(--color-success) / 0.5)',
                }}
              >
                <Wand2 className="w-4 h-4 sm:w-5 sm:h-5" />
                {isEn ? 'Create Custom Chart' : 'Créer un graphique'}
              </button>
              <span className="text-xs sm:text-sm hidden sm:block" style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'or' : 'ou'}</span>
              <button
                onClick={() => setShowGallery(true)}
                className="w-full sm:w-auto px-5 sm:px-6 lg:px-8 py-3 sm:py-3.5 lg:py-4 rounded-lg sm:rounded-xl flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base font-semibold transition-all hover:scale-[1.02] active:scale-95"
                style={{
                  backgroundColor: 'rgb(var(--color-primary-500))',
                  color: 'white',
                  boxShadow: '0 8px 30px -8px rgb(var(--color-primary-500) / 0.5)',
                }}
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                {isEn ? 'Browse Gallery' : 'Parcourir la galerie'}
              </button>
            </div>
            
            {/* Quick Add Suggestions - Responsive grid */}
            <div className="mt-6 sm:mt-8 lg:mt-10 pt-5 sm:pt-6 lg:pt-8 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
              <p className="text-xs sm:text-sm font-semibold mb-3 sm:mb-4 lg:mb-5" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? '⚡ Quick add popular charts' : '⚡ Ajout rapide de graphiques populaires'}
              </p>
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:justify-center gap-2 sm:gap-3">
                {suggestedCharts.map((chart) => {
                  const Icon = ChartTypeIcon[chart.chartType];
                  return (
                    <button
                      key={chart.id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handlePinChart(chart);
                      }}
                      draggable
                      onDragStart={() => handleSuggestionDragStart(chart.id)}
                      onDragOver={(e) => handleSuggestionDragOver(e, chart.id)}
                      onDragLeave={handleSuggestionDragLeave}
                      onDrop={() => handleSuggestionDrop(chart.id)}
                      onDragEnd={handleSuggestionDragEnd}
                      className={`group px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm flex items-center gap-2 sm:gap-3 transition-all hover:scale-[1.02] hover:shadow-md active:scale-95 cursor-grab active:cursor-grabbing ${
                        draggedSuggestionId === chart.id ? 'opacity-50 scale-95' : ''
                      } ${
                        dragOverSuggestionId === chart.id ? 'ring-2 ring-primary-500 scale-105' : ''
                      }`}
                      style={{
                        backgroundColor: 'rgb(var(--color-surface))',
                        color: 'rgb(var(--color-text))',
                        border: '1px solid rgb(var(--color-border))',
                      }}
                    >
                      <div
                        className="p-1.5 sm:p-2 rounded-md sm:rounded-lg flex-shrink-0"
                        style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
                      >
                        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
                      </div>
                      <LabelTooltip label={isEn ? chart.nameEn : chart.name}>
                        <span className="font-medium text-sm leading-tight line-clamp-2">
                          {isEn ? chart.nameEn : chart.name}
                        </span>
                      </LabelTooltip>
                      <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block flex-shrink-0" 
                        style={{ color: 'rgb(var(--color-primary-500))' }} 
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Pinned Charts Grid */}
      {pinnedCharts.length > 0 && (
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4'
          : 'space-y-3 sm:space-y-4'
        }>
          {pinnedCharts
            .filter(p => {
              if (!searchQuery) return true;
              const config = p.config;
              const name = isEn ? config.nameEn : config.name;
              return name.toLowerCase().includes(searchQuery.toLowerCase());
            })
            .sort((a, b) => a.position - b.position)
            .map((pinned) => (
              <div 
                key={pinned.chartId}
                className={`${viewMode === 'grid' ? getSizeClass(pinned.size) : ''} ${
                  draggedChartId === pinned.chartId ? 'opacity-50' : ''
                } ${
                  dragOverChartId === pinned.chartId ? 'ring-2 ring-primary-500 ring-offset-2 rounded-xl' : ''
                } transition-all`}
                draggable={editMode}
                onDragStart={() => handleDragStart(pinned.chartId)}
                onDragOver={(e) => handleDragOver(e, pinned.chartId)}
                onDragLeave={handleDragLeave}
                onDrop={() => handleDrop(pinned.chartId)}
                onDragEnd={handleDragEnd}
              >
                {editMode && (
                  <div 
                    className="flex items-center justify-between mb-2 px-2 cursor-grab active:cursor-grabbing"
                    style={{ color: 'rgb(var(--color-text-muted))' }}
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4" />
                      <span className="text-xs">
                        {isEn ? 'Drag to reorder' : 'Glisser pour réorganiser'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Edit & Duplicate buttons */}
                      <button
                        onClick={() => handleEditChart(pinned.chartId)}
                        className="p-1.5 rounded hover:bg-primary-500/10 transition-colors relative"
                        style={{ color: 'rgb(var(--color-primary-500))' }}
                        onMouseEnter={(e) => {
                          setHoveredElement(`edit-${pinned.chartId}`);
                          setTooltipPosition({ x: e.clientX, y: e.clientY });
                        }}
                        onMouseLeave={() => setHoveredElement(null)}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        {hoveredElement === `edit-${pinned.chartId}` && (
                          <ChartTooltip visible={true} position={tooltipPosition}>
                            <div>
                              <p className="text-white text-xs font-medium">{isEn ? 'Edit Chart' : 'Modifier'}</p>
                            </div>
                          </ChartTooltip>
                        )}
                      </button>
                      <button
                        onClick={() => handleDuplicateChart(pinned.chartId)}
                        className="p-1.5 rounded hover:bg-primary-500/10 transition-colors relative"
                        style={{ color: 'rgb(var(--color-text-muted))' }}
                        onMouseEnter={(e) => {
                          setHoveredElement(`dup-${pinned.chartId}`);
                          setTooltipPosition({ x: e.clientX, y: e.clientY });
                        }}
                        onMouseLeave={() => setHoveredElement(null)}
                      >
                        <Copy className="w-3.5 h-3.5" />
                        {hoveredElement === `dup-${pinned.chartId}` && (
                          <ChartTooltip visible={true} position={tooltipPosition}>
                            <div>
                              <p className="text-white text-xs font-medium">{isEn ? 'Duplicate' : 'Dupliquer'}</p>
                            </div>
                          </ChartTooltip>
                        )}
                      </button>
                      <div className="w-px h-4 mx-1" style={{ backgroundColor: 'rgb(var(--color-border))' }} />
                      {(['small', 'medium', 'large', 'full'] as const).map((size) => (
                        <button
                          key={size}
                          onClick={() => handleSizeChange(pinned.chartId, size)}
                          className={`px-2 py-1 rounded text-xs ${
                            pinned.size === size ? 'bg-primary-500 text-white' : ''
                          }`}
                          style={pinned.size !== size ? {
                            backgroundColor: 'rgb(var(--color-bg-muted))',
                          } : {}}
                        >
                          {size === 'small' ? 'S' : size === 'medium' ? 'M' : size === 'large' ? 'L' : 'XL'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <DataVisualizationCard
                  config={pinned.config}
                  isPinned={true}
                  onUnpin={() => handleUnpinChart(pinned.chartId)}
                  onConfigChange={(config) => handleConfigChange(pinned.chartId, config)}
                  size={viewMode === 'list' ? 'medium' : pinned.size}
                  showControls={true}
                />
              </div>
            ))}
        </div>
      )}
      
      {/* Suggested Charts */}
      {pinnedCharts.length > 0 && pinnedCharts.length < 6 && (
        <div 
          className="card p-6"
          style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.03)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Suggested Charts' : 'Graphiques suggérés'}
              </h3>
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn 
                  ? 'Based on your data, you might find these useful'
                  : 'Basé sur vos données, vous pourriez trouver ceux-ci utiles'}
              </p>
            </div>
            <button
              onClick={() => setShowGallery(true)}
              className="text-sm font-medium"
              style={{ color: 'rgb(var(--color-primary-500))' }}
            >
              {isEn ? 'View all' : 'Voir tout'}
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {suggestedCharts.map((chart) => {
              const Icon = ChartTypeIcon[chart.chartType];
              const chartTypeInfo = CHART_TYPE_INFO[chart.chartType];
              return (
                <button
                  key={chart.id}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // Clear any pending tooltip
                    if (tooltipTimeout) {
                      clearTimeout(tooltipTimeout);
                      setTooltipTimeout(null);
                    }
                    setHoveredElement(null);
                    handlePinChart(chart);
                  }}
                  draggable
                  onDragStart={() => {
                    handleSuggestionMouseLeave();
                    handleSuggestionDragStart(chart.id);
                  }}
                  onDragOver={(e) => handleSuggestionDragOver(e, chart.id)}
                  onDragLeave={handleSuggestionDragLeave}
                  onDrop={() => handleSuggestionDrop(chart.id)}
                  onDragEnd={handleSuggestionDragEnd}
                  onMouseEnter={(e) => handleSuggestionMouseEnter(chart.id, e)}
                  onMouseLeave={handleSuggestionMouseLeave}
                  className={`p-4 rounded-xl text-left transition-all hover:shadow-md cursor-grab active:cursor-grabbing relative ${
                    draggedSuggestionId === chart.id ? 'opacity-50 scale-95' : ''
                  } ${
                    dragOverSuggestionId === chart.id ? 'ring-2 ring-primary-500 scale-105' : ''
                  }`}
                  style={{
                    backgroundColor: 'rgb(var(--color-surface))',
                    border: '1px solid rgb(var(--color-border))',
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="p-1.5 rounded-lg"
                      style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
                    >
                      <Icon className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
                    </div>
                    <h4 className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                      {isEn ? chart.nameEn : chart.name}
                    </h4>
                  </div>
                  <p className="text-xs line-clamp-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn ? chart.descriptionEn : chart.description}
                  </p>
                  <div className="mt-2 flex items-center gap-1">
                    <Plus className="w-3 h-3" style={{ color: 'rgb(var(--color-primary-500))' }} />
                    <span className="text-xs font-medium" style={{ color: 'rgb(var(--color-primary-500))' }}>
                      {isEn ? 'Add to dashboard' : 'Ajouter'}
                    </span>
                  </div>
                  
                  {hoveredElement === `suggest-${chart.id}` && (
                    <ChartTooltip visible={true} position={tooltipPosition}>
                      <div className="min-w-[240px]">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{chartTypeInfo.icon}</span>
                          <span className="text-white font-medium">{isEn ? chart.nameEn : chart.name}</span>
                        </div>
                        <p className="text-gray-400 text-xs mb-3">
                          {isEn ? chart.descriptionEn : chart.description}
                        </p>
                        <div className="space-y-1 text-xs border-t border-gray-700 pt-2">
                          <div className="flex justify-between">
                            <span className="text-gray-500">{isEn ? 'Chart Type' : 'Type'}</span>
                            <span className="text-gray-300">{isEn ? chartTypeInfo.labelEn : chartTypeInfo.label}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">{isEn ? 'Metrics' : 'Métriques'}</span>
                            <span className="text-gray-300">{chart.metrics.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">{isEn ? 'Time Range' : 'Période'}</span>
                            <span className="text-gray-300">{chart.timeRange}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-gray-700">
                          {chart.metrics.slice(0, 3).map((metric) => (
                            <span key={metric} className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-300">
                              {isEn ? METRIC_INFO[metric].labelEn : METRIC_INFO[metric].label}
                            </span>
                          ))}
                          {chart.metrics.length > 3 && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">
                              +{chart.metrics.length - 3}
                            </span>
                          )}
                        </div>
                        <div className="mt-3 pt-2 border-t border-gray-700 text-xs text-blue-400 flex items-center gap-1">
                          <Plus className="w-3 h-3" />
                          {isEn ? 'Click to add • Drag to reorder' : 'Cliquer pour ajouter • Glisser pour réordonner'}
                        </div>
                      </div>
                    </ChartTooltip>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Chart Gallery Modal */}
      {showGallery && (
        <div 
          className="fixed inset-0 flex items-start justify-center p-4 pt-20 overflow-y-auto"
          style={{ zIndex: 9999 }}
        >
          <div 
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
            onClick={() => setShowGallery(false)}
          />
          
          <div 
            className="relative w-full max-w-4xl rounded-2xl overflow-hidden"
            style={{ 
              backgroundColor: 'rgb(var(--color-surface))',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div 
              className="sticky top-0 p-6 border-b flex items-center justify-between"
              style={{ 
                borderColor: 'rgb(var(--color-border))',
                backgroundColor: 'rgb(var(--color-surface))',
              }}
            >
              <div>
                <h2 className="text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? 'Chart Gallery' : 'Galerie de graphiques'}
                </h2>
                <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn 
                    ? 'Choose a chart to add to your dashboard'
                    : 'Choisissez un graphique à ajouter à votre tableau de bord'}
                </p>
              </div>
              <button
                onClick={() => setShowGallery(false)}
                className="p-2 rounded-lg transition-colors"
                style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
              >
                <X className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
              </button>
            </div>
            
            <div className="p-6">
              <ChartGallery onSelectChart={handlePinChart} />
            </div>
          </div>
        </div>
      )}
      
      {/* Save Report Modal */}
      <SaveReportModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveReport}
        mode={currentReportId ? 'save' : 'create'}
        initialName={currentReportName}
        initialNameEn={currentReportName}
      />
      
      {/* Load Report Modal */}
      {showLoadModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div 
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowLoadModal(false)}
          />
          
          <div 
            className="relative w-full max-w-2xl rounded-2xl overflow-hidden"
            style={{ 
              backgroundColor: 'rgb(var(--color-surface))',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div 
              className="p-6 border-b flex items-center justify-between"
              style={{ borderColor: 'rgb(var(--color-border))' }}
            >
              <div>
                <h2 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? 'Open Report' : 'Ouvrir un rapport'}
                </h2>
                <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? 'Select a saved report to load' : 'Sélectionnez un rapport à charger'}
                </p>
              </div>
              <button
                onClick={() => setShowLoadModal(false)}
                className="p-2 rounded-lg transition-colors hover:bg-muted"
              >
                <X className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
              </button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {savedReports.length > 0 ? (
                <div className="space-y-2">
                  {savedReports.map((report) => (
                    <button
                      key={report.id}
                      onClick={() => handleLoadReport(report)}
                      className="w-full p-4 rounded-xl text-left transition-all hover:shadow-md flex items-center gap-4 relative"
                      style={{
                        backgroundColor: 'rgb(var(--color-bg))',
                        border: '1px solid rgb(var(--color-border))',
                      }}
                      onMouseEnter={(e) => {
                        setHoveredElement(`report-${report.id}`);
                        setTooltipPosition({ x: e.clientX, y: e.clientY });
                      }}
                      onMouseLeave={() => setHoveredElement(null)}
                    >
                      <div 
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
                      >
                        <FileText className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <LabelTooltip label={isEn ? report.nameEn : report.name}>
                            <h3 
                              className="font-medium leading-tight line-clamp-2" 
                              style={{ color: 'rgb(var(--color-text))' }}
                            >
                              {isEn ? report.nameEn : report.name}
                            </h3>
                          </LabelTooltip>
                          {report.isFavorite && (
                            <Star className="w-4 h-4 flex-shrink-0 fill-warning text-warning" />
                          )}
                        </div>
                        <p 
                          className="text-sm leading-tight line-clamp-1" 
                          style={{ color: 'rgb(var(--color-text-muted))' }}
                        >
                          {report.charts.length} {isEn ? 'charts' : 'graphiques'} • {new Date(report.updatedAt).toLocaleDateString(isEn ? 'en-CA' : 'fr-CA')}
                        </p>
                      </div>
                      
                      {hoveredElement === `report-${report.id}` && (
                        <ChartTooltip visible={true} position={tooltipPosition}>
                          <div className="min-w-[220px]">
                            <p className="text-white font-medium mb-2">{isEn ? report.nameEn : report.name}</p>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span className="text-gray-400">{isEn ? 'Charts' : 'Graphiques'}</span>
                                <span className="text-gray-300">{report.charts.length}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">{isEn ? 'Type' : 'Type'}</span>
                                <span className="text-gray-300 capitalize">{report.type}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">{isEn ? 'Updated' : 'Mis à jour'}</span>
                                <span className="text-gray-300">{new Date(report.updatedAt).toLocaleDateString(isEn ? 'en-CA' : 'fr-CA')}</span>
                              </div>
                            </div>
                            <div className="mt-2 pt-2 border-t border-gray-700 text-xs text-blue-400">
                              {isEn ? 'Click to load this report' : 'Cliquez pour charger'}
                            </div>
                          </div>
                        </ChartTooltip>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: 'rgb(var(--color-text-muted))' }} />
                  <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn ? 'No saved reports yet' : 'Aucun rapport enregistré'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Chart Builder Modal */}
      <ChartBuilder
        isOpen={showChartBuilder}
        onClose={() => {
          setShowChartBuilder(false);
          setEditingChart(null);
        }}
        onSave={handleCreateCustomChart}
        initialConfig={editingChart || undefined}
        mode={editingChart ? 'edit' : 'create'}
      />
        </>
      )}
    </div>
  );
}
