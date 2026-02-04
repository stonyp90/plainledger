import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'webhook_logs', schema: 'platform' })
export class WebhookLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  @Index()
  provider: string; // 'quickbooks', 'xero', 'sage', etc.

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  @Index()
  organizationId?: string;

  @Column({ name: 'event_type', length: 100 })
  @Index()
  eventType: string; // 'webhook.received', 'data.sync.completed', etc.

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ length: 20, default: 'received' })
  @Index()
  status: 'received' | 'processed' | 'failed';

  @Column({ name: 'processing_time_ms', type: 'int', nullable: true })
  processingTimeMs?: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ name: 'ip_address', length: 45, nullable: true })
  ipAddress?: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  @Index()
  createdAt: Date;
}
