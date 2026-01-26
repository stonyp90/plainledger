/**
 * Connections Feature - Types
 * 
 * Type definitions for data source connections.
 */

// ============================================================================
// CONNECTION TYPES
// ============================================================================

export type ConnectionProvider = 
  | 'quickbooks'
  | 'xero'
  | 'sage'
  | 'freshbooks'
  | 'wave'
  | 'csv_import'
  | 'api';

export type ConnectionStatus = 
  | 'active'
  | 'inactive'
  | 'error'
  | 'syncing'
  | 'pending';

// ============================================================================
// CONNECTION ENTITY
// ============================================================================

export interface Connection {
  id: string;
  provider: ConnectionProvider;
  name: string;
  status: ConnectionStatus;
  lastSync: string | null;
  nextSync: string | null;
  syncFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'manual';
  accountsLinked: number;
  errorMessage?: string;
  credentials?: Record<string, unknown>;
  settings?: ConnectionSettings;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectionSettings {
  autoSync: boolean;
  syncAccounts: boolean;
  syncTransactions: boolean;
  syncInvoices: boolean;
  syncBills: boolean;
  syncPayments: boolean;
  historicalDepth?: number; // months
}

// ============================================================================
// CONNECTION OPERATIONS
// ============================================================================

export interface CreateConnectionRequest {
  provider: ConnectionProvider;
  name: string;
  credentials: Record<string, unknown>;
  settings?: Partial<ConnectionSettings>;
}

export interface UpdateConnectionRequest {
  name?: string;
  settings?: Partial<ConnectionSettings>;
  credentials?: Record<string, unknown>;
}

export interface ConnectionTestResult {
  success: boolean;
  message?: string;
  accountsFound?: number;
}

export interface SyncResult {
  success: boolean;
  syncedAt: string;
  recordsProcessed: {
    accounts: number;
    transactions: number;
    invoices: number;
    bills: number;
  };
  errors?: string[];
}

// ============================================================================
// PROVIDER INFO
// ============================================================================

export interface ProviderInfo {
  id: ConnectionProvider;
  name: string;
  logo: string;
  description: string;
  features: string[];
  authType: 'oauth' | 'api_key' | 'credentials';
  setupUrl?: string;
}

export const PROVIDERS: ProviderInfo[] = [
  {
    id: 'quickbooks',
    name: 'QuickBooks Online',
    logo: '/logos/quickbooks.svg',
    description: 'Connect to QuickBooks Online for automatic sync',
    features: ['Real-time sync', 'Full chart of accounts', 'Transactions'],
    authType: 'oauth',
  },
  {
    id: 'xero',
    name: 'Xero',
    logo: '/logos/xero.svg',
    description: 'Connect to Xero accounting software',
    features: ['Real-time sync', 'Multi-currency', 'Bank feeds'],
    authType: 'oauth',
  },
  {
    id: 'sage',
    name: 'Sage',
    logo: '/logos/sage.svg',
    description: 'Connect to Sage Business Cloud',
    features: ['Batch sync', 'Chart of accounts', 'Reports'],
    authType: 'oauth',
  },
  {
    id: 'freshbooks',
    name: 'FreshBooks',
    logo: '/logos/freshbooks.svg',
    description: 'Connect to FreshBooks cloud accounting',
    features: ['Invoices', 'Expenses', 'Time tracking'],
    authType: 'oauth',
  },
  {
    id: 'csv_import',
    name: 'CSV Import',
    logo: '/logos/csv.svg',
    description: 'Import data from CSV files',
    features: ['Manual import', 'Custom mapping', 'Bulk upload'],
    authType: 'credentials',
  },
];
