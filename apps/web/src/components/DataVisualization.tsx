/**
 * PlainLedger Data Visualization System
 * 
 * Multi-format data visualization with:
 * - Multiple chart types (line, bar, pie, etc.)
 * - Pinning/favorites functionality
 * - Chart type selector
 * - Export capabilities
 */

import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ShareModal from './ShareModal';
import { useHasRealData } from '../hooks/useHasRealData';
import {
  Maximize2,
  Minimize2,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  Check,
  Table,
  BarChart3,
  LineChart,
  PieChart,
  Activity,
  Share2,
  Bookmark,
  BookmarkCheck,
  X,
  CheckCircle,
  AreaChart,
  Radar,
  Gauge,
  Flame,
  Waves,
  CircleDot,
  LayoutGrid,
  Sparkles,
  Calendar,
  Clock,
  Pencil,
  GitBranch,
  TrendingDown as TrendingDownIcon,
  FileImage,
  FileSpreadsheet,
  FileText,
  Plus,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import {
  chartFavoritesService,
  ChartConfig,
  ChartType,
  CHART_TYPE_INFO,
  METRIC_INFO,
  TimeRange,
  PRESET_CHARTS,
} from '../lib/chartFavorites';

// =====================================================
// CHART TYPE ICONS
// =====================================================

export const ChartTypeIcon: Record<ChartType, LucideIcon> = {
  line: LineChart,
  bar: BarChart3,
  area: AreaChart,
  pie: PieChart,
  donut: CircleDot,
  scatter: Activity,
  radar: Radar,
  treemap: LayoutGrid,
  heatmap: Flame,
  waterfall: Waves,
  gauge: Gauge,
  sparkline: Sparkles,
  table: Table,
  gantt: Calendar,
  runway: Clock,
  scenario: GitBranch,
  burnRate: TrendingDownIcon,
  cashForecast: Activity,
};

// =====================================================
// CHART TYPE SELECTOR
// =====================================================

interface ChartTypeSelectorProps {
  selected: ChartType;
  onChange: (type: ChartType) => void;
  availableTypes?: ChartType[];
  isEn: boolean;
}

export function ChartTypeSelector({ 
  selected, 
  onChange, 
  availableTypes,
  isEn 
}: ChartTypeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const types = availableTypes || (Object.keys(CHART_TYPE_INFO) as ChartType[]);
  const selectedInfo = CHART_TYPE_INFO[selected];
  const Icon = ChartTypeIcon[selected];
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-lg border transition-colors active:opacity-80"
        style={{
          backgroundColor: 'rgb(var(--color-bg))',
          borderColor: 'rgb(var(--color-border))',
          color: 'rgb(var(--color-text))',
        }}
      >
        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div 
            className="absolute top-full left-0 mt-2 w-72 rounded-xl border shadow-xl z-50 overflow-hidden"
            style={{
              backgroundColor: 'rgb(var(--color-surface))',
              borderColor: 'rgb(var(--color-border))',
            }}
          >
            <div className="p-2 max-h-80 overflow-y-auto">
              {types.map((type) => {
                const info = CHART_TYPE_INFO[type];
                const TypeIcon = ChartTypeIcon[type];
                const isSelected = type === selected;
                
                return (
                  <button
                    key={type}
                    onClick={() => {
                      onChange(type);
                      setIsOpen(false);
                    }}
                    className="w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left"
                    style={{
                      backgroundColor: isSelected 
                        ? 'rgb(var(--color-primary-500) / 0.1)' 
                        : 'transparent',
                    }}
                  >
                    <div 
                      className="p-2 rounded-lg flex-shrink-0"
                      style={{
                        backgroundColor: isSelected 
                          ? 'rgb(var(--color-primary-500) / 0.2)'
                          : 'rgb(var(--color-bg-muted))',
                      }}
                    >
                      <TypeIcon 
                        className="w-4 h-4" 
                        style={{ 
                          color: isSelected 
                            ? 'rgb(var(--color-primary-500))'
                            : 'rgb(var(--color-text-muted))',
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span 
                          className="font-medium text-sm"
                          style={{ color: 'rgb(var(--color-text))' }}
                        >
                          {isEn ? info.labelEn : info.label}
                        </span>
                        {isSelected && (
                          <Check 
                            className="w-4 h-4" 
                            style={{ color: 'rgb(var(--color-primary-500))' }}
                          />
                        )}
                      </div>
                      <p 
                        className="text-xs mt-0.5"
                        style={{ color: 'rgb(var(--color-text-muted))' }}
                      >
                        {isEn ? info.descriptionEn : info.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// =====================================================
// TIME RANGE SELECTOR
// =====================================================

interface TimeRangeSelectorProps {
  selected: TimeRange;
  onChange: (range: TimeRange) => void;
  isEn: boolean;
}

export function TimeRangeSelector({ selected, onChange }: TimeRangeSelectorProps) {
  // Show fewer options on mobile for space efficiency
  const mobileRanges: TimeRange[] = ['1W', '1M', '3M', '6M', 'YTD', '1Y'];
  const allRanges: TimeRange[] = ['1W', '1M', '3M', '6M', 'YTD', '1Y', '2Y', 'ALL'];
  
  return (
    <div 
      className="flex rounded-md sm:rounded-lg border overflow-hidden"
      style={{ borderColor: 'rgb(var(--color-border))' }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Mobile: show fewer options with compact buttons */}
      <div className="flex sm:hidden">
        {mobileRanges.map((range) => {
          const isSelected = range === selected;
          return (
            <button
              key={range}
              onClick={(e) => {
                e.stopPropagation();
                onChange(range);
              }}
              className="px-1.5 py-1 text-[9px] font-semibold transition-colors border-r last:border-r-0 flex-shrink-0 active:opacity-80"
              style={{
                backgroundColor: isSelected ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-bg))',
                color: isSelected ? 'white' : 'rgb(var(--color-text-muted))',
                borderColor: 'rgb(var(--color-border))',
                minWidth: '24px',
              }}
            >
              {range}
            </button>
          );
        })}
      </div>
      {/* Desktop: show all options */}
      <div className="hidden sm:flex">
        {allRanges.map((range) => {
          const isSelected = range === selected;
          return (
            <button
              key={range}
              onClick={(e) => {
                e.stopPropagation();
                onChange(range);
              }}
              className="px-2 py-1.5 text-[10px] font-semibold transition-colors border-r last:border-r-0 flex-shrink-0"
              style={{
                backgroundColor: isSelected ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-bg))',
                color: isSelected ? 'white' : 'rgb(var(--color-text-secondary))',
                borderColor: 'rgb(var(--color-border))',
              }}
            >
              {range}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// =====================================================
// DATA VISUALIZATION CARD
// =====================================================

interface DataVisualizationCardProps {
  config: ChartConfig;
  data?: any[];
  onConfigChange?: (config: ChartConfig) => void;
  onPin?: () => void;
  onUnpin?: () => void;
  isPinned?: boolean;
  showControls?: boolean;
  size?: 'small' | 'medium' | 'large' | 'full';
  onShare?: () => void;
  onAddToView?: (viewName: string) => void;
  isBookmarked?: boolean;
  onBookmark?: () => void;
}

export function DataVisualizationCard({
  config,
  data,
  onConfigChange,
  onPin,
  onUnpin,
  isPinned = false,
  showControls = true,
  size = 'medium',
  isBookmarked = false,
  onBookmark,
  onAddToView,
}: DataVisualizationCardProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const navigate = useNavigate();
  const { hasRealData, shouldShowSandboxData } = useHasRealData();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [localBookmarked, setLocalBookmarked] = useState(isBookmarked);
  
  const Icon = ChartTypeIcon[config.chartType];
  
  // Mock views for demo
  const savedViews = [
    { id: '1', name: isEn ? 'Executive View' : 'Vue exécutive' },
    { id: '2', name: isEn ? 'Monthly Review' : 'Revue mensuelle' },
    { id: '3', name: isEn ? 'Team Dashboard' : 'Tableau équipe' },
  ];
  
  // Responsive size classes - balanced for mobile readability
  const sizeClasses = {
    small: 'h-44 sm:h-48',
    medium: 'h-56 sm:h-64',
    large: 'h-72 sm:h-80',
    full: 'h-96 sm:h-[420px]',
  };
  
  const handleChartTypeChange = (type: ChartType) => {
    if (onConfigChange) {
      onConfigChange({ ...config, chartType: type });
    }
  };
  
  const handleTimeRangeChange = (range: TimeRange) => {
    if (onConfigChange) {
      onConfigChange({ ...config, timeRange: range });
    }
  };
  
  const handleExport = (format: 'png' | 'csv' | 'pdf') => {
    // Export functionality would be implemented here
    console.log(`Exporting ${config.name} as ${format}`);
    setShowOptions(false);
  };
  
  const handleBookmark = () => {
    setLocalBookmarked(!localBookmarked);
    onBookmark?.();
  };
  
  const handleAddToView = (viewId: string) => {
    onAddToView?.(viewId);
    setShowOptions(false);
  };
  
  // Generate visualization based on chart type
  // Only use mock data if we have sandbox data and no real data
  const renderChart = () => {
    // If we have real data, use it; otherwise only use mock if sandbox is available
    const chartData = data || (shouldShowSandboxData ? generateMockData(config) : null);
    
    // If no data and not sandbox mode, show empty state
    if (!chartData) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'No data available' : 'Aucune donnée disponible'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Connect your accounting software to view data' : 'Connectez votre logiciel comptable pour voir les données'}
            </p>
          </div>
        </div>
      );
    }
    
    switch (config.chartType) {
      case 'gauge':
        return <GaugeChart data={chartData} config={config} isEn={isEn} />;
      case 'donut':
      case 'pie':
        return <PieDonutChart data={chartData} config={config} isEn={isEn} />;
      case 'radar':
        return <RadarChart data={chartData} config={config} isEn={isEn} />;
      case 'table':
        return <TableView data={chartData} config={config} isEn={isEn} />;
      case 'heatmap':
        return <HeatmapChart data={chartData} config={config} isEn={isEn} />;
      case 'waterfall':
        return <WaterfallChart data={chartData} config={config} isEn={isEn} />;
      default:
        return <LineBarAreaChart data={chartData} config={config} isEn={isEn} />;
    }
  };
  
  return (
    <div 
      className={`group relative overflow-hidden rounded-xl transition-all duration-300 ${
        isExpanded ? 'fixed inset-4' : 'hover:shadow-xl hover:-translate-y-1'
      }`}
      style={{ 
        backgroundColor: 'rgb(var(--color-surface))',
        border: '1px solid rgb(var(--color-border))',
        boxShadow: isExpanded 
          ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        zIndex: isExpanded ? 9998 : undefined,
      }}
    >
      {/* Hover Gradient Accent */}
      <div 
        className="absolute top-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: 'linear-gradient(90deg, rgb(var(--color-primary-500)), rgb(var(--color-primary-400)))',
        }}
      />
      
      {/* Header - Clean, minimal design */}
      <div 
        className="px-3 py-2.5 sm:px-4 sm:py-3 border-b"
        style={{ borderColor: 'rgb(var(--color-border))' }}
      >
        <div className="flex items-center justify-between gap-3">
          {/* Left: Icon + Title */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div 
              className="p-1.5 rounded-lg flex-shrink-0"
              style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
            >
              <Icon className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
            </div>
            <h3 
              className="font-semibold text-sm truncate"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {isEn ? config.nameEn : config.name}
            </h3>
          </div>
          
          {/* Right: Time Range + Menu */}
          {showControls && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Time Range Selector - always visible */}
              <TimeRangeSelector
                selected={config.timeRange}
                onChange={handleTimeRangeChange}
                isEn={isEn}
              />
              
              {/* Actions Menu */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowOptions(!showOptions);
                  }}
                  className="p-1.5 rounded-md transition-colors active:opacity-80 hover:bg-[rgb(var(--color-bg-muted))]"
                  style={{
                    backgroundColor: showOptions 
                      ? 'rgb(var(--color-primary-500) / 0.1)'
                      : 'transparent',
                    color: showOptions 
                      ? 'rgb(var(--color-primary-500))'
                      : 'rgb(var(--color-text-muted))',
                  }}
                  aria-label={isEn ? 'Chart options' : 'Options du graphique'}
                  aria-expanded={showOptions}
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                
                {showOptions && (
                  <>
                    <div 
                      className="fixed inset-0 z-40"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowOptions(false);
                      }}
                    />
                    <div 
                      className="absolute top-full right-0 mt-1.5 w-52 rounded-xl border shadow-xl z-50 overflow-hidden"
                      style={{
                        backgroundColor: 'rgb(var(--color-surface))',
                        borderColor: 'rgb(var(--color-border))',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Primary Actions */}
                      <div className="p-1.5">
                        {/* Edit in Builder */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowOptions(false);
                            navigate('/app/visualizations', { state: { editChart: config } });
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-[rgb(var(--color-bg-muted))] transition-colors"
                          style={{ color: 'rgb(var(--color-text))' }}
                        >
                          <Pencil className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
                          <span className="font-medium">{isEn ? 'Edit Chart' : 'Modifier'}</span>
                        </button>
                        
                        {/* Expand/Fullscreen */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowOptions(false);
                            setIsExpanded(!isExpanded);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-[rgb(var(--color-bg-muted))] transition-colors"
                          style={{ color: 'rgb(var(--color-text))' }}
                        >
                          {isExpanded ? (
                            <>
                              <Minimize2 className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                              <span>{isEn ? 'Exit Fullscreen' : 'Quitter plein écran'}</span>
                            </>
                          ) : (
                            <>
                              <Maximize2 className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                              <span>{isEn ? 'Fullscreen' : 'Plein écran'}</span>
                            </>
                          )}
                        </button>
                        
                        {/* Share */}
                        <button
                          onClick={(e) => { 
                            e.stopPropagation();
                            setShowOptions(false); 
                            requestAnimationFrame(() => setShowShareModal(true));
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-[rgb(var(--color-bg-muted))] transition-colors"
                          style={{ color: 'rgb(var(--color-text))' }}
                        >
                          <Share2 className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                          <span>{isEn ? 'Share' : 'Partager'}</span>
                        </button>
                        
                        {/* Bookmark */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBookmark();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-[rgb(var(--color-bg-muted))] transition-colors"
                          style={{ color: 'rgb(var(--color-text))' }}
                        >
                          {localBookmarked ? (
                            <>
                              <BookmarkCheck className="w-4 h-4" style={{ color: 'rgb(var(--color-warning))' }} />
                              <span>{isEn ? 'Saved' : 'Enregistré'}</span>
                            </>
                          ) : (
                            <>
                              <Bookmark className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                              <span>{isEn ? 'Save' : 'Enregistrer'}</span>
                            </>
                          )}
                        </button>
                      </div>
                      
                      <div className="mx-2 border-t" style={{ borderColor: 'rgb(var(--color-border))' }} />
                      
                      {/* Export Section */}
                      <div className="p-2">
                        <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--color-text-muted))' }}>
                          {isEn ? 'Export' : 'Exporter'}
                        </p>
                        <div className="grid grid-cols-3 gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleExport('png'); }}
                            className="flex flex-col items-center gap-1 p-2 rounded-lg border hover:bg-[rgb(var(--color-bg-muted))] transition-colors"
                            style={{ borderColor: 'rgb(var(--color-border))' }}
                          >
                            <FileImage className="w-4 h-4" style={{ color: 'rgb(var(--color-info))' }} />
                            <span className="text-[10px] font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>PNG</span>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleExport('csv'); }}
                            className="flex flex-col items-center gap-1 p-2 rounded-lg border hover:bg-[rgb(var(--color-bg-muted))] transition-colors"
                            style={{ borderColor: 'rgb(var(--color-border))' }}
                          >
                            <FileSpreadsheet className="w-4 h-4" style={{ color: 'rgb(var(--color-success))' }} />
                            <span className="text-[10px] font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>CSV</span>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleExport('pdf'); }}
                            className="flex flex-col items-center gap-1 p-2 rounded-lg border hover:bg-[rgb(var(--color-bg-muted))] transition-colors"
                            style={{ borderColor: 'rgb(var(--color-border))' }}
                          >
                            <FileText className="w-4 h-4" style={{ color: 'rgb(var(--color-error))' }} />
                            <span className="text-[10px] font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>PDF</span>
                          </button>
                        </div>
                      </div>
                      
                      {/* Danger Zone */}
                      {isPinned && onUnpin && (
                        <>
                          <div className="mx-2 border-t" style={{ borderColor: 'rgb(var(--color-border))' }} />
                          <div className="p-1.5">
                            <button
                              onClick={(e) => { 
                                e.stopPropagation();
                                setShowOptions(false);
                                onUnpin(); 
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-[rgb(var(--color-error)/0.08)] transition-colors"
                              style={{ color: 'rgb(var(--color-error))' }}
                            >
                              <Trash2 className="w-4 h-4" />
                              <span className="font-medium">{isEn ? 'Remove from Dashboard' : 'Retirer du tableau'}</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Chart Area - Proper aspect ratio with padding */}
      <div className={`p-3 sm:p-4 ${isExpanded ? 'flex-1' : sizeClasses[size]}`}>
        <div className="h-full w-full max-w-4xl mx-auto">
          {renderChart()}
        </div>
      </div>
      
      {/* Expanded Overlay Backdrop */}
      {isExpanded && (
        <div 
          className="fixed inset-0"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.85)', 
            backdropFilter: 'blur(4px)',
            zIndex: 9997 
          }}
          onClick={() => setIsExpanded(false)}
        />
      )}
      
      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={config.name}
        titleEn={config.nameEn}
        contentType="chart"
        showDownloadOption={true}
        showEmbedOption={true}
      />
    </div>
  );
}

// =====================================================
// CHART COMPONENTS
// =====================================================

// Simple Line/Bar/Area Chart with Hover Tooltips - Responsive
function LineBarAreaChart({ data, config, isEn }: { data: any[]; config: ChartConfig; isEn: boolean }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Debounced hover handlers to prevent flickering
  const handleHover = useCallback((index: number) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoveredIndex(index);
  }, []);
  
  const handleLeave = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredIndex(null);
    }, 100);
  }, []);
  
  // Defensive: ensure data is valid array
  const safeData = Array.isArray(data) && data.length > 0 ? data : [{ value: 0, label: '-' }];
  const values = safeData.map(d => d?.value ?? 0);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const range = maxValue - minValue || 1;
  
  // Defensive: ensure metrics array exists and has at least one item
  const firstMetric = config?.metrics?.[0] || 'revenue';
  const metricInfo = METRIC_INFO[firstMetric] || METRIC_INFO.revenue;
  
  const formatValue = (value: number) => {
    if (metricInfo?.unit === 'currency') {
      return new Intl.NumberFormat(isEn ? 'en-CA' : 'fr-CA', {
        style: 'currency',
        currency: 'CAD',
        maximumFractionDigits: 0,
        notation: 'compact',
      }).format(value);
    }
    if (metricInfo.unit === 'percentage') {
      return `${value.toFixed(1)}%`;
    }
    return value.toLocaleString();
  };
  
  // Calculate trend
  const firstValue = safeData[0]?.value || 0;
  const lastValue = safeData[safeData.length - 1]?.value || 0;
  const trend = lastValue - firstValue;
  const trendPercent = firstValue !== 0 ? ((trend / firstValue) * 100) : 0;
  
  const getPointPosition = (index: number) => {
    if (safeData.length <= 1) return { x: 200, y: 80 };
    const x = (index / (safeData.length - 1)) * 400;
    const y = 150 - ((safeData[index]?.value ?? 0 - minValue) / range) * 130;
    return { x, y };
  };
  
  return (
    <div className="h-full flex flex-col">
      {/* Summary - Compact on mobile */}
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <p className="text-lg sm:text-xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
            {formatValue(hoveredIndex !== null ? safeData[hoveredIndex]?.value ?? 0 : lastValue)}
          </p>
          <div className="flex items-center gap-0.5">
            {trend >= 0 ? (
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" style={{ color: 'rgb(var(--color-success))' }} />
            ) : (
              <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" style={{ color: 'rgb(var(--color-error))' }} />
            )}
            <span 
              className="text-xs sm:text-sm font-medium"
              style={{ color: trend >= 0 ? 'rgb(var(--color-success))' : 'rgb(var(--color-error))' }}
            >
              {trend >= 0 ? '+' : ''}{trendPercent.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
      
      {/* Chart - Maintain aspect ratio with proper padding */}
      <div className="flex-1 relative group min-h-0" onMouseLeave={handleLeave}>
        <svg className="w-full h-full" viewBox="0 0 400 160" preserveAspectRatio="xMidYMid meet">
          {/* Grid lines - subtle background */}
          {[0, 25, 50, 75, 100].map((y) => (
            <line
              key={y}
              x1="10"
              y1={150 - (y / 100) * 130}
              x2="390"
              y2={150 - (y / 100) * 130}
              stroke="rgb(var(--color-border))"
              strokeWidth="0.5"
              strokeDasharray="4,4"
              opacity="0.5"
            />
          ))}
          
          {/* Hover vertical line */}
          {hoveredIndex !== null && (
            <line
              x1={getPointPosition(hoveredIndex).x}
              y1="10"
              x2={getPointPosition(hoveredIndex).x}
              y2="150"
              stroke="rgb(var(--color-primary-500))"
              strokeWidth="1"
              strokeDasharray="4,4"
              opacity="0.5"
            />
          )}
          
          {config.chartType === 'area' && safeData.length > 1 && (
            <path
              d={`M ${safeData.map((d, i) => 
                `${(i / (safeData.length - 1)) * 400} ${150 - (((d?.value ?? 0) - minValue) / range) * 130}`
              ).join(' L ')} L 400 150 L 0 150 Z`}
              fill={metricInfo?.color || '#10B981'}
              fillOpacity="0.15"
              className="transition-all duration-200"
            />
          )}
          
          {(config.chartType === 'line' || config.chartType === 'area') && safeData.length > 1 ? (
            <path
              d={`M ${safeData.map((d, i) => 
                `${(i / (safeData.length - 1)) * 400} ${150 - (((d?.value ?? 0) - minValue) / range) * 130}`
              ).join(' L ')}`}
              fill="none"
              stroke={metricInfo?.color || '#10B981'}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-200"
            />
          ) : (
            safeData.map((d, i) => (
              <rect
                key={i}
                x={(i / safeData.length) * 400 + 8}
                y={150 - (((d?.value ?? 0) - minValue) / range) * 130}
                width={(400 / safeData.length) - 16}
                height={(((d?.value ?? 0) - minValue) / range) * 130}
                fill={metricInfo?.color || '#10B981'}
                rx="3"
                opacity={hoveredIndex === null || hoveredIndex === i ? 1 : 0.6}
                className="transition-all duration-150 cursor-pointer"
                onMouseEnter={() => handleHover(i)}
                onMouseLeave={handleLeave}
              />
            ))
          )}
          
          {/* Data points with hover */}
          {(config.chartType === 'line' || config.chartType === 'area') && safeData.length > 1 && safeData.map((d, i) => (
            <g key={i}>
              {/* Larger invisible hit area */}
              <circle
                cx={(i / (safeData.length - 1)) * 400}
                cy={150 - (((d?.value ?? 0) - minValue) / range) * 130}
                r="20"
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => handleHover(i)}
                onMouseLeave={handleLeave}
              />
              {/* Visible point */}
              <circle
                cx={(i / (safeData.length - 1)) * 400}
                cy={150 - (((d?.value ?? 0) - minValue) / range) * 130}
                r={hoveredIndex === i ? 6 : 4}
                fill={hoveredIndex === i ? (metricInfo?.color || '#10B981') : 'white'}
                stroke={metricInfo?.color || '#10B981'}
                strokeWidth="2"
                className="transition-all duration-100 pointer-events-none"
              />
              {/* Subtle highlight on hover */}
              {hoveredIndex === i && (
                <circle
                  cx={(i / (safeData.length - 1)) * 400}
                  cy={150 - (((d?.value ?? 0) - minValue) / range) * 130}
                  r="12"
                  fill={metricInfo?.color || '#10B981'}
                  opacity="0.15"
                />
              )}
            </g>
          ))}
        </svg>
        
        {/* Floating Tooltip - Stable positioning */}
        {hoveredIndex !== null && safeData[hoveredIndex] && (
          <div 
            className="absolute pointer-events-none z-10 px-2 py-1.5 rounded-md shadow-md text-xs transform -translate-x-1/2 transition-opacity duration-75"
            style={{
              left: `${safeData.length > 1 ? Math.min(85, Math.max(15, (hoveredIndex / (safeData.length - 1)) * 100)) : 50}%`,
              top: '8px',
              backgroundColor: 'rgb(var(--color-surface))',
              border: '1px solid rgb(var(--color-border))',
              color: 'rgb(var(--color-text))',
            }}
          >
            <p className="font-semibold">{formatValue(safeData[hoveredIndex]?.value ?? 0)}</p>
            <p className="text-[10px] opacity-70">{safeData[hoveredIndex]?.label || '-'}</p>
          </div>
        )}
        
        {/* X-axis labels - Compact */}
        <div className="flex justify-between mt-1 text-[9px] sm:text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {data.filter((_, i) => i % Math.ceil(data.length / 5) === 0).map((d, i) => (
            <span key={i}>{d.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// Pie/Donut Chart with Hover - Responsive layout
function PieDonutChart({ data, config, isEn }: { data: any[]; config: ChartConfig; isEn: boolean }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Debounced hover handlers
  const handleHover = useCallback((index: number) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoveredIndex(index);
  }, []);
  
  const handleLeave = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredIndex(null);
    }, 100);
  }, []);
  
  const total = (data ?? []).reduce((sum, d) => sum + (d?.value ?? 0), 0);
  
  const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];
  
  // Pre-calculate angles for all segments
  const segments = (data ?? []).map((d, i) => {
    const prevAngles = data.slice(0, i).reduce((sum, item) => sum + ((item?.value ?? 0) / (total || 1)) * 360, 0);
    const angle = ((d?.value ?? 0) / (total || 1)) * 360;
    return {
      ...d,
      startAngle: prevAngles,
      endAngle: prevAngles + angle,
      angle,
      color: colors[i % colors.length],
    };
  });
  
  return (
    <div className="h-full flex flex-col sm:flex-row items-start sm:items-center sm:justify-center gap-3 sm:gap-6 px-2 sm:px-0">
      {/* Chart - Centered on mobile */}
      <div className="relative flex-shrink-0 self-center sm:self-auto">
        <svg viewBox="0 0 200 200" className="w-32 h-32 sm:w-36 sm:h-36">
          {segments.map((seg, i) => {
            const x1 = 100 + 80 * Math.cos((seg.startAngle - 90) * Math.PI / 180);
            const y1 = 100 + 80 * Math.sin((seg.startAngle - 90) * Math.PI / 180);
            const x2 = 100 + 80 * Math.cos((seg.endAngle - 90) * Math.PI / 180);
            const y2 = 100 + 80 * Math.sin((seg.endAngle - 90) * Math.PI / 180);
            const largeArc = seg.angle > 180 ? 1 : 0;
            
            const midAngle = (seg.startAngle + seg.endAngle) / 2 - 90;
            const hoverOffset = hoveredIndex === i ? 4 : 0;
            const offsetX = hoverOffset * Math.cos(midAngle * Math.PI / 180);
            const offsetY = hoverOffset * Math.sin(midAngle * Math.PI / 180);
            
            return (
              <path
                key={i}
                d={`M ${100 + offsetX} ${100 + offsetY} L ${x1 + offsetX} ${y1 + offsetY} A 80 80 0 ${largeArc} 1 ${x2 + offsetX} ${y2 + offsetY} Z`}
                fill={seg.color}
                className="transition-all duration-150 cursor-pointer"
                style={{
                  filter: hoveredIndex === i ? 'brightness(1.1)' : 'none',
                  opacity: hoveredIndex === null || hoveredIndex === i ? 1 : 0.6,
                }}
                onMouseEnter={() => handleHover(i)}
                onMouseLeave={handleLeave}
              />
            );
          })}
          {config.chartType === 'donut' && (
            <circle cx="100" cy="100" r="50" fill="rgb(var(--color-surface))" />
          )}
        </svg>
        
        {config.chartType === 'donut' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-base sm:text-lg font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                {hoveredIndex !== null ? (
                  new Intl.NumberFormat(isEn ? 'en-CA' : 'fr-CA', { style: 'currency', currency: 'CAD', notation: 'compact' }).format(data[hoveredIndex].value)
                ) : (
                  new Intl.NumberFormat(isEn ? 'en-CA' : 'fr-CA', { style: 'currency', currency: 'CAD', notation: 'compact' }).format(total)
                )}
              </p>
              <p className="text-[9px] sm:text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {hoveredIndex !== null ? data[hoveredIndex].label : 'Total'}
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Legend - Left-aligned grid on mobile */}
      <div className="grid grid-cols-2 sm:grid-cols-1 gap-x-4 gap-y-1 sm:gap-y-1 w-full sm:w-auto">
        {data.map((d, i) => (
          <div 
            key={i} 
            className="flex items-center gap-1.5 px-1 py-0.5 rounded transition-all cursor-pointer"
            style={{ backgroundColor: hoveredIndex === i ? `${colors[i % colors.length]}15` : 'transparent' }}
            onMouseEnter={() => handleHover(i)}
            onMouseLeave={handleLeave}
          >
            <div 
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: colors[i % colors.length] }}
            />
            <span className="text-[10px] sm:text-xs truncate" style={{ color: 'rgb(var(--color-text))' }}>
              {d.label}
            </span>
            <span className="text-[10px] sm:text-xs font-medium ml-auto" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {((d.value / total) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Radar Chart
function RadarChart({ data }: { data: any[]; config: ChartConfig; isEn: boolean }) {
  const values = data.length > 0 ? data.map(d => d.value ?? 0) : [0];
  const maxValue = Math.max(...values);
  const numPoints = data.length;
  const angleStep = (2 * Math.PI) / numPoints;
  
  const points = data.map((d, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const radius = (d.value / maxValue) * 70;
    return {
      x: 100 + radius * Math.cos(angle),
      y: 100 + radius * Math.sin(angle),
    };
  });
  
  return (
    <div className="h-full flex items-center justify-center">
      <svg viewBox="0 0 200 200" className="w-64 h-64">
        {/* Grid circles */}
        {[20, 40, 60, 80].map((r) => (
          <circle
            key={r}
            cx="100"
            cy="100"
            r={r}
            fill="none"
            stroke="rgb(var(--color-border))"
            strokeWidth="0.5"
            strokeDasharray="4,4"
          />
        ))}
        
        {/* Axis lines */}
        {data.map((_, i) => {
          const angle = i * angleStep - Math.PI / 2;
          return (
            <line
              key={i}
              x1="100"
              y1="100"
              x2={100 + 80 * Math.cos(angle)}
              y2={100 + 80 * Math.sin(angle)}
              stroke="rgb(var(--color-border))"
              strokeWidth="0.5"
            />
          );
        })}
        
        {/* Data polygon */}
        <polygon
          points={points.map(p => `${p.x},${p.y}`).join(' ')}
          fill="rgb(var(--color-primary-500))"
          fillOpacity="0.3"
          stroke="rgb(var(--color-primary-500))"
          strokeWidth="2"
        />
        
        {/* Data points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="4"
            fill="white"
            stroke="rgb(var(--color-primary-500))"
            strokeWidth="2"
          />
        ))}
        
        {/* Labels */}
        {data.map((d, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const labelRadius = 90;
          return (
            <text
              key={i}
              x={100 + labelRadius * Math.cos(angle)}
              y={100 + labelRadius * Math.sin(angle)}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[8px]"
              fill="rgb(var(--color-text-muted))"
            >
              {d.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// Gauge Chart - Compact responsive
function GaugeChart({ data }: { data: any[]; config: ChartConfig; isEn: boolean }) {
  const value = data[0]?.value ?? 0;
  const maxValue = data[0]?.max ?? 3;
  const percentage = maxValue !== 0 ? Math.min(100, (value / maxValue) * 100) : 0;
  
  const getColor = () => {
    if (percentage < 33) return 'rgb(var(--color-error))';
    if (percentage < 66) return 'rgb(var(--color-warning))';
    return 'rgb(var(--color-success))';
  };
  
  return (
    <div className="h-full flex flex-col items-center justify-center">
      <div className="relative">
        <svg viewBox="0 0 200 120" className="w-36 h-24 sm:w-40 sm:h-24">
          {/* Background arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="rgb(var(--color-border))"
            strokeWidth="14"
            strokeLinecap="round"
          />
          
          {/* Value arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke={getColor()}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${percentage * 2.51} 251`}
          />
          
          {/* Needle */}
          <line
            x1="100"
            y1="100"
            x2={100 + 55 * Math.cos((percentage * 1.8 - 180) * Math.PI / 180)}
            y2={100 + 55 * Math.sin((percentage * 1.8 - 180) * Math.PI / 180)}
            stroke="rgb(var(--color-text))"
            strokeWidth="2"
            strokeLinecap="round"
          />
          
          <circle cx="100" cy="100" r="5" fill="rgb(var(--color-text))" />
        </svg>
        
        <div className="absolute inset-0 flex items-end justify-center pb-1">
          <p className="text-xl sm:text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
            {value.toFixed(2)}
          </p>
        </div>
      </div>
      
      <div className="flex justify-between w-32 sm:w-40 mt-1 text-[10px] sm:text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
        <span>0</span>
        <span>{maxValue}</span>
      </div>
    </div>
  );
}

// Heatmap Chart
function HeatmapChart({ data, config: _config, isEn }: { data: any[]; config: ChartConfig; isEn: boolean }) {
  const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const weeks = Array.from({ length: 12 }, (_, i) => i + 1);
  
  const values = data.length > 0 ? data.map(d => d.value ?? 0) : [0];
  const maxValue = Math.max(...values);
  
  const getColor = (value: number) => {
    const intensity = value / maxValue;
    if (intensity < 0.2) return 'rgb(var(--color-success) / 0.1)';
    if (intensity < 0.4) return 'rgb(var(--color-success) / 0.3)';
    if (intensity < 0.6) return 'rgb(var(--color-success) / 0.5)';
    if (intensity < 0.8) return 'rgb(var(--color-success) / 0.7)';
    return 'rgb(var(--color-success))';
  };
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex gap-1 mb-2">
        <div className="w-6" />
        {weeks.map((w) => (
          <div key={w} className="flex-1 text-center text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {w}
          </div>
        ))}
      </div>
      
      <div className="flex-1 flex flex-col gap-1">
        {days.map((day, dayIndex) => (
          <div key={dayIndex} className="flex gap-1 flex-1">
            <div className="w-6 flex items-center justify-center text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {day}
            </div>
            {weeks.map((_, weekIndex) => {
              const index = dayIndex * weeks.length + weekIndex;
              const value = data[index]?.value || 0;
              return (
                <div
                  key={weekIndex}
                  className="flex-1 rounded-sm"
                  style={{ backgroundColor: getColor(value) }}
                  title={`${value.toLocaleString()}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-2 mt-4">
        <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn ? 'Less' : 'Moins'}
        </span>
        {[0.1, 0.3, 0.5, 0.7, 1].map((i) => (
          <div
            key={i}
            className="w-4 h-4 rounded-sm"
            style={{ backgroundColor: `rgb(var(--color-success) / ${i})` }}
          />
        ))}
        <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn ? 'More' : 'Plus'}
        </span>
      </div>
    </div>
  );
}

// Waterfall Chart - Responsive
function WaterfallChart({ data, config: _config, isEn }: { data: any[]; config: ChartConfig; isEn: boolean }) {
  let cumulative = 0;
  const processedData = data.map((d) => {
    const start = cumulative;
    cumulative += d.value;
    return {
      ...d,
      start,
      end: cumulative,
      isPositive: d.value >= 0,
    };
  });
  
  const maxValue = processedData.length > 0 
    ? Math.max(...processedData.map(d => Math.max(d?.start ?? 0, d?.end ?? 0))) 
    : 0;
  const minValue = processedData.length > 0 
    ? Math.min(...processedData.map(d => Math.min(d?.start ?? 0, d?.end ?? 0))) 
    : 0;
  const range = maxValue - minValue || 1;
  
  // Format compact numbers for mobile
  const formatCompact = (value: number) => {
    return new Intl.NumberFormat(isEn ? 'en-CA' : 'fr-CA', {
      notation: 'compact',
      maximumFractionDigits: 0,
    }).format(value);
  };
  
  return (
    <div className="h-full flex flex-col">
      <svg className="flex-1" viewBox="0 0 400 180" preserveAspectRatio="none">
        {/* Grid */}
        {[0, 45, 90, 135, 180].map((y) => (
          <line
            key={y}
            x1="0"
            y1={y}
            x2="400"
            y2={y}
            stroke="rgb(var(--color-border))"
            strokeWidth="0.5"
            strokeDasharray="4,4"
          />
        ))}
        
        {/* Bars */}
        {processedData.map((d, i) => {
          const x = (i / processedData.length) * 400 + 8;
          const width = (400 / processedData.length) - 16;
          const y1 = 170 - ((d.start - minValue) / range) * 160;
          const y2 = 170 - ((d.end - minValue) / range) * 160;
          const height = Math.abs(y1 - y2);
          const y = Math.min(y1, y2);
          
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={width}
                height={Math.max(2, height)}
                fill={d.isPositive ? 'rgb(var(--color-success))' : 'rgb(var(--color-error))'}
                rx="2"
              />
              {i < processedData.length - 1 && (
                <line
                  x1={x + width}
                  y1={y2}
                  x2={(i + 1) / processedData.length * 400 + 8}
                  y2={y2}
                  stroke="rgb(var(--color-border))"
                  strokeWidth="1"
                  strokeDasharray="3,3"
                />
              )}
            </g>
          );
        })}
      </svg>
      
      {/* Labels - More compact */}
      <div className="flex justify-around mt-1">
        {processedData.map((d, i) => (
          <div key={i} className="text-center min-w-0 flex-1 px-0.5">
            <p className="text-[8px] sm:text-[10px] truncate" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {d.label}
            </p>
            <p 
              className="text-[9px] sm:text-xs font-medium"
              style={{ color: d.isPositive ? 'rgb(var(--color-success))' : 'rgb(var(--color-error))' }}
            >
              {d.isPositive ? '+' : ''}{formatCompact(d.value)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Table View
function TableView({ data, config: _config, isEn }: { data: any[]; config: ChartConfig; isEn: boolean }) {
  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b" style={{ borderColor: 'rgb(var(--color-border))' }}>
            <th 
              className="text-left py-2 px-3 font-medium"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {isEn ? 'Period' : 'Période'}
            </th>
            <th 
              className="text-right py-2 px-3 font-medium"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {isEn ? 'Value' : 'Valeur'}
            </th>
            <th 
              className="text-right py-2 px-3 font-medium"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {isEn ? 'Change' : 'Variation'}
            </th>
            <th 
              className="text-center py-2 px-3 font-medium"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {isEn ? 'Trend' : 'Tendance'}
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => {
            const prevValue = data[i - 1]?.value || d.value;
            const change = d.value - prevValue;
            const changePercent = prevValue !== 0 ? (change / prevValue) * 100 : 0;
            
            return (
              <tr 
                key={i}
                className="border-b hover:bg-muted/50 transition-colors"
                style={{ borderColor: 'rgb(var(--color-border))' }}
              >
                <td 
                  className="py-2 px-3"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {d.label}
                </td>
                <td 
                  className="py-2 px-3 text-right font-mono"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {d.value.toLocaleString()}
                </td>
                <td 
                  className="py-2 px-3 text-right font-medium"
                  style={{ 
                    color: change >= 0 
                      ? 'rgb(var(--color-success))' 
                      : 'rgb(var(--color-error))'
                  }}
                >
                  {change >= 0 ? '+' : ''}{changePercent.toFixed(1)}%
                </td>
                <td className="py-2 px-3 text-center">
                  {change > 0 ? (
                    <TrendingUp className="w-4 h-4 inline text-success" />
                  ) : change < 0 ? (
                    <TrendingDown className="w-4 h-4 inline text-error" />
                  ) : (
                    <Minus className="w-4 h-4 inline text-muted" />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// =====================================================
// MOCK DATA GENERATOR
// =====================================================

function generateMockData(config: ChartConfig): any[] {
  const periods = {
    '1W': 7,
    '1M': 30,
    '3M': 12,
    '6M': 6,
    'YTD': 12,
    '1Y': 12,
    '2Y': 24,
    'ALL': 36,
    'custom': 12,
  };
  
  const count = periods[config.timeRange];
  const baseValue = 100000;
  
  if (config.chartType === 'pie' || config.chartType === 'donut') {
    return [
      { label: 'Salaires', value: 45000 },
      { label: 'Marketing', value: 25000 },
      { label: 'Opérations', value: 15000 },
      { label: 'R&D', value: 10000 },
      { label: 'Autres', value: 5000 },
    ];
  }
  
  if (config.chartType === 'gauge') {
    return [{ value: 1.85, max: 3 }];
  }
  
  if (config.chartType === 'radar') {
    return config.metrics.map(metric => ({
      label: METRIC_INFO[metric].label,
      value: Math.random() * 100,
    }));
  }
  
  if (config.chartType === 'waterfall') {
    return [
      { label: 'Revenus', value: 150000 },
      { label: 'Coûts', value: -80000 },
      { label: 'Salaires', value: -35000 },
      { label: 'Marketing', value: -10000 },
      { label: 'Autres', value: -5000 },
      { label: 'Net', value: 20000 },
    ];
  }
  
  if (config.chartType === 'heatmap') {
    return Array.from({ length: 84 }, () => ({
      value: Math.random() * 10000,
    }));
  }
  
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  
  return Array.from({ length: count }, (_, i) => ({
    label: months[i % 12],
    value: baseValue + (Math.random() - 0.3) * baseValue * 0.5 + i * 2000,
  }));
}

// =====================================================
// MINI CHART PREVIEW (for gallery cards)
// =====================================================

function MiniChartPreview({ chartType }: { chartType: ChartType }) {
  const primaryColor = 'rgb(var(--color-primary-500))';
  const mutedColor = 'rgb(var(--color-text-muted) / 0.3)';
  
  switch (chartType) {
    case 'line':
    case 'area':
      return (
        <svg viewBox="0 0 100 40" className="w-full h-full" preserveAspectRatio="none">
          {/* Grid lines */}
          <line x1="0" y1="10" x2="100" y2="10" stroke={mutedColor} strokeWidth="0.5" />
          <line x1="0" y1="20" x2="100" y2="20" stroke={mutedColor} strokeWidth="0.5" />
          <line x1="0" y1="30" x2="100" y2="30" stroke={mutedColor} strokeWidth="0.5" />
          {/* Area fill */}
          {chartType === 'area' && (
            <path 
              d="M 5 30 L 20 22 L 40 28 L 60 15 L 80 18 L 95 8 L 95 38 L 5 38 Z" 
              fill={primaryColor}
              fillOpacity="0.2"
            />
          )}
          {/* Line */}
          <path 
            d="M 5 30 L 20 22 L 40 28 L 60 15 L 80 18 L 95 8" 
            fill="none" 
            stroke={primaryColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Points */}
          <circle cx="5" cy="30" r="2" fill={primaryColor} />
          <circle cx="20" cy="22" r="2" fill={primaryColor} />
          <circle cx="40" cy="28" r="2" fill={primaryColor} />
          <circle cx="60" cy="15" r="2" fill={primaryColor} />
          <circle cx="80" cy="18" r="2" fill={primaryColor} />
          <circle cx="95" cy="8" r="2" fill={primaryColor} />
        </svg>
      );
      
    case 'bar':
      return (
        <svg viewBox="0 0 100 40" className="w-full h-full" preserveAspectRatio="none">
          <rect x="8" y="18" width="12" height="20" rx="2" fill={primaryColor} fillOpacity="0.6" />
          <rect x="26" y="10" width="12" height="28" rx="2" fill={primaryColor} fillOpacity="0.8" />
          <rect x="44" y="22" width="12" height="16" rx="2" fill={primaryColor} fillOpacity="0.5" />
          <rect x="62" y="6" width="12" height="32" rx="2" fill={primaryColor} />
          <rect x="80" y="14" width="12" height="24" rx="2" fill={primaryColor} fillOpacity="0.7" />
        </svg>
      );
      
    case 'pie':
    case 'donut':
      return (
        <svg viewBox="0 0 100 40" className="w-full h-full">
          <g transform="translate(50, 20)">
            {/* Pie segments */}
            <path d="M 0 -14 A 14 14 0 0 1 12.12 7 L 0 0 Z" fill={primaryColor} />
            <path d="M 12.12 7 A 14 14 0 0 1 -7 12.12 L 0 0 Z" fill={primaryColor} fillOpacity="0.7" />
            <path d="M -7 12.12 A 14 14 0 0 1 -14 0 L 0 0 Z" fill={primaryColor} fillOpacity="0.5" />
            <path d="M -14 0 A 14 14 0 0 1 0 -14 L 0 0 Z" fill={primaryColor} fillOpacity="0.3" />
            {/* Center hole for donut */}
            {chartType === 'donut' && (
              <circle cx="0" cy="0" r="7" fill="rgb(var(--color-bg-muted))" />
            )}
          </g>
        </svg>
      );
      
    case 'radar':
      return (
        <svg viewBox="0 0 100 40" className="w-full h-full">
          <g transform="translate(50, 20)">
            {/* Background pentagon */}
            <polygon 
              points="0,-14 13.3,-4.3 8.2,11.3 -8.2,11.3 -13.3,-4.3" 
              fill="none" 
              stroke={mutedColor}
              strokeWidth="0.5"
            />
            {/* Data polygon */}
            <polygon 
              points="0,-10 8,-3 5,8 -6,6 -9,-2" 
              fill={primaryColor}
              fillOpacity="0.3"
              stroke={primaryColor}
              strokeWidth="1.5"
            />
            {/* Points */}
            <circle cx="0" cy="-10" r="2" fill={primaryColor} />
            <circle cx="8" cy="-3" r="2" fill={primaryColor} />
            <circle cx="5" cy="8" r="2" fill={primaryColor} />
            <circle cx="-6" cy="6" r="2" fill={primaryColor} />
            <circle cx="-9" cy="-2" r="2" fill={primaryColor} />
          </g>
        </svg>
      );
      
    case 'gauge':
      return (
        <svg viewBox="0 0 100 40" className="w-full h-full">
          <g transform="translate(50, 32)">
            {/* Background arc */}
            <path 
              d="M -30 0 A 30 30 0 0 1 30 0" 
              fill="none" 
              stroke={mutedColor}
              strokeWidth="6"
              strokeLinecap="round"
            />
            {/* Value arc (70%) */}
            <path 
              d="M -30 0 A 30 30 0 0 1 15 -26" 
              fill="none" 
              stroke={primaryColor}
              strokeWidth="6"
              strokeLinecap="round"
            />
            {/* Needle */}
            <line x1="0" y1="0" x2="10" y2="-20" stroke="rgb(var(--color-text))" strokeWidth="2" strokeLinecap="round" />
            <circle cx="0" cy="0" r="3" fill="rgb(var(--color-text))" />
          </g>
        </svg>
      );
      
    case 'heatmap':
      return (
        <svg viewBox="0 0 100 40" className="w-full h-full">
          {/* Heatmap grid */}
          {[0, 1, 2, 3, 4].map((row) => (
            [0, 1, 2, 3, 4, 5, 6, 7].map((col) => {
              const opacity = Math.random() * 0.8 + 0.2;
              return (
                <rect 
                  key={`${row}-${col}`}
                  x={5 + col * 12} 
                  y={2 + row * 7} 
                  width="10" 
                  height="6" 
                  rx="1"
                  fill={primaryColor}
                  fillOpacity={opacity}
                />
              );
            })
          ))}
        </svg>
      );
      
    case 'waterfall':
      return (
        <svg viewBox="0 0 100 40" className="w-full h-full">
          {/* Waterfall bars */}
          <rect x="8" y="5" width="12" height="20" rx="1" fill="rgb(var(--color-success))" />
          <rect x="26" y="10" width="12" height="10" rx="1" fill="rgb(var(--color-error))" />
          <rect x="44" y="15" width="12" height="8" rx="1" fill="rgb(var(--color-error))" />
          <rect x="62" y="18" width="12" height="5" rx="1" fill="rgb(var(--color-error))" />
          <rect x="80" y="23" width="12" height="12" rx="1" fill={primaryColor} />
          {/* Connector lines */}
          <line x1="20" y1="25" x2="26" y2="25" stroke={mutedColor} strokeWidth="1" strokeDasharray="2" />
          <line x1="38" y1="20" x2="44" y2="20" stroke={mutedColor} strokeWidth="1" strokeDasharray="2" />
          <line x1="56" y1="23" x2="62" y2="23" stroke={mutedColor} strokeWidth="1" strokeDasharray="2" />
        </svg>
      );
      
    case 'table':
      return (
        <svg viewBox="0 0 100 40" className="w-full h-full">
          {/* Table rows */}
          <rect x="5" y="4" width="90" height="8" rx="1" fill={primaryColor} fillOpacity="0.2" />
          <rect x="5" y="14" width="90" height="6" rx="1" fill={mutedColor} />
          <rect x="5" y="22" width="90" height="6" rx="1" fill={mutedColor} />
          <rect x="5" y="30" width="90" height="6" rx="1" fill={mutedColor} />
          {/* Column dividers */}
          <line x1="35" y1="4" x2="35" y2="36" stroke="rgb(var(--color-bg-muted))" strokeWidth="2" />
          <line x1="65" y1="4" x2="65" y2="36" stroke="rgb(var(--color-bg-muted))" strokeWidth="2" />
        </svg>
      );
      
    case 'scatter':
      return (
        <svg viewBox="0 0 100 40" className="w-full h-full">
          {/* Grid */}
          <line x1="10" y1="35" x2="90" y2="35" stroke={mutedColor} strokeWidth="0.5" />
          <line x1="10" y1="5" x2="10" y2="35" stroke={mutedColor} strokeWidth="0.5" />
          {/* Scatter points */}
          <circle cx="20" cy="25" r="3" fill={primaryColor} fillOpacity="0.7" />
          <circle cx="35" cy="18" r="3" fill={primaryColor} fillOpacity="0.8" />
          <circle cx="45" cy="28" r="3" fill={primaryColor} fillOpacity="0.6" />
          <circle cx="55" cy="12" r="3" fill={primaryColor} />
          <circle cx="70" cy="20" r="3" fill={primaryColor} fillOpacity="0.9" />
          <circle cx="85" cy="8" r="3" fill={primaryColor} fillOpacity="0.7" />
        </svg>
      );
      
    case 'treemap':
      return (
        <svg viewBox="0 0 100 40" className="w-full h-full">
          <rect x="3" y="3" width="45" height="20" rx="2" fill={primaryColor} />
          <rect x="51" y="3" width="46" height="12" rx="2" fill={primaryColor} fillOpacity="0.7" />
          <rect x="51" y="18" width="22" height="19" rx="2" fill={primaryColor} fillOpacity="0.5" />
          <rect x="76" y="18" width="21" height="19" rx="2" fill={primaryColor} fillOpacity="0.3" />
          <rect x="3" y="26" width="45" height="11" rx="2" fill={primaryColor} fillOpacity="0.4" />
        </svg>
      );
      
    default:
      // Default sparkline-style preview
      return (
        <svg viewBox="0 0 100 40" className="w-full h-full" preserveAspectRatio="none">
          <path 
            d="M 5 25 Q 25 30 35 20 T 55 18 T 75 12 T 95 8" 
            fill="none" 
            stroke={primaryColor}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}

// =====================================================
// CHART GALLERY MODAL
// =====================================================

interface ChartGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectChart?: (config: ChartConfig) => void;
  onBuildCustom?: () => void;
  isEn: boolean;
}

export function ChartGalleryModal({ isOpen, onClose, onSelectChart, onBuildCustom, isEn }: ChartGalleryModalProps) {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'financial' | 'ratio' | 'operational'>('all');
  
  const categories = [
    { id: 'all', label: isEn ? 'All Charts' : 'Tous les graphiques' },
    { id: 'financial', label: isEn ? 'Financial' : 'Financiers' },
    { id: 'ratio', label: isEn ? 'Ratios' : 'Ratios' },
    { id: 'operational', label: isEn ? 'Operational' : 'Opérationnels' },
  ];
  
  const filteredCharts = PRESET_CHARTS.filter(chart => {
    if (selectedCategory === 'all') return true;
    const primaryMetric = chart.metrics[0];
    return METRIC_INFO[primaryMetric].category === selectedCategory;
  });
  
  const handleBuildCustom = () => {
    onClose();
    if (onBuildCustom) {
      onBuildCustom();
    } else {
      // Navigate to visualizations page for chart building
      navigate('/app/visualizations');
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 flex items-start justify-center overflow-y-auto p-2 sm:p-0"
      style={{ zIndex: 9999 }}
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      
      {/* Modal - Responsive sizing */}
      <div 
        className="relative w-full max-w-4xl my-2 sm:my-4 md:my-8 mx-0 sm:mx-4 rounded-xl sm:rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Header with integrated tabs */}
        <div 
          className="sticky top-0 z-10"
          style={{ backgroundColor: 'rgb(var(--color-surface))' }}
        >
          {/* Title row */}
          <div 
            className="flex items-center justify-between px-3 sm:px-5 pt-3 sm:pt-5 pb-2 sm:pb-3"
          >
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Chart Gallery' : 'Galerie de graphiques'}
              </h2>
              <p className="text-xs sm:text-sm mt-0.5 hidden sm:block" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn 
                  ? 'Choose a chart or build your own custom visualization'
                  : 'Choisissez un graphique ou créez votre propre visualisation'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-lg transition-colors hover:bg-[rgb(var(--color-bg-muted))] flex-shrink-0 ml-2"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
          
          {/* Category tabs - Responsive */}
          <div 
            className="flex gap-1 px-3 sm:px-5 pb-2 sm:pb-3 border-b overflow-x-auto scrollbar-hide"
            style={{ borderColor: 'rgb(var(--color-border))' }}
          >
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as any)}
                className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap touch-manipulation active:scale-95"
                style={{
                  backgroundColor: selectedCategory === cat.id 
                    ? 'rgb(var(--color-primary-500))'
                    : 'transparent',
                  color: selectedCategory === cat.id 
                    ? 'white'
                    : 'rgb(var(--color-text-muted))',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Content - Responsive padding and grid */}
        <div className="p-3 sm:p-5">
          {/* Build Custom Card - Prominent at top */}
          <button
            onClick={handleBuildCustom}
            className="w-full mb-4 p-4 sm:p-5 rounded-xl border-2 border-dashed transition-all hover:shadow-lg hover:border-solid group touch-manipulation active:scale-[0.99]"
            style={{
              borderColor: 'rgb(var(--color-primary-500))',
              backgroundColor: 'rgb(var(--color-primary-500) / 0.03)',
            }}
          >
            <div className="flex items-center gap-4">
              <div 
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
              >
                <Sparkles className="w-6 h-6 sm:w-7 sm:h-7" style={{ color: 'rgb(var(--color-primary-500))' }} />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-sm sm:text-base font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? 'Build Custom Chart' : 'Créer un graphique personnalisé'}
                </h3>
                <p className="text-xs sm:text-sm mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn 
                    ? 'Select your own metrics, chart type, and customize every detail'
                    : 'Sélectionnez vos métriques, type de graphique et personnalisez chaque détail'}
                </p>
              </div>
              <div 
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-sm"
                style={{
                  backgroundColor: 'rgb(var(--color-primary-500))',
                  color: 'white',
                }}
              >
                <Pencil className="w-4 h-4" />
                {isEn ? 'Build' : 'Créer'}
              </div>
            </div>
          </button>
          
          {/* Preset Charts Section */}
          <div className="mb-3">
            <h4 className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Preset Charts' : 'Graphiques prédéfinis'}
            </h4>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
            {filteredCharts.map((chart) => {
              const isPinned = chartFavoritesService.isPinned(chart.id);
              const ChartIcon = ChartTypeIcon[chart.chartType];
              
              return (
                <div
                  key={chart.id}
                  className={`group relative p-3 sm:p-4 rounded-lg sm:rounded-xl cursor-pointer transition-all hover:shadow-lg border touch-manipulation active:scale-[0.98] ${isPinned ? 'ring-2 ring-offset-1 sm:ring-offset-2' : ''}`}
                  style={{
                    backgroundColor: 'rgb(var(--color-bg))',
                    borderColor: isPinned ? 'rgb(var(--color-success))' : 'rgb(var(--color-border))',
                    boxShadow: `0 0 0 2px ${isPinned ? 'rgb(var(--color-success))' : undefined}`,
                  }}
                  onClick={() => {
                    onSelectChart?.(chart);
                    onClose();
                  }}
                >
                  {/* Top-right add icon - Always visible on mobile */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectChart?.(chart);
                      onClose();
                    }}
                    className="absolute top-2 right-2 sm:top-3 sm:right-3 p-1 sm:p-1.5 rounded-lg sm:opacity-0 sm:group-hover:opacity-100 transition-all hover:bg-[rgb(var(--color-primary-500)/0.1)] z-10"
                    style={{ 
                      color: 'rgb(var(--color-primary-500))',
                      backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
                    }}
                    title={isEn ? 'Add to dashboard' : 'Ajouter au tableau de bord'}
                  >
                    <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                  
                  <div className="flex items-start justify-between mb-2 sm:mb-3">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 pr-8 sm:pr-0">
                      <div 
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
                      >
                        <ChartIcon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-xs sm:text-sm truncate" style={{ color: 'rgb(var(--color-text))' }}>
                          {isEn ? chart.nameEn : chart.name}
                        </h4>
                        <p className="text-[10px] sm:text-xs truncate" style={{ color: 'rgb(var(--color-text-muted))' }}>
                          {isEn ? CHART_TYPE_INFO[chart.chartType].labelEn : CHART_TYPE_INFO[chart.chartType].label}
                        </p>
                      </div>
                    </div>
                    {isPinned && (
                      <span 
                        className="hidden sm:flex px-2 py-0.5 rounded-full text-[10px] font-medium items-center gap-1 flex-shrink-0"
                        style={{ 
                          backgroundColor: 'rgb(var(--color-success) / 0.1)',
                          color: 'rgb(var(--color-success))',
                        }}
                      >
                        <CheckCircle className="w-3 h-3" />
                        {isEn ? 'Added' : 'Ajouté'}
                      </span>
                    )}
                  </div>
                  
                  {/* Mini Chart Preview - Responsive height */}
                  <div 
                    className="h-12 sm:h-16 mb-2 sm:mb-3 rounded-md sm:rounded-lg overflow-hidden"
                    style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
                  >
                    <MiniChartPreview chartType={chart.chartType} />
                  </div>
                  
                  <p className="text-[10px] sm:text-xs mb-2 sm:mb-3 line-clamp-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn ? chart.descriptionEn : chart.description}
                  </p>
                  
                  {/* Metric tags - Responsive */}
                  <div className="flex flex-wrap gap-1">
                    {chart.metrics.slice(0, 2).map((metric) => (
                      <span
                        key={metric}
                        className="px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-medium"
                        style={{
                          backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
                          color: 'rgb(var(--color-primary-600))',
                        }}
                      >
                        {isEn ? METRIC_INFO[metric].labelEn : METRIC_INFO[metric].label}
                      </span>
                    ))}
                    {chart.metrics.length > 2 && (
                      <span
                        className="px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px]"
                        style={{
                          backgroundColor: 'rgb(var(--color-bg-muted))',
                          color: 'rgb(var(--color-text-muted))',
                        }}
                      >
                        +{chart.metrics.length - 2}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// CHART GALLERY (Standalone - for backwards compatibility)
// =====================================================

interface ChartGalleryProps {
  onSelectChart?: (config: ChartConfig) => void;
}

export function ChartGallery({ onSelectChart }: ChartGalleryProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'financial' | 'ratio' | 'operational'>('all');
  
  const categories = [
    { id: 'all', label: isEn ? 'All Charts' : 'Tous les graphiques' },
    { id: 'financial', label: isEn ? 'Financial' : 'Financiers' },
    { id: 'ratio', label: isEn ? 'Ratios' : 'Ratios' },
    { id: 'operational', label: isEn ? 'Operational' : 'Opérationnels' },
  ];
  
  const filteredCharts = PRESET_CHARTS.filter(chart => {
    if (selectedCategory === 'all') return true;
    const primaryMetric = chart.metrics[0];
    return METRIC_INFO[primaryMetric].category === selectedCategory;
  });
  
  return (
    <div>
      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredCharts.map((chart) => {
          const isPinned = chartFavoritesService.isPinned(chart.id);
          const ChartIcon = ChartTypeIcon[chart.chartType];
          
          return (
            <div
              key={chart.id}
              className={`card p-4 cursor-pointer hover:shadow-lg transition-all ${isPinned ? 'ring-2 ring-offset-2' : ''}`}
              style={{
                boxShadow: `0 0 0 2px ${isPinned ? 'rgb(var(--color-success))' : undefined}`,
              }}
              onClick={() => onSelectChart?.(chart)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
                  >
                    <ChartIcon className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
                  </div>
                  <div>
                    <h4 className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                      {isEn ? chart.nameEn : chart.name}
                    </h4>
                    <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {isEn ? CHART_TYPE_INFO[chart.chartType].labelEn : CHART_TYPE_INFO[chart.chartType].label}
                    </p>
                  </div>
                </div>
                {isPinned && (
                  <span 
                    className="px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-success) / 0.1)',
                      color: 'rgb(var(--color-success))',
                    }}
                  >
                    <CheckCircle className="w-3 h-3" />
                    {isEn ? 'Added' : 'Ajouté'}
                  </span>
                )}
              </div>
              
              <p className="text-sm mb-3" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? chart.descriptionEn : chart.description}
              </p>
              
              <div className="flex flex-wrap gap-1">
                {chart.metrics.slice(0, 3).map((metric) => (
                  <span
                    key={metric}
                    className="px-2 py-0.5 rounded text-xs"
                    style={{
                      backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
                      color: 'rgb(var(--color-primary-600))',
                    }}
                  >
                    {isEn ? METRIC_INFO[metric].labelEn : METRIC_INFO[metric].label}
                  </span>
                ))}
                {chart.metrics.length > 3 && (
                  <span
                    className="px-2 py-0.5 rounded text-xs"
                    style={{
                      backgroundColor: 'rgb(var(--color-bg-muted))',
                      color: 'rgb(var(--color-text-muted))',
                    }}
                  >
                    +{chart.metrics.length - 3}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default DataVisualizationCard;
