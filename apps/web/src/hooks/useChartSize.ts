/**
 * Chart Size Hook
 * 
 * Generic hook for managing chart sizes across any page.
 * Persists size preferences to localStorage per chart per page.
 */

import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY_PREFIX = 'plainledger:chart-sizes';

export interface ChartSizeConfig {
  height?: number;
  width?: number | 'auto';
  locked?: boolean;
  gridSpan?: 1 | 2 | 3;
}

interface ChartSizeStore {
  version: number;
  charts: Record<string, ChartSizeConfig>;
}

/**
 * Get storage key for a specific page
 */
function getStorageKey(pageId: string, tenantId: string = 'default'): string {
  return `${STORAGE_KEY_PREFIX}:${tenantId}:${pageId}`;
}

/**
 * Load chart sizes for a page from localStorage
 */
function loadChartSizes(pageId: string, tenantId?: string): ChartSizeStore {
  try {
    const key = getStorageKey(pageId, tenantId);
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to load chart sizes:', error);
  }
  return { version: 1, charts: {} };
}

/**
 * Save chart sizes for a page to localStorage
 */
function saveChartSizes(pageId: string, store: ChartSizeStore, tenantId?: string): void {
  try {
    const key = getStorageKey(pageId, tenantId);
    localStorage.setItem(key, JSON.stringify(store));
  } catch (error) {
    console.warn('Failed to save chart sizes:', error);
  }
}

/**
 * Hook to manage chart sizes for a specific page
 */
export function useChartSize(pageId: string, tenantId?: string) {
  const [store, setStore] = useState<ChartSizeStore>(() => 
    loadChartSizes(pageId, tenantId)
  );

  // Reload when page or tenant changes
  useEffect(() => {
    setStore(loadChartSizes(pageId, tenantId));
  }, [pageId, tenantId]);

  /**
   * Get size config for a specific chart
   */
  const getChartSize = useCallback((chartId: string): ChartSizeConfig => {
    return store.charts[chartId] || {};
  }, [store]);

  /**
   * Update size for a specific chart
   */
  const setChartSize = useCallback((chartId: string, size: Partial<ChartSizeConfig>) => {
    setStore(prev => {
      const updated: ChartSizeStore = {
        ...prev,
        charts: {
          ...prev.charts,
          [chartId]: {
            ...prev.charts[chartId],
            ...size,
          },
        },
      };
      saveChartSizes(pageId, updated, tenantId);
      return updated;
    });
  }, [pageId, tenantId]);

  /**
   * Toggle size lock for a chart
   */
  const toggleLock = useCallback((chartId: string): boolean => {
    const current = store.charts[chartId]?.locked ?? false;
    setChartSize(chartId, { locked: !current });
    return !current;
  }, [store, setChartSize]);

  /**
   * Reset a chart to default size
   */
  const resetChartSize = useCallback((chartId: string) => {
    setStore(prev => {
      const updated = { ...prev };
      delete updated.charts[chartId];
      saveChartSizes(pageId, updated, tenantId);
      return updated;
    });
  }, [pageId, tenantId]);

  /**
   * Reset all chart sizes on this page
   */
  const resetAllSizes = useCallback(() => {
    const empty: ChartSizeStore = { version: 1, charts: {} };
    setStore(empty);
    saveChartSizes(pageId, empty, tenantId);
  }, [pageId, tenantId]);

  /**
   * Check if any chart has custom sizing
   */
  const hasCustomSizes = Object.keys(store.charts).length > 0;

  return {
    getChartSize,
    setChartSize,
    toggleLock,
    resetChartSize,
    resetAllSizes,
    hasCustomSizes,
  };
}

/**
 * Hook to manage a single chart's size
 * Convenience wrapper for individual chart components
 */
export function useSingleChartSize(
  pageId: string, 
  chartId: string, 
  defaultHeight?: number,
  tenantId?: string
) {
  const { getChartSize, setChartSize, toggleLock, resetChartSize } = useChartSize(pageId, tenantId);
  
  const sizeConfig = getChartSize(chartId);
  
  const height = sizeConfig.height ?? defaultHeight;
  const width = sizeConfig.width ?? 'auto';
  const locked = sizeConfig.locked ?? false;
  const gridSpan = sizeConfig.gridSpan ?? 1;

  const setHeight = useCallback((h: number) => {
    setChartSize(chartId, { height: h });
  }, [chartId, setChartSize]);

  const setWidth = useCallback((w: number | 'auto') => {
    setChartSize(chartId, { width: w });
  }, [chartId, setChartSize]);

  const setGridSpan = useCallback((span: 1 | 2 | 3) => {
    setChartSize(chartId, { gridSpan: span });
  }, [chartId, setChartSize]);

  const toggle = useCallback(() => toggleLock(chartId), [chartId, toggleLock]);
  const reset = useCallback(() => resetChartSize(chartId), [chartId, resetChartSize]);

  return {
    height,
    width,
    locked,
    gridSpan,
    setHeight,
    setWidth,
    setGridSpan,
    toggleLock: toggle,
    reset,
  };
}
