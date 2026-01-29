/**
 * Domain layer exports
 * Central export point for all domain entities and value objects
 */

// Export DecisionEvent and its types (primary source for Percentage and ConfidenceLevel)
export * from "./DecisionEvent";

// Export IndustryPattern without conflicting types
export {
  IndustryPattern,
  PatternCondition,
  ActionFrequency,
  SuccessMetrics,
  PerformerProfile,
  IndustryPatternProps,
} from "./IndustryPattern";

// Export IntelligenceRecommendation without conflicting types
export {
  IntelligenceRecommendation,
  IntelligenceRecommendationProps,
} from "./IntelligenceRecommendation";

// Export Money value object
export * from "./value-objects/Money";
