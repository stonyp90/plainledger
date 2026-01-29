/**
 * AWS SES Email Service
 * Direct SES integration for critical auth emails (verification, password reset)
 *
 * Features:
 * - DKIM/SPF authentication (configured via setup-ses.sh)
 * - List-Unsubscribe headers for Gmail/Yahoo compliance (RFC 8058)
 * - Email event logging for deliverability tracking
 * - Configuration set for bounce/complaint notifications
 *
 * Region: us-east-1
 */

import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  SESClient,
  SendRawEmailCommand,
  SendEmailCommand,
} from "@aws-sdk/client-ses";
import { EmailTemplatesService } from "@infrastructure/templates/email-templates.service";
import * as crypto from "crypto";

// ============================================================================
// Types
// ============================================================================

export type EmailCategory = "transactional" | "marketing" | "journey" | "security";

export interface SESEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** User ID for tracking */
  userId?: string;
  /** Email category for filtering and unsubscribe handling */
  category?: EmailCategory;
  /** Workflow ID (for journey/marketing emails) */
  workflowId?: string;
  /** Include List-Unsubscribe headers (required for marketing/journey emails) */
  includeUnsubscribe?: boolean;
}

export interface SESEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class SESEmailService implements OnModuleInit {
  private readonly logger = new Logger(SESEmailService.name);
  private sesClient: SESClient;
  private fromAddress: string;
  private fromName: string;
  private replyToAddress: string;
  private baseUrl: string;
  private configurationSet: string;
  private isConfigured = false;

  constructor(
    private configService: ConfigService,
    private emailTemplates: EmailTemplatesService,
  ) {}

  async onModuleInit() {
    this.fromAddress = this.configService.get<string>(
      "SES_FROM_ADDRESS",
      "noreply@plainledger.ca",
    );
    this.fromName = this.configService.get<string>(
      "SES_FROM_NAME",
      "PlainLedger",
    );
    this.replyToAddress = this.configService.get<string>(
      "SES_REPLY_TO_ADDRESS",
      "support@plainledger.ca",
    );
    this.baseUrl = this.configService.get<string>(
      "APP_URL",
      "https://app.plainledger.ca",
    );
    // Configuration set for tracking (created via Terraform)
    this.configurationSet = this.configService.get<string>(
      "SES_CONFIGURATION_SET",
      "plainledger-tracking",
    );

    // Initialize SES client with us-east-1 region
    // AWS credentials are picked up from environment variables or IAM role
    try {
      this.sesClient = new SESClient({
        region: this.configService.get<string>("SES_REGION", "us-east-1"),
      });

      this.isConfigured = true;
      this.logger.log("AWS SES Email Service initialized (region: us-east-1)");
    } catch (error) {
      this.logger.error(`Failed to initialize SES client: ${error.message}`);
      this.isConfigured = false;
    }
  }

  /**
   * Check if SES service is available
   */
  isAvailable(): boolean {
    return this.isConfigured;
  }

  // ---------------------------------------------------------------------------
  // Core Email Sending
  // ---------------------------------------------------------------------------

  /**
   * Generate a signed unsubscribe token
   */
  generateUnsubscribeToken(
    userId: string,
    email: string,
    category?: EmailCategory,
  ): string {
    const payload = {
      u: userId,
      e: email,
      c: category || "marketing",
      t: Date.now(),
    };
    const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const secret = this.configService.get<string>("UNSUBSCRIBE_SECRET", "plainledger-secret");
    const signature = crypto
      .createHmac("sha256", secret)
      .update(data)
      .digest("base64url")
      .substring(0, 16);
    return `${data}.${signature}`;
  }

  /**
   * Build raw email with custom headers including List-Unsubscribe
   */
  private buildRawEmail(options: SESEmailOptions): string {
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const unsubscribeToken = options.userId
      ? this.generateUnsubscribeToken(options.userId, options.to, options.category)
      : null;
    const unsubscribeUrl = unsubscribeToken
      ? `${this.baseUrl}/api/unsubscribe?token=${unsubscribeToken}`
      : `${this.baseUrl}/app/settings/notifications`;

    // Build headers
    const headers: string[] = [
      `From: ${this.fromName} <${this.fromAddress}>`,
      `To: ${options.to}`,
      `Subject: ${options.subject}`,
      `Reply-To: ${this.replyToAddress}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${Date.now()}.${Math.random().toString(36)}@plainledger.ca>`,
    ];

    // Add List-Unsubscribe headers for marketing/journey emails (RFC 8058)
    // Required by Gmail/Yahoo for bulk senders
    if (options.includeUnsubscribe || options.category === "marketing" || options.category === "journey") {
      headers.push(`List-Unsubscribe: <${unsubscribeUrl}>`);
      headers.push(`List-Unsubscribe-Post: List-Unsubscribe=One-Click`);
    }

    // Add custom headers for tracking
    if (options.workflowId) {
      headers.push(`X-PL-Workflow: ${options.workflowId}`);
    }
    if (options.userId) {
      headers.push(`X-PL-User: ${options.userId}`);
    }
    if (options.category) {
      headers.push(`X-PL-Category: ${options.category}`);
    }

    // Build body parts
    const textPart = options.text || this.htmlToPlainText(options.html);
    const parts: string[] = [
      `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: quoted-printable`,
      ``,
      textPart,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: quoted-printable`,
      ``,
      options.html,
      ``,
      `--${boundary}--`,
    ];

    return [...headers, ``, ...parts].join("\r\n");
  }

  /**
   * Convert HTML to plain text (basic implementation)
   */
  private htmlToPlainText(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Send an email via AWS SES with full tracking and compliance headers
   */
  async sendEmail(options: SESEmailOptions): Promise<SESEmailResult> {
    if (!this.isConfigured) {
      this.logger.warn("SES not configured, email not sent");
      return { success: false, error: "SES not configured" };
    }

    try {
      // Use SendRawEmailCommand for marketing/journey emails (need custom headers)
      // Use SendEmailCommand for simpler transactional emails
      const needsRawEmail =
        options.includeUnsubscribe ||
        options.category === "marketing" ||
        options.category === "journey";

      let messageId: string | undefined;

      if (needsRawEmail) {
        const rawEmail = this.buildRawEmail(options);
        const command = new SendRawEmailCommand({
          RawMessage: {
            Data: Buffer.from(rawEmail),
          },
          ConfigurationSetName: this.configurationSet,
        });
        const response = await this.sesClient.send(command);
        messageId = response.MessageId;
      } else {
        const command = new SendEmailCommand({
          Source: `${this.fromName} <${this.fromAddress}>`,
          Destination: {
            ToAddresses: [options.to],
          },
          Message: {
            Subject: {
              Charset: "UTF-8",
              Data: options.subject,
            },
            Body: {
              Html: {
                Charset: "UTF-8",
                Data: options.html,
              },
              Text: {
                Charset: "UTF-8",
                Data: options.text || this.htmlToPlainText(options.html),
              },
            },
          },
          ReplyToAddresses: [this.replyToAddress],
          ConfigurationSetName: this.configurationSet,
        });
        const response = await this.sesClient.send(command);
        messageId = response.MessageId;
      }

      this.logger.log(
        `Email sent to ${options.to}, MessageId: ${messageId}, Category: ${options.category || "transactional"}`,
      );

      return { success: true, messageId };
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${options.to}: ${error.message}`,
      );
      return { success: false, error: error.message };
    }
  }

  /**
   * Legacy sendEmail signature for backward compatibility
   * @deprecated Use sendEmail with SESEmailOptions instead
   */
  async sendEmailSimple(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<boolean> {
    const result = await this.sendEmail(options);
    return result.success;
  }

  // ---------------------------------------------------------------------------
  // Auth Email Methods (Transactional - no unsubscribe needed)
  // ---------------------------------------------------------------------------

  /**
   * Send email verification email
   */
  async sendVerificationEmail(
    to: string,
    firstName: string,
    verifyUrl: string,
    userId?: string,
  ): Promise<boolean> {
    const html = this.emailTemplates.emailVerification({
      firstName: firstName || "there",
      verifyUrl,
      expiresIn: "24 hours",
    });

    const result = await this.sendEmail({
      to,
      subject: "Verify your email - PlainLedger",
      html,
      text: `Hello ${firstName || "there"},\n\nPlease verify your email by clicking this link: ${verifyUrl}\n\nThis link expires in 24 hours.\n\nThe PlainLedger Team`,
      userId,
      category: "transactional",
    });
    return result.success;
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    to: string,
    firstName: string,
    resetUrl: string,
    userId?: string,
  ): Promise<boolean> {
    const html = this.emailTemplates.passwordReset({
      firstName: firstName || "there",
      resetUrl,
      expiresIn: "15 minutes",
    });

    const result = await this.sendEmail({
      to,
      subject: "Reset your password - PlainLedger",
      html,
      text: `Hello ${firstName || "there"},\n\nYou requested to reset your password. Click this link to create a new password: ${resetUrl}\n\nThis link expires in 15 minutes.\n\nIf you didn't request this, you can safely ignore this email.\n\nThe PlainLedger Team`,
      userId,
      category: "security",
    });
    return result.success;
  }

  /**
   * Send password changed security alert
   */
  async sendPasswordChangedEmail(
    to: string,
    firstName: string,
    timestamp: Date,
    ipAddress?: string,
    userId?: string,
  ): Promise<boolean> {
    const html = this.emailTemplates.passwordChanged({
      firstName: firstName || "there",
      timestamp: timestamp.toISOString(),
      ipAddress,
    });

    const result = await this.sendEmail({
      to,
      subject: "Password changed - PlainLedger",
      html,
      text: `Hello ${firstName || "there"},\n\nYour PlainLedger password was successfully changed on ${timestamp.toLocaleString()}.\n\nIf you didn't make this change, please reset your password immediately and contact support.\n\nThe PlainLedger Team`,
      userId,
      category: "security",
    });
    return result.success;
  }

  /**
   * Send welcome email after email verification
   * Note: This is a marketing-ish email, so includes unsubscribe
   */
  async sendWelcomeEmail(
    to: string,
    firstName: string,
    organizationName?: string,
    userId?: string,
  ): Promise<boolean> {
    const html = this.emailTemplates.welcome({
      firstName: firstName || "there",
      organizationName,
    });

    const result = await this.sendEmail({
      to,
      subject: "Welcome to PlainLedger!",
      html,
      text: `Hello ${firstName || "there"},\n\nWelcome to PlainLedger! Your email has been verified and your account is ready to use.\n\nGet started by connecting your accounting software: https://plainledger.ca/app/connections\n\nThe PlainLedger Team`,
      userId,
      category: "journey",
      workflowId: "welcome",
      includeUnsubscribe: true,
    });
    return result.success;
  }

  // ---------------------------------------------------------------------------
  // Journey Email Methods (Marketing - requires unsubscribe)
  // ---------------------------------------------------------------------------

  /**
   * Send a journey/marketing email with proper unsubscribe headers
   */
  async sendJourneyEmail(options: {
    to: string;
    userId: string;
    subject: string;
    html: string;
    text?: string;
    workflowId: string;
  }): Promise<SESEmailResult> {
    return this.sendEmail({
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      userId: options.userId,
      category: "journey",
      workflowId: options.workflowId,
      includeUnsubscribe: true,
    });
  }
}

// ============================================================================
// Module
// ============================================================================

import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [ConfigModule],
  providers: [SESEmailService, EmailTemplatesService],
  exports: [SESEmailService],
})
export class SESEmailModule {}
