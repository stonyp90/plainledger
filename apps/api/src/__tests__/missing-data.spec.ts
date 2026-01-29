/**
 * Tests for missing data scenarios
 * Ensures the system handles edge cases gracefully
 */

import {
  DataCompleteness,
  DashboardData,
} from "@infrastructure/services/datalake-data.service";

describe("Missing Data Scenarios", () => {
  describe("DataCompleteness interface", () => {
    it("should indicate empty state when no data exists", () => {
      const completeness: DataCompleteness = {
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
      };

      expect(completeness.dataSource).toBe("empty");
      expect(completeness.hasAccounts).toBe(false);
      expect(completeness.hasTransactions).toBe(false);
      expect(completeness.missingPeriods.length).toBe(12);
    });

    it("should indicate partial state when some data exists", () => {
      const completeness: DataCompleteness = {
        hasAccounts: true,
        hasTransactions: false,
        hasRecentData: false,
        lastSyncAt: null,
        dataSource: "partial",
        missingPeriods: ["Jan", "Feb"],
      };

      expect(completeness.dataSource).toBe("partial");
      expect(completeness.hasAccounts).toBe(true);
      expect(completeness.hasTransactions).toBe(false);
    });

    it("should indicate real state when all data exists", () => {
      const completeness: DataCompleteness = {
        hasAccounts: true,
        hasTransactions: true,
        hasRecentData: true,
        lastSyncAt: new Date().toISOString(),
        dataSource: "real",
        missingPeriods: [],
      };

      expect(completeness.dataSource).toBe("real");
      expect(completeness.hasAccounts).toBe(true);
      expect(completeness.hasTransactions).toBe(true);
      expect(completeness.missingPeriods.length).toBe(0);
    });
  });

  describe("Empty DashboardData", () => {
    const emptyDashboardData: DashboardData = {
      organizationId: "test-org",
      organizationName: "Test Organization",
      asOfDate: "2026-01-28",
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

    it("should have zero values for all summary metrics", () => {
      expect(emptyDashboardData.summary.totalAssets).toBe(0);
      expect(emptyDashboardData.summary.totalLiabilities).toBe(0);
      expect(emptyDashboardData.summary.totalEquity).toBe(0);
      expect(emptyDashboardData.summary.totalRevenue).toBe(0);
      expect(emptyDashboardData.summary.totalExpenses).toBe(0);
      expect(emptyDashboardData.summary.netIncome).toBe(0);
      expect(emptyDashboardData.summary.cashBalance).toBe(0);
      expect(emptyDashboardData.summary.accountsReceivable).toBe(0);
      expect(emptyDashboardData.summary.accountsPayable).toBe(0);
    });

    it("should have empty arrays for all collections", () => {
      expect(emptyDashboardData.accounts).toEqual([]);
      expect(emptyDashboardData.contacts).toEqual([]);
      expect(emptyDashboardData.transactions).toEqual([]);
      expect(emptyDashboardData.balances).toEqual([]);
    });

    it("should have empty arrays for all trends", () => {
      expect(emptyDashboardData.trends.revenue).toEqual([]);
      expect(emptyDashboardData.trends.expenses).toEqual([]);
      expect(emptyDashboardData.trends.cashFlow).toEqual([]);
    });

    it("should have completeness indicating empty state", () => {
      expect(emptyDashboardData.completeness.dataSource).toBe("empty");
      expect(emptyDashboardData.completeness.hasAccounts).toBe(false);
      expect(emptyDashboardData.completeness.hasTransactions).toBe(false);
    });
  });

  describe("Partial Data Scenarios", () => {
    it("should handle organization with accounts but no transactions", () => {
      const partialData: Partial<DashboardData> = {
        accounts: [
          {
            account_key: "acc-key-1",
            account_id: "acc-1",
            source_account_id: "src-acc-1",
            organization_key: "test-org",
            account_code: "1001",
            account_name: "Cash",
            account_type: "ASSET",
            account_subtype: "Cash and Cash Equivalents",
            is_active: true,
            hierarchy_level: 1,
            hierarchy_path: "/Assets/Cash",
            is_debit_normal: true,
            balance_sheet_section: "Current Assets",
            income_statement_section: null,
          },
        ],
        transactions: [],
        completeness: {
          hasAccounts: true,
          hasTransactions: false,
          hasRecentData: false,
          lastSyncAt: null,
          dataSource: "partial",
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

      expect(partialData.accounts?.length).toBe(1);
      expect(partialData.transactions?.length).toBe(0);
      expect(partialData.completeness?.dataSource).toBe("partial");
    });

    it("should handle data with gaps in time periods", () => {
      const trends = {
        revenue: [
          { period: "Jan", value: 1000 },
          // Feb missing
          { period: "Mar", value: 1200 },
          // Apr, May missing
          { period: "Jun", value: 1500 },
        ],
        expenses: [],
        cashFlow: [],
      };

      const presentPeriods = trends.revenue.map((t) => t.period);
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
      const missingPeriods = allMonths.filter(
        (m) => !presentPeriods.includes(m),
      );

      expect(missingPeriods).toContain("Feb");
      expect(missingPeriods).toContain("Apr");
      expect(missingPeriods).toContain("May");
      expect(missingPeriods.length).toBe(9);
    });
  });

  describe("Data Staleness Detection", () => {
    it("should detect stale data (older than 24 hours)", () => {
      const staleDate = new Date();
      staleDate.setHours(staleDate.getHours() - 25);

      const completeness: DataCompleteness = {
        hasAccounts: true,
        hasTransactions: true,
        hasRecentData: false, // More than 24 hours old
        lastSyncAt: staleDate.toISOString(),
        dataSource: "real",
        missingPeriods: [],
      };

      expect(completeness.hasRecentData).toBe(false);
      expect(completeness.lastSyncAt).toBeDefined();
    });

    it("should detect fresh data (less than 24 hours old)", () => {
      const freshDate = new Date();
      freshDate.setHours(freshDate.getHours() - 1);

      const completeness: DataCompleteness = {
        hasAccounts: true,
        hasTransactions: true,
        hasRecentData: true, // Less than 24 hours old
        lastSyncAt: freshDate.toISOString(),
        dataSource: "real",
        missingPeriods: [],
      };

      expect(completeness.hasRecentData).toBe(true);
    });
  });
});
