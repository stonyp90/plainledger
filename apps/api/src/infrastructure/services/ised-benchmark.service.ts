/**
 * ISED Financial Performance Data Service
 *
 * Fetches and parses industry benchmark data from Innovation, Science and
 * Economic Development Canada (ISED) Open Government Portal.
 *
 * Data sources:
 * - 2023 Dataset: https://open.canada.ca/data/en/dataset/16b7eeb0-9a97-46c0-af3d-7f2114dedf5e
 * - 2022 Dataset: https://open.canada.ca/data/en/dataset/ee04cfb2-9473-47cb-a0e1-64823da7ab82
 *
 * No authentication required - Open Government Licence Canada
 */

import { Injectable, Logger } from "@nestjs/common";
import axios, { AxiosInstance } from "axios";
import * as Papa from "papaparse";
import {
  IndustryBenchmark,
  RevenueRange,
} from "@domain/market-analysis/benchmark.types";
import {
  getIndustryFromNAICS,
  getAllIndustryIds,
} from "@domain/market-analysis/naics-mapping";

/**
 * Open Canada CKAN API base URL
 */
const OPEN_CANADA_API = "https://open.canada.ca/data/api/3/action";

/**
 * Dataset IDs for different years
 */
const ISED_DATASET_IDS = {
  2023: "16b7eeb0-9a97-46c0-af3d-7f2114dedf5e",
  2022: "ee04cfb2-9473-47cb-a0e1-64823da7ab82",
} as const;

/**
 * Resource metadata from Open Canada API
 */
interface OpenCanadaResource {
  name: string;
  format: string;
  url: string;
  created: string;
  last_modified: string;
}

/**
 * Dataset metadata from Open Canada API
 */
interface OpenCanadaDataset {
  id: string;
  title: string;
  resources: OpenCanadaResource[];
  metadata_modified: string;
}

/**
 * Parsed row from financial ratios CSV
 * Column structure based on actual 2023 CSV files
 */
interface FinancialRatiosRow {
  incorporationStatus: number; // 1=Unincorporated, 2=Incorporated, 3=All
  naicsCode: string;
  province: string;
  currentRatio: number;
  currentRatioQ1: number;
  currentRatioQ2: number;
  currentRatioQ3: number;
  currentRatioQ4: number;
  debtToEquity: number;
  debtToEquityQ1: number;
  debtToEquityQ2: number;
  debtToEquityQ3: number;
  debtToEquityQ4: number;
}

/**
 * Parsed row from total expenses percentage CSV
 */
interface ExpensesPercentageRow {
  incorporationStatus: number;
  naicsCode: string;
  province: string;
  costOfSales: number; // Direct expenses as % of revenue
  operatingExpenses: number;
  wagesAndBenefits: number;
  rentAndOccupancy: number;
  utilities: number;
  advertising: number;
  depreciation: number;
  otherExpenses: number;
  totalExpenses: number;
  netIncome: number; // Net income as % of revenue (profit margin)
}

/**
 * Aggregated benchmark data by industry
 */
export interface AggregatedBenchmark {
  naicsCode: string;
  industryId: string;
  sampleSize: number;
  grossMargin: QuartileData;
  netMargin: QuartileData;
  operatingExpenseRatio: number;
  wagesToRevenueRatio: number;
  rentToRevenueRatio: number;
  currentRatio: QuartileData;
  debtToEquity: QuartileData;
}

/**
 * Data freshness info
 */
export interface ISEDDataFreshness {
  latestDatasetYear: number;
  datasetId: string;
  lastModified: string;
  resourceCount: number;
  isStale: boolean;
}

@Injectable()
export class ISEDBenchmarkService {
  private readonly logger = new Logger(ISEDBenchmarkService.name);
  private readonly httpClient: AxiosInstance;
  private cachedResources: Map<string, OpenCanadaResource[]> = new Map();
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.httpClient = axios.create({
      timeout: 60000, // 60 seconds for large CSV downloads
      headers: {
        "User-Agent": "PlainLedger/1.0 (Benchmark Data Fetcher)",
      },
    });
  }

  /**
   * Check for latest available ISED dataset
   */
  async checkDataFreshness(): Promise<ISEDDataFreshness> {
    // Try 2023 first, then fallback to 2022
    for (const [year, datasetId] of Object.entries(
      ISED_DATASET_IDS,
    ).reverse()) {
      try {
        const response = await this.httpClient.get(
          `${OPEN_CANADA_API}/package_show?id=${datasetId}`,
        );

        if (response.data?.success && response.data?.result) {
          const dataset = response.data.result as OpenCanadaDataset;
          const csvResources = dataset.resources.filter(
            (r) => r.format === "CSV",
          );

          // Check if data is stale (more than 14 months old)
          const lastModified = new Date(dataset.metadata_modified);
          const monthsOld =
            (Date.now() - lastModified.getTime()) / (30 * 24 * 60 * 60 * 1000);

          return {
            latestDatasetYear: parseInt(year),
            datasetId,
            lastModified: dataset.metadata_modified,
            resourceCount: csvResources.length,
            isStale: monthsOld > 14,
          };
        }
      } catch (error) {
        this.logger.warn(`Failed to check dataset ${year}: ${error}`);
      }
    }

    throw new Error("No ISED datasets available");
  }

  /**
   * Fetch and parse ISED benchmark data
   * Returns benchmarks for all PlainLedger industries
   */
  async fetchBenchmarks(): Promise<{
    small: AggregatedBenchmark[];
    medium: AggregatedBenchmark[];
    referenceYear: number;
  }> {
    this.logger.log("Starting ISED benchmark data fetch...");

    // Determine which dataset to use
    const freshness = await this.checkDataFreshness();
    const datasetId = freshness.datasetId;
    const referenceYear = freshness.latestDatasetYear;

    this.logger.log(
      `Using ISED dataset year ${referenceYear} (ID: ${datasetId})`,
    );

    try {
      // Fetch resources for this dataset
      const resources = await this.getDatasetResources(datasetId);

      // Fetch both revenue range datasets in parallel
      const [smallData, mediumData] = await Promise.all([
        this.fetchAndParseBenchmarks(resources, "30k_5m"),
        this.fetchAndParseBenchmarks(resources, "5m_20m"),
      ]);

      this.logger.log(
        `Fetched ${smallData.length} small business benchmarks, ${mediumData.length} medium business benchmarks`,
      );

      return {
        small: smallData,
        medium: mediumData,
        referenceYear,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch ISED data: ${error}`);
      // Return fallback data on error
      return {
        small: this.getFallbackBenchmarks("30k-5m"),
        medium: this.getFallbackBenchmarks("5m-20m"),
        referenceYear: new Date().getFullYear() - 2,
      };
    }
  }

  /**
   * Get dataset resources from Open Canada API with caching
   */
  private async getDatasetResources(
    datasetId: string,
  ): Promise<OpenCanadaResource[]> {
    const now = Date.now();
    if (
      this.cachedResources.has(datasetId) &&
      now - this.cacheTimestamp < this.CACHE_TTL
    ) {
      return this.cachedResources.get(datasetId)!;
    }

    try {
      const response = await this.httpClient.get(
        `${OPEN_CANADA_API}/package_show?id=${datasetId}`,
      );

      if (response.data?.success && response.data?.result?.resources) {
        const resources = response.data.result.resources.filter(
          (r: OpenCanadaResource) => r.format === "CSV",
        );
        this.cachedResources.set(datasetId, resources);
        this.cacheTimestamp = now;
        return resources;
      }
    } catch (error) {
      this.logger.warn(`Could not fetch dataset resources: ${error}`);
    }

    return [];
  }

  /**
   * Fetch and parse benchmarks for a specific revenue range
   */
  private async fetchAndParseBenchmarks(
    resources: OpenCanadaResource[],
    revenueRangeKey: "30k_5m" | "5m_20m",
  ): Promise<AggregatedBenchmark[]> {
    // Find relevant CSV files
    const financialRatiosUrl = this.findResourceUrl(
      resources,
      `financial_ratio`,
      revenueRangeKey,
    );
    const expensesUrl = this.findResourceUrl(
      resources,
      `total_expenses_percentage`,
      revenueRangeKey,
    );

    if (!financialRatiosUrl && !expensesUrl) {
      this.logger.warn(
        `No CSV URLs found for ${revenueRangeKey}, using fallback`,
      );
      return this.getFallbackBenchmarks(
        revenueRangeKey === "30k_5m" ? "30k-5m" : "5m-20m",
      );
    }

    // Fetch data in parallel
    const [ratiosData, expensesData] = await Promise.all([
      financialRatiosUrl
        ? this.fetchAndParseCSV<FinancialRatiosRow>(
            financialRatiosUrl,
            this.parseFinancialRatiosRow,
          )
        : Promise.resolve([]),
      expensesUrl
        ? this.fetchAndParseCSV<ExpensesPercentageRow>(
            expensesUrl,
            this.parseExpensesRow,
          )
        : Promise.resolve([]),
    ]);

    // Aggregate by industry
    return this.aggregateIndustryBenchmarks(ratiosData, expensesData);
  }

  /**
   * Find resource URL matching criteria
   */
  private findResourceUrl(
    resources: OpenCanadaResource[],
    nameContains: string,
    revenueRange: string,
  ): string | undefined {
    const resource = resources.find(
      (r) =>
        r.url.toLowerCase().includes(nameContains.toLowerCase()) &&
        r.url.toLowerCase().includes(revenueRange.toLowerCase()),
    );
    return resource?.url;
  }

  /**
   * Generic CSV fetch and parse function
   */
  private async fetchAndParseCSV<T>(
    url: string,
    rowParser: (row: Record<string, string>) => T | null,
  ): Promise<T[]> {
    try {
      this.logger.debug(`Fetching CSV from: ${url}`);
      const response = await this.httpClient.get(url, {
        responseType: "text",
      });

      const parsed = Papa.parse<Record<string, string>>(response.data, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => this.normalizeHeader(header),
      });

      if (parsed.errors.length > 0) {
        this.logger.warn(
          `CSV parse warnings: ${parsed.errors
            .slice(0, 3)
            .map((e) => e.message)
            .join(", ")}`,
        );
      }

      return parsed.data
        .map((row) => rowParser.call(this, row))
        .filter((row): row is T => row !== null);
    } catch (error) {
      this.logger.error(`Failed to fetch/parse CSV from ${url}: ${error}`);
      return [];
    }
  }

  /**
   * Normalize bilingual CSV headers to simple keys
   */
  private normalizeHeader(header: string): string {
    // ISED headers are bilingual with newlines, e.g. "Current ratio\nRatio de la liquidité générale"
    // Take English part (before newline) and convert to camelCase
    const englishPart = header.split("\n")[0].trim();
    return englishPart
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
  }

  /**
   * Parse financial ratios CSV row
   */
  private parseFinancialRatiosRow(
    row: Record<string, string>,
  ): FinancialRatiosRow | null {
    const naicsCode = this.extractValue(row, [
      "naics_code",
      "code_scian",
      "naics",
    ]);
    if (!naicsCode) return null;

    // Only use incorporated businesses (status 2) or all businesses (status 3) for Canada (00)
    const status = this.parseNumber(
      this.extractValue(row, [
        "incorporation_status",
        "status_d_incorporation",
        "etat_d_incorporation",
      ]),
    );
    const province = this.extractValue(row, [
      "canada_province",
      "province_canada",
      "province",
    ]);

    // Filter for Canada-wide data and incorporated businesses
    if (province !== "00" && province !== "0") return null;
    if (status !== 2 && status !== 3) return null;

    return {
      incorporationStatus: status,
      naicsCode: this.normalizeNaicsCode(naicsCode),
      province: province || "00",
      currentRatio: this.parseNumber(this.extractValue(row, ["current_ratio"])),
      currentRatioQ1: this.parseNumber(
        this.extractValue(row, ["bottom_quartile_current_ratio"]),
      ),
      currentRatioQ2: this.parseNumber(
        this.extractValue(row, ["lower_middle_current_ratio"]),
      ),
      currentRatioQ3: this.parseNumber(
        this.extractValue(row, ["upper_middle_current_ratio"]),
      ),
      currentRatioQ4: this.parseNumber(
        this.extractValue(row, ["top_quartile_current_ratio"]),
      ),
      debtToEquity: this.parseNumber(
        this.extractValue(row, ["debt_to_equity_ratio"]),
      ),
      debtToEquityQ1: this.parseNumber(
        this.extractValue(row, ["bottom_quartile_debt_to_equity_ratio"]),
      ),
      debtToEquityQ2: this.parseNumber(
        this.extractValue(row, ["lower_middle_debt_to_equity_ratio"]),
      ),
      debtToEquityQ3: this.parseNumber(
        this.extractValue(row, ["upper_middle_debt_to_equity_ratio"]),
      ),
      debtToEquityQ4: this.parseNumber(
        this.extractValue(row, ["top_quartile_debt_to_equity_ratio"]),
      ),
    };
  }

  /**
   * Parse expenses percentage CSV row
   */
  private parseExpensesRow(
    row: Record<string, string>,
  ): ExpensesPercentageRow | null {
    const naicsCode = this.extractValue(row, [
      "naics_code",
      "code_scian",
      "naics",
    ]);
    if (!naicsCode) return null;

    const status = this.parseNumber(
      this.extractValue(row, [
        "incorporation_status",
        "status_d_incorporation",
        "etat_d_incorporation",
      ]),
    );
    const province = this.extractValue(row, [
      "province_canada",
      "canada_province",
      "province",
    ]);

    // Filter for Canada-wide data
    if (province !== "00" && province !== "0" && province !== "") return null;
    if (status !== 2 && status !== 3) return null;

    return {
      incorporationStatus: status,
      naicsCode: this.normalizeNaicsCode(naicsCode),
      province: province || "00",
      costOfSales: this.parseNumber(
        this.extractValue(row, [
          "cost_of_sales_direct_expenses_",
          "cost_of_sales",
        ]),
      ),
      operatingExpenses: this.parseNumber(
        this.extractValue(row, [
          "operating_expenses",
          "total_operating_expenses",
        ]),
      ),
      wagesAndBenefits: this.parseNumber(
        this.extractValue(row, [
          "wages_and_benefits",
          "salaries_wages_and_benefits",
        ]),
      ),
      rentAndOccupancy: this.parseNumber(
        this.extractValue(row, [
          "rent_and_occupancy",
          "rent",
          "occupancy_costs",
        ]),
      ),
      utilities: this.parseNumber(this.extractValue(row, ["utilities"])),
      advertising: this.parseNumber(
        this.extractValue(row, ["advertising_and_promotion", "advertising"]),
      ),
      depreciation: this.parseNumber(
        this.extractValue(row, [
          "depreciation_and_amortization",
          "depreciation",
        ]),
      ),
      otherExpenses: this.parseNumber(
        this.extractValue(row, ["other_expenses", "other_operating_expenses"]),
      ),
      totalExpenses: this.parseNumber(
        this.extractValue(row, ["total_expenses"]),
      ),
      netIncome: this.parseNumber(
        this.extractValue(row, ["net_income", "net_income_loss_"]),
      ),
    };
  }

  /**
   * Normalize NAICS code format
   * ISED uses 313233 for 31-33 (Manufacturing), 444500 for 44-45 (Retail), etc.
   */
  private normalizeNaicsCode(code: string): string {
    const cleaned = code.replace(/[^0-9]/g, "");

    // Handle special combined codes
    if (cleaned === "313233") return "31-33";
    if (cleaned === "444500") return "44-45";
    if (cleaned === "484900") return "48-49";
    if (cleaned === "111112") return "111-112";

    // Return as-is for standard codes
    return cleaned;
  }

  /**
   * Extract value from row using multiple possible keys
   */
  private extractValue(
    row: Record<string, string>,
    possibleKeys: string[],
  ): string | undefined {
    for (const key of possibleKeys) {
      // Direct match
      if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
        return row[key];
      }
      // Try normalized key
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      const matchingKey = Object.keys(row).find(
        (k) => k.toLowerCase().replace(/[^a-z0-9]+/g, "_") === normalizedKey,
      );
      if (matchingKey && row[matchingKey]) {
        return row[matchingKey];
      }
    }
    return undefined;
  }

  /**
   * Parse number, handling ISED's suppressed data codes
   */
  private parseNumber(value: string | undefined): number {
    if (!value) return 0;

    // ISED uses 9999, 99999.9, 999999 for suppressed/unavailable data
    if (/^9{3,}(\.9+)?$/.test(value.trim())) return 0;

    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Aggregate parsed rows into industry benchmarks
   */
  private aggregateIndustryBenchmarks(
    ratiosData: FinancialRatiosRow[],
    expensesData: ExpensesPercentageRow[],
  ): AggregatedBenchmark[] {
    // Group by industry
    const industryData = new Map<
      string,
      {
        ratios: FinancialRatiosRow[];
        expenses: ExpensesPercentageRow[];
      }
    >();

    // Process ratios data
    for (const row of ratiosData) {
      const industryId = getIndustryFromNAICS(row.naicsCode);
      if (!industryId) continue;

      if (!industryData.has(industryId)) {
        industryData.set(industryId, { ratios: [], expenses: [] });
      }
      industryData.get(industryId)!.ratios.push(row);
    }

    // Process expenses data
    for (const row of expensesData) {
      const industryId = getIndustryFromNAICS(row.naicsCode);
      if (!industryId) continue;

      if (!industryData.has(industryId)) {
        industryData.set(industryId, { ratios: [], expenses: [] });
      }
      industryData.get(industryId)!.expenses.push(row);
    }

    // Build aggregated benchmarks
    const benchmarks: AggregatedBenchmark[] = [];

    for (const [industryId, data] of industryData) {
      const benchmark = this.buildIndustryBenchmark(
        industryId,
        data.ratios,
        data.expenses,
      );
      if (benchmark) {
        benchmarks.push(benchmark);
      }
    }

    // Fill in missing industries with fallback data
    const allIndustries = getAllIndustryIds();
    const presentIndustries = new Set(benchmarks.map((b) => b.industryId));

    for (const industryId of allIndustries) {
      if (!presentIndustries.has(industryId)) {
        const fallback = this.getIndustryFallback(industryId);
        if (fallback) {
          benchmarks.push(fallback);
        }
      }
    }

    return benchmarks;
  }

  /**
   * Build benchmark for a single industry from parsed data
   */
  private buildIndustryBenchmark(
    industryId: string,
    ratios: FinancialRatiosRow[],
    expenses: ExpensesPercentageRow[],
  ): AggregatedBenchmark | null {
    // Prefer incorporated businesses (status 2), fall back to all (status 3)
    const bestRatio =
      ratios.find((r) => r.incorporationStatus === 2) ||
      ratios.find((r) => r.incorporationStatus === 3);
    const bestExpense =
      expenses.find((e) => e.incorporationStatus === 2) ||
      expenses.find((e) => e.incorporationStatus === 3);

    if (!bestRatio && !bestExpense) {
      return null;
    }

    // Calculate gross margin from cost of sales
    const grossMarginMedian = bestExpense
      ? (100 - bestExpense.costOfSales) / 100
      : 0.5;

    // Net margin directly from expenses data
    const netMarginMedian = bestExpense ? bestExpense.netIncome / 100 : 0.05;

    return {
      naicsCode: bestRatio?.naicsCode || bestExpense?.naicsCode || "",
      industryId,
      sampleSize: 1000, // Approximate, not provided in ISED data
      grossMargin: this.estimateQuartiles(grossMarginMedian, 0.15),
      netMargin: this.estimateQuartiles(netMarginMedian, 0.08),
      operatingExpenseRatio: bestExpense
        ? bestExpense.operatingExpenses / 100
        : 0.3,
      wagesToRevenueRatio: bestExpense
        ? bestExpense.wagesAndBenefits / 100
        : 0.25,
      rentToRevenueRatio: bestExpense
        ? bestExpense.rentAndOccupancy / 100
        : 0.05,
      currentRatio: bestRatio
        ? {
            q1: bestRatio.currentRatioQ1 || bestRatio.currentRatio * 0.7,
            median: bestRatio.currentRatio,
            q3: bestRatio.currentRatioQ4 || bestRatio.currentRatio * 1.3,
          }
        : { q1: 1.0, median: 1.5, q3: 2.0 },
      debtToEquity: bestRatio
        ? {
            q1: bestRatio.debtToEquityQ1 || bestRatio.debtToEquity * 0.6,
            median: bestRatio.debtToEquity,
            q3: bestRatio.debtToEquityQ4 || bestRatio.debtToEquity * 1.5,
          }
        : { q1: 0.5, median: 1.5, q3: 2.5 },
    };
  }

  /**
   * Estimate quartiles from median using typical variance
   */
  private estimateQuartiles(median: number, variance: number): QuartileData {
    return {
      q1: Math.max(0, median - variance),
      median,
      q3: median + variance,
    };
  }

  /**
   * Get fallback data for a specific industry
   */
  private getIndustryFallback(industryId: string): AggregatedBenchmark | null {
    const fallbackData = this.getFallbackBenchmarkData()[industryId];
    if (!fallbackData) return null;

    return {
      industryId,
      ...fallbackData,
    };
  }

  /**
   * Get fallback benchmark data when API is unavailable
   * Based on typical Canadian SME benchmarks from historical ISED data
   */
  getFallbackBenchmarks(
    revenueRange: "30k-5m" | "5m-20m",
  ): AggregatedBenchmark[] {
    this.logger.warn(`Using fallback benchmark data for ${revenueRange}`);
    const data = this.getFallbackBenchmarkData();
    return Object.entries(data).map(([industryId, benchmark]) => ({
      industryId,
      ...benchmark,
    }));
  }

  /**
   * Fallback benchmark data by industry
   */
  private getFallbackBenchmarkData(): Record<
    string,
    Omit<AggregatedBenchmark, "industryId">
  > {
    return {
      restaurant: {
        naicsCode: "7225",
        sampleSize: 5000,
        grossMargin: { q1: 0.55, median: 0.65, q3: 0.72 },
        netMargin: { q1: 0.02, median: 0.05, q3: 0.1 },
        operatingExpenseRatio: 0.6,
        wagesToRevenueRatio: 0.3,
        rentToRevenueRatio: 0.08,
        currentRatio: { q1: 0.6, median: 0.9, q3: 1.3 },
        debtToEquity: { q1: 1.5, median: 2.5, q3: 4.0 },
      },
      construction: {
        naicsCode: "23",
        sampleSize: 8000,
        grossMargin: { q1: 0.15, median: 0.22, q3: 0.3 },
        netMargin: { q1: 0.03, median: 0.06, q3: 0.12 },
        operatingExpenseRatio: 0.16,
        wagesToRevenueRatio: 0.25,
        rentToRevenueRatio: 0.02,
        currentRatio: { q1: 1.1, median: 1.4, q3: 1.9 },
        debtToEquity: { q1: 1.0, median: 1.8, q3: 3.0 },
      },
      retail: {
        naicsCode: "44-45",
        sampleSize: 12000,
        grossMargin: { q1: 0.28, median: 0.35, q3: 0.45 },
        netMargin: { q1: 0.01, median: 0.04, q3: 0.08 },
        operatingExpenseRatio: 0.31,
        wagesToRevenueRatio: 0.15,
        rentToRevenueRatio: 0.06,
        currentRatio: { q1: 1.2, median: 1.6, q3: 2.2 },
        debtToEquity: { q1: 0.8, median: 1.5, q3: 2.5 },
      },
      professional_services: {
        naicsCode: "5412",
        sampleSize: 15000,
        grossMargin: { q1: 0.4, median: 0.55, q3: 0.7 },
        netMargin: { q1: 0.08, median: 0.15, q3: 0.25 },
        operatingExpenseRatio: 0.4,
        wagesToRevenueRatio: 0.45,
        rentToRevenueRatio: 0.05,
        currentRatio: { q1: 1.3, median: 1.8, q3: 2.5 },
        debtToEquity: { q1: 0.3, median: 0.8, q3: 1.5 },
      },
      real_estate: {
        naicsCode: "531",
        sampleSize: 4000,
        grossMargin: { q1: 0.5, median: 0.65, q3: 0.75 },
        netMargin: { q1: 0.1, median: 0.2, q3: 0.35 },
        operatingExpenseRatio: 0.45,
        wagesToRevenueRatio: 0.1,
        rentToRevenueRatio: 0.15,
        currentRatio: { q1: 0.8, median: 1.2, q3: 1.8 },
        debtToEquity: { q1: 2.0, median: 3.0, q3: 5.0 },
      },
      hospitality: {
        naicsCode: "721",
        sampleSize: 3000,
        grossMargin: { q1: 0.6, median: 0.7, q3: 0.78 },
        netMargin: { q1: 0.02, median: 0.08, q3: 0.15 },
        operatingExpenseRatio: 0.62,
        wagesToRevenueRatio: 0.35,
        rentToRevenueRatio: 0.1,
        currentRatio: { q1: 0.5, median: 0.8, q3: 1.2 },
        debtToEquity: { q1: 1.8, median: 2.8, q3: 4.5 },
      },
      manufacturing: {
        naicsCode: "31-33",
        sampleSize: 6000,
        grossMargin: { q1: 0.22, median: 0.3, q3: 0.4 },
        netMargin: { q1: 0.03, median: 0.07, q3: 0.12 },
        operatingExpenseRatio: 0.23,
        wagesToRevenueRatio: 0.2,
        rentToRevenueRatio: 0.04,
        currentRatio: { q1: 1.2, median: 1.5, q3: 2.0 },
        debtToEquity: { q1: 0.8, median: 1.6, q3: 2.8 },
      },
      healthcare: {
        naicsCode: "6211",
        sampleSize: 5000,
        grossMargin: { q1: 0.45, median: 0.55, q3: 0.65 },
        netMargin: { q1: 0.1, median: 0.18, q3: 0.28 },
        operatingExpenseRatio: 0.37,
        wagesToRevenueRatio: 0.4,
        rentToRevenueRatio: 0.08,
        currentRatio: { q1: 1.5, median: 2.0, q3: 2.8 },
        debtToEquity: { q1: 0.2, median: 0.6, q3: 1.2 },
      },
      technology: {
        naicsCode: "5415",
        sampleSize: 4000,
        grossMargin: { q1: 0.5, median: 0.65, q3: 0.8 },
        netMargin: { q1: 0.05, median: 0.12, q3: 0.22 },
        operatingExpenseRatio: 0.53,
        wagesToRevenueRatio: 0.5,
        rentToRevenueRatio: 0.03,
        currentRatio: { q1: 1.6, median: 2.2, q3: 3.0 },
        debtToEquity: { q1: 0.2, median: 0.5, q3: 1.0 },
      },
      transport: {
        naicsCode: "484",
        sampleSize: 3500,
        grossMargin: { q1: 0.15, median: 0.22, q3: 0.3 },
        netMargin: { q1: 0.02, median: 0.05, q3: 0.1 },
        operatingExpenseRatio: 0.17,
        wagesToRevenueRatio: 0.3,
        rentToRevenueRatio: 0.02,
        currentRatio: { q1: 1.0, median: 1.3, q3: 1.8 },
        debtToEquity: { q1: 1.2, median: 2.0, q3: 3.2 },
      },
      agriculture: {
        naicsCode: "111-112",
        sampleSize: 2500,
        grossMargin: { q1: 0.2, median: 0.3, q3: 0.42 },
        netMargin: { q1: 0.03, median: 0.08, q3: 0.15 },
        operatingExpenseRatio: 0.22,
        wagesToRevenueRatio: 0.15,
        rentToRevenueRatio: 0.08,
        currentRatio: { q1: 1.1, median: 1.4, q3: 1.9 },
        debtToEquity: { q1: 1.0, median: 1.8, q3: 3.0 },
      },
      education: {
        naicsCode: "6116",
        sampleSize: 2000,
        grossMargin: { q1: 0.45, median: 0.55, q3: 0.68 },
        netMargin: { q1: 0.05, median: 0.12, q3: 0.2 },
        operatingExpenseRatio: 0.43,
        wagesToRevenueRatio: 0.55,
        rentToRevenueRatio: 0.1,
        currentRatio: { q1: 1.2, median: 1.6, q3: 2.2 },
        debtToEquity: { q1: 0.3, median: 0.8, q3: 1.5 },
      },
      wholesale: {
        naicsCode: "41",
        sampleSize: 4500,
        grossMargin: { q1: 0.18, median: 0.25, q3: 0.32 },
        netMargin: { q1: 0.02, median: 0.04, q3: 0.08 },
        operatingExpenseRatio: 0.21,
        wagesToRevenueRatio: 0.12,
        rentToRevenueRatio: 0.03,
        currentRatio: { q1: 1.2, median: 1.5, q3: 2.0 },
        debtToEquity: { q1: 0.8, median: 1.4, q3: 2.2 },
      },
      automotive: {
        naicsCode: "4411",
        sampleSize: 3000,
        grossMargin: { q1: 0.12, median: 0.18, q3: 0.25 },
        netMargin: { q1: 0.01, median: 0.03, q3: 0.06 },
        operatingExpenseRatio: 0.15,
        wagesToRevenueRatio: 0.1,
        rentToRevenueRatio: 0.03,
        currentRatio: { q1: 1.1, median: 1.4, q3: 1.9 },
        debtToEquity: { q1: 1.4, median: 2.2, q3: 3.5 },
      },
      beauty_wellness: {
        naicsCode: "8121",
        sampleSize: 2500,
        grossMargin: { q1: 0.55, median: 0.65, q3: 0.75 },
        netMargin: { q1: 0.05, median: 0.12, q3: 0.2 },
        operatingExpenseRatio: 0.53,
        wagesToRevenueRatio: 0.35,
        rentToRevenueRatio: 0.12,
        currentRatio: { q1: 0.9, median: 1.2, q3: 1.7 },
        debtToEquity: { q1: 0.5, median: 1.0, q3: 1.8 },
      },
    };
  }

  /**
   * Convert aggregated benchmarks to database format
   */
  toBenchmarkEntities(
    benchmarks: AggregatedBenchmark[],
    revenueRange: RevenueRange,
    referenceYear: number,
  ): Partial<IndustryBenchmark>[] {
    return benchmarks.map((b) => ({
      industryId: b.industryId,
      naicsCode: b.naicsCode,
      dataSource: "ised" as const,
      referenceYear,
      revenueRange,
      profitability: {
        grossMargin: b.grossMargin,
        netMargin: b.netMargin,
      },
      operations: {
        operatingExpenseRatio: b.operatingExpenseRatio,
        wagesToRevenueRatio: b.wagesToRevenueRatio,
        rentToRevenueRatio: b.rentToRevenueRatio,
      },
      balanceSheet: {
        currentRatio:
          typeof b.currentRatio === "object"
            ? b.currentRatio.median
            : b.currentRatio,
        debtToEquity:
          typeof b.debtToEquity === "object"
            ? b.debtToEquity.median
            : b.debtToEquity,
      },
      sampleSize: b.sampleSize,
    }));
  }
}
