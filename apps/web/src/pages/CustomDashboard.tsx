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
  Filter,
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
  MoreHorizontal,
  Check,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { useFinancialData } from '../hooks/useFinancialData';
import { InfoTooltip } from '../components/Tooltip';
import {
  DataVisualizationCard,
  ChartGallery,
  ChartTypeSelector,
  TimeRangeSelector,
} from '../components/DataVisualization';
import {
  chartFavoritesService,
  ChartConfig,
  PinnedChart,
  PRESET_CHARTS,
  CHART_TYPE_INFO,
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

export default function CustomDashboard() {
  const { language } = useI18n();
  const isEn = language === 'en';
  const { data: financialData, refresh } = useFinancialData();
  
  const [pinnedCharts, setPinnedCharts] = useState<PinnedChart[]>([]);
  const [showGallery, setShowGallery] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editMode, setEditMode] = useState(false);
  
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
  
  // Load pinned charts and saved reports on mount
  useEffect(() => {
    const pinned = chartFavoritesService.getPinnedCharts();
    setPinnedCharts(pinned);
    setSavedReports(reportManagementService.getAllReports());
  }, []);
  
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
  
  // Suggested charts based on what's not pinned
  const suggestedCharts = PRESET_CHARTS.filter(
    chart => !pinnedCharts.some(p => p.chartId === chart.id)
  ).slice(0, 4);
  
  const getSizeClass = (size: PinnedChart['size']) => {
    switch (size) {
      case 'small': return 'col-span-1';
      case 'medium': return 'col-span-1 lg:col-span-2';
      case 'large': return 'col-span-1 lg:col-span-2 xl:col-span-3';
      case 'full': return 'col-span-full';
      default: return 'col-span-1 lg:col-span-2';
    }
  };
  
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
      
      {/* Enhanced Header Card */}
      <div 
        className="relative overflow-hidden rounded-2xl p-6"
        style={{ 
          background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
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
        
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Title & Info */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                <LayoutGrid className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  {currentReportName || (isEn ? 'Custom Dashboard' : 'Tableau de bord')}
                </h1>
                <p className="text-sm text-white/80">
                  {isEn 
                    ? `${pinnedCharts.length} charts • Last updated just now`
                    : `${pinnedCharts.length} graphiques • Mis à jour à l'instant`}
                </p>
              </div>
            </div>
          </div>
          
          {/* Right: Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {hasUnsavedChanges && (
              <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur">
                {isEn ? '● Unsaved changes' : '● Modifications non enregistrées'}
              </span>
            )}
            <button
              onClick={handleNewDashboard}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all bg-white/10 hover:bg-white/20 text-white backdrop-blur flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">{isEn ? 'New' : 'Nouveau'}</span>
            </button>
            <button
              onClick={() => setShowLoadModal(true)}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all bg-white/10 hover:bg-white/20 text-white backdrop-blur flex items-center gap-2"
            >
              <FolderOpen className="w-4 h-4" />
              <span className="hidden sm:inline">{isEn ? 'Open' : 'Ouvrir'}</span>
            </button>
            <button
              onClick={() => setShowSaveModal(true)}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all bg-white hover:bg-white/90 text-primary-600 flex items-center gap-2"
              style={{ color: 'rgb(var(--color-primary-600))' }}
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">{isEn ? 'Save' : 'Enregistrer'}</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Tab Navigation - Enhanced */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div 
          className="flex items-center gap-1 p-1.5 rounded-xl w-fit"
          style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
        >
          <button
            onClick={() => setActiveTab('dashboard')}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              backgroundColor: activeTab === 'dashboard' ? 'rgb(var(--color-surface))' : 'transparent',
              color: activeTab === 'dashboard' ? 'rgb(var(--color-text))' : 'rgb(var(--color-text-muted))',
              boxShadow: activeTab === 'dashboard' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {isEn ? 'Dashboard' : 'Tableau de bord'}
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
            style={{
              backgroundColor: activeTab === 'reports' ? 'rgb(var(--color-surface))' : 'transparent',
              color: activeTab === 'reports' ? 'rgb(var(--color-text))' : 'rgb(var(--color-text-muted))',
              boxShadow: activeTab === 'reports' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {isEn ? 'Saved Reports' : 'Rapports'}
            {savedReports.length > 0 && (
              <span 
                className="px-2 py-0.5 rounded-full text-xs font-bold"
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
        
        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <div 
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
          >
            <Search className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isEn ? 'Search charts...' : 'Rechercher...'}
              className="bg-transparent border-none outline-none text-sm w-32"
              style={{ color: 'rgb(var(--color-text))' }}
            />
          </div>
          
          <div 
            className="flex rounded-xl overflow-hidden"
            style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
          >
            <button
              onClick={() => setViewMode('grid')}
              className="p-2.5 transition-colors"
              style={{
                backgroundColor: viewMode === 'grid' ? 'rgb(var(--color-primary-500))' : 'transparent',
                color: viewMode === 'grid' ? 'white' : 'rgb(var(--color-text-muted))',
              }}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className="p-2.5 transition-colors"
              style={{
                backgroundColor: viewMode === 'list' ? 'rgb(var(--color-primary-500))' : 'transparent',
                color: viewMode === 'list' ? 'white' : 'rgb(var(--color-text-muted))',
              }}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          
          <button
            onClick={() => setEditMode(!editMode)}
            className={`p-2.5 rounded-xl transition-all ${editMode ? '' : ''}`}
            style={{
              backgroundColor: editMode ? 'rgb(var(--color-warning) / 0.1)' : 'rgb(var(--color-bg-muted))',
              color: editMode ? 'rgb(var(--color-warning))' : 'rgb(var(--color-text-muted))',
            }}
            title={isEn ? 'Edit mode' : 'Mode édition'}
          >
            <Settings2 className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl transition-colors"
            style={{
              backgroundColor: 'rgb(var(--color-bg-muted))',
              color: 'rgb(var(--color-text-muted))',
            }}
            title={isEn ? 'Refresh' : 'Actualiser'}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={() => setShowGallery(true)}
            className="px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold transition-all hover:shadow-lg"
            style={{
              backgroundColor: 'rgb(var(--color-primary-500))',
              color: 'white',
              boxShadow: '0 4px 14px -4px rgb(var(--color-primary-500) / 0.5)',
            }}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{isEn ? 'Add Chart' : 'Ajouter'}</span>
          </button>
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
      {/* Enhanced Empty State */}
      {pinnedCharts.length === 0 && (
        <div 
          className="relative overflow-hidden rounded-2xl p-8 sm:p-12 text-center"
          style={{ 
            background: 'linear-gradient(135deg, rgb(var(--color-bg-muted)) 0%, rgb(var(--color-surface)) 100%)',
            border: '2px dashed rgb(var(--color-border))',
          }}
        >
          {/* Decorative Elements */}
          <div className="absolute top-4 left-4 w-20 h-20 rounded-full opacity-20" 
            style={{ background: 'radial-gradient(circle, rgb(var(--color-primary-500)) 0%, transparent 70%)' }} 
          />
          <div className="absolute bottom-4 right-4 w-32 h-32 rounded-full opacity-10" 
            style={{ background: 'radial-gradient(circle, rgb(var(--color-primary-500)) 0%, transparent 70%)' }} 
          />
          
          <div className="relative">
            {/* Animated Icon */}
            <div 
              className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center animate-pulse"
              style={{ 
                backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
                boxShadow: '0 10px 40px -10px rgb(var(--color-primary-500) / 0.3)',
              }}
            >
              <Sparkles className="w-10 h-10" style={{ color: 'rgb(var(--color-primary-500))' }} />
            </div>
            
            <h3 className="text-xl sm:text-2xl font-bold mb-3" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Create Your Perfect Dashboard' : 'Créez votre tableau de bord idéal'}
            </h3>
            <p className="text-sm sm:text-base mb-8 max-w-lg mx-auto leading-relaxed" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn 
                ? 'Pin your favorite charts, customize layouts, and build the exact view you need for financial insights.'
                : 'Épinglez vos graphiques préférés, personnalisez la mise en page et créez la vue exacte dont vous avez besoin.'}
            </p>
            
            <button
              onClick={() => setShowGallery(true)}
              className="px-8 py-4 rounded-xl flex items-center gap-3 mx-auto text-base font-semibold transition-all hover:scale-105"
              style={{
                backgroundColor: 'rgb(var(--color-primary-500))',
                color: 'white',
                boxShadow: '0 10px 40px -10px rgb(var(--color-primary-500) / 0.5)',
              }}
            >
              <Plus className="w-5 h-5" />
              {isEn ? 'Browse Chart Gallery' : 'Parcourir la galerie'}
            </button>
            
            {/* Quick Add Suggestions */}
            <div className="mt-10 pt-8 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
              <p className="text-sm font-semibold mb-5" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? '⚡ Quick add popular charts' : '⚡ Ajout rapide de graphiques populaires'}
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {suggestedCharts.map((chart) => (
                  <button
                    key={chart.id}
                    onClick={() => handlePinChart(chart)}
                    className="group px-4 py-3 rounded-xl text-sm flex items-center gap-3 transition-all hover:scale-105 hover:shadow-lg"
                    style={{
                      backgroundColor: 'rgb(var(--color-surface))',
                      color: 'rgb(var(--color-text))',
                      border: '1px solid rgb(var(--color-border))',
                    }}
                  >
                    <span className="text-xl">{CHART_TYPE_INFO[chart.chartType].icon}</span>
                    <span className="font-medium">{isEn ? chart.nameEn : chart.name}</span>
                    <Plus className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" 
                      style={{ color: 'rgb(var(--color-primary-500))' }} 
                    />
                  </button>
                ))}
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
                className={viewMode === 'grid' ? getSizeClass(pinned.size) : ''}
              >
                {editMode && (
                  <div 
                    className="flex items-center justify-between mb-2 px-2"
                    style={{ color: 'rgb(var(--color-text-muted))' }}
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 cursor-move" />
                      <span className="text-xs">
                        {isEn ? 'Drag to reorder' : 'Glisser pour réorganiser'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
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
            {suggestedCharts.map((chart) => (
              <button
                key={chart.id}
                onClick={() => handlePinChart(chart)}
                className="p-4 rounded-xl text-left transition-all hover:shadow-md"
                style={{
                  backgroundColor: 'rgb(var(--color-surface))',
                  border: '1px solid rgb(var(--color-border))',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{CHART_TYPE_INFO[chart.chartType].icon}</span>
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
              </button>
            ))}
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
                      className="w-full p-4 rounded-xl text-left transition-all hover:shadow-md flex items-center gap-4"
                      style={{
                        backgroundColor: 'rgb(var(--color-bg))',
                        border: '1px solid rgb(var(--color-border))',
                      }}
                    >
                      <div 
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
                      >
                        <FileText className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium truncate" style={{ color: 'rgb(var(--color-text))' }}>
                            {isEn ? report.nameEn : report.name}
                          </h3>
                          {report.isFavorite && (
                            <Star className="w-4 h-4 flex-shrink-0 fill-warning text-warning" />
                          )}
                        </div>
                        <p className="text-sm truncate" style={{ color: 'rgb(var(--color-text-muted))' }}>
                          {report.charts.length} {isEn ? 'charts' : 'graphiques'} • {new Date(report.updatedAt).toLocaleDateString(isEn ? 'en-CA' : 'fr-CA')}
                        </p>
                      </div>
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
        </>
      )}
    </div>
  );
}
