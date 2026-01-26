/**
 * PlainLedger Connection Data Models
 * 
 * This module defines the data structures for accounting system connections.
 * It supports multiple authentication methods and provider-specific configurations.
 * 
 * SECURITY NOTICE:
 * ================================
 * - Credentials are NEVER stored or transmitted in plain text
 * - OAuth tokens are stored server-side with AES-256-GCM encryption
 * - API keys are stored in a secure vault (AWS Secrets Manager / HashiCorp Vault)
 * - The frontend only receives masked credential identifiers (last 4 characters)
 * - All credential access is logged for audit purposes
 * - Credentials are automatically rotated based on provider policies
 * 
 * For managing secrets, use the SecretsManagement component (admin only).
 */

import { maskSecret } from './secrets';

// =====================================================
// CONNECTION TYPES
// =====================================================

export type AuthMethod = 'oauth2' | 'apiKey' | 'basicAuth' | 'upload' | 'demo';
export type ConnectionStatus = 'active' | 'pending' | 'error' | 'expired' | 'revoked' | 'syncing';
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

/**
 * OAuth Credentials - Server-side only
 * SECURITY: These credentials are NEVER sent to the frontend.
 * The frontend only receives a masked identifier for display purposes.
 */
export interface OAuthCredentials {
  // MASKED - actual tokens stored server-side only
  accessTokenMasked: string; // e.g., "••••••••••••ab12"
  refreshTokenMasked?: string;
  tokenType: 'Bearer';
  expiresAt: string;
  scope: string[];
  realmId?: string; // QuickBooks specific
  tenantId?: string; // Xero specific
  // Server-side reference ID (not the actual token)
  secretId: string; // References secure vault storage
}

/**
 * API Key Credentials - Server-side only
 * SECURITY: These credentials are NEVER sent to the frontend.
 * The frontend only receives masked values for display purposes.
 */
export interface ApiKeyCredentials {
  // MASKED - actual values stored server-side only
  clientIdMasked?: string; // e.g., "sb-••••••••5678"
  clientSecretMasked?: string; // e.g., "••••••••••••abcd"
  apiKeyMasked?: string; // e.g., "••••••••••••7890"
  apiTokenMasked?: string;
  companyId?: string;
  businessId?: string;
  environment: 'sandbox' | 'production';
  // Server-side reference IDs (not the actual values)
  secretIds: {
    clientSecret?: string;
    apiKey?: string;
    apiToken?: string;
  };
}

export interface ConnectionMetadata {
  companyName: string;
  companyId: string;
  fiscalYearEnd: string; // MM-DD format
  currency: string;
  timezone: string;
  accountingMethod: 'accrual' | 'cash';
  industry?: string;
  country: string;
}

export interface SyncConfiguration {
  enabled: boolean;
  frequency: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'manual';
  lastSyncAt?: string;
  nextSyncAt?: string;
  syncWindow: {
    startDate?: string; // How far back to sync
    endDate?: string;
  };
  entities: {
    accounts: boolean;
    transactions: boolean;
    invoices: boolean;
    bills: boolean;
    contacts: boolean;
    items: boolean;
    journalEntries: boolean;
    bankTransactions: boolean;
  };
}

export interface SyncHistory {
  id: string;
  startedAt: string;
  completedAt?: string;
  status: SyncStatus;
  recordsProcessed: number;
  recordsFailed: number;
  errorMessage?: string;
  triggeredBy: 'system' | 'user' | 'webhook';
}

export interface DataSourceConnection {
  id: string;
  organizationId: string;
  providerId: string;
  providerName: string;
  
  // Authentication
  authMethod: AuthMethod;
  credentials: OAuthCredentials | ApiKeyCredentials | null;
  isDemo: boolean;
  
  // Status
  status: ConnectionStatus;
  statusMessage?: string;
  lastVerifiedAt?: string;
  
  // Metadata from provider
  metadata?: ConnectionMetadata;
  
  // Sync configuration
  syncConfig: SyncConfiguration;
  syncHistory: SyncHistory[];
  
  // Stats
  stats: {
    accountsCount: number;
    transactionsCount: number;
    lastTransactionDate?: string;
    oldestTransactionDate?: string;
    dataSize: number; // in bytes
  };
  
  // Audit
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  connectedAt?: string;
  disconnectedAt?: string;
}

// =====================================================
// PROVIDER CONFIGURATIONS
// =====================================================

export interface ProviderConfig {
  id: string;
  name: string;
  description: string;
  descriptionFr: string;
  
  // Authentication
  authMethod: AuthMethod;
  oauthConfig?: {
    authorizationUrl: string;
    tokenUrl: string;
    scopes: string[];
    revokeUrl?: string;
  };
  apiKeyConfig?: {
    requiredFields: {
      key: string;
      label: string;
      labelFr: string;
      placeholder: string;
      type: 'text' | 'password';
      helpUrl?: string;
    }[];
  };
  
  // Capabilities
  capabilities: {
    realTimeSync: boolean;
    webhooks: boolean;
    multiCurrency: boolean;
    multiCompany: boolean;
    bankFeeds: boolean;
    attachments: boolean;
    tracking: boolean;
  };
  
  // Supported entities
  supportedEntities: string[];
  
  // Rate limits
  rateLimits?: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  
  // Branding
  color: string;
  logoUrl?: string;
}

export const providerConfigs: Record<string, ProviderConfig> = {
  quickbooks: {
    id: 'quickbooks',
    name: 'QuickBooks Online',
    description: 'Intuit QuickBooks accounting software',
    descriptionFr: 'Logiciel comptable Intuit QuickBooks',
    authMethod: 'oauth2',
    oauthConfig: {
      authorizationUrl: 'https://appcenter.intuit.com/connect/oauth2',
      tokenUrl: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
      scopes: ['com.intuit.quickbooks.accounting'],
      revokeUrl: 'https://developer.api.intuit.com/v2/oauth2/tokens/revoke',
    },
    capabilities: {
      realTimeSync: true,
      webhooks: true,
      multiCurrency: true,
      multiCompany: false,
      bankFeeds: true,
      attachments: true,
      tracking: true,
    },
    supportedEntities: [
      'Account', 'Bill', 'BillPayment', 'Budget', 'Class', 'Customer',
      'Department', 'Deposit', 'Employee', 'Estimate', 'Invoice',
      'Item', 'JournalEntry', 'Payment', 'Purchase', 'PurchaseOrder',
      'RefundReceipt', 'SalesReceipt', 'TaxRate', 'Term', 'TimeActivity',
      'Transfer', 'Vendor', 'VendorCredit'
    ],
    rateLimits: {
      requestsPerMinute: 500,
      requestsPerDay: 10000,
    },
    color: '#2CA01C',
  },
  xero: {
    id: 'xero',
    name: 'Xero',
    description: 'Cloud-based accounting platform',
    descriptionFr: 'Plateforme comptable infonuagique',
    authMethod: 'oauth2',
    oauthConfig: {
      authorizationUrl: 'https://login.xero.com/identity/connect/authorize',
      tokenUrl: 'https://identity.xero.com/connect/token',
      scopes: [
        'openid', 'profile', 'email',
        'accounting.transactions.read',
        'accounting.contacts.read',
        'accounting.settings.read',
        'accounting.reports.read',
        'accounting.journals.read',
        'accounting.attachments.read'
      ],
      revokeUrl: 'https://identity.xero.com/connect/revocation',
    },
    capabilities: {
      realTimeSync: true,
      webhooks: true,
      multiCurrency: true,
      multiCompany: true,
      bankFeeds: true,
      attachments: true,
      tracking: true,
    },
    supportedEntities: [
      'Account', 'BankTransaction', 'BankTransfer', 'BatchPayment',
      'BrandingTheme', 'Contact', 'ContactGroup', 'CreditNote',
      'Currency', 'Employee', 'ExpenseClaim', 'Invoice', 'Item',
      'Journal', 'LinkedTransaction', 'ManualJournal', 'Organisation',
      'Overpayment', 'Payment', 'Prepayment', 'PurchaseOrder',
      'Quote', 'Receipt', 'RepeatingInvoice', 'TaxRate', 'TrackingCategory'
    ],
    rateLimits: {
      requestsPerMinute: 60,
      requestsPerDay: 5000,
    },
    color: '#13B5EA',
  },
  sage: {
    id: 'sage',
    name: 'Sage',
    description: 'Sage Business Cloud Accounting',
    descriptionFr: 'Comptabilité Sage Business Cloud',
    authMethod: 'apiKey',
    apiKeyConfig: {
      requiredFields: [
        { 
          key: 'clientId', 
          label: 'Client ID', 
          labelFr: 'ID Client', 
          placeholder: 'sb-xxxxx-xxxxx', 
          type: 'text',
          helpUrl: 'https://developer.sage.com/accounting/guides/get_started/'
        },
        { 
          key: 'clientSecret', 
          label: 'Client Secret', 
          labelFr: 'Secret Client', 
          placeholder: '••••••••••••••••', 
          type: 'password' 
        },
        { 
          key: 'companyId', 
          label: 'Company ID', 
          labelFr: 'ID Entreprise', 
          placeholder: '12345678', 
          type: 'text' 
        },
      ],
    },
    capabilities: {
      realTimeSync: false,
      webhooks: true,
      multiCurrency: true,
      multiCompany: false,
      bankFeeds: true,
      attachments: true,
      tracking: false,
    },
    supportedEntities: [
      'Contact', 'ContactPayment', 'LedgerAccount', 'SalesInvoice',
      'SalesCreditNote', 'SalesQuote', 'PurchaseInvoice', 'PurchaseCreditNote',
      'JournalEntry', 'BankAccount', 'BankTransaction', 'Product', 'Service',
      'TaxRate', 'Country', 'Currency'
    ],
    rateLimits: {
      requestsPerMinute: 300,
      requestsPerDay: 30000,
    },
    color: '#00D639',
  },
  freshbooks: {
    id: 'freshbooks',
    name: 'FreshBooks',
    description: 'Invoice and accounting software',
    descriptionFr: 'Logiciel de facturation et comptabilité',
    authMethod: 'oauth2',
    oauthConfig: {
      authorizationUrl: 'https://auth.freshbooks.com/oauth/authorize',
      tokenUrl: 'https://api.freshbooks.com/auth/oauth/token',
      scopes: ['user:profile:read', 'user:clients:read', 'user:invoices:read', 
               'user:expenses:read', 'user:payments:read', 'user:estimates:read',
               'user:projects:read', 'user:time_entries:read', 'user:taxes:read',
               'user:reports:read', 'user:bill_vendors:read', 'user:bills:read'],
    },
    capabilities: {
      realTimeSync: false,
      webhooks: true,
      multiCurrency: true,
      multiCompany: true,
      bankFeeds: false,
      attachments: true,
      tracking: true,
    },
    supportedEntities: [
      'Client', 'Invoice', 'Expense', 'Payment', 'Estimate', 'Project',
      'TimeEntry', 'Tax', 'Item', 'Task', 'Retainer', 'CreditNote',
      'BillVendor', 'Bill', 'BillPayment'
    ],
    rateLimits: {
      requestsPerMinute: 100,
      requestsPerDay: 10000,
    },
    color: '#0075DD',
  },
  wave: {
    id: 'wave',
    name: 'Wave',
    description: 'Free accounting software',
    descriptionFr: 'Logiciel comptable gratuit',
    authMethod: 'apiKey',
    apiKeyConfig: {
      requiredFields: [
        { 
          key: 'apiToken', 
          label: 'Full Access Token', 
          labelFr: 'Jeton d\'accès complet', 
          placeholder: 'wv_xxxxxxxxxxxxxxxxxxxx', 
          type: 'password',
          helpUrl: 'https://developer.waveapps.com/hc/en-us/articles/360019493652'
        },
        { 
          key: 'businessId', 
          label: 'Business ID', 
          labelFr: 'ID Entreprise', 
          placeholder: 'QnVzaW5lc3M6...', 
          type: 'text' 
        },
      ],
    },
    capabilities: {
      realTimeSync: false,
      webhooks: false,
      multiCurrency: true,
      multiCompany: true,
      bankFeeds: false,
      attachments: false,
      tracking: false,
    },
    supportedEntities: [
      'Business', 'Account', 'Customer', 'Invoice', 'Product',
      'SalesTax', 'Transaction', 'Vendor', 'Bill', 'User'
    ],
    rateLimits: {
      requestsPerMinute: 100,
      requestsPerDay: 1000,
    },
    color: '#003366',
  },
  csv: {
    id: 'csv',
    name: 'CSV Import',
    description: 'Import data from CSV files',
    descriptionFr: 'Importez vos données depuis des fichiers CSV',
    authMethod: 'upload',
    capabilities: {
      realTimeSync: false,
      webhooks: false,
      multiCurrency: true,
      multiCompany: false,
      bankFeeds: false,
      attachments: false,
      tracking: false,
    },
    supportedEntities: [
      'Account', 'Transaction', 'JournalEntry', 'Contact', 'Item'
    ],
    color: '#6B7280',
  },
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

export function createDemoConnection(
  organizationId: string, 
  providerId: string,
  userId: string
): DataSourceConnection {
  const provider = providerConfigs[providerId];
  const now = new Date().toISOString();
  
  return {
    id: `demo-${providerId}-${Date.now()}`,
    organizationId,
    providerId,
    providerName: provider?.name || providerId,
    authMethod: 'demo',
    credentials: null,
    isDemo: true,
    status: 'active',
    statusMessage: 'Demo mode - using sample data',
    lastVerifiedAt: now,
    metadata: {
      companyName: 'Demo Corporation',
      companyId: 'demo-company-001',
      fiscalYearEnd: '12-31',
      currency: 'CAD',
      timezone: 'America/Toronto',
      accountingMethod: 'accrual',
      industry: 'Technology',
      country: 'CA',
    },
    syncConfig: {
      enabled: true,
      frequency: 'manual',
      lastSyncAt: now,
      entities: {
        accounts: true,
        transactions: true,
        invoices: true,
        bills: true,
        contacts: true,
        items: true,
        journalEntries: true,
        bankTransactions: true,
      },
    },
    syncHistory: [{
      id: 'sync-demo-001',
      startedAt: now,
      completedAt: now,
      status: 'success',
      recordsProcessed: 1500,
      recordsFailed: 0,
      triggeredBy: 'user',
    }],
    stats: {
      accountsCount: 45,
      transactionsCount: 1847,
      lastTransactionDate: now,
      oldestTransactionDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      dataSize: 2500000, // ~2.5 MB
    },
    createdAt: now,
    createdBy: userId,
    updatedAt: now,
    connectedAt: now,
  };
}

export function getConnectionStatusLabel(status: ConnectionStatus, isEn: boolean): string {
  const labels: Record<ConnectionStatus, { en: string; fr: string }> = {
    active: { en: 'Active', fr: 'Actif' },
    pending: { en: 'Pending', fr: 'En attente' },
    error: { en: 'Error', fr: 'Erreur' },
    expired: { en: 'Expired', fr: 'Expiré' },
    revoked: { en: 'Revoked', fr: 'Révoqué' },
    syncing: { en: 'Syncing', fr: 'Synchronisation' },
  };
  return labels[status]?.[isEn ? 'en' : 'fr'] || status;
}

export function formatDataSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function isTokenExpired(connection: DataSourceConnection): boolean {
  if (connection.authMethod !== 'oauth2' || !connection.credentials) return false;
  
  const oauthCreds = connection.credentials as OAuthCredentials;
  if (!oauthCreds.expiresAt) return false;
  
  const expiresAt = new Date(oauthCreds.expiresAt);
  const now = new Date();
  // Consider expired if within 5 minutes of expiration
  return expiresAt.getTime() - now.getTime() < 5 * 60 * 1000;
}
