/**
 * Graph Configuration Hook
 * 
 * Provides graph configuration based on:
 * - Chart-level overrides
 * - User preferences (stored in localStorage)
 * - Organization settings (from tenant context)
 * - System defaults
 */

import { useMemo, useCallback, useRef } from 'react';
import { useTenant, type Tenant } from '../contexts/TenantContext';
import {
  GraphConfig,
  mergeGraphConfig,
  DEFAULT_GRAPH_CONFIG,
  type PartialGraphConfig,
  validateGraphConfig,
} from '../lib/graphConfig';

const USER_PREFERENCES_KEY = 'plainledger-graph-preferences';
const PREFERENCES_VERSION = '1.0.0';

interface StoredPreferences {
  version: string;
  config: PartialGraphConfig;
  updatedAt: string;
}

// Debounce timer for localStorage writes
let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
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
        // In future, we could migrate old versions here
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
 * Save user preferences to localStorage with debouncing and version
 */
export function saveUserPreferences(preferences: PartialGraphConfig): void {
  if (typeof window === 'undefined') return;
  
  // Validate before saving
  const validation = validateGraphConfig(preferences);
  if (!validation.isValid) {
    console.warn('Graph config validation errors:', validation.errors);
    // Still save, but log the issues
  }
  if (validation.warnings.length > 0) {
    console.info('Graph config validation warnings:', validation.warnings);
  }
  
  // Clear existing debounce timer
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
  }
  
  // Debounce the save to avoid excessive localStorage writes
  saveDebounceTimer = setTimeout(() => {
    try {
      const storedData: StoredPreferences = {
        version: PREFERENCES_VERSION,
        config: preferences,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(USER_PREFERENCES_KEY, JSON.stringify(storedData));
    } catch (error) {
      // Handle quota exceeded error gracefully
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.error('localStorage quota exceeded. Consider clearing old preferences.');
      } else {
        console.warn('Failed to save user graph preferences:', error);
      }
    }
  }, SAVE_DEBOUNCE_MS);
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
 * Hook to get graph configuration for a specific chart
 */
export function useGraphConfig(
  chartId?: string,
  chartOverrides?: PartialGraphConfig,
): GraphConfig {
  const { currentTenant } = useTenant();
  
  return useMemo(() => {
    const userPreferences = getUserPreferences();
    const orgSettings = currentTenant ? getOrgGraphSettings(currentTenant) : undefined;
    
    return mergeGraphConfig(chartOverrides, userPreferences, orgSettings);
  }, [chartId, chartOverrides, currentTenant]);
}

/**
 * Hook to get default graph configuration (no chart-specific overrides)
 */
export function useDefaultGraphConfig(): GraphConfig {
  return useGraphConfig();
}
