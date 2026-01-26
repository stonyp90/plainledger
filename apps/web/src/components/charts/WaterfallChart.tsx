/**
 * Waterfall Chart - Essential for Cash Flow Analysis
 * Shows how values build up or break down step by step
 * Perfect for understanding cash flow movements, profit/loss composition
 */

import { useMemo, useState } from 'react';
import { ArrowUp, ArrowDown, Equal, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { ChartTooltip } from './ChartTooltip';

interface WaterfallItem {
  label: string;
  labelEn?: string;
  value: number;
  type: 'start' | 'increase' | 'decrease' | 'subtotal' | 'end';
  category?: string;
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
}

export default function WaterfallChart({
  data,
  title,
  titleEn,
  subtitle,
  subtitleEn,
  formatValue = (v) => `${v >= 0 ? '' : '-'}$${Math.abs(v).toLocaleString()}`,
  showVarianceThreshold = 20,
  height = 280,
  isEn = false,
}: WaterfallChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const {
    processedData,
    maxCumulative,
    minCumulative,
    totalChange,
    significantItems,
  } = useMemo(() => {
    let cumulative = 0;
    let maxCum = 0;
    let minCum = 0;
    
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
      
      return {
        ...item,
        start,
        end,
        cumulative,
      };
    });
    
    // Calculate total change and significant items
    const startValue = data.find(d => d.type === 'start')?.value || 0;
    const endValue = data.find(d => d.type === 'end')?.value || startValue;
    const change = endValue - startValue;
    
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
    };
  }, [data, showVarianceThreshold]);

  const range = maxCumulative - minCumulative;
  const getYPosition = (value: number) => {
    return ((maxCumulative - value) / range) * 100;
  };

  // Calculate bar width to ensure all columns fit in view
  const barWidth = Math.min(55, 550 / data.length);
  const gap = barWidth * 0.35;

  return (
    <div 
      className="rounded-xl p-4 sm:p-5"
      style={{ 
        backgroundColor: 'rgb(var(--color-surface))',
        border: '1px solid rgb(var(--color-border))'
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
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

      {/* Chart */}
      <div className="relative overflow-x-auto" style={{ height: `${height + 30}px` }}>
        <svg 
          viewBox={`0 0 ${data.length * (barWidth + gap) + 40} ${height + 30}`}
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
              fillColor = 'rgb(var(--color-text))';
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
                onMouseEnter={(e) => {
                  setHoveredIndex(index);
                  const rect = (e.target as SVGElement).getBoundingClientRect();
                  setTooltipPosition({ x: rect.left + rect.width / 2, y: rect.top });
                }}
                onMouseMove={(e) => {
                  setTooltipPosition({ x: e.clientX, y: e.clientY });
                }}
                onMouseLeave={() => setHoveredIndex(null)}
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
                {isSignificant && (
                  <circle
                    cx={x + barWidth / 2}
                    cy={barTop * height / 100 - 8}
                    r="4"
                    fill="rgb(var(--color-warning))"
                  />
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
                  className="text-[10px] font-mono tabular-nums"
                  fill={isHovered ? 'rgb(var(--color-text))' : 'rgb(var(--color-text-secondary))'}
                  style={{ fontWeight: isHovered ? 600 : 400 }}
                >
                  {formatValue(item.value)}
                </text>

                {/* Column label - directly below the bar */}
                <text
                  x={x + barWidth / 2}
                  y={height + 18}
                  textAnchor="middle"
                  className="text-[11px] font-medium"
                  fill={
                    isHovered 
                      ? 'rgb(var(--color-primary-500))'
                      : item.type === 'start' || item.type === 'end' 
                        ? 'rgb(var(--color-text))' 
                        : item.type === 'subtotal'
                        ? 'rgb(var(--color-text-secondary))'
                        : 'rgb(var(--color-text-muted))'
                  }
                >
                  {isEn && item.labelEn ? item.labelEn : item.label}
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
              <span className="text-gray-400 text-xs font-medium uppercase tracking-wide">
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
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              )}
            </div>
            
            {/* Label */}
            <p className="text-white font-medium mb-3">
              {isEn && processedData[hoveredIndex].labelEn 
                ? processedData[hoveredIndex].labelEn 
                : processedData[hoveredIndex].label}
            </p>
            
            {/* Values */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">{isEn ? 'Amount' : 'Montant'}</span>
                <span className={`font-bold flex items-center gap-1 ${
                  processedData[hoveredIndex].value >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {processedData[hoveredIndex].value >= 0 
                    ? <TrendingUp className="w-3 h-3" /> 
                    : <TrendingDown className="w-3 h-3" />}
                  {formatValue(processedData[hoveredIndex].value)}
                </span>
              </div>
              
              {processedData[hoveredIndex].type !== 'start' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">{isEn ? 'Running Total' : 'Total cumulé'}</span>
                    <span className="text-white font-mono">
                      {formatValue(processedData[hoveredIndex].cumulative)}
                    </span>
                  </div>
                  
                  {/* Percentage of total change */}
                  {totalChange !== 0 && processedData[hoveredIndex].type !== 'end' && processedData[hoveredIndex].type !== 'subtotal' && (
                    <div className="flex justify-between pt-2 border-t border-gray-700">
                      <span className="text-gray-400 text-sm">{isEn ? '% of Net Change' : '% du changement net'}</span>
                      <span className="text-gray-300 font-mono">
                        {Math.abs((processedData[hoveredIndex].value / totalChange) * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </>
              )}
              
              {/* Category if available */}
              {processedData[hoveredIndex].category && (
                <div className="flex justify-between pt-2 border-t border-gray-700">
                  <span className="text-gray-400 text-sm">{isEn ? 'Category' : 'Catégorie'}</span>
                  <span className="text-gray-300">{processedData[hoveredIndex].category}</span>
                </div>
              )}
            </div>
            
            {/* Significant indicator */}
            {significantItems.includes(processedData[hoveredIndex]) && (
              <div className="mt-3 pt-2 border-t border-gray-700 text-xs text-amber-400">
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
        {significantItems.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: 'rgb(var(--color-warning))' }}
            />
            {isEn ? 'Significant' : 'Significatif'}
          </span>
        )}
      </div>
    </div>
  );
}
