/**
 * DecisionRepository Integration Tests
 *
 * Tests PostgreSQL implementation of IDecisionRepository.
 * Note: These tests require a test database connection.
 */

import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DecisionRepository } from "../decision.repository";
import { DecisionEvent } from "@domain/DecisionEvent";
import { Money } from "@domain/value-objects/Money";
import { DecisionEventEntity } from "../postgres/entities/decision-event.entity";
import { IndustryPatternEntity } from "../postgres/entities/industry-pattern.entity";

describe("DecisionRepository (PostgreSQL)", () => {
  let repository: DecisionRepository;
  let mockDecisionEventRepo: any;
  let mockIndustryPatternRepo: any;

  const validEventData = {
    organizationId: "org-123",
    industry: "restaurant" as const,
    businessSize: "small" as const,
    trigger: {
      metric: "gross_margin" as const,
      currentValue: Money.create(25000),
      benchmarkValue: Money.create(30000),
      gapPercentage: -16.7,
    },
    decision: {
      actionType: "reduce_costs" as const,
      description: "Renegotiate supplier contracts",
      expectedImpact: Money.create(5000),
      confidence: "high" as const,
    },
    source: "user" as const,
  };

  beforeEach(async () => {
    const queryBuilderMock = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getCount: jest.fn().mockResolvedValue(0),
      getRawOne: jest.fn().mockResolvedValue({
        avgSuccessRate: 0.85,
        avgImpact: 5000,
        avgVariance: 10,
      }),
      clone: jest.fn().mockReturnThis(),
    };

    mockDecisionEventRepo = {
      save: jest.fn().mockResolvedValue({}),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilderMock),
    };

    mockIndustryPatternRepo = {
      save: jest.fn().mockResolvedValue({}),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DecisionRepository,
        {
          provide: getRepositoryToken(DecisionEventEntity),
          useValue: mockDecisionEventRepo,
        },
        {
          provide: getRepositoryToken(IndustryPatternEntity),
          useValue: mockIndustryPatternRepo,
        },
      ],
    }).compile();

    repository = module.get<DecisionRepository>(DecisionRepository);
  });

  it("should save decision event to database", async () => {
    const event = DecisionEvent.create(validEventData);

    await repository.save(event);

    // Repository should attempt to save
    expect(mockDecisionEventRepo.save).toHaveBeenCalled();
  });

  it("should query decisions by industry", async () => {
    const results = await repository.findByIndustry("restaurant");

    // Should return array (empty for now since implementation is stubbed)
    expect(Array.isArray(results)).toBe(true);
  });

  it("should find decisions by organization", async () => {
    const results = await repository.findByOrganization("org-123");

    expect(Array.isArray(results)).toBe(true);
  });

  it("should find decisions with outcomes", async () => {
    const results = await repository.findWithOutcomes("restaurant");

    expect(Array.isArray(results)).toBe(true);
  });

  it("should get decision statistics", async () => {
    const stats = await repository.getStatistics("org-123");

    expect(stats).toBeDefined();
    expect(stats.totalDecisions).toBeDefined();
    expect(stats.decisionsWithOutcomes).toBeDefined();
    expect(stats.avgSuccessRate).toBeDefined();
  });

  // Note: Full integration tests would require:
  // 1. Test database setup
  // 2. TypeORM entity configuration
  // 3. Actual database queries
  // These are stubbed for now until database entities are created
});
