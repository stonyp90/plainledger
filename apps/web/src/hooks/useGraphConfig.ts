/**
 * Graph Configuration Hook
 * 
 * Provides graph configuration based on:
 * - Chart-level overrides (per-chart settings stored in localStorage)
 * - User preferences (global defaults stored in localStorage)
 * - Organization settings (from tenant context)
 * - System defaults (IBCS always enforced)
 * 
 * Configuration hierarchy:
 * 1. Per-chart settings (most specific)
 * 2. User global preferences
 * 3. Organization settings
 * 4. System defaults (with IBCS enforced)
 * 
 * Features:
 * - Chart lock/unlock support
 * - Batch sync to database
 * - Conflict detection
 */

import { useMemo, useCallback, useState, useEffect } from 'react';
import { useTenant, type Tenant } from '../contexts/TenantContext';
import {
  GraphConfig,
  mergeGraphConfig,
  DEFAULT_GRAPH_CONFIG,
  type PartialGraphConfig,
  validateGraphConfig,
  type IBCSConfig,
  type ChartLockConfig,
} from '../lib/graphConfig';
import { chartSettingsSync } from '../services/chartSettingsSync';

const USER_PREFERENCES_KEY = 'plainledger-graph-preferences';
const CHART_SETTINGS_KEY = 'plainledger-chart-settings';
const PREFERENCES_VERSION = '1.1.0';

// Global version counter to trigger re-renders when settings change
let configVersion = 0;
const configListeners = new Set<() => void>();

function notifyConfigChange() {
  configVersion++;
  configListeners.forEach(listener => listener());
}

function useConfigVersion() {
  const [, setVersion] = useState(configVersion);
  
  useEffect(() => {
    const listener = () => setVersion(configVersion);
    configListeners.add(listener);
    return () => { configListeners.delete(listener); };
  }, []);
  
  return configVersion;
}

interface StoredPreferences {
  version: string;
  config: PartialGraphConfig;
  updatedAt: string;
}

interface StoredChartSettings {
  version: string;
  charts: Record<string, PartialGraphConfig>;
  updatedAt: string;
}

// Debounce timers for localStorage writes
let savePreferencesTimer: ReturnType<typeof setTimeout> | null = null;
let saveChartSettingsTimer: ReturnType<typeof setTimeout> | null = null;
const SAVE_DEBOUNCE_MS = 500;

/**
 * Get user preferences from localStorage with version checking
 */
function getUserPreferences(): PartialGraphConfig | undefined {
  if (typeof window === 'undefined') return undefined;
  
  try {
    const stored = localStorage.getItem(USER_PREFERENCES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as StoredPreferences | PartialGraphConfig;
      
      // Handle versioned format
      if ('version' in parsed && 'config' in parsed) {
        return parsed.config;
      }
      
      // Legacy format - return as-is
      return parsed as PartialGraphConfig;
    }
  } catch (error) {
    console.warn('Failed to load user graph preferences:', error);
  }
  
  return undefined;
}

/**
 * Get per-chart settings from localStorage
 */
function getChartSettings(chartId?: string): PartialGraphConfig | undefined {
  if (typeof window === 'undefined' || !chartId) return undefined;
  
  try {
    const stored = localStorage.getItem(CHART_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as StoredChartSettings;
      if (parsed.charts && parsed.charts[chartId]) {
        return parsed.charts[chartId];
      }
    }
  } catch (error) {
    console.warn('Failed to load chart settings:', error);
  }
  
  return undefined;
}

/**
 * Get all stored chart settings
 */
export function getAllChartSettings(): Record<string, PartialGraphConfig> {
  if (typeof window === 'undefined') return {};
  
  try {
    const stored = localStorage.getItem(CHART_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as StoredChartSettings;
      return parsed.charts || {};
    }
  } catch (error) {
    console.warn('Failed to load chart settings:', error);
  }
  
  return {};
}

/**
 * Save user preferences to localStorage with debouncing and version
 */
export function saveUserPreferences(preferences: PartialGraphConfig): void {
  if (typeof window === 'undefined') return;
  
  // Validate before saving
  const validation = validateGraphConfig(preferences);
  if (!validation.isValid) {
    console.warn('Graph config validation errors:', validation.errors);
  }
  
  // Clear existing debounce timer
  if (savePreferencesTimer) {
    clearTimeout(savePreferencesTimer);
  }
  
  // Debounce the save to avoid excessive localStorage writes
  savePreferencesTimer = setTimeout(() => {
    try {
      const storedData: StoredPreferences = {
        version: PREFERENCES_VERSION,
        config: preferences,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(USER_PREFERENCES_KEY, JSON.stringify(storedData));
      // Notify all hooks to re-read config
      notifyConfigChange();
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.error('localStorage quota exceeded. Consider clearing old preferences.');
      } else {
        console.warn('Failed to save user graph preferences:', error);
      }
    }
  }, SAVE_DEBOUNCE_MS);
}

/**
 * Deep merge helper for nested objects
 */
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] !== undefined) {
      if (
        typeof source[key] === 'object' && 
        source[key] !== null && 
        !Array.isArray(source[key]) &&
        typeof target[key] === 'object' &&
        target[key] !== null
      ) {
        // Recursively merge nested objects
        result[key] = deepMerge(target[key], source[key] as any);
      } else {
        result[key] = source[key] as any;
      }
    }
  }
  
  return result;
}

/**
 * Save per-chart settings to localStorage with debouncing
 * Properly merges with existing settings for the specific chart
 */
export function saveChartSettings(chartId: string, settings: PartialGraphConfig): void {
  if (typeof window === 'undefined' || !chartId) return;
  
  // Check if chart is locked
  const existing = getAllChartSettings();
  if (existing[chartId]?.lock?.locked) {
    console.warn(`Chart ${chartId} is locked. Cannot save settings.`);
    return;
  }
  
  // Clear existing debounce timer
  if (saveChartSettingsTimer) {
    clearTimeout(saveChartSettingsTimer);
  }
  
  saveChartSettingsTimer = setTimeout(() => {
    try {
      const existingChartSettings = existing[chartId] || {};
      
      // Deep merge the new settings with existing chart settings
      const mergedChartSettings = deepMerge(existingChartSettings as Record<string, any>, settings as Record<string, any>);
      
      // Add timestamp for sync
      mergedChartSettings.updatedAt = new Date().toISOString();
      
      const storedData: StoredChartSettings = {
        version: PREFERENCES_VERSION,
        charts: {
          ...existing,
          [chartId]: mergedChartSettings,
        },
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(CHART_SETTINGS_KEY, JSON.stringify(storedData));
      // Notify all hooks to re-read config
      notifyConfigChange();
      // Mark pending changes for sync
      chartSettingsSync.markPendingChanges();
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.error('localStorage quota exceeded.');
      } else {
        console.warn('Failed to save chart settings:', error);
      }
    }
  }, SAVE_DEBOUNCE_MS);
}

/**
 * Clear settings for a specific chart
 */
export function clearChartSettings(chartId: string): void {
  if (typeof window === 'undefined' || !chartId) return;
  
  try {
    const existing = getAllChartSettings();
    delete existing[chartId];
    
    const storedData: StoredChartSettings = {
      version: PREFERENCES_VERSION,
      charts: existing,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(CHART_SETTINGS_KEY, JSON.stringify(storedData));
    // Notify all hooks to re-read config
    notifyConfigChange();
  } catch (error) {
    console.warn('Failed to clear chart settings:', error);
  }
}

/**
 * Reset all chart settings to use global defaults
 */
export function resetAllChartSettings(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(CHART_SETTINGS_KEY);
  } catch (error) {
    console.warn('Failed to reset chart settings:', error);
  }
}

/**
 * Get organization-level graph settings from tenant
 * Uses proper Tenant type for type safety
 */
function getOrgGraphSettings(tenant: Tenant | null): PartialGraphConfig | undefined {
  if (!tenant?.settings) return undefined;
  
  // Extract fiscal year start from fiscalYearEnd (MM-DD format)
  let fiscalYearStartMonth = 1; // Default: calendar year
  if (tenant.settings.fiscalYearEnd) {
    const [month] = tenant.settings.fiscalYearEnd.split('-');
    const fiscalEndMonth = parseInt(month, 10);
    // Fiscal year starts the month after the end month
    fiscalYearStartMonth = (fiscalEndMonth % 12) + 1;
  }
  
  return {
    display: {
      currency: tenant.settings.currency || DEFAULT_GRAPH_CONFIG.display.currency,
      currencyNotation: 'standard',
      numberFormat: 'actual',
      currencyDecimals: 0,
      percentageDecimals: 1,
      ratioDecimals: 2,
      showCurrencySymbol: true,
      showZeroValues: false,
      useAccountingFormat: false,
    },
    period: {
      ...DEFAULT_GRAPH_CONFIG.period,
      fiscalYearStartMonth,
    },
    locale: tenant.settings.locale || DEFAULT_GRAPH_CONFIG.locale,
  };
}

/**
 * IBCS enforcement - Always enabled as industry standard
 * Individual IBCS options can be customized, but IBCS itself cannot be disabled
 */
function enforceIBCS(config: GraphConfig): GraphConfig {
  return {
    ...config,
    ibcs: {
      ...config.ibcs,
      enabled: true, // IBCS is always enforced
    },
  };
}

/**
 * Hook to get graph configuration for a specific chart
 * 
 * Configuration hierarchy:
 * 1. Per-chart settings (most specific)
 * 2. Chart overrides passed as prop
 * 3. User global preferences
 * 4. Organization settings
 * 5. System defaults
 * 
 * Note: IBCS is always enforced regardless of settings
 */
export function useGraphConfig(
  chartId?: string,
  chartOverrides?: PartialGraphConfig,
): GraphConfig {
  const { currentTenant } = useTenant();
  // Subscribe to config changes to trigger re-renders
  const version = useConfigVersion();
  
  return useMemo(() => {
    const userPreferences = getUserPreferences();
    const orgSettings = currentTenant ? getOrgGraphSettings(currentTenant) : undefined;
    const chartSettings = chartId ? getChartSettings(chartId) : undefined;
    
    // Merge with priority: chartSettings > chartOverrides > userPreferences > orgSettings > defaults
    const mergedChartOverrides = chartSettings 
      ? { ...chartOverrides, ...chartSettings }
      : chartOverrides;
    
    // Cast to Partial<GraphConfig> as mergeGraphConfig handles nested merging internally
    const config = mergeGraphConfig(
      mergedChartOverrides as Partial<GraphConfig> | undefined, 
      userPreferences as Partial<GraphConfig> | undefined, 
      orgSettings as Partial<GraphConfig> | undefined
    );
    
    // Enforce IBCS as industry standard
    return enforceIBCS(config);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartId, chartOverrides, currentTenant, version]);
}

/**
 * Hook to get default graph configuration (no chart-specific overrides)
 */
export function useDefaultGraphConfig(): GraphConfig {
  return useGraphConfig();
}

/**
 * Hook to manage per-chart settings with save callback
 */
export function useChartSettings(chartId: string) {
  const config = useGraphConfig(chartId);
  
  const updateSettings = useCallback((updates: PartialGraphConfig) => {
    saveChartSettings(chartId, updates);
  }, [chartId]);
  
  const resetSettings = useCallback(() => {
    clearChartSettings(chartId);
  }, [chartId]);
  
  return {
    config,
    updateSettings,
    resetSettings,
  };
}

/**
 * Get IBCS config for a chart (convenience function)
 * Note: IBCS enabled state is always true
 */
export function getIBCSConfig(chartId?: string): IBCSConfig {
  const userPreferences = getUserPreferences();
  const chartSettings = chartId ? getChartSettings(chartId) : undefined;
  
  return {
    ...DEFAULT_GRAPH_CONFIG.ibcs!,
    ...userPreferences?.ibcs,
    ...chartSettings?.ibcs,
    enabled: true, // Always enforced
  };
}

// ============================================================================
// CHART LOCK/UNLOCK FUNCTIONS
// ============================================================================

/**
 * Check if a chart is locked
 */
export function isChartLocked(chartId: string): boolean {
  if (typeof window === 'undefined' || !chartId) return false;
  
  const chartSettings = getChartSettings(chartId);
  return chartSettings?.lock?.locked === true;
}

/**
 * Get lock info for a chart
 */
export function getChartLockInfo(chartId: string): Partial<ChartLockConfig> | undefined {
  if (typeof window === 'undefined' || !chartId) return undefined;
  
  const chartSettings = getChartSettings(chartId);
  return chartSettings?.lock;
}

/**
 * Lock a chart (prevents modifications to settings, position, resize, delete)
 * Also syncs to server immediately
 */
export async function lockChart(chartId: string): Promise<boolean> {
  if (typeof window === 'undefined' || !chartId) return false;
  
  try {
    const existing = getAllChartSettings();
    const lockedAt = new Date().toISOString();
    
    const storedData: StoredChartSettings = {
      version: PREFERENCES_VERSION,
      charts: {
        ...existing,
        [chartId]: {
          ...existing[chartId],
          lock: {
            locked: true,
            lockedAt,
          },
          updatedAt: lockedAt,
        },
      },
      updatedAt: lockedAt,
    };
    
    localStorage.setItem(CHART_SETTINGS_KEY, JSON.stringify(storedData));
    notifyConfigChange();
    
    // Sync to server immediately
    const serverSuccess = await chartSettingsSync.lockChart(chartId);
    if (!serverSuccess) {
      console.warn('Failed to sync lock to server, will retry on next sync');
      chartSettingsSync.markPendingChanges();
    }
    
    return true;
  } catch (error) {
    console.error('Failed to lock chart:', error);
    return false;
  }
}

/**
 * Unlock a chart (allows modifications)
 * Also syncs to server immediately
 */
export async function unlockChart(chartId: string): Promise<boolean> {
  if (typeof window === 'undefined' || !chartId) return false;
  
  try {
    const existing = getAllChartSettings();
    const updatedAt = new Date().toISOString();
    
    const storedData: StoredChartSettings = {
      version: PREFERENCES_VERSION,
      charts: {
        ...existing,
        [chartId]: {
          ...existing[chartId],
          lock: {
            locked: false,
            lockedAt: undefined,
          },
          updatedAt,
        },
      },
      updatedAt,
    };
    
    localStorage.setItem(CHART_SETTINGS_KEY, JSON.stringify(storedData));
    notifyConfigChange();
    
    // Sync to server immediately
    const serverSuccess = await chartSettingsSync.unlockChart(chartId);
    if (!serverSuccess) {
      console.warn('Failed to sync unlock to server, will retry on next sync');
      chartSettingsSync.markPendingChanges();
    }
    
    return true;
  } catch (error) {
    console.error('Failed to unlock chart:', error);
    return false;
  }
}

/**
 * Toggle chart lock state
 */
export async function toggleChartLock(chartId: string): Promise<boolean> {
  const isLocked = isChartLocked(chartId);
  if (isLocked) {
    return unlockChart(chartId);
  } else {
    return lockChart(chartId);
  }
}

/**
 * Hook to manage chart lock state
 */
export function useChartLock(chartId: string) {
  const config = useGraphConfig(chartId);
  const [isLocking, setIsLocking] = useState(false);
  
  const locked = config.lock?.locked ?? false;
  const lockedAt = config.lock?.lockedAt;
  
  const lock = useCallback(async () => {
    setIsLocking(true);
    try {
      await lockChart(chartId);
    } finally {
      setIsLocking(false);
    }
  }, [chartId]);
  
  const unlock = useCallback(async () => {
    setIsLocking(true);
    try {
      await unlockChart(chartId);
    } finally {
      setIsLocking(false);
    }
  }, [chartId]);
  
  const toggle = useCallback(async () => {
    setIsLocking(true);
    try {
      await toggleChartLock(chartId);
    } finally {
      setIsLocking(false);
    }
  }, [chartId]);
  
  return {
    locked,
    lockedAt,
    isLocking,
    lock,
    unlock,
    toggle,
  };
}

// ============================================================================
// SYNC INITIALIZATION HOOK
// ============================================================================

/**
 * Hook to initialize the settings sync service
 * Should be called once at app root level
 */
export function useSettingsSyncInit(
  graphqlEndpoint: string,
  getAuthToken: () => Promise<string | null>
) {
  useEffect(() => {
    chartSettingsSync.initialize(graphqlEndpoint, getAuthToken);
    
    // Listen for sync events to refresh config
    const handleSync = () => {
      notifyConfigChange();
    };
    
    window.addEventListener('plainledger-settings-sync', handleSync);
    
    return () => {
      window.removeEventListener('plainledger-settings-sync', handleSync);
    };
  }, [graphqlEndpoint, getAuthToken]);
}
