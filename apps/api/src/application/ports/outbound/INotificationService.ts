/**
 * Notification Service Port (Interface)
 * Defines the contract for sending notifications across channels
 *
 * Clean Architecture: This is an OUTPUT PORT in the application layer
 * Implementation: NovuService in infrastructure layer
 */

export interface NotificationRecipient {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  locale?: string;
}

/**
 * Auth Email Options
 */
export interface AuthEmailOptions {
  to: string;
  firstName?: string;
}

export interface PasswordResetEmailOptions extends AuthEmailOptions {
  resetUrl: string;
}

export interface VerificationEmailOptions extends AuthEmailOptions {
  verifyUrl: string;
}

export interface MFAEnabledEmailOptions extends AuthEmailOptions {
  timestamp: Date;
}

/**
 * Notification Service Interface
 * Output port for the notification adapter
 */
export interface INotificationService {
  /**
   * Check if the notification service is available
   */
  isAvailable(): boolean;

  /**
   * Create or update a subscriber/recipient
   */
  upsertRecipient(recipient: NotificationRecipient): Promise<void>;

  // =========================================================================
  // Auth Emails (Transactional)
  // =========================================================================

  /**
   * Send password reset email with custom link
   */
  sendPasswordResetEmail(options: PasswordResetEmailOptions): Promise<boolean>;

  /**
   * Send email verification email with custom link
   */
  sendVerificationEmail(options: VerificationEmailOptions): Promise<boolean>;

  /**
   * Send MFA enabled confirmation email
   */
  sendMFAEnabledEmail(options: MFAEnabledEmailOptions): Promise<boolean>;

  /**
   * Send password changed security alert
   */
  sendPasswordChangedEmail(
    userId: string,
    data: { email: string; firstName: string; timestamp: Date },
  ): Promise<void>;

  // =========================================================================
  // Application Notifications
  // =========================================================================

  /**
   * Send welcome email after registration
   */
  sendWelcomeEmail(
    userId: string,
    data: { email: string; firstName: string; organizationName?: string },
  ): Promise<void>;

  /**
   * Send onboarding complete notification
   */
  sendOnboardingComplete(
    userId: string,
    data: {
      firstName: string;
      organizationName: string;
      connectionsCount: number;
    },
  ): Promise<void>;

  // =========================================================================
  // Security Notifications
  // =========================================================================

  /**
   * Send new device login alert
   */
  sendLoginNewDeviceAlert(
    userId: string,
    data: {
      device: string;
      browser: string;
      ipAddress: string;
      location?: string;
      timestamp: Date;
    },
  ): Promise<void>;

  // =========================================================================
  // Billing Notifications
  // =========================================================================

  /**
   * Send payment failed notification
   */
  sendPaymentFailedNotification(
    userId: string,
    data: { amount: string; currency: string; cardLast4: string },
  ): Promise<void>;
}
