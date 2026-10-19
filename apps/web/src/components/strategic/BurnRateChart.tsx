/**
 * Burn Rate Chart Component
 * 
 * Visualizes burn rate trends with historical and projected data
 */

import { useState } from 'react';
import { TrendingDown, AlertTriangle } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { ChartTooltip } from '../charts/ChartTooltip';
import { ChartDataState } from '../charts/ChartDataState';
import { chartExtent, getChartDataIssue, isChartDate, isFiniteNumber } from '../../lib/chartDataValidation';

interface BurnRateDataPoint {
  date: string;
  grossBurn: number;
  netBurn: number;
  revenue: number;
  expenses: number;
  isProjected?: boolean;
}

interface BurnRateChartProps {
  historical: BurnRateDataPoint[];
  projected: BurnRateDataPoint[];
  onPointHover?: (point: BurnRateDataPoint | null) => void;
}

export default function BurnRateChart({
  historical: inputHistorical,
  projected: inputProjected,
  onPointHover,
}: BurnRateChartProps) {
  // Hooks must be called before any early returns (rules of hooks)
  const { language } = useI18n();
  const isEn = language === 'en';
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const validPoint = (point: BurnRateDataPoint) => isChartDate(point.date)
    && [point.grossBurn, point.netBurn, point.revenue, point.expenses].every(isFiniteNumber);
  const historicalIssue = getChartDataIssue(inputHistorical, validPoint);
  const projectedIssue = getChartDataIssue(inputProjected, validPoint);
  const issue = historicalIssue === 'invalid' || projectedIssue === 'invalid' ? 'invalid'
    : historicalIssue === 'empty' && projectedIssue === 'empty' ? 'empty' : null;
  const historical = inputHistorical ?? [];
  const projected = inputProjected ?? [];

  // Early return - hide chart completely if no data (after all hooks)
  if (issue) {
    return <ChartDataState title={isEn ? 'Burn Rate Analysis' : 'Analyse du taux de brûlage'} issue={issue} isEn={isEn} />;
  }

  const allData = [...historical, ...projected];
  const { min: minBurn, max: maxBurn } = chartExtent(allData.map(point => point.netBurn), true);
  const range = maxBurn - minBurn || 1;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(isEn ? 'en-CA' : 'fr-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getPointPosition = (index: number) => {
    const x = allData.length === 1 ? 400 : (index / (allData.length - 1)) * 800;
    const y = 200 - ((allData[index].netBurn - minBurn) / range) * 180;
    return { x, y };
  };

  return (
    <div className="card p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0 mb-3 sm:mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Burn Rate Analysis' : 'Analyse du taux de brûlage'}
          </h3>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? 'Historical and projected monthly burn' : 'Brûlage mensuel historique et projeté'}
          </p>
        </div>
        <div className="flex items-center gap-3 sm:gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0" style={{ backgroundColor: 'rgb(var(--color-primary-500))' }} />
            <span className="text-[10px] sm:text-xs whitespace-nowrap" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Historical' : 'Historique'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full opacity-50 border-2 border-dashed flex-shrink-0" style={{ 
              backgroundColor: 'rgb(var(--color-primary-500))',
              borderColor: 'rgb(var(--color-primary-500))',
            }} />
            <span className="text-[10px] sm:text-xs whitespace-nowrap" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Projected' : 'Projeté'}
            </span>
          </div>
        </div>
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
            y1={200 - ((0 - minBurn) / range) * 180}
            x2="800"
            y2={200 - ((0 - minBurn) / range) * 180}
            stroke="rgb(var(--color-border))"
            strokeWidth="1"
            strokeDasharray="4,4"
          />

          {/* Historical area */}
          {historical.length > 1 && (
            <path
              d={`M ${historical.map((d, i) => {
                const pos = getPointPosition(i);
                return `${pos.x} ${pos.y}`;
              }).join(' L ')} L ${getPointPosition(historical.length - 1).x} 200 L ${getPointPosition(0).x} 200 Z`}
              fill="rgb(var(--color-primary-500))"
              fillOpacity="0.1"
            />
          )}

          {/* Projected area */}
          {projected.length > 1 && (
            <path
              d={`M ${projected.map((d, i) => {
                const pos = getPointPosition(historical.length + i);
                return `${pos.x} ${pos.y}`;
              }).join(' L ')} L ${getPointPosition(allData.length - 1).x} 200 L ${getPointPosition(historical.length).x} 200 Z`}
              fill="rgb(var(--color-primary-500))"
              fillOpacity="0.05"
              strokeDasharray="5,5"
            />
          )}

          {/* Historical line */}
          {historical.length > 1 && (
            <path
              d={`M ${historical.map((d, i) => {
                const pos = getPointPosition(i);
                return `${pos.x} ${pos.y}`;
              }).join(' L ')}`}
              fill="none"
              stroke="rgb(var(--color-primary-500))"
              strokeWidth="2.5"
            />
          )}

          {/* Projected line */}
          {projected.length > 1 && (
            <path
              d={`M ${projected.map((d, i) => {
                const pos = getPointPosition(historical.length + i);
                return `${pos.x} ${pos.y}`;
              }).join(' L ')}`}
              fill="none"
              stroke="rgb(var(--color-primary-500))"
              strokeWidth="2.5"
              strokeDasharray="5,5"
              opacity="0.7"
            />
          )}

          {/* Data points */}
          {allData.map((point, i) => {
            const { x, y } = getPointPosition(i);
            const isHovered = hoveredIndex === i;
            const isProjected = i >= historical.length;

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
                  fill="rgb(var(--color-primary-500))"
                  stroke="white"
                  strokeWidth="2"
                  opacity={isProjected ? 0.7 : 1}
                />
                {/* Pulse on hover */}
                {isHovered && (
                  <circle
                    cx={x}
                    cy={y}
                    r="8"
                    fill="rgb(var(--color-primary-500))"
                    opacity="0.2"
                    className="animate-pulse"
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {hoveredIndex !== null && allData[hoveredIndex] && (
          <ChartTooltip visible={true} position={tooltipPosition}>
            <div className="min-w-[200px]">
              <p className="text-gray-400 text-xs mb-2">
                {new Date(allData[hoveredIndex].date).toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', {
                  month: 'short',
                  year: 'numeric',
                })}
                {allData[hoveredIndex].isProjected && (
                  <span className="ml-2" style={{ color: 'rgb(var(--color-primary-400))' }}>({isEn ? 'Projected' : 'Projeté'})</span>
                )}
              </p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">{isEn ? 'Net Burn' : 'Brûlage net'}</span>
                  <span className="text-white font-medium">
                    {formatCurrency(allData[hoveredIndex].netBurn)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">{isEn ? 'Gross Burn' : 'Brûlage brut'}</span>
                  <span className="text-gray-300">{formatCurrency(allData[hoveredIndex].grossBurn)}</span>
                </div>
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
