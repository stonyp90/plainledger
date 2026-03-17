import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToMany,
} from 'typeorm';
import { AdminGroupEntity } from './admin-group.entity';

@Entity({ name: 'admin_permissions', schema: 'platform' })
export class AdminPermissionEntity {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  id: string; // e.g., 'org:view', 'user:delete'

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 50 })
  category: string; // org, user, billing, sync, support, config, admin, analytics

  @Column({ name: 'is_dangerous', default: false })
  isDangerous: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // Many-to-many relationship with groups
  @ManyToMany(() => AdminGroupEntity, (group) => group.permissions)
  groups: AdminGroupEntity[];
}
