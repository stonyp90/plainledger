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

export const connectionsApi = {
  /**
   * List all connections for the current tenant
   */
  list: () => 
    apiClient.get<Connection[]>('/connections'),

  /**
   * Get a specific connection by ID
   */
  get: (id: string) => 
    apiClient.get<Connection>(`/connections/${id}`),

  /**
   * Create a new connection
   */
  create: (data: CreateConnectionRequest) =>
    apiClient.post<Connection>('/connections', data),

  /**
   * Update an existing connection
   */
  update: (id: string, data: UpdateConnectionRequest) =>
    apiClient.patch<Connection>(`/connections/${id}`, data),

  /**
   * Delete a connection
   */
  delete: (id: string) => 
    apiClient.delete(`/connections/${id}`),

  /**
   * Test connection credentials
   */
  test: (id: string) => 
    apiClient.post<ConnectionTestResult>(`/connections/${id}/test`),

  /**
   * Trigger manual sync
   */
  sync: (id: string) => 
    apiClient.post<SyncResult>(`/connections/${id}/sync`),

  /**
   * Get sync history
   */
  getSyncHistory: (id: string, params?: { page?: number; limit?: number }) =>
    apiClient.get<SyncResult[]>(`/connections/${id}/sync-history`, { params }),

  /**
   * Get OAuth authorization URL for a provider
   */
  getOAuthUrl: (provider: string) =>
    apiClient.get<{ url: string }>(`/connections/oauth/${provider}/authorize`),

  /**
   * Complete OAuth flow
   */
  completeOAuth: (provider: string, code: string, state: string) =>
    apiClient.post<Connection>(`/connections/oauth/${provider}/callback`, { code, state }),
};

export default connectionsApi;
