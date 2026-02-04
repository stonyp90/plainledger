import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'communication_logs', schema: 'platform' })
export class CommunicationLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 20 })
  @Index()
  type: 'email' | 'in_app' | 'push' | 'sms';

  @Column({ name: 'template_name', length: 100, nullable: true })
  @Index()
  templateName?: string;

  @Column({ name: 'recipient_id', type: 'uuid' })
  @Index()
  recipientId: string;

  @Column({ name: 'recipient_email', length: 255, nullable: true })
  @Index()
  recipientEmail?: string;

  @Column({ length: 500 })
  subject: string;

  @Column({ type: 'text', nullable: true })
  message?: string;

  @Column({ length: 20, default: 'queued' })
  @Index()
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'bounced';

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  @Index()
  sentAt?: Date;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt?: Date;

  @Column({ name: 'failed_at', type: 'timestamptz', nullable: true })
  failedAt?: Date;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>; // Template variables, campaign ID, etc.

  @Column({ name: 'campaign_id', type: 'uuid', nullable: true })
  @Index()
  campaignId?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  @Index()
  createdAt: Date;
}
