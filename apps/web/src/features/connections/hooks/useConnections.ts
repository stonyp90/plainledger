/**
 * Connections Feature - Hooks
 * 
 * React hooks for managing connections.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTenant } from '../../../contexts/TenantContext';
import { connectionsApi } from '../api';
import type { 
  Connection, 
  CreateConnectionRequest, 
  UpdateConnectionRequest,
  SyncResult,
} from '../types';

// ============================================================================
// USE CONNECTIONS
// ============================================================================

interface UseConnectionsResult {
  connections: Connection[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  createConnection: (data: CreateConnectionRequest) => Promise<Connection | null>;
  updateConnection: (id: string, data: UpdateConnectionRequest) => Promise<Connection | null>;
  deleteConnection: (id: string) => Promise<boolean>;
}

export function useConnections(): UseConnectionsResult {
  const { currentTenant } = useTenant();
  
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Check if we're in mock/demo mode (no real backend)
  const isMockMode = import.meta.env.VITE_MOCK_AUTH === 'true' || 
                     import.meta.env.VITE_DEMO_MODE === 'true' ||
                     import.meta.env.DEV;

  const loadConnections = useCallback(async () => {
    // Skip API call in mock/demo mode - no real backend available
    if (isMockMode) {
      setConnections([]);
      setIsLoading(false);
      return;
    }
    
    if (!currentTenant) {
      setConnections([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await connectionsApi.list();
      setConnections(response.data);
    } catch (err) {
      // Silently handle 404 errors (API not available in dev/demo mode)
      // Only set error for other failures
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (!errorMessage.includes('404') && !errorMessage.includes('Not Found')) {
        setError(err instanceof Error ? err : new Error('Failed to fetch connections'));
      }
      // Return empty connections on error
      setConnections([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant, isMockMode]);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  const createConnection = useCallback(async (data: CreateConnectionRequest): Promise<Connection | null> => {
    try {
      const response = await connectionsApi.create(data);
      await loadConnections();
      return response.data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create connection'));
      return null;
    }
  }, [loadConnections]);

  const updateConnection = useCallback(async (id: string, data: UpdateConnectionRequest): Promise<Connection | null> => {
    try {
      const response = await connectionsApi.update(id, data);
      await loadConnections();
      return response.data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update connection'));
      return null;
    }
  }, [loadConnections]);

  const deleteConnection = useCallback(async (id: string): Promise<boolean> => {
    try {
      await connectionsApi.delete(id);
      await loadConnections();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete connection'));
      return false;
    }
  }, [loadConnections]);

  return {
    connections,
    isLoading,
    error,
    refresh: loadConnections,
    createConnection,
    updateConnection,
    deleteConnection,
  };
}

// ============================================================================
// USE CONNECTION SYNC
// ============================================================================

interface UseConnectionSyncResult {
  sync: (id: string) => Promise<SyncResult | null>;
  test: (id: string) => Promise<boolean>;
  isSyncing: boolean;
  isTesting: boolean;
  error: Error | null;
}

export function useConnectionSync(): UseConnectionSyncResult {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sync = useCallback(async (id: string): Promise<SyncResult | null> => {
    setIsSyncing(true);
    setError(null);

    try {
      const response = await connectionsApi.sync(id);
      return response.data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Sync failed'));
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const test = useCallback(async (id: string): Promise<boolean> => {
    setIsTesting(true);
    setError(null);

    try {
      const response = await connectionsApi.test(id);
      return response.data.success;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Connection test failed'));
      return false;
    } finally {
      setIsTesting(false);
    }
  }, []);

  return {
    sync,
    test,
    isSyncing,
    isTesting,
    error,
  };
}

export default useConnections;
