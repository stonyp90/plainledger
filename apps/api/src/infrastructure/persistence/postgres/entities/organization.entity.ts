import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { AccountEntity } from './account.entity';

@Entity({ name: 'organizations', schema: 'accounting' })
export class OrganizationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', unique: true, length: 100 })
  @Index()
  tenantId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ name: 'legal_name', length: 255, nullable: true })
  legalName?: string;

  @Column({ name: 'tax_number', length: 50, nullable: true })
  taxNumber?: string;

  @Column({ name: 'fiscal_year_end_month', type: 'int', default: 12 })
  fiscalYearEndMonth: number;

  @Column({ length: 3, default: 'CAD' })
  currency: string;

  @Column({ length: 100, nullable: true })
  industry?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date;

  @OneToMany(() => AccountEntity, (account) => account.organization)
  accounts: AccountEntity[];
}
