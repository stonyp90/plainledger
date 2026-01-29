/**
 * PatternAggregationService Unit Tests
 */

import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { PatternAggregationService } from "../pattern-aggregation.service";
import {
  IDecisionRepository,
  DECISION_REPOSITORY_TOKEN,
} from "../../ports/outbound/IDecisionRepository";
import { DecisionEvent } from "@domain/DecisionEvent";
import { Money } from "@domain/value-objects/Money";
import { IndustryPatternEntity } from "@infrastructure/persistence/postgres/entities/industry-pattern.entity";

describe("PatternAggregationService", () => {
  let service: PatternAggregationService;
  let mockRepository: jest.Mocked<IDecisionRepository>;
  let mockPatternRepository: any;

  const createDecision = (overrides: any = {}) => {
    const baseDecision = {
      actionType: "reduce_costs" as const,
      description: "Renegotiate supplier contracts",
      expectedImpact: Money.create(5000),
      confidence: "high" as const,
    };
    const baseTrigger = {
      metric: "food_cost" as const,
      currentValue: Money.create(35000),
      benchmarkValue: Money.create(30000),
      gapPercentage: 16.7,
    };
    // Destructure nested overrides separately
    const {
      decision: decisionOverrides,
      trigger: triggerOverrides,
      ...topLevelOverrides
    } = overrides;
    return DecisionEvent.create({
      organizationId: "org-123",
      industry: "restaurant",
      businessSize: "small",
      trigger: { ...baseTrigger, ...(triggerOverrides || {}) },
      decision: { ...baseDecision, ...(decisionOverrides || {}) },
      source: "user",
      ...topLevelOverrides,
    });
  };

  beforeEach(async () => {
    mockRepository = {
      findByIndustry: jest.fn(),
      findWithOutcomes: jest.fn(),
      findSimilar: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
      findByOrganization: jest.fn(),
      aggregatePatterns: jest.fn(),
      countByIndustry: jest.fn(),
      getStatistics: jest.fn(),
    } as any;

    mockPatternRepository = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatternAggregationService,
        {
          provide: DECISION_REPOSITORY_TOKEN,
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(IndustryPatternEntity),
          useValue: mockPatternRepository,
        },
      ],
    }).compile();

    service = module.get<PatternAggregationService>(PatternAggregationService);
  });

  it("should aggregate decisions into industry patterns", async () => {
    const decisions = [
      createDecision({ decision: { actionType: "reduce_costs" } }),
      createDecision({ decision: { actionType: "reduce_costs" } }),
      createDecision({ decision: { actionType: "increase_prices" } }),
    ];

    // Add outcomes
    decisions[0].addOutcome({
      actualImpact: Money.create(6000),
      measuredAt: new Date(),
      success: true,
      variance: 20,
    });
    decisions[1].addOutcome({
      actualImpact: Money.create(5500),
      measuredAt: new Date(),
      success: true,
      variance: 10,
    });
    decisions[2].addOutcome({
      actualImpact: Money.create(2000),
      measuredAt: new Date(),
      success: false,
      variance: -60,
    });

    const pattern = await service.aggregatePattern("restaurant", decisions);

    expect(pattern.sampleSize).toBe(3);
    expect(pattern.commonActions.length).toBeGreaterThan(0);
    expect(pattern.commonActions[0].action).toBe("reduce_costs");
    expect(pattern.commonActions[0].frequency).toBe(2);
  });

  it("should calculate statistical significance", async () => {
    const decisions = Array(50)
      .fill(null)
      .map(() => {
        const decision = createDecision({
          decision: { actionType: "reduce_costs" },
        });
        decision.addOutcome({
          actualImpact: Money.create(5000),
          measuredAt: new Date(),
          success: true,
          variance: 0,
        });
        return decision;
      });

    const pattern = await service.aggregatePattern("restaurant", decisions);

    expect(pattern.statisticalSignificance).toBeGreaterThan(0.9);
  });

  it("should find patterns matching condition", async () => {
    const decisions = [
      createDecision({ industry: "restaurant" }),
      createDecision({ industry: "restaurant" }),
    ];

    mockRepository.findByIndustry.mockResolvedValue(decisions);

    const patterns = await service.findPatterns({
      industry: "restaurant",
      metric: "food_cost",
    });

    expect(patterns.length).toBeGreaterThan(0);
  });
});
