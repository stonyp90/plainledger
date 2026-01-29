/**
 * Email Templates Service
 * Generates branded HTML email templates for Novu workflows
 *
 * These templates follow the same design as Keycloak email templates
 * ensuring consistent branding across all email communications.
 */

import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

// ============================================================================
// Types
// ============================================================================

export interface EmailTemplateData {
  firstName?: string;
  [key: string]: unknown;
}

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class EmailTemplatesService {
  private baseUrl: string;
  private currentYear: number;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>(
      "APP_URL",
      "https://plainledger.ca",
    );
    this.currentYear = new Date().getFullYear();
  }

  /**
   * Generate password reset email HTML
   */
  passwordReset(data: {
    firstName: string;
    resetUrl: string;
    expiresIn: string;
  }): string {
    const content = `
      <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #1e293b;">
        Reset Your Password
      </h1>
      
      <p>Hello ${data.firstName || "there"},</p>
      
      <p>We received a request to reset your PlainLedger password. Click the button below to create a new password:</p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.resetUrl}" class="email-button" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
          Reset Password
        </a>
      </div>
      
      <p style="font-size: 14px; color: #64748b; background: #f1f5f9; padding: 12px 16px; border-radius: 8px; word-break: break-all;">
        Or copy this link: <a href="${data.resetUrl}" style="color: #059669;">${data.resetUrl}</a>
      </p>
      
      <div style="font-size: 14px; color: #92400e; background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">
        <strong>This link expires in ${data.expiresIn}.</strong><br>
        If you didn't request this, you can safely ignore this email.
      </div>
      
      <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 15px;">
        Best regards,<br>
        <strong style="color: #1e293b;">The PlainLedger Team</strong>
      </div>
    `;

    return this.wrapInLayout(content, "Reset Your Password");
  }

  /**
   * Generate email verification email HTML
   */
  emailVerification(data: {
    firstName: string;
    verifyUrl: string;
    expiresIn: string;
  }): string {
    const content = `
      <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #1e293b;">
        Verify Your Email
      </h1>
      
      <p>Hello ${data.firstName || "there"},</p>
      
      <p>Thank you for creating a PlainLedger account! Please verify your email address by clicking the button below:</p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.verifyUrl}" class="email-button" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
          Verify Email
        </a>
      </div>
      
      <p style="font-size: 14px; color: #64748b; background: #f1f5f9; padding: 12px 16px; border-radius: 8px; word-break: break-all;">
        Or copy this link: <a href="${data.verifyUrl}" style="color: #059669;">${data.verifyUrl}</a>
      </p>
      
      <div style="font-size: 14px; color: #64748b; background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border-left: 4px solid #10b981; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">
        <strong style="color: #059669;">What's next?</strong><br>
        Once verified, you can start connecting your accounting software and generating financial reports in minutes.
      </div>
      
      <p style="font-size: 13px; color: #94a3b8;">
        This link expires in ${data.expiresIn}. If you didn't create an account, you can safely ignore this email.
      </p>
      
      <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 15px;">
        Welcome aboard!<br>
        <strong style="color: #1e293b;">The PlainLedger Team</strong>
      </div>
    `;

    return this.wrapInLayout(content, "Verify Your Email");
  }

  /**
   * Generate MFA enabled confirmation email HTML
   */
  mfaEnabled(data: { firstName: string; timestamp: string }): string {
    const formattedDate = new Date(data.timestamp).toLocaleString("en-CA", {
      dateStyle: "full",
      timeStyle: "short",
    });

    const content = `
      <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #1e293b;">
        Two-Factor Authentication Enabled
      </h1>
      
      <p>Hello ${data.firstName || "there"},</p>
      
      <p>Two-factor authentication has been successfully enabled on your PlainLedger account.</p>
      
      <div style="font-size: 14px; color: #64748b; background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border-left: 4px solid #10b981; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">
        <strong style="color: #059669;">Enabled on:</strong> ${formattedDate}
      </div>
      
      <p>Your account is now more secure. You'll be asked for a verification code from your authenticator app each time you sign in.</p>
      
      <div style="font-size: 14px; color: #92400e; background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">
        <strong>Didn't make this change?</strong><br>
        If you didn't enable two-factor authentication, please <a href="${this.baseUrl}/app/settings" style="color: #92400e;">review your security settings</a> immediately or contact support.
      </div>
      
      <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 15px;">
        Stay secure,<br>
        <strong style="color: #1e293b;">The PlainLedger Team</strong>
      </div>
    `;

    return this.wrapInLayout(content, "Two-Factor Authentication Enabled");
  }

  /**
   * Generate password changed security alert email HTML
   */
  passwordChanged(data: {
    firstName: string;
    timestamp: string;
    ipAddress?: string;
  }): string {
    const formattedDate = new Date(data.timestamp).toLocaleString("en-CA", {
      dateStyle: "full",
      timeStyle: "short",
    });

    const content = `
      <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #1e293b;">
        Password Changed
      </h1>
      
      <p>Hello ${data.firstName || "there"},</p>
      
      <p>Your PlainLedger password was successfully changed.</p>
      
      <div style="background: #f8fafc; border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b;">
          <strong>Changed on:</strong> ${formattedDate}
        </p>
        ${
          data.ipAddress
            ? `
        <p style="margin: 0; font-size: 14px; color: #64748b;">
          <strong>IP Address:</strong> ${data.ipAddress}
        </p>
        `
            : ""
        }
      </div>
      
      <div style="font-size: 14px; color: #92400e; background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">
        <strong>Didn't change your password?</strong><br>
        If you didn't make this change, please <a href="${this.baseUrl}/forgot-password" style="color: #92400e;">reset your password immediately</a> and contact our support team.
      </div>
      
      <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 15px;">
        Stay secure,<br>
        <strong style="color: #1e293b;">The PlainLedger Team</strong>
      </div>
    `;

    return this.wrapInLayout(content, "Password Changed");
  }

  /**
   * Generate welcome email HTML
   */
  welcome(data: { firstName: string; organizationName?: string }): string {
    const content = `
      <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #1e293b;">
        Welcome to PlainLedger!
      </h1>
      
      <p>Hello ${data.firstName || "there"},</p>
      
      <p>Welcome to PlainLedger${data.organizationName ? ` for ${data.organizationName}` : ""}! We're thrilled to have you on board.</p>
      
      <div style="font-size: 14px; color: #64748b; background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border-left: 4px solid #10b981; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">
        <strong style="color: #059669;">Your free account is ready!</strong><br>
        Explore PlainLedger with demo data. Subscribe to connect your accounting software and see your real data.
      </div>
      
      <p><strong>Here's how to get started:</strong></p>
      
      <ul style="list-style: none; padding: 0; margin: 16px 0;">
        <li style="display: flex; align-items: center; padding: 12px 16px; background: #f8fafc; border-radius: 8px; margin-bottom: 8px; font-size: 15px; color: #334155;">
          <span style="color: #059669; font-weight: 600; margin-right: 12px;">1.</span>
          Connect your accounting software (QuickBooks, Xero, Sage)
        </li>
        <li style="display: flex; align-items: center; padding: 12px 16px; background: #f8fafc; border-radius: 8px; margin-bottom: 8px; font-size: 15px; color: #334155;">
          <span style="color: #059669; font-weight: 600; margin-right: 12px;">2.</span>
          Review your financial data dashboard
        </li>
        <li style="display: flex; align-items: center; padding: 12px 16px; background: #f8fafc; border-radius: 8px; margin-bottom: 8px; font-size: 15px; color: #334155;">
          <span style="color: #059669; font-weight: 600; margin-right: 12px;">3.</span>
          Generate your first financial report
        </li>
      </ul>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${this.baseUrl}/app/connections" class="email-button" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
          Get Started
        </a>
      </div>
      
      <p style="font-size: 14px; color: #64748b;">
        Need help? Visit our <a href="${this.baseUrl}/help" style="color: #059669;">Help Center</a> or reply to this email.
      </p>
      
      <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 15px;">
        Welcome aboard!<br>
        <strong style="color: #1e293b;">The PlainLedger Team</strong>
      </div>
    `;

    return this.wrapInLayout(content, "Welcome to PlainLedger");
  }

  // ===========================================================================
  // Base Layout
  // ===========================================================================

  /**
   * Wrap email content in the branded layout
   */
  private wrapInLayout(content: string, title: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>${title} - PlainLedger</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style>
        body, table, td, p, a, li, blockquote {
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
        }
        table, td {
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
        }
        img {
            -ms-interpolation-mode: bicubic;
            border: 0;
            height: auto;
            line-height: 100%;
            outline: none;
            text-decoration: none;
        }
        body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            background-color: #f8fafc;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }
        @media only screen and (max-width: 620px) {
            .email-wrapper { padding: 16px 8px !important; }
            .email-header { padding: 24px !important; }
            .email-body { padding: 24px !important; }
            .email-footer { padding: 24px !important; }
        }
    </style>
</head>
<body>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc; padding: 40px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 32px 40px; text-align: center;">
                            <img src="https://plainledger.ca/logo-white.png" alt="PlainLedger" width="48" height="48" style="width: 48px; height: 48px; margin-bottom: 12px; display: block; margin-left: auto; margin-right: auto;">
                            <div style="color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.02em;">PlainLedger</div>
                            <p style="color: rgba(255, 255, 255, 0.85); font-size: 14px; margin: 8px 0 0 0;">No surprises. Just numbers.</p>
                        </td>
                    </tr>
                    
                    <!-- Body -->
                    <tr>
                        <td style="padding: 40px; font-size: 16px; line-height: 1.7; color: #334155;">
                            ${content}
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 32px 40px; background: #f8fafc; text-align: center; border-top: 1px solid #e2e8f0;">
                            <div style="color: #059669; font-size: 13px; font-weight: 600; margin-bottom: 16px;">PlainLedger</div>
                            
                            <div style="margin: 16px 0;">
                                <a href="${this.baseUrl}" style="color: #64748b; text-decoration: none; font-size: 13px; margin: 0 12px;">Website</a>
                                <a href="${this.baseUrl}/help" style="color: #64748b; text-decoration: none; font-size: 13px; margin: 0 12px;">Help Center</a>
                                <a href="${this.baseUrl}/privacy" style="color: #64748b; text-decoration: none; font-size: 13px; margin: 0 12px;">Privacy</a>
                                <a href="${this.baseUrl}/terms" style="color: #64748b; text-decoration: none; font-size: 13px; margin: 0 12px;">Terms</a>
                            </div>
                            
                            <div style="width: 60px; height: 1px; background: #cbd5e1; margin: 20px auto;"></div>
                            
                            <div style="font-size: 12px; color: #94a3b8; line-height: 1.6;">
                                <p style="margin: 0 0 8px 0;">&copy; ${this.currentYear} PlainLedger Inc. All rights reserved.</p>
                                <p style="margin: 0 0 8px 0;">
                                    You are receiving this email because you have an account with PlainLedger or requested information from us. 
                                    This email may contain transactional or marketing content related to your account activity.
                                </p>
                            </div>
                            
                            <div style="font-size: 12px; color: #94a3b8; margin-top: 16px;">
                                PlainLedger Inc.<br>
                                Montreal, Quebec, Canada
                            </div>
                            
                            <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
                                <p style="font-size: 11px; color: #94a3b8; margin: 0 0 8px 0;">
                                    <a href="${this.baseUrl}/settings/notifications" style="color: #64748b; text-decoration: underline;">Manage email preferences</a>
                                    &bull; <a href="${this.baseUrl}/unsubscribe" style="color: #64748b; text-decoration: underline;">Unsubscribe from marketing emails</a>
                                </p>
                                <p style="font-size: 11px; color: #94a3b8; margin: 0;">
                                    If you believe you received this in error, please contact <a href="mailto:support@plainledger.ca" style="color: #64748b; text-decoration: underline;">support@plainledger.ca</a>
                                </p>
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;
  }
}
