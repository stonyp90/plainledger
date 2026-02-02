/**
 * Dashboard Widget Wrapper Component
 * 
 * Wraps dashboard widgets with:
 * - Drag-and-drop reordering
 * - Remove controls
 * - Manual resize (drag bottom edge)
 * - Fullscreen mode
 * 
 * Only shows controls to users with customize:dashboard permission.
 * Settings are automatically saved.
 */

import { useState, useRef, useCallback, useEffect, ReactNode } from 'react';
import { X, Maximize2, Minimize2, RotateCcw, GripHorizontal, Move } from 'lucide-react';
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
}: DashboardWidgetWrapperProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const [isHovered, setIsHovered] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Use chart size hook for persistence (auto-saves)
  const {
    height: savedHeight,
    setHeight,
    reset,
  } = useSingleChartSize(pageId, id, defaultHeight);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

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
      // Prevent body scroll when fullscreen
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

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
    <div
      ref={containerRef}
      className={`relative group ${className}`}
      draggable={canCustomize && !isResizing}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        opacity: isDragging ? 0.5 : 1,
        transition: isResizing ? 'none' : 'opacity 0.2s',
        height: currentHeight ? `${currentHeight}px` : 'auto',
        minHeight: enableResize ? `${minHeight}px` : undefined,
      }}
    >
      {/* Move Handle - top left, visible on hover */}
      {canCustomize && isHovered && !isResizing && id !== 'add-widget' && (
        <div
          className="absolute left-2 top-2 z-20 cursor-grab active:cursor-grabbing flex items-center gap-1 px-2 py-1 rounded-md transition-all hover:scale-105"
          style={{
            backgroundColor: 'rgb(var(--color-surface))',
            border: '1px solid rgb(var(--color-border))',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
          }}
          title={isEn ? 'Drag to reorder' : 'Glisser pour réorganiser'}
        >
          <Move
            className="w-3.5 h-3.5"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          />
          <span 
            className="text-xs font-medium"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {isEn ? 'Move' : 'Déplacer'}
          </span>
        </div>
      )}

      {/* Control buttons - top right, visible on hover */}
      {canCustomize && isHovered && !isResizing && id !== 'add-widget' && (
        <div 
          className="absolute right-2 top-2 z-20 flex items-center gap-1"
          style={{
            backgroundColor: 'rgb(var(--color-surface))',
            border: '1px solid rgb(var(--color-border))',
            borderRadius: '8px',
            padding: '4px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
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

      {/* Drop Indicator */}
      {isDragOver && (
        <div
          className="absolute inset-0 border-2 border-dashed rounded-xl pointer-events-none z-0"
          style={{
            borderColor: 'rgb(var(--color-primary-500))',
            backgroundColor: 'rgb(var(--color-primary-500) / 0.05)',
          }}
        />
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
      {canCustomize && enableResize && (isHovered || isResizing) && id !== 'add-widget' && (
        <div
          className={`absolute bottom-0 left-0 right-0 h-4 cursor-ns-resize flex items-center justify-center transition-opacity z-20 ${
            isResizing ? 'opacity-100' : 'opacity-70 hover:opacity-100'
          }`}
          onMouseDown={handleResizeStart}
          onTouchStart={handleResizeStart}
        >
          <div 
            className="flex items-center gap-1 px-3 py-0.5 rounded-full"
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
      {isResizing && (
        <div 
          className="absolute inset-0 border-2 rounded-lg pointer-events-none z-10"
          style={{ 
            borderColor: 'rgb(var(--color-primary-500))',
            backgroundColor: 'rgb(var(--color-primary-500) / 0.03)',
          }}
        >
          <div 
            className="absolute top-2 left-12 px-2 py-1 rounded text-xs font-mono"
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
  );
}
