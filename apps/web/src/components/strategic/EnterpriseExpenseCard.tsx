/**
 * Enterprise Expense Card Component
 * 
 * Individual expense item with enhanced interactions, tooltips, and visual feedback
 */

import { useCallback, useState, useRef, useEffect } from 'react';
import { GripVertical, Lock, AlertCircle, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { PlannedExpense } from '../../lib/strategicPlanning';

interface EnterpriseExpenseCardProps {
  expense: PlannedExpense;
  leftPercent: number;
  widthPercent: number;
  topOffset?: number;
  isSelected?: boolean;
  isDragging?: boolean;
  showTooltip?: boolean;
  onDragStart?: (e: React.MouseEvent | React.TouchEvent, type: 'move' | 'resize-start' | 'resize-end') => void;
  onClick?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

const OPEX_COLORS = {
  bg: '#3B82F6',
  bgLight: '#EFF6FF',
  bgHover: '#DBEAFE',
  border: '#3B82F6',
  text: '#1E40AF',
};

const CAPEX_COLORS = {
  bg: '#F59E0B',
  bgLight: '#FFFBEB',
  bgHover: '#FEF3C7',
  border: '#F59E0B',
  text: '#92400E',
};

const CATEGORY_ICONS: Record<string, string> = {
  salaries: '👥',
  rent: '🏢',
  marketing: '📣',
  software: '💻',
  utilities: '⚡',
  operations: '⚙️',
  equipment: '🔧',
  property: '🏠',
  vehicles: '🚗',
  infrastructure: '🏗️',
  other: '📦',
};

export default function EnterpriseExpenseCard({
  expense,
  leftPercent,
  widthPercent,
  topOffset = 0,
  isSelected = false,
  isDragging = false,
  showTooltip: externalShowTooltip,
  onDragStart,
  onClick,
  onContextMenu,
}: EnterpriseExpenseCardProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const [isHovered, setIsHovered] = useState(false);
  const [internalShowTooltip, setInternalShowTooltip] = useState(false);
  const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const showTooltip = externalShowTooltip ?? internalShowTooltip;

  // Handle tooltip delay
  useEffect(() => {
    if (isHovered && !isDragging) {
      tooltipTimeoutRef.current = setTimeout(() => {
        setInternalShowTooltip(true);
      }, 500);
    } else {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
      setInternalShowTooltip(false);
    }

    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, [isHovered, isDragging]);

  const formatCurrency = useCallback((value: number) => {
    if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  }, []);

  const formatDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', {
      month: 'short',
      day: 'numeric',
      year: '2-digit',
    });
  }, [isEn]);

  const colors = expense.type === 'opex' ? OPEX_COLORS : CAPEX_COLORS;
  const displayName = isEn ? expense.nameEn : expense.name;
  const categoryIcon = CATEGORY_ICONS[expense.category] || '📦';
  
  const frequencyLabel = expense.frequency === 'one_time' 
    ? '' 
    : `/${expense.frequency === 'monthly' ? 'mo' : expense.frequency === 'quarterly' ? 'qtr' : 'yr'}`;
  
  const amountText = `${formatCurrency(expense.amount)}${frequencyLabel}`;

  // Calculate total cost over duration
  const durationMonths = Math.max(1, Math.ceil(
    (new Date(expense.endDate).getTime() - new Date(expense.startDate).getTime()) / 
    (1000 * 60 * 60 * 24 * 30)
  ));
  
  let totalCost = expense.amount;
  if (expense.frequency === 'monthly') {
    totalCost = expense.amount * durationMonths;
  } else if (expense.frequency === 'quarterly') {
    totalCost = expense.amount * Math.ceil(durationMonths / 3);
  } else if (expense.frequency === 'annual') {
    totalCost = expense.amount * Math.ceil(durationMonths / 12);
  }

  const isLowConfidence = expense.confidence < 50;

  return (
    <>
      <div
        ref={cardRef}
        className="absolute transition-all duration-150 select-none"
        style={{
          left: `${leftPercent}%`,
          width: `${widthPercent}%`,
          top: `${topOffset}px`,
          height: '40px',
          minWidth: '90px',
          zIndex: isDragging ? 50 : isSelected ? 40 : isHovered ? 30 : 10,
          pointerEvents: 'auto',
          cursor: expense.isLocked ? 'default' : 'pointer',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onClick}
        onContextMenu={onContextMenu}
      >
        <div
          className={`h-full rounded-lg flex items-center gap-1.5 px-2 transition-all duration-150 ${
            isDragging ? 'shadow-2xl ring-2 ring-offset-2' : isSelected ? 'shadow-lg ring-2' : isHovered ? 'shadow-md' : 'shadow-sm'
          }`}
          style={{
            backgroundColor: isSelected 
              ? colors.bg 
              : isHovered 
                ? colors.bgHover 
                : colors.bgLight,
            border: `2px solid ${colors.border}`,
            ringColor: isSelected || isDragging ? colors.bg : 'transparent',
            transform: isDragging ? 'scale(1.03)' : isHovered ? 'scale(1.01)' : undefined,
            opacity: expense.isLocked ? 0.85 : 1,
          }}
        >
          {/* Drag handle */}
          {onDragStart && !expense.isLocked && (
            <div
              className="flex-shrink-0 cursor-grab active:cursor-grabbing touch-none p-0.5 -ml-0.5 rounded hover:bg-black/5 transition-colors"
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
                style={{ color: isSelected ? 'rgba(255,255,255,0.8)' : colors.text }} 
              />
            </div>
          )}

          {/* Lock icon */}
          {expense.isLocked && (
            <Lock 
              className="w-3 h-3 flex-shrink-0" 
              style={{ color: isSelected ? 'rgba(255,255,255,0.9)' : colors.text }} 
            />
          )}

          {/* Low confidence indicator */}
          {isLowConfidence && !expense.isLocked && (
            <AlertCircle 
              className="w-3 h-3 flex-shrink-0" 
              style={{ color: isSelected ? 'rgba(255,255,255,0.9)' : '#EF4444' }} 
            />
          )}

          {/* Category icon */}
          <span className="text-xs flex-shrink-0">{categoryIcon}</span>

          {/* Amount */}
          <div className="flex-shrink-0">
            <span 
              className="text-[10px] font-bold tabular-nums"
              style={{ color: isSelected ? 'white' : colors.text }}
            >
              {amountText}
            </span>
          </div>
          
          {/* Name (truncated) */}
          <span 
            className="text-xs font-medium truncate flex-1 min-w-0"
            style={{ color: isSelected ? 'white' : 'rgb(var(--color-text))' }}
            title={displayName}
          >
            {displayName}
          </span>

          {/* Resize handles for OPEX */}
          {onDragStart && !expense.isLocked && expense.frequency !== 'one_time' && (
            <>
              {/* Left resize handle */}
              <div
                className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize group"
                style={{ zIndex: 60 }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  onDragStart(e, 'resize-start');
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  onDragStart(e, 'resize-start');
                }}
              >
                <div 
                  className="absolute inset-y-1 left-0.5 w-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: isSelected ? 'white' : colors.bg }}
                />
              </div>
              
              {/* Right resize handle */}
              <div
                className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize group"
                style={{ zIndex: 60 }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  onDragStart(e, 'resize-end');
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  onDragStart(e, 'resize-end');
                }}
              >
                <div 
                  className="absolute inset-y-1 right-0.5 w-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: isSelected ? 'white' : colors.bg }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Enhanced Tooltip */}
      {showTooltip && !isDragging && cardRef.current && (
        <div
          className="fixed z-[100] pointer-events-none animate-fadeIn"
          style={{
            left: `${cardRef.current.getBoundingClientRect().left + cardRef.current.offsetWidth / 2}px`,
            top: `${cardRef.current.getBoundingClientRect().top - 8}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div 
            className="rounded-xl shadow-xl border p-3 min-w-[220px] max-w-[280px]"
            style={{ 
              backgroundColor: 'rgb(var(--color-surface))',
              borderColor: colors.border,
              boxShadow: `0 4px 20px ${colors.bg}20`,
            }}
          >
            {/* Header */}
            <div className="flex items-start gap-2 mb-2">
              <span className="text-lg">{categoryIcon}</span>
              <div className="flex-1 min-w-0">
                <h4 
                  className="font-semibold text-sm truncate"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {displayName}
                </h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span 
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wide"
                    style={{ 
                      backgroundColor: colors.bgLight,
                      color: colors.text,
                    }}
                  >
                    {expense.type}
                  </span>
                  <span 
                    className="text-[10px] capitalize"
                    style={{ color: 'rgb(var(--color-text-muted))' }}
                  >
                    {expense.category}
                  </span>
                </div>
              </div>
            </div>

            {/* Amount info */}
            <div 
              className="flex items-center justify-between py-2 border-t border-b mb-2"
              style={{ borderColor: 'rgb(var(--color-border))' }}
            >
              <div>
                <div className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? 'Amount' : 'Montant'}
                </div>
                <div className="font-bold" style={{ color: colors.text }}>
                  {formatCurrency(expense.amount)}
                  <span className="text-xs font-normal opacity-70">
                    {frequencyLabel}
                  </span>
                </div>
              </div>
              {expense.frequency !== 'one_time' && (
                <div className="text-right">
                  <div className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn ? 'Total' : 'Total'}
                  </div>
                  <div className="font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                    {formatCurrency(totalCost)}
                  </div>
                </div>
              )}
            </div>

            {/* Date range */}
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={12} style={{ color: 'rgb(var(--color-text-muted))' }} />
              <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {formatDate(expense.startDate)} → {formatDate(expense.endDate)}
              </span>
              <span 
                className="text-xs px-1 py-0.5 rounded ml-auto"
                style={{ backgroundColor: 'rgb(var(--color-bg-muted))', color: 'rgb(var(--color-text-muted))' }}
              >
                {durationMonths} {isEn ? 'mo' : 'mois'}
              </span>
            </div>

            {/* Confidence */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn ? 'Confidence' : 'Confiance'}
                  </span>
                  <span 
                    className="text-xs font-medium"
                    style={{ 
                      color: expense.confidence >= 70 
                        ? '#10B981' 
                        : expense.confidence >= 40 
                          ? '#F59E0B' 
                          : '#EF4444'
                    }}
                  >
                    {expense.confidence}%
                  </span>
                </div>
                <div 
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
                >
                  <div 
                    className="h-full rounded-full transition-all"
                    style={{ 
                      width: `${expense.confidence}%`,
                      backgroundColor: expense.confidence >= 70 
                        ? '#10B981' 
                        : expense.confidence >= 40 
                          ? '#F59E0B' 
                          : '#EF4444'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Status badges */}
            <div className="flex items-center gap-1.5 mt-2">
              {expense.isLocked && (
                <span 
                  className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: 'rgb(var(--color-bg-muted))', color: 'rgb(var(--color-text-muted))' }}
                >
                  <Lock size={10} />
                  {isEn ? 'Locked' : 'Verrouillé'}
                </span>
              )}
              {isLowConfidence && (
                <span 
                  className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: '#FEF2F2', color: '#EF4444' }}
                >
                  <AlertCircle size={10} />
                  {isEn ? 'Low confidence' : 'Faible confiance'}
                </span>
              )}
            </div>

            {/* Notes preview */}
            {expense.notes && (
              <div 
                className="mt-2 pt-2 border-t text-xs line-clamp-2"
                style={{ 
                  borderColor: 'rgb(var(--color-border))',
                  color: 'rgb(var(--color-text-muted))'
                }}
              >
                {expense.notes}
              </div>
            )}

            {/* Arrow pointing down */}
            <div 
              className="absolute left-1/2 -bottom-1.5 w-3 h-3 rotate-45 -translate-x-1/2 border-r border-b"
              style={{ 
                backgroundColor: 'rgb(var(--color-surface))',
                borderColor: colors.border,
              }}
            />
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -100%) scale(0.95); }
          to { opacity: 1; transform: translate(-50%, -100%) scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.15s ease-out;
        }
      `}</style>
    </>
  );
}
