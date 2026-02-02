/**
 * Visualization Grid Component
 * 
 * A grid layout for dashboard visualizations that ensures:
 * - Equal heights for charts in the same row
 * - Grid-based drag & drop (horizontal + vertical)
 * - Consistent spacing and sizing
 * - Responsive 2-column layout
 */

import { useState, useCallback, ReactNode } from 'react';
import { GripVertical, X, Maximize2 } from 'lucide-react';
import { useI18n } from '../lib/i18n';

interface VisualizationItem {
  id: string;
  component: ReactNode;
  title?: string;
  size?: 'half' | 'full';
}

interface VisualizationGridProps {
  items: VisualizationItem[];
  onReorder?: (newOrder: string[]) => void;
  onRemove?: (id: string) => void;
  canCustomize?: boolean;
  minHeight?: number;
  className?: string;
}

export default function VisualizationGrid({
  items,
  onReorder,
  onRemove,
  canCustomize = false,
  minHeight = 380,
  className = '',
}: VisualizationGridProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);

  // Handle drag start
  const handleDragStart = useCallback((id: string) => (e: React.DragEvent) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    
    // Create drag image
    const target = e.currentTarget as HTMLElement;
    if (target) {
      e.dataTransfer.setDragImage(target, target.offsetWidth / 2, 20);
    }
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDragOverId(null);
    setDropPosition(null);
  }, []);

  // Handle drag over - determine drop position
  const handleDragOver = useCallback((targetId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (targetId === draggedId) return;
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const position = x < rect.width / 2 ? 'before' : 'after';
    
    setDragOverId(targetId);
    setDropPosition(position);
  }, [draggedId]);

  // Handle drag leave
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!e.currentTarget.contains(relatedTarget)) {
      setDragOverId(null);
      setDropPosition(null);
    }
  }, []);

  // Handle drop
  const handleDrop = useCallback((targetId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    
    if (!draggedId || draggedId === targetId || !onReorder) {
      handleDragEnd();
      return;
    }
    
    const currentOrder = items.map(item => item.id);
    const draggedIndex = currentOrder.indexOf(draggedId);
    let targetIndex = currentOrder.indexOf(targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) {
      handleDragEnd();
      return;
    }
    
    // Remove dragged item
    const newOrder = [...currentOrder];
    newOrder.splice(draggedIndex, 1);
    
    // Adjust target index if dragged was before target
    if (draggedIndex < targetIndex) {
      targetIndex--;
    }
    
    // Insert at new position
    if (dropPosition === 'after') {
      targetIndex++;
    }
    
    newOrder.splice(targetIndex, 0, draggedId);
    onReorder(newOrder);
    handleDragEnd();
  }, [draggedId, dropPosition, items, onReorder, handleDragEnd]);

  if (items.length === 0) {
    return null;
  }

  // Separate full-width and half-width items
  const fullWidthItems = items.filter(item => item.size === 'full');
  const halfWidthItems = items.filter(item => item.size !== 'full');

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Half-width items in 2-column grid */}
      {halfWidthItems.length > 0 && (
        <div 
          className="grid grid-cols-1 lg:grid-cols-2 gap-3"
          style={{
            // Ensure equal heights for all items in the grid
            gridAutoRows: `minmax(${minHeight}px, auto)`,
          }}
        >
          {halfWidthItems.map((item) => {
            const isDragging = draggedId === item.id;
            const isDragOver = dragOverId === item.id;
            const showDropBefore = isDragOver && dropPosition === 'before';
            const showDropAfter = isDragOver && dropPosition === 'after';
            
            return (
              <div
                key={item.id}
                className={`relative group transition-all duration-150 h-full ${
                  isDragging ? 'opacity-40 scale-[0.98]' : ''
                }`}
                draggable={canCustomize}
                onDragStart={handleDragStart(item.id)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver(item.id)}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop(item.id)}
              >
                {/* Drop indicator - before */}
                {showDropBefore && (
                  <div 
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-full z-20"
                    style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}
                  />
                )}
                
                {/* Drop indicator - after */}
                {showDropAfter && (
                  <div 
                    className="absolute right-0 top-0 bottom-0 w-1 rounded-full z-20"
                    style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}
                  />
                )}
                
                {/* Drop highlight overlay */}
                {isDragOver && !isDragging && (
                  <div 
                    className="absolute inset-0 rounded-xl z-10 pointer-events-none"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-primary-500) / 0.05)',
                      border: '2px dashed rgb(var(--color-primary-500) / 0.3)',
                    }}
                  />
                )}
                
                {/* Drag handle + controls */}
                {canCustomize && (
                  <div 
                    className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  >
                    {/* Drag handle */}
                    <div
                      className="cursor-grab active:cursor-grabbing p-1.5 rounded-md pointer-events-auto"
                      style={{
                        backgroundColor: 'rgb(var(--color-surface))',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                      }}
                      title={isEn ? 'Drag to reorder' : 'Glisser pour réorganiser'}
                    >
                      <GripVertical
                        className="w-4 h-4"
                        style={{ color: 'rgb(var(--color-text-muted))' }}
                      />
                    </div>
                    
                    {/* Remove button */}
                    {onRemove && (
                      <button
                        onClick={() => onRemove(item.id)}
                        className="p-1.5 rounded-md pointer-events-auto transition-colors hover:bg-[rgb(var(--color-error)/0.1)]"
                        style={{
                          backgroundColor: 'rgb(var(--color-surface))',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                          color: 'rgb(var(--color-error))',
                        }}
                        title={isEn ? 'Remove' : 'Retirer'}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
                
                {/* Chart content - fills grid cell */}
                <div className="h-full">
                  {item.component}
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Full-width items */}
      {fullWidthItems.map((item) => {
        const isDragging = draggedId === item.id;
        
        return (
          <div
            key={item.id}
            className={`relative group transition-all duration-150 ${
              isDragging ? 'opacity-40 scale-[0.99]' : ''
            }`}
            draggable={canCustomize}
            onDragStart={handleDragStart(item.id)}
            onDragEnd={handleDragEnd}
          >
            {/* Drag handle + controls for full-width */}
            {canCustomize && (
              <div 
                className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              >
                <div
                  className="cursor-grab active:cursor-grabbing p-1.5 rounded-md pointer-events-auto"
                  style={{
                    backgroundColor: 'rgb(var(--color-surface))',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  <GripVertical
                    className="w-4 h-4"
                    style={{ color: 'rgb(var(--color-text-muted))' }}
                  />
                </div>
                
                {onRemove && (
                  <button
                    onClick={() => onRemove(item.id)}
                    className="p-1.5 rounded-md pointer-events-auto transition-colors hover:bg-[rgb(var(--color-error)/0.1)]"
                    style={{
                      backgroundColor: 'rgb(var(--color-surface))',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                      color: 'rgb(var(--color-error))',
                    }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
            
            {item.component}
          </div>
        );
      })}
    </div>
  );
}
