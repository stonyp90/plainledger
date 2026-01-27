/**
 * GraphQL React Hooks
 *
 * Custom hooks for GraphQL queries and mutations.
 * Provides type-safe data fetching with loading and error states.
 */
import { useQuery, useMutation, useLazyQuery } from "@apollo/client";
import {
  GET_DASHBOARD_SUMMARY,
  GET_FINANCIAL_TRENDS,
  GET_ACCOUNTS,
  GET_ACCOUNT,
  GET_TRANSACTIONS,
  GET_BALANCE_SHEET,
  GET_INCOME_STATEMENT,
  GET_ORGANIZATION,
  GET_ORGANIZATION_FEATURES,
  GET_DATA_SOURCES,
  GET_AVAILABLE_PROVIDERS,
} from "./queries";
import {
  INITIATE_OAUTH,
  COMPLETE_OAUTH,
  SYNC_DATA_SOURCE,
  DISCONNECT_DATA_SOURCE,
  DELETE_DATA_SOURCE,
} from "./mutations";

// =====================================================
// DASHBOARD HOOKS
// =====================================================

export interface DashboardFilter {
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  period?: string;
  compareWithPrevious?: boolean;
}

export function useDashboardSummary(filter?: DashboardFilter) {
  return useQuery(GET_DASHBOARD_SUMMARY, {
    variables: { filter },
    pollInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
}

export function useFinancialTrends(
  metrics: string[],
  dateRange?: { startDate: Date; endDate: Date },
) {
  return useQuery(GET_FINANCIAL_TRENDS, {
    variables: { metrics, dateRange },
    skip: metrics.length === 0,
  });
}

// =====================================================
// ACCOUNT HOOKS
// =====================================================

export interface AccountFilter {
  types?: string[];
  search?: string;
  isActive?: boolean;
  parentAccountId?: string;
}

export interface PaginationInput {
  page?: number;
  pageSize?: number;
}

export function useAccounts(filter?: AccountFilter, pagination?: PaginationInput) {
  return useQuery(GET_ACCOUNTS, {
    variables: { filter, pagination },
  });
}

export function useAccount(id: string) {
  return useQuery(GET_ACCOUNT, {
    variables: { id },
    skip: !id,
  });
}

export function useLazyAccount() {
  return useLazyQuery(GET_ACCOUNT);
}

// =====================================================
// TRANSACTION HOOKS
// =====================================================

export interface TransactionFilter {
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  types?: string[];
  accountId?: string;
  contactId?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
}

export function useTransactions(
  filter?: TransactionFilter,
  pagination?: PaginationInput,
) {
  return useQuery(GET_TRANSACTIONS, {
    variables: { filter, pagination },
  });
}

// =====================================================
// REPORT HOOKS
// =====================================================

export function useBalanceSheet(asOfDate?: Date) {
  return useQuery(GET_BALANCE_SHEET, {
    variables: { asOfDate: asOfDate?.toISOString() },
  });
}

export function useIncomeStatement(startDate: Date, endDate: Date) {
  return useQuery(GET_INCOME_STATEMENT, {
    variables: {
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    },
    skip: !startDate || !endDate,
  });
}

// =====================================================
// ORGANIZATION HOOKS
// =====================================================

export function useOrganization() {
  return useQuery(GET_ORGANIZATION);
}

export function useOrganizationFeatures() {
  return useQuery(GET_ORGANIZATION_FEATURES);
}

// =====================================================
// DATA SOURCE HOOKS
// =====================================================

export function useDataSources() {
  return useQuery(GET_DATA_SOURCES, {
    pollInterval: 30 * 1000, // Refresh every 30 seconds
  });
}

export function useAvailableProviders() {
  return useQuery(GET_AVAILABLE_PROVIDERS);
}

export function useInitiateOAuth() {
  return useMutation(INITIATE_OAUTH);
}

export function useCompleteOAuth() {
  return useMutation(COMPLETE_OAUTH, {
    refetchQueries: [{ query: GET_DATA_SOURCES }],
  });
}

export function useSyncDataSource() {
  return useMutation(SYNC_DATA_SOURCE, {
    refetchQueries: [{ query: GET_DATA_SOURCES }],
  });
}

export function useDisconnectDataSource() {
  return useMutation(DISCONNECT_DATA_SOURCE, {
    refetchQueries: [{ query: GET_DATA_SOURCES }],
  });
}

export function useDeleteDataSource() {
  return useMutation(DELETE_DATA_SOURCE, {
    refetchQueries: [{ query: GET_DATA_SOURCES }],
  });
}
