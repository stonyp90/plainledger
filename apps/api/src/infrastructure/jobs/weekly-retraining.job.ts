/**
 * WeeklyRetrainingJob
 *
 * Scheduled job to trigger model retraining when sufficient new data is available.
 * Part of the Context Intelligence Platform.
 */

import { Injectable, Logger, Inject } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import {
  IDecisionRepository,
  DECISION_REPOSITORY_TOKEN,
} from "@application/ports/outbound/IDecisionRepository";
import { SageMakerIntelligenceAdapter } from "../intelligence/adapters/sagemaker.adapter";

@Injectable()
export class WeeklyRetrainingJob {
  private readonly logger = new Logger(WeeklyRetrainingJob.name);
  private readonly MIN_NEW_DECISIONS_THRESHOLD = 100; // Minimum new decisions to trigger retraining

  constructor(
    @Inject(DECISION_REPOSITORY_TOKEN)
    private readonly decisionRepository: IDecisionRepository,
    private readonly sagemakerAdapter: SageMakerIntelligenceAdapter,
  ) {}

  /**
   * Run weekly retraining check
   * Runs every Sunday at 2 AM
   */
  @Cron(CronExpression.EVERY_WEEK)
  async execute() {
    this.logger.log("Starting weekly retraining check");

    try {
      // Get all industries
      const industries = [
        "restaurant",
        "retail",
        "construction",
        "professional_services",
        "real_estate",
        "saas",
        "healthcare",
        "manufacturing",
      ];

      for (const industry of industries) {
        await this.checkAndTriggerRetraining(industry);
      }

      this.logger.log("Weekly retraining check completed");
    } catch (error) {
      this.logger.error(
        `Weekly retraining check failed: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Check if retraining is needed for an industry
   */
  private async checkAndTriggerRetraining(industry: string): Promise<void> {
    try {
      // Get decisions with outcomes from the last week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      // Get all decisions with outcomes for this industry
      const allDecisions =
        await this.decisionRepository.findWithOutcomes(industry);

      // Filter for recent decisions (last week)
      const recentDecisions = allDecisions.filter((d) => {
        if (!d.outcome) return false;
        return d.outcome.measuredAt >= oneWeekAgo;
      });

      if (recentDecisions.length < this.MIN_NEW_DECISIONS_THRESHOLD) {
        this.logger.debug(
          `Insufficient new decisions (${recentDecisions.length}) for ${industry} industry. Threshold: ${this.MIN_NEW_DECISIONS_THRESHOLD}`,
        );
        return;
      }

      this.logger.log(
        `Triggering retraining for ${industry} industry with ${recentDecisions.length} new decisions`,
      );

      // Trigger retraining
      await this.sagemakerAdapter.triggerRetraining(recentDecisions);

      this.logger.log(
        `Retraining triggered successfully for ${industry} industry`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to trigger retraining for ${industry}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Manual trigger for retraining (for testing/admin)
   */
  async triggerRetrainingForIndustry(industry: string): Promise<void> {
    await this.checkAndTriggerRetraining(industry);
  }
}
