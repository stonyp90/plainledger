/**
 * Intelligence Domain Models
 * Part of the Context Intelligence Platform
 */

export { DecisionEvent } from '../../domain/DecisionEvent';
export type {
  IndustryType,
  BusinessSize,
  FinancialMetric,
  ActionType,
  ConfidenceLevel,
  DecisionTrigger,
  DecisionAction,
  DecisionOutcome,
} from '../../domain/DecisionEvent';

export { IndustryPattern } from '../../domain/IndustryPattern';
export type {
  PatternCondition,
  ActionFrequency,
  SuccessMetrics,
  PerformerProfile,
} from '../../domain/IndustryPattern';

export { IntelligenceRecommendation } from '../../domain/IntelligenceRecommendation';
