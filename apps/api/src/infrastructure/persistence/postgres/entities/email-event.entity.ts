import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

/**
 * Email Event Types
 * Tracks the lifecycle of every email sent through the system
 */
export type EmailEventType =
  | "sent" // Email handed off to SES/Novu
  | "delivered" // Confirmed delivery to inbox
  | "opened" // User opened the email
  | "clicked" // User clicked a link
  | "bounced" // Email bounced (hard or soft)
  | "complained" // User marked as spam
  | "unsubscribed"; // User clicked unsubscribe

/**
 * EmailEvent Entity
 * Tracks all email interactions for deliverability monitoring and analytics
 *
 * This table is populated by:
 * 1. SES/Novu webhook callbacks (bounce, complaint, delivery, open, click)
 * 2. Direct logging when emails are sent
 * 3. Unsubscribe endpoint
 */
@Entity({ name: "email_events", schema: "accounting" })
@Index(["userId", "createdAt"])
@Index(["messageId"])
@Index(["eventType", "createdAt"])
@Index(["recipient"])
export class EmailEventEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /**
   * SES/Novu Message ID - used to correlate events
   */
  @Column({ name: "message_id", length: 255, nullable: true })
  messageId?: string;

  /**
   * Novu Transaction ID - for Novu-triggered emails
   */
  @Column({ name: "transaction_id", length: 100, nullable: true })
  transactionId?: string;

  /**
   * User ID (links to user_profiles.id / Keycloak sub)
   */
  @Column({ name: "user_id", length: 100, nullable: true })
  @Index()
  userId?: string;

  /**
   * Recipient email address
   */
  @Column({ length: 255 })
  recipient: string;

  /**
   * Novu workflow ID that triggered this email (e.g., 'welcome', 'journey_day_1')
   */
  @Column({ name: "workflow_id", length: 100, nullable: true })
  workflowId?: string;

  /**
   * Email category for filtering
   */
  @Column({ name: "email_category", length: 50, nullable: true })
  emailCategory?: "transactional" | "marketing" | "journey" | "security";

  /**
   * Event type
   */
  @Column({ name: "event_type", length: 50 })
  eventType: EmailEventType;

  /**
   * Email subject (for reference)
   */
  @Column({ length: 500, nullable: true })
  subject?: string;

  /**
   * Link clicked (for click events)
   */
  @Column({ name: "link_clicked", length: 1000, nullable: true })
  linkClicked?: string;

  /**
   * Additional metadata from SES/Novu webhooks
   */
  @Column({ type: "jsonb", nullable: true })
  metadata?: {
    // Bounce details
    bounceType?: "Permanent" | "Transient" | "Undetermined";
    bounceSubType?: string;
    diagnosticCode?: string;
    // Complaint details
    complaintFeedbackType?: string;
    // Delivery details
    processingTimeMillis?: number;
    smtpResponse?: string;
    // Open/Click details
    userAgent?: string;
    ipAddress?: string;
    timestamp?: string;
    // Error details
    errorMessage?: string;
  };

  /**
   * IP address of the event (for opens/clicks)
   */
  @Column({ name: "ip_address", length: 50, nullable: true })
  ipAddress?: string;

  /**
   * User agent (for opens/clicks)
   */
  @Column({ name: "user_agent", length: 500, nullable: true })
  userAgent?: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}

/**
 * Email Event Summary (for analytics queries)
 * This is a helper type, not a separate entity
 */
export interface EmailEventSummary {
  userId: string;
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  totalComplaints: number;
  deliveryRate: number; // delivered / sent
  openRate: number; // opened / delivered
  clickRate: number; // clicked / opened
  bounceRate: number; // bounced / sent
  lastSentAt?: Date;
  lastOpenedAt?: Date;
}
