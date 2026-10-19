import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrganizationEntity } from './organization.entity';

export type InvitationRole = 'admin' | 'member' | 'viewer';
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';
export type InvitationDeliveryStatus = 'unsent' | 'queued' | 'failed';

@Entity({ name: 'organization_invitations', schema: 'accounting' })
@Index('organization_invitations_pending_email', ['organizationId', 'email'], {
  unique: true,
  where: "status = 'pending'",
})
@Check('organization_invitation_role', "role IN ('admin', 'member', 'viewer')")
@Check('organization_invitation_status', "status IN ('pending', 'accepted', 'expired', 'revoked')")
@Check('organization_invitation_delivery', "delivery_status IN ('unsent', 'queued', 'failed')")
export class OrganizationInvitationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  @Index()
  organizationId: string;

  @ManyToOne(() => OrganizationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: OrganizationEntity;

  @Column({ length: 255 })
  email: string;

  @Column({ length: 20 })
  role: InvitationRole;

  @Column({ name: 'token_hash', length: 64, select: false, unique: true })
  tokenHash: string;

  @Column({ name: 'invited_by', length: 100 })
  invitedBy: string;

  @Column({ length: 20, default: 'pending' })
  status: InvitationStatus;

  @Column({ name: 'delivery_status', length: 20, default: 'unsent' })
  deliveryStatus: InvitationDeliveryStatus;

  @Column({ name: 'email_message_id', length: 255, nullable: true })
  emailMessageId?: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  @Index()
  expiresAt: Date;

  @Column({ name: 'last_sent_at', type: 'timestamptz', nullable: true })
  lastSentAt?: Date;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt?: Date;

  @Column({ name: 'accepted_by', length: 100, nullable: true })
  acceptedBy?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
