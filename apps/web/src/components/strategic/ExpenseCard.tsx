/**
 * Expense Card Component
 * 
 * Individual expense item with drag, resize, and display capabilities
 */

import { useCallback } from 'react';
import { GripVertical, Lock } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { PlannedExpense } from '../../lib/strategicPlanning';

interface ExpenseCardProps {
  expense: PlannedExpense;
  leftPercent: number;
  widthPercent: number;
  isSelected?: boolean;
  isDragging?: boolean;
  onDragStart?: (e: React.MouseEvent | React.TouchEvent, type: 'move' | 'resize-start' | 'resize-end') => void;
  onClick?: () => void;
}

const OPEX_COLOR = '#3B82F6'; // Blue
const CAPEX_COLOR = '#F59E0B'; // Orange

export default function ExpenseCard({
  expense,
  leftPercent,
  widthPercent,
  isSelected = false,
  isDragging = false,
  onDragStart,
  onClick,
}: ExpenseCardProps) {
  const { language } = useI18n();
  const isEn = language === 'en';

  const formatCurrency = useCallback((value: number) => {
    if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  }, []);

  const color = expense.type === 'opex' ? OPEX_COLOR : CAPEX_COLOR;
  const displayName = isEn ? expense.nameEn : expense.name;
  const amountText = expense.frequency === 'one_time' 
    ? formatCurrency(expense.amount)
    : `${formatCurrency(expense.amount)}/${expense.frequency === 'monthly' ? 'mo' : expense.frequency === 'quarterly' ? 'qtr' : 'yr'}`;

  return (
    <div
      className="absolute transition-all"
      style={{
        left: `${leftPercent}%`,
        width: `${widthPercent}%`,
        height: '40px',
        minWidth: '80px',
        zIndex: isDragging ? 30 : isSelected ? 20 : 10,
        pointerEvents: 'auto',
      }}
    >
      <div
        className={`h-full rounded-lg flex items-center gap-2 px-2 cursor-pointer transition-all ${
          isDragging ? 'shadow-xl ring-2' : 'shadow-sm'
        }`}
        style={{
          backgroundColor: isSelected ? color : `${color}20`,
          border: `2px solid ${color}`,
          ringColor: isDragging ? color : 'transparent',
          transform: isDragging ? 'scale(1.02)' : undefined,
          opacity: expense.isLocked ? 0.7 : 1,
        }}
        onClick={onClick}
      >
        {/* Drag handle */}
        {onDragStart && !expense.isLocked && (
          <div
            className="flex-shrink-0 cursor-move touch-none"
            onMouseDown={(e) => {
              e.stopPropagation();
              onDragStart(e, 'move');
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              onDragStart(e, 'move');
            }}
          >
            <GripVertical 
              className="w-3.5 h-3.5" 
              style={{ color: isSelected ? 'white' : color }} 
            />
          </div>
        )}

        {/* Lock icon for locked expenses */}
        {expense.isLocked && (
          <Lock className="w-3 h-3 flex-shrink-0" style={{ color: isSelected ? 'white' : color }} />
        )}

        {/* Amount */}
        <div className="flex-shrink-0">
          <span 
            className="text-[10px] font-semibold"
            style={{ color: isSelected ? 'white' : color }}
          >
            {amountText}
          </span>
        </div>
        
        {/* Name */}
        <span 
          className="text-xs font-medium truncate flex-1 min-w-0"
          style={{ color: isSelected ? 'white' : 'rgb(var(--color-text))' }}
        >
          {displayName}
        </span>

        {/* Resize handles */}
        {onDragStart && !expense.isLocked && expense.frequency !== 'one_time' && (
          <>
            <div
              className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize rounded-l-lg"
              style={{ 
                backgroundColor: isDragging ? color : 'transparent',
                zIndex: 50,
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                onDragStart(e, 'resize-start');
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                onDragStart(e, 'resize-start');
              }}
            />
            <div
              className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize rounded-r-lg"
              style={{ 
                backgroundColor: isDragging ? color : 'transparent',
                zIndex: 50,
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                onDragStart(e, 'resize-end');
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                onDragStart(e, 'resize-end');
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
