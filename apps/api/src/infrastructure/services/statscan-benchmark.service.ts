/**
 * Statistics Canada Web Data Service (WDS) Integration
 *
 * Fetches quarterly industry financial data from Statistics Canada's public API.
 * Used to supplement ISED annual data with quarterly growth trends.
 *
 * API Documentation: https://www.statcan.gc.ca/en/developers/wds
 * Table 33-10-0226-01: Quarterly balance sheet and income statement, by industry
 *
 * No authentication required - Free public government API
 */

import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import axios, { AxiosInstance } from "axios";
import { GrowthMetrics } from "@domain/market-analysis/benchmark.types";
import { NAICS_MAPPINGS } from "@domain/market-analysis/naics-mapping";

/**
 * Statistics Canada WDS base URL
 */
const STATSCAN_WDS_BASE = "https://www150.statcan.gc.ca/t1/wds/rest";

/**
 * Product ID for the quarterly financial statements table
 */
const QUARTERLY_FINANCIALS_TABLE_ID = 33100226;

/**
 * Verified vector IDs for key metrics by industry
 * These were discovered using getSeriesInfoFromCubePidCoord API on 2026-01-29
 * Coordinates format: Geography.Industry.Component (e.g., "1.7.1.0.0.0.0.0.0.0")
 *
 * Industry member IDs from table metadata:
 * - 3: Agriculture, forestry, fishing and hunting
 * - 7: Construction
 * - 25: Other wholesalers
 * - 29: Other retailers
 * - 30: Transportation, postal and couriers
 * - 35: Real estate
 * - 37: Professional, scientific and technical services
 * - 39: Educational, health care and social assistance
 * - 40: Arts, entertainment, accommodation and food services
 * - 41: Repair, maintenance and personal services
 *
 * Component IDs:
 * - 1: Total operating revenue
 * - 5: Operating profit or loss
 */
const VERIFIED_VECTOR_IDS: Record<
  string,
  { revenue: number; profit: number; memberId: number }
> = {
  agriculture: { revenue: 1146004135, profit: 1446299953, memberId: 3 },
  construction: { revenue: 1146004147, profit: 1446299955, memberId: 7 },
  wholesale: { revenue: 1146004201, profit: 1446299988, memberId: 25 },
  retail: { revenue: 1146004213, profit: 1446299990, memberId: 29 },
  transport: { revenue: 1146004216, profit: 1446299991, memberId: 30 },
  real_estate: { revenue: 1146004231, profit: 1446299970, memberId: 35 },
  professional_services: {
    revenue: 1146004237,
    profit: 1446299956,
    memberId: 37,
  },
  healthcare: { revenue: 1146004243, profit: 1446300002, memberId: 39 },
  hospitality: { revenue: 1146004246, profit: 1446300003, memberId: 40 },
  restaurant: { revenue: 1146004246, profit: 1446300003, memberId: 40 }, // Same as hospitality
  beauty_wellness: { revenue: 1146004249, profit: 1446300004, memberId: 41 },
};

/**
 * Response from WDS getDataFromVectorsAndLatestNPeriods
 */
interface WDSDataResponse {
  status: string;
  object: {
    responseStatusCode: number;
    vectorDataPoint: Array<{
      vectorId: number;
      coordinate: string;
      refPer: string;
      refPer2: string;
      value: number;
      decimals: number;
      scalarFactorCode: number;
      symbolCode: number;
      statusCode: number;
      securityLevelCode: number;
      releaseTime: string;
    }>;
  };
}

/**
 * Response from WDS getSeriesInfoFromCubePidCoord
 */
interface WDSSeriesInfoResponse {
  status: string;
  object: {
    responseStatusCode: number;
    productId: number;
    coordinate: string;
    vectorId: number;
    frequencyCode: number;
    scalarFactorCode: number;
    decimals: number;
    terminated: number;
    SeriesTitleEn: string;
    SeriesTitleFr: string;
    memberUomCode: number;
  };
}

/**
 * Industry growth data
 */
export interface IndustryGrowthData {
  industryId: string;
  referenceQuarter: string;
  growth: GrowthMetrics;
  latestRevenue: number;
  latestProfit: number;
}

/**
 * API health status
 */
export interface StatsCanAPIHealth {
  isHealthy: boolean;
  lastChecked: Date;
  responseTimeMs: number;
  tableAvailable: boolean;
  errorMessage?: string;
}

@Injectable()
export class StatsCanBenchmarkService implements OnModuleInit {
  private readonly logger = new Logger(StatsCanBenchmarkService.name);
  private readonly httpClient: AxiosInstance;
  private vectorCache: Map<string, { revenue: number; profit: number }> =
    new Map();
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor() {
    this.httpClient = axios.create({
      baseURL: STATSCAN_WDS_BASE,
      timeout: 30000,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    // Initialize cache with verified IDs
    for (const [industryId, vectors] of Object.entries(VERIFIED_VECTOR_IDS)) {
      this.vectorCache.set(industryId, {
        revenue: vectors.revenue,
        profit: vectors.profit,
      });
    }
    this.cacheTimestamp = Date.now();
  }

  /**
   * Verify vector IDs on startup
   */
  async onModuleInit() {
    // Optionally refresh vector IDs on startup
    // this.refreshVectorIds().catch((e) => this.logger.warn(`Vector ID refresh failed: ${e}`));
  }

  /**
   * Check API health
   */
  async checkAPIHealth(): Promise<StatsCanAPIHealth> {
    const startTime = Date.now();
    try {
      // Quick health check by listing cubes
      const response = await this.httpClient.get("/getAllCubesListLite", {
        timeout: 10000,
      });

      const cubes = response.data || [];
      const tableExists = cubes.some(
        (c: { productId: number }) =>
          c.productId === QUARTERLY_FINANCIALS_TABLE_ID,
      );

      return {
        isHealthy: true,
        lastChecked: new Date(),
        responseTimeMs: Date.now() - startTime,
        tableAvailable: tableExists,
      };
    } catch (error) {
      return {
        isHealthy: false,
        lastChecked: new Date(),
        responseTimeMs: Date.now() - startTime,
        tableAvailable: false,
        errorMessage: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Discover vector ID for an industry dynamically
   * Uses the getSeriesInfoFromCubePidCoord API
   */
  async discoverVectorId(
    memberId: number,
    componentId: 1 | 5,
  ): Promise<number | null> {
    try {
      // Coordinate format: Geography.Industry.Component.0.0.0.0.0.0.0
      const coordinate = `1.${memberId}.${componentId}.0.0.0.0.0.0.0`;

      const response = await this.httpClient.post<WDSSeriesInfoResponse[]>(
        "/getSeriesInfoFromCubePidCoord",
        [{ productId: QUARTERLY_FINANCIALS_TABLE_ID, coordinate }],
      );

      if (
        response.data?.[0]?.status === "SUCCESS" &&
        response.data[0].object?.vectorId
      ) {
        return response.data[0].object.vectorId;
      }
      return null;
    } catch (error) {
      this.logger.warn(
        `Failed to discover vector ID for member ${memberId}: ${error}`,
      );
      return null;
    }
  }

  /**
   * Refresh all vector IDs from the API
   * Called periodically or when vectors seem stale
   */
  async refreshVectorIds(): Promise<void> {
    this.logger.log("Refreshing Statistics Canada vector IDs...");

    for (const [industryId, vectors] of Object.entries(VERIFIED_VECTOR_IDS)) {
      try {
        const [revenueId, profitId] = await Promise.all([
          this.discoverVectorId(vectors.memberId, 1),
          this.discoverVectorId(vectors.memberId, 5),
        ]);

        if (revenueId && profitId) {
          this.vectorCache.set(industryId, {
            revenue: revenueId,
            profit: profitId,
          });
          this.logger.debug(
            `Updated vectors for ${industryId}: revenue=${revenueId}, profit=${profitId}`,
          );
        }
      } catch (error) {
        this.logger.warn(
          `Failed to refresh vectors for ${industryId}: ${error}`,
        );
      }
    }

    this.cacheTimestamp = Date.now();
    this.logger.log(
      `Vector ID refresh complete. Cached ${this.vectorCache.size} industries.`,
    );
  }

  /**
   * Fetch quarterly growth data for all mapped industries
   */
  async fetchQuarterlyGrowth(): Promise<IndustryGrowthData[]> {
    this.logger.log("Fetching quarterly growth data from Statistics Canada...");

    const results: IndustryGrowthData[] = [];

    // Fetch data for each industry that has vector mappings
    for (const industryId of this.vectorCache.keys()) {
      if (industryId === "restaurant") continue; // Skip duplicate (same as hospitality)

      try {
        const growthData = await this.fetchIndustryGrowth(industryId);
        if (growthData) {
          results.push(growthData);
        }
      } catch (error) {
        this.logger.warn(`Failed to fetch data for ${industryId}: ${error}`);
        // Add fallback data for this industry
        results.push(this.getFallbackGrowthData(industryId));
      }
    }

    // Add fallback data for unmapped industries
    const mappedIndustries = new Set(this.vectorCache.keys());
    const allIndustries = NAICS_MAPPINGS.map((m) => m.industryId);
    const unmappedIndustries = allIndustries.filter(
      (id) => !mappedIndustries.has(id),
    );

    for (const industryId of unmappedIndustries) {
      results.push(this.getFallbackGrowthData(industryId));
    }

    this.logger.log(`Fetched growth data for ${results.length} industries`);
    return results;
  }

  /**
   * Fetch growth data for a specific industry
   */
  private async fetchIndustryGrowth(
    industryId: string,
  ): Promise<IndustryGrowthData | null> {
    const vectors = this.vectorCache.get(industryId);
    if (!vectors) {
      return this.getFallbackGrowthData(industryId);
    }

    try {
      // Fetch the last 8 quarters of data (2 years)
      const response = await this.httpClient.post<WDSDataResponse[]>(
        "/getDataFromVectorsAndLatestNPeriods",
        [
          { vectorId: vectors.revenue, latestN: 8 },
          { vectorId: vectors.profit, latestN: 8 },
        ],
      );

      if (!response.data || response.data.length < 2) {
        this.logger.warn(`Incomplete data for ${industryId}`);
        return this.getFallbackGrowthData(industryId);
      }

      const revenueResponse = response.data[0];
      const profitResponse = response.data[1];

      // Check for API errors
      if (revenueResponse?.status !== "SUCCESS") {
        this.logger.warn(
          `Revenue fetch failed for ${industryId}: ${revenueResponse?.status}`,
        );
        return this.getFallbackGrowthData(industryId);
      }

      const revenueData = revenueResponse.object?.vectorDataPoint || [];
      const profitData = profitResponse?.object?.vectorDataPoint || [];

      if (revenueData.length < 5) {
        // Need at least 5 quarters for YoY calculation
        this.logger.warn(
          `Insufficient revenue data for ${industryId}: ${revenueData.length} periods`,
        );
        return this.getFallbackGrowthData(industryId);
      }

      // Sort by reference period (most recent first)
      revenueData.sort(
        (a, b) => new Date(b.refPer).getTime() - new Date(a.refPer).getTime(),
      );
      profitData.sort(
        (a, b) => new Date(b.refPer).getTime() - new Date(a.refPer).getTime(),
      );

      // Calculate growth rates
      const latestRevenue = revenueData[0]?.value || 0;
      const priorQuarterRevenue = revenueData[1]?.value || 0;
      const priorYearRevenue = revenueData[4]?.value || 0; // Same quarter, prior year

      const qoqGrowth =
        priorQuarterRevenue > 0
          ? (latestRevenue - priorQuarterRevenue) / priorQuarterRevenue
          : 0;

      const yoyGrowth =
        priorYearRevenue > 0
          ? (latestRevenue - priorYearRevenue) / priorYearRevenue
          : 0;

      // Format reference quarter
      const latestPeriod = revenueData[0]?.refPer || "";
      const [year, month] = latestPeriod.split("-");
      const quarter = Math.ceil(parseInt(month) / 3);
      const referenceQuarter = `${year}-Q${quarter}`;

      return {
        industryId,
        referenceQuarter,
        growth: {
          revenueQoQ: Math.round(qoqGrowth * 10000) / 10000,
          revenueYoY: Math.round(yoyGrowth * 10000) / 10000,
        },
        latestRevenue,
        latestProfit: profitData[0]?.value || 0,
      };
    } catch (error) {
      this.logger.error(
        `Error fetching Stats Can data for ${industryId}: ${error}`,
      );
      return this.getFallbackGrowthData(industryId);
    }
  }

  /**
   * Get fallback growth data for industries without direct vector mapping
   * Based on general Canadian economic trends
   */
  private getFallbackGrowthData(industryId: string): IndustryGrowthData {
    // Default growth rates based on typical Canadian SME trends
    const fallbackGrowth: Record<string, GrowthMetrics> = {
      real_estate: { revenueYoY: 0.02, revenueQoQ: 0.005 },
      healthcare: { revenueYoY: 0.04, revenueQoQ: 0.01 },
      technology: { revenueYoY: 0.08, revenueQoQ: 0.02 },
      education: { revenueYoY: 0.03, revenueQoQ: 0.01 },
      agriculture: { revenueYoY: 0.02, revenueQoQ: 0.01 },
      automotive: { revenueYoY: 0.01, revenueQoQ: 0.005 },
      beauty_wellness: { revenueYoY: 0.05, revenueQoQ: 0.015 },
      construction: { revenueYoY: 0.03, revenueQoQ: 0.008 },
      retail: { revenueYoY: 0.025, revenueQoQ: 0.006 },
      wholesale: { revenueYoY: 0.03, revenueQoQ: 0.007 },
      transport: { revenueYoY: 0.035, revenueQoQ: 0.009 },
      professional_services: { revenueYoY: 0.04, revenueQoQ: 0.01 },
      hospitality: { revenueYoY: 0.06, revenueQoQ: 0.015 },
      restaurant: { revenueYoY: 0.06, revenueQoQ: 0.015 },
      manufacturing: { revenueYoY: 0.02, revenueQoQ: 0.005 },
    };

    const growth = fallbackGrowth[industryId] || {
      revenueYoY: 0.025,
      revenueQoQ: 0.006,
    };

    // Generate current quarter reference
    const now = new Date();
    const quarter = Math.ceil((now.getMonth() + 1) / 3);
    const referenceQuarter = `${now.getFullYear()}-Q${quarter}`;

    return {
      industryId,
      referenceQuarter,
      growth,
      latestRevenue: 0, // Not available for unmapped industries
      latestProfit: 0,
    };
  }

  /**
   * Get the list of available data cubes (tables) from Statistics Canada
   * Useful for discovering additional data sources
   */
  async getAvailableCubes(): Promise<
    Array<{ productId: string; title: string; endDate: string }>
  > {
    try {
      const response = await this.httpClient.get("/getAllCubesListLite");
      return (
        response.data?.map(
          (cube: {
            productId: number;
            cubeTitleEn: string;
            cubeEndDate: string;
          }) => ({
            productId: String(cube.productId),
            title: cube.cubeTitleEn,
            endDate: cube.cubeEndDate,
          }),
        ) || []
      );
    } catch (error) {
      this.logger.error(`Failed to get available cubes: ${error}`);
      return [];
    }
  }

  /**
   * Get metadata for the quarterly financial statements table
   */
  async getTableMetadata(): Promise<{
    title: string;
    startDate: string;
    endDate: string;
    dimensions: Array<{ name: string; memberCount: number }>;
  } | null> {
    try {
      const response = await this.httpClient.post("/getCubeMetadata", [
        { productId: QUARTERLY_FINANCIALS_TABLE_ID },
      ]);

      if (response.data?.[0]?.object) {
        const meta = response.data[0].object;
        return {
          title: meta.cubeTitleEn,
          startDate: meta.cubeStartDate,
          endDate: meta.cubeEndDate,
          dimensions:
            meta.dimension?.map(
              (d: { dimensionNameEn: string; member: unknown[] }) => ({
                name: d.dimensionNameEn,
                memberCount: d.member?.length || 0,
              }),
            ) || [],
        };
      }
      return null;
    } catch (error) {
      this.logger.error(`Failed to get table metadata: ${error}`);
      return null;
    }
  }

  /**
   * Get latest data release date for the table
   */
  async getLatestReleaseDate(): Promise<Date | null> {
    try {
      const cubes = await this.getAvailableCubes();
      const ourTable = cubes.find(
        (c) => c.productId === String(QUARTERLY_FINANCIALS_TABLE_ID),
      );
      if (ourTable?.endDate) {
        return new Date(ourTable.endDate);
      }
      return null;
    } catch {
      return null;
    }
  }
}
