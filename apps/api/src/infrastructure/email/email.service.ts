/**
 * Email Service
 * Simple email sending via AWS SES
 * Used for password reset, verification, and other transactional emails
 */

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly sesClient: SESClient | null = null;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly isConfigured: boolean = false;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>("AWS_REGION", "us-east-1");
    this.fromEmail = this.configService.get<string>("SMTP_FROM", "noreply@plainledger.ca");
    this.fromName = this.configService.get<string>("SMTP_FROM_NAME", "PlainLedger");

    // Only initialize SES if we have AWS credentials
    const hasCredentials = 
      process.env.AWS_ACCESS_KEY_ID || 
      this.configService.get<string>("AWS_ACCESS_KEY_ID");

    if (hasCredentials) {
      try {
        this.sesClient = new SESClient({ region });
        this.isConfigured = true;
        this.logger.log("Email service initialized with AWS SES");
      } catch (error) {
        this.logger.warn(`Failed to initialize SES client: ${error.message}`);
      }
    } else {
      this.logger.warn("Email service not configured - emails will be logged only");
    }
  }

  /**
   * Check if email service is available
   */
  isAvailable(): boolean {
    return this.isConfigured;
  }

  /**
   * Send an email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    const { to, subject, html, text } = options;

    // Log in development or if SES not configured
    if (!this.isConfigured) {
      this.logger.log(`[DEV EMAIL] To: ${to}`);
      this.logger.log(`[DEV EMAIL] Subject: ${subject}`);
      this.logger.log(`[DEV EMAIL] Body: ${text || html.substring(0, 200)}...`);
      return true; // Return success for dev mode
    }

    try {
      const command = new SendEmailCommand({
        Source: `${this.fromName} <${this.fromEmail}>`,
        Destination: {
          ToAddresses: [to],
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: "UTF-8",
          },
          Body: {
            Html: {
              Data: html,
              Charset: "UTF-8",
            },
            ...(text && {
              Text: {
                Data: text,
                Charset: "UTF-8",
              },
            }),
          },
        },
      });

      await this.sesClient!.send(command);
      this.logger.log(`Email sent successfully to: ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
      return false;
    }
  }

  /**
   * Send password reset email with custom template
   */
  async sendPasswordResetEmail(
    to: string,
    resetUrl: string,
    firstName?: string
  ): Promise<boolean> {
    const subject = "Reset your PlainLedger password";
    const name = firstName || "there";

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #059669 0%, #047857 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">PlainLedger</h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">No surprises. Just numbers.</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px; color: #1a1a1a; font-size: 20px; font-weight: 600;">Hi ${name},</h2>
              <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                We received a request to reset your password. Click the button below to create a new password.
              </p>
              
              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 8px 0 24px;">
                    <a href="${resetUrl}" 
                       style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 16px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                This link will expire in <strong>15 minutes</strong> for security reasons.
              </p>
              
              <p style="margin: 0 0 24px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>
              
              <!-- Link fallback -->
              <div style="padding: 16px; background-color: #f3f4f6; border-radius: 8px; margin-top: 24px;">
                <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px;">If the button doesn't work, copy and paste this link:</p>
                <p style="margin: 0; color: #059669; font-size: 12px; word-break: break-all;">${resetUrl}</p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                © 2026 PlainLedger · Built by CPAs for CPAs · Data in Canada 🇨🇦
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const text = `Hi ${name},

We received a request to reset your password.

Reset your password: ${resetUrl}

This link will expire in 15 minutes for security reasons.

If you didn't request a password reset, you can safely ignore this email.

---
PlainLedger · Built by CPAs for CPAs`;

    return this.sendEmail({ to, subject, html, text });
  }

  /**
   * Send email verification email with custom template
   */
  async sendVerificationEmail(
    to: string,
    verifyUrl: string,
    firstName?: string
  ): Promise<boolean> {
    const subject = "Verify your PlainLedger email";
    const name = firstName || "there";

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #059669 0%, #047857 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">PlainLedger</h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">No surprises. Just numbers.</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px; color: #1a1a1a; font-size: 20px; font-weight: 600;">Welcome, ${name}!</h2>
              <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Thanks for signing up for PlainLedger. Please verify your email address to get started.
              </p>
              
              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 8px 0 24px;">
                    <a href="${verifyUrl}" 
                       style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 24px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                This link will expire in <strong>24 hours</strong>. If you didn't create an account, you can safely ignore this email.
              </p>
              
              <!-- Link fallback -->
              <div style="padding: 16px; background-color: #f3f4f6; border-radius: 8px; margin-top: 24px;">
                <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px;">If the button doesn't work, copy and paste this link:</p>
                <p style="margin: 0; color: #059669; font-size: 12px; word-break: break-all;">${verifyUrl}</p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                © 2026 PlainLedger · Built by CPAs for CPAs · Data in Canada 🇨🇦
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const text = `Welcome, ${name}!

Thanks for signing up for PlainLedger. Please verify your email address to get started.

Verify your email: ${verifyUrl}

This link will expire in 24 hours.

---
PlainLedger · Built by CPAs for CPAs`;

    return this.sendEmail({ to, subject, html, text });
  }
}
