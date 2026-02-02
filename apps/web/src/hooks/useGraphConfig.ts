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
} from '../lib/graphConfig';

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
 * Save per-chart settings to localStorage with debouncing
 */
export function saveChartSettings(chartId: string, settings: PartialGraphConfig): void {
  if (typeof window === 'undefined' || !chartId) return;
  
  // Clear existing debounce timer
  if (saveChartSettingsTimer) {
    clearTimeout(saveChartSettingsTimer);
  }
  
  saveChartSettingsTimer = setTimeout(() => {
    try {
      const existing = getAllChartSettings();
      const storedData: StoredChartSettings = {
        version: PREFERENCES_VERSION,
        charts: {
          ...existing,
          [chartId]: settings,
        },
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(CHART_SETTINGS_KEY, JSON.stringify(storedData));
      // Notify all hooks to re-read config
      notifyConfigChange();
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
    
    const config = mergeGraphConfig(mergedChartOverrides, userPreferences, orgSettings);
    
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
