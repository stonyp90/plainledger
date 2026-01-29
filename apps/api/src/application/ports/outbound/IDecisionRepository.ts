/**
 * IDecisionRepository Port
 *
 * Outbound port for decision event persistence.
 * Part of the Context Intelligence Platform.
 */

import { DecisionEvent } from "@domain/DecisionEvent";
import { IndustryPattern } from "@domain/IndustryPattern";

// DI Token for IDecisionRepository
export const DECISION_REPOSITORY_TOKEN = "IDecisionRepository";

export interface IDecisionRepository {
  /**
   * Save a decision event
   */
  save(decision: DecisionEvent): Promise<void>;

  /**
   * Find a decision by ID
   */
  findById(id: string): Promise<DecisionEvent | null>;

  /**
   * Find decisions by organization
   */
  findByOrganization(organizationId: string): Promise<DecisionEvent[]>;

  /**
   * Find decisions by industry
   */
  findByIndustry(industry: string, limit?: number): Promise<DecisionEvent[]>;

  /**
   * Find decisions with outcomes (for training data)
   */
  findWithOutcomes(industry?: string, limit?: number): Promise<DecisionEvent[]>;

  /**
   * Aggregate patterns from decisions
   */
  aggregatePatterns(
    industry: string,
    condition?: any,
  ): Promise<IndustryPattern[]>;

  /**
   * Find similar decisions based on trigger conditions
   */
  findSimilar(
    trigger: DecisionEvent["trigger"],
    industry: string,
    limit?: number,
  ): Promise<DecisionEvent[]>;

  /**
   * Count decisions by industry
   */
  countByIndustry(industry: string): Promise<number>;

  /**
   * Get decision statistics
   */
  getStatistics(
    organizationId?: string,
    industry?: string,
  ): Promise<{
    totalDecisions: number;
    decisionsWithOutcomes: number;
    avgSuccessRate: number;
    avgVariance: number;
  }>;
}
