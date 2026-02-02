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

import { useState, useRef, useCallback, useEffect, ReactNode } from 'react';
import { X, Maximize2, Minimize2, RotateCcw, GripHorizontal, GripVertical } from 'lucide-react';
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
  enableResize = true,
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [localDropPosition, setLocalDropPosition] = useState<'before' | 'after' | null>(null);
  
  // Use chart size hook for persistence (auto-saves)
  const {
    height: savedHeight,
    setHeight,
    reset,
  } = useSingleChartSize(pageId, id, defaultHeight);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  // Use external or local drop position
  const effectiveDropPosition = dropPosition ?? localDropPosition;
  const setEffectiveDropPosition = onDropPositionChange ?? setLocalDropPosition;

  // Handle fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    
    if (isFullscreen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

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

  // Handle resize start - manual drag resize
  const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!enableResize || isFullscreen) return;
    
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
  }, [enableResize, isFullscreen, savedHeight, minHeight, maxHeight, setHeight]);

  const currentHeight = savedHeight;
  const hasCustomSize = savedHeight !== undefined;
  const showDropIndicator = isDragOver && effectiveDropPosition && !isDragging;

  if (!canCustomize) {
    return <div className={className}>{children}</div>;
  }

  // Fullscreen mode
  if (isFullscreen) {
    return (
      <div
        className="fixed inset-0 z-[9998] flex flex-col"
        style={{
          backgroundColor: 'rgb(var(--color-bg))',
        }}
      >
        {/* Fullscreen header */}
        <div 
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? 'Press ESC to exit fullscreen' : 'Appuyez sur ESC pour quitter'}
          </span>
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors"
            style={{
              backgroundColor: 'rgb(var(--color-bg-muted))',
              color: 'rgb(var(--color-text))',
            }}
          >
            <Minimize2 className="w-4 h-4" />
            <span className="text-sm">{isEn ? 'Exit fullscreen' : 'Quitter plein écran'}</span>
          </button>
        </div>
        
        {/* Fullscreen content */}
        <div className="flex-1 p-4 overflow-auto">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Drop indicator BEFORE - horizontal line with label */}
      {showDropIndicator && effectiveDropPosition === 'before' && (
        <div className="absolute -top-2 left-0 right-0 z-30 flex items-center gap-2">
          <div 
            className="flex-1 h-1 rounded-full animate-pulse"
            style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}
          />
          <span 
            className="px-2 py-0.5 text-[10px] font-medium rounded-full whitespace-nowrap"
            style={{ 
              backgroundColor: 'rgb(var(--color-primary-500))',
              color: 'white',
            }}
          >
            {isEn ? 'Drop here' : 'Déposer ici'}
          </span>
          <div 
            className="flex-1 h-1 rounded-full animate-pulse"
            style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}
          />
        </div>
      )}

      <div
        ref={containerRef}
        className={`relative group transition-all duration-200 ${className}`}
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
          opacity: isDragging ? 0.4 : 1,
          transform: isDragging ? 'scale(0.98)' : 'scale(1)',
          transition: isResizing ? 'none' : 'all 0.2s ease',
          height: currentHeight ? `${currentHeight}px` : 'auto',
          minHeight: enableResize ? `${minHeight}px` : undefined,
          outline: showDropIndicator ? '2px dashed rgb(var(--color-primary-500))' : 'none',
          outlineOffset: '4px',
          borderRadius: '12px',
        }}
      >
        {/* Drag handle - visible on hover */}
        {canCustomize && isHovered && !isResizing && !isDragging && id !== 'add-widget' && (
          <div
            className="absolute left-2 top-2 z-20 cursor-grab active:cursor-grabbing flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all hover:scale-105"
            style={{
              backgroundColor: 'rgb(var(--color-surface))',
              border: '1px solid rgb(var(--color-border))',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }}
            title={isEn ? 'Drag to reorder' : 'Glisser pour réorganiser'}
          >
            <GripVertical
              className="w-4 h-4"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            />
            <span 
              className="text-xs font-medium"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {isEn ? 'Drag' : 'Glisser'}
            </span>
          </div>
        )}

        {/* Control buttons - top right, visible on hover */}
        {canCustomize && isHovered && !isResizing && !isDragging && id !== 'add-widget' && (
          <div 
            className="absolute right-2 top-2 z-20 flex items-center gap-1"
            style={{
              backgroundColor: 'rgb(var(--color-surface))',
              border: '1px solid rgb(var(--color-border))',
              borderRadius: '8px',
              padding: '4px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }}
          >
            {/* Fullscreen button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFullscreen();
              }}
              className="p-1.5 rounded transition-colors hover:bg-[rgb(var(--color-bg-muted))]"
              style={{ color: 'rgb(var(--color-text-muted))' }}
              title={isEn ? 'Fullscreen' : 'Plein écran'}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            {/* Reset size button - only show if custom size */}
            {hasCustomSize && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  reset();
                }}
                className="p-1.5 rounded transition-colors hover:bg-[rgb(var(--color-bg-muted))]"
                style={{ color: 'rgb(var(--color-text-muted))' }}
                title={isEn ? 'Reset size' : 'Réinitialiser la taille'}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Remove button */}
            {onRemove && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="p-1.5 rounded transition-colors hover:bg-[rgb(var(--color-error)/0.1)]"
                style={{ color: 'rgb(var(--color-error))' }}
                title={isEn ? 'Remove' : 'Retirer'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
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

        {/* Resize Handle - bottom edge (drag to resize) */}
        {canCustomize && enableResize && (isHovered || isResizing) && !isDragging && id !== 'add-widget' && (
          <div
            className={`absolute bottom-0 left-0 right-0 h-5 cursor-ns-resize flex items-center justify-center transition-opacity z-20 ${
              isResizing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
            onMouseDown={handleResizeStart}
            onTouchStart={handleResizeStart}
          >
            <div 
              className="flex items-center gap-1 px-4 py-1 rounded-full transition-all"
              style={{ 
                backgroundColor: isResizing 
                  ? 'rgb(var(--color-primary-500))' 
                  : 'rgb(var(--color-bg-muted))',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              }}
            >
              <GripHorizontal 
                className="w-4 h-4" 
                style={{ 
                  color: isResizing ? 'white' : 'rgb(var(--color-text-muted))',
                }} 
              />
              <span 
                className="text-[10px] font-medium"
                style={{ 
                  color: isResizing ? 'white' : 'rgb(var(--color-text-muted))',
                }}
              >
                {isEn ? 'Resize' : 'Redim.'}
              </span>
            </div>
          </div>
        )}

        {/* Resize indicator while dragging */}
        {isResizing && (
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

      {/* Drop indicator AFTER - horizontal line with label */}
      {showDropIndicator && effectiveDropPosition === 'after' && (
        <div className="absolute -bottom-2 left-0 right-0 z-30 flex items-center gap-2">
          <div 
            className="flex-1 h-1 rounded-full animate-pulse"
            style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}
          />
          <span 
            className="px-2 py-0.5 text-[10px] font-medium rounded-full whitespace-nowrap"
            style={{ 
              backgroundColor: 'rgb(var(--color-primary-500))',
              color: 'white',
            }}
          >
            {isEn ? 'Drop here' : 'Déposer ici'}
          </span>
          <div 
            className="flex-1 h-1 rounded-full animate-pulse"
            style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}
          />
        </div>
      )}
    </div>
  );
}
