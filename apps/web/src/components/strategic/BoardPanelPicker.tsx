/**
 * Board Panel Picker Component
 * Allows users to select and add panels to board meetings
 * Inspired by SigNoz dashboard panel system
 */

import { useState, useMemo } from 'react';
import {
  X,
  Search,
  Plus,
  FileText,
  BarChart3,
  Target,
  Activity,
  Sparkles,
  Scale,
  TrendingUp,
  ArrowRightLeft,
  AlertTriangle,
  List,
  GitCompare,
  PieChart,
  Layers,
  Gauge,
  LineChart,
  Heart,
  CheckSquare,
  Type,
  BarChart2,
  Check,
} from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import {
  BOARD_PANEL_CATEGORIES,
  type BoardPanelType,
  type BoardPanelTemplate,
  type BoardPanelCategory,
} from '../../lib/boardMeeting';

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  FileText,
  BarChart3,
  Target,
  Activity,
  Sparkles,
  Scale,
  TrendingUp,
  ArrowRightLeft,
  AlertTriangle,
  List,
  GitCompare,
  PieChart,
  Layers,
  Gauge,
  LineChart,
  Heart,
  CheckSquare,
  Type,
  BarChart2,
};

interface BoardPanelPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPanel: (type: BoardPanelType) => void;
  existingPanels: BoardPanelType[];
}

export default function BoardPanelPicker({
  isOpen,
  onClose,
  onAddPanel,
  existingPanels,
}: BoardPanelPickerProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPanels, setSelectedPanels] = useState<Set<BoardPanelType>>(new Set());

  // Filter panels based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery && !selectedCategory) return BOARD_PANEL_CATEGORIES;
    
    return BOARD_PANEL_CATEGORIES
      .filter(cat => !selectedCategory || cat.id === selectedCategory)
      .map(cat => ({
        ...cat,
        panels: cat.panels.filter(panel => {
          if (!searchQuery) return true;
          const query = searchQuery.toLowerCase();
          return (
            panel.name.toLowerCase().includes(query) ||
            panel.nameEn.toLowerCase().includes(query) ||
            panel.description.toLowerCase().includes(query) ||
            panel.descriptionEn.toLowerCase().includes(query)
          );
        }),
      }))
      .filter(cat => cat.panels.length > 0);
  }, [searchQuery, selectedCategory]);

  const togglePanel = (type: BoardPanelType) => {
    setSelectedPanels(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const handleAddSelected = () => {
    selectedPanels.forEach(type => {
      onAddPanel(type);
    });
    setSelectedPanels(new Set());
    onClose();
  };

  const handleAddSingle = (type: BoardPanelType) => {
    onAddPanel(type);
    onClose();
  };

  if (!isOpen) return null;

  const getCategoryIcon = (iconName: string) => {
    const Icon = iconMap[iconName] || FileText;
    return Icon;
  };

  const getPanelIcon = (iconName: string) => {
    const Icon = iconMap[iconName] || FileText;
    return Icon;
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div 
        className="w-full max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{ backgroundColor: 'rgb(var(--color-surface))' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="p-4 sm:p-6 border-b flex items-center justify-between flex-shrink-0"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Add Section to Board' : 'Ajouter une section au board'}
            </h2>
            <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn 
                ? 'Select sections to add to your board meeting presentation'
                : 'Sélectionnez les sections à ajouter à votre présentation'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg transition-colors hover:bg-black/5"
          >
            <X className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
          </button>
        </div>

        {/* Search & Filters */}
        <div 
          className="p-4 border-b flex flex-col sm:flex-row gap-3 flex-shrink-0"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <div className="relative flex-1">
            <Search 
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" 
              style={{ color: 'rgb(var(--color-text-muted))' }} 
            />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={isEn ? 'Search sections...' : 'Rechercher des sections...'}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm"
              style={{
                backgroundColor: 'rgb(var(--color-bg-muted))',
                borderColor: 'rgb(var(--color-border))',
                color: 'rgb(var(--color-text))',
              }}
            />
          </div>
          
          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                !selectedCategory ? 'text-white' : ''
              }`}
              style={{
                backgroundColor: !selectedCategory 
                  ? 'rgb(var(--color-primary-500))' 
                  : 'rgb(var(--color-bg-muted))',
                color: !selectedCategory 
                  ? 'white' 
                  : 'rgb(var(--color-text-secondary))',
              }}
            >
              {isEn ? 'All' : 'Tous'}
            </button>
            {BOARD_PANEL_CATEGORIES.map(cat => {
              const Icon = getCategoryIcon(cat.icon);
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
                    selectedCategory === cat.id ? 'text-white' : ''
                  }`}
                  style={{
                    backgroundColor: selectedCategory === cat.id 
                      ? 'rgb(var(--color-primary-500))' 
                      : 'rgb(var(--color-bg-muted))',
                    color: selectedCategory === cat.id 
                      ? 'white' 
                      : 'rgb(var(--color-text-secondary))',
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {isEn ? cat.nameEn : cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Panel Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-12">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-30" style={{ color: 'rgb(var(--color-text-muted))' }} />
              <p style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'No sections found' : 'Aucune section trouvée'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredCategories.map(category => (
                <div key={category.id}>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    {(() => {
                      const Icon = getCategoryIcon(category.icon);
                      return <Icon className="w-4 h-4" />;
                    })()}
                    {isEn ? category.nameEn : category.name}
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {category.panels.map(panel => {
                      const isSelected = selectedPanels.has(panel.type);
                      const isExisting = existingPanels.includes(panel.type);
                      const PanelIcon = getPanelIcon(panel.icon);
                      
                      return (
                        <button
                          key={panel.type}
                          onClick={() => isExisting ? null : togglePanel(panel.type)}
                          disabled={isExisting}
                          className={`relative p-4 rounded-xl border text-left transition-all ${
                            isExisting 
                              ? 'opacity-50 cursor-not-allowed' 
                              : 'hover:border-primary-500 hover:shadow-md cursor-pointer'
                          } ${isSelected ? 'ring-2 ring-primary-500' : ''}`}
                          style={{
                            backgroundColor: isSelected 
                              ? 'rgb(var(--color-primary-500) / 0.05)' 
                              : 'rgb(var(--color-surface))',
                            borderColor: isSelected 
                              ? 'rgb(var(--color-primary-500))' 
                              : 'rgb(var(--color-border))',
                          }}
                        >
                          {/* Selection indicator */}
                          {isSelected && (
                            <div 
                              className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}
                            >
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                          
                          {/* Already added indicator */}
                          {isExisting && (
                            <div 
                              className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-medium"
                              style={{ 
                                backgroundColor: 'rgb(var(--color-bg-muted))',
                                color: 'rgb(var(--color-text-muted))',
                              }}
                            >
                              {isEn ? 'Added' : 'Ajouté'}
                            </div>
                          )}
                          
                          <div className="flex items-start gap-3">
                            <div 
                              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
                            >
                              <PanelIcon 
                                className="w-5 h-5" 
                                style={{ color: 'rgb(var(--color-primary-500))' }} 
                              />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                                {isEn ? panel.nameEn : panel.name}
                              </h4>
                              <p className="text-xs mt-1 line-clamp-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
                                {isEn ? panel.descriptionEn : panel.description}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <span 
                                  className="text-[10px] px-1.5 py-0.5 rounded"
                                  style={{
                                    backgroundColor: 'rgb(var(--color-bg-muted))',
                                    color: 'rgb(var(--color-text-muted))',
                                  }}
                                >
                                  {panel.defaultSize === 'small' && (isEn ? 'Small' : 'Petit')}
                                  {panel.defaultSize === 'medium' && (isEn ? 'Medium' : 'Moyen')}
                                  {panel.defaultSize === 'large' && (isEn ? 'Large' : 'Grand')}
                                  {panel.defaultSize === 'full' && (isEn ? 'Full width' : 'Pleine largeur')}
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div 
          className="p-4 border-t flex items-center justify-between flex-shrink-0"
          style={{ 
            borderColor: 'rgb(var(--color-border))',
            backgroundColor: 'rgb(var(--color-bg-muted))',
          }}
        >
          <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {selectedPanels.size > 0 && (
              <>
                {selectedPanels.size} {isEn ? 'section(s) selected' : 'section(s) sélectionnée(s)'}
              </>
            )}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {isEn ? 'Cancel' : 'Annuler'}
            </button>
            <button
              onClick={handleAddSelected}
              disabled={selectedPanels.size === 0}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                backgroundColor: 'rgb(var(--color-primary-500))',
                color: 'white',
              }}
            >
              <Plus className="w-4 h-4" />
              {isEn ? 'Add Selected' : 'Ajouter la sélection'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
