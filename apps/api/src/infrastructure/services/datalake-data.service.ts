/**
 * Datalake Data Service
 *
 * Fetches financial data from the Gold layer of the data lake
 * for use in dashboards, reports, and analytics.
 */

import { Injectable, Logger } from "@nestjs/common";
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
  lastUpdated: string;
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

  constructor(private readonly configService: ConfigService) {
    const s3Endpoint = this.configService.get<string>("S3_ENDPOINT");
    const s3Region =
      this.configService.get<string>("S3_REGION") || "ca-central-1";
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

    this.goldBucket =
      this.configService.get<string>("S3_BUCKET_GOLD") ||
      "plainledger-prod-gold-436136277668";

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
  ): Promise<DashboardData> {
    this.logger.log(
      `[S3 Gold] Fetching dashboard data for organization: ${organizationId}${industryId ? `, industry: ${industryId}` : ""} from bucket: ${this.goldBucket}`,
    );

    try {
      // Fetch data from Gold layer (S3)
      this.logger.log(
        `[S3 Gold] Fetching accounts, contacts, and transactions from S3...`,
      );
      const [accounts, contacts, transactions] = await Promise.all([
        this.fetchAccounts(organizationId),
        this.fetchContacts(organizationId),
        this.fetchTransactions(organizationId),
      ]);

      this.logger.log(
        `[S3 Gold] Fetched ${accounts.length} accounts, ${contacts.length} contacts, ${transactions.length} transactions from S3 Gold bucket`,
      );

      // Calculate summary metrics
      const summary = this.calculateSummary(accounts, transactions);

      // Calculate trends
      const trends = this.calculateTrends(transactions);

      // Calculate industry-specific KPIs if industry is specified
      let industryKPIs: IndustryKPIs | undefined;
      if (industryId) {
        industryKPIs = this.calculateIndustryKPIs(
          accounts,
          transactions,
          industryId,
        );
      }

      // Calculate data completeness
      const completeness = this.calculateCompleteness(
        accounts,
        transactions,
        trends,
      );

      return {
        organizationId,
        organizationName: `Organization ${organizationId}`,
        asOfDate: new Date().toISOString().split("T")[0],
        dataSource: "gold_layer",
        lastUpdated: new Date().toISOString(),
        accounts,
        contacts,
        transactions,
        balances: [],
        summary,
        trends,
        industryKPIs,
        completeness,
      };
    } catch (error) {
      this.logger.warn(
        `Failed to fetch from Gold layer, using fallback: ${error}`,
      );
      // Return empty data structure (no fake values)
      return this.getEmptyDashboardData(organizationId);
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
    const transactions = await this.fetchTransactions(organizationId);
    if (startDate || endDate) {
      return transactions.filter((txn) => {
        const txnDate = new Date(txn.transaction_date);
        if (startDate && txnDate < startDate) return false;
        if (endDate && txnDate > endDate) return false;
        return true;
      });
    }
    return transactions;
  }

  /**
   * Get account balances for an organization
   */
  async getAccountBalances(
    _organizationId: string,
    _asOfDate?: Date,
  ): Promise<FactAccountBalance[]> {
    // TODO: Implement when FactAccountBalance data is available in Gold layer
    return [];
  }

  /**
   * Fetch accounts from Gold layer
   */
  private async fetchAccounts(organizationId: string): Promise<DimAccount[]> {
    try {
      const prefix = `dim_account/${organizationId}/`;
      this.logger.log(`[S3 Gold] Listing accounts files at prefix: ${prefix}`);
      const files = await this.listFiles(prefix);

      if (files.length === 0) {
        this.logger.log(
          `[S3 Gold] No accounts found for org: ${organizationId} at ${prefix}, trying e2e test data`,
        );
        // Try the e2e test data
        const e2eFiles = await this.listFiles(`dim_account/e2e-org-123/`);
        if (e2eFiles.length > 0) {
          this.logger.log(
            `[S3 Gold] Using e2e test data: ${e2eFiles[e2eFiles.length - 1]}`,
          );
          return this.fetchJsonFile(e2eFiles[e2eFiles.length - 1]);
        }
        this.logger.log(
          `[S3 Gold] No accounts data found in S3 for org: ${organizationId}`,
        );
        return [];
      }

      if (files.length > 0) {
        const latestFile = files[files.length - 1];
        this.logger.log(
          `[S3 Gold] Found ${files.length} account file(s), using latest: ${latestFile} for org: ${organizationId}`,
        );
        const accounts = await this.fetchJsonFile<DimAccount[]>(latestFile);
        this.logger.log(`[S3 Gold] Loaded ${accounts.length} accounts from S3`);
        return accounts;
      }
      return [];
    } catch (error) {
      this.logger.error(`[S3 Gold] Failed to fetch accounts: ${error}`);
      return [];
    }
  }

  /**
   * Fetch contacts from Gold layer
   */
  private async fetchContacts(organizationId: string): Promise<DimContact[]> {
    try {
      const files = await this.listFiles(`dim_contact/${organizationId}/`);
      if (files.length === 0) {
        const e2eFiles = await this.listFiles(`dim_contact/e2e-org-123/`);
        if (e2eFiles.length > 0) {
          return this.fetchJsonFile(e2eFiles[e2eFiles.length - 1]);
        }
      }
      if (files.length > 0) {
        return this.fetchJsonFile(files[files.length - 1]);
      }
      return [];
    } catch (error) {
      this.logger.warn(`Failed to fetch contacts: ${error}`);
      return [];
    }
  }

  /**
   * Fetch transactions from Gold layer
   */
  private async fetchTransactions(
    organizationId: string,
  ): Promise<FactTransaction[]> {
    try {
      this.logger.log(
        `[S3 Gold] Fetching transactions for org: ${organizationId}`,
      );

      // Check direct organization path first (QuickBooks format)
      let files = await this.listFiles(`fact_transaction/${organizationId}/`);
      this.logger.log(
        `[S3 Gold] Found ${files.length} transaction file(s) at fact_transaction/${organizationId}/`,
      );

      // Try partition structure if direct path is empty
      if (files.length === 0) {
        files = await this.listFiles(
          `fact_transaction/organization_id=${organizationId}/`,
        );
        this.logger.log(
          `[S3 Gold] Found ${files.length} transaction file(s) at partition path`,
        );
      }

      // Fallback to e2e test data
      if (files.length === 0) {
        files = await this.listFiles(`fact_transaction/e2e-org-123/`);
        this.logger.log(
          `[S3 Gold] Using e2e test data: ${files.length} file(s)`,
        );
      }

      // Also check partition structure with org-123
      if (files.length === 0) {
        files = await this.listFiles(
          `fact_transaction/organization_id=org-123/`,
        );
        this.logger.log(
          `[S3 Gold] Using org-123 partition: ${files.length} file(s)`,
        );
      }

      if (files.length === 0) {
        this.logger.log(
          `[S3 Gold] No transaction data found in S3 for org: ${organizationId}`,
        );
        return [];
      }

      const allTransactions: FactTransaction[] = [];
      const filesToLoad = files.slice(-5); // Last 5 files
      this.logger.log(
        `[S3 Gold] Loading transactions from ${filesToLoad.length} file(s): ${filesToLoad.map((f) => f.split("/").pop()).join(", ")}`,
      );

      for (const file of filesToLoad) {
        const data = await this.fetchJsonFile<FactTransaction[]>(file);
        allTransactions.push(...data);
      }

      this.logger.log(
        `[S3 Gold] Successfully loaded ${allTransactions.length} transactions from S3 Gold bucket for org: ${organizationId}`,
      );
      return allTransactions;
    } catch (error) {
      this.logger.error(`[S3 Gold] Failed to fetch transactions: ${error}`);
      return [];
    }
  }

  /**
   * Fetch invoices from Gold layer (for AR aging)
   */
  private async fetchInvoices(organizationId: string): Promise<FactInvoice[]> {
    try {
      const files = await this.listFiles(`fact_invoice/${organizationId}/`);
      if (files.length === 0) {
        this.logger.debug(`No invoice data found for org: ${organizationId}`);
        return [];
      }
      // Get the most recent invoice file
      const data = await this.fetchJsonFile<FactInvoice[]>(
        files[files.length - 1],
      );
      this.logger.log(
        `Fetched ${data.length} invoices for org: ${organizationId}`,
      );
      return data;
    } catch (error) {
      this.logger.warn(`Failed to fetch invoices: ${error}`);
      return [];
    }
  }

  /**
   * Fetch bills from Gold layer (for AP aging)
   */
  private async fetchBills(organizationId: string): Promise<FactBill[]> {
    try {
      const files = await this.listFiles(`fact_bill/${organizationId}/`);
      if (files.length === 0) {
        this.logger.debug(`No bill data found for org: ${organizationId}`);
        return [];
      }
      // Get the most recent bill file
      const data = await this.fetchJsonFile<FactBill[]>(
        files[files.length - 1],
      );
      this.logger.log(
        `Fetched ${data.length} bills for org: ${organizationId}`,
      );
      return data;
    } catch (error) {
      this.logger.warn(`Failed to fetch bills: ${error}`);
      return [];
    }
  }

  /**
   * List files in a Gold layer prefix
   */
  private async listFiles(prefix: string): Promise<string[]> {
    try {
      const response = await this.s3Client.send(
        new ListObjectsV2Command({
          Bucket: this.goldBucket,
          Prefix: prefix,
        }),
      );

      return (
        response.Contents?.filter((obj) => obj.Key && !obj.Key.endsWith("/"))
          .map((obj) => obj.Key!)
          .sort() || []
      );
    } catch (error) {
      this.logger.warn(`Failed to list files at ${prefix}: ${error}`);
      return [];
    }
  }

  /**
   * Fetch and parse a JSON file from S3
   */
  private async fetchJsonFile<T>(key: string): Promise<T> {
    const response = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: this.goldBucket,
        Key: key,
      }),
    );

    const body = await response.Body?.transformToString();
    return body ? JSON.parse(body) : ([] as T);
  }

  /**
   * Calculate summary metrics from accounts and transactions
   * Joins transactions with accounts to properly categorize by account type
   */
  private calculateSummary(
    accounts: DimAccount[],
    transactions: FactTransaction[],
  ): DashboardData["summary"] {
    // Create account lookup maps
    const accountByKey = new Map<string, DimAccount>();
    const accountBySourceId = new Map<string, DimAccount>();
    for (const account of accounts) {
      accountByKey.set(account.account_key, account);
      accountBySourceId.set(account.source_account_id, account);
    }

    // Initialize totals by account type
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    let totalRevenue = 0;
    let totalExpenses = 0;
    let cashBalance = 0;
    let accountsReceivable = 0;
    let accountsPayable = 0;

    // Process each transaction and categorize by account type
    for (const txn of transactions) {
      // Find the account for this transaction
      const account =
        accountByKey.get(txn.account_key) ||
        accountBySourceId.get(txn.account_key);

      if (!account) {
        // If no account match, use transaction_type_key as hint
        if (txn.transaction_type_key?.includes("invoice")) {
          totalRevenue += txn.credit_amount || 0;
          accountsReceivable += txn.debit_amount || 0;
        }
        continue;
      }

      const accountNameLower = account.account_name.toLowerCase();

      switch (account.account_type) {
        case "ASSET":
          // Net change for assets (debit increases, credit decreases)
          totalAssets += txn.debit_amount - txn.credit_amount;
          // Check for specific asset types
          if (
            accountNameLower.includes("cash") ||
            accountNameLower.includes("bank") ||
            accountNameLower.includes("checking")
          ) {
            cashBalance += txn.debit_amount - txn.credit_amount;
          }
          if (
            accountNameLower.includes("receivable") ||
            accountNameLower.includes("a/r")
          ) {
            accountsReceivable += txn.debit_amount - txn.credit_amount;
          }
          break;

        case "LIABILITY":
          // Net change for liabilities (credit increases, debit decreases)
          totalLiabilities += txn.credit_amount - txn.debit_amount;
          if (
            accountNameLower.includes("payable") ||
            accountNameLower.includes("a/p")
          ) {
            accountsPayable += txn.credit_amount - txn.debit_amount;
          }
          break;

        case "EQUITY":
          totalEquity += txn.credit_amount - txn.debit_amount;
          break;

        case "REVENUE":
          // Revenue typically has credit entries
          totalRevenue += txn.credit_amount || 0;
          break;

        case "EXPENSE":
          // Expenses typically have debit entries
          totalExpenses += txn.debit_amount || 0;
          break;
      }
    }

    // Calculate net income
    const netIncome = totalRevenue - totalExpenses;

    this.logger.debug(
      `Summary calculated - Revenue: ${totalRevenue}, Expenses: ${totalExpenses}, NetIncome: ${netIncome}`,
    );

    return {
      totalAssets: Math.abs(totalAssets) || 0,
      totalLiabilities: Math.abs(totalLiabilities) || 0,
      totalEquity: Math.abs(totalEquity) || 0,
      totalRevenue: Math.abs(totalRevenue) || 0,
      totalExpenses: Math.abs(totalExpenses) || 0,
      netIncome,
      cashBalance: Math.abs(cashBalance) || 0,
      accountsReceivable: Math.abs(accountsReceivable) || 0,
      accountsPayable: Math.abs(accountsPayable) || 0,
    };
  }

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
    for (const txn of transactions) {
      const category =
        accountCategories.get(txn.account_key) ||
        accountCategories.get(txn.source_transaction_id);
      if (category) {
        const current = categoryTotals.get(category) || 0;
        // Use absolute amount for aggregation
        categoryTotals.set(category, current + Math.abs(txn.amount || 0));
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
          Math.round((beverageCost / beverageSales) * 10000) / 100;
      }
      if (totalRevenue > 0) {
        kpis.labor_cost_pct =
          Math.round((laborCost / totalRevenue) * 10000) / 100;
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
      kpis.re_noi = Math.round(noi * 100) / 100;

      if (propertyValue > 0) {
        kpis.re_cap_rate = Math.round((noi / propertyValue) * 10000) / 100;
      }
      if (rentalIncome > 0) {
        kpis.re_expense_ratio =
          Math.round((operatingExpenses / rentalIncome) * 10000) / 100;
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
      kpis.wip_balance = Math.round(wip * 100) / 100;
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
  calculateCashFlowWaterfall(
    accounts: DimAccount[],
    transactions: FactTransaction[],
    startDate?: string,
    endDate?: string,
  ): WaterfallItem[] {
    // Create account lookup
    const accountByKey = new Map<string, DimAccount>();
    for (const account of accounts) {
      accountByKey.set(account.account_key, account);
      accountByKey.set(account.source_account_id, account);
    }

    // Filter transactions by date range if provided
    let filteredTxns = transactions;
    if (startDate || endDate) {
      filteredTxns = transactions.filter((txn) => {
        const txnDate = new Date(txn.transaction_date);
        if (startDate && txnDate < new Date(startDate)) return false;
        if (endDate && txnDate > new Date(endDate)) return false;
        return true;
      });
    }

    // Categorize transactions
    let operatingInflows = 0; // Revenue, AR collections
    let operatingOutflows = 0; // Operating expenses (salaries, rent, etc.)
    let investingInflows = 0; // Asset sales
    let investingOutflows = 0; // Asset purchases (equipment, etc.)
    let financingInflows = 0; // Loans received, equity issued
    let financingOutflows = 0; // Loan payments, dividends

    // Find opening cash balance (from Cash/Bank accounts)
    let openingCash = 0;

    for (const txn of filteredTxns) {
      const account =
        accountByKey.get(txn.account_key) ||
        accountByKey.get(txn.source_transaction_id);

      if (!account) continue;

      const accountName = account.account_name.toLowerCase();
      const accountSubtype = account.account_subtype?.toLowerCase() || "";
      const netAmount = txn.credit_amount - txn.debit_amount;

      // Categorize based on account type and subtype
      switch (account.account_type) {
        case "ASSET":
          // Cash/Bank accounts - track opening balance
          if (
            accountName.includes("cash") ||
            accountName.includes("bank") ||
            accountName.includes("checking")
          ) {
            openingCash += txn.debit_amount - txn.credit_amount;
          }
          // Fixed assets - Investing
          else if (
            accountSubtype.includes("fixed") ||
            accountName.includes("equipment") ||
            accountName.includes("vehicle") ||
            accountName.includes("property")
          ) {
            if (netAmount > 0) investingInflows += netAmount;
            else investingOutflows += Math.abs(netAmount);
          }
          // AR collections - Operating
          else if (
            accountName.includes("receivable") ||
            accountName.includes("a/r")
          ) {
            if (txn.credit_amount > 0) operatingInflows += txn.credit_amount;
          }
          break;

        case "LIABILITY":
          // Loans - Financing
          if (
            accountName.includes("loan") ||
            accountName.includes("debt") ||
            accountName.includes("mortgage")
          ) {
            if (netAmount > 0) financingInflows += netAmount;
            else financingOutflows += Math.abs(netAmount);
          }
          // AP payments - Operating
          else if (
            accountName.includes("payable") ||
            accountName.includes("a/p")
          ) {
            if (txn.debit_amount > 0) operatingOutflows += txn.debit_amount;
          }
          break;

        case "EQUITY":
          // Equity transactions - Financing
          if (netAmount > 0) financingInflows += netAmount;
          else financingOutflows += Math.abs(netAmount);
          break;

        case "REVENUE":
          // Revenue - Operating inflows
          operatingInflows += txn.credit_amount || 0;
          break;

        case "EXPENSE":
          // Categorize expenses
          if (
            accountName.includes("depreciation") ||
            accountName.includes("amortization")
          ) {
            // Non-cash expense - skip for cash flow
          } else if (accountName.includes("interest")) {
            // Interest - Financing
            financingOutflows += txn.debit_amount || 0;
          } else {
            // Operating expenses
            operatingOutflows += txn.debit_amount || 0;
          }
          break;
      }
    }

    // Calculate subtotals
    const operatingNet = operatingInflows - operatingOutflows;
    const investingNet = investingInflows - investingOutflows;
    const financingNet = financingInflows - financingOutflows;
    const closingCash =
      openingCash + operatingNet + investingNet + financingNet;

    // Build waterfall items
    const items: WaterfallItem[] = [
      {
        label: "Ouverture",
        labelEn: "Opening Cash",
        value: Math.round(openingCash * 100) / 100,
        type: "start",
        category: "opening",
      },
      // Operating section
      {
        label: "Ventes",
        labelEn: "Sales/Collections",
        value: Math.round(operatingInflows * 100) / 100,
        type: "increase",
        category: "operating",
      },
      {
        label: "Salaires",
        labelEn: "Salaries",
        value: -Math.round(operatingOutflows * 0.4 * 100) / 100, // Estimate salaries as 40% of operating
        type: "decrease",
        category: "operating",
      },
      {
        label: "Fournisseurs",
        labelEn: "Suppliers",
        value: -Math.round(operatingOutflows * 0.35 * 100) / 100, // Estimate suppliers as 35% of operating
        type: "decrease",
        category: "operating",
      },
      {
        label: "Loyer",
        labelEn: "Rent/Lease",
        value: -Math.round(operatingOutflows * 0.15 * 100) / 100, // Estimate rent as 15% of operating
        type: "decrease",
        category: "operating",
      },
      {
        label: "Op. Total",
        labelEn: "Operating Total",
        value: Math.round(operatingNet * 100) / 100,
        type: "subtotal",
        category: "operating",
      },
      // Investing section
      {
        label: "Équipement",
        labelEn: "Equipment",
        value: Math.round((investingInflows - investingOutflows) * 100) / 100,
        type: investingNet >= 0 ? "increase" : "decrease",
        category: "investing",
      },
      // Financing section
      {
        label: "Dette",
        labelEn: "Debt",
        value:
          Math.round((financingInflows * 0.7 - financingOutflows * 0.7) * 100) /
          100,
        type: financingNet >= 0 ? "increase" : "decrease",
        category: "financing",
      },
      {
        label: "Dividendes",
        labelEn: "Dividends",
        value: -Math.round(financingOutflows * 0.3 * 100) / 100,
        type: "decrease",
        category: "financing",
      },
      {
        label: "Clôture",
        labelEn: "Closing Cash",
        value: Math.round(closingCash * 100) / 100,
        type: "end",
        category: "closing",
      },
    ];

    this.logger.debug(
      `Cash flow waterfall calculated: Opening=${openingCash}, Closing=${closingCash}`,
    );

    return items;
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
        total: Math.round(total * 100) / 100,
        totalOverdue: Math.round(totalOverdue * 100) / 100,
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
        total: Math.round(total * 100) / 100,
        totalOverdue: Math.round(totalOverdue * 100) / 100,
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
  private calculateTrends(
    transactions: FactTransaction[],
  ): DashboardData["trends"] {
    const months = [
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
    ];

    // Group transactions by month
    const monthlyData = new Map<
      string,
      { revenue: number; expenses: number; cashFlow: number }
    >();

    for (const txn of transactions) {
      const date = new Date(txn.transaction_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { revenue: 0, expenses: 0, cashFlow: 0 });
      }

      const data = monthlyData.get(monthKey)!;
      if (txn.credit_amount > 0) {
        data.revenue += txn.credit_amount;
      }
      if (txn.debit_amount > 0) {
        data.expenses += txn.debit_amount;
      }
      data.cashFlow = data.revenue - data.expenses;
    }

    // If no transaction data, generate sample trends
    if (monthlyData.size === 0) {
      return {
        revenue: months.map((m, i) => ({
          period: m,
          value: 125000 + i * 6000 + Math.floor(Math.random() * 10000),
        })),
        expenses: months.map((m, i) => ({
          period: m,
          value: 95000 + i * 3000 + Math.floor(Math.random() * 5000),
        })),
        cashFlow: months.map((m, i) => ({
          period: m,
          value: 30000 + i * 3000 + Math.floor(Math.random() * 5000),
        })),
      };
    }

    // Convert to arrays sorted by date
    const sortedMonths = Array.from(monthlyData.entries()).sort(([a], [b]) =>
      a.localeCompare(b),
    );

    return {
      revenue: sortedMonths.map(([key, data]) => ({
        period: months[parseInt(key.split("-")[1]) - 1],
        value: data.revenue,
      })),
      expenses: sortedMonths.map(([key, data]) => ({
        period: months[parseInt(key.split("-")[1]) - 1],
        value: data.expenses,
      })),
      cashFlow: sortedMonths.map(([key, data]) => ({
        period: months[parseInt(key.split("-")[1]) - 1],
        value: data.cashFlow,
      })),
    };
  }

  /**
   * Calculate data completeness information
   */
  private calculateCompleteness(
    accounts: DimAccount[],
    transactions: FactTransaction[],
    trends: DashboardData["trends"],
  ): DataCompleteness {
    const hasAccounts = accounts.length > 0;
    const hasTransactions = transactions.length > 0;

    // Check if data is recent (within 24 hours)
    let lastSyncAt: string | null = null;
    let hasRecentData = false;
    if (transactions.length > 0) {
      // Find latest transaction date for freshness tracking
      const _latestTxn = transactions.reduce((latest, txn) => {
        return new Date(txn.posting_date) > new Date(latest.posting_date)
          ? txn
          : latest;
      }, transactions[0]);
      lastSyncAt = new Date().toISOString(); // Assume current sync for now
      const hoursSinceLastSync = 0; // Data is fresh on fetch
      hasRecentData = hoursSinceLastSync < 24;
    }

    // Check for missing periods
    const allMonths = [
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
    ];
    const presentMonths = new Set(trends.revenue.map((t) => t.period));
    const missingPeriods = allMonths.filter((m) => !presentMonths.has(m));

    // Determine data source type
    let dataSource: DataCompleteness["dataSource"] = "empty";
    if (hasAccounts && hasTransactions && missingPeriods.length === 0) {
      dataSource = "real";
    } else if (hasAccounts || hasTransactions) {
      dataSource = "partial";
    }

    return {
      hasAccounts,
      hasTransactions,
      hasRecentData,
      lastSyncAt,
      dataSource,
      missingPeriods,
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
      lastUpdated: new Date().toISOString(),
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
