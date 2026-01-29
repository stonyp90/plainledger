/**
 * CaptureDecisionUseCase
 *
 * Use case for capturing business decisions in context.
 * Part of the Context Intelligence Platform.
 */

import { Injectable, Logger, Inject } from "@nestjs/common";
import { DecisionEvent } from "@domain/DecisionEvent";
import {
  IDecisionRepository,
  DECISION_REPOSITORY_TOKEN,
} from "../ports/outbound/IDecisionRepository";
import { Money } from "@domain/value-objects/Money";

export interface CaptureDecisionInput {
  organizationId: string;
  industry: string;
  businessSize: "micro" | "small" | "medium" | "large";
  trigger: {
    metric: string;
    currentValue: number;
    benchmarkValue: number;
    gapPercentage: number;
    chartContext?: string;
  };
  decision: {
    actionType: string;
    description: string;
    reasoning?: string;
    expectedImpact: number;
    confidence: "low" | "medium" | "high";
  };
  source?: "user" | "ai_suggested" | "imported";
}

@Injectable()
export class CaptureDecisionUseCase {
  private readonly logger = new Logger(CaptureDecisionUseCase.name);

  constructor(
    @Inject(DECISION_REPOSITORY_TOKEN)
    private readonly decisionRepository: IDecisionRepository,
  ) {}

  /**
   * Capture a new decision event
   */
  async execute(input: CaptureDecisionInput): Promise<DecisionEvent> {
    this.logger.log(
      `Capturing decision for organization ${input.organizationId}`,
    );

    // Validate industry
    this.validateIndustry(input.industry);

    // Create decision event
    const decisionEvent = DecisionEvent.create({
      organizationId: input.organizationId,
      industry: input.industry as any,
      businessSize: input.businessSize,
      trigger: {
        metric: input.trigger.metric as any,
        currentValue: Money.create(input.trigger.currentValue, "CAD"),
        benchmarkValue: Money.create(input.trigger.benchmarkValue, "CAD"),
        gapPercentage: input.trigger.gapPercentage,
        chartContext: input.trigger.chartContext,
      },
      decision: {
        actionType: input.decision.actionType as any,
        description: input.decision.description,
        reasoning: input.decision.reasoning,
        expectedImpact: Money.create(input.decision.expectedImpact, "CAD"),
        confidence: input.decision.confidence,
      },
      source: input.source || "user",
    });

    // Save to repository
    await this.decisionRepository.save(decisionEvent);

    this.logger.log(`Decision ${decisionEvent.id} captured successfully`);

    // Note: Pattern aggregation is handled by scheduled Glue ETL jobs
    // which run periodically to aggregate decisions into industry patterns.
    // Real-time event emission is not required as patterns are updated
    // via scheduled batch processing for better performance and cost efficiency.

    return decisionEvent;
  }

  /**
   * Validate industry type
   */
  private validateIndustry(industry: string): void {
    const validIndustries = [
      "restaurant",
      "retail",
      "construction",
      "professional_services",
      "real_estate",
      "saas",
      "healthcare",
      "manufacturing",
      "other",
    ];

    if (!validIndustries.includes(industry)) {
      throw new Error(
        `Invalid industry: ${industry}. Must be one of: ${validIndustries.join(", ")}`,
      );
    }
  }
}
