/**
 * Novu Notification Service
 * Handles all transactional notifications via Novu
 *
 * Integration Guide:
 * 1. Sign up at https://novu.co
 * 2. Get your API Key from Settings > API Keys
 * 3. Create workflows in Novu Dashboard matching the workflow IDs below
 * 4. Set NOVU_API_KEY and NOVU_APP_ID in environment variables
 */

import { Injectable, Logger, OnModuleInit, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EmailTemplatesService } from "@infrastructure/templates/email-templates.service";

// ============================================================================
// Types
// ============================================================================

export interface NovuSubscriber {
  subscriberId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  locale?: string;
  data?: Record<string, unknown>;
}

export interface NovuTriggerPayload {
  workflowId: string;
  to: string | NovuSubscriber;
  payload: Record<string, unknown>;
  overrides?: {
    email?: {
      from?: string;
      replyTo?: string;
    };
    sms?: {
      from?: string;
    };
  };
}

// Workflow IDs - must match Novu Dashboard
export const NovuWorkflows = {
  // Auth Emails (Custom UI flow - sent via our app, not Keycloak)
  PASSWORD_RESET: "password-reset", // Password reset link email
  EMAIL_VERIFICATION: "email-verification", // Email verification link
  MFA_ENABLED: "mfa-enabled", // MFA setup confirmation

  // Account (triggered after auth events)
  WELCOME: "welcome", // After successful registration + email verification
  EMAIL_VERIFIED: "email-verified", // Confirmation that email was verified
  PASSWORD_CHANGED: "password-changed", // Security alert after password change
  ACCOUNT_DEACTIVATED: "account-deactivated",
  ACCOUNT_REACTIVATED: "account-reactivated",

  // Onboarding
  ONBOARDING_COMPLETE: "onboarding-complete", // After user completes onboarding wizard
  FIRST_CONNECTION: "first-connection", // After first data source connection
  FIRST_REPORT: "first-report", // After first report generation

  // Security
  LOGIN_NEW_DEVICE: "login-new-device",
  LOGIN_NEW_LOCATION: "login-new-location",
  LOGIN_FAILED_ATTEMPTS: "login-failed-attempts",
  TWO_FACTOR_ENABLED: "two-factor-enabled", // After MFA setup in Keycloak
  TWO_FACTOR_DISABLED: "two-factor-disabled",
  SUSPICIOUS_ACTIVITY: "suspicious-activity",

  // Billing
  SUBSCRIPTION_CREATED: "subscription-created",
  SUBSCRIPTION_UPGRADED: "subscription-upgraded",
  SUBSCRIPTION_DOWNGRADED: "subscription-downgraded",
  SUBSCRIPTION_CANCELLED: "subscription-cancelled",
  PAYMENT_SUCCEEDED: "payment-succeeded",
  PAYMENT_FAILED: "payment-failed",
  PAYMENT_METHOD_EXPIRING: "payment-method-expiring",
  INVOICE_CREATED: "invoice-created",
  TRIAL_ENDING: "trial-ending",
  USAGE_LIMIT_WARNING: "usage-limit-warning",
  USAGE_LIMIT_REACHED: "usage-limit-reached",

  // Trial & Conversion
  TRIAL_REMINDER: "trial-reminder",
  TRIAL_EXPIRED: "trial-expired",
  FEATURE_UNLOCK: "feature-unlock",
  USAGE_MILESTONE: "usage-milestone",
  WINBACK_OFFER: "winback-offer",

  // Data Sync
  SYNC_COMPLETED: "sync-completed",
  SYNC_FAILED: "sync-failed",
  DATA_IMPORT_COMPLETED: "data-import-completed",
  DATA_EXPORT_READY: "data-export-ready",

  // Reports
  REPORT_GENERATED: "report-generated",
  REPORT_FAILED: "report-failed",
  REPORT_SHARED: "report-shared",

  // Connections
  CONNECTION_ADDED: "connection-added",
  CONNECTION_ERROR: "connection-error",
  CONNECTION_REAUTHORIZATION: "connection-reauthorization",

  // System
  SYSTEM_MAINTENANCE: "system-maintenance",
  FEATURE_ANNOUNCEMENT: "feature-announcement",

  // Team
  TEAM_MEMBER_INVITED: "team-member-invited",
  TEAM_ROLE_CHANGED: "team-role-changed",

  // Contact
  CONTACT_FORM: "contact-form", // Contact form submission notification
  CONTACT_FORM_AUTO_REPLY: "contact-form-auto-reply", // Auto-reply to sender
} as const;

type WorkflowId = (typeof NovuWorkflows)[keyof typeof NovuWorkflows];

// ============================================================================
// Import Interface
// ============================================================================

import {
  INotificationService,
  NotificationRecipient,
  PasswordResetEmailOptions,
  VerificationEmailOptions,
  MFAEnabledEmailOptions,
} from "@application/ports/outbound/INotificationService";

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class NovuService implements OnModuleInit, INotificationService {
  private readonly logger = new Logger(NovuService.name);
  private apiKey: string;
  private appId: string;
  private baseUrl = "https://api.novu.co/v1";
  private enabled = false;

  constructor(
    private configService: ConfigService,
    @Optional() private emailTemplates?: EmailTemplatesService,
  ) {}

  async onModuleInit() {
    this.apiKey = this.configService.get<string>("NOVU_API_KEY") || "";
    this.appId = this.configService.get<string>("NOVU_APP_ID") || "";

    if (this.apiKey && this.appId) {
      this.enabled = true;
      this.logger.log("Novu notification service initialized");
    } else {
      this.logger.warn(
        "Novu API key or App ID not configured - notifications will be logged only",
      );
    }
  }

  /**
   * Check if notification service is available
   */
  isAvailable(): boolean {
    return this.enabled;
  }

  /**
   * Create or update a recipient (alias for upsertSubscriber)
   */
  async upsertRecipient(recipient: NotificationRecipient): Promise<void> {
    await this.upsertSubscriber({
      subscriberId: recipient.id,
      email: recipient.email,
      firstName: recipient.firstName,
      lastName: recipient.lastName,
      locale: recipient.locale,
    });
  }

  // ---------------------------------------------------------------------------
  // Core Methods
  // ---------------------------------------------------------------------------

  /**
   * Create or update a subscriber in Novu
   */
  async upsertSubscriber(subscriber: NovuSubscriber): Promise<void> {
    if (!this.enabled) {
      this.logger.debug("Novu disabled, skipping subscriber upsert");
      return;
    }

    try {
      await this.request(`/subscribers/${subscriber.subscriberId}`, "PUT", {
        email: subscriber.email,
        firstName: subscriber.firstName,
        lastName: subscriber.lastName,
        phone: subscriber.phone,
        locale: subscriber.locale || "fr",
        data: subscriber.data,
      });

      this.logger.debug(`Subscriber upserted: ${subscriber.subscriberId}`);
    } catch (error) {
      this.logger.error(`Failed to upsert subscriber: ${error.message}`);
      throw error;
    }
  }

  /**
   * Trigger a notification workflow
   */
  async trigger(
    params: NovuTriggerPayload,
  ): Promise<{ transactionId: string }> {
    if (!this.enabled) {
      this.logger.debug(
        `Novu disabled, skipping trigger: ${params.workflowId}`,
      );
      return { transactionId: "disabled" };
    }

    try {
      const subscriberId =
        typeof params.to === "string" ? params.to : params.to.subscriberId;

      const response = await this.request("/events/trigger", "POST", {
        name: params.workflowId,
        to: { subscriberId },
        payload: params.payload,
        overrides: params.overrides,
      });

      this.logger.debug(
        `Notification triggered: ${params.workflowId} -> ${subscriberId}`,
      );
      return { transactionId: response.data?.transactionId || "unknown" };
    } catch (error) {
      this.logger.error(`Failed to trigger notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a subscriber from Novu
   */
  async deleteSubscriber(subscriberId: string): Promise<void> {
    if (!this.enabled) return;

    try {
      await this.request(`/subscribers/${subscriberId}`, "DELETE");
      this.logger.debug(`Subscriber deleted: ${subscriberId}`);
    } catch (error) {
      this.logger.error(`Failed to delete subscriber: ${error.message}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Auth Emails (INotificationService implementation)
  // ---------------------------------------------------------------------------

  /**
   * Send password reset email with custom link
   */
  async sendPasswordResetEmail(options: PasswordResetEmailOptions): Promise<boolean> {
    const { to, firstName, resetUrl } = options;
    const expiresIn = "15 minutes";

    // Generate branded HTML template
    const htmlContent = this.emailTemplates?.passwordReset({
      firstName: firstName || "there",
      resetUrl,
      expiresIn,
    });

    try {
      // Create temporary subscriber for the email recipient
      const subscriberId = `reset-${Date.now()}-${to.replace(/[^a-z0-9]/gi, '')}`;
      
      await this.upsertSubscriber({
        subscriberId,
        email: to,
        firstName: firstName || "User",
      });

      await this.trigger({
        workflowId: NovuWorkflows.PASSWORD_RESET,
        to: subscriberId,
        payload: {
          firstName: firstName || "there",
          resetUrl,
          expiresIn,
          baseUrl: this.getBaseUrl(),
          htmlContent, // Pass branded HTML to Novu workflow
        },
      });

      this.logger.log(`Password reset email sent to: ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send password reset email: ${error.message}`);
      
      // Fallback: Log the reset URL for development
      if (!this.enabled) {
        this.logger.log(`[DEV] Password reset URL for ${to}: ${resetUrl}`);
        return true;
      }
      return false;
    }
  }

  /**
   * Send email verification email with custom link
   */
  async sendVerificationEmail(options: VerificationEmailOptions): Promise<boolean> {
    const { to, firstName, verifyUrl } = options;
    const expiresIn = "24 hours";

    // Generate branded HTML template
    const htmlContent = this.emailTemplates?.emailVerification({
      firstName: firstName || "there",
      verifyUrl,
      expiresIn,
    });

    try {
      const subscriberId = `verify-${Date.now()}-${to.replace(/[^a-z0-9]/gi, '')}`;
      
      await this.upsertSubscriber({
        subscriberId,
        email: to,
        firstName: firstName || "User",
      });

      await this.trigger({
        workflowId: NovuWorkflows.EMAIL_VERIFICATION,
        to: subscriberId,
        payload: {
          firstName: firstName || "there",
          verifyUrl,
          expiresIn,
          baseUrl: this.getBaseUrl(),
          htmlContent, // Pass branded HTML to Novu workflow
        },
      });

      this.logger.log(`Verification email sent to: ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send verification email: ${error.message}`);
      
      if (!this.enabled) {
        this.logger.log(`[DEV] Verification URL for ${to}: ${verifyUrl}`);
        return true;
      }
      return false;
    }
  }

  /**
   * Send MFA enabled confirmation email
   */
  async sendMFAEnabledEmail(options: MFAEnabledEmailOptions): Promise<boolean> {
    const { to, firstName, timestamp } = options;

    // Generate branded HTML template
    const htmlContent = this.emailTemplates?.mfaEnabled({
      firstName: firstName || "there",
      timestamp: timestamp.toISOString(),
    });

    try {
      const subscriberId = `mfa-${Date.now()}-${to.replace(/[^a-z0-9]/gi, '')}`;
      
      await this.upsertSubscriber({
        subscriberId,
        email: to,
        firstName: firstName || "User",
      });

      await this.trigger({
        workflowId: NovuWorkflows.MFA_ENABLED,
        to: subscriberId,
        payload: {
          firstName: firstName || "there",
          timestamp: timestamp.toISOString(),
          securityUrl: `${this.getBaseUrl()}/app/settings`,
          htmlContent, // Pass branded HTML to Novu workflow
        },
      });

      this.logger.log(`MFA enabled email sent to: ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send MFA enabled email: ${error.message}`);
      return false;
    }
  }

  /**
   * Send password changed security alert email (INotificationService implementation)
   */
  async sendPasswordChangedEmail(
    userId: string,
    data: { email: string; firstName: string; timestamp: Date }
  ): Promise<void> {
    // Generate branded HTML template
    const htmlContent = this.emailTemplates?.passwordChanged({
      firstName: data.firstName || "there",
      timestamp: data.timestamp.toISOString(),
    });

    await this.sendPasswordChanged(userId, {
      email: data.email,
      firstName: data.firstName,
      timestamp: data.timestamp,
    });
  }

  /**
   * Send welcome email (INotificationService implementation)
   */
  async sendWelcomeEmail(
    userId: string,
    data: { email: string; firstName: string; organizationName?: string }
  ): Promise<void> {
    await this.sendWelcome(userId, data);
  }

  /**
   * Send login new device alert (INotificationService implementation)
   */
  async sendLoginNewDeviceAlert(
    userId: string,
    data: {
      device: string;
      browser: string;
      ipAddress: string;
      location?: string;
      timestamp: Date;
    }
  ): Promise<void> {
    await this.sendLoginNewDevice(userId, data);
  }

  /**
   * Send payment failed notification (INotificationService implementation)
   */
  async sendPaymentFailedNotification(
    userId: string,
    data: { amount: string; currency: string; cardLast4: string }
  ): Promise<void> {
    await this.sendPaymentFailed(userId, data);
  }

  /**
   * Send trial ending reminder (INotificationService implementation)
   */
  async sendTrialEndingReminder(
    userId: string,
    data: { daysLeft: number; trialEndDate: Date; planName: string }
  ): Promise<void> {
    await this.sendTrialEnding(userId, data);
  }

  // ---------------------------------------------------------------------------
  // Convenience Methods - Account Notifications
  // ---------------------------------------------------------------------------

  async sendWelcome(
    userId: string,
    data: {
      email: string;
      firstName: string;
      organizationName?: string;
    },
  ): Promise<void> {
    await this.upsertSubscriber({
      subscriberId: userId,
      email: data.email,
      firstName: data.firstName,
    });

    await this.trigger({
      workflowId: NovuWorkflows.WELCOME,
      to: userId,
      payload: {
        firstName: data.firstName,
        organizationName: data.organizationName || "PlainLedger",
        loginUrl: `${this.getBaseUrl()}/login`,
        connectionUrl: `${this.getBaseUrl()}/app/connections`,
      },
    });
  }

  async sendPasswordChanged(
    userId: string,
    data: {
      email: string;
      firstName: string;
      ipAddress?: string;
      timestamp: Date;
    },
  ): Promise<void> {
    await this.trigger({
      workflowId: NovuWorkflows.PASSWORD_CHANGED,
      to: userId,
      payload: {
        firstName: data.firstName,
        ipAddress: data.ipAddress || "Unknown",
        timestamp: data.timestamp.toISOString(),
        securityUrl: `${this.getBaseUrl()}/app/settings`,
      },
    });
  }

  async sendOnboardingComplete(
    userId: string,
    data: {
      firstName: string;
      organizationName: string;
      connectionsCount: number;
    },
  ): Promise<void> {
    await this.trigger({
      workflowId: NovuWorkflows.ONBOARDING_COMPLETE,
      to: userId,
      payload: {
        firstName: data.firstName,
        organizationName: data.organizationName,
        connectionsCount: data.connectionsCount,
        dashboardUrl: `${this.getBaseUrl()}/app/dashboard`,
        reportsUrl: `${this.getBaseUrl()}/app/reports`,
        helpUrl: `${this.getBaseUrl()}/help`,
      },
    });
  }

  async sendFirstConnection(
    userId: string,
    data: {
      firstName: string;
      providerName: string;
    },
  ): Promise<void> {
    await this.trigger({
      workflowId: NovuWorkflows.FIRST_CONNECTION,
      to: userId,
      payload: {
        firstName: data.firstName,
        providerName: data.providerName,
        dashboardUrl: `${this.getBaseUrl()}/app/dashboard`,
        reportsUrl: `${this.getBaseUrl()}/app/reports`,
      },
    });
  }

  async sendFirstReport(
    userId: string,
    data: {
      firstName: string;
      reportType: string;
      reportUrl: string;
    },
  ): Promise<void> {
    await this.trigger({
      workflowId: NovuWorkflows.FIRST_REPORT,
      to: userId,
      payload: {
        firstName: data.firstName,
        reportType: data.reportType,
        reportUrl: data.reportUrl,
        dashboardUrl: `${this.getBaseUrl()}/app/dashboard`,
      },
    });
  }

  async sendTwoFactorEnabled(
    userId: string,
    data: {
      firstName: string;
      timestamp: Date;
    },
  ): Promise<void> {
    await this.trigger({
      workflowId: NovuWorkflows.TWO_FACTOR_ENABLED,
      to: userId,
      payload: {
        firstName: data.firstName,
        timestamp: data.timestamp.toISOString(),
        securityUrl: `${this.getBaseUrl()}/app/settings`,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Security Notifications
  // ---------------------------------------------------------------------------

  async sendLoginNewDevice(
    userId: string,
    data: {
      device: string;
      browser: string;
      ipAddress: string;
      location?: string;
      timestamp: Date;
    },
  ): Promise<void> {
    await this.trigger({
      workflowId: NovuWorkflows.LOGIN_NEW_DEVICE,
      to: userId,
      payload: {
        device: data.device,
        browser: data.browser,
        ipAddress: data.ipAddress,
        location: data.location || "Unknown",
        timestamp: data.timestamp.toISOString(),
        securityUrl: `${this.getBaseUrl()}/app/settings`,
      },
    });
  }

  async sendSuspiciousActivity(
    userId: string,
    data: {
      activity: string;
      ipAddress: string;
      timestamp: Date;
    },
  ): Promise<void> {
    await this.trigger({
      workflowId: NovuWorkflows.SUSPICIOUS_ACTIVITY,
      to: userId,
      payload: {
        activity: data.activity,
        ipAddress: data.ipAddress,
        timestamp: data.timestamp.toISOString(),
        securityUrl: `${this.getBaseUrl()}/app/settings`,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Billing Notifications
  // ---------------------------------------------------------------------------

  async sendPaymentFailed(
    userId: string,
    data: {
      amount: string;
      currency: string;
      cardLast4: string;
      retryDate?: string;
    },
  ): Promise<void> {
    await this.trigger({
      workflowId: NovuWorkflows.PAYMENT_FAILED,
      to: userId,
      payload: {
        amount: data.amount,
        currency: data.currency,
        cardLast4: data.cardLast4,
        retryDate: data.retryDate,
        updatePaymentUrl: `${this.getBaseUrl()}/app/settings`,
      },
    });
  }

  async sendTrialEnding(
    userId: string,
    data: {
      daysLeft: number;
      trialEndDate: Date;
      planName: string;
    },
  ): Promise<void> {
    await this.trigger({
      workflowId: NovuWorkflows.TRIAL_ENDING,
      to: userId,
      payload: {
        daysLeft: data.daysLeft,
        trialEndDate: data.trialEndDate.toISOString(),
        planName: data.planName,
        subscribeUrl: `${this.getBaseUrl()}/app/settings`,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Trial & Conversion Notifications
  // ---------------------------------------------------------------------------

  async sendTrialReminder(
    userId: string,
    data: {
      firstName: string;
      daysLeft: number;
      reportsGenerated: number;
      anomaliesDetected: number;
      planName: string;
      price: number;
      specialOfferCode?: string;
      specialOfferDiscount?: number;
    },
  ): Promise<void> {
    await this.trigger({
      workflowId: NovuWorkflows.TRIAL_REMINDER,
      to: userId,
      payload: {
        firstName: data.firstName,
        daysLeft: data.daysLeft,
        reportsGenerated: data.reportsGenerated,
        anomaliesDetected: data.anomaliesDetected,
        timeSaved: Math.round(data.reportsGenerated * 0.5),
        planName: data.planName,
        price: data.price,
        specialOfferCode: data.specialOfferCode,
        specialOfferDiscount: data.specialOfferDiscount,
        upgradeUrl: `${this.getBaseUrl()}/app/settings?tab=subscription${data.specialOfferCode ? `&code=${data.specialOfferCode}` : ""}`,
      },
    });
  }

  async sendTrialExpiredNotification(
    userId: string,
    data: {
      firstName: string;
      reportsGenerated: number;
      anomaliesDetected: number;
      planName: string;
      winbackCode: string;
      winbackDiscount: number;
      winbackMonths: number;
      expiresAt: Date;
    },
  ): Promise<void> {
    await this.trigger({
      workflowId: NovuWorkflows.TRIAL_EXPIRED,
      to: userId,
      payload: {
        firstName: data.firstName,
        reportsGenerated: data.reportsGenerated,
        anomaliesDetected: data.anomaliesDetected,
        moneySaved: Math.round(data.anomaliesDetected * 500),
        planName: data.planName,
        winbackCode: data.winbackCode,
        winbackDiscount: data.winbackDiscount,
        winbackMonths: data.winbackMonths,
        expiresAt: data.expiresAt.toISOString(),
        upgradeUrl: `${this.getBaseUrl()}/app/settings?tab=subscription&code=${data.winbackCode}`,
      },
    });
  }

  async sendFeatureUnlock(
    userId: string,
    data: {
      firstName: string;
      featureName: string;
      featureDescription: string;
      planName: string;
      price: number;
    },
  ): Promise<void> {
    await this.trigger({
      workflowId: NovuWorkflows.FEATURE_UNLOCK,
      to: userId,
      payload: {
        firstName: data.firstName,
        featureName: data.featureName,
        featureDescription: data.featureDescription,
        planName: data.planName,
        price: data.price,
        upgradeUrl: `${this.getBaseUrl()}/app/settings?tab=subscription`,
        featuresUrl: `${this.getBaseUrl()}/pricing`,
      },
    });
  }

  async sendUsageMilestoneNotification(
    userId: string,
    data: {
      firstName: string;
      milestoneValue: number;
      milestoneLabel: string;
      timeSaved: number;
      issuesFound: number;
      moneySaved: number;
      planName: string;
    },
  ): Promise<void> {
    await this.trigger({
      workflowId: NovuWorkflows.USAGE_MILESTONE,
      to: userId,
      payload: {
        firstName: data.firstName,
        milestoneValue: data.milestoneValue,
        milestoneLabel: data.milestoneLabel,
        timeSaved: data.timeSaved,
        issuesFound: data.issuesFound,
        moneySaved: data.moneySaved,
        planName: data.planName,
        upgradeUrl: `${this.getBaseUrl()}/app/settings?tab=subscription`,
      },
    });
  }

  async sendInvoiceCreated(
    userId: string,
    data: {
      invoiceNumber: string;
      amount: string;
      currency: string;
      dueDate: Date;
      downloadUrl: string;
    },
  ): Promise<void> {
    await this.trigger({
      workflowId: NovuWorkflows.INVOICE_CREATED,
      to: userId,
      payload: {
        invoiceNumber: data.invoiceNumber,
        amount: data.amount,
        currency: data.currency,
        dueDate: data.dueDate.toISOString(),
        downloadUrl: data.downloadUrl,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Data & Reports Notifications
  // ---------------------------------------------------------------------------

  async sendSyncFailed(
    userId: string,
    data: {
      provider: string;
      error: string;
      timestamp: Date;
    },
  ): Promise<void> {
    await this.trigger({
      workflowId: NovuWorkflows.SYNC_FAILED,
      to: userId,
      payload: {
        provider: data.provider,
        error: data.error,
        timestamp: data.timestamp.toISOString(),
        connectionUrl: `${this.getBaseUrl()}/app/connections`,
      },
    });
  }

  async sendReportGenerated(
    userId: string,
    data: {
      reportName: string;
      reportType: string;
      downloadUrl: string;
    },
  ): Promise<void> {
    await this.trigger({
      workflowId: NovuWorkflows.REPORT_GENERATED,
      to: userId,
      payload: {
        reportName: data.reportName,
        reportType: data.reportType,
        downloadUrl: data.downloadUrl,
        viewUrl: `${this.getBaseUrl()}/app/reports`,
      },
    });
  }

  async sendConnectionError(
    userId: string,
    data: {
      provider: string;
      error: string;
      actionRequired: boolean;
    },
  ): Promise<void> {
    await this.trigger({
      workflowId: NovuWorkflows.CONNECTION_ERROR,
      to: userId,
      payload: {
        provider: data.provider,
        error: data.error,
        actionRequired: data.actionRequired,
        connectionUrl: `${this.getBaseUrl()}/app/connections`,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Team Notifications
  // ---------------------------------------------------------------------------

  async sendTeamInvitation(data: {
    inviteeEmail: string;
    inviterName: string;
    organizationName: string;
    role: string;
    inviteUrl: string;
  }): Promise<void> {
    // Create a temporary subscriber for the invitee
    const tempSubscriberId = `invite-${Date.now()}`;

    await this.upsertSubscriber({
      subscriberId: tempSubscriberId,
      email: data.inviteeEmail,
    });

    await this.trigger({
      workflowId: NovuWorkflows.TEAM_MEMBER_INVITED,
      to: tempSubscriberId,
      payload: {
        inviterName: data.inviterName,
        organizationName: data.organizationName,
        role: data.role,
        inviteUrl: data.inviteUrl,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Contact Form
  // ---------------------------------------------------------------------------

  async sendContactFormNotification(data: {
    name: string;
    email: string;
    subject: string;
    message: string;
    source?: string;
  }): Promise<void> {
    // Create temporary subscriber for internal notification
    const internalSubscriberId = "plainledger-info";

    await this.upsertSubscriber({
      subscriberId: internalSubscriberId,
      email: "info@plainledger.ca",
      firstName: "PlainLedger",
      lastName: "Support",
    });

    // Send notification to info@plainledger.ca
    await this.trigger({
      workflowId: NovuWorkflows.CONTACT_FORM,
      to: internalSubscriberId,
      payload: {
        name: data.name,
        email: data.email,
        subject: data.subject,
        message: data.message,
        source: data.source || "website",
        timestamp: new Date().toISOString(),
      },
    });

    // Send auto-reply to the person who submitted the form
    const senderSubscriberId = `contact-${Date.now()}`;

    await this.upsertSubscriber({
      subscriberId: senderSubscriberId,
      email: data.email,
      firstName: data.name,
    });

    await this.trigger({
      workflowId: NovuWorkflows.CONTACT_FORM_AUTO_REPLY,
      to: senderSubscriberId,
      payload: {
        name: data.name,
        subject: data.subject,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Onboarding
  // ---------------------------------------------------------------------------

  async sendOnboardingCompleteNotification(data: {
    email: string;
    companyName: string;
    companySize?: string;
    industry?: string;
    fiscalYearEnd?: number;
    currency?: string;
    primarySource?: string;
    skipSource?: boolean;
    teamEmails?: string[];
    skipTeam?: boolean;
  }): Promise<void> {
    const internalSubscriberId = "plainledger-info";

    await this.upsertSubscriber({
      subscriberId: internalSubscriberId,
      email: "info@plainledger.ca",
      firstName: "PlainLedger",
      lastName: "Support",
    });

    // Send notification to info@plainledger.ca
    await this.trigger({
      workflowId: NovuWorkflows.ONBOARDING_COMPLETE,
      to: internalSubscriberId,
      payload: {
        email: data.email,
        companyName: data.companyName,
        companySize: data.companySize || "N/A",
        industry: data.industry || "N/A",
        fiscalYearEnd: data.fiscalYearEnd || 12,
        currency: data.currency || "CAD",
        primarySource:
          data.primarySource || (data.skipSource ? "Skipped" : "N/A"),
        teamEmails:
          data.teamEmails?.join(", ") || (data.skipTeam ? "Skipped" : "None"),
      },
    });

    // TODO: Store in database (create onboarding_data table or extend organization table)
    this.logger.log(
      `Onboarding data for ${data.email}: ${JSON.stringify(data)}`,
    );
  }

  // ---------------------------------------------------------------------------
  // System Notifications
  // ---------------------------------------------------------------------------

  async sendMaintenanceNotice(
    userIds: string[],
    data: {
      date: Date;
      startTime: string;
      endTime: string;
      description: string;
    },
  ): Promise<void> {
    for (const userId of userIds) {
      await this.trigger({
        workflowId: NovuWorkflows.SYSTEM_MAINTENANCE,
        to: userId,
        payload: {
          date: data.date.toISOString(),
          startTime: data.startTime,
          endTime: data.endTime,
          description: data.description,
        },
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Internal Methods
  // ---------------------------------------------------------------------------

  private async request(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE",
    body?: unknown,
  ): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        Authorization: `ApiKey ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Novu API error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  private getBaseUrl(): string {
    return (
      this.configService.get<string>("APP_URL") || "https://app.plainledger.ca"
    );
  }
}

// ============================================================================
// Module
// ============================================================================

import { Module } from "@nestjs/common";

@Module({
  providers: [NovuService],
  exports: [NovuService],
})
export class NovuModule {}
