/**
 * Accounts Feature - Hooks
 * 
 * React hooks for account management.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTenant } from '../../../contexts/TenantContext';
import { accountsApi } from '../api';
import type { 
  Account, 
  AccountWithBalance,
  CreateAccountRequest, 
  UpdateAccountRequest,
  Transaction,
  ChartOfAccounts,
} from '../types';

// ============================================================================
// USE ACCOUNTS
// ============================================================================

interface UseAccountsResult {
  accounts: Account[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  createAccount: (data: CreateAccountRequest) => Promise<Account | null>;
  updateAccount: (id: string, data: UpdateAccountRequest) => Promise<Account | null>;
  deleteAccount: (id: string) => Promise<boolean>;
}

export function useAccounts(type?: string): UseAccountsResult {
  const { currentTenant } = useTenant();
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadAccounts = useCallback(async () => {
    if (!currentTenant) {
      setAccounts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await accountsApi.list({ type, active: true });
      setAccounts(response.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch accounts'));
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant, type]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const createAccount = useCallback(async (data: CreateAccountRequest): Promise<Account | null> => {
    try {
      const response = await accountsApi.create(data);
      await loadAccounts();
      return response.data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create account'));
      return null;
    }
  }, [loadAccounts]);

  const updateAccount = useCallback(async (id: string, data: UpdateAccountRequest): Promise<Account | null> => {
    try {
      const response = await accountsApi.update(id, data);
      await loadAccounts();
      return response.data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update account'));
      return null;
    }
  }, [loadAccounts]);

  const deleteAccount = useCallback(async (id: string): Promise<boolean> => {
    try {
      await accountsApi.delete(id);
      await loadAccounts();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete account'));
      return false;
    }
  }, [loadAccounts]);

  return {
    accounts,
    isLoading,
    error,
    refresh: loadAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
  };
}

// ============================================================================
// USE ACCOUNT BALANCES
// ============================================================================

interface UseAccountBalancesResult {
  accounts: AccountWithBalance[];
  isLoading: boolean;
  error: Error | null;
  refresh: (asOf?: string) => Promise<void>;
}

export function useAccountBalances(asOf?: string): UseAccountBalancesResult {
  const { currentTenant } = useTenant();
  
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadBalances = useCallback(async (date?: string) => {
    if (!currentTenant) {
      setAccounts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await accountsApi.getWithBalances(date || asOf);
      setAccounts(response.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch account balances'));
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant, asOf]);

  useEffect(() => {
    loadBalances();
  }, [loadBalances]);

  return {
    accounts,
    isLoading,
    error,
    refresh: loadBalances,
  };
}

// ============================================================================
// USE CHART OF ACCOUNTS
// ============================================================================

interface UseChartOfAccountsResult {
  chartOfAccounts: ChartOfAccounts | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useChartOfAccounts(): UseChartOfAccountsResult {
  const { currentTenant } = useTenant();
  
  const [chartOfAccounts, setChartOfAccounts] = useState<ChartOfAccounts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadChartOfAccounts = useCallback(async () => {
    if (!currentTenant) {
      setChartOfAccounts(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await accountsApi.getChartOfAccounts();
      setChartOfAccounts(response.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch chart of accounts'));
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant]);

  useEffect(() => {
    loadChartOfAccounts();
  }, [loadChartOfAccounts]);

  return {
    chartOfAccounts,
    isLoading,
    error,
    refresh: loadChartOfAccounts,
  };
}

// ============================================================================
// USE ACCOUNT TRANSACTIONS
// ============================================================================

interface UseAccountTransactionsResult {
  transactions: Transaction[];
  isLoading: boolean;
  error: Error | null;
  loadMore: () => Promise<void>;
  hasMore: boolean;
}

export function useAccountTransactions(
  accountId: string,
  options?: { startDate?: string; endDate?: string }
): UseAccountTransactionsResult {
  const { currentTenant } = useTenant();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadTransactions = useCallback(async (pageNum: number = 1) => {
    if (!currentTenant || !accountId) {
      setTransactions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await accountsApi.getTransactions(accountId, {
        ...options,
        page: pageNum,
        limit: 50,
      });
      
      if (pageNum === 1) {
        setTransactions(response.data);
      } else {
        setTransactions(prev => [...prev, ...response.data]);
      }
      
      setHasMore(response.data.length === 50);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch transactions'));
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant, accountId, options]);

  useEffect(() => {
    loadTransactions(1);
  }, [loadTransactions]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    await loadTransactions(page + 1);
  }, [hasMore, isLoading, loadTransactions, page]);

  return {
    transactions,
    isLoading,
    error,
    loadMore,
    hasMore,
  };
}

export default useAccounts;
