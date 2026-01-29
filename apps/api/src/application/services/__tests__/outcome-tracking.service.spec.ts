/**
 * OutcomeTrackingService Unit Tests
 */

import { Test, TestingModule } from "@nestjs/testing";
import { OutcomeTrackingService } from "../outcome-tracking.service";
import {
  IDecisionRepository,
  DECISION_REPOSITORY_TOKEN,
} from "../../ports/outbound/IDecisionRepository";
import {
  IPatternService,
  PATTERN_SERVICE_TOKEN,
} from "../../ports/outbound/IPatternService";
import { DecisionEvent } from "@domain/DecisionEvent";
import { Money } from "@domain/value-objects/Money";
import { IndustryPattern } from "@domain/IndustryPattern";

describe("OutcomeTrackingService", () => {
  let service: OutcomeTrackingService;
  let mockDecisionRepository: jest.Mocked<IDecisionRepository>;
  let mockPatternService: jest.Mocked<IPatternService>;

  const createDecision = () => {
    return DecisionEvent.create({
      organizationId: "org-123",
      industry: "restaurant",
      businessSize: "small",
      trigger: {
        metric: "food_cost",
        currentValue: Money.create(35000),
        benchmarkValue: Money.create(30000),
        gapPercentage: 16.7,
      },
      decision: {
        actionType: "reduce_costs",
        description: "Renegotiate supplier contracts",
        expectedImpact: Money.create(5000),
        confidence: "high",
      },
      source: "user",
    });
  };

  beforeEach(async () => {
    mockDecisionRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      findByOrganization: jest.fn(),
      findByIndustry: jest.fn(),
      findWithOutcomes: jest.fn(),
      aggregatePatterns: jest.fn(),
      findSimilar: jest.fn(),
      countByIndustry: jest.fn(),
      getStatistics: jest.fn(),
    } as any;

    mockPatternService = {
      aggregatePattern: jest.fn(),
      findPatterns: jest.fn(),
      updatePattern: jest.fn(),
      getPatternForTrigger: jest.fn(),
      calculateSignificance: jest.fn(),
      getPatternFreshness: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutcomeTrackingService,
        {
          provide: DECISION_REPOSITORY_TOKEN,
          useValue: mockDecisionRepository,
        },
        {
          provide: PATTERN_SERVICE_TOKEN,
          useValue: mockPatternService,
        },
      ],
    }).compile();

    service = module.get<OutcomeTrackingService>(OutcomeTrackingService);
  });

  it("should link outcome to original decision", async () => {
    const decision = createDecision();
    mockDecisionRepository.findById.mockResolvedValue(decision);

    const result = await service.recordOutcome({
      decisionId: decision.id,
      actualImpact: 6000,
      success: true,
    });

    expect(result.outcome).toBeDefined();
    expect(result.outcome?.actualImpact.amount).toBe(6000);
    expect(mockDecisionRepository.save).toHaveBeenCalled();
  });

  it("should calculate variance between expected and actual", async () => {
    const decision = createDecision();
    mockDecisionRepository.findById.mockResolvedValue(decision);

    const result = await service.recordOutcome({
      decisionId: decision.id,
      actualImpact: 6000,
      success: true,
    });

    // Expected: 5000, Actual: 6000, Variance: (6000-5000)/5000 * 100 = 20%
    expect(result.outcome?.variance).toBeCloseTo(20);
  });

  it("should trigger pattern recalculation on outcome", async () => {
    const decision = createDecision();
    mockDecisionRepository.findById.mockResolvedValue(decision);

    // Mock decisions for pattern recalculation (need at least 10)
    const decisionsWithOutcomes = Array(15)
      .fill(null)
      .map(() => createDecision());
    decisionsWithOutcomes.forEach((d) => {
      d.addOutcome({
        actualImpact: Money.create(5000),
        measuredAt: new Date(),
        success: true,
        variance: 0,
      });
    });

    mockDecisionRepository.findWithOutcomes.mockResolvedValue(
      decisionsWithOutcomes,
    );

    const mockPattern = IndustryPattern.create({
      industry: "restaurant",
      triggerCondition: {
        metric: "food_cost",
        threshold: { operator: "above", value: 35 },
        industry: "restaurant",
      },
      sampleSize: 3,
      commonActions: [
        {
          action: "reduce_costs",
          frequency: 3,
          percentage: 100,
          avgExpectedImpact: Money.create(5000),
          avgActualImpact: Money.create(5500),
        },
      ],
      successRates: {
        overallSuccessRate: 100,
        byAction: {
          reduce_costs: 100,
          increase_prices: 0,
          optimize_inventory: 0,
          improve_margins: 0,
          expand_capacity: 0,
          reduce_headcount: 0,
          increase_marketing: 0,
          renegotiate_contracts: 0,
          other: 0,
        },
        avgVariance: 10,
      },
      topPerformers: {
        topActions: ["reduce_costs"],
        avgImpact: Money.create(5000),
        successRate: 100,
        sampleSize: 3,
      },
      statisticalSignificance: 0.7,
      lastUpdated: new Date(),
    });

    mockPatternService.aggregatePattern.mockResolvedValue(mockPattern);

    await service.recordOutcome({
      decisionId: decision.id,
      actualImpact: 6000,
      success: true,
    });

    // Wait a bit for async pattern recalculation
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockPatternService.aggregatePattern).toHaveBeenCalled();
    expect(mockPatternService.updatePattern).toHaveBeenCalled();
  });

  it("should get outcome statistics for organization", async () => {
    const decisions = [createDecision(), createDecision(), createDecision()];

    decisions[0].addOutcome({
      actualImpact: Money.create(6000),
      measuredAt: new Date(),
      success: true,
      variance: 20,
    });
    decisions[1].addOutcome({
      actualImpact: Money.create(4000),
      measuredAt: new Date(),
      success: false,
      variance: -20,
    });
    decisions[2].addOutcome({
      actualImpact: Money.create(5500),
      measuredAt: new Date(),
      success: true,
      variance: 10,
    });

    mockDecisionRepository.findByOrganization.mockResolvedValue(decisions);

    const stats = await service.getOutcomeStatistics("org-123");

    expect(stats.totalDecisions).toBe(3);
    expect(stats.decisionsWithOutcomes).toBe(3);
    expect(stats.successRate).toBeCloseTo(66.67); // 2 out of 3 successful
    expect(stats.avgVariance).toBeCloseTo(3.33); // (20 + -20 + 10) / 3
  });
});
