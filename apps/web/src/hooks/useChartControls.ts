/**
 * Chart Controls Visibility Hook
 * 
 * Manages the visibility of chart controls (resize, settings, etc.)
 * Persists user preference to localStorage and syncs across all widget instances.
 * 
 * Usage:
 * const { mode, setMode, cycleMode, shouldShowControls } = useChartControls();
 */

import { useCallback, useEffect, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'plainledger:chart-controls-visible';
const SYNC_EVENT = 'plainledger:chart-controls-change';

export type ChartControlsMode = 'hover' | 'always' | 'hidden';

interface ChartControlsConfig {
  mode: ChartControlsMode;
  updatedAt: string;
}

// Shared state for synchronization across all hook instances
let currentMode: ChartControlsMode = 'hover';
let listeners = new Set<() => void>();

/**
 * Load controls visibility preference from localStorage
 */
function loadControlsConfig(): ChartControlsConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to load chart controls config:', error);
  }
  return { mode: 'hover', updatedAt: new Date().toISOString() };
}

/**
 * Save controls visibility preference to localStorage
 */
function saveControlsConfig(config: ChartControlsConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.warn('Failed to save chart controls config:', error);
  }
}

// Initialize from localStorage on module load
if (typeof window !== 'undefined') {
  currentMode = loadControlsConfig().mode;
}

/**
 * Subscribe to mode changes (for useSyncExternalStore)
 */
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Get current snapshot (for useSyncExternalStore)
 */
function getSnapshot(): ChartControlsMode {
  return currentMode;
}

/**
 * Get server snapshot (for SSR)
 */
function getServerSnapshot(): ChartControlsMode {
  return 'hover';
}

/**
 * Update the shared mode and notify all listeners
 */
function updateMode(newMode: ChartControlsMode): void {
  if (currentMode !== newMode) {
    currentMode = newMode;
    saveControlsConfig({ mode: newMode, updatedAt: new Date().toISOString() });
    // Notify all hook instances in this tab
    listeners.forEach(listener => listener());
    // Dispatch custom event for any other listeners
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: newMode }));
  }
}

/**
 * Hook to manage chart controls visibility
 * 
 * Uses useSyncExternalStore to share state across all widget instances.
 * When one widget changes the mode, all widgets update immediately.
 * 
 * @returns {Object} Controls state and setters
 * - mode: 'hover' | 'always' | 'hidden'
 * - setMode: Set the visibility mode
 * - cycleMode: Cycle through visibility modes
 * - shouldShowControls: Function to determine if controls should be visible
 */
export function useChartControls() {
  // Use useSyncExternalStore to share state across all instances
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Listen for cross-tab changes via storage event
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const config = JSON.parse(e.newValue) as ChartControlsConfig;
          if (config.mode !== currentMode) {
            currentMode = config.mode;
            listeners.forEach(listener => listener());
          }
        } catch {
          // Ignore parse errors
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Set mode and sync across all instances
  const setMode = useCallback((newMode: ChartControlsMode) => {
    updateMode(newMode);
  }, []);

  // Cycle through modes: hover -> always -> hidden -> hover
  const cycleMode = useCallback(() => {
    const nextMode = currentMode === 'hover' ? 'always' : currentMode === 'always' ? 'hidden' : 'hover';
    updateMode(nextMode);
  }, []);

  // Helper to determine if controls should be visible
  const shouldShowControls = useCallback((isHovered: boolean): boolean => {
    switch (mode) {
      case 'always':
        return true;
      case 'hidden':
        return false;
      case 'hover':
      default:
        return isHovered;
    }
  }, [mode]);

  return {
    mode,
    setMode,
    cycleMode,
    shouldShowControls,
  };
}

/**
 * Get the current chart controls mode (for use outside React components)
 */
export function getChartControlsMode(): ChartControlsMode {
  return loadControlsConfig().mode;
}

/**
 * Set the chart controls mode (for use outside React components)
 */
export function setChartControlsMode(mode: ChartControlsMode): void {
  saveControlsConfig({ mode, updatedAt: new Date().toISOString() });
}

export default useChartControls;
