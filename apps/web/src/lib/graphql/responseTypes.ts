/** Response shapes match the selected fields in queries.ts and mutations.ts. */
export interface MoneyValue { amount: number; currency: string; formatted: string }
export interface DashboardSummaryResult {
  totalRevenue: MoneyValue;
  totalExpenses: MoneyValue;
  netIncome: MoneyValue;
  cashOnHand: MoneyValue;
  accountsReceivable: MoneyValue;
  accountsPayable: MoneyValue;
  cashFlow: { inflows: MoneyValue; outflows: MoneyValue; netCashFlow: MoneyValue; changePercent: number; trend: string };
  keyMetrics: { name: string; currentValue: number; previousValue: number; direction: string; changePercent: number }[];
  asOfDate: string;
  periodLabel: string;
}
export interface FinancialTrendResult {
  metricName: string;
  data: { date: string; value: number; label: string }[];
  periodChangePercent: number;
  trend: string;
}
export interface AccountResult {
  id: string; code: string; name: string; type: string; balance: number; currency: string;
  isActive: boolean; lastActivityAt?: string;
}
export interface PageResult<T> {
  nodes: T[];
  pageInfo: { totalCount: number; pageSize: number; currentPage: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean };
}
export interface TransactionResult {
  id: string; type: string; date: string; reference: string; description: string; amount: number;
  currency: string; contactName: string; createdAt: string;
}
export interface BalanceSheetLine {
  accountCode: string; accountName: string; accountType: string; balance: number; level: number; isSubtotal: boolean;
}
export interface BalanceSheetResult {
  asOfDate: string; organizationName: string; currency: string;
  assets: BalanceSheetLine[]; liabilities: BalanceSheetLine[]; equity: BalanceSheetLine[];
  totalAssets: number; totalLiabilities: number; totalEquity: number;
}
export interface IncomeStatementLine {
  accountCode: string; accountName: string; amount: number; budget: number; variance: number; level: number;
}
export interface IncomeStatementResult {
  startDate: string; endDate: string; organizationName: string; currency: string;
  revenue: IncomeStatementLine[]; expenses: IncomeStatementLine[];
  grossRevenue: number; totalExpenses: number; netIncome: number;
}
export interface SyncStats {
  accountsSynced: number; transactionsSynced: number; contactsSynced: number; invoicesSynced: number; billsSynced: number;
}
export interface DataSourceResult {
  id: string; provider: string; name: string; companyName?: string; status: string;
  lastSyncAt?: string; nextSyncAt?: string; syncStats?: SyncStats; errorMessage?: string; createdAt: string; updatedAt: string;
}
export interface ProviderResult { id: string; name: string; description: string; logoUrl: string; isEnabled: boolean; supportedFeatures: string[] }
export interface OperationResult { success: boolean; message: string; errors?: string[] }
export interface BenchmarkRefreshStatus {
  lastRefresh?: { startedAt: string; completedAt?: string; status: string; recordsCreated: number; recordsUpdated: number; errors: string[] };
  nextScheduledRefresh?: string;
  dataFreshness: { newestData: string; oldestData: string; averageAgeInDays: number };
}
