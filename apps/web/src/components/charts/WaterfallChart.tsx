/**
 * Waterfall Chart - Essential for Cash Flow Analysis
 * Shows how values build up or break down step by step
 * Perfect for understanding cash flow movements, profit/loss composition
 * 
 * IBCS Enhanced:
 * - Optional plan values for AC|PL comparison
 * - Variance pins showing percentage differences
 * - IBCS-compliant bar styling
 * - Bilingual support (EN/FR)
 */

import { useMemo, useState, useRef, useCallback } from 'react';
import { ArrowUp, ArrowDown, AlertTriangle, TrendingUp, TrendingDown, Target, Settings2 } from 'lucide-react';
import { ChartTooltip } from './ChartTooltip';
import type { DataMetric, DecisionEvent } from '../../lib/decisionContext';
import { useGraphConfig } from '../../hooks/useGraphConfig';
import { formatCurrencyValue } from '../../lib/graphConfig';
import GraphConfigPanel from './GraphConfigPanel';
import { VariancePinCompact } from './ibcs/VariancePin';
import { IBCSLegendCompact } from './ibcs/IBCSLegend';
import { IBCSColors, calculateVariance, type IBCSMetricType } from '../../lib/ibcs';

interface WaterfallItem {
  label: string;
  labelEn?: string;
  value: number;
  /** Optional plan value for IBCS AC|PL comparison */
  planValue?: number;
  type: 'start' | 'increase' | 'decrease' | 'subtotal' | 'end';
  category?: string;
  /** Metric type for variance coloring (expense = favorable when under) */
  metricType?: IBCSMetricType;
}

interface WaterfallChartProps {
  data: WaterfallItem[];
  title: string;
  titleEn?: string;
  subtitle?: string;
  subtitleEn?: string;
  formatValue?: (value: number) => string;
  showVarianceThreshold?: number; // Highlight items exceeding this % of total
  height?: number;
  isEn?: boolean;
  /** Chart ID for configuration persistence */
  chartId?: string;
  
  // IBCS Mode
  /** Enable IBCS-compliant display with variance pins and AC|PL comparison */
  ibcsMode?: boolean;
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
  /** Metric type for decision context */
  metricType?: DataMetric;
  /** Benchmark value for decision context */
  benchmarkValue?: number;
}

export default function WaterfallChart({
  data,
  title,
  titleEn,
  subtitle,
  subtitleEn,
  formatValue: propFormatValue,
  showVarianceThreshold: propShowVarianceThreshold,
  height: propHeight,
  isEn = false,
  chartId,
  ibcsMode: propIBCSMode = false,
  showIBCSLegend: propShowIBCSLegend = true,
  enableDecisions = false,
  onRecordDecision,
  metricType = 'cash_flow',
  benchmarkValue,
}: WaterfallChartProps) {
  // Early return - hide chart completely if no data
  if (!data || data.length === 0) {
    return null;
  }

  // Get graph configuration
  const graphConfig = useGraphConfig(chartId, {
    visual: {
      height: propHeight ?? 280,
    },
    ibcs: {
      enabled: propIBCSMode,
      showVariancePins: propIBCSMode,
      showLegend: propShowIBCSLegend ?? true,
    },
    waterfall: {
      varianceThreshold: propShowVarianceThreshold ?? 20,
    },
  });
  
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [chartConfig, setChartConfig] = useState({});
  
  const height = propHeight ?? graphConfig.visual.height;
  const showVarianceThreshold = propShowVarianceThreshold ?? graphConfig.waterfall?.varianceThreshold ?? 20;
  
  // Use config values, falling back to props
  const ibcsMode = graphConfig.ibcs?.enabled ?? propIBCSMode;
  const showIBCSLegend = graphConfig.ibcs?.showLegend ?? propShowIBCSLegend;
  
  // Use config-based formatting if no custom formatter provided
  const formatValue = propFormatValue || ((v) => formatCurrencyValue(v, graphConfig.display));

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced hover handlers to prevent flickering
  const handleBarEnter = useCallback((index: number, e: React.MouseEvent) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setHoveredIndex(index);
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
    setTooltipPosition({ x: rect.left + rect.width / 2, y: rect.top });
  }, []);

  const handleBarMove = useCallback((e: React.MouseEvent) => {
    setTooltipPosition({ x: e.clientX, y: e.clientY });
  }, []);

  const handleBarLeave = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredIndex(null);
    }, 50);
  }, []);

  const {
    processedData,
    maxCumulative,
    minCumulative,
    totalChange,
    significantItems,
    hasIBCSData,
    totalVariance,
  } = useMemo(() => {
    let cumulative = 0;
    let maxCum = 0;
    let minCum = 0;
    let hasPlanData = false;
    
    const processed = data.map((item, index) => {
      let start = cumulative;
      let end = cumulative;
      
      if (item.type === 'start' || item.type === 'subtotal' || item.type === 'end') {
        start = 0;
        end = item.value;
        cumulative = item.value;
      } else {
        end = cumulative + item.value;
        cumulative = end;
      }
      
      maxCum = Math.max(maxCum, start, end);
      minCum = Math.min(minCum, start, end);
      
      // Calculate IBCS variance if plan value exists
      let variance = null;
      if (item.planValue !== undefined) {
        hasPlanData = true;
        const itemMetricType = item.metricType || (item.type === 'decrease' ? 'expense' : 'revenue');
        variance = calculateVariance(item.value, item.planValue, itemMetricType as IBCSMetricType);
        // Include plan in max/min for proper scaling
        maxCum = Math.max(maxCum, item.planValue);
        minCum = Math.min(minCum, item.planValue);
      }
      
      return {
        ...item,
        start,
        end,
        cumulative,
        variance,
      };
    });
    
    // Calculate total change and significant items
    const startValue = data.find(d => d.type === 'start')?.value || 0;
    const endValue = data.find(d => d.type === 'end')?.value || startValue;
    const change = endValue - startValue;
    
    // Calculate total plan variance
    const startPlan = data.find(d => d.type === 'start')?.planValue;
    const endPlan = data.find(d => d.type === 'end')?.planValue;
    const planVariance = (startPlan !== undefined && endPlan !== undefined)
      ? calculateVariance(change, endPlan - (startPlan || 0), 'profit')
      : null;
    
    const significant = processed.filter(item => {
      if (item.type === 'start' || item.type === 'end') return false;
      const pctOfTotal = Math.abs(item.value / Math.abs(change || 1)) * 100;
      return pctOfTotal >= showVarianceThreshold;
    });
    
    return {
      processedData: processed,
      maxCumulative: maxCum * 1.1,
      minCumulative: minCum < 0 ? minCum * 1.1 : 0,
      totalChange: change,
      significantItems: significant,
      hasIBCSData: hasPlanData,
      totalVariance: planVariance,
    };
  }, [data, showVarianceThreshold]);

  const range = maxCumulative - minCumulative;
  const getYPosition = (value: number) => {
    return ((maxCumulative - value) / range) * 100;
  };

  // Calculate bar width to ensure all columns fit in view
  const barWidth = Math.min(55, 550 / data.length);
  const gap = barWidth * 0.35;
  
  // Calculate label rotation based on number of items (more items = more rotation)
  const labelRotation = data.length > 6 ? -35 : data.length > 4 ? -25 : 0;
  const labelBottomPadding = labelRotation !== 0 ? 55 : 30;
  
  // Helper to truncate long labels
  const truncateLabel = (label: string, maxLength: number = 12) => {
    if (label.length <= maxLength) return label;
    return label.substring(0, maxLength - 1) + '…';
  };

  return (
    <div 
      className="rounded-xl p-4 sm:p-5 transition-all duration-200 hover:shadow-md group"
      style={{ 
        backgroundColor: 'rgb(var(--color-surface))',
        border: '1px solid rgb(var(--color-border))'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgb(var(--color-bg-muted))';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'rgb(var(--color-surface))';
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-3">
        <div className="flex-1">
          <h3 
            className="font-semibold"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {isEn && titleEn ? titleEn : title}
          </h3>
          {(subtitle || subtitleEn) && (
            <p 
              className="text-sm mt-0.5"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {isEn && subtitleEn ? subtitleEn : subtitle}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setShowConfigPanel(true)}
            className="p-1.5 rounded-md transition-all duration-200 opacity-0 group-hover:opacity-70 hover:opacity-100 focus:opacity-100"
            style={{ 
              backgroundColor: 'transparent',
              color: 'rgb(var(--color-text-muted))'
            }}
            title={isEn ? 'Configure chart' : 'Configurer le graphique'}
            aria-label={isEn ? 'Configure chart' : 'Configurer le graphique'}
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
          {/* Decision button - subtle, theme-consistent */}
          {enableDecisions && onRecordDecision && (
            <button
              onClick={() => {
                const endItem = data.find(d => d.type === 'end');
                onRecordDecision({
                  metricType,
                  metricLabel: isEn && titleEn ? titleEn : title,
                  chartId: chartId || `waterfall-${title.toLowerCase().replace(/\s/g, '-')}`,
                  currentValue: endItem?.value ?? totalChange,
                  benchmarkValue,
                });
              }}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-all duration-200 hover:scale-[1.02]"
              style={{ 
                backgroundColor: 'rgb(var(--color-success) / 0.08)',
                color: 'rgb(var(--color-success))'
              }}
              title={isEn ? 'Record a decision based on this data' : 'Enregistrer une décision basée sur ces données'}
              aria-label={isEn ? 'Record decision' : 'Enregistrer une décision'}
            >
              <Target className="w-3 h-3" />
              <span className="hidden sm:inline text-[11px]">{isEn ? 'Decide' : 'Décider'}</span>
            </button>
          )}
          
          {/* Net change indicator */}
          <div 
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ 
              backgroundColor: totalChange >= 0 
                ? 'rgb(var(--color-success) / 0.1)' 
                : 'rgb(var(--color-error) / 0.1)'
            }}
          >
            {totalChange >= 0 ? (
              <ArrowUp className="w-4 h-4" style={{ color: 'rgb(var(--color-success))' }} />
            ) : (
              <ArrowDown className="w-4 h-4" style={{ color: 'rgb(var(--color-error))' }} />
            )}
            <span 
              className="text-sm font-semibold tabular-nums"
              style={{ 
                color: totalChange >= 0 
                  ? 'rgb(var(--color-success))' 
                  : 'rgb(var(--color-error))'
              }}
            >
              {formatValue(totalChange)}
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="relative overflow-x-auto" style={{ height: `${height + labelBottomPadding}px` }}>
        <svg 
          viewBox={`0 0 ${data.length * (barWidth + gap) + 40} ${height + labelBottomPadding}`}
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full"
        >
          {/* Zero line if needed */}
          {minCumulative < 0 && (
            <line
              x1="20"
              y1={getYPosition(0) * height / 100}
              x2={data.length * (barWidth + gap) + 20}
              y2={getYPosition(0) * height / 100}
              stroke="rgb(var(--color-border))"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
          )}

          {/* Connecting lines */}
          {processedData.map((item, index) => {
            if (index === 0) return null;
            const prevItem = processedData[index - 1];
            const x1 = 20 + index * (barWidth + gap) - gap;
            const x2 = 20 + index * (barWidth + gap);
            const y = item.type === 'subtotal' || item.type === 'end' 
              ? getYPosition(prevItem.end) 
              : getYPosition(item.start);
            
            return (
              <line
                key={`line-${index}`}
                x1={x1}
                y1={y * height / 100}
                x2={x2}
                y2={y * height / 100}
                stroke="rgb(var(--color-border))"
                strokeWidth="1"
                strokeDasharray="3,3"
              />
            );
          })}

          {/* Bars */}
          {processedData.map((item, index) => {
            const x = 20 + index * (barWidth + gap);
            const isPositive = item.type === 'increase' || 
              (item.type !== 'decrease' && item.value >= 0);
            const isSignificant = significantItems.includes(item);
            const isHovered = hoveredIndex === index;
            
            let barTop, barHeight, fillColor;
            
            if (item.type === 'start' || item.type === 'subtotal' || item.type === 'end') {
              barTop = getYPosition(item.value);
              barHeight = getYPosition(0) - barTop;
              if (barHeight < 0) {
                barTop = getYPosition(0);
                barHeight = Math.abs(barHeight);
              }
              fillColor = 'rgb(var(--color-primary-500))';
            } else {
              if (item.value >= 0) {
                barTop = getYPosition(item.end);
                barHeight = getYPosition(item.start) - barTop;
              } else {
                barTop = getYPosition(item.start);
                barHeight = getYPosition(item.end) - barTop;
              }
              fillColor = isPositive 
                ? 'rgb(var(--color-success))' 
                : 'rgb(var(--color-error))';
            }

            return (
              <g 
                key={item.label}
                className="cursor-pointer"
                style={{ pointerEvents: 'bounding-box' }}
                onMouseEnter={(e) => handleBarEnter(index, e)}
                onMouseMove={handleBarMove}
                onMouseLeave={handleBarLeave}
              >
                {/* Hover background */}
                <rect
                  x={x - 4}
                  y={0}
                  width={barWidth + 8}
                  height={height}
                  fill={isHovered ? 'rgb(var(--color-primary-500) / 0.05)' : 'transparent'}
                  rx="4"
                />
                
                {/* Bar */}
                <rect
                  x={x}
                  y={barTop * height / 100}
                  width={barWidth}
                  height={Math.max(2, barHeight * height / 100)}
                  fill={fillColor}
                  rx="2"
                  opacity={isHovered ? 1 : isSignificant ? 1 : 0.8}
                  style={{
                    filter: isHovered ? `drop-shadow(0 0 8px ${fillColor})` : undefined,
                    transform: isHovered ? 'scaleY(1.02)' : undefined,
                    transformOrigin: 'center',
                    transition: 'all 0.15s ease',
                  }}
                />
                
                {/* Significant item indicator */}
                {isSignificant && !item.variance && (
                  <circle
                    cx={x + barWidth / 2}
                    cy={barTop * height / 100 - 8}
                    r="4"
                    fill="rgb(var(--color-warning))"
                  />
                )}
                
                {/* IBCS Variance Pin - show when item has plan value */}
                {(ibcsMode || hasIBCSData) && item.variance && (
                  <g>
                    {/* Plan reference line */}
                    <line
                      x1={x - 2}
                      y1={getYPosition(item.planValue || 0) * height / 100}
                      x2={x + barWidth + 2}
                      y2={getYPosition(item.planValue || 0) * height / 100}
                      stroke={IBCSColors.planStroke}
                      strokeWidth="1.5"
                      strokeDasharray="3,2"
                    />
                    {/* Variance pin line */}
                    <line
                      x1={x + barWidth + 6}
                      y1={barTop * height / 100 + (barHeight * height / 100) / 2}
                      x2={x + barWidth + 6}
                      y2={getYPosition(item.planValue || 0) * height / 100}
                      stroke={item.variance.favorable ? IBCSColors.variance.favorable : IBCSColors.variance.unfavorable}
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    {/* Variance pin circle */}
                    <circle
                      cx={x + barWidth + 6}
                      cy={item.variance.percentage >= 0 
                        ? Math.min(barTop * height / 100 + (barHeight * height / 100) / 2, getYPosition(item.planValue || 0) * height / 100)
                        : Math.max(barTop * height / 100 + (barHeight * height / 100) / 2, getYPosition(item.planValue || 0) * height / 100)
                      }
                      r="4"
                      fill={item.variance.favorable ? IBCSColors.variance.favorable : IBCSColors.variance.unfavorable}
                    />
                    {/* Variance percentage label */}
                    <text
                      x={x + barWidth + 14}
                      y={(barTop * height / 100 + getYPosition(item.planValue || 0) * height / 100) / 2}
                      fontSize="8"
                      fontFamily="ui-monospace, monospace"
                      fontWeight="600"
                      fill={item.variance.favorable ? IBCSColors.variance.favorable : IBCSColors.variance.unfavorable}
                      dominantBaseline="middle"
                    >
                      {item.variance.percentage >= 0 ? '+' : ''}{item.variance.percentage.toFixed(0)}%
                    </text>
                  </g>
                )}

                {/* Value label */}
                <text
                  x={x + barWidth / 2}
                  y={
                    item.value >= 0 
                      ? barTop * height / 100 - 6 
                      : (barTop + barHeight) * height / 100 + 14
                  }
                  textAnchor="middle"
                  className="text-[9px] font-mono tabular-nums"
                  fill={isHovered ? 'rgb(var(--color-text))' : 'rgb(var(--color-text-secondary))'}
                  style={{ fontWeight: isHovered ? 600 : 400 }}
                >
                  {formatValue(item.value)}
                </text>

                {/* Column label - directly below the bar */}
                <text
                  x={x + barWidth / 2}
                  y={height + 12}
                  textAnchor={labelRotation !== 0 ? 'end' : 'middle'}
                  className="text-[9px] font-medium"
                  fill={
                    isHovered 
                      ? 'rgb(var(--color-primary-500))'
                      : item.type === 'start' || item.type === 'end' 
                        ? 'rgb(var(--color-text))' 
                        : item.type === 'subtotal'
                        ? 'rgb(var(--color-text-secondary))'
                        : 'rgb(var(--color-text-muted))'
                  }
                  transform={labelRotation !== 0 ? `rotate(${labelRotation}, ${x + barWidth / 2}, ${height + 12})` : undefined}
                >
                  <title>{isEn && item.labelEn ? item.labelEn : item.label}</title>
                  {truncateLabel(isEn && item.labelEn ? item.labelEn : item.label, data.length > 8 ? 10 : 14)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Tooltip */}
      {hoveredIndex !== null && processedData[hoveredIndex] && (
        <ChartTooltip visible={true} position={tooltipPosition}>
          <div className="min-w-[200px]">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 mb-2">
              <span 
                className="text-xs font-medium uppercase tracking-wide"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                {processedData[hoveredIndex].type === 'start' 
                  ? (isEn ? 'Starting Balance' : 'Solde initial')
                  : processedData[hoveredIndex].type === 'end'
                    ? (isEn ? 'Ending Balance' : 'Solde final')
                    : processedData[hoveredIndex].type === 'subtotal'
                      ? (isEn ? 'Subtotal' : 'Sous-total')
                      : processedData[hoveredIndex].value >= 0
                        ? (isEn ? 'Inflow' : 'Entrée')
                        : (isEn ? 'Outflow' : 'Sortie')
                }
              </span>
              {significantItems.includes(processedData[hoveredIndex]) && (
                <AlertTriangle className="w-4 h-4" style={{ color: 'rgb(var(--color-warning))' }} />
              )}
            </div>
            
            {/* Label */}
            <p 
              className="font-medium mb-3"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {isEn && processedData[hoveredIndex].labelEn 
                ? processedData[hoveredIndex].labelEn 
                : processedData[hoveredIndex].label}
            </p>
            
            {/* Values */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <span 
                  className="text-sm"
                  style={{ color: 'rgb(var(--color-text-muted))' }}
                >
                  {isEn ? 'Amount' : 'Montant'}
                </span>
                <span 
                  className="font-bold flex items-center gap-1"
                  style={{ color: processedData[hoveredIndex].value >= 0 ? 'rgb(var(--color-success))' : 'rgb(var(--color-error))' }}
                >
                  {processedData[hoveredIndex].value >= 0 
                    ? <TrendingUp className="w-3 h-3" /> 
                    : <TrendingDown className="w-3 h-3" />}
                  {formatValue(processedData[hoveredIndex].value)}
                </span>
              </div>
              
              {processedData[hoveredIndex].type !== 'start' && (
                <>
                  <div className="flex justify-between">
                    <span 
                      className="text-sm"
                      style={{ color: 'rgb(var(--color-text-muted))' }}
                    >
                      {isEn ? 'Running Total' : 'Total cumulé'}
                    </span>
                    <span 
                      className="font-mono"
                      style={{ color: 'rgb(var(--color-text))' }}
                    >
                      {formatValue(processedData[hoveredIndex].cumulative)}
                    </span>
                  </div>
                  
                  {/* Percentage of total change */}
                  {totalChange !== 0 && processedData[hoveredIndex].type !== 'end' && processedData[hoveredIndex].type !== 'subtotal' && (
                    <div 
                      className="flex justify-between pt-2"
                      style={{ borderTop: '1px solid rgb(var(--color-border))' }}
                    >
                      <span 
                        className="text-sm"
                        style={{ color: 'rgb(var(--color-text-muted))' }}
                      >
                        {isEn ? '% of Net Change' : '% du changement net'}
                      </span>
                      <span 
                        className="font-mono"
                        style={{ color: 'rgb(var(--color-text))' }}
                      >
                        {Math.abs((processedData[hoveredIndex].value / totalChange) * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </>
              )}
              
              {/* Category if available */}
              {processedData[hoveredIndex].category && (
                <div 
                  className="flex justify-between pt-2"
                  style={{ borderTop: '1px solid rgb(var(--color-border))' }}
                >
                  <span 
                    className="text-sm"
                    style={{ color: 'rgb(var(--color-text-muted))' }}
                  >
                    {isEn ? 'Category' : 'Catégorie'}
                  </span>
                  <span style={{ color: 'rgb(var(--color-text))' }}>
                    {processedData[hoveredIndex].category}
                  </span>
                </div>
              )}
            </div>
            
            {/* Significant indicator */}
            {significantItems.includes(processedData[hoveredIndex]) && (
              <div 
                className="mt-3 pt-2 text-xs"
                style={{ 
                  borderTop: '1px solid rgb(var(--color-border))',
                  color: 'rgb(var(--color-warning))'
                }}
              >
                ⚠️ {isEn 
                  ? `Significant: >${showVarianceThreshold}% of net change`
                  : `Significatif: >${showVarianceThreshold}% du changement net`}
              </div>
            )}
          </div>
        </ChartTooltip>
      )}

      {/* Legend */}
      <div 
        className="flex items-center justify-center gap-4 mt-4 text-xs"
        style={{ color: 'rgb(var(--color-text-muted))' }}
      >
        {/* IBCS Legend when in IBCS mode or has IBCS data */}
        {(ibcsMode || hasIBCSData) && showIBCSLegend ? (
          <IBCSLegendCompact />
        ) : (
          <>
            <span className="flex items-center gap-1.5">
              <span 
                className="w-3 h-3 rounded"
                style={{ backgroundColor: 'rgb(var(--color-text))' }}
              />
              {isEn ? 'Total' : 'Total'}
            </span>
            <span className="flex items-center gap-1.5">
              <span 
                className="w-3 h-3 rounded"
                style={{ backgroundColor: 'rgb(var(--color-success))' }}
              />
              {isEn ? 'Increase' : 'Augmentation'}
            </span>
            <span className="flex items-center gap-1.5">
              <span 
                className="w-3 h-3 rounded"
                style={{ backgroundColor: 'rgb(var(--color-error))' }}
              />
              {isEn ? 'Decrease' : 'Diminution'}
            </span>
          </>
        )}
        {significantItems.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: 'rgb(var(--color-warning))' }}
            />
            {isEn ? 'Significant' : 'Significatif'}
          </span>
        )}
        {/* Show total variance when IBCS data is available */}
        {totalVariance && (
          <span className="flex items-center gap-1.5 ml-2 pl-2 border-l" style={{ borderColor: 'rgb(var(--color-border))' }}>
            <VariancePinCompact
              variancePct={totalVariance.percentage}
              favorable={totalVariance.favorable}
              height={14}
            />
          </span>
        )}
      </div>
      
      {/* Configuration Panel */}
      {showConfigPanel && (
        <GraphConfigPanel
          chartId={chartId || `waterfall-${title.toLowerCase().replace(/\s/g, '-')}`}
          chartName={isEn && titleEn ? titleEn : title}
          currentConfig={chartConfig}
          onConfigChange={setChartConfig}
          onClose={() => setShowConfigPanel(false)}
        />
      )}
    </div>
  );
}
