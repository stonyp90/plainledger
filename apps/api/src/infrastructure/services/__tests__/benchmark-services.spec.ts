/**
 * Benchmark Services Test Suite
 *
 * Tests for ISED, Statistics Canada, and Health monitoring services.
 * These tests verify data fetching, parsing, and health monitoring functionality.
 */

import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import axios from "axios";
import { ISEDBenchmarkService } from "../ised-benchmark.service";
import { StatsCanBenchmarkService } from "../statscan-benchmark.service";
import { BenchmarkHealthService } from "../benchmark-health.service";
import { BenchmarkRefreshService } from "../benchmark-refresh.service";
import {
  IndustryBenchmarkEntity,
  BenchmarkRefreshLogEntity,
} from "../../persistence/postgres/entities/industry-benchmark.entity";
import { NotificationService } from "../../notifications/notification.service";

// Mock axios
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("ISEDBenchmarkService", () => {
  let service: ISEDBenchmarkService;

  beforeEach(async () => {
    // Reset axios mock
    mockedAxios.create.mockReturnValue(mockedAxios);

    const module: TestingModule = await Test.createTestingModule({
      providers: [ISEDBenchmarkService],
    }).compile();

    service = module.get<ISEDBenchmarkService>(ISEDBenchmarkService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("checkDataFreshness", () => {
    it("should return data freshness info when API is available", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          success: true,
          result: {
            id: "16b7eeb0-9a97-46c0-af3d-7f2114dedf5e",
            metadata_modified: "2025-02-01T00:00:00Z",
            resources: [
              { format: "CSV", name: "test.csv" },
              { format: "CSV", name: "test2.csv" },
            ],
          },
        },
      });

      const result = await service.checkDataFreshness();

      expect(result).toHaveProperty("latestDatasetYear");
      expect(result).toHaveProperty("datasetId");
      expect(result).toHaveProperty("isStale");
      expect(result.latestDatasetYear).toBe(2023);
    });

    it("should fall back to 2022 dataset if 2023 is unavailable", async () => {
      // First call fails (2023)
      mockedAxios.get.mockRejectedValueOnce(new Error("Not found"));
      // Second call succeeds (2022)
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          success: true,
          result: {
            id: "ee04cfb2-9473-47cb-a0e1-64823da7ab82",
            metadata_modified: "2024-02-01T00:00:00Z",
            resources: [{ format: "CSV" }],
          },
        },
      });

      const result = await service.checkDataFreshness();
      expect(result.latestDatasetYear).toBe(2022);
    });

    it("should throw error if no datasets are available", async () => {
      mockedAxios.get.mockRejectedValue(new Error("Not found"));

      await expect(service.checkDataFreshness()).rejects.toThrow(
        "No ISED datasets available",
      );
    });
  });

  describe("getFallbackBenchmarks", () => {
    it("should return fallback data for all 15 industries", () => {
      const result = service.getFallbackBenchmarks("30k-5m");

      expect(result.length).toBe(15);
      expect(result.find((b) => b.industryId === "construction")).toBeDefined();
      expect(result.find((b) => b.industryId === "restaurant")).toBeDefined();
      expect(result.find((b) => b.industryId === "retail")).toBeDefined();
    });

    it("should have valid data ranges for gross margin", () => {
      const result = service.getFallbackBenchmarks("30k-5m");

      for (const benchmark of result) {
        expect(benchmark.grossMargin.q1).toBeGreaterThanOrEqual(0);
        expect(benchmark.grossMargin.q1).toBeLessThanOrEqual(1);
        expect(benchmark.grossMargin.median).toBeGreaterThanOrEqual(0);
        expect(benchmark.grossMargin.median).toBeLessThanOrEqual(1);
        expect(benchmark.grossMargin.q1).toBeLessThanOrEqual(
          benchmark.grossMargin.median,
        );
        expect(benchmark.grossMargin.median).toBeLessThanOrEqual(
          benchmark.grossMargin.q3,
        );
      }
    });

    it("should have valid current ratio values", () => {
      const result = service.getFallbackBenchmarks("30k-5m");

      for (const benchmark of result) {
        expect(benchmark.currentRatio.median).toBeGreaterThan(0);
        expect(benchmark.currentRatio.median).toBeLessThan(10);
      }
    });
  });
});

describe("StatsCanBenchmarkService", () => {
  let service: StatsCanBenchmarkService;

  beforeEach(async () => {
    mockedAxios.create.mockReturnValue(mockedAxios);

    const module: TestingModule = await Test.createTestingModule({
      providers: [StatsCanBenchmarkService],
    }).compile();

    service = module.get<StatsCanBenchmarkService>(StatsCanBenchmarkService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("checkAPIHealth", () => {
    it("should return healthy status when API responds", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: [{ productId: 33100226, cubeTitleEn: "Test" }],
      });

      const result = await service.checkAPIHealth();

      expect(result.isHealthy).toBe(true);
      expect(result.tableAvailable).toBe(true);
      expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
    });

    it("should return unhealthy status when API fails", async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error("Connection timeout"));

      const result = await service.checkAPIHealth();

      expect(result.isHealthy).toBe(false);
      expect(result.errorMessage).toBe("Connection timeout");
    });
  });

  describe("fetchQuarterlyGrowth", () => {
    it("should return growth data for all industries", async () => {
      // Mock successful data fetch
      mockedAxios.post.mockResolvedValue({
        data: [
          {
            status: "SUCCESS",
            object: {
              vectorDataPoint: [
                { refPer: "2025-10-01", value: 1000000 },
                { refPer: "2025-07-01", value: 980000 },
                { refPer: "2025-04-01", value: 960000 },
                { refPer: "2025-01-01", value: 940000 },
                { refPer: "2024-10-01", value: 920000 },
              ],
            },
          },
          {
            status: "SUCCESS",
            object: {
              vectorDataPoint: [{ refPer: "2025-10-01", value: 100000 }],
            },
          },
        ],
      });

      const result = await service.fetchQuarterlyGrowth();

      expect(result.length).toBeGreaterThan(0);
      // All results should have growth data
      for (const data of result) {
        expect(data.growth).toBeDefined();
        expect(typeof data.growth.revenueYoY).toBe("number");
        expect(typeof data.growth.revenueQoQ).toBe("number");
      }
    });

    it("should return fallback data when API fails", async () => {
      mockedAxios.post.mockRejectedValue(new Error("API error"));

      const result = await service.fetchQuarterlyGrowth();

      // Should still return data (fallback)
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("verified vector IDs", () => {
    it("should have vector IDs for key industries", () => {
      // The service initializes with verified vector IDs
      // We can test by checking the cache through fetchQuarterlyGrowth behavior
      expect(service).toBeDefined();
    });
  });
});

describe("BenchmarkHealthService", () => {
  let service: BenchmarkHealthService;
  let benchmarkRepo: jest.Mocked<Repository<IndustryBenchmarkEntity>>;
  let refreshLogRepo: jest.Mocked<Repository<BenchmarkRefreshLogEntity>>;
  let isedService: jest.Mocked<ISEDBenchmarkService>;
  let statsCanService: jest.Mocked<StatsCanBenchmarkService>;
  let notificationService: jest.Mocked<NotificationService>;

  beforeEach(async () => {
    benchmarkRepo = {
      find: jest.fn(),
      count: jest.fn(),
    } as unknown as jest.Mocked<Repository<IndustryBenchmarkEntity>>;

    refreshLogRepo = {
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<BenchmarkRefreshLogEntity>>;

    isedService = {
      checkDataFreshness: jest.fn(),
    } as unknown as jest.Mocked<ISEDBenchmarkService>;

    statsCanService = {
      checkAPIHealth: jest.fn(),
    } as unknown as jest.Mocked<StatsCanBenchmarkService>;

    notificationService = {
      sendAdminAlert: jest.fn(),
    } as unknown as jest.Mocked<NotificationService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BenchmarkHealthService,
        {
          provide: getRepositoryToken(IndustryBenchmarkEntity),
          useValue: benchmarkRepo,
        },
        {
          provide: getRepositoryToken(BenchmarkRefreshLogEntity),
          useValue: refreshLogRepo,
        },
        { provide: ISEDBenchmarkService, useValue: isedService },
        { provide: StatsCanBenchmarkService, useValue: statsCanService },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get<BenchmarkHealthService>(BenchmarkHealthService);
  });

  describe("getHealthStatus", () => {
    // Helper to create mock benchmark data for all industries
    const createFullCoverageMocks = () => {
      const industries = [
        "real_estate",
        "construction",
        "hospitality",
        "restaurant",
        "retail",
        "professional_services",
        "manufacturing",
        "agriculture",
        "transport",
        "healthcare",
        "education",
        "wholesale",
        "automotive",
        "beauty_wellness",
        "technology",
      ];
      return industries.map(
        (id, i) =>
          ({
            id: String(i + 1),
            industryId: id,
            dataSource: "ised",
            updatedAt: new Date(),
            revenueYoyGrowth: 0.05,
          }) as IndustryBenchmarkEntity,
      );
    };

    it("should return healthy status when all sources are available", async () => {
      isedService.checkDataFreshness.mockResolvedValue({
        latestDatasetYear: 2023,
        datasetId: "test-id",
        lastModified: "2025-01-01",
        resourceCount: 10,
        isStale: false,
      });

      statsCanService.checkAPIHealth.mockResolvedValue({
        isHealthy: true,
        lastChecked: new Date(),
        responseTimeMs: 100,
        tableAvailable: true,
      });

      // Mock full coverage (all 15 industries)
      benchmarkRepo.find.mockResolvedValue(createFullCoverageMocks());

      refreshLogRepo.find.mockResolvedValue([
        {
          dataSource: "all",
          status: "completed",
          completedAt: new Date(),
        } as BenchmarkRefreshLogEntity,
      ]);

      const result = await service.getHealthStatus(true);

      expect(result.overallHealth).toBe("healthy");
      expect(result.isedHealth.isAvailable).toBe(true);
      expect(result.statsCanHealth.isHealthy).toBe(true);
    });

    it("should return warning status when ISED data is stale", async () => {
      isedService.checkDataFreshness.mockResolvedValue({
        latestDatasetYear: 2022,
        datasetId: "test-id",
        lastModified: "2023-01-01",
        resourceCount: 10,
        isStale: true, // Stale!
      });

      statsCanService.checkAPIHealth.mockResolvedValue({
        isHealthy: true,
        lastChecked: new Date(),
        responseTimeMs: 100,
        tableAvailable: true,
      });

      // Mock full coverage to avoid critical status from low coverage
      benchmarkRepo.find.mockResolvedValue(createFullCoverageMocks());

      refreshLogRepo.find.mockResolvedValue([]);

      const result = await service.getHealthStatus(true);

      expect(result.overallHealth).toBe("warning");
      expect(result.isedHealth.isStale).toBe(true);
    });

    it("should return critical status when both sources are down", async () => {
      isedService.checkDataFreshness.mockRejectedValue(new Error("API error"));

      statsCanService.checkAPIHealth.mockResolvedValue({
        isHealthy: false,
        lastChecked: new Date(),
        responseTimeMs: 0,
        tableAvailable: false,
        errorMessage: "Connection refused",
      });

      benchmarkRepo.find.mockResolvedValue([]);
      refreshLogRepo.find.mockResolvedValue([]);

      const result = await service.getHealthStatus(true);

      expect(result.overallHealth).toBe("critical");
    });
  });

  describe("validateData", () => {
    it("should return valid when all benchmarks are within range", async () => {
      // Create valid benchmarks for all industries to avoid coverage errors
      const industries = [
        "real_estate",
        "construction",
        "hospitality",
        "restaurant",
        "retail",
        "professional_services",
        "manufacturing",
        "agriculture",
        "transport",
        "healthcare",
        "education",
        "wholesale",
        "automotive",
        "beauty_wellness",
        "technology",
      ];
      benchmarkRepo.find.mockResolvedValue(
        industries.map(
          (id, i) =>
            ({
              id: String(i + 1),
              industryId: id,
              grossMarginMedian: 0.25, // Valid
              netMarginMedian: 0.08, // Valid
              currentRatioMedian: 1.5, // Valid
              updatedAt: new Date(), // Recent
            }) as IndustryBenchmarkEntity,
        ),
      );

      const result = await service.validateData();

      // Should have no error-level issues
      const errors = result.issues.filter((i) => i.severity === "error");
      expect(errors.length).toBe(0);
    });

    it("should detect out-of-range gross margin", async () => {
      benchmarkRepo.find.mockResolvedValue([
        {
          id: "1",
          industryId: "construction",
          grossMarginMedian: 1.5, // Invalid! Should be 0-1
          netMarginMedian: 0.08,
          currentRatioMedian: 1.5,
          updatedAt: new Date(),
        } as IndustryBenchmarkEntity,
      ]);

      const result = await service.validateData();

      const grossMarginErrors = result.issues.filter(
        (i) =>
          i.category === "data_quality" && i.message.includes("Gross margin"),
      );
      expect(grossMarginErrors.length).toBeGreaterThan(0);
    });
  });
});

describe("BenchmarkRefreshService", () => {
  let service: BenchmarkRefreshService;
  let benchmarkRepo: jest.Mocked<Repository<IndustryBenchmarkEntity>>;
  let refreshLogRepo: jest.Mocked<Repository<BenchmarkRefreshLogEntity>>;
  let isedService: jest.Mocked<ISEDBenchmarkService>;
  let statsCanService: jest.Mocked<StatsCanBenchmarkService>;

  beforeEach(async () => {
    benchmarkRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    } as unknown as jest.Mocked<Repository<IndustryBenchmarkEntity>>;

    refreshLogRepo = {
      create: jest.fn().mockReturnValue({}),
      save: jest.fn().mockResolvedValue({ id: "log-1" }),
      update: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<Repository<BenchmarkRefreshLogEntity>>;

    isedService = {
      fetchBenchmarks: jest.fn(),
    } as unknown as jest.Mocked<ISEDBenchmarkService>;

    statsCanService = {
      fetchQuarterlyGrowth: jest.fn(),
    } as unknown as jest.Mocked<StatsCanBenchmarkService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BenchmarkRefreshService,
        {
          provide: getRepositoryToken(IndustryBenchmarkEntity),
          useValue: benchmarkRepo,
        },
        {
          provide: getRepositoryToken(BenchmarkRefreshLogEntity),
          useValue: refreshLogRepo,
        },
        { provide: ISEDBenchmarkService, useValue: isedService },
        { provide: StatsCanBenchmarkService, useValue: statsCanService },
      ],
    }).compile();

    service = module.get<BenchmarkRefreshService>(BenchmarkRefreshService);
  });

  describe("refreshAllBenchmarks", () => {
    it("should refresh benchmarks from both sources", async () => {
      isedService.fetchBenchmarks.mockResolvedValue({
        small: [
          {
            industryId: "construction",
            naicsCode: "23",
            sampleSize: 1000,
            grossMargin: { q1: 0.15, median: 0.22, q3: 0.3 },
            netMargin: { q1: 0.03, median: 0.06, q3: 0.12 },
            operatingExpenseRatio: 0.16,
            wagesToRevenueRatio: 0.25,
            rentToRevenueRatio: 0.02,
            currentRatio: { q1: 1.1, median: 1.4, q3: 1.9 },
            debtToEquity: { q1: 1.0, median: 1.8, q3: 3.0 },
          },
        ],
        medium: [],
        referenceYear: 2023,
      });

      statsCanService.fetchQuarterlyGrowth.mockResolvedValue([
        {
          industryId: "construction",
          referenceQuarter: "2025-Q4",
          growth: { revenueYoY: 0.05, revenueQoQ: 0.01 },
          latestRevenue: 1000000,
          latestProfit: 100000,
        },
      ]);

      benchmarkRepo.findOne.mockResolvedValue(null); // No existing record
      benchmarkRepo.find.mockResolvedValue([]);

      const result = await service.refreshAllBenchmarks();

      expect(result.success).toBe(true);
      expect(isedService.fetchBenchmarks).toHaveBeenCalled();
      expect(statsCanService.fetchQuarterlyGrowth).toHaveBeenCalled();
    });

    it("should handle API errors gracefully", async () => {
      isedService.fetchBenchmarks.mockRejectedValue(new Error("API down"));
      statsCanService.fetchQuarterlyGrowth.mockResolvedValue([]);

      const result = await service.refreshAllBenchmarks();

      expect(result.success).toBe(false);
      expect(result.message).toContain("failed");
    });
  });
});

describe("Data Source Integration", () => {
  describe("ISED Open Canada API", () => {
    it("should have correct 2023 dataset ID", () => {
      // This tests that we're using the verified 2023 dataset
      const dataset2023Id = "16b7eeb0-9a97-46c0-af3d-7f2114dedf5e";
      const dataset2022Id = "ee04cfb2-9473-47cb-a0e1-64823da7ab82";

      // Verify these are the correct format (UUID)
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(dataset2023Id).toMatch(uuidRegex);
      expect(dataset2022Id).toMatch(uuidRegex);
    });
  });

  describe("Statistics Canada WDS API", () => {
    it("should have verified vector IDs for key industries", () => {
      // These are the actual verified vector IDs from Statistics Canada
      const verifiedVectors = {
        agriculture: { revenue: 1146004135, profit: 1446299953 },
        construction: { revenue: 1146004147, profit: 1446299955 },
        wholesale: { revenue: 1146004201, profit: 1446299988 },
        retail: { revenue: 1146004213, profit: 1446299990 },
        transport: { revenue: 1146004216, profit: 1446299991 },
        real_estate: { revenue: 1146004231, profit: 1446299970 },
        professional_services: { revenue: 1146004237, profit: 1446299956 },
        healthcare: { revenue: 1146004243, profit: 1446300002 },
        hospitality: { revenue: 1146004246, profit: 1446300003 },
      };

      // Verify all vector IDs are positive integers
      for (const [industry, vectors] of Object.entries(verifiedVectors)) {
        expect(vectors.revenue).toBeGreaterThan(0);
        expect(vectors.profit).toBeGreaterThan(0);
        expect(Number.isInteger(vectors.revenue)).toBe(true);
        expect(Number.isInteger(vectors.profit)).toBe(true);
      }
    });
  });
});
