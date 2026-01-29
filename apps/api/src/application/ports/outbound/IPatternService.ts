/**
 * IPatternService Port
 *
 * Outbound port for industry pattern aggregation and analysis.
 * Part of the Context Intelligence Platform.
 */

import { IndustryPattern } from "@domain/IndustryPattern";
import { DecisionEvent } from "@domain/DecisionEvent";

// DI Token for IPatternService
export const PATTERN_SERVICE_TOKEN = "IPatternService";

export interface PatternCondition {
  metric: string;
  threshold: {
    operator: "above" | "below" | "between";
    value: number | [number, number];
  };
  industry: string;
  businessSize?: string;
}

export interface IPatternService {
  /**
   * Aggregate patterns from decisions
   */
  aggregatePattern(
    industry: string,
    decisions: DecisionEvent[],
  ): Promise<IndustryPattern>;

  /**
   * Find patterns matching a condition
   */
  findPatterns(condition: PatternCondition): Promise<IndustryPattern[]>;

  /**
   * Update pattern statistics
   */
  updatePattern(pattern: IndustryPattern): Promise<void>;

  /**
   * Get pattern for a specific trigger condition
   */
  getPatternForTrigger(
    industry: string,
    trigger: DecisionEvent["trigger"],
  ): Promise<IndustryPattern | null>;

  /**
   * Calculate statistical significance
   */
  calculateSignificance(decisions: DecisionEvent[]): Promise<number>; // Returns 0-1

  /**
   * Get pattern freshness (time since last update)
   */
  getPatternFreshness(industry: string): Promise<number>; // Returns days
}
