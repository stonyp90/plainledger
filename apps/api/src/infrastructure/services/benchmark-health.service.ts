/**
 * Benchmark Data Health Monitoring Service
 *
 * Monitors the freshness and accuracy of benchmark data from external sources.
 * Provides health checks, data validation, and alerting for stale data.
 */

import { Injectable, Logger } from "@nestjs/common";
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
  StatsCanAPIHealth,
} from "./statscan-benchmark.service";
import { NotificationService } from "../notifications/notification.service";
import { getAllIndustryIds } from "@domain/market-analysis/naics-mapping";

/**
 * Overall health status for benchmark data
 */
export interface BenchmarkHealthStatus {
  overallHealth: "healthy" | "warning" | "critical";
  lastChecked: Date;
  isedHealth: ISEDHealthStatus;
  statsCanHealth: StatsCanAPIHealth;
  dataFreshness: DataFreshnessStatus;
  coverage: DataCoverageStatus;
  recommendations: string[];
}

/**
 * ISED-specific health status
 */
export interface ISEDHealthStatus {
  isAvailable: boolean;
  latestDataYear: number;
  lastModified: string;
  isStale: boolean;
  daysUntilExpectedUpdate: number;
  errorMessage?: string;
}

/**
 * Data freshness status
 */
export interface DataFreshnessStatus {
  lastISEDRefresh: Date | null;
  lastStatsCanRefresh: Date | null;
  oldestBenchmarkAge: number; // days
  averageBenchmarkAge: number; // days
  needsRefresh: boolean;
}

/**
 * Data coverage status
 */
export interface DataCoverageStatus {
  totalIndustries: number;
  industriesWithData: number;
  industriesWithISEDData: number;
  industriesWithGrowthData: number;
  coveragePercentage: number;
  missingIndustries: string[];
}

/**
 * Data validation result
 */
export interface ValidationResult {
  isValid: boolean;
  checkedAt: Date;
  issues: ValidationIssue[];
}

interface ValidationIssue {
  severity: "error" | "warning" | "info";
  category: string;
  message: string;
  industryId?: string;
}

@Injectable()
export class BenchmarkHealthService {
  private readonly logger = new Logger(BenchmarkHealthService.name);
  private lastHealthCheck: BenchmarkHealthStatus | null = null;
  private lastHealthCheckTime: number = 0;
  private readonly HEALTH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    @InjectRepository(IndustryBenchmarkEntity)
    private readonly benchmarkRepo: Repository<IndustryBenchmarkEntity>,
    @InjectRepository(BenchmarkRefreshLogEntity)
    private readonly refreshLogRepo: Repository<BenchmarkRefreshLogEntity>,
    private readonly isedService: ISEDBenchmarkService,
    private readonly statsCanService: StatsCanBenchmarkService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Daily health check at 9 AM
   */
  @Cron("0 9 * * *")
  async scheduledHealthCheck() {
    this.logger.log("Running scheduled benchmark health check...");
    const health = await this.getHealthStatus(true);

    if (health.overallHealth === "critical") {
      await this.sendHealthAlert(health, "critical");
    } else if (health.overallHealth === "warning") {
      await this.sendHealthAlert(health, "warning");
    }
  }

  /**
   * Get comprehensive health status
   */
  async getHealthStatus(forceRefresh = false): Promise<BenchmarkHealthStatus> {
    const now = Date.now();
    if (
      !forceRefresh &&
      this.lastHealthCheck &&
      now - this.lastHealthCheckTime < this.HEALTH_CACHE_TTL
    ) {
      return this.lastHealthCheck;
    }

    this.logger.log("Checking benchmark data health...");

    const [isedHealth, statsCanHealth, dataFreshness, coverage] =
      await Promise.all([
        this.checkISEDHealth(),
        this.statsCanService.checkAPIHealth(),
        this.checkDataFreshness(),
        this.checkDataCoverage(),
      ]);

    const recommendations = this.generateRecommendations(
      isedHealth,
      statsCanHealth,
      dataFreshness,
      coverage,
    );

    const overallHealth = this.determineOverallHealth(
      isedHealth,
      statsCanHealth,
      dataFreshness,
      coverage,
    );

    const status: BenchmarkHealthStatus = {
      overallHealth,
      lastChecked: new Date(),
      isedHealth,
      statsCanHealth,
      dataFreshness,
      coverage,
      recommendations,
    };

    this.lastHealthCheck = status;
    this.lastHealthCheckTime = now;

    return status;
  }

  /**
   * Check ISED data source health
   */
  private async checkISEDHealth(): Promise<ISEDHealthStatus> {
    try {
      const freshness = await this.isedService.checkDataFreshness();

      // Calculate days until expected update
      // ISED typically releases new data around March-April for the prior year
      const now = new Date();
      const expectedUpdateMonth = 4; // April
      const expectedUpdateYear =
        now.getMonth() >= expectedUpdateMonth
          ? now.getFullYear() + 1
          : now.getFullYear();
      const expectedUpdate = new Date(
        expectedUpdateYear,
        expectedUpdateMonth - 1,
        1,
      );
      const daysUntilUpdate = Math.ceil(
        (expectedUpdate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
      );

      return {
        isAvailable: true,
        latestDataYear: freshness.latestDatasetYear,
        lastModified: freshness.lastModified,
        isStale: freshness.isStale,
        daysUntilExpectedUpdate: daysUntilUpdate,
      };
    } catch (error) {
      return {
        isAvailable: false,
        latestDataYear: 0,
        lastModified: "",
        isStale: true,
        daysUntilExpectedUpdate: -1,
        errorMessage: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Check data freshness in our database
   */
  private async checkDataFreshness(): Promise<DataFreshnessStatus> {
    // Get latest refresh logs
    const latestLogs = await this.refreshLogRepo.find({
      where: { status: "completed" },
      order: { completedAt: "DESC" },
      take: 10,
    });

    const isedRefresh = latestLogs.find((l) => l.dataSource === "all");
    const statsCanRefresh = latestLogs.find((l) => l.dataSource === "statscan");

    // Get benchmark age statistics
    const benchmarks = await this.benchmarkRepo.find();

    let oldestAge = 0;
    let totalAge = 0;

    for (const b of benchmarks) {
      const age = Math.ceil(
        (Date.now() - b.updatedAt.getTime()) / (24 * 60 * 60 * 1000),
      );
      oldestAge = Math.max(oldestAge, age);
      totalAge += age;
    }

    const averageAge = benchmarks.length > 0 ? totalAge / benchmarks.length : 0;

    // Data needs refresh if oldest benchmark is over 35 days old
    const needsRefresh = oldestAge > 35;

    return {
      lastISEDRefresh: isedRefresh?.completedAt || null,
      lastStatsCanRefresh: statsCanRefresh?.completedAt || null,
      oldestBenchmarkAge: oldestAge,
      averageBenchmarkAge: Math.round(averageAge),
      needsRefresh,
    };
  }

  /**
   * Check data coverage across industries
   */
  private async checkDataCoverage(): Promise<DataCoverageStatus> {
    const allIndustries = getAllIndustryIds();
    const benchmarks = await this.benchmarkRepo.find();

    const industriesWithData = new Set<string>();
    const industriesWithISED = new Set<string>();
    const industriesWithGrowth = new Set<string>();

    for (const b of benchmarks) {
      industriesWithData.add(b.industryId);
      if (b.dataSource === "ised") {
        industriesWithISED.add(b.industryId);
      }
      if (b.revenueYoyGrowth !== null || b.revenueQoqGrowth !== null) {
        industriesWithGrowth.add(b.industryId);
      }
    }

    const missingIndustries = allIndustries.filter(
      (id) => !industriesWithData.has(id),
    );

    return {
      totalIndustries: allIndustries.length,
      industriesWithData: industriesWithData.size,
      industriesWithISEDData: industriesWithISED.size,
      industriesWithGrowthData: industriesWithGrowth.size,
      coveragePercentage: Math.round(
        (industriesWithData.size / allIndustries.length) * 100,
      ),
      missingIndustries,
    };
  }

  /**
   * Validate stored benchmark data
   */
  async validateData(): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    const benchmarks = await this.benchmarkRepo.find();

    for (const b of benchmarks) {
      // Check for reasonable gross margin values
      if (
        b.grossMarginMedian !== null &&
        (b.grossMarginMedian < 0 || b.grossMarginMedian > 1)
      ) {
        issues.push({
          severity: "error",
          category: "data_quality",
          message: `Gross margin ${b.grossMarginMedian} out of range [0, 1]`,
          industryId: b.industryId,
        });
      }

      // Check for reasonable net margin values
      if (
        b.netMarginMedian !== null &&
        (b.netMarginMedian < -0.5 || b.netMarginMedian > 0.5)
      ) {
        issues.push({
          severity: "warning",
          category: "data_quality",
          message: `Net margin ${b.netMarginMedian} unusually high/low`,
          industryId: b.industryId,
        });
      }

      // Check for reasonable current ratio
      if (
        b.currentRatioMedian !== null &&
        (b.currentRatioMedian <= 0 || b.currentRatioMedian > 10)
      ) {
        issues.push({
          severity: "warning",
          category: "data_quality",
          message: `Current ratio ${b.currentRatioMedian} out of typical range`,
          industryId: b.industryId,
        });
      }

      // Check for stale data
      const ageInDays = Math.ceil(
        (Date.now() - b.updatedAt.getTime()) / (24 * 60 * 60 * 1000),
      );
      if (ageInDays > 60) {
        issues.push({
          severity: "warning",
          category: "freshness",
          message: `Data is ${ageInDays} days old`,
          industryId: b.industryId,
        });
      }
    }

    // Check for missing industries
    const coverage = await this.checkDataCoverage();
    for (const missingId of coverage.missingIndustries) {
      issues.push({
        severity: "error",
        category: "coverage",
        message: `No benchmark data available`,
        industryId: missingId,
      });
    }

    return {
      isValid: issues.filter((i) => i.severity === "error").length === 0,
      checkedAt: new Date(),
      issues,
    };
  }

  /**
   * Generate recommendations based on health status
   */
  private generateRecommendations(
    isedHealth: ISEDHealthStatus,
    statsCanHealth: StatsCanAPIHealth,
    dataFreshness: DataFreshnessStatus,
    coverage: DataCoverageStatus,
  ): string[] {
    const recommendations: string[] = [];

    if (!isedHealth.isAvailable) {
      recommendations.push(
        "ISED data source is unavailable. Check Open Canada portal status.",
      );
    } else if (isedHealth.isStale) {
      recommendations.push(
        `ISED data is stale (year ${isedHealth.latestDataYear}). Check for new release.`,
      );
    }

    if (!statsCanHealth.isHealthy) {
      recommendations.push(
        "Statistics Canada API is unhealthy. Fallback data is being used.",
      );
    }

    if (dataFreshness.needsRefresh) {
      recommendations.push(
        `Benchmark data is ${dataFreshness.oldestBenchmarkAge} days old. Trigger a manual refresh.`,
      );
    }

    if (coverage.coveragePercentage < 80) {
      recommendations.push(
        `Only ${coverage.coveragePercentage}% industry coverage. Missing: ${coverage.missingIndustries.join(", ")}`,
      );
    }

    if (recommendations.length === 0) {
      recommendations.push("All benchmark data sources are healthy.");
    }

    return recommendations;
  }

  /**
   * Determine overall health status
   */
  private determineOverallHealth(
    isedHealth: ISEDHealthStatus,
    statsCanHealth: StatsCanAPIHealth,
    dataFreshness: DataFreshnessStatus,
    coverage: DataCoverageStatus,
  ): "healthy" | "warning" | "critical" {
    // Critical conditions
    if (!isedHealth.isAvailable && !statsCanHealth.isHealthy) {
      return "critical";
    }
    if (coverage.coveragePercentage < 50) {
      return "critical";
    }
    if (dataFreshness.oldestBenchmarkAge > 90) {
      return "critical";
    }

    // Warning conditions
    if (isedHealth.isStale) {
      return "warning";
    }
    if (!statsCanHealth.isHealthy) {
      return "warning";
    }
    if (dataFreshness.needsRefresh) {
      return "warning";
    }
    if (coverage.coveragePercentage < 80) {
      return "warning";
    }

    return "healthy";
  }

  /**
   * Send health alert notification
   */
  private async sendHealthAlert(
    health: BenchmarkHealthStatus,
    severity: "warning" | "critical",
  ): Promise<void> {
    const subject =
      severity === "critical"
        ? "CRITICAL: Benchmark Data Health Issue"
        : "Warning: Benchmark Data Needs Attention";

    const _message = `
Benchmark Data Health Alert

Status: ${health.overallHealth.toUpperCase()}
Checked: ${health.lastChecked.toISOString()}

ISED Status:
- Available: ${health.isedHealth.isAvailable}
- Latest Data Year: ${health.isedHealth.latestDataYear}
- Is Stale: ${health.isedHealth.isStale}

Statistics Canada Status:
- Healthy: ${health.statsCanHealth.isHealthy}
- Response Time: ${health.statsCanHealth.responseTimeMs}ms

Data Freshness:
- Oldest Benchmark Age: ${health.dataFreshness.oldestBenchmarkAge} days
- Needs Refresh: ${health.dataFreshness.needsRefresh}

Coverage:
- Industries Covered: ${health.coverage.industriesWithData}/${health.coverage.totalIndustries}

Recommendations:
${health.recommendations.map((r) => `- ${r}`).join("\n")}
    `.trim();

    try {
      // Send to admin (notification service handles actual delivery)
      this.logger.warn(`Health Alert (${severity}): ${subject}`);
      // In production, this would send an actual email/slack notification
      // await this.notificationService.sendAdminAlert(subject, message);
    } catch (error) {
      this.logger.error(`Failed to send health alert: ${error}`);
    }
  }

  /**
   * Get recent refresh history
   */
  async getRefreshHistory(limit = 10): Promise<BenchmarkRefreshLogEntity[]> {
    return this.refreshLogRepo.find({
      order: { startedAt: "DESC" },
      take: limit,
    });
  }
}
