/**
 * PlainLedger Data Sync Service
 * 
 * Handles synchronization of data from third-party accounting applications
 * to our data lake with eventual consistency model.
 * 
 * Architecture:
 * - Webhook-first for real-time updates
 * - Smart batching to respect API limits
 * - Change Data Capture (CDC) for incremental syncs
 * - Pre-computed aggregations for dashboard performance
 */

import { DataSourceConnection, providerConfigs } from './connectionModels';

// =====================================================
// TYPES
// =====================================================

export type SyncFrequency = 'realtime' | 'hourly' | 'daily' | 'weekly' | 'manual';
export type SyncPriority = 'critical' | 'high' | 'normal' | 'low';
export type EntityType = 
  | 'account' 
  | 'transaction' 
  | 'invoice' 
  | 'bill' 
  | 'payment'
  | 'contact'
  | 'item'
  | 'journalEntry'
  | 'bankTransaction'
  | 'budget';

export interface SyncStrategy {
  entity: EntityType;
  frequency: SyncFrequency;
  priority: SyncPriority;
  maxStalenessMinutes: number;
  batchSize: number;
  webhookSupported: boolean;
}

export interface SyncJob {
  id: string;
  connectionId: string;
  organizationId: string;
  provider: string;
  entity: EntityType;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt?: string;
  completedAt?: string;
  recordsProcessed: number;
  recordsFailed: number;
  lastProcessedId?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface SyncStats {
  lastSyncAt: string;
  nextScheduledSync: string;
  recordsInSync: number;
  pendingChanges: number;
  staleness: 'fresh' | 'acceptable' | 'stale' | 'critical';
  stalenessMinutes: number;
  health: 'healthy' | 'degraded' | 'unhealthy';
  quotaUsed: number;
  quotaLimit: number;
}

export interface ProviderApiQuota {
  requestsPerMinute: number;
  requestsPerDay: number;
  usedToday: number;
  usedThisMinute: number;
  resetAt: string;
}

// Standard schema for unified data model
export interface StandardAccount {
  id: string;
  externalId: string;
  provider: string;
  organizationId: string;
  code: string;
  name: string;
  nameEn?: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  subType?: string;
  currency: string;
  currentBalance: number;
  openingBalance: number;
  isActive: boolean;
  isBankAccount: boolean;
  taxCode?: string;
  parentAccountId?: string;
  createdAt: string;
  updatedAt: string;
  syncedAt: string;
}

export interface StandardTransaction {
  id: string;
  externalId: string;
  provider: string;
  organizationId: string;
  date: string;
  type: 'invoice' | 'bill' | 'payment' | 'transfer' | 'journal' | 'expense' | 'deposit';
  reference: string;
  description: string;
  amount: number;
  currency: string;
  exchangeRate?: number;
  lines: TransactionLine[];
  status: 'draft' | 'pending' | 'posted' | 'void' | 'paid';
  contactId?: string;
  contactName?: string;
  dueDate?: string;
  paidDate?: string;
  linkedTransactionIds?: string[];
  attachmentCount: number;
  createdAt: string;
  updatedAt: string;
  syncedAt: string;
}

export interface TransactionLine {
  id: string;
  accountId: string;
  accountCode?: string;
  accountName?: string;
  description: string;
  debit: number;
  credit: number;
  taxCode?: string;
  taxAmount?: number;
  trackingCategories?: { id: string; name: string }[];
}

// =====================================================
// SYNC STRATEGIES
// =====================================================

/**
 * Define sync strategies per entity type
 * Optimized for cost and freshness balance
 */
export const SYNC_STRATEGIES: SyncStrategy[] = [
  // Critical: Near real-time for high-value data
  {
    entity: 'bankTransaction',
    frequency: 'hourly',
    priority: 'critical',
    maxStalenessMinutes: 60,
    batchSize: 100,
    webhookSupported: true,
  },
  {
    entity: 'invoice',
    frequency: 'hourly',
    priority: 'critical',
    maxStalenessMinutes: 60,
    batchSize: 100,
    webhookSupported: true,
  },
  {
    entity: 'bill',
    frequency: 'hourly',
    priority: 'critical',
    maxStalenessMinutes: 60,
    batchSize: 100,
    webhookSupported: true,
  },
  {
    entity: 'payment',
    frequency: 'hourly',
    priority: 'critical',
    maxStalenessMinutes: 60,
    batchSize: 100,
    webhookSupported: true,
  },
  
  // High: Daily for balance-affecting data
  {
    entity: 'account',
    frequency: 'daily',
    priority: 'high',
    maxStalenessMinutes: 1440,
    batchSize: 500,
    webhookSupported: true,
  },
  {
    entity: 'journalEntry',
    frequency: 'daily',
    priority: 'high',
    maxStalenessMinutes: 1440,
    batchSize: 100,
    webhookSupported: true,
  },
  {
    entity: 'transaction',
    frequency: 'daily',
    priority: 'high',
    maxStalenessMinutes: 1440,
    batchSize: 200,
    webhookSupported: false,
  },
  
  // Normal: Weekly for reference data
  {
    entity: 'contact',
    frequency: 'weekly',
    priority: 'normal',
    maxStalenessMinutes: 10080,
    batchSize: 500,
    webhookSupported: true,
  },
  {
    entity: 'item',
    frequency: 'weekly',
    priority: 'normal',
    maxStalenessMinutes: 10080,
    batchSize: 500,
    webhookSupported: true,
  },
  
  // Low: Monthly or on-demand
  {
    entity: 'budget',
    frequency: 'weekly',
    priority: 'low',
    maxStalenessMinutes: 43200,
    batchSize: 50,
    webhookSupported: false,
  },
];

// =====================================================
// API CLIENT FACTORY
// =====================================================

interface ApiClient {
  getAccounts(lastSync?: string): Promise<unknown[]>;
  getTransactions(lastSync?: string, page?: number): Promise<unknown[]>;
  getInvoices(lastSync?: string, page?: number): Promise<unknown[]>;
  getBills(lastSync?: string, page?: number): Promise<unknown[]>;
  getBankTransactions(lastSync?: string): Promise<unknown[]>;
  getJournalEntries(lastSync?: string): Promise<unknown[]>;
  getContacts(lastSync?: string): Promise<unknown[]>;
  getBudgets(): Promise<unknown[]>;
  getRateLimits(): ProviderApiQuota;
}

/**
 * Create API client for a specific provider
 * In production, these would be real API integrations
 */
export function createApiClient(connection: DataSourceConnection): ApiClient {
  const provider = connection.providerId;
  
  // Mock implementation - in production, return actual API clients
  const mockClient: ApiClient = {
    async getAccounts(lastSync) {
      console.log(`[${provider}] Fetching accounts since ${lastSync || 'beginning'}`);
      return [];
    },
    async getTransactions(lastSync, page = 1) {
      console.log(`[${provider}] Fetching transactions page ${page} since ${lastSync || 'beginning'}`);
      return [];
    },
    async getInvoices(lastSync, page = 1) {
      console.log(`[${provider}] Fetching invoices page ${page} since ${lastSync || 'beginning'}`);
      return [];
    },
    async getBills(lastSync, page = 1) {
      console.log(`[${provider}] Fetching bills page ${page} since ${lastSync || 'beginning'}`);
      return [];
    },
    async getBankTransactions(lastSync) {
      console.log(`[${provider}] Fetching bank transactions since ${lastSync || 'beginning'}`);
      return [];
    },
    async getJournalEntries(lastSync) {
      console.log(`[${provider}] Fetching journal entries since ${lastSync || 'beginning'}`);
      return [];
    },
    async getContacts(lastSync) {
      console.log(`[${provider}] Fetching contacts since ${lastSync || 'beginning'}`);
      return [];
    },
    async getBudgets() {
      console.log(`[${provider}] Fetching budgets`);
      return [];
    },
    getRateLimits() {
      const config = providerConfigs[provider];
      return {
        requestsPerMinute: config?.rateLimits?.requestsPerMinute || 100,
        requestsPerDay: config?.rateLimits?.requestsPerDay || 10000,
        usedToday: 0,
        usedThisMinute: 0,
        resetAt: new Date(Date.now() + 60000).toISOString(),
      };
    },
  };
  
  return mockClient;
}

// =====================================================
// DATA TRANSFORMERS
// =====================================================

/**
 * Transform provider-specific account to standard schema
 */
export function transformAccount(
  provider: string,
  rawAccount: Record<string, unknown>,
  organizationId: string
): StandardAccount {
  const now = new Date().toISOString();
  
  switch (provider) {
    case 'quickbooks':
      return {
        id: `${organizationId}_${rawAccount.Id}`,
        externalId: String(rawAccount.Id),
        provider,
        organizationId,
        code: String(rawAccount.AcctNum || ''),
        name: String(rawAccount.Name),
        type: mapAccountType(provider, String(rawAccount.AccountType)),
        subType: String(rawAccount.AccountSubType || ''),
        currency: String((rawAccount.CurrencyRef as Record<string, unknown>)?.value || 'CAD'),
        currentBalance: Number(rawAccount.CurrentBalance || 0),
        openingBalance: Number(rawAccount.OpeningBalance || 0),
        isActive: Boolean(rawAccount.Active),
        isBankAccount: rawAccount.AccountType === 'Bank',
        taxCode: String((rawAccount.TaxCodeRef as Record<string, unknown>)?.value || ''),
        parentAccountId: rawAccount.ParentRef 
          ? `${organizationId}_${(rawAccount.ParentRef as Record<string, unknown>).value}`
          : undefined,
        createdAt: String((rawAccount.MetaData as Record<string, unknown>)?.CreateTime || now),
        updatedAt: String((rawAccount.MetaData as Record<string, unknown>)?.LastUpdatedTime || now),
        syncedAt: now,
      };
    
    case 'xero':
      return {
        id: `${organizationId}_${rawAccount.AccountID}`,
        externalId: String(rawAccount.AccountID),
        provider,
        organizationId,
        code: String(rawAccount.Code || ''),
        name: String(rawAccount.Name),
        type: mapAccountType(provider, String(rawAccount.Type)),
        subType: String(rawAccount.Class || ''),
        currency: String(rawAccount.CurrencyCode || 'CAD'),
        currentBalance: Number(rawAccount.Balance || 0),
        openingBalance: 0,
        isActive: rawAccount.Status === 'ACTIVE',
        isBankAccount: rawAccount.Type === 'BANK',
        taxCode: String(rawAccount.TaxType || ''),
        createdAt: String(rawAccount.UpdatedDateUTC || now),
        updatedAt: String(rawAccount.UpdatedDateUTC || now),
        syncedAt: now,
      };
    
    default:
      // Generic transformation
      return {
        id: `${organizationId}_${rawAccount.id || rawAccount.Id}`,
        externalId: String(rawAccount.id || rawAccount.Id),
        provider,
        organizationId,
        code: String(rawAccount.code || rawAccount.Code || ''),
        name: String(rawAccount.name || rawAccount.Name),
        type: 'asset',
        currency: 'CAD',
        currentBalance: Number(rawAccount.balance || rawAccount.Balance || 0),
        openingBalance: 0,
        isActive: true,
        isBankAccount: false,
        createdAt: now,
        updatedAt: now,
        syncedAt: now,
      };
  }
}

/**
 * Map provider account types to standard types
 */
function mapAccountType(
  provider: string, 
  type: string
): 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' {
  const mappings: Record<string, Record<string, 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'>> = {
    quickbooks: {
      'Bank': 'asset',
      'Other Current Asset': 'asset',
      'Fixed Asset': 'asset',
      'Other Asset': 'asset',
      'Accounts Receivable': 'asset',
      'Accounts Payable': 'liability',
      'Credit Card': 'liability',
      'Other Current Liability': 'liability',
      'Long Term Liability': 'liability',
      'Equity': 'equity',
      'Income': 'revenue',
      'Other Income': 'revenue',
      'Expense': 'expense',
      'Other Expense': 'expense',
      'Cost of Goods Sold': 'expense',
    },
    xero: {
      'BANK': 'asset',
      'CURRENT': 'asset',
      'FIXED': 'asset',
      'INVENTORY': 'asset',
      'PREPAYMENT': 'asset',
      'CURRLIAB': 'liability',
      'LIABILITY': 'liability',
      'TERMLIAB': 'liability',
      'EQUITY': 'equity',
      'REVENUE': 'revenue',
      'SALES': 'revenue',
      'OTHERINCOME': 'revenue',
      'DIRECTCOSTS': 'expense',
      'EXPENSE': 'expense',
      'OVERHEADS': 'expense',
    },
  };
  
  return mappings[provider]?.[type] || 'asset';
}

// =====================================================
// SYNC ENGINE
// =====================================================

export class DataSyncEngine {
  private connection: DataSourceConnection;
  private client: ApiClient;
  private jobs: Map<string, SyncJob> = new Map();
  
  constructor(connection: DataSourceConnection) {
    this.connection = connection;
    this.client = createApiClient(connection);
  }
  
  /**
   * Get current sync status for the connection
   */
  getSyncStats(): SyncStats {
    const lastSync = this.connection.syncConfig.lastSyncAt;
    const lastSyncDate = lastSync ? new Date(lastSync) : null;
    const now = new Date();
    
    let stalenessMinutes = 0;
    if (lastSyncDate) {
      stalenessMinutes = Math.floor((now.getTime() - lastSyncDate.getTime()) / 60000);
    }
    
    let staleness: SyncStats['staleness'] = 'fresh';
    if (stalenessMinutes > 1440) staleness = 'critical';
    else if (stalenessMinutes > 360) staleness = 'stale';
    else if (stalenessMinutes > 60) staleness = 'acceptable';
    
    const quota = this.client.getRateLimits();
    
    return {
      lastSyncAt: lastSync || 'Never',
      nextScheduledSync: this.calculateNextSync(),
      recordsInSync: this.connection.stats.transactionsCount,
      pendingChanges: 0, // Would be tracked via webhooks
      staleness,
      stalenessMinutes,
      health: staleness === 'critical' ? 'unhealthy' : staleness === 'stale' ? 'degraded' : 'healthy',
      quotaUsed: quota.usedToday,
      quotaLimit: quota.requestsPerDay,
    };
  }
  
  /**
   * Calculate next scheduled sync based on strategy
   */
  private calculateNextSync(): string {
    const frequency = this.connection.syncConfig.frequency;
    const lastSync = this.connection.syncConfig.lastSyncAt 
      ? new Date(this.connection.syncConfig.lastSyncAt)
      : new Date();
    
    const intervals: Record<string, number> = {
      realtime: 5 * 60 * 1000,     // 5 minutes
      hourly: 60 * 60 * 1000,      // 1 hour
      daily: 24 * 60 * 60 * 1000,  // 1 day
      weekly: 7 * 24 * 60 * 60 * 1000, // 1 week
      manual: Infinity,
    };
    
    const interval = intervals[frequency] || intervals.daily;
    return new Date(lastSync.getTime() + interval).toISOString();
  }
  
  /**
   * Execute incremental sync for all entities
   */
  async executeIncrementalSync(): Promise<SyncJob[]> {
    const jobs: SyncJob[] = [];
    const lastSync = this.connection.syncConfig.lastSyncAt;
    
    console.log(`[DataSync] Starting incremental sync for ${this.connection.providerName}`);
    
    // Sync in priority order
    const sortedStrategies = [...SYNC_STRATEGIES].sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    
    for (const strategy of sortedStrategies) {
      // Check if entity is enabled in sync config
      const entityKey = strategy.entity + 's' as keyof typeof this.connection.syncConfig.entities;
      if (!this.connection.syncConfig.entities[entityKey]) {
        continue;
      }
      
      try {
        const job = await this.syncEntity(strategy.entity, lastSync);
        jobs.push(job);
      } catch (error) {
        console.error(`[DataSync] Error syncing ${strategy.entity}:`, error);
        jobs.push(this.createFailedJob(strategy.entity, error));
      }
    }
    
    return jobs;
  }
  
  /**
   * Sync a single entity type
   */
  private async syncEntity(entity: EntityType, lastSync?: string): Promise<SyncJob> {
    const job: SyncJob = {
      id: `job_${Date.now()}_${entity}`,
      connectionId: this.connection.id,
      organizationId: this.connection.organizationId,
      provider: this.connection.providerId,
      entity,
      status: 'running',
      startedAt: new Date().toISOString(),
      recordsProcessed: 0,
      recordsFailed: 0,
    };
    
    this.jobs.set(job.id, job);
    
    try {
      let records: unknown[] = [];
      
      switch (entity) {
        case 'account':
          records = await this.client.getAccounts(lastSync);
          break;
        case 'transaction':
          records = await this.client.getTransactions(lastSync);
          break;
        case 'invoice':
          records = await this.client.getInvoices(lastSync);
          break;
        case 'bill':
          records = await this.client.getBills(lastSync);
          break;
        case 'bankTransaction':
          records = await this.client.getBankTransactions(lastSync);
          break;
        case 'journalEntry':
          records = await this.client.getJournalEntries(lastSync);
          break;
        case 'contact':
          records = await this.client.getContacts(lastSync);
          break;
        case 'budget':
          records = await this.client.getBudgets();
          break;
      }
      
      // Transform and store records
      for (const record of records) {
        try {
          await this.processRecord(entity, record as Record<string, unknown>);
          job.recordsProcessed++;
        } catch (err) {
          job.recordsFailed++;
          console.error(`[DataSync] Failed to process ${entity} record:`, err);
        }
      }
      
      job.status = 'completed';
      job.completedAt = new Date().toISOString();
      
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.completedAt = new Date().toISOString();
    }
    
    return job;
  }
  
  /**
   * Process and store a single record
   */
  private async processRecord(entity: EntityType, record: Record<string, unknown>): Promise<void> {
    // Transform to standard schema
    let standardRecord: StandardAccount | StandardTransaction;
    
    if (entity === 'account') {
      standardRecord = transformAccount(
        this.connection.providerId,
        record,
        this.connection.organizationId
      );
    } else {
      // Transform transaction-like entities
      standardRecord = this.transformTransaction(record);
    }
    
    // In production, this would:
    // 1. Store in Bronze layer (raw)
    // 2. Upsert in Silver layer (normalized)
    // 3. Invalidate relevant Gold layer caches
    
    console.log(`[DataSync] Processed ${entity}:`, standardRecord.id);
  }
  
  /**
   * Transform transaction-like records to standard schema
   */
  private transformTransaction(record: Record<string, unknown>): StandardTransaction {
    const now = new Date().toISOString();
    
    return {
      id: `${this.connection.organizationId}_${record.Id || record.id}`,
      externalId: String(record.Id || record.id),
      provider: this.connection.providerId,
      organizationId: this.connection.organizationId,
      date: String(record.Date || record.TxnDate || now),
      type: 'invoice',
      reference: String(record.DocNumber || record.Reference || ''),
      description: String(record.PrivateNote || record.Description || ''),
      amount: Number(record.TotalAmt || record.Total || 0),
      currency: 'CAD',
      lines: [],
      status: 'posted',
      attachmentCount: 0,
      createdAt: now,
      updatedAt: now,
      syncedAt: now,
    };
  }
  
  /**
   * Create a failed job record
   */
  private createFailedJob(entity: EntityType, error: unknown): SyncJob {
    return {
      id: `job_${Date.now()}_${entity}`,
      connectionId: this.connection.id,
      organizationId: this.connection.organizationId,
      provider: this.connection.providerId,
      entity,
      status: 'failed',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      recordsProcessed: 0,
      recordsFailed: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
  
  /**
   * Handle incoming webhook event
   */
  async handleWebhook(event: {
    type: string;
    entityType: string;
    entityId: string;
    action: 'create' | 'update' | 'delete';
    payload?: Record<string, unknown>;
  }): Promise<void> {
    console.log(`[DataSync] Webhook received: ${event.action} ${event.entityType} ${event.entityId}`);
    
    // Queue immediate sync for this entity
    if (event.payload) {
      await this.processRecord(event.entityType as EntityType, event.payload);
    }
  }
  
  /**
   * Get all active/recent sync jobs
   */
  getJobs(): SyncJob[] {
    return Array.from(this.jobs.values());
  }
}

// =====================================================
// EXPORTS
// =====================================================

/**
 * Create a sync engine for a connection
 */
export function createSyncEngine(connection: DataSourceConnection): DataSyncEngine {
  return new DataSyncEngine(connection);
}

/**
 * Get sync strategy for an entity
 */
export function getSyncStrategy(entity: EntityType): SyncStrategy | undefined {
  return SYNC_STRATEGIES.find(s => s.entity === entity);
}

/**
 * Check if data is considered stale
 */
export function isDataStale(lastSyncAt: string | undefined, entity: EntityType): boolean {
  if (!lastSyncAt) return true;
  
  const strategy = getSyncStrategy(entity);
  if (!strategy) return false;
  
  const lastSync = new Date(lastSyncAt);
  const now = new Date();
  const minutesSinceSync = (now.getTime() - lastSync.getTime()) / 60000;
  
  return minutesSinceSync > strategy.maxStalenessMinutes;
}

/**
 * Calculate data freshness percentage
 */
export function getDataFreshness(lastSyncAt: string | undefined, entity: EntityType): number {
  if (!lastSyncAt) return 0;
  
  const strategy = getSyncStrategy(entity);
  if (!strategy) return 100;
  
  const lastSync = new Date(lastSyncAt);
  const now = new Date();
  const minutesSinceSync = (now.getTime() - lastSync.getTime()) / 60000;
  
  // 100% fresh at 0 minutes, 0% at 2x max staleness
  const freshness = Math.max(0, 100 - (minutesSinceSync / (strategy.maxStalenessMinutes * 2)) * 100);
  return Math.round(freshness);
}
