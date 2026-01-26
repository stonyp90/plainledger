/**
 * Gantt Chart Component for Strategic Initiatives
 * 
 * Timeline visualization showing initiatives with cash impact
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Calendar, TrendingUp, TrendingDown, GripVertical } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { Initiative, getInitiativeCashImpact } from '../../lib/strategicPlanning';
import { ChartTooltip } from '../charts/ChartTooltip';

// Helper to get theme colors
const getThemeColor = (varName: string, fallback: string) => {
  if (typeof window !== 'undefined') {
    const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    return value || fallback;
  }
  return fallback;
};

interface GanttChartProps {
  initiatives: Initiative[];
  startDate: Date;
  endDate: Date;
  onInitiativeUpdate?: (initiative: Initiative) => void;
  onInitiativeClick?: (initiative: Initiative) => void;
  viewMode?: 'month' | 'quarter' | 'year';
}

// Category colors using theme variables
const getCategoryColor = (category: Initiative['category']): string => {
  const colorMap: Record<Initiative['category'], [string, string]> = {
    growth: ['--color-success', '#10B981'],
    operations: ['--color-primary-500', '#3B82F6'],
    product: ['--color-primary-600', '#8B5CF6'],
    people: ['--color-warning', '#F59E0B'],
    infrastructure: ['--color-primary-700', '#6366F1'],
  };
  const [varName, fallback] = colorMap[category];
  return getThemeColor(varName, fallback);
};

// Status colors using theme variables
const getStatusColor = (status: Initiative['status']): string => {
  const colorMap: Record<Initiative['status'], [string, string]> = {
    planned: ['--color-gray-400', '#94A3B8'],
    in_progress: ['--color-primary-500', '#3B82F6'],
    completed: ['--color-success', '#10B981'],
    on_hold: ['--color-error', '#EF4444'],
  };
  const [varName, fallback] = colorMap[status];
  return getThemeColor(varName, fallback);
};

export default function GanttChart({
  initiatives,
  startDate,
  endDate,
  onInitiativeUpdate,
  onInitiativeClick,
  viewMode = 'month',
}: GanttChartProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const [hoveredInitiative, setHoveredInitiative] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [draggedInitiative, setDraggedInitiative] = useState<string | null>(null);
  const [dragType, setDragType] = useState<'move' | 'resize-start' | 'resize-end' | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Generate time periods based on view mode
  const periods = useMemo(() => {
    const periods: Array<{ start: Date; end: Date; label: string }> = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const periodStart = new Date(current);
      let periodEnd: Date;
      let label: string;
      
      if (viewMode === 'month') {
        periodEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
        label = periodStart.toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', { month: 'short', year: 'numeric' });
        current.setMonth(current.getMonth() + 1);
      } else if (viewMode === 'quarter') {
        const quarter = Math.floor(current.getMonth() / 3);
        periodEnd = new Date(current.getFullYear(), (quarter + 1) * 3, 0);
        label = `Q${quarter + 1} ${current.getFullYear()}`;
        current.setMonth((quarter + 1) * 3);
      } else {
        periodEnd = new Date(current.getFullYear(), 11, 31);
        label = current.getFullYear().toString();
        current.setFullYear(current.getFullYear() + 1);
      }
      
      periods.push({ start: periodStart, end: periodEnd, label });
    }
    
    return periods;
  }, [startDate, endDate, viewMode, isEn]);

  // Calculate timeline metrics
  const totalMonths = useMemo(() => {
    const diffTime = endDate.getTime() - startDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
  }, [startDate, endDate]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(isEn ? 'en-CA' : 'fr-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getInitiativePosition = (initiative: Initiative) => {
    const initStart = new Date(initiative.startDate);
    const initEnd = new Date(initiative.endDate);
    
    const startOffset = (initStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    const duration = (initEnd.getTime() - initStart.getTime()) / (1000 * 60 * 60 * 24 * 30);
    
    const leftPercent = Math.max(0, (startOffset / totalMonths) * 100);
    const widthPercent = Math.min(100 - leftPercent, (duration / totalMonths) * 100);
    
    return { leftPercent, widthPercent };
  };

  const handleBarMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent, initiative: Initiative, type: 'move' | 'resize-start' | 'resize-end') => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedInitiative(initiative.id);
    setDragType(type);
  }, []);

  const handleMove = useCallback((clientX: number) => {
    if (!draggedInitiative || !dragType || !onInitiativeUpdate || !timelineRef.current) return;

    const initiative = initiatives.find(i => i.id === draggedInitiative);
    if (!initiative) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const xPercent = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const monthsOffset = (xPercent / 100) * totalMonths;
    const newDate = new Date(startDate);
    newDate.setMonth(newDate.getMonth() + monthsOffset);

    let updatedInitiative: Initiative;

    if (dragType === 'move') {
      const duration = new Date(initiative.endDate).getTime() - new Date(initiative.startDate).getTime();
      updatedInitiative = {
        ...initiative,
        startDate: newDate.toISOString().split('T')[0],
        endDate: new Date(newDate.getTime() + duration).toISOString().split('T')[0],
      };
    } else if (dragType === 'resize-start') {
      updatedInitiative = {
        ...initiative,
        startDate: newDate.toISOString().split('T')[0],
      };
    } else {
      updatedInitiative = {
        ...initiative,
        endDate: newDate.toISOString().split('T')[0],
      };
    }

    // Ensure end date is after start date
    if (new Date(updatedInitiative.endDate) < new Date(updatedInitiative.startDate)) {
      if (dragType === 'resize-start') {
        updatedInitiative.endDate = updatedInitiative.startDate;
      } else {
        updatedInitiative.startDate = updatedInitiative.endDate;
      }
    }

    onInitiativeUpdate(updatedInitiative);
  }, [draggedInitiative, dragType, initiatives, totalMonths, startDate, onInitiativeUpdate]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    handleMove(e.clientX);
  }, [handleMove]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length > 0) {
      handleMove(e.touches[0].clientX);
    }
  }, [handleMove]);

  const handleMouseUp = useCallback(() => {
    setDraggedInitiative(null);
    setDragType(null);
  }, []);

  const handleTouchEnd = useCallback(() => {
    setDraggedInitiative(null);
    setDragType(null);
  }, []);

  // Add global mouse and touch event listeners for drag
  useEffect(() => {
    if (draggedInitiative && dragType) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      document.addEventListener('touchcancel', handleTouchEnd);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
        document.removeEventListener('touchcancel', handleTouchEnd);
      };
    }
  }, [draggedInitiative, dragType, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Group initiatives by category
  const groupedInitiatives = useMemo(() => {
    const groups: Record<string, Initiative[]> = {};
    initiatives.forEach(init => {
      if (!groups[init.category]) {
        groups[init.category] = [];
      }
      groups[init.category].push(init);
    });
    return groups;
  }, [initiatives]);

  const categoryLabels: Record<Initiative['category'], { en: string; fr: string }> = {
    growth: { en: 'Growth', fr: 'Croissance' },
    operations: { en: 'Operations', fr: 'Opérations' },
    product: { en: 'Product', fr: 'Produit' },
    people: { en: 'People', fr: 'Personnel' },
    infrastructure: { en: 'Infrastructure', fr: 'Infrastructure' },
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Timeline Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: 'rgb(var(--color-text-muted))' }} />
          <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Timeline' : 'Chronologie'}
          </span>
        </div>
        {onInitiativeUpdate && (
          <span className="text-xs sm:ml-auto text-muted" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? 'Tap & drag bars to adjust' : 'Appuyer et glisser pour ajuster'}
          </span>
        )}
      </div>
      
      {/* Scrollable Timeline Container */}
      <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0 touch-pan-x" style={{ 
        scrollbarWidth: 'thin',
        WebkitOverflowScrolling: 'touch',
      }}>
        <div className="relative min-w-[600px] sm:min-w-0" ref={timelineRef} data-timeline-container>
          {/* Period Labels */}
          <div className="relative h-8 sm:h-10 border-b" style={{ borderColor: 'rgb(var(--color-border))' }}>
            {periods.map((period, index) => (
              <div
                key={index}
                className="absolute top-0 bottom-0 flex items-center justify-center text-[10px] sm:text-xs font-medium px-1"
                style={{
                  left: `${(index / periods.length) * 100}%`,
                  width: `${(1 / periods.length) * 100}%`,
                  color: 'rgb(var(--color-text-muted))',
                  borderRight: index < periods.length - 1 ? '1px solid rgb(var(--color-border))' : 'none',
                }}
              >
                <span className="truncate w-full text-center">{period.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gantt Bars */}
      <div className="space-y-4 sm:space-y-6">
        {Object.entries(groupedInitiatives).map(([category, categoryInitiatives]) => (
          <div key={category} className="space-y-2">
            {/* Category Header */}
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded shadow-sm flex-shrink-0"
                style={{ backgroundColor: getCategoryColor(category as Initiative['category']) }}
              />
              <span className="text-xs sm:text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? categoryLabels[category as Initiative['category']].en : categoryLabels[category as Initiative['category']].fr}
              </span>
              <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full" style={{ 
                backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
                color: 'rgb(var(--color-primary-500))',
              }}>
                {categoryInitiatives.length}
              </span>
            </div>

            {/* Scrollable Initiative Bars */}
            <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0 touch-pan-x" style={{ 
              scrollbarWidth: 'thin',
              WebkitOverflowScrolling: 'touch',
            }}>
              <div className="relative ml-4 sm:ml-6 space-y-3 min-w-[600px] sm:min-w-0">
              {categoryInitiatives.map((initiative, index) => {
                const { leftPercent, widthPercent } = getInitiativePosition(initiative);
                const isHovered = hoveredInitiative === initiative.id;
                const isPositive = initiative.cashImpact.amount >= 0;
                
                // Calculate monthly impact for display
                const monthlyImpact = initiative.cashImpact.type === 'recurring'
                  ? initiative.cashImpact.amount
                  : initiative.cashImpact.amount / Math.max(1, (new Date(initiative.endDate).getTime() - new Date(initiative.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30));

                return (
                  <div
                    key={initiative.id}
                    className="relative group"
                    style={{ height: '36px sm:32px' }}
                    onTouchStart={(e) => {
                      setHoveredInitiative(initiative.id);
                      const touch = e.touches[0];
                      setTooltipPosition({ x: touch.clientX, y: touch.clientY });
                    }}
                    onMouseEnter={(e) => {
                      setHoveredInitiative(initiative.id);
                      setTooltipPosition({ x: e.clientX, y: e.clientY });
                    }}
                    onMouseMove={(e) => {
                      setTooltipPosition({ x: e.clientX, y: e.clientY });
                    }}
                    onMouseLeave={() => setHoveredInitiative(null)}
                    onClick={() => onInitiativeClick?.(initiative)}
                  >
                    {/* Bar */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 h-8 sm:h-7 rounded-lg transition-all flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 group shadow-sm touch-manipulation min-h-[44px] sm:min-h-0"
                      style={{
                        left: `${leftPercent}%`,
                        width: `${Math.max(3, widthPercent)}%`,
                        backgroundColor: isPositive
                          ? `${getCategoryColor(initiative.category)}25`
                          : `${getStatusColor(initiative.status)}25`,
                        border: `2px solid ${isHovered ? getCategoryColor(initiative.category) : getStatusColor(initiative.status)}`,
                        transform: isHovered ? 'translateY(-50%) scale(1.02)' : 'translateY(-50%)',
                        zIndex: isHovered || draggedInitiative === initiative.id ? 10 : 1,
                        cursor: draggedInitiative === initiative.id ? 'grabbing' : 'grab',
                        boxShadow: isHovered ? `0 4px 12px ${getCategoryColor(initiative.category)}40` : '0 2px 4px rgba(0,0,0,0.1)',
                      }}
                      onMouseDown={(e) => handleBarMouseDown(e, initiative, 'move')}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleBarMouseDown(e, initiative, 'move');
                      }}
                    >
                      {/* Resize handles */}
                      {isHovered && onInitiativeUpdate && (
                        <>
                          <div
                            className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity rounded-l-lg"
                            style={{ backgroundColor: getCategoryColor(initiative.category) }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              handleBarMouseDown(e, initiative, 'resize-start');
                            }}
                            onTouchStart={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleBarMouseDown(e, initiative, 'resize-start');
                            }}
                          />
                          <div
                            className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity rounded-r-lg"
                            style={{ backgroundColor: getCategoryColor(initiative.category) }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              handleBarMouseDown(e, initiative, 'resize-end');
                            }}
                            onTouchStart={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleBarMouseDown(e, initiative, 'resize-end');
                            }}
                          />
                        </>
                      )}
                      {/* Cash Impact Indicator */}
                      <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                        {isPositive ? (
                          <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" style={{ color: getCategoryColor(initiative.category) }} />
                        ) : (
                          <TrendingDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" style={{ color: getStatusColor(initiative.status) }} />
                        )}
                        <span className="text-[10px] sm:text-xs font-semibold whitespace-nowrap" style={{ 
                          color: isPositive ? getCategoryColor(initiative.category) : getStatusColor(initiative.status),
                        }}>
                          {formatCurrency(Math.abs(monthlyImpact))}
                          {initiative.cashImpact.type === 'recurring' && <span className="hidden sm:inline">/mo</span>}
                        </span>
                      </div>
                      
                      {/* Initiative Name (if space allows) */}
                      {widthPercent > 15 && (
                        <span className="text-xs font-medium truncate flex-1" style={{ color: 'rgb(var(--color-text))' }}>
                          {isEn ? initiative.nameEn : initiative.name}
                        </span>
                      )}
                    </div>

                    {/* Tooltip */}
                    {isHovered && (
                      <ChartTooltip visible={true} position={tooltipPosition}>
                        <div className="min-w-[240px]">
                          <div className="flex items-center gap-2 mb-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full shadow-sm"
                              style={{ backgroundColor: getCategoryColor(initiative.category) }}
                            />
                            <span className="text-white font-medium">
                              {isEn ? initiative.nameEn : initiative.name}
                            </span>
                          </div>
                          
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-400">{isEn ? 'Status' : 'Statut'}</span>
                              <span className="text-gray-300 capitalize">{initiative.status}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">{isEn ? 'Start' : 'Début'}</span>
                              <span className="text-gray-300">
                                {new Date(initiative.startDate).toLocaleDateString(isEn ? 'en-CA' : 'fr-CA')}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">{isEn ? 'End' : 'Fin'}</span>
                              <span className="text-gray-300">
                                {new Date(initiative.endDate).toLocaleDateString(isEn ? 'en-CA' : 'fr-CA')}
                              </span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-gray-700">
                              <span className="text-gray-400">{isEn ? 'Cash Impact' : 'Impact trésorerie'}</span>
                              <span className="font-medium" style={{ 
                                color: isPositive ? 'rgb(var(--color-success))' : 'rgb(var(--color-error))',
                              }}>
                                {isPositive ? '+' : ''}{formatCurrency(initiative.cashImpact.amount)}
                                {initiative.cashImpact.type === 'recurring' && `/${initiative.cashImpact.frequency === 'monthly' ? 'mo' : initiative.cashImpact.frequency === 'quarterly' ? 'qtr' : 'yr'}`}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">{isEn ? 'Confidence' : 'Confiance'}</span>
                              <span className="text-gray-300">{initiative.confidence}%</span>
                            </div>
                          </div>
                        </div>
                      </ChartTooltip>
                    )}
                  </div>
                );
              })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 pt-4 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
        <span className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn ? 'Status' : 'Statut'}:
        </span>
        {(['planned', 'in_progress', 'completed', 'on_hold'] as Initiative['status'][]).map((status) => {
          const color = getStatusColor(status);
          const labels: Record<Initiative['status'], { en: string; fr: string }> = {
            planned: { en: 'Planned', fr: 'Planifié' },
            in_progress: { en: 'In Progress', fr: 'En cours' },
            completed: { en: 'Completed', fr: 'Terminé' },
            on_hold: { en: 'On Hold', fr: 'En attente' },
          };
          return (
            <div key={status} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded" style={{ backgroundColor: color }} />
              <span className="text-[10px] sm:text-xs capitalize" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? labels[status].en : labels[status].fr}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
