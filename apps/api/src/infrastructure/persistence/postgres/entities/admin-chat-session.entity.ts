import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type ChatSessionStatus = 'active' | 'waiting' | 'closed' | 'archived';

@Entity({ name: 'admin_chat_sessions', schema: 'platform' })
export class AdminChatSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Customer info
  @Column({ name: 'customer_user_id', type: 'varchar', length: 255 })
  @Index()
  customerUserId: string;

  @Column({ name: 'customer_email', type: 'varchar', length: 255 })
  customerEmail: string;

  @Column({ name: 'customer_name', type: 'varchar', length: 255, nullable: true })
  customerName?: string;

  @Column({ name: 'organization_id', type: 'varchar', length: 255, nullable: true })
  @Index()
  organizationId?: string;

  @Column({ name: 'organization_name', type: 'varchar', length: 255, nullable: true })
  organizationName?: string;

  // Session info
  @Column({ type: 'varchar', length: 20, default: 'waiting' })
  @Index()
  status: ChatSessionStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  subject?: string;

  @Column({ name: 'initial_message', type: 'text', nullable: true })
  initialMessage?: string;

  // Admin assignment
  @Column({ name: 'assigned_admin_id', type: 'varchar', length: 255, nullable: true })
  @Index()
  assignedAdminId?: string;

  @Column({ name: 'assigned_admin_email', type: 'varchar', length: 255, nullable: true })
  assignedAdminEmail?: string;

  @Column({ name: 'assigned_at', type: 'timestamptz', nullable: true })
  assignedAt?: Date;

  // Statistics
  @Column({ name: 'messages_count', type: 'int', default: 0 })
  messagesCount: number;

  @Column({ name: 'customer_messages_count', type: 'int', default: 0 })
  customerMessagesCount: number;

  @Column({ name: 'admin_messages_count', type: 'int', default: 0 })
  adminMessagesCount: number;

  @Column({ name: 'first_response_at', type: 'timestamptz', nullable: true })
  firstResponseAt?: Date;

  @Column({ name: 'first_response_time_seconds', type: 'int', nullable: true })
  firstResponseTimeSeconds?: number;

  // Customer online status
  @Column({ name: 'customer_online', type: 'boolean', default: false })
  @Index()
  customerOnline: boolean;

  @Column({ name: 'customer_last_seen_at', type: 'timestamptz', nullable: true })
  customerLastSeenAt?: Date;

  @Column({ name: 'customer_typing', type: 'boolean', default: false })
  customerTyping: boolean;

  // Context
  @Column({ name: 'page_url', type: 'varchar', length: 500, nullable: true })
  pageUrl?: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  // Tags for categorization
  @Column({ type: 'text', array: true, nullable: true })
  tags?: string[];

  // Resolution
  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt?: Date;

  @Column({ name: 'closed_by_admin_id', type: 'varchar', length: 255, nullable: true })
  closedByAdminId?: string;

  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes?: string;

  @Column({ name: 'satisfaction_rating', type: 'int', nullable: true })
  satisfactionRating?: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
