/**
 * IntelligenceRecommendation Domain Model Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { IntelligenceRecommendation } from '../IntelligenceRecommendation';
import { IndustryPattern } from '../IndustryPattern';
import { DecisionEvent } from '../DecisionEvent';
import { Money } from '../value-objects/Money';

describe('IntelligenceRecommendation Entity', () => {
  const mockPattern = IndustryPattern.create({
    industry: 'restaurant',
    triggerCondition: {
      metric: 'food_cost',
      threshold: { operator: 'above', value: 35 },
      industry: 'restaurant',
    },
    sampleSize: 50,
    commonActions: [
      {
        action: 'reduce_costs',
        frequency: 50,
        percentage: 100,
        avgExpectedImpact: Money.create(5000),
        avgActualImpact: Money.create(4800),
      },
    ],
    successRates: {
      overallSuccessRate: 85,
      avgVariance: 5,
      byAction: {
        reduce_costs: 85,
        increase_prices: 70,
        optimize_inventory: 75,
        improve_margins: 80,
        expand_capacity: 65,
        reduce_headcount: 60,
        increase_marketing: 72,
        renegotiate_contracts: 78,
        other: 50,
      },
    },
    topPerformers: {
      topActions: ['reduce_costs'],
      avgImpact: Money.create(5000),
      successRate: 85,
      sampleSize: 50,
    },
    statisticalSignificance: 0.9,
    lastUpdated: new Date(),
  });

  const mockDecision = DecisionEvent.create({
    organizationId: 'org-123',
    industry: 'restaurant',
    businessSize: 'small',
    trigger: {
      metric: 'food_cost',
      currentValue: Money.create(35000),
      benchmarkValue: Money.create(30000),
      gapPercentage: 16.7,
    },
    decision: {
      actionType: 'reduce_costs',
      description: 'Renegotiate supplier contracts',
      expectedImpact: Money.create(5000),
      confidence: 'high',
    },
    source: 'user',
  });

  const validRecommendationData = {
    context: 'A small restaurant business is seeing food_cost at $35,000, which is 16.7% above the industry benchmark.',
    recommendation: 'Based on 50 similar restaurant businesses, reduce operating costs. This action has a 90% success rate.',
    supportingPatterns: [mockPattern],
    similarDecisions: [mockDecision],
    confidence: 'high' as const,
    sampleSize: 50,
    successProbability: 90,
    expectedOutcome: Money.create(5500),
    timeToResult: '2-4 weeks',
  };

  it('should create a valid intelligence recommendation', () => {
    const recommendation = IntelligenceRecommendation.create(validRecommendationData);

    expect(recommendation.context).toBeDefined();
    expect(recommendation.recommendation).toBeDefined();
    expect(recommendation.supportingPatterns.length).toBe(1);
    expect(recommendation.confidence).toBe('high');
  });

  it('should reject negative sample size', () => {
    expect(() => IntelligenceRecommendation.create({
      ...validRecommendationData,
      sampleSize: -1,
    })).toThrow('Sample size cannot be negative');
  });

  it('should reject invalid success probability', () => {
    expect(() => IntelligenceRecommendation.create({
      ...validRecommendationData,
      successProbability: 150,
    })).toThrow('Success probability must be between 0 and 100');
  });

  it('should reject empty context', () => {
    expect(() => IntelligenceRecommendation.create({
      ...validRecommendationData,
      context: '   ',
    })).toThrow('Context cannot be empty');
  });

  it('should reject empty recommendation', () => {
    expect(() => IntelligenceRecommendation.create({
      ...validRecommendationData,
      recommendation: '',
    })).toThrow('Recommendation cannot be empty');
  });

  it('should reject invalid confidence level', () => {
    expect(() => IntelligenceRecommendation.create({
      ...validRecommendationData,
      confidence: 'invalid' as any,
    })).toThrow('Invalid confidence level');
  });

  it('should get strongest supporting pattern', () => {
    const strongPattern = IndustryPattern.create({
      ...mockPattern,
      statisticalSignificance: 0.95,
      sampleSize: 100,
    });

    const recommendation = IntelligenceRecommendation.create({
      ...validRecommendationData,
      supportingPatterns: [mockPattern, strongPattern],
    });

    const strongest = recommendation.getStrongestPattern();
    expect(strongest).toBe(strongPattern);
  });

  it('should calculate average success rate from similar decisions', () => {
    const successfulDecision = DecisionEvent.create({
      ...mockDecision.toJSON(),
      outcome: {
        actualImpact: Money.create(6000),
        measuredAt: new Date(),
        success: true,
        variance: 20,
      },
    } as any);

    const failedDecision = DecisionEvent.create({
      ...mockDecision.toJSON(),
      outcome: {
        actualImpact: Money.create(2000),
        measuredAt: new Date(),
        success: false,
        variance: -60,
      },
    } as any);

    const recommendation = IntelligenceRecommendation.create({
      ...validRecommendationData,
      similarDecisions: [successfulDecision, failedDecision],
    });

    const avgRate = recommendation.getAverageSuccessRate();
    expect(avgRate).toBe(50); // 1 out of 2 successful
  });

  it('should check if recommendation is well-supported', () => {
    const wellSupported = IntelligenceRecommendation.create({
      ...validRecommendationData,
      sampleSize: 20,
      successProbability: 85,
      confidence: 'high',
    });
    expect(wellSupported.isWellSupported()).toBe(true);

    const poorlySupported = IntelligenceRecommendation.create({
      ...validRecommendationData,
      sampleSize: 5,
      successProbability: 50,
      confidence: 'low',
      supportingPatterns: [],
    });
    expect(poorlySupported.isWellSupported()).toBe(false);
  });

  it('should serialize to JSON', () => {
    const recommendation = IntelligenceRecommendation.create(validRecommendationData);
    const json = recommendation.toJSON();

    expect(json.context).toBeDefined();
    expect(json.recommendation).toBeDefined();
    expect(json.supportingPatterns.length).toBe(1);
    expect(json.similarDecisions.length).toBe(1);
  });

  it('should deserialize from JSON', () => {
    const recommendation = IntelligenceRecommendation.create(validRecommendationData);
    const json = recommendation.toJSON();
    const restored = IntelligenceRecommendation.fromJSON(json);

    expect(restored.context).toBe(recommendation.context);
    expect(restored.recommendation).toBe(recommendation.recommendation);
    expect(restored.confidence).toBe('high');
  });
});
