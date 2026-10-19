/**
 * IndustryPattern Domain Model Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { IndustryPattern } from '../IndustryPattern';
import { Money } from '../value-objects/Money';

describe('IndustryPattern Entity', () => {
  const validPatternData = {
    industry: 'restaurant',
    triggerCondition: {
      metric: 'food_cost' as const,
      threshold: {
        operator: 'above' as const,
        value: 35,
      },
      industry: 'restaurant',
    },
    sampleSize: 50,
    commonActions: [
      {
        action: 'reduce_costs' as const,
        frequency: 30,
        percentage: 60,
        avgExpectedImpact: Money.create(5000),
        avgActualImpact: Money.create(5500),
      },
      {
        action: 'increase_prices' as const,
        frequency: 20,
        percentage: 40,
        avgExpectedImpact: Money.create(3000),
      },
    ],
    successRates: {
      overallSuccessRate: 85,
      avgVariance: 5,
      byAction: {
        reduce_costs: 90,
        increase_prices: 75,
      } as Record<string, number>,
    },
    topPerformers: {
      topActions: ['reduce_costs' as const],
      avgImpact: Money.create(6000),
      successRate: 92,
      sampleSize: 30,
    },
    statisticalSignificance: 0.92,
    lastUpdated: new Date(),
  };

  it('should create a valid industry pattern', () => {
    const pattern = IndustryPattern.create(validPatternData);

    expect(pattern.industry).toBe('restaurant');
    expect(pattern.sampleSize).toBe(50);
    expect(pattern.commonActions.length).toBe(2);
    expect(pattern.statisticalSignificance).toBe(0.92);
  });

  it('should reject negative sample size', () => {
    expect(() => IndustryPattern.create({
      ...validPatternData,
      sampleSize: -1,
    })).toThrow('Sample size cannot be negative');
  });

  it('should reject invalid statistical significance', () => {
    expect(() => IndustryPattern.create({
      ...validPatternData,
      statisticalSignificance: 1.5,
    })).toThrow('Statistical significance must be between 0 and 1');
  });

  it('should get most successful action', () => {
    const pattern = IndustryPattern.create(validPatternData);
    const action = pattern.getMostSuccessfulAction();

    expect(action).toBe('reduce_costs'); // Has 90% success rate vs 75%
  });

  it('should return null for most successful action if no actions', () => {
    const pattern = IndustryPattern.create({
      ...validPatternData,
      commonActions: [],
      sampleSize: 0,
    });

    expect(pattern.getMostSuccessfulAction()).toBeNull();
  });

  it('should check if pattern has sufficient data', () => {
    const pattern1 = IndustryPattern.create({
      ...validPatternData,
      sampleSize: 5,
      statisticalSignificance: 0.5,
    });
    expect(pattern1.hasSufficientData()).toBe(false);

    const pattern2 = IndustryPattern.create({
      ...validPatternData,
      sampleSize: 50,
      statisticalSignificance: 0.9,
    });
    expect(pattern2.hasSufficientData()).toBe(true);
  });

  it('should determine confidence level correctly', () => {
    const lowPattern = IndustryPattern.create({
      ...validPatternData,
      sampleSize: 5,
      statisticalSignificance: 0.5,
    });
    expect(lowPattern.getConfidenceLevel()).toBe('low');

    const mediumPattern = IndustryPattern.create({
      ...validPatternData,
      sampleSize: 25,
      statisticalSignificance: 0.75,
    });
    expect(mediumPattern.getConfidenceLevel()).toBe('medium');

    const highPattern = IndustryPattern.create({
      ...validPatternData,
      sampleSize: 60,
      statisticalSignificance: 0.95,
    });
    expect(highPattern.getConfidenceLevel()).toBe('high');
  });

  it('should serialize to JSON', () => {
    const pattern = IndustryPattern.create(validPatternData);
    const json = pattern.toJSON();

    expect(json.industry).toBe('restaurant');
    expect(json.sampleSize).toBe(50);
    expect(json.commonActions).toBeDefined();
    expect(json.successRates).toBeDefined();
  });

  it('should deserialize from JSON', () => {
    const pattern = IndustryPattern.create(validPatternData);
    const json = pattern.toJSON();
    const restored = IndustryPattern.fromJSON(json);

    expect(restored.industry).toBe('restaurant');
    expect(restored.sampleSize).toBe(50);
    expect(restored.commonActions.length).toBe(2);
  });
});
