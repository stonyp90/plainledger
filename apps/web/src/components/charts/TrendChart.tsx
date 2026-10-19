/**
 * Trend Chart - Time series visualization
 * Shows financial trends over time with anomaly detection
 * 
 * IBCS Enhanced:
 * - Plan line overlay (dashed)
 * - Forecast zone (hatched area)
 * - Variance shading between actual and plan
 * - Bilingual support (EN/FR)
 */
import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, Settings2, Target, Share2, Maximize2, Minimize2, Calendar, ChevronDown } from 'lucide-react';
import { 
  DEFAULT_THRESHOLDS, 
  formatCurrency,
  ThresholdConfig,
  detectOutliers,
  FinancialDataPoint,
} from '../../lib/anomalyDetection';
import { ChartTooltip, DataPointTooltip } from './ChartTooltip';
import { ChartDataState } from './ChartDataState';
import { chartExtent, getChartDataIssue, isChartLabel, isFiniteNumber } from '../../lib/chartDataValidation';
import type { DataMetric, DecisionEvent } from '../../lib/decisionContext';
import { useGraphConfig, saveChartSettings } from '../../hooks/useGraphConfig';
import { useChartResponsive } from '../../hooks/useChartResponsive';
import { formatCurrencyValue, formatPercentageValue, type PeriodPreset } from '../../lib/graphConfig';
import GraphConfigPanel from './GraphConfigPanel';
import { IBCSLegendCompact } from './ibcs/IBCSLegend';
import { IBCSColors } from '../../lib/ibcs';
import { useChartCapture } from '../../hooks/useChartCapture';
import ShareModal from '../ShareModal';

// =====================================================
// CHART PERIOD SELECTOR (Per-chart date filter)
// =====================================================

interface ChartPeriodSelectorProps {
  chartId: string;
  currentPeriod: PeriodPreset;
  isEn: boolean;
  isFullscreen: boolean;
  /** Icon class for responsive sizing */
  iconClass?: string;
  /** Text class for responsive sizing */
  textClass?: string;
  /** Whether chart is in compact mode */
  isCompact?: boolean;
}

function ChartPeriodSelector({ 
  chartId, 
  currentPeriod, 
  isEn, 
  isFullscreen,
  iconClass = 'w-3 h-3',
  textClass = 'text-xs',
  isCompact = false,
}: ChartPeriodSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const periods: { id: PeriodPreset; label: string; labelEn: string; short: string; shortEn: string }[] = [
    { id: 'mtd', label: 'Mois en cours', labelEn: 'Month to Date', short: 'MTD', shortEn: 'MTD' },
    { id: 'qtd', label: 'Trimestre en cours', labelEn: 'Quarter to Date', short: 'QTD', shortEn: 'QTD' },
    { id: 'ytd', label: 'Année en cours', labelEn: 'Year to Date', short: 'YTD', shortEn: 'YTD' },
    { id: 'last_month', label: 'Mois dernier', labelEn: 'Last Month', short: '1M', shortEn: '1M' },
    { id: 'last_quarter', label: 'Trimestre dernier', labelEn: 'Last Quarter', short: '1Q', shortEn: '1Q' },
    { id: 'last_year', label: 'Année dernière', labelEn: 'Last Year', short: '1Y', shortEn: '1Y' },
  ];
  
  const currentPeriodInfo = periods.find(p => p.id === currentPeriod) || periods[2]; // Default to YTD
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);
  
  const handlePeriodChange = (periodId: PeriodPreset) => {
    // Save only to this specific chart's settings - does not affect other charts
    saveChartSettings(chartId, { period: { defaultPeriod: periodId } });
    setIsOpen(false);
  };

  // Hide on very compact charts
  if (isCompact) return null;
  
  return (
    <div ref={dropdownRef} className={`relative ${isFullscreen ? 'block' : 'hidden sm:block'}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md ${textClass} font-medium transition-all duration-200 ${isFullscreen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'}`}
        style={{ 
          backgroundColor: isOpen ? 'rgb(var(--color-primary-500) / 0.1)' : 'transparent',
          color: isOpen ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text-muted))',
          border: '1px solid transparent',
          position: 'relative',
          zIndex: isFullscreen ? 10 : undefined,
        }}
        title={isEn ? 'Change time period (chart-specific)' : 'Changer la période (spécifique au graphique)'}
      >
        <Calendar className={iconClass} />
        <span>{isEn ? currentPeriodInfo.shortEn : currentPeriodInfo.short}</span>
        <ChevronDown className={`${iconClass} transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div 
          className="absolute right-0 top-full mt-1 py-1 rounded-lg shadow-lg z-50 min-w-[160px]"
          style={{ 
            backgroundColor: 'rgb(var(--color-surface))',
            border: '1px solid rgb(var(--color-border))',
          }}
        >
          <div 
            className="px-3 py-1.5 text-xs font-medium border-b mb-1"
            style={{ 
              color: 'rgb(var(--color-text-muted))',
              borderColor: 'rgb(var(--color-border))',
            }}
          >
            {isEn ? 'This chart only' : 'Ce graphique uniquement'}
          </div>
          {periods.map((period) => (
            <button
              key={period.id}
              onClick={() => handlePeriodChange(period.id)}
              className="w-full px-3 py-1.5 text-left text-sm flex items-center justify-between hover:bg-[rgb(var(--color-bg-muted))] transition-colors"
              style={{ 
                color: currentPeriod === period.id 
                  ? 'rgb(var(--color-primary-500))' 
                  : 'rgb(var(--color-text))',
                backgroundColor: currentPeriod === period.id 
                  ? 'rgb(var(--color-primary-500) / 0.05)' 
                  : 'transparent',
              }}
            >
              <span>{isEn ? period.labelEn : period.label}</span>
              <span 
                className="text-xs font-mono"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                {isEn ? period.shortEn : period.short}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface TrendChartProps {
  data: FinancialDataPoint[];
  title: string;
  titleEn?: string;
  subtitle?: string;
  subtitleEn?: string;
  baseline?: number;
  budget?: number[]; // Optional budget line for comparison
  /** Plan data for IBCS plan line overlay */
  planData?: number[];
  /** Forecast data (will render with hatched pattern) */
  forecastData?: number[];
  thresholds?: ThresholdConfig;
  showThresholdBands?: boolean;
  showMovingAverage?: boolean;
  movingAveragePeriod?: number;
  /** Chart height in pixels - responsive by default */
  height?: number;
  color?: string;
  isEn?: boolean;
  /** Compact mode for smaller containers */
  compact?: boolean;
  /** Chart ID for configuration persistence */
  chartId?: string;
  /** Enable IBCS-compliant display */
  ibcsMode?: boolean;
  /** Show variance shading between actual and plan */
  showVarianceShading?: boolean;
  /** Show IBCS legend */
  showIBCSLegend?: boolean;
  
  // Decision capture integration
  /** Enable decision capture button on chart */
  enableDecisions?: boolean;
  /** Callback when user wants to record a decision */
  onRecordDecision?: (trigger: {
    metricType: DataMetric;
    metricLabel: string;
    chartId: string;
    currentValue: number;
    benchmarkValue?: number;
    period?: string;
  }) => void;
  /** Recent decisions for this metric (to show on chart) */
  recentDecisions?: DecisionEvent[];
  /** Metric type for decision context */
  metricType?: DataMetric;
  /** Benchmark value for decision context */
  benchmarkValue?: number;
}

export default function TrendChart({
  data: inputData,
  title,
  titleEn,
  subtitle,
  subtitleEn,
  baseline,
  budget,
  planData,
  forecastData,
  thresholds: propThresholds,
  showThresholdBands: propShowThresholdBands,
  showMovingAverage: propShowMovingAverage,
  movingAveragePeriod: propMovingAveragePeriod,
  height: propHeight,
  color = 'rgb(var(--color-text))',
  isEn = false,
  compact = false,
  chartId,
  ibcsMode: propIBCSMode = false,
  showVarianceShading: propShowVarianceShading = false,
  showIBCSLegend: propShowIBCSLegend = true,
  enableDecisions = false,
  onRecordDecision,
  recentDecisions,
  metricType = 'revenue',
  benchmarkValue,
}: TrendChartProps) {
  const dataIssue = getChartDataIssue(inputData, point => isChartLabel(point.period) && isFiniteNumber(point.value));
  const invalidOverlay = [budget, planData, forecastData].some(series =>
    series != null && (!Array.isArray(series) || !series.every(isFiniteNumber)));
  const issue = invalidOverlay || (baseline != null && !isFiniteNumber(baseline)) ? 'invalid' : dataIssue;
  const data = issue ? [] : inputData;
  // Get graph configuration
  const graphConfig = useGraphConfig(chartId, {
    visual: {
      height: propHeight ?? (compact ? 160 : 200),
      showThresholdBands: propShowThresholdBands ?? true,
      showMovingAverage: propShowMovingAverage ?? true,
      movingAveragePeriod: propMovingAveragePeriod ?? 3,
      showBaseline: baseline !== undefined,
      showBudget: budget !== undefined && budget.length > 0,
    },
    cpa: {
      thresholds: propThresholds || DEFAULT_THRESHOLDS,
    },
    ibcs: {
      enabled: propIBCSMode,
      showVarianceShading: propShowVarianceShading,
      showLegend: propShowIBCSLegend,
      showPlan: planData !== undefined && planData.length > 0,
      showForecast: forecastData !== undefined && forecastData.length > 0,
    },
  });

  // Use config values, falling back to props
  const ibcsMode = graphConfig.ibcs?.enabled ?? propIBCSMode;
  const showVarianceShading = graphConfig.ibcs?.showVarianceShading ?? propShowVarianceShading;
  const showIBCSLegend = graphConfig.ibcs?.showLegend ?? propShowIBCSLegend;
  
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const { chartRef, capture } = useChartCapture<HTMLDivElement>();
  
  // Chart-responsive sizing based on actual container width (not viewport)
  const { ref: responsiveRef, classes: rClasses, values: rValues, isCompact: isChartCompact } = useChartResponsive();
  
  // Generate stable chart ID for config persistence
  const effectiveChartId = chartId || `trend-${title.toLowerCase().replace(/\s/g, '-')}`;
  
  // Use config values with prop overrides
  const height = propHeight ?? graphConfig.visual.height;
  const thresholds = propThresholds || graphConfig.cpa.thresholds;
  const showThresholdBands = propShowThresholdBands ?? graphConfig.visual.showThresholdBands;
  const showMovingAverage = propShowMovingAverage ?? graphConfig.visual.showMovingAverage;
  const requestedMAPeriod = propMovingAveragePeriod ?? graphConfig.visual.movingAveragePeriod;
  const movingAveragePeriod = isFiniteNumber(requestedMAPeriod) && requestedMAPeriod >= 1 ? Math.floor(requestedMAPeriod) : 3;
  
  // Convert CSS variable color to actual hex color for SVG gradients
  // SVG gradients don't support CSS variables, so we need actual color values
  // For all industry charts, we want green fills to match the theme
  const getActualColor = (colorString: string): string => {
    // Primary colors - always use green (this is what Dashboard passes)
    if (colorString.includes('--color-primary') || colorString.includes('primary')) {
      return '#10b981'; // emerald-500 (green) - theme color
    }
    // Success colors - use green
    if (colorString.includes('--color-success') || colorString.includes('success')) {
      return '#16a34a'; // green-600
    }
    // Text colors - default to green instead of dark for chart fills
    if (colorString.includes('--color-text')) {
      return '#10b981'; // Use green instead of dark text color
    }
    // Error colors - use red
    if (colorString.includes('--color-error') || colorString.includes('error')) {
      return '#ef4444'; // red-500
    }
    // Warning colors - use amber
    if (colorString.includes('--color-warning') || colorString.includes('warning')) {
      return '#f59e0b'; // amber-500
    }
    // Info colors - use blue
    if (colorString.includes('--color-info') || colorString.includes('info')) {
      return '#3b82f6'; // blue-500
    }
    // If it's already a hex color, return as-is
    if (colorString.startsWith('#')) {
      return colorString;
    }
    // If it's already an rgb() color without CSS variables, return as-is
    if (colorString.startsWith('rgb(') && !colorString.includes('var(')) {
      return colorString;
    }
    // Default to green for all charts (theme color) - ensures no gray/black fills
    // This covers cases where color might be 'rgb(var(--color-text))' or other defaults
    return '#10b981';
  };
  
  const actualColor = getActualColor(color);
  
  // Debug: Log the color conversion (remove in production if needed)
  // console.log('Color conversion:', { original: color, converted: actualColor });
  const [showBands, setShowBands] = useState(showThresholdBands);
  const [showMA, setShowMA] = useState(showMovingAverage);
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoveringRef = useRef(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Check if fullscreen API is supported
  const isFullscreenSupported = useCallback(() => {
    return !!(
      document.fullscreenEnabled ||
      (document as any).webkitFullscreenEnabled ||
      (document as any).mozFullScreenEnabled ||
      (document as any).msFullscreenEnabled
    );
  }, []);

  // Handle fullscreen toggle with browser compatibility
  const toggleFullscreen = useCallback(() => {
    if (!chartRef.current) return;
    
    // Check for fullscreen support
    if (!isFullscreenSupported()) {
      // Fallback: use CSS-based fullscreen simulation
      setIsFullscreen(!isFullscreen);
      return;
    }
    
    const elem = chartRef.current as any;
    const doc = document as any;
    
    if (!document.fullscreenElement && !doc.webkitFullscreenElement && !doc.mozFullScreenElement && !doc.msFullscreenElement) {
      // Enter fullscreen with vendor prefixes
      const requestFullscreen = elem.requestFullscreen || elem.webkitRequestFullscreen || elem.mozRequestFullScreen || elem.msRequestFullscreen;
      if (requestFullscreen) {
        requestFullscreen.call(elem).then(() => {
          setIsFullscreen(true);
        }).catch((err: Error) => {
          console.warn('Fullscreen request failed, using CSS fallback:', err);
          // Fallback to CSS-based fullscreen
          setIsFullscreen(true);
        });
      } else {
        // No API available, use CSS fallback
        setIsFullscreen(true);
      }
    } else {
      // Exit fullscreen with vendor prefixes
      const exitFullscreen = doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen;
      if (exitFullscreen) {
        exitFullscreen.call(document).then(() => {
          setIsFullscreen(false);
        }).catch((err: Error) => {
          console.warn('Exit fullscreen failed:', err);
          setIsFullscreen(false);
        });
      } else {
        setIsFullscreen(false);
      }
    }
  }, [isFullscreen, isFullscreenSupported]);

  // Listen for fullscreen change events with vendor prefixes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as any;
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Handle Escape key to exit fullscreen (for both CSS and browser fullscreen)
  useEffect(() => {
    if (!isFullscreen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        toggleFullscreen();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isFullscreen, toggleFullscreen]);

  // Debounced hover handlers to prevent flickering
  const handlePointEnter = useCallback((index: number, e: React.MouseEvent) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    isHoveringRef.current = true;
    setHoveredPointIndex(index);
    setTooltipPosition({ x: e.clientX, y: e.clientY });
  }, []);

  const handlePointMove = useCallback((e: React.MouseEvent) => {
    if (isHoveringRef.current) {
      setTooltipPosition({ x: e.clientX, y: e.clientY });
    }
  }, []);

  const handlePointLeave = useCallback(() => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    // Use a short delay to allow moving between points
    hoverTimeoutRef.current = setTimeout(() => {
      if (!isHoveringRef.current) return;
      isHoveringRef.current = false;
      setHoveredPointIndex(null);
    }, 100);
  }, []);

  // Handle chart area mouse leave to ensure tooltip clears
  const handleChartLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      isHoveringRef.current = false;
      setHoveredPointIndex(null);
    }, 150);
  }, []);

  // Handle share button click with error handling
  const handleShareClick = useCallback(async () => {
    setIsCapturing(true);
    setShareError(null);
    
    try {
      const imageData = await capture({ backgroundColor: '#ffffff', scale: 2 });
      if (imageData) {
        setCapturedImage(imageData);
        setShowShareModal(true);
      } else {
        // Capture returned null - still open share modal without image
        setShareError(isEn ? 'Could not capture chart image' : 'Impossible de capturer l\'image du graphique');
        setShowShareModal(true);
      }
    } catch (error) {
      console.error('Failed to capture chart:', error);
      setShareError(isEn ? 'Failed to capture chart' : 'Échec de la capture du graphique');
      // Still open share modal so user can share link without image
      setShowShareModal(true);
    } finally {
      setIsCapturing(false);
    }
  }, [capture, isEn]);

  const { 
    processedData, 
    minValue, 
    maxValue, 
    avgValue,
    outliers,
    trend,
    warningBand,
    criticalBand,
    movingAverage,
    percentChange,
    volatility,
  } = useMemo(() => {
    // Guard against empty data (though we have early return above, useMemo might run before)
    if (!data || data.length === 0) {
      return {
        processedData: [],
        minValue: 0,
        maxValue: 100,
        avgValue: 0,
        outliers: [],
        trend: 'stable' as const,
        warningBand: { low: 0, high: 100 },
        criticalBand: { low: 0, high: 100 },
        movingAverage: [],
        percentChange: 0,
        volatility: 0,
      };
    }
    
    const values = data.map(d => d.value);
    const { min, max } = chartExtent(values);
    const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    const base = baseline ?? avg;
    
    // Calculate bands
    const warningLow = base - Math.abs(base) * thresholds.varianceWarning / 100;
    const warningHigh = base + Math.abs(base) * thresholds.varianceWarning / 100;
    const criticalLow = base - Math.abs(base) * thresholds.varianceCritical / 100;
    const criticalHigh = base + Math.abs(base) * thresholds.varianceCritical / 100;
    
    // Calculate moving average
    const ma: number[] = [];
    let windowSum = 0;
    for (let i = 0; i < values.length; i++) {
      windowSum += values[i];
      if (i >= movingAveragePeriod) windowSum -= values[i - movingAveragePeriod];
      ma.push(windowSum / Math.min(i + 1, movingAveragePeriod));
    }
    
    // Calculate volatility (standard deviation)
    const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const volatilityPct = avg !== 0 ? (stdDev / Math.abs(avg)) * 100 : 0;
    
    // Detect outliers
    const detectedOutliers = detectOutliers(data, title);
    const outlierPeriods = new Set(detectedOutliers.map(o => o.affectedPeriod));
    
    // Calculate trend
    let trendDirection: 'up' | 'down' | 'stable' = 'stable';
    if (data.length >= 2) {
      const window = Math.min(3, Math.floor(values.length / 2));
      const recentAvg = values.slice(-window).reduce((a, b) => a + b, 0) / window;
      const olderAvg = values.slice(0, window).reduce((a, b) => a + b, 0) / window;
      const trendChange = olderAvg !== 0 ? ((recentAvg - olderAvg) / Math.abs(olderAvg)) * 100 : 0;
      if (trendChange > 5) trendDirection = 'up';
      else if (trendChange < -5) trendDirection = 'down';
    }
    
    // Calculate period-over-period change
    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    const pctChange = firstValue !== 0 ? ((lastValue - firstValue) / Math.abs(firstValue)) * 100 : 0;
    
    // Process data with status
    const processed = data.map((point, i) => {
      const deviation = base !== 0 ? Math.abs((point.value - base) / base) * 100 : 0;
      let status: 'normal' | 'warning' | 'critical' | 'outlier' = 'normal';
      
      // Check against moving average for anomaly detection
      const maDeviation = ma[i] !== 0 ? Math.abs((point.value - ma[i]) / ma[i]) * 100 : 0;
      
      if (outlierPeriods.has(point.period)) {
        status = 'outlier';
      } else if (deviation >= thresholds.varianceCritical || maDeviation >= thresholds.varianceCritical * 0.8) {
        status = 'critical';
      } else if (deviation >= thresholds.varianceWarning || maDeviation >= thresholds.varianceWarning * 0.8) {
        status = 'warning';
      }
      
      return { ...point, status, deviation, maDeviation };
    });
    
    // Extend range for bands and budget
    const extent = chartExtent([min, max, criticalLow, criticalHigh, ...(budget ?? []), ...(planData ?? []), ...(forecastData ?? [])]);
    const padding = (extent.max - extent.min || Math.abs(extent.max) || 1) * 0.05;
    const rangeMin = extent.min - padding;
    const rangeMax = extent.max + padding;
    
    return {
      processedData: processed,
      minValue: rangeMin,
      maxValue: rangeMax,
      avgValue: avg,
      outliers: detectedOutliers,
      trend: trendDirection,
      warningBand: { low: warningLow, high: warningHigh },
      criticalBand: { low: criticalLow, high: criticalHigh },
      movingAverage: ma,
      percentChange: pctChange,
      volatility: volatilityPct,
    };
  }, [data, baseline, budget, planData, forecastData, thresholds, title, movingAveragePeriod]);

  // Combine refs for capture and responsive sizing - MUST be before early return (hooks rules)
  const setRefs = useCallback((node: HTMLDivElement | null) => {
    // Set chart capture ref
    (chartRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    // Set responsive sizing ref
    (responsiveRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
  }, [chartRef, responsiveRef]);

  // Early return - hide chart completely if no data
  if (issue || ![minValue, maxValue, avgValue, percentChange, volatility].every(isFiniteNumber)) {
    return <ChartDataState title={isEn && titleEn ? titleEn : title} issue={issue || 'invalid'} isEn={isEn} />;
  }

  // Dynamic height for fullscreen mode
  const chartHeight = isFullscreen ? Math.max(160, Math.min(window.innerHeight - 300, 600)) : height;

  const getYPosition = (value: number, customHeight?: number) => {
    const h = customHeight ?? chartHeight;
    const range = maxValue - minValue;
    // Handle case where all values are the same (range = 0)
    if (range === 0 || !isFinite(range)) {
      return h / 2;
    }
    return h - ((value - minValue) / range) * h;
  };

  const pointCount = Math.max(data.length, budget?.length ?? 0, planData?.length ?? 0, data.length + Math.max(0, (forecastData?.length ?? 0) - 1));
  const markerStride = Math.max(1, Math.ceil(data.length / 150));
  const labelStride = Math.max(1, Math.ceil((data.length - 1) / 5));
  const getXPosition = (index: number) => {
    const padding = 40;
    const width = 100 - padding;
    // Handle case where there's only one data point
    if (pointCount <= 1) {
      return 50; // Center the single point
    }
    return padding / 2 + (index / (pointCount - 1)) * width;
  };

  const getPointColor = (status: string) => {
    switch (status) {
      case 'outlier':
      case 'critical':
        return 'rgb(var(--color-error))';
      case 'warning':
        return 'rgb(var(--color-warning))';
      default:
        return color;
    }
  };

  // Generate SVG path for the line
  const linePath = processedData.length > 0 
    ? processedData.map((point, i) => {
        const x = getXPosition(i);
        const y = getYPosition(point.value);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ')
    : '';

  // Generate area path (only if we have a valid line path)
  const areaPath = linePath 
    ? `${linePath} L ${getXPosition(data.length - 1)} ${chartHeight} L ${getXPosition(0)} ${chartHeight} Z`
    : '';

  // Generate moving average path
  const maPath = showMA && movingAverage.length > 0 
    ? movingAverage.map((val, i) => {
        const x = getXPosition(i);
        const y = getYPosition(val);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ')
    : '';

  // Generate budget path if provided
  const budgetPath = budget && budget.length > 0 
    ? budget.map((val, i) => {
        const x = getXPosition(i);
        const y = getYPosition(val);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ')
    : '';

  // IBCS: Generate plan line path if provided
  const planPath = planData && planData.length > 0 
    ? planData.map((val, i) => {
        const x = getXPosition(i);
        const y = getYPosition(val);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ')
    : '';

  // IBCS: Generate forecast line path if provided
  const forecastPath = forecastData && forecastData.length > 0 
    ? forecastData.map((val, i) => {
        // Forecast data continues from the last actual data point
        const forecastStartIndex = data.length - 1;
        const x = getXPosition(forecastStartIndex + i);
        const y = getYPosition(val);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ')
    : '';

  // IBCS: Generate variance shading area between actual and plan
  const varianceShadingPath = (ibcsMode && showVarianceShading && planData && planData.length > 0)
    ? (() => {
        const actualPoints = processedData.map((p, i) => 
          `${i === 0 ? 'M' : 'L'} ${getXPosition(i)} ${getYPosition(p.value)}`
        ).join(' ');
        const planPointsReverse = [...planData].reverse().map((val, i) => 
          `L ${getXPosition(planData.length - 1 - i)} ${getYPosition(val)}`
        ).join(' ');
        return `${actualPoints} ${planPointsReverse} Z`;
      })()
    : '';

  return (
    <div 
      ref={setRefs}
      className={`rounded-lg sm:rounded-xl ${rClasses.padding} transition-all duration-200 hover:shadow-md group flex flex-col ${
        isFullscreen ? 'fixed inset-0 overflow-auto' : ''
      }`}
      style={{ 
        backgroundColor: isFullscreen ? 'rgb(var(--color-bg))' : 'rgb(var(--color-surface))',
        border: isFullscreen ? 'none' : '1px solid rgb(var(--color-border))',
        borderRadius: isFullscreen ? 0 : undefined,
        zIndex: isFullscreen ? 9997 : undefined, // Below toasts (9998) but above everything else
        // Ensure fullscreen has an opaque background
        ...(isFullscreen && { 
          padding: '1rem',
          boxShadow: 'none',
        }),
      }}
      onMouseEnter={(e) => {
        if (!isFullscreen) {
          e.currentTarget.style.backgroundColor = 'rgb(var(--color-bg-muted))';
        }
      }}
      onMouseLeave={(e) => {
        if (!isFullscreen) {
          e.currentTarget.style.backgroundColor = 'rgb(var(--color-surface))';
        }
      }}
    >
      {/* Header - responsive to chart size, sticky in fullscreen */}
      <div 
        className={`flex items-start justify-between mb-2 ${rClasses.gap} ${isFullscreen ? 'sticky top-0 py-2 -mx-4 px-4' : ''}`}
        style={isFullscreen ? { 
          backgroundColor: 'rgb(var(--color-bg))',
          zIndex: 10,
        } : undefined}
      >
        <div className="flex-1 min-w-0">
          <div className={`flex items-center ${rClasses.gap} flex-wrap`}>
            <h3 
              className={rClasses.title}
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {isEn && titleEn ? titleEn : title}
            </h3>
            
            {/* Key metrics inline - hide on very compact charts */}
            {!isChartCompact && (
              <span 
                className={`${rClasses.textSm} font-mono tabular-nums flex items-center gap-0.5`}
                style={{ 
                  color: percentChange >= 0 
                    ? 'rgb(var(--color-success))' 
                    : 'rgb(var(--color-error))'
                }}
              >
                {percentChange >= 0 ? <TrendingUp className={rClasses.iconSm} /> : <TrendingDown className={rClasses.iconSm} />}
                {percentChange >= 0 ? '+' : ''}{percentChange.toFixed(1)}%
              </span>
            )}
            
            {/* Anomaly badge - hide on compact charts */}
            {!isChartCompact && outliers.length > 0 && (
              <span 
                className={`${rClasses.textSm} flex items-center gap-0.5 px-1.5 py-0.5 rounded`}
                style={{ 
                  backgroundColor: 'rgb(var(--color-error) / 0.1)',
                  color: 'rgb(var(--color-error))'
                }}
              >
                <AlertTriangle className={rClasses.iconSm} />
                {outliers.length} {isEn ? 'anomal' + (outliers.length > 1 ? 'ies' : 'y') : 'anomalie' + (outliers.length > 1 ? 's' : '')}
              </span>
            )}
          </div>
          {(subtitle || subtitleEn) && !isChartCompact && (
            <p 
              className={`${rClasses.subtitle} mt-0.5`}
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {isEn && subtitleEn ? subtitleEn : subtitle}
            </p>
          )}
        </div>
        
        {/* Controls - hover reveal on desktop, simplified on mobile - sized by chart width */}
        <div className={`flex items-center ${rClasses.gap}`}>
          {/* Period selector - Desktop only (hover reveal) */}
          <ChartPeriodSelector
            chartId={effectiveChartId}
            currentPeriod={graphConfig.period.defaultPeriod}
            isEn={isEn}
            isFullscreen={isFullscreen}
            iconClass={rClasses.iconSm}
            textClass={rClasses.textSm}
            isCompact={isChartCompact}
          />
          
          {/* Fullscreen - Always visible in fullscreen mode, hover reveal otherwise */}
          <button
            onClick={toggleFullscreen}
            className={`${isFullscreen ? 'flex' : 'hidden sm:flex'} ${rClasses.buttonSm} transition-all duration-200 ${isFullscreen ? 'opacity-100' : 'opacity-0 group-hover:opacity-70 hover:opacity-100 focus:opacity-100'}`}
            style={{ 
              backgroundColor: isFullscreen ? 'rgb(var(--color-primary-500) / 0.1)' : 'transparent',
              color: isFullscreen ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text-muted))',
              position: 'relative',
              zIndex: isFullscreen ? 10 : undefined,
            }}
            title={isEn ? (isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen') : (isFullscreen ? 'Quitter plein écran (Esc)' : 'Plein écran')}
            aria-label={isEn ? (isFullscreen ? 'Exit fullscreen' : 'Fullscreen') : (isFullscreen ? 'Quitter plein écran' : 'Plein écran')}
          >
            {isFullscreen ? <Minimize2 className={rClasses.icon} /> : <Maximize2 className={rClasses.icon} />}
          </button>
          {/* Share - Always visible in fullscreen mode, hover reveal otherwise */}
          <button
            onClick={handleShareClick}
            disabled={isCapturing}
            className={`${isFullscreen ? 'flex' : 'hidden sm:flex'} ${rClasses.buttonSm} transition-all duration-200 ${isFullscreen ? 'opacity-100' : 'opacity-0 group-hover:opacity-70 hover:opacity-100 focus:opacity-100'} ${isCapturing ? 'opacity-30 cursor-wait' : ''}`}
            style={{ 
              backgroundColor: 'transparent',
              color: 'rgb(var(--color-text-muted))',
              position: 'relative',
              zIndex: isFullscreen ? 10 : undefined,
            }}
            title={isEn ? 'Share chart' : 'Partager le graphique'}
            aria-label={isEn ? 'Share chart' : 'Partager le graphique'}
          >
            {isCapturing ? (
              <span className={`${rClasses.icon} border border-current border-t-transparent rounded-full animate-spin block`} />
            ) : (
              <Share2 className={rClasses.icon} />
            )}
          </button>
          {/* Config - Always visible in fullscreen mode, hover reveal otherwise */}
          <button
            onClick={() => setShowConfigPanel(true)}
            className={`${isFullscreen ? 'flex' : 'hidden sm:flex'} ${rClasses.buttonSm} transition-all duration-200 ${isFullscreen ? 'opacity-100' : 'opacity-0 group-hover:opacity-70 hover:opacity-100 focus:opacity-100'}`}
            style={{ 
              backgroundColor: 'transparent',
              color: 'rgb(var(--color-text-muted))',
              position: 'relative',
              zIndex: isFullscreen ? 10 : undefined,
            }}
            title={isEn ? 'Configure chart' : 'Configurer le graphique'}
            aria-label={isEn ? 'Configure chart' : 'Configurer le graphique'}
          >
            <Settings2 className={rClasses.icon} />
          </button>
          {enableDecisions && onRecordDecision && (
            <button
              onClick={() => {
                const lastPoint = data[data.length - 1];
                onRecordDecision({
                  metricType,
                  metricLabel: isEn && titleEn ? titleEn : title,
                  chartId: chartId || `trend-${title.toLowerCase().replace(/\s/g, '-')}`,
                  currentValue: lastPoint?.value ?? 0,
                  benchmarkValue,
                  period: lastPoint?.period,
                });
              }}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors duration-150 active:opacity-80"
              style={{ 
                backgroundColor: 'rgb(var(--color-success) / 0.08)',
                color: 'rgb(var(--color-success))'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(var(--color-success) / 0.15)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(var(--color-success) / 0.08)'}
              title={isEn ? 'Record a decision based on this data' : 'Enregistrer une décision basée sur ces données'}
              aria-label={isEn ? 'Record decision' : 'Enregistrer une décision'}
            >
              <Target className="w-3 h-3" />
              <span className="hidden sm:inline text-[11px]">{isEn ? 'Decide' : 'Décider'}</span>
            </button>
          )}
          <button
            onClick={() => setShowMA(!showMA)}
            className="text-[11px] px-1.5 py-1 rounded-md transition-all duration-200"
            style={{ 
              backgroundColor: showMA ? 'rgb(var(--color-text) / 0.06)' : 'transparent',
              color: showMA ? 'rgb(var(--color-text-secondary))' : 'rgb(var(--color-text-muted))'
            }}
            title={isEn ? `${movingAveragePeriod}-period MA` : `MM ${movingAveragePeriod} périodes`}
            aria-label={isEn ? 'Toggle moving average' : 'Activer/désactiver la moyenne mobile'}
            aria-pressed={showMA}
          >
            MA
          </button>
          <button
            onClick={() => setShowBands(!showBands)}
            className="flex items-center gap-0.5 text-[11px] px-1.5 py-1 rounded-md transition-all duration-200"
            style={{ 
              backgroundColor: showBands ? 'rgb(var(--color-text) / 0.06)' : 'transparent',
              color: showBands ? 'rgb(var(--color-text-secondary))' : 'rgb(var(--color-text-muted))'
            }}
            aria-label={isEn ? 'Toggle thresholds' : 'Activer/désactiver les seuils'}
            aria-pressed={showBands}
          >
            <Settings2 className="w-3 h-3" />
            <span className="hidden sm:inline">{isEn ? 'Thresholds' : 'Seuils'}</span>
          </button>
        </div>
      </div>

      {/* Legend - IBCS notation when enabled - fixed height for consistency */}
      <div 
        className={`flex items-center gap-2 mb-2 ${rClasses.textSm} overflow-x-auto scrollbar-hide`}
        style={{ 
          color: 'rgb(var(--color-text-muted))',
          minHeight: '20px', // Fixed height prevents layout shifts
          maxHeight: '20px',
        }}
      >
        {ibcsMode && showIBCSLegend ? (
          <IBCSLegendCompact />
        ) : (
          <span className="flex items-center gap-1 whitespace-nowrap">
            <span 
              className="w-4 h-0.5 rounded flex-shrink-0"
              style={{ backgroundColor: '#10b981' }}
            />
            AC
          </span>
        )}
        {showMA && (
          <span className="flex items-center gap-1 whitespace-nowrap">
            <span 
              className="w-4 h-0.5 rounded flex-shrink-0"
              style={{ backgroundColor: 'rgb(var(--color-text-muted))', opacity: 0.6 }}
            />
            MA({movingAveragePeriod})
          </span>
        )}
        {(budget || planData) && (
          <span className="flex items-center gap-1 whitespace-nowrap">
            <span 
              className="w-4 h-0.5 rounded flex-shrink-0"
              style={{ 
                backgroundColor: ibcsMode ? IBCSColors.planStroke : 'rgb(var(--color-warning))', 
                borderStyle: 'dashed' 
              }}
            />
            PL
          </span>
        )}
        {forecastData && (
          <span className="flex items-center gap-1 whitespace-nowrap">
            <span 
              className="w-4 h-0.5 rounded flex-shrink-0"
              style={{ backgroundColor: IBCSColors.forecast, borderStyle: 'dotted' }}
            />
            FC
          </span>
        )}
        {showBands && (
          <>
            <span className="flex items-center gap-1 whitespace-nowrap">
              <span 
                className="w-2.5 h-2.5 rounded flex-shrink-0"
                style={{ backgroundColor: 'rgb(var(--color-success) / 0.15)' }}
              />
              Normal
            </span>
            <span className="flex items-center gap-1 whitespace-nowrap">
              <span 
                className="w-2.5 h-2.5 rounded flex-shrink-0"
                style={{ backgroundColor: 'rgb(var(--color-warning) / 0.15)' }}
              />
              ±{thresholds.varianceWarning}%
            </span>
          </>
        )}
      </div>

      {/* Chart */}
      <div 
        className={`relative ${isFullscreen ? 'flex-1' : ''}`}
        style={{ height: isFullscreen ? undefined : `${chartHeight}px`, minHeight: isFullscreen ? '400px' : undefined }}
        onMouseLeave={handleChartLeave}
        onMouseMove={(event) => {
          // Keep every observation inspectable without thousands of overlapping hit areas.
          if (data.length <= 150) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (bounds.width <= 0) return;
          const xPercent = ((event.clientX - bounds.left) / bounds.width) * 100;
          const index = Math.round(((xPercent - 20) / 60) * (pointCount - 1));
          if (index >= 0 && index < data.length) handlePointEnter(index, event);
          else setHoveredPointIndex(null);
        }}
      >
        <svg 
          viewBox={`0 0 100 ${chartHeight}`} 
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          {/* Threshold bands - subtle background indicators */}
          {showBands && (
            <>
              {/* Warning zone (outside normal) - very subtle */}
              <rect
                x="0"
                y={getYPosition(criticalBand.high)}
                width="100"
                height={getYPosition(warningBand.high) - getYPosition(criticalBand.high)}
                fill="rgb(var(--color-warning) / 0.08)"
              />
              <rect
                x="0"
                y={getYPosition(warningBand.low)}
                width="100"
                height={getYPosition(criticalBand.low) - getYPosition(warningBand.low)}
                fill="rgb(var(--color-warning) / 0.08)"
              />
              
              {/* Normal zone - very subtle */}
              <rect
                x="0"
                y={getYPosition(warningBand.high)}
                width="100"
                height={getYPosition(warningBand.low) - getYPosition(warningBand.high)}
                fill="rgb(var(--color-success) / 0.05)"
              />
              
              {/* Baseline - subtle dashed line */}
              <line
                x1="0"
                y1={getYPosition(avgValue)}
                x2="100"
                y2={getYPosition(avgValue)}
                stroke="rgb(var(--color-border))"
                strokeWidth="0.2"
                strokeDasharray="2,3"
                opacity="0.5"
              />
              
              {/* Warning threshold lines - subtle */}
              <line
                x1="0"
                y1={getYPosition(warningBand.high)}
                x2="100"
                y2={getYPosition(warningBand.high)}
                stroke="rgb(var(--color-warning))"
                strokeWidth="0.2"
                strokeDasharray="1,2"
                opacity="0.4"
              />
              <line
                x1="0"
                y1={getYPosition(warningBand.low)}
                x2="100"
                y2={getYPosition(warningBand.low)}
                stroke="rgb(var(--color-warning))"
                strokeWidth="0.2"
                strokeDasharray="1,2"
                opacity="0.4"
              />
            </>
          )}

          {/* Area fill with gradient - using green color for all charts */}
          <defs>
            <linearGradient id={`areaGradient-${title.replace(/[^a-zA-Z0-9]/g, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
              <stop offset="50%" stopColor="#10b981" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.03" />
            </linearGradient>
          </defs>
          {areaPath && (
            <path
              d={areaPath}
              fill={`url(#areaGradient-${title.replace(/[^a-zA-Z0-9]/g, '')})`}
            />
          )}

          {/* Budget line if provided */}
          {budget && budgetPath && (
            <path
              d={budgetPath}
              fill="none"
              stroke="rgb(var(--color-warning))"
              strokeWidth="0.4"
              strokeDasharray="3,3"
              opacity="0.7"
            />
          )}

          {/* IBCS: Variance shading between actual and plan */}
          {ibcsMode && varianceShadingPath && (
            <path
              d={varianceShadingPath}
              fill={`${IBCSColors.variance.neutral}20`}
              stroke="none"
            />
          )}

          {/* IBCS: Plan line overlay */}
          {(ibcsMode || planPath) && planPath && (
            <path
              d={planPath}
              fill="none"
              stroke={IBCSColors.planStroke}
              strokeWidth="0.5"
              strokeDasharray="4,2"
              opacity="0.8"
            />
          )}

          {/* IBCS: Forecast line (hatched style) */}
          {(ibcsMode || forecastPath) && forecastPath && (
            <path
              d={forecastPath}
              fill="none"
              stroke={IBCSColors.forecast}
              strokeWidth="0.5"
              strokeDasharray="2,2"
              opacity="0.7"
            />
          )}

          {/* Moving average line */}
          {showMA && maPath && (
            <path
              d={maPath}
              fill="none"
              stroke="rgb(var(--color-text-muted))"
              strokeWidth="0.4"
              opacity="0.6"
            />
          )}

          {/* Main line */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#10b981"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Hover vertical line */}
          {hoveredPointIndex !== null && (
            <line
              x1={getXPosition(hoveredPointIndex)}
              y1="0"
              x2={getXPosition(hoveredPointIndex)}
              y2={chartHeight}
              stroke="rgb(var(--color-text-muted))"
              strokeWidth="0.3"
              strokeDasharray="3,3"
              opacity="0.6"
            />
          )}

        </svg>

        {/* Data points - rendered as HTML elements to avoid SVG stretching */}
        {processedData.map((point, i) => {
          if (i % markerStride !== 0 && i !== processedData.length - 1 && i !== hoveredPointIndex) return null;
          const xPercent = getXPosition(i);
          const yPercent = (getYPosition(point.value) / chartHeight) * 100;
          const isAnomaly = point.status !== 'normal';
          const pointColor = getPointColor(point.status);
          const isHovered = hoveredPointIndex === i;
          const previousValue = i > 0 ? processedData[i - 1].value : undefined;
          
          return (
            <div
              key={`${point.period}-${i}`}
              data-chart-point={i}
              className="absolute cursor-pointer group"
              style={{
                left: `${xPercent}%`,
                top: `${yPercent}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: isHovered ? 20 : isAnomaly ? 10 : 1,
                pointerEvents: 'auto',
              }}
              onMouseEnter={(e) => handlePointEnter(i, e)}
              onMouseMove={handlePointMove}
              onMouseLeave={handlePointLeave}
            >
              {/* Hover hit area - larger for easier interaction */}
              <div 
                className="absolute rounded-full"
                style={{
                  width: '24px',
                  height: '24px',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
              />
              
              {/* Outer ring for anomalies */}
              {isAnomaly && !isHovered && (
                <div
                  className="absolute inset-0 animate-ping rounded-full"
                  style={{
                    width: '12px',
                    height: '12px',
                    margin: '-3px',
                    border: `2px solid ${pointColor}`,
                    opacity: 0.6,
                  }}
                />
              )}
              
              {/* Hover ring */}
              {isHovered && (
                <div
                  className="absolute rounded-full transition-all duration-150"
                  style={{
                    width: '18px',
                    height: '18px',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    border: `2px solid ${pointColor}`,
                    backgroundColor: `${pointColor}20`,
                  }}
                />
              )}
              
              {/* Main point */}
              <div
                className="rounded-full transition-all duration-150"
                style={{
                  width: isHovered ? '10px' : isAnomaly ? '8px' : '6px',
                  height: isHovered ? '10px' : isAnomaly ? '8px' : '6px',
                  backgroundColor: pointColor,
                  boxShadow: isHovered ? `0 0 12px ${pointColor}` : undefined,
                }}
              />
            </div>
          );
        })}
        
        {/* Tooltip */}
        {hoveredPointIndex !== null && processedData[hoveredPointIndex] && (
          <ChartTooltip visible={true} position={tooltipPosition}>
            <DataPointTooltip
              label={processedData[hoveredPointIndex].period}
              value={processedData[hoveredPointIndex].value}
              previousValue={hoveredPointIndex > 0 ? processedData[hoveredPointIndex - 1].value : undefined}
              format="currency"
              trend={
                hoveredPointIndex > 0 
                  ? processedData[hoveredPointIndex].value > processedData[hoveredPointIndex - 1].value 
                    ? 'up' 
                    : processedData[hoveredPointIndex].value < processedData[hoveredPointIndex - 1].value 
                      ? 'down' 
                      : 'stable'
                  : undefined
              }
              status={
                processedData[hoveredPointIndex].status === 'critical' || processedData[hoveredPointIndex].status === 'outlier'
                  ? 'critical'
                  : processedData[hoveredPointIndex].status === 'warning'
                    ? 'warning'
                    : 'normal'
              }
              additionalInfo={[
                { 
                  label: isEn ? 'Moving Avg' : 'Moy. mobile', 
                  value: formatCurrencyValue(movingAverage[hoveredPointIndex], graphConfig.display)
                },
                ...(processedData[hoveredPointIndex].deviation > 0 ? [{
                  label: isEn ? 'Deviation' : 'Écart',
                  value: formatPercentageValue(processedData[hoveredPointIndex].deviation, graphConfig.display)
                }] : []),
                ...(budget && budget[hoveredPointIndex] ? [{
                  label: 'Budget',
                  value: formatCurrencyValue(budget[hoveredPointIndex], graphConfig.display)
                }] : []),
              ]}
            />
          </ChartTooltip>
        )}

        {/* Y-axis labels */}
        <div 
          className="absolute left-0 top-0 text-[10px] font-mono"
          style={{ color: 'rgb(var(--color-text-muted))' }}
        >
          {formatCurrencyValue(maxValue, graphConfig.display)}
        </div>
        <div 
          className="absolute left-0 bottom-0 text-[10px] font-mono"
          style={{ color: 'rgb(var(--color-text-muted))' }}
        >
          {formatCurrencyValue(minValue, graphConfig.display)}
        </div>
      </div>

      {/* X-axis labels */}
      <div className="relative h-8 mt-2">
        {processedData.map((point, i) => (i % labelStride === 0 || i === processedData.length - 1) && (
          <div 
            key={`${point.period}-${i}`}
            data-chart-label={i}
            title={point.period}
            className="absolute text-center max-w-[18%] truncate"
            style={{ 
              left: `${getXPosition(i)}%`,
              transform: 'translateX(-50%)',
              color: point.status !== 'normal' 
                ? getPointColor(point.status) 
                : 'rgb(var(--color-text-muted))'
            }}
          >
            <span className="text-[10px]">{point.period}</span>
            {point.status !== 'normal' && (
              <AlertTriangle className="w-3 h-3 mx-auto" />
            )}
          </div>
        ))}
      </div>

      {/* Key Stats Row */}
      <div 
        className="flex items-center justify-between mt-4 pt-3 text-xs"
        style={{ borderTop: '1px solid rgb(var(--color-border))' }}
      >
        <div className="flex items-center gap-4">
          <div>
            <span style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Avg: ' : 'Moy: '}</span>
            <span className="font-mono tabular-nums" style={{ color: 'rgb(var(--color-text))' }}>
              {formatCurrencyValue(avgValue, graphConfig.display)}
            </span>
          </div>
          <div>
            <span style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Volatility: ' : 'Volatilité: '}</span>
            <span 
              className="font-mono tabular-nums"
              style={{ 
                color: volatility > 20 
                  ? 'rgb(var(--color-warning))' 
                  : 'rgb(var(--color-text))'
              }}
            >
              {volatility.toFixed(1)}%
            </span>
          </div>
        </div>
        
        {/* Trend indicator */}
        <div 
          className="flex items-center gap-1 px-2 py-1 rounded"
          style={{ 
            backgroundColor: trend === 'up' 
              ? 'rgb(var(--color-success) / 0.1)' 
              : trend === 'down' 
              ? 'rgb(var(--color-error) / 0.1)' 
              : 'rgb(var(--color-bg-muted))',
            color: trend === 'up' 
              ? 'rgb(var(--color-success))' 
              : trend === 'down' 
              ? 'rgb(var(--color-error))' 
              : 'rgb(var(--color-text-muted))'
          }}
        >
          {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : trend === 'down' ? <TrendingDown className="w-3 h-3" /> : null}
          {isEn 
            ? (trend === 'up' ? 'Upward' : trend === 'down' ? 'Downward' : 'Stable')
            : (trend === 'up' ? 'Haussière' : trend === 'down' ? 'Baissière' : 'Stable')}
        </div>
      </div>

      {/* Anomaly details */}
      {outliers.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {isEn ? 'Detected anomalies:' : 'Anomalies détectées:'}
          </p>
          {outliers.slice(0, 3).map((anomaly, i) => (
            <div 
              key={i}
              className="text-xs p-2 rounded"
              style={{ 
                backgroundColor: 'rgb(var(--color-error) / 0.08)',
                color: 'rgb(var(--color-error))'
              }}
            >
              <span className="font-medium">{anomaly.affectedPeriod}:</span>{' '}
              {anomaly.description}
            </div>
          ))}
        </div>
      )}

      {/* Recent decisions */}
      {recentDecisions && recentDecisions.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {isEn ? 'Recent decisions:' : 'Décisions récentes:'}
          </p>
          {recentDecisions.slice(0, 2).map((decision) => (
            <div 
              key={decision.id}
              className="text-xs p-2 rounded flex items-start gap-2"
              style={{ 
                backgroundColor: 'rgb(var(--color-success) / 0.08)',
                color: 'rgb(var(--color-success))'
              }}
            >
              <Target className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-medium">{decision.decision.description.slice(0, 50)}{decision.decision.description.length > 50 ? '...' : ''}</span>
                <div className="text-[10px] mt-0.5 opacity-80">
                  {isEn ? 'Expected:' : 'Attendu:'} ${decision.decision.expectedImpact.toLocaleString()}/{decision.decision.expectedImpactPeriod === 'monthly' ? (isEn ? 'mo' : 'mois') : decision.decision.expectedImpactPeriod === 'quarterly' ? (isEn ? 'qtr' : 'trim') : (isEn ? 'yr' : 'an')}
                  {decision.outcome && (
                    <span className="ml-2">
                      {decision.outcome.success 
                        ? (isEn ? '✓ Successful' : '✓ Réussi')
                        : (isEn ? '✗ Needs review' : '✗ À revoir')
                      }
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Configuration Panel */}
      {showConfigPanel && (
        <GraphConfigPanel
          chartId={effectiveChartId}
          chartName={isEn && titleEn ? titleEn : title}
          currentConfig={graphConfig}
          onClose={() => setShowConfigPanel(false)}
        />
      )}

      {/* Share Modal - opens even without image if capture failed */}
      {showShareModal && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => {
            setShowShareModal(false);
            setCapturedImage(null);
            setShareError(null);
          }}
          title={isEn && titleEn ? titleEn : title}
          subtitle={subtitle || subtitleEn}
          contentType="chart"
          imageData={capturedImage || undefined}
          shareUrl={`${window.location.origin}/share/chart/${chartId || title.toLowerCase().replace(/\s/g, '-')}`}
          message={shareError || undefined}
        />
      )}
    </div>
  );
}
