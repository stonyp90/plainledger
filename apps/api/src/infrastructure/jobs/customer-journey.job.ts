/**
 * Customer Journey Job
 * Daily scheduled job to process GTM email sequences
 *
 * Runs at 9 AM EST to:
 * 1. Check all users' journey stages
 * 2. Determine which emails should be sent
 * 3. Send branded emails via AWS SES
 * 4. Log email events for tracking
 */

import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JourneyTrackingService } from "@application/services/journey-tracking.service";
import { SESAdapter } from "@infrastructure/adapters/email/ses/ses.adapter";
import { EmailEventEntity } from "@infrastructure/persistence/postgres/entities/email-event.entity";

@Injectable()
export class CustomerJourneyJob {
  private readonly logger = new Logger(CustomerJourneyJob.name);
  private isRunning = false;

  constructor(
    private journeyService: JourneyTrackingService,
    private sesEmailService: SESAdapter,
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
      this.logger.log(
        `Found ${candidates.length} candidates for journey emails`,
      );

      for (const candidate of candidates) {
        processed++;

        try {
          // Send the journey email via SES
          const result = await this.sesEmailService.sendJourneyEmailByWorkflow(
            candidate.workflowId,
            candidate.userId,
            candidate.email,
            candidate.firstName,
            {
              daysSinceSignup: candidate.daysSinceSignup,
              journeyStage: candidate.journeyStage,
              providerName: undefined, // Not available in journey data
              trialEndsAt: candidate.journeyData?.trialEndsAt,
              lastActiveAt: candidate.journeyData?.lastActiveAt,
            },
          );

          if (result.success) {
            // Mark email as sent in journey tracking
            await this.journeyService.markJourneyEmailSent(
              candidate.userId,
              candidate.workflowId,
            );

            // Log the email event
            await this.logEmailSent(candidate, result.messageId || "unknown");

            sent++;
            this.logger.debug(
              `Sent ${candidate.workflowId} to ${candidate.email} (${candidate.reason})`,
            );
          } else {
            errors++;
            this.logger.error(
              `Failed to send ${candidate.workflowId} to ${candidate.email}: ${result.error}`,
            );
          }
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
   * TODO: Implement weekly digest emails via SES if needed
   */
  @Cron("0 15 * * 0", {
    name: "weekly-digest",
    timeZone: "America/New_York",
  })
  async processWeeklyDigest(): Promise<void> {
    this.logger.log(
      "Weekly digest emails - not yet implemented. Can be added to journey tracking service.",
    );
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
    messageId: string,
  ): Promise<void> {
    try {
      await this.emailEventRepository.save({
        transactionId: messageId, // Using messageId as transactionId for SES
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
