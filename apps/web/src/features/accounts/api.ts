/**
 * Accounts Feature - API Layer
 * 
 * API calls for account management.
 */

import { apiClient } from '../../infrastructure/api';
import type { 
  Account, 
  AccountWithBalance,
  CreateAccountRequest, 
  UpdateAccountRequest,
  Transaction,
  ChartOfAccounts,
} from './types';

// ============================================================================
// ACCOUNTS API
// ============================================================================

export const accountsApi = {
  /**
   * List all accounts
   */
  list: (params?: { type?: string; active?: boolean; page?: number }) =>
    apiClient.get<Account[]>('/accounts', { params }),

  /**
   * Get a specific account by ID
   */
  get: (id: string) => 
    apiClient.get<Account>(`/accounts/${id}`),

  /**
   * Create a new account
   */
  create: (data: CreateAccountRequest) =>
    apiClient.post<Account>('/accounts', data),

  /**
   * Update an existing account
   */
  update: (id: string, data: UpdateAccountRequest) =>
    apiClient.patch<Account>(`/accounts/${id}`, data),

  /**
   * Delete an account (soft delete)
   */
  delete: (id: string) => 
    apiClient.delete(`/accounts/${id}`),

  /**
   * Get account balance as of a specific date
   */
  getBalance: (id: string, asOf?: string) =>
    apiClient.get<{ balance: number; asOf: string }>(
      `/accounts/${id}/balance`, 
      { params: { asOf } }
    ),

  /**
   * Get account transactions
   */
  getTransactions: (id: string, params?: { startDate?: string; endDate?: string; page?: number; limit?: number }) =>
    apiClient.get<Transaction[]>(`/accounts/${id}/transactions`, { params }),

  /**
   * Get full chart of accounts with hierarchy
   */
  getChartOfAccounts: () =>
    apiClient.get<ChartOfAccounts>('/accounts/chart'),

  /**
   * Get accounts with balances
   */
  getWithBalances: (asOf?: string) =>
    apiClient.get<AccountWithBalance[]>('/accounts/balances', { params: { asOf } }),

  /**
   * Import accounts from file
   */
  import: (file: File) =>
    apiClient.upload<{ imported: number; errors: string[] }>('/accounts/import', file),

  /**
   * Export accounts to CSV
   */
  export: () =>
    apiClient.get<{ url: string }>('/accounts/export'),
};

export default accountsApi;
