import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { OrganizationEntity } from './organization.entity';
import { OrganizationFeaturesProps, OrganizationFeatureOverrides } from '@domain/entities/OrganizationFeatures';

@Entity({ name: 'organization_features', schema: 'accounting' })
export class OrganizationFeaturesEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'organization_id', type: 'uuid', unique: true }) organizationId: string;
  @ManyToOne(() => OrganizationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' }) organization: OrganizationEntity;
  @Column({ type: 'jsonb' }) analytics: OrganizationFeaturesProps['analytics'];
  @Column({ type: 'jsonb', default: {} }) overrides: OrganizationFeatureOverrides;
  @Column({ name: 'updated_by', length: 255 }) updatedBy: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
