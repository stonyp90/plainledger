/**
 * Cash Forecast Chart Component
 * 
 * Forward-looking cash projection with confidence bands
 */

import { useState } from 'react';
import { TrendingUp, Target } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { CashForecast } from '../../lib/strategicPlanning';
import { ChartTooltip } from '../charts/ChartTooltip';

interface CashForecastChartProps {
  forecast: CashForecast;
  currentCash: number;
  onPointHover?: (point: CashForecast['projected'][0] | null) => void;
}

export default function CashForecastChart({
  forecast,
  currentCash,
  onPointHover,
}: CashForecastChartProps) {
  // Hooks must be called before any early returns (rules of hooks)
  const { language } = useI18n();
  const isEn = language === 'en';
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Early return - hide chart completely if no forecast data (after all hooks)
  if (!forecast || ((!forecast.historical || forecast.historical.length === 0) && (!forecast.projected || forecast.projected.length === 0))) {
    return null;
  }

  const allData = [
    ...forecast.historical,
    ...forecast.projected.map(p => ({
      date: p.date,
      cash: p.cash,
      revenue: p.revenue,
      expenses: p.expenses,
    })),
  ];

  const maxCash = allData.length > 0 
    ? Math.max(...allData.map(d => d.cash ?? 0), currentCash) 
    : currentCash;
  const minCash = allData.length > 0 
    ? Math.min(...allData.map(d => d.cash ?? 0), 0) 
    : 0;
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
    const x = (index / (allData.length - 1)) * 800;
    const y = 200 - ((allData[index].cash - minCash) / range) * 180;
    return { x, y };
  };

  const historicalEndIndex = forecast.historical.length - 1;
  
  // Get projected point data if hovering over projected area
  const projectedPoint = hoveredIndex !== null && hoveredIndex > historicalEndIndex 
    ? forecast.projected[hoveredIndex - historicalEndIndex - 1]
    : null;

  return (
    <div className="card p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0 mb-3 sm:mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Cash Forecast' : 'Prévision de trésorerie'}
          </h3>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? 'Projected cash position over time' : 'Position de trésorerie projetée dans le temps'}
          </p>
        </div>
        {forecast.breakEvenDate && (
          <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg w-fit" style={{ backgroundColor: 'rgb(var(--color-success) / 0.1)' }}>
            <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" style={{ color: 'rgb(var(--color-success))' }} />
            <span className="text-[10px] sm:text-xs font-medium whitespace-nowrap" style={{ color: 'rgb(var(--color-success))' }}>
              {isEn ? 'Break-even' : 'Point d\'équilibre'}: {new Date(forecast.breakEvenDate).toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', { month: 'short', year: 'numeric' })}
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
            strokeWidth="1"
            strokeDasharray="4,4"
            opacity="0.5"
          />

          {/* Confidence bands for projected */}
          {forecast.projected.length > 1 && forecast.projected.map((point, i) => {
            const index = historicalEndIndex + 1 + i;
            const { x, y } = getPointPosition(index);
            const confidenceRange = (point.cash * (1 - point.confidence)) / 2;
            const upperY = 200 - ((point.cash + confidenceRange - minCash) / range) * 180;
            const lowerY = 200 - ((point.cash - confidenceRange - minCash) / range) * 180;

            return (
              <line
                key={i}
                x1={x}
                y1={upperY}
                x2={x}
                y2={lowerY}
                stroke="rgb(var(--color-primary-500))"
                strokeWidth="1"
                opacity="0.2"
              />
            );
          })}

          {/* Historical area */}
          {forecast.historical.length > 1 && (
            <path
              d={`M ${forecast.historical.map((d, i) => {
                const pos = getPointPosition(i);
                return `${pos.x} ${pos.y}`;
              }).join(' L ')} L ${getPointPosition(historicalEndIndex).x} 200 L ${getPointPosition(0).x} 200 Z`}
              fill="rgb(var(--color-success))"
              fillOpacity="0.1"
            />
          )}

          {/* Projected area */}
          {forecast.projected.length > 1 && (
            <path
              d={`M ${forecast.projected.map((d, i) => {
                const pos = getPointPosition(historicalEndIndex + 1 + i);
                return `${pos.x} ${pos.y}`;
              }).join(' L ')} L ${getPointPosition(allData.length - 1).x} 200 L ${getPointPosition(historicalEndIndex + 1).x} 200 Z`}
              fill="rgb(var(--color-primary-500))"
              fillOpacity="0.1"
            />
          )}

          {/* Historical line */}
          {forecast.historical.length > 1 && (
            <path
              d={`M ${forecast.historical.map((d, i) => {
                const pos = getPointPosition(i);
                return `${pos.x} ${pos.y}`;
              }).join(' L ')}`}
              fill="none"
              stroke="rgb(var(--color-success))"
              strokeWidth="3"
            />
          )}

          {/* Projected line */}
          {forecast.projected.length > 1 && (
            <path
              d={`M ${forecast.projected.map((d, i) => {
                const pos = getPointPosition(historicalEndIndex + 1 + i);
                return `${pos.x} ${pos.y}`;
              }).join(' L ')}`}
              fill="none"
              stroke="rgb(var(--color-primary-500))"
              strokeWidth="3"
              strokeDasharray="5,5"
            />
          )}

          {/* Break-even marker */}
          {forecast.breakEvenDate && (() => {
            const breakEvenIndex = forecast.projected.findIndex(p => p.date === forecast.breakEvenDate);
            if (breakEvenIndex >= 0) {
              const { x, y } = getPointPosition(historicalEndIndex + 1 + breakEvenIndex);
              return (
                <g>
                  <circle
                    cx={x}
                    cy={y}
                    r="8"
                    fill="rgb(var(--color-success))"
                    stroke="white"
                    strokeWidth="2"
                  />
                  <Target className="w-4 h-4" style={{ color: 'white' }} transform={`translate(${x - 8}, ${y - 8})`} />
                </g>
              );
            }
            return null;
          })()}

          {/* Data points */}
          {allData.map((point, i) => {
            const { x, y } = getPointPosition(i);
            const isHovered = hoveredIndex === i;
            const isProjected = i > historicalEndIndex;
            const projectedPoint = isProjected ? forecast.projected[i - historicalEndIndex - 1] : null;

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
                    if (projectedPoint) {
                      onPointHover?.(projectedPoint);
                    }
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
                  fill={isProjected ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-success))'}
                  stroke="white"
                  strokeWidth="2"
                  opacity={isProjected ? 0.8 : 1}
                />
                {/* Pulse on hover */}
                {isHovered && (
                  <circle
                    cx={x}
                    cy={y}
                    r="8"
                    fill={isProjected ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-success))'}
                    opacity="0.2"
                    className="animate-pulse"
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {hoveredIndex !== null && (
          <ChartTooltip visible={true} position={tooltipPosition}>
            <div className="min-w-[200px]">
              <p className="text-gray-400 text-xs mb-2">
                {new Date(allData[hoveredIndex].date).toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', {
                  month: 'short',
                  year: 'numeric',
                })}
                {hoveredIndex > historicalEndIndex && (
                  <span className="ml-2" style={{ color: 'rgb(var(--color-primary-400))' }}>({isEn ? 'Projected' : 'Projeté'})</span>
                )}
              </p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">{isEn ? 'Cash Position' : 'Position de trésorerie'}</span>
                  <span className="text-white font-medium">
                    {formatCurrency(allData[hoveredIndex].cash)}
                  </span>
                </div>
                {hoveredIndex > historicalEndIndex && projectedPoint && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">{isEn ? 'Confidence' : 'Confiance'}</span>
                    <span className="text-gray-300">{(projectedPoint.confidence * 100).toFixed(0)}%</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-gray-700">
                  <span className="text-gray-400">{isEn ? 'Revenue' : 'Revenus'}</span>
                  <span style={{ color: 'rgb(var(--color-success))' }}>{formatCurrency(allData[hoveredIndex].revenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">{isEn ? 'Expenses' : 'Dépenses'}</span>
                  <span style={{ color: 'rgb(var(--color-error))' }}>{formatCurrency(allData[hoveredIndex].expenses)}</span>
                </div>
              </div>
            </div>
          </ChartTooltip>
        )}
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between mt-2 text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
        {allData.filter((_, i) => i % Math.ceil(allData.length / 6) === 0).map((d, i) => (
          <span key={i}>
            {new Date(d.date).toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', { month: 'short' })}
          </span>
        ))}
      </div>
    </div>
  );
}
