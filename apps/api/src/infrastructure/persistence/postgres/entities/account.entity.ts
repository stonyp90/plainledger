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

@Entity({ name: 'accounts', schema: 'accounting' })
@Index(['organizationId', 'code'], { unique: true })
export class AccountEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  @Index()
  organizationId: string;

  @Column({ length: 20 })
  code: string;

  @Column({ length: 255 })
  name: string;

  @Column({ name: 'name_fr', length: 255, nullable: true })
  nameFr?: string;

  @Column({ name: 'account_type', length: 50 })
  accountType: string;

  @Column({ name: 'account_subtype', length: 50, nullable: true })
  accountSubtype?: string;

  @Column({ name: 'parent_account_id', type: 'uuid', nullable: true })
  parentAccountId?: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem: boolean;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => OrganizationEntity, (org) => org.accounts)
  @JoinColumn({ name: 'organization_id' })
  organization: OrganizationEntity;
}
