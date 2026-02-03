import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { AdminUserEntity } from './admin-user.entity';
import { AdminPermissionEntity } from './admin-permission.entity';

@Entity({ name: 'groups', schema: 'platform' })
export class AdminGroupEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'tier_level', default: 1 })
  tierLevel: number;

  @Column({ name: 'is_system', default: true })
  isSystem: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // Many-to-many relationship with users
  @ManyToMany(() => AdminUserEntity, (user) => user.groups)
  users: AdminUserEntity[];

  // Many-to-many relationship with permissions
  @ManyToMany(() => AdminPermissionEntity, (permission) => permission.groups)
  @JoinTable({
    name: 'group_permissions',
    schema: 'platform',
    joinColumn: { name: 'group_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions: AdminPermissionEntity[];
}
