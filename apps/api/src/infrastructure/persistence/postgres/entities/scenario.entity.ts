/**
 * Scenario Entity
 * Stores financial planning scenarios and models
 */
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export type ScenarioType = "base" | "optimistic" | "pessimistic" | "custom";
export type ScenarioStatus = "draft" | "active" | "archived";

@Entity({ name: "scenarios", schema: "reporting" })
@Index(["organizationId", "status"])
@Index(["organizationId", "type"])
export class ScenarioEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "organization_id", type: "uuid" })
  organizationId: string;

  @Column({ name: "name", type: "varchar", length: 255 })
  name: string;

  @Column({ name: "name_en", type: "varchar", length: 255, nullable: true })
  nameEn?: string;

  @Column({ name: "description", type: "text", nullable: true })
  description?: string;

  @Column({ name: "description_en", type: "text", nullable: true })
  descriptionEn?: string;

  @Column({ name: "type", type: "varchar", length: 20, default: "custom" })
  type: ScenarioType;

  @Column({ name: "status", type: "varchar", length: 20, default: "draft" })
  status: ScenarioStatus;

  @Column({ name: "is_baseline", type: "boolean", default: false })
  isBaseline: boolean;

  // Financial assumptions
  @Column({ name: "assumptions", type: "jsonb" })
  assumptions: {
    revenueGrowth?: number;
    expenseGrowth?: number;
    inflationRate?: number;
    interestRate?: number;
    taxRate?: number;
    customAssumptions?: Record<string, number>;
  };

  // Time period configuration
  @Column({ name: "period_config", type: "jsonb" })
  periodConfig: {
    startDate: string;
    endDate: string;
    frequency: "monthly" | "quarterly" | "yearly";
    forecastPeriods: number;
  };

  // Revenue projections
  @Column({ name: "revenue_projections", type: "jsonb", nullable: true })
  revenueProjections?: Array<{
    period: string;
    amount: number;
    category?: string;
    notes?: string;
  }>;

  // Expense projections
  @Column({ name: "expense_projections", type: "jsonb", nullable: true })
  expenseProjections?: Array<{
    period: string;
    amount: number;
    category?: string;
    notes?: string;
  }>;

  // Cash flow projections
  @Column({ name: "cash_flow_projections", type: "jsonb", nullable: true })
  cashFlowProjections?: Array<{
    period: string;
    operating: number;
    investing: number;
    financing: number;
    netCash: number;
  }>;

  // Key metrics / KPIs
  @Column({ name: "metrics", type: "jsonb", nullable: true })
  metrics?: {
    npv?: number;
    irr?: number;
    paybackPeriod?: number;
    breakEvenPoint?: number;
    customMetrics?: Record<string, number>;
  };

  // Comparison with other scenarios
  @Column({ name: "comparison_base_id", type: "uuid", nullable: true })
  comparisonBaseId?: string;

  @Column({ name: "variance_analysis", type: "jsonb", nullable: true })
  varianceAnalysis?: {
    revenueVariance?: number;
    expenseVariance?: number;
    profitVariance?: number;
    notes?: string;
  };

  @Column({ name: "tags", type: "text", array: true, nullable: true })
  tags?: string[];

  @Column({ name: "created_by", type: "varchar", length: 100 })
  createdBy: string;

  @Column({ name: "version", type: "int", default: 1 })
  version: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
