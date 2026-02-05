import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { PlanEntitlementEntity } from './plan-entitlement.entity';

@Entity({ name: 'entitlements', schema: 'tenant' })
export class EntitlementEntity {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string; // e.g., 'datasource:quickbooks', 'feature:power-bi'

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 50 })
  category: string; // datasource, feature, limit, security, support

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // One-to-many relationship with plan entitlements junction table
  @OneToMany(() => PlanEntitlementEntity, (pe) => pe.entitlement)
  planEntitlements: PlanEntitlementEntity[];
}
