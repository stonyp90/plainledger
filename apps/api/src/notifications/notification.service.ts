/**
 * PlainLedger Notification Service
 * Handles all notification delivery across channels
 */

import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';

// ============================================================================
// Types
// ============================================================================

export type NotificationChannel = 'in_app' | 'email' | 'push' | 'sms';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export type NotificationCategory = 
  | 'account'
  | 'security'
  | 'billing'
  | 'data_sync'
  | 'reports'
  | 'connections'
  | 'system'
  | 'marketing';

export interface NotificationPayload {
  userId: string;
  type: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  channels: NotificationChannel[];
  actionUrl?: string;
  actionLabel?: string;
}

export interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  data: Record<string, unknown>;
}

export interface UserNotificationPreferences {
  enabled: boolean;
  channels: {
    [K in NotificationCategory]: {
      in_app: boolean;
      email: boolean;
      push: boolean;
      sms: boolean;
    };
  };
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

// ============================================================================
// Notification Service
// ============================================================================

export class NotificationService {
  private templatesDir: string;
  private baseTemplate: Handlebars.TemplateDelegate | null = null;
  private emailTemplates: Map<string, Handlebars.TemplateDelegate> = new Map();

  constructor() {
    this.templatesDir = path.join(__dirname, '../templates/emails');
    this.loadTemplates();
  }

  // --------------------------------------------------------------------------
  // Template Loading
  // --------------------------------------------------------------------------

  private loadTemplates(): void {
    try {
      // Load base template
      const basePath = path.join(this.templatesDir, 'base.html');
      if (fs.existsSync(basePath)) {
        const baseSource = fs.readFileSync(basePath, 'utf-8');
        this.baseTemplate = Handlebars.compile(baseSource);
      }

      // Load all email templates
      const templateFiles = fs.readdirSync(this.templatesDir);
      for (const file of templateFiles) {
        if (file !== 'base.html' && file.endsWith('.html')) {
          const templateName = path.basename(file, '.html');
          const templatePath = path.join(this.templatesDir, file);
          const templateSource = fs.readFileSync(templatePath, 'utf-8');
          this.emailTemplates.set(templateName, Handlebars.compile(templateSource));
        }
      }

      console.log(`Loaded ${this.emailTemplates.size} email templates`);
    } catch (error) {
      console.error('Failed to load email templates:', error);
    }
  }

  // --------------------------------------------------------------------------
  // Send Notification
  // --------------------------------------------------------------------------

  async send(payload: NotificationPayload): Promise<void> {
    const { userId, channels } = payload;

    // Get user preferences (from database in real implementation)
    const preferences = await this.getUserPreferences(userId);

    if (!preferences.enabled) {
      console.log(`Notifications disabled for user ${userId}`);
      return;
    }

    // Check quiet hours
    if (this.isQuietHours(preferences)) {
      // Queue for later if not urgent
      if (payload.priority !== 'urgent') {
        console.log(`Quiet hours active, queuing notification for user ${userId}`);
        await this.queueNotification(payload);
        return;
      }
    }

    // Send to each channel
    const sendPromises: Promise<void>[] = [];

    for (const channel of channels) {
      if (this.shouldSendToChannel(payload, preferences, channel)) {
        switch (channel) {
          case 'in_app':
            sendPromises.push(this.sendInApp(payload));
            break;
          case 'email':
            sendPromises.push(this.sendEmail(payload));
            break;
          case 'push':
            sendPromises.push(this.sendPush(payload));
            break;
          case 'sms':
            sendPromises.push(this.sendSms(payload));
            break;
        }
      }
    }

    await Promise.allSettled(sendPromises);
  }

  // --------------------------------------------------------------------------
  // Channel Handlers
  // --------------------------------------------------------------------------

  private async sendInApp(payload: NotificationPayload): Promise<void> {
    // Save to database
    console.log(`[IN_APP] Sending to user ${payload.userId}: ${payload.title}`);
    
    // In real implementation:
    // 1. Save notification to database
    // 2. Emit via WebSocket to connected clients
    // 3. Update unread count
    
    // Example database save:
    // await this.notificationRepository.save({
    //   userId: payload.userId,
    //   type: payload.type,
    //   title: payload.title,
    //   message: payload.message,
    //   data: payload.data,
    //   read: false,
    //   createdAt: new Date(),
    // });
  }

  private async sendEmail(payload: NotificationPayload): Promise<void> {
    console.log(`[EMAIL] Sending to user ${payload.userId}: ${payload.title}`);
    
    // Get user email (from database in real implementation)
    const userEmail = await this.getUserEmail(payload.userId);
    if (!userEmail) {
      console.error(`No email found for user ${payload.userId}`);
      return;
    }

    // Generate email HTML
    const templateName = this.getEmailTemplateName(payload.type);
    const emailHtml = this.renderEmail(templateName, {
      subject: payload.title,
      firstName: payload.data?.firstName || 'Utilisateur',
      ...payload.data,
      baseUrl: process.env.APP_URL || 'http://localhost:5173',
      year: new Date().getFullYear(),
    });

    // Send email (using nodemailer, AWS SES, SendGrid, etc.)
    // Example with nodemailer:
    // await this.mailer.sendMail({
    //   to: userEmail,
    //   subject: payload.title,
    //   html: emailHtml,
    // });
  }

  private async sendPush(payload: NotificationPayload): Promise<void> {
    console.log(`[PUSH] Sending to user ${payload.userId}: ${payload.title}`);
    
    // Get user's push subscriptions from database
    // Send via web-push or Firebase Cloud Messaging
    
    // Example:
    // const subscriptions = await this.pushSubscriptionRepository.findByUserId(payload.userId);
    // for (const sub of subscriptions) {
    //   await webpush.sendNotification(sub, JSON.stringify({
    //     title: payload.title,
    //     body: payload.message,
    //     icon: '/icon-192.png',
    //     badge: '/badge-72.png',
    //     data: { url: payload.actionUrl },
    //   }));
    // }
  }

  private async sendSms(payload: NotificationPayload): Promise<void> {
    console.log(`[SMS] Sending to user ${payload.userId}: ${payload.title}`);
    
    // Only send SMS for urgent/security notifications
    if (payload.priority !== 'urgent' && payload.category !== 'security') {
      return;
    }

    // Get user's phone number
    const phoneNumber = await this.getUserPhone(payload.userId);
    if (!phoneNumber) {
      console.error(`No phone number found for user ${payload.userId}`);
      return;
    }

    // Send via Twilio, AWS SNS, etc.
    // Example:
    // await this.twilioClient.messages.create({
    //   to: phoneNumber,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    //   body: `PlainLedger: ${payload.message}`,
    // });
  }

  // --------------------------------------------------------------------------
  // Email Rendering
  // --------------------------------------------------------------------------

  private renderEmail(templateName: string, data: Record<string, unknown>): string {
    const contentTemplate = this.emailTemplates.get(templateName);
    
    if (!contentTemplate) {
      console.warn(`Email template '${templateName}' not found, using default`);
      return this.renderDefaultEmail(data);
    }

    // Render content
    const content = contentTemplate(data);

    // Wrap in base template if available
    if (this.baseTemplate) {
      return this.baseTemplate({ ...data, content });
    }

    return content;
  }

  private renderDefaultEmail(data: Record<string, unknown>): string {
    if (this.baseTemplate) {
      const content = `
        <h1 class="email-title">${data.subject || 'Notification'}</h1>
        <p class="email-text">${data.message || ''}</p>
        ${data.actionUrl ? `
          <div style="text-align: center; margin: 32px 0;">
            <a href="${data.actionUrl}" class="email-button">
              ${data.actionLabel || 'Voir les détails'}
            </a>
          </div>
        ` : ''}
      `;
      return this.baseTemplate({ ...data, content });
    }

    // Fallback plain HTML
    return `
      <!DOCTYPE html>
      <html>
        <body>
          <h1>${data.subject || 'Notification'}</h1>
          <p>${data.message || ''}</p>
        </body>
      </html>
    `;
  }

  private getEmailTemplateName(notificationType: string): string {
    // Map notification types to email templates
    const templateMap: Record<string, string> = {
      welcome: 'welcome',
      password_changed: 'password_changed',
      payment_failed: 'payment_failed',
      payment_succeeded: 'payment_receipt',
      connection_error: 'connection_error',
      connection_reauthorization_required: 'connection_error',
      report_generated: 'report_generated',
      sync_failed: 'connection_error',
      // Add more mappings as needed
    };

    return templateMap[notificationType] || 'default';
  }

  // --------------------------------------------------------------------------
  // Helper Methods
  // --------------------------------------------------------------------------

  private shouldSendToChannel(
    payload: NotificationPayload,
    preferences: UserNotificationPreferences,
    channel: NotificationChannel
  ): boolean {
    const categoryPrefs = preferences.channels[payload.category];
    if (!categoryPrefs) return false;
    return categoryPrefs[channel] === true;
  }

  private isQuietHours(preferences: UserNotificationPreferences): boolean {
    if (!preferences.quietHoursEnabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = preferences.quietHoursStart.split(':').map(Number);
    const [endHour, endMin] = preferences.quietHoursEnd.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime < endTime) {
      return currentTime >= startTime && currentTime < endTime;
    } else {
      // Spans midnight
      return currentTime >= startTime || currentTime < endTime;
    }
  }

  private async queueNotification(payload: NotificationPayload): Promise<void> {
    // Queue notification for later delivery
    // Could use Redis, database queue, or message broker
    console.log(`Queued notification for user ${payload.userId}`);
  }

  // --------------------------------------------------------------------------
  // Database Methods (Stubs - implement with actual database)
  // --------------------------------------------------------------------------

  private async getUserPreferences(userId: string): Promise<UserNotificationPreferences> {
    // Fetch from database
    // For now, return default preferences
    return {
      enabled: true,
      channels: {
        account: { in_app: true, email: true, push: false, sms: false },
        security: { in_app: true, email: true, push: true, sms: true },
        billing: { in_app: true, email: true, push: false, sms: false },
        data_sync: { in_app: true, email: false, push: false, sms: false },
        reports: { in_app: true, email: true, push: false, sms: false },
        connections: { in_app: true, email: true, push: false, sms: false },
        system: { in_app: true, email: true, push: false, sms: false },
        marketing: { in_app: true, email: false, push: false, sms: false },
      },
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
    };
  }

  private async getUserEmail(userId: string): Promise<string | null> {
    // Fetch from database
    return 'user@example.com';
  }

  private async getUserPhone(userId: string): Promise<string | null> {
    // Fetch from database
    return null;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const notificationService = new NotificationService();

// ============================================================================
// Convenience Methods
// ============================================================================

export async function sendNotification(payload: NotificationPayload): Promise<void> {
  return notificationService.send(payload);
}

export async function sendWelcomeNotification(userId: string, firstName: string): Promise<void> {
  return notificationService.send({
    userId,
    type: 'welcome',
    category: 'account',
    priority: 'medium',
    title: 'Bienvenue sur PlainLedger!',
    message: `Bienvenue ${firstName}! Commencez par connecter votre logiciel comptable.`,
    channels: ['in_app', 'email'],
    data: { firstName },
    actionUrl: '/app/connections',
    actionLabel: 'Connecter un compte',
  });
}

export async function sendPasswordChangedNotification(
  userId: string, 
  data: { firstName: string; device: string; location: string }
): Promise<void> {
  return notificationService.send({
    userId,
    type: 'password_changed',
    category: 'security',
    priority: 'high',
    title: 'Votre mot de passe a été modifié',
    message: 'Votre mot de passe PlainLedger a été changé. Si ce n\'était pas vous, contactez le support.',
    channels: ['in_app', 'email'],
    data: {
      ...data,
      date: new Date().toLocaleString('fr-CA'),
    },
  });
}

export async function sendPaymentFailedNotification(
  userId: string,
  data: { firstName: string; amount: string; lastFour: string; failureReason: string }
): Promise<void> {
  return notificationService.send({
    userId,
    type: 'payment_failed',
    category: 'billing',
    priority: 'urgent',
    title: 'Échec de paiement',
    message: `Votre paiement de ${data.amount} a échoué. Veuillez mettre à jour votre méthode de paiement.`,
    channels: ['in_app', 'email'],
    data,
    actionUrl: '/app/settings?tab=billing',
    actionLabel: 'Mettre à jour',
  });
}

export async function sendReportGeneratedNotification(
  userId: string,
  data: { firstName: string; reportName: string; reportType: string; reportId: string }
): Promise<void> {
  return notificationService.send({
    userId,
    type: 'report_generated',
    category: 'reports',
    priority: 'medium',
    title: 'Votre rapport est prêt!',
    message: `Votre rapport "${data.reportName}" a été généré avec succès.`,
    channels: ['in_app', 'email'],
    data: {
      ...data,
      generatedAt: new Date().toLocaleString('fr-CA'),
    },
    actionUrl: `/app/reports/${data.reportId}`,
    actionLabel: 'Voir le rapport',
  });
}

export async function sendConnectionErrorNotification(
  userId: string,
  data: { firstName: string; provider: string; errorMessage: string }
): Promise<void> {
  return notificationService.send({
    userId,
    type: 'connection_error',
    category: 'connections',
    priority: 'high',
    title: `Problème avec votre connexion ${data.provider}`,
    message: `Un problème a été détecté avec votre connexion ${data.provider}.`,
    channels: ['in_app', 'email'],
    data,
    actionUrl: '/app/connections',
    actionLabel: 'Vérifier',
  });
}
