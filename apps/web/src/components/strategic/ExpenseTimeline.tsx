/**
 * Expense Timeline Component
 * 
 * Main drag-and-drop interface for OPEX/CAPEX expense planning
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Plus, Calendar } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { PlannedExpense, generatePlanningId } from '../../lib/strategicPlanning';
import ExpenseCard from './ExpenseCard';

interface ExpenseTimelineProps {
  expenses: PlannedExpense[];
  startDate: Date;
  endDate: Date;
  onExpenseUpdate?: (expense: PlannedExpense) => void;
  onExpenseClick?: (expense: PlannedExpense) => void;
  onExpenseAdd?: (expense: PlannedExpense) => void;
  viewMode?: 'month' | 'quarter' | 'year';
}

const OPEX_COLOR = '#3B82F6';
const CAPEX_COLOR = '#F59E0B';

export default function ExpenseTimeline({
  expenses,
  startDate,
  endDate,
  onExpenseUpdate,
  onExpenseClick,
  onExpenseAdd,
  viewMode = 'month',
}: ExpenseTimelineProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    id: string;
    type: 'move' | 'resize-start' | 'resize-end';
    startX: number;
    originalStart: string;
    originalEnd: string;
  } | null>(null);
  
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

  const totalDays = useMemo(() => {
    return (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  }, [startDate, endDate]);

  const getExpensePosition = useCallback((exp: PlannedExpense) => {
    const expStart = new Date(exp.startDate);
    const expEnd = new Date(exp.endDate);
    const startOffset = (expStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const duration = (expEnd.getTime() - expStart.getTime()) / (1000 * 60 * 60 * 24);
    const leftPercent = Math.max(0, (startOffset / totalDays) * 100);
    const widthPercent = Math.min(100 - leftPercent, Math.max(3, (duration / totalDays) * 100));
    return { leftPercent, widthPercent };
  }, [startDate, totalDays]);

  const positionToDate = useCallback((xPercent: number) => {
    const days = (xPercent / 100) * totalDays;
    const date = new Date(startDate);
    date.setDate(date.getDate() + Math.round(days));
    return date;
  }, [startDate, totalDays]);

  // Drag handlers
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent, exp: PlannedExpense, type: 'move' | 'resize-start' | 'resize-end') => {
    e.preventDefault();
    e.stopPropagation();
    if (!onExpenseUpdate || exp.isLocked) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    setDragState({
      id: exp.id,
      type,
      startX: clientX,
      originalStart: exp.startDate,
      originalEnd: exp.endDate,
    });
    setSelectedExpenseId(exp.id);
  }, [onExpenseUpdate]);

  const handleDragMove = useCallback((clientX: number) => {
    if (!dragState || !timelineRef.current || !onExpenseUpdate) return;
    
    const expense = expenses.find(e => e.id === dragState.id);
    if (!expense || expense.isLocked) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const deltaX = clientX - dragState.startX;
    const deltaPercent = (deltaX / rect.width) * 100;
    const deltaDays = (deltaPercent / 100) * totalDays;

    const originalStartDate = new Date(dragState.originalStart);
    const originalEndDate = new Date(dragState.originalEnd);

    let newStartDate: Date;
    let newEndDate: Date;

    if (dragState.type === 'move') {
      newStartDate = new Date(originalStartDate);
      newStartDate.setDate(newStartDate.getDate() + Math.round(deltaDays));
      newEndDate = new Date(originalEndDate);
      newEndDate.setDate(newEndDate.getDate() + Math.round(deltaDays));
    } else if (dragState.type === 'resize-start') {
      newStartDate = new Date(originalStartDate);
      newStartDate.setDate(newStartDate.getDate() + Math.round(deltaDays));
      newEndDate = originalEndDate;
      if (newStartDate >= newEndDate) return;
    } else {
      newStartDate = originalStartDate;
      newEndDate = new Date(originalEndDate);
      newEndDate.setDate(newEndDate.getDate() + Math.round(deltaDays));
      if (newEndDate <= newStartDate) return;
    }

    // Update expense
    onExpenseUpdate({
      ...expense,
      startDate: newStartDate.toISOString().split('T')[0],
      endDate: newEndDate.toISOString().split('T')[0],
    });
  }, [dragState, expenses, totalDays, onExpenseUpdate]);

  const handleDragEnd = useCallback(() => {
    setDragState(null);
  }, []);

  useEffect(() => {
    if (!dragState) return;
    
    const handleMouseMove = (e: MouseEvent) => handleDragMove(e.clientX);
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        e.preventDefault();
        handleDragMove(e.touches[0].clientX);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleDragEnd);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleDragEnd);
    };
  }, [dragState, handleDragMove, handleDragEnd]);

  // Group expenses by type
  const opexExpenses = useMemo(() => expenses.filter(e => e.type === 'opex'), [expenses]);
  const capexExpenses = useMemo(() => expenses.filter(e => e.type === 'capex'), [expenses]);

  // Handle double-click to add expense
  const handleTimelineDoubleClick = useCallback((e: React.MouseEvent, type: 'opex' | 'capex') => {
    if (!onExpenseAdd || !timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const clickDate = positionToDate(xPercent);
    const endDate = new Date(clickDate);
    
    if (type === 'opex') {
      endDate.setMonth(endDate.getMonth() + 12); // Default 12 months for OPEX
    } else {
      endDate.setDate(endDate.getDate() + 1); // Single day for CAPEX
    }

    const expense: PlannedExpense = {
      id: generatePlanningId('expense'),
      name: isEn ? 'New Expense' : 'Nouvelle dépense',
      nameEn: 'New Expense',
      type,
      category: type === 'opex' ? 'operations' : 'equipment',
      startDate: clickDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      amount: type === 'opex' ? 5000 : 10000,
      frequency: type === 'opex' ? 'monthly' : 'one_time',
      isLocked: false,
      confidence: 50,
    };

    onExpenseAdd(expense);
    setSelectedExpenseId(expense.id);
    onExpenseClick?.(expense);
  }, [onExpenseAdd, positionToDate, isEn, onExpenseClick]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
          <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Expense Timeline' : 'Chronologie des dépenses'}
          </span>
        </div>
        {onExpenseAdd && (
          <button
            onClick={() => {
              const now = new Date();
              const threeMonthsLater = new Date(now);
              threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
              
              const expense: PlannedExpense = {
                id: generatePlanningId('expense'),
                name: isEn ? 'New Expense' : 'Nouvelle dépense',
                nameEn: 'New Expense',
                type: 'opex',
                category: 'operations',
                startDate: now.toISOString().split('T')[0],
                endDate: threeMonthsLater.toISOString().split('T')[0],
                amount: 5000,
                frequency: 'monthly',
                isLocked: false,
                confidence: 50,
              };
              onExpenseAdd(expense);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              backgroundColor: 'rgb(var(--color-primary-500))',
              color: 'white',
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            {isEn ? 'Add Expense' : 'Ajouter dépense'}
          </button>
        )}
      </div>

      {/* Timeline Header */}
      <div 
        className="relative rounded-lg overflow-hidden"
        style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
        ref={timelineRef}
      >
        <div className="flex">
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
                style={{ color: period.isCurrentMonth ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-text-muted))' }}
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

      {/* OPEX Lane */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: OPEX_COLOR }}
          />
          <span className="text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'OPEX (Operating Expenses)' : 'OpEx (Dépenses opérationnelles)'}
          </span>
          <span 
            className="text-xs px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: 'rgb(var(--color-bg-muted))', color: 'rgb(var(--color-text-muted))' }}
          >
            {opexExpenses.length}
          </span>
        </div>

        <div 
          className="relative ml-5 rounded-lg overflow-hidden"
          style={{ 
            backgroundColor: 'rgb(var(--color-bg-subtle))',
            minHeight: opexExpenses.length === 0 ? '50px' : `${Math.max(50, opexExpenses.length * 50)}px`,
            position: 'relative',
            zIndex: 1,
          }}
          onDoubleClick={(e) => handleTimelineDoubleClick(e, 'opex')}
        >
          {/* Grid */}
          <div className="absolute inset-0 flex pointer-events-none" style={{ zIndex: 0 }}>
            {periods.map((period, i) => (
              <div 
                key={i} 
                className="flex-1 border-r last:border-r-0"
                style={{ 
                  borderColor: 'rgb(var(--color-border) / 0.2)',
                  backgroundColor: period.isCurrentMonth ? 'rgb(var(--color-primary-500) / 0.03)' : 'transparent',
                }}
              />
            ))}
          </div>

          {/* Empty state */}
          {opexExpenses.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 1 }}>
              <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted) / 0.5)' }}>
                {isEn ? 'Double-click to add OPEX' : 'Double-cliquez pour ajouter OpEx'}
              </span>
            </div>
          )}

          {/* Expense cards */}
          {opexExpenses.map((expense) => {
            const { leftPercent, widthPercent } = getExpensePosition(expense);
            return (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                leftPercent={leftPercent}
                widthPercent={widthPercent}
                isSelected={selectedExpenseId === expense.id}
                isDragging={dragState?.id === expense.id}
                onDragStart={(e, type) => handleDragStart(e, expense, type)}
                onClick={() => {
                  setSelectedExpenseId(selectedExpenseId === expense.id ? null : expense.id);
                  onExpenseClick?.(expense);
                }}
              />
            );
          })}
        </div>
      </div>

      {/* CAPEX Lane */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: CAPEX_COLOR }}
          />
          <span className="text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'CAPEX (Capital Expenditures)' : 'CapEx (Dépenses en capital)'}
          </span>
          <span 
            className="text-xs px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: 'rgb(var(--color-bg-muted))', color: 'rgb(var(--color-text-muted))' }}
          >
            {capexExpenses.length}
          </span>
        </div>

        <div 
          className="relative ml-5 rounded-lg overflow-hidden"
          style={{ 
            backgroundColor: 'rgb(var(--color-bg-subtle))',
            minHeight: capexExpenses.length === 0 ? '50px' : `${Math.max(50, capexExpenses.length * 50)}px`,
            position: 'relative',
            zIndex: 1,
          }}
          onDoubleClick={(e) => handleTimelineDoubleClick(e, 'capex')}
        >
          {/* Grid */}
          <div className="absolute inset-0 flex pointer-events-none" style={{ zIndex: 0 }}>
            {periods.map((period, i) => (
              <div 
                key={i} 
                className="flex-1 border-r last:border-r-0"
                style={{ 
                  borderColor: 'rgb(var(--color-border) / 0.2)',
                  backgroundColor: period.isCurrentMonth ? 'rgb(var(--color-primary-500) / 0.03)' : 'transparent',
                }}
              />
            ))}
          </div>

          {/* Empty state */}
          {capexExpenses.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 1 }}>
              <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted) / 0.5)' }}>
                {isEn ? 'Double-click to add CAPEX' : 'Double-cliquez pour ajouter CapEx'}
              </span>
            </div>
          )}

          {/* Expense cards */}
          {capexExpenses.map((expense) => {
            const { leftPercent, widthPercent } = getExpensePosition(expense);
            return (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                leftPercent={leftPercent}
                widthPercent={widthPercent}
                isSelected={selectedExpenseId === expense.id}
                isDragging={dragState?.id === expense.id}
                onDragStart={(e, type) => handleDragStart(e, expense, type)}
                onClick={() => {
                  setSelectedExpenseId(selectedExpenseId === expense.id ? null : expense.id);
                  onExpenseClick?.(expense);
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Instructions */}
      <div 
        className="flex items-center gap-4 pt-3 border-t text-xs"
        style={{ borderColor: 'rgb(var(--color-border))', color: 'rgb(var(--color-text-muted))' }}
      >
        <span>{isEn ? 'Drag to move' : 'Glisser pour déplacer'}</span>
        <span>|</span>
        <span>{isEn ? 'Drag edges to resize (OPEX only)' : 'Glisser les bords pour redimensionner (OpEx uniquement)'}</span>
        <span>|</span>
        <span>{isEn ? 'Double-click to add' : 'Double-clic pour ajouter'}</span>
      </div>
    </div>
  );
}
