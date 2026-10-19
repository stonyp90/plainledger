/**
 * SlideEditor Component
 * PowerPoint-style drag-and-drop editor for slide elements
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  DndContext, 
  DragEndEvent, 
  DragStartEvent,
  useDraggable,
  DragOverlay,
  Modifier,
} from '@dnd-kit/core';
import { 
  Move, 
  Trash2, 
  Copy, 
  Lock, 
  Unlock,
  BarChart3,
  PieChart,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  DollarSign,
  FileText,
  Image,
  Type,
  Square,
  Target,
  Maximize2,
  Minimize2,
  Grid3X3,
} from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { SlideElement, SlideElementType, createSlideElement } from '../../lib/boardMeeting';

interface SlideEditorProps {
  elements: SlideElement[];
  onElementsChange: (elements: SlideElement[]) => void;
  isEditMode: boolean;
  slideTitle?: string;
  backgroundColor?: string;
}

// Draggable Element Component
function DraggableElement({ 
  element, 
  isSelected, 
  onSelect, 
  onDelete,
  onDuplicate,
  onToggleLock,
  onResize,
  isEditMode,
  containerRef,
}: { 
  element: SlideElement;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleLock: () => void;
  onResize: (width: number, height: number) => void;
  isEditMode: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
}) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef<{ width: number; height: number; mouseX: number; mouseY: number } | null>(null);
  
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: element.id,
    disabled: !isEditMode || element.locked,
  });

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${element.position.x}%`,
    top: `${element.position.y}%`,
    width: `${element.position.width}%`,
    height: `${element.position.height}%`,
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
    zIndex: isSelected ? 1000 : element.zIndex,
    cursor: isEditMode && !element.locked ? 'move' : 'default',
    opacity: isDragging ? 0.5 : 1,
    transition: isDragging ? 'none' : 'box-shadow 0.2s',
  };

  const handleResizeStart = useCallback((e: React.MouseEvent, corner: string) => {
    if (!isEditMode || element.locked) return;
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    resizeStartRef.current = {
      width: element.position.width,
      height: element.position.height,
      mouseX: e.clientX,
      mouseY: e.clientY,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizeStartRef.current || !containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const deltaX = ((moveEvent.clientX - resizeStartRef.current.mouseX) / containerRect.width) * 100;
      const deltaY = ((moveEvent.clientY - resizeStartRef.current.mouseY) / containerRect.height) * 100;
      
      let newWidth = resizeStartRef.current.width;
      let newHeight = resizeStartRef.current.height;
      
      if (corner.includes('e')) newWidth = Math.max(5, resizeStartRef.current.width + deltaX);
      if (corner.includes('s')) newHeight = Math.max(5, resizeStartRef.current.height + deltaY);
      
      onResize(newWidth, newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      resizeStartRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [element, isEditMode, onResize, containerRef]);

  const renderContent = () => {
    switch (element.type) {
      case 'title':
      case 'subtitle':
      case 'text':
        return (
          <div 
            className="w-full h-full flex items-center justify-center p-2"
            style={{ 
              textAlign: element.content.textAlign || 'center',
              fontSize: getFontSize(element.content.fontSize),
              fontWeight: element.content.fontWeight || 'normal',
              color: 'rgb(var(--color-text))',
            }}
          >
            {element.content.text}
          </div>
        );
      
      case 'kpi':
      case 'metric':
        return (
          <div 
            className="w-full h-full flex flex-col items-center justify-center p-3 rounded-lg"
            style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
          >
            <span className="text-xs uppercase tracking-wide" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {element.content.label}
            </span>
            <span 
              className="font-bold"
              style={{ 
                fontSize: getFontSize(element.content.fontSize || '2xl'),
                color: 'rgb(var(--color-text))',
              }}
            >
              {element.content.value}
            </span>
            {element.content.trend && (
              <div className="flex items-center gap-1 mt-1">
                {element.content.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500 dark:text-green-400" />}
                {element.content.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500 dark:text-red-400" />}
                {element.content.trend === 'neutral' && <Minus className="w-4 h-4 text-gray-500" />}
                <span className={`text-xs ${element.content.trend === 'up' ? 'text-green-500 dark:text-green-400' : element.content.trend === 'down' ? 'text-red-500 dark:text-red-400' : 'text-gray-500'}`}>
                  {element.content.trendValue}
                </span>
              </div>
            )}
          </div>
        );
      
      case 'chart':
        return (
          <div 
            className="w-full h-full flex flex-col items-center justify-center rounded-lg border"
            style={{ 
              backgroundColor: 'rgb(var(--color-surface))',
              borderColor: 'rgb(var(--color-border))',
            }}
          >
            {element.content.chartType === 'bar' && <BarChart3 className="w-12 h-12" style={{ color: 'rgb(var(--color-primary-500))' }} />}
            {element.content.chartType === 'pie' && <PieChart className="w-12 h-12" style={{ color: 'rgb(var(--color-primary-500))' }} />}
            {element.content.chartType === 'line' && <TrendingUp className="w-12 h-12" style={{ color: 'rgb(var(--color-primary-500))' }} />}
            <span className="text-xs mt-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Chart placeholder' : 'Graphique'}
            </span>
          </div>
        );
      
      case 'alert':
        return (
          <div 
            className="w-full h-full flex items-center gap-2 p-3 rounded-lg"
            style={{ backgroundColor: `${element.content.color || '#ef4444'}20` }}
          >
            <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: element.content.color || '#ef4444' }} />
            <span className="text-sm" style={{ color: element.content.color || '#ef4444' }}>
              {element.content.text}
            </span>
          </div>
        );
      
      case 'icon': {
        const IconComponent = getIconComponent(element.content.icon);
        return (
          <div className="w-full h-full flex items-center justify-center">
            <IconComponent 
              className="w-full h-full max-w-16 max-h-16" 
              style={{ color: element.content.color || 'rgb(var(--color-primary-500))' }} 
            />
          </div>
        );
      }
      
      case 'shape':
        return (
          <div 
            className="w-full h-full rounded-lg"
            style={{ backgroundColor: element.content.color || '#3b82f6' }}
          />
        );
      
      case 'image':
        return element.content.imageUrl ? (
          <img 
            src={element.content.imageUrl} 
            alt="" 
            className="w-full h-full object-cover rounded-lg"
          />
        ) : (
          <div 
            className="w-full h-full flex items-center justify-center rounded-lg border-2 border-dashed"
            style={{ borderColor: 'rgb(var(--color-border))' }}
          >
            <Image className="w-8 h-8" style={{ color: 'rgb(var(--color-text-muted))' }} />
          </div>
        );
      
      case 'table':
        return (
          <div 
            className="w-full h-full flex items-center justify-center rounded-lg border"
            style={{ 
              backgroundColor: 'rgb(var(--color-surface))',
              borderColor: 'rgb(var(--color-border))',
            }}
          >
            <Grid3X3 className="w-8 h-8" style={{ color: 'rgb(var(--color-text-muted))' }} />
            <span className="text-xs ml-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Table' : 'Tableau'}
            </span>
          </div>
        );
      
      default:
        return (
          <div className="w-full h-full flex items-center justify-center">
            <span style={{ color: 'rgb(var(--color-text-muted))' }}>
              {element.type}
            </span>
          </div>
        );
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        if (isEditMode) onSelect();
      }}
      className={`group ${isSelected && isEditMode ? 'ring-2 ring-primary-500' : ''}`}
      {...(isEditMode && !element.locked ? { ...attributes, ...listeners } : {})}
    >
      {renderContent()}
      
      {/* Selection controls */}
      {isSelected && isEditMode && (
        <>
          {/* Control buttons */}
          <div 
            className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1 rounded-lg shadow-lg"
            style={{ backgroundColor: 'rgb(var(--color-surface))' }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); onToggleLock(); }}
              className="p-1.5 rounded hover:bg-black/10 transition-colors"
              title={element.locked ? (isEn ? 'Unlock' : 'Déverrouiller') : (isEn ? 'Lock' : 'Verrouiller')}
            >
              {element.locked ? (
                <Lock className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
              ) : (
                <Unlock className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
              )}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
              className="p-1.5 rounded hover:bg-black/10 transition-colors"
              title={isEn ? 'Duplicate' : 'Dupliquer'}
            >
              <Copy className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 rounded hover:bg-red-500/10 transition-colors"
              title={isEn ? 'Delete' : 'Supprimer'}
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </button>
          </div>
          
          {/* Resize handles */}
          {!element.locked && (
            <>
              <div
                className="absolute -right-1 top-1/2 -translate-y-1/2 w-3 h-8 bg-primary-500 rounded cursor-ew-resize"
                onMouseDown={(e) => handleResizeStart(e, 'e')}
              />
              <div
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-3 bg-primary-500 rounded cursor-ns-resize"
                onMouseDown={(e) => handleResizeStart(e, 's')}
              />
              <div
                className="absolute -right-1.5 -bottom-1.5 w-4 h-4 bg-primary-500 rounded cursor-nwse-resize"
                onMouseDown={(e) => handleResizeStart(e, 'se')}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

// Main SlideEditor Component
export default function SlideEditor({ 
  elements, 
  onElementsChange, 
  isEditMode,
  slideTitle,
  backgroundColor,
}: SlideEditorProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Click outside to deselect
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSelectedElementId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, delta } = event;
    setActiveId(null);
    
    if (!containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const deltaXPercent = (delta.x / containerRect.width) * 100;
    const deltaYPercent = (delta.y / containerRect.height) * 100;
    
    onElementsChange(elements.map(el => {
      if (el.id === active.id) {
        return {
          ...el,
          position: {
            ...el.position,
            x: Math.max(0, Math.min(100 - el.position.width, el.position.x + deltaXPercent)),
            y: Math.max(0, Math.min(100 - el.position.height, el.position.y + deltaYPercent)),
          },
        };
      }
      return el;
    }));
  }, [elements, onElementsChange]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setSelectedElementId(event.active.id as string);
  }, []);

  const handleDeleteElement = useCallback((id: string) => {
    onElementsChange(elements.filter(el => el.id !== id));
    setSelectedElementId(null);
  }, [elements, onElementsChange]);

  const handleDuplicateElement = useCallback((id: string) => {
    const element = elements.find(el => el.id === id);
    if (!element) return;
    
    const newElement: SlideElement = {
      ...element,
      id: `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      position: {
        ...element.position,
        x: Math.min(100 - element.position.width, element.position.x + 3),
        y: Math.min(100 - element.position.height, element.position.y + 3),
      },
      zIndex: Date.now(),
    };
    
    onElementsChange([...elements, newElement]);
    setSelectedElementId(newElement.id);
  }, [elements, onElementsChange]);

  const handleToggleLock = useCallback((id: string) => {
    onElementsChange(elements.map(el => {
      if (el.id === id) {
        return { ...el, locked: !el.locked };
      }
      return el;
    }));
  }, [elements, onElementsChange]);

  const handleResize = useCallback((id: string, width: number, height: number) => {
    onElementsChange(elements.map(el => {
      if (el.id === id) {
        return {
          ...el,
          position: {
            ...el.position,
            width: Math.min(100 - el.position.x, width),
            height: Math.min(100 - el.position.y, height),
          },
        };
      }
      return el;
    }));
  }, [elements, onElementsChange]);

  const handleCanvasClick = useCallback(() => {
    setSelectedElementId(null);
  }, []);

  return (
    <DndContext onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
      <div className="relative w-full h-full">
        {/* Grid toggle */}
        {isEditMode && (
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`absolute top-2 right-2 z-50 p-2 rounded-lg transition-colors ${showGrid ? 'bg-primary-500/20' : 'bg-black/10'}`}
            title={isEn ? 'Toggle grid' : 'Afficher/masquer grille'}
          >
            <Grid3X3 className="w-4 h-4" style={{ color: showGrid ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text-muted))' }} />
          </button>
        )}
        
        {/* Canvas */}
        <div
          ref={containerRef}
          onClick={handleCanvasClick}
          className="relative w-full h-full overflow-hidden rounded-lg"
          style={{ 
            backgroundColor: backgroundColor || 'rgb(var(--color-surface))',
            aspectRatio: '16/9',
          }}
        >
          {/* Grid overlay */}
          {isEditMode && showGrid && (
            <div 
              className="absolute inset-0 pointer-events-none z-0"
              style={{
                backgroundImage: `
                  linear-gradient(to right, rgb(var(--color-border) / 0.3) 1px, transparent 1px),
                  linear-gradient(to bottom, rgb(var(--color-border) / 0.3) 1px, transparent 1px)
                `,
                backgroundSize: '5% 5%',
              }}
            />
          )}
          
          {/* Elements */}
          {elements.map(element => (
            <DraggableElement
              key={element.id}
              element={element}
              isSelected={selectedElementId === element.id}
              onSelect={() => setSelectedElementId(element.id)}
              onDelete={() => handleDeleteElement(element.id)}
              onDuplicate={() => handleDuplicateElement(element.id)}
              onToggleLock={() => handleToggleLock(element.id)}
              onResize={(w, h) => handleResize(element.id, w, h)}
              isEditMode={isEditMode}
              containerRef={containerRef}
            />
          ))}
          
          {/* Empty state */}
          {elements.length === 0 && isEditMode && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Click "Add Element" to start adding content' : 'Cliquez sur "Ajouter élément" pour commencer'}
              </p>
            </div>
          )}
        </div>
      </div>
    </DndContext>
  );
}

// Helper functions
function getFontSize(size?: string): string {
  const sizes: Record<string, string> = {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
  };
  return sizes[size || 'base'] || sizes.base;
}

function getIconComponent(iconName?: string): React.ComponentType<{ className?: string; style?: React.CSSProperties }> {
  const icons: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
    BarChart3,
    PieChart,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    DollarSign,
    FileText,
    Image,
    Target,
    Square,
  };
  return icons[iconName || 'BarChart3'] || BarChart3;
}
