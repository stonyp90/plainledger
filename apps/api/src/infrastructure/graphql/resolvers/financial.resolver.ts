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
import { Resolver, Query, Args, Context } from "@nestjs/graphql";
import { UseGuards, Logger, Injectable, Inject } from "@nestjs/common";
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
} from "../types";
import {
  DatalakeDataService,
  DashboardData,
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

@Resolver()
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

      return metrics.map((metric) => {
        const key = metric.toLowerCase() as keyof typeof trends;
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
