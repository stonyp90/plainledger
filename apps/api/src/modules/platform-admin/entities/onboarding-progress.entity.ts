import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity({ name: 'onboarding_progress', schema: 'platform' })
@Unique(['organizationId', 'stepKey'])
export class OnboardingProgressEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  @Index()
  organizationId: string;

  @Column({ name: 'step_key', length: 100 })
  @Index()
  stepKey: string; // 'connect_datasource', 'first_sync', 'view_report', 'invite_team', etc.

  @Column({ type: 'timestamptz' })
  completedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>; // Additional step-specific data

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
