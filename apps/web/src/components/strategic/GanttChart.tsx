/**
 * Gantt Chart Component for Strategic Initiatives
 * 
 * Clean, professional timeline visualization with drag support
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Calendar, TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { Initiative } from '../../lib/strategicPlanning';

interface GanttChartProps {
  initiatives: Initiative[];
  startDate: Date;
  endDate: Date;
  onInitiativeUpdate?: (initiative: Initiative) => void;
  onInitiativeClick?: (initiative: Initiative) => void;
  viewMode?: 'month' | 'quarter' | 'year';
}

const CATEGORY_COLORS: Record<Initiative['category'], string> = {
  growth: '#10B981',
  operations: '#3B82F6',
  product: '#8B5CF6',
  people: '#F59E0B',
  infrastructure: '#6366F1',
};

const STATUS_COLORS: Record<Initiative['status'], string> = {
  planned: '#94A3B8',
  in_progress: '#3B82F6',
  completed: '#10B981',
  on_hold: '#EF4444',
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
  const [selectedInitiative, setSelectedInitiative] = useState<string | null>(null);
  const [draggedInitiative, setDraggedInitiative] = useState<string | null>(null);
  const [dragType, setDragType] = useState<'move' | 'resize-start' | 'resize-end' | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Generate time periods
  const periods = useMemo(() => {
    const result: Array<{ start: Date; end: Date; label: string; isCurrentMonth: boolean }> = [];
    const current = new Date(startDate);
    const now = new Date();
    
    while (current <= endDate) {
      const periodStart = new Date(current);
      let periodEnd: Date;
      let label: string;
      const isCurrentMonth = current.getMonth() === now.getMonth() && current.getFullYear() === now.getFullYear();
      
      if (viewMode === 'month') {
        periodEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
        label = periodStart.toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', { month: 'short' });
        if (current.getMonth() === 0 || result.length === 0) {
          label += ` '${String(current.getFullYear()).slice(2)}`;
        }
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
      
      result.push({ start: periodStart, end: periodEnd, label, isCurrentMonth });
    }
    
    return result;
  }, [startDate, endDate, viewMode, isEn]);

  const totalMonths = useMemo(() => {
    return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
  }, [startDate, endDate]);

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const getInitiativePosition = (initiative: Initiative) => {
    const initStart = new Date(initiative.startDate);
    const initEnd = new Date(initiative.endDate);
    const startOffset = (initStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    const duration = (initEnd.getTime() - initStart.getTime()) / (1000 * 60 * 60 * 24 * 30);
    const leftPercent = Math.max(0, (startOffset / totalMonths) * 100);
    const widthPercent = Math.min(100 - leftPercent, Math.max(2, (duration / totalMonths) * 100));
    return { leftPercent, widthPercent };
  };

  const handleBarInteraction = useCallback((e: React.MouseEvent | React.TouchEvent, initiative: Initiative, type: 'move' | 'resize-start' | 'resize-end') => {
    e.preventDefault();
    e.stopPropagation();
    if (!onInitiativeUpdate) return;
    setDraggedInitiative(initiative.id);
    setDragType(type);
  }, [onInitiativeUpdate]);

  const handleMove = useCallback((clientX: number) => {
    if (!draggedInitiative || !dragType || !onInitiativeUpdate || !timelineRef.current) return;
    const initiative = initiatives.find(i => i.id === draggedInitiative);
    if (!initiative) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const xPercent = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const monthsOffset = (xPercent / 100) * totalMonths;
    const newDate = new Date(startDate);
    newDate.setMonth(newDate.getMonth() + Math.round(monthsOffset));

    let updatedInitiative: Initiative;
    if (dragType === 'move') {
      const duration = new Date(initiative.endDate).getTime() - new Date(initiative.startDate).getTime();
      updatedInitiative = {
        ...initiative,
        startDate: newDate.toISOString().split('T')[0],
        endDate: new Date(newDate.getTime() + duration).toISOString().split('T')[0],
      };
    } else if (dragType === 'resize-start') {
      if (newDate < new Date(initiative.endDate)) {
        updatedInitiative = { ...initiative, startDate: newDate.toISOString().split('T')[0] };
      } else return;
    } else {
      if (newDate > new Date(initiative.startDate)) {
        updatedInitiative = { ...initiative, endDate: newDate.toISOString().split('T')[0] };
      } else return;
    }
    onInitiativeUpdate(updatedInitiative);
  }, [draggedInitiative, dragType, initiatives, totalMonths, startDate, onInitiativeUpdate]);

  useEffect(() => {
    if (!draggedInitiative || !dragType) return;
    
    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) handleMove(e.touches[0].clientX);
    };
    const handleEnd = () => {
      setDraggedInitiative(null);
      setDragType(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [draggedInitiative, dragType, handleMove]);

  const groupedInitiatives = useMemo(() => {
    const groups: Record<string, Initiative[]> = {};
    initiatives.forEach(init => {
      if (!groups[init.category]) groups[init.category] = [];
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

  const selectedInit = selectedInitiative ? initiatives.find(i => i.id === selectedInitiative) : null;

  return (
    <div className="space-y-4">
      {/* Selected Initiative Detail Panel */}
      {selectedInit && (
        <div 
          className="p-4 rounded-xl flex items-center justify-between"
          style={{
            backgroundColor: `${CATEGORY_COLORS[selectedInit.category]}10`,
            border: `1px solid ${CATEGORY_COLORS[selectedInit.category]}30`,
          }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: CATEGORY_COLORS[selectedInit.category] }}
            />
            <div>
              <h4 className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? selectedInit.nameEn : selectedInit.name}
              </h4>
              <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {new Date(selectedInit.startDate).toLocaleDateString()} - {new Date(selectedInit.endDate).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Impact' : 'Impact'}
              </p>
              <p 
                className="font-semibold text-sm"
                style={{ color: selectedInit.cashImpact.amount >= 0 ? '#10B981' : '#EF4444' }}
              >
                {selectedInit.cashImpact.amount >= 0 ? '+' : ''}{formatCurrency(selectedInit.cashImpact.amount)}
                {selectedInit.cashImpact.type === 'recurring' && '/mo'}
              </p>
            </div>
            <button
              onClick={() => {
                onInitiativeClick?.(selectedInit);
                setSelectedInitiative(null);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{
                backgroundColor: CATEGORY_COLORS[selectedInit.category],
                color: 'white',
              }}
            >
              {isEn ? 'Edit' : 'Modifier'}
            </button>
            <button
              onClick={() => setSelectedInitiative(null)}
              className="p-1.5 rounded-lg hover:bg-black/5"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Timeline Header */}
      <div 
        className="relative rounded-lg overflow-hidden"
        style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
      >
        <div className="flex" ref={timelineRef}>
          {periods.map((period, index) => (
            <div
              key={index}
              className="flex-1 py-2 px-1 text-center border-r last:border-r-0 relative"
              style={{
                borderColor: 'rgb(var(--color-border))',
                backgroundColor: period.isCurrentMonth ? 'rgb(var(--color-primary-500) / 0.1)' : 'transparent',
              }}
            >
              <span 
                className="text-[10px] sm:text-xs font-medium"
                style={{ 
                  color: period.isCurrentMonth ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-text-muted))',
                }}
              >
                {period.label}
              </span>
              {period.isCurrentMonth && (
                <div 
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Gantt Rows */}
      <div className="space-y-6">
        {Object.entries(groupedInitiatives).map(([category, categoryInitiatives]) => (
          <div key={category}>
            {/* Category Header */}
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: CATEGORY_COLORS[category as Initiative['category']] }}
              />
              <span className="text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? categoryLabels[category as Initiative['category']].en : categoryLabels[category as Initiative['category']].fr}
              </span>
              <span 
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ 
                  backgroundColor: 'rgb(var(--color-bg-muted))',
                  color: 'rgb(var(--color-text-muted))',
                }}
              >
                {categoryInitiatives.length}
              </span>
            </div>

            {/* Timeline Bars */}
            <div className="space-y-2 ml-5">
              {categoryInitiatives.map((initiative) => {
                const { leftPercent, widthPercent } = getInitiativePosition(initiative);
                const isPositive = initiative.cashImpact.amount >= 0;
                const isSelected = selectedInitiative === initiative.id;
                const isDragging = draggedInitiative === initiative.id;

                return (
                  <div key={initiative.id} className="relative h-10">
                    {/* Grid lines */}
                    <div className="absolute inset-0 flex">
                      {periods.map((_, i) => (
                        <div 
                          key={i} 
                          className="flex-1 border-r last:border-r-0"
                          style={{ borderColor: 'rgb(var(--color-border) / 0.3)' }}
                        />
                      ))}
                    </div>
                    
                    {/* Bar */}
                    <div
                      className={`absolute top-1 bottom-1 rounded-lg flex items-center px-3 gap-2 transition-all cursor-pointer ${isDragging ? 'shadow-lg' : 'shadow-sm'}`}
                      style={{
                        left: `${leftPercent}%`,
                        width: `${widthPercent}%`,
                        minWidth: '80px',
                        backgroundColor: isSelected ? CATEGORY_COLORS[initiative.category] : `${CATEGORY_COLORS[initiative.category]}15`,
                        border: `2px solid ${CATEGORY_COLORS[initiative.category]}`,
                        transform: isSelected ? 'scale(1.02)' : undefined,
                        zIndex: isSelected || isDragging ? 10 : 1,
                      }}
                      onClick={() => setSelectedInitiative(isSelected ? null : initiative.id)}
                      onMouseDown={(e) => onInitiativeUpdate && handleBarInteraction(e, initiative, 'move')}
                      onTouchStart={(e) => onInitiativeUpdate && handleBarInteraction(e, initiative, 'move')}
                    >
                      {/* Impact indicator */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {isPositive ? (
                          <TrendingUp className="w-3.5 h-3.5" style={{ color: isSelected ? 'white' : '#10B981' }} />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5" style={{ color: isSelected ? 'white' : '#EF4444' }} />
                        )}
                        <span 
                          className="text-xs font-semibold"
                          style={{ color: isSelected ? 'white' : (isPositive ? '#10B981' : '#EF4444') }}
                        >
                          {formatCurrency(Math.abs(initiative.cashImpact.amount))}
                        </span>
                      </div>
                      
                      {/* Name */}
                      {widthPercent > 12 && (
                        <span 
                          className="text-xs font-medium truncate"
                          style={{ color: isSelected ? 'white' : 'rgb(var(--color-text))' }}
                        >
                          {isEn ? initiative.nameEn : initiative.name}
                        </span>
                      )}

                      {/* Resize handles for drag */}
                      {onInitiativeUpdate && (
                        <>
                          <div
                            className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize rounded-l-lg hover:bg-black/10"
                            onMouseDown={(e) => { e.stopPropagation(); handleBarInteraction(e, initiative, 'resize-start'); }}
                            onTouchStart={(e) => { e.stopPropagation(); handleBarInteraction(e, initiative, 'resize-start'); }}
                          />
                          <div
                            className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize rounded-r-lg hover:bg-black/10"
                            onMouseDown={(e) => { e.stopPropagation(); handleBarInteraction(e, initiative, 'resize-end'); }}
                            onTouchStart={(e) => { e.stopPropagation(); handleBarInteraction(e, initiative, 'resize-end'); }}
                          />
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 pt-4 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
        <span className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn ? 'Status:' : 'Statut:'}
        </span>
        {Object.entries(STATUS_COLORS).map(([status, color]) => {
          const labels: Record<string, { en: string; fr: string }> = {
            planned: { en: 'Planned', fr: 'Planifié' },
            in_progress: { en: 'In Progress', fr: 'En cours' },
            completed: { en: 'Completed', fr: 'Terminé' },
            on_hold: { en: 'On Hold', fr: 'En attente' },
          };
          return (
            <div key={status} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: color }} />
              <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? labels[status].en : labels[status].fr}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
