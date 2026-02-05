import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
} from 'typeorm';
import { EntitlementEntity } from './entitlement.entity';
import { OrganizationEntity } from './organization.entity';

@Entity({ name: 'subscription_plans', schema: 'tenant' })
export class SubscriptionPlanEntity {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string; // e.g., 'free', 'professional', 'enterprise'

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'stripe_product_id', type: 'varchar', length: 100, nullable: true })
  stripeProductId?: string;

  @Column({ name: 'stripe_price_id', type: 'varchar', length: 100, nullable: true })
  stripePriceId?: string;

  @Column({ name: 'stripe_price_id_annual', type: 'varchar', length: 100, nullable: true })
  stripePriceIdAnnual?: string;

  @Column({ type: 'jsonb', default: {} })
  limits: Record<string, number>; // Usage limits (users, connections, etc.)

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // Many-to-many relationship with entitlements
  @ManyToMany(() => EntitlementEntity, (entitlement) => entitlement.plans)
  @JoinTable({
    name: 'plan_entitlements',
    schema: 'tenant',
    joinColumn: { name: 'plan_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'entitlement_id', referencedColumnName: 'id' },
  })
  entitlements: EntitlementEntity[];

  // One-to-many relationship with organizations
  @OneToMany(() => OrganizationEntity, (org) => org.subscriptionPlan)
  organizations: OrganizationEntity[];
}
