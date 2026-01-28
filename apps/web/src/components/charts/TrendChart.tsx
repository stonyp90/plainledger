import { useMemo, useState, useRef } from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, Settings2 } from 'lucide-react';
import { 
  DEFAULT_THRESHOLDS, 
  formatCurrency,
  ThresholdConfig,
  detectOutliers,
  FinancialDataPoint,
} from '../../lib/anomalyDetection';
import { ChartTooltip, DataPointTooltip } from './ChartTooltip';

interface TrendChartProps {
  data: FinancialDataPoint[];
  title: string;
  titleEn?: string;
  subtitle?: string;
  subtitleEn?: string;
  baseline?: number;
  budget?: number[]; // Optional budget line for comparison
  thresholds?: ThresholdConfig;
  showThresholdBands?: boolean;
  showMovingAverage?: boolean;
  movingAveragePeriod?: number;
  height?: number;
  color?: string;
  isEn?: boolean;
}

export default function TrendChart({
  data,
  title,
  titleEn,
  subtitle,
  subtitleEn,
  baseline,
  budget,
  thresholds = DEFAULT_THRESHOLDS,
  showThresholdBands = true,
  showMovingAverage = true,
  movingAveragePeriod = 3,
  height = 200,
  color = 'rgb(var(--color-text))',
  isEn = false,
}: TrendChartProps) {
  const [showBands, setShowBands] = useState(showThresholdBands);
  const [showMA, setShowMA] = useState(showMovingAverage);
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const chartRef = useRef<HTMLDivElement>(null);

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
    const min = Math.min(...values);
    const max = Math.max(...values);
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
      const trendChange = ((recentAvg - olderAvg) / olderAvg) * 100;
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
      rangeMin = Math.min(rangeMin, ...budget) * 0.95;
      rangeMax = Math.max(rangeMax, ...budget) * 1.05;
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

  // Early return for empty or insufficient data - must be after all hooks
  if (!data || data.length === 0) {
    return (
      <div 
        className="rounded-xl p-4 sm:p-5"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          border: '1px solid rgb(var(--color-border))'
        }}
      >
        <h3 
          className="font-semibold mb-2"
          style={{ color: 'rgb(var(--color-text))' }}
        >
          {isEn && titleEn ? titleEn : title}
        </h3>
        <div 
          className="flex items-center justify-center"
          style={{ height: `${height}px`, color: 'rgb(var(--color-text-muted))' }}
        >
          {isEn ? 'No data available' : 'Aucune donnée disponible'}
        </div>
      </div>
    );
  }

  const getYPosition = (value: number) => {
    const range = maxValue - minValue;
    // Handle case where all values are the same (range = 0)
    if (range === 0 || !isFinite(range)) {
      return height / 2;
    }
    return height - ((value - minValue) / range) * height;
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
    ? `${linePath} L ${getXPosition(data.length - 1)} ${height} L ${getXPosition(0)} ${height} Z`
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

  return (
    <div 
      className="rounded-xl p-4 sm:p-5"
      style={{ 
        backgroundColor: 'rgb(var(--color-surface))',
        border: '1px solid rgb(var(--color-border))'
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
        
        {/* Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowMA(!showMA)}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors"
            style={{ 
              backgroundColor: showMA ? 'rgb(var(--color-text) / 0.1)' : 'rgb(var(--color-bg-muted))',
              color: 'rgb(var(--color-text-secondary))'
            }}
            title={isEn ? `${movingAveragePeriod}-period MA` : `MM ${movingAveragePeriod} périodes`}
          >
            MA
          </button>
          <button
            onClick={() => setShowBands(!showBands)}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors"
            style={{ 
              backgroundColor: showBands ? 'rgb(var(--color-text) / 0.1)' : 'rgb(var(--color-bg-muted))',
              color: 'rgb(var(--color-text-secondary))'
            }}
          >
            <Settings2 className="w-3 h-3" />
            {isEn ? 'Thresholds' : 'Seuils'}
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 sm:gap-4 mb-3 text-[10px] sm:text-xs flex-wrap" style={{ color: 'rgb(var(--color-text-muted))' }}>
        <span className="flex items-center gap-1">
          <span 
            className="w-6 h-0.5 rounded"
            style={{ backgroundColor: color }}
          />
          {isEn ? 'Actual' : 'Réel'}
        </span>
        {showMA && (
          <span className="flex items-center gap-1">
            <span 
              className="w-6 h-0.5 rounded"
              style={{ backgroundColor: 'rgb(var(--color-text-muted))', opacity: 0.6 }}
            />
            MA({movingAveragePeriod})
          </span>
        )}
        {budget && (
          <span className="flex items-center gap-1">
            <span 
              className="w-6 h-0.5 rounded"
              style={{ backgroundColor: 'rgb(var(--color-warning))', borderStyle: 'dashed' }}
            />
            Budget
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
      <div ref={chartRef} className="relative" style={{ height: `${height}px` }}>
        <svg 
          viewBox={`0 0 100 ${height}`} 
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

          {/* Area fill with gradient */}
          <defs>
            <linearGradient id={`areaGradient-${title.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.35" />
              <stop offset="50%" stopColor={color} stopOpacity="0.15" />
              <stop offset="100%" stopColor={color} stopOpacity="0.03" />
            </linearGradient>
          </defs>
          {areaPath && (
            <path
              d={areaPath}
              fill={`url(#areaGradient-${title.replace(/\s/g, '')})`}
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
              stroke={color}
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
              y2={height}
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
          const yPercent = (getYPosition(point.value) / height) * 100;
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
              }}
              onMouseEnter={(e) => {
                setHoveredPointIndex(i);
                setTooltipPosition({ x: e.clientX, y: e.clientY });
              }}
              onMouseMove={(e) => {
                setTooltipPosition({ x: e.clientX, y: e.clientY });
              }}
              onMouseLeave={() => setHoveredPointIndex(null)}
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
                  value: formatCurrency(movingAverage[hoveredPointIndex]) 
                },
                ...(processedData[hoveredPointIndex].deviation > 0 ? [{
                  label: isEn ? 'Deviation' : 'Écart',
                  value: `${processedData[hoveredPointIndex].deviation.toFixed(1)}%`
                }] : []),
                ...(budget && budget[hoveredPointIndex] ? [{
                  label: 'Budget',
                  value: formatCurrency(budget[hoveredPointIndex])
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
          {formatCurrency(maxValue)}
        </div>
        <div 
          className="absolute left-0 bottom-0 text-[10px] font-mono"
          style={{ color: 'rgb(var(--color-text-muted))' }}
        >
          {formatCurrency(minValue)}
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
              {formatCurrency(avgValue)}
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
    </div>
  );
}
