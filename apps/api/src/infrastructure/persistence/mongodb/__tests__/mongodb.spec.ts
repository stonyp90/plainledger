/**
 * MongoDB Module Tests
 * Tests for MongoDBService, AnalyticsRepository, and AuditRepository
 */

import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { MongoDBService } from "../mongodb.module";
import { AnalyticsRepository } from "../analytics.repository";
import { AuditRepository } from "../audit.repository";

// ============================================================================
// Mocks
// ============================================================================

const mockCollection = {
  insertOne: jest.fn().mockResolvedValue({ insertedId: "test-id" }),
  insertMany: jest.fn().mockResolvedValue({ insertedCount: 10 }),
  find: jest.fn().mockReturnValue({
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    toArray: jest.fn().mockResolvedValue([]),
  }),
  aggregate: jest.fn().mockReturnValue({
    toArray: jest.fn().mockResolvedValue([]),
  }),
  createIndexes: jest.fn().mockResolvedValue(undefined),
};

const mockDb = {
  collection: jest.fn().mockReturnValue(mockCollection),
  command: jest.fn().mockResolvedValue({ ok: 1 }),
};

const mockClient = {
  connect: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),
  db: jest.fn().mockReturnValue(mockDb),
};

jest.mock("mongodb", () => ({
  MongoClient: jest.fn().mockImplementation(() => mockClient),
}));

// ============================================================================
// MongoDBService Tests
// ============================================================================

describe("MongoDBService", () => {
  let service: MongoDBService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: MongoDBService,
          useFactory: (config: ConfigService) => new MongoDBService(config),
          inject: [ConfigService],
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === "MONGODB_URI")
                return "mongodb://localhost:27017/test";
              if (key === "MONGODB_DATABASE") return "test_db";
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<MongoDBService>(MongoDBService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("isConfigured", () => {
    it("should return true when MONGODB_URI is set", () => {
      expect(service.isConfigured()).toBe(true);
    });

    it("should return false when MONGODB_URI is not set", async () => {
      const module = await Test.createTestingModule({
        providers: [
          {
            provide: MongoDBService,
            useFactory: (config: ConfigService) => new MongoDBService(config),
            inject: [ConfigService],
          },
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue(undefined),
            },
          },
        ],
      }).compile();

      const serviceWithoutUri = module.get<MongoDBService>(MongoDBService);
      expect(serviceWithoutUri.isConfigured()).toBe(false);
    });
  });

  describe("connect", () => {
    it("should return null when URI is not configured", async () => {
      const module = await Test.createTestingModule({
        providers: [
          {
            provide: MongoDBService,
            useFactory: (config: ConfigService) => new MongoDBService(config),
            inject: [ConfigService],
          },
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue(undefined),
            },
          },
        ],
      }).compile();

      const serviceWithoutUri = module.get<MongoDBService>(MongoDBService);
      const result = await serviceWithoutUri.connect();
      expect(result).toBeNull();
    });
  });

  describe("isConnected", () => {
    it("should return false initially", () => {
      expect(service.isConnected()).toBe(false);
    });
  });
});

// ============================================================================
// AnalyticsRepository Tests
// ============================================================================

describe("AnalyticsRepository", () => {
  let repository: AnalyticsRepository;
  let mongoService: MongoDBService;

  beforeEach(async () => {
    const mockMongoService = {
      isConfigured: jest.fn().mockReturnValue(true),
      connect: jest.fn().mockResolvedValue(mockDb),
      getAnalyticsCollection: jest.fn().mockResolvedValue(mockCollection),
      getJourneyCollection: jest.fn().mockResolvedValue(mockCollection),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsRepository,
        {
          provide: MongoDBService,
          useValue: mockMongoService,
        },
      ],
    }).compile();

    repository = module.get<AnalyticsRepository>(AnalyticsRepository);
    mongoService = module.get<MongoDBService>(MongoDBService);

    // Initialize the repository
    await repository.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("track", () => {
    it("should buffer events", async () => {
      await repository.track({
        eventName: "test_event",
        userId: "user-123",
        properties: { page: "/test" },
      });

      // Event should be buffered, not immediately flushed
      expect(mockCollection.insertMany).not.toHaveBeenCalled();
    });

    it("should accept events with minimal data", async () => {
      await expect(
        repository.track({
          eventName: "minimal_event",
        }),
      ).resolves.not.toThrow();
    });
  });

  describe("trackBatch", () => {
    it("should track multiple events", async () => {
      const events = [
        { eventName: "event_1", userId: "user-1" },
        { eventName: "event_2", userId: "user-2" },
      ];

      await repository.trackBatch(events);
      // Events should be buffered
    });
  });

  describe("getEvents", () => {
    it("should query events by user ID", async () => {
      const events = await repository.getEvents({ userId: "user-123" });

      expect(mongoService.getAnalyticsCollection).toHaveBeenCalled();
      expect(Array.isArray(events)).toBe(true);
    });

    it("should query events by event name", async () => {
      const events = await repository.getEvents({ eventName: "page_view" });

      expect(mongoService.getAnalyticsCollection).toHaveBeenCalled();
      expect(Array.isArray(events)).toBe(true);
    });

    it("should query events by date range", async () => {
      const events = await repository.getEvents({
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-01-31"),
      });

      expect(Array.isArray(events)).toBe(true);
    });
  });

  describe("countEvents", () => {
    it("should return event counts", async () => {
      const counts = await repository.countEvents({});

      expect(mongoService.getAnalyticsCollection).toHaveBeenCalled();
      expect(Array.isArray(counts)).toBe(true);
    });
  });

  describe("calculateFunnel", () => {
    it("should calculate funnel metrics", async () => {
      const funnel = await repository.calculateFunnel({
        steps: ["signup", "activation", "conversion"],
      });

      expect(Array.isArray(funnel)).toBe(true);
    });
  });

  describe("recordJourneyEvent", () => {
    it("should record journey events", async () => {
      await repository.recordJourneyEvent({
        userId: "user-123",
        stage: "signup",
        event: "user_registered",
        timestamp: new Date(),
      });

      expect(mongoService.getJourneyCollection).toHaveBeenCalled();
    });
  });

  describe("getUserJourney", () => {
    it("should return user journey events", async () => {
      const journey = await repository.getUserJourney("user-123");

      expect(mongoService.getJourneyCollection).toHaveBeenCalled();
      expect(Array.isArray(journey)).toBe(true);
    });
  });

  describe("getGTMFunnel", () => {
    it("should return GTM funnel metrics", async () => {
      const funnel = await repository.getGTMFunnel({});

      expect(funnel).toHaveProperty("signups");
      expect(funnel).toHaveProperty("activated");
      expect(funnel).toHaveProperty("converted");
      expect(funnel).toHaveProperty("activationRate");
      expect(funnel).toHaveProperty("conversionRate");
    });
  });
});

// ============================================================================
// AuditRepository Tests
// ============================================================================

describe("AuditRepository", () => {
  let repository: AuditRepository;
  let mongoService: MongoDBService;

  beforeEach(async () => {
    const mockMongoService = {
      isConfigured: jest.fn().mockReturnValue(true),
      getAuditCollection: jest.fn().mockResolvedValue(mockCollection),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditRepository,
        {
          provide: MongoDBService,
          useValue: mockMongoService,
        },
      ],
    }).compile();

    repository = module.get<AuditRepository>(AuditRepository);
    mongoService = module.get<MongoDBService>(MongoDBService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("log", () => {
    it("should log audit events", async () => {
      await repository.log({
        action: "auth.login",
        actorId: "user-123",
        actorEmail: "test@example.com",
        resourceType: "user",
        resourceId: "user-123",
      });

      expect(mongoService.getAuditCollection).toHaveBeenCalled();
      expect(mockCollection.insertOne).toHaveBeenCalled();
    });

    it("should store in fallback when MongoDB unavailable", async () => {
      const mockMongoServiceNull = {
        getAuditCollection: jest.fn().mockResolvedValue(null),
      };

      const module = await Test.createTestingModule({
        providers: [
          AuditRepository,
          {
            provide: MongoDBService,
            useValue: mockMongoServiceNull,
          },
        ],
      }).compile();

      const repoWithoutMongo = module.get<AuditRepository>(AuditRepository);

      await repoWithoutMongo.log({
        action: "auth.login",
        actorId: "user-123",
        resourceType: "user",
      });

      // Should not throw, should store in fallback
      expect(repoWithoutMongo.getFallbackLogCount()).toBe(1);
    });
  });

  describe("logSuccess", () => {
    it("should log successful actions", async () => {
      await repository.logSuccess({
        action: "report.viewed",
        actorId: "user-123",
        resourceType: "report",
        resourceId: "report-456",
      });

      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        }),
      );
    });
  });

  describe("logFailure", () => {
    it("should log failed actions with error message", async () => {
      await repository.logFailure({
        action: "auth.login",
        actorId: "user-123",
        resourceType: "user",
        errorMessage: "Invalid credentials",
      });

      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorMessage: "Invalid credentials",
        }),
      );
    });
  });

  describe("logAuth", () => {
    it("should log authentication events", async () => {
      await repository.logAuth("login", "user-123", "test@example.com", {
        ipAddress: "192.168.1.1",
        method: "password",
      });

      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "auth.login",
          actorId: "user-123",
          actorEmail: "test@example.com",
        }),
      );
    });
  });

  describe("logDataView", () => {
    it("should log data view events", async () => {
      await repository.logDataView({
        actorId: "user-123",
        organizationId: "org-456",
        resourceType: "report",
        resourceId: "report-789",
      });

      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "report.viewed",
        }),
      );
    });
  });

  describe("logDataExport", () => {
    it("should log data export events", async () => {
      await repository.logDataExport({
        actorId: "user-123",
        organizationId: "org-456",
        resourceType: "report",
        format: "csv",
        recordCount: 100,
      });

      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "report.exported",
          metadata: expect.objectContaining({
            format: "csv",
            recordCount: 100,
          }),
        }),
      );
    });
  });

  describe("query", () => {
    it("should query audit logs by actor", async () => {
      const logs = await repository.query({ actorId: "user-123" });

      expect(mongoService.getAuditCollection).toHaveBeenCalled();
      expect(Array.isArray(logs)).toBe(true);
    });

    it("should query audit logs by organization", async () => {
      const logs = await repository.query({ organizationId: "org-456" });

      expect(Array.isArray(logs)).toBe(true);
    });

    it("should query audit logs by action", async () => {
      const logs = await repository.query({ action: "auth.login" });

      expect(Array.isArray(logs)).toBe(true);
    });

    it("should use fallback when MongoDB unavailable", async () => {
      const mockMongoServiceNull = {
        getAuditCollection: jest.fn().mockResolvedValue(null),
      };

      const module = await Test.createTestingModule({
        providers: [
          AuditRepository,
          {
            provide: MongoDBService,
            useValue: mockMongoServiceNull,
          },
        ],
      }).compile();

      const repoWithoutMongo = module.get<AuditRepository>(AuditRepository);

      // Add some fallback logs
      await repoWithoutMongo.log({
        action: "test",
        actorId: "user-123",
        resourceType: "user",
      });

      const logs = await repoWithoutMongo.query({ actorId: "user-123" });
      expect(logs.length).toBe(1);
    });
  });

  describe("getUserActivity", () => {
    it("should return user activity summary", async () => {
      const activity = await repository.getUserActivity({
        actorId: "user-123",
      });

      expect(activity).toHaveProperty("totalActions");
      expect(activity).toHaveProperty("actionCounts");
    });
  });

  describe("getFallbackLogCount", () => {
    it("should return 0 when no fallback logs", () => {
      expect(repository.getFallbackLogCount()).toBe(0);
    });
  });
});
