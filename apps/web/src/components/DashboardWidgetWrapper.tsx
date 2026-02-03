/**
 * Dashboard Widget Wrapper Component
 * 
 * Wraps dashboard widgets with:
 * - Enhanced drag-and-drop with visual drop zones
 * - Remove controls
 * - Manual resize (drag bottom edge)
 * - Fullscreen mode
 * - Lock/unlock controls (visible even when dashboard is locked)
 * 
 * Inspired by Power BI, Looker, and modern dashboard tools.
 */

import { useState, useRef, useCallback, ReactNode } from 'react';
import { GripHorizontal, GripVertical, Lock, Unlock, Trash2, AlertTriangle, X, Loader2 } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { useSingleChartSize } from '../hooks/useChartSize';
import { useChartLock } from '../hooks/useGraphConfig';

// =====================================================
// CONFIRMATION DIALOG
// =====================================================

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
}

function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel, cancelLabel }: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 9996 }} // Below fullscreen charts (9997) and toasts (9998)
      onClick={onClose}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      />
      
      {/* Dialog */}
      <div
        className="relative rounded-xl p-5 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-150"
        style={{
          backgroundColor: 'rgb(var(--color-surface))',
          border: '1px solid rgb(var(--color-border))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-[rgb(var(--color-bg-muted))] transition-colors"
          style={{ color: 'rgb(var(--color-text-muted))' }}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div 
          className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: 'rgb(var(--color-warning) / 0.1)' }}
        >
          <AlertTriangle className="w-6 h-6" style={{ color: 'rgb(var(--color-warning))' }} />
        </div>

        {/* Title */}
        <h3 
          className="text-lg font-semibold mb-2"
          style={{ color: 'rgb(var(--color-text))' }}
        >
          {title}
        </h3>

        {/* Message */}
        <p 
          className="text-sm mb-6"
          style={{ color: 'rgb(var(--color-text-muted))' }}
        >
          {message}
        </p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'rgb(var(--color-bg-muted))',
              color: 'rgb(var(--color-text))',
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors hover:opacity-90"
            style={{
              backgroundColor: 'rgb(var(--color-error))',
              color: 'white',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

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
  /** Whether the dashboard is currently locked */
  isDashboardLocked?: boolean;
  /** Callback to toggle dashboard lock */
  onToggleLock?: () => void;
  /** Whether user has permission to customize (separate from lock state) */
  hasCustomizePermission?: boolean;
  /** Chart ID for individual chart lock (if this is a chart widget) */
  chartId?: string;
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
  isDashboardLocked = false,
  onToggleLock,
  hasCustomizePermission = false,
  chartId,
}: DashboardWidgetWrapperProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const [isHovered, setIsHovered] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [localDropPosition, setLocalDropPosition] = useState<'before' | 'after' | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  
  // Chart-level lock (individual chart lock)
  const { locked: isChartLocked, isLocking, toggle: toggleChartLock } = useChartLock(chartId || '');
  
  // Effective lock state: dashboard locked OR chart locked
  const isEffectivelyLocked = isDashboardLocked || (chartId && isChartLocked);
  
  // Show controls if user has permission (even if locked)
  const showControls = hasCustomizePermission || canCustomize;
  
  // Controls visible on hover when user has permission
  const controlsVisible = showControls && isHovered;
  
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

  // If no customize permission at all, just render children
  if (!showControls) {
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
        draggable={canCustomize && !isEffectivelyLocked && !isResizing && id !== 'add-widget'}
        onDragStart={canCustomize && !isEffectivelyLocked ? onDragStart : undefined}
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
        {/* Control buttons - Show on hover when unlocked
            Positioned at top-10 (40px) to avoid overlapping chart titles/headers */}
        {controlsVisible && !isResizing && !isDragging && id !== 'add-widget' && !isEffectivelyLocked && (
          <>
            {/* Left side - Drag handle */}
            <div
              className="absolute left-1.5 top-10 z-20 cursor-grab active:cursor-grabbing transition-opacity"
              style={{
                backgroundColor: 'rgb(var(--color-surface))',
                borderRadius: '6px',
                padding: '4px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
              }}
              title={isEn ? 'Drag to reorder' : 'Glisser pour réorganiser'}
            >
              <GripVertical className="w-3.5 h-3.5" style={{ color: 'rgb(var(--color-text-muted))' }} />
            </div>

            {/* Right side - Remove button */}
            {onRemove && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRemoveConfirm(true);
                }}
                className="absolute right-1.5 top-10 z-20 p-1 rounded-md transition-colors hover:bg-[rgb(var(--color-error)/0.1)]"
                style={{
                  backgroundColor: 'rgb(var(--color-surface))',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
                  color: 'rgb(var(--color-error))',
                }}
                title={isEn ? 'Remove widget' : 'Supprimer'}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        )}
        
        {/* Locked indicator - Shows when dashboard or chart is locked */}
        {showControls && isEffectivelyLocked && isHovered && !isDragging && id !== 'add-widget' && (
          <div
            className="absolute left-1.5 top-10 z-20 flex items-center gap-1.5 px-2 py-1 rounded-md transition-opacity"
            style={{
              backgroundColor: 'rgb(var(--color-warning) / 0.1)',
              border: '1px solid rgb(var(--color-warning) / 0.3)',
            }}
            title={
              isChartLocked 
                ? (isEn ? 'Chart is locked. Click to unlock.' : 'Graphique verrouillé. Cliquez pour déverrouiller.')
                : (isEn ? 'Dashboard is locked. Click "Verrouiller" to unlock.' : 'Tableau verrouillé. Cliquez sur "Verrouiller" pour déverrouiller.')
            }
          >
            <Lock className="w-3 h-3" style={{ color: 'rgb(var(--color-warning))' }} />
            <span className="text-[10px] font-medium" style={{ color: 'rgb(var(--color-warning))' }}>
              {isChartLocked 
                ? (isEn ? 'Chart Locked' : 'Graphique verrouillé')
                : (isEn ? 'Locked' : 'Verrouillé')
              }
            </span>
          </div>
        )}
        
        {/* Chart lock toggle button - Shows for chart widgets when not dashboard locked */}
        {showControls && chartId && isHovered && !isDragging && id !== 'add-widget' && !isDashboardLocked && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleChartLock();
            }}
            disabled={isLocking}
            className="absolute right-10 top-10 z-20 p-1 rounded-md transition-colors"
            style={{
              backgroundColor: isChartLocked 
                ? 'rgb(var(--color-warning) / 0.1)' 
                : 'rgb(var(--color-surface))',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
              color: isChartLocked 
                ? 'rgb(var(--color-warning))' 
                : 'rgb(var(--color-text-muted))',
            }}
            title={isChartLocked 
              ? (isEn ? 'Unlock chart' : 'Déverrouiller le graphique')
              : (isEn ? 'Lock chart' : 'Verrouiller le graphique')
            }
          >
            {isLocking ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isChartLocked ? (
              <Lock className="w-3.5 h-3.5" />
            ) : (
              <Unlock className="w-3.5 h-3.5" />
            )}
          </button>
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

        {/* Resize Handle - bottom center, only for chart widgets - respects visibility mode */}
        {showControls && enableResize && showChartControls && (controlsVisible || isResizing) && !isDragging && id !== 'add-widget' && (
          <div
            className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-4 flex items-center justify-center transition-opacity z-20 ${
              isResizing ? 'opacity-100' : 'opacity-0 group-hover:opacity-70 hover:opacity-100'
            } ${canCustomize && !isEffectivelyLocked ? 'cursor-ns-resize' : 'cursor-not-allowed'}`}
            onMouseDown={canCustomize && !isEffectivelyLocked ? handleResizeStart : undefined}
            onTouchStart={canCustomize && !isEffectivelyLocked ? handleResizeStart : undefined}
            title={isEffectivelyLocked 
              ? (isEn ? 'Unlock to resize' : 'Déverrouiller pour redimensionner')
              : (isEn ? 'Drag to resize' : 'Glisser pour redimensionner')
            }
          >
            <div 
              className="px-3 py-0.5 rounded-full transition-all"
              style={{ 
                backgroundColor: isResizing 
                  ? 'rgb(var(--color-primary-500))' 
                  : 'rgb(var(--color-bg-muted))',
                opacity: isEffectivelyLocked ? 0.5 : 1,
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

      {/* Remove confirmation dialog */}
      {onRemove && (
        <ConfirmDialog
          isOpen={showRemoveConfirm}
          onClose={() => setShowRemoveConfirm(false)}
          onConfirm={onRemove}
          title={isEn ? 'Hide Widget?' : 'Masquer le widget?'}
          message={isEn 
            ? 'This widget will be hidden from your dashboard. You can restore it later from the widget menu.'
            : 'Ce widget sera masqué de votre tableau de bord. Vous pourrez le restaurer plus tard depuis le menu des widgets.'
          }
          confirmLabel={isEn ? 'Hide' : 'Masquer'}
          cancelLabel={isEn ? 'Cancel' : 'Annuler'}
        />
      )}
    </div>
  );
}
