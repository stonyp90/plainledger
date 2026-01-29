/**
 * IndustryPattern Domain Model
 * 
 * Aggregated patterns from multiple decisions within an industry.
 * Used for generating recommendations and understanding common actions.
 */

import { DecisionEvent, ActionType, FinancialMetric } from './DecisionEvent';
import { Money } from './value-objects/Money';

export type Percentage = number; // 0-100

export interface PatternCondition {
  metric: FinancialMetric;
  threshold: {
    operator: 'above' | 'below' | 'between';
    value: number | [number, number];
  };
  industry: string;
  businessSize?: string;
}

export interface ActionFrequency {
  action: ActionType;
  frequency: number; // Count of times this action was taken
  percentage: Percentage; // Percentage of decisions using this action
  avgExpectedImpact: Money;
  avgActualImpact?: Money;
}

export interface SuccessMetrics {
  overallSuccessRate: Percentage;
  byAction: Record<ActionType, Percentage>;
  avgVariance: Percentage; // Average variance between expected and actual
}

export interface PerformerProfile {
  topActions: ActionType[];
  avgImpact: Money;
  successRate: Percentage;
  sampleSize: number;
}

export interface IndustryPatternProps {
  industry: string;
  triggerCondition: PatternCondition;
  sampleSize: number;
  commonActions: ActionFrequency[];
  successRates: SuccessMetrics;
  topPerformers: PerformerProfile;
  statisticalSignificance: number; // 0-1
  lastUpdated: Date;
}

/**
 * IndustryPattern Domain Entity
 * 
 * Aggregated insights from multiple decisions within an industry.
 * Used to generate recommendations for similar situations.
 */
export class IndustryPattern {
  public readonly industry: string;
  public readonly triggerCondition: PatternCondition;
  public readonly sampleSize: number;
  public readonly commonActions: ActionFrequency[];
  public readonly successRates: SuccessMetrics;
  public readonly topPerformers: PerformerProfile;
  public readonly statisticalSignificance: number;
  public readonly lastUpdated: Date;

  private constructor(props: IndustryPatternProps) {
    this.industry = props.industry;
    this.triggerCondition = props.triggerCondition;
    this.sampleSize = props.sampleSize;
    this.commonActions = props.commonActions;
    this.successRates = props.successRates;
    this.topPerformers = props.topPerformers;
    this.statisticalSignificance = props.statisticalSignificance;
    this.lastUpdated = props.lastUpdated;

    this.validate();
  }

  /**
   * Create a new IndustryPattern
   */
  static create(props: IndustryPatternProps): IndustryPattern {
    return new IndustryPattern(props);
  }

  /**
   * Get the most successful action for this pattern
   */
  getMostSuccessfulAction(): ActionType | null {
    if (this.commonActions.length === 0) {
      return null;
    }

    // Sort by success rate, then by frequency
    const sorted = [...this.commonActions].sort((a, b) => {
      const aSuccess = this.successRates.byAction[a.action] || 0;
      const bSuccess = this.successRates.byAction[b.action] || 0;
      
      if (aSuccess !== bSuccess) {
        return bSuccess - aSuccess;
      }
      
      return b.frequency - a.frequency;
    });

    return sorted[0].action;
  }

  /**
   * Check if pattern has sufficient data
   */
  hasSufficientData(minSampleSize: number = 10): boolean {
    return this.sampleSize >= minSampleSize && this.statisticalSignificance >= 0.7;
  }

  /**
   * Get confidence level based on sample size and significance
   */
  getConfidenceLevel(): 'low' | 'medium' | 'high' {
    if (this.sampleSize >= 50 && this.statisticalSignificance >= 0.9) {
      return 'high';
    }
    if (this.sampleSize >= 20 && this.statisticalSignificance >= 0.7) {
      return 'medium';
    }
    return 'low';
  }

  private validate(): void {
    if (this.sampleSize < 0) {
      throw new Error('Sample size cannot be negative');
    }

    if (this.statisticalSignificance < 0 || this.statisticalSignificance > 1) {
      throw new Error('Statistical significance must be between 0 and 1');
    }

    if (this.commonActions.length === 0 && this.sampleSize > 0) {
      throw new Error('Pattern must have common actions if sample size > 0');
    }

    // Validate percentages sum to ~100%
    const totalPercentage = this.commonActions.reduce((sum, action) => sum + action.percentage, 0);
    if (Math.abs(totalPercentage - 100) > 5 && this.commonActions.length > 0) {
      // Allow 5% tolerance for rounding
      console.warn(`Action percentages sum to ${totalPercentage}%, expected ~100%`);
    }
  }

  /**
   * Convert to JSON for storage
   */
  toJSON(): Record<string, any> {
    return {
      industry: this.industry,
      triggerCondition: this.triggerCondition,
      sampleSize: this.sampleSize,
      commonActions: this.commonActions.map(action => ({
        ...action,
        avgExpectedImpact: action.avgExpectedImpact.toJSON(),
        avgActualImpact: action.avgActualImpact?.toJSON(),
      })),
      successRates: this.successRates,
      topPerformers: {
        ...this.topPerformers,
        avgImpact: this.topPerformers.avgImpact.toJSON(),
      },
      statisticalSignificance: this.statisticalSignificance,
      lastUpdated: this.lastUpdated.toISOString(),
    };
  }

  /**
   * Create from JSON
   */
  static fromJSON(data: Record<string, any>): IndustryPattern {
    return new IndustryPattern({
      industry: data.industry,
      triggerCondition: data.triggerCondition,
      sampleSize: data.sampleSize,
      commonActions: data.commonActions.map((action: any) => ({
        ...action,
        avgExpectedImpact: Money.create(action.avgExpectedImpact?.amount || action.avgExpectedImpact, action.avgExpectedImpact?.currency),
        avgActualImpact: action.avgActualImpact ? Money.create(action.avgActualImpact?.amount || action.avgActualImpact, action.avgActualImpact?.currency) : undefined,
      })),
      successRates: data.successRates,
      topPerformers: {
        ...data.topPerformers,
        avgImpact: Money.create(data.topPerformers.avgImpact?.amount || data.topPerformers.avgImpact, data.topPerformers.avgImpact?.currency),
      },
      statisticalSignificance: data.statisticalSignificance,
      lastUpdated: new Date(data.lastUpdated),
    });
  }
}
