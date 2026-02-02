/**
 * Dashboard Widget Wrapper Component
 * 
 * Wraps dashboard widgets with:
 * - Drag-and-drop reordering
 * - Remove controls
 * - Resize functionality (height adjustment with persistence)
 * 
 * Only shows controls to users with customize:dashboard permission.
 */

import { useState, useRef, useCallback, ReactNode } from 'react';
import { X, Lock, Unlock, Maximize2, Minimize2, RotateCcw, GripHorizontal, Move } from 'lucide-react';
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
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  
  // Use chart size hook for persistence
  const {
    height: savedHeight,
    locked,
    setHeight,
    toggleLock,
    reset,
  } = useSingleChartSize(pageId, id, defaultHeight);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (locked || !enableResize) return;
    
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
  }, [locked, enableResize, savedHeight, minHeight, maxHeight, setHeight]);

  // Size presets
  const sizePresets = [
    { label: isEn ? 'Small' : 'Petit', height: 200 },
    { label: isEn ? 'Medium' : 'Moyen', height: 300 },
    { label: isEn ? 'Large' : 'Grand', height: 420 },
    { label: isEn ? 'X-Large' : 'Très grand', height: 550 },
  ];

  const currentHeight = savedHeight;
  const hasCustomSize = savedHeight !== undefined;

  if (!canCustomize) {
    return <div className={className}>{children}</div>;
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
      onMouseLeave={() => {
        setIsHovered(false);
        setShowSizeMenu(false);
      }}
      style={{
        opacity: isDragging ? 0.5 : 1,
        transition: isResizing ? 'none' : 'opacity 0.2s',
        height: currentHeight ? `${currentHeight}px` : 'auto',
        minHeight: enableResize ? `${minHeight}px` : undefined,
      }}
    >
      {/* Move Handle - top left inside chart, visible on hover */}
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

      {/* Resize Controls - visible on hover */}
      {canCustomize && enableResize && isHovered && !isResizing && id !== 'add-widget' && (
        <div 
          className="absolute -right-2 top-10 z-10 flex flex-col gap-1"
          style={{
            backgroundColor: 'rgb(var(--color-surface))',
            border: '1px solid rgb(var(--color-border))',
            borderRadius: '8px',
            padding: '4px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          }}
        >
          {/* Size menu toggle */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowSizeMenu(!showSizeMenu);
              }}
              className="p-1.5 rounded transition-colors"
              style={{ 
                backgroundColor: hasCustomSize ? 'rgb(var(--color-primary-500) / 0.1)' : 'transparent',
                color: hasCustomSize ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text-muted))',
              }}
              title={isEn ? 'Resize' : 'Redimensionner'}
            >
              {hasCustomSize ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Size preset menu */}
            {showSizeMenu && (
              <div 
                className="absolute right-full top-0 mr-1 rounded-lg shadow-lg border overflow-hidden"
                style={{ 
                  backgroundColor: 'rgb(var(--color-surface))',
                  borderColor: 'rgb(var(--color-border))',
                  minWidth: '130px',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-1">
                  {sizePresets.map((preset) => (
                    <button
                      key={preset.height}
                      onClick={() => {
                        setHeight(preset.height);
                        setShowSizeMenu(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 text-xs rounded transition-colors ${
                        currentHeight === preset.height ? 'font-medium' : ''
                      }`}
                      style={{ 
                        backgroundColor: currentHeight === preset.height 
                          ? 'rgb(var(--color-primary-500) / 0.1)' 
                          : 'transparent',
                        color: currentHeight === preset.height 
                          ? 'rgb(var(--color-primary-500))' 
                          : 'rgb(var(--color-text))',
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                
                {hasCustomSize && (
                  <div 
                    className="border-t p-1"
                    style={{ borderColor: 'rgb(var(--color-border))' }}
                  >
                    <button
                      onClick={() => {
                        reset();
                        setShowSizeMenu(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-xs rounded flex items-center gap-1.5 transition-colors"
                      style={{ color: 'rgb(var(--color-text-muted))' }}
                    >
                      <RotateCcw className="w-3 h-3" />
                      {isEn ? 'Reset' : 'Réinit.'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Lock toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleLock();
            }}
            className="p-1.5 rounded transition-colors"
            style={{ 
              backgroundColor: locked ? 'rgb(var(--color-warning) / 0.1)' : 'transparent',
              color: locked ? 'rgb(var(--color-warning))' : 'rgb(var(--color-text-muted))',
            }}
            title={locked ? (isEn ? 'Unlock size' : 'Déverrouiller') : (isEn ? 'Lock size' : 'Verrouiller')}
          >
            {locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {/* Remove Button - visible on hover (but not for add-widget) */}
      {canCustomize && isHovered && !isResizing && onRemove && id !== 'add-widget' && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute -right-2 -top-2 z-10 p-1.5 rounded-full transition-all hover:scale-110"
          style={{
            backgroundColor: 'rgb(var(--color-error))',
            color: 'white',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          }}
          title={isEn ? 'Remove widget' : 'Retirer le widget'}
        >
          <X className="w-3 h-3" />
        </button>
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

      {/* Resize Handle - bottom edge */}
      {canCustomize && enableResize && !locked && (isHovered || isResizing) && id !== 'add-widget' && (
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
            className="absolute top-2 left-2 px-2 py-1 rounded text-xs font-mono"
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