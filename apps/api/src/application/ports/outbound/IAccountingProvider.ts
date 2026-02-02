/**
 * Accounting Provider Interface
 *
 * Defines the contract that all accounting providers (QuickBooks, Xero, Sage, etc.)
 * must implement. This enables multi-provider support with a clean architecture.
 */

export interface Account {
  id: string;
  name: string;
  code?: string;
  type: string;
  subtype?: string;
  isActive: boolean;
  parentId?: string;
}

export interface Contact {
  id: string;
  displayName: string;
  companyName?: string;
  email?: string;
  phone?: string;
  isCustomer: boolean;
  isVendor: boolean;
  isActive: boolean;
}

export interface Transaction {
  id: string;
  date: Date;
  amount: number;
  description: string;
  accountId: string;
  contactId?: string;
  referenceNumber?: string;
  memo?: string;
  currencyCode: string;
}

export interface Invoice {
  id: string;
  number: string;
  date: Date;
  dueDate?: Date;
  customerId: string;
  totalAmount: number;
  status: string;
  currencyCode: string;
}

export interface Bill {
  id: string;
  number: string;
  date: Date;
  dueDate?: Date;
  vendorId: string;
  totalAmount: number;
  status: string;
  currencyCode: string;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsSynced: number;
  errors?: string[];
  durationMs: number;
}

export enum ProviderType {
  QUICKBOOKS = "QUICKBOOKS",
  XERO = "XERO",
  SAGE = "SAGE",
  FRESHBOOKS = "FRESHBOOKS",
}

/**
 * Accounting Provider Interface
 * All accounting integrations must implement this interface
 */
export interface IAccountingProvider {
  /**
   * Get the provider type identifier
   */
  getProviderType(): ProviderType;

  /**
   * Get the provider display name
   */
  getProviderName(): string;

  /**
   * Test connection to the provider API
   */
  testConnection(organizationId: string): Promise<boolean>;

  /**
   * Get accounts for an organization
   */
  getAccounts(organizationId: string): Promise<Account[]>;

  /**
   * Get contacts (customers/vendors) for an organization
   */
  getContacts(organizationId: string): Promise<Contact[]>;

  /**
   * Get transactions for an organization within a date range
   */
  getTransactions(
    organizationId: string,
    dateRange: DateRange,
  ): Promise<Transaction[]>;

  /**
   * Get invoices for an organization
   */
  getInvoices(
    organizationId: string,
    dateRange?: DateRange,
  ): Promise<Invoice[]>;

  /**
   * Get bills for an organization
   */
  getBills(organizationId: string, dateRange?: DateRange): Promise<Bill[]>;

  /**
   * Sync all data to the datalake (Bronze layer)
   * This is the main ETL entry point
   */
  syncToDataLake(organizationId: string): Promise<SyncResult>;
}
