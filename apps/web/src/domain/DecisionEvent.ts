/**
 * DecisionEvent Domain Model
 * 
 * Core domain entity representing a business decision captured in context.
 * Part of the Context Intelligence Platform.
 */

import { Money } from './value-objects/Money';

export type IndustryType = 
  | 'restaurant'
  | 'retail'
  | 'construction'
  | 'professional_services'
  | 'real_estate'
  | 'saas'
  | 'healthcare'
  | 'manufacturing'
  | 'other';

export type BusinessSize = 'micro' | 'small' | 'medium' | 'large';

export type FinancialMetric = 
  | 'revenue'
  | 'gross_margin'
  | 'net_margin'
  | 'food_cost'
  | 'labor_cost'
  | 'inventory_turnover'
  | 'utilization_rate'
  | 'cash_flow'
  | 'runway_months'
  | 'other';

export type ActionType = 
  | 'reduce_costs'
  | 'increase_prices'
  | 'optimize_inventory'
  | 'improve_margins'
  | 'expand_capacity'
  | 'reduce_headcount'
  | 'increase_marketing'
  | 'renegotiate_contracts'
  | 'other';

export type ConfidenceLevel = 'low' | 'medium' | 'high';

export type Percentage = number; // 0-100

export interface DecisionTrigger {
  metric: FinancialMetric;
  currentValue: Money;
  benchmarkValue: Money;
  gapPercentage: Percentage;
  chartContext?: string; // Chart/chart section that triggered the decision
}

export interface DecisionAction {
  actionType: ActionType;
  description: string;
  reasoning?: string;
  expectedImpact: Money;
  confidence: ConfidenceLevel;
}

export interface DecisionOutcome {
  actualImpact: Money;
  measuredAt: Date;
  success: boolean;
  variance: Percentage; // Difference between expected and actual
  learnings?: string;
}

export interface DecisionEventProps {
  id?: string;
  organizationId: string;
  industry: IndustryType;
  businessSize: BusinessSize;
  trigger: DecisionTrigger;
  decision: DecisionAction;
  outcome?: DecisionOutcome;
  createdAt?: Date;
  source: 'user' | 'ai_suggested' | 'imported';
}

/**
 * DecisionEvent Domain Entity
 * 
 * Represents a business decision made in response to a financial trigger.
 * Captures context, action, and outcome for pattern learning.
 */
export class DecisionEvent {
  public readonly id: string;
  public readonly organizationId: string;
  public readonly industry: IndustryType;
  public readonly businessSize: BusinessSize;
  public readonly trigger: DecisionTrigger;
  public readonly decision: DecisionAction;
  public outcome?: DecisionOutcome;
  public readonly createdAt: Date;
  public readonly source: 'user' | 'ai_suggested' | 'imported';

  private constructor(props: DecisionEventProps) {
    this.id = props.id || this.generateId();
    this.organizationId = props.organizationId;
    this.industry = props.industry;
    this.businessSize = props.businessSize;
    this.trigger = props.trigger;
    this.decision = props.decision;
    this.outcome = props.outcome;
    this.createdAt = props.createdAt || new Date();
    this.source = props.source;

    this.validate();
  }

  /**
   * Create a new DecisionEvent
   */
  static create(props: DecisionEventProps): DecisionEvent {
    return new DecisionEvent(props);
  }

  /**
   * Add outcome to a decision
   */
  addOutcome(outcome: DecisionOutcome): void {
    if (this.outcome) {
      throw new Error('Outcome already recorded for this decision');
    }

    // Calculate variance
    const expectedAmount = this.decision.expectedImpact.amount;
    const actualAmount = outcome.actualImpact.amount;
    const variance = expectedAmount !== 0 
      ? ((actualAmount - expectedAmount) / Math.abs(expectedAmount)) * 100
      : 0;

    this.outcome = {
      ...outcome,
      variance,
    };
  }

  /**
   * Calculate ROI if outcome exists
   */
  getROI(): number | null {
    if (!this.outcome) {
      return null;
    }

    // ROI = (actual impact - cost) / cost
    // For now, assume cost is the expected impact (simplified)
    const cost = Math.abs(this.decision.expectedImpact.amount);
    if (cost === 0) {
      return null;
    }

    return this.outcome.actualImpact.amount / cost;
  }

  /**
   * Check if decision was successful
   */
  isSuccessful(): boolean | null {
    return this.outcome?.success ?? null;
  }

  private validate(): void {
    const validIndustries: IndustryType[] = [
      'restaurant',
      'retail',
      'construction',
      'professional_services',
      'real_estate',
      'saas',
      'healthcare',
      'manufacturing',
      'other',
    ];

    if (!validIndustries.includes(this.industry)) {
      throw new Error(`Invalid industry type: ${this.industry}`);
    }

    const validBusinessSizes: BusinessSize[] = ['micro', 'small', 'medium', 'large'];
    if (!validBusinessSizes.includes(this.businessSize)) {
      throw new Error(`Invalid business size: ${this.businessSize}`);
    }

    const validSources: Array<'user' | 'ai_suggested' | 'imported'> = ['user', 'ai_suggested', 'imported'];
    if (!validSources.includes(this.source)) {
      throw new Error(`Invalid source: ${this.source}`);
    }

    if (this.decision.expectedImpact.amount < 0 && this.decision.actionType === 'increase_prices') {
      // Increasing prices should have positive expected impact
      throw new Error('Invalid expected impact for action type');
    }
  }

  private generateId(): string {
    return `decision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Convert to JSON for storage
   */
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      organizationId: this.organizationId,
      industry: this.industry,
      businessSize: this.businessSize,
      trigger: {
        ...this.trigger,
        currentValue: this.trigger.currentValue.toJSON(),
        benchmarkValue: this.trigger.benchmarkValue.toJSON(),
      },
      decision: {
        ...this.decision,
        expectedImpact: this.decision.expectedImpact.toJSON(),
      },
      outcome: this.outcome ? {
        ...this.outcome,
        actualImpact: this.outcome.actualImpact.toJSON(),
        measuredAt: this.outcome.measuredAt.toISOString(),
      } : undefined,
      createdAt: this.createdAt.toISOString(),
      source: this.source,
    };
  }

  /**
   * Create from JSON
   */
  static fromJSON(data: Record<string, any>): DecisionEvent {
    return new DecisionEvent({
      id: data.id,
      organizationId: data.organizationId,
      industry: data.industry,
      businessSize: data.businessSize,
      trigger: {
        ...data.trigger,
        currentValue: Money.create(data.trigger.currentValue?.amount || data.trigger.currentValue, data.trigger.currentValue?.currency),
        benchmarkValue: Money.create(data.trigger.benchmarkValue?.amount || data.trigger.benchmarkValue, data.trigger.benchmarkValue?.currency),
      },
      decision: {
        ...data.decision,
        expectedImpact: Money.create(data.decision.expectedImpact?.amount || data.decision.expectedImpact, data.decision.expectedImpact?.currency),
      },
      outcome: data.outcome ? {
        ...data.outcome,
        actualImpact: Money.create(data.outcome.actualImpact?.amount || data.outcome.actualImpact, data.outcome.actualImpact?.currency),
        measuredAt: new Date(data.outcome.measuredAt),
      } : undefined,
      createdAt: new Date(data.createdAt),
      source: data.source,
    });
  }
}
