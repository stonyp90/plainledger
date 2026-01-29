/**
 * Customer Journey Job
 * Daily scheduled job to process GTM email sequences
 *
 * Runs at 9 AM EST to:
 * 1. Check all users' journey stages
 * 2. Determine which emails should be sent
 * 3. Trigger appropriate Novu workflows
 * 4. Log email events for tracking
 */

import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JourneyTrackingService } from "@application/services/journey-tracking.service";
import { NovuService } from "@infrastructure/notifications/novu.service";
import { EmailEventEntity } from "@infrastructure/persistence/postgres/entities/email-event.entity";

@Injectable()
export class CustomerJourneyJob {
  private readonly logger = new Logger(CustomerJourneyJob.name);
  private isRunning = false;

  constructor(
    private journeyService: JourneyTrackingService,
    private novuService: NovuService,
    @InjectRepository(EmailEventEntity)
    private emailEventRepository: Repository<EmailEventEntity>,
  ) {}

  /**
   * Process journey emails daily at 9 AM EST (14:00 UTC)
   */
  @Cron("0 14 * * *", {
    name: "customer-journey-emails",
    timeZone: "America/New_York",
  })
  async processJourneyEmails(): Promise<void> {
    // Prevent concurrent runs
    if (this.isRunning) {
      this.logger.warn("Journey job already running, skipping");
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    let processed = 0;
    let sent = 0;
    let errors = 0;

    try {
      this.logger.log("Starting customer journey email processing...");

      // Get candidates for journey emails
      const candidates = await this.journeyService.getJourneyEmailCandidates();
      this.logger.log(`Found ${candidates.length} candidates for journey emails`);

      for (const candidate of candidates) {
        processed++;

        try {
          // Send the journey email via Novu
          const result = await this.novuService.sendJourneyEmail(
            candidate.workflowId,
            candidate.userId,
            {
              firstName: candidate.firstName,
              email: candidate.email,
              journeyData: {
                daysSinceSignup: candidate.daysSinceSignup,
                journeyStage: candidate.journeyStage,
              },
            },
          );

          // Mark email as sent in journey tracking
          await this.journeyService.markJourneyEmailSent(
            candidate.userId,
            candidate.workflowId,
          );

          // Log the email event
          await this.logEmailSent(candidate, result.transactionId);

          sent++;
          this.logger.debug(
            `Sent ${candidate.workflowId} to ${candidate.email} (${candidate.reason})`,
          );
        } catch (error) {
          errors++;
          this.logger.error(
            `Failed to send ${candidate.workflowId} to ${candidate.email}: ${error.message}`,
          );
        }

        // Small delay to avoid rate limiting
        await this.delay(100);
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Journey job completed: ${processed} processed, ${sent} sent, ${errors} errors (${duration}ms)`,
      );
    } catch (error) {
      this.logger.error(`Journey job failed: ${error.message}`, error.stack);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Process trial expiration reminders (runs twice daily)
   */
  @Cron("0 10,18 * * *", {
    name: "trial-reminders",
    timeZone: "America/New_York",
  })
  async processTrialReminders(): Promise<void> {
    this.logger.log("Processing trial expiration reminders...");

    // This is handled by the main journey email process
    // but could be extended for more frequent trial reminders
  }

  /**
   * Weekly engagement email (Sunday at 10 AM EST)
   */
  @Cron("0 15 * * 0", {
    name: "weekly-digest",
    timeZone: "America/New_York",
  })
  async processWeeklyDigest(): Promise<void> {
    this.logger.log("Weekly digest emails are handled by Novu scheduled workflows");
    // Weekly digests are best handled by Novu's built-in scheduling
    // to allow users to choose their preferred day/time
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async logEmailSent(
    candidate: {
      userId: string;
      email: string;
      workflowId: string;
    },
    transactionId: string,
  ): Promise<void> {
    try {
      await this.emailEventRepository.save({
        transactionId,
        userId: candidate.userId,
        recipient: candidate.email,
        workflowId: candidate.workflowId,
        emailCategory: "journey",
        eventType: "sent",
      });
    } catch (error) {
      this.logger.error(`Failed to log email event: ${error.message}`);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
