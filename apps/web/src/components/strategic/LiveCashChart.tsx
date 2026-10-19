/**
 * Live Cash Chart Component
 * 
 * Real-time cash flow visualization that updates smoothly as expenses change
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { Target, TrendingDown } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { projectCashFlow } from '../../lib/expensePlanning';
import { PlannedExpense } from '../../lib/strategicPlanning';
import { ChartDataState } from '../charts/ChartDataState';
import { chartExtent } from '../../lib/chartDataValidation';

interface LiveCashChartProps {
  currentCash: number;
  currentDate: Date;
  expenses: PlannedExpense[];
  baseRevenue?: number;
  months?: number;
  onPointHover?: (point: { date: string; cash: number } | null) => void;
}

export default function LiveCashChart({
  currentCash,
  currentDate,
  expenses,
  baseRevenue = 0,
  months = 24,
  onPointHover,
}: LiveCashChartProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [animatedData, setAnimatedData] = useState<Array<{ date: string; cash: number }>>([]);
  const animationRef = useRef<number | undefined>(undefined);

  // Calculate projected cash flow
  const calculation = useMemo(() => {
    try {
      return { data: projectCashFlow(currentCash, currentDate, expenses, baseRevenue, months), invalid: false };
    } catch {
      return { data: [], invalid: true };
    }
  }, [currentCash, currentDate, expenses, baseRevenue, months]);
  const projectedData = calculation.data;

  // Animate data changes smoothly
  useEffect(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const targetData = projectedData.map(p => ({ date: p.date, cash: p.cash }));
    
    if (animatedData.length === 0 || targetData.length === 0 || targetData.length > 200) {
      setAnimatedData(targetData);
      return;
    }

    // Animate from current to target
    const startData = [...animatedData];
    const startTime = Date.now();
    const duration = 500; // 500ms animation

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out)
      const eased = 1 - Math.pow(1 - progress, 3);
      
      const interpolated = targetData.map((target, i) => {
        const start = startData[i] || { date: target.date, cash: currentCash };
        return {
          date: target.date,
          cash: start.cash + (target.cash - start.cash) * eased,
        };
      });
      
      setAnimatedData(interpolated);
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [projectedData, currentCash]);

  const { min: minCash, max: maxCash } = chartExtent([currentCash, ...animatedData.map(d => d.cash)], true);
  const range = maxCash - minCash || 1;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(isEn ? 'en-CA' : 'fr-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getPointPosition = (index: number) => {
    if (animatedData.length === 0) {
      return { x: 0, y: 200 };
    }
    const x = animatedData.length === 1 ? 400 : (index / (animatedData.length - 1)) * 800;
    const cash = animatedData[index]?.cash ?? 0;
    const safeRange = range || 1; // Prevent division by zero
    const y = 200 - ((cash - minCash) / safeRange) * 180;
    // Ensure values are valid numbers
    return { 
      x: isNaN(x) ? 0 : x, 
      y: isNaN(y) ? 200 : Math.max(0, Math.min(400, y)) // Clamp between 0 and 400
    };
  };

  // Find zero date
  const zeroIndex = animatedData.findIndex(d => d.cash <= 0);
  const zeroDate = zeroIndex >= 0 ? animatedData[zeroIndex]?.date : null;

  if (calculation.invalid || projectedData.length === 0) {
    return <ChartDataState title={isEn ? 'Cash Flow Impact' : 'Impact sur la trésorerie'} issue={calculation.invalid ? 'invalid' : 'empty'} isEn={isEn} />;
  }

  return (
    <div className="card p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0 mb-3 sm:mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
            <TrendingDown className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
            {isEn ? 'Cash Flow Impact' : 'Impact sur la trésorerie'}
          </h3>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? 'Live projection based on planned expenses' : 'Projection en direct basée sur les dépenses prévues'}
          </p>
        </div>
        {zeroDate && (
          <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg w-fit" style={{ backgroundColor: 'rgb(var(--color-error) / 0.1)' }}>
            <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" style={{ color: 'rgb(var(--color-error))' }} />
            <span className="text-[10px] sm:text-xs font-medium whitespace-nowrap" style={{ color: 'rgb(var(--color-error))' }}>
              {isEn ? 'Zero Cash' : 'Trésorerie zéro'}: {new Date(zeroDate).toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', { month: 'short', year: 'numeric' })}
            </span>
          </div>
        )}
      </div>

      <div className="relative h-48 sm:h-64 overflow-x-auto touch-pan-x" style={{ 
        scrollbarWidth: 'thin',
        WebkitOverflowScrolling: 'touch',
      }}>
        <svg className="w-full h-full min-w-[600px] sm:min-w-0" viewBox="0 0 800 200" preserveAspectRatio="none">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((y) => (
            <line
              key={y}
              x1="0"
              y1={200 - y * 2}
              x2="800"
              y2={200 - y * 2}
              stroke="rgb(var(--color-border))"
              strokeWidth="0.5"
              strokeDasharray="4,4"
              opacity="0.5"
            />
          ))}

          {/* Zero line */}
          <line
            x1="0"
            y1={200 - ((0 - minCash) / range) * 180}
            x2="800"
            y2={200 - ((0 - minCash) / range) * 180}
            stroke="rgb(var(--color-error))"
            strokeWidth="1.5"
            strokeDasharray="4,4"
            opacity="0.6"
          />

          {/* Area under curve */}
          {animatedData.length > 1 && (
            <path
              d={`M ${animatedData.map((d, i) => {
                const pos = getPointPosition(i);
                return `${pos.x} ${pos.y}`;
              }).join(' L ')} L ${getPointPosition(animatedData.length - 1).x} 200 L ${getPointPosition(0).x} 200 Z`}
              fill="rgb(var(--color-primary-500))"
              fillOpacity="0.1"
              className="transition-all duration-300"
            />
          )}

          {/* Cash flow line */}
          {animatedData.length > 1 && (
            <path
              d={`M ${animatedData.map((d, i) => {
                const pos = getPointPosition(i);
                return `${pos.x} ${pos.y}`;
              }).join(' L ')}`}
              fill="none"
              stroke="rgb(var(--color-primary-500))"
              strokeWidth="3"
              className="transition-all duration-300"
            />
          )}

          {/* Zero date marker */}
          {zeroDate && zeroIndex >= 0 && (() => {
            const { x, y } = getPointPosition(zeroIndex);
            return (
              <g>
                <circle
                  cx={x}
                  cy={y}
                  r="8"
                  fill="rgb(var(--color-error))"
                  stroke="white"
                  strokeWidth="2"
                />
                <line
                  x1={x}
                  y1={y}
                  x2={x}
                  y2="200"
                  stroke="rgb(var(--color-error))"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                  opacity="0.5"
                />
              </g>
            );
          })()}

          {/* Data points */}
          {animatedData.length > 0 && animatedData.map((point, i) => {
            if (i % Math.max(1, Math.ceil(animatedData.length / 150)) !== 0 && i !== animatedData.length - 1 && i !== hoveredIndex) return null;
            const { x, y } = getPointPosition(i);
            const isHovered = hoveredIndex === i;
            const isZero = point.cash <= 0;
            
            // Skip rendering if position is invalid
            if (x === undefined || y === undefined || isNaN(x) || isNaN(y)) {
              return null;
            }

            return (
              <g key={i}>
                {/* Hover area */}
                <circle
                  cx={x}
                  cy={y}
                  r="12"
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={(e) => {
                    setHoveredIndex(i);
                    setTooltipPosition({ x: e.clientX, y: e.clientY });
                    onPointHover?.(point);
                  }}
                  onMouseLeave={() => {
                    setHoveredIndex(null);
                    onPointHover?.(null);
                  }}
                />
                {/* Point */}
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 5 : 3}
                  fill={isZero ? 'rgb(var(--color-error))' : 'rgb(var(--color-primary-500))'}
                  stroke="white"
                  strokeWidth="2"
                  className="transition-all duration-200"
                />
                {/* Pulse on hover */}
                {isHovered && (
                  <circle
                    cx={x}
                    cy={y}
                    r="8"
                    fill={isZero ? 'rgb(var(--color-error))' : 'rgb(var(--color-primary-500))'}
                    opacity="0.2"
                    className="animate-pulse"
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {hoveredIndex !== null && animatedData[hoveredIndex] && (
          <div
            className="fixed p-3 rounded-xl shadow-xl text-xs pointer-events-none"
            style={{
              left: tooltipPosition.x + 10,
              top: tooltipPosition.y - 10,
              backgroundColor: 'rgb(30, 30, 30)',
              border: '1px solid rgb(50, 50, 50)',
              minWidth: 200,
              zIndex: 1000,
            }}
          >
            <p className="text-gray-400 text-xs mb-2">
              {new Date(animatedData[hoveredIndex].date).toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', {
                month: 'short',
                year: 'numeric',
              })}
            </p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">{isEn ? 'Cash Position' : 'Position de trésorerie'}</span>
                <span className="text-white font-medium">
                  {formatCurrency(animatedData[hoveredIndex].cash)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between mt-2 text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
        {animatedData.filter((_, i) => i % Math.ceil(animatedData.length / 6) === 0).map((d, i) => (
          <span key={i}>
            {new Date(d.date).toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', { month: 'short' })}
          </span>
        ))}
      </div>
    </div>
  );
}
