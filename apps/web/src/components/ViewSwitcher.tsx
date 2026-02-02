/**
 * ViewSwitcher Component
 * 
 * A powerful command palette-style view switcher that surpasses Power BI and Looker:
 * - Quick keyboard shortcut (Cmd+K / Ctrl+K)
 * - Search across all views with fuzzy matching
 * - Recent views with smart ordering
 * - Favorites and pinned views
 * - Template gallery for quick creation
 * - Keyboard navigation
 * - Filter by category
 * - Create new view inline
 * 
 * Inspired by VS Code Command Palette, Raycast, and Spotlight
 * Bilingual support (EN/FR)
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Search,
  X,
  Star,
  Clock,
  Plus,
  ChevronRight,
  Pin,
  Folder,
  Layout,
  TrendingUp,
  History,
  Sparkles,
  Command,
  ArrowUp,
  ArrowDown,
  CornerDownLeft,
  Eye,
  Users,
  Globe,
  Lock,
  Copy,
  Trash2,
  Edit3,
  MoreHorizontal,
  Check,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { 
  viewManagementService, 
  SavedView, 
  VIEW_TEMPLATES, 
  VIEW_CATEGORIES,
  ViewCategory,
  ViewScope,
} from '../lib/viewManagement';

// =====================================================
// TYPES
// =====================================================

type SwitcherMode = 'search' | 'recent' | 'favorites' | 'templates' | 'categories';

interface ViewSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectView: (viewId: string) => void;
  onCreateView?: (templateId?: string) => void;
  currentViewId?: string;
}

interface SearchResult {
  type: 'view' | 'template' | 'action' | 'category';
  id: string;
  name: string;
  nameEn: string;
  description?: string;
  descriptionEn?: string;
  icon?: string;
  color?: string;
  category?: ViewCategory;
  scope?: ViewScope;
  isFavorite?: boolean;
  isPinned?: boolean;
  accessCount?: number;
  lastAccessedAt?: string;
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function ViewSwitcher({
  isOpen,
  onClose,
  onSelectView,
  onCreateView,
  currentViewId,
}: ViewSwitcherProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const [searchQuery, setSearchQuery] = useState('');
  const [mode, setMode] = useState<SwitcherMode>('recent');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<ViewCategory | null>(null);
  const [showContextMenu, setShowContextMenu] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  
  // Get all views
  const allViews = useMemo(() => viewManagementService.getAllViews(), [isOpen]);
  const recentViewIds = useMemo(() => viewManagementService.getRecentViews(), [isOpen]);
  const favorites = useMemo(() => viewManagementService.getFavorites(), [isOpen]);
  const pinned = useMemo(() => viewManagementService.getPinned(), [isOpen]);
  
  // Search results
  const searchResults = useMemo((): SearchResult[] => {
    if (!searchQuery.trim()) {
      // Show recent views when no search
      if (mode === 'recent') {
        const recent = recentViewIds
          .map(id => allViews.find(v => v.id === id))
          .filter(Boolean) as SavedView[];
        return recent.map(v => viewToResult(v));
      }
      
      if (mode === 'favorites') {
        return favorites.map(v => viewToResult(v));
      }
      
      if (mode === 'templates') {
        return VIEW_TEMPLATES.map(t => ({
          type: 'template' as const,
          id: t.id,
          name: t.name,
          nameEn: t.nameEn,
          description: t.description,
          descriptionEn: t.descriptionEn,
          icon: t.icon,
          color: t.color,
          category: t.category,
        }));
      }
      
      if (mode === 'categories' && selectedCategory) {
        return allViews
          .filter(v => v.category === selectedCategory)
          .map(v => viewToResult(v));
      }
      
      // Default: show all views sorted by access count
      return allViews
        .sort((a, b) => (b.accessCount || 0) - (a.accessCount || 0))
        .map(v => viewToResult(v));
    }
    
    // Search query active
    const query = searchQuery.toLowerCase();
    const results: SearchResult[] = [];
    
    // Search views
    allViews.forEach(v => {
      const nameMatch = v.name.toLowerCase().includes(query) || v.nameEn.toLowerCase().includes(query);
      const descMatch = v.description?.toLowerCase().includes(query) || v.descriptionEn?.toLowerCase().includes(query);
      const tagMatch = v.tags.some(t => t.toLowerCase().includes(query));
      
      if (nameMatch || descMatch || tagMatch) {
        results.push(viewToResult(v));
      }
    });
    
    // Search templates
    VIEW_TEMPLATES.forEach(t => {
      const nameMatch = t.name.toLowerCase().includes(query) || t.nameEn.toLowerCase().includes(query);
      const descMatch = t.description.toLowerCase().includes(query) || t.descriptionEn.toLowerCase().includes(query);
      const tagMatch = t.tags.some(tag => tag.toLowerCase().includes(query));
      
      if (nameMatch || descMatch || tagMatch) {
        results.push({
          type: 'template',
          id: t.id,
          name: t.name,
          nameEn: t.nameEn,
          description: t.description,
          descriptionEn: t.descriptionEn,
          icon: t.icon,
          color: t.color,
          category: t.category,
        });
      }
    });
    
    // Add "create new view" action if query doesn't match existing
    if (results.length === 0 || !results.some(r => r.name.toLowerCase() === query)) {
      results.push({
        type: 'action',
        id: 'create-new',
        name: `Créer "${searchQuery}"`,
        nameEn: `Create "${searchQuery}"`,
        description: 'Créer une nouvelle vue personnalisée',
        descriptionEn: 'Create a new custom view',
        icon: '✨',
      });
    }
    
    return results;
  }, [searchQuery, mode, selectedCategory, allViews, recentViewIds, favorites]);
  
  // Helper to convert view to search result
  function viewToResult(view: SavedView): SearchResult {
    return {
      type: 'view',
      id: view.id,
      name: view.name,
      nameEn: view.nameEn,
      description: view.description,
      descriptionEn: view.descriptionEn,
      icon: view.icon,
      color: view.color,
      category: view.category,
      scope: view.scope,
      isFavorite: view.isFavorite,
      isPinned: view.isPinned,
      accessCount: view.accessCount,
      lastAccessedAt: view.lastAccessedAt,
    };
  }
  
  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, searchResults.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          handleSelect(searchResults[selectedIndex]);
          break;
        case 'Escape':
          onClose();
          break;
        case 'Tab':
          e.preventDefault();
          // Cycle through modes
          const modes: SwitcherMode[] = ['search', 'recent', 'favorites', 'templates'];
          const currentIndex = modes.indexOf(mode);
          setMode(modes[(currentIndex + 1) % modes.length]);
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, searchResults, mode, onClose]);
  
  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
      setMode('recent');
      setSelectedCategory(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);
  
  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedItem = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      selectedItem?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);
  
  // Handle selection
  const handleSelect = useCallback((result: SearchResult) => {
    if (result.type === 'view') {
      onSelectView(result.id);
      onClose();
    } else if (result.type === 'template') {
      onCreateView?.(result.id);
      onClose();
    } else if (result.type === 'action' && result.id === 'create-new') {
      onCreateView?.();
      onClose();
    } else if (result.type === 'category') {
      setSelectedCategory(result.id as ViewCategory);
      setMode('categories');
    }
  }, [onSelectView, onCreateView, onClose]);
  
  // Toggle favorite
  const handleToggleFavorite = useCallback((viewId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    viewManagementService.toggleFavorite(viewId);
    setShowContextMenu(null);
  }, []);
  
  // Delete view
  const handleDelete = useCallback((viewId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(isEn ? 'Delete this view?' : 'Supprimer cette vue?')) {
      viewManagementService.deleteView(viewId);
    }
    setShowContextMenu(null);
  }, [isEn]);
  
  // Duplicate view
  const handleDuplicate = useCallback((viewId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newView = viewManagementService.duplicateView(viewId);
    if (newView) {
      onSelectView(newView.id);
      onClose();
    }
    setShowContextMenu(null);
  }, [onSelectView, onClose]);
  
  if (!isOpen) return null;
  
  const getScopeIcon = (scope?: ViewScope) => {
    switch (scope) {
      case 'personal': return <Lock className="w-3 h-3" />;
      case 'team': return <Users className="w-3 h-3" />;
      case 'organization': return <Globe className="w-3 h-3" />;
      case 'public': return <Eye className="w-3 h-3" />;
      default: return null;
    }
  };
  
  const getCategoryInfo = (category?: ViewCategory) => {
    if (!category) return null;
    return VIEW_CATEGORIES[category];
  };
  
  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0"
        style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
        }}
      />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          border: '1px solid rgb(var(--color-border))',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search Header */}
        <div 
          className="flex items-center gap-3 px-4 py-3 border-b"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <Search className="w-5 h-5 flex-shrink-0" style={{ color: 'rgb(var(--color-text-muted))' }} />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder={isEn ? 'Search views, templates, or type to create...' : 'Rechercher des vues, modèles ou taper pour créer...'}
            className="flex-1 bg-transparent text-base outline-none"
            style={{ color: 'rgb(var(--color-text))' }}
          />
          <div className="flex items-center gap-1">
            <kbd 
              className="px-1.5 py-0.5 rounded text-xs font-mono"
              style={{ 
                backgroundColor: 'rgb(var(--color-bg-muted))',
                color: 'rgb(var(--color-text-muted))',
              }}
            >
              ESC
            </kbd>
          </div>
        </div>
        
        {/* Mode Tabs */}
        <div 
          className="flex items-center gap-1 px-2 py-2 border-b overflow-x-auto scrollbar-hide"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <ModeTab
            icon={<Clock className="w-3.5 h-3.5" />}
            label={isEn ? 'Recent' : 'Récent'}
            isActive={mode === 'recent'}
            onClick={() => { setMode('recent'); setSelectedIndex(0); }}
          />
          <ModeTab
            icon={<Star className="w-3.5 h-3.5" />}
            label={isEn ? 'Favorites' : 'Favoris'}
            isActive={mode === 'favorites'}
            onClick={() => { setMode('favorites'); setSelectedIndex(0); }}
            count={favorites.length}
          />
          <ModeTab
            icon={<Layout className="w-3.5 h-3.5" />}
            label={isEn ? 'Templates' : 'Modèles'}
            isActive={mode === 'templates'}
            onClick={() => { setMode('templates'); setSelectedIndex(0); }}
          />
          <ModeTab
            icon={<Folder className="w-3.5 h-3.5" />}
            label={isEn ? 'All Views' : 'Toutes'}
            isActive={mode === 'search' && !searchQuery}
            onClick={() => { setMode('search'); setSearchQuery(''); setSelectedIndex(0); }}
            count={allViews.length}
          />
        </div>
        
        {/* Results List */}
        <div 
          ref={listRef}
          className="max-h-[50vh] overflow-y-auto py-2"
        >
          {searchResults.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'No views found' : 'Aucune vue trouvée'}
              </p>
              <button
                onClick={() => onCreateView?.()}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: 'rgb(var(--color-primary-500))',
                  color: 'white',
                }}
              >
                <Plus className="w-4 h-4" />
                {isEn ? 'Create New View' : 'Créer une nouvelle vue'}
              </button>
            </div>
          ) : (
            searchResults.map((result, index) => {
              const categoryInfo = getCategoryInfo(result.category);
              const isSelected = index === selectedIndex;
              const isCurrent = result.type === 'view' && result.id === currentViewId;
              
              return (
                <div
                  key={`${result.type}-${result.id}`}
                  data-index={index}
                  className={`relative mx-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all group ${
                    isSelected ? 'ring-2 ring-offset-1' : ''
                  }`}
                  style={{
                    backgroundColor: isSelected 
                      ? 'rgb(var(--color-primary-500) / 0.1)'
                      : isCurrent
                        ? 'rgb(var(--color-success) / 0.05)'
                        : 'transparent',
                    ringColor: isSelected ? 'rgb(var(--color-primary-500))' : undefined,
                  }}
                  onClick={() => handleSelect(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex items-center gap-3">
                    {/* Icon */}
                    <div 
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-lg"
                      style={{ 
                        backgroundColor: result.color 
                          ? `${result.color}20` 
                          : 'rgb(var(--color-bg-muted))',
                      }}
                    >
                      {result.icon || (result.type === 'template' ? '📋' : '📊')}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span 
                          className="font-medium text-sm truncate"
                          style={{ color: 'rgb(var(--color-text))' }}
                        >
                          {isEn ? result.nameEn : result.name}
                        </span>
                        
                        {/* Badges */}
                        {result.type === 'template' && (
                          <span 
                            className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                            style={{
                              backgroundColor: 'rgb(var(--color-info) / 0.1)',
                              color: 'rgb(var(--color-info))',
                            }}
                          >
                            {isEn ? 'Template' : 'Modèle'}
                          </span>
                        )}
                        
                        {result.isFavorite && (
                          <Star className="w-3 h-3 fill-current" style={{ color: 'rgb(var(--color-warning))' }} />
                        )}
                        
                        {result.isPinned && (
                          <Pin className="w-3 h-3" style={{ color: 'rgb(var(--color-primary-500))' }} />
                        )}
                        
                        {isCurrent && (
                          <span 
                            className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                            style={{
                              backgroundColor: 'rgb(var(--color-success) / 0.1)',
                              color: 'rgb(var(--color-success))',
                            }}
                          >
                            {isEn ? 'Current' : 'Actuel'}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-0.5">
                        {result.description && (
                          <span 
                            className="text-xs truncate"
                            style={{ color: 'rgb(var(--color-text-muted))' }}
                          >
                            {isEn ? result.descriptionEn : result.description}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Right side info */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Category tag */}
                      {categoryInfo && (
                        <span 
                          className="px-2 py-0.5 rounded text-xs hidden sm:inline-flex items-center gap-1"
                          style={{
                            backgroundColor: `${categoryInfo.color}15`,
                            color: categoryInfo.color,
                          }}
                        >
                          {categoryInfo.icon} {isEn ? categoryInfo.labelEn : categoryInfo.label}
                        </span>
                      )}
                      
                      {/* Scope icon */}
                      {result.scope && (
                        <span style={{ color: 'rgb(var(--color-text-muted))' }}>
                          {getScopeIcon(result.scope)}
                        </span>
                      )}
                      
                      {/* Context menu for views */}
                      {result.type === 'view' && (
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowContextMenu(showContextMenu === result.id ? null : result.id);
                            }}
                            className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ color: 'rgb(var(--color-text-muted))' }}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          
                          {showContextMenu === result.id && (
                            <ContextMenu
                              viewId={result.id}
                              isFavorite={result.isFavorite}
                              onToggleFavorite={handleToggleFavorite}
                              onDuplicate={handleDuplicate}
                              onDelete={handleDelete}
                              onClose={() => setShowContextMenu(null)}
                              isEn={isEn}
                            />
                          )}
                        </div>
                      )}
                      
                      {/* Enter hint */}
                      {isSelected && (
                        <kbd 
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono hidden sm:block"
                          style={{ 
                            backgroundColor: 'rgb(var(--color-bg-muted))',
                            color: 'rgb(var(--color-text-muted))',
                          }}
                        >
                          ↵
                        </kbd>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        {/* Footer */}
        <div 
          className="flex items-center justify-between px-4 py-2 border-t text-xs"
          style={{ 
            borderColor: 'rgb(var(--color-border))',
            color: 'rgb(var(--color-text-muted))',
          }}
        >
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <ArrowUp className="w-3 h-3" />
              <ArrowDown className="w-3 h-3" />
              {isEn ? 'Navigate' : 'Naviguer'}
            </span>
            <span className="flex items-center gap-1">
              <CornerDownLeft className="w-3 h-3" />
              {isEn ? 'Select' : 'Sélectionner'}
            </span>
            <span className="flex items-center gap-1">
              <Command className="w-3 h-3" />K
              {isEn ? 'Open' : 'Ouvrir'}
            </span>
          </div>
          
          <button
            onClick={() => onCreateView?.()}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors hover:bg-[rgb(var(--color-bg-muted))]"
            style={{ color: 'rgb(var(--color-primary-500))' }}
          >
            <Plus className="w-3.5 h-3.5" />
            {isEn ? 'New View' : 'Nouvelle vue'}
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// SUB-COMPONENTS
// =====================================================

interface ModeTabProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  count?: number;
}

function ModeTab({ icon, label, isActive, onClick, count }: ModeTabProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0`}
      style={{
        backgroundColor: isActive ? 'rgb(var(--color-primary-500) / 0.1)' : 'transparent',
        color: isActive ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text-muted))',
      }}
    >
      {icon}
      {label}
      {count !== undefined && count > 0 && (
        <span 
          className="px-1.5 py-0.5 rounded-full text-[10px] font-medium"
          style={{
            backgroundColor: isActive ? 'rgb(var(--color-primary-500) / 0.2)' : 'rgb(var(--color-bg-muted))',
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

interface ContextMenuProps {
  viewId: string;
  isFavorite?: boolean;
  onToggleFavorite: (viewId: string, e: React.MouseEvent) => void;
  onDuplicate: (viewId: string, e: React.MouseEvent) => void;
  onDelete: (viewId: string, e: React.MouseEvent) => void;
  onClose: () => void;
  isEn: boolean;
}

function ContextMenu({ 
  viewId, 
  isFavorite, 
  onToggleFavorite, 
  onDuplicate, 
  onDelete, 
  onClose,
  isEn,
}: ContextMenuProps) {
  return (
    <>
      <div 
        className="fixed inset-0 z-40"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />
      <div 
        className="absolute right-0 top-full mt-1 w-48 rounded-lg shadow-xl z-50 py-1 overflow-hidden"
        style={{
          backgroundColor: 'rgb(var(--color-surface))',
          border: '1px solid rgb(var(--color-border))',
        }}
      >
        <button
          onClick={(e) => onToggleFavorite(viewId, e)}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[rgb(var(--color-bg-muted))] transition-colors"
          style={{ color: 'rgb(var(--color-text))' }}
        >
          <Star className={`w-4 h-4 ${isFavorite ? 'fill-current text-warning' : ''}`} />
          {isFavorite 
            ? (isEn ? 'Remove from favorites' : 'Retirer des favoris')
            : (isEn ? 'Add to favorites' : 'Ajouter aux favoris')
          }
        </button>
        
        <button
          onClick={(e) => onDuplicate(viewId, e)}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[rgb(var(--color-bg-muted))] transition-colors"
          style={{ color: 'rgb(var(--color-text))' }}
        >
          <Copy className="w-4 h-4" />
          {isEn ? 'Duplicate' : 'Dupliquer'}
        </button>
        
        <div 
          className="my-1 border-t"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        />
        
        <button
          onClick={(e) => onDelete(viewId, e)}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[rgb(var(--color-error)/0.1)] transition-colors"
          style={{ color: 'rgb(var(--color-error))' }}
        >
          <Trash2 className="w-4 h-4" />
          {isEn ? 'Delete' : 'Supprimer'}
        </button>
      </div>
    </>
  );
}

// =====================================================
// HOOK FOR KEYBOARD SHORTCUT
// =====================================================

export function useViewSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(prev => !prev),
  };
}
