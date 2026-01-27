/**
 * Enterprise Expense Timeline Component
 * 
 * Professional drag-and-drop interface for OPEX/CAPEX expense planning
 * with right-click context menus, multi-select, and keyboard shortcuts
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Plus, Layers, GripVertical, Calculator } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { PlannedExpense, generatePlanningId } from '../../lib/strategicPlanning';
import EnterpriseExpenseCard from './EnterpriseExpenseCard';
import EnterpriseTimelineHeader, { ViewMode, Period } from './EnterpriseTimelineHeader';
import ExpenseContextMenu, { ContextMenuAction } from './ExpenseContextMenu';

interface EnterpriseExpenseTimelineProps {
  expenses: PlannedExpense[];
  startDate: Date;
  endDate: Date;
  onExpenseUpdate?: (expense: PlannedExpense) => void;
  onExpenseClick?: (expense: PlannedExpense) => void;
  onExpenseAdd?: (expense: PlannedExpense) => void;
  onExpenseDelete?: (expenseId: string) => void;
  onExpenseDuplicate?: (expense: PlannedExpense) => void;
  onBulkDelete?: (expenseIds: string[]) => void;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
}

const OPEX_COLOR = '#3B82F6';
const CAPEX_COLOR = '#F59E0B';

export default function EnterpriseExpenseTimeline({
  expenses,
  startDate: initialStartDate,
  endDate: initialEndDate,
  onExpenseUpdate,
  onExpenseClick,
  onExpenseAdd,
  onExpenseDelete,
  onExpenseDuplicate,
  onBulkDelete,
  viewMode: externalViewMode,
  onViewModeChange: externalOnViewModeChange,
}: EnterpriseExpenseTimelineProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  // Timeline state
  const [internalViewMode, setInternalViewMode] = useState<ViewMode>('month');
  const viewMode = externalViewMode ?? internalViewMode;
  const setViewMode = externalOnViewModeChange ?? setInternalViewMode;
  
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    expense?: PlannedExpense;
    targetDate?: Date;
    targetType?: 'opex' | 'capex';
  } | null>(null);
  
  // Clipboard state
  const [clipboard, setClipboard] = useState<PlannedExpense | null>(null);
  
  // Drag state
  const [dragState, setDragState] = useState<{
    id: string;
    type: 'move' | 'resize-start' | 'resize-end';
    startX: number;
    originalStart: string;
    originalEnd: string;
  } | null>(null);
  
  const timelineRef = useRef<HTMLDivElement>(null);
  const opexLaneRef = useRef<HTMLDivElement>(null);
  const capexLaneRef = useRef<HTMLDivElement>(null);

  // Generate time periods
  const periods = useMemo(() => {
    const result: Period[] = [];
    const current = new Date(startDate);
    const now = new Date();
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    while (current <= endDate) {
      const periodStart = new Date(current);
      let periodEnd: Date;
      let label: string;
      let sublabel: string | undefined;

      switch (viewMode) {
        case 'month':
          periodEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
          label = current.toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', { month: 'short' });
          if (current.getMonth() === 0 || result.length === 0) {
            sublabel = `'${String(current.getFullYear()).slice(2)}`;
          }
          current.setMonth(current.getMonth() + 1);
          break;

        case 'quarter':
          const quarter = Math.floor(current.getMonth() / 3);
          periodEnd = new Date(current.getFullYear(), (quarter + 1) * 3, 0);
          label = `Q${quarter + 1}`;
          sublabel = current.getFullYear().toString();
          current.setMonth((quarter + 1) * 3);
          break;

        case 'year':
          periodEnd = new Date(current.getFullYear(), 11, 31);
          label = current.getFullYear().toString();
          current.setFullYear(current.getFullYear() + 1);
          break;

        default:
          periodEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
          label = current.toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', { month: 'short' });
          current.setMonth(current.getMonth() + 1);
      }

      const isCurrentPeriod = now >= periodStart && now <= periodEnd;
      const periodDays = Math.ceil((Math.min(periodEnd.getTime(), endDate.getTime()) - 
                                    Math.max(periodStart.getTime(), startDate.getTime())) / 
                                   (1000 * 60 * 60 * 24)) + 1;

      result.push({
        start: periodStart,
        end: periodEnd,
        label,
        sublabel,
        isToday: isCurrentPeriod,
        isCurrentPeriod,
        width: Math.max((periodDays / totalDays) * 100, 3),
      });
    }

    return result;
  }, [startDate, endDate, viewMode, isEn]);

  const totalDays = useMemo(() => {
    return (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  }, [startDate, endDate]);

  // Calculate today marker position
  const todayPosition = useMemo(() => {
    const now = new Date();
    if (now < startDate || now > endDate) return null;
    const daysFromStart = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    return (daysFromStart / totalDays) * 100;
  }, [startDate, endDate, totalDays]);

  // Position calculations
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
    
    // Snap to start of month if in month view
    if (viewMode === 'month') {
      date.setDate(1);
    } else if (viewMode === 'quarter') {
      const quarter = Math.floor(date.getMonth() / 3);
      date.setMonth(quarter * 3);
      date.setDate(1);
    }
    
    return date;
  }, [startDate, totalDays, viewMode]);

  // Navigation handlers
  const handleNavigate = useCallback((direction: 'prev' | 'next' | 'today') => {
    const monthsToMove = viewMode === 'year' ? 12 : viewMode === 'quarter' ? 3 : 1;
    
    if (direction === 'today') {
      const now = new Date();
      const newStart = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      const newEnd = new Date(now.getFullYear(), now.getMonth() + 18, 0);
      setStartDate(newStart);
      setEndDate(newEnd);
    } else if (direction === 'prev') {
      setStartDate(prev => {
        const newDate = new Date(prev);
        newDate.setMonth(newDate.getMonth() - monthsToMove);
        return newDate;
      });
      setEndDate(prev => {
        const newDate = new Date(prev);
        newDate.setMonth(newDate.getMonth() - monthsToMove);
        return newDate;
      });
    } else {
      setStartDate(prev => {
        const newDate = new Date(prev);
        newDate.setMonth(newDate.getMonth() + monthsToMove);
        return newDate;
      });
      setEndDate(prev => {
        const newDate = new Date(prev);
        newDate.setMonth(newDate.getMonth() + monthsToMove);
        return newDate;
      });
    }
  }, [viewMode]);

  // Selection handlers
  const handleSelect = useCallback((expense: PlannedExpense, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (e.shiftKey && lastSelectedId) {
      // Range selection
      const allIds = expenses.filter(exp => exp.type === expense.type).map(exp => exp.id);
      const lastIndex = allIds.indexOf(lastSelectedId);
      const currentIndex = allIds.indexOf(expense.id);
      
      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        const newSelected = new Set(selectedIds);
        for (let i = start; i <= end; i++) {
          newSelected.add(allIds[i]);
        }
        setSelectedIds(newSelected);
      }
    } else if (e.metaKey || e.ctrlKey) {
      // Toggle selection
      const newSelected = new Set(selectedIds);
      if (newSelected.has(expense.id)) {
        newSelected.delete(expense.id);
      } else {
        newSelected.add(expense.id);
      }
      setSelectedIds(newSelected);
    } else {
      // Single selection
      setSelectedIds(new Set([expense.id]));
    }
    
    setLastSelectedId(expense.id);
    onExpenseClick?.(expense);
  }, [expenses, lastSelectedId, selectedIds, onExpenseClick]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setLastSelectedId(null);
  }, []);

  // Context menu handlers
  const handleContextMenu = useCallback((
    e: React.MouseEvent,
    expense?: PlannedExpense,
    type?: 'opex' | 'capex'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Calculate date from click position if on a lane
    let targetDate: Date | undefined;
    const laneRef = type === 'opex' ? opexLaneRef : type === 'capex' ? capexLaneRef : null;
    
    if (laneRef?.current) {
      const rect = laneRef.current.getBoundingClientRect();
      const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
      targetDate = positionToDate(xPercent);
    }
    
    // If right-clicking on an expense, add it to selection if not already selected
    if (expense && !selectedIds.has(expense.id)) {
      setSelectedIds(new Set([expense.id]));
      setLastSelectedId(expense.id);
    }
    
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      expense,
      targetDate,
      targetType: type || expense?.type,
    });
  }, [positionToDate, selectedIds]);

  const handleContextMenuAction = useCallback((action: ContextMenuAction, data?: unknown) => {
    if (!contextMenu) return;
    
    const expense = contextMenu.expense;
    const selectedExpensesList = expenses.filter(e => selectedIds.has(e.id));
    
    switch (action) {
      case 'edit':
        if (expense) onExpenseClick?.(expense);
        break;
        
      case 'duplicate':
        if (expense && onExpenseDuplicate) {
          const duplicated: PlannedExpense = {
            ...expense,
            id: generatePlanningId('expense'),
            name: `${expense.name} (copie)`,
            nameEn: `${expense.nameEn} (copy)`,
          };
          onExpenseDuplicate(duplicated);
        }
        break;
        
      case 'delete':
        if (expense && onExpenseDelete) {
          onExpenseDelete(expense.id);
          selectedIds.delete(expense.id);
          setSelectedIds(new Set(selectedIds));
        }
        break;
        
      case 'lock':
      case 'unlock':
        if (expense && onExpenseUpdate) {
          onExpenseUpdate({ ...expense, isLocked: action === 'lock' });
        }
        break;
        
      case 'copy':
        if (expense) setClipboard(expense);
        break;
        
      case 'paste':
        if (clipboard && onExpenseAdd && contextMenu.targetDate) {
          const daysDiff = Math.round(
            (new Date(clipboard.endDate).getTime() - new Date(clipboard.startDate).getTime()) / 
            (1000 * 60 * 60 * 24)
          );
          const newEndDate = new Date(contextMenu.targetDate);
          newEndDate.setDate(newEndDate.getDate() + daysDiff);
          
          const pasted: PlannedExpense = {
            ...clipboard,
            id: generatePlanningId('expense'),
            name: `${clipboard.name} (collé)`,
            nameEn: `${clipboard.nameEn} (pasted)`,
            type: contextMenu.targetType || clipboard.type,
            startDate: contextMenu.targetDate.toISOString().split('T')[0],
            endDate: newEndDate.toISOString().split('T')[0],
          };
          onExpenseAdd(pasted);
        }
        break;
        
      case 'add-opex':
      case 'add-capex':
        if (onExpenseAdd) {
          const type = action === 'add-opex' ? 'opex' : 'capex';
          const clickDate = contextMenu.targetDate || new Date();
          const expenseEndDate = new Date(clickDate);
          
          if (type === 'opex') {
            expenseEndDate.setMonth(expenseEndDate.getMonth() + 12);
          } else {
            expenseEndDate.setDate(expenseEndDate.getDate() + 1);
          }
          
          const newExpense: PlannedExpense = {
            id: generatePlanningId('expense'),
            name: isEn ? 'New Expense' : 'Nouvelle dépense',
            nameEn: 'New Expense',
            type,
            category: type === 'opex' ? 'operations' : 'equipment',
            startDate: clickDate.toISOString().split('T')[0],
            endDate: expenseEndDate.toISOString().split('T')[0],
            amount: type === 'opex' ? 5000 : 10000,
            frequency: type === 'opex' ? 'monthly' : 'one_time',
            isLocked: false,
            confidence: 50,
          };
          
          onExpenseAdd(newExpense);
          setSelectedIds(new Set([newExpense.id]));
          onExpenseClick?.(newExpense);
        }
        break;
        
      case 'bulk-delete':
        if (onBulkDelete && selectedExpensesList.length > 0) {
          onBulkDelete(selectedExpensesList.map(e => e.id));
          clearSelection();
        }
        break;
        
      case 'bulk-lock':
      case 'bulk-unlock':
        selectedExpensesList.forEach(exp => {
          if (onExpenseUpdate) {
            onExpenseUpdate({ ...exp, isLocked: action === 'bulk-lock' });
          }
        });
        break;
        
      case 'deselect-all':
        clearSelection();
        break;
        
      case 'change-category':
        if (expense && onExpenseUpdate && data && typeof data === 'object' && 'category' in data) {
          onExpenseUpdate({ ...expense, category: (data as { category: string }).category });
        }
        break;
    }
    
    setContextMenu(null);
  }, [contextMenu, expenses, selectedIds, clipboard, onExpenseAdd, onExpenseClick, onExpenseDelete, onExpenseDuplicate, onExpenseUpdate, onBulkDelete, clearSelection, isEn]);

  // Drag handlers
  const handleDragStart = useCallback((
    e: React.MouseEvent | React.TouchEvent,
    exp: PlannedExpense,
    type: 'move' | 'resize-start' | 'resize-end'
  ) => {
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
    
    if (!selectedIds.has(exp.id)) {
      setSelectedIds(new Set([exp.id]));
      setLastSelectedId(exp.id);
    }
  }, [onExpenseUpdate, selectedIds]);

  const handleDragMove = useCallback((clientX: number) => {
    if (!dragState || !timelineRef.current || !onExpenseUpdate) return;
    
    const expense = expenses.find(e => e.id === dragState.id);
    if (!expense || expense.isLocked) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const deltaX = clientX - dragState.startX;
    const deltaPercent = (deltaX / rect.width) * 100;
    const deltaDays = (deltaPercent / 100) * totalDays;

    // Snap to grid based on view mode
    let snapDays = 1;
    if (viewMode === 'month') snapDays = 7;
    if (viewMode === 'quarter') snapDays = 30;
    if (viewMode === 'year') snapDays = 90;
    
    const snappedDeltaDays = Math.round(deltaDays / snapDays) * snapDays;

    const originalStartDate = new Date(dragState.originalStart);
    const originalEndDate = new Date(dragState.originalEnd);

    let newStartDate: Date;
    let newEndDate: Date;

    if (dragState.type === 'move') {
      newStartDate = new Date(originalStartDate);
      newStartDate.setDate(newStartDate.getDate() + snappedDeltaDays);
      newEndDate = new Date(originalEndDate);
      newEndDate.setDate(newEndDate.getDate() + snappedDeltaDays);
    } else if (dragState.type === 'resize-start') {
      newStartDate = new Date(originalStartDate);
      newStartDate.setDate(newStartDate.getDate() + snappedDeltaDays);
      newEndDate = originalEndDate;
      if (newStartDate >= newEndDate) return;
    } else {
      newStartDate = originalStartDate;
      newEndDate = new Date(originalEndDate);
      newEndDate.setDate(newEndDate.getDate() + snappedDeltaDays);
      if (newEndDate <= newStartDate) return;
    }

    onExpenseUpdate({
      ...expense,
      startDate: newStartDate.toISOString().split('T')[0],
      endDate: newEndDate.toISOString().split('T')[0],
    });
  }, [dragState, expenses, totalDays, viewMode, onExpenseUpdate]);

  const handleDragEnd = useCallback(() => {
    setDragState(null);
  }, []);

  // Global event listeners for drag
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      // Select all
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault();
        setSelectedIds(new Set(expenses.map(e => e.id)));
      }
      
      // Delete selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.size > 0 && onBulkDelete) {
          e.preventDefault();
          onBulkDelete(Array.from(selectedIds));
          clearSelection();
        }
      }
      
      // Escape to clear selection
      if (e.key === 'Escape') {
        clearSelection();
        setContextMenu(null);
      }
      
      // Copy
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && selectedIds.size === 1) {
        const exp = expenses.find(e => selectedIds.has(e.id));
        if (exp) setClipboard(exp);
      }
      
      // Duplicate
      if ((e.metaKey || e.ctrlKey) && e.key === 'd' && selectedIds.size === 1) {
        e.preventDefault();
        const exp = expenses.find(e => selectedIds.has(e.id));
        if (exp && onExpenseDuplicate) {
          const duplicated: PlannedExpense = {
            ...exp,
            id: generatePlanningId('expense'),
            name: `${exp.name} (copie)`,
            nameEn: `${exp.nameEn} (copy)`,
          };
          onExpenseDuplicate(duplicated);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expenses, selectedIds, onBulkDelete, onExpenseDuplicate, clearSelection]);

  // Group expenses by type
  const opexExpenses = useMemo(() => expenses.filter(e => e.type === 'opex'), [expenses]);
  const capexExpenses = useMemo(() => expenses.filter(e => e.type === 'capex'), [expenses]);

  // Calculate total selected value
  const selectedTotal = useMemo(() => {
    return expenses
      .filter(e => selectedIds.has(e.id))
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses, selectedIds]);

  // Calculate totals per lane
  const laneTotals = useMemo(() => {
    const opexMonthly = opexExpenses.reduce((sum, e) => {
      if (e.frequency === 'monthly') return sum + e.amount;
      if (e.frequency === 'quarterly') return sum + e.amount / 3;
      if (e.frequency === 'yearly') return sum + e.amount / 12;
      return sum;
    }, 0);
    
    const capexTotal = capexExpenses.reduce((sum, e) => sum + e.amount, 0);
    
    return { opexMonthly, capexTotal };
  }, [opexExpenses, capexExpenses]);

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    }
    if (Math.abs(value) >= 1000) {
      return Math.round(value / 1000) + 'K';
    }
    return value.toString();
  };

  const handleQuickAdd = useCallback((type: 'opex' | 'capex', targetDate?: Date) => {
    if (!onExpenseAdd) return;
    
    const expenseStartDate = targetDate || new Date();
    // Snap to first of month
    expenseStartDate.setDate(1);
    
    const expenseEndDate = new Date(expenseStartDate);
    
    if (type === 'opex') {
      // OpEx: 12-month recurring expense
      expenseEndDate.setMonth(expenseEndDate.getMonth() + 12);
    } else {
      // CapEx: One-time expense (single day)
      expenseEndDate.setDate(expenseEndDate.getDate() + 1);
    }
    
    const newExpense: PlannedExpense = {
      id: generatePlanningId('expense'),
      name: isEn ? 'New Expense' : 'Nouvelle dépense',
      nameEn: 'New Expense',
      type,
      category: type === 'opex' ? 'operations' : 'equipment',
      startDate: expenseStartDate.toISOString().split('T')[0],
      endDate: expenseEndDate.toISOString().split('T')[0],
      amount: type === 'opex' ? 5000 : 25000,
      frequency: type === 'opex' ? 'monthly' : 'one_time',
      isLocked: false,
      confidence: 70,
    };
    
    onExpenseAdd(newExpense);
    setSelectedIds(new Set([newExpense.id]));
    onExpenseClick?.(newExpense);
  }, [onExpenseAdd, onExpenseClick, isEn]);

  const renderLane = (
    type: 'opex' | 'capex',
    laneExpenses: PlannedExpense[],
    ref: React.RefObject<HTMLDivElement>
  ) => {
    const color = type === 'opex' ? OPEX_COLOR : CAPEX_COLOR;
    const title = type === 'opex' 
      ? (isEn ? 'OpEx (Operating Expenses)' : 'OpEx (Dépenses opérationnelles)')
      : (isEn ? 'CapEx (Capital Expenditures)' : 'CapEx (Dépenses en capital)');
    const total = type === 'opex' ? laneTotals.opexMonthly : laneTotals.capexTotal;
    const totalLabel = type === 'opex' ? '/mo' : ' total';

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-sm" 
              style={{ backgroundColor: color }} 
            />
            <span className="text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
              {title}
            </span>
            <span 
              className="text-xs px-1.5 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: 'rgb(var(--color-bg-muted))', color: 'rgb(var(--color-text-muted))' }}
            >
              {laneExpenses.length}
            </span>
            {laneExpenses.length > 0 && (
              <span 
                className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ backgroundColor: `${color}15`, color }}
              >
                <Calculator className="w-3 h-3" />
                ${formatCurrency(total)}{totalLabel}
              </span>
            )}
          </div>
          
          {/* Quick Add Button */}
          <button
            onClick={() => handleQuickAdd(type)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors"
            style={{
              backgroundColor: color,
              color: 'white',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
              e.currentTarget.style.boxShadow = `0 4px 12px ${color}40`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            {isEn ? 'Add' : 'Ajouter'}
          </button>
        </div>

        <div 
          ref={ref}
          className="relative ml-5 rounded-lg overflow-hidden transition-all"
          style={{ 
            backgroundColor: 'rgb(var(--color-bg-subtle))',
            minHeight: laneExpenses.length === 0 ? '80px' : `${Math.max(80, laneExpenses.length * 48 + 16)}px`,
            position: 'relative',
            border: `2px dashed ${color}25`,
          }}
          onContextMenu={(e) => handleContextMenu(e, undefined, type)}
          onDoubleClick={(e) => {
            if (onExpenseAdd && ref.current) {
              const rect = ref.current.getBoundingClientRect();
              const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
              const clickDate = positionToDate(xPercent);
              handleQuickAdd(type, clickDate);
            }
          }}
        >
          {/* Grid lines */}
          <div className="absolute inset-0 flex pointer-events-none" style={{ zIndex: 0 }}>
            {periods.map((period, i) => (
              <div 
                key={i} 
                className="border-r last:border-r-0"
                style={{ 
                  width: `${period.width}%`,
                  borderColor: 'rgb(var(--color-border) / 0.15)',
                  backgroundColor: period.isCurrentPeriod ? `${color}08` : 'transparent',
                }}
              />
            ))}
          </div>

          {/* Today marker */}
          {todayPosition !== null && (
            <>
              <div
                className="absolute top-0 w-0.5 pointer-events-none"
                style={{
                  left: `${todayPosition}%`,
                  height: '100%',
                  backgroundColor: '#EF4444',
                  zIndex: 5,
                }}
              />
              <div
                className="absolute -top-1 w-2 h-2 rounded-full pointer-events-none"
                style={{
                  left: `calc(${todayPosition}% - 3px)`,
                  backgroundColor: '#EF4444',
                  zIndex: 6,
                }}
              />
            </>
          )}

          {/* Empty state */}
          {laneExpenses.length === 0 && (
            <div 
              className="absolute inset-0 flex items-center justify-center cursor-pointer group"
              style={{ zIndex: 1 }}
              onClick={(e) => {
                e.stopPropagation();
                handleQuickAdd(type);
              }}
            >
              <div 
                className="flex flex-col items-center gap-2 px-6 py-4 rounded-xl transition-all group-hover:scale-105"
                style={{ 
                  backgroundColor: `${color}08`,
                  border: `2px dashed ${color}30`,
                }}
              >
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${color}15` }}
                >
                  <Plus size={20} style={{ color }} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold" style={{ color }}>
                    {isEn 
                      ? `Add ${type === 'opex' ? 'Operating Expense' : 'Capital Expense'}`
                      : `Ajouter ${type === 'opex' ? 'une dépense opérationnelle' : 'une dépense en capital'}`
                    }
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn 
                      ? 'Click here or double-click on the timeline'
                      : 'Cliquez ici ou double-cliquez sur la ligne de temps'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Expense cards */}
          {laneExpenses.map((expense, index) => {
            const { leftPercent, widthPercent } = getExpensePosition(expense);
            const isSelected = selectedIds.has(expense.id);
            const isDragging = dragState?.id === expense.id;
            
            return (
              <EnterpriseExpenseCard
                key={expense.id}
                expense={expense}
                leftPercent={leftPercent}
                widthPercent={widthPercent}
                topOffset={index * 44 + 4}
                isSelected={isSelected}
                isDragging={isDragging}
                onDragStart={(e, dragType) => handleDragStart(e, expense, dragType)}
                onClick={(e) => handleSelect(expense, e)}
                onContextMenu={(e) => handleContextMenu(e, expense)}
              />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <EnterpriseTimelineHeader
        startDate={startDate}
        endDate={endDate}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onNavigate={handleNavigate}
        showZoomControls={true}
        sticky={false}
      />

      {/* Selection info bar */}
      {selectedIds.size > 0 && (
        <div 
          className="flex items-center justify-between px-4 py-2 rounded-lg"
          style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
        >
          <div className="flex items-center gap-3">
            <Layers size={16} style={{ color: 'rgb(var(--color-primary-500))' }} />
            <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-primary-600))' }}>
              {isEn 
                ? `${selectedIds.size} item${selectedIds.size > 1 ? 's' : ''} selected`
                : `${selectedIds.size} élément${selectedIds.size > 1 ? 's' : ''} sélectionné${selectedIds.size > 1 ? 's' : ''}`
              }
            </span>
            <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'rgb(var(--color-primary-500))', color: 'white' }}>
              ${selectedTotal.toLocaleString()}
            </span>
          </div>
          <button
            onClick={clearSelection}
            className="text-xs font-medium px-2 py-1 rounded hover:bg-white/50 transition-colors"
            style={{ color: 'rgb(var(--color-primary-600))' }}
          >
            {isEn ? 'Clear' : 'Effacer'}
          </button>
        </div>
      )}

      {/* Timeline grid reference */}
      <div ref={timelineRef} className="space-y-4">
        {/* OPEX Lane */}
        {renderLane('opex', opexExpenses, opexLaneRef)}
        
        {/* CAPEX Lane */}
        {renderLane('capex', capexExpenses, capexLaneRef)}
      </div>

      {/* Footer instructions */}
      <div 
        className="flex flex-wrap items-center gap-3 pt-4 border-t text-xs"
        style={{ borderColor: 'rgb(var(--color-border))', color: 'rgb(var(--color-text-muted))' }}
      >
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ backgroundColor: 'rgb(var(--color-bg-muted))', color: 'rgb(var(--color-text-secondary))' }}>
            {isEn ? 'Right click' : 'Clic droit'}
          </kbd>
          <span>{isEn ? 'Context menu' : 'Menu contextuel'}</span>
        </div>
        <span style={{ color: 'rgb(var(--color-border))' }}>•</span>
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ backgroundColor: 'rgb(var(--color-bg-muted))', color: 'rgb(var(--color-text-secondary))' }}>⌘</kbd>
          <span>+</span>
          <kbd className="px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ backgroundColor: 'rgb(var(--color-bg-muted))', color: 'rgb(var(--color-text-secondary))' }}>Click</kbd>
          <span>{isEn ? 'Multi-select' : 'Multi-sélection'}</span>
        </div>
        <span style={{ color: 'rgb(var(--color-border))' }}>•</span>
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ backgroundColor: 'rgb(var(--color-bg-muted))', color: 'rgb(var(--color-text-secondary))' }}>Shift</kbd>
          <span>+</span>
          <kbd className="px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ backgroundColor: 'rgb(var(--color-bg-muted))', color: 'rgb(var(--color-text-secondary))' }}>Click</kbd>
          <span>{isEn ? 'Range select' : 'Sélection plage'}</span>
        </div>
        <span style={{ color: 'rgb(var(--color-border))' }}>•</span>
        <div className="flex items-center gap-1.5">
          <GripVertical className="w-3 h-3" />
          <span>{isEn ? 'Drag to move' : 'Glisser pour déplacer'}</span>
        </div>
        <span style={{ color: 'rgb(var(--color-border))' }}>•</span>
        <span>{isEn ? 'Drag edges to resize' : 'Glisser les bords pour redimensionner'}</span>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ExpenseContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          expense={contextMenu.expense}
          selectedExpenses={expenses.filter(e => selectedIds.has(e.id))}
          hasClipboard={clipboard !== null}
          onAction={handleContextMenuAction}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
