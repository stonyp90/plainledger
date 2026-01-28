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
} from "@infrastructure/services/datalake-data.service";

export interface IDatalakeDataService {
  /**
   * Get dashboard data for an organization
   */
  getDashboardData(
    organizationId: string,
    asOfDate?: Date,
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
}
