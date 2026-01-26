/**
 * Waterfall Chart - Essential for Cash Flow Analysis
 * Shows how values build up or break down step by step
 * Perfect for understanding cash flow movements, profit/loss composition
 */

import { useMemo } from 'react';
import { ArrowUp, ArrowDown, Equal, AlertTriangle } from 'lucide-react';

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

  const barWidth = Math.min(60, 600 / data.length);
  const gap = barWidth * 0.3;

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
      <div className="relative overflow-x-auto" style={{ height: `${height}px` }}>
        <svg 
          viewBox={`0 0 ${data.length * (barWidth + gap) + 40} ${height}`}
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
              <g key={item.label}>
                {/* Bar */}
                <rect
                  x={x}
                  y={barTop * height / 100}
                  width={barWidth}
                  height={Math.max(2, barHeight * height / 100)}
                  fill={fillColor}
                  rx="2"
                  opacity={isSignificant ? 1 : 0.8}
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
                      ? barTop * height / 100 - 4 
                      : (barTop + barHeight) * height / 100 + 12
                  }
                  textAnchor="middle"
                  className="text-[9px] font-mono tabular-nums"
                  fill="rgb(var(--color-text-secondary))"
                >
                  {formatValue(item.value)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* X-axis labels */}
      <div 
        className="flex mt-2 overflow-x-auto"
        style={{ paddingLeft: '20px' }}
      >
        {processedData.map((item, index) => (
          <div
            key={item.label}
            className="text-center flex-shrink-0"
            style={{ width: `${barWidth + gap}px` }}
          >
            <span 
              className="text-[10px] leading-tight block truncate"
              style={{ 
                color: item.type === 'start' || item.type === 'end' 
                  ? 'rgb(var(--color-text))' 
                  : 'rgb(var(--color-text-muted))'
              }}
            >
              {isEn && item.labelEn ? item.labelEn : item.label}
            </span>
          </div>
        ))}
      </div>

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
