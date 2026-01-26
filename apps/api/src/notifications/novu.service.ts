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

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
  // Account
  WELCOME: 'welcome',
  EMAIL_VERIFIED: 'email-verified',
  PASSWORD_CHANGED: 'password-changed',
  ACCOUNT_DEACTIVATED: 'account-deactivated',
  ACCOUNT_REACTIVATED: 'account-reactivated',
  
  // Security
  LOGIN_NEW_DEVICE: 'login-new-device',
  LOGIN_NEW_LOCATION: 'login-new-location',
  LOGIN_FAILED_ATTEMPTS: 'login-failed-attempts',
  TWO_FACTOR_ENABLED: 'two-factor-enabled',
  TWO_FACTOR_DISABLED: 'two-factor-disabled',
  SUSPICIOUS_ACTIVITY: 'suspicious-activity',
  
  // Billing
  SUBSCRIPTION_CREATED: 'subscription-created',
  SUBSCRIPTION_UPGRADED: 'subscription-upgraded',
  SUBSCRIPTION_DOWNGRADED: 'subscription-downgraded',
  SUBSCRIPTION_CANCELLED: 'subscription-cancelled',
  PAYMENT_SUCCEEDED: 'payment-succeeded',
  PAYMENT_FAILED: 'payment-failed',
  PAYMENT_METHOD_EXPIRING: 'payment-method-expiring',
  INVOICE_CREATED: 'invoice-created',
  TRIAL_ENDING: 'trial-ending',
  USAGE_LIMIT_WARNING: 'usage-limit-warning',
  USAGE_LIMIT_REACHED: 'usage-limit-reached',
  
  // Data Sync
  SYNC_COMPLETED: 'sync-completed',
  SYNC_FAILED: 'sync-failed',
  DATA_IMPORT_COMPLETED: 'data-import-completed',
  DATA_EXPORT_READY: 'data-export-ready',
  
  // Reports
  REPORT_GENERATED: 'report-generated',
  REPORT_FAILED: 'report-failed',
  REPORT_SHARED: 'report-shared',
  
  // Connections
  CONNECTION_ADDED: 'connection-added',
  CONNECTION_ERROR: 'connection-error',
  CONNECTION_REAUTHORIZATION: 'connection-reauthorization',
  
  // System
  SYSTEM_MAINTENANCE: 'system-maintenance',
  FEATURE_ANNOUNCEMENT: 'feature-announcement',
  
  // Team
  TEAM_MEMBER_INVITED: 'team-member-invited',
  TEAM_ROLE_CHANGED: 'team-role-changed',
} as const;

type WorkflowId = typeof NovuWorkflows[keyof typeof NovuWorkflows];

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class NovuService implements OnModuleInit {
  private readonly logger = new Logger(NovuService.name);
  private apiKey: string;
  private appId: string;
  private baseUrl = 'https://api.novu.co/v1';
  private enabled = false;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.apiKey = this.configService.get<string>('NOVU_API_KEY') || '';
    this.appId = this.configService.get<string>('NOVU_APP_ID') || '';
    
    if (this.apiKey && this.appId) {
      this.enabled = true;
      this.logger.log('Novu notification service initialized');
    } else {
      this.logger.warn('Novu API key or App ID not configured - notifications disabled');
    }
  }

  // ---------------------------------------------------------------------------
  // Core Methods
  // ---------------------------------------------------------------------------

  /**
   * Create or update a subscriber in Novu
   */
  async upsertSubscriber(subscriber: NovuSubscriber): Promise<void> {
    if (!this.enabled) {
      this.logger.debug('Novu disabled, skipping subscriber upsert');
      return;
    }

    try {
      await this.request(`/subscribers/${subscriber.subscriberId}`, 'PUT', {
        email: subscriber.email,
        firstName: subscriber.firstName,
        lastName: subscriber.lastName,
        phone: subscriber.phone,
        locale: subscriber.locale || 'fr',
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
  async trigger(params: NovuTriggerPayload): Promise<{ transactionId: string }> {
    if (!this.enabled) {
      this.logger.debug(`Novu disabled, skipping trigger: ${params.workflowId}`);
      return { transactionId: 'disabled' };
    }

    try {
      const subscriberId = typeof params.to === 'string' 
        ? params.to 
        : params.to.subscriberId;

      const response = await this.request('/events/trigger', 'POST', {
        name: params.workflowId,
        to: { subscriberId },
        payload: params.payload,
        overrides: params.overrides,
      });

      this.logger.debug(`Notification triggered: ${params.workflowId} -> ${subscriberId}`);
      return { transactionId: response.data?.transactionId || 'unknown' };
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
      await this.request(`/subscribers/${subscriberId}`, 'DELETE');
      this.logger.debug(`Subscriber deleted: ${subscriberId}`);
    } catch (error) {
      this.logger.error(`Failed to delete subscriber: ${error.message}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Convenience Methods - Account Notifications
  // ---------------------------------------------------------------------------

  async sendWelcome(userId: string, data: { 
    email: string; 
    firstName: string;
    organizationName?: string;
  }): Promise<void> {
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
        organizationName: data.organizationName || 'PlainLedger',
        loginUrl: `${this.getBaseUrl()}/login`,
        connectionUrl: `${this.getBaseUrl()}/app/connections`,
      },
    });
  }

  async sendPasswordChanged(userId: string, data: {
    email: string;
    firstName: string;
    ipAddress?: string;
    timestamp: Date;
  }): Promise<void> {
    await this.trigger({
      workflowId: NovuWorkflows.PASSWORD_CHANGED,
      to: userId,
      payload: {
        firstName: data.firstName,
        ipAddress: data.ipAddress || 'Unknown',
        timestamp: data.timestamp.toISOString(),
        securityUrl: `${this.getBaseUrl()}/app/settings`,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Security Notifications
  // ---------------------------------------------------------------------------

  async sendLoginNewDevice(userId: string, data: {
    device: string;
    browser: string;
    ipAddress: string;
    location?: string;
    timestamp: Date;
  }): Promise<void> {
    await this.trigger({
      workflowId: NovuWorkflows.LOGIN_NEW_DEVICE,
      to: userId,
      payload: {
        device: data.device,
        browser: data.browser,
        ipAddress: data.ipAddress,
        location: data.location || 'Unknown',
        timestamp: data.timestamp.toISOString(),
        securityUrl: `${this.getBaseUrl()}/app/settings`,
      },
    });
  }

  async sendSuspiciousActivity(userId: string, data: {
    activity: string;
    ipAddress: string;
    timestamp: Date;
  }): Promise<void> {
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

  async sendPaymentFailed(userId: string, data: {
    amount: string;
    currency: string;
    cardLast4: string;
    retryDate?: string;
  }): Promise<void> {
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

  async sendTrialEnding(userId: string, data: {
    daysLeft: number;
    trialEndDate: Date;
    planName: string;
  }): Promise<void> {
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

  async sendInvoiceCreated(userId: string, data: {
    invoiceNumber: string;
    amount: string;
    currency: string;
    dueDate: Date;
    downloadUrl: string;
  }): Promise<void> {
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

  async sendSyncFailed(userId: string, data: {
    provider: string;
    error: string;
    timestamp: Date;
  }): Promise<void> {
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

  async sendReportGenerated(userId: string, data: {
    reportName: string;
    reportType: string;
    downloadUrl: string;
  }): Promise<void> {
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

  async sendConnectionError(userId: string, data: {
    provider: string;
    error: string;
    actionRequired: boolean;
  }): Promise<void> {
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
  // System Notifications
  // ---------------------------------------------------------------------------

  async sendMaintenanceNotice(userIds: string[], data: {
    date: Date;
    startTime: string;
    endTime: string;
    description: string;
  }): Promise<void> {
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
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    body?: unknown,
  ): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Authorization': `ApiKey ${this.apiKey}`,
        'Content-Type': 'application/json',
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
    return this.configService.get<string>('APP_URL') || 'https://app.plainledger.ca';
  }
}

// ============================================================================
// Module
// ============================================================================

import { Module } from '@nestjs/common';

@Module({
  providers: [NovuService],
  exports: [NovuService],
})
export class NovuModule {}
