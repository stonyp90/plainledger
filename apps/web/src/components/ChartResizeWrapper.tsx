/**
 * Chart Resize Wrapper
 * 
 * Wraps any chart component to provide:
 * - Drag-to-resize functionality (height)
 * - Size lock toggle
 * - Reset to default
 * - Persisted sizing via useChartSize hook
 */

import { useState, useRef, useCallback, type ReactNode } from 'react';
import { Lock, Unlock, GripVertical, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';
import { useSingleChartSize } from '../hooks/useChartSize';
import { useI18n } from '../lib/i18n';
import { isChartLocked } from '../hooks/useGraphConfig';

interface ChartResizeWrapperProps {
  /** Unique chart ID for persistence */
  chartId: string;
  /** Page ID for scoped persistence */
  pageId: string;
  /** Chart component to wrap */
  children: ReactNode;
  /** Default height in pixels */
  defaultHeight?: number;
  /** Minimum height in pixels */
  minHeight?: number;
  /** Maximum height in pixels */
  maxHeight?: number;
  /** Show resize controls */
  showControls?: boolean;
  /** Additional class name */
  className?: string;
  /** Tenant ID for multi-tenant support */
  tenantId?: string;
}

export default function ChartResizeWrapper({
  chartId,
  pageId,
  children,
  defaultHeight = 280,
  minHeight = 150,
  maxHeight = 800,
  showControls = true,
  className = '',
  tenantId,
}: ChartResizeWrapperProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const {
    height,
    locked: sizeLocked,
    setHeight,
    toggleLock,
    reset,
  } = useSingleChartSize(pageId, chartId, defaultHeight, tenantId);

  // Check if chart configuration is fully locked (prevents all modifications)
  const chartConfigLocked = isChartLocked(chartId);
  
  // Effective lock: either size is locked OR chart config is locked
  const locked = sizeLocked || chartConfigLocked;

  const [isHovered, setIsHovered] = useState(false);
  const controlsVisible = showControls && isHovered;

  const [isResizing, setIsResizing] = useState(false);
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (locked) return;
    
    e.preventDefault();
    setIsResizing(true);
    
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    startYRef.current = clientY;
    startHeightRef.current = height ?? defaultHeight;

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
  }, [locked, height, defaultHeight, minHeight, maxHeight, setHeight]);

  // Quick size presets
  const sizePresets = [
    { label: isEn ? 'Small' : 'Petit', height: 200 },
    { label: isEn ? 'Medium' : 'Moyen', height: 280 },
    { label: isEn ? 'Large' : 'Grand', height: 400 },
    { label: isEn ? 'X-Large' : 'Très grand', height: 550 },
  ];

  const currentHeight = height ?? defaultHeight;
  const hasCustomSize = height !== undefined && height !== defaultHeight;

  return (
    <div 
      ref={containerRef}
      className={`relative group ${className}`}
      style={{ 
        height: locked || height ? `${currentHeight}px` : 'auto',
        minHeight: `${minHeight}px`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Chart content */}
      <div 
        className="h-full overflow-hidden"
        style={{ 
          height: locked || height ? '100%' : 'auto',
        }}
      >
        {children}
      </div>

      {/* Resize controls - visibility based on user preference */}
      {controlsVisible && (
        <div className="absolute top-10 right-2 flex items-center gap-1 transition-opacity z-20">
          {/* Size menu toggle */}
          <div className="relative">
            <button
              onClick={() => setShowSizeMenu(!showSizeMenu)}
              className="p-1.5 rounded-md transition-all duration-200"
              style={{ 
                backgroundColor: 'rgb(var(--color-surface) / 0.9)',
                color: hasCustomSize ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text-muted))',
                backdropFilter: 'blur(4px)',
              }}
              title={isEn ? 'Resize options' : 'Options de redimensionnement'}
            >
              {hasCustomSize ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Size preset menu - z-30 for dropdown menus, opens downward */}
            {showSizeMenu && (
              <div 
                className="absolute right-0 top-full mt-1 rounded-lg shadow-lg border overflow-hidden z-30"
                style={{ 
                  backgroundColor: 'rgb(var(--color-surface))',
                  borderColor: 'rgb(var(--color-border))',
                  minWidth: '140px',
                }}
              >
                <div className="p-1">
                  {sizePresets.map((preset) => (
                    <button
                      key={preset.height}
                      onClick={() => {
                        setHeight(preset.height);
                        setShowSizeMenu(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs rounded transition-colors ${
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
                      {preset.label} ({preset.height}px)
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
                      className="w-full text-left px-3 py-1.5 text-xs rounded flex items-center gap-2 transition-colors"
                      style={{ 
                        color: 'rgb(var(--color-text-muted))',
                      }}
                    >
                      <RotateCcw className="w-3 h-3" />
                      {isEn ? 'Reset to default' : 'Réinitialiser'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Lock toggle */}
          <button
            onClick={chartConfigLocked ? undefined : toggleLock}
            disabled={chartConfigLocked}
            className="p-1.5 rounded-md transition-all duration-200"
            style={{ 
              backgroundColor: locked 
                ? 'rgb(var(--color-warning) / 0.1)' 
                : 'rgb(var(--color-surface) / 0.9)',
              color: locked 
                ? 'rgb(var(--color-warning))' 
                : 'rgb(var(--color-text-muted))',
              backdropFilter: 'blur(4px)',
              opacity: chartConfigLocked ? 0.5 : 1,
              cursor: chartConfigLocked ? 'not-allowed' : 'pointer',
            }}
            title={chartConfigLocked 
              ? (isEn ? 'Chart is fully locked' : 'Graphique entièrement verrouillé')
              : locked 
                ? (isEn ? 'Unlock size' : 'Déverrouiller la taille')
                : (isEn ? 'Lock size' : 'Verrouiller la taille')
            }
          >
            {locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {/* Resize handle - bottom edge */}
      {(controlsVisible || isResizing) && !locked && (
        <div
          className={`absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize flex items-center justify-center transition-opacity ${
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
            <GripVertical 
              className="w-3 h-3 rotate-90" 
              style={{ 
                color: isResizing 
                  ? 'white' 
                  : 'rgb(var(--color-text-muted))',
              }} 
            />
          </div>
        </div>
      )}

      {/* Resize indicator while dragging */}
      {isResizing && (
        <div 
          className="absolute inset-0 border-2 rounded-lg pointer-events-none"
          style={{ 
            borderColor: 'rgb(var(--color-primary-500))',
            backgroundColor: 'rgb(var(--color-primary-500) / 0.05)',
          }}
        >
          <div 
            className="absolute top-2 left-2 px-2 py-1 rounded text-xs font-mono"
            style={{ 
              backgroundColor: 'rgb(var(--color-primary-500))',
              color: 'white',
            }}
          >
            {currentHeight}px
          </div>
        </div>
      )}

    </div>
  );
}

/**
 * Compact resize controls for inline use
 */
export function ChartResizeControls({
  chartId,
  pageId,
  defaultHeight = 280,
  tenantId,
}: {
  chartId: string;
  pageId: string;
  defaultHeight?: number;
  tenantId?: string;
}) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const {
    height,
    locked: sizeLocked,
    setHeight,
    toggleLock,
    reset,
  } = useSingleChartSize(pageId, chartId, defaultHeight, tenantId);

  // Check if chart configuration is fully locked
  const chartConfigLocked = isChartLocked(chartId);
  const locked = sizeLocked || chartConfigLocked;

  const hasCustomSize = height !== undefined && height !== defaultHeight;

  return (
    <div className="flex items-center gap-1">
      {/* Decrease height */}
      <button
        onClick={() => setHeight(Math.max(150, (height ?? defaultHeight) - 50))}
        disabled={locked}
        className="p-1 rounded transition-colors disabled:opacity-30"
        style={{ 
          backgroundColor: 'transparent',
          color: 'rgb(var(--color-text-muted))',
        }}
        title={isEn ? 'Decrease height' : 'Réduire la hauteur'}
      >
        <Minimize2 className="w-3 h-3" />
      </button>

      {/* Current height indicator */}
      <span 
        className="text-[10px] font-mono min-w-[40px] text-center"
        style={{ color: 'rgb(var(--color-text-muted))' }}
      >
        {height ?? defaultHeight}px
      </span>

      {/* Increase height */}
      <button
        onClick={() => setHeight(Math.min(800, (height ?? defaultHeight) + 50))}
        disabled={locked}
        className="p-1 rounded transition-colors disabled:opacity-30"
        style={{ 
          backgroundColor: 'transparent',
          color: 'rgb(var(--color-text-muted))',
        }}
        title={isEn ? 'Increase height' : 'Augmenter la hauteur'}
      >
        <Maximize2 className="w-3 h-3" />
      </button>

      {/* Lock toggle */}
      <button
        onClick={chartConfigLocked ? undefined : toggleLock}
        disabled={chartConfigLocked}
        className="p-1 rounded transition-colors"
        style={{ 
          backgroundColor: locked ? 'rgb(var(--color-warning) / 0.1)' : 'transparent',
          color: locked ? 'rgb(var(--color-warning))' : 'rgb(var(--color-text-muted))',
          opacity: chartConfigLocked ? 0.5 : 1,
          cursor: chartConfigLocked ? 'not-allowed' : 'pointer',
        }}
        title={chartConfigLocked 
          ? (isEn ? 'Chart locked' : 'Graphique verrouillé') 
          : locked 
            ? (isEn ? 'Unlock' : 'Déverrouiller') 
            : (isEn ? 'Lock' : 'Verrouiller')
        }
      >
        {locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
      </button>

      {/* Reset */}
      {hasCustomSize && (
        <button
          onClick={reset}
          className="p-1 rounded transition-colors"
          style={{ 
            backgroundColor: 'transparent',
            color: 'rgb(var(--color-text-muted))',
          }}
          title={isEn ? 'Reset' : 'Réinitialiser'}
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
