/**
 * Financial Resolver
 *
 * GraphQL resolver for financial data queries and mutations.
 * Follows clean architecture: resolvers are thin adapters that delegate to services.
 *
 * Security:
 * - All queries require authentication via GqlAuthGuard
 * - Data is scoped to the user's organization (tenant isolation)
 * - Rate limiting applied to prevent abuse
 */
import { Resolver, Query, Args, Context, Mutation } from "@nestjs/graphql";
import { UseGuards, Logger, Injectable, Inject } from "@nestjs/common";
import { Unprotected } from "nest-keycloak-connect";
import { GqlAuthGuard } from "../guards/gql-auth.guard";
import { IDatalakeDataService } from "@application/ports/outbound/IDatalakeDataService";
import {
  DashboardSummary,
  FinancialTrend,
  Account,
  Transaction,
  BalanceSheet,
  IncomeStatement,
  DashboardFilterInput,
  AccountFilterInput,
  TransactionFilterInput,
  DateRangeInput,
  PaginationInput,
  TrendDirection,
  AccountType,
  MetricWithTrend,
  PageInfo,
  BalanceSheetLine,
  IndustryKPIsResponse,
  IndustryKPI,
  TrialBalance,
  WaterfallItem,
  AgingReport,
  BudgetSettings,
  SaveBudgetInput,
  TaxDeadlinesResponse,
  TaxDeadline,
  DEFAULT_BUDGET_CATEGORIES,
} from "../types";
import { getIndustryMapping } from "@domain/datalake/industry-account-mapping";
import {
  DatalakeDataService,
  DimAccount,
  FactTransaction,
} from "@infrastructure/services/datalake-data.service";
import { GenerateBalanceSheetUseCase } from "@application/use-cases/generate-balance-sheet.use-case";

// Paginated response wrapper
import { ObjectType, Field } from "@nestjs/graphql";

@ObjectType({ description: "Paginated accounts response" })
class AccountsConnection {
  @Field(() => [Account])
  nodes: Account[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;
}

@ObjectType({ description: "Paginated transactions response" })
class TransactionsConnection {
  @Field(() => [Transaction])
  nodes: Transaction[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;
}

/**
 * SECURITY NOTE: @Unprotected() bypasses the global Keycloak guard to allow
 * the custom GqlAuthGuard to handle authentication. The GqlAuthGuard has
 * built-in security that:
 * - NEVER skips auth in production (NODE_ENV=production)
 * - Only allows SKIP_AUTH in development environments
 * - Logs security warnings if misconfigured
 */
@Resolver()
@Unprotected()
@UseGuards(GqlAuthGuard)
@Injectable()
export class FinancialResolver {
  private readonly logger = new Logger(FinancialResolver.name);

  constructor(
    @Inject("IDatalakeDataService")
    private readonly datalakeService: IDatalakeDataService,
    private readonly balanceSheetUseCase: GenerateBalanceSheetUseCase,
  ) {}

  // =====================================================
  // DASHBOARD QUERIES
  // =====================================================

  @Query(() => DashboardSummary, {
    name: "dashboardSummary",
    description: "Get financial dashboard summary with key metrics",
  })
  async getDashboardSummary(
    @Args("filter", { nullable: true }) filter?: DashboardFilterInput,
    @Context() context?: { req: { user: { organizationId: string } } },
  ): Promise<DashboardSummary> {
    const organizationId = context?.req?.user?.organizationId || "default";
    this.logger.log(`Fetching dashboard summary for org: ${organizationId}`);

    try {
      const data = await this.datalakeService.getDashboardData(organizationId);
      const summary = data.summary;

      // Map to GraphQL type
      return {
        totalRevenue: { amount: summary.totalRevenue, currency: "CAD" },
        totalExpenses: { amount: summary.totalExpenses, currency: "CAD" },
        netIncome: { amount: summary.netIncome, currency: "CAD" },
        cashOnHand: { amount: summary.cashBalance || 0, currency: "CAD" },
        accountsReceivable: {
          amount: summary.accountsReceivable || 0,
          currency: "CAD",
        },
        accountsPayable: {
          amount: summary.accountsPayable || 0,
          currency: "CAD",
        },
        cashFlow: {
          inflows: { amount: summary.totalRevenue, currency: "CAD" },
          outflows: { amount: summary.totalExpenses, currency: "CAD" },
          netCashFlow: {
            amount: summary.totalRevenue - summary.totalExpenses,
            currency: "CAD",
          },
          changePercent: 0,
          trend: TrendDirection.FLAT,
        },
        keyMetrics: this.buildKeyMetrics(summary),
        asOfDate: new Date(),
        periodLabel: filter?.period || "This Month",
      };
    } catch (error) {
      this.logger.error(`Failed to fetch dashboard: ${error}`);
      throw error;
    }
  }

  @Query(() => [FinancialTrend], {
    name: "financialTrends",
    description: "Get financial trend data for charts",
  })
  async getFinancialTrends(
    @Args("metrics", { type: () => [String] }) metrics: string[],
    @Args("dateRange", { nullable: true }) dateRange?: DateRangeInput,
    @Context() context?: { req: { user: { organizationId: string } } },
  ): Promise<FinancialTrend[]> {
    const organizationId = context?.req?.user?.organizationId || "default";
    this.logger.log(
      `Fetching trends for org: ${organizationId}, metrics: ${metrics.join(", ")}`,
    );

    try {
      const data = await this.datalakeService.getDashboardData(organizationId);
      const trends = data.trends;

      // Type-safe metric key mapping to handle case variations
      const METRIC_KEYS: Record<string, keyof typeof trends> = {
        revenue: "revenue",
        expenses: "expenses",
        cashflow: "cashFlow",
        cashFlow: "cashFlow",
      };

      return metrics.map((metric) => {
        // Look up the correct key, handling case variations
        const key =
          METRIC_KEYS[metric] ||
          METRIC_KEYS[metric.toLowerCase()] ||
          (metric.toLowerCase() as keyof typeof trends);
        const trendData = trends[key] || [];
        const periodChange = this.calculatePeriodChange(trendData);

        return {
          metricName: metric,
          data: trendData.map((point: { period: string; value: number }) => ({
            date: point.period,
            value: point.value,
          })),
          periodChangePercent: periodChange,
          trend: this.calculateTrend(periodChange),
        };
      });
    } catch (error) {
      this.logger.error(`Failed to fetch trends: ${error}`);
      throw error;
    }
  }

  // =====================================================
  // ACCOUNT QUERIES
  // =====================================================

  @Query(() => AccountsConnection, {
    name: "accounts",
    description: "Get paginated list of accounts",
  })
  async getAccounts(
    @Args("filter", { nullable: true }) filter?: AccountFilterInput,
    @Args("pagination", { nullable: true }) pagination?: PaginationInput,
    @Context() context?: { req: { user: { organizationId: string } } },
  ): Promise<AccountsConnection> {
    const organizationId = context?.req?.user?.organizationId || "default";
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;

    this.logger.log(`Fetching accounts for org: ${organizationId}`);

    try {
      const data = await this.datalakeService.getDashboardData(organizationId);
      let accounts = data.accounts;

      // Apply filters
      if (filter?.types?.length) {
        accounts = accounts.filter((a: DimAccount) =>
          filter.types!.includes(a.account_type as AccountType),
        );
      }
      if (filter?.search) {
        const search = filter.search.toLowerCase();
        accounts = accounts.filter(
          (a: DimAccount) =>
            a.account_name.toLowerCase().includes(search) ||
            a.account_code.toLowerCase().includes(search),
        );
      }
      if (filter?.isActive !== undefined) {
        accounts = accounts.filter(
          (a: DimAccount) => a.is_active === filter.isActive,
        );
      }

      // Paginate
      const totalCount = accounts.length;
      const totalPages = Math.ceil(totalCount / pageSize);
      const start = (page - 1) * pageSize;
      const paginatedAccounts = accounts.slice(start, start + pageSize);

      return {
        nodes: paginatedAccounts.map((a: DimAccount) => ({
          id: a.account_key,
          code: a.account_code,
          name: a.account_name,
          type: a.account_type as AccountType,
          balance: 0, // Would come from balances
          currency: "CAD",
          isActive: a.is_active,
        })),
        pageInfo: {
          totalCount,
          pageSize,
          currentPage: page,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to fetch accounts: ${error}`);
      throw error;
    }
  }

  @Query(() => Account, {
    name: "account",
    description: "Get a single account by ID",
    nullable: true,
  })
  async getAccount(
    @Args("id") id: string,
    @Context() context?: { req: { user: { organizationId: string } } },
  ): Promise<Account | null> {
    const organizationId = context?.req?.user?.organizationId || "default";
    this.logger.log(`Fetching account ${id} for org: ${organizationId}`);

    try {
      const data = await this.datalakeService.getDashboardData(organizationId);
      const account = data.accounts.find(
        (a: DimAccount) => a.account_key === id,
      );

      if (!account) return null;

      return {
        id: account.account_key,
        code: account.account_code,
        name: account.account_name,
        type: account.account_type as AccountType,
        balance: 0,
        currency: "CAD",
        isActive: account.is_active,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch account: ${error}`);
      throw error;
    }
  }

  // =====================================================
  // TRANSACTION QUERIES
  // =====================================================

  @Query(() => TransactionsConnection, {
    name: "transactions",
    description: "Get paginated list of transactions",
  })
  async getTransactions(
    @Args("filter", { nullable: true }) filter?: TransactionFilterInput,
    @Args("pagination", { nullable: true }) pagination?: PaginationInput,
    @Context() context?: { req: { user: { organizationId: string } } },
  ): Promise<TransactionsConnection> {
    const organizationId = context?.req?.user?.organizationId || "default";
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;

    this.logger.log(`Fetching transactions for org: ${organizationId}`);

    try {
      const data = await this.datalakeService.getDashboardData(organizationId);
      let transactions = data.transactions;

      // Apply filters
      if (filter?.dateRange) {
        const startDate = new Date(filter.dateRange.startDate);
        const endDate = new Date(filter.dateRange.endDate);
        transactions = transactions.filter((t: FactTransaction) => {
          const date = new Date(t.transaction_date);
          return date >= startDate && date <= endDate;
        });
      }
      if (filter?.minAmount !== undefined) {
        transactions = transactions.filter(
          (t: FactTransaction) => Math.abs(t.amount) >= filter.minAmount!,
        );
      }
      if (filter?.maxAmount !== undefined) {
        transactions = transactions.filter(
          (t: FactTransaction) => Math.abs(t.amount) <= filter.maxAmount!,
        );
      }
      if (filter?.search) {
        const search = filter.search.toLowerCase();
        transactions = transactions.filter(
          (t: FactTransaction) =>
            t.memo?.toLowerCase().includes(search) ||
            t.reference_number?.toLowerCase().includes(search),
        );
      }

      // Paginate
      const totalCount = transactions.length;
      const totalPages = Math.ceil(totalCount / pageSize);
      const start = (page - 1) * pageSize;
      const paginatedTransactions = transactions.slice(start, start + pageSize);

      return {
        nodes: paginatedTransactions.map((t: FactTransaction) => ({
          id: t.transaction_key,
          type: "JOURNAL" as any,
          date: new Date(t.transaction_date),
          amount: t.amount,
          currency: t.currency_code || "CAD",
          description: t.memo,
          reference: t.reference_number,
          lines: [],
          createdAt: new Date(t.posting_date),
        })),
        pageInfo: {
          totalCount,
          pageSize,
          currentPage: page,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to fetch transactions: ${error}`);
      throw error;
    }
  }

  // =====================================================
  // REPORT QUERIES
  // =====================================================

  @Query(() => BalanceSheet, {
    name: "balanceSheet",
    description: "Generate balance sheet report",
  })
  async getBalanceSheet(
    @Args("asOfDate", { nullable: true }) asOfDate?: Date,
    @Context() context?: { req: { user: { organizationId: string } } },
  ): Promise<BalanceSheet> {
    const organizationId = context?.req?.user?.organizationId || "default";
    const reportDate = asOfDate || new Date();

    this.logger.log(`Generating balance sheet for org: ${organizationId}`);

    try {
      const result = await this.balanceSheetUseCase.execute({
        tenantId: organizationId,
        asOfDate: reportDate,
      });

      // Flatten the balance sheet sections into line items
      const flattenSection = (
        section: {
          items: Array<{
            accountCode: string;
            accountName: string;
            currentBalance: number;
          }>;
        },
        accountType: AccountType,
      ): BalanceSheetLine[] => {
        return section.items.map((item) => ({
          accountCode: item.accountCode,
          accountName: item.accountName,
          accountType,
          balance: item.currentBalance,
          level: 0,
          isSubtotal: false,
        }));
      };

      return {
        asOfDate: reportDate,
        organizationName: result.organizationName,
        assets: [
          ...flattenSection(result.assets.currentAssets, AccountType.ASSET),
          ...flattenSection(result.assets.fixedAssets, AccountType.ASSET),
        ],
        liabilities: [
          ...flattenSection(
            result.liabilities.currentLiabilities,
            AccountType.LIABILITY,
          ),
          ...flattenSection(
            result.liabilities.longTermLiabilities,
            AccountType.LIABILITY,
          ),
        ],
        equity: result.equity.items.map((item) => ({
          accountCode: item.accountCode,
          accountName: item.accountName,
          accountType: AccountType.EQUITY,
          balance: item.currentBalance,
          level: 0,
          isSubtotal: false,
        })),
        totalAssets: result.assets.totalAssets,
        totalLiabilities: result.liabilities.totalLiabilities,
        totalEquity: result.equity.totalEquity,
        currency: result.currency,
      };
    } catch (error) {
      this.logger.error(`Failed to generate balance sheet: ${error}`);
      throw error;
    }
  }

  @Query(() => IncomeStatement, {
    name: "incomeStatement",
    description: "Generate income statement report",
  })
  async getIncomeStatement(
    @Args("dateRange") dateRange: DateRangeInput,
    @Context() context?: { req: { user: { organizationId: string } } },
  ): Promise<IncomeStatement> {
    const organizationId = context?.req?.user?.organizationId || "default";

    this.logger.log(`Generating income statement for org: ${organizationId}`);

    try {
      const data = await this.datalakeService.getDashboardData(organizationId);
      const summary = data.summary;

      return {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        organizationName: data.organizationName,
        revenue: [
          {
            accountCode: "4000",
            accountName: "Total Revenue",
            amount: summary.totalRevenue,
            level: 0,
          },
        ],
        expenses: [
          {
            accountCode: "5000",
            accountName: "Total Expenses",
            amount: summary.totalExpenses,
            level: 0,
          },
        ],
        grossRevenue: summary.totalRevenue,
        totalExpenses: summary.totalExpenses,
        netIncome: summary.netIncome,
        currency: "CAD",
      };
    } catch (error) {
      this.logger.error(`Failed to generate income statement: ${error}`);
      throw error;
    }
  }

  // =====================================================
  // INDUSTRY KPI QUERIES
  // =====================================================

  @Query(() => IndustryKPIsResponse, {
    name: "industryKPIs",
    description: "Get industry-specific KPIs for the organization",
  })
  async getIndustryKPIs(
    @Args("industryId") industryId: string,
    @Args("dateRange", { nullable: true }) dateRange?: DateRangeInput,
    @Context() context?: { req: { user: { organizationId: string } } },
  ): Promise<IndustryKPIsResponse> {
    const organizationId = context?.req?.user?.organizationId || "default";
    this.logger.log(
      `Fetching industry KPIs for org: ${organizationId}, industry: ${industryId}`,
    );

    try {
      // Cast to access the calculateIndustryKPIs method
      const service = this.datalakeService as DatalakeDataService;
      const data = await service.getDashboardData(
        organizationId,
        undefined,
        industryId,
      );

      const mapping = getIndustryMapping(industryId);
      const industryName = mapping?.name?.en || industryId;

      // Build KPI list from industry mapping
      const kpis: IndustryKPI[] = [];
      const industryKPIs = data.industryKPIs || { industry: industryId };

      if (mapping) {
        for (const kpiDef of mapping.kpis) {
          const value = (industryKPIs as unknown as Record<string, unknown>)[
            kpiDef.id
          ] as number | undefined;
          let status = "unknown";

          if (value !== undefined && kpiDef.benchmark) {
            if (value < kpiDef.benchmark.min) status = "below";
            else if (value > kpiDef.benchmark.max) status = "above";
            else status = "on_target";
          }

          kpis.push({
            id: kpiDef.id,
            name: kpiDef.name.en,
            value,
            format: kpiDef.format,
            benchmarkMin: kpiDef.benchmark?.min,
            benchmarkMax: kpiDef.benchmark?.max,
            status: value !== undefined ? status : undefined,
          });
        }
      }

      // Build response with type-specific KPIs
      const response: IndustryKPIsResponse = {
        industry: industryId,
        industryName,
        kpis,
        asOfDate: new Date(),
      };

      // Add industry-specific nested object
      switch (industryId) {
        case "restaurant":
          response.restaurant = {
            foodCostPct: industryKPIs.food_cost_pct,
            beverageCostPct: industryKPIs.beverage_cost_pct,
            laborCostPct: industryKPIs.labor_cost_pct,
            primeCostPct: industryKPIs.prime_cost_pct,
          };
          break;
        case "retail":
          response.retail = {
            grossMarginPct: industryKPIs.gross_margin_pct,
            inventoryTurnover: industryKPIs.inventory_turnover,
          };
          break;
        case "real_estate":
          response.realEstate = {
            capRate: industryKPIs.re_cap_rate,
            noi: industryKPIs.re_noi,
            expenseRatio: industryKPIs.re_expense_ratio,
          };
          break;
        case "construction":
          response.construction = {
            jobMarginPct: industryKPIs.job_margin_pct,
            wipBalance: industryKPIs.wip_balance,
          };
          break;
        case "professional_services":
          response.professionalServices = {
            utilizationRate: industryKPIs.utilization_rate,
            arDays: industryKPIs.ar_days,
          };
          break;
      }

      return response;
    } catch (error) {
      this.logger.error(`Failed to fetch industry KPIs: ${error}`);
      throw error;
    }
  }

  // =====================================================
  // REAL DATA QUERIES - Trial Balance, Aging, Waterfall
  // =====================================================

  @Query(() => TrialBalance, {
    name: "trialBalance",
    description: "Get trial balance calculated from real transactions",
  })
  async getTrialBalance(
    @Context() context?: { req: { user: { organizationId: string } } },
  ): Promise<TrialBalance> {
    const organizationId = context?.req?.user?.organizationId || "default";
    this.logger.log(`Fetching trial balance for org: ${organizationId}`);

    try {
      const data = await this.datalakeService.getDashboardData(organizationId);

      // Cast to DatalakeDataService to access the calculate method
      const service = this.datalakeService as DatalakeDataService;
      const trialBalance = service.calculateTrialBalance(
        data.accounts,
        data.transactions,
      );

      return trialBalance;
    } catch (error) {
      this.logger.error(`Failed to fetch trial balance: ${error}`);
      throw error;
    }
  }

  @Query(() => [WaterfallItem], {
    name: "cashFlowWaterfall",
    description: "Get cash flow waterfall data derived from transactions",
  })
  async getCashFlowWaterfall(
    @Args("startDate", { nullable: true }) startDate?: string,
    @Args("endDate", { nullable: true }) endDate?: string,
    @Context() context?: { req: { user: { organizationId: string } } },
  ): Promise<WaterfallItem[]> {
    const organizationId = context?.req?.user?.organizationId || "default";
    this.logger.log(`Fetching cash flow waterfall for org: ${organizationId}`);

    try {
      const data = await this.datalakeService.getDashboardData(organizationId);

      // Cast to DatalakeDataService to access the calculate method
      const service = this.datalakeService as DatalakeDataService;
      const waterfall = service.calculateCashFlowWaterfall(
        data.accounts,
        data.transactions,
        startDate,
        endDate,
      );

      return waterfall;
    } catch (error) {
      this.logger.error(`Failed to fetch cash flow waterfall: ${error}`);
      throw error;
    }
  }

  @Query(() => AgingReport, {
    name: "receivablesAging",
    description: "Get AR aging from invoices/transactions - real data",
  })
  async getReceivablesAging(
    @Context() context?: { req: { user: { organizationId: string } } },
  ): Promise<AgingReport> {
    const organizationId = context?.req?.user?.organizationId || "default";
    this.logger.log(`Fetching AR aging for org: ${organizationId}`);

    try {
      const data = await this.datalakeService.getDashboardData(organizationId);

      // Cast to DatalakeDataService to access the calculate method
      const service = this.datalakeService as DatalakeDataService;
      const aging = service.calculateARaging(
        data.accounts,
        data.transactions,
        data.contacts,
      );

      return aging;
    } catch (error) {
      this.logger.error(`Failed to fetch AR aging: ${error}`);
      throw error;
    }
  }

  @Query(() => AgingReport, {
    name: "payablesAging",
    description:
      "Get AP aging from bills/transactions - real data (empty if no bills tracked)",
  })
  async getPayablesAging(
    @Context() context?: { req: { user: { organizationId: string } } },
  ): Promise<AgingReport> {
    const organizationId = context?.req?.user?.organizationId || "default";
    this.logger.log(`Fetching AP aging for org: ${organizationId}`);

    try {
      const data = await this.datalakeService.getDashboardData(organizationId);

      // Cast to DatalakeDataService to access the calculate method
      const service = this.datalakeService as DatalakeDataService;
      const aging = service.calculateAPaging(
        data.accounts,
        data.transactions,
        data.contacts,
      );

      return aging;
    } catch (error) {
      this.logger.error(`Failed to fetch AP aging: ${error}`);
      throw error;
    }
  }

  // =====================================================
  // BUDGET QUERIES
  // =====================================================

  @Query(() => BudgetSettings, {
    name: "budgetSettings",
    description: "Get organization budget settings",
  })
  async getBudgetSettings(
    @Context() context?: { req: { user: { organizationId: string } } },
  ): Promise<BudgetSettings> {
    const organizationId = context?.req?.user?.organizationId || "default";
    this.logger.log(`Fetching budget settings for org: ${organizationId}`);

    // TODO: Fetch from database when OrganizationSettingsRepository is available
    // For now, return empty budget with default categories
    const currentYear = new Date().getFullYear();

    return {
      year: currentYear,
      categories: DEFAULT_BUDGET_CATEGORIES.map((cat) => ({
        ...cat,
        monthlyAmount: 0,
      })),
      hasBudget: false, // No budget configured yet
    };
  }

  @Mutation(() => BudgetSettings, {
    name: "saveBudget",
    description: "Save organization budget settings",
  })
  async saveBudget(
    @Args("input") input: SaveBudgetInput,
    @Context()
    context?: { req: { user: { organizationId: string; email: string } } },
  ): Promise<BudgetSettings> {
    const organizationId = context?.req?.user?.organizationId || "default";
    const userEmail = context?.req?.user?.email || "unknown";
    this.logger.log(`Saving budget for org: ${organizationId}`);

    // TODO: Save to database when OrganizationSettingsRepository is available
    // For now, just return the input as confirmation

    return {
      year: input.year,
      categories: input.categories,
      lastUpdated: new Date().toISOString(),
      updatedBy: userEmail,
      hasBudget: input.categories.some((c) => c.monthlyAmount > 0),
    };
  }

  // =====================================================
  // TAX DEADLINES QUERIES
  // =====================================================

  @Query(() => TaxDeadlinesResponse, {
    name: "taxDeadlines",
    description: "Get upcoming tax deadlines based on fiscal year and province",
  })
  async getTaxDeadlines(
    @Context() context?: { req: { user: { organizationId: string } } },
  ): Promise<TaxDeadlinesResponse> {
    const organizationId = context?.req?.user?.organizationId || "default";
    this.logger.log(`Fetching tax deadlines for org: ${organizationId}`);

    // TODO: Get fiscal year end and province from OrganizationSettings
    // For now, use defaults (December fiscal year end, Quebec)
    const fiscalYearEnd = "12"; // December
    const province = "QC";

    const deadlines = this.calculateTaxDeadlines(fiscalYearEnd, province);

    return {
      deadlines,
      fiscalYearEnd,
      province,
    };
  }

  /**
   * Calculate tax deadlines based on fiscal year end and province
   */
  private calculateTaxDeadlines(
    fiscalYearEndMonth: string,
    province: string,
  ): TaxDeadline[] {
    const today = new Date();
    const currentYear = today.getFullYear();
    const deadlines: TaxDeadline[] = [];

    // Parse fiscal year end month (1-12)
    const fyeMonth = parseInt(fiscalYearEndMonth) || 12;

    // Helper to calculate days remaining
    const calcDaysRemaining = (date: Date): number => {
      return Math.ceil(
        (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );
    };

    // Helper to determine status
    const getStatus = (daysRemaining: number): string => {
      if (daysRemaining < 0) return "overdue";
      if (daysRemaining <= 7) return "urgent";
      if (daysRemaining <= 30) return "upcoming";
      return "future";
    };

    // 1. GST/HST Filing - Quarterly or Annual based on revenue
    // Quarterly: Due 1 month after quarter end
    const nextQuarterEnd = new Date(
      currentYear,
      Math.ceil((today.getMonth() + 1) / 3) * 3,
      0,
    );
    const gstDue = new Date(nextQuarterEnd);
    gstDue.setMonth(gstDue.getMonth() + 1);
    gstDue.setDate(15); // Due 15th of month after quarter

    const gstDaysRemaining = calcDaysRemaining(gstDue);
    deadlines.push({
      id: "gst-quarterly",
      title: `Déclaration TPS/TVQ T${Math.ceil((today.getMonth() + 1) / 3)}`,
      titleEn: `GST/QST Return Q${Math.ceil((today.getMonth() + 1) / 3)}`,
      description:
        province === "QC"
          ? "TPS fédérale et TVQ provinciale"
          : "GST/HST Federal Return",
      dueDate: gstDue,
      daysRemaining: gstDaysRemaining,
      status: getStatus(gstDaysRemaining),
      category: "gst",
    });

    // 2. Payroll Remittances - 15th of following month
    const payrollDue = new Date(currentYear, today.getMonth() + 1, 15);
    const payrollDaysRemaining = calcDaysRemaining(payrollDue);
    deadlines.push({
      id: "payroll-monthly",
      title: "Remise DAS",
      titleEn: "Payroll Remittance",
      description: "Retenues à la source (impôt, RRQ, AE)",
      dueDate: payrollDue,
      daysRemaining: payrollDaysRemaining,
      status: getStatus(payrollDaysRemaining),
      category: "payroll",
    });

    // 3. Corporate Tax Return - 6 months after fiscal year end
    const corporateTaxDue = new Date(currentYear, fyeMonth + 5, 30);
    if (corporateTaxDue < today) {
      corporateTaxDue.setFullYear(currentYear + 1);
    }
    const corporateDaysRemaining = calcDaysRemaining(corporateTaxDue);
    deadlines.push({
      id: "corporate-tax",
      title: "Clôture exercice",
      titleEn: "Corporate Tax Return",
      description: "Déclaration de revenus des sociétés T2",
      dueDate: corporateTaxDue,
      daysRemaining: corporateDaysRemaining,
      status: getStatus(corporateDaysRemaining),
      category: "corporate",
    });

    // 4. T4/T5 Slips - End of February
    const t4Due = new Date(currentYear, 1, 28); // February 28
    if (t4Due < today) {
      t4Due.setFullYear(currentYear + 1);
    }
    const t4DaysRemaining = calcDaysRemaining(t4Due);
    deadlines.push({
      id: "t4-slips",
      title: "Feuillets T4",
      titleEn: "T4 Slips",
      description: "Relevés d'emploi pour employés",
      dueDate: t4Due,
      daysRemaining: t4DaysRemaining,
      status: getStatus(t4DaysRemaining),
      category: "payroll",
    });

    // Sort by days remaining (most urgent first)
    deadlines.sort((a, b) => a.daysRemaining - b.daysRemaining);

    return deadlines;
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  private calculateTrend(changePercent: number): TrendDirection {
    if (changePercent > 1) return TrendDirection.UP;
    if (changePercent < -1) return TrendDirection.DOWN;
    return TrendDirection.FLAT;
  }

  private calculatePeriodChange(data: { value: number }[]): number {
    if (data.length < 2) return 0;
    const current = data[data.length - 1].value;
    const previous = data[data.length - 2].value;
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }

  private buildKeyMetrics(summary: {
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
  }): MetricWithTrend[] {
    return [
      {
        name: "Revenue",
        currentValue: summary.totalRevenue,
        changePercent: 0,
        direction: TrendDirection.FLAT,
      },
      {
        name: "Expenses",
        currentValue: summary.totalExpenses,
        changePercent: 0,
        direction: TrendDirection.FLAT,
      },
      {
        name: "Net Income",
        currentValue: summary.netIncome,
        changePercent: 0,
        direction: TrendDirection.FLAT,
      },
    ];
  }
}
