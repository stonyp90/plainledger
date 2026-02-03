import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AdminUserEntity } from './admin-user.entity';

@Entity({ name: 'audit_log', schema: 'platform' })
export class AdminAuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'admin_user_id', nullable: true })
  adminUserId: string;

  @ManyToOne(() => AdminUserEntity, { nullable: true })
  @JoinColumn({ name: 'admin_user_id' })
  adminUser: AdminUserEntity;

  @Column({ name: 'admin_email', nullable: true })
  adminEmail: string;

  @Column()
  action: string; // e.g., 'org:delete', 'user:impersonate'

  @Column({ name: 'resource_type' })
  resourceType: string; // org, user, billing, sync, admin, group

  @Column({ name: 'resource_id', nullable: true })
  resourceId: string;

  @Column({ name: 'resource_name', nullable: true })
  resourceName: string;

  @Column({ name: 'target_org_id', type: 'uuid', nullable: true })
  targetOrgId: string;

  @Column({ name: 'target_org_name', nullable: true })
  targetOrgName: string;

  @Column({ name: 'target_user_id', nullable: true })
  targetUserId: string;

  @Column({ name: 'target_user_email', nullable: true })
  targetUserEmail: string;

  @Column({ name: 'before_state', type: 'jsonb', nullable: true })
  beforeState: Record<string, any>;

  @Column({ name: 'after_state', type: 'jsonb', nullable: true })
  afterState: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string;

  @Column({ name: 'session_id', nullable: true })
  sessionId: string;

  @Column({ name: 'duration_ms', nullable: true })
  durationMs: number;

  @Column({ default: true })
  success: boolean;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
