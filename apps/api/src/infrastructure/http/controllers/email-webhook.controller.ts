/**
 * Email Webhook Controller
 * Handles SNS notifications from AWS SES for email events
 *
 * Events handled:
 * - Bounce (hard/soft)
 * - Complaint (spam reports)
 * - Delivery
 * - Open (if tracking enabled)
 * - Click (if tracking enabled)
 */

import {
  Controller,
  Post,
  Body,
  Logger,
  HttpCode,
  Headers,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  EmailEventEntity,
  EmailEventType,
} from "@infrastructure/persistence/postgres/entities/email-event.entity";
import { UserProfileEntity } from "@infrastructure/persistence/postgres/entities/user-profile.entity";

// ============================================================================
// Types for SES/SNS Events
// ============================================================================

interface SNSMessage {
  Type: "Notification" | "SubscriptionConfirmation" | "UnsubscribeConfirmation";
  MessageId: string;
  TopicArn: string;
  Subject?: string;
  Message: string; // JSON string containing SES event
  Timestamp: string;
  SignatureVersion: string;
  Signature: string;
  SigningCertURL: string;
  SubscribeURL?: string; // For SubscriptionConfirmation
  UnsubscribeURL?: string;
}

interface SESEventRecord {
  eventType:
    | "Bounce"
    | "Complaint"
    | "Delivery"
    | "Send"
    | "Reject"
    | "Open"
    | "Click";
  mail: {
    timestamp: string;
    source: string;
    messageId: string;
    destination: string[];
    commonHeaders: {
      from: string[];
      to: string[];
      subject: string;
    };
    headers?: Array<{ name: string; value: string }>;
  };
  bounce?: {
    bounceType: "Permanent" | "Transient" | "Undetermined";
    bounceSubType: string;
    bouncedRecipients: Array<{
      emailAddress: string;
      action?: string;
      status?: string;
      diagnosticCode?: string;
    }>;
    timestamp: string;
    feedbackId: string;
  };
  complaint?: {
    complainedRecipients: Array<{ emailAddress: string }>;
    complaintFeedbackType?: string;
    timestamp: string;
    feedbackId: string;
  };
  delivery?: {
    timestamp: string;
    processingTimeMillis: number;
    recipients: string[];
    smtpResponse: string;
  };
  open?: {
    timestamp: string;
    userAgent: string;
    ipAddress: string;
  };
  click?: {
    timestamp: string;
    ipAddress: string;
    userAgent: string;
    link: string;
  };
}

// ============================================================================
// Controller
// ============================================================================

@Controller("webhooks")
export class EmailWebhookController {
  private readonly logger = new Logger(EmailWebhookController.name);

  constructor(
    @InjectRepository(EmailEventEntity)
    private emailEventRepository: Repository<EmailEventEntity>,
    @InjectRepository(UserProfileEntity)
    private userProfileRepository: Repository<UserProfileEntity>,
  ) {}

  /**
   * Handle SNS notifications from SES
   * Endpoint: POST /api/webhooks/ses-events
   */
  @Post("ses-events")
  @HttpCode(200)
  async handleSESEvent(
    @Body() body: SNSMessage | SESEventRecord,
    @Headers("x-amz-sns-message-type") messageType?: string,
  ): Promise<{ status: string }> {
    try {
      // Handle SNS subscription confirmation
      if (
        messageType === "SubscriptionConfirmation" ||
        (body as SNSMessage).Type === "SubscriptionConfirmation"
      ) {
        const snsMessage = body as SNSMessage;
        this.logger.log(
          `SNS subscription confirmation received. Visit: ${snsMessage.SubscribeURL}`,
        );
        // In production, automatically confirm by calling the SubscribeURL
        // For now, log it for manual confirmation
        return { status: "subscription_confirmation_received" };
      }

      // Parse SNS notification
      let event: SESEventRecord;
      if ((body as SNSMessage).Type === "Notification") {
        const snsMessage = body as SNSMessage;
        event = JSON.parse(snsMessage.Message);
      } else {
        // Direct SES event (for testing)
        event = body as SESEventRecord;
      }

      // Extract custom headers for user/workflow tracking
      const customHeaders = event.mail.headers?.reduce(
        (acc, h) => {
          if (h.name.startsWith("X-PL-")) {
            acc[h.name.replace("X-PL-", "").toLowerCase()] = h.value;
          }
          return acc;
        },
        {} as Record<string, string>,
      );

      const userId = customHeaders?.user;
      const workflowId = customHeaders?.workflow;
      const category = customHeaders?.category as EmailEventEntity["emailCategory"];

      // Process based on event type
      switch (event.eventType) {
        case "Bounce":
          await this.handleBounce(event, userId, workflowId, category);
          break;
        case "Complaint":
          await this.handleComplaint(event, userId, workflowId, category);
          break;
        case "Delivery":
          await this.handleDelivery(event, userId, workflowId, category);
          break;
        case "Open":
          await this.handleOpen(event, userId, workflowId, category);
          break;
        case "Click":
          await this.handleClick(event, userId, workflowId, category);
          break;
        case "Send":
          await this.handleSend(event, userId, workflowId, category);
          break;
        default:
          this.logger.debug(`Unhandled event type: ${event.eventType}`);
      }

      return { status: "processed" };
    } catch (error) {
      this.logger.error(`Failed to process SES event: ${error.message}`, error.stack);
      // Return 200 anyway to prevent SNS retries
      return { status: "error" };
    }
  }

  // ---------------------------------------------------------------------------
  // Event Handlers
  // ---------------------------------------------------------------------------

  private async handleBounce(
    event: SESEventRecord,
    userId?: string,
    workflowId?: string,
    category?: EmailEventEntity["emailCategory"],
  ): Promise<void> {
    const bounce = event.bounce!;
    const isHardBounce = bounce.bounceType === "Permanent";

    for (const recipient of bounce.bouncedRecipients) {
      // Log the event
      await this.logEmailEvent({
        messageId: event.mail.messageId,
        userId,
        recipient: recipient.emailAddress,
        workflowId,
        emailCategory: category,
        eventType: "bounced",
        subject: event.mail.commonHeaders.subject,
        metadata: {
          bounceType: bounce.bounceType,
          bounceSubType: bounce.bounceSubType,
          diagnosticCode: recipient.diagnosticCode,
        },
      });

      // For hard bounces, mark email as invalid
      if (isHardBounce) {
        await this.markEmailInvalid(recipient.emailAddress);
        this.logger.warn(
          `Hard bounce for ${recipient.emailAddress} - marked as invalid`,
        );
      } else {
        // For soft bounces, increment counter
        await this.incrementBounceCount(recipient.emailAddress);
        this.logger.debug(
          `Soft bounce for ${recipient.emailAddress} - incremented counter`,
        );
      }
    }
  }

  private async handleComplaint(
    event: SESEventRecord,
    userId?: string,
    workflowId?: string,
    category?: EmailEventEntity["emailCategory"],
  ): Promise<void> {
    const complaint = event.complaint!;

    for (const recipient of complaint.complainedRecipients) {
      // Log the event
      await this.logEmailEvent({
        messageId: event.mail.messageId,
        userId,
        recipient: recipient.emailAddress,
        workflowId,
        emailCategory: category,
        eventType: "complained",
        subject: event.mail.commonHeaders.subject,
        metadata: {
          complaintFeedbackType: complaint.complaintFeedbackType,
        },
      });

      // Unsubscribe the user from marketing emails
      await this.unsubscribeFromMarketing(recipient.emailAddress);
      this.logger.warn(
        `Complaint received for ${recipient.emailAddress} - unsubscribed from marketing`,
      );
    }
  }

  private async handleDelivery(
    event: SESEventRecord,
    userId?: string,
    workflowId?: string,
    category?: EmailEventEntity["emailCategory"],
  ): Promise<void> {
    const delivery = event.delivery!;

    for (const recipient of delivery.recipients) {
      await this.logEmailEvent({
        messageId: event.mail.messageId,
        userId,
        recipient,
        workflowId,
        emailCategory: category,
        eventType: "delivered",
        subject: event.mail.commonHeaders.subject,
        metadata: {
          processingTimeMillis: delivery.processingTimeMillis,
          smtpResponse: delivery.smtpResponse,
        },
      });
    }
  }

  private async handleOpen(
    event: SESEventRecord,
    userId?: string,
    workflowId?: string,
    category?: EmailEventEntity["emailCategory"],
  ): Promise<void> {
    const open = event.open!;

    await this.logEmailEvent({
      messageId: event.mail.messageId,
      userId,
      recipient: event.mail.destination[0],
      workflowId,
      emailCategory: category,
      eventType: "opened",
      subject: event.mail.commonHeaders.subject,
      ipAddress: open.ipAddress,
      userAgent: open.userAgent,
    });

    // Update user's last email opened timestamp
    if (userId) {
      await this.updateLastEmailOpened(userId);
    }
  }

  private async handleClick(
    event: SESEventRecord,
    userId?: string,
    workflowId?: string,
    category?: EmailEventEntity["emailCategory"],
  ): Promise<void> {
    const click = event.click!;

    await this.logEmailEvent({
      messageId: event.mail.messageId,
      userId,
      recipient: event.mail.destination[0],
      workflowId,
      emailCategory: category,
      eventType: "clicked",
      subject: event.mail.commonHeaders.subject,
      linkClicked: click.link,
      ipAddress: click.ipAddress,
      userAgent: click.userAgent,
    });
  }

  private async handleSend(
    event: SESEventRecord,
    userId?: string,
    workflowId?: string,
    category?: EmailEventEntity["emailCategory"],
  ): Promise<void> {
    for (const recipient of event.mail.destination) {
      await this.logEmailEvent({
        messageId: event.mail.messageId,
        userId,
        recipient,
        workflowId,
        emailCategory: category,
        eventType: "sent",
        subject: event.mail.commonHeaders.subject,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Database Operations
  // ---------------------------------------------------------------------------

  private async logEmailEvent(
    data: Partial<EmailEventEntity> & { eventType: EmailEventType },
  ): Promise<void> {
    try {
      const event = this.emailEventRepository.create(data);
      await this.emailEventRepository.save(event);
    } catch (error) {
      this.logger.error(`Failed to log email event: ${error.message}`);
    }
  }

  private async markEmailInvalid(email: string): Promise<void> {
    try {
      await this.userProfileRepository.update(
        { email },
        { emailValid: false, emailBounceCount: () => "email_bounce_count + 1" },
      );
    } catch (error) {
      this.logger.error(`Failed to mark email invalid: ${error.message}`);
    }
  }

  private async incrementBounceCount(email: string): Promise<void> {
    try {
      await this.userProfileRepository.update(
        { email },
        { emailBounceCount: () => "email_bounce_count + 1" },
      );
    } catch (error) {
      this.logger.error(`Failed to increment bounce count: ${error.message}`);
    }
  }

  private async unsubscribeFromMarketing(email: string): Promise<void> {
    try {
      const user = await this.userProfileRepository.findOne({ where: { email } });
      if (user) {
        const prefs = user.emailPreferences || {
          marketingOptIn: true,
          productUpdates: true,
          weeklyDigest: true,
          securityAlerts: true,
        };
        prefs.marketingOptIn = false;
        prefs.unsubscribedAt = new Date().toISOString();
        prefs.unsubscribeReason = "spam_complaint";
        await this.userProfileRepository.update({ email }, { emailPreferences: prefs });
      }
    } catch (error) {
      this.logger.error(`Failed to unsubscribe from marketing: ${error.message}`);
    }
  }

  private async updateLastEmailOpened(userId: string): Promise<void> {
    try {
      await this.userProfileRepository.update(
        { id: userId },
        { lastEmailOpenedAt: new Date() },
      );
    } catch (error) {
      this.logger.error(`Failed to update last email opened: ${error.message}`);
    }
  }
}
