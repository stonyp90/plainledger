/**
 * OutcomeTrackingService
 *
 * Service for tracking decision outcomes and updating patterns.
 * Part of the Context Intelligence Platform.
 */

import { Injectable, Logger, Inject, NotFoundException } from "@nestjs/common";
import {
  IDecisionRepository,
  DECISION_REPOSITORY_TOKEN,
} from "../ports/outbound/IDecisionRepository";
import {
  IPatternService,
  PATTERN_SERVICE_TOKEN,
} from "../ports/outbound/IPatternService";
import { DecisionEvent } from "@domain/DecisionEvent";
import { Money } from "@domain/value-objects/Money";

export interface RecordOutcomeInput {
  decisionId: string;
  /** Required by tenant-scoped entry points. */
  organizationId?: string;
  actualImpact: number;
  success: boolean;
  measuredAt?: Date;
  learnings?: string;
}

@Injectable()
export class OutcomeTrackingService {
  private readonly logger = new Logger(OutcomeTrackingService.name);

  constructor(
    @Inject(DECISION_REPOSITORY_TOKEN)
    private readonly decisionRepository: IDecisionRepository,
    @Inject(PATTERN_SERVICE_TOKEN)
    private readonly patternService: IPatternService,
  ) {}

  /**
   * Record outcome for a decision
   */
  async recordOutcome(input: RecordOutcomeInput): Promise<DecisionEvent> {
    this.logger.log(`Recording outcome for decision ${input.decisionId}`);

    // Find the decision
    const decision = await this.decisionRepository.findById(input.decisionId);
    if (!decision || (input.organizationId !== undefined && decision.organizationId !== input.organizationId)) {
      throw new NotFoundException('Decision not found');
    }

    // Calculate variance
    const expectedImpact = decision.decision.expectedImpact.amount;
    const actualImpact = input.actualImpact;
    const variance =
      expectedImpact > 0
        ? ((actualImpact - expectedImpact) / expectedImpact) * 100
        : 0;

    // Add outcome to decision
    decision.addOutcome({
      actualImpact: Money.create(actualImpact),
      measuredAt: input.measuredAt || new Date(),
      success: input.success,
      variance,
      learnings: input.learnings,
    });

    // Save updated decision
    await this.decisionRepository.save(decision);

    this.logger.log(
      `Outcome recorded for decision ${input.decisionId}. Variance: ${variance.toFixed(1)}%`,
    );

    // Trigger pattern recalculation (async)
    this.triggerPatternRecalculation(decision).catch((err) => {
      this.logger.error(
        `Failed to recalculate patterns: ${err.message}`,
        err.stack,
      );
    });

    return decision;
  }

  /**
   * Trigger pattern recalculation for the industry
   */
  private async triggerPatternRecalculation(
    decision: DecisionEvent,
  ): Promise<void> {
    // Get all decisions for this industry with outcomes
    const decisions = await this.decisionRepository.findWithOutcomes(
      decision.industry,
    );

    if (decisions.length < 10) {
      this.logger.debug(
        `Insufficient decisions (${decisions.length}) for pattern recalculation`,
      );
      return;
    }

    // Aggregate patterns
    const pattern = await this.patternService.aggregatePattern(
      decision.industry,
      decisions,
    );

    // Update pattern
    await this.patternService.updatePattern(pattern);

    this.logger.log(`Patterns recalculated for ${decision.industry} industry`);
  }

  /**
   * Get outcome statistics for an organization
   */
  async getOutcomeStatistics(organizationId: string): Promise<{
    totalDecisions: number;
    decisionsWithOutcomes: number;
    successRate: number;
    avgVariance: number;
    avgROI: number;
  }> {
    const decisions =
      await this.decisionRepository.findByOrganization(organizationId);
    const decisionsWithOutcomes = decisions.filter(
      (d) => d.outcome !== undefined,
    );

    const successRate =
      decisionsWithOutcomes.length > 0
        ? (decisionsWithOutcomes.filter((d) => d.isSuccessful() === true)
            .length /
            decisionsWithOutcomes.length) *
          100
        : 0;

    const avgVariance =
      decisionsWithOutcomes.length > 0
        ? decisionsWithOutcomes.reduce(
            (sum, d) => sum + (d.outcome?.variance || 0),
            0,
          ) / decisionsWithOutcomes.length
        : 0;

    const avgROI =
      decisionsWithOutcomes.length > 0
        ? decisionsWithOutcomes.reduce((sum, d) => {
            const roi = d.getROI();
            return sum + (roi || 0);
          }, 0) / decisionsWithOutcomes.length
        : 0;

    return {
      totalDecisions: decisions.length,
      decisionsWithOutcomes: decisionsWithOutcomes.length,
      successRate,
      avgVariance,
      avgROI,
    };
  }
}
