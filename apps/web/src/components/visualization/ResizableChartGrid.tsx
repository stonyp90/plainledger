/**
 * ResizableChartGrid Component
 * 
 * Drag-and-drop grid layout for FP&A charts with:
 * - Move charts by dragging
 * - Resize charts using corner handles
 * - Responsive grid that adapts to screen size
 * - IBCS-compliant layout
 * 
 * Bilingual support (EN/FR)
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Maximize2,
  Minimize2,
  Settings,
  Share2,
  X,
  Move,
} from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import type { ChartWidgetConfig, ChartSize } from './types';

// =====================================================
// TYPES
// =====================================================

interface ResizableChartGridProps {
  widgets: ChartWidgetConfig[];
  onWidgetsChange: (widgets: ChartWidgetConfig[]) => void;
  onWidgetRemove: (widgetId: string) => void;
  onWidgetConfigure?: (widgetId: string) => void;
  onWidgetShare?: (widgetId: string) => void;
  onWidgetFullscreen?: (widgetId: string) => void;
  canEdit: boolean;
  renderChart: (widget: ChartWidgetConfig) => React.ReactNode;
  minHeight?: number;
}

interface SortableChartItemProps {
  widget: ChartWidgetConfig;
  canEdit: boolean;
  onRemove: () => void;
  onConfigure?: () => void;
  onShare?: () => void;
  onFullscreen?: () => void;
  onResize: (size: ChartSize) => void;
  renderChart: (widget: ChartWidgetConfig) => React.ReactNode;
  isEn: boolean;
  isDragOverlay?: boolean;
}

// =====================================================
// SIZE UTILITIES
// =====================================================

const SIZE_CONFIG: Record<ChartSize, { gridSpan: string; minHeight: number }> = {
  small: { gridSpan: 'col-span-1', minHeight: 200 },
  medium: { gridSpan: 'col-span-1 lg:col-span-1', minHeight: 280 },
  large: { gridSpan: 'col-span-1 lg:col-span-2', minHeight: 340 },
  full: { gridSpan: 'col-span-1 lg:col-span-2', minHeight: 400 },
};

const SIZE_OPTIONS: { value: ChartSize; label: string; labelEn: string }[] = [
  { value: 'small', label: 'Petit', labelEn: 'Small' },
  { value: 'medium', label: 'Moyen', labelEn: 'Medium' },
  { value: 'large', label: 'Grand', labelEn: 'Large' },
  { value: 'full', label: 'Pleine largeur', labelEn: 'Full Width' },
];

// =====================================================
// SORTABLE CHART ITEM
// =====================================================

function SortableChartItem({
  widget,
  canEdit,
  onRemove,
  onConfigure,
  onShare,
  onFullscreen,
  onResize,
  renderChart,
  isEn,
  isDragOverlay = false,
}: SortableChartItemProps) {
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const sizeMenuRef = useRef<HTMLDivElement>(null);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id, disabled: !canEdit });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging && !isDragOverlay ? 0.3 : 1,
  };

  const sizeConfig = SIZE_CONFIG[widget.size || 'medium'];

  // Close size menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sizeMenuRef.current && !sizeMenuRef.current.contains(event.target as Node)) {
        setShowSizeMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group relative rounded-xl overflow-hidden transition-all duration-200
        ${sizeConfig.gridSpan}
        ${isDragging ? 'ring-2 ring-primary-500 ring-offset-2 z-50' : ''}
        ${isDragOverlay ? 'shadow-2xl scale-[1.02]' : ''}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Chart Container */}
      <div
        className="h-full rounded-xl overflow-hidden"
        style={{
          backgroundColor: 'rgb(var(--color-surface))',
          border: '1px solid rgb(var(--color-border))',
          minHeight: sizeConfig.minHeight,
        }}
      >
        {/* Header with drag handle and controls */}
        <div
          className="flex items-center justify-between px-3 py-2 border-b"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          {/* Left: Drag handle + Title */}
          <div className="flex items-center gap-2 min-w-0">
            {canEdit && (
              <div
                {...attributes}
                {...listeners}
                className="p-1 rounded cursor-grab active:cursor-grabbing hover:bg-[rgb(var(--color-bg-muted))] transition-colors"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                <GripVertical className="w-4 h-4" />
              </div>
            )}
            <h3
              className="text-sm font-semibold truncate"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {isEn ? widget.nameEn : widget.name}
            </h3>
          </div>

          {/* Right: Controls */}
          <div
            className={`flex items-center gap-1 transition-opacity ${
              isHovered || isDragOverlay ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {/* Size selector */}
            {canEdit && (
              <div className="relative" ref={sizeMenuRef}>
                <button
                  onClick={() => setShowSizeMenu(!showSizeMenu)}
                  className="p-1.5 rounded-md hover:bg-[rgb(var(--color-bg-muted))] transition-colors"
                  style={{ color: 'rgb(var(--color-text-muted))' }}
                  title={isEn ? 'Resize' : 'Redimensionner'}
                >
                  <Move className="w-3.5 h-3.5" />
                </button>

                {showSizeMenu && (
                  <div
                    className="absolute right-0 top-full mt-1 py-1 rounded-lg shadow-lg z-50 min-w-[140px] animate-in fade-in slide-in-from-top-2"
                    style={{
                      backgroundColor: 'rgb(var(--color-surface))',
                      border: '1px solid rgb(var(--color-border))',
                    }}
                  >
                    {SIZE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          onResize(option.value);
                          setShowSizeMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-[rgb(var(--color-bg-muted))] transition-colors"
                        style={{
                          color:
                            widget.size === option.value
                              ? 'rgb(var(--color-primary-500))'
                              : 'rgb(var(--color-text))',
                        }}
                      >
                        <span>{isEn ? option.labelEn : option.label}</span>
                        {widget.size === option.value && (
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Full screen */}
            {onFullscreen && (
              <button
                onClick={onFullscreen}
                className="p-1.5 rounded-md hover:bg-[rgb(var(--color-bg-muted))] transition-colors"
                style={{ color: 'rgb(var(--color-text-muted))' }}
                title={isEn ? 'Full screen' : 'Plein écran'}
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Share */}
            {onShare && (
              <button
                onClick={onShare}
                className="p-1.5 rounded-md hover:bg-[rgb(var(--color-bg-muted))] transition-colors"
                style={{ color: 'rgb(var(--color-text-muted))' }}
                title={isEn ? 'Share' : 'Partager'}
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Configure */}
            {canEdit && onConfigure && (
              <button
                onClick={onConfigure}
                className="p-1.5 rounded-md hover:bg-[rgb(var(--color-bg-muted))] transition-colors"
                style={{ color: 'rgb(var(--color-text-muted))' }}
                title={isEn ? 'Configure' : 'Configurer'}
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Remove */}
            {canEdit && (
              <button
                onClick={onRemove}
                className="p-1.5 rounded-md hover:bg-[rgb(var(--color-error)/0.1)] transition-colors"
                style={{ color: 'rgb(var(--color-error))' }}
                title={isEn ? 'Remove' : 'Supprimer'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Chart Content */}
        <div className="p-3" style={{ minHeight: sizeConfig.minHeight - 50 }}>
          {renderChart(widget)}
        </div>
      </div>

      {/* Resize handles for future use */}
      {canEdit && !isDragOverlay && (
        <>
          {/* Bottom-right resize handle */}
          <div
            className="absolute bottom-1 right-1 w-4 h-4 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            <svg viewBox="0 0 16 16" fill="currentColor">
              <path d="M11 11v4h4v-4h-4zM11 5v4h4V5h-4zM5 11v4h4v-4H5z" opacity="0.3" />
            </svg>
          </div>
        </>
      )}
    </div>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function ResizableChartGrid({
  widgets,
  onWidgetsChange,
  onWidgetRemove,
  onWidgetConfigure,
  onWidgetShare,
  onWidgetFullscreen,
  canEdit,
  renderChart,
  minHeight = 280,
}: ResizableChartGridProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum drag distance
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (over && active.id !== over.id) {
        const oldIndex = widgets.findIndex((w) => w.id === active.id);
        const newIndex = widgets.findIndex((w) => w.id === over.id);

        const newWidgets = arrayMove(widgets, oldIndex, newIndex);
        onWidgetsChange(newWidgets);
      }
    },
    [widgets, onWidgetsChange]
  );

  const handleResize = useCallback(
    (widgetId: string, size: ChartSize) => {
      const newWidgets = widgets.map((w) =>
        w.id === widgetId ? { ...w, size } : w
      );
      onWidgetsChange(newWidgets);
    },
    [widgets, onWidgetsChange]
  );

  const activeWidget = widgets.find((w) => w.id === activeId);

  if (widgets.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border-2 border-dashed p-8"
        style={{
          borderColor: 'rgb(var(--color-border))',
          minHeight,
        }}
      >
        <div className="text-center">
          <p
            className="text-sm font-medium"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {isEn ? 'No charts added yet' : 'Aucun graphique ajouté'}
          </p>
          <p
            className="text-xs mt-1"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {isEn
              ? 'Add charts from the gallery to get started'
              : 'Ajoutez des graphiques depuis la galerie pour commencer'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={widgets.map((w) => w.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {widgets.map((widget) => (
            <SortableChartItem
              key={widget.id}
              widget={widget}
              canEdit={canEdit}
              onRemove={() => onWidgetRemove(widget.id)}
              onConfigure={onWidgetConfigure ? () => onWidgetConfigure(widget.id) : undefined}
              onShare={onWidgetShare ? () => onWidgetShare(widget.id) : undefined}
              onFullscreen={onWidgetFullscreen ? () => onWidgetFullscreen(widget.id) : undefined}
              onResize={(size) => handleResize(widget.id, size)}
              renderChart={renderChart}
              isEn={isEn}
            />
          ))}
        </div>
      </SortableContext>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeWidget && (
          <SortableChartItem
            widget={activeWidget}
            canEdit={false}
            onRemove={() => {}}
            onResize={() => {}}
            renderChart={renderChart}
            isEn={isEn}
            isDragOverlay
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
