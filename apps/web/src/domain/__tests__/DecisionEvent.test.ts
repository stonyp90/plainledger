/**
 * DecisionEvent Domain Model Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { DecisionEvent } from '../DecisionEvent';
import { Money } from '../value-objects/Money';

describe('DecisionEvent Entity', () => {
  const validEventData = {
    organizationId: 'org-123',
    industry: 'restaurant' as const,
    businessSize: 'small' as const,
    trigger: {
      metric: 'gross_margin' as const,
      currentValue: Money.create(25000),
      benchmarkValue: Money.create(30000),
      gapPercentage: -16.7,
    },
    decision: {
      actionType: 'reduce_costs' as const,
      description: 'Renegotiate supplier contracts',
      expectedImpact: Money.create(5000),
      confidence: 'high' as const,
    },
    source: 'user' as const,
  };

  it('should create a valid decision event', () => {
    const event = DecisionEvent.create(validEventData);

    expect(event.id).toBeDefined();
    expect(event.organizationId).toBe('org-123');
    expect(event.industry).toBe('restaurant');
    expect(event.decision.confidence).toBe('high');
    expect(event.source).toBe('user');
  });

  it('should reject invalid industry', () => {
    expect(() => DecisionEvent.create({
      ...validEventData,
      industry: 'invalid_industry' as any,
    })).toThrow('Invalid industry type');
  });

  it('should reject invalid business size', () => {
    expect(() => DecisionEvent.create({
      ...validEventData,
      businessSize: 'invalid' as any,
    })).toThrow('Invalid business size');
  });

  it('should reject invalid source', () => {
    expect(() => DecisionEvent.create({
      ...validEventData,
      source: 'invalid' as any,
    })).toThrow('Invalid source');
  });

  it('should calculate ROI when outcome is added', () => {
    const event = DecisionEvent.create(validEventData);
    
    event.addOutcome({
      actualImpact: Money.create(6000),
      measuredAt: new Date(),
      success: true,
      variance: 20, // 6000 vs 5000 expected = +20%
    });

    const roi = event.getROI();
    expect(roi).toBeCloseTo(1.2); // 6000/5000
  });

  it('should calculate variance when outcome is added', () => {
    const event = DecisionEvent.create(validEventData);
    
    event.addOutcome({
      actualImpact: Money.create(6000),
      measuredAt: new Date(),
      success: true,
      variance: 0, // Will be calculated
    });

    expect(event.outcome?.variance).toBeCloseTo(20); // (6000-5000)/5000 * 100
  });

  it('should prevent adding outcome twice', () => {
    const event = DecisionEvent.create(validEventData);
    
    event.addOutcome({
      actualImpact: Money.create(6000),
      measuredAt: new Date(),
      success: true,
      variance: 20,
    });

    expect(() => {
      event.addOutcome({
        actualImpact: Money.create(7000),
        measuredAt: new Date(),
        success: true,
        variance: 40,
      });
    }).toThrow('Outcome already recorded');
  });

  it('should check if decision was successful', () => {
    const event = DecisionEvent.create(validEventData);
    
    expect(event.isSuccessful()).toBeNull(); // No outcome yet
    
    event.addOutcome({
      actualImpact: Money.create(6000),
      measuredAt: new Date(),
      success: true,
      variance: 20,
    });

    expect(event.isSuccessful()).toBe(true);
  });

  it('should serialize to JSON', () => {
    const event = DecisionEvent.create(validEventData);
    const json = event.toJSON();

    expect(json.id).toBe(event.id);
    expect(json.organizationId).toBe('org-123');
    expect(json.trigger.currentValue).toBeDefined();
    expect(json.decision.expectedImpact).toBeDefined();
  });

  it('should deserialize from JSON', () => {
    const event = DecisionEvent.create(validEventData);
    const json = event.toJSON();
    const restored = DecisionEvent.fromJSON(json);

    expect(restored.id).toBe(event.id);
    expect(restored.industry).toBe('restaurant');
    expect(restored.trigger.currentValue.amount).toBe(25000);
  });

  it('should handle outcome in JSON serialization', () => {
    const event = DecisionEvent.create(validEventData);
    event.addOutcome({
      actualImpact: Money.create(6000),
      measuredAt: new Date(),
      success: true,
      variance: 20,
    });

    const json = event.toJSON();
    expect(json.outcome).toBeDefined();
    expect(json.outcome.actualImpact).toBeDefined();
    expect(json.outcome.success).toBe(true);
  });
});
