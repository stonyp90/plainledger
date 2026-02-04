import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OrganizationEntity } from './organization.entity';

export type ConnectionProvider = 'quickbooks' | 'xero' | 'sage' | 'freshbooks' | 'wave' | 'manual';
export type ConnectionStatus = 'active' | 'disconnected' | 'error' | 'pending' | 'expired';

@Entity({ name: 'data_source_connections', schema: 'accounting' })
export class DataSourceConnectionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  @Index()
  organizationId: string;

  @ManyToOne(() => OrganizationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: OrganizationEntity;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  provider: ConnectionProvider;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  @Index()
  status: ConnectionStatus;

  @Column({ name: 'provider_account_id', type: 'varchar', length: 255, nullable: true })
  providerAccountId?: string;

  @Column({ name: 'provider_account_name', type: 'varchar', length: 255, nullable: true })
  providerAccountName?: string;

  @Column({ name: 'provider_company_id', type: 'varchar', length: 255, nullable: true })
  providerCompanyId?: string;

  @Column({ name: 'access_token_encrypted', type: 'text', nullable: true })
  accessTokenEncrypted?: string;

  @Column({ name: 'refresh_token_encrypted', type: 'text', nullable: true })
  refreshTokenEncrypted?: string;

  @Column({ name: 'token_expires_at', type: 'timestamptz', nullable: true })
  tokenExpiresAt?: Date;

  @Column({ name: 'refresh_token_expires_at', type: 'timestamptz', nullable: true })
  refreshTokenExpiresAt?: Date;

  @Column({ name: 'last_sync_at', type: 'timestamptz', nullable: true })
  lastSyncAt?: Date;

  @Column({ name: 'last_sync_status', type: 'varchar', length: 20, nullable: true })
  lastSyncStatus?: 'success' | 'failed' | 'partial';

  @Column({ name: 'last_sync_error', type: 'text', nullable: true })
  lastSyncError?: string;

  @Column({ name: 'last_sync_records_count', type: 'int', nullable: true })
  lastSyncRecordsCount?: number;

  @Column({ name: 'total_syncs', type: 'int', default: 0 })
  totalSyncs: number;

  @Column({ name: 'successful_syncs', type: 'int', default: 0 })
  successfulSyncs: number;

  @Column({ name: 'failed_syncs', type: 'int', default: 0 })
  failedSyncs: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @Column({ name: 'scopes', type: 'text', array: true, nullable: true })
  scopes?: string[];

  @Column({ name: 'connected_by_user_id', type: 'varchar', length: 255, nullable: true })
  connectedByUserId?: string;

  @Column({ name: 'connected_by_email', type: 'varchar', length: 255, nullable: true })
  connectedByEmail?: string;

  @Column({ name: 'disconnected_at', type: 'timestamptz', nullable: true })
  disconnectedAt?: Date;

  @Column({ name: 'disconnected_by_user_id', type: 'varchar', length: 255, nullable: true })
  disconnectedByUserId?: string;

  @Column({ name: 'disconnected_reason', type: 'text', nullable: true })
  disconnectedReason?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
