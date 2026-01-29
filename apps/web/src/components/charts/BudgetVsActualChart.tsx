/**
 * Budget vs Actual Chart - Critical for Financial Planning
 * Shows planned vs actual performance with variance analysis
 * Essential for management reporting and forecasting
 */

import { useMemo, useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Target,
} from 'lucide-react';
import { ChartTooltip } from './ChartTooltip';

interface BudgetItem {
  category: string;
  categoryEn?: string;
  actual: number;
  budget: number;
  priorYear?: number;
  isRevenue?: boolean; // Positive variance is good for revenue
}

interface BudgetVsActualChartProps {
  data: BudgetItem[];
  title: string;
  titleEn?: string;
  showPriorYear?: boolean;
  varianceThreshold?: number; // % threshold for highlighting
  formatValue?: (value: number) => string;
  isEn?: boolean;
}

export default function BudgetVsActualChart({
  data,
  title,
  titleEn,
  showPriorYear = true,
  varianceThreshold = 10,
  formatValue = (v) => `$${Math.abs(v).toLocaleString()}`,
  isEn = false,
}: BudgetVsActualChartProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'category' | 'variance'>('variance');
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const {
    processedData,
    totals,
    maxValue,
    favorableCount,
    unfavorableCount,
  } = useMemo(() => {
    let maxVal = 0;
    let favorable = 0;
    let unfavorable = 0;
    
    const processed = data.map(item => {
      const variance = item.actual - item.budget;
      const variancePct = item.budget !== 0 
        ? (variance / Math.abs(item.budget)) * 100 
        : 0;
      
      // Determine if variance is favorable
      // For revenue: positive variance is good
      // For expenses: negative variance is good (spent less)
      const isFavorable = item.isRevenue 
        ? variance >= 0 
        : variance <= 0;
      
      const isSignificant = Math.abs(variancePct) >= varianceThreshold;
      
      if (isSignificant) {
        if (isFavorable) favorable++;
        else unfavorable++;
      }
      
      maxVal = Math.max(maxVal, item.actual, item.budget, item.priorYear || 0);
      
      return {
        ...item,
        variance,
        variancePct,
        isFavorable,
        isSignificant,
        yoyChange: item.priorYear 
          ? ((item.actual - item.priorYear) / Math.abs(item.priorYear)) * 100 
          : null,
      };
    });
    
    // Sort by variance if selected
    if (sortBy === 'variance') {
      processed.sort((a, b) => Math.abs(b.variancePct) - Math.abs(a.variancePct));
    }
    
    // Calculate totals
    const totalActual = data.reduce((sum, d) => sum + d.actual, 0);
    const totalBudget = data.reduce((sum, d) => sum + d.budget, 0);
    const totalPrior = data.reduce((sum, d) => sum + (d.priorYear || 0), 0);
    
    return {
      processedData: processed,
      totals: {
        actual: totalActual,
        budget: totalBudget,
        priorYear: totalPrior,
        variance: totalActual - totalBudget,
        variancePct: totalBudget !== 0 
          ? ((totalActual - totalBudget) / Math.abs(totalBudget)) * 100 
          : 0,
      },
      maxValue: maxVal * 1.1,
      favorableCount: favorable,
      unfavorableCount: unfavorable,
    };
  }, [data, varianceThreshold, sortBy]);

  const toggleRow = (category: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedRows(newExpanded);
  };

  const getBarWidth = (value: number) => {
    return Math.max(2, (Math.abs(value) / maxValue) * 100);
  };

  return (
    <div 
      className="rounded-xl transition-all duration-200 hover:shadow-md"
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
      <div className="p-4 sm:p-5 border-b" style={{ borderColor: 'rgb(var(--color-border))' }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 
              className="font-semibold"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {isEn && titleEn ? titleEn : title}
            </h3>
            <div className="flex items-center gap-3 mt-2">
              {favorableCount > 0 && (
                <span 
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-success) / 0.1)',
                    color: 'rgb(var(--color-success))'
                  }}
                >
                  <CheckCircle className="w-3 h-3" />
                  {favorableCount} {isEn ? 'favorable' : 'favorable'}
                </span>
              )}
              {unfavorableCount > 0 && (
                <span 
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-error) / 0.1)',
                    color: 'rgb(var(--color-error))'
                  }}
                >
                  <AlertTriangle className="w-3 h-3" />
                  {unfavorableCount} {isEn ? 'unfavorable' : 'défavorable'}
                </span>
              )}
            </div>
          </div>
          
          {/* Sort toggle */}
          <button
            onClick={() => setSortBy(s => s === 'variance' ? 'category' : 'variance')}
            className="text-xs px-2 py-1 rounded transition-colors"
            style={{ 
              backgroundColor: 'rgb(var(--color-bg-muted))',
              color: 'rgb(var(--color-text-muted))'
            }}
          >
            {isEn ? 'Sort: ' : 'Tri: '}
            {sortBy === 'variance' 
              ? (isEn ? 'By variance' : 'Par écart') 
              : (isEn ? 'By category' : 'Par catégorie')}
          </button>
        </div>
      </div>

      {/* Table Header */}
      <div 
        className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium border-b"
        style={{ 
          borderColor: 'rgb(var(--color-border))',
          color: 'rgb(var(--color-text-muted))',
          backgroundColor: 'rgb(var(--color-bg-muted))'
        }}
      >
        <div className="col-span-4">{isEn ? 'Category' : 'Catégorie'}</div>
        <div className="col-span-2 text-right">{isEn ? 'Actual' : 'Réel'}</div>
        <div className="col-span-2 text-right">{isEn ? 'Budget' : 'Budget'}</div>
        <div className="col-span-2 text-right">{isEn ? 'Variance' : 'Écart'}</div>
        <div className="col-span-2 text-right">{isEn ? 'Var %' : 'Écart %'}</div>
      </div>

      {/* Data Rows */}
      <div className="divide-y" style={{ borderColor: 'rgb(var(--color-border))' }}>
        {processedData.map((item) => {
          const isHovered = hoveredRow === item.category;
          
          return (
            <div key={item.category} className="relative">
              {/* Main Row */}
              <div 
                className="grid grid-cols-12 gap-2 px-4 py-3 items-center cursor-pointer transition-all"
                style={{ 
                  backgroundColor: item.isSignificant && !item.isFavorable 
                    ? 'rgb(var(--color-error) / 0.05)' 
                    : isHovered 
                      ? 'rgb(var(--color-primary-500) / 0.05)'
                      : 'transparent'
                }}
                onClick={() => toggleRow(item.category)}
                onMouseEnter={(e) => {
                  setHoveredRow(item.category);
                  setTooltipPosition({ x: e.clientX, y: e.clientY });
                }}
                onMouseMove={(e) => {
                  setTooltipPosition({ x: e.clientX, y: e.clientY });
                }}
                onMouseLeave={() => setHoveredRow(null)}
              >
              {/* Category */}
              <div className="col-span-4 flex items-center gap-2">
                {expandedRows.has(item.category) 
                  ? <ChevronUp className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                  : <ChevronDown className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                }
                <span 
                  className="text-sm font-medium truncate"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {isEn && item.categoryEn ? item.categoryEn : item.category}
                </span>
                {item.isSignificant && (
                  <span 
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ 
                      backgroundColor: item.isFavorable 
                        ? 'rgb(var(--color-success))' 
                        : 'rgb(var(--color-error))'
                    }}
                  />
                )}
              </div>

              {/* Actual */}
              <div 
                className="col-span-2 text-right text-sm font-mono tabular-nums"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {formatValue(item.actual)}
              </div>

              {/* Budget */}
              <div 
                className="col-span-2 text-right text-sm font-mono tabular-nums"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                {formatValue(item.budget)}
              </div>

              {/* Variance */}
              <div 
                className="col-span-2 text-right text-sm font-mono tabular-nums flex items-center justify-end gap-1"
                style={{ 
                  color: item.isFavorable 
                    ? 'rgb(var(--color-success))' 
                    : 'rgb(var(--color-error))'
                }}
              >
                {item.variance >= 0 
                  ? <TrendingUp className="w-3 h-3" /> 
                  : <TrendingDown className="w-3 h-3" />}
                {formatValue(item.variance)}
              </div>

              {/* Variance % */}
              <div 
                className="col-span-2 text-right text-sm font-mono tabular-nums"
                style={{ 
                  color: item.isFavorable 
                    ? 'rgb(var(--color-success))' 
                    : 'rgb(var(--color-error))'
                }}
              >
                {item.variancePct >= 0 ? '+' : ''}{item.variancePct.toFixed(1)}%
              </div>
            </div>

            {/* Expanded Details */}
            {expandedRows.has(item.category) && (
              <div 
                className="px-4 py-3 space-y-3"
                style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
              >
                {/* Visual bar comparison */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span 
                      className="text-xs w-16"
                      style={{ color: 'rgb(var(--color-text-muted))' }}
                    >
                      {isEn ? 'Actual' : 'Réel'}
                    </span>
                    <div className="flex-1 h-5 rounded overflow-hidden" style={{ backgroundColor: 'rgb(var(--color-bg-emphasis))' }}>
                      <div 
                        className="h-full rounded"
                        style={{ 
                          width: `${getBarWidth(item.actual)}%`,
                          backgroundColor: 'rgb(var(--color-text))'
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span 
                      className="text-xs w-16"
                      style={{ color: 'rgb(var(--color-text-muted))' }}
                    >
                      Budget
                    </span>
                    <div className="flex-1 h-5 rounded overflow-hidden" style={{ backgroundColor: 'rgb(var(--color-bg-emphasis))' }}>
                      <div 
                        className="h-full rounded opacity-50"
                        style={{ 
                          width: `${getBarWidth(item.budget)}%`,
                          backgroundColor: 'rgb(var(--color-text))'
                        }}
                      />
                    </div>
                  </div>
                  {showPriorYear && item.priorYear !== undefined && (
                    <div className="flex items-center gap-2">
                      <span 
                        className="text-xs w-16"
                        style={{ color: 'rgb(var(--color-text-muted))' }}
                      >
                        {isEn ? 'Prior Yr' : 'An préc.'}
                      </span>
                      <div className="flex-1 h-5 rounded overflow-hidden" style={{ backgroundColor: 'rgb(var(--color-bg-emphasis))' }}>
                        <div 
                          className="h-full rounded opacity-30"
                          style={{ 
                            width: `${getBarWidth(item.priorYear)}%`,
                            backgroundColor: 'rgb(var(--color-text))'
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Analysis text */}
                {item.isSignificant && (
                  <div 
                    className="text-xs p-2 rounded"
                    style={{ 
                      backgroundColor: item.isFavorable 
                        ? 'rgb(var(--color-success) / 0.1)' 
                        : 'rgb(var(--color-error) / 0.1)',
                      color: item.isFavorable 
                        ? 'rgb(var(--color-success))' 
                        : 'rgb(var(--color-error))'
                    }}
                  >
                    {item.isFavorable ? '✓' : '⚠'} {isEn 
                      ? `Variance of ${Math.abs(item.variancePct).toFixed(1)}% exceeds ${varianceThreshold}% threshold`
                      : `Écart de ${Math.abs(item.variancePct).toFixed(1)}% dépasse le seuil de ${varianceThreshold}%`
                    }
                  </div>
                )}
              </div>
            )}
            
            {/* Hover tooltip */}
            {isHovered && !expandedRows.has(item.category) && (
              <ChartTooltip visible={true} position={tooltipPosition}>
                <div className="min-w-[220px]">
                  {/* Header */}
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="text-gray-400 text-xs font-medium uppercase tracking-wide">
                      {isEn && item.categoryEn ? item.categoryEn : item.category}
                    </span>
                    {item.isSignificant && (
                      item.isFavorable 
                        ? <CheckCircle className="w-4 h-4 text-green-400" />
                        : <AlertTriangle className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                  
                  {/* Budget performance */}
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-300">
                        {isEn ? 'Budget Performance' : 'Performance budget'}
                      </span>
                    </div>
                    <div 
                      className="h-2 rounded-full overflow-hidden"
                      style={{ backgroundColor: 'rgb(59 130 246 / 0.2)' }}
                    >
                      <div 
                        className="h-full rounded-full transition-all"
                        style={{ 
                          width: `${Math.min(100, Math.max(0, (item.actual / item.budget) * 100))}%`,
                          backgroundColor: item.isFavorable ? '#059669' : '#ef4444'
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-1 text-xs">
                      <span className="text-gray-500">0%</span>
                      <span className={item.isFavorable ? 'text-green-400' : 'text-red-400'}>
                        {((item.actual / item.budget) * 100).toFixed(0)}%
                      </span>
                      <span className="text-gray-500">100%</span>
                    </div>
                  </div>
                  
                  {/* Values */}
                  <div className="space-y-2 border-t border-gray-700 pt-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm">{isEn ? 'Actual' : 'Réel'}</span>
                      <span className="text-white font-bold">{formatValue(item.actual)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm">Budget</span>
                      <span className="text-gray-300">{formatValue(item.budget)}</span>
                    </div>
                    {showPriorYear && item.priorYear !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">{isEn ? 'Prior Year' : 'Année préc.'}</span>
                        <span className="text-gray-400">{formatValue(item.priorYear)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-gray-700">
                      <span className="text-gray-400 text-sm">{isEn ? 'Variance' : 'Écart'}</span>
                      <span className={`font-medium flex items-center gap-1 ${item.isFavorable ? 'text-green-400' : 'text-red-400'}`}>
                        {item.variance >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {item.variancePct >= 0 ? '+' : ''}{item.variancePct.toFixed(1)}%
                      </span>
                    </div>
                    {item.yoyChange !== null && (
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">{isEn ? 'YoY Change' : 'Var. annuelle'}</span>
                        <span className={`font-medium ${item.yoyChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {item.yoyChange >= 0 ? '+' : ''}{item.yoyChange.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Click hint */}
                  <div className="mt-3 pt-2 border-t border-gray-700 text-xs text-gray-500 text-center">
                    {isEn ? 'Click for details' : 'Cliquez pour les détails'}
                  </div>
                </div>
              </ChartTooltip>
            )}
          </div>
        );
        })}
      </div>

      {/* Totals Row */}
      <div 
        className="grid grid-cols-12 gap-2 px-4 py-3 items-center border-t-2"
        style={{ 
          borderColor: 'rgb(var(--color-border-strong))',
          backgroundColor: 'rgb(var(--color-bg-muted))'
        }}
      >
        <div 
          className="col-span-4 text-sm font-semibold"
          style={{ color: 'rgb(var(--color-text))' }}
        >
          {isEn ? 'TOTAL' : 'TOTAL'}
        </div>
        <div 
          className="col-span-2 text-right text-sm font-mono tabular-nums font-semibold"
          style={{ color: 'rgb(var(--color-text))' }}
        >
          {formatValue(totals.actual)}
        </div>
        <div 
          className="col-span-2 text-right text-sm font-mono tabular-nums font-semibold"
          style={{ color: 'rgb(var(--color-text-muted))' }}
        >
          {formatValue(totals.budget)}
        </div>
        <div 
          className="col-span-2 text-right text-sm font-mono tabular-nums font-semibold flex items-center justify-end gap-1"
          style={{ 
            color: totals.variance >= 0 
              ? 'rgb(var(--color-success))' 
              : 'rgb(var(--color-error))'
          }}
        >
          {totals.variance >= 0 
            ? <TrendingUp className="w-3 h-3" /> 
            : <TrendingDown className="w-3 h-3" />}
          {formatValue(totals.variance)}
        </div>
        <div 
          className="col-span-2 text-right text-sm font-mono tabular-nums font-semibold"
          style={{ 
            color: totals.variance >= 0 
              ? 'rgb(var(--color-success))' 
              : 'rgb(var(--color-error))'
          }}
        >
          {totals.variancePct >= 0 ? '+' : ''}{totals.variancePct.toFixed(1)}%
        </div>
      </div>
    </div>
  );
}
