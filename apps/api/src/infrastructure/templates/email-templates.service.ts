/**
 * Email Templates Service
 * Generates branded HTML email templates for AWS SES
 *
 * These templates follow consistent branding across all email communications.
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
  private logoUrl: string;
  private currentYear: number;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('APP_URL', 'https://plainledger.ca');
    this.logoUrl = this.configService.get<string>(
      'EMAIL_LOGO_URL',
      `${this.baseUrl}/logo-full.svg`,
    );
    this.currentYear = new Date().getFullYear();
  }

  /**
   * Consistent thin CTA style across all templates.
   */
  private getPrimaryButtonStyle(): string {
    return 'display: inline-block; padding: 10px 26px; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; line-height: 1.2; border: 1px solid rgba(255,255,255,0.1);';
  }

  /**
   * Generate password reset email HTML
   */
  passwordReset(data: { firstName: string; resetUrl: string; expiresIn: string }): string {
    const content = `
      <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #1e293b;">
        Reset Your Password
      </h1>
      
      <p>Hello ${data.firstName || 'there'},</p>
      
      <p>We received a request to reset your PlainLedger password. Click the button below to create a new password:</p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.resetUrl}" class="email-button" style="${this.getPrimaryButtonStyle()}">
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

    return this.wrapInLayout(content, 'Reset Your Password');
  }

  /**
   * Generate email verification email HTML
   */
  emailVerification(data: { firstName: string; verifyUrl: string; expiresIn: string }): string {
    const content = `
      <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #1e293b;">
        Verify Your Email
      </h1>
      
      <p>Hello ${data.firstName || 'there'},</p>
      
      <p>Thank you for creating a PlainLedger account! Please verify your email address by clicking the button below:</p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.verifyUrl}" class="email-button" style="${this.getPrimaryButtonStyle()}">
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

    return this.wrapInLayout(content, 'Verify Your Email');
  }

  /**
   * Generate MFA enabled confirmation email HTML
   */
  mfaEnabled(data: { firstName: string; timestamp: string }): string {
    const formattedDate = new Date(data.timestamp).toLocaleString('en-CA', {
      dateStyle: 'full',
      timeStyle: 'short',
    });

    const content = `
      <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #1e293b;">
        Two-Factor Authentication Enabled
      </h1>
      
      <p>Hello ${data.firstName || 'there'},</p>
      
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

    return this.wrapInLayout(content, 'Two-Factor Authentication Enabled');
  }

  /**
   * Generate password changed security alert email HTML
   */
  passwordChanged(data: { firstName: string; timestamp: string; ipAddress?: string }): string {
    const formattedDate = new Date(data.timestamp).toLocaleString('en-CA', {
      dateStyle: 'full',
      timeStyle: 'short',
    });

    const content = `
      <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #1e293b;">
        Password Changed
      </h1>
      
      <p>Hello ${data.firstName || 'there'},</p>
      
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
            : ''
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

    return this.wrapInLayout(content, 'Password Changed');
  }

  /**
   * Generate welcome email HTML
   */
  welcome(data: { firstName: string; organizationName?: string }): string {
    const content = `
      <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #1e293b;">
        Welcome to PlainLedger!
      </h1>
      
      <p>Hello ${data.firstName || 'there'},</p>
      
      <p>Welcome to PlainLedger${data.organizationName ? ` for ${data.organizationName}` : ''}! We're thrilled to have you on board.</p>
      
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
        <a href="${this.baseUrl}/app/connections" class="email-button" style="${this.getPrimaryButtonStyle()}">
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

    return this.wrapInLayout(content, 'Welcome to PlainLedger');
  }

  /**
   * Generate journey day 1 email HTML - Connect your accounting software
   */
  journeyDay1(data: { firstName: string; connectionUrl: string; calendlyUrl: string }): string {
    const content = `
      <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #1e293b;">
        Connect Your Accounting Software
      </h1>
      
      <p>Hello ${data.firstName || 'there'},</p>
      
      <p>Welcome to PlainLedger! To get the most out of your account, connect your accounting software and start seeing your real financial data.</p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.connectionUrl}" class="email-button" style="${this.getPrimaryButtonStyle()}">
          Connect Your Software
        </a>
      </div>
      
      <p style="font-size: 14px; color: #64748b;">
        We support QuickBooks, Xero, Sage, and more. Once connected, you'll see your financial dashboard populate with real data.
      </p>
      
      <div style="font-size: 14px; color: #64748b; background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border-left: 4px solid #10b981; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">
        <strong style="color: #059669;">Need help?</strong><br>
        <a href="${data.calendlyUrl}" style="color: #059669; text-decoration: underline;">Schedule a free onboarding call</a> and we'll help you get set up.
      </div>
      
      <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 15px;">
        Best regards,<br>
        <strong style="color: #1e293b;">The PlainLedger Team</strong>
      </div>
    `;

    return this.wrapInLayout(content, 'Connect Your Accounting Software');
  }

  /**
   * Generate journey day 3 email HTML - Schedule onboarding call
   */
  journeyDay3(data: { firstName: string; calendlyUrl: string; helpUrl: string }): string {
    const content = `
      <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #1e293b;">
        Need Help Getting Started?
      </h1>
      
      <p>Hello ${data.firstName || 'there'},</p>
      
      <p>We noticed you haven't connected your accounting software yet. We're here to help!</p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.calendlyUrl}" class="email-button" style="${this.getPrimaryButtonStyle()}">
          Schedule a Free Call
        </a>
      </div>
      
      <p>During this 15-minute call, we'll help you:</p>
      
      <ul style="list-style: none; padding: 0; margin: 16px 0;">
        <li style="display: flex; align-items: center; padding: 12px 16px; background: #f8fafc; border-radius: 8px; margin-bottom: 8px; font-size: 15px; color: #334155;">
          <span style="color: #059669; font-weight: 600; margin-right: 12px;">✓</span>
          Connect your accounting software
        </li>
        <li style="display: flex; align-items: center; padding: 12px 16px; background: #f8fafc; border-radius: 8px; margin-bottom: 8px; font-size: 15px; color: #334155;">
          <span style="color: #059669; font-weight: 600; margin-right: 12px;">✓</span>
          Set up your financial dashboard
        </li>
        <li style="display: flex; align-items: center; padding: 12px 16px; background: #f8fafc; border-radius: 8px; margin-bottom: 8px; font-size: 15px; color: #334155;">
          <span style="color: #059669; font-weight: 600; margin-right: 12px;">✓</span>
          Answer any questions you have
        </li>
      </ul>
      
      <p style="font-size: 14px; color: #64748b;">
        Or check out our <a href="${data.helpUrl}" style="color: #059669;">Help Center</a> for step-by-step guides.
      </p>
      
      <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 15px;">
        We're here to help!<br>
        <strong style="color: #1e293b;">The PlainLedger Team</strong>
      </div>
    `;

    return this.wrapInLayout(content, 'Need Help Getting Started?');
  }

  /**
   * Generate journey day 7 email HTML - We're here to help
   */
  journeyDay7(data: {
    firstName: string;
    calendlyUrl: string;
    connectionUrl: string;
    featuresUrl: string;
  }): string {
    const content = `
      <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #1e293b;">
        We're Here to Help You Succeed
      </h1>
      
      <p>Hello ${data.firstName || 'there'},</p>
      
      <p>It's been a week since you signed up for PlainLedger. We want to make sure you're getting the most out of your account.</p>
      
      <div style="font-size: 14px; color: #64748b; background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border-left: 4px solid #10b981; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">
        <strong style="color: #059669;">Ready to dive in?</strong><br>
        <a href="${data.connectionUrl}" style="color: #059669; text-decoration: underline;">Connect your accounting software</a> to unlock powerful financial insights.
      </div>
      
      <p><strong>What you can do with PlainLedger:</strong></p>
      
      <ul style="list-style: none; padding: 0; margin: 16px 0;">
        <li style="display: flex; align-items: center; padding: 12px 16px; background: #f8fafc; border-radius: 8px; margin-bottom: 8px; font-size: 15px; color: #334155;">
          <span style="color: #059669; font-weight: 600; margin-right: 12px;">•</span>
          Generate financial reports in minutes
        </li>
        <li style="display: flex; align-items: center; padding: 12px 16px; background: #f8fafc; border-radius: 8px; margin-bottom: 8px; font-size: 15px; color: #334155;">
          <span style="color: #059669; font-weight: 600; margin-right: 12px;">•</span>
          Track KPIs and benchmarks
        </li>
        <li style="display: flex; align-items: center; padding: 12px 16px; background: #f8fafc; border-radius: 8px; margin-bottom: 8px; font-size: 15px; color: #334155;">
          <span style="color: #059669; font-weight: 600; margin-right: 12px;">•</span>
          Identify financial issues before they become problems
        </li>
      </ul>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.calendlyUrl}" class="email-button" style="${this.getPrimaryButtonStyle()}">
          Book a Demo
        </a>
      </div>
      
      <p style="font-size: 14px; color: #64748b;">
        Learn more about our <a href="${data.featuresUrl}" style="color: #059669;">features</a> or reply to this email with any questions.
      </p>
      
      <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 15px;">
        Best regards,<br>
        <strong style="color: #1e293b;">The PlainLedger Team</strong>
      </div>
    `;

    return this.wrapInLayout(content, "We're Here to Help You Succeed");
  }

  /**
   * Generate journey first dashboard email HTML
   */
  journeyFirstDashboard(data: {
    firstName: string;
    providerName: string;
    dashboardUrl: string;
    reportsUrl: string;
  }): string {
    const content = `
      <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #1e293b;">
        Your Financial Dashboard is Ready!
      </h1>
      
      <p>Hello ${data.firstName || 'there'},</p>
      
      <p>Great news! We've successfully connected your ${data.providerName} account and your financial dashboard is now ready.</p>
      
      <div style="font-size: 14px; color: #64748b; background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border-left: 4px solid #10b981; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">
        <strong style="color: #059669;">What's next?</strong><br>
        Explore your dashboard to see your financial data, KPIs, and insights in one place.
      </div>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.dashboardUrl}" class="email-button" style="${this.getPrimaryButtonStyle()}">
          View Dashboard
        </a>
      </div>
      
      <p style="font-size: 14px; color: #64748b;">
        You can also <a href="${data.reportsUrl}" style="color: #059669;">generate your first financial report</a> to get deeper insights into your business performance.
      </p>
      
      <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 15px;">
        Happy analyzing!<br>
        <strong style="color: #1e293b;">The PlainLedger Team</strong>
      </div>
    `;

    return this.wrapInLayout(content, 'Your Financial Dashboard is Ready!');
  }

  /**
   * Generate journey trial reminder email HTML
   */
  journeyTrialReminder(data: {
    firstName: string;
    daysLeft: number;
    trialEndsAt: string;
    upgradeUrl: string;
    pricingUrl: string;
  }): string {
    const formattedDate = new Date(data.trialEndsAt).toLocaleDateString('en-CA', {
      dateStyle: 'long',
    });

    const content = `
      <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #1e293b;">
        Your PlainLedger Trial Ends ${data.daysLeft === 1 ? 'Tomorrow' : `in ${data.daysLeft} Days`}
      </h1>
      
      <p>Hello ${data.firstName || 'there'},</p>
      
      <p>Your PlainLedger trial ends on ${formattedDate}. Don't lose access to your financial insights!</p>
      
      <div style="font-size: 14px; color: #92400e; background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">
        <strong>After your trial ends:</strong><br>
        You'll lose access to your connected data and reports. Subscribe now to keep everything you've set up.
      </div>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.upgradeUrl}" class="email-button" style="${this.getPrimaryButtonStyle()}">
          Subscribe Now
        </a>
      </div>
      
      <p style="font-size: 14px; color: #64748b;">
        View our <a href="${data.pricingUrl}" style="color: #059669;">pricing plans</a> to find the right fit for your business.
      </p>
      
      <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 15px;">
        Questions? Reply to this email and we'll help you choose the right plan.<br>
        <strong style="color: #1e293b;">The PlainLedger Team</strong>
      </div>
    `;

    return this.wrapInLayout(
      content,
      `Your Trial Ends ${data.daysLeft === 1 ? 'Tomorrow' : `in ${data.daysLeft} Days`}`,
    );
  }

  /**
   * Generate journey winback email HTML
   */
  journeyWinback(data: {
    firstName: string;
    lastActiveAt: string;
    dashboardUrl: string;
    calendlyUrl: string;
  }): string {
    const content = `
      <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #1e293b;">
        We Miss You at PlainLedger!
      </h1>
      
      <p>Hello ${data.firstName || 'there'},</p>
      
      <p>We noticed you haven't been active on PlainLedger lately. We'd love to help you get back on track with your financial insights.</p>
      
      <div style="font-size: 14px; color: #64748b; background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border-left: 4px solid #10b981; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">
        <strong style="color: #059669;">What's new?</strong><br>
        We've added new features and improvements since you last visited. Check out your dashboard to see what's changed!
      </div>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.dashboardUrl}" class="email-button" style="${this.getPrimaryButtonStyle()}">
          Visit Dashboard
        </a>
      </div>
      
      <p style="font-size: 14px; color: #64748b;">
        Need help getting started again? <a href="${data.calendlyUrl}" style="color: #059669;">Schedule a call</a> and we'll help you get back on track.
      </p>
      
      <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 15px;">
        We're here to help!<br>
        <strong style="color: #1e293b;">The PlainLedger Team</strong>
      </div>
    `;

    return this.wrapInLayout(content, 'We Miss You at PlainLedger!');
  }

  /**
   * Generate contact form notification email HTML (internal)
   */
  contactFormNotification(data: {
    name: string;
    email: string;
    company?: string;
    phone?: string;
    industry?: string;
    subject: string;
    message: string;
    referralSource?: string;
    source?: string;
    timestamp: string;
  }): string {
    const content = `
      <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #1e293b;">
        New Contact Form Submission
      </h1>
      
      <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <p style="margin: 0 0 12px 0; font-size: 14px; color: #64748b;">
          <strong>From:</strong> ${data.name} &lt;${data.email}&gt;
        </p>
        ${data.company ? `<p style="margin: 0 0 12px 0; font-size: 14px; color: #64748b;"><strong>Company:</strong> ${data.company}</p>` : ''}
        ${data.phone ? `<p style="margin: 0 0 12px 0; font-size: 14px; color: #64748b;"><strong>Phone:</strong> ${data.phone}</p>` : ''}
        ${data.industry ? `<p style="margin: 0 0 12px 0; font-size: 14px; color: #64748b;"><strong>Industry:</strong> ${data.industry}</p>` : ''}
        <p style="margin: 0 0 12px 0; font-size: 14px; color: #64748b;">
          <strong>Subject:</strong> ${data.subject}
        </p>
        ${data.referralSource ? `<p style="margin: 0 0 12px 0; font-size: 14px; color: #64748b;"><strong>How they found us:</strong> ${data.referralSource}</p>` : ''}
        ${data.source ? `<p style="margin: 0 0 12px 0; font-size: 14px; color: #64748b;"><strong>Source:</strong> ${data.source}</p>` : ''}
        <p style="margin: 0; font-size: 14px; color: #64748b;">
          <strong>Submitted:</strong> ${new Date(data.timestamp).toLocaleString('en-CA')}
        </p>
      </div>
      
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <h2 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #1e293b;">Message:</h2>
        <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #334155; white-space: pre-wrap;">${data.message}</p>
      </div>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="mailto:${data.email}?subject=Re: ${encodeURIComponent(data.subject)}" class="email-button" style="${this.getPrimaryButtonStyle()}">
          Reply to ${data.name}
        </a>
      </div>
    `;

    return this.wrapInLayout(content, 'New Contact Form Submission');
  }

  /**
   * Generate contact form auto-reply email HTML
   */
  contactFormAutoReply(data: { name: string; subject: string }): string {
    const content = `
      <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #1e293b;">
        Thank You for Contacting Us
      </h1>
      
      <p>Hello ${data.name},</p>
      
      <p>Thank you for reaching out to PlainLedger! We've received your message about "${data.subject}" and our team will get back to you within 24 hours.</p>
      
      <div style="font-size: 14px; color: #64748b; background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border-left: 4px solid #10b981; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">
        <strong style="color: #059669;">In the meantime:</strong><br>
        Check out our <a href="${this.baseUrl}/help" style="color: #059669;">Help Center</a> for answers to common questions, or explore our <a href="${this.baseUrl}" style="color: #059669;">website</a> to learn more about PlainLedger.
      </div>
      
      <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 15px;">
        Best regards,<br>
        <strong style="color: #1e293b;">The PlainLedger Team</strong>
      </div>
    `;

    return this.wrapInLayout(content, 'Thank You for Contacting Us');
  }

  /**
   * Generate onboarding completion notification email HTML (internal)
   */
  onboardingCompleteNotification(data: {
    email: string;
    companyName: string;
    companySize?: string;
    industry?: string;
    fiscalYearEnd?: number;
    currency?: string;
    primarySource?: string;
    teamEmails?: string;
  }): string {
    const content = `
      <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #1e293b;">
        New Onboarding Completed
      </h1>
      
      <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <p style="margin: 0 0 12px 0; font-size: 14px; color: #64748b;">
          <strong>User Email:</strong> ${data.email}
        </p>
        <p style="margin: 0 0 12px 0; font-size: 14px; color: #64748b;">
          <strong>Company:</strong> ${data.companyName}
        </p>
        ${data.companySize ? `<p style="margin: 0 0 12px 0; font-size: 14px; color: #64748b;"><strong>Company Size:</strong> ${data.companySize}</p>` : ''}
        ${data.industry ? `<p style="margin: 0 0 12px 0; font-size: 14px; color: #64748b;"><strong>Industry:</strong> ${data.industry}</p>` : ''}
        ${data.fiscalYearEnd ? `<p style="margin: 0 0 12px 0; font-size: 14px; color: #64748b;"><strong>Fiscal Year End:</strong> Month ${data.fiscalYearEnd}</p>` : ''}
        ${data.currency ? `<p style="margin: 0 0 12px 0; font-size: 14px; color: #64748b;"><strong>Currency:</strong> ${data.currency}</p>` : ''}
        ${data.primarySource ? `<p style="margin: 0 0 12px 0; font-size: 14px; color: #64748b;"><strong>Primary Source:</strong> ${data.primarySource}</p>` : ''}
        ${data.teamEmails ? `<p style="margin: 0; font-size: 14px; color: #64748b;"><strong>Team Emails:</strong> ${data.teamEmails}</p>` : ''}
      </div>
      
      <p style="font-size: 14px; color: #64748b;">
        A new user has completed onboarding. Review their profile in the admin dashboard.
      </p>
    `;

    return this.wrapInLayout(content, 'New Onboarding Completed');
  }

  /**
   * Generate ETL pipeline success alert email HTML
   */
  etlSuccessAlert(data: {
    organizationName: string;
    jobName: string;
    duration: string;
    recordsProcessed: number;
    recordsWritten: number;
    recordsQuarantined: number;
    timestamp: string;
  }): string {
    const quarantineRate =
      data.recordsProcessed > 0
        ? ((data.recordsQuarantined / data.recordsProcessed) * 100).toFixed(1)
        : '0.0';

    const content = `
      <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #059669;">
        ✓ ETL Pipeline Completed Successfully
      </h1>
      
      <p>Hello,</p>
      
      <p>Your data pipeline has completed successfully for <strong>${data.organizationName}</strong>.</p>
      
      <div style="background: #f0fdf4; border-left: 4px solid #059669; padding: 20px 24px; border-radius: 0 8px 8px 0; margin: 24px 0;">
        <div style="font-size: 15px; color: #065f46; margin-bottom: 12px;">
          <strong>Job:</strong> ${data.jobName}
        </div>
        <div style="font-size: 15px; color: #065f46; margin-bottom: 12px;">
          <strong>Duration:</strong> ${data.duration}
        </div>
        <div style="font-size: 15px; color: #065f46; margin-bottom: 12px;">
          <strong>Completed:</strong> ${data.timestamp}
        </div>
      </div>
      
      <h2 style="margin: 32px 0 16px 0; font-size: 18px; font-weight: 600; color: #1e293b;">
        Processing Statistics
      </h2>
      
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 16px 0;">
        <tr>
          <td style="padding: 12px 16px; background: #f8fafc; border-radius: 8px; font-size: 15px;">
            <strong>Records Processed:</strong> ${data.recordsProcessed.toLocaleString()}
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; background: #f8fafc; border-radius: 8px; font-size: 15px; margin-top: 8px;">
            <strong>Records Written:</strong> ${data.recordsWritten.toLocaleString()}
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; background: ${data.recordsQuarantined > 0 ? '#fffbeb' : '#f8fafc'}; border-radius: 8px; font-size: 15px; margin-top: 8px;">
            <strong>Records Quarantined:</strong> ${data.recordsQuarantined.toLocaleString()} (${quarantineRate}%)
          </td>
        </tr>
      </table>
      
      ${
        data.recordsQuarantined > 0 && parseFloat(quarantineRate) > 5
          ? `
        <div style="font-size: 14px; color: #92400e; background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">
          <strong>⚠️ High Quarantine Rate:</strong> ${quarantineRate}% of records were quarantined. Please review the data quality rules.
        </div>
      `
          : ''
      }
      
      <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 15px;">
        Best regards,<br>
        <strong style="color: #1e293b;">PlainLedger ETL System</strong>
      </div>
    `;

    return this.wrapInLayout(content, 'ETL Pipeline Success');
  }

  /**
   * Generate ETL pipeline failure alert email HTML
   */
  etlFailureAlert(data: {
    organizationName: string;
    jobName: string;
    errorMessage: string;
    errorDetails?: string;
    timestamp: string;
    retryable: boolean;
  }): string {
    const content = `
      <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #dc2626;">
        ✗ ETL Pipeline Failed
      </h1>
      
      <p>Hello,</p>
      
      <p>Your data pipeline has failed for <strong>${data.organizationName}</strong>.</p>
      
      <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 20px 24px; border-radius: 0 8px 8px 0; margin: 24px 0;">
        <div style="font-size: 15px; color: #991b1b; margin-bottom: 12px;">
          <strong>Job:</strong> ${data.jobName}
        </div>
        <div style="font-size: 15px; color: #991b1b; margin-bottom: 12px;">
          <strong>Failed:</strong> ${data.timestamp}
        </div>
        <div style="font-size: 15px; color: #991b1b;">
          <strong>Status:</strong> ${data.retryable ? 'Retryable' : 'Permanent Failure'}
        </div>
      </div>
      
      <h2 style="margin: 32px 0 16px 0; font-size: 18px; font-weight: 600; color: #1e293b;">
        Error Details
      </h2>
      
      <div style="background: #1e293b; color: #f1f5f9; padding: 16px 20px; border-radius: 8px; font-family: 'Courier New', monospace; font-size: 13px; line-height: 1.6; margin: 16px 0; overflow-x: auto;">
        ${data.errorMessage}
      </div>
      
      ${
        data.errorDetails
          ? `
        <details style="margin: 16px 0;">
          <summary style="cursor: pointer; color: #64748b; font-size: 14px; margin-bottom: 8px;">View Stack Trace</summary>
          <div style="background: #1e293b; color: #f1f5f9; padding: 16px 20px; border-radius: 8px; font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.6; overflow-x: auto; white-space: pre-wrap;">
${data.errorDetails}
          </div>
        </details>
      `
          : ''
      }
      
      ${
        data.retryable
          ? `
        <div style="font-size: 14px; color: #065f46; background: #f0fdf4; border-left: 4px solid #059669; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">
          <strong>ℹ️ Automatic Retry:</strong> This error is retryable. The pipeline will automatically retry.
        </div>
      `
          : `
        <div style="font-size: 14px; color: #991b1b; background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">
          <strong>⚠️ Manual Intervention Required:</strong> This is a permanent failure. Please review the error and fix the issue.
        </div>
      `
      }
      
      <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 15px;">
        Best regards,<br>
        <strong style="color: #1e293b;">PlainLedger ETL System</strong>
      </div>
    `;

    return this.wrapInLayout(content, 'ETL Pipeline Failure');
  }

  /**
   * Generate ETL data quality alert email HTML
   */
  etlDataQualityAlert(data: {
    organizationName: string;
    jobName: string;
    quarantineRate: number;
    recordsQuarantined: number;
    recordsProcessed: number;
    qualityIssues: Array<{ entity: string; count: number; reason: string }>;
    timestamp: string;
  }): string {
    const content = `
      <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #f59e0b;">
        ⚠️ Data Quality Alert
      </h1>
      
      <p>Hello,</p>
      
      <p>Your data pipeline has completed, but <strong>${data.quarantineRate.toFixed(1)}%</strong> of records were quarantined due to data quality issues for <strong>${data.organizationName}</strong>.</p>
      
      <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px 24px; border-radius: 0 8px 8px 0; margin: 24px 0;">
        <div style="font-size: 15px; color: #92400e; margin-bottom: 12px;">
          <strong>Job:</strong> ${data.jobName}
        </div>
        <div style="font-size: 15px; color: #92400e; margin-bottom: 12px;">
          <strong>Quarantine Rate:</strong> ${data.quarantineRate.toFixed(1)}%
        </div>
        <div style="font-size: 15px; color: #92400e;">
          <strong>Completed:</strong> ${data.timestamp}
        </div>
      </div>
      
      <h2 style="margin: 32px 0 16px 0; font-size: 18px; font-weight: 600; color: #1e293b;">
        Quality Issues Summary
      </h2>
      
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 16px 0;">
        <tr>
          <td style="padding: 12px 16px; background: #f8fafc; border-radius: 8px; font-size: 15px;">
            <strong>Total Processed:</strong> ${data.recordsProcessed.toLocaleString()}
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; background: #fef2f2; border-radius: 8px; font-size: 15px; margin-top: 8px;">
            <strong>Total Quarantined:</strong> ${data.recordsQuarantined.toLocaleString()}
          </td>
        </tr>
      </table>
      
      ${
        data.qualityIssues.length > 0
          ? `
        <h3 style="margin: 24px 0 12px 0; font-size: 16px; font-weight: 600; color: #1e293b;">
          Issues by Entity Type
        </h3>
        ${data.qualityIssues
          .map(
            (issue) => `
          <div style="background: #f8fafc; padding: 16px 20px; border-radius: 8px; margin: 8px 0;">
            <div style="font-size: 15px; color: #1e293b; margin-bottom: 4px;">
              <strong>${issue.entity}:</strong> ${issue.count.toLocaleString()} records
            </div>
            <div style="font-size: 14px; color: #64748b;">
              Reason: ${issue.reason}
            </div>
          </div>
        `,
          )
          .join('')}
      `
          : ''
      }
      
      <div style="font-size: 14px; color: #92400e; background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">
        <strong>💡 Recommendation:</strong> Review the quarantined records in your S3 quarantine bucket and update your data quality rules if needed.
      </div>
      
      <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 15px;">
        Best regards,<br>
        <strong style="color: #1e293b;">PlainLedger ETL System</strong>
      </div>
    `;

    return this.wrapInLayout(content, 'Data Quality Alert');
  }

  /**
   * Generate share visualization email HTML
   */
  shareVisualization(data: {
    firstName: string;
    title: string;
    message?: string;
    imageUrl: string;
    shareUrl: string;
    password?: string;
    expiresIn: string;
    baseUrl: string;
  }): string {
    const isEn = true; // Default to English, can be made dynamic based on user preference

    const content = `
      <h1 class="email-title">
        ${isEn ? 'Visualization Shared' : 'Visualisation partagée'}
      </h1>

      <p class="email-text">
        ${isEn ? `Hello ${data.firstName || 'there'},` : `Bonjour ${data.firstName || 'vous'},`}
      </p>

      <p class="email-text">
        ${
          isEn
            ? `A visualization has been shared with you: <strong>${data.title}</strong>`
            : `Une visualisation vous a été partagée : <strong>${data.title}</strong>`
        }
      </p>

      ${
        data.message
          ? `
        <div class="info-box" style="margin: 24px 0;">
          <p style="margin: 0; font-size: 14px; color: #64748b; font-style: italic;">
            "${data.message}"
          </p>
        </div>
      `
          : ''
      }

      <!-- Chart Preview -->
      <div style="text-align: center; margin: 32px 0;">
        <img 
          src="${data.imageUrl}" 
          alt="${data.title}"
          style="max-width: 100%; height: auto; border-radius: 8px; border: 1px solid #e2e8f0;"
        />
      </div>

      <!-- Share Link -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.shareUrl}" class="email-button" style="${this.getPrimaryButtonStyle()}">
          ${isEn ? 'View Full Visualization' : 'Voir la visualisation complète'}
        </a>
      </div>

      ${
        data.password
          ? `
        <div class="info-box warning" style="margin: 24px 0;">
          <strong>${isEn ? 'Password' : 'Mot de passe'}:</strong>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: #64748b; font-family: monospace; letter-spacing: 0.1em;">
            ${data.password}
          </p>
        </div>
      `
          : ''
      }

      <div class="info-box" style="margin: 24px 0;">
        <strong>${isEn ? 'Share Details' : 'Détails du partage'}:</strong>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top: 12px;">
          <tr>
            <td style="padding: 4px 0; color: #64748b; width: 120px;">${isEn ? 'Expires' : 'Expire'}:</td>
            <td style="padding: 4px 0; color: #1e293b; font-weight: 500;">${data.expiresIn}</td>
          </tr>
        </table>
      </div>

      <hr class="email-divider">

      <p class="email-text" style="font-size: 14px; color: #64748b;">
        ${
          isEn
            ? 'This visualization was shared from PlainLedger. You can access it using the link above.'
            : 'Cette visualisation a été partagée depuis PlainLedger. Vous pouvez y accéder en utilisant le lien ci-dessus.'
        }
      </p>

      <div class="email-signature">
        <p>${isEn ? 'Best regards' : 'Cordialement'},<br><strong style="color: #1e293b;">The PlainLedger Team</strong></p>
      </div>
    `;

    return this.wrapInLayout(content, isEn ? 'Visualization Shared' : 'Visualisation partagée');
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
        .email-button {
            display: inline-block;
            padding: 10px 26px;
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 14px;
            line-height: 1.2;
            border: 1px solid rgba(255,255,255,0.1);
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
                            <img src="${this.logoUrl}" alt="PlainLedger" width="178" style="display: block; margin: 0 auto 10px auto; width: 178px; max-width: 100%; height: auto;">
                            <div style="color: #ffffff; font-size: 26px; font-weight: 600; letter-spacing: -0.02em; margin-top: 8px;">PlainLedger</div>
                            <p style="color: rgba(255, 255, 255, 0.85); font-size: 13px; margin: 6px 0 0 0; font-style: italic;">No surprises. Just numbers.</p>
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
