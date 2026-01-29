/**
 * Connections Feature - API Layer
 * 
 * API calls for managing data source connections.
 */

import { apiClient } from '../../infrastructure/api';
import type { 
  Connection, 
  CreateConnectionRequest, 
  UpdateConnectionRequest,
  ConnectionTestResult,
  SyncResult,
} from './types';

// ============================================================================
// CONNECTIONS API
// ============================================================================

// API base path for datasources/connections
const BASE_PATH = '/api/datasources';

export const connectionsApi = {
  /**
   * List all connections for the current tenant
   */
  list: () => 
    apiClient.get<Connection[]>(BASE_PATH),

  /**
   * Get a specific connection by ID
   */
  get: (id: string) => 
    apiClient.get<Connection>(`${BASE_PATH}/${id}`),

  /**
   * Create a new connection
   */
  create: (data: CreateConnectionRequest) =>
    apiClient.post<Connection>(BASE_PATH, data),

  /**
   * Update an existing connection
   */
  update: (id: string, data: UpdateConnectionRequest) =>
    apiClient.patch<Connection>(`${BASE_PATH}/${id}`, data),

  /**
   * Delete a connection
   */
  delete: (id: string) => 
    apiClient.delete(`${BASE_PATH}/${id}`),

  /**
   * Test connection credentials
   */
  test: (id: string) => 
    apiClient.post<ConnectionTestResult>(`${BASE_PATH}/${id}/test`),

  /**
   * Trigger manual sync
   */
  sync: (id: string) => 
    apiClient.post<SyncResult>(`${BASE_PATH}/${id}/sync`),

  /**
   * Get sync history
   */
  getSyncHistory: (id: string, params?: { page?: number; limit?: number }) =>
    apiClient.get<SyncResult[]>(`${BASE_PATH}/${id}/sync-history`, { params }),

  /**
   * Get OAuth authorization URL for a provider
   */
  getOAuthUrl: (provider: string) =>
    apiClient.get<{ url: string }>(`${BASE_PATH}/${provider}/oauth/url`),

  /**
   * Complete OAuth flow
   */
  completeOAuth: (provider: string, code: string, state: string) =>
    apiClient.post<Connection>(`${BASE_PATH}/${provider}/oauth/callback`, { code, state }),
};

export default connectionsApi;
