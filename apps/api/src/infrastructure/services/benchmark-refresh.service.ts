/**
 * Benchmark Data Refresh Service
 *
 * Orchestrates periodic refresh of industry benchmark data from ISED and Statistics Canada.
 * Can be triggered manually or scheduled via cron job.
 */

import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Cron } from "@nestjs/schedule";
import {
  IndustryBenchmarkEntity,
  BenchmarkRefreshLogEntity,
} from "../persistence/postgres/entities/industry-benchmark.entity";
import { ISEDBenchmarkService } from "./ised-benchmark.service";
import {
  StatsCanBenchmarkService,
  IndustryGrowthData,
} from "./statscan-benchmark.service";
import {
  IndustryBenchmark,
  RevenueRange,
} from "@domain/market-analysis/benchmark.types";
import { getNAICSMapping } from "@domain/market-analysis/naics-mapping";

@Injectable()
export class BenchmarkRefreshService implements OnModuleInit {
  private readonly logger = new Logger(BenchmarkRefreshService.name);
  private isRefreshing = false;

  constructor(
    @InjectRepository(IndustryBenchmarkEntity)
    private readonly benchmarkRepo: Repository<IndustryBenchmarkEntity>,
    @InjectRepository(BenchmarkRefreshLogEntity)
    private readonly refreshLogRepo: Repository<BenchmarkRefreshLogEntity>,
    private readonly isedService: ISEDBenchmarkService,
    private readonly statsCanService: StatsCanBenchmarkService,
  ) {}

  /**
   * Initialize benchmark data on module startup if empty
   */
  async onModuleInit() {
    this.logger.log("[onModuleInit] BenchmarkRefreshService starting initialization...");
    try {
      this.logger.log("[onModuleInit] Executing benchmark count query...");
      const count = await this.benchmarkRepo.count();
      this.logger.log(`[onModuleInit] Benchmark count: ${count}`);
      if (count === 0) {
        this.logger.log("No benchmark data found, triggering initial load...");
        // Delay initial load to let the application fully start
        setTimeout(() => this.refreshAllBenchmarks(), 5000);
      }
      this.logger.log("[onModuleInit] BenchmarkRefreshService initialization complete");
    } catch (error) {
      this.logger.error(`[onModuleInit] BenchmarkRefreshService failed: ${error.message}`);
    }
  }

  /**
   * Scheduled refresh - runs monthly on the 1st at 3 AM
   * ISED data is updated annually, Stats Can quarterly
   */
  @Cron("0 3 1 * *") // At 03:00 on day-of-month 1
  async scheduledRefresh() {
    this.logger.log("Starting scheduled benchmark refresh...");
    await this.refreshAllBenchmarks();
  }

  /**
   * Manual trigger for full refresh
   */
  async refreshAllBenchmarks(): Promise<{
    success: boolean;
    message: string;
    stats: { created: number; updated: number };
  }> {
    if (this.isRefreshing) {
      return {
        success: false,
        message: "Refresh already in progress",
        stats: { created: 0, updated: 0 },
      };
    }

    this.isRefreshing = true;
    const log = await this.createRefreshLog("all", "full");

    try {
      // Fetch ISED benchmarks
      this.logger.log("Fetching ISED benchmark data...");
      const isedData = await this.isedService.fetchBenchmarks();

      // Fetch Stats Can quarterly growth data
      this.logger.log("Fetching Statistics Canada growth data...");
      const growthData = await this.statsCanService.fetchQuarterlyGrowth();

      // Save ISED data
      const isedStats = await this.saveISEDBenchmarks(
        isedData.small,
        isedData.medium,
        isedData.referenceYear,
      );

      // Merge growth data into existing benchmarks
      const growthStats = await this.mergeGrowthData(growthData);

      // Update log
      const totalCreated = isedStats.created + growthStats.created;
      const totalUpdated = isedStats.updated + growthStats.updated;

      await this.completeRefreshLog(log.id, "completed", {
        processed: totalCreated + totalUpdated,
        created: totalCreated,
        updated: totalUpdated,
      });

      this.logger.log(
        `Benchmark refresh complete: ${totalCreated} created, ${totalUpdated} updated`,
      );

      return {
        success: true,
        message: `Refreshed benchmark data: ${totalCreated} created, ${totalUpdated} updated`,
        stats: { created: totalCreated, updated: totalUpdated },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Benchmark refresh failed: ${errorMessage}`);

      await this.completeRefreshLog(log.id, "failed", {
        processed: 0,
        created: 0,
        updated: 0,
        error: errorMessage,
      });

      return {
        success: false,
        message: `Refresh failed: ${errorMessage}`,
        stats: { created: 0, updated: 0 },
      };
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Save ISED benchmark data to database
   */
  private async saveISEDBenchmarks(
    smallBizData: Array<{
      industryId: string;
      naicsCode: string;
      sampleSize: number;
      grossMargin: { q1: number; median: number; q3: number };
      netMargin: { q1: number; median: number; q3: number };
      operatingExpenseRatio: number;
      wagesToRevenueRatio: number;
      rentToRevenueRatio: number;
      currentRatio: { q1: number; median: number; q3: number } | number;
      debtToEquity: { q1: number; median: number; q3: number } | number;
    }>,
    mediumBizData: Array<{
      industryId: string;
      naicsCode: string;
      sampleSize: number;
      grossMargin: { q1: number; median: number; q3: number };
      netMargin: { q1: number; median: number; q3: number };
      operatingExpenseRatio: number;
      wagesToRevenueRatio: number;
      rentToRevenueRatio: number;
      currentRatio: { q1: number; median: number; q3: number } | number;
      debtToEquity: { q1: number; median: number; q3: number } | number;
    }>,
    referenceYear: number,
  ): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;

    // Save small business benchmarks
    for (const data of smallBizData) {
      const result = await this.upsertBenchmark(data, "30k-5m", referenceYear);
      if (result === "created") created++;
      else if (result === "updated") updated++;
    }

    // Save medium business benchmarks
    for (const data of mediumBizData) {
      const result = await this.upsertBenchmark(data, "5m-20m", referenceYear);
      if (result === "created") created++;
      else if (result === "updated") updated++;
    }

    return { created, updated };
  }

  /**
   * Upsert a single benchmark record
   */
  private async upsertBenchmark(
    data: {
      industryId: string;
      naicsCode: string;
      sampleSize: number;
      grossMargin: { q1: number; median: number; q3: number };
      netMargin: { q1: number; median: number; q3: number };
      operatingExpenseRatio: number;
      wagesToRevenueRatio: number;
      rentToRevenueRatio: number;
      currentRatio: { q1: number; median: number; q3: number } | number;
      debtToEquity: { q1: number; median: number; q3: number } | number;
    },
    revenueRange: RevenueRange,
    referenceYear: number,
  ): Promise<"created" | "updated" | "unchanged"> {
    const existing = await this.benchmarkRepo.findOne({
      where: {
        industryId: data.industryId,
        dataSource: "ised",
        referenceYear,
        revenueRange,
      },
    });

    // Handle both QuartileData and number types for currentRatio/debtToEquity
    const currentRatioValue =
      typeof data.currentRatio === "object"
        ? data.currentRatio.median
        : data.currentRatio;
    const debtToEquityValue =
      typeof data.debtToEquity === "object"
        ? data.debtToEquity.median
        : data.debtToEquity;

    const entity: Partial<IndustryBenchmarkEntity> = {
      industryId: data.industryId,
      naicsCode: data.naicsCode,
      dataSource: "ised",
      referenceYear,
      revenueRange,
      grossMarginQ1: data.grossMargin.q1,
      grossMarginMedian: data.grossMargin.median,
      grossMarginQ3: data.grossMargin.q3,
      netMarginQ1: data.netMargin.q1,
      netMarginMedian: data.netMargin.median,
      netMarginQ3: data.netMargin.q3,
      operatingExpenseRatio: data.operatingExpenseRatio,
      wagesToRevenueRatio: data.wagesToRevenueRatio,
      rentToRevenueRatio: data.rentToRevenueRatio,
      currentRatioMedian: currentRatioValue,
      debtToEquityMedian: debtToEquityValue,
      sampleSize: data.sampleSize,
    };

    if (existing) {
      await this.benchmarkRepo.update(existing.id, entity);
      return "updated";
    } else {
      await this.benchmarkRepo.save(entity);
      return "created";
    }
  }

  /**
   * Merge Statistics Canada growth data into existing benchmarks
   */
  private async mergeGrowthData(
    growthData: IndustryGrowthData[],
  ): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;

    for (const data of growthData) {
      // Update growth metrics for all existing benchmarks of this industry
      const existing = await this.benchmarkRepo.find({
        where: { industryId: data.industryId },
      });

      if (existing.length > 0) {
        for (const benchmark of existing) {
          await this.benchmarkRepo.update(benchmark.id, {
            revenueYoyGrowth: data.growth.revenueYoY,
            revenueQoqGrowth: data.growth.revenueQoQ,
          });
          updated++;
        }
      } else {
        // Create a new benchmark with just growth data
        const naicsMapping = getNAICSMapping(data.industryId);
        if (naicsMapping) {
          await this.benchmarkRepo.save({
            industryId: data.industryId,
            naicsCode: naicsMapping.naicsCode,
            dataSource: "statscan",
            referenceQuarter: data.referenceQuarter,
            revenueRange: "all",
            revenueYoyGrowth: data.growth.revenueYoY,
            revenueQoqGrowth: data.growth.revenueQoQ,
          });
          created++;
        }
      }
    }

    return { created, updated };
  }

  /**
   * Create a refresh log entry
   */
  private async createRefreshLog(
    dataSource: string,
    refreshType: "full" | "incremental",
  ): Promise<BenchmarkRefreshLogEntity> {
    const log = this.refreshLogRepo.create({
      dataSource,
      refreshType,
      status: "started",
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
    });
    return this.refreshLogRepo.save(log);
  }

  /**
   * Complete a refresh log entry
   */
  private async completeRefreshLog(
    logId: string,
    status: "completed" | "failed",
    stats: {
      processed: number;
      created: number;
      updated: number;
      error?: string;
    },
  ): Promise<void> {
    await this.refreshLogRepo.update(logId, {
      status,
      recordsProcessed: stats.processed,
      recordsCreated: stats.created,
      recordsUpdated: stats.updated,
      errorMessage: stats.error || null,
      completedAt: new Date(),
    });
  }

  /**
   * Get refresh status and history
   */
  async getRefreshStatus(): Promise<{
    isRefreshing: boolean;
    lastRefresh: BenchmarkRefreshLogEntity | null;
    recentRefreshes: BenchmarkRefreshLogEntity[];
  }> {
    const recentRefreshes = await this.refreshLogRepo.find({
      order: { startedAt: "DESC" },
      take: 10,
    });

    return {
      isRefreshing: this.isRefreshing,
      lastRefresh: recentRefreshes[0] || null,
      recentRefreshes,
    };
  }

  /**
   * Get benchmark data for a specific industry
   */
  async getBenchmarksForIndustry(
    industryId: string,
    revenueRange?: RevenueRange,
  ): Promise<IndustryBenchmarkEntity[]> {
    const where: { industryId: string; revenueRange?: RevenueRange } = {
      industryId,
    };
    if (revenueRange) {
      where.revenueRange = revenueRange;
    }

    return this.benchmarkRepo.find({
      where,
      order: { referenceYear: "DESC" },
    });
  }

  /**
   * Get all benchmarks
   */
  async getAllBenchmarks(): Promise<IndustryBenchmarkEntity[]> {
    return this.benchmarkRepo.find({
      order: { industryId: "ASC", referenceYear: "DESC" },
    });
  }
}
