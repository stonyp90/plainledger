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
import { AlertTriangle, TrendingUp, TrendingDown, Settings2, Target, Share2, Maximize2, Minimize2 } from 'lucide-react';
import { 
  DEFAULT_THRESHOLDS, 
  formatCurrency,
  ThresholdConfig,
  detectOutliers,
  FinancialDataPoint,
} from '../../lib/anomalyDetection';
import { ChartTooltip, DataPointTooltip } from './ChartTooltip';
import { ChartEmptyState } from '../EmptyDataState';
import type { DataMetric, DecisionEvent } from '../../lib/decisionContext';
import { useGraphConfig } from '../../hooks/useGraphConfig';
import { formatCurrencyValue, formatPercentageValue } from '../../lib/graphConfig';
import GraphConfigPanel from './GraphConfigPanel';
import { IBCSLegendCompact } from './ibcs/IBCSLegend';
import { IBCSColors } from '../../lib/ibcs';
import { useChartCapture } from '../../hooks/useChartCapture';
import ShareModal from '../ShareModal';

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
  data,
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
  
  // Generate stable chart ID for config persistence
  const effectiveChartId = chartId || `trend-${title.toLowerCase().replace(/\s/g, '-')}`;
  
  // Use config values with prop overrides
  const height = propHeight ?? graphConfig.visual.height;
  const thresholds = propThresholds || graphConfig.cpa.thresholds;
  const showThresholdBands = propShowThresholdBands ?? graphConfig.visual.showThresholdBands;
  const showMovingAverage = propShowMovingAverage ?? graphConfig.visual.showMovingAverage;
  const movingAveragePeriod = propMovingAveragePeriod ?? graphConfig.visual.movingAveragePeriod;
  
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
    
    const values = data.map(d => d.value ?? 0);
    const min = values.length > 0 ? Math.min(...values) : 0;
    const max = values.length > 0 ? Math.max(...values) : 0;
    const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    const base = baseline || avg;
    
    // Calculate bands
    const warningLow = base * (1 - thresholds.varianceWarning / 100);
    const warningHigh = base * (1 + thresholds.varianceWarning / 100);
    const criticalLow = base * (1 - thresholds.varianceCritical / 100);
    const criticalHigh = base * (1 + thresholds.varianceCritical / 100);
    
    // Calculate moving average
    const ma: number[] = [];
    for (let i = 0; i < values.length; i++) {
      if (i < movingAveragePeriod - 1) {
        ma.push(values.slice(0, i + 1).reduce((a, b) => a + b, 0) / (i + 1));
      } else {
        ma.push(values.slice(i - movingAveragePeriod + 1, i + 1).reduce((a, b) => a + b, 0) / movingAveragePeriod);
      }
    }
    
    // Calculate volatility (standard deviation)
    const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const volatilityPct = (stdDev / avg) * 100;
    
    // Detect outliers
    const detectedOutliers = detectOutliers(data, title);
    const outlierPeriods = new Set(detectedOutliers.map(o => o.affectedPeriod));
    
    // Calculate trend
    let trendDirection: 'up' | 'down' | 'stable' = 'stable';
    if (data.length >= 3) {
      const recentAvg = values.slice(-3).reduce((a, b) => a + b, 0) / 3;
      const olderAvg = values.slice(0, -3).reduce((a, b) => a + b, 0) / Math.max(1, values.length - 3);
      const trendChange = olderAvg !== 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;
      if (trendChange > 5) trendDirection = 'up';
      else if (trendChange < -5) trendDirection = 'down';
    }
    
    // Calculate period-over-period change
    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    const pctChange = firstValue !== 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;
    
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
    let rangeMin = Math.min(min, criticalLow) * 0.95;
    let rangeMax = Math.max(max, criticalHigh) * 1.05;
    
    if (budget && budget.length > 0) {
      const budgetValues = budget.filter(b => b != null && !isNaN(b));
      if (budgetValues.length > 0) {
        rangeMin = Math.min(rangeMin, ...budgetValues) * 0.95;
        rangeMax = Math.max(rangeMax, ...budgetValues) * 1.05;
      }
    }
    
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
  }, [data, baseline, budget, thresholds, title, movingAveragePeriod]);

  // Early return - hide chart completely if no data
  if (!data || data.length === 0) {
    return null;
  }

  // Dynamic height for fullscreen mode
  const chartHeight = isFullscreen ? Math.min(window.innerHeight - 300, 600) : height;

  const getYPosition = (value: number, customHeight?: number) => {
    const h = customHeight ?? chartHeight;
    const range = maxValue - minValue;
    // Handle case where all values are the same (range = 0)
    if (range === 0 || !isFinite(range)) {
      return h / 2;
    }
    return h - ((value - minValue) / range) * h;
  };

  const getXPosition = (index: number) => {
    const padding = 40;
    const width = 100 - padding;
    // Handle case where there's only one data point
    if (data.length <= 1) {
      return 50; // Center the single point
    }
    return padding / 2 + (index / (data.length - 1)) * width;
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
      ref={chartRef}
      className={`rounded-lg sm:rounded-xl p-2.5 sm:p-3 lg:p-4 transition-all duration-200 hover:shadow-md group flex flex-col ${
        isFullscreen ? 'fixed inset-0 overflow-auto' : ''
      }`}
      style={{ 
        backgroundColor: 'rgb(var(--color-surface))',
        border: isFullscreen ? 'none' : '1px solid rgb(var(--color-border))',
        borderRadius: isFullscreen ? 0 : undefined,
        zIndex: isFullscreen ? 9998 : undefined,
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
      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 
              className="font-semibold"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {isEn && titleEn ? titleEn : title}
            </h3>
            
            {/* Key metrics inline */}
            <span 
              className="text-sm font-mono tabular-nums flex items-center gap-1"
              style={{ 
                color: percentChange >= 0 
                  ? 'rgb(var(--color-success))' 
                  : 'rgb(var(--color-error))'
              }}
            >
              {percentChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {percentChange >= 0 ? '+' : ''}{percentChange.toFixed(1)}%
            </span>
            
            {outliers.length > 0 && (
              <span 
                className="text-xs flex items-center gap-1 px-2 py-0.5 rounded"
                style={{ 
                  backgroundColor: 'rgb(var(--color-error) / 0.1)',
                  color: 'rgb(var(--color-error))'
                }}
              >
                <AlertTriangle className="w-3 h-3" />
                {outliers.length} {isEn ? 'anomal' + (outliers.length > 1 ? 'ies' : 'y') : 'anomalie' + (outliers.length > 1 ? 's' : '')}
              </span>
            )}
          </div>
          {(subtitle || subtitleEn) && (
            <p 
              className="text-sm mt-0.5"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {isEn && subtitleEn ? subtitleEn : subtitle}
            </p>
          )}
        </div>
        
        {/* Controls - hover reveal on desktop, simplified on mobile */}
        <div className="flex items-center gap-0.5">
          {/* Fullscreen - Desktop only */}
          <button
            onClick={toggleFullscreen}
            className={`hidden sm:flex p-1.5 rounded-md transition-all duration-200 opacity-0 group-hover:opacity-70 hover:opacity-100 focus:opacity-100 ${isFullscreen ? '!opacity-100' : ''}`}
            style={{ 
              backgroundColor: isFullscreen ? 'rgb(var(--color-primary-500) / 0.1)' : 'transparent',
              color: isFullscreen ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text-muted))'
            }}
            title={isEn ? (isFullscreen ? 'Exit fullscreen' : 'Fullscreen') : (isFullscreen ? 'Quitter plein écran' : 'Plein écran')}
            aria-label={isEn ? (isFullscreen ? 'Exit fullscreen' : 'Fullscreen') : (isFullscreen ? 'Quitter plein écran' : 'Plein écran')}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          {/* Share - Desktop only (hover reveal) */}
          <button
            onClick={handleShareClick}
            disabled={isCapturing}
            className={`hidden sm:flex p-1.5 rounded-md transition-all duration-200 opacity-0 group-hover:opacity-70 hover:opacity-100 focus:opacity-100 ${isFullscreen ? '!opacity-100' : ''} ${isCapturing ? '!opacity-30 cursor-wait' : ''}`}
            style={{ 
              backgroundColor: 'transparent',
              color: 'rgb(var(--color-text-muted))'
            }}
            title={isEn ? 'Share chart' : 'Partager le graphique'}
            aria-label={isEn ? 'Share chart' : 'Partager le graphique'}
          >
            {isCapturing ? (
              <span className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin block" />
            ) : (
              <Share2 className="w-3.5 h-3.5" />
            )}
          </button>
          {/* Config - Desktop only (hover reveal) */}
          <button
            onClick={() => setShowConfigPanel(true)}
            className={`hidden sm:flex p-1.5 rounded-md transition-all duration-200 opacity-0 group-hover:opacity-70 hover:opacity-100 focus:opacity-100 ${isFullscreen ? '!opacity-100' : ''}`}
            style={{ 
              backgroundColor: 'transparent',
              color: 'rgb(var(--color-text-muted))'
            }}
            title={isEn ? 'Configure chart' : 'Configurer le graphique'}
            aria-label={isEn ? 'Configure chart' : 'Configurer le graphique'}
          >
            <Settings2 className="w-3.5 h-3.5" />
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

      {/* Legend - IBCS notation when enabled */}
      <div className="flex items-center gap-3 sm:gap-4 mb-3 text-[10px] sm:text-xs flex-wrap" style={{ color: 'rgb(var(--color-text-muted))' }}>
        {ibcsMode && showIBCSLegend ? (
          <IBCSLegendCompact />
        ) : (
          <span className="flex items-center gap-1">
            <span 
              className="w-6 h-0.5 rounded"
              style={{ backgroundColor: '#10b981' }}
            />
            {isEn ? 'Actual' : 'Réel'}
          </span>
        )}
        {showMA && (
          <span className="flex items-center gap-1">
            <span 
              className="w-6 h-0.5 rounded"
              style={{ backgroundColor: 'rgb(var(--color-text-muted))', opacity: 0.6 }}
            />
            MA({movingAveragePeriod})
          </span>
        )}
        {(budget || planData) && (
          <span className="flex items-center gap-1">
            <span 
              className="w-6 h-0.5 rounded"
              style={{ 
                backgroundColor: ibcsMode ? IBCSColors.planStroke : 'rgb(var(--color-warning))', 
                borderStyle: 'dashed' 
              }}
            />
            {ibcsMode ? 'PL' : 'Budget'}
          </span>
        )}
        {forecastData && (
          <span className="flex items-center gap-1">
            <span 
              className="w-6 h-0.5 rounded"
              style={{ backgroundColor: IBCSColors.forecast, borderStyle: 'dotted' }}
            />
            {ibcsMode ? 'FC' : (isEn ? 'Forecast' : 'Prévision')}
          </span>
        )}
        {showBands && (
          <>
            <span className="flex items-center gap-1">
              <span 
                className="w-3 h-3 rounded"
                style={{ backgroundColor: 'rgb(var(--color-success) / 0.15)' }}
              />
              {isEn ? 'Normal' : 'Normal'}
            </span>
            <span className="flex items-center gap-1">
              <span 
                className="w-3 h-3 rounded"
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
          const xPercent = getXPosition(i);
          const yPercent = (getYPosition(point.value) / chartHeight) * 100;
          const isAnomaly = point.status !== 'normal';
          const pointColor = getPointColor(point.status);
          const isHovered = hoveredPointIndex === i;
          const previousValue = i > 0 ? processedData[i - 1].value : undefined;
          
          return (
            <div
              key={point.period}
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
      <div className="flex justify-between mt-2">
        {processedData.map((point, i) => (
          <div 
            key={point.period}
            className="text-center"
            style={{ 
              width: `${100 / data.length}%`,
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
