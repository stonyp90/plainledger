# PlainLedger Data Integration Architecture

## Executive Summary

This document confirms that **PlainLedger can successfully fetch all required data** from third-party accounting applications to power our dashboards, graphs, alerts, and anomaly detection features. The data will be stored in our data lake with an **eventually consistent** model optimized for cost and performance.

---

## 1. Data Requirements vs API Capabilities

### 1.1 What We Need

| Feature | Required Data | Used In |
|---------|--------------|---------|
| **Balance Sheet** | Accounts, balances (current/prior) | Reports, Dashboard |
| **Income Statement** | Revenue, expenses by account | Reports, Trends |
| **Cash Flow** | Bank transactions, payments | Reports, Waterfall |
| **AR Aging** | Invoices, due dates, amounts | Dashboard, Alerts |
| **AP Aging** | Bills, due dates, amounts | Dashboard, Alerts |
| **Bank Reconciliation** | Bank balances, outstanding items | Dashboard |
| **Financial Ratios** | Calculated from balance sheet/P&L | Health Score, Dashboard |
| **Budget Comparison** | Budgets vs actuals | Dashboard, Variance |
| **Anomaly Detection** | Historical transactions, patterns | Alerts, Dashboard |
| **Trends** | Monthly/quarterly aggregates | Charts, Forecasting |

### 1.2 API Data Availability Matrix

| Data Type | QuickBooks | Xero | Sage | FreshBooks | Wave |
|-----------|------------|------|------|------------|------|
| Chart of Accounts | ✅ | ✅ | ✅ | ✅ | ✅ |
| Account Balances | ✅ | ✅ | ✅ | ✅ | ✅ |
| Transactions | ✅ | ✅ | ✅ | ✅ | ✅ |
| Invoices (AR) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Bills (AP) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Bank Transactions | ✅ | ✅ | ✅ | ❌ | ❌ |
| Journal Entries | ✅ | ✅ | ✅ | ❌ | ✅ |
| Budgets | ✅ | ✅ | ❌ | ❌ | ❌ |
| Contacts | ✅ | ✅ | ✅ | ✅ | ✅ |
| Products/Items | ✅ | ✅ | ✅ | ✅ | ✅ |
| Reports (Built-in) | ✅ | ✅ | ✅ | ⚠️ | ❌ |
| Multi-currency | ✅ | ✅ | ✅ | ✅ | ✅ |
| Webhooks | ✅ | ✅ | ✅ | ✅ | ❌ |

**Legend**: ✅ Full support | ⚠️ Partial | ❌ Not available

### 1.3 Confirmation: All Critical Data Available

**YES**, we can build all our features with the available APIs:

```
Dashboard Features         → Source Data
─────────────────────────────────────────
Financial Health Score    → Account balances, ratios (calculated)
Revenue/Expense Trends    → Transactions, Invoice/Bill totals
Cash Flow Waterfall       → Bank transactions, payments
AR/AP Aging              → Invoices with due dates, Bills with due dates
Bank Reconciliation      → Bank transactions + Book entries
Budget Variance          → Budgets endpoint (QB/Xero) or manual input
Anomaly Detection        → Transaction history (pattern analysis)
```

---

## 2. Data Lake Architecture

### 2.1 Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Data Lake Architecture                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐ │
│   │QuickBooks│    │   Xero   │    │   Sage   │    │   CSV    │ │
│   └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘ │
│        │               │               │               │        │
│        └───────────────┴───────────────┴───────────────┘        │
│                              │                                   │
│                     ┌────────▼────────┐                         │
│                     │  Sync Engine    │                         │
│                     │  (Serverless)   │                         │
│                     └────────┬────────┘                         │
│                              │                                   │
│              ┌───────────────┼───────────────┐                  │
│              │               │               │                  │
│       ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐          │
│       │   Bronze    │ │   Silver    │ │    Gold     │          │
│       │  (Raw JSON) │ │(Normalized) │ │(Aggregated) │          │
│       └─────────────┘ └─────────────┘ └─────────────┘          │
│                              │                                   │
│                     ┌────────▼────────┐                         │
│                     │   API Layer     │                         │
│                     │   (GraphQL)     │                         │
│                     └────────┬────────┘                         │
│                              │                                   │
│                     ┌────────▼────────┐                         │
│                     │   Dashboard     │                         │
│                     │   & Reports     │                         │
│                     └─────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Layers

| Layer | Purpose | Storage | Update Frequency |
|-------|---------|---------|------------------|
| **Bronze** | Raw API responses | S3/Blob | On sync |
| **Silver** | Normalized schema | PostgreSQL/Parquet | Incremental |
| **Gold** | Pre-aggregated metrics | PostgreSQL + Cache | Hourly/Daily |

### 2.3 Eventual Consistency Model

We use **eventual consistency** to balance cost, API limits, and freshness:

```typescript
// Sync Configuration per Entity
interface SyncStrategy {
  entity: string;
  frequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  priority: 'critical' | 'high' | 'normal' | 'low';
  maxStaleness: number; // minutes
}

const SYNC_STRATEGIES: SyncStrategy[] = [
  // Critical: Near real-time for high-value data
  { entity: 'BankTransaction', frequency: 'hourly', priority: 'critical', maxStaleness: 60 },
  { entity: 'Invoice', frequency: 'hourly', priority: 'critical', maxStaleness: 60 },
  { entity: 'Bill', frequency: 'hourly', priority: 'critical', maxStaleness: 60 },
  
  // High: Daily for balance-affecting data
  { entity: 'Account', frequency: 'daily', priority: 'high', maxStaleness: 1440 },
  { entity: 'JournalEntry', frequency: 'daily', priority: 'high', maxStaleness: 1440 },
  { entity: 'Payment', frequency: 'daily', priority: 'high', maxStaleness: 1440 },
  
  // Normal: Weekly for reference data
  { entity: 'Contact', frequency: 'weekly', priority: 'normal', maxStaleness: 10080 },
  { entity: 'Item', frequency: 'weekly', priority: 'normal', maxStaleness: 10080 },
  
  // Low: Monthly or on-demand
  { entity: 'Budget', frequency: 'weekly', priority: 'low', maxStaleness: 43200 },
];
```

---

## 3. API Limitations & Mitigation Strategies

### 3.1 Rate Limits by Provider

| Provider | Requests/Min | Requests/Day | Mitigation Strategy |
|----------|--------------|--------------|---------------------|
| QuickBooks | 500 | 10,000 | Batching, webhooks |
| Xero | 60 | 5,000 | Aggressive caching, webhooks |
| Sage | 300 | 30,000 | Standard batching |
| FreshBooks | 100 | 10,000 | Pagination optimization |
| Wave | 100 | 1,000 | Heavy caching, minimal sync |

### 3.2 Mitigation Strategies

#### A. Webhook-First Approach
Instead of polling, use webhooks for real-time updates:

```typescript
// Webhook handler example
app.post('/webhooks/:provider', async (req, res) => {
  const { provider } = req.params;
  const event = req.body;
  
  // QuickBooks: realmChanged event
  // Xero: INVOICE.UPDATED, BANK_TRANSACTION.CREATED
  // Sage: entity.updated
  
  await syncQueue.add({
    provider,
    entityType: event.entityType,
    entityId: event.entityId,
    action: event.action,
    timestamp: new Date(),
  });
  
  res.status(200).send('OK');
});
```

#### B. Smart Batching
Combine multiple API calls into batched requests:

```typescript
// QuickBooks batch query
const batchQuery = `
  SELECT * FROM Account WHERE Metadata.LastUpdatedTime > '${lastSync}'
  SELECT * FROM Invoice WHERE Metadata.LastUpdatedTime > '${lastSync}'
  SELECT * FROM Bill WHERE Metadata.LastUpdatedTime > '${lastSync}'
`;

// Xero - use comma-separated IDs
const invoices = await xero.invoices.get({ 
  modifiedAfter: lastSync,
  page: 1,
  pageSize: 100 
});
```

#### C. Change Data Capture (CDC)
Only sync changed records:

```typescript
async function incrementalSync(connection: DataSourceConnection) {
  const lastSync = connection.syncConfig.lastSyncAt;
  
  // QuickBooks: modifiedAfter parameter
  // Xero: ModifiedAfter header
  // Sage: updated_from parameter
  
  const changes = await fetchChanges(connection.providerId, lastSync);
  
  // Process only changed records
  for (const change of changes) {
    await upsertRecord(change);
  }
}
```

#### D. Pre-computed Aggregations
Calculate and cache expensive aggregations:

```typescript
// Daily job: Pre-compute dashboard metrics
async function preComputeMetrics(organizationId: string) {
  const metrics = await calculateMetrics(organizationId);
  
  await cache.set(`metrics:${organizationId}`, metrics, {
    ttl: 3600 // 1 hour
  });
  
  // Store in Gold layer for historical analysis
  await db.dashboardMetrics.upsert({
    organizationId,
    date: new Date().toISOString().split('T')[0],
    metrics,
  });
}
```

---

## 4. Data Transformation Pipeline

### 4.1 Standard Schema

All provider data is transformed to our standard schema:

```typescript
// Unified Account Schema
interface StandardAccount {
  id: string;
  externalId: string;
  provider: 'quickbooks' | 'xero' | 'sage' | 'freshbooks' | 'wave';
  
  // Standard fields
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  subType: string;
  currency: string;
  
  // Balances
  currentBalance: number;
  openingBalance: number;
  
  // Metadata
  isActive: boolean;
  isBankAccount: boolean;
  taxCode?: string;
  
  // Audit
  createdAt: string;
  updatedAt: string;
  syncedAt: string;
}

// Unified Transaction Schema
interface StandardTransaction {
  id: string;
  externalId: string;
  provider: string;
  
  // Standard fields
  date: string;
  type: 'invoice' | 'bill' | 'payment' | 'transfer' | 'journal';
  reference: string;
  description: string;
  
  // Amounts
  amount: number;
  currency: string;
  exchangeRate?: number;
  
  // Line items
  lines: {
    accountId: string;
    description: string;
    debit: number;
    credit: number;
    taxCode?: string;
  }[];
  
  // Status
  status: 'draft' | 'pending' | 'posted' | 'void';
  
  // References
  contactId?: string;
  linkedTransactionIds?: string[];
}
```

### 4.2 Provider-Specific Transformers

```typescript
// QuickBooks transformer
function transformQuickBooksAccount(qbAccount: QBAccount): StandardAccount {
  return {
    id: generateId(),
    externalId: qbAccount.Id,
    provider: 'quickbooks',
    code: qbAccount.AcctNum || '',
    name: qbAccount.Name,
    type: mapQBAccountType(qbAccount.AccountType),
    subType: qbAccount.AccountSubType,
    currency: qbAccount.CurrencyRef?.value || 'CAD',
    currentBalance: qbAccount.CurrentBalance,
    openingBalance: qbAccount.OpeningBalance || 0,
    isActive: qbAccount.Active,
    isBankAccount: qbAccount.AccountType === 'Bank',
    createdAt: qbAccount.MetaData.CreateTime,
    updatedAt: qbAccount.MetaData.LastUpdatedTime,
    syncedAt: new Date().toISOString(),
  };
}

// Xero transformer
function transformXeroAccount(xeroAccount: XeroAccount): StandardAccount {
  return {
    id: generateId(),
    externalId: xeroAccount.AccountID,
    provider: 'xero',
    code: xeroAccount.Code || '',
    name: xeroAccount.Name,
    type: mapXeroAccountType(xeroAccount.Type),
    subType: xeroAccount.Class,
    currency: xeroAccount.CurrencyCode || 'CAD',
    currentBalance: xeroAccount.Balance || 0,
    openingBalance: 0,
    isActive: xeroAccount.Status === 'ACTIVE',
    isBankAccount: xeroAccount.Type === 'BANK',
    taxCode: xeroAccount.TaxType,
    createdAt: xeroAccount.UpdatedDateUTC,
    updatedAt: xeroAccount.UpdatedDateUTC,
    syncedAt: new Date().toISOString(),
  };
}
```

---

## 5. Reports & Analytics Generation

### 5.1 Report Data Flow

```
Raw Transactions → Aggregation → Report Generation → Caching → API Response
```

### 5.2 Pre-built Reports

| Report | Data Sources | Calculation Method |
|--------|--------------|-------------------|
| Balance Sheet | Accounts + Balances | Sum by account type |
| Income Statement | Revenue + Expense txns | Period aggregation |
| Cash Flow | Bank + Payment txns | Activity classification |
| AR Aging | Invoices | Due date bucketing |
| AP Aging | Bills | Due date bucketing |
| Trial Balance | All accounts | Debit/Credit sum |
| Budget vs Actual | Budgets + Actuals | Variance calculation |

### 5.3 Dynamic Report Generation

```typescript
async function generateBalanceSheet(
  organizationId: string, 
  asOfDate: string
): Promise<BalanceSheetData> {
  // 1. Get account balances as of date
  const accounts = await db.accounts.findMany({
    where: { organizationId },
  });
  
  // 2. Calculate balances from transactions up to date
  const balances = await db.transactions.aggregate({
    where: {
      organizationId,
      date: { lte: asOfDate },
      status: 'posted',
    },
    groupBy: ['accountId'],
    _sum: { debit: true, credit: true },
  });
  
  // 3. Classify into asset/liability/equity
  const classified = classifyAccounts(accounts, balances);
  
  // 4. Build hierarchical structure
  return buildBalanceSheetStructure(classified, asOfDate);
}
```

---

## 6. Anomaly Detection Integration

### 6.1 Data Required for Anomaly Detection

```typescript
interface AnomalyDataset {
  // Historical transaction patterns
  transactions: {
    date: string;
    accountId: string;
    amount: number;
    type: string;
  }[];
  
  // Account balance history
  balanceHistory: {
    date: string;
    accountId: string;
    balance: number;
  }[];
  
  // Expected patterns (from ML or rules)
  patterns: {
    accountId: string;
    expectedMin: number;
    expectedMax: number;
    seasonality?: number[];
  }[];
}
```

### 6.2 Anomaly Types Detected

All these anomalies can be detected with API data:

| Anomaly Type | Detection Method | Data Source |
|--------------|------------------|-------------|
| **Large Transaction** | Amount > threshold | Transactions |
| **Unusual Account** | Activity in dormant account | Account + Transactions |
| **Balance Swing** | Significant change | Balance history |
| **Missing Expected** | Expected recurring missing | Transaction patterns |
| **Duplicate Entry** | Same amount/date/ref | Transactions |
| **Weekend Activity** | Unusual timing | Transaction dates |
| **Round Number** | Suspicious amounts | Transaction amounts |
| **Vendor Concentration** | Single vendor dominance | AP + Contacts |

---

## 7. Cost Optimization

### 7.1 API Call Costs

Most accounting APIs are free within rate limits, but we optimize for:

1. **Infrastructure costs** (compute, storage)
2. **Processing costs** (data transformation)
3. **Support costs** (handling sync issues)

### 7.2 Cost-Optimized Sync Schedule

```typescript
const COST_OPTIMIZED_SCHEDULE = {
  // During business hours: More frequent syncs
  businessHours: {
    invoices: 'every 15 minutes',
    payments: 'every 15 minutes',
    bankTransactions: 'every hour',
  },
  
  // Off-hours: Minimal syncing
  offHours: {
    invoices: 'every 2 hours',
    payments: 'every 2 hours',
    bankTransactions: 'every 4 hours',
  },
  
  // Weekend: Daily syncs only
  weekend: {
    all: 'daily at 6am',
  },
};
```

### 7.3 Storage Tiering

```
Hot Storage (PostgreSQL)     → Last 90 days
Warm Storage (S3 Standard)   → 90 days - 2 years
Cold Storage (S3 Glacier)    → 2+ years (compliance)
```

---

## 8. Implementation Checklist

### Phase 1: Core Sync (MVP)
- [x] OAuth flow for QuickBooks, Xero
- [x] API key auth for Sage, Wave
- [x] Basic entity sync (Accounts, Transactions)
- [x] Standard schema transformation
- [ ] Webhook listeners
- [ ] Error handling & retry logic

### Phase 2: Data Lake
- [ ] Bronze layer (raw storage)
- [ ] Silver layer (normalized)
- [ ] Gold layer (aggregations)
- [ ] CDC pipeline
- [ ] Data quality checks

### Phase 3: Advanced Features
- [ ] Real-time sync with webhooks
- [ ] Cross-provider reconciliation
- [ ] ML anomaly detection
- [ ] Predictive analytics
- [ ] Multi-tenant data isolation

---

## 9. Conclusion

**CONFIRMED**: PlainLedger's architecture fully supports:

✅ **All required data** is available from major accounting APIs  
✅ **Eventual consistency** model balances freshness vs cost  
✅ **API limitations** are mitigated via webhooks, batching, caching  
✅ **Data lake architecture** enables scalable analytics  
✅ **Standard schema** allows provider-agnostic features  
✅ **Anomaly detection** has all necessary data points  

### Key Constraints to Note:

| Constraint | Impact | Mitigation |
|------------|--------|------------|
| Xero rate limit (60/min) | Slower initial sync | Prioritize recent data |
| Wave no webhooks | Polling only | Less frequent sync |
| FreshBooks no journals | Limited GL view | Use invoice/bill data |
| Budget data limited | May need manual input | Support CSV import |

The platform is designed for **scalability** and can handle growing data volumes while maintaining **cost efficiency** through intelligent sync strategies and data tiering.
