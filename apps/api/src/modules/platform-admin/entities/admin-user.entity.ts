import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AdminGroupEntity } from './admin-group.entity';

@Entity({ name: 'admin_users', schema: 'platform' })
export class AdminUserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'keycloak_id', unique: true })
  keycloakId: string;

  @Column()
  email: string;

  @Column({ name: 'display_name', nullable: true })
  displayName: string;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'mfa_enabled', default: false })
  mfaEnabled: boolean;

  @Column({ name: 'last_access_at', type: 'timestamptz', nullable: true })
  lastAccessAt: Date;

  @Column({ name: 'invited_by', nullable: true })
  invitedById: string;

  @ManyToOne(() => AdminUserEntity, { nullable: true })
  @JoinColumn({ name: 'invited_by' })
  invitedBy: AdminUserEntity;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // Many-to-many relationship with groups
  @ManyToMany(() => AdminGroupEntity, (group) => group.users)
  @JoinTable({
    name: 'user_groups',
    schema: 'platform',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'group_id', referencedColumnName: 'id' },
  })
  groups: AdminGroupEntity[];
}
