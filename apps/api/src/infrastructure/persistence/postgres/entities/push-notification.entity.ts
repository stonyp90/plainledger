import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type NotificationChannel = 'in_app' | 'email' | 'push' | 'sms';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'cancelled';

@Entity({ name: 'push_notifications', schema: 'platform' })
export class PushNotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ name: 'title_fr', type: 'varchar', length: 255, nullable: true })
  titleFr?: string;

  @Column({ name: 'message_fr', type: 'text', nullable: true })
  messageFr?: string;

  @Column({ type: 'varchar', length: 50, default: 'in_app' })
  channel: NotificationChannel;

  @Column({ type: 'varchar', length: 20, default: 'medium' })
  priority: NotificationPriority;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  @Index()
  status: NotificationStatus;

  @Column({ name: 'notification_type', type: 'varchar', length: 100, default: 'admin_broadcast' })
  notificationType: string;

  // Targeting
  @Column({ name: 'target_type', type: 'varchar', length: 50 })
  @Index()
  targetType: 'all' | 'organization' | 'user' | 'industry' | 'plan' | 'segment';

  @Column({ name: 'target_ids', type: 'text', array: true, nullable: true })
  targetIds?: string[];

  @Column({ name: 'target_filter', type: 'jsonb', nullable: true })
  targetFilter?: Record<string, unknown>;

  // Statistics
  @Column({ name: 'recipients_count', type: 'int', default: 0 })
  recipientsCount: number;

  @Column({ name: 'delivered_count', type: 'int', default: 0 })
  deliveredCount: number;

  @Column({ name: 'read_count', type: 'int', default: 0 })
  readCount: number;

  @Column({ name: 'clicked_count', type: 'int', default: 0 })
  clickedCount: number;

  // Action
  @Column({ name: 'action_url', type: 'varchar', length: 500, nullable: true })
  actionUrl?: string;

  @Column({ name: 'action_label', type: 'varchar', length: 100, nullable: true })
  actionLabel?: string;

  @Column({ name: 'action_label_fr', type: 'varchar', length: 100, nullable: true })
  actionLabelFr?: string;

  // Scheduling
  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  scheduledAt?: Date;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt?: Date;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt?: Date;

  // Metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  // Created by admin
  @Column({ name: 'created_by_admin_id', type: 'varchar', length: 255 })
  createdByAdminId: string;

  @Column({ name: 'created_by_admin_email', type: 'varchar', length: 255 })
  createdByAdminEmail: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
