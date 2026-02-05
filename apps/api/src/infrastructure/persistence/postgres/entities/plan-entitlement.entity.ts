import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { SubscriptionPlanEntity } from './subscription-plan.entity';
import { EntitlementEntity } from './entitlement.entity';

/**
 * Junction table entity for many-to-many relationship between
 * SubscriptionPlans and Entitlements with additional config column.
 *
 * This entity is needed because the plan_entitlements table has a 'config'
 * column that is referenced by the organization_effective_entitlements view.
 */
@Entity({ name: 'plan_entitlements', schema: 'tenant' })
export class PlanEntitlementEntity {
  @PrimaryColumn({ name: 'plan_id', type: 'varchar', length: 50 })
  planId: string;

  @PrimaryColumn({ name: 'entitlement_id', type: 'varchar', length: 50 })
  entitlementId: string;

  @Column({ type: 'jsonb', default: {} })
  config: Record<string, unknown>;

  @ManyToOne(() => SubscriptionPlanEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan: SubscriptionPlanEntity;

  @ManyToOne(() => EntitlementEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'entitlement_id' })
  entitlement: EntitlementEntity;
}
