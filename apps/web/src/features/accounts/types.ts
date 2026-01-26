/**
 * Accounts Feature - Types
 * 
 * Type definitions for chart of accounts and account management.
 */

// ============================================================================
// ACCOUNT TYPES
// ============================================================================

export type AccountType = 
  | 'asset'
  | 'liability'
  | 'equity'
  | 'revenue'
  | 'expense';

export type AccountSubtype =
  | 'current'
  | 'fixed'
  | 'intangible'
  | 'long_term'
  | 'capital'
  | 'retained'
  | 'operating'
  | 'cogs'
  | 'tax'
  | 'other';

// ============================================================================
// ACCOUNT ENTITY
// ============================================================================

export interface Account {
  id: string;
  code: string;
  name: string;
  nameFr?: string;
  accountType: AccountType;
  accountSubtype?: AccountSubtype;
  parentAccountId?: string;
  isActive: boolean;
  isSystem: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AccountWithBalance extends Account {
  balance: number;
  balanceAsOf: string;
}

// ============================================================================
// ACCOUNT OPERATIONS
// ============================================================================

export interface CreateAccountRequest {
  code: string;
  name: string;
  nameFr?: string;
  accountType: AccountType;
  accountSubtype?: AccountSubtype;
  parentAccountId?: string;
  displayOrder?: number;
}

export interface UpdateAccountRequest {
  name?: string;
  nameFr?: string;
  accountSubtype?: AccountSubtype;
  parentAccountId?: string;
  displayOrder?: number;
  isActive?: boolean;
}

// ============================================================================
// TRANSACTIONS
// ============================================================================

export interface Transaction {
  id: string;
  accountId: string;
  date: string;
  description: string;
  reference?: string;
  debit: number;
  credit: number;
  balance: number;
  source: string;
  createdAt: string;
}

export interface TransactionFilter {
  accountId?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
}

// ============================================================================
// CHART OF ACCOUNTS
// ============================================================================

export interface ChartOfAccountsNode {
  account: Account;
  children: ChartOfAccountsNode[];
  balance?: number;
}

export interface ChartOfAccounts {
  assets: ChartOfAccountsNode[];
  liabilities: ChartOfAccountsNode[];
  equity: ChartOfAccountsNode[];
  revenue: ChartOfAccountsNode[];
  expenses: ChartOfAccountsNode[];
}
