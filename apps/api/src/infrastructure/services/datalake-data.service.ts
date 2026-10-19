/**
 * Datalake Data Service
 *
 * Fetches financial data from the Gold layer of the data lake
 * for use in dashboards, reports, and analytics.
 */

import { Injectable, Logger, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { DataSource } from 'typeorm';
import { OrganizationEntity } from '@infrastructure/persistence/postgres/entities/organization.entity';
import { CommittedAccountingSnapshot, getCommittedAccountingSnapshot, readCommittedAccountingDataset } from './committed-accounting-snapshot';
import { summarizeLedger, ledgerTrends, cashMovements, cashWaterfall, accountLookup, debitNet, ledgerCurrency } from './datalake-financial-calculations';
import { GoldDataReader } from "./gold-data-reader";
import { validateGoldAccounts, validateGoldTransactions, validateGoldBalances } from "./datalake-record-validation";
import { validateReportDates } from "@application/use-cases/financial-report-validation";
import { ConfigService } from "@nestjs/config";
import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { IDatalakeDataService } from "@application/ports/outbound/IDatalakeDataService";
import {
  getIndustryMapping,
  matchAccountToCategory,
} from "@domain/datalake/industry-account-mapping";
import { FactInvoice, FactBill } from "@domain/datalake/gold-metrics";
import { CacheService } from "@infrastructure/cache/cache.service";
import { AppConfig, createAppConfig } from "@infrastructure/config/app.config";

// Gold Layer Types (matching the schema)
export interface DimAccount {
  account_key: string;
  account_id: string;
  source_account_id: string;
  organization_key: string;
  account_code: string;
  account_name: string;
  account_name_fr?: string;
  account_type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  account_subtype: string;
  is_active: boolean;
  hierarchy_level: number;
  hierarchy_path: string;
  is_debit_normal: boolean;
  balance_sheet_section: string | null;
  income_statement_section: string | null;
}

export interface DimContact {
  contact_key: string;
  contact_id: string;
  source_contact_id: string;
  organization_key: string;
  contact_type: "CUSTOMER" | "VENDOR" | "BOTH";
  display_name: string;
  company_name: string;
  email: string;
  is_customer: boolean;
  is_vendor: boolean;
  is_active: boolean;
}

export interface FactTransaction {
  transaction_key: string;
  transaction_id: string;
  organization_key: string;
  account_key: string;
  date_key: number; // YYYYMMDD
  contact_key: string | null;
  transaction_type_key: string;
  transaction_date: string;
  posting_date: string;
  debit_amount: number;
  credit_amount: number;
  amount: number;
  currency_code: string;
  exchange_rate: number;
  amount_cad: number;
  reference_number: string;
  memo: string;
  source_system: string;
  source_transaction_id: string;
}

export interface FactAccountBalance {
  balance_key: string;
  organization_key: string;
  account_key: string;
  date_key: number;
  as_of_date: string;
  fiscal_year: number;
  fiscal_period: number;
  opening_balance: number;
  debit_total: number;
  credit_total: number;
  net_change: number;
  closing_balance: number;
  balance_type: "MTD" | "QTD" | "YTD" | "CUMULATIVE";
  currency_code: string;
}

export interface IndustryKPIs {
  industry: string;
  // Restaurant KPIs
  food_cost_pct?: number;
  beverage_cost_pct?: number;
  labor_cost_pct?: number;
  prime_cost_pct?: number;
  // Retail KPIs
  gross_margin_pct?: number;
  inventory_turnover?: number;
  // Professional Services
  utilization_rate?: number;
  ar_days?: number;
  // Construction
  job_margin_pct?: number;
  wip_balance?: number;
  // Real Estate
  re_cap_rate?: number;
  re_noi?: number;
  re_expense_ratio?: number;
  // Hospitality
  revpar?: number;
  adr?: number;
  occupancy_rate?: number;
}

/**
 * Data completeness information to help frontend display appropriate UI states
 */
export interface DataCompleteness {
  hasAccounts: boolean;
  hasTransactions: boolean;
  hasRecentData: boolean; // Data is less than 24 hours old
  lastSyncAt: string | null;
  dataSource: "real" | "partial" | "empty" | "demo";
  missingPeriods: string[]; // e.g., ['Jan', 'Feb'] if gaps exist
}

/**
 * Trial Balance Entry - calculated from transactions
 */
export interface TrialBalanceEntry {
  accountCode: string;
  accountName: string;
  accountType: string;
  debitBalance: number;
  creditBalance: number;
}

/**
 * Trial Balance Summary - for dashboard widget
 */
export interface TrialBalanceData {
  entries: TrialBalanceEntry[];
  totalDebits: number;
  totalCredits: number;
  difference: number;
  isBalanced: boolean;
  asOfDate: string;
}

/**
 * Cash Flow Waterfall Item - for waterfall chart
 */
export interface WaterfallItem {
  label: string;
  labelEn: string;
  value: number;
  type: "start" | "increase" | "decrease" | "subtotal" | "end";
  category: "opening" | "operating" | "investing" | "financing" | "closing";
}

/**
 * Aging Bucket - for AR/AP aging widgets
 */
export interface AgingBucket {
  label: string;
  labelEn: string;
  minDays: number;
  maxDays: number | null;
  amount: number;
  count: number;
}

/**
 * Aging Data - complete aging report
 */
export interface AgingData {
  buckets: AgingBucket[];
  total: number;
  totalOverdue: number;
  averageDays: number;
  hasData: boolean;
}

export interface DashboardData {
  organizationId: string;
  organizationName: string;
  asOfDate: string;
  dataSource: string;
  lastUpdated: string | null;
  currency?: string;
  cashMovements?: ReturnType<typeof cashMovements>;
  periodStart?: string;
  accounts: DimAccount[];
  contacts: DimContact[];
  transactions: FactTransaction[];
  balances: FactAccountBalance[];
  summary: {
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
    cashBalance: number;
    accountsReceivable: number;
    accountsPayable: number;
  };
  trends: {
    revenue: { period: string; value: number }[];
    expenses: { period: string; value: number }[];
    cashFlow: { period: string; value: number }[];
  };
  industryKPIs?: IndustryKPIs;
  completeness: DataCompleteness;
}

@Injectable()
export class DatalakeDataService implements IDatalakeDataService {
  private readonly logger = new Logger(DatalakeDataService.name);
  private s3Client: S3Client;
  private goldBucket: string;
  private readonly appConfig: AppConfig;
  private readonly cacheTtl: number;
  private readonly goldReader: GoldDataReader;

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
    private readonly database: DataSource,
  ) {
    this.appConfig = createAppConfig(configService);
    this.cacheTtl = this.appConfig.cacheTtlGoldSeconds;

    const s3Endpoint = this.appConfig.s3Endpoint;
    const s3Region = this.appConfig.s3Region;
    const sessionToken = this.configService.get<string>("AWS_SESSION_TOKEN");

    // Build credentials object
    const credentials: {
      accessKeyId: string;
      secretAccessKey: string;
      sessionToken?: string;
    } = {
      accessKeyId:
        this.configService.get<string>("AWS_ACCESS_KEY_ID") || "test",
      secretAccessKey:
        this.configService.get<string>("AWS_SECRET_ACCESS_KEY") || "test",
    };

    // Include session token if provided (for temporary AWS credentials)
    if (sessionToken) {
      credentials.sessionToken = sessionToken;
      this.logger.log("Using AWS session token for S3 access");
    }

    this.s3Client = new S3Client({
      endpoint: s3Endpoint,
      region: s3Region,
      credentials,
      forcePathStyle: !!s3Endpoint, // Required for LocalStack/MinIO
    });

    this.goldBucket = this.appConfig.s3GoldBucket;
    const limit = (name: string) => {
      const value = configService.get<string>(name);
      return value === undefined || value === '' ? undefined : Number(value);
    };
    this.goldReader = new GoldDataReader(this.s3Client, this.goldBucket, {
      maxFiles: limit('DATALAKE_MAX_FILES'), maxObjectBytes: limit('DATALAKE_MAX_OBJECT_BYTES'),
      maxRows: limit('DATALAKE_MAX_ROWS'), maxDatasetBytes: limit('DATALAKE_MAX_DATASET_BYTES'),
    });

    this.logger.log(
      `DatalakeDataService initialized - Bucket: ${this.goldBucket}, Region: ${s3Region}, Endpoint: ${s3Endpoint || "AWS default"}`,
    );
  }

  /**
   * Fetch dashboard data for an organization from Gold layer
   */
  async getDashboardData(
    organizationId: string,
    asOfDate?: Date,
    industryId?: string,
    startDate?: Date,
  ): Promise<DashboardData> {
    this.logger.log(
      `[S3 Gold] Fetching dashboard data for organization: ${organizationId}${industryId ? `, industry: ${industryId}` : ""} from bucket: ${this.goldBucket}`,
    );

    try {
      // Fetch data from Gold layer (S3)
      this.logger.log(
        `[S3 Gold] Fetching accounts, contacts, and transactions from S3...`,
      );
      const cutoff = (asOfDate || new Date()).toISOString().slice(0, 10);
      validateReportDates(asOfDate || new Date(), startDate);
      const snapshot = await getCommittedAccountingSnapshot(this.database, organizationId);
      const organization = await this.database.getRepository(OrganizationEntity).findOne({ where: { tenantId: organizationId } });
      if (!organization || organization.deletedAt) throw new NotFoundException('Organization not found');
      const [accounts, contacts, allTransactions, balances] = await Promise.all([
        snapshot ? this.snapshotAccounts(snapshot) : this.fetchAccounts(organizationId),
        snapshot ? Promise.resolve([] as DimContact[]) : this.fetchContacts(organizationId),
        snapshot ? this.snapshotTransactions(snapshot) : this.fetchTransactions(organizationId),
        snapshot ? Promise.resolve([] as FactAccountBalance[]) : this.getAccountBalances(organizationId, asOfDate),
      ]);
      const transactions = allTransactions.filter((transaction) => transaction.transaction_date.slice(0, 10) <= cutoff);
      const periodStart = startDate?.toISOString().slice(0, 10);
      const periodTransactions = periodStart ? transactions.filter((transaction) => transaction.transaction_date.slice(0, 10) >= periodStart) : transactions;
      const currency = ledgerCurrency(transactions, snapshot?.currency || organization.currency);

      this.logger.log(
        `[S3 Gold] Fetched ${accounts.length} accounts, ${contacts.length} contacts, ${transactions.length} transactions from S3 Gold bucket`,
      );

      // Calculate summary metrics
      const summary = summarizeLedger(accounts, transactions, periodStart);

      // Calculate trends
      const trends = ledgerTrends(accounts, periodTransactions);

      // Calculate industry-specific KPIs if industry is specified
      let industryKPIs: IndustryKPIs | undefined;
      if (industryId) {
        industryKPIs = this.calculateIndustryKPIs(
          accounts,
          periodTransactions,
          industryId,
        );
      }

      // Calculate data completeness
      const completeness = this.calculateCompleteness(
        accounts,
        transactions,
        trends,
        snapshot?.createdAt,
      );

      return {
        organizationId,
        organizationName: organization.name,
        asOfDate: (asOfDate || new Date()).toISOString().split("T")[0],
        dataSource: "gold_layer",
        lastUpdated: snapshot?.createdAt || null,
        currency, periodStart,
        cashMovements: transactions.length ? cashMovements(accounts, transactions, periodStart, cutoff) : undefined,
        accounts,
        contacts,
        transactions,
        balances,
        summary,
        trends,
        industryKPIs,
        completeness,
      };
    } catch (error) {
      this.logger.warn(`Failed to fetch Gold data for this organization: ${error}`);
      throw error;
    }
  }

  /**
   * Get accounts for an organization
   */
  async getAccounts(organizationId: string): Promise<DimAccount[]> {
    return this.fetchAccounts(organizationId);
  }

  /**
   * Get contacts for an organization
   */
  async getContacts(organizationId: string): Promise<DimContact[]> {
    return this.fetchContacts(organizationId);
  }

  /**
   * Get transactions for an organization
   */
  async getTransactions(
    organizationId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<FactTransaction[]> {
    if (startDate || endDate) validateReportDates(endDate || new Date(), startDate);
    const transactions = await this.fetchTransactions(organizationId);
    if (startDate || endDate) {
      return transactions.filter((txn) => {
        const txnDate = txn.transaction_date.slice(0, 10);
        if (startDate && txnDate < startDate.toISOString().slice(0, 10)) return false;
        if (endDate && txnDate > endDate.toISOString().slice(0, 10)) return false;
        return true;
      });
    }
    return transactions;
  }

  /**
   * Get account balances for an organization
   */
  async getAccountBalances(organizationId: string, asOfDate?: Date): Promise<FactAccountBalance[]> {
    if (asOfDate) validateReportDates(asOfDate);
    if (await getCommittedAccountingSnapshot(this.database, organizationId)) return [];
    const rows = await this.cacheService.getOrFetch(
      this.cacheService.getDatalakeKey(organizationId, "balances:v2"),
      async () => validateGoldBalances(await this.readSnapshot<FactAccountBalance>("fact_account_balance", organizationId)), this.cacheTtl,
    );
    const cutoff = (asOfDate || new Date()).toISOString().slice(0, 10);
    const latestByAccount = new Map<string, FactAccountBalance>();
    for (const row of rows) {
      // Period movements are not a substitute for a cumulative closing balance.
      if (row.balance_type !== "CUMULATIVE" || row.as_of_date.slice(0, 10) > cutoff) continue;
      const previous = latestByAccount.get(row.account_key);
      if (!previous || row.as_of_date > previous.as_of_date) latestByAccount.set(row.account_key, row);
    }
    return [...latestByAccount.values()];
  }

  private async readSnapshot<T extends { organization_key?: string }>(kind: string, organizationId: string): Promise<T[]> {
    const snapshot = await getCommittedAccountingSnapshot(this.database, organizationId);
    if (snapshot) throw new UnprocessableEntityException(`The committed ledger does not include a verified ${kind} dataset`);
    const canonical = await this.goldReader.readTenantFile<T>(`${organizationId}/${kind}.json`, organizationId);
    if (canonical !== null) return canonical;
    return this.goldReader.readTenantSnapshot<T>(`${kind}/${organizationId}/`, organizationId);
  }

  private async snapshotAccounts(snapshot: CommittedAccountingSnapshot): Promise<DimAccount[]> {
    return this.cacheService.getOrFetch(this.cacheService.getDatalakeKey(snapshot.tenantId, `accounts:${snapshot.runId}`),
      async () => validateGoldAccounts(await readCommittedAccountingDataset<DimAccount>(this.goldReader, snapshot, 'dim_account')), this.cacheTtl);
  }

  private async snapshotTransactions(snapshot: CommittedAccountingSnapshot): Promise<FactTransaction[]> {
    return this.cacheService.getOrFetch(this.cacheService.getDatalakeKey(snapshot.tenantId, `transactions:${snapshot.runId}`),
      async () => validateGoldTransactions(await readCommittedAccountingDataset<FactTransaction>(this.goldReader, snapshot, 'fact_transaction')), this.cacheTtl);
  }

  private async fetchAccounts(organizationId: string): Promise<DimAccount[]> {
    const snapshot = await getCommittedAccountingSnapshot(this.database, organizationId);
    if (snapshot) return this.snapshotAccounts(snapshot);
    return this.cacheService.getOrFetch(
      this.cacheService.getDatalakeKey(organizationId, "accounts:v2"),
      async () => validateGoldAccounts(await this.readSnapshot<DimAccount>("dim_account", organizationId)), this.cacheTtl,
    );
  }

  private async fetchContacts(organizationId: string): Promise<DimContact[]> {
    return this.cacheService.getOrFetch(
      this.cacheService.getDatalakeKey(organizationId, "contacts:v2"),
      () => this.readSnapshot<DimContact>("dim_contact", organizationId), this.cacheTtl,
    );
  }

  private async fetchTransactions(organizationId: string): Promise<FactTransaction[]> {
    const snapshot = await getCommittedAccountingSnapshot(this.database, organizationId);
    if (snapshot) return this.snapshotTransactions(snapshot);
    return this.cacheService.getOrFetch(
      this.cacheService.getDatalakeKey(organizationId, "transactions:v2"),
      async () => {
        const canonical = await this.goldReader.readTenantFile<FactTransaction>(`${organizationId}/fact_transaction.json`, organizationId);
        if (canonical !== null) return validateGoldTransactions(canonical);
        const directPrefix = `fact_transaction/${organizationId}/`;
        // Distinguish a present empty snapshot from an absent layout. Never resurrect old data.
        if ((await this.goldReader.listFiles(directPrefix)).length) {
          return validateGoldTransactions(await this.goldReader.readTenantTransactions<FactTransaction>(directPrefix, organizationId));
        }
        return validateGoldTransactions(await this.goldReader.readTenantTransactions<FactTransaction>(
          `fact_transaction/organization_id=${organizationId}/`, organizationId,
        ));
      }, this.cacheTtl,
    );
  }

  private async fetchInvoices(organizationId: string): Promise<FactInvoice[]> {
    return this.readSnapshot<FactInvoice>("fact_invoice", organizationId);
  }

  private async fetchBills(organizationId: string): Promise<FactBill[]> {
    return this.readSnapshot<FactBill>("fact_bill", organizationId);
  }

  private async listFiles(prefix: string): Promise<string[]> {
    return this.goldReader.listFiles(prefix);
  }

  private async fetchJsonFile<T>(key: string): Promise<T> {
    return this.goldReader.fetchJsonFile<T>(key);
  }

  /**
   * Calculate summary metrics from accounts and transactions
   * Joins transactions with accounts to properly categorize by account type
   */
  /**
   * Calculate industry-specific KPIs from accounts and transactions
   */
  calculateIndustryKPIs(
    accounts: DimAccount[],
    transactions: FactTransaction[],
    industryId: string,
  ): IndustryKPIs {
    const mapping = getIndustryMapping(industryId);
    if (!mapping) {
      this.logger.warn(`No industry mapping for: ${industryId}`);
      return { industry: industryId };
    }

    // Map accounts to industry categories
    const accountCategories = new Map<string, string>();
    for (const account of accounts) {
      const category = matchAccountToCategory(
        {
          accountName: account.account_name,
          accountType: account.account_type,
          accountSubtype: account.account_subtype,
          sourceAccountType: account.account_type,
          sourceAccountSubtype: account.account_subtype,
        },
        industryId,
      );
      if (category) {
        accountCategories.set(account.account_key, category);
        accountCategories.set(account.source_account_id, category);
      }
    }

    this.logger.debug(
      `Mapped ${accountCategories.size} accounts to ${industryId} categories`,
    );

    // Calculate category totals
    const categoryTotals = new Map<string, number>();
    const accountFor = accountLookup(accounts);
    for (const txn of transactions) {
      const category = accountCategories.get(txn.account_key);
      if (category) {
        const current = categoryTotals.get(category) || 0;
        const account = accountFor(txn);
        const normalAmount = debitNet(txn) / 100 * (['ASSET', 'EXPENSE'].includes(account.account_type) ? 1 : -1);
        categoryTotals.set(category, current + normalAmount);
      }
    }

    // Build KPI result based on industry
    const kpis: IndustryKPIs = { industry: industryId };

    // Calculate KPIs based on category totals
    const foodCost = categoryTotals.get("food_cost") || 0;
    const beverageCost = categoryTotals.get("beverage_cost") || 0;
    const laborCost = categoryTotals.get("labor_cost") || 0;
    const foodSales = categoryTotals.get("food_sales") || 0;
    const beverageSales = categoryTotals.get("beverage_sales") || 0;
    const totalRevenue =
      categoryTotals.get("total_revenue") || foodSales + beverageSales;

    // Restaurant KPIs
    if (industryId === "restaurant") {
      if (foodSales > 0) {
        kpis.food_cost_pct = Math.round((foodCost / foodSales) * 10000) / 100;
      }
      if (beverageSales > 0) {
        kpis.beverage_cost_pct =
          Math.round(
            (beverageCost / beverageSales) *
              this.appConfig.percentageRoundingPrecision,
          ) / this.appConfig.financialRoundingPrecision;
      }
      if (totalRevenue > 0) {
        kpis.labor_cost_pct =
          Math.round(
            (laborCost / totalRevenue) *
              this.appConfig.percentageRoundingPrecision,
          ) / this.appConfig.financialRoundingPrecision;
        kpis.prime_cost_pct =
          Math.round(
            ((foodCost + beverageCost + laborCost) / totalRevenue) * 10000,
          ) / 100;
      }
    }

    // Retail KPIs
    if (industryId === "retail") {
      const cogs = categoryTotals.get("cogs") || 0;
      const sales = categoryTotals.get("sales") || 0;
      const inventory = categoryTotals.get("inventory") || 0;
      if (sales > 0) {
        kpis.gross_margin_pct =
          Math.round(((sales - cogs) / sales) * 10000) / 100;
      }
      if (inventory > 0 && cogs > 0) {
        kpis.inventory_turnover = Math.round((cogs / inventory) * 10) / 10;
      }
    }

    // Real Estate KPIs
    if (industryId === "real_estate") {
      const rentalIncome = categoryTotals.get("rental_income") || 0;
      const operatingExpenses = categoryTotals.get("operating_expenses") || 0;
      const propertyValue = categoryTotals.get("property_value") || 0;

      const noi = rentalIncome - operatingExpenses;
      kpis.re_noi =
        Math.round(noi * this.appConfig.financialRoundingPrecision) /
        this.appConfig.financialRoundingPrecision;

      if (propertyValue > 0) {
        kpis.re_cap_rate = Math.round((noi / propertyValue) * 10000) / 100;
      }
      if (rentalIncome > 0) {
        kpis.re_expense_ratio =
          Math.round(
            (operatingExpenses / rentalIncome) *
              this.appConfig.percentageRoundingPrecision,
          ) / this.appConfig.financialRoundingPrecision;
      }
    }

    // Construction KPIs
    if (industryId === "construction") {
      const projectRevenue = categoryTotals.get("project_revenue") || 0;
      const directCosts = categoryTotals.get("direct_costs") || 0;
      const wip = categoryTotals.get("wip") || 0;

      if (projectRevenue > 0) {
        kpis.job_margin_pct =
          Math.round(
            ((projectRevenue - directCosts) / projectRevenue) * 10000,
          ) / 100;
      }
      kpis.wip_balance =
        Math.round(wip * this.appConfig.financialRoundingPrecision) /
        this.appConfig.financialRoundingPrecision;
    }

    return kpis;
  }

  /**
   * Calculate Trial Balance from transactions
   * Sums all debits and credits by account
   */
  calculateTrialBalance(
    accounts: DimAccount[],
    transactions: FactTransaction[],
  ): TrialBalanceData {
    // Create account lookup
    const accountByKey = new Map<string, DimAccount>();
    for (const account of accounts) {
      accountByKey.set(account.account_key, account);
      accountByKey.set(account.source_account_id, account);
    }

    // Calculate debit/credit totals per account
    const accountTotals = new Map<
      string,
      { debits: number; credits: number; account: DimAccount }
    >();

    for (const txn of transactions) {
      const account =
        accountByKey.get(txn.account_key) ||
        accountByKey.get(txn.source_transaction_id);

      if (!account) continue;

      const key = account.account_key;
      if (!accountTotals.has(key)) {
        accountTotals.set(key, { debits: 0, credits: 0, account });
      }

      const totals = accountTotals.get(key)!;
      totals.debits += txn.debit_amount || 0;
      totals.credits += txn.credit_amount || 0;
    }

    // Build trial balance entries
    const entries: TrialBalanceEntry[] = Array.from(accountTotals.values())
      .map(({ account, debits, credits }) => ({
        accountCode: account.account_code,
        accountName: account.account_name,
        accountType: account.account_type,
        debitBalance: debits,
        creditBalance: credits,
      }))
      .filter((e) => e.debitBalance > 0 || e.creditBalance > 0)
      .sort((a, b) => a.accountCode.localeCompare(b.accountCode));

    // Calculate totals
    const totalDebits = entries.reduce((sum, e) => sum + e.debitBalance, 0);
    const totalCredits = entries.reduce((sum, e) => sum + e.creditBalance, 0);
    const difference = Math.abs(totalDebits - totalCredits);

    this.logger.debug(
      `Trial balance calculated: Debits=${totalDebits}, Credits=${totalCredits}, Diff=${difference}`,
    );

    return {
      entries,
      totalDebits: Math.round(totalDebits * 100) / 100,
      totalCredits: Math.round(totalCredits * 100) / 100,
      difference: Math.round(difference * 100) / 100,
      isBalanced: difference < 0.01, // Allow for rounding errors
      asOfDate: new Date().toISOString().split("T")[0],
    };
  }

  /**
   * Calculate Cash Flow Waterfall from transactions
   * Groups transactions by category (Operating, Investing, Financing)
   */
  calculateCashFlowWaterfall(accounts: DimAccount[], transactions: FactTransaction[], startDate?: string, endDate?: string): WaterfallItem[] {
    const cutoff = endDate ? new Date(endDate) : new Date();
    validateReportDates(cutoff, startDate ? new Date(startDate) : undefined);
    return cashWaterfall(accounts, transactions, startDate?.slice(0, 10), cutoff.toISOString().slice(0, 10));
  }

  /**
   * Calculate AR Aging from invoices (when available)
   * Uses real invoice data with due dates if available, falls back to transaction-based estimation
   */
  calculateARaging(
    _accounts: DimAccount[],
    transactions: FactTransaction[],
    _contacts: DimContact[],
    invoices?: FactInvoice[],
  ): AgingData {
    // Define aging buckets
    const buckets: AgingBucket[] = [
      {
        label: "À jour (0-30 jours)",
        labelEn: "Current (0-30 days)",
        minDays: 0,
        maxDays: 30,
        amount: 0,
        count: 0,
      },
      {
        label: "31-60 jours",
        labelEn: "31-60 days",
        minDays: 31,
        maxDays: 60,
        amount: 0,
        count: 0,
      },
      {
        label: "61-90 jours",
        labelEn: "61-90 days",
        minDays: 61,
        maxDays: 90,
        amount: 0,
        count: 0,
      },
      {
        label: "90+ jours",
        labelEn: "90+ days",
        minDays: 91,
        maxDays: null,
        amount: 0,
        count: 0,
      },
    ];

    const today = new Date();
    let totalDaysOutstanding = 0;
    let totalInvoices = 0;

    // Use real invoice data if available (more accurate - includes due dates)
    if (invoices && invoices.length > 0) {
      const openInvoices = invoices.filter(
        (inv) => inv.status === "open" || inv.status === "overdue",
      );

      if (openInvoices.length === 0) {
        return {
          buckets: [],
          total: 0,
          totalOverdue: 0,
          averageDays: 0,
          hasData: true, // We have invoice data, just no open invoices
        };
      }

      for (const invoice of openInvoices) {
        // Calculate days from due date (more accurate than invoice date)
        const dueDate = invoice.due_date
          ? new Date(invoice.due_date)
          : new Date(invoice.invoice_date);
        const daysOutstanding = Math.max(
          0,
          Math.floor(
            (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
          ),
        );

        // Find appropriate bucket
        for (const bucket of buckets) {
          if (
            daysOutstanding >= bucket.minDays &&
            (bucket.maxDays === null || daysOutstanding <= bucket.maxDays)
          ) {
            bucket.amount += invoice.balance;
            bucket.count += 1;
            break;
          }
        }

        totalDaysOutstanding += daysOutstanding;
        totalInvoices += 1;
      }

      const total = buckets.reduce((sum, b) => sum + b.amount, 0);
      const totalOverdue = buckets
        .filter((b) => b.minDays > 30)
        .reduce((sum, b) => sum + b.amount, 0);
      const averageDays =
        totalInvoices > 0
          ? Math.round(totalDaysOutstanding / totalInvoices)
          : 0;

      this.logger.debug(
        `AR aging from invoices: Total=${total}, Overdue=${totalOverdue}, AvgDays=${averageDays}`,
      );

      return {
        buckets,
        total:
          Math.round(total * this.appConfig.financialRoundingPrecision) /
          this.appConfig.financialRoundingPrecision,
        totalOverdue:
          Math.round(totalOverdue * this.appConfig.financialRoundingPrecision) /
          this.appConfig.financialRoundingPrecision,
        averageDays,
        hasData: true,
      };
    }

    // Fall back to transaction-based estimation
    const arTransactions = transactions.filter((txn) => {
      const isInvoice = txn.transaction_type_key
        ?.toLowerCase()
        .includes("invoice");
      return isInvoice;
    });

    if (arTransactions.length === 0) {
      return {
        buckets: [],
        total: 0,
        totalOverdue: 0,
        averageDays: 0,
        hasData: false,
      };
    }

    // Calculate aging for each invoice transaction
    for (const txn of arTransactions) {
      // Skip if no receivable amount (debit = amount owed to us)
      if (txn.debit_amount <= 0) continue;

      const txnDate = new Date(txn.transaction_date);
      const daysOutstanding = Math.floor(
        (today.getTime() - txnDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Find appropriate bucket
      for (const bucket of buckets) {
        if (
          daysOutstanding >= bucket.minDays &&
          (bucket.maxDays === null || daysOutstanding <= bucket.maxDays)
        ) {
          bucket.amount += txn.debit_amount;
          bucket.count += 1;
          break;
        }
      }

      totalDaysOutstanding += daysOutstanding;
      totalInvoices += 1;
    }

    const total = buckets.reduce((sum, b) => sum + b.amount, 0);
    const totalOverdue = buckets
      .filter((b) => b.minDays > 30)
      .reduce((sum, b) => sum + b.amount, 0);
    const averageDays =
      totalInvoices > 0 ? Math.round(totalDaysOutstanding / totalInvoices) : 0;

    this.logger.debug(
      `AR aging calculated: Total=${total}, Overdue=${totalOverdue}, AvgDays=${averageDays}`,
    );

    return {
      buckets,
      total: Math.round(total * 100) / 100,
      totalOverdue: Math.round(totalOverdue * 100) / 100,
      averageDays,
      hasData: true,
    };
  }

  /**
   * Calculate AP Aging from bills (when available)
   * Uses real bill data with due dates if available, falls back to transaction-based estimation
   */
  calculateAPaging(
    _accounts: DimAccount[],
    transactions: FactTransaction[],
    _contacts: DimContact[],
    bills?: FactBill[],
  ): AgingData {
    // Define aging buckets
    const buckets: AgingBucket[] = [
      {
        label: "À jour (0-30 jours)",
        labelEn: "Current (0-30 days)",
        minDays: 0,
        maxDays: 30,
        amount: 0,
        count: 0,
      },
      {
        label: "31-60 jours",
        labelEn: "31-60 days",
        minDays: 31,
        maxDays: 60,
        amount: 0,
        count: 0,
      },
      {
        label: "61-90 jours",
        labelEn: "61-90 days",
        minDays: 61,
        maxDays: 90,
        amount: 0,
        count: 0,
      },
      {
        label: "90+ jours",
        labelEn: "90+ days",
        minDays: 91,
        maxDays: null,
        amount: 0,
        count: 0,
      },
    ];

    const today = new Date();
    let totalDaysOutstanding = 0;
    let totalBills = 0;

    // Use real bill data if available (more accurate - includes due dates)
    if (bills && bills.length > 0) {
      const openBills = bills.filter(
        (bill) => bill.status === "open" || bill.status === "overdue",
      );

      if (openBills.length === 0) {
        return {
          buckets: [],
          total: 0,
          totalOverdue: 0,
          averageDays: 0,
          hasData: true, // We have bill data, just no open bills
        };
      }

      for (const bill of openBills) {
        // Calculate days from due date (more accurate than bill date)
        const dueDate = bill.due_date
          ? new Date(bill.due_date)
          : new Date(bill.bill_date);
        const daysOutstanding = Math.max(
          0,
          Math.floor(
            (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
          ),
        );

        // Find appropriate bucket
        for (const bucket of buckets) {
          if (
            daysOutstanding >= bucket.minDays &&
            (bucket.maxDays === null || daysOutstanding <= bucket.maxDays)
          ) {
            bucket.amount += bill.balance;
            bucket.count += 1;
            break;
          }
        }

        totalDaysOutstanding += daysOutstanding;
        totalBills += 1;
      }

      const total = buckets.reduce((sum, b) => sum + b.amount, 0);
      const totalOverdue = buckets
        .filter((b) => b.minDays > 30)
        .reduce((sum, b) => sum + b.amount, 0);
      const averageDays =
        totalBills > 0 ? Math.round(totalDaysOutstanding / totalBills) : 0;

      this.logger.debug(
        `AP aging from bills: Total=${total}, Overdue=${totalOverdue}, AvgDays=${averageDays}`,
      );

      return {
        buckets,
        total:
          Math.round(total * this.appConfig.financialRoundingPrecision) /
          this.appConfig.financialRoundingPrecision,
        totalOverdue:
          Math.round(totalOverdue * this.appConfig.financialRoundingPrecision) /
          this.appConfig.financialRoundingPrecision,
        averageDays,
        hasData: true,
      };
    }

    // Fall back to transaction-based estimation
    const apTransactions = transactions.filter((txn) => {
      const isBill = txn.transaction_type_key?.toLowerCase().includes("bill");
      return isBill;
    });

    if (apTransactions.length === 0) {
      return {
        buckets: [],
        total: 0,
        totalOverdue: 0,
        averageDays: 0,
        hasData: false,
      };
    }

    // Calculate aging for each bill transaction
    for (const txn of apTransactions) {
      // Skip if no payable amount (credit = amount we owe)
      if (txn.credit_amount <= 0 && txn.debit_amount <= 0) continue;

      const amount = txn.debit_amount || txn.credit_amount;
      const txnDate = new Date(txn.transaction_date);
      const daysOutstanding = Math.floor(
        (today.getTime() - txnDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Find appropriate bucket
      for (const bucket of buckets) {
        if (
          daysOutstanding >= bucket.minDays &&
          (bucket.maxDays === null || daysOutstanding <= bucket.maxDays)
        ) {
          bucket.amount += amount;
          bucket.count += 1;
          break;
        }
      }

      totalDaysOutstanding += daysOutstanding;
      totalBills += 1;
    }

    const total = buckets.reduce((sum, b) => sum + b.amount, 0);
    const totalOverdue = buckets
      .filter((b) => b.minDays > 30)
      .reduce((sum, b) => sum + b.amount, 0);
    const averageDays =
      totalBills > 0 ? Math.round(totalDaysOutstanding / totalBills) : 0;

    this.logger.debug(
      `AP aging calculated: Total=${total}, Overdue=${totalOverdue}, AvgDays=${averageDays}`,
    );

    return {
      buckets,
      total: Math.round(total * 100) / 100,
      totalOverdue: Math.round(totalOverdue * 100) / 100,
      averageDays,
      hasData: true,
    };
  }

  /**
   * Calculate trend data from transactions
   */
  /**
   * Calculate data completeness information
   */
  private calculateCompleteness(accounts: DimAccount[], transactions: FactTransaction[], _trends: DashboardData['trends'], syncedAt?: string): DataCompleteness {
    const hasAccounts = accounts.length > 0, hasTransactions = transactions.length > 0;
    const timestamp = syncedAt ? Date.parse(syncedAt) : NaN;
    const hasRecentData = Number.isFinite(timestamp) && Date.now() >= timestamp && Date.now() - timestamp < this.appConfig.dataRecencyHours * 3_600_000;
    return { hasAccounts, hasTransactions, hasRecentData, lastSyncAt: syncedAt || null,
      dataSource: syncedAt ? 'real' : hasAccounts || hasTransactions ? 'partial' : 'empty',
      // Months without postings are not evidence of missing data. Only source coverage can establish a gap.
      missingPeriods: [],
    };
  }

  /**
   * Get empty dashboard data when datalake is unavailable or org has no data
   * Returns honest zeros instead of fake values
   */
  private getEmptyDashboardData(organizationId: string): DashboardData {
    return {
      organizationId,
      organizationName: `Organization ${organizationId}`,
      asOfDate: new Date().toISOString().split("T")[0],
      dataSource: "empty",
      lastUpdated: null,
      accounts: [],
      contacts: [],
      transactions: [],
      balances: [],
      summary: {
        totalAssets: 0,
        totalLiabilities: 0,
        totalEquity: 0,
        totalRevenue: 0,
        totalExpenses: 0,
        netIncome: 0,
        cashBalance: 0,
        accountsReceivable: 0,
        accountsPayable: 0,
      },
      trends: {
        revenue: [],
        expenses: [],
        cashFlow: [],
      },
      completeness: {
        hasAccounts: false,
        hasTransactions: false,
        hasRecentData: false,
        lastSyncAt: null,
        dataSource: "empty",
        missingPeriods: [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ],
      },
    };
  }

  /**
   * Check if datalake connection is healthy
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    bucket: string;
    error?: string;
  }> {
    try {
      await this.s3Client.send(
        new ListObjectsV2Command({
          Bucket: this.goldBucket,
          MaxKeys: 1,
        }),
      );
      return { healthy: true, bucket: this.goldBucket };
    } catch (error) {
      return {
        healthy: false,
        bucket: this.goldBucket,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
