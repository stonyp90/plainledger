/**
 * Gantt Chart Component for Strategic Initiatives
 * 
 * Professional timeline with drag-and-drop, inline editing, and optimal UX
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { 
  Calendar, TrendingUp, TrendingDown, Plus, Edit3, Trash2, Check, X, 
  GripVertical, Move, ChevronDown, Save
} from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { Initiative, generatePlanningId } from '../../lib/strategicPlanning';

interface GanttChartProps {
  initiatives: Initiative[];
  startDate: Date;
  endDate: Date;
  onInitiativeUpdate?: (initiative: Initiative) => void;
  onInitiativeClick?: (initiative: Initiative) => void;
  onInitiativeAdd?: (initiative: Initiative) => void;
  onInitiativeDelete?: (id: string) => void;
  viewMode?: 'month' | 'quarter' | 'year';
}

const CATEGORY_COLORS: Record<Initiative['category'], string> = {
  growth: '#10B981',
  operations: '#3B82F6',
  product: '#8B5CF6',
  people: '#F59E0B',
  infrastructure: '#6366F1',
};

const CATEGORIES: Initiative['category'][] = ['growth', 'operations', 'product', 'people', 'infrastructure'];

export default function GanttChart({
  initiatives,
  startDate,
  endDate,
  onInitiativeUpdate,
  onInitiativeClick,
  onInitiativeAdd,
  onInitiativeDelete,
  viewMode = 'month',
}: GanttChartProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  // State
  const [selectedInitiative, setSelectedInitiative] = useState<string | null>(null);
  const [editingInitiative, setEditingInitiative] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [dragState, setDragState] = useState<{
    id: string;
    type: 'move' | 'resize-start' | 'resize-end';
    startX: number;
    originalStart: string;
    originalEnd: string;
  } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newInitiative, setNewInitiative] = useState<Partial<Initiative>>({
    category: 'growth',
    name: '',
    nameEn: '',
  });
  const [dragPreview, setDragPreview] = useState<{ left: number; width: number } | null>(null);
  
  const timelineRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Generate time periods
  const periods = useMemo(() => {
    const result: Array<{ start: Date; end: Date; label: string; isCurrentMonth: boolean }> = [];
    const current = new Date(startDate);
    const now = new Date();
    
    while (current <= endDate) {
      const periodStart = new Date(current);
      let periodEnd: Date;
      let label: string;
      const isCurrentMonth = current.getMonth() === now.getMonth() && current.getFullYear() === now.getFullYear();
      
      if (viewMode === 'month') {
        periodEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
        label = periodStart.toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', { month: 'short' });
        if (current.getMonth() === 0 || result.length === 0) {
          label += ` '${String(current.getFullYear()).slice(2)}`;
        }
        current.setMonth(current.getMonth() + 1);
      } else if (viewMode === 'quarter') {
        const quarter = Math.floor(current.getMonth() / 3);
        periodEnd = new Date(current.getFullYear(), (quarter + 1) * 3, 0);
        label = `Q${quarter + 1} ${current.getFullYear()}`;
        current.setMonth((quarter + 1) * 3);
      } else {
        periodEnd = new Date(current.getFullYear(), 11, 31);
        label = current.getFullYear().toString();
        current.setFullYear(current.getFullYear() + 1);
      }
      
      result.push({ start: periodStart, end: periodEnd, label, isCurrentMonth });
    }
    
    return result;
  }, [startDate, endDate, viewMode, isEn]);

  const totalDays = useMemo(() => {
    return (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  }, [startDate, endDate]);

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const getInitiativePosition = useCallback((init: Initiative) => {
    const initStart = new Date(init.startDate);
    const initEnd = new Date(init.endDate);
    const startOffset = (initStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const duration = (initEnd.getTime() - initStart.getTime()) / (1000 * 60 * 60 * 24);
    const leftPercent = Math.max(0, (startOffset / totalDays) * 100);
    const widthPercent = Math.min(100 - leftPercent, Math.max(3, (duration / totalDays) * 100));
    return { leftPercent, widthPercent };
  }, [startDate, totalDays]);

  const positionToDate = useCallback((xPercent: number) => {
    const days = (xPercent / 100) * totalDays;
    const date = new Date(startDate);
    date.setDate(date.getDate() + Math.round(days));
    return date;
  }, [startDate, totalDays]);

  // Drag handlers
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent, init: Initiative, type: 'move' | 'resize-start' | 'resize-end') => {
    e.preventDefault();
    e.stopPropagation();
    if (!onInitiativeUpdate) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    setDragState({
      id: init.id,
      type,
      startX: clientX,
      originalStart: init.startDate,
      originalEnd: init.endDate,
    });
    setSelectedInitiative(init.id);
  }, [onInitiativeUpdate]);

  const handleDragMove = useCallback((clientX: number) => {
    if (!dragState || !timelineRef.current || !onInitiativeUpdate) return;
    
    const initiative = initiatives.find(i => i.id === dragState.id);
    if (!initiative) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const deltaX = clientX - dragState.startX;
    const deltaPercent = (deltaX / rect.width) * 100;
    const deltaDays = (deltaPercent / 100) * totalDays;

    const originalStartDate = new Date(dragState.originalStart);
    const originalEndDate = new Date(dragState.originalEnd);

    let newStartDate: Date;
    let newEndDate: Date;

    if (dragState.type === 'move') {
      newStartDate = new Date(originalStartDate);
      newStartDate.setDate(newStartDate.getDate() + Math.round(deltaDays));
      newEndDate = new Date(originalEndDate);
      newEndDate.setDate(newEndDate.getDate() + Math.round(deltaDays));
    } else if (dragState.type === 'resize-start') {
      newStartDate = new Date(originalStartDate);
      newStartDate.setDate(newStartDate.getDate() + Math.round(deltaDays));
      newEndDate = originalEndDate;
      if (newStartDate >= newEndDate) return;
    } else {
      newStartDate = originalStartDate;
      newEndDate = new Date(originalEndDate);
      newEndDate.setDate(newEndDate.getDate() + Math.round(deltaDays));
      if (newEndDate <= newStartDate) return;
    }

    // Update preview
    const previewStart = (newStartDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const previewDuration = (newEndDate.getTime() - newStartDate.getTime()) / (1000 * 60 * 60 * 24);
    setDragPreview({
      left: Math.max(0, (previewStart / totalDays) * 100),
      width: Math.max(3, (previewDuration / totalDays) * 100),
    });

    // Update initiative
    onInitiativeUpdate({
      ...initiative,
      startDate: newStartDate.toISOString().split('T')[0],
      endDate: newEndDate.toISOString().split('T')[0],
    });
  }, [dragState, initiatives, totalDays, startDate, onInitiativeUpdate]);

  const handleDragEnd = useCallback(() => {
    setDragState(null);
    setDragPreview(null);
  }, []);

  useEffect(() => {
    if (!dragState) return;
    
    const handleMouseMove = (e: MouseEvent) => handleDragMove(e.clientX);
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        e.preventDefault();
        handleDragMove(e.touches[0].clientX);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleDragEnd);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleDragEnd);
    };
  }, [dragState, handleDragMove, handleDragEnd]);

  // Inline editing
  const startEditing = useCallback((init: Initiative) => {
    setEditingInitiative(init.id);
    setEditName(isEn ? init.nameEn : init.name);
    setTimeout(() => editInputRef.current?.focus(), 0);
  }, [isEn]);

  const saveEdit = useCallback(() => {
    if (!editingInitiative || !onInitiativeUpdate) return;
    const init = initiatives.find(i => i.id === editingInitiative);
    if (!init) return;
    
    onInitiativeUpdate({
      ...init,
      name: isEn ? init.name : editName,
      nameEn: isEn ? editName : init.nameEn,
    });
    setEditingInitiative(null);
  }, [editingInitiative, editName, initiatives, isEn, onInitiativeUpdate]);

  const cancelEdit = useCallback(() => {
    setEditingInitiative(null);
    setEditName('');
  }, []);

  // Add new initiative
  const handleAddInitiative = useCallback(() => {
    if (!onInitiativeAdd || !newInitiative.name) return;
    
    const now = new Date();
    const threeMonthsLater = new Date(now);
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

    const initiative: Initiative = {
      id: generatePlanningId(),
      name: newInitiative.name || 'New Initiative',
      nameEn: newInitiative.nameEn || newInitiative.name || 'New Initiative',
      category: newInitiative.category || 'growth',
      description: '',
      startDate: now.toISOString().split('T')[0],
      endDate: threeMonthsLater.toISOString().split('T')[0],
      status: 'planned',
      cashImpact: {
        type: 'one_time',
        amount: 0,
      },
      confidence: 50,
      dependencies: [],
    };

    onInitiativeAdd(initiative);
    setShowAddForm(false);
    setNewInitiative({ category: 'growth', name: '', nameEn: '' });
  }, [newInitiative, onInitiativeAdd]);

  // Double-click to add
  const handleTimelineDoubleClick = useCallback((e: React.MouseEvent, category: Initiative['category']) => {
    if (!onInitiativeAdd || !timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const clickDate = positionToDate(xPercent);
    const endDate = new Date(clickDate);
    endDate.setMonth(endDate.getMonth() + 2);

    const initiative: Initiative = {
      id: generatePlanningId(),
      name: isEn ? 'New Initiative' : 'Nouvelle initiative',
      nameEn: 'New Initiative',
      category,
      description: '',
      startDate: clickDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      status: 'planned',
      cashImpact: { type: 'one_time', amount: 0 },
      confidence: 50,
      dependencies: [],
    };

    onInitiativeAdd(initiative);
    setSelectedInitiative(initiative.id);
    startEditing(initiative);
  }, [onInitiativeAdd, positionToDate, isEn, startEditing]);

  const groupedInitiatives = useMemo(() => {
    const groups: Record<string, Initiative[]> = {};
    CATEGORIES.forEach(cat => groups[cat] = []);
    initiatives.forEach(init => {
      if (groups[init.category]) groups[init.category].push(init);
    });
    return groups;
  }, [initiatives]);

  const categoryLabels: Record<Initiative['category'], { en: string; fr: string }> = {
    growth: { en: 'Growth', fr: 'Croissance' },
    operations: { en: 'Operations', fr: 'Opérations' },
    product: { en: 'Product', fr: 'Produit' },
    people: { en: 'People', fr: 'Personnel' },
    infrastructure: { en: 'Infrastructure', fr: 'Infrastructure' },
  };

  const selectedInit = selectedInitiative ? initiatives.find(i => i.id === selectedInitiative) : null;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
          <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Timeline' : 'Chronologie'}
          </span>
        </div>
        {onInitiativeAdd && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              backgroundColor: 'rgb(var(--color-primary-500))',
              color: 'white',
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            {isEn ? 'Add Initiative' : 'Ajouter'}
          </button>
        )}
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div 
          className="p-4 rounded-xl space-y-3"
          style={{ backgroundColor: 'rgb(var(--color-bg-muted))', border: '1px solid rgb(var(--color-border))' }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Name' : 'Nom'}
              </label>
              <input
                type="text"
                value={newInitiative.name || ''}
                onChange={(e) => setNewInitiative({ ...newInitiative, name: e.target.value, nameEn: e.target.value })}
                placeholder={isEn ? 'Initiative name...' : 'Nom de l\'initiative...'}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: 'rgb(var(--color-bg))',
                  border: '1px solid rgb(var(--color-border))',
                  color: 'rgb(var(--color-text))',
                }}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Category' : 'Catégorie'}
              </label>
              <select
                value={newInitiative.category || 'growth'}
                onChange={(e) => setNewInitiative({ ...newInitiative, category: e.target.value as Initiative['category'] })}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: 'rgb(var(--color-bg))',
                  border: '1px solid rgb(var(--color-border))',
                  color: 'rgb(var(--color-text))',
                }}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {isEn ? categoryLabels[cat].en : categoryLabels[cat].fr}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 rounded-lg text-xs"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {isEn ? 'Cancel' : 'Annuler'}
            </button>
            <button
              onClick={handleAddInitiative}
              disabled={!newInitiative.name}
              className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
              style={{ backgroundColor: 'rgb(var(--color-primary-500))', color: 'white' }}
            >
              {isEn ? 'Add' : 'Ajouter'}
            </button>
          </div>
        </div>
      )}

      {/* Selected Initiative Panel */}
      {selectedInit && !editingInitiative && (
        <div 
          className="p-4 rounded-xl"
          style={{
            backgroundColor: `${CATEGORY_COLORS[selectedInit.category]}10`,
            border: `2px solid ${CATEGORY_COLORS[selectedInit.category]}40`,
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: CATEGORY_COLORS[selectedInit.category] }}
                />
                <h4 className="font-semibold text-sm truncate" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? selectedInit.nameEn : selectedInit.name}
                </h4>
              </div>
              <p className="text-xs mb-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {new Date(selectedInit.startDate).toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', { month: 'short', day: 'numeric' })}
                {' → '}
                {new Date(selectedInit.endDate).toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Impact' : 'Impact'}: </span>
                  <span 
                    className="text-sm font-semibold"
                    style={{ color: selectedInit.cashImpact.amount >= 0 ? '#10B981' : '#EF4444' }}
                  >
                    {selectedInit.cashImpact.amount >= 0 ? '+' : ''}{formatCurrency(selectedInit.cashImpact.amount)}
                    {selectedInit.cashImpact.type === 'recurring' && '/mo'}
                  </span>
                </div>
                <div>
                  <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Confidence' : 'Confiance'}: </span>
                  <span className="text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    {selectedInit.confidence}%
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => startEditing(selectedInit)}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'rgb(var(--color-text-muted))' }}
                title={isEn ? 'Edit name' : 'Modifier le nom'}
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onInitiativeClick?.(selectedInit)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ backgroundColor: CATEGORY_COLORS[selectedInit.category], color: 'white' }}
              >
                {isEn ? 'Details' : 'Détails'}
              </button>
              {onInitiativeDelete && (
                <button
                  onClick={() => {
                    onInitiativeDelete(selectedInit.id);
                    setSelectedInitiative(null);
                  }}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: 'rgb(var(--color-error))' }}
                  title={isEn ? 'Delete' : 'Supprimer'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setSelectedInitiative(null)}
                className="p-2 rounded-lg"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timeline Header */}
      <div 
        className="relative rounded-lg overflow-hidden"
        style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
        ref={timelineRef}
      >
        <div className="flex">
          {periods.map((period, index) => (
            <div
              key={index}
              className="flex-1 py-2 px-1 text-center border-r last:border-r-0 relative"
              style={{
                borderColor: 'rgb(var(--color-border))',
                backgroundColor: period.isCurrentMonth ? 'rgb(var(--color-primary-500) / 0.1)' : 'transparent',
              }}
            >
              <span 
                className="text-[10px] sm:text-xs font-medium"
                style={{ color: period.isCurrentMonth ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-text-muted))' }}
              >
                {period.label}
              </span>
              {period.isCurrentMonth && (
                <div 
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Gantt Rows */}
      <div className="space-y-4">
        {CATEGORIES.map((category) => {
          const categoryInitiatives = groupedInitiatives[category] || [];
          
          return (
            <div key={category}>
              {/* Category Header */}
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: CATEGORY_COLORS[category] }}
                />
                <span className="text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? categoryLabels[category].en : categoryLabels[category].fr}
                </span>
                <span 
                  className="text-xs px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: 'rgb(var(--color-bg-muted))', color: 'rgb(var(--color-text-muted))' }}
                >
                  {categoryInitiatives.length}
                </span>
              </div>

              {/* Timeline Row */}
              <div 
                className="relative ml-5 rounded-lg overflow-hidden"
                style={{ 
                  backgroundColor: 'rgb(var(--color-bg-subtle))',
                  minHeight: categoryInitiatives.length === 0 ? '40px' : `${Math.max(40, categoryInitiatives.length * 44)}px`,
                }}
                onDoubleClick={(e) => handleTimelineDoubleClick(e, category)}
              >
                {/* Grid */}
                <div className="absolute inset-0 flex pointer-events-none">
                  {periods.map((period, i) => (
                    <div 
                      key={i} 
                      className="flex-1 border-r last:border-r-0"
                      style={{ 
                        borderColor: 'rgb(var(--color-border) / 0.2)',
                        backgroundColor: period.isCurrentMonth ? 'rgb(var(--color-primary-500) / 0.03)' : 'transparent',
                      }}
                    />
                  ))}
                </div>

                {/* Empty state */}
                {categoryInitiatives.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted) / 0.5)' }}>
                      {isEn ? 'Double-click to add' : 'Double-cliquez pour ajouter'}
                    </span>
                  </div>
                )}

                {/* Bars */}
                {categoryInitiatives.map((initiative, index) => {
                  const { leftPercent, widthPercent } = getInitiativePosition(initiative);
                  const isPositive = initiative.cashImpact.amount >= 0;
                  const isSelected = selectedInitiative === initiative.id;
                  const isDragging = dragState?.id === initiative.id;
                  const isEditing = editingInitiative === initiative.id;

                  return (
                    <div
                      key={initiative.id}
                      className="absolute transition-all"
                      style={{
                        top: `${index * 44 + 4}px`,
                        left: `${leftPercent}%`,
                        width: `${widthPercent}%`,
                        height: '36px',
                        minWidth: '60px',
                        zIndex: isSelected || isDragging ? 20 : 1,
                      }}
                    >
                      <div
                        className={`h-full rounded-lg flex items-center gap-2 px-2 cursor-pointer transition-all ${isDragging ? 'shadow-xl ring-2' : 'shadow-sm'}`}
                        style={{
                          backgroundColor: isSelected ? CATEGORY_COLORS[category] : `${CATEGORY_COLORS[category]}20`,
                          border: `2px solid ${CATEGORY_COLORS[category]}`,
                          ringColor: isDragging ? CATEGORY_COLORS[category] : 'transparent',
                          transform: isDragging ? 'scale(1.02)' : undefined,
                        }}
                        onClick={() => !isDragging && setSelectedInitiative(isSelected ? null : initiative.id)}
                      >
                        {/* Drag handle */}
                        {onInitiativeUpdate && (
                          <div
                            className="flex-shrink-0 cursor-move touch-none"
                            onMouseDown={(e) => handleDragStart(e, initiative, 'move')}
                            onTouchStart={(e) => handleDragStart(e, initiative, 'move')}
                          >
                            <GripVertical 
                              className="w-3.5 h-3.5" 
                              style={{ color: isSelected ? 'white' : CATEGORY_COLORS[category] }} 
                            />
                          </div>
                        )}

                        {/* Content */}
                        {isEditing ? (
                          <div className="flex-1 flex items-center gap-1">
                            <input
                              ref={editInputRef}
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit();
                                if (e.key === 'Escape') cancelEdit();
                              }}
                              className="flex-1 bg-white/90 text-gray-900 px-2 py-0.5 rounded text-xs min-w-0"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <button onClick={(e) => { e.stopPropagation(); saveEdit(); }} className="p-0.5">
                              <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); cancelEdit(); }} className="p-0.5">
                              <X className="w-3.5 h-3.5 text-red-500" />
                            </button>
                          </div>
                        ) : (
                          <>
                            {/* Impact */}
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              {isPositive ? (
                                <TrendingUp className="w-3 h-3" style={{ color: isSelected ? 'white' : '#10B981' }} />
                              ) : (
                                <TrendingDown className="w-3 h-3" style={{ color: isSelected ? 'white' : '#EF4444' }} />
                              )}
                              <span 
                                className="text-[10px] font-semibold"
                                style={{ color: isSelected ? 'white' : (isPositive ? '#10B981' : '#EF4444') }}
                              >
                                {formatCurrency(Math.abs(initiative.cashImpact.amount))}
                              </span>
                            </div>
                            
                            {/* Name */}
                            <span 
                              className="text-xs font-medium truncate flex-1 min-w-0"
                              style={{ color: isSelected ? 'white' : 'rgb(var(--color-text))' }}
                              onDoubleClick={(e) => { e.stopPropagation(); startEditing(initiative); }}
                            >
                              {isEn ? initiative.nameEn : initiative.name}
                            </span>
                          </>
                        )}

                        {/* Resize handles */}
                        {onInitiativeUpdate && !isEditing && (
                          <>
                            <div
                              className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize rounded-l-lg"
                              style={{ backgroundColor: isDragging && dragState?.type === 'resize-start' ? CATEGORY_COLORS[category] : 'transparent' }}
                              onMouseDown={(e) => { e.stopPropagation(); handleDragStart(e, initiative, 'resize-start'); }}
                              onTouchStart={(e) => { e.stopPropagation(); handleDragStart(e, initiative, 'resize-start'); }}
                            />
                            <div
                              className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize rounded-r-lg"
                              style={{ backgroundColor: isDragging && dragState?.type === 'resize-end' ? CATEGORY_COLORS[category] : 'transparent' }}
                              onMouseDown={(e) => { e.stopPropagation(); handleDragStart(e, initiative, 'resize-end'); }}
                              onTouchStart={(e) => { e.stopPropagation(); handleDragStart(e, initiative, 'resize-end'); }}
                            />
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Instructions */}
      <div 
        className="flex items-center gap-4 pt-3 border-t text-xs"
        style={{ borderColor: 'rgb(var(--color-border))', color: 'rgb(var(--color-text-muted))' }}
      >
        <span className="flex items-center gap-1">
          <GripVertical className="w-3 h-3" /> {isEn ? 'Drag to move' : 'Glisser pour déplacer'}
        </span>
        <span>|</span>
        <span>{isEn ? 'Drag edges to resize' : 'Glisser les bords pour redimensionner'}</span>
        <span>|</span>
        <span>{isEn ? 'Double-click to add/edit' : 'Double-clic pour ajouter/modifier'}</span>
      </div>
    </div>
  );
}
