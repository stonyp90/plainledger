import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { CacheService } from "../cache.service";

// Mock ioredis
const mockRedisInstance = {
  get: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  ping: jest.fn().mockResolvedValue("PONG"),
  quit: jest.fn(),
  on: jest.fn(),
  status: "ready",
};

jest.mock("ioredis", () => {
  return jest.fn().mockImplementation(() => mockRedisInstance);
});

describe("CacheService", () => {
  let service: CacheService;
  let mockRedis: typeof mockRedisInstance;

  beforeEach(async () => {
    // Reset all mocks
    mockRedisInstance.get.mockClear();
    mockRedisInstance.setex.mockClear();
    mockRedisInstance.del.mockClear();
    mockRedisInstance.keys.mockClear();
    mockRedisInstance.ping.mockClear();
    mockRedisInstance.quit.mockClear();
    mockRedisInstance.on.mockClear();
    mockRedisInstance.status = "ready";

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === "REDIS_HOST") return "localhost";
              if (key === "REDIS_PORT") return "6379";
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    mockRedis = mockRedisInstance;

    // Wait for onModuleInit to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Ensure Redis is marked as available
    if (!service.isAvailable()) {
      // Manually set Redis as available for testing
      (service as any).redis = mockRedisInstance;
    }
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("isAvailable", () => {
    it("should return true when Redis is connected", () => {
      mockRedis.status = "ready";
      expect(service.isAvailable()).toBe(true);
    });

    it("should return false when Redis is not connected", () => {
      mockRedis.status = "end";
      expect(service.isAvailable()).toBe(false);
    });
  });

  describe("get", () => {
    it("should return cached value", async () => {
      const cachedValue = { data: "test" };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedValue));

      const result = await service.get("test-key");

      expect(result).toEqual(cachedValue);
      expect(mockRedis.get).toHaveBeenCalledWith("test-key");
    });

    it("should return null when key does not exist", async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.get("non-existent");

      expect(result).toBeNull();
    });

    it("should return null when Redis is unavailable", async () => {
      mockRedis.status = "end";

      const result = await service.get("test-key");

      expect(result).toBeNull();
      expect(mockRedis.get).not.toHaveBeenCalled();
    });
  });

  describe("set", () => {
    it("should set value with TTL", async () => {
      mockRedis.setex.mockResolvedValue("OK");

      const result = await service.set("test-key", { data: "test" }, 300);

      expect(result).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        "test-key",
        300,
        JSON.stringify({ data: "test" }),
      );
    });

    it("should use default TTL when not provided", async () => {
      mockRedis.setex.mockResolvedValue("OK");

      await service.set("test-key", { data: "test" });

      expect(mockRedis.setex).toHaveBeenCalledWith(
        "test-key",
        3600, // default TTL
        JSON.stringify({ data: "test" }),
      );
    });
  });

  describe("delete", () => {
    it("should delete key", async () => {
      mockRedis.del.mockResolvedValue(1);

      const result = await service.delete("test-key");

      expect(result).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith("test-key");
    });
  });

  describe("deletePattern", () => {
    it("should delete all keys matching pattern", async () => {
      mockRedis.keys.mockResolvedValue([
        "datalake:org-1:accounts",
        "datalake:org-1:contacts",
      ]);
      mockRedis.del.mockResolvedValue(2);

      const result = await service.deletePattern("datalake:org-1:*");

      expect(result).toBe(2);
      expect(mockRedis.keys).toHaveBeenCalledWith("datalake:org-1:*");
      expect(mockRedis.del).toHaveBeenCalledWith(
        "datalake:org-1:accounts",
        "datalake:org-1:contacts",
      );
    });

    it("should return 0 when no keys match", async () => {
      mockRedis.keys.mockResolvedValue([]);

      const result = await service.deletePattern("non-existent:*");

      expect(result).toBe(0);
      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });

  describe("getDatalakeKey", () => {
    it("should generate key without filters", () => {
      const key = service.getDatalakeKey("org-123", "accounts");

      expect(key).toBe("datalake:org-123:accounts");
    });

    it("should generate key with filters", () => {
      const key = service.getDatalakeKey("org-123", "transactions", {
        startDate: "2024-01-01",
        endDate: "2024-01-31",
      });

      expect(key).toContain("datalake:org-123:transactions:");
      expect(key.length).toBeGreaterThan(
        "datalake:org-123:transactions:".length,
      );
    });

    it("should generate deterministic keys for same filters", () => {
      const filters = { startDate: "2024-01-01", endDate: "2024-01-31" };
      const key1 = service.getDatalakeKey("org-123", "transactions", filters);
      const key2 = service.getDatalakeKey("org-123", "transactions", filters);

      expect(key1).toBe(key2);
    });
  });

  describe("invalidateDatalake", () => {
    it("should invalidate all entities for organization", async () => {
      mockRedis.keys.mockResolvedValue([
        "datalake:org-123:accounts",
        "datalake:org-123:contacts",
        "datalake:org-123:transactions",
      ]);
      mockRedis.del.mockResolvedValue(3);

      const result = await service.invalidateDatalake("org-123");

      expect(result).toBe(3);
      expect(mockRedis.keys).toHaveBeenCalledWith("datalake:org-123:*");
    });

    it("should invalidate specific entity", async () => {
      mockRedis.keys.mockResolvedValue(["datalake:org-123:accounts"]);
      mockRedis.del.mockResolvedValue(1);

      const result = await service.invalidateDatalake("org-123", "accounts");

      expect(result).toBe(1);
      expect(mockRedis.keys).toHaveBeenCalledWith("datalake:org-123:accounts*");
    });
  });

  describe("getOrFetch", () => {
    it("should return cached value if available", async () => {
      const cachedValue = { data: "cached" };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedValue));
      const fetcher = jest.fn();

      const result = await service.getOrFetch("test-key", fetcher);

      expect(result).toEqual(cachedValue);
      expect(fetcher).not.toHaveBeenCalled();
    });

    it("should fetch and cache value if not cached", async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue("OK");
      const fetchedValue = { data: "fetched" };
      const fetcher = jest.fn().mockResolvedValue(fetchedValue);

      const result = await service.getOrFetch("test-key", fetcher, 300);

      expect(result).toEqual(fetchedValue);
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        "test-key",
        300,
        JSON.stringify(fetchedValue),
      );
    });

    it("should deduplicate concurrent requests", async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue("OK");
      const fetchedValue = { data: "fetched" };
      const fetcher = jest
        .fn()
        .mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(() => resolve(fetchedValue), 50),
            ),
        );

      // Make 3 concurrent requests
      const promises = [
        service.getOrFetch("test-key", fetcher),
        service.getOrFetch("test-key", fetcher),
        service.getOrFetch("test-key", fetcher),
      ];

      const results = await Promise.all(promises);

      // All should return the same value
      expect(results).toEqual([fetchedValue, fetchedValue, fetchedValue]);
      // But fetcher should only be called once (deduplication)
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it("should remove from pending requests after completion", async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue("OK");
      const fetcher = jest.fn().mockResolvedValue({ data: "test" });

      await service.getOrFetch("test-key", fetcher);

      // Second call should not reuse pending request
      mockRedis.get.mockResolvedValue(null);
      await service.getOrFetch("test-key", fetcher);

      expect(fetcher).toHaveBeenCalledTimes(2);
    });
  });
});
