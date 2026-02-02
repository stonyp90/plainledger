/**
 * Port (Interface) for Datalake Data Service
 * Defines the contract for fetching data from the Gold layer
 */

import {
  DimAccount,
  DimContact,
  FactTransaction,
  FactAccountBalance,
  DashboardData,
  DataCompleteness,
  TrialBalanceData,
  WaterfallItem,
  AgingData,
} from "@infrastructure/services/datalake-data.service";

export { DataCompleteness, TrialBalanceData, WaterfallItem, AgingData };

export interface IDatalakeDataService {
  /**
   * Get dashboard data for an organization
   * @param organizationId - The organization ID
   * @param asOfDate - Optional date to get data as of
   * @param industryId - Optional industry ID to calculate industry-specific KPIs
   */
  getDashboardData(
    organizationId: string,
    asOfDate?: Date,
    industryId?: string,
  ): Promise<DashboardData>;

  /**
   * Get accounts for an organization
   */
  getAccounts(organizationId: string): Promise<DimAccount[]>;

  /**
   * Get contacts for an organization
   */
  getContacts(organizationId: string): Promise<DimContact[]>;

  /**
   * Get transactions for an organization
   */
  getTransactions(
    organizationId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<FactTransaction[]>;

  /**
   * Get account balances for an organization
   */
  getAccountBalances(
    organizationId: string,
    asOfDate?: Date,
  ): Promise<FactAccountBalance[]>;

  /**
   * Calculate Trial Balance from transactions
   */
  calculateTrialBalance(
    accounts: DimAccount[],
    transactions: FactTransaction[],
  ): TrialBalanceData;

  /**
   * Calculate Cash Flow Waterfall from transactions
   */
  calculateCashFlowWaterfall(
    accounts: DimAccount[],
    transactions: FactTransaction[],
    startDate?: string,
    endDate?: string,
  ): WaterfallItem[];

  /**
   * Calculate AR Aging from invoices/transactions
   * Uses real invoice data with due dates if available
   */
  calculateARaging(
    _accounts: DimAccount[],
    transactions: FactTransaction[],
    _contacts: DimContact[],
    invoices?: unknown[], // FactInvoice[]
  ): AgingData;

  /**
   * Calculate AP Aging from bills/transactions
   * Uses real bill data with due dates if available
   */
  calculateAPaging(
    _accounts: DimAccount[],
    transactions: FactTransaction[],
    _contacts: DimContact[],
    bills?: unknown[], // FactBill[]
  ): AgingData;

  /**
   * Check if datalake connection is healthy
   * Used for health checks and debugging connectivity issues
   */
  healthCheck(): Promise<{
    healthy: boolean;
    bucket: string;
    error?: string;
  }>;
}
