/**
 * useViews Hook
 * 
 * A powerful hook for working with the PlainLedger view management system.
 * Provides:
 * - Current view state with auto-persistence
 * - Filter management with undo/redo
 * - Cross-filter coordination
 * - View switching with keyboard shortcuts
 * - Auto-save on filter changes
 * 
 * Usage:
 * ```tsx
 * const { 
 *   currentView, 
 *   filters, 
 *   updateFilters,
 *   switchView,
 *   isViewSwitcherOpen,
 *   openViewSwitcher,
 * } = useViews();
 * ```
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  viewManagementService, 
  SavedView, 
  ViewFilterState, 
  CrossFilterState,
  ViewChart,
  VIEW_TEMPLATES,
  ViewTemplate,
} from '../lib/viewManagement';
import { useTenant } from '../contexts/TenantContext';

// =====================================================
// TYPES
// =====================================================

interface UseViewsOptions {
  /** Auto-save filter changes to the view */
  autoSave?: boolean;
  /** Delay before auto-saving (ms) */
  autoSaveDelay?: number;
  /** Enable keyboard shortcuts */
  enableKeyboardShortcuts?: boolean;
}

interface UseViewsReturn {
  // View state
  currentView: SavedView | null;
  isLoading: boolean;
  error: string | null;
  
  // View operations
  switchView: (viewId: string) => void;
  createView: (name: string, nameEn: string, templateId?: string) => SavedView | null;
  updateView: (updates: Partial<SavedView>) => void;
  deleteView: (viewId: string) => boolean;
  duplicateView: (viewId: string, newName?: string) => SavedView | null;
  
  // Filter state
  filters: ViewFilterState;
  updateFilters: (updates: Partial<ViewFilterState>) => void;
  resetFilters: () => void;
  
  // Cross-filter state
  crossFilters: CrossFilterState[];
  updateCrossFilters: (crossFilters: CrossFilterState[]) => void;
  clearCrossFilters: () => void;
  applyCrossFilter: (sourceChartId: string, dimension: string, values: string[], mode?: 'include' | 'exclude') => void;
  
  // Chart operations
  charts: ViewChart[];
  addChart: (chart: Omit<ViewChart, 'id'>) => ViewChart | null;
  updateChart: (chartId: string, updates: Partial<ViewChart>) => void;
  removeChart: (chartId: string) => void;
  
  // View lists
  allViews: SavedView[];
  recentViews: SavedView[];
  favoriteViews: SavedView[];
  pinnedViews: SavedView[];
  templates: ViewTemplate[];
  
  // View switcher
  isViewSwitcherOpen: boolean;
  openViewSwitcher: () => void;
  closeViewSwitcher: () => void;
  toggleViewSwitcher: () => void;
  
  // Utilities
  hasUnsavedChanges: boolean;
  saveChanges: () => void;
  discardChanges: () => void;
}

// Default filter state
const DEFAULT_FILTERS: ViewFilterState = {
  dateRange: { start: '', end: '', preset: 'YTD' },
  dimensions: [],
  metrics: [],
  custom: [],
  quickFilters: [],
};

// =====================================================
// MAIN HOOK
// =====================================================

export function useViews(options: UseViewsOptions = {}): UseViewsReturn {
  const { 
    autoSave = true, 
    autoSaveDelay = 1000,
    enableKeyboardShortcuts = true,
  } = options;
  
  const { currentTenant } = useTenant();
  
  // State
  const [currentViewId, setCurrentViewId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<SavedView | null>(null);
  const [filters, setFilters] = useState<ViewFilterState>(DEFAULT_FILTERS);
  const [crossFilters, setCrossFilters] = useState<CrossFilterState[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isViewSwitcherOpen, setIsViewSwitcherOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalFilters, setOriginalFilters] = useState<ViewFilterState | null>(null);
  
  // View lists (memoized)
  const allViews = useMemo(() => viewManagementService.getAllViews(), [currentViewId]);
  const recentViewIds = useMemo(() => viewManagementService.getRecentViews(), [currentViewId]);
  const recentViews = useMemo(() => 
    recentViewIds.map(id => allViews.find(v => v.id === id)).filter(Boolean) as SavedView[],
    [recentViewIds, allViews]
  );
  const favoriteViews = useMemo(() => allViews.filter(v => v.isFavorite), [allViews]);
  const pinnedViews = useMemo(() => 
    allViews.filter(v => v.isPinned).sort((a, b) => a.sortOrder - b.sortOrder),
    [allViews]
  );
  
  // Load active view on mount
  useEffect(() => {
    const activeId = viewManagementService.getActiveViewId();
    if (activeId) {
      loadView(activeId);
    }
  }, []);
  
  // Keyboard shortcuts
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to open view switcher
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsViewSwitcherOpen(prev => !prev);
      }
      
      // Cmd+S or Ctrl+S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's' && hasUnsavedChanges) {
        e.preventDefault();
        saveChanges();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardShortcuts, hasUnsavedChanges]);
  
  // Auto-save filters
  useEffect(() => {
    if (!autoSave || !currentView || !hasUnsavedChanges) return;
    
    const timer = setTimeout(() => {
      saveChanges();
    }, autoSaveDelay);
    
    return () => clearTimeout(timer);
  }, [autoSave, autoSaveDelay, currentView, hasUnsavedChanges, filters, crossFilters]);
  
  // Load a view
  const loadView = useCallback((viewId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const view = viewManagementService.getView(viewId);
      if (view) {
        setCurrentViewId(viewId);
        setCurrentView(view);
        setFilters(view.filters);
        setCrossFilters(view.crossFilters);
        setOriginalFilters(view.filters);
        setHasUnsavedChanges(false);
        viewManagementService.setActiveView(viewId);
      } else {
        setError('View not found');
      }
    } catch (err) {
      setError('Failed to load view');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Switch view
  const switchView = useCallback((viewId: string) => {
    if (hasUnsavedChanges && !confirm('You have unsaved changes. Continue?')) {
      return;
    }
    loadView(viewId);
    setIsViewSwitcherOpen(false);
  }, [hasUnsavedChanges, loadView]);
  
  // Create view
  const createView = useCallback((name: string, nameEn: string, templateId?: string): SavedView | null => {
    try {
      const createdBy = currentTenant?.id || 'current-user';
      
      if (templateId) {
        return viewManagementService.createFromTemplate(templateId, name, nameEn, createdBy);
      }
      
      return viewManagementService.saveView({
        name,
        nameEn,
        scope: 'personal',
        createdBy,
        permissions: [],
        charts: [],
        filters: DEFAULT_FILTERS,
        crossFilters: [],
        layout: {
          columns: 12,
          rowHeight: 80,
          margin: [8, 8],
          containerPadding: [12, 12],
          breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480 },
          theme: 'auto',
          density: 'comfortable',
          showHeader: true,
          showFilterBar: true,
          showFooter: false,
        },
        tags: [],
        isFavorite: false,
        isPinned: false,
        sortOrder: 0,
        isTemplate: false,
      });
    } catch (err) {
      setError('Failed to create view');
      return null;
    }
  }, [currentTenant]);
  
  // Update current view
  const updateView = useCallback((updates: Partial<SavedView>) => {
    if (!currentViewId) return;
    
    const updated = viewManagementService.updateView(currentViewId, updates);
    if (updated) {
      setCurrentView(updated);
    }
  }, [currentViewId]);
  
  // Delete view
  const deleteView = useCallback((viewId: string): boolean => {
    const success = viewManagementService.deleteView(viewId);
    if (success && viewId === currentViewId) {
      setCurrentViewId(null);
      setCurrentView(null);
      setFilters(DEFAULT_FILTERS);
      setCrossFilters([]);
      viewManagementService.clearActiveView();
    }
    return success;
  }, [currentViewId]);
  
  // Duplicate view
  const duplicateView = useCallback((viewId: string, newName?: string): SavedView | null => {
    return viewManagementService.duplicateView(viewId, newName);
  }, []);
  
  // Update filters
  const updateFilters = useCallback((updates: Partial<ViewFilterState>) => {
    setFilters(prev => {
      const newFilters = { ...prev, ...updates };
      setHasUnsavedChanges(true);
      return newFilters;
    });
  }, []);
  
  // Reset filters
  const resetFilters = useCallback(() => {
    if (originalFilters) {
      setFilters(originalFilters);
      setHasUnsavedChanges(false);
    } else {
      setFilters(DEFAULT_FILTERS);
    }
  }, [originalFilters]);
  
  // Update cross-filters
  const updateCrossFilters = useCallback((newCrossFilters: CrossFilterState[]) => {
    setCrossFilters(newCrossFilters);
    setHasUnsavedChanges(true);
  }, []);
  
  // Clear cross-filters
  const clearCrossFilters = useCallback(() => {
    setCrossFilters(prev => prev.map(cf => ({ ...cf, selectedValues: [], isActive: false })));
    setHasUnsavedChanges(true);
  }, []);
  
  // Apply a cross-filter from a chart
  const applyCrossFilter = useCallback((
    sourceChartId: string, 
    dimension: string, 
    values: string[], 
    mode: 'include' | 'exclude' = 'include'
  ) => {
    setCrossFilters(prev => {
      const existingIndex = prev.findIndex(cf => cf.sourceChartId === sourceChartId && cf.dimension === dimension);
      
      if (existingIndex >= 0) {
        // Update existing
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          selectedValues: values,
          mode,
          isActive: values.length > 0,
        };
        return updated;
      } else {
        // Add new
        return [...prev, {
          id: `cf-${Date.now()}`,
          sourceChartId,
          targetChartIds: [], // All charts except source
          dimension,
          selectedValues: values,
          mode,
          isActive: values.length > 0,
        }];
      }
    });
    setHasUnsavedChanges(true);
  }, []);
  
  // Chart operations
  const charts = currentView?.charts || [];
  
  const addChart = useCallback((chart: Omit<ViewChart, 'id'>): ViewChart | null => {
    if (!currentViewId) return null;
    return viewManagementService.addChart(currentViewId, chart);
  }, [currentViewId]);
  
  const updateChart = useCallback((chartId: string, updates: Partial<ViewChart>) => {
    if (!currentViewId) return;
    const updated = viewManagementService.updateChart(currentViewId, chartId, updates);
    if (updated && currentView) {
      setCurrentView({
        ...currentView,
        charts: currentView.charts.map(c => c.id === chartId ? updated : c),
      });
    }
  }, [currentViewId, currentView]);
  
  const removeChart = useCallback((chartId: string) => {
    if (!currentViewId) return;
    viewManagementService.removeChart(currentViewId, chartId);
    if (currentView) {
      setCurrentView({
        ...currentView,
        charts: currentView.charts.filter(c => c.id !== chartId),
      });
    }
  }, [currentViewId, currentView]);
  
  // Save changes
  const saveChanges = useCallback(() => {
    if (!currentViewId) return;
    
    viewManagementService.updateView(currentViewId, {
      filters,
      crossFilters,
    });
    
    setOriginalFilters(filters);
    setHasUnsavedChanges(false);
  }, [currentViewId, filters, crossFilters]);
  
  // Discard changes
  const discardChanges = useCallback(() => {
    if (originalFilters) {
      setFilters(originalFilters);
    }
    if (currentView) {
      setCrossFilters(currentView.crossFilters);
    }
    setHasUnsavedChanges(false);
  }, [originalFilters, currentView]);
  
  // View switcher controls
  const openViewSwitcher = useCallback(() => setIsViewSwitcherOpen(true), []);
  const closeViewSwitcher = useCallback(() => setIsViewSwitcherOpen(false), []);
  const toggleViewSwitcher = useCallback(() => setIsViewSwitcherOpen(prev => !prev), []);
  
  return {
    // View state
    currentView,
    isLoading,
    error,
    
    // View operations
    switchView,
    createView,
    updateView,
    deleteView,
    duplicateView,
    
    // Filter state
    filters,
    updateFilters,
    resetFilters,
    
    // Cross-filter state
    crossFilters,
    updateCrossFilters,
    clearCrossFilters,
    applyCrossFilter,
    
    // Chart operations
    charts,
    addChart,
    updateChart,
    removeChart,
    
    // View lists
    allViews,
    recentViews,
    favoriteViews,
    pinnedViews,
    templates: VIEW_TEMPLATES,
    
    // View switcher
    isViewSwitcherOpen,
    openViewSwitcher,
    closeViewSwitcher,
    toggleViewSwitcher,
    
    // Utilities
    hasUnsavedChanges,
    saveChanges,
    discardChanges,
  };
}

export default useViews;
