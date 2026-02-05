import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToMany,
} from 'typeorm';
import { RoleEntity } from './role.entity';

@Entity({ name: 'permissions', schema: 'tenant' })
export class PermissionEntity {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string; // e.g., 'view:dashboard', 'manage:connections'

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 50 })
  category: string; // dashboard, reports, connections, settings, members, billing

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // Many-to-many relationship with roles
  @ManyToMany(() => RoleEntity, (role) => role.permissions)
  roles: RoleEntity[];
}
