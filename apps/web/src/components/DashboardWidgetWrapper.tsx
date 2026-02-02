/**
 * Dashboard Widget Wrapper Component
 * 
 * Wraps dashboard widgets with:
 * - Enhanced drag-and-drop with visual drop zones
 * - Remove controls
 * - Manual resize (drag bottom edge)
 * - Fullscreen mode
 * 
 * Inspired by Power BI, Looker, and modern dashboard tools.
 */

import { useState, useRef, useCallback, ReactNode } from 'react';
import { X, GripHorizontal, GripVertical } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { useSingleChartSize } from '../hooks/useChartSize';

interface DashboardWidgetWrapperProps {
  id: string;
  children: ReactNode;
  onRemove?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  canCustomize: boolean;
  isDragging?: boolean;
  isDragOver?: boolean;
  className?: string;
  /** Enable resize functionality */
  enableResize?: boolean;
  /** Show chart controls (fullscreen, resize) - only for graph widgets */
  showChartControls?: boolean;
  /** Page ID for resize persistence (defaults to 'dashboard') */
  pageId?: string;
  /** Default height in pixels */
  defaultHeight?: number;
  /** Minimum height in pixels */
  minHeight?: number;
  /** Maximum height in pixels */
  maxHeight?: number;
  /** Position of drop indicator: 'before' | 'after' | null */
  dropPosition?: 'before' | 'after' | null;
  /** Callback to set drop position */
  onDropPositionChange?: (position: 'before' | 'after' | null) => void;
}

export default function DashboardWidgetWrapper({
  id,
  children,
  onRemove,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  canCustomize,
  isDragging = false,
  isDragOver = false,
  className = '',
  enableResize = false, // Disabled by default - only for charts
  showChartControls = false, // Only show fullscreen/resize on charts
  pageId = 'dashboard',
  defaultHeight,
  minHeight = 150,
  maxHeight = 800,
  dropPosition,
  onDropPositionChange,
}: DashboardWidgetWrapperProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const [isHovered, setIsHovered] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [localDropPosition, setLocalDropPosition] = useState<'before' | 'after' | null>(null);
  
  // Use chart size hook for persistence (auto-saves) - only for charts
  const {
    height: savedHeight,
    setHeight,
  } = useSingleChartSize(pageId, id, defaultHeight);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  // Use external or local drop position
  const effectiveDropPosition = dropPosition ?? localDropPosition;
  const setEffectiveDropPosition = onDropPositionChange ?? setLocalDropPosition;

  // Enhanced drag over handler - detect drop position (before/after)
  const handleEnhancedDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (containerRef.current && !isDragging) {
      const rect = containerRef.current.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      const position = e.clientY < midpoint ? 'before' : 'after';
      setEffectiveDropPosition(position);
    }
    
    onDragOver?.(e);
  }, [isDragging, onDragOver, setEffectiveDropPosition]);

  // Clear drop position on drag leave
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if actually leaving the element (not entering a child)
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setEffectiveDropPosition(null);
    }
  }, [setEffectiveDropPosition]);

  // Handle resize start - manual drag resize (only for charts)
  const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!enableResize || !showChartControls) return;
    
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    startYRef.current = clientY;
    startHeightRef.current = savedHeight ?? containerRef.current?.offsetHeight ?? 280;

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
      const delta = currentY - startYRef.current;
      const newHeight = Math.max(minHeight, Math.min(maxHeight, startHeightRef.current + delta));
      setHeight(newHeight);
    };

    const handleEnd = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove);
    document.addEventListener('touchend', handleEnd);
  }, [enableResize, showChartControls, savedHeight, minHeight, maxHeight, setHeight]);

  const currentHeight = showChartControls ? savedHeight : undefined;
  const showDropIndicator = isDragOver && effectiveDropPosition && !isDragging;

  if (!canCustomize) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className="relative">
      {/* Drop indicator BEFORE - compact line that fits in tight gaps */}
      {showDropIndicator && effectiveDropPosition === 'before' && (
        <div 
          className="absolute left-0 right-0 z-30 flex items-center pointer-events-none"
          style={{ top: '-5px' }}
        >
          <div 
            className="flex-1 h-0.5 rounded-full"
            style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}
          />
          <div 
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}
          />
          <div 
            className="flex-1 h-0.5 rounded-full"
            style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}
          />
        </div>
      )}

      <div
        ref={containerRef}
        className={`relative group transition-all duration-150 ${className}`}
        draggable={canCustomize && !isResizing && id !== 'add-widget'}
        onDragStart={onDragStart}
        onDragEnd={(e) => {
          setEffectiveDropPosition(null);
          onDragEnd?.(e);
        }}
        onDragOver={handleEnhancedDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(e) => {
          setEffectiveDropPosition(null);
          onDrop?.(e);
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          opacity: isDragging ? 0.3 : 1,
          transform: isDragging ? 'scale(0.97)' : showDropIndicator ? 'scale(1.01)' : 'scale(1)',
          transition: isResizing ? 'none' : 'all 0.15s ease',
          height: currentHeight ? `${currentHeight}px` : 'auto',
          minHeight: enableResize ? `${minHeight}px` : undefined,
          outline: showDropIndicator ? '2px solid rgb(var(--color-primary-500))' : 'none',
          outlineOffset: '2px',
          borderRadius: '12px',
        }}
      >
        {/* Drag handle - compact pill, visible on hover */}
        {canCustomize && isHovered && !isResizing && !isDragging && id !== 'add-widget' && (
          <div
            className="absolute left-1.5 top-1.5 z-20 cursor-grab active:cursor-grabbing p-1 rounded-md transition-all hover:scale-105 opacity-70 hover:opacity-100"
            style={{
              backgroundColor: 'rgb(var(--color-surface))',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
            }}
            title={isEn ? 'Drag to reorder' : 'Glisser pour réorganiser'}
          >
            <GripVertical
              className="w-3.5 h-3.5"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            />
          </div>
        )}

        {/* Control buttons - top right, visible on hover - only show remove for non-charts */}
        {canCustomize && isHovered && !isResizing && !isDragging && id !== 'add-widget' && onRemove && (
          <div 
            className="absolute right-1.5 top-1.5 z-20 flex items-center gap-0.5 opacity-70 hover:opacity-100 transition-opacity"
            style={{
              backgroundColor: 'rgb(var(--color-surface))',
              borderRadius: '6px',
              padding: '2px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
            }}
          >
            {/* Remove button - always available for removable widgets */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="p-1 rounded transition-colors hover:bg-[rgb(var(--color-error)/0.1)]"
              style={{ color: 'rgb(var(--color-error))' }}
              title={isEn ? 'Remove' : 'Retirer'}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Dragging overlay - shows when this widget is being dragged */}
        {isDragging && (
          <div 
            className="absolute inset-0 rounded-xl z-10 flex items-center justify-center"
            style={{ 
              backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
              border: '2px dashed rgb(var(--color-primary-500))',
            }}
          >
            <span 
              className="px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{ 
                backgroundColor: 'rgb(var(--color-primary-500))',
                color: 'white',
              }}
            >
              {isEn ? 'Dragging...' : 'Déplacement...'}
            </span>
          </div>
        )}

        {/* Widget Content */}
        <div 
          className="relative z-0 h-full"
          style={{ 
            overflow: currentHeight ? 'hidden' : 'visible',
          }}
        >
          {children}
        </div>

        {/* Resize Handle - bottom center, only for chart widgets */}
        {canCustomize && enableResize && showChartControls && (isHovered || isResizing) && !isDragging && id !== 'add-widget' && (
          <div
            className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-4 cursor-ns-resize flex items-center justify-center transition-opacity z-20 ${
              isResizing ? 'opacity-100' : 'opacity-0 group-hover:opacity-70 hover:opacity-100'
            }`}
            onMouseDown={handleResizeStart}
            onTouchStart={handleResizeStart}
          >
            <div 
              className="px-3 py-0.5 rounded-full transition-all"
              style={{ 
                backgroundColor: isResizing 
                  ? 'rgb(var(--color-primary-500))' 
                  : 'rgb(var(--color-bg-muted))',
              }}
            >
              <GripHorizontal 
                className="w-4 h-4" 
                style={{ 
                  color: isResizing ? 'white' : 'rgb(var(--color-text-muted))',
                }} 
              />
            </div>
          </div>
        )}

        {/* Resize indicator while dragging */}
        {isResizing && showChartControls && (
          <div 
            className="absolute inset-0 border-2 rounded-xl pointer-events-none z-10"
            style={{ 
              borderColor: 'rgb(var(--color-primary-500))',
              backgroundColor: 'rgb(var(--color-primary-500) / 0.03)',
            }}
          >
            <div 
              className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-mono"
              style={{ 
                backgroundColor: 'rgb(var(--color-primary-500))',
                color: 'white',
              }}
            >
              {currentHeight ?? containerRef.current?.offsetHeight ?? '—'}px
            </div>
          </div>
        )}
      </div>

      {/* Drop indicator AFTER - compact line that fits in tight gaps */}
      {showDropIndicator && effectiveDropPosition === 'after' && (
        <div 
          className="absolute left-0 right-0 z-30 flex items-center pointer-events-none"
          style={{ bottom: '-5px' }}
        >
          <div 
            className="flex-1 h-0.5 rounded-full"
            style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}
          />
          <div 
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}
          />
          <div 
            className="flex-1 h-0.5 rounded-full"
            style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}
          />
        </div>
      )}
    </div>
  );
}
