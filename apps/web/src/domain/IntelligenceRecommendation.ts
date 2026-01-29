/**
 * IntelligenceRecommendation Domain Model
 * 
 * AI-generated recommendation based on industry patterns and similar decisions.
 * Part of the Context Intelligence Platform.
 */

import { IndustryPattern } from './IndustryPattern';
import { DecisionEvent } from './DecisionEvent';
import { Money } from './value-objects/Money';

export type ConfidenceLevel = 'low' | 'medium' | 'high';
export type Percentage = number; // 0-100

export interface IntelligenceRecommendationProps {
  context: string; // Description of the business situation
  recommendation: string; // The recommended action
  supportingPatterns: IndustryPattern[];
  similarDecisions: DecisionEvent[];
  confidence: ConfidenceLevel;
  sampleSize: number;
  successProbability: Percentage;
  expectedOutcome: Money;
  timeToResult: string; // e.g., "2-4 weeks", "1-3 months"
}

/**
 * IntelligenceRecommendation Domain Entity
 * 
 * Represents an AI-generated recommendation backed by industry patterns
 * and real decision outcomes.
 */
export class IntelligenceRecommendation {
  public readonly context: string;
  public readonly recommendation: string;
  public readonly supportingPatterns: IndustryPattern[];
  public readonly similarDecisions: DecisionEvent[];
  public readonly confidence: ConfidenceLevel;
  public readonly sampleSize: number;
  public readonly successProbability: Percentage;
  public readonly expectedOutcome: Money;
  public readonly timeToResult: string;

  private constructor(props: IntelligenceRecommendationProps) {
    this.context = props.context;
    this.recommendation = props.recommendation;
    this.supportingPatterns = props.supportingPatterns;
    this.similarDecisions = props.similarDecisions;
    this.confidence = props.confidence;
    this.sampleSize = props.sampleSize;
    this.successProbability = props.successProbability;
    this.expectedOutcome = props.expectedOutcome;
    this.timeToResult = props.timeToResult;

    this.validate();
  }

  /**
   * Create a new IntelligenceRecommendation
   */
  static create(props: IntelligenceRecommendationProps): IntelligenceRecommendation {
    return new IntelligenceRecommendation(props);
  }

  /**
   * Get the strongest supporting pattern
   */
  getStrongestPattern(): IndustryPattern | null {
    if (this.supportingPatterns.length === 0) {
      return null;
    }

    return this.supportingPatterns.reduce((strongest, pattern) => {
      if (!strongest) {
        return pattern;
      }

      // Compare by statistical significance and sample size
      if (pattern.statisticalSignificance > strongest.statisticalSignificance) {
        return pattern;
      }
      if (
        pattern.statisticalSignificance === strongest.statisticalSignificance &&
        pattern.sampleSize > strongest.sampleSize
      ) {
        return pattern;
      }

      return strongest;
    });
  }

  /**
   * Get average success rate from similar decisions
   */
  getAverageSuccessRate(): Percentage {
    if (this.similarDecisions.length === 0) {
      return this.successProbability;
    }

    const successfulDecisions = this.similarDecisions.filter(
      decision => decision.isSuccessful() === true
    );

    return (successfulDecisions.length / this.similarDecisions.length) * 100;
  }

  /**
   * Check if recommendation is well-supported
   */
  isWellSupported(): boolean {
    return (
      this.sampleSize >= 10 &&
      this.successProbability >= 70 &&
      this.supportingPatterns.length > 0 &&
      this.confidence !== 'low'
    );
  }

  private validate(): void {
    if (this.sampleSize < 0) {
      throw new Error('Sample size cannot be negative');
    }

    if (this.successProbability < 0 || this.successProbability > 100) {
      throw new Error('Success probability must be between 0 and 100');
    }

    if (this.context.trim().length === 0) {
      throw new Error('Context cannot be empty');
    }

    if (this.recommendation.trim().length === 0) {
      throw new Error('Recommendation cannot be empty');
    }

    const validConfidence: ConfidenceLevel[] = ['low', 'medium', 'high'];
    if (!validConfidence.includes(this.confidence)) {
      throw new Error(`Invalid confidence level: ${this.confidence}`);
    }
  }

  /**
   * Convert to JSON for storage/API
   */
  toJSON(): Record<string, any> {
    return {
      context: this.context,
      recommendation: this.recommendation,
      supportingPatterns: this.supportingPatterns.map(pattern => pattern.toJSON()),
      similarDecisions: this.similarDecisions.map(decision => decision.toJSON()),
      confidence: this.confidence,
      sampleSize: this.sampleSize,
      successProbability: this.successProbability,
      expectedOutcome: this.expectedOutcome.toJSON(),
      timeToResult: this.timeToResult,
    };
  }

  /**
   * Create from JSON
   */
  static fromJSON(data: Record<string, any>): IntelligenceRecommendation {
    return new IntelligenceRecommendation({
      context: data.context,
      recommendation: data.recommendation,
      supportingPatterns: data.supportingPatterns.map((p: any) => IndustryPattern.fromJSON(p)),
      similarDecisions: data.similarDecisions.map((d: any) => DecisionEvent.fromJSON(d)),
      confidence: data.confidence,
      sampleSize: data.sampleSize,
      successProbability: data.successProbability,
      expectedOutcome: Money.create(data.expectedOutcome?.amount || data.expectedOutcome, data.expectedOutcome?.currency),
      timeToResult: data.timeToResult,
    });
  }
}
