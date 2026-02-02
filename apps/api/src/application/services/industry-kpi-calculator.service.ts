/**
 * Industry KPI Calculator Service
 *
 * Calculates industry-specific KPIs from transaction data using account mappings.
 * This service is used by the ETL pipeline to populate fact_industry_kpis.
 */

import { Injectable, Logger } from "@nestjs/common";
import {
  DimAccount,
  FactTransaction,
  AccountType,
} from "@domain/datalake/schemas";
import {
  getIndustryMapping,
  matchAccountToCategory,
  IndustryKPIDefinition,
} from "@domain/datalake/industry-account-mapping";

export interface CategoryTotals {
  [categoryId: string]: number;
}

export interface CalculatedKPIs {
  industry: string;
  periodStart: Date;
  periodEnd: Date;
  // Restaurant KPIs
  food_cost_pct?: number;
  beverage_cost_pct?: number;
  labor_cost_pct?: number;
  prime_cost_pct?: number;
  average_check?: number;
  covers_per_day?: number;
  // Retail KPIs
  gross_margin_pct?: number;
  inventory_turnover?: number;
  sales_per_sqft?: number;
  shrinkage_pct?: number;
  // Professional Services KPIs
  utilization_rate?: number;
  realization_rate?: number;
  effective_rate?: number;
  ar_days?: number;
  wip_days?: number;
  // Construction KPIs
  job_margin_pct?: number;
  wip_balance?: number;
  retention_balance?: number;
  backlog_value?: number;
  // Real Estate KPIs
  re_occupancy_rate?: number;
  re_cap_rate?: number;
  re_noi?: number;
  re_rent_per_sqft?: number;
  re_vacancy_rate?: number;
  re_expense_ratio?: number;
  re_cash_on_cash?: number;
  // Hospitality KPIs
  occupancy_rate?: number;
  adr?: number;
  revpar?: number;
  trevpar?: number;
  cpor?: number;
  // Category totals for debugging
  categoryTotals: CategoryTotals;
}

export interface AccountWithCategory extends DimAccount {
  industryCategory?: string;
}

@Injectable()
export class IndustryKPICalculatorService {
  private readonly logger = new Logger(IndustryKPICalculatorService.name);

  /**
   * Map accounts to industry-specific categories
   */
  mapAccountsToCategories(
    accounts: DimAccount[],
    industryId: string,
  ): AccountWithCategory[] {
    return accounts.map((account) => {
      const category = matchAccountToCategory(
        {
          accountName: account.account_name,
          accountType: account.account_type,
          accountSubtype: account.account_subtype,
          sourceAccountType: account.source_account_type,
          sourceAccountSubtype: account.source_account_subtype,
        },
        industryId,
      );

      return {
        ...account,
        industryCategory: category || undefined,
      };
    });
  }

  /**
   * Calculate category totals from transactions
   */
  calculateCategoryTotals(
    transactions: FactTransaction[],
    accountsWithCategories: AccountWithCategory[],
    periodStart: Date,
    periodEnd: Date,
  ): CategoryTotals {
    // Create account key to category mapping
    const accountCategoryMap = new Map<string, string>();
    for (const account of accountsWithCategories) {
      if (account.industryCategory) {
        accountCategoryMap.set(account.account_key, account.industryCategory);
        // Also map by source_account_id for flexibility
        accountCategoryMap.set(
          account.source_account_id,
          account.industryCategory,
        );
      }
    }

    // Filter transactions by date range
    const periodTransactions = transactions.filter((t) => {
      const txnDate = new Date(t.transaction_date);
      return txnDate >= periodStart && txnDate <= periodEnd;
    });

    // Sum amounts by category
    const totals: CategoryTotals = {};

    for (const txn of periodTransactions) {
      const category =
        accountCategoryMap.get(txn.account_key) ||
        accountCategoryMap.get(txn.source_transaction_id);

      if (category) {
        if (!totals[category]) {
          totals[category] = 0;
        }
        // Use absolute values for revenue (credits are negative in our schema)
        // Debits are positive, credits are negative in amount field
        totals[category] += Math.abs(txn.amount);
      }
    }

    this.logger.debug(`Category totals calculated: ${JSON.stringify(totals)}`);
    return totals;
  }

  /**
   * Calculate a single KPI from category totals
   */
  private calculateKPI(
    kpi: IndustryKPIDefinition,
    categoryTotals: CategoryTotals,
  ): number | undefined {
    // Check if all required categories have data
    const missingCategories = kpi.requiredCategories.filter(
      (cat) => categoryTotals[cat] === undefined || categoryTotals[cat] === 0,
    );

    if (missingCategories.length > 0) {
      this.logger.debug(
        `KPI ${kpi.id} missing categories: ${missingCategories.join(", ")}`,
      );
      return undefined;
    }

    // Simple formula evaluator (replace category IDs with values)
    let formula = kpi.formula;
    for (const [category, value] of Object.entries(categoryTotals)) {
      formula = formula.replace(
        new RegExp(`\\b${category}\\b`, "g"),
        String(value),
      );
    }

    try {
      // Safe evaluation using Function constructor
       
      const result = new Function(`return ${formula}`)() as number;

      if (typeof result !== "number" || isNaN(result) || !isFinite(result)) {
        return undefined;
      }

      // Round based on format
      if (kpi.format === "percentage") {
        return Math.round(result * 100) / 100;
      } else if (kpi.format === "currency") {
        return Math.round(result * 100) / 100;
      } else {
        return Math.round(result * 10) / 10;
      }
    } catch (error) {
      this.logger.error(`Error calculating KPI ${kpi.id}: ${error}`);
      return undefined;
    }
  }

  /**
   * Calculate all KPIs for an industry
   */
  calculateIndustryKPIs(
    accounts: DimAccount[],
    transactions: FactTransaction[],
    industryId: string,
    periodStart: Date,
    periodEnd: Date,
  ): CalculatedKPIs {
    const mapping = getIndustryMapping(industryId);

    if (!mapping) {
      this.logger.warn(`No mapping found for industry: ${industryId}`);
      return {
        industry: industryId,
        periodStart,
        periodEnd,
        categoryTotals: {},
      };
    }

    // Map accounts to categories
    const accountsWithCategories = this.mapAccountsToCategories(
      accounts,
      industryId,
    );

    const categorizedCount = accountsWithCategories.filter(
      (a) => a.industryCategory,
    ).length;
    this.logger.log(
      `Mapped ${categorizedCount}/${accounts.length} accounts to ${industryId} categories`,
    );

    // Calculate category totals
    const categoryTotals = this.calculateCategoryTotals(
      transactions,
      accountsWithCategories,
      periodStart,
      periodEnd,
    );

    // Initialize result
    const result: CalculatedKPIs = {
      industry: industryId,
      periodStart,
      periodEnd,
      categoryTotals,
    };

    // Calculate each KPI defined for this industry
    for (const kpi of mapping.kpis) {
      const value = this.calculateKPI(kpi, categoryTotals);
      if (value !== undefined) {
        // Map KPI id to result field
        (result as unknown as Record<string, unknown>)[kpi.id] = value;
        this.logger.debug(`KPI ${kpi.id} = ${value}`);
      }
    }

    return result;
  }

  /**
   * Get generic financial KPIs that apply to all industries
   * These are calculated directly from transaction data without industry-specific mappings
   */
  calculateGenericKPIs(
    accounts: DimAccount[],
    transactions: FactTransaction[],
    periodStart: Date,
    periodEnd: Date,
  ): {
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
    totalAssets: number;
    totalLiabilities: number;
    grossMargin: number;
  } {
    // Filter transactions by date
    const periodTransactions = transactions.filter((t) => {
      const txnDate = new Date(t.transaction_date);
      return txnDate >= periodStart && txnDate <= periodEnd;
    });

    // Create account lookup
    const accountMap = new Map<string, DimAccount>();
    for (const account of accounts) {
      accountMap.set(account.account_key, account);
      accountMap.set(account.source_account_id, account);
    }

    let totalRevenue = 0;
    let totalExpenses = 0;
    let totalAssets = 0;
    let totalLiabilities = 0;

    // Sum by account type
    for (const txn of periodTransactions) {
      const account = accountMap.get(txn.account_key);
      if (!account) continue;

      switch (account.account_type) {
        case AccountType.REVENUE:
          // Revenue is typically credit (negative in our schema)
          totalRevenue += Math.abs(txn.credit_amount || 0);
          break;
        case AccountType.EXPENSE:
          totalExpenses += Math.abs(txn.debit_amount || 0);
          break;
        case AccountType.ASSET:
          totalAssets += txn.debit_amount - txn.credit_amount;
          break;
        case AccountType.LIABILITY:
          totalLiabilities += txn.credit_amount - txn.debit_amount;
          break;
      }
    }

    const netIncome = totalRevenue - totalExpenses;
    const grossMargin =
      totalRevenue > 0
        ? ((totalRevenue - totalExpenses) / totalRevenue) * 100
        : 0;

    return {
      totalRevenue,
      totalExpenses,
      netIncome,
      totalAssets,
      totalLiabilities,
      grossMargin: Math.round(grossMargin * 100) / 100,
    };
  }

  /**
   * Calculate KPIs and prepare data for fact_industry_kpis table
   */
  prepareFactIndustryKPIs(
    organizationKey: string,
    accounts: DimAccount[],
    transactions: FactTransaction[],
    industryId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Record<string, unknown> {
    const industryKPIs = this.calculateIndustryKPIs(
      accounts,
      transactions,
      industryId,
      periodStart,
      periodEnd,
    );

    const genericKPIs = this.calculateGenericKPIs(
      accounts,
      transactions,
      periodStart,
      periodEnd,
    );

    // Format date key as YYYYMMDD
    const dateKey =
      periodEnd.getFullYear() * 10000 +
      (periodEnd.getMonth() + 1) * 100 +
      periodEnd.getDate();

    return {
      kpi_key: `kpi_${organizationKey}_${dateKey}`,
      organization_key: organizationKey,
      date_key: dateKey,
      industry: industryId,
      // Restaurant KPIs
      food_cost_pct: industryKPIs.food_cost_pct || null,
      beverage_cost_pct: industryKPIs.beverage_cost_pct || null,
      labor_cost_pct: industryKPIs.labor_cost_pct || null,
      prime_cost_pct: industryKPIs.prime_cost_pct || null,
      average_check: industryKPIs.average_check || null,
      covers_per_day: industryKPIs.covers_per_day || null,
      // Retail KPIs
      gross_margin_pct:
        industryKPIs.gross_margin_pct || genericKPIs.grossMargin,
      inventory_turnover: industryKPIs.inventory_turnover || null,
      sales_per_sqft: industryKPIs.sales_per_sqft || null,
      shrinkage_pct: industryKPIs.shrinkage_pct || null,
      // Professional Services
      utilization_rate: industryKPIs.utilization_rate || null,
      realization_rate: industryKPIs.realization_rate || null,
      effective_rate: industryKPIs.effective_rate || null,
      ar_days: industryKPIs.ar_days || null,
      wip_days: industryKPIs.wip_days || null,
      // Construction
      job_margin_pct: industryKPIs.job_margin_pct || null,
      wip_balance: industryKPIs.wip_balance || null,
      retention_balance: industryKPIs.retention_balance || null,
      backlog_value: industryKPIs.backlog_value || null,
      // Real Estate
      re_occupancy_rate: industryKPIs.re_occupancy_rate || null,
      re_cap_rate: industryKPIs.re_cap_rate || null,
      re_noi: industryKPIs.re_noi || null,
      re_rent_per_sqft: industryKPIs.re_rent_per_sqft || null,
      re_vacancy_rate: industryKPIs.re_vacancy_rate || null,
      re_expense_ratio: industryKPIs.re_expense_ratio || null,
      re_cash_on_cash: industryKPIs.re_cash_on_cash || null,
      // Hospitality
      occupancy_rate: industryKPIs.occupancy_rate || null,
      adr: industryKPIs.adr || null,
      revpar: industryKPIs.revpar || null,
      trevpar: industryKPIs.trevpar || null,
      cpor: industryKPIs.cpor || null,
    };
  }
}
