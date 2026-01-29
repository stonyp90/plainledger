/**
 * IIntelligenceEngine Port
 * 
 * Outbound port for AI-powered intelligence generation.
 * Part of the Context Intelligence Platform.
 */

import { IntelligenceRecommendation } from '../../../../web/src/domain/IntelligenceRecommendation';
import { DecisionEvent } from '../../../../web/src/domain/DecisionEvent';
import { IndustryPattern } from '../../../../web/src/domain/IndustryPattern';

export interface DecisionContext {
  organizationId: string;
  industry: string;
  businessSize: string;
  trigger: DecisionEvent['trigger'];
  currentMetrics?: Record<string, any>;
}

export interface IntelligenceRequest {
  type: 'pattern_lookup' | 'quick_suggestion' | 'deep_analysis' | 'standard';
  context: DecisionContext;
  requiresLowLatency?: boolean;
  maxCost?: number; // Optional cost constraint
}

export interface IIntelligenceEngine {
  /**
   * Generate an intelligence recommendation
   */
  generateInsight(
    request: IntelligenceRequest
  ): Promise<IntelligenceRecommendation>;

  /**
   * Query patterns only (no LLM)
   */
  queryPatterns(
    context: DecisionContext
  ): Promise<IndustryPattern[]>;

  /**
   * Get similar decisions
   */
  findSimilarDecisions(
    context: DecisionContext,
    limit?: number
  ): Promise<DecisionEvent[]>;
}
