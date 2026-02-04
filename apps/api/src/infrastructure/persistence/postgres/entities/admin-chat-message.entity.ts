import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AdminChatSessionEntity } from './admin-chat-session.entity';

export type MessageSender = 'customer' | 'admin' | 'system';
export type MessageType = 'text' | 'file' | 'image' | 'link' | 'system';

@Entity({ name: 'admin_chat_messages', schema: 'platform' })
export class AdminChatMessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id' })
  @Index()
  sessionId: string;

  @ManyToOne(() => AdminChatSessionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: AdminChatSessionEntity;

  @Column({ name: 'sender_type', type: 'varchar', length: 20 })
  senderType: MessageSender;

  @Column({ name: 'sender_id', type: 'varchar', length: 255 })
  senderId: string;

  @Column({ name: 'sender_name', type: 'varchar', length: 255, nullable: true })
  senderName?: string;

  @Column({ name: 'sender_email', type: 'varchar', length: 255, nullable: true })
  senderEmail?: string;

  @Column({ name: 'message_type', type: 'varchar', length: 20, default: 'text' })
  messageType: MessageType;

  @Column({ type: 'text' })
  content: string;

  // For file/image messages
  @Column({ name: 'file_url', type: 'varchar', length: 500, nullable: true })
  fileUrl?: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255, nullable: true })
  fileName?: string;

  @Column({ name: 'file_size', type: 'int', nullable: true })
  fileSize?: number;

  @Column({ name: 'file_type', type: 'varchar', length: 100, nullable: true })
  fileType?: string;

  // Read status
  @Column({ name: 'read_by_customer', type: 'boolean', default: false })
  readByCustomer: boolean;

  @Column({ name: 'read_by_customer_at', type: 'timestamptz', nullable: true })
  readByCustomerAt?: Date;

  @Column({ name: 'read_by_admin', type: 'boolean', default: false })
  readByAdmin: boolean;

  @Column({ name: 'read_by_admin_at', type: 'timestamptz', nullable: true })
  readByAdminAt?: Date;

  // Metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  @Index()
  createdAt: Date;
}
