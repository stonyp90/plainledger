/**
 * AWS SES Email Service
 * Direct SES integration for critical auth emails (verification, password reset)
 *
 * Uses AWS SES SDK for reliable transactional email delivery.
 * Region: us-east-1
 */

import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { EmailTemplatesService } from "@infrastructure/templates/email-templates.service";

// ============================================================================
// Types
// ============================================================================

export interface SESEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class SESEmailService implements OnModuleInit {
  private readonly logger = new Logger(SESEmailService.name);
  private sesClient: SESClient;
  private fromAddress: string;
  private replyToAddress: string;
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
    this.replyToAddress = this.configService.get<string>(
      "SES_REPLY_TO_ADDRESS",
      "support@plainledger.ca",
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
   * Send an email via AWS SES
   */
  async sendEmail(options: SESEmailOptions): Promise<boolean> {
    if (!this.isConfigured) {
      this.logger.warn("SES not configured, email not sent");
      return false;
    }

    try {
      const command = new SendEmailCommand({
        Source: this.fromAddress,
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
            ...(options.text && {
              Text: {
                Charset: "UTF-8",
                Data: options.text,
              },
            }),
          },
        },
        ReplyToAddresses: [this.replyToAddress],
      });

      const response = await this.sesClient.send(command);
      this.logger.log(
        `Email sent successfully to ${options.to}, MessageId: ${response.MessageId}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${options.to}: ${error.message}`,
      );
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Auth Email Methods
  // ---------------------------------------------------------------------------

  /**
   * Send email verification email
   */
  async sendVerificationEmail(
    to: string,
    firstName: string,
    verifyUrl: string,
  ): Promise<boolean> {
    const html = this.emailTemplates.emailVerification({
      firstName: firstName || "there",
      verifyUrl,
      expiresIn: "24 hours",
    });

    return this.sendEmail({
      to,
      subject: "Verify your email - PlainLedger",
      html,
      text: `Hello ${firstName || "there"},\n\nPlease verify your email by clicking this link: ${verifyUrl}\n\nThis link expires in 24 hours.\n\nThe PlainLedger Team`,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    to: string,
    firstName: string,
    resetUrl: string,
  ): Promise<boolean> {
    const html = this.emailTemplates.passwordReset({
      firstName: firstName || "there",
      resetUrl,
      expiresIn: "15 minutes",
    });

    return this.sendEmail({
      to,
      subject: "Reset your password - PlainLedger",
      html,
      text: `Hello ${firstName || "there"},\n\nYou requested to reset your password. Click this link to create a new password: ${resetUrl}\n\nThis link expires in 15 minutes.\n\nIf you didn't request this, you can safely ignore this email.\n\nThe PlainLedger Team`,
    });
  }

  /**
   * Send password changed security alert
   */
  async sendPasswordChangedEmail(
    to: string,
    firstName: string,
    timestamp: Date,
    ipAddress?: string,
  ): Promise<boolean> {
    const html = this.emailTemplates.passwordChanged({
      firstName: firstName || "there",
      timestamp: timestamp.toISOString(),
      ipAddress,
    });

    return this.sendEmail({
      to,
      subject: "Password changed - PlainLedger",
      html,
      text: `Hello ${firstName || "there"},\n\nYour PlainLedger password was successfully changed on ${timestamp.toLocaleString()}.\n\nIf you didn't make this change, please reset your password immediately and contact support.\n\nThe PlainLedger Team`,
    });
  }

  /**
   * Send welcome email after email verification
   */
  async sendWelcomeEmail(
    to: string,
    firstName: string,
    organizationName?: string,
  ): Promise<boolean> {
    const html = this.emailTemplates.welcome({
      firstName: firstName || "there",
      organizationName,
    });

    return this.sendEmail({
      to,
      subject: "Welcome to PlainLedger!",
      html,
      text: `Hello ${firstName || "there"},\n\nWelcome to PlainLedger! Your email has been verified and your account is ready to use.\n\nGet started by connecting your accounting software: https://plainledger.ca/app/connections\n\nThe PlainLedger Team`,
    });
  }
}

// ============================================================================
// Module
// ============================================================================

import { Module, forwardRef } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [ConfigModule],
  providers: [SESEmailService, EmailTemplatesService],
  exports: [SESEmailService],
})
export class SESEmailModule {}
