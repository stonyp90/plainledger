import { KEYCLOAK_INSTANCE } from "nest-keycloak-connect";
/**
 * Financial Resolver Tests
 *
 * Unit tests for GraphQL financial operations.
 * Tests security, data validation, and business logic.
 */
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { FinancialResolver } from "../resolvers/financial.resolver";
import { GenerateBalanceSheetUseCase } from "@application/use-cases/generate-balance-sheet.use-case";
import { GenerateIncomeStatementUseCase } from "@application/use-cases/generate-income-statement.use-case";
import { TrendDirection, AccountType } from "../types";

// Mock the DatalakeDataService
jest.mock("@infrastructure/services/datalake-data.service", () => {
  return {
    DatalakeDataService: jest.fn().mockImplementation(() => ({
      getDashboardData: jest.fn().mockResolvedValue({
        organizationId: "org-123",
        organizationName: "Test Company",
        asOfDate: "2026-01-27",
        dataSource: "test",
        lastUpdated: "2026-01-27T12:00:00Z",
        accounts: [
          {
            account_key: "acc-1",
            account_code: "1000",
            account_name: "Cash",
            account_type: "ASSET",
            is_active: true,
          },
          {
            account_key: "acc-2",
            account_code: "1100",
            account_name: "Accounts Receivable",
            account_type: "ASSET",
            is_active: true,
          },
          {
            account_key: "acc-3",
            account_code: "2000",
            account_name: "Accounts Payable",
            account_type: "LIABILITY",
            is_active: true,
          },
          {
            account_key: "acc-4",
            account_code: "4000",
            account_name: "Revenue",
            account_type: "REVENUE",
            is_active: true,
          },
          {
            account_key: "acc-5",
            account_code: "5000",
            account_name: "Expenses",
            account_type: "EXPENSE",
            is_active: true,
          },
        ],
        contacts: [],
        transactions: [
          {
            transaction_key: "txn-1",
            transaction_date: "2026-01-15",
            amount: 5000,
            memo: "Invoice #001",
            reference_number: "INV-001",
            currency_code: "CAD",
            posting_date: "2026-01-15",
          },
          {
            transaction_key: "txn-2",
            transaction_date: "2026-01-16",
            amount: 3000,
            memo: "Payment received",
            reference_number: "PMT-001",
            currency_code: "CAD",
            posting_date: "2026-01-16",
          },
          {
            transaction_key: "txn-3",
            transaction_date: "2026-01-17",
            amount: 1500,
            memo: "Office supplies",
            reference_number: "EXP-001",
            currency_code: "CAD",
            posting_date: "2026-01-17",
          },
        ],
        balances: [],
        summary: {
          totalAssets: 70000,
          totalLiabilities: 15000,
          totalEquity: 55000,
          totalRevenue: 150000,
          totalExpenses: 95000,
          netIncome: 55000,
          cashBalance: 45000,
          accountsReceivable: 25000,
          accountsPayable: 15000,
        },
        trends: {
          revenue: [
            { period: "2026-01", value: 45000 },
            { period: "2026-02", value: 48000 },
            { period: "2026-03", value: 52000 },
          ],
          expenses: [
            { period: "2026-01", value: 30000 },
            { period: "2026-02", value: 32000 },
            { period: "2026-03", value: 33000 },
          ],
          cashFlow: [
            { period: "2026-01", value: 15000 },
            { period: "2026-02", value: 16000 },
            { period: "2026-03", value: 19000 },
          ],
        },
      }),
    })),
  };
});

describe("FinancialResolver", () => {
  let resolver: FinancialResolver;

  const mockContext = {
    req: {
      user: {
        organizationId: "org-123",
        sub: "user-456",
        email: "test@example.com",
      },
    },
  };

  beforeEach(async () => {
    const mockBalanceSheetUseCase = {
      execute: jest.fn().mockResolvedValue({
        organizationName: "Test Company",
        reportTitle: "Balance Sheet",
        asOfDate: "2026-01-27",
        currency: "CAD",
        assets: {
          currentAssets: { title: "Current Assets", items: [], total: 45000 },
          fixedAssets: { title: "Fixed Assets", items: [], total: 0 },
          totalAssets: 45000,
        },
        liabilities: {
          currentLiabilities: {
            title: "Current Liabilities",
            items: [],
            total: 15000,
          },
          longTermLiabilities: {
            title: "Long-term Liabilities",
            items: [],
            total: 0,
          },
          totalLiabilities: 15000,
        },
        equity: {
          items: [],
          totalEquity: 30000,
        },
        totalLiabilitiesAndEquity: 45000,
        isBalanced: true,
        generatedAt: "2026-01-27T12:00:00Z",
      }),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue(undefined),
    };

    const mockDatalakeDataService = {
      getDashboardData: jest.fn().mockResolvedValue({
        organizationId: "org-123",
        organizationName: "Test Company",
        asOfDate: "2026-01-27",
        dataSource: "test",
        lastUpdated: "2026-01-27T12:00:00Z",
        accounts: [
          {
            account_key: "acc-1",
            account_code: "1000",
            account_name: "Cash",
            account_type: "ASSET",
            is_active: true,
          },
          {
            account_key: "acc-2",
            account_code: "1100",
            account_name: "Accounts Receivable",
            account_type: "ASSET",
            is_active: true,
          },
          {
            account_key: "acc-3",
            account_code: "2000",
            account_name: "Accounts Payable",
            account_type: "LIABILITY",
            is_active: true,
          },
          {
            account_key: "acc-4",
            account_code: "4000",
            account_name: "Revenue",
            account_type: "REVENUE",
            is_active: true,
          },
          {
            account_key: "acc-5",
            account_code: "5000",
            account_name: "Expenses",
            account_type: "EXPENSE",
            is_active: true,
          },
        ],
        contacts: [],
        transactions: [
          {
            transaction_key: "txn-1",
            transaction_date: "2026-01-15",
            amount: 5000,
            memo: "Invoice #001",
            reference_number: "INV-001",
            currency_code: "CAD",
            posting_date: "2026-01-15",
          },
          {
            transaction_key: "txn-2",
            transaction_date: "2026-01-16",
            amount: 3000,
            memo: "Payment received",
            reference_number: "PMT-001",
            currency_code: "CAD",
            posting_date: "2026-01-16",
          },
          {
            transaction_key: "txn-3",
            transaction_date: "2026-01-17",
            amount: 1500,
            memo: "Office supplies",
            reference_number: "EXP-001",
            currency_code: "CAD",
            posting_date: "2026-01-17",
          },
        ],
        balances: [],
        summary: {
          totalAssets: 70000,
          totalLiabilities: 15000,
          totalEquity: 55000,
          totalRevenue: 150000,
          totalExpenses: 95000,
          netIncome: 55000,
          cashBalance: 45000,
          accountsReceivable: 25000,
          accountsPayable: 15000,
        },
        trends: {
          revenue: [
            { period: "2026-01", value: 45000 },
            { period: "2026-02", value: 48000 },
            { period: "2026-03", value: 52000 },
          ],
          expenses: [
            { period: "2026-01", value: 30000 },
            { period: "2026-02", value: 32000 },
            { period: "2026-03", value: 33000 },
          ],
          cashFlow: [
            { period: "2026-01", value: 15000 },
            { period: "2026-02", value: 16000 },
            { period: "2026-03", value: 19000 },
          ],
        },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinancialResolver,
        { provide: GenerateIncomeStatementUseCase, useValue: { execute: jest.fn().mockImplementation(async (input) => ({
          ...input, organizationName: "Test Company", currency: "CAD", revenue: [], expenses: [], grossRevenue: 150000, totalExpenses: 95000, netIncome: 55000,
        })) } },
        { provide: KEYCLOAK_INSTANCE, useValue: { grantManager: { createGrant: jest.fn().mockRejectedValue(new Error("Not an authentication test")), validateAccessToken: jest.fn().mockResolvedValue(false) } } },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: GenerateBalanceSheetUseCase,
          useValue: mockBalanceSheetUseCase,
        },
        {
          provide: "IDatalakeDataService",
          useValue: mockDatalakeDataService,
        },
      ],
    }).compile();

    resolver = module.get<FinancialResolver>(FinancialResolver);
  });

  describe("getDashboardSummary", () => {
    it("should return dashboard summary with all key metrics", async () => {
      const result = await resolver.getDashboardSummary(undefined, mockContext);

      expect(result).toBeDefined();
      expect(result.totalRevenue.amount).toBe(150000);
      expect(result.totalExpenses.amount).toBe(95000);
      expect(result.netIncome.amount).toBe(55000);
      expect(result.cashOnHand.amount).toBe(45000);
      expect(result.totalRevenue.currency).toBe("CAD");
    });

    it("should calculate cash flow correctly", async () => {
      const result = await resolver.getDashboardSummary(undefined, mockContext);

      expect(result.cashFlow).toBeDefined();
      expect(result.cashFlow.inflows.amount).toBe(150000);
      expect(result.cashFlow.outflows.amount).toBe(95000);
      expect(result.cashFlow.netCashFlow.amount).toBe(55000);
    });

    it("should include key metrics", async () => {
      const result = await resolver.getDashboardSummary(undefined, mockContext);

      expect(result.keyMetrics).toHaveLength(3);
      expect(result.keyMetrics[0].name).toBe("Revenue");
    });

    it("should handle missing organization gracefully", async () => {
      const contextWithoutOrg = { req: { user: {} } } as any;
      await expect(resolver.getDashboardSummary(undefined, contextWithoutOrg)).rejects.toMatchObject({ status: 401 });
    });
  });

  describe("getFinancialTrends", () => {
    it("should return trend data for requested metrics", async () => {
      const result = await resolver.getFinancialTrends(
        ["revenue", "expenses"],
        undefined,
        mockContext,
      );

      expect(result).toHaveLength(2);
      expect(result[0].metricName).toBe("revenue");
      expect(result[0].data).toHaveLength(3);
    });

    it("should calculate period change correctly", async () => {
      const result = await resolver.getFinancialTrends(
        ["revenue"],
        undefined,
        mockContext,
      );

      // (52000 - 48000) / 48000 * 100 = 8.33%
      expect(result[0].periodChangePercent).toBeCloseTo(8.33, 1);
      expect(result[0].trend).toBe(TrendDirection.UP);
    });

    it("should handle empty metrics array", async () => {
      const result = await resolver.getFinancialTrends(
        [],
        undefined,
        mockContext,
      );

      expect(result).toHaveLength(0);
    });

    it("should return cashFlow data for camelCase metric", async () => {
      const result = await resolver.getFinancialTrends(
        ["cashFlow"],
        undefined,
        mockContext,
      );

      expect(result).toHaveLength(1);
      expect(result[0].metricName).toBe("cashFlow");
      expect(result[0].data.length).toBeGreaterThan(0);
      expect(result[0].data[0].value).toBe(15000);
    });

    it("should handle case-insensitive metric names", async () => {
      const result = await resolver.getFinancialTrends(
        ["REVENUE", "CashFlow", "expenses"],
        undefined,
        mockContext,
      );

      expect(result).toHaveLength(3);
      // All metrics should return data
      for (const trend of result) {
        expect(trend.data.length).toBeGreaterThan(0);
      }
    });

    it("should handle lowercase cashflow metric", async () => {
      const result = await resolver.getFinancialTrends(
        ["cashflow"],
        undefined,
        mockContext,
      );

      expect(result).toHaveLength(1);
      expect(result[0].metricName).toBe("cashflow");
      expect(result[0].data.length).toBeGreaterThan(0);
    });
  });

  describe("getAccounts", () => {
    it("should return paginated accounts", async () => {
      const result = await resolver.getAccounts(
        undefined,
        undefined,
        mockContext,
      );

      expect(result.nodes).toHaveLength(5);
      expect(result.pageInfo.totalCount).toBe(5);
      expect(result.pageInfo.hasNextPage).toBe(false);
    });

    it("should filter accounts by type", async () => {
      const result = await resolver.getAccounts(
        { types: [AccountType.ASSET] },
        undefined,
        mockContext,
      );

      expect(result.nodes.every((a) => a.type === AccountType.ASSET)).toBe(
        true,
      );
    });

    it("should filter accounts by search term", async () => {
      const result = await resolver.getAccounts(
        { search: "cash" },
        undefined,
        mockContext,
      );

      expect(result.nodes.length).toBeGreaterThan(0);
      expect(result.nodes[0].name.toLowerCase()).toContain("cash");
    });

    it("should paginate correctly", async () => {
      const result = await resolver.getAccounts(
        undefined,
        { page: 1, pageSize: 2 },
        mockContext,
      );

      expect(result.nodes).toHaveLength(2);
      expect(result.pageInfo.totalPages).toBe(3);
      expect(result.pageInfo.hasNextPage).toBe(true);
    });
  });

  describe("getAccount", () => {
    it("should return a single account by ID", async () => {
      const result = await resolver.getAccount("acc-1", mockContext);

      expect(result).toBeDefined();
      expect(result?.id).toBe("acc-1");
      expect(result?.code).toBe("1000");
    });

    it("should return null for non-existent account", async () => {
      const result = await resolver.getAccount("non-existent", mockContext);

      expect(result).toBeNull();
    });
  });

  describe("getTransactions", () => {
    it("should return paginated transactions", async () => {
      const result = await resolver.getTransactions(
        undefined,
        undefined,
        mockContext,
      );

      expect(result.nodes).toHaveLength(3);
      expect(result.pageInfo.totalCount).toBe(3);
    });

    it("should filter by amount range", async () => {
      const result = await resolver.getTransactions(
        { minAmount: 2000, maxAmount: 4000 },
        undefined,
        mockContext,
      );

      expect(
        result.nodes.every(
          (t) => Math.abs(t.amount) >= 2000 && Math.abs(t.amount) <= 4000,
        ),
      ).toBe(true);
    });

    it("should filter by search term", async () => {
      const result = await resolver.getTransactions(
        { search: "invoice" },
        undefined,
        mockContext,
      );

      expect(result.nodes.length).toBeGreaterThan(0);
    });
  });

  describe("getBalanceSheet", () => {
    it("should generate balance sheet report", async () => {
      const result = await resolver.getBalanceSheet(undefined, mockContext);

      expect(result).toBeDefined();
      expect(result.organizationName).toBe("Test Company");
      expect(result.totalAssets).toBe(45000);
      expect(result.totalLiabilities).toBe(15000);
      expect(result.totalEquity).toBe(30000);
    });
  });

  describe("getIncomeStatement", () => {
    it("should generate income statement report", async () => {
      const dateRange = {
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-01-31"),
      };

      const result = await resolver.getIncomeStatement(dateRange, mockContext);

      expect(result).toBeDefined();
      expect(result.startDate).toEqual(dateRange.startDate);
      expect(result.endDate).toEqual(dateRange.endDate);
      expect(result.grossRevenue).toBe(150000);
      expect(result.totalExpenses).toBe(95000);
      expect(result.netIncome).toBe(55000);
    });
  });
});

describe("FinancialResolver Security", () => {
  let resolver: FinancialResolver;

  beforeEach(async () => {
    const mockBalanceSheetUseCase = {
      execute: jest.fn().mockResolvedValue({
        organizationName: "Test",
        assets: {
          currentAssets: { items: [] },
          fixedAssets: { items: [] },
          totalAssets: 0,
        },
        liabilities: {
          currentLiabilities: { items: [] },
          longTermLiabilities: { items: [] },
          totalLiabilities: 0,
        },
        equity: { items: [], totalEquity: 0 },
        currency: "CAD",
      }),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue(undefined),
    };

    const mockDatalakeDataService = {
      getDashboardData: jest.fn().mockResolvedValue({
        organizationId: "org-123",
        organizationName: "Test Company",
        asOfDate: "2026-01-27",
        dataSource: "test",
        lastUpdated: "2026-01-27T12:00:00Z",
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
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinancialResolver,
        { provide: GenerateIncomeStatementUseCase, useValue: { execute: jest.fn().mockImplementation(async (input) => ({
          ...input, organizationName: "Test Company", currency: "CAD", revenue: [], expenses: [], grossRevenue: 150000, totalExpenses: 95000, netIncome: 55000,
        })) } },
        { provide: KEYCLOAK_INSTANCE, useValue: { grantManager: { createGrant: jest.fn().mockRejectedValue(new Error("Not an authentication test")), validateAccessToken: jest.fn().mockResolvedValue(false) } } },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: GenerateBalanceSheetUseCase,
          useValue: mockBalanceSheetUseCase,
        },
        {
          provide: "IDatalakeDataService",
          useValue: mockDatalakeDataService,
        },
      ],
    }).compile();

    resolver = module.get<FinancialResolver>(FinancialResolver);
  });

  it("should use organization ID from context for tenant isolation", async () => {
    const context1 = { req: { user: { organizationId: "org-1" } } };
    const context2 = { req: { user: { organizationId: "org-2" } } };

    // Both calls should succeed but with different org IDs
    await resolver.getDashboardSummary(undefined, context1);
    await resolver.getDashboardSummary(undefined, context2);
  });

  it("should handle malformed context gracefully", async () => {
    const malformedContext = { req: {} } as any;

    await expect(resolver.getDashboardSummary(undefined, malformedContext)).rejects.toMatchObject({ status: 401 });
  });
});
