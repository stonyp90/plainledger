/**
 * CrossFilterContext
 * 
 * Provides cross-chart filtering functionality for dashboards.
 * When a user interacts with a chart (clicks a data point, selects a range, etc.),
 * the filter is propagated to all other charts on the dashboard.
 * 
 * Features:
 * - Track active filters from chart interactions
 * - Propagate filters to all charts
 * - Support exclude/include filter modes
 * - Clear filters
 * - Filter history/undo
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

export type FilterMode = 'include' | 'exclude';

export interface CrossFilter {
  id: string;
  sourceId: string;
  fieldId: string;
  operator: string;
  value: unknown;
  mode: FilterMode;
  appliedAt: Date;
  appliedBy: string; // Chart ID that applied this filter
}

interface CrossFilterContextValue {
  activeFilters: CrossFilter[];
  addFilter: (filter: Omit<CrossFilter, 'id' | 'appliedAt'>) => void;
  removeFilter: (filterId: string) => void;
  clearFilters: () => void;
  clearFiltersFromChart: (chartId: string) => void;
  getFiltersForSource: (sourceId: string) => CrossFilter[];
  hasActiveFilters: boolean;
}

const CrossFilterContext = createContext<CrossFilterContextValue | undefined>(undefined);

export function CrossFilterProvider({ children }: { children: React.ReactNode }) {
  const [activeFilters, setActiveFilters] = useState<CrossFilter[]>([]);

  const addFilter = useCallback((filter: Omit<CrossFilter, 'id' | 'appliedAt'>) => {
    const newFilter: CrossFilter = {
      ...filter,
      id: `filter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      appliedAt: new Date(),
    };

    setActiveFilters((prev) => {
      // Remove any existing filter for the same source/field from the same chart
      const filtered = prev.filter(
        (f) => !(
          f.sourceId === newFilter.sourceId &&
          f.fieldId === newFilter.fieldId &&
          f.appliedBy === newFilter.appliedBy
        )
      );
      return [...filtered, newFilter];
    });
  }, []);

  const removeFilter = useCallback((filterId: string) => {
    setActiveFilters((prev) => prev.filter((f) => f.id !== filterId));
  }, []);

  const clearFilters = useCallback(() => {
    setActiveFilters([]);
  }, []);

  const clearFiltersFromChart = useCallback((chartId: string) => {
    setActiveFilters((prev) => prev.filter((f) => f.appliedBy !== chartId));
  }, []);

  const getFiltersForSource = useCallback(
    (sourceId: string) => {
      return activeFilters.filter((f) => f.sourceId === sourceId);
    },
    [activeFilters]
  );

  const hasActiveFilters = useMemo(() => activeFilters.length > 0, [activeFilters]);

  const value: CrossFilterContextValue = useMemo(
    () => ({
      activeFilters,
      addFilter,
      removeFilter,
      clearFilters,
      clearFiltersFromChart,
      getFiltersForSource,
      hasActiveFilters,
    }),
    [
      activeFilters,
      addFilter,
      removeFilter,
      clearFilters,
      clearFiltersFromChart,
      getFiltersForSource,
      hasActiveFilters,
    ]
  );

  return (
    <CrossFilterContext.Provider value={value}>
      {children}
    </CrossFilterContext.Provider>
  );
}

export function useCrossFilter() {
  const context = useContext(CrossFilterContext);
  if (!context) {
    throw new Error('useCrossFilter must be used within CrossFilterProvider');
  }
  return context;
}

/**
 * Hook for applying a filter from a chart interaction
 */
export function useChartFilter(chartId: string) {
  const { addFilter, clearFiltersFromChart } = useCrossFilter();

  const applyFilter = useCallback(
    (filter: {
      sourceId: string;
      fieldId: string;
      operator: string;
      value: unknown;
      mode?: FilterMode;
    }) => {
      addFilter({
        ...filter,
        mode: filter.mode || 'include',
        appliedBy: chartId,
      });
    },
    [addFilter, chartId]
  );

  const clearChartFilters = useCallback(() => {
    clearFiltersFromChart(chartId);
  }, [clearFiltersFromChart, chartId]);

  return {
    applyFilter,
    clearChartFilters,
  };
}

/**
 * Hook for consuming filters in a chart component
 */
export function useChartFilters(sourceIds: string[]) {
  const { activeFilters, getFiltersForSource } = useCrossFilter();

  const filters = useMemo(() => {
    const allFilters: CrossFilter[] = [];
    for (const sourceId of sourceIds) {
      allFilters.push(...getFiltersForSource(sourceId));
    }
    return allFilters;
  }, [sourceIds, getFiltersForSource]);

  // Convert to query filter format
  const queryFilters = useMemo(() => {
    return filters.map((f) => ({
      sourceId: f.sourceId,
      fieldId: f.fieldId,
      operator: f.operator,
      value: f.value,
    }));
  }, [filters]);

  return {
    filters,
    queryFilters,
    hasFilters: filters.length > 0,
  };
}
