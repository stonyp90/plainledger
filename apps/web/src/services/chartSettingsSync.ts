/**
 * Chart Settings Sync Service
 * 
 * Provides offline-first synchronization of user settings to the database.
 * Uses localStorage as a write-through cache with periodic batch sync to the server.
 * 
 * Features:
 * - Debounced batch writes (30 second interval)
 * - Immediate sync on page unload
 * - Conflict detection and resolution
 * - Automatic retry on failure
 */

import { PartialGraphConfig } from '../lib/graphConfig';

// ============================================================================
// TYPES
// ============================================================================

export interface ChartSettingsEntry {
  chartId: string;
  config: PartialGraphConfig;
  locked: boolean;
  lockedAt?: string;
  updatedAt: string;
}

export interface SyncState {
  lastSyncTimestamp: string | null;
  pendingChanges: boolean;
  syncInProgress: boolean;
  lastError: string | null;
  retryCount: number;
}

export interface BatchSyncInput {
  notificationPreferences?: any;
  uiPreferences?: any;
  featurePreferences?: any;
  chartPreferences?: {
    tooltip?: any;
    ibcs?: any;
    display?: any;
    controlsMode?: string;
  };
  chartSettings?: ChartSettingsEntry[];
  clientTimestamp: string;
  lastSyncTimestamp?: string;
}

export interface BatchSyncResult {
  success: boolean;
  serverTimestamp: string;
  error?: string;
  conflicts?: string[];
  settings?: any;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SYNC_STATE_KEY = 'plainledger-sync-state';
const PENDING_CHANGES_KEY = 'plainledger-pending-changes';
const SYNC_INTERVAL_MS = 30000; // 30 seconds
const MAX_RETRY_COUNT = 3;
const RETRY_DELAY_MS = 5000; // 5 seconds

// ============================================================================
// SYNC SERVICE CLASS
// ============================================================================

class ChartSettingsSyncService {
  private syncTimer: ReturnType<typeof setTimeout> | null = null;
  private syncState: SyncState = {
    lastSyncTimestamp: null,
    pendingChanges: false,
    syncInProgress: false,
    lastError: null,
    retryCount: 0,
  };
  private listeners = new Set<(state: SyncState) => void>();
  private graphqlEndpoint: string | null = null;
  private getAuthToken: (() => Promise<string | null>) | null = null;

  constructor() {
    this.loadSyncState();
    this.setupBeforeUnload();
  }

  /**
   * Initialize the sync service with GraphQL endpoint and auth token getter
   */
  initialize(
    graphqlEndpoint: string,
    getAuthToken: () => Promise<string | null>
  ) {
    this.graphqlEndpoint = graphqlEndpoint;
    this.getAuthToken = getAuthToken;
    
    // Start periodic sync
    this.startSyncTimer();
    
    // Load initial settings from server
    this.loadFromServer();
  }

  /**
   * Subscribe to sync state changes
   */
  subscribe(listener: (state: SyncState) => void): () => void {
    this.listeners.add(listener);
    // Immediately notify with current state
    listener(this.syncState);
    return () => this.listeners.delete(listener);
  }

  /**
   * Mark that there are pending changes to sync
   */
  markPendingChanges() {
    this.syncState.pendingChanges = true;
    this.saveSyncState();
    this.notifyListeners();
    
    // Reset sync timer to ensure changes are synced
    this.restartSyncTimer();
  }

  /**
   * Force an immediate sync
   */
  async forceSync(): Promise<BatchSyncResult> {
    return this.performSync();
  }

  /**
   * Get current sync state
   */
  getSyncState(): SyncState {
    return { ...this.syncState };
  }

  /**
   * Lock a specific chart
   */
  async lockChart(chartId: string): Promise<boolean> {
    if (!this.graphqlEndpoint || !this.getAuthToken) {
      console.warn('Sync service not initialized');
      return false;
    }

    try {
      const token = await this.getAuthToken();
      if (!token) return false;

      const response = await fetch(this.graphqlEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: `
            mutation LockChart($chartId: String!) {
              lockChart(chartId: $chartId) {
                success
                chartId
                locked
                lockedAt
                error
              }
            }
          `,
          variables: { chartId },
        }),
      });

      const result = await response.json();
      return result.data?.lockChart?.success === true;
    } catch (error) {
      console.error('Failed to lock chart:', error);
      return false;
    }
  }

  /**
   * Unlock a specific chart
   */
  async unlockChart(chartId: string): Promise<boolean> {
    if (!this.graphqlEndpoint || !this.getAuthToken) {
      console.warn('Sync service not initialized');
      return false;
    }

    try {
      const token = await this.getAuthToken();
      if (!token) return false;

      const response = await fetch(this.graphqlEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: `
            mutation UnlockChart($chartId: String!) {
              unlockChart(chartId: $chartId) {
                success
                chartId
                locked
                error
              }
            }
          `,
          variables: { chartId },
        }),
      });

      const result = await response.json();
      return result.data?.unlockChart?.success === true;
    } catch (error) {
      console.error('Failed to unlock chart:', error);
      return false;
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private loadSyncState() {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(SYNC_STATE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.syncState = {
          ...this.syncState,
          lastSyncTimestamp: parsed.lastSyncTimestamp || null,
          pendingChanges: parsed.pendingChanges || false,
        };
      }
    } catch (error) {
      console.warn('Failed to load sync state:', error);
    }
  }

  private saveSyncState() {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(SYNC_STATE_KEY, JSON.stringify({
        lastSyncTimestamp: this.syncState.lastSyncTimestamp,
        pendingChanges: this.syncState.pendingChanges,
      }));
    } catch (error) {
      console.warn('Failed to save sync state:', error);
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener({ ...this.syncState }));
  }

  private setupBeforeUnload() {
    if (typeof window === 'undefined') return;
    
    window.addEventListener('beforeunload', () => {
      if (this.syncState.pendingChanges && !this.syncState.syncInProgress) {
        // Use sendBeacon for reliable sync on page unload
        this.syncBeacon();
      }
    });
  }

  private startSyncTimer() {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
    }
    
    this.syncTimer = setTimeout(() => {
      this.performSync();
      this.startSyncTimer();
    }, SYNC_INTERVAL_MS);
  }

  private restartSyncTimer() {
    this.startSyncTimer();
  }

  private async syncBeacon() {
    if (!this.graphqlEndpoint || !this.getAuthToken) return;
    
    try {
      // For beacon, we need to prepare the data synchronously
      const syncData = this.prepareSyncData();
      if (!syncData) return;
      
      // Note: sendBeacon doesn't support custom headers, so this is a fallback
      // In practice, the regular sync should handle most cases
      navigator.sendBeacon?.(
        `${this.graphqlEndpoint}/sync-beacon`,
        JSON.stringify(syncData)
      );
    } catch (error) {
      console.warn('Beacon sync failed:', error);
    }
  }

  private prepareSyncData(): BatchSyncInput | null {
    if (typeof window === 'undefined') return null;
    
    try {
      // Get chart settings from localStorage
      const chartSettingsStr = localStorage.getItem('plainledger-chart-settings');
      const chartSettings = chartSettingsStr ? JSON.parse(chartSettingsStr) : null;
      
      // Get user preferences from localStorage
      const preferencesStr = localStorage.getItem('plainledger-graph-preferences');
      const preferences = preferencesStr ? JSON.parse(preferencesStr) : null;
      
      // Build chart settings entries
      const chartSettingsEntries: ChartSettingsEntry[] = [];
      if (chartSettings?.charts) {
        for (const [chartId, config] of Object.entries(chartSettings.charts)) {
          const chartConfig = config as any;
          chartSettingsEntries.push({
            chartId,
            config: chartConfig,
            locked: chartConfig.lock?.locked ?? false,
            lockedAt: chartConfig.lock?.lockedAt,
            updatedAt: chartConfig.updatedAt || new Date().toISOString(),
          });
        }
      }
      
      return {
        chartPreferences: preferences?.config,
        chartSettings: chartSettingsEntries,
        clientTimestamp: new Date().toISOString(),
        lastSyncTimestamp: this.syncState.lastSyncTimestamp || undefined,
      };
    } catch (error) {
      console.warn('Failed to prepare sync data:', error);
      return null;
    }
  }

  private async performSync(): Promise<BatchSyncResult> {
    if (!this.graphqlEndpoint || !this.getAuthToken) {
      return { 
        success: false, 
        serverTimestamp: new Date().toISOString(),
        error: 'Sync service not initialized' 
      };
    }
    
    if (this.syncState.syncInProgress) {
      return { 
        success: false, 
        serverTimestamp: new Date().toISOString(),
        error: 'Sync already in progress' 
      };
    }
    
    if (!this.syncState.pendingChanges) {
      return { 
        success: true, 
        serverTimestamp: new Date().toISOString(),
      };
    }
    
    this.syncState.syncInProgress = true;
    this.syncState.lastError = null;
    this.notifyListeners();
    
    try {
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      const syncData = this.prepareSyncData();
      if (!syncData) {
        throw new Error('Failed to prepare sync data');
      }
      
      const response = await fetch(this.graphqlEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: `
            mutation BatchSyncSettings($input: BatchSyncSettingsInput!) {
              batchSyncSettings(input: $input) {
                success
                serverTimestamp
                error
                conflicts
                settings {
                  userId
                  chartPreferences
                  updatedAt
                }
              }
            }
          `,
          variables: { input: syncData },
        }),
      });
      
      const result = await response.json();
      const syncResult = result.data?.batchSyncSettings as BatchSyncResult;
      
      if (syncResult?.success) {
        this.syncState.lastSyncTimestamp = syncResult.serverTimestamp;
        this.syncState.pendingChanges = false;
        this.syncState.retryCount = 0;
        
        // Handle conflicts if any
        if (syncResult.conflicts && syncResult.conflicts.length > 0) {
          console.warn('Sync conflicts detected for charts:', syncResult.conflicts);
          // Merge server data back to localStorage for conflicting charts
          this.mergeServerData(syncResult.settings);
        }
        
        this.saveSyncState();
      } else {
        throw new Error(syncResult?.error || 'Sync failed');
      }
      
      this.syncState.syncInProgress = false;
      this.notifyListeners();
      
      return syncResult;
    } catch (error) {
      this.syncState.syncInProgress = false;
      this.syncState.lastError = error instanceof Error ? error.message : 'Unknown error';
      this.syncState.retryCount++;
      this.notifyListeners();
      
      // Schedule retry if under max retries
      if (this.syncState.retryCount < MAX_RETRY_COUNT) {
        setTimeout(() => this.performSync(), RETRY_DELAY_MS * this.syncState.retryCount);
      }
      
      return {
        success: false,
        serverTimestamp: new Date().toISOString(),
        error: this.syncState.lastError,
      };
    }
  }

  private async loadFromServer() {
    if (!this.graphqlEndpoint || !this.getAuthToken) return;
    
    try {
      const token = await this.getAuthToken();
      if (!token) return;
      
      const response = await fetch(this.graphqlEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: `
            query GetUserSettings {
              userSettings {
                userId
                chartPreferences
                uiPreferences
                notificationPreferences
                featurePreferences
                updatedAt
              }
            }
          `,
        }),
      });
      
      const result = await response.json();
      const settings = result.data?.userSettings;
      
      if (settings) {
        this.mergeServerData(settings);
        this.syncState.lastSyncTimestamp = settings.updatedAt;
        this.saveSyncState();
      }
    } catch (error) {
      console.warn('Failed to load settings from server:', error);
    }
  }

  private mergeServerData(settings: any) {
    if (typeof window === 'undefined' || !settings) return;
    
    try {
      // Merge chart preferences
      if (settings.chartPreferences) {
        const existingStr = localStorage.getItem('plainledger-graph-preferences');
        const existing = existingStr ? JSON.parse(existingStr) : { version: '1.1.0', config: {} };
        
        // Server data takes precedence for global preferences
        const merged = {
          ...existing,
          config: {
            ...existing.config,
            ...settings.chartPreferences,
          },
          updatedAt: new Date().toISOString(),
        };
        
        localStorage.setItem('plainledger-graph-preferences', JSON.stringify(merged));
        
        // Merge chart overrides
        if (settings.chartPreferences.chartOverrides) {
          const chartSettingsStr = localStorage.getItem('plainledger-chart-settings');
          const chartSettings = chartSettingsStr ? JSON.parse(chartSettingsStr) : { version: '1.1.0', charts: {} };
          
          for (const [chartId, serverConfig] of Object.entries(settings.chartPreferences.chartOverrides)) {
            const localConfig = chartSettings.charts[chartId] || {};
            const serverConfigObj = serverConfig as Record<string, any>;
            const serverTime = serverConfigObj.updatedAt ? new Date(serverConfigObj.updatedAt) : new Date(0);
            const localTime = localConfig.updatedAt ? new Date(localConfig.updatedAt) : new Date(0);
            
            // Server wins if newer
            if (serverTime >= localTime) {
              chartSettings.charts[chartId] = {
                ...localConfig,
                ...serverConfigObj,
              };
            }
          }
          
          chartSettings.updatedAt = new Date().toISOString();
          localStorage.setItem('plainledger-chart-settings', JSON.stringify(chartSettings));
        }
      }
      
      // Trigger config change notification
      window.dispatchEvent(new CustomEvent('plainledger-settings-sync'));
    } catch (error) {
      console.warn('Failed to merge server data:', error);
    }
  }

  /**
   * Cleanup - call when service is no longer needed
   */
  destroy() {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
    this.listeners.clear();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const chartSettingsSync = new ChartSettingsSyncService();

// ============================================================================
// REACT HOOK FOR SYNC STATE
// ============================================================================

import { useState, useEffect } from 'react';

export function useSyncState(): SyncState {
  const [state, setState] = useState<SyncState>(chartSettingsSync.getSyncState());
  
  useEffect(() => {
    return chartSettingsSync.subscribe(setState);
  }, []);
  
  return state;
}
